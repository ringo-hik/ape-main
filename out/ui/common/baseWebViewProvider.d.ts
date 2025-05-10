import * as vscode from 'vscode';
/**
 * 모든 웹뷰 프로바이더의 기본 클래스
 * 웹뷰 HTML 생성 및 공통 기능을 제공하는 추상 클래스
 */
export declare abstract class BaseWebViewProvider {
    protected readonly _context: vscode.ExtensionContext;
    protected _view?: vscode.WebviewView | vscode.WebviewPanel;
    constructor(_context: vscode.ExtensionContext);
    /**
     * 웹뷰 HTML 생성 (템플릿 메서드 패턴)
     * 자식 클래스에서 필요한 메타데이터를 제공하여 HTML 생성
     */
    protected getWebviewHtml(webview: vscode.Webview): string;
    /**
     * CSP 정책 얻기 (자식 클래스에서 재정의 가능)
     */
    protected getContentSecurityPolicy(webview: vscode.Webview, nonce: string): string;
    /**
     * 언어 설정 (자식 클래스에서 재정의 가능)
     */
    protected getLanguage(): string;
    /**
     * 제목 설정 (자식 클래스에서 재정의 필요)
     */
    protected abstract getTitle(): string;
    /**
     * 스타일시트 URI 목록 (자식 클래스에서 재정의 가능)
     */
    protected getStylesheets(webview: vscode.Webview): vscode.Uri[];
    /**
     * 스크립트 URI 목록 (자식 클래스에서 재정의 가능)
     */
    protected getScripts(webview: vscode.Webview): vscode.Uri[];
    /**
     * 바디 콘텐츠 (자식 클래스에서 재정의 필요)
     */
    protected abstract getBodyContent(): string;
    /**
     * 웹뷰로 메시지 전송
     */
    protected sendMessageToWebview(message: any): void;
    /**
     * 웹뷰 리소스 URI 반환
     */
    getWebviewResource(uri: vscode.Uri): vscode.Uri | null;
    /**
     * 웹뷰 현재 상태 확인
     */
    isWebviewVisible(): boolean;
}
