/**
 * 메시지 렌더링 테스트 스크립트
 * 
 * 이 스크립트는 슬래시 명령과 컨텍스트 제외 기능이 적용된 메시지가
 * 올바르게 렌더링되는지 테스트하는 HTML을 생성합니다.
 */

const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>APE 메시지 렌더링 테스트</title>
  <style>
    /* 간소화된 스타일시트 - 필수 스타일만 포함 */
    :root {
      --ape-bg-primary: #1e1e1e;
      --ape-bg-secondary: #252526;
      --ape-bg-tertiary: #3c3c3c;
      --ape-text-primary: #cccccc;
      --ape-text-secondary: #8a8a8a;
      --ape-text-error: #f48771;
      --ape-accent-primary: #0e639c;
      --ape-accent-silver: #aaa9ad;
      --ape-border-subtle: #454545;
      --ape-spacing-md: 1rem;
      --ape-spacing-lg: 1.5rem;
      --ape-border-radius-lg: 12px;
    }
    
    body {
      background-color: var(--ape-bg-primary);
      color: var(--ape-text-primary);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      margin: 0;
      padding: 20px;
    }
    
    #chat-messages {
      max-width: 960px;
      margin: 0 auto;
    }
    
    /* 메시지 스타일 */
    .message {
      width: 100%;
      max-width: 960px;
      box-sizing: border-box;
      padding: var(--ape-spacing-md);
      margin-bottom: var(--ape-spacing-lg);
      border-radius: var(--ape-border-radius-lg);
      position: relative;
    }
    
    /* 메시지 헤더 (컨텍스트 토글 버튼) */
    .message-header {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 4px;
      height: 24px;
    }
    
    /* 컨텍스트 토글 버튼 */
    .context-toggle-button {
      background: none;
      border: none;
      opacity: 0.4;
      cursor: pointer;
      transition: opacity 0.2s ease, background-color 0.2s ease;
      font-size: 14px;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
    }
    
    .context-toggle-button:hover {
      opacity: 1;
      background-color: rgba(255, 255, 255, 0.1);
    }
    
    /* 특별한 메시지 스타일 */
    .message.slash-command {
      border-left: 3px solid var(--ape-accent-primary);
    }
    
    .message.command-result {
      border-left: 3px solid var(--ape-accent-silver);
      opacity: 0.8;
    }
    
    .message.excluded-from-context {
      opacity: 0.6;
      border-left: 3px dashed var(--ape-text-error);
    }
    
    /* 역할별 메시지 스타일 */
    .user {
      background-color: rgba(55, 148, 255, 0.1);
      border-left: 2px solid var(--ape-accent-primary);
      margin-left: auto;
      margin-right: var(--ape-spacing-md);
      color: var(--ape-text-primary);
      max-width: calc(960px * 0.85);
    }
    
    .assistant {
      background-color: var(--ape-bg-secondary);
      border-left: 2px solid var(--ape-accent-silver);
      margin-right: auto;
      margin-left: var(--ape-spacing-md);
      max-width: calc(960px * 0.85);
    }
    
    .system {
      background-color: transparent;
      border: 1px solid var(--ape-border-subtle);
      margin: var(--ape-spacing-lg) auto;
      max-width: 960px;
      width: calc(100% - 2 * var(--ape-spacing-md));
    }
    
    .message-content {
      word-break: break-word;
      overflow-wrap: break-word;
    }

    button {
      background-color: var(--ape-accent-primary);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      margin-bottom: 20px;
      cursor: pointer;
    }

    .info-panel {
      background-color: var(--ape-bg-secondary);
      padding: 15px;
      border-radius: 4px;
      margin-bottom: 20px;
    }

    h2 {
      margin-top: 40px;
      margin-bottom: 10px;
      border-bottom: 1px solid var(--ape-accent-primary);
      padding-bottom: 5px;
    }
  </style>
