/**
 * Axiom 코어 서비스
 * 
 * 모든 핵심 서비스를 통합하고 관리하는 중앙 서비스
 * 싱글톤 패턴으로 구현되어 전역적인 접근 제공
 */

import * as vscode from 'vscode';
import { EventEmitter } from 'events';

// 명령어 시스템
import { 
  CommandParserService, 
  CommandRegistryService, 
  CommandExecutorService 
} from './command';

// 설정 시스템
import { 
  ConfigLoaderService,
  ConfigValidatorService
} from './config';

// 플러그인 시스템
import { 
  PluginRegistryService 
} from './plugin-system';

// LLM 서비스
import { LlmService } from './llm';

// VS Code 서비스
import { VSCodeService } from './vscode';

// HTTP 클라이언트
import { HttpClientService } from './http';

// 프롬프트 시스템
import { 
  PromptAssemblerService,
  RulesEngineService
} from './prompt';

// 유틸리티
import { LoggerService } from './utils';

// 타입 임포트
import { Command } from '../types/CommandTypes';

/**
 * Axiom 코어 서비스 클래스
 * 모든 핵심 서비스 통합 및 관리
 */
export class AxiomCoreService extends EventEmitter {
  // 싱글톤 인스턴스
  private static _instance: AxiomCoreService;
  
  // 서비스 활성화 상태
  private _isEnabled: boolean = false;
  
  // 서비스 인스턴스
  private _configLoader: ConfigLoaderService;
  private _configValidator: ConfigValidatorService;
  private _commandParser: CommandParserService;
  private _commandRegistry: CommandRegistryService;
  private _commandExecutor: CommandExecutorService;
  private _pluginRegistry: PluginRegistryService;
  private _llmService: LlmService;
  private _vsCodeService: VSCodeService;
  private _httpService: HttpClientService;
  private _promptAssembler: PromptAssemblerService;
  private _rulesEngine: RulesEngineService;
  private _logger: LoggerService;
  
  /**
   * AxiomCoreService 생성자
   * 모든 서비스 초기화
   * @param context VS Code 확장 컨텍스트
   */
  private constructor(private context: vscode.ExtensionContext) {
    super();
    
    // 필수 서비스 초기화
    this._logger = new LoggerService();
    this._configLoader = new ConfigLoaderService();
    this._configValidator = new ConfigValidatorService(this._configLoader);
    this._commandParser = new CommandParserService();
    this._httpService = new HttpClientService();
    this._vsCodeService = new VSCodeService(context);
    
    // 플러그인 시스템 초기화
    this._pluginRegistry = new PluginRegistryService(this._configLoader);
    
    // 명령어 시스템 초기화
    this._commandRegistry = new CommandRegistryService(this._pluginRegistry);
    this._commandExecutor = new CommandExecutorService(
      this._commandRegistry,
      this._pluginRegistry
    );
    
    // LLM 서비스 초기화
    this._llmService = new LlmService();
    
    // 프롬프트 시스템 초기화
    this._rulesEngine = new RulesEngineService();
    this._promptAssembler = new PromptAssemblerService(this._rulesEngine);
  }
  
  /**
   * 싱글톤 인스턴스 반환
   * @param context VS Code 확장 컨텍스트 (최초 호출 시에만 필요)
   * @returns AxiomCoreService 인스턴스
   */
  public static getInstance(context?: vscode.ExtensionContext): AxiomCoreService {
    if (!AxiomCoreService._instance) {
      if (!context) {
        throw new Error('AxiomCoreService 초기화에 context가 필요합니다.');
      }
      AxiomCoreService._instance = new AxiomCoreService(context);
    }
    return AxiomCoreService._instance;
  }
  
