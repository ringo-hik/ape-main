/**
 * HTTP 클라이언트 서비스
 * 
 * HTTP 요청을 처리하는 서비스
 * SSL 인증서 검증 우회 기능 포함
 */

import * as https from 'https';
import * as http from 'http';
import * as url from 'url';
import { 
  HttpMethod, 
  HttpHeaders, 
  HttpRequestOptions, 
  HttpResponse, 
  IHttpClient 
} from '../../types/HttpTypes';
import { SSLBypassService } from '../utils/SSLBypassService';

/**
 * HTTP 클라이언트 클래스
 * HTTP 요청 처리 및 응답 파싱
 */
export class HttpClientService implements IHttpClient {
  /**
   * HTTP 요청 실행
   * @param options 요청 옵션
   * @returns HTTP 응답
   */
  async request<T = any>(options: HttpRequestOptions): Promise<HttpResponse<T>> {
    try {
      const parsedUrl = url.parse(options.url);
      const isHttps = parsedUrl.protocol === 'https:';
      
      // 요청 옵션 구성
      const requestOptions: http.RequestOptions = {
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.path,
        method: options.method,
        headers: options.headers || {},
      };
      
      // SSL 우회 설정 적용
      if (isHttps && (options.bypassSsl || SSLBypassService.getInstance().isBypassActive())) {
        Object.assign(requestOptions, SSLBypassService.getInstance().getRequestOptions());
      }
      
      // 요청 본문이 있고 Content-Type이 설정되지 않은 경우 기본값 설정
      if (options.body && !requestOptions.headers!['Content-Type']) {
        requestOptions.headers!['Content-Type'] = 'application/json';
      }
      
      // HTTP 요청 프로미스 생성
      return new Promise<HttpResponse<T>>((resolve, reject) => {
        // 타임아웃 설정
        const timeout = options.timeout || 30000; // 기본 30초
        
        // HTTP/HTTPS 요청 객체 생성
        const requestFn = isHttps ? https.request : http.request;
        const req = requestFn(requestOptions, (res) => {
          let data = '';
          
          // 데이터 수신 이벤트
          res.on('data', (chunk) => {
            data += chunk;
            
            // 진행 상황 콜백 호출 (구현되면)
            if (options.onProgress) {
              // 여기에 진행 상황 계산 로직 추가 필요
            }
          });
          
          // 요청 완료 이벤트
          res.on('end', () => {
            try {
              // 응답 데이터 파싱 (JSON 또는 원시 데이터)
              let parsedData: any = data;
              
              if (options.parseJson !== false) {
                try {
                  parsedData = JSON.parse(data);
                } catch (e) {
                  // JSON 파싱 실패 시 원시 데이터 사용
                  console.warn('JSON 파싱 실패, 원시 데이터 사용:', e);
                }
              }
              
              // 응답 객체 구성
              const response: HttpResponse<T> = {
                statusCode: res.statusCode || 0,
                statusText: res.statusMessage || '',
                headers: res.headers as HttpHeaders,
                data: parsedData,
                url: options.url,
                ok: res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 300
              };
              
              resolve(response);
            } catch (error) {
              reject(error);
            }
          });
        });
        
        // 오류 이벤트
        req.on('error', (error) => {
          reject(error);
        });
        
        // 타임아웃 설정
        req.setTimeout(timeout, () => {
          req.destroy();
          reject(new Error(`요청 시간 초과 (${timeout}ms): ${options.url}`));
        });
        
        // 요청 본문 전송
        if (options.body) {
          const bodyData = typeof options.body === 'string' 
            ? options.body 
            : JSON.stringify(options.body);
            
          req.write(bodyData);
        }
        
        // 요청 종료
        req.end();
      });
    } catch (error) {
      console.error('HTTP 요청 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * GET 요청
   * @param url 요청 URL
   * @param headers 요청 헤더
   * @returns HTTP 응답
   */
  async get<T = any>(url: string, headers?: HttpHeaders): Promise<HttpResponse<T>> {
    return this.request<T>({
      url,
      method: HttpMethod.GET,
      headers
    });
  }
  
  /**
   * POST 요청
   * @param url 요청 URL
   * @param body 요청 본문
   * @param headers 요청 헤더
   * @returns HTTP 응답
   */
  async post<T = any>(url: string, body?: any, headers?: HttpHeaders): Promise<HttpResponse<T>> {
    return this.request<T>({
      url,
      method: HttpMethod.POST,
      body,
      headers
    });
  }
  
  /**
   * PUT 요청
   * @param url 요청 URL
   * @param body 요청 본문
   * @param headers 요청 헤더
   * @returns HTTP 응답
   */
  async put<T = any>(url: string, body?: any, headers?: HttpHeaders): Promise<HttpResponse<T>> {
    return this.request<T>({
      url,
      method: HttpMethod.PUT,
      body,
      headers
    });
  }
  
  /**
   * DELETE 요청
   * @param url 요청 URL
   * @param headers 요청 헤더
   * @returns HTTP 응답
   */
  async delete<T = any>(url: string, headers?: HttpHeaders): Promise<HttpResponse<T>> {
    return this.request<T>({
      url,
      method: HttpMethod.DELETE,
      headers
    });
  }
  
  /**
   * SSL 우회 설정
   * @param bypass SSL 우회 여부
   */
  setSSLBypass(bypass: boolean): void {
    if (bypass) {
      SSLBypassService.getInstance().applyGlobalBypass();
    } else {
      SSLBypassService.getInstance().disableBypass();
    }
  }
}