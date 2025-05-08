/**
 * 서비스 설정 관리자
 *
 * Git, Jira, S3, SWDP 등의 외부 서비스 연결 설정을 관리합니다.
 * 각 서비스별 URL, 인증 정보 등을 VSCode 설정에서 가져오고 검증합니다.
 */
import * as vscode from 'vscode';
/**
 * 서비스 인증 방식 유형
 */
export declare enum AuthType {
    None = "none",
    Basic = "basic",
    OAuth = "oauth",
    Token = "token",
    AWS = "aws"
}
/**
 * 서비스 연결 설정 인터페이스
 */
export interface ServiceConnectionConfig {
    enabled: boolean;
    url: string;
    authType: AuthType;
    username?: string;
    password?: string;
    token?: string;
    useMock: boolean;
    additionalParams?: Record<string, any>;
}
/**
 * 서비스 유형
 */
export declare enum ServiceType {
    Git = "git",
    Bitbucket = "bitbucket",
    Jira = "jira",
    S3 = "pocket",// S3/Pocket 서비스
    SWDP = "swdp",
    Vault = "vault",// VAULT 서비스
    Unknown = "unknown"
}
/**
 * 서비스 설정 관리자 클래스
 */
export declare class ServiceConfigManager implements vscode.Disposable {
    private readonly context;
    private configs;
    private disposables;
    /**
     * 생성자
     * @param context VSCode 확장 컨텍스트
     */
    constructor(context: vscode.ExtensionContext);
    /**
     * 설정 변경 시 호출될 이벤트 핸들러
     * @private
     */
    private onConfigChange;
    /**
     * 모든 서비스 설정 로드
     * @private
     */
    private loadAllConfigs;
    /**
     * 특정 서비스 설정 로드
     * @param serviceType 서비스 유형
     * @private
     */
    private loadServiceConfig;
    /**
     * 서비스 설정 가져오기
     * @param serviceType 서비스 유형
     */
    getServiceConfig(serviceType: ServiceType): ServiceConnectionConfig;
    /**
     * 서비스 설정 업데이트
     * @param serviceType 서비스 유형
     * @param config 새 설정
     */
    updateServiceConfig(serviceType: ServiceType, config: Partial<ServiceConnectionConfig>): Promise<boolean>;
    /**
     * 서비스 설정 검증
     * @param serviceType 서비스 유형
     */
    validateServiceConfig(serviceType: ServiceType): string[];
    /**
     * URL 유효성 검사
     * @param url 검사할 URL
     * @private
     */
    private isValidUrl;
    /**
     * 서비스 연결 테스트
     * @param serviceType 서비스 유형
     */
    testConnection(serviceType: ServiceType): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * 리소스 해제
     */
    dispose(): void;
}
