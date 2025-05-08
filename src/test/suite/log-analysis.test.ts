import { expect } from '@wdio/globals';
import { logAnalyzer } from '../framework/log-analyzer';
import { LogEntry } from '../framework/log-collector';

describe('로그 분석 테스트', () => {
  it('오류 로그를 식별하고 분류할 수 있어야 함', () => {
    // 테스트용 로그 항목 생성
    const testLogs: LogEntry[] = [
      {
        timestamp: '2025-05-08T10:00:00.000Z',
        level: 'info',
        message: '애플리케이션 시작'
      },
      {
        timestamp: '2025-05-08T10:00:01.000Z',
        level: 'debug',
        message: '설정 로드 중'
      },
      {
        timestamp: '2025-05-08T10:00:02.000Z',
        level: 'error',
        message: 'TypeError: Cannot read property "send" of undefined',
        source: 'console'
      },
      {
        timestamp: '2025-05-08T10:00:03.000Z',
        level: 'info',
        message: '사용자 인증 시도'
      },
      {
        timestamp: '2025-05-08T10:00:04.000Z',
        level: 'error',
        message: 'API 요청 실패: 401 Unauthorized',
        source: 'console'
      },
      {
        timestamp: '2025-05-08T10:00:05.000Z',
        level: 'warn',
        message: '재시도 횟수 초과',
        source: 'console'
      }
    ];
    
    // 로그 분석 실행
    const analysisResult = logAnalyzer.analyzeLogEntries(testLogs);
    
    // 검증
    expect(analysisResult.hasErrors).toBe(true);
    expect(analysisResult.errors.length).toBe(2);
    expect(analysisResult.warnings.length).toBe(1);
    
    // 오류 유형 검증
    const runtimeError = analysisResult.errors.find(e => e.type === 'runtime_error');
    expect(runtimeError).toBeDefined();
    expect(runtimeError?.message).toContain('TypeError');
    
    const apiError = analysisResult.errors.find(e => e.type === 'api_error');
    expect(apiError).toBeDefined();
    expect(apiError?.message).toContain('API');
  });
  
  it('로그 없이도 적절히 처리할 수 있어야 함', () => {
    // 빈 로그 항목으로 분석
    const emptyLogs: LogEntry[] = [];
    const analysisResult = logAnalyzer.analyzeLogEntries(emptyLogs);
    
    // 검증
    expect(analysisResult.hasErrors).toBe(false);
    expect(analysisResult.errors.length).toBe(0);
    expect(analysisResult.warnings.length).toBe(0);
  });
  
  it('로그 분석 요약이 정확해야 함', () => {
    // 테스트용 로그 항목 생성
    const testLogs: LogEntry[] = [
      {
        timestamp: '2025-05-08T10:00:00.000Z',
        level: 'error',
        message: 'Critical exception in core module',
        source: 'console'
      },
      {
        timestamp: '2025-05-08T10:00:01.000Z',
        level: 'error',
        message: 'Network connection timeout',
        source: 'console'
      },
      {
        timestamp: '2025-05-08T10:00:02.000Z',
        level: 'error',
        message: 'Validation failed: Invalid input',
        source: 'console'
      }
    ];
    
    // 로그 분석 실행
    const analysisResult = logAnalyzer.analyzeLogEntries(testLogs);
    
    // 검증
    expect(analysisResult.summary).toContain('발견된 오류: 3');
    expect(analysisResult.summary).toContain('높음:');
    expect(analysisResult.summary).toContain('런타임:');
    expect(analysisResult.summary).toContain('네트워크:');
    expect(analysisResult.summary).toContain('검증:');
  });
});