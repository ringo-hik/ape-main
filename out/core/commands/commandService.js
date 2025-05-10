"use strict";
/**
 * 명령어 서비스
 *
 * CLI/GUI 하이브리드 명령어 처리를 담당하는 서비스
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
exports.CommandService = void 0;
const vscode = __importStar(require("vscode"));
const commandFormProvider_1 = require("../../ui/command/commandFormProvider");
/**
 * 슬래시 명령어 서비스 클래스
 * GUI/CLI 하이브리드 접근을 제공합니다.
 */
class CommandService {
    _context;
    _commandManager;
    // 명령어 폼 제공자
    _formProvider;
    /**
     * 생성자
     */
    constructor(_context, _commandManager) {
        this._context = _context;
        this._commandManager = _commandManager;
        // 폼 제공자 초기화
        this._formProvider = new commandFormProvider_1.CommandFormProvider(this._context);
        // 폼 제출 이벤트 처리
        this._formProvider.onDidSubmitForm(this._handleFormSubmit.bind(this));
        // 폼 취소 이벤트는 특별한 처리 없음
        this._formProvider.onDidCancelForm(() => { });
    }
    /**
     * 리소스 정리를 위한 dispose 메서드
     */
    dispose() {
        // 폼 제공자 정리
        if (this._formProvider) {
            this._formProvider.dispose();
        }
    }
    /**
     * 명령어 실행
     *
     * CLI와 GUI를 모두 지원하는 하이브리드 방식으로 명령어를 실행합니다.
     */
    async executeCommand(commandText) {
        // 슬래시 체크
        if (!commandText.startsWith('/')) {
            return false;
        }
        // 명령어 파싱
        const parts = commandText.substring(1).split(/\s+/);
        const commandName = parts[0];
        const args = parts.slice(1);
        // 명령어 찾기
        const command = this._commandManager.getCommand(commandName);
        if (!command) {
            return false;
        }
        // UI 모드 결정
        const uiMode = this._determineUIMode(command, args);
        // UI 모드에 따라 실행
        if (uiMode === 'form') {
            // 폼 UI 모드: 인자 입력 폼 표시
            await this._showCommandForm(command);
            return true;
        }
        else {
            // 텍스트 모드: 기존 방식으로 직접 실행
            return this._executeCommandDirectly(command, commandText, args);
        }
    }
    /**
     * 인라인 폼 HTML 가져오기
     * 채팅 UI에서 인라인으로 표시할 때 사용
     */
    getInlineFormHtml(commandName) {
        const command = this._commandManager.getCommand(commandName);
        if (!command) {
            return null;
        }
        return this._formProvider.getInlineFormHtml(command);
    }
    /**
     * UI 모드 결정
     * 명령어와 인자에 따라 적절한 UI 모드를 결정합니다.
     */
    _determineUIMode(command, args) {
        // 명령어가 명시적으로 UI 모드를 지정한 경우
        if (command.uiMode === 'text') {
            return 'text';
        }
        if (command.uiMode === 'form') {
            return 'form';
        }
        // Auto 모드 또는 지정되지 않은 경우
        // 인자 정의가 있고, 필수 인자가 있는 경우 폼 모드 사용
        if (command.args && command.args.length > 0) {
            // 필수 인자 여부 확인
            const hasRequiredArgs = command.args.some(arg => arg.required);
            // 복잡한 인자 타입 여부 확인
            const hasComplexArgs = command.args.some(arg => arg.type === 'file' || arg.type === 'folder' ||
                arg.type === 'select' || arg.type === 'date');
            // 필수 인자가 있거나 복잡한 인자 타입이 있으면 폼 모드
            if (hasRequiredArgs || hasComplexArgs) {
                // 단, 모든 필수 인자가 이미 제공된 경우는 텍스트 모드 유지
                if (hasRequiredArgs) {
                    const requiredArgs = command.args.filter(arg => arg.required);
                    if (requiredArgs.length <= args.length) {
                        return 'text';
                    }
                }
                return 'form';
            }
        }
        // 기본값은 텍스트 모드
        return 'text';
    }
    /**
     * 명령어 폼 표시
     */
    async _showCommandForm(command) {
        // 초기 인자 값 (향후 명령줄에서 전달된 인자를 파싱하여 설정 가능)
        const initialValues = {};
        // 폼 표시
        this._formProvider.showFormForCommand(command, initialValues);
    }
    /**
     * 폼 제출 처리
     */
    async _handleFormSubmit(data) {
        // 명령어 찾기
        const command = this._commandManager.getCommand(data.command);
        if (!command) {
            return;
        }
        // 명령어 실행 컨텍스트 생성
        const context = {
            extensionContext: this._context,
            args: this._convertArgsToArray(command, data.args),
            originalInput: this._buildCommandString(command.name, data.args)
        };
        // 명령어 실행
        try {
            await command.execute(context);
        }
        catch (error) {
            vscode.window.showErrorMessage(`명령어 실행 오류: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * 기존 방식으로 명령어 직접 실행
     */
    async _executeCommandDirectly(command, commandText, args) {
        // 명령어 실행 컨텍스트 생성
        const context = {
            extensionContext: this._context,
            args,
            originalInput: commandText
        };
        // 명령어 실행
        try {
            await command.execute(context);
            return true;
        }
        catch (error) {
            vscode.window.showErrorMessage(`명령어 실행 오류: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    }
    /**
     * 객체 형태의 인자를 배열로 변환
     */
    _convertArgsToArray(command, argsObject) {
        if (!command.args) {
            return [];
        }
        // 인자 배열 생성
        return command.args.map(arg => {
            const value = argsObject[arg.name];
            // 값이 없으면 빈 문자열
            if (value === undefined || value === null) {
                return '';
            }
            // 불리언 값 처리
            if (typeof value === 'boolean') {
                return value ? 'true' : 'false';
            }
            // 그 외에는 문자열로 변환
            return String(value);
        });
    }
    /**
     * 명령어 문자열 생성
     */
    _buildCommandString(commandName, args) {
        let result = `/${commandName}`;
        // 인자 추가
        const argStrings = Object.entries(args).map(([name, value]) => {
            // 값이 없으면 생략
            if (value === undefined || value === null || value === '') {
                return '';
            }
            // 공백이 포함된 경우 따옴표로 묶기
            const valueStr = String(value);
            if (valueStr.includes(' ')) {
                return `"${valueStr}"`;
            }
            return valueStr;
        }).filter(Boolean);
        // 인자가 있으면 추가
        if (argStrings.length > 0) {
            result += ' ' + argStrings.join(' ');
        }
        return result;
    }
}
exports.CommandService = CommandService;
//# sourceMappingURL=commandService.js.map