/**
 * BitBucket 서비스
 * 
 * BitBucket API를 사용하여 Git 저장소 정보를 조회하고 관리하는 서비스입니다.
 * 내부망 BitBucket 서버와 통신하며, 실제 서버를 사용할 수 없는 경우 Mock 데이터를 사용합니다.
 */

import * as vscode from 'vscode';
import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import { ServiceConfigManager, ServiceType, AuthType } from '../services/serviceConfig';

/**
 * BitBucket 커밋 정보 인터페이스
 */
export interface BitbucketCommit {
  id: string;           // 커밋 해시
  displayId: string;    // 짧은 해시 (7자)
  message: string;      // 커밋 메시지
  author: {
    name: string;       // 작성자 이름
    emailAddress: string; // 작성자 이메일
  };
  authorTimestamp: number; // 작성 시간 (Unix timestamp)
}

/**
 * BitBucket 서비스 오류 유형
 */
export enum BitbucketErrorType {
  ConnectionFailed = 'connection_failed',
  AuthenticationFailed = 'authentication_failed',
  PermissionDenied = 'permission_denied',
  ResourceNotFound = 'resource_not_found',
  ServerError = 'server_error',
  Unknown = 'unknown'
}

/**
 * BitBucket 서비스 오류 인터페이스
 */
export interface BitbucketError {
  type: BitbucketErrorType;
  message: string;
  details?: any;
}

/**
 * BitBucket 서비스 클래스
 */
export class BitbucketService implements vscode.Disposable {
  private baseUrl: string = '';
  private projectKey: string = '';
  private repoSlug: string = '';
  private username: string = '';
  private password: string = '';
  private token: string = '';
  private authType: AuthType = AuthType.Basic;
  private useMock: boolean = true;
  private disposables: vscode.Disposable[] = [];
  private _lastError: BitbucketError | null = null;

  /**
   * BitBucket 서비스 생성자
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
        if (e.affectsConfiguration('ape.bitbucket')) {
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
      const config = this.serviceConfigManager.getServiceConfig(ServiceType.Bitbucket);
      this.baseUrl = config.url;
      this.authType = config.authType;
      this.username = config.username || '';
      this.password = config.password || '';
      this.token = config.token || '';
      this.useMock = config.useMock;
      
      // 추가 파라미터에서 프로젝트 키와 저장소 슬러그 가져오기
      const additionalParams = config.additionalParams || {};
      this.projectKey = additionalParams.projectKey || '';
      this.repoSlug = additionalParams.repositorySlug || '';
    } else {
      // 직접 VSCode 설정에서 로드
      const config = vscode.workspace.getConfiguration('ape.bitbucket');
      this.baseUrl = config.get('url', '');
      this.projectKey = config.get('projectKey', '');
      this.repoSlug = config.get('repositorySlug', '');
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
  public get lastError(): BitbucketError | null {
    return this._lastError;
  }

  /**
   * 특정 사용자의 최근 커밋 이력 가져오기
   * @param authorName 작성자 이름 (비어 있으면 모든 커밋 가져옴)
   * @param limit 가져올 커밋 수 (기본값: 20)
   * @returns 커밋 목록
   * @throws Error 연결 실패 또는 서버 오류 시 오류를 던짐
   */
  public async getCommitHistory(authorName?: string, limit: number = 20): Promise<BitbucketCommit[]> {
    try {
      // 마지막 오류 초기화
      this._lastError = null;
      
      // 모의 모드인 경우 모의 데이터 반환
      if (this.useMock) {
        return this.getMockCommitHistory(authorName, limit);
      }
      
      // 필수 설정 확인
      if (!this.baseUrl) {
        throw new Error('BitBucket 서버 URL이 설정되지 않았습니다. 설정을 확인하세요.');
      }
      
      if (this.authType === AuthType.Basic && (!this.username || !this.password)) {
        throw new Error('BitBucket 인증 정보가 설정되지 않았습니다. 사용자 이름과 비밀번호를 확인하세요.');
      }
      
      if (this.authType === AuthType.Token && !this.token) {
        throw new Error('BitBucket 인증 토큰이 설정되지 않았습니다. 토큰 설정을 확인하세요.');
      }
      
      if (!this.projectKey || !this.repoSlug) {
        throw new Error('BitBucket 프로젝트 키 또는 저장소 슬러그가 설정되지 않았습니다. 설정을 확인하세요.');
      }
      
      // BitBucket REST API 엔드포인트
      const url = `${this.baseUrl}/rest/api/1.0/projects/${this.projectKey}/repos/${this.repoSlug}/commits`;
      
      // 쿼리 파라미터
      const params: Record<string, string | number> = {
        limit: limit
      };
      
      // 작성자 필터링
      if (authorName) {
        // BitBucket Server API는 'until' 파라미터를 사용하여 커밋 범위를 지정할 수 있음
        params.until = 'HEAD';
        // 'since'는 선택적으로 사용 (필요하면 추가)
      }
      
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
      
      // 쿼리 파라미터 설정
      config.params = params;
      
      // API 요청 실행
      const response = await axios.get(url, config);
      
      // 응답 데이터 파싱
      const commits: BitbucketCommit[] = response.data.values.filter((commit: any) => {
        // 작성자 필터링 (서버에서 지원하지 않는 경우 클라이언트측에서 필터링)
        return !authorName || commit.author.name === authorName;
      }).map((commit: any) => ({
        id: commit.id,
        displayId: commit.displayId,
        message: commit.message,
        author: {
          name: commit.author.name,
          emailAddress: commit.author.emailAddress
        },
        authorTimestamp: commit.authorTimestamp
      }));
      
      return commits;
    } catch (error) {
      // 오류 처리 및 분류
      this.handleError(error as Error);
      
      // 오류 로그
      console.error('BitBucket 커밋 이력 가져오기 실패:', error);
      
      // 마지막 오류 객체를 통해 예외 생성
      if (this._lastError) {
        throw new Error(`BitBucket 오류 (${this._lastError.type}): ${this._lastError.message}`);
      } else {
        throw error; // 원본 오류 전파
      }
    }
  }
  
