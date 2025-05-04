/**
 * Jira 플러그인
 * 
 * Jira 이슈 관리 기능을 제공하는 내부 플러그인
 * 이슈 조회, 생성, 업데이트 등의 기능 지원
 */

import { PluginBaseService } from '../../../core/plugin-system/PluginBaseService';
import { PluginCommand } from '../../../types/PluginTypes';
import { IConfigLoader } from '../../../types/ConfigTypes';
import { JiraIssueData } from '../../../types/PluginTypes';
import { CommandType, CommandPrefix } from '../../../types/CommandTypes';
import { JiraClientService } from './JiraClientService';

/**
 * Jira 플러그인 클래스
 * Jira 이슈 관리 기능 제공
 */
export class JiraPluginService extends PluginBaseService {
  /**
   * 플러그인 ID
   */
  id = 'jira_internal_api';
  
  /**
   * 플러그인 이름
   */
  name = 'Jira 이슈 관리';
  
  /**
   * Jira API 클라이언트
   */
  private client: JiraClientService;
  
  /**
   * JiraPluginService 생성자
   * @param configLoader 설정 로더
   */
  constructor(configLoader: IConfigLoader) {
    super(configLoader);
    
    // 내부 플러그인 설정 (고정값)
    this.config = {
      enabled: true,
      endpoint: this.config?.endpoint || 'https://jira.example.com',
      defaultIssueType: this.config?.defaultIssueType || 'Task'
    };
    
    // API 클라이언트 생성
    this.client = new JiraClientService(this.config.endpoint, true); // SSL 우회 활성화
    
    // 명령어 등록
    this.registerCommands();
  }
  
  /**
   * 초기화 완료 여부
   */
  private _initialized: boolean = false;

  /**
   * 플러그인 초기화 상태 반환
   * @returns 초기화 여부
   */
  isInitialized(): boolean {
    return this._initialized;
  }

  /**
   * 플러그인 초기화
   * API 클라이언트 초기화 및 인증 설정
   */
  async initialize(): Promise<void> {
    try {
      // 인증 설정 (내부 플러그인은 환경 변수 또는 설정 파일에서 인증 정보 로드)
      const credentials = this.config.credentials || {
        username: process.env.JIRA_USERNAME,
        password: process.env.JIRA_PASSWORD,
        token: process.env.JIRA_API_TOKEN
      };
      
      // 인증 정보가 유효한지 확인
      const hasValidCredentials = 
        (credentials.token && credentials.token !== '${JIRA_API_TOKEN}') || 
        (credentials.username && credentials.password);
      
      if (hasValidCredentials) {
        await this.client.initialize(credentials);
        this._initialized = true;
        console.log('Jira 플러그인 초기화 완료');
      } else {
        console.warn('Jira 플러그인 인증 정보가 없습니다. 일부 기능이 제한됩니다.');
        // 인증 정보 없이 초기화는 성공으로 처리하지만 _initialized는 false로 유지
        this._initialized = false;
      }
    } catch (error) {
      console.error('Jira 플러그인 초기화 중 오류 발생:', error);
      // 오류를 던지지 않고 경고만 출력
      this._initialized = false;
    }
  }
  
