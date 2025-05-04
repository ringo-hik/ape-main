import * as vscode from 'vscode';

// 로그 레벨
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

// 로그 설정
export interface LoggerConfig {
  level: LogLevel;
  useConsole: boolean;
  useOutputChannel: boolean;
}

// 로거 서비스
export class LoggerService {
  private static _instance: LoggerService;
  private _outputChannel: vscode.OutputChannel;
  private _config: LoggerConfig = {
    level: LogLevel.INFO,
    useConsole: true,
    useOutputChannel: true
  };

  private constructor() {
    this._outputChannel = vscode.window.createOutputChannel('Axiom');
  }

  public static getInstance(): LoggerService {
    if (!LoggerService._instance) {
      LoggerService._instance = new LoggerService();
    }
    return LoggerService._instance;
  }

  public configure(config: Partial<LoggerConfig>): void {
    this._config = { ...this._config, ...config };
  }

  public debug(message: string, ...optionalParams: any[]): void {
    this.log(LogLevel.DEBUG, message, ...optionalParams);
  }

  public info(message: string, ...optionalParams: any[]): void {
    this.log(LogLevel.INFO, message, ...optionalParams);
  }

  public warn(message: string, ...optionalParams: any[]): void {
    this.log(LogLevel.WARN, message, ...optionalParams);
  }

  public error(message: string, ...optionalParams: any[]): void {
    this.log(LogLevel.ERROR, message, ...optionalParams);
  }

  private log(level: LogLevel, message: string, ...optionalParams: any[]): void {
    if (level < this._config.level) {
      return;
    }

    const levelStr = LogLevel[level];
    const formattedMessage = `[${levelStr}] ${message}`;

    if (this._config.useConsole) {
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(message);
          break;
        case LogLevel.INFO:
          console.info(message);
          break;
        case LogLevel.WARN:
          console.warn(message);
          break;
        case LogLevel.ERROR:
          console.error(message, ...optionalParams);
          break;
      }
    }

    if (this._config.useOutputChannel) {
      let outputStr = formattedMessage;
      
      if (optionalParams.length > 0) {
        try {
          outputStr += ' ' + optionalParams.map(p => {
            if (typeof p === 'object') {
              return JSON.stringify(p);
            }
            return String(p);
          }).join(' ');
        } catch (error) {
          outputStr += ' [Parameter serialization error]';
        }
      }
      
      this._outputChannel.appendLine(outputStr);
    }
  }

  public show(preserveFocus: boolean = false): void {
    this._outputChannel.show(preserveFocus);
  }

  public hide(): void {
    this._outputChannel.hide();
  }

  public clear(): void {
    this._outputChannel.clear();
  }

  public setLevel(level: LogLevel): void {
    this._config.level = level;
  }

  public getLevel(): LogLevel {
    return this._config.level;
  }
}