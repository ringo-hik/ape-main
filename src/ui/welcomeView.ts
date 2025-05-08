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
  <h1 class="welcome-title">APE</h1>
  <div class="title-separator"></div>
  <p class="welcome-tagline">AGENTIC PIPELINE ENGINE</p>
  <p class="welcome-subtitle">Agentic Vision. Development Illuminated.
Seamless • Plugin-driven • Lightweight For Our Developer.</p>
</div>
        </div>
        
        <div class="welcome-actions">
          <div class="action-group">
            <div class="action-button" onclick="vscode.postMessage({type: 'command', command: 'Hello, how can you help me?'})">
              <div class="action-icon">✧</div>
              <div class="action-content">
                <div class="action-title">New Conversation</div>
                <div class="action-description">Begin a dialogue with your AI assistant</div>
                <div class="action-commands">
                  <span class="command-tag" onclick="event.stopPropagation(); vscode.postMessage({type: 'insertCommand', command: '/new'});">/new</span>
                  <span class="command-tag" onclick="event.stopPropagation(); vscode.postMessage({type: 'insertCommand', command: '/reset'});">/reset</span>
                  <span class="command-tag" onclick="event.stopPropagation(); vscode.postMessage({type: 'insertCommand', command: '/clear'});">/clear</span>
                </div>
              </div>
            </div>
            
            <div class="action-button" onclick="vscode.postMessage({type: 'command', command: 'Analyze this code and suggest improvements'})">
              <div class="action-icon">✦</div>
              <div class="action-content">
                <div class="action-title">Code Analysis</div>
                <div class="action-description">Understand and improve your existing code</div>
                <div class="action-commands">
                  <span class="command-tag" onclick="event.stopPropagation(); vscode.postMessage({type: 'insertCommand', command: '/analyze'});">/analyze</span>
                  <span class="command-tag" onclick="event.stopPropagation(); vscode.postMessage({type: 'insertCommand', command: '/review'});">/review</span>
                  <span class="command-tag" onclick="event.stopPropagation(); vscode.postMessage({type: 'insertCommand', command: '/refactor'});">/refactor</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="action-group">
            <div class="action-button" onclick="vscode.postMessage({type: 'command', command: 'Implement a new feature for me'})">
              <div class="action-icon">⟐</div>
              <div class="action-content">
                <div class="action-title">Rapid Development</div>
                <div class="action-description">Implement new features with efficiency</div>
                <div class="action-commands">
                  <span class="command-tag" onclick="event.stopPropagation(); vscode.postMessage({type: 'insertCommand', command: '/create'});">/create</span>
                  <span class="command-tag" onclick="event.stopPropagation(); vscode.postMessage({type: 'insertCommand', command: '/implement'});">/implement</span>
                  <span class="command-tag" onclick="event.stopPropagation(); vscode.postMessage({type: 'insertCommand', command: '/test'});">/test</span>
                </div>
              </div>
            </div>
            
            <div class="action-button" onclick="vscode.postMessage({type: 'command', command: 'Find code that handles user authentication'})">
              <div class="action-icon">⟡</div>
              <div class="action-content">
                <div class="action-title">Code Discovery</div>
                <div class="action-description">Find the code you need, when you need it</div>
                <div class="action-commands">
                  <span class="command-tag" onclick="event.stopPropagation(); vscode.postMessage({type: 'insertCommand', command: '/find'});">/find</span>
                  <span class="command-tag" onclick="event.stopPropagation(); vscode.postMessage({type: 'insertCommand', command: '/search'});">/search</span>
                  <span class="command-tag" onclick="event.stopPropagation(); vscode.postMessage({type: 'insertCommand', command: '/docs'});">/docs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="welcome-quick-actions">
          <button class="quick-action" onclick="vscode.postMessage({type: 'command', command: '/help'})">Help</button>
          <button class="quick-action" onclick="vscode.postMessage({type: 'command', command: '/model'})">Change Model</button>
          <button class="quick-action" onclick="vscode.postMessage({type: 'command', command: '/settings'})">Settings</button>
          <button class="quick-action" onclick="vscode.postMessage({type: 'command', command: '/clear'})">Reset Conversation</button>
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
    const customStyleUri = panel.webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, 'media', 'welcome-custom.css')
    );
    
    // Set webview HTML with maximized welcome view
    panel.webview.html = `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${panel.webview.cspSource} 'unsafe-inline'; font-src ${panel.webview.cspSource}; img-src ${panel.webview.cspSource} https:; script-src 'unsafe-inline';">
        <link href="${styleUri}" rel="stylesheet">
        <link href="${customStyleUri}" rel="stylesheet">
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
          const vscode = acquireVsCodeApi();
          
          document.querySelectorAll('.example-card').forEach(card => {
            card.addEventListener('click', event => {
              const command = card.querySelector('.example-text').textContent;
              vscode.postMessage({ type: 'command', command });
            });
          });
          
          document.querySelectorAll('.quick-action').forEach(button => {
            button.addEventListener('click', event => {
              const command = button.textContent.toLowerCase();
              vscode.postMessage({ type: 'insertCommand', command: '/' + command });
            });
          });
          
          // Add subtle hover animations
          document.querySelectorAll('.action-button, .example-card').forEach(element => {
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