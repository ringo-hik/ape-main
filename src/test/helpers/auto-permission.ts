import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * VSCode 확장에서 권한 요청을 자동으로 처리하는 헬퍼 클래스
 * 권한 요청 다이얼로그를 자동으로 수락하거나 무시합니다.
 */
export class AutoPermissionHandler {
  private static instance: AutoPermissionHandler;
  private disposables: vscode.Disposable[] = [];
  private permissionConfig: any;

  private constructor() {
    try {
      // 권한 설정 파일 로드
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
      const configPath = path.join(workspaceRoot, 'auth-permissions.json');
      
      if (fs.existsSync(configPath)) {
        this.permissionConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        console.log('권한 설정 파일 로드됨:', configPath);
      } else {
        this.permissionConfig = {};
        console.log('권한 설정 파일을 찾을 수 없음. 기본 설정 사용');
      }

      // VSCode 환경에 권한 자동 처리 설정
      this.setupAutoPermissions();
    } catch (error) {
      console.error('권한 핸들러 초기화 오류:', error);
    }
  }

  /**
   * 싱글톤 인스턴스 가져오기
   */
  public static getInstance(): AutoPermissionHandler {
    if (!AutoPermissionHandler.instance) {
      AutoPermissionHandler.instance = new AutoPermissionHandler();
    }
    return AutoPermissionHandler.instance;
  }

  /**
   * 자동 권한 처리 설정
   */
  private setupAutoPermissions(): void {
    // 메시지 처리기 등록
    const messageHandler = vscode.window.registerWebviewPanelSerializer('apeChat', {
      deserializeWebviewPanel: async (webviewPanel: vscode.WebviewPanel) => {
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
  private injectAutoPermissionScript(html: string): string {
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
    } else {
      // <head> 태그가 없으면 시작 부분에 추가
      return `${autoPermissionScript}\n${html}`;
    }
  }

  /**
   * 리소스 해제
   */
  public dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }
}

// 자동으로 인스턴스 생성 및 초기화
export const autoPermissionHandler = AutoPermissionHandler.getInstance();