"use strict";
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
exports.BaseWebViewProvider = void 0;
const vscode = __importStar(require("vscode"));
const cspManager_1 = require("../../core/utils/cspManager");
/**
 * 모든 웹뷰 프로바이더의 기본 클래스
 * 웹뷰 HTML 생성 및 공통 기능을 제공하는 추상 클래스
 */
class BaseWebViewProvider {
    _context;
    _view;
    constructor(_context) {
        this._context = _context;
    }
    /**
     * 웹뷰 HTML 생성 (템플릿 메서드 패턴)
     * 자식 클래스에서 필요한 메타데이터를 제공하여 HTML 생성
     */
    getWebviewHtml(webview) {
        const nonce = cspManager_1.CSPManager.generateNonce();
        const csp = this.getContentSecurityPolicy(webview, nonce);
        const styles = this.getStylesheets(webview);
        const scripts = this.getScripts(webview);
        return `<!DOCTYPE html>
    <html lang="${this.getLanguage()}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="${csp}">
      <title>${this.getTitle()}</title>
      ${styles.map(uri => `<link href="${uri}" rel="stylesheet">`).join('\n      ')}
    </head>
    <body>
      ${this.getBodyContent()}
      
      ${scripts.map(uri => `<script src="${uri}" nonce="${nonce}"></script>`).join('\n      ')}
    </body>
    </html>`;
    }
    /**
     * CSP 정책 얻기 (자식 클래스에서 재정의 가능)
     */
    getContentSecurityPolicy(webview, nonce) {
        return cspManager_1.CSPManager.getStandardCSP(webview, nonce);
    }
    /**
     * 언어 설정 (자식 클래스에서 재정의 가능)
     */
    getLanguage() {
        return 'en';
    }
    /**
     * 스타일시트 URI 목록 (자식 클래스에서 재정의 가능)
     */
    getStylesheets(webview) {
        return [
            webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'media', 'chat-ape.css'))
        ];
    }
    /**
     * 스크립트 URI 목록 (자식 클래스에서 재정의 가능)
     */
    getScripts(webview) {
        return [
            webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'media', 'js', 'common', 'vscode-utils.js'))
        ];
    }
    /**
     * 웹뷰로 메시지 전송
     */
    sendMessageToWebview(message) {
        if (this._view && 'webview' in this._view) {
            this._view.webview.postMessage(message);
        }
    }
    /**
     * 웹뷰 리소스 URI 반환
     */
    getWebviewResource(uri) {
        if (!this._view || !('webview' in this._view)) {
            return null;
        }
        return this._view.webview.asWebviewUri(uri);
    }
    /**
     * 웹뷰 현재 상태 확인
     */
    isWebviewVisible() {
        return !!this._view && ('visible' in this._view ? this._view.visible : true);
    }
}
exports.BaseWebViewProvider = BaseWebViewProvider;
//# sourceMappingURL=baseWebViewProvider.js.map