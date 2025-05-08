/**
 * Jira 서비스
 * 
 * Jira API를 사용하여 이슈 정보를 조회하고 관리하는 서비스입니다.
 * 내부망 Jira 서버와 통신하며, 실제 서버를 사용할 수 없는 경우 모의(Mock) 데이터를 사용합니다.
 */

import * as vscode from 'vscode';
import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import { ServiceConfigManager, ServiceType, AuthType } from './serviceConfig';
import { ServiceErrorType, ServiceErrorManager } from './serviceError';
import { ServiceResult, createSuccessResult, createErrorResult } from './serviceResult';
import { randomUUID } from 'crypto';

/**
 * Jira 이슈 상태 유형
 */
export enum JiraIssueStatus {
  ToDo = 'todo',
  InProgress = 'in-progress',
  Done = 'done',
  InReview = 'in-review',
  Blocked = 'blocked',
  Unknown = 'unknown'
}

/**
 * Jira 이슈 정보 인터페이스
 */
export interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  description?: string;
  status: JiraIssueStatus;
  assignee?: {
    name: string;
    displayName: string;
    email?: string;
  };
  reporter?: {
    name: string;
    displayName: string;
    email?: string;
  };
  created: string;
  updated: string;
  dueDate?: string;
  priority?: {
    id: string;
    name: string;
  };
  labels?: string[];
  components?: {
    id: string;
    name: string;
  }[];
  project?: {
    id: string;
    key: string;
    name: string;
  };
}

/**
 * Jira 검색 조건 인터페이스
 */
export interface JiraSearchCriteria {
  projectKey?: string;
  assignee?: string;
  reporter?: string;
  status?: JiraIssueStatus | JiraIssueStatus[];
  labels?: string[];
  components?: string[];
  text?: string;
  createdAfter?: string;
  updatedAfter?: string;
  maxResults?: number;
  startAt?: number;
}

/**
 * Jira 검색 결과 인터페이스
 */
export interface JiraSearchResult {
  issues: JiraIssue[];
  total: number;
  startAt: number;
  maxResults: number;
  hasMore: boolean;
}

/**
 * Jira 요약 정보 인터페이스
 */
export interface JiraSummary {
  totalIssues: number;
  issuesByStatus: Record<JiraIssueStatus, number>;
  issuesByAssignee: Record<string, number>;
  issuesByPriority: Record<string, number>;
  recentIssues: JiraIssue[];
  oldestUnresolvedIssues: JiraIssue[];
  averageResolutionTime?: number; // 밀리초 단위, 해결된 이슈의 평균 해결 시간
  projectStats?: {
    projectKey: string;
    totalIssues: number; 
    openIssues: number;
    percentComplete: number;
  };
}

/**
 * Jira 서비스 오류 유형
 */
export enum JiraErrorType {
  ConnectionFailed = 'connection_failed',
  AuthenticationFailed = 'authentication_failed',
  PermissionDenied = 'permission_denied',
  ResourceNotFound = 'resource_not_found',
  ServerError = 'server_error',
  InvalidRequest = 'invalid_request',
  Unknown = 'unknown'
}

/**
 * Jira 서비스 오류 인터페이스
 */
export interface JiraError {
  type: JiraErrorType;
  message: string;
  details?: any;
}

/**
 * Jira 서비스 클래스
 */
export class JiraService implements vscode.Disposable {
  private baseUrl: string = '';
  private apiPath: string = '/rest/api/2';
  private username: string = '';
  private password: string = '';
  private token: string = '';
  private authType: AuthType = AuthType.Basic;
  private useMock: boolean = true;
  private disposables: vscode.Disposable[] = [];
  private _lastError: JiraError | null = null;
  