  /**
   * 내부 플러그인 등록
   * @returns 등록된 플러그인 수
   */
  private async registerInternalPlugins(): Promise<number> {
    try {
      this._logger.info('내부 플러그인 등록 시작');
      
      // 대체 방식: 직접 클래스 가져오기
      try {
        this._logger.info('직접 클래스 가져오기 시도...');
        
        // Git 플러그인 
        try {
          this._logger.info('Git 플러그인 직접 로드 시도...');
          const GitPluginService = (await import('../plugins/internal/git/GitPluginService')).GitPluginService;
          const gitPlugin = new GitPluginService(this._configLoader);
          if (this._pluginRegistry.registerPlugin(gitPlugin, 'internal')) {
            this._logger.info(`Git 플러그인 등록 성공: ${gitPlugin.name} (${gitPlugin.id})`);
          }
        } catch (gitError) {
          this._logger.error('Git 플러그인 로드 실패:', gitError);
          this._logger.error('상세 오류 정보:', JSON.stringify(gitError, Object.getOwnPropertyNames(gitError)));
        }

        // Jira 플러그인 
        try {
          this._logger.info('Jira 플러그인 직접 로드 시도...');
          const JiraPluginService = (await import('../plugins/internal/jira/JiraPluginService')).JiraPluginService;
          const jiraPlugin = new JiraPluginService(this._configLoader);
          if (this._pluginRegistry.registerPlugin(jiraPlugin, 'internal')) {
            this._logger.info(`Jira 플러그인 등록 성공: ${jiraPlugin.name} (${jiraPlugin.id})`);
          }
        } catch (jiraError) {
          this._logger.error('Jira 플러그인 로드 실패:', jiraError);
          this._logger.error('상세 오류 정보:', JSON.stringify(jiraError, Object.getOwnPropertyNames(jiraError)));
        }

        // SWDP 플러그인 
        try {
          this._logger.info('SWDP 플러그인 직접 로드 시도...');
          const SwdpPluginService = (await import('../plugins/internal/swdp/SwdpPluginService')).SwdpPluginService;
          const swdpPlugin = new SwdpPluginService(this._configLoader);
          if (this._pluginRegistry.registerPlugin(swdpPlugin, 'internal')) {
            this._logger.info(`SWDP 플러그인 등록 성공: ${swdpPlugin.name} (${swdpPlugin.id})`);
          }
        } catch (swdpError) {
          this._logger.error('SWDP 플러그인 로드 실패:', swdpError);
          this._logger.error('상세 오류 정보:', JSON.stringify(swdpError, Object.getOwnPropertyNames(swdpError)));
        }
        
        // 등록된 플러그인 수 계산
        const count = this._pluginRegistry.getInternalPlugins().length;
        this._logger.info(`총 ${count}개의 내부 플러그인 등록됨`);
        return count;
        
      } catch (directImportError) {
        this._logger.error('직접 클래스 가져오기 실패:', directImportError);
        this._logger.error('상세 오류 정보:', JSON.stringify(directImportError, Object.getOwnPropertyNames(directImportError)));
        
        // 이전 방식으로 시도
        this._logger.info('내부 플러그인 모듈 인덱스를 통한 로딩 시도...');
        const internalPluginsPath = '../plugins/internal';
        this._logger.info(`모듈 경로: ${internalPluginsPath}`);
        
        try {
          const internalPlugins = await import(internalPluginsPath);
          this._logger.info('내부 플러그인 모듈 로딩 성공:', Object.keys(internalPlugins));
          
          // 내부 플러그인 인스턴스 생성 및 등록
          let count = 0;
          
          // Git 플러그인 등록
          try {
            this._logger.info('Git 플러그인 등록 시도 중...');
            const GitPluginService = internalPlugins.GitPluginService;
            if (!GitPluginService) {
              this._logger.error('GitPluginService를 찾을 수 없습니다');
            } else {
              const gitPlugin = new GitPluginService(this._configLoader);
              if (this._pluginRegistry.registerPlugin(gitPlugin, 'internal')) {
                count++;
                this._logger.info(`내부 플러그인 등록 성공: ${gitPlugin.name} (${gitPlugin.id})`);
              }
            }
          } catch (gitError) {
            this._logger.error('Git 플러그인 등록 실패:', gitError);
          }
          
          // Jira 플러그인 등록
          try {
            this._logger.info('Jira 플러그인 등록 시도 중...');
            const JiraPluginService = internalPlugins.JiraPluginService;
            if (!JiraPluginService) {
              this._logger.error('JiraPluginService를 찾을 수 없습니다');
            } else {
              const jiraPlugin = new JiraPluginService(this._configLoader);
              if (this._pluginRegistry.registerPlugin(jiraPlugin, 'internal')) {
                count++;
                this._logger.info(`내부 플러그인 등록 성공: ${jiraPlugin.name} (${jiraPlugin.id})`);
              }
            }
          } catch (jiraError) {
            this._logger.error('Jira 플러그인 등록 실패:', jiraError);
          }
          
          // SWDP 플러그인 등록
          try {
            this._logger.info('SWDP 플러그인 등록 시도 중...');
            const SwdpPluginService = internalPlugins.SwdpPluginService;
            if (!SwdpPluginService) {
              this._logger.error('SwdpPluginService를 찾을 수 없습니다');
            } else {
              const swdpPlugin = new SwdpPluginService(this._configLoader);
              if (this._pluginRegistry.registerPlugin(swdpPlugin, 'internal')) {
                count++;
                this._logger.info(`내부 플러그인 등록 성공: ${swdpPlugin.name} (${swdpPlugin.id})`);
              }
            }
          } catch (swdpError) {
            this._logger.error('SWDP 플러그인 등록 실패:', swdpError);
          }
          
          this._logger.info(`총 ${count}개의 내부 플러그인 등록됨`);
          return count;
          
        } catch (importError) {
          this._logger.error('내부 플러그인 모듈 로딩 실패:', importError);
          this._logger.error('상세 오류 정보:', JSON.stringify(importError, Object.getOwnPropertyNames(importError)));
          
          // 임시 대응: 없이 진행
          this._logger.info('내부 플러그인 없이 진행합니다.');
          return 0;
        }
      }
    } catch (error) {
      this._logger.error('내부 플러그인 등록 중 오류 발생:', error);
      this._logger.error('상세 오류 정보:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      return 0;
    }
  }
  
  /**
   * 코어 서비스 초기화
   * 모든 하위 서비스 및 플러그인 초기화
   * @returns 초기화 성공 여부
   */
  public async initialize(): Promise<boolean> {
    try {
      this._logger.info('Axiom 코어 서비스 초기화 시작');
      
      // 설정 로드 및 검증
      try {
        this._logger.info('설정 검증 시작');
        const configValid = await this._configValidator.validateConfig();
        if (!configValid) {
          this._logger.error('설정 검증 실패');
          return false;
        }
        this._logger.info('설정 검증 성공');
      } catch (configError) {
        this._logger.error('설정 검증 중 오류:', configError);
        this._logger.error('상세 오류 정보:', JSON.stringify(configError, Object.getOwnPropertyNames(configError)));
        
        // 설정 오류 무시하고 진행 (개발 모드)
        this._logger.info('설정 오류 무시하고 진행...');
      }
      
      // SSL 우회 설정 확인 및 적용
      try {
        this._logger.info('SSL 우회 설정 적용 시작');
        const sslBypassEnabled = this._configLoader.getCoreSetting('sslBypass') || false;
        this._httpService.setSSLBypass(sslBypassEnabled);
        this._logger.info(`SSL 우회 설정 적용 완료: ${sslBypassEnabled ? '사용' : '사용 안 함'}`);
      } catch (sslError) {
        this._logger.error('SSL 우회 설정 적용 중 오류:', sslError);
      }
      
      // 내부 플러그인 등록
      try {
        this._logger.info('내부 플러그인 등록 시작');
        const pluginCount = await this.registerInternalPlugins();
        this._logger.info(`${pluginCount}개의 내부 플러그인 등록 완료`);
      } catch (pluginError) {
        this._logger.error('내부 플러그인 등록 중 오류:', pluginError);
        this._logger.error('상세 오류 정보:', JSON.stringify(pluginError, Object.getOwnPropertyNames(pluginError)));
        
        // 플러그인 오류 무시하고 진행
        this._logger.info('플러그인 오류 무시하고 진행...');
      }
      
      // 플러그인 초기화
      try {
        this._logger.info('플러그인 초기화 시작');
        await this._pluginRegistry.initialize();
        this._logger.info('플러그인 초기화 완료');
      } catch (initError) {
        this._logger.error('플러그인 초기화 중 오류:', initError);
        this._logger.error('상세 오류 정보:', JSON.stringify(initError, Object.getOwnPropertyNames(initError)));
        
        // 초기화 오류 무시하고 진행
        this._logger.info('초기화 오류 무시하고 진행...');
      }
      
      // 서비스 활성화
      this._isEnabled = true;
      this.emit('core-initialized');
      this._logger.info('Axiom 코어 서비스 초기화 성공');
      
      return true;
    } catch (error) {
      this._logger.error('Axiom 코어 서비스 초기화 실패:', error);
      this._logger.error('상세 오류 정보:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      console.error('Axiom 코어 서비스 초기화 실패 상세 정보:', error);
      
      // 중요: 오류가 발생해도 최소한의 기능은 활성화
      this._logger.info('오류 발생으로 제한 모드로 전환합니다.');
      this._isEnabled = true; // 최소 기능 활성화
      return true; // 오류가 있어도 초기화 성공으로 처리
    }
  }
  
  /**
   * 사용자 메시지 처리
   * 명령어 파싱 및 실행
   * @param text 사용자 입력 텍스트
   * @param options 처리 옵션 (스트리밍 등)
   * @returns 처리 결과
   */
  public async processMessage(text: string, options?: {
    stream?: boolean;
    onUpdate?: (chunk: string) => void;
  }): Promise<any> {
    try {
      this._logger.info(`메시지 처리 시작: "${text}"`);
      
      // 명령어 파싱
      const command = this._commandParser.parse(text);
      
      // 명령어인 경우 실행
      if (command) {
        this._logger.info(`명령어 감지됨: ${command.prefix}${command.agentId}:${command.command}`);
        
        try {
          const result = await this.executeCommand(command);
          this._logger.info('명령어 실행 성공');
          return result;
        } catch (cmdError) {
          this._logger.error(`명령어 실행 실패: ${cmdError}`);
          
          // 오류 메시지 포맷팅
          const errorMessage = cmdError instanceof Error ? cmdError.message : String(cmdError);
          return {
            content: `# 명령어 실행 오류\n\n\`${command.prefix}${command.agentId}:${command.command}\`\n\n오류: ${errorMessage}`,
            error: true
          };
        }
      }
      
      // 일반 텍스트인 경우 디버그 모드에서는 간단한 응답 반환
      if (text.trim().toLowerCase() === 'debug') {
        return {
          content: '# 디버그 모드 활성화\n\n' +
                   '현재 시간: ' + new Date().toLocaleString() + '\n\n' +
                   `등록된 명령어: ${this._commandRegistry.getAllCommandUsages().length}개\n` +
                   `등록된 플러그인: ${this._pluginRegistry.getEnabledPlugins().length}개`
        };
      }
      
      // 일반 텍스트는 LLM 응답 생성 (스트리밍 옵션 포함)
      this._logger.info(`일반 텍스트로 처리: LLM 응답 생성 (스트리밍: ${options?.stream ? '켜짐' : '꺼짐'})`);
      
      if (options?.stream && options?.onUpdate) {
        // 스트리밍 모드
        return await this.generateStreamingResponse(text, options.onUpdate);
      } else {
        // 일반 모드
        return await this.generateResponse(text);
      }
    } catch (error) {
      this._logger.error('메시지 처리 중 오류 발생:', error);
      return {
        content: `메시지 처리 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        error: true
      };
    }
  }
  
  /**
   * 스트리밍 응답 생성
   * @param text 사용자 입력 텍스트
   * @param onUpdate 스트리밍 업데이트 콜백
   * @returns 생성된 응답
   */
  private async generateStreamingResponse(text: string, onUpdate: (chunk: string) => void): Promise<any> {
    try {
      // 프롬프트 어셈블러로 컨텍스트 주입
      const promptData = await this._promptAssembler.assemblePrompt(text);
      
      this._logger.info(`스트리밍 프롬프트 생성 완료: 메시지 ${promptData.messages.length}개`);
      
      // 메시지가 비어있는 경우 기본 메시지 추가
      if (!promptData.messages || promptData.messages.length === 0) {
        promptData.messages = [
          {
            role: 'user',
            content: text || '안녕하세요'
          }
        ];
      }
      
      // 현재 설정된 모델 ID 확인
      const modelId = this._llmService.getDefaultModelId();
      this._logger.info(`스트리밍 요청에 사용할 모델 ID: ${modelId}`);
      
      // LLM 서비스로 응답 생성 (스트리밍 모드)
      const response = await this._llmService.sendRequest({
        model: modelId,
        messages: promptData.messages,
        temperature: promptData.temperature,
        stream: true,
        onUpdate: onUpdate
      });
      
      return response;
    } catch (error) {
      this._logger.error('스트리밍 응답 생성 중 오류 발생:', error);
      onUpdate(`\n\n오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      
      // 오류 발생 시 기본 응답 반환
      return {
        content: `죄송합니다. 응답을 생성하는 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      };
    }
  }
  
  /**
   * 명령어 실행
   * @param command 실행할 명령어
   * @returns 실행 결과
   */
  public async executeCommand(command: Command): Promise<any> {
    try {
      return await this._commandExecutor.execute(command);
    } catch (error) {
      this._logger.error(`명령어 실행 중 오류 발생 (${command.prefix}${command.agentId}:${command.command}):`, error);
      throw error;
    }
  }
  
  /**
   * LLM 응답 생성
   * @param text 사용자 입력 텍스트
   * @returns 생성된 응답
   */
  private async generateResponse(text: string): Promise<any> {
    try {
      // 프롬프트 어셈블러로 컨텍스트 주입
      const promptData = await this._promptAssembler.assemblePrompt(text);
      
      this._logger.info(`프롬프트 생성 완료: 메시지 ${promptData.messages.length}개, 온도 ${promptData.temperature}`);
      
      // 메시지가 비어있는 경우 기본 메시지 추가
      if (!promptData.messages || promptData.messages.length === 0) {
        promptData.messages = [
          {
            role: 'user',
            content: text || '안녕하세요'
          }
        ];
      }
      
      // LLM 서비스로 응답 생성
      const response = await this._llmService.sendRequest({
        model: this._llmService.getDefaultModelId(),
        messages: promptData.messages,
        temperature: promptData.temperature
      });
      
      return response;
    } catch (error) {
      this._logger.error('응답 생성 중 오류 발생:', error);
      
      // 오류 발생 시 기본 응답 반환
      return {
        content: `죄송합니다. 응답을 생성하는 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      };
    }
  }
  
  /**
   * 컨텍스트 정보 수집
   * @returns 컨텍스트 정보
   */
  public async collectContext(): Promise<any> {
    try {
      // VS Code 정보 수집
      const editorContext = await this._vsCodeService.getEditorContext();
      
      // 활성 플러그인 정보
      const pluginInfo = this._pluginRegistry.getEnabledPlugins().map(p => p.id);
      
      return {
        editor: editorContext,
        plugins: pluginInfo
      };
    } catch (error) {
      this._logger.error('컨텍스트 수집 중 오류 발생:', error);
      return {};
    }
  }
  
  // 서비스 인스턴스 접근자
  
  get configLoader(): ConfigLoaderService {
    return this._configLoader;
  }
  
  get commandRegistry(): CommandRegistryService {
    return this._commandRegistry;
  }
  
  get pluginRegistry(): PluginRegistryService {
    return this._pluginRegistry;
  }
  
  get llmService(): LlmService {
    return this._llmService;
  }
  
  get vsCodeService(): VSCodeService {
    return this._vsCodeService;
  }
  
  get httpService(): HttpClientService {
    return this._httpService;
  }
  
  get promptAssembler(): PromptAssemblerService {
    return this._promptAssembler;
  }
  
  get logger(): LoggerService {
    return this._logger;
  }
  
  /**
   * 서비스 활성화 여부
   * @returns 활성화 상태
   */
  public isEnabled(): boolean {
    return this._isEnabled;
  }
}