import { JSONPluginSchema } from '../types/json-plugin-schema';
/**
 * LLM 통합을 위한 유틸리티 클래스
 * JSON Function Calling 방식으로 플러그인과 LLM을 통합합니다.
 */
export declare class LLMIntegration {
    /**
     * 플러그인의 함수 정의를 OpenAI/Claude Function Calling 형식으로 변환합니다.
     * @param plugin 플러그인 스키마
     * @param functionId 함수 ID
     * @returns Function Calling 정의
     */
    static createFunctionDefinition(plugin: JSONPluginSchema, functionId: string): any;
    /**
     * 플러그인의 모든 함수를 OpenAI/Claude Function Calling 형식으로 변환합니다.
     * @param plugin 플러그인 스키마
     * @returns Function Calling 정의 배열
     */
    static createFunctionDefinitions(plugin: JSONPluginSchema): any[];
    /**
     * LLM에 파라미터 추출을 요청하기 위한 프롬프트를 생성합니다.
     * @param plugin 플러그인 스키마
     * @param functionId 함수 ID
     * @param userInput 사용자 입력
     * @returns 프롬프트 문자열
     */
    static createParameterExtractionPrompt(plugin: JSONPluginSchema, functionId: string, userInput: string): string;
    /**
     * LLM에 응답 포맷팅을 요청하기 위한 프롬프트를 생성합니다.
     * @param plugin 플러그인 스키마
     * @param functionId 함수 ID
     * @param apiResponse API 응답 데이터
     * @param extractedParams 추출된 파라미터
     * @returns 프롬프트 문자열
     */
    static createResponseFormattingPrompt(plugin: JSONPluginSchema, functionId: string, apiResponse: any, extractedParams: Record<string, any>): string;
    /**
     * OpenAI Function Calling 형식의 응답에서 파라미터를 추출합니다.
     * @param response OpenAI 응답
     * @returns 추출된 파라미터
     */
    static extractParametersFromOpenAIResponse(response: any): Record<string, any>;
    /**
     * Claude Function Calling 형식의 응답에서 파라미터를 추출합니다.
     * @param response Claude 응답
     * @returns 추출된 파라미터
     */
    static extractParametersFromClaudeResponse(response: any): Record<string, any>;
    /**
     * 일반 텍스트 응답에서 JSON 형식의 파라미터를 추출합니다.
     * @param response 텍스트 응답
     * @returns 추출된 파라미터
     */
    static extractParametersFromTextResponse(response: string): Record<string, any>;
}
