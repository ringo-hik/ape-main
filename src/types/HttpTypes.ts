/**
 * HTTP 클라이언트 관련 타입 정의
 * 
 * 네트워크 통신을 위한 인터페이스 및 타입 정의
 */

/**
 * HTTP 메서드 열거형
 */
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS'
}

/**
 * HTTP 헤더 타입
 */
export type HttpHeaders = Record<string, string>;

/**
 * HTTP 요청 옵션 인터페이스
 */
export interface HttpRequestOptions {
  /**
   * 요청 URL
   */
  url: string;
  
  /**
   * HTTP 메서드
   */
  method: HttpMethod;
  
  /**
   * HTTP 헤더
   */
  headers?: HttpHeaders;
  
  /**
   * 요청 본문
   */
  body?: any;
  
  /**
   * 쿼리 매개변수
   */
  params?: Record<string, string>;
  
  /**
   * 타임아웃 (밀리초)
   */
  timeout?: number;
  
  /**
   * SSL 인증서 검증 우회 여부
   */
  bypassSsl?: boolean;
  
  /**
   * JSON 응답 자동 파싱 여부
   */
  parseJson?: boolean;
  
  /**
   * 진행 상황 콜백
   */
  onProgress?: (progress: number) => void;
}

/**
 * HTTP 응답 인터페이스
 */
export interface HttpResponse<T = any> {
  /**
   * 상태 코드
   */
  statusCode: number;
  
  /**
   * 상태 텍스트
   */
  statusText: string;
  
  /**
   * 응답 헤더
   */
  headers: HttpHeaders;
  
  /**
   * 응답 본문
   */
  data: T;
  
  /**
   * 응답 URL
   */
  url: string;
  
  /**
   * 성공 여부
   */
  ok: boolean;
}

/**
 * HTTP 클라이언트 인터페이스
 */
export interface IHttpClient {
  /**
   * HTTP 요청 실행
   * @param options 요청 옵션
   * @returns HTTP 응답
   */
  request<T = any>(options: HttpRequestOptions): Promise<HttpResponse<T>>;
  
  /**
   * GET 요청
   * @param url 요청 URL
   * @param headers 요청 헤더
   * @returns HTTP 응답
   */
  get<T = any>(url: string, headers?: HttpHeaders): Promise<HttpResponse<T>>;
  
  /**
   * POST 요청
   * @param url 요청 URL
   * @param body 요청 본문
   * @param headers 요청 헤더
   * @returns HTTP 응답
   */
  post<T = any>(url: string, body?: any, headers?: HttpHeaders): Promise<HttpResponse<T>>;
  
  /**
   * PUT 요청
   * @param url 요청 URL
   * @param body 요청 본문
   * @param headers 요청 헤더
   * @returns HTTP 응답
   */
  put<T = any>(url: string, body?: any, headers?: HttpHeaders): Promise<HttpResponse<T>>;
  
  /**
   * DELETE 요청
   * @param url 요청 URL
   * @param headers 요청 헤더
   * @returns HTTP 응답
   */
  delete<T = any>(url: string, headers?: HttpHeaders): Promise<HttpResponse<T>>;
  
  /**
   * SSL 우회 설정
   * @param bypass SSL 우회 여부
   */
  setSSLBypass(bypass: boolean): void;
}