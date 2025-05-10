/**
 * 플러그인 시스템 - 타입 정의
 *
 * JSON 기반 플러그인 정의와 LLM 에이전트 기반 플러그인 시스템을 위한 타입 정의
 */
/**
 * 플러그인 인증 유형
 */
export declare enum PluginAuthType {
    NONE = "none",// 인증 없음
    API_KEY = "api_key",// API 키 인증
    BASIC = "basic",// 기본 인증
    BEARER = "bearer",// Bearer 토큰 인증
    OAUTH2 = "oauth2"
}
/**
 * API 요청 메서드
 */
export declare enum HttpMethod {
    GET = "GET",
    POST = "POST",
    PUT = "PUT",
    DELETE = "DELETE",
    PATCH = "PATCH",
    HEAD = "HEAD",
    OPTIONS = "OPTIONS"
}
/**
 * 파라미터 타입
 */
export declare enum ParameterType {
    STRING = "string",
    NUMBER = "number",
    BOOLEAN = "boolean",
    ARRAY = "array",
    OBJECT = "object"
}
/**
 * 플러그인 인증 정보
 */
export interface PluginAuth {
    type: PluginAuthType;
    headerName?: string;
    queryParamName?: string;
    envName?: string;
    valueTemplate?: string;
}
/**
 * 플러그인 함수 파라미터
 */
export interface PluginParameter {
    name: string;
    description: string;
    type: ParameterType;
    required: boolean;
    defaultValue?: any;
    enum?: string[];
    items?: {
        type: ParameterType;
    };
    properties?: Record<string, PluginParameter>;
}
/**
 * 플러그인 함수 정의
 */
export interface PluginFunction {
    name: string;
    displayName?: string;
    description: string;
    endpoint: string;
    method: HttpMethod;
    parameters: Record<string, PluginParameter>;
    responseFormat?: string;
    responsePath?: string;
    requestBodyTemplate?: string;
    headers?: Record<string, string>;
}
/**
 * 플러그인 정의
 */
export interface PluginDefinition {
    id?: string;
    name: string;
    displayName: string;
    description: string;
    version: string;
    iconPath?: string;
    baseUrl: string;
    auth: PluginAuth;
    functions: PluginFunction[];
    createdAt?: string;
    updatedAt?: string;
    enabled?: boolean;
}
/**
 * 플러그인 함수 호출 인자
 */
export interface PluginFunctionCallArgs {
    functionName: string;
    arguments: Record<string, any>;
}
/**
 * 플러그인 함수 호출 결과
 */
export interface PluginFunctionCallResult {
    functionName: string;
    success: boolean;
    data?: any;
    error?: {
        message: string;
        code?: string;
        details?: any;
    };
    rawResponse?: any;
    responseType?: string;
}
/**
 * 플러그인 프롬프트 템플릿
 */
export interface PluginPromptTemplate {
    systemPrompt: string;
    commandParsingPrompt: string;
    responseFormattingPrompt: string;
}
/**
 * 플러그인 저장소 설정
 */
export interface PluginRepositorySettings {
    storageDirectory: string;
    defaultEnabled: boolean;
    autoDiscovery: boolean;
    globalSettings?: Record<string, any>;
}