  /**
   * 오류 처리 및 분류
   * @param error 발생한 오류
   * @private
   */
  private handleError(error: Error | AxiosError): void {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      if (!axiosError.response) {
        // 네트워크 오류
        this.setError(BitbucketErrorType.ConnectionFailed, 
            `BitBucket 서버 연결 실패: ${error.message}. 서버 URL을 확인하세요: ${this.baseUrl}`);
      } else {
        // HTTP 상태 코드에 따른 오류 분류
        const status = axiosError.response.status;
        
        if (status === 401 || status === 403) {
          this.setError(BitbucketErrorType.AuthenticationFailed, 
              `BitBucket 인증 실패: ${error.message}. 사용자 이름과 비밀번호를 확인하세요.`);
        } else if (status === 404) {
          this.setError(BitbucketErrorType.ResourceNotFound, 
              `BitBucket 리소스를 찾을 수 없습니다: ${error.message}. 프로젝트 키와 저장소 슬러그를 확인하세요.`);
        } else if (status >= 500) {
          this.setError(BitbucketErrorType.ServerError, 
              `BitBucket 서버 오류: ${error.message}. 서버 상태를 확인하세요.`);
        } else {
          this.setError(BitbucketErrorType.Unknown, 
              `BitBucket 오류: ${error.message}`);
        }
      }
    } else {
      // 일반 오류
      this.setError(BitbucketErrorType.Unknown, 
          `BitBucket 오류: ${error.message}`);
    }
  }
  
  /**
   * 오류 설정
   * @param type 오류 유형
   * @param message 오류 메시지
   * @param details 추가 세부 정보
   * @private
   */
  private setError(type: BitbucketErrorType, message: string, details?: any): void {
    this._lastError = {
      type,
      message,
      details
    };
    
    // 콘솔에 오류 기록
    console.error(`BitBucket 오류 (${type}):`, message, details || '');
  }

  /**
   * 사용자의 Git 사용자 이름 가져오기 (BitBucket 계정 이름과 다를 수 있음)
   * @returns Git 사용자 이름
   * @throws Error 연결 실패 또는 서버 오류 시 오류를 던짐
   */
  public async getGitUsername(): Promise<string> {
    try {
      // 마지막 오류 초기화
      this._lastError = null;
      
      // 모의 모드인 경우 모의 데이터 반환
      if (this.useMock) {
        return 'TestUser';
      }
      
      // 필수 설정 확인
      if (!this.baseUrl) {
        throw new Error('BitBucket 서버 URL이 설정되지 않았습니다. 설정을 확인하세요.');
      }
      
      if (this.authType === AuthType.Basic && (!this.username || !this.password)) {
        throw new Error('BitBucket 인증 정보가 설정되지 않았습니다. 사용자 이름과 비밀번호를 확인하세요.');
      }
      
      if (this.authType === AuthType.Token && !this.token) {
        throw new Error('BitBucket 인증 토큰이 설정되지 않았습니다. 토큰 설정을 확인하세요.');
      }
      
      // BitBucket REST API를 통해 현재 사용자 정보 가져오기
      const url = `${this.baseUrl}/rest/api/1.0/users/~`;
      
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
      return response.data.displayName || response.data.name || this.username;
    } catch (error) {
      // 오류 처리 및 분류
      this.handleError(error as Error);
      
      // 오류 로그
      console.error('BitBucket 사용자 정보 가져오기 실패:', error);
      
      // 마지막 오류 객체를 통해 예외 생성
      if (this._lastError) {
        throw new Error(`BitBucket 오류 (${this._lastError.type}): ${this._lastError.message}`);
      } else {
        throw error; // 원본 오류 전파
      }
    }
  }

  /**
   * 모의 커밋 이력 생성
   * @param authorName 작성자 이름
   * @param limit 가져올 커밋 수
   * @returns 모의 커밋 목록
   */
  private getMockCommitHistory(authorName?: string, limit: number = 20): BitbucketCommit[] {
    // 모의 커밋 데이터
    const mockCommits: BitbucketCommit[] = [
      {
        id: 'abcdef1234567890abcdef1234567890abcdef12',
        displayId: 'abcdef1',
        message: 'feat(ui): add slash command suggestions to chat interface',
        author: { name: 'TestUser', emailAddress: 'testuser@example.com' },
        authorTimestamp: Date.now() - 86400000 * 1
      },
      {
        id: 'bcdef1234567890abcdef1234567890abcdef123',
        displayId: 'bcdef12',
        message: 'fix(core): resolve memory leak in service initialization',
        author: { name: 'TestUser', emailAddress: 'testuser@example.com' },
        authorTimestamp: Date.now() - 86400000 * 2
      },
      {
        id: 'cdef1234567890abcdef1234567890abcdef1234',
        displayId: 'cdef123',
        message: 'docs(api): update API documentation with examples',
        author: { name: 'TestUser', emailAddress: 'testuser@example.com' },
        authorTimestamp: Date.now() - 86400000 * 3
      },
      {
        id: 'def1234567890abcdef1234567890abcdef12345',
        displayId: 'def1234',
        message: 'refactor(git): improve auto-commit change detection',
        author: { name: 'TestUser', emailAddress: 'testuser@example.com' },
        authorTimestamp: Date.now() - 86400000 * 4
      },
      {
        id: 'ef1234567890abcdef1234567890abcdef123456',
        displayId: 'ef12345',
        message: 'style(ui): update chat interface styling',
        author: { name: 'OtherUser', emailAddress: 'otheruser@example.com' },
        authorTimestamp: Date.now() - 86400000 * 5
      },
      {
        id: 'f1234567890abcdef1234567890abcdef1234567',
        displayId: 'f123456',
        message: 'test(llm): add integration tests for LLM service',
        author: { name: 'TestUser', emailAddress: 'testuser@example.com' },
        authorTimestamp: Date.now() - 86400000 * 6
      },
      {
        id: '1234567890abcdef1234567890abcdef12345678',
        displayId: '1234567',
        message: 'perf(stream): optimize streaming response handling',
        author: { name: 'TestUser', emailAddress: 'testuser@example.com' },
        authorTimestamp: Date.now() - 86400000 * 7
      },
      {
        id: '234567890abcdef1234567890abcdef123456789',
        displayId: '2345678',
        message: 'chore(deps): update dependencies to latest versions',
        author: { name: 'OtherUser', emailAddress: 'otheruser@example.com' },
        authorTimestamp: Date.now() - 86400000 * 8
      },
      {
        id: '34567890abcdef1234567890abcdef1234567890',
        displayId: '3456789',
        message: 'feat(commands): add support for keyboard shortcuts',
        author: { name: 'TestUser', emailAddress: 'testuser@example.com' },
        authorTimestamp: Date.now() - 86400000 * 9
      },
      {
        id: '4567890abcdef1234567890abcdef12345678901',
        displayId: '4567890',
        message: 'fix(ui): correct positioning of dropdown menu',
        author: { name: 'TestUser', emailAddress: 'testuser@example.com' },
        authorTimestamp: Date.now() - 86400000 * 10
      },
      {
        id: '567890abcdef1234567890abcdef123456789012',
        displayId: '567890a',
        message: 'docs(readme): update installation instructions',
        author: { name: 'OtherUser', emailAddress: 'otheruser@example.com' },
        authorTimestamp: Date.now() - 86400000 * 11
      },
      {
        id: '67890abcdef1234567890abcdef1234567890123',
        displayId: '67890ab',
        message: 'refactor(core): simplify service initialization logic',
        author: { name: 'TestUser', emailAddress: 'testuser@example.com' },
        authorTimestamp: Date.now() - 86400000 * 12
      },
      {
        id: '7890abcdef1234567890abcdef12345678901234',
        displayId: '7890abc',
        message: 'style(icons): update icon set for better visibility',
        author: { name: 'TestUser', emailAddress: 'testuser@example.com' },
        authorTimestamp: Date.now() - 86400000 * 13
      },
      {
        id: '890abcdef1234567890abcdef123456789012345',
        displayId: '890abcd',
        message: 'test(core): improve test coverage for core services',
        author: { name: 'OtherUser', emailAddress: 'otheruser@example.com' },
        authorTimestamp: Date.now() - 86400000 * 14
      },
      {
        id: '90abcdef1234567890abcdef1234567890123456',
        displayId: '90abcde',
        message: 'perf(memory): optimize memory usage in large operations',
        author: { name: 'TestUser', emailAddress: 'testuser@example.com' },
        authorTimestamp: Date.now() - 86400000 * 15
      },
      {
        id: '0abcdef1234567890abcdef12345678901234567',
        displayId: '0abcdef',
        message: 'chore(build): update build configuration',
        author: { name: 'TestUser', emailAddress: 'testuser@example.com' },
        authorTimestamp: Date.now() - 86400000 * 16
      },
      {
        id: 'abcdef1234567890abcdef123456789012345678',
        displayId: 'abcdef1',
        message: 'feat(git): enhance commit message generation',
        author: { name: 'OtherUser', emailAddress: 'otheruser@example.com' },
        authorTimestamp: Date.now() - 86400000 * 17
      },
      {
        id: 'bcdef1234567890abcdef1234567890123456789',
        displayId: 'bcdef12',
        message: 'fix(auth): resolve authentication token refresh issue',
        author: { name: 'TestUser', emailAddress: 'testuser@example.com' },
        authorTimestamp: Date.now() - 86400000 * 18
      },
      {
        id: 'cdef1234567890abcdef12345678901234567890',
        displayId: 'cdef123',
        message: 'docs(api): add examples for new API endpoints',
        author: { name: 'TestUser', emailAddress: 'testuser@example.com' },
        authorTimestamp: Date.now() - 86400000 * 19
      },
      {
        id: 'def1234567890abcdef123456789012345678901',
        displayId: 'def1234',
        message: 'refactor(ui): reorganize component hierarchy',
        author: { name: 'TestUser', emailAddress: 'testuser@example.com' },
        authorTimestamp: Date.now() - 86400000 * 20
      }
    ];
    
    // 작성자로 필터링
    const filteredCommits = authorName 
      ? mockCommits.filter(commit => commit.author.name === authorName)
      : mockCommits;
    
    // 최대 개수 제한
    return filteredCommits.slice(0, limit);
  }

  /**
   * 리소스 해제
   */
  public dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }
}