/**
 * 서비스 오류 모듈
 * 
 * 외부 서비스 연결 및 사용 중 발생하는 오류를 처리하는 기능 제공
 * 일관된 오류 처리와 사용자 친화적인 오류 메시지를 위한 유틸리티
 */

import * as vscode from 'vscode';
import { ServiceType } from './serviceConfig';

/**
 * 서비스 오류 유형 열거형
 */
export enum ServiceErrorType {
  // 연결 관련 오류
  ConnectionFailed = 'connection_failed',
  Timeout = 'timeout',
  
  // 인증 관련 오류
  AuthenticationFailed = 'authentication_failed',
  TokenExpired = 'token_expired',
  PermissionDenied = 'permission_denied',
  
  // 리소스 관련 오류
  ResourceNotFound = 'resource_not_found',
  InvalidResource = 'invalid_resource',
  
  // 요청 관련 오류
  InvalidRequest = 'invalid_request',
  BadRequest = 'bad_request',
  RateLimited = 'rate_limited',
  
  // 서버 관련 오류
  ServerError = 'server_error',
  ServiceUnavailable = 'service_unavailable',
  
  // 환경 관련 오류
  ConfigurationError = 'configuration_error',
  
  // 기타 오류
  Unknown = 'unknown'
}

/**
 * 서비스 오류 인터페이스
 */
export interface IServiceError {
  type: ServiceErrorType;
  serviceType: ServiceType;
  message: string;
  details?: any;
  timestamp: Date;
}

/**
 * 서비스 오류 클래스
 */
export class ServiceError extends Error implements IServiceError {
  type: ServiceErrorType;
  serviceType: ServiceType;
  details?: any;
  timestamp: Date;

  /**
   * 서비스 오류 생성자
   * @param message 오류 메시지
   * @param originalError 원본 오류 (옵션)
   * @param serviceType 서비스 타입 (기본값: Unknown)
   * @param errorType 오류 타입 (기본값: Unknown)
   */
  constructor(
    message: string, 
    originalError?: any, 
    serviceType: ServiceType = ServiceType.Unknown, 
    errorType: ServiceErrorType = ServiceErrorType.Unknown
  ) {
    super(message);
    this.name = 'ServiceError';
    this.message = message;
    this.type = errorType;
    this.serviceType = serviceType;
    this.details = originalError;
    this.timestamp = new Date();

    // Error 객체의 프로토타입 체인 유지
    Object.setPrototypeOf(this, ServiceError.prototype);
  }
}

/**
 * 서비스 오류 관리자 클래스
 */
export class ServiceErrorManager {
  private static _lastErrors: Map<ServiceType, IServiceError> = new Map();
  
  /**
   * 오류 생성 및 등록
   * @param serviceType 서비스 유형
   * @param errorType 오류 유형
   * @param message 오류 메시지
   * @param details 추가 세부 정보
   * @returns 생성된 서비스 오류
   */
  public static createError(
    serviceType: ServiceType,
    errorType: ServiceErrorType,
    message: string,
    details?: any
  ): IServiceError {
    const error = new ServiceError(message, details, serviceType, errorType);
    
    // 해당 서비스의 마지막 오류 저장
    this._lastErrors.set(serviceType, error);
    
    // 콘솔에 오류 기록
    console.error(`[${serviceType}] ${errorType}: ${message}`, details || '');
    
    return error;
  }
  
  /**
   * 마지막 오류 가져오기
   * @param serviceType 서비스 유형
   * @returns 마지막 서비스 오류 또는 null
   */
  public static getLastError(serviceType: ServiceType): IServiceError | null {
    return this._lastErrors.get(serviceType) || null;
  }
  
  /**
   * 모든 서비스 오류 가져오기
   * @returns 모든 서비스 오류 맵
   */
  public static getAllErrors(): Map<ServiceType, IServiceError> {
    return new Map(this._lastErrors);
  }
  
