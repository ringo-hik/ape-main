/**
 * BitBucket 서비스
 *
 * BitBucket API를 사용하여 Git 저장소 정보를 조회하고 관리하는 서비스입니다.
 * 내부망 BitBucket 서버와 통신하며, 실제 서버를 사용할 수 없는 경우 Mock 데이터를 사용합니다.
 */
import * as vscode from 'vscode';
import { ServiceConfigManager } from '../services/serviceConfig';
/**
 * BitBucket 커밋 정보 인터페이스
 */
export interface BitbucketCommit {
    id: string;
    displayId: string;
    message: string;
    author: {
        name: string;
        emailAddress: string;
    };
    authorTimestamp: number;
}
/**
 * BitBucket 서비스 오류 유형
 */
export declare enum BitbucketErrorType {
    ConnectionFailed = "connection_failed",
    AuthenticationFailed = "authentication_failed",
    PermissionDenied = "permission_denied",
    ResourceNotFound = "resource_not_found",
    ServerError = "server_error",
    Unknown = "unknown"
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
export declare class BitbucketService implements vscode.Disposable {
    private readonly context;
    private readonly serviceConfigManager?;
    private baseUrl;
    private projectKey;
    private repoSlug;
    private username;
    private password;
    private token;
    private authType;
    private useMock;
    private disposables;
    private _lastError;
    /**
     * BitBucket 서비스 생성자
     * @param context VSCode 확장 컨텍스트
     * @param serviceConfigManager 서비스 설정 관리자 (선택적)
     */
    constructor(context: vscode.ExtensionContext, serviceConfigManager?: ServiceConfigManager | undefined);
    /**
     * 설정 다시 로드
     */
    private loadConfiguration;
    /**
     * 마지막 오류 가져오기
     */
    get lastError(): BitbucketError | null;
    /**
     * 특정 사용자의 최근 커밋 이력 가져오기
     * @param authorName 작성자 이름 (비어 있으면 모든 커밋 가져옴)
     * @param limit 가져올 커밋 수 (기본값: 20)
     * @returns 커밋 목록
     * @throws Error 연결 실패 또는 서버 오류 시 오류를 던짐
     */
    getCommitHistory(authorName?: string, limit?: number): Promise<BitbucketCommit[]>;
    /**
     * 오류 처리 및 분류
     * @param error 발생한 오류
     * @private
     */
    private handleError;
    /**
     * 오류 설정
     * @param type 오류 유형
     * @param message 오류 메시지
     * @param details 추가 세부 정보
     * @private
     */
    private setError;
    /**
     * 사용자의 Git 사용자 이름 가져오기 (BitBucket 계정 이름과 다를 수 있음)
     * @returns Git 사용자 이름
     * @throws Error 연결 실패 또는 서버 오류 시 오류를 던짐
     */
    getGitUsername(): Promise<string>;
    /**
     * 모의 커밋 이력 생성
     * @param authorName 작성자 이름
     * @param limit 가져올 커밋 수
     * @returns 모의 커밋 목록
     */
    private getMockCommitHistory;
    /**
     * 리소스 해제
     */
    dispose(): void;
}
