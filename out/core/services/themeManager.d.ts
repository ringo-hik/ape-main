import * as vscode from 'vscode';
/**
 * 테마 색상 인터페이스
 */
export interface ThemeColors {
    primary: string;
    secondary: string;
    tertiary: string;
    borderHighlight: string;
}
/**
 * 색상 처리 유틸리티 함수들
 */
export declare class ColorUtil {
    /**
     * HEX 색상을 RGB 컴포넌트로 변환
     */
    static hexToRgb(hex: string): {
        r: number;
        g: number;
        b: number;
    } | null;
    /**
     * RGB 컴포넌트를 HEX 색상으로 변환
     */
    static rgbToHex(r: number, g: number, b: number): string;
    /**
     * 색상을 밝게 만듦 (lighten)
     * @param hex 원본 색상
     * @param amount 밝게 만들 양 (0-1)
     */
    static lighten(hex: string, amount: number): string;
    /**
     * 색상을 어둡게 만듦 (darken)
     * @param hex 원본 색상
     * @param amount 어둡게 만들 양 (0-1)
     */
    static darken(hex: string, amount: number): string;
    /**
     * RGBA 문자열 생성
     */
    static rgba(hex: string, alpha: number): string;
    /**
     * 단일 메인 색상에서 테마 색상 세트 생성
     */
    static generateColorsFromMain(mainColor: string): ThemeColors;
}
/**
 * APE UI 테마 관리자
 * 색상 테마 관리 및 설정 변경 처리를 담당합니다.
 */
export declare class ThemeManager implements vscode.Disposable {
    private readonly context;
    private disposables;
    private webviews;
    private themeMainColors;
    private getThemeColorMapping;
    constructor(context: vscode.ExtensionContext);
    /**
     * 테마 관리자 초기화
     */
    private initialize;
    /**
     * 웹뷰 등록
     * 테마 업데이트를 받을 웹뷰를 등록합니다.
     */
    registerWebview(webview: vscode.Webview): void;
    /**
     * 웹뷰 등록 해제
     */
    unregisterWebview(webview: vscode.Webview): void;
    /**
     * 테마 명령어 등록
     */
    private registerCommands;
    /**
     * 현재 테마 색상 가져오기
     */
    getCurrentThemeColors(): ThemeColors;
    /**
     * 테마 색상 업데이트 및 모든 웹뷰에 알림
     */
    private updateThemeColors;
    /**
     * 웹뷰에 테마 색상 업데이트 메시지 전송
     */
    private sendThemeColorsToWebview;
    /**
     * 리소스 해제
     */
    dispose(): void;
}
