import * as vscode from 'vscode';

/**
 * WelcomeViewProvider for luxury minimal welcome screen
 * Creates an elegant, clean welcome interface with premium aesthetics
 */
export class WelcomeViewProvider {
  
  /**
   * Generate welcome message HTML with luxury minimal design
   * This is used for the first-run experience and when clearing chat
   */
  public static getWelcomeMessageHTML(): string {
    // The welcome view HTML with luxury minimal styling
    return `
      <div class="welcome-container">
        <div class="welcome-header">
          <div class="welcome-monologue">
  <h1 class="welcome-title">A.P.E</h1>
  <div class="title-separator"></div>
  <p class="welcome-tagline">AGENTIC PIPELINE ENGINE</p>
  <p class="welcome-subtitle">Agentic Vision. Development Illuminated. <br>
Seamless • Plugin-driven • Lightweight For S/W Engineers.</p>
</div>
        </div>
        
        <div class="welcome-actions">
          <div class="action-group">
            <div class="action-button">
              <div class="action-icon">✧</div>
              <div class="action-content">
                <div class="action-title">New Conversation</div>
                <div class="action-description">Begin a dialogue with your AI assistant</div>
              </div>
            </div>
          </div>

          <div class="action-group">
            <div class="action-button">
              <div class="action-icon">✦</div>
              <div class="action-content">
                <div class="action-title">Code Assistant</div>
                <div class="action-description">Analyze, optimize, and improve your code</div>
              </div>
            </div>

            <div class="action-button">
              <div class="action-icon">⟐</div>
              <div class="action-content">
                <div class="action-title">Development Tools</div>
                <div class="action-description">Test, debug, and implement new features</div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="welcome-quick-actions">
          <button class="quick-action" onclick="sendCommand('/help')">Help</button>
          <button class="quick-action" onclick="sendCommand('/model')">Change Model</button>
          <button class="quick-action" onclick="sendCommand('/settings')">Settings</button>
          <button class="quick-action" onclick="sendCommand('/clear')">Reset Conversation</button>
        </div>
      </div>
    `;
  }
  
  /**
   * Create standalone webview panel with welcome content
   */
  public static createOrShow(context: vscode.ExtensionContext): vscode.WebviewPanel {
    const panel = vscode.window.createWebviewPanel(
      'apeWelcome',
      'Welcome to APE',
      vscode.ViewColumn.Active, // 현재 활성화된 에디터 영역에 표시
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, 'media')
        ],
        retainContextWhenHidden: true // 숨겨진 상태에서도 컨텍스트 유지
      }
    );
    
    // Get WebView stylesheets
    const styleUri = panel.webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, 'media', 'chat-ape.css')
    );
    
    // Set webview HTML with maximized welcome view
    panel.webview.html = `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${panel.webview.cspSource} 'unsafe-inline'; font-src ${panel.webview.cspSource}; img-src ${panel.webview.cspSource} https:; script-src 'unsafe-inline';">
        <link href="${styleUri}" rel="stylesheet">
        <title>Welcome to APE</title>
        <style>
          body, html {
            margin: 0;
            padding: 0;
            height: 100vh;
            width: 100vw;
            overflow: hidden;
          }
          
          .welcome-standalone {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 0;
            width: 100%;
          }
          
          /* 더 큰 화면에 맞춰 웰컴 화면 크기 최적화 */
          .welcome-container {
            max-width: 1000px;
            margin: 0 auto;
            padding: 2rem;
          }
          
          /* 더 넓은 화면 공간으로 액션 버튼 그리드 개선 */
          .action-group {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 1.5rem;
          }
          
          .example-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 1.2rem;
          }
          
          /* 더 큰 환영 텍스트 */
          .welcome-title {
            font-size: 6rem;
          }
        </style>
      </head>
      <body>
        <div class="welcome-standalone">
          ${WelcomeViewProvider.getWelcomeMessageHTML()}
        </div>
        
        <script>
          // Define vscode API globally for use in onclick handlers
          const vscode = acquireVsCodeApi();

          // Define global sendCommand function for quick action buttons
          window.sendCommand = function(command) {
            console.log('Quick action command sent:', command);
            vscode.postMessage({ type: 'insertCommand', command });
          };

          document.querySelectorAll('.example-card').forEach(card => {
            card.addEventListener('click', event => {
              const command = card.querySelector('.example-text').textContent;
              vscode.postMessage({ type: 'command', command });
            });
          });

          // Add subtle hover animations
          document.querySelectorAll('.example-card').forEach(element => {
            element.addEventListener('mouseover', () => {
              element.style.transform = 'translateY(-2px)';
              element.style.boxShadow = 'var(--ape-shadow-md)';
            });

            element.addEventListener('mouseout', () => {
              element.style.transform = '';
              element.style.boxShadow = '';
            });
          });

          document.querySelectorAll('.action-button').forEach(element => {
            element.addEventListener('mouseover', () => {
              element.style.transform = 'translateY(-2px)';
              element.style.boxShadow = 'var(--ape-shadow-md)';
            });

            element.addEventListener('mouseout', () => {
              element.style.transform = '';
              element.style.boxShadow = '';
            });
          });
          
          // 웰컴 뷰가 로드된 후 1초 후에 강조 효과
          setTimeout(() => {
            document.querySelector('.welcome-title').style.animation = 'pulse 2s infinite';
          }, 1000);
        </script>
      </body>
      </html>`;
    
    return panel;
  }
}