  /**
   * Jira 서비스 생성자
   * @param context VSCode 확장 컨텍스트
   * @param serviceConfigManager 서비스 설정 관리자 (선택적)
   */
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly serviceConfigManager?: ServiceConfigManager
  ) {
    // 설정 로드
    this.loadConfiguration();
    
    // 설정 변경 감지
    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('ape.jira')) {
          this.loadConfiguration();
        }
      })
    );
  }
  
  /**
   * 설정 다시 로드
   */
  private loadConfiguration(): void {
    if (this.serviceConfigManager) {
      // 서비스 설정 관리자를 사용하여 설정 로드
      const config = this.serviceConfigManager.getServiceConfig(ServiceType.Jira);
      this.baseUrl = config.url;
      this.authType = config.authType;
      this.username = config.username || '';
      this.password = config.password || '';
      this.token = config.token || '';
      this.useMock = config.useMock;
      
      // 추가 파라미터에서 API 경로 가져오기
      const additionalParams = config.additionalParams || {};
      this.apiPath = additionalParams.apiPath || '/rest/api/2';
    } else {
      // 직접 VSCode 설정에서 로드
      const config = vscode.workspace.getConfiguration('ape.jira');
      this.baseUrl = config.get('url', '');
      this.apiPath = config.get('apiPath', '/rest/api/2');
      this.username = config.get('username', '');
      this.password = config.get('password', '');
      this.token = config.get('token', '');
      this.authType = config.get('authType', AuthType.Basic);
      this.useMock = config.get('useMock', false);
    }
    
    // 필수 설정이 없으면 모의 모드 강제 활성화
    if (!this.baseUrl || (this.authType === AuthType.Basic && (!this.username || !this.password)) || 
        (this.authType === AuthType.Token && !this.token)) {
      this.useMock = true;
    }
  }
  
  /**
   * 마지막 오류 가져오기
   */
  public get lastError(): JiraError | null {
    return this._lastError;
  }
  
  /**
   * 이슈 조회
   * @param issueKey Jira 이슈 키 (예: 'APE-123')
   * @returns Jira 이슈 정보를 포함한 서비스 결과
   */
  public async getIssue(issueKey: string): Promise<ServiceResult<JiraIssue>> {
    try {
      // 마지막 오류 초기화
      this._lastError = null;
      
      // 모의 모드인 경우 모의 데이터 반환
      if (this.useMock) {
        const mockIssue = this.getMockIssue(issueKey);
        return createSuccessResult(mockIssue);
      }
      
      // 필수 설정 확인
      if (!this.baseUrl) {
        throw new Error('Jira 서버 URL이 설정되지 않았습니다. 설정을 확인하세요.');
      }
      
      if (this.authType === AuthType.Basic && (!this.username || !this.password)) {
        throw new Error('Jira 인증 정보가 설정되지 않았습니다. 사용자 이름과 비밀번호를 확인하세요.');
      }
      
      if (this.authType === AuthType.Token && !this.token) {
        throw new Error('Jira 인증 토큰이 설정되지 않았습니다. 토큰 설정을 확인하세요.');
      }
      
      // Jira REST API 엔드포인트
      const url = `${this.baseUrl}${this.apiPath}/issue/${issueKey}`;
      
      // API 요청 설정
      const config: AxiosRequestConfig = {};
      
      // 인증 유형에 따른 설정
      if (this.authType === AuthType.Basic) {
        config.auth = {
          username: this.username,
          password: this.password
        };
      } else if (this.authType === AuthType.Token) {
        config.headers = {
          ...config.headers,
          'Authorization': `Bearer ${this.token}`
        };
      }
      
      // API 요청 실행
      const response = await axios.get(url, config);
      
      // 응답 데이터 파싱
      const issue = this.parseJiraIssue(response.data);
      
      return createSuccessResult(issue);
    } catch (error) {
      // 오류 처리 및 분류
      this.handleError(error as Error, issueKey);
      
      // 오류 로그
      console.error(`Jira 이슈 조회 실패 (${issueKey}):`, error);
      
      // 오류 결과 생성
      let serviceError;
      
      if (this._lastError) {
        // JiraError를 IServiceError로 변환
        serviceError = ServiceErrorManager.createError(
          ServiceType.Jira,
          this._lastError.type as unknown as ServiceErrorType,
          this._lastError.message,
          this._lastError.details
        );
      } else {
        serviceError = ServiceErrorManager.createError(
          ServiceType.Jira,
          ServiceErrorType.Unknown,
          error instanceof Error ? error.message : String(error)
        );
      }
      
      return createErrorResult(serviceError);
    }
  }
  
  /**
   * Jira 이슈 생성
   * @param issueData 이슈 데이터
   * @returns 생성된 이슈 정보를 포함한 서비스 결과
   */
  public async createIssue(issueData: {
    projectKey: string;
    issueType: string;
    summary: string;
    description?: string;
    assignee?: string;
    components?: string[];
    labels?: string[];
    dueDate?: string;
  }): Promise<ServiceResult<JiraIssue>> {
    try {
      // 마지막 오류 초기화
      this._lastError = null;
      
      // 모의 모드인 경우 모의 데이터 반환
      if (this.useMock) {
        const mockIssue = this.getMockIssue(`${issueData.projectKey}-${Math.floor(Math.random() * 1000)}`);
        return createSuccessResult(mockIssue);
      }
      
      // 필수 설정 확인
      if (!this.baseUrl) {
        throw new Error('Jira 서버 URL이 설정되지 않았습니다. 설정을 확인하세요.');
      }
      
      if (this.authType === AuthType.Basic && (!this.username || !this.password)) {
        throw new Error('Jira 인증 정보가 설정되지 않았습니다. 사용자 이름과 비밀번호를 확인하세요.');
      }
      
      if (this.authType === AuthType.Token && !this.token) {
        throw new Error('Jira 인증 토큰이 설정되지 않았습니다. 토큰 설정을 확인하세요.');
      }
      
      // Jira REST API 엔드포인트
      const url = `${this.baseUrl}${this.apiPath}/issue`;
      
      // 필수 필드 확인
      if (!issueData.projectKey) {
        throw new Error('Jira 프로젝트 키가 필요합니다.');
      }
      
      if (!issueData.issueType) {
        throw new Error('Jira 이슈 유형이 필요합니다.');
      }
      
      if (!issueData.summary) {
        throw new Error('Jira 이슈 요약이 필요합니다.');
      }
      
      // 요청 데이터 구성
      const requestData = {
        fields: {
          project: {
            key: issueData.projectKey
          },
          issuetype: {
            name: issueData.issueType
          },
          summary: issueData.summary,
          description: issueData.description || '',
          assignee: issueData.assignee ? { name: issueData.assignee } : undefined,
          components: issueData.components?.map(name => ({ name })),
          labels: issueData.labels,
          duedate: issueData.dueDate
        }
      };
      
      // API 요청 설정
      const config: AxiosRequestConfig = {};
      
      // 인증 유형에 따른 설정
      if (this.authType === AuthType.Basic) {
        config.auth = {
          username: this.username,
          password: this.password
        };
      } else if (this.authType === AuthType.Token) {
        config.headers = {
          ...config.headers,
          'Authorization': `Bearer ${this.token}`
        };
      }
      
      // API 요청 실행
      const response = await axios.post(url, requestData, config);
      
      // 생성된 이슈 ID로 이슈 조회
      const issueKey = response.data.key;
      const issueResult = await this.getIssue(issueKey);
      
      if (issueResult.success && issueResult.data) {
        return createSuccessResult(issueResult.data);
      } else {
        // 이슈를 찾지 못한 경우 기본 정보만 반환
        const basicIssue: JiraIssue = {
          id: '0',
          key: issueKey,
          summary: issueData.summary,
          description: issueData.description || '',
          status: JiraIssueStatus.ToDo,
          created: new Date().toISOString(),
          updated: new Date().toISOString()
        };
        return createSuccessResult(basicIssue);
      }
    } catch (error) {
      // 오류 처리 및 분류
      this.handleError(error as Error);
      
      // 오류 로그
      console.error('Jira 이슈 생성 실패:', error);
      
      // 오류 결과 생성
      let serviceError;
      
      if (this._lastError) {
        // JiraError를 IServiceError로 변환
        serviceError = ServiceErrorManager.createError(
          ServiceType.Jira,
          this._lastError.type as unknown as ServiceErrorType,
          this._lastError.message,
          this._lastError.details
        );
      } else {
        serviceError = ServiceErrorManager.createError(
          ServiceType.Jira,
          ServiceErrorType.Unknown,
          error instanceof Error ? error.message : String(error)
        );
      }
      
      return createErrorResult(serviceError);
    }
  }
  
  /**
   * Jira 이슈 상태 변경
   * @param issueKey Jira 이슈 키 (예: 'APE-123')
   * @param status 변경할 상태
   * @returns 성공 여부를 포함한 서비스 결과
   */
  public async updateIssueStatus(issueKey: string, status: JiraIssueStatus): Promise<ServiceResult<boolean>> {
    try {
      // 마지막 오류 초기화
      this._lastError = null;
      
      // 모의 모드인 경우 성공 반환
      if (this.useMock) {
        return createSuccessResult(true);
      }
      
      // 필수 설정 확인
      if (!this.baseUrl) {
        throw new Error('Jira 서버 URL이 설정되지 않았습니다. 설정을 확인하세요.');
      }
      
      if (this.authType === AuthType.Basic && (!this.username || !this.password)) {
        throw new Error('Jira 인증 정보가 설정되지 않았습니다. 사용자 이름과 비밀번호를 확인하세요.');
      }
      
      if (this.authType === AuthType.Token && !this.token) {
        throw new Error('Jira 인증 토큰이 설정되지 않았습니다. 토큰 설정을 확인하세요.');
      }
      
      // 이슈 전환에 필요한 트랜지션 ID 조회
      const transitionId = await this.getTransitionIdForStatus(issueKey, status);
      
      if (!transitionId) {
        throw new Error(`이슈 ${issueKey}에 대해 상태 '${status}'로의 전환이 허용되지 않습니다.`);
      }
      
      // Jira REST API 엔드포인트
      const url = `${this.baseUrl}${this.apiPath}/issue/${issueKey}/transitions`;
      
      // 요청 데이터 구성
      const requestData = {
        transition: {
          id: transitionId
        }
      };
      
      // API 요청 설정
      const config: AxiosRequestConfig = {};
      
      // 인증 유형에 따른 설정
      if (this.authType === AuthType.Basic) {
        config.auth = {
          username: this.username,
          password: this.password
        };
      } else if (this.authType === AuthType.Token) {
        config.headers = {
          ...config.headers,
          'Authorization': `Bearer ${this.token}`
        };
      }
      
      // API 요청 실행
      await axios.post(url, requestData, config);
      
      return createSuccessResult(true);
    } catch (error) {
      // 오류 처리 및 분류
      this.handleError(error as Error, issueKey);
      
      // 오류 로그
      console.error(`Jira 이슈 상태 변경 실패 (${issueKey}):`, error);
      
      // 오류 결과 생성
      let serviceError;
      
      if (this._lastError) {
        // JiraError를 IServiceError로 변환
        serviceError = ServiceErrorManager.createError(
          ServiceType.Jira,
          this._lastError.type as unknown as ServiceErrorType,
          this._lastError.message,
          this._lastError.details
        );
      } else {
        serviceError = ServiceErrorManager.createError(
          ServiceType.Jira,
          ServiceErrorType.Unknown,
          error instanceof Error ? error.message : String(error)
        );
      }
      
      return createErrorResult(serviceError);
    }
  }
  
  /**
   * Jira 이슈 검색
   * @param criteria 검색 조건
   * @returns 검색 결과를 포함한 서비스 결과
   */
  public async searchIssues(criteria: JiraSearchCriteria): Promise<ServiceResult<JiraSearchResult>> {
    try {
      // 마지막 오류 초기화
      this._lastError = null;
      
      // 기본값 설정
      const maxResults = criteria.maxResults || 50;
      const startAt = criteria.startAt || 0;
      
      // 모의 모드인 경우 모의 데이터 반환
      if (this.useMock) {
        const mockResult = this.getMockSearchResult(criteria);
        return createSuccessResult(mockResult);
      }
      
      // 필수 설정 확인
      if (!this.baseUrl) {
        throw new Error('Jira 서버 URL이 설정되지 않았습니다. 설정을 확인하세요.');
      }
      
      if (this.authType === AuthType.Basic && (!this.username || !this.password)) {
        throw new Error('Jira 인증 정보가 설정되지 않았습니다. 사용자 이름과 비밀번호를 확인하세요.');
      }
      
      if (this.authType === AuthType.Token && !this.token) {
        throw new Error('Jira 인증 토큰이 설정되지 않았습니다. 토큰 설정을 확인하세요.');
      }
      
      // JQL 검색 쿼리 구성
      const jql = this.buildJqlQuery(criteria);
      
      // Jira REST API 엔드포인트
      const url = `${this.baseUrl}${this.apiPath}/search`;
      
      // 요청 데이터 구성
      const requestData = {
        jql,
        startAt,
        maxResults,
        fields: [
          'summary',
          'description',
          'status',
          'assignee',
          'reporter',
          'created',
          'updated',
          'duedate',
          'priority',
          'labels',
          'components',
          'project'
        ]
      };
      
      // API 요청 설정
      const config: AxiosRequestConfig = {
        params: {
          jql,
          startAt,
          maxResults,
          fields: 'summary,description,status,assignee,reporter,created,updated,duedate,priority,labels,components,project'
        }
      };
      
      // 인증 유형에 따른 설정
      if (this.authType === AuthType.Basic) {
        config.auth = {
          username: this.username,
          password: this.password
        };
      } else if (this.authType === AuthType.Token) {
        config.headers = {
          ...config.headers,
          'Authorization': `Bearer ${this.token}`
        };
      }
      
      // API 요청 실행
      const response = await axios.get(url, config);
      
      // 응답 데이터 파싱
      const data = response.data;
      const issues = (data.issues || []).map((issue: any) => this.parseJiraIssue(issue));
      
      const result: JiraSearchResult = {
        issues,
        total: data.total || 0,
        startAt: data.startAt || 0,
        maxResults: data.maxResults || maxResults,
        hasMore: (data.startAt + issues.length) < data.total
      };
      
      return createSuccessResult(result);
    } catch (error) {
      // 오류 처리 및 분류
      this.handleError(error as Error);
      
      // 오류 로그
      console.error('Jira 이슈 검색 실패:', error);
      
      // 오류 결과 생성
      let serviceError;
      
      if (this._lastError) {
        // JiraError를 IServiceError로 변환
        serviceError = ServiceErrorManager.createError(
          ServiceType.Jira,
          this._lastError.type as unknown as ServiceErrorType,
          this._lastError.message,
          this._lastError.details
        );
      } else {
        serviceError = ServiceErrorManager.createError(
          ServiceType.Jira,
          ServiceErrorType.Unknown,
          error instanceof Error ? error.message : String(error)
        );
      }
      
      return createErrorResult(serviceError);
    }
  }
  
  /**
   * JQL 검색 쿼리 구성
   * @param criteria 검색 조건
   * @returns JQL 쿼리 문자열
   * @private
   */
  private buildJqlQuery(criteria: JiraSearchCriteria): string {
    const conditions: string[] = [];
    
    // 프로젝트 필터
    if (criteria.projectKey) {
      conditions.push(`project = "${criteria.projectKey}"`);
    }
    
    // 담당자 필터
    if (criteria.assignee) {
      conditions.push(`assignee = "${criteria.assignee}"`);
    }
    
    // 보고자 필터
    if (criteria.reporter) {
      conditions.push(`reporter = "${criteria.reporter}"`);
    }
    
    // 상태 필터
    if (criteria.status) {
      if (Array.isArray(criteria.status)) {
        if (criteria.status.length > 0) {
          const statuses = criteria.status.map(s => `"${s}"`).join(',');
          conditions.push(`status IN (${statuses})`);
        }
      } else {
        conditions.push(`status = "${criteria.status}"`);
      }
    }
    
    // 라벨 필터
    if (criteria.labels && criteria.labels.length > 0) {
      const labelConditions = criteria.labels.map(label => `labels = "${label}"`).join(' AND ');
      conditions.push(`(${labelConditions})`);
    }
    
    // 컴포넌트 필터
    if (criteria.components && criteria.components.length > 0) {
      const componentConditions = criteria.components.map(component => `component = "${component}"`).join(' OR ');
      conditions.push(`(${componentConditions})`);
    }
    
    // 텍스트 검색 필터
    if (criteria.text) {
      conditions.push(`(summary ~ "${criteria.text}" OR description ~ "${criteria.text}")`);
    }
    
    // 생성일 필터
    if (criteria.createdAfter) {
      conditions.push(`created >= "${criteria.createdAfter}"`);
    }
    
    // 수정일 필터
    if (criteria.updatedAfter) {
      conditions.push(`updated >= "${criteria.updatedAfter}"`);
    }
    
    // 조건이 없으면 모든 이슈 검색
    if (conditions.length === 0) {
      return 'order by created DESC';
    }
    
    // 최종 JQL 쿼리 반환
    return `${conditions.join(' AND ')} order by created DESC`;
  }
  
  /**
   * 모의 검색 결과 생성
   * @param criteria 검색 조건
   * @returns 모의 검색 결과
   * @private
   */
  private getMockSearchResult(criteria: JiraSearchCriteria): JiraSearchResult {
    // 최대 결과 수 및 시작 위치 설정
    const maxResults = criteria.maxResults || 50;
    const startAt = criteria.startAt || 0;
    
    // 모의 이슈 생성
    const mockIssues: JiraIssue[] = [];
    const totalIssues = 100; // 모의 데이터의 전체 이슈 수
    
    // 실제로 반환할 이슈 수 계산
    const count = Math.min(maxResults, totalIssues - startAt);
    
    // 프로젝트 키 가져오기 (기본값: 'APE')
    const projectKey = criteria.projectKey || 'APE';
    
    // 모의 이슈 생성
    for (let i = 0; i < count; i++) {
      const issueNumber = startAt + i + 1;
      const issueKey = `${projectKey}-${issueNumber}`;
      const mockIssue = this.getMockIssue(issueKey);
      
      // 검색 조건에 따른 필터링
      let includeIssue = true;
      
      // 상태 필터
      if (criteria.status) {
        if (Array.isArray(criteria.status)) {
          includeIssue = criteria.status.includes(mockIssue.status);
        } else {
          includeIssue = mockIssue.status === criteria.status;
        }
      }
      
      // 텍스트 검색 필터
      if (includeIssue && criteria.text) {
        const text = criteria.text.toLowerCase();
        includeIssue = 
          mockIssue.summary.toLowerCase().includes(text) || 
          (mockIssue.description?.toLowerCase().includes(text) || false);
      }
      
      // 이슈가 필터 조건에 부합하면 결과에 추가
      if (includeIssue) {
        // 요청된 검색 조건에 맞추어 이슈 속성 수정
        if (criteria.assignee) {
          mockIssue.assignee = {
            name: criteria.assignee,
            displayName: `${criteria.assignee} 사용자`
          };
        }
        
        // 프로젝트 정보 추가
        mockIssue.project = {
          id: '10000',
          key: projectKey,
          name: `${projectKey} 프로젝트`
        };
        
        mockIssues.push(mockIssue);
      }
    }
    
    return {
      issues: mockIssues,
      total: totalIssues,
      startAt,
      maxResults,
      hasMore: (startAt + count) < totalIssues
    };
  }
  
  /**
   * Jira 프로젝트 요약 조회
   * @param projectKey 프로젝트 키 (선택적, 입력되지 않으면 모든 프로젝트 요약)
   * @param maxRecentIssues 최근 이슈 목록 최대 수 (기본값: 5)
   * @param maxOldIssues 오래된 미해결 이슈 목록 최대 수 (기본값: 5)
   * @returns Jira 요약 정보를 포함한 서비스 결과
   */
  public async getProjectSummary(
    projectKey?: string, 
    maxRecentIssues: number = 5,
    maxOldIssues: number = 5
  ): Promise<ServiceResult<JiraSummary>> {
    try {
      // 마지막 오류 초기화
      this._lastError = null;
      
      // 모의 모드인 경우 모의 데이터 반환
      if (this.useMock) {
        const mockSummary = this.getMockSummary(projectKey, maxRecentIssues, maxOldIssues);
        return createSuccessResult(mockSummary);
      }
      
      // 필수 설정 확인
      if (!this.baseUrl) {
        throw new Error('Jira 서버 URL이 설정되지 않았습니다. 설정을 확인하세요.');
      }
      
      if (this.authType === AuthType.Basic && (!this.username || !this.password)) {
        throw new Error('Jira 인증 정보가 설정되지 않았습니다. 사용자 이름과 비밀번호를 확인하세요.');
      }
      
      if (this.authType === AuthType.Token && !this.token) {
        throw new Error('Jira 인증 토큰이 설정되지 않았습니다. 토큰 설정을 확인하세요.');
      }
      
      // 프로젝트 내 모든 이슈 조회
      const searchCriteria: JiraSearchCriteria = {
        projectKey: projectKey,
        maxResults: 1000 // 충분히 큰 값으로 설정
      };
      
      const searchResult = await this.searchIssues(searchCriteria);
      
      if (!searchResult.success || !searchResult.data) {
        throw new Error('이슈 검색에 실패했습니다');
      }
      
      const issues = searchResult.data.issues;
      
      // 전체 이슈 수
      const totalIssues = issues.length;
      
      // 상태별 이슈 수 계산
      const issuesByStatus: Record<JiraIssueStatus, number> = {
        [JiraIssueStatus.ToDo]: 0,
        [JiraIssueStatus.InProgress]: 0,
        [JiraIssueStatus.InReview]: 0,
        [JiraIssueStatus.Done]: 0,
        [JiraIssueStatus.Blocked]: 0,
        [JiraIssueStatus.Unknown]: 0
      };
      
      // 담당자별 이슈 수 계산
      const issuesByAssignee: Record<string, number> = {};
      
      // 우선순위별 이슈 수 계산
      const issuesByPriority: Record<string, number> = {};
      
      // 최근 이슈 및 오래된 미해결 이슈 목록 준비
      let recentIssues: JiraIssue[] = [];
      let unresolvedIssues: JiraIssue[] = [];
      
      // 이슈 해결 시간 계산을 위한 준비
      let resolvedCount = 0;
      let totalResolutionTime = 0;
      
      // 모든 이슈를 반복하며 통계 수집
      for (const issue of issues) {
        // 상태별 이슈 수 업데이트
        const status = issue.status as JiraIssueStatus;
        issuesByStatus[status] = (issuesByStatus[status] || 0) + 1;
        
        // 담당자별 이슈 수 업데이트
        if (issue.assignee) {
          const assigneeName = issue.assignee.displayName || issue.assignee.name;
          issuesByAssignee[assigneeName] = (issuesByAssignee[assigneeName] || 0) + 1;
        } else {
          issuesByAssignee['미할당'] = (issuesByAssignee['미할당'] || 0) + 1;
        }
        
        // 우선순위별 이슈 수 업데이트
        if (issue.priority) {
          const priorityName = issue.priority.name;
          issuesByPriority[priorityName] = (issuesByPriority[priorityName] || 0) + 1;
        } else {
          issuesByPriority['미지정'] = (issuesByPriority['미지정'] || 0) + 1;
        }
        
        // 미해결 이슈 목록 업데이트
        if (issue.status !== JiraIssueStatus.Done) {
          unresolvedIssues.push(issue);
        } else {
          // 해결된 이슈의 해결 시간 계산
          const created = new Date(issue.created).getTime();
          const updated = new Date(issue.updated).getTime();
          const resolutionTime = updated - created;
          
          if (resolutionTime > 0) {
            totalResolutionTime += resolutionTime;
            resolvedCount++;
          }
        }
      }
      
      // 최근 이슈 정렬 (생성일 기준)
      recentIssues = [...issues].sort((a, b) => 
        new Date(b.created).getTime() - new Date(a.created).getTime()
      ).slice(0, maxRecentIssues);
      
      // 오래된 미해결 이슈 정렬 (생성일 기준)
      const oldestUnresolvedIssues = unresolvedIssues
        .sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime())
        .slice(0, maxOldIssues);
      
      // 평균 해결 시간 계산 (밀리초 단위)
      const averageResolutionTime = resolvedCount > 0 ? totalResolutionTime / resolvedCount : undefined;
      
      // 프로젝트 완료율 계산
      const openIssues = totalIssues - (issuesByStatus[JiraIssueStatus.Done] || 0);
      const percentComplete = totalIssues > 0 ? Math.round((issuesByStatus[JiraIssueStatus.Done] || 0) * 100 / totalIssues) : 0;
      
      // 요약 정보 반환
      const result: JiraSummary = {
        totalIssues,
        issuesByStatus,
        issuesByAssignee,
        issuesByPriority,
        recentIssues,
        oldestUnresolvedIssues,
        averageResolutionTime,
        projectStats: projectKey ? {
          projectKey,
          totalIssues,
          openIssues,
          percentComplete
        } : undefined
      };
      
      return createSuccessResult(result);
    } catch (error) {
      // 오류 처리 및 분류
      this.handleError(error as Error);
      
      // 오류 로그
      console.error('Jira 프로젝트 요약 조회 실패:', error);
      
      // 오류 결과 생성
      let serviceError;
      
      if (this._lastError) {
        // JiraError를 IServiceError로 변환
        serviceError = ServiceErrorManager.createError(
          ServiceType.Jira,
          this._lastError.type as unknown as ServiceErrorType,
          this._lastError.message,
          this._lastError.details
        );
      } else {
        serviceError = ServiceErrorManager.createError(
          ServiceType.Jira,
          ServiceErrorType.Unknown,
          error instanceof Error ? error.message : String(error)
        );
      }
      
      return createErrorResult(serviceError);
    }
  }
  
  /**
   * 모의 요약 정보 생성
   * @param projectKey 프로젝트 키
   * @param maxRecentIssues 최근 이슈 수
   * @param maxOldIssues 오래된 미해결 이슈 수
   * @returns 모의 요약 정보
   * @private
   */
  private getMockSummary(
    projectKey?: string, 
    maxRecentIssues: number = 5,
    maxOldIssues: number = 5
  ): JiraSummary {
    // 기본 프로젝트 키 설정
    const project = projectKey || 'APE';
    
    // 모의 이슈 생성
    const mockIssues: JiraIssue[] = [];
    const totalIssues = 50; // 모의 데이터의 전체 이슈 수
    
    // 모의 이슈 생성
    for (let i = 0; i < totalIssues; i++) {
      const issueNumber = i + 1;
      const issueKey = `${project}-${issueNumber}`;
      const mockIssue = this.getMockIssue(issueKey);
      
      // 프로젝트 정보 추가
      mockIssue.project = {
        id: '10000',
        key: project,
        name: `${project} 프로젝트`
      };
      
      mockIssues.push(mockIssue);
    }
    
    // 상태별 이슈 수 설정
    const issuesByStatus: Record<JiraIssueStatus, number> = {
      [JiraIssueStatus.ToDo]: 15,
      [JiraIssueStatus.InProgress]: 10,
      [JiraIssueStatus.InReview]: 5,
      [JiraIssueStatus.Done]: 15,
      [JiraIssueStatus.Blocked]: 3,
      [JiraIssueStatus.Unknown]: 2
    };
    
    // 담당자별 이슈 수 설정
    const issuesByAssignee: Record<string, number> = {
      '홍길동': 10,
      '김개발': 15,
      '이테스터': 8,
      '박관리자': 5,
      '미할당': 12
    };
    
    // 우선순위별 이슈 수 설정
    const issuesByPriority: Record<string, number> = {
      'Highest': 5,
      'High': 10,
      'Medium': 20,
      'Low': 10,
      '미지정': 5
    };
    
    // 최근 이슈 목록 설정
    const recentIssues = mockIssues
      .slice(0, maxRecentIssues)
      .map(issue => {
        // 최근 이슈는 생성일을 현재 시간에 가깝게 설정
        const now = new Date();
        const randomHours = Math.floor(Math.random() * 48); // 최근 48시간 내
        const createdDate = new Date(now.getTime() - randomHours * 60 * 60 * 1000);
        
        return {
          ...issue,
          created: createdDate.toISOString(),
          updated: createdDate.toISOString()
        };
      });
    
    // 오래된 미해결 이슈 목록 설정
    const oldestUnresolvedIssues = mockIssues
      .filter(issue => issue.status !== JiraIssueStatus.Done)
      .slice(0, maxOldIssues)
      .map(issue => {
        // 오래된 이슈는 생성일을 몇 개월 전으로 설정
        const now = new Date();
        const randomDays = 30 + Math.floor(Math.random() * 60); // 30-90일 전
        const createdDate = new Date(now.getTime() - randomDays * 24 * 60 * 60 * 1000);
        
        return {
          ...issue,
          created: createdDate.toISOString(),
          updated: createdDate.toISOString(),
          status: [JiraIssueStatus.ToDo, JiraIssueStatus.Blocked][Math.floor(Math.random() * 2)]
        };
      });
    
    // 평균 해결 시간 설정 (3일의 밀리초)
    const averageResolutionTime = 3 * 24 * 60 * 60 * 1000;
    
    return {
      totalIssues,
      issuesByStatus,
      issuesByAssignee,
      issuesByPriority,
      recentIssues,
      oldestUnresolvedIssues,
      averageResolutionTime,
      projectStats: projectKey ? {
        projectKey,
        totalIssues,
        openIssues: totalIssues - issuesByStatus[JiraIssueStatus.Done],
        percentComplete: Math.round(issuesByStatus[JiraIssueStatus.Done] * 100 / totalIssues)
      } : undefined
    };
  }
  
  /**
   * 이슈 상태 변경에 필요한 트랜지션 ID 가져오기
   * @param issueKey Jira 이슈 키
   * @param targetStatus 목표 상태
   * @returns 트랜지션 ID
   * @private
   */
  private async getTransitionIdForStatus(issueKey: string, targetStatus: JiraIssueStatus): Promise<string | null> {
    try {
      // Jira REST API 엔드포인트
      const url = `${this.baseUrl}${this.apiPath}/issue/${issueKey}/transitions`;
      
      // API 요청 설정
      const config: AxiosRequestConfig = {};
      
      // 인증 유형에 따른 설정
      if (this.authType === AuthType.Basic) {
        config.auth = {
          username: this.username,
          password: this.password
        };
      } else if (this.authType === AuthType.Token) {
        config.headers = {
          ...config.headers,
          'Authorization': `Bearer ${this.token}`
        };
      }
      
      // API 요청 실행
      const response = await axios.get(url, config);
      
      // 사용 가능한 트랜지션 중에서 목표 상태와 일치하는 것 찾기
      const transitions = response.data.transitions || [];
      
      // 상태 이름 정규화 함수
      const normalizeStatus = (status: string): string => {
        return status.toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/in\s+progress/i, 'in-progress')
          .replace(/to\s+do/i, 'todo');
      };
      
      // 목표 상태와 일치하는 트랜지션 찾기
      const matchingTransition = transitions.find((t: any) => {
        const transitionStatus = normalizeStatus(t.to.name);
        return transitionStatus === targetStatus || transitionStatus.includes(targetStatus);
      });
      
      return matchingTransition ? matchingTransition.id : null;
    } catch (error) {
      console.error(`트랜지션 ID 조회 실패 (${issueKey}):`, error);
      return null;
    }
  }
  
  /**
   * Jira API 응답에서 이슈 정보 파싱
   * @param data API 응답 데이터
   * @returns 파싱된 이슈 정보
   * @private
   */
  private parseJiraIssue(data: any): JiraIssue {
    const fields = data.fields || {};
    
    // 상태 정규화
    const normalizeStatus = (statusName: string): JiraIssueStatus => {
      const lowerStatus = statusName.toLowerCase();
      
      if (lowerStatus.includes('todo') || lowerStatus.includes('to do') || lowerStatus.includes('open')) {
        return JiraIssueStatus.ToDo;
      } else if (lowerStatus.includes('progress')) {
        return JiraIssueStatus.InProgress;
      } else if (lowerStatus.includes('review')) {
        return JiraIssueStatus.InReview;
      } else if (lowerStatus.includes('done') || lowerStatus.includes('closed') || lowerStatus.includes('resolved')) {
        return JiraIssueStatus.Done;
      } else if (lowerStatus.includes('block')) {
        return JiraIssueStatus.Blocked;
      } else {
        return JiraIssueStatus.Unknown;
      }
    };
    
    const statusName = fields.status?.name || 'Unknown';
    
    const issue: JiraIssue = {
      id: data.id,
      key: data.key,
      summary: fields.summary || '',
      description: fields.description || '',
      status: normalizeStatus(statusName),
      assignee: fields.assignee ? {
        name: fields.assignee.name,
        displayName: fields.assignee.displayName,
        email: fields.assignee.emailAddress
      } : undefined,
      reporter: fields.reporter ? {
        name: fields.reporter.name,
        displayName: fields.reporter.displayName,
        email: fields.reporter.emailAddress
      } : undefined,
      created: fields.created || '',
      updated: fields.updated || '',
      dueDate: fields.duedate,
      priority: fields.priority ? {
        id: fields.priority.id,
        name: fields.priority.name
      } : undefined,
      labels: fields.labels || [],
      components: (fields.components || []).map((c: any) => ({
        id: c.id,
        name: c.name
      }))
    };
    
    return issue;
  }
  
  /**
   * 모의 Jira 이슈 생성
   * @param issueKey 이슈 키
   * @returns 모의 이슈 데이터
   * @private
   */
  private getMockIssue(issueKey: string): JiraIssue {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_project, id] = issueKey.split('-');
    
    // 이슈 번호에 따라 다른 모의 데이터 생성
    const idNum = parseInt(id, 10) || 0;
    const mod = idNum % 5;
    
    let status: JiraIssueStatus;
    let summary: string;
    
    switch (mod) {
      case 0:
        status = JiraIssueStatus.ToDo;
        summary = '새로운 기능 개발';
        break;
      case 1:
        status = JiraIssueStatus.InProgress;
        summary = '기존 기능 개선';
        break;
      case 2:
        status = JiraIssueStatus.InReview;
        summary = '버그 수정';
        break;
      case 3:
        status = JiraIssueStatus.Done;
        summary = '문서화 작업';
        break;
      case 4:
        status = JiraIssueStatus.Blocked;
        summary = '성능 최적화';
        break;
      default:
        status = JiraIssueStatus.Unknown;
        summary = '기타 작업';
    }
    
    const now = new Date().toISOString();
    
    return {
      id: id,
      key: issueKey,
      summary: `[모의 데이터] ${summary}`,
      description: '이것은 모의 Jira 이슈입니다. 실제 Jira에 연결되지 않았습니다.',
      status: status,
      assignee: {
        name: 'testuser',
        displayName: '테스트 사용자'
      },
      reporter: {
        name: 'reporter',
        displayName: '보고자'
      },
      created: now,
      updated: now,
      priority: {
        id: '3',
        name: 'Medium'
      },
      labels: ['mock', 'test'],
      components: [
        { id: '10000', name: 'UI' },
        { id: '10001', name: 'Backend' }
      ]
    };
  }
  
  /**
   * 오류 처리 및 분류
   * @param error 발생한 오류
   * @param resourceId 관련 리소스 ID (선택적)
   * @private
   */
  private handleError(error: Error | AxiosError, resourceId?: string): void {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      if (!axiosError.response) {
        // 네트워크 오류
        this.setError(JiraErrorType.ConnectionFailed, 
            `Jira 서버 연결 실패: ${error.message}. 서버 URL을 확인하세요: ${this.baseUrl}`);
      } else {
        // HTTP 상태 코드에 따른 오류 분류
        const status = axiosError.response.status;
        
        if (status === 401 || status === 403) {
          this.setError(JiraErrorType.AuthenticationFailed, 
              `Jira 인증 실패: ${error.message}. 사용자 이름과 비밀번호를 확인하세요.`);
        } else if (status === 404) {
          this.setError(JiraErrorType.ResourceNotFound, 
              `Jira 리소스를 찾을 수 없습니다${resourceId ? ` (${resourceId})` : ''}: ${error.message}`);
        } else if (status >= 500) {
          this.setError(JiraErrorType.ServerError, 
              `Jira 서버 오류: ${error.message}. 서버 상태를 확인하세요.`);
        } else if (status === 400) {
          this.setError(JiraErrorType.InvalidRequest, 
              `Jira 요청이 잘못되었습니다: ${error.message}`);
        } else {
          this.setError(JiraErrorType.Unknown, 
              `Jira 오류: ${error.message}`);
        }
      }
    } else {
      // 일반 오류
      this.setError(JiraErrorType.Unknown, 
          `Jira 오류: ${error.message}`);
    }
  }
  
  /**
   * 오류 설정
   * @param type 오류 유형
   * @param message 오류 메시지
   * @param details 추가 세부 정보
   * @private
   */
  private setError(type: JiraErrorType, message: string, details?: any): void {
    this._lastError = {
      type,
      message,
      details
    };
    
    // 콘솔에 오류 기록
    console.error(`Jira 오류 (${type}):`, message, details || '');
  }
  
  /**
   * 리소스 해제
   */
  public dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }
}