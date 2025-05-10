import * as vscode from 'vscode';
/**
 * Content Security Policy 관리 클래스
 * 모든 웹뷰에서 사용할 일관된 CSP 정책 생성 및 관리
 */
export declare class CSPManager {
    /**
     * 기본 CSP 정책 생성
     * 가장 엄격한 기본 정책 (최소 권한 원칙)
     */
    static getBaseCSP(webview: vscode.Webview, nonce: string): string;
    /**
     * 표준 CSP 정책 생성
     * 대부분의 웹뷰에서 사용할 표준 정책
     */
    static getStandardCSP(webview: vscode.Webview, nonce: string): string;
    /**
     * 고급 CSP 정책 생성
     * 필요한 경우 추가 권한 설정 가능
     */
    static getEnhancedCSP(webview: vscode.Webview, nonce: string, options?: {
        allowEval?: boolean;
        allowUnsafeInline?: boolean;
        allowExternalConnections?: boolean;
        additionalStyleSources?: string[];
        additionalScriptSources?: string[];
        additionalConnectSources?: string[];
    }): string;
    /**
     * nonce 생성 유틸리티 함수
     */
    static generateNonce(): string;
}