  /**
   * 명령어 등록
   * 
   * @param customCommands 외부에서 추가할 명령어 (사용하지 않음)
   * @returns 등록 성공 여부
   */
  protected registerCommands(customCommands?: PluginCommand[]): boolean {
    this.commands = [
      // 이슈 조회 명령어
      {
        id: 'issue',
        name: 'issue',
        type: CommandType.AT,
        prefix: CommandPrefix.AT,
        description: 'Jira 이슈 조회',
        syntax: '@jira:issue <issueKey>',
        examples: ['@jira:issue PROJ-123'],
        execute: async (args) => this.getIssue(args[0])
      },
      
      // 이슈 생성 명령어
      {
        id: 'create',
        name: 'create',
        type: CommandType.AT,
        prefix: CommandPrefix.AT,
        description: '새 Jira 이슈 생성',
        syntax: '@jira:create <project> <summary> <description> [--type=<type>]',
        examples: [
          '@jira:create PROJ "버그 수정" "상세 설명" --type=Bug',
          '@jira:create PROJ "새 기능" "기능 설명"'
        ],
        execute: async (args) => this.createIssue(args)
      },
      
      // 이슈 검색 명령어
      {
        id: 'search',
        name: 'search',
        type: CommandType.AT,
        prefix: CommandPrefix.AT,
        description: 'Jira 이슈 검색',
        syntax: '@jira:search <query> [--limit=<limit>]',
        examples: [
          '@jira:search "project = PROJ AND status = Open"',
          '@jira:search "assignee = currentUser()" --limit=10'
        ],
        execute: async (args) => this.searchIssues(args[0], this.extractOptions(args))
      },
      
      // 이슈 업데이트 명령어
      {
        id: 'update',
        name: 'update',
        type: CommandType.AT,
        prefix: CommandPrefix.AT,
        description: 'Jira 이슈 업데이트',
        syntax: '@jira:update <issueKey> <field> <value>',
        examples: [
          '@jira:update PROJ-123 summary "업데이트된 제목"',
          '@jira:update PROJ-123 status "In Progress"'
        ],
        execute: async (args) => this.updateIssue(args[0], args[1], args[2])
      },
      
      // 이슈 코멘트 추가 명령어
      {
        id: 'comment',
        name: 'comment',
        type: CommandType.AT,
        prefix: CommandPrefix.AT,
        description: 'Jira 이슈에 코멘트 추가',
        syntax: '@jira:comment <issueKey> <comment>',
        examples: ['@jira:comment PROJ-123 "작업 완료했습니다."'],
        execute: async (args) => this.addComment(args[0], args[1])
      }
    ];
    return true;
  }
  
  /**
   * 이슈 조회
   * @param issueKey 이슈 키
   * @returns 이슈 정보
   */
  private async getIssue(issueKey: string): Promise<any> {
    try {
      const issue = await this.client.getIssue(issueKey);
      
      // 인증 오류 처리
      if (issue && issue.error) {
        return {
          content: `# Jira 인증 오류\n\n${issue.message}\n\n` +
                   `설정 파일에 Jira 인증 정보를 추가하세요:\n` +
                   "```json\n\"internalPlugins\": {\n  \"jira\": {\n    \"credentials\": {\n      \"token\": \"실제_토큰_값\"\n    }\n  }\n}\n```",
          error: true,
          type: 'jira-auth-error'
        };
      }
      
      // 응답 포맷팅
      return {
        content: `# ${issue.key}: ${issue.fields.summary}\n\n` +
                 `**상태**: ${issue.fields.status.name}\n` +
                 `**유형**: ${issue.fields.issuetype.name}\n` +
                 `**담당자**: ${issue.fields.assignee ? issue.fields.assignee.displayName : '미할당'}\n\n` +
                 `## 설명\n${issue.fields.description || '설명 없음'}\n\n` +
                 `## 링크\n${this.config.endpoint}/browse/${issue.key}`,
        data: issue,
        type: 'jira-issue'
      };
    } catch (error: any) {
      console.error(`이슈 조회 중 오류 발생 (${issueKey}):`, error);
      return {
        content: `# Jira 이슈 조회 오류\n\n조회 중 오류가 발생했습니다: ${error?.message || '알 수 없는 오류'}\n\n` +
                 `Jira 서버 연결 및 인증 정보를 확인하세요.`,
        error: true,
        type: 'jira-error'
      };
    }
  }
  
