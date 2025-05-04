/**
 * SWDP 클라이언트 서비스
 * 
 * SWDP API 호출 및 결과 처리 기능 제공
 * 빌드, 배포, 테스트 관련 기능 지원
 */

import { HttpClientService } from '../../../core/http/HttpClientService';
import { HttpHeaders } from '../../../types/HttpTypes';

/**
 * SWDP 빌드 타입 열거형
 */
export enum SwdpBuildType {
  /**
   * 로컬 빌드
   */
  LOCAL = 'local',
  
  /**
   * 레이어 빌드
   */
  LAYER = 'layer',
  
  /**
   * 통합 빌드
   */
  INTEGRATION = 'integration',
  
  /**
   * 전체 빌드
   */
  ALL = 'all'
}

/**
 * SWDP 빌드 옵션 인터페이스
 */
export interface SwdpBuildOptions {
  /**
   * 빌드 타입
   */
  type: SwdpBuildType;
  
  /**
   * 워치 모드 여부
   */
  watchMode?: boolean;
  
  /**
   * PR 생성 여부
   */
  createPr?: boolean;
  
  /**
   * 빌드 파라미터
   */
  params?: Record<string, any>;
}

/**
 * SWDP 테스트 옵션 인터페이스
 */
export interface SwdpTestOptions {
  /**
   * 테스트 유형
   */
  type: 'unit' | 'integration' | 'system';
  
  /**
   * 테스트 대상
   */
  target?: string;
  
  /**
   * 테스트 파라미터
   */
  params?: Record<string, any>;
}

/**
 * TR(Test Request) 옵션 인터페이스
 */
export interface SwdpTROptions {
  /**
   * TR 제목
   */
  title: string;
  
  /**
   * TR 설명
   */
  description: string;
  
  /**
   * 테스트 유형
   */
  type: string;
  
  /**
   * 우선순위
   */
  priority?: 'high' | 'medium' | 'low';
  
  /**
   * 담당자
   */
  assignee?: string;
}

/**
 * SWDP 인증 정보 인터페이스
 */
interface SwdpCredentials {
  /**
   * API 키
   */
  apiKey?: string;
  
  /**
   * 사용자 ID
   */
  userId?: string;
  
  /**
   * 비밀번호
   */
  password?: string;
  
  /**
   * 토큰
   */
  token?: string;
}

/**
 * SWDP 클라이언트 서비스 클래스
 */
export class SwdpClientService {
  /**
   * HTTP 클라이언트
   */
  private httpClient: HttpClientService;
  
  /**
   * API 엔드포인트 기본 URL
   */
  private baseUrl: string;
  
  /**
   * 인증 헤더
   */
  private authHeaders: HttpHeaders = {};
  
  /**
   * 초기화 완료 여부
   */
  private initialized: boolean = false;
  
  /**
   * SwdpClientService 생성자
   * @param baseUrl API 엔드포인트 기본 URL
   * @param bypassSsl SSL 인증서 검증 우회 여부
   */
  constructor(baseUrl: string, bypassSsl: boolean = false) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    this.httpClient = new HttpClientService();
    
