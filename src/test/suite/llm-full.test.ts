// @ts-nocheck - VSCode/WebdriverIO 타입 호환 문제 해결
import { expect } from '@wdio/globals';
import { describe, it, before, after } from 'mocha';
import { browser } from '@wdio/globals';
import { llmTestOrchestrator } from '../llm-webview-tests/llm-orchestrator';
import { llmDOMValidator } from '../llm-webview-tests/llm-dom-validator';

/**
 * LLM 종합 테스트 (WebDriver 통합)
 */
describe('LLM 종합 테스트', function() {
  /**
   * 테스트 시간 설정 (최대 5분)
   */
  this.timeout(300000);
  
  before(async function() {
    console.log('LLM 종합 테스트 시작');
  });
  
  after(async function() {
    console.log('LLM 종합 테스트 종료');
  });
  
  it('웹뷰 DOM에 LLM 관련 요소가 올바르게 로드되어야 함', async function() {
    // 환경 변수 확인 및 테스트 건너뛰기
    const isTestMode = process.env.LLM_TEST_MODE === 'mock';
    if (!isTestMode) {
      console.warn('LLM_TEST_MODE=mock 환경 변수가 설정되지 않아 일부 테스트가 제한됩니다.');
    }
    
    // VSCode 워크벤치 로드 확인
    const workbench = await browser.getWorkbench();
    expect(workbench).toBeDefined();
    
    // 웹뷰 DOM 검증
    const domResults = await llmDOMValidator.validateLLMWebviewDOM();
    
    // 필수 요소 검증
    const requiredElements = domResults.filter(r => r.required);
    const validRequiredElements = requiredElements.filter(r => r.valid);
    
    expect(validRequiredElements.length).toBe(requiredElements.length);
    
    // 주요 인터페이스 요소 확인
    const chatInput = domResults.find(r => r.name === 'chat-input');
    const sendButton = domResults.find(r => r.name === 'send-button');
    const chatContainer = domResults.find(r => r.name === 'chat-container');
    
    expect(chatInput).toBeDefined();
    expect(chatInput?.exists).toBe(true);
    expect(chatInput?.valid).toBe(true);
    
    expect(sendButton).toBeDefined();
    expect(sendButton?.exists).toBe(true);
    expect(sendButton?.valid).toBe(true);
    
    expect(chatContainer).toBeDefined();
    expect(chatContainer?.exists).toBe(true);
    expect(chatContainer?.valid).toBe(true);
  });
  
  it('LLM 메시지 전송 및 응답 처리가 올바르게 작동해야 함', async function() {
    // 환경 변수 확인 및 테스트 건너뛰기
    const isTestMode = process.env.LLM_TEST_MODE === 'mock';
    if (!isTestMode) {
      console.warn('LLM_TEST_MODE=mock 환경 변수가 설정되지 않아 메시지 테스트는 제한됩니다.');
      this.skip();
      return;
    }
    
    // 기본 메시지 테스트
    const testResult = await llmDOMValidator.testMessageSending('안녕하세요, 테스트입니다.');
    
    expect(testResult.success).toBe(true);
    expect(testResult.response.length).toBeGreaterThan(0);
  });
  
  it('전체 LLM 테스트 사이클이 성공적으로 완료되어야 함', async function() {
    // 환경 변수 확인 및 테스트 건너뛰기
    const isTestMode = process.env.LLM_TEST_MODE === 'mock';
    if (!isTestMode) {
      console.warn('LLM_TEST_MODE=mock 환경 변수가 설정되지 않아 전체 테스트 사이클은 건너뜁니다.');
      this.skip();
      return;
    }
    
    // 테스트 오케스트레이터 실행
    const result = await llmTestOrchestrator.runLLMTest(true);
    
    // 테스트 성공 여부 확인
    expect(result.success).toBe(true);
    expect(result.errors.length).toBe(0);
    
    // 메시지 테스트 결과 확인
    expect(result.messageResults.success).toBe(true);
    expect(result.messageResults.validMessages).toBeGreaterThan(0);
    expect(result.messageResults.failedMessages).toBe(0);
    
    // 응답 데이터 확인
    expect(result.messageResults.responses.length).toBeGreaterThan(0);
    expect(result.messageResults.responses[0].response.length).toBeGreaterThan(0);
  });
  
  it('특정 프롬프트에 대한 응답이 기대한 패턴과 일치해야 함', async function() {
    // 환경 변수 확인 및 테스트 건너뛰기
    const isTestMode = process.env.LLM_TEST_MODE === 'mock';
    if (!isTestMode) {
      console.warn('LLM_TEST_MODE=mock 환경 변수가 설정되지 않아 프롬프트 테스트는 건너뜁니다.');
      this.skip();
      return;
    }
    
    // 코드 샘플 요청 테스트
    const result = await llmTestOrchestrator.testPromptResponse(
      '코드 예제를 보여주세요.',
      '```', // 코드 블록이 포함되어 있는지 확인
      true
    );
    
    expect(result.success).toBe(true);
    expect(result.response.length).toBeGreaterThan(0);
  });
});