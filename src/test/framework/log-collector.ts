import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 로그 항목 인터페이스
 */
export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source?: string;
}

/**
 * 로그 수집기
 * VSCode 디버그 콘솔 출력 캡처 및 구조화
 */
export class LogCollector {
  private outputChannel: vscode.OutputChannel | null = null;
  private logs: LogEntry[] = [];
  private debugSessionListener: vscode.Disposable | null = null;
  private isCapturing: boolean = false;
  private logFilePath: string = '';
  
  constructor() {
    // 로그 디렉토리 생성
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // 로그 파일 경로 설정
    this.logFilePath = path.join(logDir, `test-log-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);
  }
  
  /**
   * 로그 수집 시작
   */
  public startCapturing(): void {
    if (this.isCapturing) {
      console.warn('[LogCollector] 이미 로그 수집 중입니다.');
      return;
    }
    
    // 상태 업데이트
    this.isCapturing = true;
    this.logs = [];
    
    // 출력 채널 생성
    if (!this.outputChannel) {
      this.outputChannel = vscode.window.createOutputChannel('APE Test Log Collector');
    }
    
    // 로그 파일 초기화
    fs.writeFileSync(this.logFilePath, `--- 로그 수집 시작: ${new Date().toISOString()} ---\n`);
    
    this.outputChannel.appendLine('--- 로그 캡처 시작 ---');
    
    // 기본 로그 추가
    this.addLogEntry({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: '로그 수집 시작',
      source: 'LogCollector'
    });
    
    try {
      // 디버그 콘솔 출력 리스너 등록
      if (vscode.debug) {
        this.debugSessionListener = vscode.debug.onDidReceiveDebugSessionCustomEvent(event => {
          if (event.event === 'output') {
            const outputEvent = event.body as any;
            
            if (outputEvent.category === 'console') {
              // 콘솔 로그
              this.addLogEntry({
                timestamp: new Date().toISOString(),
                level: this.detectLogLevel(outputEvent.output),
                message: outputEvent.output,
                source: 'console'
              });
            } else if (outputEvent.category === 'stderr') {
              // 오류 로그
              this.addLogEntry({
                timestamp: new Date().toISOString(),
                level: 'error',
                message: outputEvent.output,
                source: 'stderr'
              });
            }
          }
        });
      } else {
        console.warn('[LogCollector] VSCode 디버그 API를 사용할 수 없습니다.');
      }
    } catch (error) {
      console.error(`[LogCollector] 로그 수집기 초기화 오류: ${error.message}`);
    }
  }
  
  /**
   * 로그 수집 중지 및 로그 반환
   * @returns 수집된 로그 항목 배열
   */
  public stopCapturingAndGetLogs(): LogEntry[] {
    if (!this.isCapturing) {
      console.warn('[LogCollector] 로그 수집 중이 아닙니다.');
      return this.logs;
    }
    
    // 기본 로그 추가
    this.addLogEntry({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: '로그 수집 종료',
      source: 'LogCollector'
    });
    
    // 리스너 정리
    if (this.debugSessionListener) {
      this.debugSessionListener.dispose();
      this.debugSessionListener = null;
    }
    
    // 출력 채널 업데이트
    if (this.outputChannel) {
      this.outputChannel.appendLine('--- 로그 캡처 종료 ---');
    }
    
    // 로그 파일 종료
    fs.appendFileSync(this.logFilePath, `--- 로그 수집 종료: ${new Date().toISOString()} ---\n`);
    
    // 상태 업데이트
    this.isCapturing = false;
    
    // 로그 복사본 반환
    return [...this.logs];
  }
  
  /**
   * 로그 항목 추가
   * @param entry 로그 항목
   */
  private addLogEntry(entry: LogEntry): void {
    // 로그 배열에 추가
    this.logs.push(entry);
    
    // 출력 채널에 추가
    if (this.outputChannel) {
      this.outputChannel.appendLine(`[${entry.timestamp}][${entry.level.toUpperCase()}] ${entry.message}`);
    }
    
    // 로그 파일에 추가
    fs.appendFileSync(
      this.logFilePath, 
      `[${entry.timestamp}][${entry.level.toUpperCase()}]${entry.source ? `[${entry.source}]` : ''} ${entry.message}\n`
    );
  }
  
  /**
   * 로그 레벨 감지
   * @param message 로그 메시지
   * @returns 감지된 로그 레벨
   */
  private detectLogLevel(message: string): 'info' | 'warn' | 'error' | 'debug' {
    // 로그 레벨 감지 로직
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('error') || lowerMessage.includes('exception') || lowerMessage.includes('fail')) {
      return 'error';
    } else if (lowerMessage.includes('warn')) {
      return 'warn';
    } else if (lowerMessage.includes('debug')) {
      return 'debug';
    } else {
      return 'info';
    }
  }
  
  /**
   * 로그 지우기
   */
  public clearLogs(): void {
    this.logs = [];
  }
}

// 로그 수집기 싱글톤 인스턴스
export const logCollector = new LogCollector();