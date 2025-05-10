"use strict";
/**
 * 모델 정보 관리를 위한 타입 정의
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelDescriptions = exports.ModelDisplayNames = exports.ModelId = void 0;
exports.getModelInfo = getModelInfo;
exports.parseModelId = parseModelId;
/**
 * 실제 모델 식별자 - LLM API 호출 시 사용
 * 실제 API 호출에 사용되는 모델 식별자 문자열
 */
var ModelId;
(function (ModelId) {
    // OpenAI models (최신 모델들)
    ModelId["GPT_4_1_MINI"] = "openai/gpt-4.1-mini";
    ModelId["GPT_4_1_PREVIEW"] = "openai/gpt-4.1-preview";
    ModelId["GPT_4O"] = "openai/gpt-4o";
    ModelId["GPT_3_5_TURBO"] = "openai/gpt-3.5-turbo";
    // Anthropic models (Claude 모델들)
    ModelId["CLAUDE_3_OPUS"] = "anthropic/claude-3-opus-20240229";
    ModelId["CLAUDE_3_SONNET"] = "anthropic/claude-3-sonnet-20240229";
    ModelId["CLAUDE_3_HAIKU"] = "anthropic/claude-3-haiku-20240307";
    // 추가 모델들
    ModelId["GEMINI_PRO"] = "google/gemini-pro";
    ModelId["GEMMA_7B"] = "google/gemma-7b-it";
    ModelId["QWEN_72B"] = "qwen/qwen-72b-chat";
    ModelId["DEEPSEEK"] = "deepseek/deepseek-coder";
    // 무료 모델들
    ModelId["MISTRAL_7B"] = "mistralai/mistral-7b-instruct";
    ModelId["LLAMA3_8B"] = "meta-llama/llama-3-8b-instruct"; // 무료 오픈소스 모델
})(ModelId || (exports.ModelId = ModelId = {}));
/**
 * 모델 표시 이름 - UI에 표시할 사용자 친화적인 이름
 */
exports.ModelDisplayNames = {
    // OpenAI 모델들
    [ModelId.GPT_4_1_MINI]: 'GPT-4.1 Mini',
    [ModelId.GPT_4_1_PREVIEW]: 'GPT-4.1 Preview',
    [ModelId.GPT_4O]: 'GPT-4o',
    [ModelId.GPT_3_5_TURBO]: 'GPT-3.5 Turbo',
    // Anthropic 모델들
    [ModelId.CLAUDE_3_OPUS]: 'Claude 3 Opus',
    [ModelId.CLAUDE_3_SONNET]: 'Claude 3 Sonnet',
    [ModelId.CLAUDE_3_HAIKU]: 'Claude 3 Haiku',
    // 추가 모델들
    [ModelId.GEMINI_PRO]: 'Gemini Pro',
    [ModelId.GEMMA_7B]: 'Gemma 7B',
    [ModelId.QWEN_72B]: 'Qwen 72B',
    [ModelId.DEEPSEEK]: 'DeepSeek Coder',
    // 무료 모델들
    [ModelId.MISTRAL_7B]: 'Mistral 7B',
    [ModelId.LLAMA3_8B]: 'Llama 3 8B'
};
/**
 * 모델 설명 - 모델에 대한 추가 정보
 */
exports.ModelDescriptions = {
    // OpenAI 모델들
    [ModelId.GPT_4_1_MINI]: '균형 잡힌 성능과 속도 (기본 모델)',
    [ModelId.GPT_4_1_PREVIEW]: '최신 고성능 모델',
    [ModelId.GPT_4O]: '최고 성능의 다목적 모델',
    [ModelId.GPT_3_5_TURBO]: '빠른 속도와 경제적인 비용',
    // Anthropic 모델들
    [ModelId.CLAUDE_3_OPUS]: '최고 수준의 추론 및 복잡한 작업 처리',
    [ModelId.CLAUDE_3_SONNET]: '높은 품질과 효율적인 성능의 균형',
    [ModelId.CLAUDE_3_HAIKU]: '빠른 응답이 필요한 작업에 최적화',
    // 추가 모델들
    [ModelId.GEMINI_PRO]: 'Google의 고급 멀티모달 모델',
    [ModelId.GEMMA_7B]: '경량 오픈소스 모델, 낮은 지연 시간',
    [ModelId.QWEN_72B]: 'Alibaba의 대형 고성능 모델',
    [ModelId.DEEPSEEK]: '코드 생성에 특화된 모델',
    // 무료 모델들
    [ModelId.MISTRAL_7B]: '경량 오픈소스 모델, 합리적인 성능',
    [ModelId.LLAMA3_8B]: 'Meta의 소형 오픈소스 모델'
};
/**
 * ModelId를 ModelInfo 객체로 변환
 * @param modelId 모델 ID
 * @returns ModelInfo 객체
 */
function getModelInfo(modelId) {
    return {
        id: modelId,
        displayName: exports.ModelDisplayNames[modelId],
        description: exports.ModelDescriptions[modelId]
    };
}
/**
 * 문자열 모델 ID를 ModelId 열거형으로 안전하게 변환
 * @param modelIdString 모델 ID 문자열
 * @returns ModelId 또는 기본값 (변환 실패 시)
 */
function parseModelId(modelIdString) {
    if (Object.values(ModelId).includes(modelIdString)) {
        return modelIdString;
    }
    // 기본 모델 반환
    console.warn(`Invalid model ID: ${modelIdString}, using default model`);
    return ModelId.GPT_4_1_MINI;
}
//# sourceMappingURL=models.js.map