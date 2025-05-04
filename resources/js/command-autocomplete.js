// 명령어 자동완성을 위한 JavaScript 코드

/**
 * 명령어 자동완성 클래스
 * Claude Code 스타일의 명령어 자동완성 기능 구현
 */
class CommandAutocomplete {
  /**
   * 생성자
   * @param {HTMLElement} inputElement 입력 요소 (textarea 또는 input)
   * @param {Object} options 옵션
   */
  constructor(inputElement, options = {}) {
    this.inputElement = inputElement;
    this.options = Object.assign({
      triggerCharacters: ['@', '/'], // 자동완성을 트리거하는 문자들
      minChars: 1,                   // 자동완성을 시작하기 위한 최소 문자 수
      maxSuggestions: 8,             // 표시할 최대 제안 수
      commandGroups: {               // 명령어 그룹별 색상 설정
        'git': '#0366d6',
        'jira': '#0052cc',
        'swdp': '#ff9900',
        'system': '#6f42c1'
      },
      onSelect: null                 // 명령어 선택 시 콜백
    }, options);

    // 명령어 목록
    this.commands = [];

    // 자동완성 UI 요소
    this.suggestionBox = null;
    this.activeIndex = -1;

    // 이벤트 리스너 바인딩
    this._bindEvents();

    // 자동완성 UI 초기화
    this._createSuggestionBox();
  }

  /**
   * 이벤트 리스너 설정
   */
  _bindEvents() {
    this.inputElement.addEventListener('input', this._onInput.bind(this));
    this.inputElement.addEventListener('keydown', this._onKeyDown.bind(this));
    document.addEventListener('click', this._onDocumentClick.bind(this));
  }

  /**
   * 입력 변경 이벤트 핸들러
   * @param {Event} e 입력 이벤트
   */
  _onInput(e) {
    const text = this.inputElement.value;
    const currentPosition = this.inputElement.selectionStart;
    const tokens = this._tokenizeInput(text, currentPosition);

    // 명령어와 현재 토큰의 내용을 확인
    const lastToken = tokens.current;
    
    // @ 또는 / 명령어 감지
    if (lastToken && this.options.triggerCharacters.includes(lastToken.charAt(0))) {
      const query = lastToken.substring(1); // @ 또는 / 접두사 제거
      
      // 자동완성 표시 결정
      if (query.length >= this.options.minChars || query.length === 0) {
        this._showSuggestions(query, lastToken, tokens.position);
        return;
      }
    }
    
    // 조건에 맞지 않으면 자동완성 숨기기
    this._hideSuggestions();
  }

