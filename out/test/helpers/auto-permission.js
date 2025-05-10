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
exports.autoPermissionHandler = exports.AutoPermissionHandler = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * VSCode 확장에서 권한 요청을 자동으로 처리하는 헬퍼 클래스
 * 권한 요청 다이얼로그를 자동으로 수락하거나 무시합니다.
 */
class AutoPermissionHandler {
    static instance;
    disposables = [];
    permissionConfig;
    constructor() {
        try {
            // 권한 설정 파일 로드
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
            const configPath = path.join(workspaceRoot, 'auth-permissions.json');
            if (fs.existsSync(configPath)) {
                this.permissionConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                console.log('권한 설정 파일 로드됨:', configPath);
            }
            else {
                this.permissionConfig = {};
                console.log('권한 설정 파일을 찾을 수 없음. 기본 설정 사용');
            }
            // VSCode 환경에 권한 자동 처리 설정
            this.setupAutoPermissions();
        }
        catch (error) {
            console.error('권한 핸들러 초기화 오류:', error);
        }
    }
    /**
     * 싱글톤 인스턴스 가져오기
     */
    static getInstance() {
        if (!AutoPermissionHandler.instance) {
            AutoPermissionHandler.instance = new AutoPermissionHandler();
        }
        return AutoPermissionHandler.instance;
    }
    /**
     * 자동 권한 처리 설정
     */
    setupAutoPermissions() {
        // 메시지 처리기 등록
        const messageHandler = vscode.window.registerWebviewPanelSerializer('apeChat', {
            deserializeWebviewPanel: async (webviewPanel) => {
                // 웹뷰에 자동 권한 수락 스크립트 주입
                webviewPanel.webview.html = this.injectAutoPermissionScript(webviewPanel.webview.html);
            }
        });
        // 권한 관련 명령 등록
        const grantCommand = vscode.commands.registerCommand('ape.autoGrantPermission', () => {
            vscode.window.showInformationMessage('모든 권한이 자동으로 허용됩니다.');
            return true; // 항상 허용
        });
        this.disposables.push(messageHandler, grantCommand);
    }
    /**
     * 웹뷰 HTML에 자동 권한 수락 스크립트 주입
     */
    injectAutoPermissionScript(html) {
        const autoPermissionScript = `
      <script>
        // 권한 자동 수락 설정
        window.permissionAutoAccept = true;
        
        // 브라우저 API 권한 요청을 자동 수락하도록 오버라이드
        if (window.navigator.permissions && window.navigator.permissions.query) {
          const originalQuery = window.navigator.permissions.query;
          window.navigator.permissions.query = function(permissionDesc) {
            console.log('[AutoPermission] 권한 자동 허용:', permissionDesc);
            return Promise.resolve({
              state: 'granted',
              addEventListener: () => {}
            });
          };
        }
        
        // 모달 및 대화상자 자동 수락
        if (!window._autoPermissionSetup) {
          window._autoPermissionSetup = true;
          
          // 확인 대화상자 자동 수락
          window.confirm = function() { 
            console.log('[AutoPermission] 확인 대화상자 자동 수락');
            return true; 
          };
          
          // 알림 대화상자 자동 닫기
          window.alert = function(msg) { 
            console.log('[AutoPermission] 알림 대화상자 자동 닫기:', msg);
          };
          
          // 프롬프트 대화상자 자동 응답
          window.prompt = function(msg, defaultValue) { 
            console.log('[AutoPermission] 프롬프트 대화상자 자동 응답:', msg);
            return defaultValue || ''; 
          };
          
          console.log('[AutoPermission] 모든 권한 자동 수락 설정 완료');
        }
      </script>
    `;
        // </head> 태그 앞에 스크립트 추가
        if (html.includes('</head>')) {
            return html.replace('</head>', `${autoPermissionScript}\n</head>`);
        }
        else {
            // <head> 태그가 없으면 시작 부분에 추가
            return `${autoPermissionScript}\n${html}`;
        }
    }
    /**
     * 리소스 해제
     */
    dispose() {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
}
exports.AutoPermissionHandler = AutoPermissionHandler;
// 자동으로 인스턴스 생성 및 초기화
exports.autoPermissionHandler = AutoPermissionHandler.getInstance();
//# sourceMappingURL=auto-permission.js.map