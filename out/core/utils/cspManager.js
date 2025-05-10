"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSPManager = void 0;
/**
 * Content Security Policy 관리 클래스
 * 모든 웹뷰에서 사용할 일관된 CSP 정책 생성 및 관리
 */
class CSPManager {
    /**
     * 기본 CSP 정책 생성
     * 가장 엄격한 기본 정책 (최소 권한 원칙)
     */
    static getBaseCSP(webview, nonce) {
        return [
            "default-src 'none'",
            `style-src ${webview.cspSource}`,
            `font-src ${webview.cspSource}`,
            `img-src ${webview.cspSource}`,
            `script-src 'nonce-${nonce}'`
        ].join('; ');
    }
    /**
     * 표준 CSP 정책 생성
     * 대부분의 웹뷰에서 사용할 표준 정책
     */
    static getStandardCSP(webview, nonce) {
        return [
            "default-src 'none'",
            `style-src ${webview.cspSource} 'unsafe-inline'`,
            `font-src ${webview.cspSource} data:`,
            `img-src ${webview.cspSource} https: data:`,
            `script-src ${webview.cspSource} 'nonce-${nonce}'`,
            `connect-src ${webview.cspSource}`
        ].join('; ');
    }
    /**
     * 고급 CSP 정책 생성
     * 필요한 경우 추가 권한 설정 가능
     */
    static getEnhancedCSP(webview, nonce, options = {}) {
        // 기본 정책 구성
        const policies = {
            "default-src": ["'none'"],
            "style-src": [webview.cspSource, "'unsafe-inline'"],
            "font-src": [webview.cspSource, "data:"],
            "img-src": [webview.cspSource, "https:", "data:"],
            "script-src": [webview.cspSource, `'nonce-${nonce}'`],
            "connect-src": [webview.cspSource]
        };
        // 옵션에 따라 정책 확장
        if (options.allowEval) {
            policies["script-src"].push("'unsafe-eval'");
        }
        if (options.allowUnsafeInline) {
            policies["script-src"].push("'unsafe-inline'");
        }
        if (options.allowExternalConnections) {
            policies["connect-src"].push("https:", "data:");
        }
        // 추가 소스 설정
        if (options.additionalStyleSources) {
            policies["style-src"].push(...options.additionalStyleSources);
        }
        if (options.additionalScriptSources) {
            policies["script-src"].push(...options.additionalScriptSources);
        }
        if (options.additionalConnectSources) {
            policies["connect-src"].push(...options.additionalConnectSources);
        }
        // CSP 문자열로 변환
        return Object.entries(policies)
            .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
            .join('; ');
    }
    /**
     * nonce 생성 유틸리티 함수
     */
    static generateNonce() {
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let nonce = '';
        for (let i = 0; i < 32; i++) {
            nonce += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return nonce;
    }
}
exports.CSPManager = CSPManager;
//# sourceMappingURL=cspManager.js.map