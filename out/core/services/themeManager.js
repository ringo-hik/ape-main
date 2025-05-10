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
exports.ThemeManager = exports.ColorUtil = void 0;
const vscode = __importStar(require("vscode"));
/**
 * 색상 처리 유틸리티 함수들
 */
class ColorUtil {
    /**
     * HEX 색상을 RGB 컴포넌트로 변환
     */
    static hexToRgb(hex) {
        // Remove # if present
        hex = hex.replace(/^#/, '');
        // Handle both short and long form hex
        let r, g, b;
        if (hex.length === 3) {
            r = parseInt(hex.charAt(0) + hex.charAt(0), 16);
            g = parseInt(hex.charAt(1) + hex.charAt(1), 16);
            b = parseInt(hex.charAt(2) + hex.charAt(2), 16);
        }
        else if (hex.length === 6) {
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
        }
        else {
            return null; // Invalid hex
        }
        return { r, g, b };
    }
    /**
     * RGB 컴포넌트를 HEX 색상으로 변환
     */
    static rgbToHex(r, g, b) {
        return '#' + [r, g, b]
            .map(x => Math.max(0, Math.min(255, Math.round(x)))
            .toString(16)
            .padStart(2, '0'))
            .join('');
    }
    /**
     * 색상을 밝게 만듦 (lighten)
     * @param hex 원본 색상
     * @param amount 밝게 만들 양 (0-1)
     */
    static lighten(hex, amount) {
        const rgb = this.hexToRgb(hex);
        if (!rgb)
            return hex;
        const { r, g, b } = rgb;
        const factor = 1 + amount;
        return this.rgbToHex(r * factor, g * factor, b * factor);
    }
    /**
     * 색상을 어둡게 만듦 (darken)
     * @param hex 원본 색상
     * @param amount 어둡게 만들 양 (0-1)
     */
    static darken(hex, amount) {
        const rgb = this.hexToRgb(hex);
        if (!rgb)
            return hex;
        const { r, g, b } = rgb;
        const factor = 1 - amount;
        return this.rgbToHex(r * factor, g * factor, b * factor);
    }
    /**
     * RGBA 문자열 생성
     */
    static rgba(hex, alpha) {
        const rgb = this.hexToRgb(hex);
        if (!rgb)
            return `rgba(0, 0, 0, ${alpha})`;
        const { r, g, b } = rgb;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    /**
     * 단일 메인 색상에서 테마 색상 세트 생성
     */
    static generateColorsFromMain(mainColor) {
        return {
            primary: mainColor,
            secondary: this.lighten(mainColor, 0.15),
            tertiary: this.darken(mainColor, 0.2),
            borderHighlight: mainColor
        };
    }
}
exports.ColorUtil = ColorUtil;
/**
 * APE UI 테마 관리자
 * 색상 테마 관리 및 설정 변경 처리를 담당합니다.
 */
class ThemeManager {
    context;
    disposables = [];
    webviews = new Set();
    // 테마별 메인 색상 매핑 정의
    themeMainColors = {
        'default': 'var(--vscode-button-background, #0078D4)',
        'hermes-orange': '#FF5000',
        'vscode-blue': '#0078D4',
        'earth-green': '#2E7D32',
        'purple-dream': '#6A1B9A'
    };
    // 테마별 색상 매핑 정의 (메인 색상 기준 자동 계산)
    getThemeColorMapping(themeName) {
        const mainColor = this.themeMainColors[themeName] || this.themeMainColors['default'];
        // VSCode 변수를 사용하는 default 테마의 특수 처리
        if (themeName === 'default') {
            return {
                primary: mainColor,
                secondary: 'var(--vscode-button-hoverBackground, #0086F0)',
                tertiary: 'var(--vscode-editor-findMatchHighlightBackground, #EA5C0055)',
                borderHighlight: 'var(--vscode-focusBorder, #007FD4)'
            };
        }
        // 나머지 테마는 메인 색상에서 자동 계산
        return ColorUtil.generateColorsFromMain(mainColor);
    }
    constructor(context) {
        this.context = context;
        this.initialize();
    }
    /**
     * 테마 관리자 초기화
     */
    initialize() {
        // 설정 변경 이벤트 리스너 등록
        this.disposables.push(vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('ape.ui.colorTheme') ||
                e.affectsConfiguration('ape.ui.colors')) {
                this.updateThemeColors();
            }
        }));
        // 명령어 등록
        this.registerCommands();
    }
    /**
     * 웹뷰 등록
     * 테마 업데이트를 받을 웹뷰를 등록합니다.
     */
    registerWebview(webview) {
        this.webviews.add(webview);
        // 등록 시 즉시 현재 테마 색상 전송
        this.sendThemeColorsToWebview(webview);
    }
    /**
     * 웹뷰 등록 해제
     */
    unregisterWebview(webview) {
        this.webviews.delete(webview);
    }
    /**
     * 테마 명령어 등록
     */
    registerCommands() {
        // 테마 변경 명령어 등록
        this.disposables.push(vscode.commands.registerCommand('ape.selectTheme', async () => {
            const config = vscode.workspace.getConfiguration('ape');
            const currentTheme = config.get('ui.colorTheme', 'default');
            // 1단계: 미리 정의된 테마 선택 또는 사용자 정의 선택
            const themeItems = [
                { label: 'Default', description: 'VSCode 테마에 맞게 자동 조정', id: 'default' },
                { label: 'Hermes Orange', description: '에르메스 주황색 테마', id: 'hermes-orange' },
                { label: 'VSCode Blue', description: 'VSCode 파란색 테마', id: 'vscode-blue' },
                { label: 'Earth Green', description: '지구톤 녹색 테마', id: 'earth-green' },
                { label: 'Purple Dream', description: '보라색 꿈 테마', id: 'purple-dream' },
                { label: '✏️ Custom Color', description: '사용자 정의 메인 색상 선택', id: 'custom' }
            ];
            // 현재 선택된 테마 표시
            const selectedItem = themeItems.find(item => item.id === currentTheme);
            if (selectedItem) {
                selectedItem.description = `${selectedItem.description} (현재 선택됨)`;
            }
            const themeSelection = await vscode.window.showQuickPick(themeItems, {
                placeHolder: '색상 테마를 선택하세요',
                title: 'APE 색상 테마 선택'
            });
            if (!themeSelection)
                return;
            if (themeSelection.id === 'custom') {
                // 2단계: 사용자 정의 색상 선택 시, 색상 선택 UI 표시
                const currentMainColor = config.get('ui.mainColor', '#FF5000');
                // 색상 팔레트 (일반적인 웹용 색상)
                const colorPalette = [
                    { label: '🔴 빨강', color: '#FF0000', description: 'Red' },
                    { label: '🟠 주황', color: '#FF5000', description: 'Orange' },
                    { label: '🟡 노랑', color: '#FFCC00', description: 'Yellow' },
                    { label: '🟢 초록', color: '#00CC00', description: 'Green' },
                    { label: '🔵 파랑', color: '#0078D4', description: 'Blue' },
                    { label: '🟣 보라', color: '#8E24AA', description: 'Purple' },
                    { label: '🟤 갈색', color: '#8B4513', description: 'Brown' },
                    { label: '⚫ 검정', color: '#333333', description: 'Black' },
                    { label: '⚙️ 직접 입력', color: currentMainColor, description: '직접 색상코드 입력' }
                ];
                const colorSelection = await vscode.window.showQuickPick(colorPalette, {
                    placeHolder: '메인 색상을 선택하세요',
                    title: 'APE 메인 색상 선택'
                });
                if (!colorSelection)
                    return;
                let mainColor = colorSelection.color;
                // 직접 입력 옵션 선택 시
                if (colorSelection.label === '⚙️ 직접 입력') {
                    const customColor = await vscode.window.showInputBox({
                        prompt: 'HEX 색상 코드를 입력하세요 (예: #FF5000)',
                        placeHolder: '#FF5000',
                        value: currentMainColor
                    });
                    if (!customColor)
                        return;
                    // 유효한 HEX 색상 검증
                    if (!/^#[0-9A-Fa-f]{6}$/.test(customColor)) {
                        vscode.window.showErrorMessage('유효한 HEX 색상 코드를 입력하세요 (예: #FF5000)');
                        return;
                    }
                    mainColor = customColor;
                }
                // 테마 및 메인 색상 설정 업데이트
                await config.update('ui.colorTheme', 'custom', vscode.ConfigurationTarget.Global);
                await config.update('ui.mainColor', mainColor, vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage(`APE 테마가 '사용자 정의 (${mainColor})'(으)로 변경되었습니다.`);
            }
            else {
                // 미리 정의된 테마 선택 시 바로 적용
                await config.update('ui.colorTheme', themeSelection.id, vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage(`APE 테마가 '${themeSelection.label}'(으)로 변경되었습니다.`);
            }
            // 테마 변경 후 UI 업데이트
            this.updateThemeColors();
        }));
    }
    /**
     * 현재 테마 색상 가져오기
     */
    getCurrentThemeColors() {
        const config = vscode.workspace.getConfiguration('ape');
        const colorTheme = config.get('ui.colorTheme', 'default');
        if (colorTheme === 'custom') {
            // 사용자 정의 메인 색상 사용 (다른 색상은 자동 계산)
            const mainColor = config.get('ui.mainColor', '#FF5000');
            return ColorUtil.generateColorsFromMain(mainColor);
        }
        else {
            // 미리 정의된 테마 색상 사용
            return this.getThemeColorMapping(colorTheme);
        }
    }
    /**
     * 테마 색상 업데이트 및 모든 웹뷰에 알림
     */
    updateThemeColors() {
        const colors = this.getCurrentThemeColors();
        // 등록된 모든 웹뷰에 색상 업데이트 메시지 전송
        this.webviews.forEach(webview => {
            this.sendThemeColorsToWebview(webview, colors);
        });
    }
    /**
     * 웹뷰에 테마 색상 업데이트 메시지 전송
     */
    sendThemeColorsToWebview(webview, colors) {
        const themeColors = colors || this.getCurrentThemeColors();
        webview.postMessage({
            type: 'updateThemeColors',
            colors: themeColors
        });
    }
    /**
     * 리소스 해제
     */
    dispose() {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
        this.webviews.clear();
    }
}
exports.ThemeManager = ThemeManager;
//# sourceMappingURL=themeManager.js.map