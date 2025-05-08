import { expect } from '@wdio/globals';
import { orchestrator } from '../framework/orchestrator';

describe('APE Extension 웹뷰 테스트', () => {
  before(async () => {
    console.log('웹뷰 테스트 시작');
  });
  
  after(async () => {
    console.log('웹뷰 테스트 완료');
  });
  
  it('채팅 기본 기능이 정상적으로 동작해야 함', async () => {
    // 채팅 기본 기능 테스트 실행
    const result = await orchestrator.runTestCycle('chat-basic-test');
    
    // 테스트 결과 검증
    expect(result.success).toBe(true);
    
    // DOM 검증 결과 확인
    for (const domResult of result.domValidationResults) {
      expect(domResult.valid).toBe(true, 
        `DOM 요소 검증 실패: ${domResult.name} (${domResult.selector}) - ${domResult.error}`);
    }
  });
  
  it('웹뷰 DOM 요소가 예상대로 존재하고 상호작용 가능해야 함', async () => {
    // 워크벤치 가져오기
    const workbench = await browser.getWorkbench();
    
    // APE 채팅 뷰 열기
    await workbench.executeCommand('ape.openChat');
    
    // 웹뷰 기다리기
    const webview = await workbench.getCustomWebview();
    await webview.waitForVisible();
    
    // 웹뷰 프레임으로 전환
    await webview.switchToFrame();
    
    // 채팅 입력 필드 검증
    const inputField = await $('#chat-input');
    await inputField.waitForExist({ timeout: 5000 });
    expect(await inputField.isExisting()).toBe(true, '채팅 입력 필드가 존재해야 함');
    expect(await inputField.isDisplayed()).toBe(true, '채팅 입력 필드가 표시되어야 함');
    expect(await inputField.isEnabled()).toBe(true, '채팅 입력 필드가 활성화되어야 함');
    
    // 전송 버튼 검증
    const sendButton = await $('#send-button');
    await sendButton.waitForExist({ timeout: 5000 });
    expect(await sendButton.isExisting()).toBe(true, '전송 버튼이 존재해야 함');
    expect(await sendButton.isDisplayed()).toBe(true, '전송 버튼이 표시되어야 함');
    expect(await sendButton.isEnabled()).toBe(true, '전송 버튼이 활성화되어야 함');
    
    // 메인 컨텍스트로 돌아가기
    await webview.switchBack();
  });
});