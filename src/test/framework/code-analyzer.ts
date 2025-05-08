import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import axios from 'axios';
import { LogEntry } from './log-collector';
import { WebviewDOMValidationResult } from './webview-dom-validator';

/**
 * 코드 수정 인터페이스
 */
export interface CodeFix {
  filePath: string;
  originalCode: string;
  fixedCode: string;
  description: string;
}

/**
 * 오류 분석 결과 인터페이스
 */
export interface ErrorAnalysisResult {
  hasErrors: boolean;
  errors: ErrorInfo[];
  fixes: CodeFix[];
}

/**
 * 오류 정보 인터페이스
 */
export interface ErrorInfo {
  type: string;
  location: string;
  cause: string;
  severity: 'low' | 'medium' | 'high';
  relatedCode?: string;
  suggestedFix?: string;
}

/**
 * 코드 분석/수정기
 * 오류 분석 및 자동 코드 수정
 */
export class CodeAnalyzer {
  private readonly API_ENDPOINT = 'https://api.anthropic.com/v1/messages';
  private readonly API_KEY = process.env.CLAUDE_API_KEY || '';
  private readonly MODEL = 'claude-3-7-sonnet-20250219';
  private readonly SOURCE_DIR = path.join(process.cwd(), 'src');
  
  constructor() {
    // 환경 변수 설정 확인
    if (!this.API_KEY) {
      console.warn('[CodeAnalyzer] CLAUDE_API_KEY 환경 변수가 설정되지 않았습니다. LLM 분석을 사용할 수 없습니다.');
    }
  }
  
  /**
   * 로그 및 DOM 검증 결과에서 오류 분석
   * @param logs 로그 항목 배열
   * @param domResults DOM 검증 결과 배열
   * @returns 오류 분석 결과
   */
  public async analyzeErrors(
    logs: LogEntry[],
    domResults: WebviewDOMValidationResult[]
  ): Promise<ErrorAnalysisResult> {
    try {
      console.log('[CodeAnalyzer] 오류 분석 시작...');
      
      // API 키가 설정되지 않은 경우 간단한 분석 결과 반환
      if (!this.API_KEY) {
        return this.createSimpleAnalysisResult(logs, domResults);
      }
      
      // LLM 분석을 위한 로그 및 DOM 결과 준비
      const formattedLogs = this.formatLogsForAnalysis(logs);
      const formattedDomResults = JSON.stringify(domResults, null, 2);
      
      // LLM에 분석 요청
      const response = await axios.post(
        this.API_ENDPOINT,
        {
          model: this.MODEL,
          max_tokens: 4000,
          messages: [
            {
              role: 'user',
              content: `다음은 VSCode 확장 프로그램 디버그 실행 중 캡처된 로그와 웹뷰 DOM 검증 결과입니다. 이 데이터에서 오류를 식별하고 분석해주세요. 각 오류에 대해 1) 오류 유형, 2) 오류 위치, 3) 가능한 원인, 4) 심각도를 JSON 형식으로 반환해주세요.

로그:
\`\`\`
${formattedLogs}
\`\`\`

웹뷰 DOM 검증 결과:
\`\`\`json
${formattedDomResults}
\`\`\`

응답 형식:
{
  "hasErrors": boolean,
  "errors": [
    {
      "type": "runtime_error|dom_error|ui_error|api_error|other",
      "location": "string", // 파일 경로 또는 컴포넌트 이름
      "cause": "string", // 오류 원인에 대한 상세 설명
      "severity": "low|medium|high",
      "relatedCode": "string", // 관련 코드 부분 (있는 경우)
      "suggestedFix": "string" // 제안하는 수정 방법 (있는 경우)
    }
  ]
}
`
            }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Anthropic-Beta': 'tools-2024-05-16',
            'Anthropic-Version': '2023-06-01',
            'x-api-key': this.API_KEY
          }
        }
      );
      
      // 응답 파싱
      const content = response.data.content;
      const analysisResult = JSON.parse(content[0].text);
      
      // 소스 파일 검색 및 코드 수정 제안
      const fixes: CodeFix[] = [];
      
      // 오류가 있는 경우에만 수정 제안
      if (analysisResult.hasErrors && analysisResult.errors.length > 0) {
        for (const error of analysisResult.errors) {
          // 소스 파일 찾기
          const sourceFile = await this.findSourceFileForError(error);
          
          if (sourceFile) {
            // 해당 파일에 대한 수정 제안 요청
            const fixSuggestion = await this.generateFixForError(error, sourceFile);
            if (fixSuggestion) {
              fixes.push(fixSuggestion);
            }
          }
        }
      }
      
      // 결과 반환
      return {
        hasErrors: analysisResult.hasErrors,
        errors: analysisResult.errors,
        fixes
      };
    } catch (error) {
      console.error(`[CodeAnalyzer] 오류 분석 중 예외 발생: ${error.message}`);
      
      // 오류 발생 시 간단한 분석 결과 반환
      return this.createSimpleAnalysisResult(logs, domResults);
    }
  }
  
