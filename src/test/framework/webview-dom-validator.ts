import { browser } from '@wdio/globals';

/**
 * 웹뷰 DOM 요소 검증 결과 인터페이스
 */
export interface WebviewDOMValidationResult {
  name: string;
  selector: string;
  required: boolean;
  exists: boolean;
  visible: boolean;
  enabled: boolean;
  text: string;
  valid: boolean;
  error: string | null;
}

/**
 * 웹뷰 DOM 검증기
 * 웹뷰 내 DOM 요소를 검증하는 컴포넌트
 */
export class WebviewDOMValidator {
  // 검증할 웹뷰 요소 정의
  private readonly validationRules = [
    {
      name: 'chat-input',
      selector: '#chat-input',
      required: true,
      properties: {
        visible: true,
        enabled: true
      }
    },
    {
      name: 'send-button',
      selector: '#send-button',
      required: true,
      properties: {
        visible: true,
        enabled: true,
        text: '전송'
      }
    },
    {
      name: 'chat-container',
      selector: '.chat-container',
      required: true,
      properties: {
        visible: true
      }
    }
  ];
  
  /**
   * 웹뷰 DOM 요소 검증
   * @returns 검증 결과 배열
   */
  public async validateWebviewDOM(): Promise<WebviewDOMValidationResult[]> {
    const results: WebviewDOMValidationResult[] = [];
    
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
          error: '웹뷰를 찾을 수 없습니다.'
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
      for (const rule of this.validationRules) {
        const result = await this.validateElement(rule);
        results.push(result);
      }
      
      // 메인 컨텍스트로 다시 전환
      await webview.switchBack();
    } catch (error) {
      console.error(`[WebviewDOMValidator] 웹뷰 DOM 검증 오류: ${error.message}`);
      results.push({
        name: 'validation-error',
        selector: '',
        required: true,
        exists: false,
        visible: false,
        enabled: false,
        text: '',
        valid: false,
        error: `웹뷰 DOM 검증 중 오류 발생: ${error.message}`
      });
    }
    
    return results;
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
   * 단일 요소 검증
   * @param rule 검증 규칙
   * @returns 검증 결과
   */
  private async validateElement(rule: any): Promise<WebviewDOMValidationResult> {
    const result: WebviewDOMValidationResult = {
      name: rule.name,
      selector: rule.selector,
      required: rule.required,
      exists: false,
      visible: false,
      enabled: false,
      text: '',
      valid: false,
      error: null
    };
    
    try {
      // 요소 존재 여부 확인
      const element = await $(rule.selector);
      result.exists = await element.isExisting();
      
      if (result.exists) {
        // 요소 속성 확인
        result.visible = await element.isDisplayed();
        result.enabled = await element.isEnabled();
        result.text = await element.getText();
        
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
      } else if (rule.required) {
        // 필수 요소가 존재하지 않는 경우
        result.valid = false;
        result.error = `필수 요소가 존재하지 않습니다: ${rule.selector}`;
      }
    } catch (error) {
      // 요소 검증 중 오류 발생
      result.valid = false;
      result.error = `요소 검증 중 오류 발생: ${error.message}`;
    }
    
    return result;
  }
}

// 웹뷰 DOM 검증기 싱글톤 인스턴스
export const webviewDOMValidator = new WebviewDOMValidator();