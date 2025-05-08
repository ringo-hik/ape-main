import * as vscode from 'vscode';
import { browser } from '@wdio/globals';
import { scenarioRunner } from './scenario-runner';
import { webviewDOMValidator, WebviewDOMValidationResult } from './webview-dom-validator';
import { logCollector, LogEntry } from './log-collector';
import { logAnalyzer, LogAnalysisResult } from './log-analyzer';
import { codeAnalyzer, ErrorAnalysisResult, CodeFix } from './code-analyzer';

/**
 * 테스트 결과 인터페이스
 */
export interface TestResult {
  success: boolean;
  logs: LogEntry[];
  logAnalysis: LogAnalysisResult | null;
  codeAnalysis: ErrorAnalysisResult | null;
  errors: any[];
  domValidationResults: WebviewDOMValidationResult[];
  scenarioName: string;
  fixes: CodeFix[];
}

/**
 * 테스트 오케스트레이터
 * 전체 테스트 흐름을 조정하는 중앙 컴포넌트
 */
export class TestOrchestrator {
  /**
   * 테스트 사이클 실행
   * @param scenarioName 실행할 시나리오 이름
   */
  public async runTestCycle(scenarioName: string): Promise<TestResult> {
    try {
      console.log(`[Orchestrator] 테스트 시작: ${scenarioName}`);
      
      // 1. WebdriverIO 브라우저 초기화 확인
      if (!browser) {
        throw new Error('WebdriverIO 브라우저가 초기화되지 않았습니다.');
      }
      
      // 2. 로그 수집 시작
      logCollector.startCapturing();
      
      // 3. 시나리오 실행
      const scenarioSuccess = await scenarioRunner.executeScenario(scenarioName);
      if (!scenarioSuccess) {
        throw new Error(`시나리오 실행 실패: ${scenarioName}`);
      }
      
      // 4. 웹뷰 DOM 검증
      const domValidationResults = await webviewDOMValidator.validateWebviewDOM();
      
      // 5. 로그 수집 종료 및 분석
      const logs = logCollector.stopCapturingAndGetLogs();
      const logAnalysis = logAnalyzer.analyzeLogEntries(logs);
      
      // 6. DOM 검증 결과 분석
      const domValidationSuccess = this.analyzeValidationResults(domValidationResults);
      
      // 7. 코드 분석 및 수정 제안
      const codeAnalysis = await codeAnalyzer.analyzeErrors(logs, domValidationResults);
      
      // 8. 모든 오류 통합
      const allErrors = [
        ...logAnalysis.errors.map(e => ({
          type: e.type,
          severity: e.severity,
          message: e.message,
          source: 'log'
        })),
        ...(!domValidationSuccess ? this.createErrorsFromValidationResults(domValidationResults) : []),
        ...(codeAnalysis.errors.map(e => ({
          type: e.type,
          severity: e.severity,
          cause: e.cause,
          location: e.location,
          source: 'code'
        })))
      ];
      
      // 9. 테스트 결과 생성
      const result: TestResult = {
        success: scenarioSuccess && domValidationSuccess && !logAnalysis.hasErrors && !codeAnalysis.hasErrors,
        logs,
        logAnalysis,
        codeAnalysis,
        errors: allErrors,
        domValidationResults,
        scenarioName,
        fixes: codeAnalysis.fixes
      };
      
      console.log(`[Orchestrator] ${scenarioName} 테스트 완료. 결과: ${result.success ? '성공' : '실패'}`);
      if (!result.success) {
        console.log(`[Orchestrator] 오류 요약: ${logAnalysis.summary}`);
        console.log(`[Orchestrator] 수정 제안 수: ${result.fixes.length}`);
      }
      
      return result;
    } catch (error) {
      // 로그 수집 중이면 종료
      if (logCollector) {
        logCollector.stopCapturingAndGetLogs();
      }
      
      console.error(`[Orchestrator] 테스트 실행 오류: ${error.message}`);
      
      // 오류 발생 시 결과 반환
      return {
        success: false,
        logs: [],
        logAnalysis: null,
        codeAnalysis: null,
        errors: [{
          type: 'runtime_error',
          message: error.message,
          stack: error.stack,
          source: 'exception'
        }],
        domValidationResults: [],
        scenarioName,
        fixes: []
      };
    }
  }
  
  /**
   * 자동 코드 수정 실행
   * @param result 테스트 결과
   * @returns 수정 적용 성공 여부
   */
  public async applyCodeFixes(result: TestResult): Promise<boolean> {
    if (!result.fixes || result.fixes.length === 0) {
      console.log('[Orchestrator] 적용할 수정사항이 없습니다.');
      return false;
    }
    
    try {
      console.log(`[Orchestrator] 수정사항 적용 시작 (${result.fixes.length}개)...`);
      
      // 수정 적용
      const success = await codeAnalyzer.applyFixes(result.fixes);
      
      console.log(`[Orchestrator] 수정사항 적용 ${success ? '성공' : '실패'}`);
      return success;
    } catch (error) {
      console.error(`[Orchestrator] 수정사항 적용 중 오류: ${error.message}`);
      return false;
    }
  }
  
  /**
   * 전체 테스트 및 수정 사이클 실행
   * @param scenarioName 실행할 시나리오 이름
   * @param autoFix 자동 수정 적용 여부
   * @returns 테스트 결과
   */
  public async runFullTestCycle(scenarioName: string, autoFix: boolean = false): Promise<TestResult> {
    // 첫 번째 테스트 실행
    let result = await this.runTestCycle(scenarioName);
    
    // 자동 수정이 활성화되어 있고 오류가 있는 경우
    if (autoFix && !result.success && result.fixes.length > 0) {
      console.log('[Orchestrator] 자동 수정 모드 활성화됨');
      
      // 수정 적용
      const fixSuccess = await this.applyCodeFixes(result);
      
      if (fixSuccess) {
        console.log('[Orchestrator] 수정 적용 후 테스트 재실행...');
        
        // 수정 후 테스트 재실행
        result = await this.runTestCycle(scenarioName);
      }
    }
    
    return result;
  }
  
  /**
   * DOM 검증 결과 분석
   * @param results DOM 검증 결과 배열
   * @returns 검증 성공 여부
   */
  private analyzeValidationResults(results: WebviewDOMValidationResult[]): boolean {
    // 모든 검증 결과가 유효한지 확인
    return results.every(result => result.valid);
  }
  
  /**
   * DOM 검증 결과에서 오류 객체 생성
   * @param results DOM 검증 결과 배열
   * @returns 오류 객체 배열
   */
  private createErrorsFromValidationResults(results: WebviewDOMValidationResult[]): any[] {
    // 유효하지 않은 결과만 필터링
    const invalidResults = results.filter(result => !result.valid);
    
    // 오류 객체 배열 생성
    return invalidResults.map(result => ({
      type: 'dom_error',
      location: result.selector,
      message: result.error || '알 수 없는 오류',
      name: result.name,
      exists: result.exists,
      visible: result.visible,
      enabled: result.enabled,
      text: result.text,
      source: 'dom'
    }));
  }
}

// 오케스트레이터 싱글톤 인스턴스
export const orchestrator = new TestOrchestrator();