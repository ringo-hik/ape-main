import { expect } from '@wdio/globals';
import { orchestrator } from '../framework/orchestrator';

describe('APE Extension 기본 기능 테스트', () => {
  before(async () => {
    console.log('테스트 시작 전 설정...');
  });
  
  after(async () => {
    console.log('테스트 완료 후 정리...');
  });
  
  it('VSCode가 열리고 워크벤치에 접근할 수 있어야 함', async () => {
    // 워크벤치 가져오기
    const workbench = await browser.getWorkbench();
    
    // VSCode 타이틀 확인
    const title = await workbench.getTitleBar().getTitle();
    expect(title).toContain('Visual Studio Code');
  });
  
  it('APE 확장 프로그램이 활성화되어 있어야 함', async () => {
    const result = await orchestrator.runTestCycle('extension-activation');
    expect(result.success).toBe(true);
  });
});