</head>
<body>
  <div class="info-panel">
    <h1>APE 메시지 렌더링 테스트</h1>
    <p>이 페이지는 슬래시 명령과 컨텍스트 제외 기능이 적용된 메시지가 올바르게 렌더링되는지 테스트합니다.</p>
    <p>각 메시지에는 컨텍스트 포함/제외를 토글할 수 있는 버튼이 있습니다.</p>
  </div>

  <button id="toggle-all-button">모든 메시지 컨텍스트 토글</button>

  <h2>테스트 메시지</h2>
  <div id="chat-messages">
    <!-- 일반 사용자 메시지 -->
    <div class="message user" id="msg_1">
      <div class="message-header">
        <button class="context-toggle-button" title="컨텍스트에서 제외">🔍</button>
      </div>
      <div class="message-content">안녕하세요, 도움이 필요합니다</div>
    </div>
    
    <!-- 일반 시스템 메시지 -->
    <div class="message assistant" id="msg_2">
      <div class="message-header">
        <button class="context-toggle-button" title="컨텍스트에서 제외">🔍</button>
      </div>
      <div class="message-content">안녕하세요! 어떻게 도와드릴까요?</div>
    </div>
    
    <!-- 슬래시 명령 메시지 -->
    <div class="message user slash-command excluded-from-context" id="cmd_1">
      <div class="message-header">
        <button class="context-toggle-button" title="컨텍스트에 포함">🔍</button>
      </div>
      <div class="message-content">/help</div>
    </div>
    
    <!-- 슬래시 명령 결과 -->
    <div class="message system command-result excluded-from-context" id="cmd_result_1">
      <div class="message-header">
        <button class="context-toggle-button" title="컨텍스트에 포함">🔍</button>
      </div>
      <div class="message-content">사용 가능한 명령어: /help, /clear, /todo</div>
    </div>
    
    <!-- 사용자가 수동으로 제외한 메시지 -->
    <div class="message user excluded-from-context" id="msg_3">
      <div class="message-header">
        <button class="context-toggle-button" title="컨텍스트에 포함">🔍</button>
      </div>
      <div class="message-content">이 메시지는 중요하지 않습니다</div>
    </div>
    
    <!-- 일반 메시지 추가 -->
    <div class="message user" id="msg_4">
      <div class="message-header">
        <button class="context-toggle-button" title="컨텍스트에서 제외">🔍</button>
      </div>
      <div class="message-content">이 메시지는 컨텍스트에 포함됩니다</div>
    </div>
  </div>

  <script>
    // 컨텍스트 토글 버튼 기능 구현
    document.querySelectorAll('.context-toggle-button').forEach(button => {
      button.addEventListener('click', () => {
        const messageEl = button.closest('.message');
        messageEl.classList.toggle('excluded-from-context');
        
        // 버튼 텍스트 업데이트
        if (messageEl.classList.contains('excluded-from-context')) {
          button.title = '컨텍스트에 포함';
        } else {
          button.title = '컨텍스트에서 제외';
        }
      });
    });

    // 모든 메시지 토글 버튼
    document.getElementById('toggle-all-button').addEventListener('click', () => {
      const messages = document.querySelectorAll('.message');
      
      // 제외된 메시지가 하나라도 있으면 모두 포함, 아니면 모두 제외
      const hasExcluded = [...messages].some(msg => msg.classList.contains('excluded-from-context'));
      
      messages.forEach(msg => {
        const button = msg.querySelector('.context-toggle-button');
        
        if (hasExcluded) {
          // 모든 메시지 포함
          msg.classList.remove('excluded-from-context');
          button.title = '컨텍스트에서 제외';
        } else {
          // 모든 메시지 제외
          msg.classList.add('excluded-from-context');
          button.title = '컨텍스트에 포함';
        }
      });
    });
  </script>
</body>
</html>
`;

// HTML 파일로 저장
const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, '..', 'test-message-rendering.html');
fs.writeFileSync(outputPath, html);

console.log(`테스트 페이지가 생성되었습니다: ${outputPath}`);
console.log('이 HTML 파일을 브라우저에서 열어서 메시지 렌더링을 테스트할 수 있습니다.');