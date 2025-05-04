/**
 * SSL 우회 유틸리티 모듈
 * 
 * SSL 인증서 검증 우회 기능 제공
 * 온프레미스 환경에서 자체 서명 인증서 무시 지원
 */

import * as https from 'https';
import * as http from 'http';
import * as tls from 'tls';
import * as constants from 'constants';

/**
 * SSL 우회 설정 클래스
 * SSL 인증서 검증 우회 기능 제공
 */
export class SSLBypassService {
  /**
   * 싱글톤 인스턴스
   */
  private static instance: SSLBypassService;
  
  /**
   * SSL 우회 활성화 상태
   */
  private isBypassEnabled: boolean = false;
  
  /**
   * 싱글톤 인스턴스 가져오기
   * @returns SSLBypassService 인스턴스
   */
  public static getInstance(): SSLBypassService {
    if (!SSLBypassService.instance) {
      SSLBypassService.instance = new SSLBypassService();
    }
    return SSLBypassService.instance;
  }
  
  /**
   * 생성자
   */
  private constructor() {
    // 환경 변수로 이미 설정되어 있는지 확인
    this.isBypassEnabled = process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0';
  }
  
  /**
   * 전역 SSL 인증서 검증 우회 설정 적용
   * @returns 적용 성공 여부
   */
  public applyGlobalBypass(): boolean {
    try {
      // NODE_TLS_REJECT_UNAUTHORIZED 환경 변수 설정
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      
      // 전역 TLS 설정은 직접 DEFAULT_MIN_VERSION을 설정하지 않고
      // 각 요청에서 minVersion 옵션을 사용하는 방식으로 변경
      
      this.isBypassEnabled = true;
      console.log('SSL 인증서 검증 우회가 활성화되었습니다 (온프레미스 모드)');
      
      return true;
    } catch (error) {
      console.error('SSL 인증서 검증 우회 설정 적용 오류:', error);
      return false;
    }
  }
  
  /**
   * 요청별 SSL 우회 옵션 가져오기
   * @returns HTTPS 요청 옵션
   */
  public getRequestOptions(): https.RequestOptions {
    return {
      rejectUnauthorized: false,
      minVersion: 'TLSv1' as tls.SecureVersion,
      checkServerIdentity: () => undefined,  // 서버 ID 검증 비활성화
      secureOptions: constants.SSL_OP_NO_TLSv1_2
    };
  }
  
  /**
   * HTTPS 에이전트 생성
   * @returns SSL 우회 설정이 적용된 HTTPS 에이전트
   */
  public createHttpsAgent(): https.Agent {
    return new https.Agent({
      rejectUnauthorized: false,
      // 타입 오류 방지를 위한 적절한 접근 방식
      minVersion: 'TLSv1' as tls.SecureVersion,
      checkServerIdentity: () => undefined,
      secureOptions: constants.SSL_OP_NO_TLSv1_2,
      ciphers: 'ALL'  // 모든 암호화 알고리즘 허용
    });
  }
  
  /**
   * SSL 우회 상태 확인
   * @returns SSL 우회 활성화 여부
   */
  public isBypassActive(): boolean {
    return this.isBypassEnabled;
  }
  
  /**
   * SSL 우회 설정 비활성화
   * @returns 비활성화 성공 여부
   */
  public disableBypass(): boolean {
    try {
      // NODE_TLS_REJECT_UNAUTHORIZED 환경 변수 재설정
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
      
      this.isBypassEnabled = false;
      console.log('SSL 인증서 검증 우회가 비활성화되었습니다');
      
      return true;
    } catch (error) {
      console.error('SSL 인증서 검증 우회 설정 비활성화 오류:', error);
      return false;
    }
  }
}

/**
 * 편의성을 위한 싱글톤 인스턴스 익스포트
 */
export const sslBypass = SSLBypassService.getInstance();