  /**
   * 간단한 분석 결과 생성 (LLM 없이)
   * @param logs 로그 항목 배열
   * @param domResults DOM 검증 결과 배열
   * @returns 오류 분석 결과
   */
  private createSimpleAnalysisResult(
    logs: LogEntry[],
    domResults: WebviewDOMValidationResult[]
  ): ErrorAnalysisResult {
    const errors: ErrorInfo[] = [];
    
    // 오류 로그 분석
    const errorLogs = logs.filter(log => log.level === 'error');
    errors.push(...errorLogs.map(log => ({
      type: 'runtime_error',
      location: log.source || 'unknown',
      cause: log.message,
      severity: 'medium' as 'low' | 'medium' | 'high'
    })));
    
    // DOM 검증 결과 분석
    const invalidDomResults = domResults.filter(result => !result.valid);
    errors.push(...invalidDomResults.map(result => ({
      type: 'dom_error',
      location: result.selector,
      cause: result.error || '알 수 없는 DOM 오류',
      severity: 'medium' as 'low' | 'medium' | 'high'
    })));
    
    // 결과 반환
    return {
      hasErrors: errors.length > 0,
      errors,
      fixes: []
    };
  }
  
  /**
   * 로그 형식 변환
   * @param logs 로그 항목 배열
   * @returns 분석용 형식의 로그 문자열
   */
  private formatLogsForAnalysis(logs: LogEntry[]): string {
    return logs.map(log => 
      `[${log.timestamp}][${log.level.toUpperCase()}]${log.source ? `[${log.source}]` : ''} ${log.message}`
    ).join('\n');
  }
  
  /**
   * 오류 관련 소스 파일 찾기
   * @param error 오류 정보
   * @returns 소스 파일 정보 또는 null
   */
  private async findSourceFileForError(error: ErrorInfo): Promise<{ path: string, content: string } | null> {
    try {
      // 파일 경로가 직접 명시된 경우
      if (error.location && error.location.includes('/') && error.location.endsWith('.ts')) {
        const filePath = path.resolve(process.cwd(), error.location);
        if (fs.existsSync(filePath)) {
          return {
            path: filePath,
            content: fs.readFileSync(filePath, 'utf8')
          };
        }
      }
      
      // DOM 오류인 경우 웹뷰 관련 파일 검색
      if (error.type === 'dom_error') {
        const webviewFiles = await this.findFilesContaining('chatViewProvider');
        if (webviewFiles.length > 0) {
          return {
            path: webviewFiles[0],
            content: fs.readFileSync(webviewFiles[0], 'utf8')
          };
        }
      }
      
      // 런타임 오류인 경우 오류 메시지에서 힌트 찾기
      if (error.type === 'runtime_error') {
        const keywords = this.extractKeywordsFromErrorMessage(error.cause);
        for (const keyword of keywords) {
          const files = await this.findFilesContaining(keyword);
          if (files.length > 0) {
            return {
              path: files[0],
              content: fs.readFileSync(files[0], 'utf8')
            };
          }
        }
      }
      
      // 찾지 못한 경우
      return null;
    } catch (error) {
      console.error(`[CodeAnalyzer] 소스 파일 검색 중 오류: ${error.message}`);
      return null;
    }
  }
  
  /**
   * 키워드가 포함된 파일 찾기
   * @param keyword 검색 키워드
   * @returns 파일 경로 배열
   */
  private async findFilesContaining(keyword: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const foundFiles: string[] = [];
      
      try {
        // src 디렉토리 탐색
        this.searchFilesRecursively(this.SOURCE_DIR, keyword, foundFiles);
        resolve(foundFiles);
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * 재귀적으로 파일 검색
   * @param dir 검색 디렉토리
   * @param keyword 검색 키워드
   * @param foundFiles 찾은 파일 목록 (참조로 업데이트)
   */
  private searchFilesRecursively(dir: string, keyword: string, foundFiles: string[]): void {
    // 디렉토리 내 모든 항목 읽기
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        // 디렉토리인 경우 재귀 호출
        this.searchFilesRecursively(itemPath, keyword, foundFiles);
      } else if (stat.isFile() && item.endsWith('.ts')) {
        // TypeScript 파일인 경우 내용 검색
        try {
          const content = fs.readFileSync(itemPath, 'utf8');
          if (content.includes(keyword)) {
            foundFiles.push(itemPath);
          }
        } catch (error) {
          console.error(`[CodeAnalyzer] 파일 읽기 오류 (${itemPath}): ${error.message}`);
        }
      }
    }
  }
  