    // SSL 우회 설정
    if (bypassSsl) {
      this.httpClient.setSSLBypass(true);
    }
  }
  
  /**
   * 클라이언트 초기화
   * @param credentials 인증 정보
   */
  async initialize(credentials: SwdpCredentials): Promise<void> {
    try {
      // 인증 설정
      if (credentials.apiKey) {
        // API 키 인증
        this.authHeaders = {
          'Authorization': `Bearer ${credentials.apiKey}`
        };
        
        if (credentials.userId) {
          this.authHeaders['User-ID'] = credentials.userId;
        }
      } else if (credentials.token) {
        // 토큰 인증
        this.authHeaders = {
          'Authorization': `Bearer ${credentials.token}`
        };
      } else if (credentials.userId && credentials.password) {
        // 사용자 ID/비밀번호 인증
        // 로그인 API 호출하여 토큰 획득
        const loginResponse = await this.httpClient.post(
          `${this.baseUrl}api/v1/auth/login`,
          {
            userId: credentials.userId,
            password: credentials.password
          },
          { 'Content-Type': 'application/json' }
        );
        
        if (!loginResponse.ok || !loginResponse.data.token) {
          throw new Error('로그인 실패: 유효하지 않은 사용자 ID 또는 비밀번호');
        }
        
        this.authHeaders = {
          'Authorization': `Bearer ${loginResponse.data.token}`
        };
      } else {
        throw new Error('유효한 인증 정보를 제공해야 합니다 (API 키, 토큰 또는 사용자 ID/비밀번호)');
      }
      
      // 연결 테스트
      await this.testConnection();
      
      this.initialized = true;
    } catch (error) {
      console.error('SWDP 클라이언트 초기화 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 연결 테스트
   */
  private async testConnection(): Promise<void> {
    try {
      const response = await this.httpClient.get(
        `${this.baseUrl}api/v1/system/status`,
        this.authHeaders
      );
      
      if (!response.ok) {
        throw new Error(`SWDP 연결 테스트 실패: ${response.statusCode} ${response.statusText}`);
      }
      
      console.log('SWDP 연결 테스트 성공:', response.data.status);
    } catch (error) {
      console.error('SWDP 연결 테스트 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 초기화 확인
   */
  private checkInitialized(): void {
    if (!this.initialized) {
      throw new Error('SWDP 클라이언트가 초기화되지 않았습니다');
    }
  }
  
  /**
   * 빌드 시작
   * @param options 빌드 옵션
   * @returns 빌드 결과
   */
  async startBuild(options: SwdpBuildOptions): Promise<any> {
    this.checkInitialized();
    
    try {
      // 빌드 요청 데이터 구성
      const requestData = {
        type: options.type,
        watchMode: options.watchMode || false,
        createPr: options.createPr || false,
        params: options.params || {},
        timestamp: new Date().toISOString()
      };
      
      // 빌드 API 호출
      const response = await this.httpClient.post(
        `${this.baseUrl}api/v1/builds`,
        requestData,
        {
          ...this.authHeaders,
          'Content-Type': 'application/json'
        }
      );
      
      if (!response.ok) {
        throw new Error(`빌드 시작 실패: ${response.statusCode} ${response.statusText}`);
      }
      
      return response.data;
    } catch (error) {
      console.error('SWDP 빌드 시작 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 빌드 상태 조회
   * @param buildId 빌드 ID (생략 시 최근 빌드)
   * @returns 빌드 상태
   */
  async getBuildStatus(buildId?: string): Promise<any> {
    this.checkInitialized();
    
    try {
      // 빌드 ID가 있으면 해당 빌드 상태 조회, 없으면 최근 빌드 상태 조회
      const url = buildId 
        ? `${this.baseUrl}api/v1/builds/${buildId}/status` 
        : `${this.baseUrl}api/v1/builds/recent/status`;
      
      const response = await this.httpClient.get(url, this.authHeaders);
      
      if (!response.ok) {
        throw new Error(`빌드 상태 조회 실패: ${response.statusCode} ${response.statusText}`);
      }
      
      return response.data;
    } catch (error) {
      console.error('SWDP 빌드 상태 조회 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 빌드 로그 조회
   * @param buildId 빌드 ID
   * @returns 빌드 로그
   */
  async getBuildLogs(buildId: string): Promise<any> {
    this.checkInitialized();
    
    try {
      const response = await this.httpClient.get(
        `${this.baseUrl}api/v1/builds/${buildId}/logs`,
        this.authHeaders
      );
      
      if (!response.ok) {
        throw new Error(`빌드 로그 조회 실패: ${response.statusCode} ${response.statusText}`);
      }
      
      return response.data;
    } catch (error) {
      console.error('SWDP 빌드 로그 조회 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 빌드 취소
   * @param buildId 빌드 ID
   * @returns 취소 결과
   */
  async cancelBuild(buildId: string): Promise<any> {
    this.checkInitialized();
    
    try {
      const response = await this.httpClient.post(
        `${this.baseUrl}api/v1/builds/${buildId}/cancel`,
        {},
        this.authHeaders
      );
      
      if (!response.ok) {
        throw new Error(`빌드 취소 실패: ${response.statusCode} ${response.statusText}`);
      }
      
      return response.data;
    } catch (error) {
      console.error('SWDP 빌드 취소 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 테스트 실행
   * @param options 테스트 옵션
   * @returns 테스트 결과
   */
  async runTest(options: SwdpTestOptions): Promise<any> {
    this.checkInitialized();
    
    try {
      // 테스트 요청 데이터 구성
      const requestData = {
        type: options.type,
        target: options.target,
        params: options.params || {},
        timestamp: new Date().toISOString()
      };
      
      // 테스트 API 호출
      const response = await this.httpClient.post(
        `${this.baseUrl}api/v1/tests`,
        requestData,
        {
          ...this.authHeaders,
          'Content-Type': 'application/json'
        }
      );
      
      if (!response.ok) {
        throw new Error(`테스트 실행 실패: ${response.statusCode} ${response.statusText}`);
      }
      
      return response.data;
    } catch (error) {
      console.error('SWDP 테스트 실행 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 테스트 결과 조회
   * @param testId 테스트 ID
   * @returns 테스트 결과
   */
  async getTestResults(testId: string): Promise<any> {
    this.checkInitialized();
    
    try {
      const response = await this.httpClient.get(
        `${this.baseUrl}api/v1/tests/${testId}/results`,
        this.authHeaders
      );
      
      if (!response.ok) {
        throw new Error(`테스트 결과 조회 실패: ${response.statusCode} ${response.statusText}`);
      }
      
      return response.data;
    } catch (error) {
      console.error('SWDP 테스트 결과 조회 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * TR(Test Request) 생성
   * @param options TR 옵션
   * @returns TR 정보
   */
  async createTR(options: SwdpTROptions): Promise<any> {
    this.checkInitialized();
    
    try {
      // TR 요청 데이터 구성
      const requestData = {
        title: options.title,
        description: options.description,
        type: options.type,
        priority: options.priority || 'medium',
        assignee: options.assignee,
        timestamp: new Date().toISOString()
      };
      
      // TR 생성 API 호출
      const response = await this.httpClient.post(
        `${this.baseUrl}api/v1/tr`,
        requestData,
        {
          ...this.authHeaders,
          'Content-Type': 'application/json'
        }
      );
      
      if (!response.ok) {
        throw new Error(`TR 생성 실패: ${response.statusCode} ${response.statusText}`);
      }
      
      return response.data;
    } catch (error) {
      console.error('SWDP TR 생성 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * TR 상태 조회
   * @param trId TR ID
   * @returns TR 상태
   */
  async getTRStatus(trId: string): Promise<any> {
    this.checkInitialized();
    
    try {
      const response = await this.httpClient.get(
        `${this.baseUrl}api/v1/tr/${trId}`,
        this.authHeaders
      );
      
      if (!response.ok) {
        throw new Error(`TR 상태 조회 실패: ${response.statusCode} ${response.statusText}`);
      }
      
      return response.data;
    } catch (error) {
      console.error('SWDP TR 상태 조회 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 배포 시작
   * @param environment 배포 환경
   * @param buildId 빌드 ID
   * @param params 배포 파라미터
   * @returns 배포 결과
   */
  async startDeployment(environment: string, buildId: string, params?: Record<string, any>): Promise<any> {
    this.checkInitialized();
    
    try {
      // 배포 요청 데이터 구성
      const requestData = {
        environment,
        buildId,
        params: params || {},
        timestamp: new Date().toISOString()
      };
      
      // 배포 API 호출
      const response = await this.httpClient.post(
        `${this.baseUrl}api/v1/deployments`,
        requestData,
        {
          ...this.authHeaders,
          'Content-Type': 'application/json'
        }
      );
      
      if (!response.ok) {
        throw new Error(`배포 시작 실패: ${response.statusCode} ${response.statusText}`);
      }
      
      return response.data;
    } catch (error) {
      console.error('SWDP 배포 시작 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 배포 상태 조회
   * @param deploymentId 배포 ID
   * @returns 배포 상태
   */
  async getDeploymentStatus(deploymentId: string): Promise<any> {
    this.checkInitialized();
    
    try {
      const response = await this.httpClient.get(
        `${this.baseUrl}api/v1/deployments/${deploymentId}/status`,
        this.authHeaders
      );
      
      if (!response.ok) {
        throw new Error(`배포 상태 조회 실패: ${response.statusCode} ${response.statusText}`);
      }
      
      return response.data;
    } catch (error) {
      console.error('SWDP 배포 상태 조회 중 오류 발생:', error);
      throw error;
    }
  }
}