  /**
   * 키 입력 이벤트 핸들러
   * @param {KeyboardEvent} e 키보드 이벤트
   */
  _onKeyDown(e) {
    // 자동완성이 표시된 상태에서만 처리
    if (!this.suggestionBox || this.suggestionBox.style.display === 'none') {
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this._moveSelection(1);
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        this._moveSelection(-1);
        break;
        
      case 'Tab':
      case 'Enter':
        if (this.activeIndex >= 0) {
          e.preventDefault();
          this._selectCurrentSuggestion();
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        this._hideSuggestions();
        break;
    }
  }

  /**
   * 문서 클릭 이벤트 핸들러
   * @param {MouseEvent} e 마우스 이벤트
   */
  _onDocumentClick(e) {
    // 자동완성 UI 외부 클릭 시 숨기기
    if (this.suggestionBox && 
        !this.suggestionBox.contains(e.target) && 
        e.target !== this.inputElement) {
      this._hideSuggestions();
    }
  }

  /**
   * 입력 텍스트를 토큰화하여 현재 편집 중인 토큰 정보 추출
   * @param {string} text 입력 텍스트
   * @param {number} position 커서 위치
   * @returns {Object} 토큰 정보
   */
  _tokenizeInput(text, position) {
    // 공백으로 나누기 (단, 커서 위치 이전까지만)
    const textBeforeCursor = text.substring(0, position);
    const textAfterCursor = text.substring(position);
    
    // 커서 위치에서 시작해 왼쪽으로 검색하여 마지막 공백 찾기
    let startPos = textBeforeCursor.lastIndexOf(' ') + 1;
    
    // 공백이 없는 경우 텍스트의 시작부터
    if (startPos <= 0) startPos = 0;
    
    // 오른쪽으로 검색하여 다음 공백 찾기
    let endPos = textAfterCursor.indexOf(' ');
    
    // 공백이 없는 경우 텍스트의 끝까지
    if (endPos < 0) endPos = textAfterCursor.length;
    
    // 현재 편집 중인 토큰
    const currentToken = textBeforeCursor.substring(startPos) + textAfterCursor.substring(0, endPos);
    
    return {
      current: currentToken,
      position: {
        start: startPos,
        end: position + endPos
      }
    };
  }

  /**
   * 자동완성 제안 상자 생성
   */
  _createSuggestionBox() {
    this.suggestionBox = document.createElement('div');
    this.suggestionBox.className = 'command-suggestions';
    this.suggestionBox.style.display = 'none';
    document.body.appendChild(this.suggestionBox);
  }

  /**
   * 자동완성 제안 표시
   * @param {string} query 검색 쿼리
   * @param {string} fullToken 전체 토큰
   * @param {Object} position 토큰 위치 정보
   */
  _showSuggestions(query, fullToken, position) {
    // 명령어가 로드되지 않은 경우 요청
    if (this.commands.length === 0) {
      // vscode API를 통해 명령어 목록 요청
      if (window.vscode) {
        window.vscode.postMessage({
          command: 'getCommands'
        });
      }
      return;
    }

    // 접두사 확인 (@ 또는 /)
    const prefix = fullToken.charAt(0);

    // 접두사에 맞는 명령어만 필터링
    const prefixType = prefix === '@' ? 'at' : prefix === '/' ? 'slash' : null;
    
    if (!prefixType) {
      this._hideSuggestions();
      return;
    }

    // 이름으로 필터링 (쿼리가 없으면 모든 해당 타입 명령어 표시)
    const filteredCommands = this.commands
      .filter(cmd => cmd.type === prefixType)
      .filter(cmd => query.length === 0 || cmd.id.toLowerCase().includes(query.toLowerCase()));

    // 결과가 없으면 숨기기
    if (filteredCommands.length === 0) {
      this._hideSuggestions();
      return;
    }

    // 결과 수 제한
    const limitedCommands = filteredCommands.slice(0, this.options.maxSuggestions);

    // 제안 상자 내용 생성
    this.suggestionBox.innerHTML = '';
    
    // 제목 추가
    const titleElem = document.createElement('div');
    titleElem.className = 'suggestion-title';
    titleElem.textContent = prefix === '@' ? '외부 명령어' : '내부 명령어';
    this.suggestionBox.appendChild(titleElem);

    // 명령어 목록 추가
    limitedCommands.forEach((cmd, index) => {
      const item = document.createElement('div');
      item.className = 'suggestion-item';
      item.dataset.index = index;
      item.dataset.value = cmd.id;
      
      // 명령어 그룹에 따른 색상 적용
      const commandGroup = cmd.id.split(':')[0].replace(/^[@/]/, '');
      const groupColor = this.options.commandGroups[commandGroup] || '#666';
      
      // 아이콘 생성 (이 부분은 getIconForCommand 함수 호출)
      const iconName = window.getIconForCommand ? 
                       window.getIconForCommand(cmd.id) : 
                       'play';
                       
      // HTML 생성
      item.innerHTML = `
        <i class="codicon codicon-${iconName}" style="color: ${groupColor};"></i>
        <span class="suggestion-label">${cmd.label || cmd.id}</span>
        <span class="suggestion-description">${cmd.description || ''}</span>
      `;
      
      // 클릭 이벤트 리스너
      item.addEventListener('click', () => {
        this.activeIndex = index;
        this._selectCurrentSuggestion();
      });
      
      // 마우스 오버 이벤트
      item.addEventListener('mouseover', () => {
        this._setActiveItem(index);
      });
      
      this.suggestionBox.appendChild(item);
    });

    // 입력 요소 위치 계산
    const inputRect = this.inputElement.getBoundingClientRect();
    
    // 입력 영역 내 커서 위치에 따른 가로 위치 조정
    const inputStyle = window.getComputedStyle(this.inputElement);
    const lineHeight = parseInt(inputStyle.lineHeight) || parseInt(inputStyle.height) || 20;
    
    // 제안 상자 위치 설정
    this.suggestionBox.style.position = 'absolute';
    this.suggestionBox.style.width = '320px';
    this.suggestionBox.style.maxHeight = '250px';
    this.suggestionBox.style.overflowY = 'auto';
    this.suggestionBox.style.left = `${inputRect.left}px`;
    this.suggestionBox.style.top = `${inputRect.top - lineHeight}px`;
    this.suggestionBox.style.display = 'block';
    
    // 활성 항목 초기화
    this.activeIndex = 0;
    this._setActiveItem(0);
  }

  /**
   * 자동완성 제안 숨기기
   */
  _hideSuggestions() {
    if (this.suggestionBox) {
      this.suggestionBox.style.display = 'none';
      this.activeIndex = -1;
    }
  }

  /**
   * 활성 항목 설정
   * @param {number} index 활성화할 항목 인덱스
   */
  _setActiveItem(index) {
    // 이전 활성 항목에서 클래스 제거
    const prevActive = this.suggestionBox.querySelector('.suggestion-item.active');
    if (prevActive) {
      prevActive.classList.remove('active');
    }
    
    // 새 활성 항목에 클래스 추가
    const activeItem = this.suggestionBox.querySelector(`.suggestion-item[data-index="${index}"]`);
    if (activeItem) {
      activeItem.classList.add('active');
      
      // 뷰포트 내에 보이도록 스크롤
      if (activeItem.offsetTop < this.suggestionBox.scrollTop) {
        this.suggestionBox.scrollTop = activeItem.offsetTop;
      } else if (activeItem.offsetTop + activeItem.offsetHeight > this.suggestionBox.scrollTop + this.suggestionBox.clientHeight) {
        this.suggestionBox.scrollTop = activeItem.offsetTop + activeItem.offsetHeight - this.suggestionBox.clientHeight;
      }
    }
    
    this.activeIndex = index;
  }

  /**
   * 선택 이동
   * @param {number} step 이동 단계 (1: 아래, -1: 위)
   */
  _moveSelection(step) {
    const items = this.suggestionBox.querySelectorAll('.suggestion-item');
    let newIndex = this.activeIndex + step;
    
    // 범위 내 제한
    if (newIndex < 0) newIndex = items.length - 1;
    if (newIndex >= items.length) newIndex = 0;
    
    this._setActiveItem(newIndex);
  }

  /**
   * 현재 선택된 제안 선택
   */
  _selectCurrentSuggestion() {
    const activeItem = this.suggestionBox.querySelector('.suggestion-item.active');
    if (!activeItem) return;
    
    const commandId = activeItem.dataset.value;
    
    // 입력 필드 업데이트
    const text = this.inputElement.value;
    const currentPosition = this.inputElement.selectionStart;
    const tokens = this._tokenizeInput(text, currentPosition);
    
    // 새 텍스트 생성
    const newText = text.substring(0, tokens.position.start) + 
                    commandId + 
                    text.substring(tokens.position.end);
    
    // 입력 필드 업데이트
    this.inputElement.value = newText;
    
    // 커서 위치 설정
    const newCursorPos = tokens.position.start + commandId.length;
    this.inputElement.setSelectionRange(newCursorPos, newCursorPos);
    
    // 이벤트 적용
    this.inputElement.focus();
    this.inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    
    // 콜백 호출
    if (typeof this.options.onSelect === 'function') {
      this.options.onSelect(commandId);
    }
    
    // 자동완성 숨기기
    this._hideSuggestions();
  }

  /**
   * 명령어 목록 설정
   * @param {Array} commands 명령어 목록
   */
  setCommands(commands) {
    this.commands = commands;
  }

  /**
   * 옵션 업데이트
   * @param {Object} options 업데이트할 옵션
   */
  updateOptions(options) {
    this.options = Object.assign(this.options, options);
  }

  /**
   * 자동완성 기능 제거
   */
  destroy() {
    // 이벤트 리스너 제거
    this.inputElement.removeEventListener('input', this._onInput);
    this.inputElement.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('click', this._onDocumentClick);
    
    // UI 요소 제거
    if (this.suggestionBox && this.suggestionBox.parentNode) {
      this.suggestionBox.parentNode.removeChild(this.suggestionBox);
    }
    
    this.suggestionBox = null;
  }
}

// 모듈 내보내기 (브라우저 환경에서)
if (typeof window !== 'undefined') {
  window.CommandAutocomplete = CommandAutocomplete;
}