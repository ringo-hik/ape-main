"use strict";
/**
 * 로깅 시스템
 *
 * console.log 직접 사용을 방지하고 중앙화된 로깅 관리를 위한 유틸리티
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.Logger = exports.LogLevel = void 0;
const vscode = __importStar(require("vscode"));
/**
 * 로그 레벨 정의
 */
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
    LogLevel[LogLevel["NONE"] = 4] = "NONE";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
/**
 * Logger 클래스 - APE 확장의 중앙 로깅 시스템
 */
class Logger {
    static instance;
    outputChannel;
    logLevel = LogLevel.INFO;
    /**
     * 생성자 - 싱글톤 패턴으로 직접 호출하지 않음
     */
    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('APE Extension');
        // 설정에서 로그 레벨 로드
        this.updateLogLevel();
        // 설정 변경 리스너 등록
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('ape.system.logLevel')) {
                this.updateLogLevel();
            }
        });
    }
    /**
     * 싱글톤 인스턴스 가져오기
     */
    static getInstance() {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }
    /**
     * 설정에서 로그 레벨 업데이트
     */
    updateLogLevel() {
        const config = vscode.workspace.getConfiguration('ape.system');
        const configLevel = config.get('logLevel', 'info');
        switch (configLevel.toLowerCase()) {
            case 'debug':
                this.logLevel = LogLevel.DEBUG;
                break;
            case 'info':
                this.logLevel = LogLevel.INFO;
                break;
            case 'warn':
                this.logLevel = LogLevel.WARN;
                break;
            case 'error':
                this.logLevel = LogLevel.ERROR;
                break;
            case 'none':
                this.logLevel = LogLevel.NONE;
                break;
            default:
                this.logLevel = LogLevel.INFO;
        }
        this.info(`로그 레벨이 ${configLevel.toUpperCase()}로 설정되었습니다.`);
    }
    /**
     * 디버그 로그 (가장 상세한 로그)
     * @param message 로그 메시지
     * @param data 추가 데이터 (선택 사항)
     */
    debug(message, data) {
        if (this.logLevel <= LogLevel.DEBUG) {
            this.log('DEBUG', message, data);
        }
    }
    /**
     * 정보 로그 (일반적인 작업 정보)
     * @param message 로그 메시지
     * @param data 추가 데이터 (선택 사항)
     */
    info(message, data) {
        if (this.logLevel <= LogLevel.INFO) {
            this.log('INFO', message, data);
        }
    }
    /**
     * 경고 로그 (잠재적 문제)
     * @param message 로그 메시지
     * @param data 추가 데이터 (선택 사항)
     */
    warn(message, data) {
        if (this.logLevel <= LogLevel.WARN) {
            this.log('WARN', message, data);
        }
    }
    /**
     * 오류 로그 (실패한 작업)
     * @param message 로그 메시지
     * @param error 에러 객체 또는 추가 데이터
     */
    error(message, error) {
        if (this.logLevel <= LogLevel.ERROR) {
            // 에러 객체가 있는 경우 상세 정보 추출
            let errorDetail = '';
            if (error instanceof Error) {
                errorDetail = `\n    Error: ${error.message}\n    Stack: ${error.stack || 'No stack trace'}`;
            }
            else if (error) {
                errorDetail = `\n    Detail: ${JSON.stringify(error, null, 2)}`;
            }
            this.log('ERROR', `${message}${errorDetail}`);
        }
    }
    /**
     * 내부 로그 메서드
     * @param level 로그 레벨
     * @param message 로그 메시지
     * @param data 추가 데이터 (선택 사항)
     */
    log(level, message, data) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level}] ${message}`;
        if (data && typeof data === 'object') {
            try {
                if (Object.keys(data).length > 0) {
                    this.outputChannel.appendLine(`${logMessage}\n${JSON.stringify(data, null, 2)}`);
                    return;
                }
            }
            catch (e) {
                // 객체 직렬화 실패 시 무시하고 계속 진행
            }
        }
        this.outputChannel.appendLine(logMessage);
    }
    /**
     * 출력 채널 표시
     */
    show() {
        this.outputChannel.show();
    }
    /**
     * 출력 채널 내용 지우기
     */
    clear() {
        this.outputChannel.clear();
    }
}
exports.Logger = Logger;
/**
 * 로거 싱글톤 인스턴스 (간편한 임포트를 위한 내보내기)
 */
exports.logger = Logger.getInstance();
//# sourceMappingURL=logger.js.map