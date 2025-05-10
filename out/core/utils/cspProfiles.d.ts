import * as vscode from 'vscode';
/**
 * 자주 사용되는 CSP 프로필 정의
 * 각 웹뷰 타입별로 최적화된 CSP 정책 제공
 */
export declare const CSPProfiles: {
    /**
     * 기본 프로필 (가장 엄격)
     * 최소한의 필수 권한만 허용
     */
    getBasic(webview: vscode.Webview, nonce: string): string;
    /**
     * 표준 웹뷰 프로필
     * 대부분의 웹뷰에서 사용할 수 있는 기본 권한 설정
     */
    getStandard(webview: vscode.Webview, nonce: string): string;
    /**
     * 채팅 인터페이스 프로필
     * LLM 상호작용과 채팅 UI에 필요한 권한 추가
     */
    getChatView(webview: vscode.Webview, nonce: string): string;
    /**
     * 모델 설정 프로필
     * 모델 관리 웹뷰에 필요한 권한 설정
     */
    getModelView(webview: vscode.Webview, nonce: string): string;
    /**
     * 웰컴 화면 프로필
     * 웰컴 화면에 필요한 기본 권한 설정
     */
    getWelcomeView(webview: vscode.Webview, nonce: string): string;
    /**
     * 설정 인터페이스 프로필
     * 설정 화면에 필요한 권한 설정
     */
    getSettingsView(webview: vscode.Webview, nonce: string): string;
    /**
     * 명령어 폼 프로필
     * 슬래시 명령어 폼에 필요한 권한 설정
     */
    getCommandFormView(webview: vscode.Webview, nonce: string): string;
    /**
     * 테스트용 프로필
     * 테스트 웹뷰에 필요한 권한 설정
     */
    getTestView(webview: vscode.Webview, nonce: string): string;
};
