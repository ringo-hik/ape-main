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
exports.WelcomeViewProvider = void 0;
const vscode = __importStar(require("vscode"));
/**
 * WelcomeViewProvider for luxury minimal welcome screen
 * Creates an elegant, clean welcome interface with premium aesthetics
 */
class WelcomeViewProvider {
    /**
     * Generate welcome message HTML with luxury minimal design
     * This is used for the first-run experience and when clearing chat
     */
    static getWelcomeMessageHTML() {
        try {
            console.log('Generating welcome view HTML');
            // Enhanced welcome view HTML with improved UX
            return `
      <div class="welcome-container">
        <div class="welcome-header">
          <div class="welcome-monologue">
            <h1 class="welcome-title">APE</h1>
            <div class="title-separator"></div>
            <p class="welcome-tagline">AGENTIC PIPELINE ENGINE</p>
            <p class="welcome-subtitle">Agentic Vision. Development Illuminated.</p>
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
                  <span class="command-tag" onclick="event.stopPropagation(); vscode.postMessage({type: 'insertCommand', command: '/clear'});">/clear</span>
                </div>
              </div>
            </div>

            <div class="action-button" onclick="vscode.postMessage({type: 'command', command: 'Analyze this code'})">
              <div class="action-icon">✦</div>
              <div class="action-content">
                <div class="action-title">Code Analysis</div>
                <div class="action-description">Understand and improve your code</div>
                <div class="action-commands">
                  <span class="command-tag" onclick="event.stopPropagation(); vscode.postMessage({type: 'insertCommand', command: '/analyze'});">/analyze</span>
                </div>
              </div>
            </div>
          </div>

          <div class="action-group">
            <div class="action-button" onclick="vscode.postMessage({type: 'command', command: 'Implement a new feature'})">
              <div class="action-icon">⟐</div>
              <div class="action-content">
                <div class="action-title">Development</div>
                <div class="action-description">Implement new features</div>
                <div class="action-commands">
                  <span class="command-tag" onclick="event.stopPropagation(); vscode.postMessage({type: 'insertCommand', command: '/create'});">/create</span>
                </div>
              </div>
            </div>

            <div class="action-button" onclick="vscode.postMessage({type: 'command', command: 'Find code in this project'})">
              <div class="action-icon">⟡</div>
              <div class="action-content">
                <div class="action-title">Code Search</div>
                <div class="action-description">Find code in your project</div>
                <div class="action-commands">
                  <span class="command-tag" onclick="event.stopPropagation(); vscode.postMessage({type: 'insertCommand', command: '/find'});">/find</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="command-palette">
          <h3>Command Palette</h3>
          <div class="command-categories">
            <button class="category-tab active" data-category="popular">Popular</button>
            <button class="category-tab" data-category="git">Git</button>
            <button class="category-tab" data-category="code">Code</button>
          </div>
          <div class="command-list" id="popular-commands">
            <div class="command-item" onclick="vscode.postMessage({type: 'insertCommand', command: '/help'})">
              <div class="command-name">/help</div>
              <div class="command-desc">Display available commands and usage</div>
            </div>
            <div class="command-item" onclick="vscode.postMessage({type: 'insertCommand', command: '/model'})">
              <div class="command-name">/model</div>
              <div class="command-desc">Change the AI model</div>
            </div>
            <div class="command-item" onclick="vscode.postMessage({type: 'insertCommand', command: '/clear'})">
              <div class="command-name">/clear</div>
              <div class="command-desc">Clear the current conversation</div>
            </div>
          </div>
        </div>

        <div class="welcome-quick-actions">
          <button class="quick-action" onclick="vscode.postMessage({type: 'command', command: '/help'})">Help</button>
          <button class="quick-action" onclick="vscode.postMessage({type: 'command', command: '/model'})">Model</button>
          <button class="quick-action" onclick="vscode.postMessage({type: 'command', command: '/clear'})">Reset</button>
        </div>
      </div>
      `;
        }
        catch (error) {
            console.error('Error generating welcome HTML:', error);
            // Fallback to ultra-minimal welcome content in case of errors
            return `
        <div class="welcome-container minimal">
          <h1>Welcome to APE</h1>
          <p>The Agentic Pipeline Engine for development</p>
          <div class="welcome-quick-actions">
            <button class="quick-action" onclick="vscode.postMessage({type: 'command', command: '/help'})">Help</button>
          </div>
        </div>
      `;
        }
    }
    /**
     * Generate HTML for the welcome webview panel
     * Extracts the HTML generation logic for better maintainability
     */
    static generateHtml(webview, extensionUri) {
        // Get WebView stylesheets
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'chat-ape.css'));
        const customStyleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'welcome-custom.css'));
        // Get icons for the welcome page
        const mascotIconUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'icons', 'mascot.svg'));
        const apeIconUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'icons', 'ape.svg'));
        // Generate nonce for script security
        const nonce = getNonce();
        return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; img-src ${webview.cspSource} https: data:; script-src 'nonce-${nonce}';">
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
            background-color: var(--ape-welcome-bg);
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

          /* 타이틀 영역 스타일 개선 */
          .welcome-title {
            font-size: 6rem;
            font-weight: 700;
            margin: 0;
            letter-spacing: -2px;
            background: linear-gradient(135deg, var(--ape-welcome-accent) 0%, #9f7aea 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }

          .title-separator {
            width: 80px;
            height: 4px;
            background-color: var(--ape-welcome-accent);
            margin: 12px 0;
            border-radius: 2px;
          }

          .welcome-tagline {
            font-size: 1.1rem;
            font-weight: 600;
            letter-spacing: 2px;
            color: var(--ape-welcome-accent);
            margin: 0 0 0.5rem 0;
          }

          .welcome-subtitle {
            font-size: 1.2rem;
            opacity: 0.8;
            margin: 0;
            font-weight: 400;
          }

          /* 애니메이션 */
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @keyframes pulse {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.03); }
            100% { opacity: 1; transform: scale(1); }
          }

          .welcome-header {
            animation: fadeIn 0.8s ease-out;
          }

          .action-group {
            animation: fadeIn 1s ease-out 0.2s both;
          }

          .command-palette {
            animation: fadeIn 1.2s ease-out 0.4s both;
          }

          .welcome-quick-actions {
            animation: fadeIn 1.3s ease-out 0.6s both;
          }
        </style>
      </head>
      <body>
        <div class="welcome-standalone">
          ${WelcomeViewProvider.getWelcomeMessageHTML()}
        </div>

        <script nonce="${nonce}">
          const vscode = acquireVsCodeApi();

          // Command category tabs
          document.querySelectorAll('.category-tab').forEach(tab => {
            tab.addEventListener('click', () => {
              // Remove active class from all tabs
              document.querySelectorAll('.category-tab').forEach(t => {
                t.classList.remove('active');
              });

              // Add active class to clicked tab
              tab.classList.add('active');

              // Show the selected category
              const category = tab.dataset.category;

              // Toggle command lists visibility
              if (category === 'popular') {
                document.getElementById('popular-commands').style.display = 'flex';
                document.getElementById('popular-commands').style.flexDirection = 'column';
                document.getElementById('popular-commands').style.gap = '8px';
              }

              // For demonstration, we're only showing the popular commands section
              // In a real implementation, you would toggle visibility of different command lists
            });
          });

          // Example card click handlers
          document.querySelectorAll('.example-card').forEach(card => {
            card.addEventListener('click', event => {
              const command = card.querySelector('.example-text').textContent;
              vscode.postMessage({ type: 'command', command });
            });
          });

          // Quick action button handlers
          document.querySelectorAll('.quick-action').forEach(button => {
            button.addEventListener('click', event => {
              event.preventDefault();
              const commandText = button.textContent.toLowerCase();

              // Add a visual feedback animation
              button.classList.add('command-executing');
              setTimeout(() => {
                button.classList.remove('command-executing');
              }, 1000);

              vscode.postMessage({
                type: 'insertCommand',
                command: '/' + commandText
              });
            });
          });

          // Enhanced hover animations for all interactive elements
          document.querySelectorAll('.action-button, .example-card, .command-item').forEach(element => {
            element.addEventListener('mouseover', () => {
              element.style.transform = 'translateY(-2px)';
              element.style.boxShadow = '0 6px 14px var(--ape-welcome-shadow)';
              element.style.borderColor = 'var(--ape-card-hover-border)';
            });

            element.addEventListener('mouseout', () => {
              element.style.transform = '';
              element.style.boxShadow = '';
              element.style.borderColor = '';
            });
          });

          // Title animation
          setTimeout(() => {
            const title = document.querySelector('.welcome-title');
            if (title) {
              title.style.animation = 'pulse 3s infinite ease-in-out';
            }
          }, 1500);

          // Command tag click handlers with animation
          document.querySelectorAll('.command-tag').forEach(tag => {
            tag.addEventListener('click', (event) => {
              event.stopPropagation();

              // Visual feedback
              tag.style.backgroundColor = 'var(--ape-welcome-accent)';
              tag.style.color = 'white';

              setTimeout(() => {
                tag.style.backgroundColor = '';
                tag.style.color = '';

                const command = tag.textContent;
                vscode.postMessage({
                  type: 'insertCommand',
                  command
                });
              }, 300);
            });
          });
        </script>
      </body>
      </html>`;
    }
    /**
     * Create standalone webview panel with welcome content
     */
    static createOrShow(context) {
        const panel = vscode.window.createWebviewPanel('apeWelcome', 'Welcome to APE', vscode.ViewColumn.Active, // 현재 활성화된 에디터 영역에 표시
        {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(context.extensionUri, 'media')
            ],
            retainContextWhenHidden: true // 숨겨진 상태에서도 컨텍스트 유지
        });
        // Set HTML content
        panel.webview.html = WelcomeViewProvider.generateHtml(panel.webview, context.extensionUri);
        // Set up message handler for the webview
        panel.webview.onDidReceiveMessage(message => {
            switch (message.type) {
                case 'command':
                    // Process direct command
                    vscode.window.showInformationMessage(`Executing command: ${message.command}`);
                    break;
                case 'insertCommand':
                    // Insert a command into the command palette
                    vscode.window.showInformationMessage(`Inserting command: ${message.command}`);
                    break;
            }
        }, undefined, context.subscriptions);
        return panel;
    }
}
exports.WelcomeViewProvider = WelcomeViewProvider;
/**
 * Generates a nonce string for Content Security Policy
 */
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
//# sourceMappingURL=welcomeView.js.map