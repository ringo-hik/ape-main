// 테스트 HTML 생성 및 검사 스크립트
const fs = require('fs');
const path = require('path');

// 테스트용 임시 HTML 파일 생성
const generateTestHtml = () => {
  const html = `<\!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>APE Chat Test</title>
  <style>
    body { background: #1e1e1e; color: #fff; font-family: Arial, sans-serif; }
    #chat-container { display: flex; flex-direction: column; height: 100vh; }
    #chat-messages { flex: 1; overflow-y: auto; padding: 10px; }
    #chat-input-container { padding: 10px; }
    .message { padding: 8px; margin: 4px 0; border-radius: 4px; }
    .user { background-color: #2b2b2b; align-self: flex-end; }
    .assistant { background-color: #3a3a3a; }
  </style>
</head>
<body>
  <div id="chat-container">
    <div id="chat-messages"></div>
    <div id="chat-input-container">
      <div id="input-wrapper">
        <textarea id="chat-input" placeholder="Type a message..." rows="1"></textarea>
      </div>
      <button id="send-button">Send</button>
      <button id="clear-button">Clear</button>
    </div>
  </div>

  <script>
    // 테스트 스크립트
    document.addEventListener('DOMContentLoaded', () => {
      const chatMessages = document.getElementById('chat-messages');
      const chatInput = document.getElementById('chat-input');
      const sendButton = document.getElementById('send-button');
      const clearButton = document.getElementById('clear-button');
      
      console.log('DOM 요소 검사:');
      console.log('- #chat-messages:', chatMessages);
      console.log('- #chat-input:', chatInput);
      console.log('- #send-button:', sendButton);
      console.log('- #clear-button:', clearButton);
      
      if (\!chatMessages || \!chatInput || \!sendButton || \!clearButton) {
        console.error('필수 UI 요소 누락');
      } else {
        console.log('모든 필수 UI 요소 존재');
        
        // 테스트 메시지 표시
        const testMessage = document.createElement('div');
        testMessage.className = 'message assistant';
        testMessage.textContent = '테스트 메시지입니다.';
        chatMessages.appendChild(testMessage);
        
        // 이벤트 리스너 추가
        sendButton.addEventListener('click', () => {
          const content = chatInput.value.trim();
          if (content) {
            const userMessage = document.createElement('div');
            userMessage.className = 'message user';
            userMessage.textContent = content;
            chatMessages.appendChild(userMessage);
            
            chatInput.value = '';
          }
        });
        
        clearButton.addEventListener('click', () => {
          chatMessages.innerHTML = '';
        });
      }
    });
  </script>
</body>
</html>`;

  const testHtmlPath = path.join(__dirname, 'test-chat.html');
  fs.writeFileSync(testHtmlPath, html, 'utf8');
  console.log(`Test HTML created at: ${testHtmlPath}`);
  
  return testHtmlPath;
};

// 실제 사용되는 HTML 구조 분석
const analyzeActualHtml = () => {
  try {
    const providerPath = path.join(__dirname, '..', 'src', 'ui', 'chatViewProvider.ts');
    const providerCode = fs.readFileSync(providerPath, 'utf8');
    
    // getBodyContent 함수 내용 추출
    const bodyContentMatch = providerCode.match(/getBodyContent\(\):.*?return\s+`([\s\S]*?)`\s*;/m);
    if (bodyContentMatch && bodyContentMatch[1]) {
      const bodyContent = bodyContentMatch[1].trim();
      
      // HTML 요소 ID 분석
      const idMatches = bodyContent.match(/id="([^"]+)"/g) || [];
      const ids = idMatches.map(match => match.replace(/id="([^"]+)"/, '$1'));
      
      console.log('Actual HTML structure analysis:');
      console.log('- IDs found:', ids.join(', '));
      
      // 중요 ID 확인
      const criticalIds = ['chat-container', 'chat-messages', 'chat-input', 'send-button', 'clear-button'];
      const missingIds = criticalIds.filter(id => \!ids.includes(id));
      
      if (missingIds.length > 0) {
        console.error('CRITICAL: Missing required IDs:', missingIds.join(', '));
      } else {
        console.log('All critical IDs present');
      }
      
      // 구조 설명
      console.log('\nHTML 구조:');
      const lines = bodyContent.split('\n').map(line => line.trim()).filter(line => line);
      lines.forEach(line => {
        if (line.includes('<div') || line.includes('<button') || line.includes('<textarea')) {
          console.log(line);
        }
      });
      
      return { ids, missingIds };
    } else {
      console.error('Could not extract body content from provider');
      return { ids: [], missingIds: [] };
    }
  } catch (error) {
    console.error('Error analyzing HTML structure:', error);
    return { ids: [], missingIds: [] };
  }
};

// 모든 분석 실행
console.log('===== APE Chat View HTML Analysis =====');
const testHtmlPath = generateTestHtml();
console.log('\n===== Analyzing Actual HTML Structure =====');
analyzeActualHtml();