  /**
   * 오류 메시지에서 키워드 추출
   * @param errorMessage 오류 메시지
   * @returns 추출된 키워드 배열
   */
  private extractKeywordsFromErrorMessage(errorMessage: string): string[] {
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
  }
  
  /**
   * 오류에 대한 수정 제안 생성
   * @param error 오류 정보
   * @param sourceFile 소스 파일 정보
   * @returns 코드 수정 제안 또는 null
   */
  private async generateFixForError(
    error: ErrorInfo,
    sourceFile: { path: string, content: string }
  ): Promise<CodeFix | null> {
    try {
      // API 키가 설정되지 않은 경우 null 반환
      if (!this.API_KEY) {
        return null;
      }
      
      console.log(`[CodeAnalyzer] 파일 수정 제안 생성 중: ${sourceFile.path}`);
      
      // LLM에 수정 요청
      const response = await axios.post(
        this.API_ENDPOINT,
        {
          model: this.MODEL,
          max_tokens: 4000,
          messages: [
            {
              role: 'user',
              content: `다음 VSCode 확장 프로그램 코드에서 오류가 발생했습니다. 오류를 수정하는 방법을 제안해주세요.

오류 정보:
\`\`\`json
${JSON.stringify(error, null, 2)}
\`\`\`

소스 코드 (${sourceFile.path}):
\`\`\`typescript
${sourceFile.content}
\`\`\`

수정된 코드 전체를 제공해주세요. 특히 웹뷰 DOM 요소와 관련된 오류인 경우, HTML/CSS/JS 요소가 올바르게 구현되었는지 확인해주세요.
변경 내용을 명확하게 설명해주세요. 수정된 코드는 반드시 원본과 동일한 구조를 유지해야 합니다.`
            }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Anthropic-Beta': 'tools-2024-05-16',
            'Anthropic-Version': '2023-06-01',
            'x-api-key': this.API_KEY
          }
        }
      );
      
      // 응답 파싱
      const content = response.data.content;
      const textContent = content[0].text;
      
      // 코드 블록 추출
      const fixedCode = this.extractCodeFromResponse(textContent);
      
      // 설명 추출
      const description = this.extractDescriptionFromResponse(textContent);
      
      // 수정 제안 생성
      if (fixedCode) {
        return {
          filePath: sourceFile.path,
          originalCode: sourceFile.content,
          fixedCode,
          description
        };
      }
      
      return null;
    } catch (error) {
      console.error(`[CodeAnalyzer] 수정 제안 생성 중 오류: ${error.message}`);
      return null;
    }
  }
  
  /**
   * 응답에서 코드 블록 추출
   * @param response 응답 텍스트
   * @returns 추출된 코드 또는 null
   */
  private extractCodeFromResponse(response: string): string | null {
    // 타입스크립트 코드 블록 추출
    const codeBlockRegex = /```(?:typescript|javascript|ts|js)?\s*([\s\S]*?)```/;
    const match = response.match(codeBlockRegex);
    return match ? match[1] : null;
  }
  
  /**
   * 응답에서 설명 추출
   * @param response 응답 텍스트
   * @returns 추출된 설명
   */
  private extractDescriptionFromResponse(response: string): string {
    // 코드 블록 제거
    const withoutCodeBlocks = response.replace(/```(?:typescript|javascript|ts|js)?\s*[\s\S]*?```/g, '');
    
    // 추출된 텍스트의 첫 부분 (최대 500자)
    return withoutCodeBlocks.trim().split('\n').slice(0, 10).join('\n').substring(0, 500);
  }
  
  /**
   * 수정 적용
   * @param fixes 적용할 수정 배열
   * @returns 적용 성공 여부
   */
  public async applyFixes(fixes: CodeFix[]): Promise<boolean> {
    try {
      for (const fix of fixes) {
        // 파일 백업
        const backupPath = `${fix.filePath}.backup`;
        fs.writeFileSync(backupPath, fix.originalCode);
        
        // 수정 적용
        fs.writeFileSync(fix.filePath, fix.fixedCode);
        
        console.log(`[CodeAnalyzer] 파일 수정 적용됨: ${fix.filePath} (백업: ${backupPath})`);
      }
      
      return true;
    } catch (error) {
      console.error(`[CodeAnalyzer] 수정 적용 중 오류: ${error.message}`);
      return false;
    }
  }
}

// 코드 분석기 싱글톤 인스턴스
export const codeAnalyzer = new CodeAnalyzer();