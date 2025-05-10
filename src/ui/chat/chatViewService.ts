/**
 * 채팅 뷰 서비스
 * 
 * 채팅 인터페이스 관련 기능을 통합 제공
 * - 메시지 포맷팅
 * - 코드 블록 변환
 * - 채팅 UI 스크립트 생성
 */

/**
 * 메시지 포맷팅 옵션
 */
export interface FormatOptions {
  enableModernCodeBlocks: boolean;
  enableLineNumbers: boolean;
  enableSyntaxHighlighting: boolean;
}

/**
 * 채팅 뷰 서비스 클래스
 */
export class ChatViewService {
  private static codeBlockCounter = 0;

  /**
   * 채팅 뷰 스크립트 생성
   * @param initialMessages 초기 메시지
   * @param isStreaming 스트리밍 상태
   * @returns 스크립트 문자열
   */
  public static getChatViewScript(initialMessages: any[], isStreaming: boolean): string {
    console.log('ChatViewService.getChatViewScript called:', 
      `initialMessages: ${initialMessages.length} items, isStreaming: ${isStreaming}`);
    
    return `
    // Initial data
    const vscode = acquireVsCodeApi();
    const initialMessages = ${JSON.stringify(initialMessages)};
    const isStreaming = ${isStreaming};
    let codeBlockCounter = 0;
    
    // Store messages in state
    vscode.setState({ messages: initialMessages });
    
    // Setup message handler
    window.addEventListener('message', event => {
      const message = event.data;
      
      switch (message.type) {
        case 'updateMessages': {
          updateMessages(message.messages, message.isStreaming);
          break;
        }
          
        case 'editorContent': {
          handleEditorContent(message.content);
          break;
        }
          
        case 'commandSuggestions': {
          updateCommandSuggestions(message.suggestions);
          break;
        }
          
        case 'insertCommandToInput': {
          // 도움말에서 넘어온 명령어 채팅창에 입력
          insertCommandFromHelp(message.command);
          break;
        }
          
        case 'updateModelIndicator': {
          // 모델 이름 업데이트
          if (modelIndicator) {
            modelIndicator.textContent = message.modelName;
          }
          break;
        }

        case 'fileAttached': {
          // 파일 첨부 처리
          handleFileAttachment(message.file);
          break;
        }
        
        case 'updateSmartPrompting': {
          // 스마트 프롬프팅 상태 업데이트
          if (typeof updateSmartPromptingUI === 'function') {
            updateSmartPromptingUI(message.enabled, message.mode);
          }
          break;
        }

        case 'formatResponse': {
          // 텍스트 포맷 응답 처리
          if (message.formattedText && chatInput) {
            chatInput.value = message.formattedText;
            resizeInput();
          }
          break;
        }
      }
    });
    
    // DOM Elements - initialize as variables first, we'll get them in init()
    let chatMessages;
    let chatInput;
    let sendButton;
    let clearButton;
    let attachButton;
    let modelIndicator;
    let modelSelector;
    
    // 파일 첨부 관련 변수
    let attachedFiles = [];
    
    // 슬래시 입력 시 플레이스홀더 요소 생성
    let inputPlaceholder;
    let commandSuggestionsContainer;
    
    // Active suggestion index
    let activeSuggestionIndex = -1;
    let suggestions = [];
    
    // 스마트 스크롤 상태 관리 변수
    let isUserScrolled = false;
    let isScrollNearBottom = true;
    const SCROLL_THRESHOLD = 100; // 스크롤이 바닥으로부터 얼마나 떨어져 있을 때 '근처'로 간주할지

    // 사용자 스크롤 감지 함수
    function detectUserScroll() {
      if (!chatMessages) return;
      
      // 스크롤 위치 계산
      const scrollPosition = chatMessages.scrollTop + chatMessages.clientHeight;
      const scrollThreshold = chatMessages.scrollHeight - SCROLL_THRESHOLD;
      
      // 스크롤이 바닥 근처에 있는지 체크
      isScrollNearBottom = scrollPosition >= scrollThreshold;
      
      // 사용자 스크롤 이벤트 감지
      if (!isScrollNearBottom) {
        isUserScrolled = true;
      }
    }
    
    // 스마트 스크롤 실행 함수
    function performSmartScroll(forceScroll = false) {
      if (!chatMessages) return;
      
      // 사용자가 스크롤을 올리지 않았거나 강제 스크롤이 필요한 경우, 혹은 스크롤이 바닥 근처에 있는 경우에만 스크롤
      if (forceScroll || !isUserScrolled || isScrollNearBottom) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
        isUserScrolled = false;
      }
    }
    
    // 메시지 ID를 DOM ID로 변환
    function getMessageDomId(messageId) {
      return 'msg-' + messageId.replace(/\\s+/g, '-');
    }
    
    // Update messages in the UI
    function updateMessages(messages, isStreaming) {
      console.log("updateMessages called with", messages.length, "messages, isStreaming:", isStreaming);
      
      // Store in state
      vscode.setState({ messages });
      
      // Check if chatMessages exists
      if (!chatMessages) {
        console.error("Error: chatMessages element not found. Retrying initialization...");
        setTimeout(init, 100);
        return;
      }
      
      const currentMessageIds = Array.from(chatMessages.children).map(
        el => el.getAttribute('data-message-id')
      ).filter(id => id);
      
      // 스크롤 위치 확인: 현재 스크롤이 바닥에 가까운지 체크
      detectUserScroll();
      
      // 메시지 업데이트 (추가 또는 내용 변경)
      messages.forEach(message => {
        const messageId = message.id;
        const domId = getMessageDomId(messageId);
        let messageElement = document.getElementById(domId);
        const isLastMessage = message.id === messages[messages.length - 1].id;
        const isStreamingLastMessage = isStreaming && isLastMessage && message.role === 'assistant';
        
        // 새 메시지인 경우 요소 생성
        if (!messageElement) {
          messageElement = document.createElement('div');
          messageElement.id = domId;
          messageElement.className = 'message ' + message.role;
          if (isStreamingLastMessage) {
            messageElement.classList.add('streaming');
          }
          messageElement.setAttribute('data-message-id', messageId);
          
          const contentElement = document.createElement('div');
          contentElement.className = 'message-content';
          messageElement.appendChild(contentElement);
          
          chatMessages.appendChild(messageElement);
        } else if (isStreamingLastMessage) {
          // 스트리밍 중인 메시지에 클래스 추가
          messageElement.classList.add('streaming');
        } else {
          // 스트리밍이 아니면 클래스 제거
          messageElement.classList.remove('streaming');
        }
        
        // 내용 업데이트 (변경된 경우에만)
        const contentElement = messageElement.querySelector('.message-content');
        const formattedContent = formatMessageContent(message.content);
        
        if (contentElement.innerHTML !== formattedContent) {
          // 스트리밍 메시지의 경우 효율적인 DOM 업데이트 수행
          if (isStreamingLastMessage) {
            // 스트리밍 중인 메시지에 스트리밍 표시자 추가
            const currentContent = contentElement.innerHTML;
            const newContent = formattedContent;
            
            // 이미 내용이 있는 경우, 추가된 부분만 효율적으로 업데이트
            if (currentContent && newContent.startsWith(currentContent)) {
              // 기존 내용 이후에 추가된 부분만 추가 (부분 업데이트)
              const additionalContent = newContent.substring(currentContent.length);
              if (additionalContent) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = additionalContent;
                const fragment = document.createDocumentFragment();
                while (tempDiv.firstChild) {
                  fragment.appendChild(tempDiv.firstChild);
                }
                contentElement.appendChild(fragment);
                
                // 스마트 스크롤 수행 (스트리밍 중 점진적 업데이트)
                performSmartScroll();
                return; // 부분 업데이트 후 종료
              }
            } else {
              // 새 메시지이거나 완전히 다른 내용인 경우 전체 교체
              contentElement.innerHTML = formattedContent;
            }
          } else {
            // 일반 메시지는 전체 내용 교체
            contentElement.innerHTML = formattedContent;
          }
        }
      });
      
      // 제거된 메시지 삭제
      const currentIds = messages.map(m => m.id);
      currentMessageIds.forEach(id => {
        if (!currentIds.includes(id)) {
          const element = document.querySelector('[data-message-id="' + id + '"]');
          if (element) {
            element.remove();
          }
        }
      });
      
      // 스마트 스크롤 수행 (새 메시지가 추가되었거나 스트리밍이 끝났을 때는 강제 스크롤)
      performSmartScroll(messages.length !== currentMessageIds.length || !isStreaming);
      
      // Update UI based on streaming state
      if (isStreaming) {
        sendButton.innerHTML = '<span class="emoji-icon">■</span>';
        sendButton.title = 'Stop generating';
        chatInput.disabled = true;
        
        // 스트리밍 중일 때 마지막 메시지에 스트리밍 표시자 추가
        const lastMessage = chatMessages.lastElementChild;
        if (lastMessage && lastMessage.classList.contains('assistant')) {
          // 스트리밍 인디케이터 추가 또는 업데이트
          let indicator = lastMessage.querySelector('.streaming-indicator');
          if (!indicator) {
            indicator = document.createElement('span');
            indicator.className = 'streaming-indicator';
            lastMessage.appendChild(indicator);
          }
        }
      } else {
        sendButton.innerHTML = '<span class="emoji-icon">↑</span>';
        sendButton.title = 'Send message';
        chatInput.disabled = false;
        
        // 스트리밍이 끝났을 때 스트리밍 표시자 제거
        const indicators = document.querySelectorAll('.streaming-indicator');
        indicators.forEach(indicator => indicator.remove());
      }
    }
    
    // 첨부 파일 처리
    function handleFileAttachment(file) {
      // 첨부 파일 목록에 추가
      attachedFiles.push({
        path: file.relativePath || file.path,
        name: file.name,
        type: file.type,
        content: file.hasContent ? file.content : undefined
      });
      
      // 첨부 파일 표시 또는 알림
      const fileName = file.name;
      const fileInfo = "첨부된 파일: " + fileName;
      
      // 입력창에 첨부 파일 정보 추가
      if (chatInput.value) {
        chatInput.value += '\n' + fileInfo;
      } else {
        chatInput.value = fileInfo;
      }
      
      resizeInput();
      chatInput.focus();
    }
    
    // Format message content with code blocks
    function formatMessageContent(content) {
      if (!content) return '';

      // HTML 감지 - 더 다양한 태그 인식
      const trimmedContent = content.trim();
      if (trimmedContent.startsWith('<') && (
        trimmedContent.includes('</div>') ||
        trimmedContent.includes('</p>') ||
        trimmedContent.includes('</h') ||
        trimmedContent.includes('</span>') ||
        trimmedContent.includes('</ul>') ||
        trimmedContent.includes('</li>') ||
        trimmedContent.includes('</table>') ||
        trimmedContent.match(/<[a-zA-Z0-9_]+[^>]*>/)
      )) {
        return content;
      }

      // 마크다운 컨테이너로 시작
      let formatted = '<div class="markdown-content">';
      let processedContent = content;

      // 코드 블록 처리 (먼저 처리하여 다른 마크다운 변환에 영향을 주지 않도록)
      processedContent = processedContent.replace(/\`\`\`(\\w*)\\n([\\s\\S]*?)\\n\`\`\`/g, function(match, language, code) {
        const codeId = 'code_' + (++codeBlockCounter);
        const escapedCode = escapeHtml(code);
        const lang = language || 'plaintext';

        // Generate line numbers
        const lines = code.split('\\n');
        const lineNumbers = lines.map((_, i) => (i + 1)).join('\\n');
        const showLineNumbers = lines.length > 1;

        // Built with concatenation to avoid template literal issues
        return '<div class="code-block-container code-block-popup">' +
          '<div class="code-block-header">' +
            '<span class="code-block-language language-' + lang + '">' + lang + '</span>' +
            '<div class="code-block-actions">' +
              '<button class="code-action-button copy-button" data-code-id="' + codeId + '" title="복사">' +
                '<i class="codicon codicon-copy"></i>' +
                '<span class="tooltip">클립보드에 복사</span>' +
              '</button>' +
              '<button class="code-action-button insert-code-button" data-code-id="' + codeId + '" title="에디터에 삽입">' +
                '<i class="codicon codicon-arrow-small-right"></i>' +
                '<span class="tooltip">현재 파일에 복사</span>' +
              '</button>' +
              '<button class="code-action-button new-file-button" data-code-id="' + codeId + '" title="새 파일로 생성">' +
                '<i class="codicon codicon-new-file"></i>' +
                '<span class="tooltip">새 파일로 생성</span>' +
              '</button>' +
            '</div>' +
          '</div>' +
          '<div class="code-content ' + (showLineNumbers ? 'with-line-numbers' : '') + '">' +
            (showLineNumbers ? '<div class="line-numbers">' + lineNumbers + '</div>' : '') +
            '<div class="code-area">' +
              '<code class="language-' + lang + '" id="code-' + codeId + '">' + escapedCode + '</code>' +
            '</div>' +
          '</div>' +
        '</div>';
      });

      // 헤더 변환 (h1-h6)
      processedContent = processedContent
        .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
        .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
        .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
        .replace(/^#### (.*?)$/gm, '<h4>$1</h4>')
        .replace(/^##### (.*?)$/gm, '<h5>$1</h5>')
        .replace(/^###### (.*?)$/gm, '<h6>$1</h6>');

      // 볼드, 이탤릭 및 취소선
      processedContent = processedContent
        .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/~~(.*?)~~/g, '<del>$1</del>');

      // 인라인 코드 변환
      processedContent = processedContent.replace(/\`([^\`]+)\`/g, function(match, code) {
        return '<code class="inline-code">' + escapeHtml(code) + '</code>';
      });

      // 수평선
      processedContent = processedContent.replace(/^---$/gm, '<hr>');

      // 링크 [텍스트](URL)
      processedContent = processedContent.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

      // 이미지 ![대체텍스트](URL)
      processedContent = processedContent.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">');

      // 인용구 (blockquote)
      let inQuote = false;
      let quoteContent = '';

      processedContent = processedContent.replace(/^> (.*?)$/gm, function(match, content) {
        if (!inQuote) {
          inQuote = true;
          quoteContent = '<blockquote>\n<p>' + content + '</p>\n';
          return '';
        } else {
          quoteContent += '<p>' + content + '</p>\n';
          return '';
        }
      });

      if (inQuote) {
        quoteContent += '</blockquote>';
        processedContent += quoteContent;
        inQuote = false;
      }

      // 순서 없는 목록 변환 (ul, li)
      let inList = false;
      let listContent = '';

      processedContent = processedContent.replace(/^[\*\-\+] (.*?)$/gm, function(match, item) {
        if (!inList) {
          inList = true;
          listContent = '<ul>\n<li>' + item + '</li>\n';
          return '';
        } else {
          listContent += '<li>' + item + '</li>\n';
          return '';
        }
      });

      if (inList) {
        listContent += '</ul>';
        processedContent += listContent;
        inList = false;
      }

      // 순서 있는 목록 변환 (ol, li)
      let inOrderedList = false;
      let orderedListContent = '';

      processedContent = processedContent.replace(/^(\d+)\. (.*?)$/gm, function(match, number, item) {
        if (!inOrderedList) {
          inOrderedList = true;
          orderedListContent = '<ol>\n<li>' + item + '</li>\n';
          return '';
        } else {
          orderedListContent += '<li>' + item + '</li>\n';
          return '';
        }
      });

      if (inOrderedList) {
        orderedListContent += '</ol>';
        processedContent += orderedListContent;
        inOrderedList = false;
      }

      // 첨부 파일 표시 개선 (파일명: 파일경로)
      processedContent = processedContent.replace(/첨부된 파일: ([^\\n]+)/g, function(match, fileName) {
        return '<div class="attached-file">' +
          '<span class="attachment-icon">📎</span> ' +
          '<span class="attachment-name">' + fileName + '</span>' +
          '<div class="attachment-actions">' +
            '<button class="attachment-action view-file" title="파일 열기">' +
              '<span class="emoji-icon">👁️</span>' +
            '</button>' +
          '</div>' +
        '</div>';
      });

      // 남은 줄바꿈 처리 - 단락으로 변환
      const paragraphs = processedContent.split(/\n\n+/);
      if (paragraphs.length > 1) {
        processedContent = paragraphs
          .map(p => p.trim())
          .filter(p => p.length > 0)
          .map(p => {
            // 이미 HTML 태그로 시작하는 경우 그대로 유지
            if (p.startsWith('<') &&
                (p.startsWith('<h') ||
                 p.startsWith('<ul') ||
                 p.startsWith('<ol') ||
                 p.startsWith('<blockquote') ||
                 p.startsWith('<pre') ||
                 p.startsWith('<div'))) {
              return p;
            } else {
              // 일반 텍스트는 p 태그로 감싸고 내부 줄바꿈은 <br>로 변환
              return '<p>' + p.replace(/\n/g, '<br>') + '</p>';
            }
          })
          .join('\n');
      } else {
        // 단락이 하나면 단순히 줄바꿈만 처리
        processedContent = processedContent.replace(/\n/g, '<br>');
      }

      // 마크다운 컨테이너 닫기
      formatted += processedContent + '</div>';

      return formatted;
    }
    
    // Escape HTML to prevent XSS
    function escapeHtml(unsafe) {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }
    
    // Handle editor content insertion
    function handleEditorContent(content) {
      if (content) {
        chatInput.value += '\`\`\`\\n' + content + '\\n\`\`\`\\n';
        resizeInput();
      }
    }
    
    // Auto-resize input based on content
    function resizeInput() {
      chatInput.style.height = 'auto';
      chatInput.style.height = (chatInput.scrollHeight) + 'px';
    }
    
    // Update command suggestions - Minimal style popover
    function updateCommandSuggestions(newSuggestions) {
      suggestions = newSuggestions || [];
      activeSuggestionIndex = -1;

      // Clear the container
      commandSuggestionsContainer.innerHTML = '';

      if (suggestions.length === 0) {
        // Hide the container if there are no suggestions
        commandSuggestionsContainer.style.display = 'none';
        return;
      }

      // Position the suggestions container to align with cursor
      positionCommandSuggestions();

      // Show the container
      commandSuggestionsContainer.style.display = 'block';

      // 미니멀 UI를 위한 처리 - 먼저 정렬
      const sortedSuggestions = [...suggestions].sort((a, b) => {
        // 우선 카테고리별로 정렬
        const categoryOrder = {
          'general': 1,
          'git': 2,
          'code': 3,
          'utility': 4,
          'advanced': 5
        };

        const catA = categoryOrder[a.category] || 99;
        const catB = categoryOrder[b.category] || 99;

        if (catA !== catB) return catA - catB;

        // 그 다음 레이블로 정렬
        return a.label.localeCompare(b.label);
      });

      // 최대 5개만 바로 표시
      const visibleSuggestions = sortedSuggestions.slice(0, 5);
      const remainingCount = sortedSuggestions.length > 5 ? sortedSuggestions.length - 5 : 0;

      // 그룹핑하지 않고 카테고리별 아이콘으로 구분
      visibleSuggestions.forEach((suggestion, index) => {
        const suggestionElement = document.createElement('div');
        suggestionElement.className = 'command-suggestion';
        suggestionElement.dataset.index = String(index);

        // 카테고리 아이콘 추가
        const iconElement = document.createElement('span');
        iconElement.className = 'suggestion-icon';
        iconElement.textContent = getSvgIconForCategory(suggestion.category);
        suggestionElement.appendChild(iconElement);

        // 레이블
        const labelElement = document.createElement('span');
        labelElement.className = 'suggestion-label';
        labelElement.textContent = suggestion.label;
        suggestionElement.appendChild(labelElement);

        // 설명
        const descriptionElement = document.createElement('span');
        descriptionElement.className = 'suggestion-description';
        descriptionElement.textContent = suggestion.description;
        suggestionElement.appendChild(descriptionElement);

        // 단축키 힌트 추가
        let shortcutHint = '';
        if (index >= 0 && index < 9) {
          shortcutHint = 'Tab+' + (index + 1);
        } else if (index === 9) {
          shortcutHint = 'Tab+0';
        }
        suggestionElement.dataset.shortcut = shortcutHint;

        // 클릭 핸들러
        suggestionElement.addEventListener('click', () => {
          insertSuggestion(suggestion);
        });

        // 마우스오버 핸들러
        suggestionElement.addEventListener('mouseover', () => {
          activeSuggestionIndex = index;
          highlightActiveSuggestion();
        });

        commandSuggestionsContainer.appendChild(suggestionElement);
      });

      // 더 많은 제안이 있는 경우 페이지 번호 표시
      if (remainingCount > 0) {
        const moreElement = document.createElement('div');
        moreElement.className = 'command-more-indicator';
        moreElement.textContent = '+ ' + remainingCount + ' 더 보기... (스크롤)';
        moreElement.style.textAlign = 'center';
        moreElement.style.padding = '4px';
        moreElement.style.fontSize = '11px';
        moreElement.style.color = 'var(--ape-text-secondary)';
        moreElement.style.borderTop = '1px solid var(--ape-border-subtle)';
        commandSuggestionsContainer.appendChild(moreElement);

        // 나머지 항목도 추가 (스크롤 가능)
        sortedSuggestions.slice(5).forEach((suggestion, idx) => {
          const globalIndex = idx + 5;
          const suggestionElement = document.createElement('div');
          suggestionElement.className = 'command-suggestion';
          suggestionElement.dataset.index = String(globalIndex);

          // 카테고리 아이콘 추가
          const iconElement = document.createElement('span');
          iconElement.className = 'suggestion-icon';
          iconElement.textContent = getSvgIconForCategory(suggestion.category);
          suggestionElement.appendChild(iconElement);

          // 레이블
          const labelElement = document.createElement('span');
          labelElement.className = 'suggestion-label';
          labelElement.textContent = suggestion.label;
          suggestionElement.appendChild(labelElement);

          // 설명
          const descriptionElement = document.createElement('span');
          descriptionElement.className = 'suggestion-description';
          descriptionElement.textContent = suggestion.description;
          suggestionElement.appendChild(descriptionElement);

          // 클릭 핸들러
          suggestionElement.addEventListener('click', () => {
            insertSuggestion(suggestion);
          });

          // 마우스오버 핸들러
          suggestionElement.addEventListener('mouseover', () => {
            activeSuggestionIndex = globalIndex;
            highlightActiveSuggestion();
          });

          commandSuggestionsContainer.appendChild(suggestionElement);
        });
      }

      // 시작점으로 스크롤
      commandSuggestionsContainer.scrollTop = 0;
    }
    
    // Position command suggestions popover to align with cursor
    function positionCommandSuggestions() {
      if (!chatInput) return;
      
      // Get the input's position
      const inputRect = chatInput.getBoundingClientRect();
      const inputContainer = document.getElementById('chat-input-container');
      const containerRect = inputContainer.getBoundingClientRect();
      
      // Get the cursor position
      const cursorPosition = getCursorPosition(chatInput);
      
      // Calculate left position based on cursor
      let leftPosition = 16; // Default padding
      
      // If we can detect cursor position, align popover with cursor
      if (cursorPosition.left > 0) {
        leftPosition = cursorPosition.left;
        
        // Make sure popover doesn't extend beyond the right edge
        const maxRight = containerRect.width - 16; // 16px padding from right
        if (leftPosition + 300 > maxRight) { // 300px is min-width of popover
          leftPosition = Math.max(16, maxRight - 300);
        }
      }
      
      // Set the position
      commandSuggestionsContainer.style.left = leftPosition + 'px';
      
      // Set position relative to input container
      commandSuggestionsContainer.style.position = 'absolute';
      commandSuggestionsContainer.style.top = (inputRect.height + 4) + 'px';
    }
    
    // Get cursor position in the input field
    function getCursorPosition(inputElement) {
      // Default position (beginning of input)
      const defaultPosition = {
        top: 0,
        left: 16 // Default padding
      };
      
      // Simple approach: for single-line inputs 
      // Calculate based on text before cursor
      try {
        // Create a temporary span to measure text width
        const span = document.createElement('span');
        span.style.visibility = 'hidden';
        span.style.position = 'absolute';
        span.style.whiteSpace = 'pre';
        span.style.font = window.getComputedStyle(inputElement).font;
        
        // Get text before cursor
        const textBeforeCursor = inputElement.value.substring(0, inputElement.selectionStart || 0);
        span.textContent = textBeforeCursor || '';
        
        // Append to body, measure, then remove
        document.body.appendChild(span);
        const width = span.getBoundingClientRect().width;
        document.body.removeChild(span);
        
        // Return position
        return {
          top: defaultPosition.top,
          left: width + 16 // Add padding
        };
      } catch (e) {
        console.error('Error calculating cursor position:', e);
        return defaultPosition;
      }
    }
    
    // Get category title
    function getCategoryTitle(category) {
      switch (category) {
        case 'general':
          return '일반 명령어';
        case 'git':
          return 'Git 관련 명령어';
        case 'code':
          return '코드 관련 명령어';
        case 'utility':
          return '유틸리티 명령어';
        case 'advanced':
          return '고급 명령어';
        default:
          return category;
      }
    }
    
    // 카테고리별 미니멀 아이콘 가져오기
    function getSvgIconForCategory(category) {
      // 미니멀 아이콘 반환
      switch (category) {
        case 'general':
          return '●';  // 일반 명령어 - 심플한 원형
        case 'git':
          return '◆';  // Git 명령어 - 다이아몬드
        case 'code':
          return '▢';  // 코드 관련 - 사각형
        case 'utility':
          return '◈';  // 유틸리티 - 특수 문자
        case 'advanced':
          return '◎';  // 고급 설정 - 이중 원형
        default:
          return '○';  // 기본값 - 빈 원형
      }
    }
    
    // Highlight active suggestion
    function highlightActiveSuggestion() {
      // Remove highlight from all suggestions
      document.querySelectorAll('.command-suggestion').forEach(el => {
        el.classList.remove('active');
      });
      
      // Highlight the active suggestion
      if (activeSuggestionIndex >= 0 && activeSuggestionIndex < suggestions.length) {
        const activeElement = document.querySelector(
          '.command-suggestion[data-index="' + activeSuggestionIndex + '"]'
        );
        
        if (activeElement) {
          activeElement.classList.add('active');
          
          // Scroll into view if needed
          const container = commandSuggestionsContainer;
          const elementTop = activeElement.offsetTop;
          const elementBottom = elementTop + activeElement.offsetHeight;
          const containerTop = container.scrollTop;
          const containerBottom = containerTop + container.offsetHeight;
          
          if (elementTop < containerTop) {
            container.scrollTop = elementTop;
          } else if (elementBottom > containerBottom) {
            container.scrollTop = elementBottom - container.offsetHeight;
          }
        }
      }
    }
    
    // Insert suggestion into input
    function insertSuggestion(suggestion) {
      if (!suggestion) return;
      
      chatInput.value = suggestion.insertText;
      chatInput.focus();
      
      // Position cursor at the end
      chatInput.selectionStart = chatInput.selectionEnd = chatInput.value.length;
      
      // Resize input
      resizeInput();
      
      // Clear suggestions
      updateCommandSuggestions([]);
      
      // 플레이스홀더 숨기기
      inputPlaceholder.classList.remove('visible');
      
      // Notify about input change
      notifyInputChanged();
    }
    
    // 메인 명령어 리스트
    const mainCommands = [
      { name: 'help', description: '도움말 표시' },
      { name: 'git', description: 'Git 관련 명령어' },
      { name: 'jira', description: 'JIRA 관련 명령어' },
      { name: 'swdp', description: 'SWDP 관련 명령어' },
      { name: 'code', description: '코드 분석 및 작업' },
      { name: 'todo', description: '할 일 관리' },
      { name: 'model', description: 'LLM 모델 설정' },
      { name: 'clear', description: '채팅 내역 지우기' },
      { name: 'settings', description: '설정 열기' }
    ];
    
    // 탭 키 입력 시간 추적 변수
    let lastTabTime = 0;
    let tabCount = 0;
    let currentMainCommandIndex = -1;
    let isInMainCommandCycling = false;
    
    // 단독 실행 가능한 명령어 목록
    const standAloneCommands = ['help', 'clear', 'settings', 'model'];
    
    // Handle tab key for autocompletion with enhanced behavior
    function handleTabCompletion(event) {
      const now = Date.now();
      const isDoubleTap = now - lastTabTime < 500; // 500ms 내에 탭을 두 번 누른 경우
      lastTabTime = now;
      
      // 메인 명령어 순환 모드 여부 확인
      if (chatInput.value === "" || isInMainCommandCycling) {
        // 메인 명령어 순환 모드
        isInMainCommandCycling = true;
        
        // Tab 키 계속 누르면 메인 명령어 순환
        if (currentMainCommandIndex === -1 || !isDoubleTap) {
          currentMainCommandIndex = 0; // 첫 번째 시작
        } else {
          // 다음 메인 명령어로 이동
          currentMainCommandIndex = (currentMainCommandIndex + 1) % mainCommands.length;
        }
        
        const currentCommand = mainCommands[currentMainCommandIndex];
        chatInput.value = "/" + currentCommand.name;
        
        // 커서 위치 조정
        chatInput.selectionStart = chatInput.selectionEnd = chatInput.value.length;
        
        // 입력창 크기 조정 및 변경 알림
        resizeInput();
        notifyInputChanged();
        return true;
      }
      
      // 일반 명령어 자동완성 처리
      if (suggestions.length === 0) return false;
      
      // Tab+number 단축키 처리 (Tab + 1-9 keys)
      if (event && event.shiftKey && event.key >= '1' && event.key <= '9') {
        const requestedIndex = parseInt(event.key) - 1;
        if (requestedIndex >= 0 && requestedIndex < suggestions.length) {
          activeSuggestionIndex = requestedIndex;
          const suggestion = suggestions[activeSuggestionIndex];
          insertSuggestion(suggestion);
          
          // 단독 실행 가능한 명령어인 경우 자동으로 실행
          if (isStandAloneCommand(suggestion.insertText)) {
            sendMessage();
          }
          return true;
        }
      } else if (event && event.shiftKey && event.key === '0') {
        // Tab+0 for the 10th suggestion
        if (9 < suggestions.length) {
          activeSuggestionIndex = 9;
          const suggestion = suggestions[activeSuggestionIndex];
          insertSuggestion(suggestion);
          
          // 단독 실행 가능한 명령어인 경우 자동으로 실행
          if (isStandAloneCommand(suggestion.insertText)) {
            sendMessage();
          }
          return true;
        }
      }
      
      // 일반 Tab 키 동작
      if (activeSuggestionIndex === -1) {
        // 선택된 제안이 없으면 첫 번째 선택
        activeSuggestionIndex = 0;
      } else if (isDoubleTap) {
        // 탭을 연속으로 빠르게 누르면 다음 제안으로 이동
        activeSuggestionIndex = (activeSuggestionIndex + 1) % suggestions.length;
        highlightActiveSuggestion();
        return true;
      }
      
      if (activeSuggestionIndex >= 0 && activeSuggestionIndex < suggestions.length) {
        const suggestion = suggestions[activeSuggestionIndex];
        insertSuggestion(suggestion);
        
        // 단독 실행 가능한 명령어인 경우 자동으로 실행
        if (isStandAloneCommand(suggestion.insertText)) {
          sendMessage();
        }
        return true;
      }
      
      return false;
    }
    
    // 단독 실행 가능한 명령어인지 확인
    function isStandAloneCommand(commandText) {
      if (!commandText.startsWith('/')) return false;
      
      const commandParts = commandText.substring(1).split(/ +/);
      const baseCommand = commandParts[0];
      
      // 단독 실행 가능한 명령어 목록에 있는지 확인
      return standAloneCommands.includes(baseCommand) && commandParts.length === 1;
    }
    
    // 메시지 전송 함수
    function sendMessage() {
      const content = chatInput.value.trim();
      if (content) {
        // 첨부 파일이 있는 경우, 메타데이터에 포함
        if (attachedFiles.length > 0) {
          vscode.postMessage({ 
            type: 'sendMessage', 
            content,
            metadata: {
              attachedFiles: attachedFiles
            }
          });
          // 첨부 파일 초기화
          attachedFiles = [];
        } else {
          vscode.postMessage({ type: 'sendMessage', content });
        }
        
        chatInput.value = '';
        resizeInput();
        
        // 제안 목록 초기화
        updateCommandSuggestions([]);
        
        // 메인 명령어 순환 모드 초기화
        isInMainCommandCycling = false;
        currentMainCommandIndex = -1;
      }
    }
    
    // Navigate suggestions with arrow keys (enhanced)
    function navigateSuggestions(direction) {
      if (suggestions.length === 0) return false;
      
      // First navigation sets active index to 0 if not set
      if (activeSuggestionIndex === -1) {
        activeSuggestionIndex = 0;
        highlightActiveSuggestion();
        return true;
      }
      
      // Navigate based on direction
      if (direction === 'up') {
        activeSuggestionIndex = activeSuggestionIndex <= 0 ? 
          suggestions.length - 1 : activeSuggestionIndex - 1;
      } else if (direction === 'down') {
        activeSuggestionIndex = activeSuggestionIndex >= suggestions.length - 1 ? 
          0 : activeSuggestionIndex + 1;
      } else if (direction === 'pageup') {
        // Jump up by 5 items or to the top
        activeSuggestionIndex = Math.max(0, activeSuggestionIndex - 5);
      } else if (direction === 'pagedown') {
        // Jump down by 5 items or to the bottom
        activeSuggestionIndex = Math.min(suggestions.length - 1, activeSuggestionIndex + 5);
      } else if (direction === 'home') {
        // Go to first suggestion
        activeSuggestionIndex = 0;
      } else if (direction === 'end') {
        // Go to last suggestion
        activeSuggestionIndex = suggestions.length - 1;
      }
      
      highlightActiveSuggestion();
      return true;
    }
    
    // Notify about input change
    function notifyInputChanged() {
      const inputValue = chatInput.value;
      
      // 입력값에 따라 플레이스홀더 업데이트
      updateInputPlaceholder(inputValue);
      
      vscode.postMessage({ 
        type: 'inputChanged', 
        content: inputValue 
      });
    }
    
    // 입력값에 따라 플레이스홀더 업데이트 - 제거함 (팝오버 UI로 기능 대체)
    function updateInputPlaceholder(inputValue) {
      // 플레이스홀더는 항상 숨김 상태로 유지
      if (inputPlaceholder && inputPlaceholder.classList) {
        inputPlaceholder.classList.remove('visible');
      }
    }
    
    // 도움말에서 명령어 입력
    function insertCommandFromHelp(command) {
      // 슬래시가 없는 경우 추가
      if (!command.startsWith('/')) {
        command = '/' + command;
      }
      
      // 채팅 입력창에 명령어 입력
      chatInput.value = command;
      chatInput.focus();
      
      // 커서를 마지막으로 이동
      chatInput.selectionStart = chatInput.selectionEnd = chatInput.value.length;
      
      // 입력창 크기 조정
      resizeInput();
      
      // 입력 변경 필요
      notifyInputChanged();
    }
    
    // Initialize UI
    function init() {
      console.log("Initializing chat UI - starting");
      
      // Debug: Check what initial messages we received
      console.log("Initial messages:", JSON.stringify(initialMessages.map(m => ({
        id: m.id,
        role: m.role,
        contentLength: m.content ? m.content.length : 0
      }))));
      
      // Get DOM elements with detailed error logging
      chatMessages = document.getElementById('chat-messages');
      chatInput = document.getElementById('chat-input');
      sendButton = document.getElementById('send-button');
      clearButton = document.getElementById('clear-button');
      attachButton = document.getElementById('attach-button');
      modelIndicator = document.getElementById('model-name');
      modelSelector = document.getElementById('model-selector');
      
      // Log detailed element status
      console.log("DOM element status:", {
        chatMessages: chatMessages ? "✓" : "✗",
        chatInput: chatInput ? "✓" : "✗",
        sendButton: sendButton ? "✓" : "✗",
        clearButton: clearButton ? "✓" : "✗",
        attachButton: attachButton ? "✓" : "✗",
        modelIndicator: modelIndicator ? "✓" : "✗",
        modelSelector: modelSelector ? "✓" : "✗"
      });
      
      // Check if elements are found
      if (!chatMessages || !chatInput || !sendButton || !clearButton || !attachButton) {
        console.error("Critical UI elements missing:", {
          chatMessages: !!chatMessages,
          chatInput: !!chatInput,
          sendButton: !!sendButton,
          clearButton: !!clearButton,
          attachButton: !!attachButton
        });
        // Try again after a short delay
        setTimeout(init, 500);
        return;
      }
      
      // 첨부 파일 뷰 버튼 클릭 이벤트 리스너 추가
      chatMessages.addEventListener('click', function(event) {
        // 파일 뷰 버튼 클릭 처리
        if (event.target.closest('.attachment-action.view-file')) {
          const attachedFile = event.target.closest('.attached-file');
          if (attachedFile) {
            const fileName = attachedFile.querySelector('.attachment-name').textContent;
            // VS Code에 파일 열기 요청
            vscode.postMessage({
              type: 'openFile',
              fileName: fileName
            });
          }
        }
      });
      
      console.log("UI elements initialized successfully");
      
      // 스마트 스크롤 이벤트 리스너 등록
      chatMessages.addEventListener('scroll', detectUserScroll);
      
      // 슬래시 입력 시 플레이스홀더 요소 생성
      inputPlaceholder = document.getElementById('input-placeholder');
      if (!inputPlaceholder) {
        inputPlaceholder = document.createElement('div');
        inputPlaceholder.id = 'input-placeholder';
        document.getElementById('chat-input-container').appendChild(inputPlaceholder);
      }
      
      // Command Suggestions Elements
      commandSuggestionsContainer = document.getElementById('command-suggestions');
      if (!commandSuggestionsContainer) {
        commandSuggestionsContainer = document.createElement('div');
        commandSuggestionsContainer.id = 'command-suggestions';
        document.getElementById('chat-container').insertBefore(
          commandSuggestionsContainer, 
          document.getElementById('chat-input-container')
        );
      }
      
      // Set up event listeners
      sendButton.addEventListener('click', () => {
        if (chatInput.disabled) {
          // If streaming, this acts as a cancel button
          vscode.postMessage({ type: 'cancelStream' });
        } else {
          // Otherwise, send the message
          sendMessage();
        }
      });
      
      clearButton.addEventListener('click', () => {
        vscode.postMessage({ type: 'clearChat' });
      });
      
      // 파일 첨부 버튼 이벤트 핸들러
      attachButton.addEventListener('click', () => {
        vscode.postMessage({ type: 'attachFile' });
      });

      // 텍스트 포맷 버튼 이벤트 핸들러
      const formatButton = document.getElementById('format-button');
      if (formatButton) {
        formatButton.addEventListener('click', () => {
          vscode.postMessage({ type: 'formatText' });
        });
      }
      
      // 스마트 프롬프팅 관련 요소
      const smartPromptingToggle = document.getElementById('smart-prompting-toggle');
      const smartPromptingLabel = document.getElementById('smart-prompting-label');
      
      // 스마트 프롬프팅 토글 버튼 이벤트 핸들러
      if (smartPromptingToggle && smartPromptingLabel) {
        smartPromptingToggle.addEventListener('click', () => {
          vscode.postMessage({ type: 'toggleSmartPrompting' });
        });
      }
      
      // 스마트 프롬프팅 UI 업데이트 함수
      function updateSmartPromptingUI(enabled, mode) {
        if (smartPromptingToggle && smartPromptingLabel) {
          if (enabled) {
            smartPromptingToggle.classList.add('active');
            
            // 모드에 따라 다른 텍스트 표시
            let modeText = '스마트 프롬프팅';
            switch (mode) {
              case 'basic':
                modeText = '기본 모드';
                break;
              case 'advanced':
                modeText = '고급 모드';
                break;
              case 'expert':
                modeText = '전문가 모드';
                break;
            }
            
            smartPromptingLabel.textContent = modeText;
          } else {
            smartPromptingToggle.classList.remove('active');
            smartPromptingLabel.textContent = '스마트 프롬프팅';
          }
        }
      }
      
      chatInput.addEventListener('input', () => {
        resizeInput();
        notifyInputChanged();
      });
      
      // 포커스를 잃을 때 플레이스홀더 숨기기
      chatInput.addEventListener('blur', () => {
        inputPlaceholder.classList.remove('visible');
      });
      
      // 포커스를 얻을 때 플레이스홀더 재검사
      chatInput.addEventListener('focus', () => {
        updateInputPlaceholder(chatInput.value);
      });
      
      chatInput.addEventListener('keydown', (e) => {
        // Tab 키 처리 (빈 입력창일 때도 탭 완성 활성화)
        if (e.key === 'Tab') {
          // Tab completion
          if (handleTabCompletion(e)) {
            e.preventDefault();
            return;
          }
        }
        
        if (suggestions.length > 0) {
          if (e.key === 'ArrowUp') {
            // Navigate suggestions up
            if (navigateSuggestions('up')) {
              e.preventDefault();
              return;
            }
          } else if (e.key === 'ArrowDown') {
            // Navigate suggestions down
            if (navigateSuggestions('down')) {
              e.preventDefault();
              return;
            }
          } else if (e.key === 'PageUp') {
            // Navigate suggestions page up
            if (navigateSuggestions('pageup')) {
              e.preventDefault();
              return;
            }
          } else if (e.key === 'PageDown') {
            // Navigate suggestions page down
            if (navigateSuggestions('pagedown')) {
              e.preventDefault();
              return;
            }
          } else if (e.key === 'Home') {
            // Navigate to first suggestion
            if (navigateSuggestions('home')) {
              e.preventDefault();
              return;
            }
          } else if (e.key === 'End') {
            // Navigate to last suggestion
            if (navigateSuggestions('end')) {
              e.preventDefault();
              return;
            }
          } else if (e.key === 'Enter' && activeSuggestionIndex >= 0) {
            // Select active suggestion with Enter
            if (activeSuggestionIndex >= 0 && activeSuggestionIndex < suggestions.length) {
              const suggestion = suggestions[activeSuggestionIndex];
              insertSuggestion(suggestion);
              
              // 단독 실행 가능한 명령어인 경우 자동으로 실행
              if (isStandAloneCommand(suggestion.insertText)) {
                e.preventDefault();
                sendMessage();
              }
              return;
            }
          } else if (e.key === 'Escape') {
            // Clear suggestions and reset cycling mode
            updateCommandSuggestions([]);
            isInMainCommandCycling = false;
            currentMainCommandIndex = -1;
            e.preventDefault();
            return;
          } else if (e.key >= '1' && e.key <= '9' && e.altKey) {
            // Alt+Number shortcuts for quick selection (1-9)
            const index = parseInt(e.key) - 1;
            if (index >= 0 && index < suggestions.length) {
              const suggestion = suggestions[index];
              insertSuggestion(suggestion);
              
              // 단독 실행 가능한 명령어인 경우 자동으로 실행
              if (isStandAloneCommand(suggestion.insertText)) {
                sendMessage();
              }
              e.preventDefault();
              return;
            }
          } else if (e.key === '0' && e.altKey && suggestions.length >= 10) {
            // Alt+0 for the 10th suggestion
            const suggestion = suggestions[9];
            insertSuggestion(suggestion);
            
            // 단독 실행 가능한 명령어인 경우 자동으로 실행
            if (isStandAloneCommand(suggestion.insertText)) {
              sendMessage();
            }
            e.preventDefault();
            return;
          }
        }
        
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        } else if (e.key === '/' && chatInput.value === '') {
          // Show command suggestions when typing '/'
          notifyInputChanged();
          
          // Position the suggestion container immediately
          if (suggestions.length > 0) {
            positionCommandSuggestions();
          }
        }
        
        // 메인 명령어를 입력한 경우 명령어 모드 종료
        if (!isInMainCommandCycling && e.key !== 'Tab' && e.key !== 'Enter') {
          isInMainCommandCycling = false;
          currentMainCommandIndex = -1;
        }
      });
      
      modelSelector.addEventListener('click', () => {
        vscode.postMessage({ type: 'showModelSelector' });
      });
      
      // Initialize with any stored messages
      const state = vscode.getState();
      if (state && state.messages) {
        updateMessages(state.messages, isStreaming);
      } else {
        updateMessages(initialMessages, isStreaming);
      }
    }
    
    // Start the app - only initialize once when document is ready
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      // Document is already ready, initialize immediately
      console.log('Document already ready, initializing chat view immediately');
      setTimeout(init, 0);
    } else {
      // Otherwise wait for DOMContentLoaded
      console.log('Waiting for DOMContentLoaded before initializing chat view');
      document.addEventListener('DOMContentLoaded', () => {
        console.log('DOMContentLoaded fired, initializing chat view');
        init();
      });
    }
  `;
  }

