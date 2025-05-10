/**
 * 모델 정보 관리를 위한 타입 정의
 */
/**
 * 실제 모델 식별자 - LLM API 호출 시 사용
 * 실제 API 호출에 사용되는 모델 식별자 문자열
 */
export declare enum ModelId {
    GPT_4_1_MINI = "openai/gpt-4.1-mini",// 기본 모델
    GPT_4_1_PREVIEW = "openai/gpt-4.1-preview",// 최신 고성능
    GPT_4O = "openai/gpt-4o",// 고성능
    GPT_3_5_TURBO = "openai/gpt-3.5-turbo",// 경제적인 모델
    CLAUDE_3_OPUS = "anthropic/claude-3-opus-20240229",// 최고 성능 모델
    CLAUDE_3_SONNET = "anthropic/claude-3-sonnet-20240229",// 균형잡힌 성능
    CLAUDE_3_HAIKU = "anthropic/claude-3-haiku-20240307",// 빠른 응답 모델
    GEMINI_PRO = "google/gemini-pro",// Google의 최신 모델
    GEMMA_7B = "google/gemma-7b-it",// 소형 오픈소스 모델
    QWEN_72B = "qwen/qwen-72b-chat",// Alibaba의 고성능 모델
    DEEPSEEK = "deepseek/deepseek-coder",// 코딩 특화 모델
    MISTRAL_7B = "mistralai/mistral-7b-instruct",// 무료 오픈소스 모델
    LLAMA3_8B = "meta-llama/llama-3-8b-instruct"
}
/**
 * 모델 표시 이름 - UI에 표시할 사용자 친화적인 이름
 */
export declare const ModelDisplayNames: Record<ModelId, string>;
/**
 * 모델 설명 - 모델에 대한 추가 정보
 */
export declare const ModelDescriptions: Record<ModelId, string>;
/**
 * 모델 정보를 포함하는 인터페이스
 */
export interface ModelInfo {
    /** 실제 API 호출에 사용되는 모델 ID */
    id: ModelId;
    /** UI에 표시될 모델 이름 */
    displayName: string;
    /** 모델에 대한 설명 */
    description: string;
}
/**
 * ModelId를 ModelInfo 객체로 변환
 * @param modelId 모델 ID
 * @returns ModelInfo 객체
 */
export declare function getModelInfo(modelId: ModelId): ModelInfo;
/**
 * 문자열 모델 ID를 ModelId 열거형으로 안전하게 변환
 * @param modelIdString 모델 ID 문자열
 * @returns ModelId 또는 기본값 (변환 실패 시)
 */
export declare function parseModelId(modelIdString: string): ModelId;
