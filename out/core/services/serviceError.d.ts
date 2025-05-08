/**
 * 서비스 오류 모듈
 *
 * 외부 서비스 연결 및 사용 중 발생하는 오류를 처리하는 기능 제공
 * 일관된 오류 처리와 사용자 친화적인 오류 메시지를 위한 유틸리티
 */
import { ServiceType } from './serviceConfig';
/**
 * 서비스 오류 유형 열거형
 */
export declare enum ServiceErrorType {
    ConnectionFailed = "connection_failed",
    Timeout = "timeout",
    AuthenticationFailed = "authentication_failed",
    TokenExpired = "token_expired",
    PermissionDenied = "permission_denied",
    ResourceNotFound = "resource_not_found",
    InvalidResource = "invalid_resource",
    InvalidRequest = "invalid_request",
    BadRequest = "bad_request",
    RateLimited = "rate_limited",
    ServerError = "server_error",
    ServiceUnavailable = "service_unavailable",
    ConfigurationError = "configuration_error",
    Unknown = "unknown"
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
export declare class ServiceError extends Error implements IServiceError {
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
    constructor(message: string, originalError?: any, serviceType?: ServiceType, errorType?: ServiceErrorType);
}
/**
 * 서비스 오류 관리자 클래스
 */
export declare class ServiceErrorManager {
    private static _lastErrors;
    /**
     * 오류 생성 및 등록
     * @param serviceType 서비스 유형
     * @param errorType 오류 유형
     * @param message 오류 메시지
     * @param details 추가 세부 정보
     * @returns 생성된 서비스 오류
     */
    static createError(serviceType: ServiceType, errorType: ServiceErrorType, message: string, details?: any): IServiceError;
    /**
     * 마지막 오류 가져오기
     * @param serviceType 서비스 유형
     * @returns 마지막 서비스 오류 또는 null
     */
    static getLastError(serviceType: ServiceType): IServiceError | null;
    /**
     * 모든 서비스 오류 가져오기
     * @returns 모든 서비스 오류 맵
     */
    static getAllErrors(): Map<ServiceType, IServiceError>;
    /**
     * 서비스 오류를 사용자 친화적인 메시지로 변환
     * @param error 서비스 오류
     * @returns 사용자 친화적인 오류 메시지
     */
    static getUserFriendlyMessage(error: IServiceError): string;
    /**
     * 오류를 사용자에게 표시
     * @param error 서비스 오류
     * @param showDetailAction 세부 정보 표시 액션 포함 여부
     */
    static showErrorToUser(error: IServiceError, showDetailAction?: boolean): Promise<void>;
    /**
     * HTTP 상태 코드를 ServiceErrorType으로 변환
     * @param statusCode HTTP 상태 코드
     * @returns 대응하는 서비스 오류 유형
     */
    static errorTypeFromHttpStatus(statusCode: number): ServiceErrorType;
}
