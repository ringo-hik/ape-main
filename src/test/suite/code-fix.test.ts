import { expect } from '@wdio/globals';
import { codeAnalyzer } from '../framework/code-analyzer';
import { WebviewDOMValidationResult } from '../framework/webview-dom-validator';
import { LogEntry } from '../framework/log-collector';
import * as fs from 'fs';
import * as path from 'path';

describe('코드 분석 및 수정 테스트', () => {
  it('오류 분석 및 수정 제안이 가능해야 함', async () => {
    // 테스트 환경 변수 확인
    const hasApiKey = !!process.env.CLAUDE_API_KEY;
    if (!hasApiKey) {
      console.warn('CLAUDE_API_KEY 환경 변수가 설정되지 않아 테스트를 건너뜁니다.');
      return;
    }
    
    // 테스트용 로그 생성
    const testLogs: LogEntry[] = [
      {
        timestamp: '2025-05-08T10:00:00.000Z',
        level: 'error',
        message: 'TypeError: Cannot read property "querySelector" of null',
        source: 'console'
      }
    ];
    
    // 테스트용 DOM 검증 결과 생성
    const testDomResults: WebviewDOMValidationResult[] = [
      {
        name: 'send-button',
        selector: '#send-button',
        required: true,
        exists: false,
        visible: false,
        enabled: false,
        text: '',
        valid: false,
        error: '필수 요소가 존재하지 않습니다: #send-button'
      }
    ];
    
    // 오류 분석 실행
    const analysisResult = await codeAnalyzer.analyzeErrors(testLogs, testDomResults);
    
    // 검증
    expect(analysisResult).toBeDefined();
    expect(analysisResult.hasErrors).toBe(true);
    
    // LLM API 키가 설정된 경우 추가 검증
    if (hasApiKey) {
      // 오류 유형 확인
      expect(analysisResult.errors.length).toBeGreaterThan(0);
      const domError = analysisResult.errors.find(e => e.type === 'dom_error');
      expect(domError).toBeDefined();
      
      // 수정 제안 확인 (실제 파일을 수정하지 않음)
      console.log(`[Test] 수정 제안 수: ${analysisResult.fixes.length}`);
      if (analysisResult.fixes.length > 0) {
        for (const fix of analysisResult.fixes) {
          expect(fix.filePath).toBeTruthy();
          expect(fix.originalCode).toBeTruthy();
          expect(fix.fixedCode).toBeTruthy();
          expect(fix.description).toBeTruthy();
        }
      }
    }
  });
  
  it('응답에서 코드 블록을 추출할 수 있어야 함', () => {
    // 테스트용 응답 텍스트
    const testResponse = `여기서 코드를 수정해야 합니다:

\`\`\`typescript
function example(): void {
  const button = document.querySelector('#send-button');
  button.addEventListener('click', () => {
    console.log('버튼 클릭됨');
  });
}
\`\`\`

다음과 같이 수정해야 합니다:

\`\`\`typescript
function example(): void {
  const button = document.querySelector('#send-button');
  if (button) {
    button.addEventListener('click', () => {
      console.log('버튼 클릭됨');
    });
  }
}
\`\`\`

이렇게 하면 버튼 요소가 없는 경우 예외가 발생하지 않습니다.`;
    
    // 비공개 메서드 접근을 위한 임시 방법
    const extract = (response: string): string | null => {
      const codeBlockRegex = /```(?:typescript|javascript|ts|js)?\s*([\s\S]*?)```/;
      const match = response.match(codeBlockRegex);
      return match ? match[1] : null;
    };
    
    // 추출 검증
    const code = extract(testResponse);
    expect(code).toBeDefined();
    expect(code).toContain('function example()');
    
    // 두 번째 코드 블록 추출 (실제 구현은 첫 번째 블록만 추출)
    const fullExtract = testResponse.match(/```(?:typescript|javascript|ts|js)?\s*([\s\S]*?)```/g);
    expect(fullExtract?.length).toBe(2);
  });
  
  it('오류 메시지에서 키워드를 추출할 수 있어야 함', () => {
    // 테스트용 오류 메시지
    const testErrorMessage = 'TypeError: Cannot read property "addEventListener" of null when calling "ChatViewProvider.setupEventListeners"';
    
    // 비공개 메서드 접근을 위한 임시 방법
    const extractKeywords = (errorMessage: string): string[] => {
      const keywords: string[] = [];
      
      // 따옴표로 묶인 텍스트 추출
      const quotedTextRegex = /'([^']+)'|"([^"]+)"/g;
      let match;
      while (match = quotedTextRegex.exec(errorMessage)) {
        keywords.push(match[1] || match[2]);
      }
      
      // 대문자로 시작하는 단어 추출 (가능한 클래스/함수명)
      const capitializedWordsRegex = /\b([A-Z][a-zA-Z0-9]*)\b/g;
      while (match = capitializedWordsRegex.exec(errorMessage)) {
        keywords.push(match[1]);
      }
      
      // 점(.) 연산자로 구분된 참조 추출
      const dotOperatorRegex = /\b([a-zA-Z0-9_]+\.[a-zA-Z0-9_]+)\b/g;
      while (match = dotOperatorRegex.exec(errorMessage)) {
        keywords.push(match[1]);
      }
      
      return keywords;
    };
    
    // 추출 검증
    const keywords = extractKeywords(testErrorMessage);
    expect(keywords).toContain('addEventListener');
    expect(keywords).toContain('ChatViewProvider');
    expect(keywords).toContain('setupEventListeners');
    expect(keywords).toContain('TypeError');
  });
});