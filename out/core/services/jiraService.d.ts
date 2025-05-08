/**
 * Jira 서비스
 *
 * Jira API를 사용하여 이슈 정보를 조회하고 관리하는 서비스입니다.
 * 내부망 Jira 서버와 통신하며, 실제 서버를 사용할 수 없는 경우 모의(Mock) 데이터를 사용합니다.
 */
import * as vscode from 'vscode';
import { ServiceConfigManager } from './serviceConfig';
import { ServiceResult } from './serviceResult';
/**
 * Jira 이슈 상태 유형
 */
export declare enum JiraIssueStatus {
    ToDo = "todo",
    InProgress = "in-progress",
    Done = "done",
    InReview = "in-review",
    Blocked = "blocked",
    Unknown = "unknown"
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
    averageResolutionTime?: number;
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
export declare enum JiraErrorType {
    ConnectionFailed = "connection_failed",
    AuthenticationFailed = "authentication_failed",
    PermissionDenied = "permission_denied",
    ResourceNotFound = "resource_not_found",
    ServerError = "server_error",
    InvalidRequest = "invalid_request",
    Unknown = "unknown"
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
export declare class JiraService implements vscode.Disposable {
    private readonly context;
    private readonly serviceConfigManager?;
    private baseUrl;
    private apiPath;
    private username;
    private password;
    private token;
    private authType;
    private useMock;
    private disposables;
    private _lastError;
    /**
     * Jira 서비스 생성자
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
    get lastError(): JiraError | null;
    /**
     * 이슈 조회
     * @param issueKey Jira 이슈 키 (예: 'APE-123')
     * @returns Jira 이슈 정보를 포함한 서비스 결과
     */
    getIssue(issueKey: string): Promise<ServiceResult<JiraIssue>>;
    /**
     * Jira 이슈 생성
     * @param issueData 이슈 데이터
     * @returns 생성된 이슈 정보를 포함한 서비스 결과
     */
    createIssue(issueData: {
        projectKey: string;
        issueType: string;
        summary: string;
        description?: string;
        assignee?: string;
        components?: string[];
        labels?: string[];
        dueDate?: string;
    }): Promise<ServiceResult<JiraIssue>>;
    /**
     * Jira 이슈 상태 변경
     * @param issueKey Jira 이슈 키 (예: 'APE-123')
     * @param status 변경할 상태
     * @returns 성공 여부를 포함한 서비스 결과
     */
    updateIssueStatus(issueKey: string, status: JiraIssueStatus): Promise<ServiceResult<boolean>>;
    /**
     * Jira 이슈 검색
     * @param criteria 검색 조건
     * @returns 검색 결과를 포함한 서비스 결과
     */
    searchIssues(criteria: JiraSearchCriteria): Promise<ServiceResult<JiraSearchResult>>;
    /**
     * JQL 검색 쿼리 구성
     * @param criteria 검색 조건
     * @returns JQL 쿼리 문자열
     * @private
     */
    private buildJqlQuery;
    /**
     * 모의 검색 결과 생성
     * @param criteria 검색 조건
     * @returns 모의 검색 결과
     * @private
     */
    private getMockSearchResult;
    /**
     * Jira 프로젝트 요약 조회
     * @param projectKey 프로젝트 키 (선택적, 입력되지 않으면 모든 프로젝트 요약)
     * @param maxRecentIssues 최근 이슈 목록 최대 수 (기본값: 5)
     * @param maxOldIssues 오래된 미해결 이슈 목록 최대 수 (기본값: 5)
     * @returns Jira 요약 정보를 포함한 서비스 결과
     */
    getProjectSummary(projectKey?: string, maxRecentIssues?: number, maxOldIssues?: number): Promise<ServiceResult<JiraSummary>>;
    /**
     * 모의 요약 정보 생성
     * @param projectKey 프로젝트 키
     * @param maxRecentIssues 최근 이슈 수
     * @param maxOldIssues 오래된 미해결 이슈 수
     * @returns 모의 요약 정보
     * @private
     */
    private getMockSummary;
    /**
     * 이슈 상태 변경에 필요한 트랜지션 ID 가져오기
     * @param issueKey Jira 이슈 키
     * @param targetStatus 목표 상태
     * @returns 트랜지션 ID
     * @private
     */
    private getTransitionIdForStatus;
    /**
     * Jira API 응답에서 이슈 정보 파싱
     * @param data API 응답 데이터
     * @returns 파싱된 이슈 정보
     * @private
     */
    private parseJiraIssue;
    /**
     * 모의 Jira 이슈 생성
     * @param issueKey 이슈 키
     * @returns 모의 이슈 데이터
     * @private
     */
    private getMockIssue;
    /**
     * 오류 처리 및 분류
     * @param error 발생한 오류
     * @param resourceId 관련 리소스 ID (선택적)
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
     * 리소스 해제
     */
    dispose(): void;
}
