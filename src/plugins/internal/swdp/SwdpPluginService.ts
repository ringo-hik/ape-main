/**
 * SWDP 플러그인
 * 
 * SWDP 빌드 파이프라인 기능을 제공하는 내부 플러그인
 * 빌드, 테스트, 배포 등의 기능 지원
 */

import { PluginBaseService } from '../../../core/plugin-system/PluginBaseService';
import { PluginCommand } from '../../../types/PluginTypes';
import { CommandType, CommandPrefix } from '../../../types/CommandTypes';
import { IConfigLoader } from '../../../types/ConfigTypes';
import { SwdpClientService, SwdpBuildType, SwdpBuildOptions, SwdpTestOptions, SwdpTROptions } from './SwdpClientService';

/**
 * SWDP 플러그인 클래스
 * SWDP 빌드 파이프라인 관리 기능 제공
 */
export class SwdpPluginService extends PluginBaseService {
  /**
   * 플러그인 ID
   */
  id = 'swdp';
  
  /**
   * 플러그인 이름
   */
  name = 'SWDP 빌드 관리';
  
  /**
   * SWDP 클라이언트 서비스
   */
  private swdpClient?: SwdpClientService;
  
  /**
   * 초기화 완료 여부
   */
  private initialized: boolean = false;
  
  /**
   * SwdpPluginService 생성자
   * @param configLoader 설정 로더
   */
  constructor(configLoader: IConfigLoader) {
    super(configLoader);
    
    // 내부 플러그인 설정 (고정값)
    this.config = {
      enabled: true
    };
    
    // 명령어 등록
    this.registerCommands();
  }
  
