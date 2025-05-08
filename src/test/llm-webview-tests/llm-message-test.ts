// @ts-nocheck - VSCode/WebdriverIO 타입 호환 문제 해결
import { expect } from '@wdio/globals';
import { browser } from '@wdio/globals';
import { llmDOMValidator } from './llm-dom-validator';

/**
 * LLM 메시지 테스트 결과 인터페이스
 */
export interface LLMMessageTestResult {
  success: boolean;
  validMessages: number;
  failedMessages: number;
  errors: Array<{message: string, error: string}>;
  responses: Array<{message: string, response: string}>;
}

/**
 * LLM 메시지 테스트 클래스
 * LLM과의 대화 기능을 테스트하는 컴포넌트
 */
export class LLMMessageTest {
  // 테스트 메시지 목록
  private readonly testMessages = [
    '안녕하세요, 테스트 메시지입니다.',
    '이것은 LLM 기능 테스트를 위한 메시지입니다.',
    '코드 샘플을 보여주세요.',
    '오류가 발생했습니다.'
  ];
  
  /**
   * LLM 메시지 기능 테스트 실행
   * @returns 테스트 결과
   */
  public async runMessageTests(): Promise<LLMMessageTestResult> {
    const result: LLMMessageTestResult = {
      success: false,
      validMessages: 0,
      failedMessages: 0,
      errors: [],
      responses: []
    };
    
    try {
      console.log('[LLMMessageTest] LLM 메시지 테스트 시작');
      
      // DOM 검증 (UI 상태 확인)
      const domResults = await llmDOMValidator.validateLLMWebviewDOM();
      const domValid = domResults.every(result => result.valid || !result.required);
      
      if (!domValid) {
        const errors = domResults.filter(r => !r.valid).map(r => r.error || '알 수 없는 오류');
        throw new Error(`LLM UI 검증 실패: ${errors.join(', ')}`);
      }
      
      // 메시지 전송 테스트
      for (const message of this.testMessages) {
        console.log(`[LLMMessageTest] 메시지 테스트: "${message}"`);
        
        // 메시지 전송 및 응답 확인
        const sendResult = await llmDOMValidator.testMessageSending(message);
        
        if (sendResult.success) {
          result.validMessages++;
          result.responses.push({
            message,
            response: sendResult.response
          });
          
          // 검증: 응답이 있어야 함
          if (!sendResult.response || sendResult.response.trim().length === 0) {
            result.failedMessages++;
            result.errors.push({
              message,
              error: '응답이 비어있습니다.'
            });
          }
        } else {
          result.failedMessages++;
          result.errors.push({
            message,
            error: sendResult.error || '알 수 없는 오류'
          });
        }
        
        // 메시지 간 지연
        await browser.pause(1000);
      }
      
      // 최종 결과
      result.success = result.failedMessages === 0;
      
      console.log(`[LLMMessageTest] 테스트 완료: 성공=${result.validMessages}, 실패=${result.failedMessages}`);
      return result;
    } catch (error) {
      console.error(`[LLMMessageTest] 테스트 실행 오류: ${error.message}`);
      
      result.success = false;
      result.errors.push({
        message: '테스트 실행',
        error: error.message
      });
      
      return result;
    }
  }
  
  /**
   * 특정 메시지에 대한 응답 내용 테스트
   * @param message 전송할 메시지
   * @param expectedPattern 기대하는 응답 패턴 (정규식)
   * @returns 테스트 결과
   */
  public async testSpecificResponse(message: string, expectedPattern: RegExp): Promise<{success: boolean, response: string, error?: string}> {
    try {
      console.log(`[LLMMessageTest] 특정 응답 테스트: "${message}"`);
      
      // 메시지 전송 및 응답 확인
      const sendResult = await llmDOMValidator.testMessageSending(message);
      
      if (!sendResult.success) {
        return sendResult;
      }
      
      // 응답 패턴 확인
      const patternMatched = expectedPattern.test(sendResult.response);
      
      return {
        success: patternMatched,
        response: sendResult.response,
        error: patternMatched ? undefined : `응답이 예상 패턴과 일치하지 않습니다. 예상: ${expectedPattern}, 실제: ${sendResult.response}`
      };
    } catch (error) {
      return {
        success: false,
        response: '',
        error: `특정 응답 테스트 중 오류 발생: ${error.message}`
      };
    }
  }
}

// LLM 메시지 테스트 싱글톤 인스턴스
export const llmMessageTest = new LLMMessageTest();