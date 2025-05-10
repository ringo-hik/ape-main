"use strict";
/**
 * 명령어 인자 폼 제공자
 *
 * 슬래시 명령어의 인자 입력을 위한 하이브리드 UI 구현
 * 텍스트 입력과 GUI 컴포넌트를 결합하여 최적의 UX 제공
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
exports.CommandFormProvider = void 0;
const vscode = __importStar(require("vscode"));
/**
 * 명령어 인자 폼 제공자
 * 슬래시 명령어의 인자 입력을 위한 폼 UI를 제공합니다.
 */
class CommandFormProvider {
    _context;
    // Webview 패널
    _panel;
    // 현재 명령어 상태
    _state = {
        command: null,
        values: {},
        isValid: false,
        errors: {}
    };
    // 이벤트 이미터
    _onDidSubmitForm = new vscode.EventEmitter();
    // 폼 제출 이벤트
    onDidSubmitForm = this._onDidSubmitForm.event;
    // 폼 취소 이벤트
    _onDidCancelForm = new vscode.EventEmitter();
    onDidCancelForm = this._onDidCancelForm.event;
    /**
     * 생성자
     */
    constructor(_context) {
        this._context = _context;
    }
    /**
     * 특정 명령어에 대한 인자 폼 표시
     */
    showFormForCommand(command, initialValues) {
        // 현재 패널이 있으면 닫음
        if (this._panel) {
            this._panel.dispose();
        }
        // 초기 상태 설정
        this._state = {
            command,
            values: initialValues || {},
            isValid: false,
            errors: {}
        };
        // 패널 생성
        this._panel = vscode.window.createWebviewPanel('apeCommandForm', `/${command.name} 명령어 인자`, vscode.ViewColumn.Beside, {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this._context.extensionUri, 'media')
            ]
        });
        // 웹뷰 HTML 설정
        this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);
        // 메시지 핸들러 설정
        this._panel.webview.onDidReceiveMessage(this._handleMessage.bind(this));
        // 패널 닫힘 이벤트
        this._panel.onDidDispose(() => {
            this._panel = undefined;
        });
    }
    /**
     * 인자 폼을 인라인 컴포넌트로 렌더링할 HTML 반환
     * (chatViewProvider에서 사용)
     */
    getInlineFormHtml(command, initialValues) {
        // 명령어에 정의된 인자가 없는 경우
        if (!command.args || command.args.length === 0) {
            return '';
        }
        const mainStylesUri = this._getMediaUri('chat-ape.css');
        // 인라인 폼 HTML 생성
        return `
      <div class="command-form-inline" data-command="${command.name}">
        <div class="command-form-header">
          <h3>/${command.name}</h3>
          <p class="form-description">${command.description}</p>
        </div>
        <div class="command-form-fields">
          ${this._renderFormFields(command.args, initialValues || {})}
        </div>
        <div class="command-form-actions">
          <button class="command-form-submit">실행</button>
          <button class="command-form-cancel">취소</button>
        </div>
      </div>
    `;
    }
    /**
     * 웹뷰를 위한 HTML 생성
     */
    _getHtmlForWebview(webview) {
        // 미디어 URI 가져오기
        const mainStylesUri = this._getMediaUri('chat-ape.css');
        const codiconsUri = this._getMediaUri('codicon/codicon.css');
        const nonce = this._getNonce();
        // HTML 템플릿 반환
        return `<!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; img-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
      <link href="${mainStylesUri}" rel="stylesheet">
      <link href="${codiconsUri}" rel="stylesheet">
      <title>명령어 인자 입력</title>
      <style>
        .command-form {
          max-width: 500px;
          margin: 20px auto;
          padding: 20px;
          background-color: var(--ape-bg-secondary);
          border-radius: var(--ape-border-radius-md);
          border-left: 4px solid var(--ape-border-highlight);
        }
        
        .command-form-header {
          margin-bottom: 20px;
        }
        
        .command-form-header h2 {
          margin-top: 0;
          color: var(--ape-text-accent);
        }
        
        .command-form-fields {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .form-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .form-field label {
          font-size: 13px;
          font-weight: 500;
          color: var(--ape-text-secondary);
        }
        
        .form-field-required {
          color: var(--ape-accent-primary);
          margin-left: 4px;
        }
        
        .form-field input, .form-field select, .form-field textarea {
          background-color: var(--ape-bg-tertiary);
          border: 1px solid var(--ape-border-subtle);
          border-radius: var(--ape-border-radius-sm);
          padding: 6px 10px;
          color: var(--ape-text-primary);
          font-size: 13px;
        }
        
        .form-field input:focus, .form-field select:focus, .form-field textarea:focus {
          outline: none;
          border-color: var(--ape-accent-primary);
        }
        
        .error-message {
          color: var(--ape-text-error);
          font-size: 12px;
          margin-top: 4px;
        }
        
        .command-form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 20px;
        }
        
        button {
          padding: 6px 12px;
          border-radius: var(--ape-border-radius-sm);
          font-size: 13px;
          cursor: pointer;
          transition: all var(--ape-transition-fast);
        }
        
        .command-form-submit {
          background-color: var(--ape-accent-primary);
          color: white;
          border: none;
        }
        
        .command-form-submit:hover {
          background-color: var(--ape-accent-secondary);
        }
        
        .command-form-cancel {
          background-color: transparent;
          border: 1px solid var(--ape-border-strong);
          color: var(--ape-text-primary);
        }
        
        .command-form-cancel:hover {
          background-color: var(--ape-bg-hover);
        }
        
        .checkbox-field {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 8px;
        }
        
        .checkbox-field input {
          margin: 0;
        }
        
        .file-field {
          display: flex;
          gap: 8px;
        }
        
        .file-field input {
          flex: 1;
        }
        
        .file-field button {
          padding: 6px 10px;
          background-color: var(--ape-bg-tertiary);
          border: 1px solid var(--ape-border-strong);
          color: var(--ape-text-secondary);
        }
      </style>
    </head>
    <body>
      <div class="command-form">
        <div class="command-form-header">
          <h2>/${this._state.command.name}</h2>
          <p>${this._state.command.description}</p>
        </div>
        <div class="command-form-fields" id="form-fields">
          ${this._renderFormFields((this._state.command.args || []), this._state.values)}
        </div>
        <div class="command-form-actions">
          <button class="command-form-submit" id="submit-button">실행</button>
          <button class="command-form-cancel" id="cancel-button">취소</button>
        </div>
      </div>
      
      <script nonce="${nonce}">
        (function() {
          const vscode = acquireVsCodeApi();
          
          // 폼 필드 값 변경 이벤트 처리
          document.addEventListener('input', event => {
            const target = event.target;
            if (!target.name) return;
            
            const value = target.type === 'checkbox' ? target.checked : target.value;
            
            // 값 변경 알림
            vscode.postMessage({
              type: 'valueChanged',
              name: target.name,
              value: value
            });
          });
          
          // 제출 버튼 클릭 이벤트
          document.getElementById('submit-button').addEventListener('click', () => {
            vscode.postMessage({ type: 'submit' });
          });
          
          // 취소 버튼 클릭 이벤트
          document.getElementById('cancel-button').addEventListener('click', () => {
            vscode.postMessage({ type: 'cancel' });
          });
          
          // 파일 선택 버튼 이벤트
          document.querySelectorAll('.file-browse-button').forEach(button => {
            button.addEventListener('click', () => {
              const fieldName = button.getAttribute('data-field');
              vscode.postMessage({
                type: 'browsePath',
                fieldName: fieldName,
                fieldType: button.getAttribute('data-type') // 'file' 또는 'folder'
              });
            });
          });
        })();
      </script>
    </body>
    </html>`;
    }
    /**
     * 인자 폼 필드 HTML 렌더링
     */
    _renderFormFields(args, values) {
        if (!args || args.length === 0) {
            return '<p>이 명령어는 인자가 필요하지 않습니다.</p>';
        }
        return args.map(arg => {
            const value = values[arg.name] !== undefined ? values[arg.name] : arg.defaultValue || '';
            const errorMsg = this._state.errors[arg.name] || '';
            return this._renderField(arg, value, errorMsg);
        }).join('');
    }
    /**
     * 개별 폼 필드 렌더링
     */
    _renderField(arg, value, errorMsg) {
        const requiredMark = arg.required ? '<span class="form-field-required">*</span>' : '';
        const errorHtml = errorMsg ? `<div class="error-message">${errorMsg}</div>` : '';
        switch (arg.type) {
            case 'text':
                return `
          <div class="form-field">
            <label for="${arg.name}">${arg.name}${requiredMark}</label>
            <input type="text" id="${arg.name}" name="${arg.name}" value="${value}" 
              placeholder="${arg.description}" ${arg.required ? 'required' : ''}>
            ${errorHtml}
          </div>
        `;
            case 'number':
                const min = arg.validation?.min !== undefined ? `min="${arg.validation.min}"` : '';
                const max = arg.validation?.max !== undefined ? `max="${arg.validation.max}"` : '';
                return `
          <div class="form-field">
            <label for="${arg.name}">${arg.name}${requiredMark}</label>
            <input type="number" id="${arg.name}" name="${arg.name}" value="${value}" 
              ${min} ${max} placeholder="${arg.description}" ${arg.required ? 'required' : ''}>
            ${errorHtml}
          </div>
        `;
            case 'select':
                const options = (arg.options || []).map(opt => `<option value="${opt.value}" ${value === opt.value ? 'selected' : ''}>${opt.label}</option>`).join('');
                return `
          <div class="form-field">
            <label for="${arg.name}">${arg.name}${requiredMark}</label>
            <select id="${arg.name}" name="${arg.name}" ${arg.required ? 'required' : ''}>
              <option value="" disabled ${!value ? 'selected' : ''}>선택...</option>
              ${options}
            </select>
            ${errorHtml}
          </div>
        `;
            case 'checkbox':
                return `
          <div class="form-field checkbox-field">
            <input type="checkbox" id="${arg.name}" name="${arg.name}" ${value ? 'checked' : ''}>
            <label for="${arg.name}">${arg.name}</label>
            ${errorHtml}
          </div>
        `;
            case 'file':
            case 'folder':
                return `
          <div class="form-field">
            <label for="${arg.name}">${arg.name}${requiredMark}</label>
            <div class="file-field">
              <input type="text" id="${arg.name}" name="${arg.name}" value="${value}" 
                placeholder="${arg.description}" ${arg.required ? 'required' : ''}>
              <button type="button" class="file-browse-button" data-field="${arg.name}" data-type="${arg.type}">
                찾기...
              </button>
            </div>
            ${errorHtml}
          </div>
        `;
            case 'date':
                return `
          <div class="form-field">
            <label for="${arg.name}">${arg.name}${requiredMark}</label>
            <input type="date" id="${arg.name}" name="${arg.name}" value="${value}" 
              placeholder="${arg.description}" ${arg.required ? 'required' : ''}>
            ${errorHtml}
          </div>
        `;
            default:
                return `
          <div class="form-field">
            <label for="${arg.name}">${arg.name}${requiredMark}</label>
            <input type="text" id="${arg.name}" name="${arg.name}" value="${value}" 
              placeholder="${arg.description}" ${arg.required ? 'required' : ''}>
            ${errorHtml}
          </div>
        `;
        }
    }
    /**
     * 웹뷰 메시지 핸들러
     */
    _handleMessage(message) {
        switch (message.type) {
            case 'valueChanged':
                this._updateFieldValue(message.name, message.value);
                break;
            case 'submit':
                this._submitForm();
                break;
            case 'cancel':
                this._cancelForm();
                break;
            case 'browsePath':
                this._browsePath(message.fieldName, message.fieldType);
                break;
        }
    }
    /**
     * 필드 값 업데이트
     */
    _updateFieldValue(name, value) {
        this._state.values[name] = value;
        this._validateForm();
    }
    /**
     * 폼 유효성 검사
     */
    _validateForm() {
        const command = this._state.command;
        const args = command.args || [];
        const errors = {};
        args.forEach(arg => {
            const value = this._state.values[arg.name];
            // 필수 필드 검사
            if (arg.required && (value === undefined || value === null || value === '')) {
                errors[arg.name] = '이 필드는 필수입니다';
                return;
            }
            // 값이 없으면 더 이상 검사 필요 없음
            if (value === undefined || value === null || value === '') {
                return;
            }
            // 타입별 유효성 검사
            if (arg.validation) {
                // 패턴 검사
                if (arg.validation.pattern && arg.type === 'text') {
                    const regex = new RegExp(arg.validation.pattern);
                    if (!regex.test(String(value))) {
                        errors[arg.name] = arg.validation.errorMessage || '유효하지 않은 형식입니다';
                    }
                }
                // 숫자 범위 검사
                if (arg.type === 'number') {
                    const numValue = Number(value);
                    if (isNaN(numValue)) {
                        errors[arg.name] = '유효한 숫자를 입력하세요';
                    }
                    else {
                        if (arg.validation.min !== undefined && numValue < arg.validation.min) {
                            errors[arg.name] = `${arg.validation.min} 이상의 값을 입력하세요`;
                        }
                        if (arg.validation.max !== undefined && numValue > arg.validation.max) {
                            errors[arg.name] = `${arg.validation.max} 이하의 값을 입력하세요`;
                        }
                    }
                }
            }
        });
        // 상태 업데이트
        this._state.errors = errors;
        this._state.isValid = Object.keys(errors).length === 0;
        // UI 업데이트가 필요하지만 현재 구현에서는 생략 (실제로는 필요)
    }
    /**
     * 폼 제출 처리
     */
    _submitForm() {
        // 유효성 검사
        this._validateForm();
        if (!this._state.isValid) {
            // 오류가 있는 경우 처리
            // 실제 구현에서는 UI에 오류 표시 업데이트
            return;
        }
        // 정상적인 제출
        this._onDidSubmitForm.fire({
            command: this._state.command.name,
            args: this._state.values
        });
        // 폼 닫기
        if (this._panel) {
            this._panel.dispose();
        }
    }
    /**
     * 폼 취소 처리
     */
    _cancelForm() {
        this._onDidCancelForm.fire();
        // 폼 닫기
        if (this._panel) {
            this._panel.dispose();
        }
    }
    /**
     * 파일/폴더 선택 다이얼로그 표시
     */
    async _browsePath(fieldName, fieldType) {
        try {
            const options = {
                canSelectFiles: fieldType === 'file',
                canSelectFolders: fieldType === 'folder',
                canSelectMany: false,
                openLabel: '선택'
            };
            const result = await vscode.window.showOpenDialog(options);
            if (result && result.length > 0) {
                const path = result[0].fsPath;
                // 상태 업데이트
                this._state.values[fieldName] = path;
                // 웹뷰에 업데이트 전송 (실제로는 필요)
                if (this._panel) {
                    this._panel.webview.postMessage({
                        type: 'updateFieldValue',
                        name: fieldName,
                        value: path
                    });
                }
            }
        }
        catch (error) {
            console.error('파일 선택 오류:', error);
        }
    }
    /**
     * 미디어 URI 가져오기
     */
    _getMediaUri(filename) {
        return this._panel?.webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'media', filename)) || vscode.Uri.parse('');
    }
    /**
     * Nonce 생성 (보안)
     */
    _getNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
    /**
     * 리소스 정리
     */
    dispose() {
        // 패널 닫기
        if (this._panel) {
            this._panel.dispose();
            this._panel = undefined;
        }
        // 이벤트 에미터 정리
        this._onDidSubmitForm.dispose();
        this._onDidCancelForm.dispose();
    }
}
exports.CommandFormProvider = CommandFormProvider;
//# sourceMappingURL=commandFormProvider.js.map