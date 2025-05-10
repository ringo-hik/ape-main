// Create a custom help command implementing luxury minimal design
function registerHelpCommand(context, vscode) {
  // 안전하게 명령어 등록 (중복 방지)
  const safeRegisterCommand = async (commandId, handler) => {
    try {
      // 먼저 기존 명령어가 있는지 확인
      const commands = await vscode.commands.getCommands(true);

      // 명령어가 이미 등록되어 있는지 확인
      if (!commands.includes(commandId)) {
        // 명령어가 없으면 등록
        console.log(`명령어 '${commandId}' 등록 중...`);
        return vscode.commands.registerCommand(commandId, handler);
      } else {
        // 기존 명령어 핸들러가 대체되어야 함을 명확히 로깅
        console.log(`명령어 '${commandId}'는 이미 등록되어 있어 기존 명령어를 덮어씁니다.`);

        // 기존 명령어를 강제로 덮어쓰기 위해 새로 등록
        // 이는 확장 프로그램에서 내부적으로 사용되는 명령어이므로 안전함
        return vscode.commands.registerCommand(commandId, handler, true);
      }
    } catch (error) {
      console.error(`명령어 '${commandId}' 등록 중 오류 발생:`, error);
      console.error(error);
      return { dispose: () => {} }; // 오류 발생시 더미 disposable 반환
    }
  };

  // 실제 help 명령어 핸들러 함수
  const showHelpPanel = () => {
    try {
      console.log('도움말 패널 생성 중...');

      // Open the help page directly as a webview panel
      const helpPanel = vscode.window.createWebviewPanel(
        'apeHelp',
        'APE Command Guide',
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')]
        }
      );

      console.log('스타일시트 URI 생성 중...');

      // Get stylesheets
      const styleUri = helpPanel.webview.asWebviewUri(
        vscode.Uri.joinPath(context.extensionUri, 'media', 'welcome-custom.css')
      );

      console.log('help.json 로드 중...');

      // Load help data - 에러 처리 추가
      try {
        const helpDataPath = vscode.Uri.joinPath(context.extensionUri, 'src', 'data', 'help.json').fsPath;
        console.log('Help data path:', helpDataPath);

        const fs = require('fs');
        const helpDataContent = fs.readFileSync(helpDataPath, 'utf8');
        console.log('Help data loaded, parsing JSON...');

        const helpData = JSON.parse(helpDataContent);

      // Create the command categories HTML
      const categoriesHtml = helpData.categories.map(category => {
        const commandsHtml = category.commands.map(command => {
          const aliasesText = command.aliases && command.aliases.length > 0 
            ? `<div class="command-aliases">Aliases: ${command.aliases.map(a => `<span class="alias">${a}</span>`).join(', ')}</div>` 
            : '';
          
          const examplesText = command.examples && command.examples.length > 0
            ? `<div class="command-examples">
                <div class="examples-label">Examples:</div>
                <div class="examples-content">${command.examples.map(ex => `<div class="example">${ex}</div>`).join('')}</div>
               </div>`
            : '';
            
          const usageText = command.usage
            ? `<div class="command-usage">
                <div class="usage-label">Usage:</div>
                <div class="usage-content">${command.usage}</div>
               </div>`
            : '';
            
          const relatedText = command.related && command.related.length > 0
            ? `<div class="command-related">
                <div class="related-label">Related:</div>
                <div class="related-content">${command.related.map(r => `<span class="related-command">${r}</span>`).join(', ')}</div>
               </div>`
            : '';

          return `
            <div class="command-item" data-command="${command.name}">
              <div class="command-header">
                <div class="command-name">/${command.name}</div>
                <div class="command-actions">
                  <div class="command-expand" title="Show details">+</div>
                </div>
              </div>
              <div class="command-description">${command.description}</div>
              <div class="command-details">
                ${command.longDescription ? `<div class="command-long-description">${command.longDescription}</div>` : ''}
                ${aliasesText}
                ${usageText}
                ${examplesText}
                ${relatedText}
              </div>
            </div>
          `;
        }).join('');

        return `
          <div class="category-section" id="category-${category.id}">
            <div class="category-header">
              <div class="category-name">${category.name}</div>
              <div class="category-description">${category.description}</div>
            </div>
            <div class="commands-container">
              ${commandsHtml}
            </div>
          </div>
        `;
      }).join('');

      // Create the FAQ HTML
      const faqHtml = helpData.faq.map(item => {
        return `
          <div class="faq-item">
            <div class="faq-question">${item.question}</div>
            <div class="faq-answer">${item.answer}</div>
          </div>
        `;
      }).join('');

      // Create the guides HTML
      const guidesHtml = helpData.guides.map(guide => {
        return `
          <div class="guide-item" id="guide-${guide.id}">
            <div class="guide-title">${guide.title}</div>
            <div class="guide-content">${guide.content}</div>
          </div>
        `;
      }).join('');

      // Display a beautifully designed help page with luxury minimal aesthetics
      helpPanel.webview.html = `
        <!DOCTYPE html>
        <html lang="ko">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>APE Command Guide</title>
          <link rel="stylesheet" href="${styleUri}">
          <style>
            /* Base Styles - Minimal Luxury Aesthetic */
            :root {
              --color-bg: var(--vscode-editor-background, #1e1e1e);
              --color-text: var(--vscode-editor-foreground, #d4d4d4);
              --color-accent: var(--vscode-textLink-foreground, #3794ff);
              --color-secondary: var(--vscode-textPreformat-foreground, #d7ba7d);
              --color-border: var(--vscode-widget-border, #454545);
              --color-surface: var(--vscode-editor-inactiveSelectionBackground, #3a3d41);
              --color-hover: var(--vscode-editor-hoverHighlightBackground, #264f78);
              --color-selection: var(--vscode-editor-selectionBackground, #264f78);
              
              --font-primary: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              --font-mono: 'SF Mono', Monaco, Menlo, Consolas, 'Courier New', monospace;
              
              --space-xs: 4px;
              --space-sm: 8px;
              --space-md: 16px;
              --space-lg: 24px;
              --space-xl: 32px;
              
              --border-radius: 4px;
              --transition-standard: all 0.2s ease;
            }
            
            html, body {
              margin: 0;
              padding: 0;
              background-color: var(--color-bg);
              color: var(--color-text);
              font-family: var(--font-primary);
              line-height: 1.6;
              font-size: 14px;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
            
            * {
              box-sizing: border-box;
            }
            
            /* Main Layout */
            .help-container {
              max-width: 900px;
              margin: 0 auto;
              padding: var(--space-lg);
            }
            
            /* Header Styles */
            .help-header {
              margin-bottom: var(--space-xl);
              text-align: center;
              padding-bottom: var(--space-lg);
              border-bottom: 1px solid var(--color-border);
            }
            
            .help-title {
              font-size: 32px;
              font-weight: 300;
              color: var(--color-accent);
              margin-bottom: var(--space-sm);
              letter-spacing: -0.02em;
            }
            
            .help-subtitle {
              font-size: 16px;
              font-weight: 400;
              color: var(--color-text);
              opacity: 0.7;
              margin-bottom: var(--space-lg);
            }
            
            /* Navigation */
            .help-nav {
              display: flex;
              justify-content: center;
              gap: var(--space-md);
              margin-bottom: var(--space-xl);
            }
            
            .nav-item {
              cursor: pointer;
              padding: var(--space-sm) var(--space-md);
              transition: var(--transition-standard);
              border-radius: var(--border-radius);
              font-weight: 500;
              opacity: 0.7;
            }
            
            .nav-item:hover {
              opacity: 1;
              background-color: var(--color-hover);
            }
            
            .nav-item.active {
              color: var(--color-accent);
              opacity: 1;
              border-bottom: 2px solid var(--color-accent);
            }
            
            /* Category Styles */
            .category-section {
              margin-bottom: var(--space-xl);
              animation: fadeIn 0.5s ease;
            }
            
            .category-header {
              margin-bottom: var(--space-lg);
              border-left: 3px solid var(--color-accent);
              padding-left: var(--space-md);
            }
            
            .category-name {
              font-size: 18px;
              font-weight: 500;
              margin-bottom: var(--space-xs);
              color: var(--color-accent);
            }
            
            .category-description {
              font-size: 14px;
              opacity: 0.8;
            }
            
            /* Command Styles */
            .commands-container {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
              gap: var(--space-lg);
            }
            
            .command-item {
              background-color: var(--color-surface);
              border-radius: var(--border-radius);
              overflow: hidden;
              transition: var(--transition-standard);
              border: 1px solid transparent;
              position: relative;
            }
            
            .command-item:hover {
              border-color: var(--color-border);
              transform: translateY(-2px);
            }
            
            .command-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: var(--space-md);
              border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            }
            
            .command-name {
              font-family: var(--font-mono);
              font-weight: 600;
              color: var(--color-secondary);
            }
            
            .command-actions {
              display: flex;
              gap: var(--space-sm);
            }
            
            .command-expand {
              cursor: pointer;
              width: 24px;
              height: 24px;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 50%;
              background-color: rgba(255, 255, 255, 0.05);
              transition: var(--transition-standard);
            }
            
            .command-expand:hover {
              background-color: rgba(255, 255, 255, 0.1);
            }
            
            .command-description {
              padding: var(--space-md);
              font-size: 14px;
            }
            
            .command-details {
              padding: 0;
              max-height: 0;
              overflow: hidden;
              transition: all 0.3s ease;
              background-color: rgba(0, 0, 0, 0.2);
            }
            
            .command-item.expanded .command-details {
              padding: var(--space-md);
              max-height: 1000px;
              border-top: 1px solid rgba(255, 255, 255, 0.05);
            }
            
            .command-long-description {
              margin-bottom: var(--space-md);
              font-size: 14px;
              line-height: 1.6;
            }
            
            .command-aliases,
            .command-usage,
            .command-examples,
            .command-related {
              margin-bottom: var(--space-md);
              font-size: 12px;
            }
            
            .command-item.expanded .command-expand {
              transform: rotate(45deg);
            }
            
            .examples-label, 
            .usage-label, 
            .related-label {
              font-weight: 500;
              margin-bottom: var(--space-xs);
              color: var(--color-accent);
              opacity: 0.8;
            }
            
            .examples-content,
            .usage-content {
              font-family: var(--font-mono);
              background-color: rgba(0, 0, 0, 0.2);
              padding: var(--space-sm);
              border-radius: 2px;
              overflow-x: auto;
            }
            
            .example {
              margin-bottom: var(--space-xs);
              white-space: nowrap;
            }
            
            .example:last-child {
              margin-bottom: 0;
            }
            
            .alias, .related-command {
              font-family: var(--font-mono);
              background-color: rgba(255, 255, 255, 0.05);
              padding: 2px 4px;
              border-radius: 2px;
              margin-right: 4px;
            }
            
            /* FAQ Styles */
            .faq-section {
              display: none;
              animation: fadeIn 0.5s ease;
            }
            
            .faq-item {
              margin-bottom: var(--space-md);
              padding: var(--space-md);
              background-color: var(--color-surface);
              border-radius: var(--border-radius);
              transition: var(--transition-standard);
              border: 1px solid transparent;
            }
            
            .faq-item:hover {
              border-color: var(--color-border);
            }
            
            .faq-question {
              font-weight: 500;
              font-size: 16px;
              margin-bottom: var(--space-sm);
              color: var(--color-secondary);
            }
            
            .faq-answer {
              font-size: 14px;
              line-height: 1.6;
            }
            
            /* Guides Styles */
            .guides-section {
              display: none;
              animation: fadeIn 0.5s ease;
            }
            
            .guide-item {
              margin-bottom: var(--space-xl);
            }
            
            .guide-title {
              font-size: 18px;
              font-weight: 500;
              margin-bottom: var(--space-md);
              color: var(--color-accent);
              padding-bottom: var(--space-xs);
              border-bottom: 1px solid var(--color-border);
            }
            
            .guide-content {
              font-size: 14px;
              line-height: 1.6;
            }
            
            /* Animations */
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(10px); }
              to { opacity: 1; transform: translateY(0); }
            }
            
            /* Search Bar */
            .search-container {
              margin-bottom: var(--space-lg);
              padding: 0 var(--space-md);
            }
            
            .search-input {
              width: 100%;
              padding: var(--space-md);
              background-color: rgba(0, 0, 0, 0.2);
              border: 1px solid var(--color-border);
              border-radius: var(--border-radius);
              color: var(--color-text);
              font-family: var(--font-primary);
              transition: var(--transition-standard);
            }
            
            .search-input:focus {
              outline: none;
              border-color: var(--color-accent);
              box-shadow: 0 0 0 2px rgba(55, 148, 255, 0.25);
            }
            
            .search-input::placeholder {
              color: rgba(255, 255, 255, 0.3);
            }
            
            /* Additional Luxury Minimal Touches */
            .luxury-divider {
              height: 1px;
              background: linear-gradient(to right, transparent, var(--color-accent) 50%, transparent);
              margin: var(--space-xl) 0;
              opacity: 0.3;
            }
            
            .footer {
              text-align: center;
              margin-top: var(--space-xl);
              padding-top: var(--space-lg);
              border-top: 1px solid var(--color-border);
              font-size: 12px;
              opacity: 0.5;
            }
            
            /* Responsive adjustments */
            @media (max-width: 768px) {
              .commands-container {
                grid-template-columns: 1fr;
              }
              
              .help-nav {
                flex-wrap: wrap;
              }
            }
          </style>
        </head>
        <body>
          <div class="help-container">
            <div class="help-header">
              <div class="help-title">APE Command Guide</div>
              <div class="help-subtitle">Explore the capabilities of Agentic Pipeline Extension</div>
            </div>
            
            <div class="search-container">
              <input type="text" class="search-input" placeholder="Search commands (e.g. git, help, model...)" id="command-search">
            </div>
            
            <div class="help-nav">
              <div class="nav-item active" data-target="commands-section">Commands</div>
              <div class="nav-item" data-target="faq-section">FAQ</div>
              <div class="nav-item" data-target="guides-section">Guides</div>
            </div>
            
            <!-- Commands Section -->
            <div class="commands-section" id="commands-section">
              ${categoriesHtml}
            </div>
            
            <!-- FAQ Section -->
            <div class="faq-section" id="faq-section">
              <h2>Frequently Asked Questions</h2>
              ${faqHtml}
            </div>
            
            <!-- Guides Section -->
            <div class="guides-section" id="guides-section">
              <h2>Usage Guides</h2>
              ${guidesHtml}
            </div>
            
            <div class="luxury-divider"></div>
            
            <div class="footer">
              <div>APE Extension v${helpData.version} • Last Updated: ${helpData.lastUpdated}</div>
            </div>
          </div>
          
          <script>
            // Navigation functionality
            document.querySelectorAll('.nav-item').forEach(item => {
              item.addEventListener('click', () => {
                // Hide all sections
                document.querySelectorAll('.commands-section, .faq-section, .guides-section').forEach(section => {
                  section.style.display = 'none';
                });
                
                // Show the selected section
                const targetId = item.getAttribute('data-target');
                document.getElementById(targetId).style.display = 'block';
                
                // Update active state
                document.querySelectorAll('.nav-item').forEach(navItem => {
                  navItem.classList.remove('active');
                });
                item.classList.add('active');
              });
            });
            
            // Expand command details functionality
            document.querySelectorAll('.command-expand').forEach(button => {
              button.addEventListener('click', (e) => {
                const commandItem = e.target.closest('.command-item');
                commandItem.classList.toggle('expanded');
              });
            });
            
            // Search functionality
            const searchInput = document.getElementById('command-search');
            searchInput.addEventListener('input', (e) => {
              const searchTerm = e.target.value.toLowerCase();
              
              // If on FAQ or Guides tab, switch to Commands tab
              if (!document.getElementById('commands-section').style.display || 
                  document.getElementById('commands-section').style.display === 'none') {
                document.querySelector('.nav-item[data-target="commands-section"]').click();
              }
              
              // Filter commands
              document.querySelectorAll('.command-item').forEach(command => {
                const commandName = command.getAttribute('data-command').toLowerCase();
                const commandDescription = command.querySelector('.command-description').textContent.toLowerCase();
                const commandDetails = command.querySelector('.command-details').textContent.toLowerCase();
                
                const isMatch = commandName.includes(searchTerm) || 
                               commandDescription.includes(searchTerm) || 
                               commandDetails.includes(searchTerm);
                
                command.style.display = isMatch ? 'block' : 'none';
              });
              
              // Show/hide categories based on whether they have visible commands
              document.querySelectorAll('.category-section').forEach(category => {
                const hasVisibleCommands = Array.from(category.querySelectorAll('.command-item'))
                  .some(command => command.style.display !== 'none');
                
                category.style.display = hasVisibleCommands ? 'block' : 'none';
              });
            });
            
            // Initialize
            document.querySelector('.nav-item[data-target="commands-section"]').click();
          </script>
        </body>
        </html>
      `;

      console.log('도움말 HTML 생성 완료');

      } catch (jsonError) {
        // help.json 관련 오류 처리
        console.error('help.json 로드 중 오류:', jsonError);
        vscode.window.showErrorMessage(`도움말 데이터 로드 실패: ${jsonError.message}`);

        // 간단한 오류 메시지를 웹뷰에 표시
        helpPanel.webview.html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: system-ui, sans-serif; color: #eee; background: #333; padding: 2rem; }
              h1 { color: #f55; }
              pre { background: #222; padding: 1rem; border-radius: 4px; overflow: auto; }
            </style>
          </head>
          <body>
            <h1>도움말 로드 중 오류 발생</h1>
            <p>도움말 데이터를 불러오는 데 문제가 발생했습니다. 다음 오류를 확인하세요:</p>
            <pre>${jsonError.message}\n\n${jsonError.stack}</pre>
            <p>경로: ${vscode.Uri.joinPath(context.extensionUri, 'src', 'data', 'help.json').fsPath}</p>
          </body>
          </html>
        `;
      }
    } catch (error) {
      // 전체 오류 처리
      console.error('도움말 표시 중 오류:', error);
      vscode.window.showErrorMessage(`도움말 표시 중 오류가 발생했습니다: ${error.message}`);
    }
    };

    // 실제 명령어 등록
    safeRegisterCommand('ape.help', showHelpPanel).then(disposable => {
      context.subscriptions.push(disposable);
    });

    // 안전하게 showCommandHelp 명령어 등록
    safeRegisterCommand('ape.showCommandHelp', () => {
      return vscode.commands.executeCommand('ape.help');
    }).then(disposable => {
      context.subscriptions.push(disposable);
    });
  
}

// Export the function
module.exports = registerHelpCommand;