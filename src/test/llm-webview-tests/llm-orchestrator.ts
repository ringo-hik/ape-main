// @ts-nocheck - VSCode/WebdriverIO 타입 호환 문제 해결
import { browser } from '@wdio/globals';
import { llmDOMValidator, LLMWebviewDOMValidationResult } from './llm-dom-validator';
import { llmMessageTest, LLMMessageTestResult } from './llm-message-test';
import { LLMServiceMock } from '../mocks/llm-service-mock';

/**
 * LLM 테스트 결과 인터페이스
 */
export interface LLMTestResult {
  success: boolean;
  domResults: LLMWebviewDOMValidationResult[];
  messageResults: LLMMessageTestResult;
  errors: string[];
}

/**
 * LLM 테스트 오케스트레이터
 * LLM 관련 테스트 흐름을 조정하는 컴포넌트
 */
export class LLMTestOrchestrator {
  /**
   * LLM 테스트 실행
   * @param mockMode 모킹 모드 사용 여부
   * @returns 테스트 결과
   */
  public async runLLMTest(mockMode: boolean = true): Promise<LLMTestResult> {
    const errors: string[] = [];
    
    try {
      console.log(`[LLMTestOrchestrator] LLM 테스트 시작 (mockMode=${mockMode})`);
      
      // 1. 환경 설정
      if (mockMode) {
        process.env.LLM_TEST_MODE = 'mock';
        console.log('[LLMTestOrchestrator] Mock 모드 활성화');
      }
      
      // 2. WebdriverIO 브라우저 초기화 확인
      if (!browser) {
        throw new Error('WebdriverIO 브라우저가 초기화되지 않았습니다.');
      }
      
      // 3. DOM 검증
      console.log('[LLMTestOrchestrator] LLM 웹뷰 DOM 검증 중...');
      const domResults = await llmDOMValidator.validateLLMWebviewDOM();
      
      // 필수 요소 검증
      const missingRequiredElements = domResults
        .filter(r => r.required && (!r.exists || !r.valid))
        .map(r => r.name);
      
      if (missingRequiredElements.length > 0) {
        errors.push(`필수 UI 요소가 누락되었습니다: ${missingRequiredElements.join(', ')}`);
      }
      
      // 4. 메시지 테스트
      console.log('[LLMTestOrchestrator] LLM 메시지 테스트 중...');
      const messageResults = await llmMessageTest.runMessageTests();
      
      if (!messageResults.success) {
        errors.push(...messageResults.errors.map(e => `메시지 오류 (${e.message}): ${e.error}`));
      }
      
      // 5. 결과 통합
      const success = errors.length === 0;
      
      console.log(`[LLMTestOrchestrator] LLM 테스트 완료. 결과: ${success ? '성공' : '실패'}`);
      if (!success) {
        console.log(`[LLMTestOrchestrator] 오류 요약: ${errors.join('; ')}`);
      }
      
      return {
        success,
        domResults,
        messageResults,
        errors
      };
    } catch (error) {
      console.error(`[LLMTestOrchestrator] 테스트 실행 오류: ${error.message}`);
      
      return {
        success: false,
        domResults: [],
        messageResults: {
          success: false,
          validMessages: 0,
          failedMessages: 0,
          errors: [],
          responses: []
        },
        errors: [error.message]
      };
    } finally {
      // 환경 변수 초기화
      if (mockMode) {
        delete process.env.LLM_TEST_MODE;
      }
    }
  }
  
  /**
   * 특정 프롬프트 응답 테스트
   * @param prompt 테스트할 프롬프트
   * @param expectedPattern 기대하는 응답 패턴 (정규식 문자열)
   * @param mockMode 모킹 모드 사용 여부
   * @returns 테스트 결과
   */
  public async testPromptResponse(
    prompt: string,
    expectedPattern: string,
    mockMode: boolean = true
  ): Promise<{success: boolean, response: string, error?: string}> {
    try {
      console.log(`[LLMTestOrchestrator] 프롬프트 응답 테스트: "${prompt.substring(0, 30)}..."`);
      
      // 환경 설정
      if (mockMode) {
        process.env.LLM_TEST_MODE = 'mock';
      }
      
      // 응답 패턴 정규식 생성
      const pattern = new RegExp(expectedPattern);
      
      // 테스트 실행
      const result = await llmMessageTest.testSpecificResponse(prompt, pattern);
      
      console.log(`[LLMTestOrchestrator] 프롬프트 테스트 결과: ${result.success ? '성공' : '실패'}`);
      return result;
    } catch (error) {
      return {
        success: false,
        response: '',
        error: `프롬프트 테스트 중 오류 발생: ${error.message}`
      };
    } finally {
      // 환경 변수 초기화
      if (mockMode) {
        delete process.env.LLM_TEST_MODE;
      }
    }
  }
}

// LLM 테스트 오케스트레이터 싱글톤 인스턴스
export const llmTestOrchestrator = new LLMTestOrchestrator();