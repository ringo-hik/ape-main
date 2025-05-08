// @ts-nocheck - VSCode/WebdriverIO 타입 호환 문제 해결
import { WebviewDOMValidationResult } from '../framework/webview-dom-validator';
import { browser } from '@wdio/globals';

/**
 * LLM 웹뷰 DOM 요소 검증 결과 인터페이스 확장
 */
export interface LLMWebviewDOMValidationResult extends WebviewDOMValidationResult {
  interactive: boolean;
  hasResponseContent: boolean;
}

/**
 * LLM 관련 웹뷰 DOM 검증기
 * LLM 대화 기능과 관련된 웹뷰 DOM 요소를 검증하는 컴포넌트
 */
export class LLMDOMValidator {
  // LLM 관련 검증할 웹뷰 요소 정의
  private readonly llmValidationRules = [
    {
      name: 'chat-input',
      selector: '#chat-input',
      required: true,
      properties: {
        visible: true,
        enabled: true,
        interactive: true
      }
    },
    {
      name: 'send-button',
      selector: '#send-button',
      required: true,
      properties: {
        visible: true,
        enabled: true,
        text: '전송',
        interactive: true
      }
    },
    {
      name: 'chat-container',
      selector: '.chat-container',
      required: true,
      properties: {
        visible: true
      }
    },
    {
      name: 'message-container',
      selector: '.message-container',
      required: true,
      properties: {
        visible: true
      }
    },
    {
      name: 'assistant-message',
      selector: '.message.assistant',
      required: false,
      properties: {
        visible: true,
        hasResponseContent: true
      }
    },
    {
      name: 'user-message',
      selector: '.message.user',
      required: false,
      properties: {
        visible: true
      }
    },
    {
      name: 'thinking-indicator',
      selector: '.thinking-indicator',
      required: false,
      properties: {
        visible: false
      }
    },
    {
      name: 'error-message',
      selector: '.error-message',
      required: false,
      properties: {
        visible: false
      }
    }
  ];
  
  /**
   * LLM 웹뷰 DOM 요소 검증
   * @returns 검증 결과 배열
   */
  public async validateLLMWebviewDOM(): Promise<LLMWebviewDOMValidationResult[]> {
    const results: LLMWebviewDOMValidationResult[] = [];
    
    try {
      // 웹뷰 존재 확인
      const webviewExists = await this.checkWebviewExists();
      if (!webviewExists) {
        return [{
          name: 'webview',
          selector: 'webview',
          required: true,
          exists: false,
          visible: false,
          enabled: false,
          text: '',
          valid: false,
          error: '웹뷰를 찾을 수 없습니다.',
          interactive: false,
          hasResponseContent: false
        }];
      }
      
      // 워크벤치 가져오기
      const workbench = await browser.getWorkbench();
      
      // 웹뷰 가져오기
      const webview = await workbench.getCustomWebview();
      await webview.waitForVisible({ timeout: 5000 }).catch(() => {
        throw new Error('웹뷰가 표시되지 않습니다.');
      });
      
      // 웹뷰 프레임으로 전환
      await webview.switchToFrame();
      
      // 각 검증 규칙 적용
      for (const rule of this.llmValidationRules) {
        const result = await this.validateLLMElement(rule);
        results.push(result);
      }
      
      // 메인 컨텍스트로 다시 전환
      await webview.switchBack();
    } catch (error) {
      console.error(`[LLMDOMValidator] 웹뷰 DOM 검증 오류: ${error.message}`);
      results.push({
        name: 'validation-error',
        selector: '',
        required: true,
        exists: false,
        visible: false,
        enabled: false,
        text: '',
        valid: false,
        error: `웹뷰 DOM 검증 중 오류 발생: ${error.message}`,
        interactive: false,
        hasResponseContent: false
      });
    }
    
    return results;
  }
  
  /**
   * 메시지 전송 테스트
   * @param message 전송할 메시지
   * @returns 전송 성공 여부와 응답 메시지
   */
  public async testMessageSending(message: string): Promise<{success: boolean, response: string, error?: string}> {
    try {
      // 워크벤치 가져오기
      const workbench = await browser.getWorkbench();
      
      // 웹뷰 가져오기
      const webview = await workbench.getCustomWebview();
      await webview.waitForVisible({ timeout: 5000 });
      
      // 웹뷰 프레임으로 전환
      await webview.switchToFrame();
      
      // 입력 필드 가져오기
      const chatInput = await $('#chat-input');
      await chatInput.waitForExist({ timeout: 3000 });
      
      // 메시지 입력
      await chatInput.setValue(message);
      
      // 전송 버튼 클릭
      const sendButton = await $('#send-button');
      await sendButton.click();
      
      // 사용자 메시지 표시 확인
      const userMessage = await $('.message.user:last-child');
      await userMessage.waitForExist({ timeout: 5000 });
      
      // thinking 인디케이터 표시 확인
      const thinkingIndicator = await $('.thinking-indicator');
      if (await thinkingIndicator.isExisting()) {
        await browser.waitUntil(
          async () => !(await thinkingIndicator.isDisplayed()),
          { timeout: 30000, timeoutMsg: '응답 대기 시간 초과' }
        );
      }
      
      // assistant 메시지 표시 확인
      const assistantMessage = await $('.message.assistant:last-child');
      await assistantMessage.waitForExist({ timeout: 5000 });
      
      // 응답 내용 가져오기
      const responseText = await assistantMessage.getText();
      
      // 메인 컨텍스트로 다시 전환
      await webview.switchBack();
      
      return {
        success: true,
        response: responseText
      };
    } catch (error) {
      // 오류 발생 시 웹뷰 컨텍스트에서 복구 시도
      try {
        const workbench = await browser.getWorkbench();
        const webview = await workbench.getCustomWebview();
        await webview.switchBack();
      } catch {}
      
      return {
        success: false,
        response: '',
        error: `메시지 전송 테스트 중 오류 발생: ${error.message}`
      };
    }
  }
  
