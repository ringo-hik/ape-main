import * as vscode from 'vscode';
/**
 * 웹뷰 HTML 헤더 생성
 * @param webview VSCode 웹뷰
 * @param extensionUri 확장 URI
 * @param nonce 보안 nonce
 * @returns 웹뷰 HTML 헤더
 */
export declare function generateHtmlHeader(webview: vscode.Webview, extensionUri: vscode.Uri, nonce: string): string;
/**
 * UI 구성 요소 HTML 생성
 * @param webview VSCode 웹뷰
 * @param extensionUri 확장 URI
 * @param minimal 미니멀 UI 모드 (true: 간소화된 UI, false: 전체 UI)
 * @returns UI 구성 요소 HTML
 */
export declare function generateChatUiHtml(webview: vscode.Webview, extensionUri: vscode.Uri, minimal?: boolean): string;