  /**
   * 서비스 오류를 사용자 친화적인 메시지로 변환
   * @param error 서비스 오류
   * @returns 사용자 친화적인 오류 메시지
   */
  public static getUserFriendlyMessage(error: IServiceError): string {
    // 서비스 유형별 한글 이름
    const serviceNames: Record<ServiceType, string> = {
      [ServiceType.Git]: 'Git',
      [ServiceType.Bitbucket]: 'Bitbucket',
      [ServiceType.Jira]: 'Jira',
      [ServiceType.S3]: 'Pocket/S3',
      [ServiceType.SWDP]: 'SWDP',
      [ServiceType.Vault]: 'VAULT',
      [ServiceType.Unknown]: '알 수 없는 서비스'
    };
    
    const serviceName = serviceNames[error.serviceType] || error.serviceType;
    
    // 오류 유형별 기본 메시지
    switch (error.type) {
      case ServiceErrorType.ConnectionFailed:
        return `${serviceName} 서버 연결에 실패했습니다. URL을 확인하세요: ${error.details?.url || ''}`;
        
      case ServiceErrorType.Timeout:
        return `${serviceName} 서버 응답 시간이 초과되었습니다. 서버 상태나 네트워크를 확인하세요.`;
        
      case ServiceErrorType.AuthenticationFailed:
        return `${serviceName} 인증에 실패했습니다. 아이디와 비밀번호를 확인하세요.`;
        
      case ServiceErrorType.TokenExpired:
        return `${serviceName} 인증 토큰이 만료되었습니다. 토큰을 갱신하세요.`;
        
      case ServiceErrorType.PermissionDenied:
        return `${serviceName} 접근 권한이 없습니다. 계정 권한을 확인하세요.`;
        
      case ServiceErrorType.ResourceNotFound:
        return `${serviceName}에서 요청한 리소스를 찾을 수 없습니다.`;
        
      case ServiceErrorType.InvalidResource:
        return `${serviceName}에 잘못된 리소스가 요청되었습니다.`;
        
      case ServiceErrorType.InvalidRequest:
      case ServiceErrorType.BadRequest:
        return `${serviceName}에 잘못된 요청이 전송되었습니다.`;
        
      case ServiceErrorType.RateLimited:
        return `${serviceName} 요청 한도를 초과했습니다. 잠시 후 다시 시도하세요.`;
        
      case ServiceErrorType.ServerError:
        return `${serviceName} 서버에 오류가 발생했습니다. 서버 관리자에게 문의하세요.`;
        
      case ServiceErrorType.ServiceUnavailable:
        return `${serviceName} 서비스를 현재 사용할 수 없습니다. 서비스 상태를 확인하세요.`;
        
      case ServiceErrorType.ConfigurationError:
        return `${serviceName} 설정 오류: ${error.message}`;
        
      case ServiceErrorType.Unknown:
      default:
        return `${serviceName} 오류: ${error.message}`;
    }
  }
  
  /**
   * 오류를 사용자에게 표시
   * @param error 서비스 오류
   * @param showDetailAction 세부 정보 표시 액션 포함 여부
   */
  public static async showErrorToUser(error: IServiceError, showDetailAction: boolean = true): Promise<void> {
    const userMessage = this.getUserFriendlyMessage(error);
    
    if (showDetailAction) {
      const selection = await vscode.window.showErrorMessage(
        userMessage,
        '세부 정보',
        '닫기'
      );
      
      if (selection === '세부 정보') {
        // 세부 정보를 출력 채널에 표시
        const outputChannel = vscode.window.createOutputChannel(`APE ${error.serviceType} 오류`);
        outputChannel.appendLine(`시간: ${error.timestamp.toLocaleString()}`);
        outputChannel.appendLine(`서비스: ${error.serviceType}`);
        outputChannel.appendLine(`오류 유형: ${error.type}`);
        outputChannel.appendLine(`메시지: ${error.message}`);
        
        if (error.details) {
          outputChannel.appendLine('\n세부 정보:');
          outputChannel.appendLine(JSON.stringify(error.details, null, 2));
        }
        
        outputChannel.show();
      }
    } else {
      vscode.window.showErrorMessage(userMessage);
    }
  }
  
  /**
   * HTTP 상태 코드를 ServiceErrorType으로 변환
   * @param statusCode HTTP 상태 코드
   * @returns 대응하는 서비스 오류 유형
   */
  public static errorTypeFromHttpStatus(statusCode: number): ServiceErrorType {
    if (statusCode >= 500) {
      return ServiceErrorType.ServerError;
    }
    
    switch (statusCode) {
      case 400:
        return ServiceErrorType.BadRequest;
      case 401:
        return ServiceErrorType.AuthenticationFailed;
      case 403:
        return ServiceErrorType.PermissionDenied;
      case 404:
        return ServiceErrorType.ResourceNotFound;
      case 408:
        return ServiceErrorType.Timeout;
      case 429:
        return ServiceErrorType.RateLimited;
      default:
        return ServiceErrorType.Unknown;
    }
  }
}