/**
 * Git 플러그인
 * 
 * Git 명령어 실행 및 관리 기능을 제공하는 내부 플러그인
 * 저장소 관리, 커밋, 푸시 등의 기능 지원
 */

import { PluginBaseService } from '../../../core/plugin-system/PluginBaseService';
import { PluginCommand } from '../../../types/PluginTypes';
import { IConfigLoader } from '../../../types/ConfigTypes';
import { CommandType, CommandPrefix } from '../../../types/CommandTypes';
import { GitClientService } from './GitClientService';

/**
 * Git 플러그인 클래스
 * Git 작업 관련 기능 제공
 */
export class GitPluginService extends PluginBaseService {
  /**
   * 플러그인 ID
   */
  id = 'git_internal_api';
  
  /**
   * 플러그인 이름
   */
  name = 'Git 저장소 관리';
  
  /**
   * Git 클라이언트
   */
  private client: GitClientService;
  
  /**
   * GitPluginService 생성자
   * @param configLoader 설정 로더
   */
  constructor(configLoader: IConfigLoader) {
    super(configLoader);
    
    // 내부 플러그인 설정 (고정값)
    this.config = {
      enabled: true
    };
    
    // Git 클라이언트 생성
    this.client = new GitClientService();
    
    // 명령어 등록
    this.registerCommands();
  }
  
  /**
   * 플러그인 초기화
   */
  async initialize(): Promise<void> {
    // Git 초기화는 특별한 작업이 필요 없음
    console.log('Git 플러그인 초기화 완료');
  }
  
  /**
   * 명령어 등록
   * 
   * @param customCommands 외부에서 추가할 명령어 (사용하지 않음)
   * @returns 등록 성공 여부
   */
  protected registerCommands(customCommands?: PluginCommand[]): boolean {
    this.commands = [
      // 상태 확인 명령어
      {
        id: 'status',
        name: 'status',
        type: CommandType.AT,
        prefix: CommandPrefix.AT,
        description: 'Git 저장소 상태 확인',
        syntax: '@git:status',
        examples: ['@git:status'],
        execute: async () => this.getStatus()
      },
      
      // 변경 내역 확인 명령어
      {
        id: 'diff',
        name: 'diff',
        type: CommandType.AT,
        prefix: CommandPrefix.AT,
        description: '변경 내역 확인',
        syntax: '@git:diff [file]',
        examples: ['@git:diff', '@git:diff src/index.ts'],
        execute: async (args) => this.getDiff(args[0])
      },
      
      // 커밋 명령어
      {
        id: 'commit',
        name: 'commit',
        type: CommandType.AT,
        prefix: CommandPrefix.AT,
        description: '변경 내용 커밋',
        syntax: '@git:commit <message> [--all]',
        examples: [
          '@git:commit "기능 추가: 사용자 인증"',
          '@git:commit "버그 수정: 로그인 오류" --all'
        ],
        execute: async (args) => this.commit(args)
      },
      
      // 푸시 명령어
      {
        id: 'push',
        name: 'push',
        type: CommandType.AT,
        prefix: CommandPrefix.AT,
        description: '커밋 푸시',
        syntax: '@git:push [remote] [branch]',
        examples: ['@git:push', '@git:push origin main'],
        execute: async (args) => this.push(args[0], args[1])
      },
      
      // 커밋 이력 확인 명령어
      {
        id: 'log',
        name: 'log',
        type: CommandType.AT,
        prefix: CommandPrefix.AT,
        description: '커밋 이력 확인',
        syntax: '@git:log [--count=<number>]',
        examples: ['@git:log', '@git:log --count=5'],
        execute: async (args) => this.getLog(this.extractOptions(args))
      }
    ];
    return true;
  }
  
  /**
   * Git 상태 확인
   * @returns 상태 정보
   */
  private async getStatus(): Promise<any> {
    try {
      const status = await this.client.getStatus();
      
      return {
        content: `# Git 저장소 상태\n\n` +
                `**브랜치**: ${status.branch}\n` +
                `**추적 중**: ${status.tracking || '없음'}\n\n` +
                `## 변경 사항\n` +
                (status.changes.length > 0 ? 
                  status.changes.map((change: any) => `- ${change.type} ${change.path}`).join('\n') : 
                  '변경 사항 없음'),
        data: status,
        type: 'git-status'
      };
    } catch (error) {
      console.error('Git 상태 확인 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 변경 내역 확인
   * @param file 특정 파일 (선택적)
   * @returns 변경 내역
   */
  private async getDiff(file?: string): Promise<any> {
    try {
      const diff = await this.client.getDiff(false);
      
      // 변경 사항이 없는 경우
      if (!diff.trim()) {
        return {
          content: '# 변경 사항 없음\n\n현재 저장소에 변경 사항이 없습니다.',
          type: 'git-diff'
        };
      }
      
      return {
        content: `# 변경 내역\n\n` +
                `\`\`\`diff\n${diff}\n\`\`\``,
        type: 'git-diff'
      };
    } catch (error) {
      console.error('Git 변경 내역 확인 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 변경 내용 커밋
   * @param args 명령어 인자
   * @returns 커밋 결과
   */
  private async commit(args: any[]): Promise<any> {
    try {
      const options = this.extractOptions(args);
      const message = args[0];
      
      if (!message) {
        throw new Error('커밋 메시지는 필수입니다');
      }
      
      // 커밋 옵션 구성
      const commitOptions = {
        message: message,
        all: options.all === true
      };
      
      const result = await this.client.commit(commitOptions);
      
      return {
        content: `# 커밋 완료\n\n` +
                `**해시**: ${result.hash}\n` +
                `**작성자**: ${result.authorName} <${result.authorEmail}>\n` +
                `**메시지**: ${result.subject}\n` +
                `**시간**: ${new Date(result.timestamp * 1000).toLocaleString()}`,
        data: result,
        type: 'git-commit'
      };
    } catch (error) {
      console.error('Git 커밋 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 커밋 푸시
   * @param remote 원격 저장소 (기본값: origin)
   * @param branch 브랜치 (기본값: 현재 브랜치)
   * @returns 푸시 결과
   */
  private async push(remote?: string, branch?: string): Promise<any> {
    try {
      const result = await this.client.push({
        remote,
        branch
      });
      
      return {
        content: `# 푸시 완료\n\n` +
                `**원격 저장소**: ${result.remote}\n` +
                `**브랜치**: ${result.branch}`,
        data: result,
        type: 'git-push'
      };
    } catch (error) {
      console.error('Git 푸시 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 커밋 이력 확인
   * @param options 옵션
   * @returns 커밋 이력
   */
  private async getLog(options: Record<string, any>): Promise<any> {
    try {
      // 이 부분은 GitClientService에 해당 기능이 아직 구현되지 않아 임시 응답
      return {
        content: `# 커밋 이력\n\n` +
                `아직 구현 중인 기능입니다. 곧 추가될 예정입니다.`,
        type: 'git-log'
      };
    } catch (error) {
      console.error('Git 로그 확인 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 명령어 옵션 추출
   * @param args 명령어 인자
   * @returns 옵션 객체
   */
  private extractOptions(args: any[]): Record<string, any> {
    const options: Record<string, any> = {};
    
    // 플래그 형식 옵션 추출 (--key=value 또는 --flag)
    for (const arg of args) {
      if (typeof arg === 'string' && arg.startsWith('--')) {
        const [key, value] = arg.substring(2).split('=');
        if (key && value !== undefined) {
          options[key] = value;
        } else if (key) {
          options[key] = true;
        }
      }
    }
    
    return options;
  }
}