  /**
   * 웹뷰 존재 여부 확인
   * @returns 웹뷰 존재 여부
   */
  private async checkWebviewExists(): Promise<boolean> {
    try {
      const workbench = await browser.getWorkbench();
      const webview = await workbench.getCustomWebview();
      return !!webview;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * 단일 LLM 요소 검증
   * @param rule 검증 규칙
   * @returns 검증 결과
   */
  private async validateLLMElement(rule: any): Promise<LLMWebviewDOMValidationResult> {
    const result: LLMWebviewDOMValidationResult = {
      name: rule.name,
      selector: rule.selector,
      required: rule.required,
      exists: false,
      visible: false,
      enabled: false,
      text: '',
      valid: false,
      error: null,
      interactive: false,
      hasResponseContent: false
    };
    
    try {
      // 요소 존재 여부 확인
      const element = await $(rule.selector);
      result.exists = await element.isExisting();
      
      if (result.exists) {
        // 기본 요소 속성 확인
        result.visible = await element.isDisplayed();
        result.enabled = await element.isEnabled();
        result.text = await element.getText();
        
        // LLM 특화 속성 확인
        result.interactive = await this.checkInteractive(element, rule.name);
        result.hasResponseContent = await this.checkResponseContent(element, rule.name);
        
        // 검증 규칙 적용
        result.valid = true;
        
        // 가시성 검증
        if (rule.properties.visible !== undefined && 
            rule.properties.visible !== result.visible) {
          result.valid = false;
          result.error = `요소가 ${rule.properties.visible ? '표시되어야' : '표시되지 않아야'} 합니다.`;
        }
        
        // 활성화 상태 검증
        if (rule.properties.enabled !== undefined && 
            rule.properties.enabled !== result.enabled) {
          result.valid = false;
          result.error = `요소가 ${rule.properties.enabled ? '활성화되어야' : '비활성화되어야'} 합니다.`;
        }
        
        // 텍스트 검증
        if (rule.properties.text !== undefined && 
            rule.properties.text !== result.text) {
          result.valid = false;
          result.error = `요소의 텍스트가 '${rule.properties.text}'이어야 하지만, '${result.text}'입니다.`;
        }
        
        // 인터랙티브 검증
        if (rule.properties.interactive !== undefined &&
            rule.properties.interactive !== result.interactive) {
          result.valid = false;
          result.error = `요소가 ${rule.properties.interactive ? '인터랙티브해야' : '인터랙티브하지 않아야'} 합니다.`;
        }
        
        // 응답 내용 검증
        if (rule.properties.hasResponseContent !== undefined &&
            rule.properties.hasResponseContent !== result.hasResponseContent) {
          result.valid = false;
          result.error = `요소가 ${rule.properties.hasResponseContent ? '응답 내용을 포함해야' : '응답 내용을 포함하지 않아야'} 합니다.`;
        }
      } else if (rule.required) {
        // 필수 요소가 존재하지 않는 경우
        result.valid = false;
        result.error = `필수 요소가 존재하지 않습니다: ${rule.selector}`;
      } else {
        // 필수가 아닌 요소가 존재하지 않는 경우 (유효함)
        result.valid = true;
      }
    } catch (error) {
      // 요소 검증 중 오류 발생
      result.valid = false;
      result.error = `요소 검증 중 오류 발생: ${error.message}`;
    }
    
    return result;
  }
  
  /**
   * 요소의 인터랙티브 여부 확인
   * @param element 웹드라이버 요소
   * @param name 요소 이름
   * @returns 인터랙티브 여부
   */
  private async checkInteractive(element: any, name: string): Promise<boolean> {
    try {
      // 요소 유형에 따른 인터랙티브 검사
      switch (name) {
        case 'chat-input':
          // 입력 필드에 텍스트 입력이 가능한지 확인
          await element.setValue('test');
          const inputValue = await element.getValue();
          await element.setValue(''); // 원래 상태로 복원
          return inputValue === 'test';
          
        case 'send-button':
          // 버튼이 클릭 가능한지 확인 (실제로 클릭하지는 않음)
          return await element.isClickable();
          
        default:
          // 기본적으로 인터랙티브하지 않음
          return false;
      }
    } catch (error) {
      console.error(`인터랙티브 체크 중 오류: ${error.message}`);
      return false;
    }
  }
  
  /**
   * 응답 요소에 내용이 있는지 확인
   * @param element 웹드라이버 요소
   * @param name 요소 이름
   * @returns 응답 내용 포함 여부
   */
  private async checkResponseContent(element: any, name: string): Promise<boolean> {
    try {
      // assistant 메시지인 경우에만 확인
      if (name === 'assistant-message') {
        const text = await element.getText();
        return text.trim().length > 0;
      }
      
      // 다른 요소는 해당 없음
      return false;
    } catch (error) {
      console.error(`응답 내용 체크 중 오류: ${error.message}`);
      return false;
    }
  }
}

// LLM DOM 검증기 싱글톤 인스턴스
export const llmDOMValidator = new LLMDOMValidator();