import * as fs from 'fs';
import * as path from 'path';
import { browser } from '@wdio/globals';

/**
 * 시나리오 실행기
 * WebdriverIO를 사용하여 테스트 시나리오를 실행
 */
export class ScenarioRunner {
  private readonly SCENARIO_DIR = path.join(process.cwd(), 'src/test/scenarios');
  
  constructor() {
    // 시나리오 디렉토리 확인 및 생성
    if (!fs.existsSync(this.SCENARIO_DIR)) {
      fs.mkdirSync(this.SCENARIO_DIR, { recursive: true });
    }
  }
  
  /**
   * 시나리오 실행
   * @param scenarioName 실행할 시나리오 이름
   * @returns 실행 성공 여부
   */
  public async executeScenario(scenarioName: string): Promise<boolean> {
    try {
      console.log(`[ScenarioRunner] 시나리오 실행: ${scenarioName}`);
      
      // 시나리오 파일 경로
      const scenarioPath = path.join(this.SCENARIO_DIR, `${scenarioName}.json`);
      
      // 시나리오 파일 존재 확인
      if (!fs.existsSync(scenarioPath)) {
        throw new Error(`시나리오 파일을 찾을 수 없음: ${scenarioName}`);
      }
      
      // 시나리오 파일 로드
      const scenarioData = JSON.parse(fs.readFileSync(scenarioPath, 'utf8'));
      
      // VSCode 워크벤치 가져오기
      const workbench = await browser.getWorkbench();
      
      // 명령 시퀀스 실행
      for (const command of scenarioData.commands) {
        await this.executeCommand(command, workbench);
      }
      
      console.log(`[ScenarioRunner] 시나리오 실행 완료: ${scenarioName}`);
      return true;
    } catch (error) {
      console.error(`[ScenarioRunner] 시나리오 실행 오류: ${error.message}`);
      return false;
    }
  }
  
  /**
   * 단일 명령 실행
   * @param command 실행할 명령 객체
   * @param workbench VSCode 워크벤치 객체
   */
  private async executeCommand(command: any, workbench: any): Promise<void> {
    // 명령 실행 로깅
    console.log(`[ScenarioRunner] 명령 실행: ${command.type} - ${command.description || ''}`);
    
    // 명령 실행 지연 (안정성 확보)
    await new Promise(resolve => setTimeout(resolve, 500));
    
    switch (command.type) {
      case 'execute':
        // VSCode 명령 실행
        await workbench.executeCommand(command.command, ...(command.args || []));
        break;
        
      case 'click':
        // 웹뷰 요소 클릭
        if (command.webview) {
          await this.executeWebviewCommand(async (webview: any) => {
            const element = await $(command.selector);
            await element.waitForClickable({ timeout: command.timeout || 5000 });
            await element.click();
          });
        } else {
          const element = await $(command.selector);
          await element.waitForClickable({ timeout: command.timeout || 5000 });
          await element.click();
        }
        break;
        
      case 'input':
        // 텍스트 입력
        if (command.webview) {
          await this.executeWebviewCommand(async () => {
            const element = await $(command.selector);
            await element.waitForEnabled({ timeout: command.timeout || 5000 });
            await element.setValue(command.text);
          });
        } else {
          const element = await $(command.selector);
          await element.waitForEnabled({ timeout: command.timeout || 5000 });
          await element.setValue(command.text);
        }
        break;
        
      case 'wait':
        // 지정된 시간 대기
        await new Promise(resolve => setTimeout(resolve, command.milliseconds));
        break;
        
      case 'waitForElement':
        // 요소가 나타날 때까지 대기
        if (command.webview) {
          await this.executeWebviewCommand(async () => {
            await $(command.selector).waitForExist({ 
              timeout: command.timeout || 5000 
            });
          });
        } else {
          await $(command.selector).waitForExist({ 
            timeout: command.timeout || 5000 
          });
        }
        break;
    }
  }
  
  /**
   * 웹뷰 내에서 명령 실행
   * @param callback 웹뷰 내에서 실행할 콜백 함수
   */
  private async executeWebviewCommand(callback: (webview: any) => Promise<void>): Promise<void> {
    try {
      // 웹뷰 가져오기
      const webview = await browser.getWorkbench().getCustomWebview();
      await webview.waitForVisible({ timeout: 5000 });
      
      // 웹뷰 프레임으로 전환
      await webview.switchToFrame();
      
      // 콜백 실행
      await callback(webview);
      
      // 메인 컨텍스트로 돌아가기
      await webview.switchBack();
    } catch (error) {
      console.error(`[ScenarioRunner] 웹뷰 명령 실행 오류: ${error.message}`);
      throw error;
    }
  }
}

// 시나리오 실행기 싱글톤 인스턴스
export const scenarioRunner = new ScenarioRunner();