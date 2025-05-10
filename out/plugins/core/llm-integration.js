"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMIntegration = void 0;
const logger_1 = require("../../core/utils/logger");
/**
 * LLM 통합을 위한 유틸리티 클래스
 * JSON Function Calling 방식으로 플러그인과 LLM을 통합합니다.
 */
class LLMIntegration {
    /**
     * 플러그인의 함수 정의를 OpenAI/Claude Function Calling 형식으로 변환합니다.
     * @param plugin 플러그인 스키마
     * @param functionId 함수 ID
     * @returns Function Calling 정의
     */
    static createFunctionDefinition(plugin, functionId) {
        try {
            const func = plugin.functions[functionId];
            if (!func) {
                throw new Error(`Function ${functionId} not found in plugin ${plugin.metadata.id}`);
            }
            // Function Calling 포맷으로 파라미터 변환
            const parameters = {
                type: 'object',
                properties: {},
                required: []
            };
            // 파라미터 변환
            for (const [paramId, param] of Object.entries(func.parameters)) {
                // 파라미터 타입 매핑
                let paramType = 'string';
                switch (param.type) {
                    case 'string':
                        paramType = 'string';
                        break;
                    case 'number':
                        paramType = 'number';
                        break;
                    case 'boolean':
                        paramType = 'boolean';
                        break;
                    case 'array':
                        paramType = 'array';
                        break;
                    case 'object':
                        paramType = 'object';
                        break;
                }
                // 파라미터 정의 생성
                const paramDef = {
                    type: paramType,
                    description: param.description
                };
                // 추가 속성 처리
                if (param.enum) {
                    paramDef.enum = param.enum;
                }
                if (param.default !== undefined) {
                    paramDef.default = param.default;
                }
                // 배열 타입 처리
                if (param.type === 'array' && param.items) {
                    paramDef.items = {
                        type: param.items.type
                    };
                    if (param.items.properties) {
                        paramDef.items.properties = param.items.properties;
                    }
                }
                // 객체 타입 처리
                if (param.type === 'object' && param.properties) {
                    paramDef.properties = param.properties;
                }
                // 파라미터 추가
                parameters.properties[paramId] = paramDef;
                // 필수 파라미터 추가
                if (param.required) {
                    parameters.required.push(paramId);
                }
            }
            // 최종 Function Calling 정의 반환
            return {
                name: functionId,
                description: func.description,
                parameters
            };
        }
        catch (error) {
            logger_1.logger.error(`Error creating function definition for ${functionId}:`, error);
            throw error;
        }
    }
    /**
     * 플러그인의 모든 함수를 OpenAI/Claude Function Calling 형식으로 변환합니다.
     * @param plugin 플러그인 스키마
     * @returns Function Calling 정의 배열
     */
    static createFunctionDefinitions(plugin) {
        const functions = [];
        for (const functionId of Object.keys(plugin.functions)) {
            try {
                const functionDef = this.createFunctionDefinition(plugin, functionId);
                functions.push(functionDef);
            }
            catch (error) {
                logger_1.logger.warn(`Skipping function ${functionId} due to error:`, error);
            }
        }
        return functions;
    }
    /**
     * LLM에 파라미터 추출을 요청하기 위한 프롬프트를 생성합니다.
     * @param plugin 플러그인 스키마
     * @param functionId 함수 ID
     * @param userInput 사용자 입력
     * @returns 프롬프트 문자열
     */
    static createParameterExtractionPrompt(plugin, functionId, userInput) {
        const func = plugin.functions[functionId];
        if (!func) {
            throw new Error(`Function ${functionId} not found in plugin ${plugin.metadata.id}`);
        }
        // 사용자 정의 프롬프트 사용 또는 기본 프롬프트 생성
        if (plugin.llmIntegration?.parameterExtractionPrompt) {
            let prompt = plugin.llmIntegration.parameterExtractionPrompt;
            // 템플릿 변수 치환
            prompt = prompt
                .replace('{function_name}', func.name)
                .replace('{function_description}', func.description)
                .replace('{user_input}', userInput);
            return prompt;
        }
        // 기본 프롬프트 구성
        let prompt = `당신은 "${plugin.metadata.name}" 플러그인을 위한 파라미터 추출 AI입니다. 
사용자의 요청에서 "${func.name}" 함수에 필요한 파라미터를 추출해야 합니다.

함수 설명: ${func.description}

파라미터 목록:
`;
        // 파라미터 설명 추가
        for (const [paramId, param] of Object.entries(func.parameters)) {
            const required = param.required ? '[필수]' : '[선택]';
            const defaultValue = param.default !== undefined ? ` (기본값: ${param.default})` : '';
            const enumValues = param.enum ? ` (가능한 값: ${param.enum.join(', ')})` : '';
            prompt += `- ${paramId}: ${param.type} ${required} - ${param.description}${defaultValue}${enumValues}\n`;
        }
        // 예제 추가
        if (plugin.llmIntegration?.examples && plugin.llmIntegration.examples.length > 0) {
            prompt += '\n예제:\n';
            plugin.llmIntegration.examples.forEach((example, index) => {
                prompt += `
예제 ${index + 1}: "${example.description}"
사용자 입력: "${example.input}"
추출된 파라미터: ${JSON.stringify(example.output, null, 2)}
`;
            });
        }
        // 사용자 입력 및 지시사항 추가
        prompt += `
사용자 입력: "${userInput}"

위 사용자 입력에서 함수 실행에 필요한 파라미터를 JSON 형식으로 추출하세요. 
불명확한 부분이 있다면 기본값을 사용하거나 가장 적합한 값을 추론하세요.
파라미터 값이 입력에 없고 기본값도 없는 경우, 사용자에게 물어볼 수 있도록 null 값을 사용하세요.

응답 형식:
{
  "파라미터1": "값1",
  "파라미터2": "값2",
  ...
}`;
        return prompt;
    }
    /**
     * LLM에 응답 포맷팅을 요청하기 위한 프롬프트를 생성합니다.
     * @param plugin 플러그인 스키마
     * @param functionId 함수 ID
     * @param apiResponse API 응답 데이터
     * @param extractedParams 추출된 파라미터
     * @returns 프롬프트 문자열
     */
    static createResponseFormattingPrompt(plugin, functionId, apiResponse, extractedParams) {
        const func = plugin.functions[functionId];
        if (!func) {
            throw new Error(`Function ${functionId} not found in plugin ${plugin.metadata.id}`);
        }
        // 사용자 정의 프롬프트 사용 또는 기본 프롬프트 생성
        if (plugin.llmIntegration?.responseFormattingPrompt) {
            let prompt = plugin.llmIntegration.responseFormattingPrompt;
            // 템플릿 변수 치환
            prompt = prompt
                .replace('{function_name}', func.name)
                .replace('{function_description}', func.description)
                .replace('{api_response}', JSON.stringify(apiResponse, null, 2))
                .replace('{parameters}', JSON.stringify(extractedParams, null, 2));
            return prompt;
        }
        // 기본 프롬프트 구성
        let prompt = `당신은 "${plugin.metadata.name}" 플러그인을 위한 응답 포맷팅 AI입니다.
"${func.name}" 함수 호출의 API 응답을 사용자에게 읽기 쉬운 형식으로 변환해야 합니다.

함수 설명: ${func.description}

사용된 파라미터:
${JSON.stringify(extractedParams, null, 2)}

API 응답:
${JSON.stringify(apiResponse, null, 2)}

템플릿:
${func.response.template}

위 템플릿을 사용하여 API 응답을 읽기 쉬운 마크다운 형식으로 변환하세요.
템플릿의 변수는 {변수명} 형식으로 표현되어 있으며, API 응답의 해당 값으로 대체하세요.
{#each data}...{/each}와 같은 반복 구문이 있다면, data 배열의 각 항목에 대해 내부 콘텐츠를 반복해서 생성하세요.
{#if 조건}...{#else}...{/if}와 같은 조건 구문이 있다면, 조건에 따라 적절한 콘텐츠를 선택하세요.

응답은 마크다운 형식으로 작성하고, 데이터를 일관된 방식으로 표현하세요.
표현할 수 없는 변수는 '정보 없음'으로 표시하고, 혼란스러운 부분은 사용자가 이해할 수 있도록 명확하게 처리하세요.`;
        return prompt;
    }
    /**
     * OpenAI Function Calling 형식의 응답에서 파라미터를 추출합니다.
     * @param response OpenAI 응답
     * @returns 추출된 파라미터
     */
    static extractParametersFromOpenAIResponse(response) {
        try {
            // OpenAI API 응답 형식 처리
            if (response.choices && response.choices.length > 0) {
                const message = response.choices[0].message;
                if (message.function_call) {
                    return JSON.parse(message.function_call.arguments);
                }
            }
            throw new Error('Invalid OpenAI function calling response format');
        }
        catch (error) {
            logger_1.logger.error('Error extracting parameters from OpenAI response:', error);
            throw error;
        }
    }
    /**
     * Claude Function Calling 형식의 응답에서 파라미터를 추출합니다.
     * @param response Claude 응답
     * @returns 추출된 파라미터
     */
    static extractParametersFromClaudeResponse(response) {
        try {
            // Claude API 응답 형식 처리
            if (response.content && Array.isArray(response.content)) {
                for (const content of response.content) {
                    if (content.type === 'tool_use' && content.name) {
                        return content.input || {};
                    }
                }
            }
            throw new Error('Invalid Claude function calling response format');
        }
        catch (error) {
            logger_1.logger.error('Error extracting parameters from Claude response:', error);
            throw error;
        }
    }
    /**
     * 일반 텍스트 응답에서 JSON 형식의 파라미터를 추출합니다.
     * @param response 텍스트 응답
     * @returns 추출된 파라미터
     */
    static extractParametersFromTextResponse(response) {
        try {
            // JSON 블록 추출을 위한 정규식
            const jsonRegex = /```(?:json)?\s*([\s\S]*?)\s*```|({[\s\S]*})/;
            const match = response.match(jsonRegex);
            if (match && (match[1] || match[2])) {
                const jsonStr = match[1] || match[2];
                return JSON.parse(jsonStr);
            }
            // 정규식으로 매치되지 않으면 전체 응답을 JSON으로 파싱 시도
            return JSON.parse(response);
        }
        catch (error) {
            logger_1.logger.error('Error extracting parameters from text response:', error);
            throw new Error('Failed to extract JSON parameters from response');
        }
    }
}
exports.LLMIntegration = LLMIntegration;
//# sourceMappingURL=llm-integration.js.map