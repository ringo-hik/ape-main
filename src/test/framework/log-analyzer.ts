import { LogEntry } from './log-collector';

/**
 * 로그 분석 결과 인터페이스
 */
export interface LogAnalysisResult {
  hasErrors: boolean;
  errors: LogError[];
  warnings: LogError[];
  summary: string;
}

/**
 * 로그 오류 인터페이스
 */
export interface LogError {
  type: 'runtime_error' | 'api_error' | 'validation_error' | 'network_error' | 'other';
  message: string;
  logEntry: LogEntry;
  severity: 'low' | 'medium' | 'high';
  relatedLogs?: LogEntry[];
}

/**
 * 로그 분석기
 * 로그 엔트리를 분석하여 오류 및 경고 식별
 */
export class LogAnalyzer {
  /**
   * 로그 분석
   * @param logs 분석할 로그 항목 배열
   * @returns 로그 분석 결과
   */
  public analyzeLogEntries(logs: LogEntry[]): LogAnalysisResult {
    const errors: LogError[] = [];
    const warnings: LogError[] = [];
    
    // 로그 엔트리 순회
    for (let i = 0; i < logs.length; i++) {
      const entry = logs[i];
      
      // 에러 로그 식별
      if (entry.level === 'error') {
        const error = this.createErrorFromLogEntry(entry, logs, i);
        errors.push(error);
      }
      
      // 경고 로그 식별
      else if (entry.level === 'warn') {
        const warning = this.createErrorFromLogEntry(entry, logs, i);
        warning.severity = 'low'; // 경고는 기본적으로 심각도 낮음
        warnings.push(warning);
      }
    }
    
    // 결과 객체 생성
    const result: LogAnalysisResult = {
      hasErrors: errors.length > 0,
      errors,
      warnings,
      summary: this.createAnalysisSummary(errors, warnings)
    };
    
    return result;
  }
  
  /**
   * 로그 엔트리에서 오류 객체 생성
   * @param entry 로그 항목
   * @param allLogs 전체 로그 항목 배열
   * @param index 현재 로그 항목 인덱스
   * @returns 오류 객체
   */
  private createErrorFromLogEntry(entry: LogEntry, allLogs: LogEntry[], index: number): LogError {
    // 관련 로그 찾기 (전후 최대 5개)
    const relatedLogs: LogEntry[] = [];
    
    // 이전 로그
    for (let i = Math.max(0, index - 5); i < index; i++) {
      relatedLogs.push(allLogs[i]);
    }
    
    // 이후 로그
    for (let i = index + 1; i < Math.min(allLogs.length, index + 6); i++) {
      relatedLogs.push(allLogs[i]);
    }
    
    // 오류 유형 및 심각도 결정
    const errorType = this.detectErrorType(entry);
    const severity = this.determineErrorSeverity(entry, errorType);
    
    return {
      type: errorType,
      message: entry.message,
      logEntry: entry,
      severity,
      relatedLogs
    };
  }
  
  /**
   * 오류 유형 감지
   * @param entry 로그 항목
   * @returns 오류 유형
   */
  private detectErrorType(entry: LogEntry): 'runtime_error' | 'api_error' | 'validation_error' | 'network_error' | 'other' {
    const message = entry.message.toLowerCase();
    
    if (message.includes('exception') || message.includes('uncaught') || message.includes('stack trace')) {
      return 'runtime_error';
    } else if (message.includes('api') || message.includes('response') || message.includes('request')) {
      return 'api_error';
    } else if (message.includes('validation') || message.includes('invalid') || message.includes('schema')) {
      return 'validation_error';
    } else if (message.includes('network') || message.includes('connection') || message.includes('timeout')) {
      return 'network_error';
    } else {
      return 'other';
    }
  }
  
  /**
   * 오류 심각도 결정
   * @param entry 로그 항목
   * @param errorType 오류 유형
   * @returns 오류 심각도
   */
  private determineErrorSeverity(entry: LogEntry, errorType: string): 'low' | 'medium' | 'high' {
    const message = entry.message.toLowerCase();
    
    // 항상 높은 심각도를 가지는 오류 패턴
    if (message.includes('crash') || message.includes('fatal') || message.includes('critical')) {
      return 'high';
    }
    
    // 오류 유형에 따른 기본 심각도
    switch (errorType) {
      case 'runtime_error':
        return 'high';
      case 'api_error':
      case 'network_error':
        return 'medium';
      case 'validation_error':
      case 'other':
        return 'low';
      default:
        return 'low';
    }
  }
  
  /**
   * 분석 요약 생성
   * @param errors 오류 배열
   * @param warnings 경고 배열
   * @returns 요약 문자열
   */
  private createAnalysisSummary(errors: LogError[], warnings: LogError[]): string {
    // 심각도별 오류 수 계산
    const highSeverityCount = errors.filter(e => e.severity === 'high').length;
    const mediumSeverityCount = errors.filter(e => e.severity === 'medium').length;
    const lowSeverityCount = errors.filter(e => e.severity === 'low').length;
    
    // 유형별 오류 수 계산
    const runtimeErrorCount = errors.filter(e => e.type === 'runtime_error').length;
    const apiErrorCount = errors.filter(e => e.type === 'api_error').length;
    const validationErrorCount = errors.filter(e => e.type === 'validation_error').length;
    const networkErrorCount = errors.filter(e => e.type === 'network_error').length;
    const otherErrorCount = errors.filter(e => e.type === 'other').length;
    
    // 요약 문자열 생성
    let summary = `발견된 오류: ${errors.length}, 경고: ${warnings.length}\n`;
    
    if (errors.length > 0) {
      summary += `심각도 - 높음: ${highSeverityCount}, 중간: ${mediumSeverityCount}, 낮음: ${lowSeverityCount}\n`;
      summary += `유형 - 런타임: ${runtimeErrorCount}, API: ${apiErrorCount}, 검증: ${validationErrorCount}, 네트워크: ${networkErrorCount}, 기타: ${otherErrorCount}`;
    }
    
    return summary;
  }
}

// 로그 분석기 싱글톤 인스턴스
export const logAnalyzer = new LogAnalyzer();