  /**
   * 메시지 내용을 HTML로 포맷팅
   * @param content 원본 메시지 내용
   * @param options 포맷팅 옵션
   * @returns 포맷팅된 HTML
   */
  public static formatContent(content: string, options: Partial<FormatOptions> = {}): string {
    if (!content) return '';

    // 기본 옵션
    const defaultOptions: FormatOptions = {
      enableModernCodeBlocks: true,
      enableLineNumbers: true,
      enableSyntaxHighlighting: true
    };

    const finalOptions = { ...defaultOptions, ...options };

    // HTML 감지 - 더 다양한 태그 인식
    const trimmedContent = content.trim();
    if (
      trimmedContent.startsWith('<') &&
      (
        trimmedContent.includes('</div>') ||
        trimmedContent.includes('</p>') ||
        trimmedContent.includes('</h') ||
        trimmedContent.includes('</span>') ||
        trimmedContent.includes('</ul>') ||
        trimmedContent.includes('</li>') ||
        trimmedContent.includes('</table>') ||
        trimmedContent.match(/<[a-zA-Z0-9_]+[^>]*>/)
      )
    ) {
      return content; // HTML 콘텐츠는 그대로 반환
    }

    // 마크다운 컨텐츠 래핑
    let formatted = '<div class="markdown-content">';

    // 마크다운 요소 변환
    let processedContent = content;

    // 코드 블록 처리 (먼저 처리하여 다른 마크다운 변환에 영향을 주지 않도록)
    if (finalOptions.enableModernCodeBlocks) {
      processedContent = this.replaceCodeBlocks(processedContent, finalOptions);
    } else {
      // 기본 코드 블록
      processedContent = processedContent.replace(/```([a-zA-Z0-9_]*)\n([\s\S]*?)\n```/g, (match, language, code) => {
        return `<pre class="code-block"><code class="language-${language}">${this.escapeHtml(code)}</code></pre>`;
      });
    }

    // 헤더 변환 (h1-h6)
    processedContent = processedContent
      .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
      .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
      .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
      .replace(/^#### (.*?)$/gm, '<h4>$1</h4>')
      .replace(/^##### (.*?)$/gm, '<h5>$1</h5>')
      .replace(/^###### (.*?)$/gm, '<h6>$1</h6>');

    // 볼드, 이탤릭 및 취소선
    processedContent = processedContent
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/~~(.*?)~~/g, '<del>$1</del>');

    // 인라인 코드 변환
    processedContent = processedContent.replace(/`([^`]+)`/g, (match, code) => {
      return `<code class="inline-code">${this.escapeHtml(code)}</code>`;
    });

    // 수평선
    processedContent = processedContent.replace(/^---$/gm, '<hr>');

    // 링크 [텍스트](URL)
    processedContent = processedContent.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

    // 이미지 ![대체텍스트](URL)
    processedContent = processedContent.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">');

    // 순서 없는 목록 (ul, li)
    let inList = false;
    let listContent = '';

    processedContent = processedContent.replace(/^[\*\-\+] (.*?)$/gm, (match, item) => {
      if (!inList) {
        inList = true;
        listContent = '<ul>\n<li>' + item + '</li>\n';
        return '';
      } else {
        listContent += '<li>' + item + '</li>\n';
        return '';
      }
    });

    if (inList) {
      listContent += '</ul>';
      processedContent += listContent;
      inList = false;
    }

    // 순서 있는 목록 (ol, li)
    let inOrderedList = false;
    let orderedListContent = '';

    processedContent = processedContent.replace(/^(\d+)\. (.*?)$/gm, (match, number, item) => {
      if (!inOrderedList) {
        inOrderedList = true;
        orderedListContent = '<ol>\n<li>' + item + '</li>\n';
        return '';
      } else {
        orderedListContent += '<li>' + item + '</li>\n';
        return '';
      }
    });

    if (inOrderedList) {
      orderedListContent += '</ol>';
      processedContent += orderedListContent;
      inOrderedList = false;
    }

    // 인용구 (blockquote)
    let inQuote = false;
    let quoteContent = '';

    processedContent = processedContent.replace(/^> (.*?)$/gm, (match, content) => {
      if (!inQuote) {
        inQuote = true;
        quoteContent = '<blockquote>\n<p>' + content + '</p>\n';
        return '';
      } else {
        quoteContent += '<p>' + content + '</p>\n';
        return '';
      }
    });

    if (inQuote) {
      quoteContent += '</blockquote>';
      processedContent += quoteContent;
      inQuote = false;
    }

    // 첨부 파일 표시 개선 (파일명: 파일경로)
    processedContent = processedContent.replace(/첨부된 파일: ([^\n]+)/g, (match, fileName) => {
      return `<div class="attached-file">
        <span class="attachment-icon">📎</span>
        <span class="attachment-name">${fileName}</span>
        <div class="attachment-actions">
          <button class="attachment-action view-file" title="파일 열기">
            <span class="emoji-icon">👁️</span>
          </button>
        </div>
      </div>`;
    });

    // 남은 줄바꿈 처리 - 단락으로 변환
    const paragraphs = processedContent.split(/\n\n+/);
    if (paragraphs.length > 1) {
      processedContent = paragraphs
        .map(p => p.trim())
        .filter(p => p.length > 0)
        .map(p => {
          // 이미 HTML 태그로 시작하는 경우 그대로 유지
          if (p.startsWith('<') &&
              (p.startsWith('<h') ||
               p.startsWith('<ul') ||
               p.startsWith('<ol') ||
               p.startsWith('<blockquote') ||
               p.startsWith('<pre') ||
               p.startsWith('<div'))) {
            return p;
          } else {
            // 일반 텍스트는 p 태그로 감싸고 내부 줄바꿈은 <br>로 변환
            return '<p>' + p.replace(/\n/g, '<br>') + '</p>';
          }
        })
        .join('\n');
    } else {
      // 단락이 하나면 단순히 줄바꿈만 처리
      processedContent = processedContent.replace(/\n/g, '<br>');
    }

    // 마무리 div 태그 닫기
    formatted += processedContent + '</div>';

    return formatted;
  }

  /**
   * 코드 블록을 모던 UI로 변환
   * @param content 원본 내용
   * @param options 포맷팅 옵션
   * @returns 변환된 내용
   */
  private static replaceCodeBlocks(content: string, options: FormatOptions): string {
    return content.replace(/```([a-zA-Z0-9_]*)\n([\s\S]*?)\n```/g, (match, language, code) => {
      return this.formatCodeBlock(code.trim(), language || 'plaintext', options);
    });
  }

  /**
   * 단일 코드 블록 포맷팅
   * @param codeContent 코드 내용
   * @param language 언어
   * @param options 포맷팅 옵션
   * @returns 포맷팅된 HTML
   */
  private static formatCodeBlock(
    codeContent: string,
    language: string,
    options: FormatOptions
  ): string {
    const codeId = `code_${++this.codeBlockCounter}`;
    const escapedCode = this.escapeHtml(codeContent);
    
    // 라인 번호 생성
    const showLineNumbers = options.enableLineNumbers;
    const lineNumbers = showLineNumbers ? 
      codeContent.split('\n').map((_, i) => `${i + 1}`).join('\n') : '';
    
    // 코드 블록 템플릿 사용
    const template = `<div class="code-block-container code-block-popup">
  <div class="code-block-header">
    <span class="code-block-language language-${language}">${language}</span>
    <div class="code-block-actions">
      <button class="code-action-button copy-button" data-code-id="${codeId}" title="복사">
        <i class="codicon codicon-copy"></i>
        <span class="tooltip">클립보드에 복사</span>
      </button>
      <button class="code-action-button insert-code-button" data-code-id="${codeId}" title="에디터에 삽입">
        <i class="codicon codicon-arrow-small-right"></i>
        <span class="tooltip">현재 파일에 복사</span>
      </button>
      <button class="code-action-button new-file-button" data-code-id="${codeId}" title="새 파일로 생성">
        <i class="codicon codicon-new-file"></i>
        <span class="tooltip">새 파일로 생성</span>
      </button>
    </div>
  </div>
  <div class="code-content ${showLineNumbers ? 'with-line-numbers' : ''}">
    ${showLineNumbers ? `<div class="line-numbers">${lineNumbers}</div>` : ''}
    <div class="code-area">
      <code class="language-${language}" id="code-${codeId}">${escapedCode}</code>
    </div>
  </div>
</div>`;

    return template;
  }

  /**
   * HTML 이스케이프 처리
   * @param unsafe 이스케이프할 문자열
   * @returns 이스케이프된 문자열
   */
  private static escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}