  /**
   * 이슈 생성
   * @param args 명령어 인자
   * @returns 생성된 이슈 정보
   */
  private async createIssue(args: any[]): Promise<any> {
    try {
      const options = this.extractOptions(args);
      
      // 필수 인자 확인
      if (!args[0] || !args[1]) {
        throw new Error('프로젝트와 제목은 필수입니다');
      }
      
      // 이슈 데이터 구성
      const issueData: JiraIssueData = {
        projectKey: args[0],
        summary: args[1],
        description: args[2] || '',
        issueType: options.type || this.config.defaultIssueType || 'Task'
      };
      
      // 추가 필드 설정
      if (options.priority) {
        issueData.priority = options.priority;
      }
      
      if (options.assignee) {
        issueData.assignee = options.assignee;
      }
      
      if (options.labels) {
        issueData.labels = options.labels.split(',').map((label: string) => label.trim());
      }
      
      // 사용자 정의 필드 처리
      if (this.config.customFields) {
        issueData.customFields = {};
        
        for (const [fieldName, fieldId] of Object.entries(this.config.customFields)) {
          if (options[fieldName]) {
            issueData.customFields[fieldId as string] = options[fieldName];
          }
        }
      }
      
      // 이슈 생성
      const issue = await this.client.createIssue(issueData);
      
      // 응답 포맷팅
      return {
        content: `# 이슈 생성 완료\n\n` +
                 `**키**: [${issue.key}](${this.config.endpoint}/browse/${issue.key})\n` +
                 `**제목**: ${issue.fields.summary}\n` +
                 `**상태**: ${issue.fields.status.name}\n` +
                 `**유형**: ${issue.fields.issuetype.name}`,
        data: issue,
        type: 'jira-issue-created'
      };
    } catch (error) {
      console.error('이슈 생성 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 이슈 검색
   * @param query JQL 쿼리
   * @param options 검색 옵션
   * @returns 검색 결과
   */
  private async searchIssues(query: string, options: Record<string, any>): Promise<any> {
    try {
      const limit = options.limit ? parseInt(options.limit, 10) : 10;
      const results = await this.client.searchIssues(query, limit);
      
      // 응답 포맷팅
      const issueList = results.issues.map((issue: any) => 
        `- [${issue.key}](${this.config.endpoint}/browse/${issue.key}): ${issue.fields.summary} (${issue.fields.status.name})`
      ).join('\n');
      
      return {
        content: `# 검색 결과: ${results.total}개 이슈 찾음\n\n` +
                 `**쿼리**: ${query}\n\n` +
                 `## 이슈 목록\n${issueList || '검색 결과 없음'}`,
        data: results,
        type: 'jira-search-results'
      };
    } catch (error) {
      console.error('이슈 검색 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 이슈 업데이트
   * @param issueKey 이슈 키
   * @param field 필드 이름
   * @param value 새 값
   * @returns 업데이트 결과
   */
  private async updateIssue(issueKey: string, field: string, value: string): Promise<any> {
    try {
      const issue = await this.client.updateIssue(issueKey, field, value);
      
      // 응답 포맷팅
      return {
        content: `# 이슈 업데이트 완료\n\n` +
                 `**키**: [${issue.key}](${this.config.endpoint}/browse/${issue.key})\n` +
                 `**필드**: ${field}\n` +
                 `**새 값**: ${value}\n\n` +
                 `## 현재 상태\n` +
                 `**제목**: ${issue.fields.summary}\n` +
                 `**상태**: ${issue.fields.status.name}`,
        data: issue,
        type: 'jira-issue-updated'
      };
    } catch (error) {
      console.error(`이슈 업데이트 중 오류 발생 (${issueKey}):`, error);
      throw error;
    }
  }
  
  /**
   * 이슈에 코멘트 추가
   * @param issueKey 이슈 키
   * @param comment 코멘트 내용
   * @returns 코멘트 추가 결과
   */
  private async addComment(issueKey: string, comment: string): Promise<any> {
    try {
      const result = await this.client.addComment(issueKey, comment);
      
      // 응답 포맷팅
      return {
        content: `# 코멘트 추가 완료\n\n` +
                 `**이슈**: [${issueKey}](${this.config.endpoint}/browse/${issueKey})\n` +
                 `**코멘트 ID**: ${result.id}\n\n` +
                 `## 코멘트 내용\n${comment}`,
        data: result,
        type: 'jira-comment-added'
      };
    } catch (error) {
      console.error(`코멘트 추가 중 오류 발생 (${issueKey}):`, error);
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
    
    // 플래그 형식 옵션 추출 (--key=value)
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