  /**
   * 플러그인 초기화
   */
  async initialize(): Promise<void> {
    // 설정에서 SWDP 정보 로드
    const pluginConfig = this.configLoader?.getPluginConfig();
    // SWDP 관련 설정 가져오기 - 타입 안전성 확보
    const swdpConfig = pluginConfig && typeof pluginConfig === 'object' && 'swdp' in pluginConfig 
      ? (pluginConfig as Record<string, any>).swdp 
      : null;
    
    if (!swdpConfig) {
      console.warn('SWDP 설정이 없습니다. 기본 설정을 사용합니다.');
      return;
    }
    
    try {
      // SWDP 클라이언트 초기화
      this.swdpClient = new SwdpClientService(
        swdpConfig.baseUrl || 'http://localhost:8080',
        swdpConfig.bypassSsl !== false
      );
      
      // 인증 설정
      await this.swdpClient.initialize({
        apiKey: swdpConfig.apiKey,
        userId: swdpConfig.userId,
        password: swdpConfig.password,
        token: swdpConfig.token
      });
      
      this.initialized = true;
      console.log('SWDP 플러그인 초기화 완료');
    } catch (error) {
      console.error('SWDP 플러그인 초기화 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 초기화 상태 확인
   * @returns 초기화 완료 여부
   */
  isInitialized(): boolean {
    return this.initialized;
  }
  
  /**
   * 클라이언트 인스턴스 가져오기
   * @returns SWDP 클라이언트
   */
  private getClient(): SwdpClientService {
    if (!this.swdpClient || !this.initialized) {
      throw new Error('SWDP 클라이언트가 초기화되지 않았습니다.');
    }
    return this.swdpClient;
  }
  
  /**
   * 명령어 등록
   * 
   * @param customCommands 외부에서 추가할 명령어 (사용하지 않음)
   * @returns 등록 성공 여부
   */
  protected registerCommands(customCommands?: PluginCommand[]): boolean {
    this.commands = [
      // 빌드 시작 명령어
      {
        id: 'build',
        name: 'build',
        type: CommandType.AT,
        prefix: CommandPrefix.AT,
        description: 'SWDP 빌드 시작',
        syntax: '@swdp:build [type] [--watch] [--pr]',
        examples: ['@swdp:build local', '@swdp:build layer --watch', '@swdp:build all --pr'],
        execute: async (args) => {
          try {
            if (!this.isInitialized()) {
              throw new Error('SWDP 플러그인이 초기화되지 않았습니다.');
            }
            
            // 빌드 타입 처리
            let buildType = SwdpBuildType.LOCAL;
            if (args.length > 0) {
              const type = args[0].toString().toUpperCase();
              if (Object.values(SwdpBuildType).includes(type as SwdpBuildType)) {
                buildType = type as SwdpBuildType;
              }
            }
            
            // 빌드 옵션 처리
            const options: SwdpBuildOptions = {
              type: buildType,
              watchMode: args.includes('--watch'),
              createPr: args.includes('--pr'),
              params: {}
            };
            
            // 파라미터 처리
            for (let i = 0; i < args.length; i++) {
              const arg = args[i];
              if (typeof arg === 'string' && arg.startsWith('--') && arg.includes('=')) {
                const [key, value] = arg.substring(2).split('=');
                if (key && value) {
                  options.params![key] = value;
                }
              }
            }
            
            // 빌드 시작
            const result = await this.getClient().startBuild(options);
            
            return {
              content: `빌드가 시작되었습니다. 빌드 ID: ${result.buildId}`,
              data: result,
              type: 'success'
            };
          } catch (error) {
            return {
              content: `빌드 시작 중 오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
              type: 'error'
            };
          }
        }
      },
      
      // 빌드 상태 확인 명령어
      {
        id: 'build-status',
        name: 'build:status',
        type: CommandType.AT,
        prefix: CommandPrefix.AT,
        description: 'SWDP 빌드 상태 확인',
        syntax: '@swdp:build:status [buildId]',
        examples: ['@swdp:build:status', '@swdp:build:status 12345'],
        execute: async (args) => {
          try {
            if (!this.isInitialized()) {
              throw new Error('SWDP 플러그인이 초기화되지 않았습니다.');
            }
            
            const buildId = args.length > 0 ? args[0].toString() : undefined;
            const status = await this.getClient().getBuildStatus(buildId);
            
            return {
              content: `빌드 상태: ${status.status}`,
              data: status,
              type: 'info'
            };
          } catch (error) {
            return {
              content: `빌드 상태 확인 중 오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
              type: 'error'
            };
          }
        }
      },
      
      // 빌드 로그 확인 명령어
      {
        id: 'build-logs',
        name: 'build:logs',
        type: CommandType.AT,
        prefix: CommandPrefix.AT,
        description: 'SWDP 빌드 로그 확인',
        syntax: '@swdp:build:logs <buildId>',
        examples: ['@swdp:build:logs 12345'],
        execute: async (args) => {
          try {
            if (!this.isInitialized()) {
              throw new Error('SWDP 플러그인이 초기화되지 않았습니다.');
            }
            
            if (args.length === 0) {
              throw new Error('빌드 ID가 필요합니다.');
            }
            
            const buildId = args[0].toString();
            const logs = await this.getClient().getBuildLogs(buildId);
            
            return {
              content: `빌드 로그:\n${logs.logs || '(로그 없음)'}`,
              data: logs,
              type: 'info'
            };
          } catch (error) {
            return {
              content: `빌드 로그 확인 중 오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
              type: 'error'
            };
          }
        }
      },
      
      // 빌드 취소 명령어
      {
        id: 'build-cancel',
        name: 'build:cancel',
        type: CommandType.AT,
        prefix: CommandPrefix.AT,
        description: 'SWDP 빌드 취소',
        syntax: '@swdp:build:cancel <buildId>',
        examples: ['@swdp:build:cancel 12345'],
        execute: async (args) => {
          try {
            if (!this.isInitialized()) {
              throw new Error('SWDP 플러그인이 초기화되지 않았습니다.');
            }
            
            if (args.length === 0) {
              throw new Error('빌드 ID가 필요합니다.');
            }
            
            const buildId = args[0].toString();
            const result = await this.getClient().cancelBuild(buildId);
            
            return {
              content: `빌드가 취소되었습니다. 빌드 ID: ${buildId}`,
              data: result,
              type: 'success'
            };
          } catch (error) {
            return {
              content: `빌드 취소 중 오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
              type: 'error'
            };
          }
        }
      },
      
      // 테스트 실행 명령어
      {
        id: 'test',
        name: 'test',
        type: CommandType.AT,
        prefix: CommandPrefix.AT,
        description: 'SWDP 테스트 실행',
        syntax: '@swdp:test <type> [target]',
        examples: ['@swdp:test unit', '@swdp:test integration user-service'],
        execute: async (args) => {
          try {
            if (!this.isInitialized()) {
              throw new Error('SWDP 플러그인이 초기화되지 않았습니다.');
            }
            
            if (args.length === 0) {
              throw new Error('테스트 유형이 필요합니다.');
            }
            
            const type = args[0].toString();
            if (!['unit', 'integration', 'system'].includes(type)) {
              throw new Error('유효한 테스트 유형이 아닙니다. unit, integration, system 중 하나여야 합니다.');
            }
            
            const options: SwdpTestOptions = {
              type: type as 'unit' | 'integration' | 'system',
              target: args.length > 1 ? args[1].toString() : undefined,
              params: {}
            };
            
            // 파라미터 처리
            for (let i = 2; i < args.length; i++) {
              const arg = args[i];
              if (typeof arg === 'string' && arg.startsWith('--') && arg.includes('=')) {
                const [key, value] = arg.substring(2).split('=');
                if (key && value) {
                  options.params![key] = value;
                }
              }
            }
            
            const result = await this.getClient().runTest(options);
            
            return {
              content: `테스트가 시작되었습니다. 테스트 ID: ${result.testId}`,
              data: result,
              type: 'success'
            };
          } catch (error) {
            return {
              content: `테스트 실행 중 오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
              type: 'error'
            };
          }
        }
      },
      
      // 테스트 결과 확인 명령어
      {
        id: 'test-results',
        name: 'test:results',
        type: CommandType.AT,
        prefix: CommandPrefix.AT,
        description: 'SWDP 테스트 결과 확인',
        syntax: '@swdp:test:results <testId>',
        examples: ['@swdp:test:results 12345'],
        execute: async (args) => {
          try {
            if (!this.isInitialized()) {
              throw new Error('SWDP 플러그인이 초기화되지 않았습니다.');
            }
            
            if (args.length === 0) {
              throw new Error('테스트 ID가 필요합니다.');
            }
            
            const testId = args[0].toString();
            const results = await this.getClient().getTestResults(testId);
            
            return {
              content: `테스트 결과:\n통과: ${results.passed || 0}\n실패: ${results.failed || 0}\n총 테스트: ${results.total || 0}`,
              data: results,
              type: 'info'
            };
          } catch (error) {
            return {
              content: `테스트 결과 확인 중 오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
              type: 'error'
            };
          }
        }
      },
      
      // TR 생성 명령어
      {
        id: 'tr-create',
        name: 'tr:create',
        type: CommandType.AT,
        prefix: CommandPrefix.AT,
        description: 'SWDP TR(Test Request) 생성',
        syntax: '@swdp:tr:create <title> <description> <type> [--priority=<priority>] [--assignee=<assignee>]',
        examples: ['@swdp:tr:create "신규 기능 테스트" "로그인 기능 테스트" "functional" --priority=high --assignee=user1'],
        execute: async (args) => {
          try {
            if (!this.isInitialized()) {
              throw new Error('SWDP 플러그인이 초기화되지 않았습니다.');
            }
            
            if (args.length < 3) {
              throw new Error('제목, 설명, 유형이 필요합니다.');
            }
            
            const options: SwdpTROptions = {
              title: args[0].toString(),
              description: args[1].toString(),
              type: args[2].toString(),
              priority: 'medium' as 'high' | 'medium' | 'low'
            };
            
            // 옵션 처리
            for (let i = 3; i < args.length; i++) {
              const arg = args[i];
              if (typeof arg === 'string' && arg.startsWith('--') && arg.includes('=')) {
                const [key, value] = arg.substring(2).split('=');
                if (key === 'priority' && ['high', 'medium', 'low'].includes(value)) {
                  options.priority = value as 'high' | 'medium' | 'low';
                } else if (key === 'assignee') {
                  options.assignee = value;
                }
              }
            }
            
            const result = await this.getClient().createTR(options);
            
            return {
              content: `TR이 생성되었습니다. TR ID: ${result.trId}`,
              data: result,
              type: 'success'
            };
          } catch (error) {
            return {
              content: `TR 생성 중 오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
              type: 'error'
            };
          }
        }
      },
      
      // TR 상태 확인 명령어
      {
        id: 'tr-status',
        name: 'tr:status',
        type: CommandType.AT,
        prefix: CommandPrefix.AT,
        description: 'SWDP TR(Test Request) 상태 확인',
        syntax: '@swdp:tr:status <trId>',
        examples: ['@swdp:tr:status 12345'],
        execute: async (args) => {
          try {
            if (!this.isInitialized()) {
              throw new Error('SWDP 플러그인이 초기화되지 않았습니다.');
            }
            
            if (args.length === 0) {
              throw new Error('TR ID가 필요합니다.');
            }
            
            const trId = args[0].toString();
            const status = await this.getClient().getTRStatus(trId);
            
            return {
              content: `TR 상태: ${status.status}`,
              data: status,
              type: 'info'
            };
          } catch (error) {
            return {
              content: `TR 상태 확인 중 오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
              type: 'error'
            };
          }
        }
      },
      
      // 배포 시작 명령어
      {
        id: 'deploy',
        name: 'deploy',
        type: CommandType.AT,
        prefix: CommandPrefix.AT,
        description: 'SWDP 배포 시작',
        syntax: '@swdp:deploy <environment> <buildId> [--param1=value1 --param2=value2]',
        examples: ['@swdp:deploy dev 12345', '@swdp:deploy prod 12345 --skipTests=true'],
        execute: async (args) => {
          try {
            if (!this.isInitialized()) {
              throw new Error('SWDP 플러그인이 초기화되지 않았습니다.');
            }
            
            if (args.length < 2) {
              throw new Error('환경과 빌드 ID가 필요합니다.');
            }
            
            const environment = args[0].toString();
            const buildId = args[1].toString();
            const params: Record<string, any> = {};
            
            // 파라미터 처리
            for (let i = 2; i < args.length; i++) {
              const arg = args[i];
              if (typeof arg === 'string' && arg.startsWith('--') && arg.includes('=')) {
                const [key, value] = arg.substring(2).split('=');
                if (key && value) {
                  params[key] = value;
                }
              }
            }
            
            const result = await this.getClient().startDeployment(environment, buildId, params);
            
            return {
              content: `배포가 시작되었습니다. 배포 ID: ${result.deploymentId}`,
              data: result,
              type: 'success'
            };
          } catch (error) {
            return {
              content: `배포 시작 중 오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
              type: 'error'
            };
          }
        }
      },
      
      // 배포 상태 확인 명령어
      {
        id: 'deploy-status',
        name: 'deploy:status',
        type: CommandType.AT,
        prefix: CommandPrefix.AT,
        description: 'SWDP 배포 상태 확인',
        syntax: '@swdp:deploy:status <deploymentId>',
        examples: ['@swdp:deploy:status 12345'],
        execute: async (args) => {
          try {
            if (!this.isInitialized()) {
              throw new Error('SWDP 플러그인이 초기화되지 않았습니다.');
            }
            
            if (args.length === 0) {
              throw new Error('배포 ID가 필요합니다.');
            }
            
            const deploymentId = args[0].toString();
            const status = await this.getClient().getDeploymentStatus(deploymentId);
            
            return {
              content: `배포 상태: ${status.status}`,
              data: status,
              type: 'info'
            };
          } catch (error) {
            return {
              content: `배포 상태 확인 중 오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
              type: 'error'
            };
          }
        }
      }
    ];
    
    return true;
  }
}