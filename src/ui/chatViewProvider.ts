import * as vscode from 'vscode';
import { LLMService } from '../core/llm/llmService';
import { MemoryService } from '../core/memory/memoryService';
import { CommandManager } from '../core/commands/commandManager';
import { Message, MessageRole } from '../types/chat';
import { CommandSuggestion } from '../core/commands/slashCommand';
import { ChatViewService } from './chat/chatViewService';
import { CodeService } from './chat/codeService';
import { ModelManager } from '../core/llm/modelManager';
import { SmartPromptingService, SmartPromptingState, SmartPromptingMode } from '../core/services/smartPromptingService';
import { WelcomeViewProvider } from './welcomeView';

/**
 * ChatViewProvider manages the WebView that displays the luxurious chat interface
 */
export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'apeChat';

  private _view?: vscode.WebviewView;
  private _messages: Message[] = [];
  private _isStreaming = false;
  private _currentStreamMessageId: string | null = null;
  private _streamUpdateTimeout: NodeJS.Timeout | null = null;
  private _modelChangeListener?: vscode.Disposable;
  private _smartPromptingService?: SmartPromptingService;
  private _smartPromptingStateListener?: vscode.Disposable;

  // 명령어 제안 이벤트
  private readonly _onDidSuggestCommands = new vscode.EventEmitter<CommandSuggestion[]>();
  public readonly onDidSuggestCommands = this._onDidSuggestCommands.event;

  constructor(
    private readonly _context: vscode.ExtensionContext,
    private readonly _llmService: LLMService,
    private readonly _memoryService: MemoryService,
    private readonly _commandManager: CommandManager,
    private readonly _modelManager?: ModelManager
  ) {
    // SmartPromptingService 생성
    this._smartPromptingService = new SmartPromptingService(_context, _llmService);
    
    // 상태 변경 리스너 등록
    this._smartPromptingStateListener = this._smartPromptingService.onStateChanged(state => {
      this._updateSmartPromptingUI(state);
    });
    
    // 컨텍스트 서브스크립션에 리스너 등록
    this._context.subscriptions.push(this._smartPromptingStateListener);
  }
  
  /**
   * 웹뷰에서 사용할 수 있는 리소스 URI로 변환
   */
  public getWebviewResource(uri: vscode.Uri): vscode.Uri | null {
    if (!this._view) {
      return null;
    }
    return this._view.webview.asWebviewUri(uri);
  }

  /**
   * Called when the view is first created or becomes visible again
   */
  public async resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    // Set options for the webview
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._context.extensionUri, 'media'),
        vscode.Uri.joinPath(this._context.extensionUri, 'out'),
        vscode.Uri.joinPath(this._context.extensionUri, 'src')
      ]
    };

    // Load previous messages from memory service
    await this._loadMessages();
    
    // Set initial HTML content
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(this._handleMessage.bind(this));
    
    // Register code service handlers
    try {
      await CodeService.registerHandlers(this._context, webviewView.webview);
    } catch (error) {
      console.log('Code service handlers may already be registered:', error);
    }
    
    // Listen for model changes if ModelManager is available
    if (this._modelManager) {
      // Dispose any existing listener
      if (this._modelChangeListener) {
        this._modelChangeListener.dispose();
      }
      
      // Register new listener
      this._modelChangeListener = this._modelManager.onDidChangeModel(() => {
        // Update the UI when model changes
        this.updateModelIndicator();
      });
      
      // Add listener to context for disposal
      this._context.subscriptions.push(this._modelChangeListener);
    }
    
    // Update model indicator on initialization
    setTimeout(() => {
      this.updateModelIndicator();
    }, 500);
  }

  /**
   * Updates the model indicator UI with the current model
   */
  public updateModelIndicator(): void {
    if (!this._view) {
      console.log('모델 표시기 업데이트 실패: 웹뷰가 없습니다');
      return;
    }
    
    try {
      // Use ModelManager if available, otherwise fall back to LLMService
      let currentModel, displayName;
      
      if (this._modelManager) {
        currentModel = this._modelManager.getActiveModel();
        displayName = this._modelManager.getModelDisplayName(currentModel);
      } else {
        currentModel = this._llmService.getActiveModel();
        displayName = this._llmService.getModelDisplayName(currentModel);
      }
      
      // Send message to webview to update model name display
      this._view.webview.postMessage({
        type: 'updateModelIndicator',
        modelName: displayName
      });
    } catch (error) {
      console.error('모델 인디케이터 업데이트 중 오류:', error);
    }
  }

  /**
   * 스마트 프롬프팅 UI 업데이트
   */
  private _updateSmartPromptingUI(state: SmartPromptingState): void {
    if (!this._view) {
      return;
    }
    
    // 웹뷰에 상태 업데이트 메시지 전송
    this._view.webview.postMessage({
      type: 'updateSmartPrompting',
      enabled: state.enabled,
      mode: state.mode
    });
  }
  
  /**
   * Sends a user message to the LLM and processes the response
   */
  public async sendMessage(content: string): Promise<void> {
    if (!this._view) {
      vscode.window.showErrorMessage('APE Chat view is not available');
      return;
    }

    if (this._isStreaming) {
      vscode.window.showInformationMessage('Please wait for the current response to complete');
      return;
    }

    // 슬래시 명령어 처리
    if (content.trim().startsWith('/')) {
      // 슬래시 명령어 실행 - 직접 commandManager 호출
      await this._commandManager.slashCommandManager.executeCommand(content);
      return;
    }
    
    // 스마트 프롬프팅 적용 (활성화된 경우)
    let processedContent = content;
    if (this._smartPromptingService && this._smartPromptingService.isEnabled()) {
      processedContent = this._smartPromptingService.processMessage(content);
    }

    // Create and add user message
    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: MessageRole.User,
      content: processedContent,
      timestamp: new Date()
    };

    this._messages.push(userMessage);
    this._updateChatView();

    try {
      // Create assistant message placeholder for streaming
      const assistantMessageId = `msg_${Date.now() + 1}`;
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: MessageRole.Assistant,
        content: '',
        timestamp: new Date()
      };

      this._messages.push(assistantMessage);
      this._currentStreamMessageId = assistantMessageId;
      this._isStreaming = true;
      this._updateChatView();

      // Start streaming response from LLM
      await this._llmService.streamResponse(
        this._messages,
        (chunk: string, done: boolean, statusCode?: number) => {
          // Update the assistant message with the new chunk
          const assistantMessage = this._messages.find(m => m.id === this._currentStreamMessageId);
          if (assistantMessage) {
            assistantMessage.content += chunk;

            // Debounce updates for efficiency
            if (!this._streamUpdateTimeout) {
              this._streamUpdateTimeout = setTimeout(() => {
                this._updateChatView();
                this._streamUpdateTimeout = null;
              }, 30); // 30ms debounce
            }

            if (done) {
              // Stream completed
              this._isStreaming = false;
              this._currentStreamMessageId = null;

              // Cancel any pending timeout
              if (this._streamUpdateTimeout) {
                clearTimeout(this._streamUpdateTimeout);
                this._streamUpdateTimeout = null;
              }

              // 오류 발생여부 확인
              if (statusCode && statusCode >= 400) {
                console.log(`Error from LLM service with status code: ${statusCode}`);
                // 오류 메시지를 시스템 메시지로 변경
                assistantMessage.role = MessageRole.System;

                // 422 오류는 특별히 처리 (unprocessable entity, 일반적으로 메시지 형식 오류)
                if (statusCode === 422) {
                  assistantMessage.content = '메시지 형식 오류: 입력이 모델 요구사항을 충족하지 않습니다. 메시지 길이를 줄이거나 형식을 변경해보세요.';
                } else {
                  assistantMessage.content = '연결 오류가 발생했습니다. 다시 시도해주세요.';
                }

                // 스트리밍 요청 명시적 취소 - 스트리밍 UI 상태를 즉시 종료
                this._llmService.cancelStream();
              }
              // 일반 연결 오류 메시지 포함 여부 확인 (하위 호환성)
              else if (assistantMessage.content.includes('[연결 오류가 발생했습니다]') ||
                       assistantMessage.content.includes('[API 연결 오류:')) {
                // 오류 메시지를 시스템 메시지로 변경
                assistantMessage.role = MessageRole.System;
                assistantMessage.content = '연결 오류가 발생했습니다. 다시 시도해주세요.';

                // 스트리밍 요청 명시적 취소 - 스트리밍 UI 상태를 즉시 종료
                this._llmService.cancelStream();
              }

              // Save messages to memory
              this._saveMessages();

              this._updateChatView();
            }
          }
        }
      );
    } catch (error) {
      this._isStreaming = false;
      this._currentStreamMessageId = null;

      // Cancel any pending timeout
      if (this._streamUpdateTimeout) {
        clearTimeout(this._streamUpdateTimeout);
        this._streamUpdateTimeout = null;
      }

      // Add error message
      const errorMessage: Message = {
        id: `msg_error_${Date.now()}`,
        role: MessageRole.System,
        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date()
      };

      this._messages.push(errorMessage);
      this._updateChatView();
    }
  }

  /**
   * Clears all messages from the chat and shows welcome screen
   */
  public clearChat(): void {
    console.log('채팅 초기화 중 - 새 웰컴 메시지 생성');
    
    // 메모리 서비스에서 메시지 삭제
    this._memoryService.clearMessages();
    
    try {
      // 새로운 웰컴 메시지 HTML 콘텐츠 가져오기
      const welcomeHTML = WelcomeViewProvider.getWelcomeMessageHTML();
      
      // 새로운 웰컴뷰 사용
      const welcomeId = `welcome_${Date.now()}`;
      const assistantId = `assistant_welcome_${Date.now()}`;
      
      this._messages = [
        {
          id: welcomeId,
          role: MessageRole.System,
          content: welcomeHTML,
          timestamp: new Date()
        },
        {
          id: assistantId,
          role: MessageRole.Assistant,
          content: 'Welcome to APE. How can I assist with your development today?',
          timestamp: new Date()
        }
      ];
      
      // 즉시 UI 업데이트
      this._updateChatView();
    } catch (error) {
      console.error('웰컴 메시지 생성 중 오류:', error);
      this._messages = [{
        id: `error_${Date.now()}`,
        role: MessageRole.System,
        content: 'Error loading welcome screen.',
        timestamp: new Date()
      }];
      
      this._updateChatView();
    }
  }

  /**
   * Loads messages from memory service
   */
  private async _loadMessages(): Promise<void> {
    console.log('메시지 로드 중 - 기존 메시지 확인');
    const result = await this._memoryService.getMessages();
    if (result.success && result.data && result.data.length > 0) {
      console.log(`${result.data.length}개의 저장된 메시지를 로드함`);
      this._messages = result.data;
    } else {
      console.log('저장된 메시지 없음, 웰컴 메시지 추가');
      
      try {
        // 새로운 웰컴 메시지 HTML 콘텐츠 가져오기
        const welcomeHTML = WelcomeViewProvider.getWelcomeMessageHTML();
        
        // 메시지가 없으면 웰컴 메시지 추가
        const welcomeId = `welcome_${Date.now()}`;
        const assistantId = `assistant_welcome_${Date.now()}`;
        
        this._messages = [
          {
            id: welcomeId,
            role: MessageRole.System,
            content: welcomeHTML,
            timestamp: new Date()
          },
          {
            id: assistantId,
            role: MessageRole.Assistant,
            content: 'Welcome to APE. How can I assist with your development today?',
            timestamp: new Date()
          }
        ];
      } catch (error) {
        console.error('웰컴 메시지 생성 중 오류:', error);
        this._messages = [{
          id: `error_${Date.now()}`,
          role: MessageRole.System,
          content: 'Error loading welcome screen.',
          timestamp: new Date()
        }];
      }
    }
  }

  /**
   * Saves messages to memory service
   */
  private async _saveMessages(): Promise<void> {
    for (const message of this._messages) {
      await this._memoryService.addMessage(message);
    }
  }

  /**
   * Updates the chat view with the current messages
   */
  private _updateChatView(): void {
    if (this._view) {
      this._view.webview.postMessage({
        type: 'updateMessages',
        messages: this._messages,
        isStreaming: this._isStreaming
      });
    }
  }

  /**
   * Handles messages sent from the webview
   */
  private _handleMessage(message: any): void {
    switch (message.type) {
      case 'sendMessage':
        this.sendMessage(message.content);
        break;

      case 'cancelStream':
        this._llmService.cancelStream();
        this._isStreaming = false;
        this._currentStreamMessageId = null;

        if (this._streamUpdateTimeout) {
          clearTimeout(this._streamUpdateTimeout);
          this._streamUpdateTimeout = null;
        }

        this._updateChatView();
        break;

      case 'clearChat':
        this.clearChat();
        break;
        
      case 'command':
        // 도움말에서 명령어 실행 요청
        this.sendMessage(message.command);
        break;
        
      case 'insertCommand':
        // 도움말에서 채팅창에 명령어 입력 요청
        this._insertCommandToChat(message.command);
        break;

      case 'getEditorContent':
        this._getEditorContent().then(content => {
          if (this._view) {
            this._view.webview.postMessage({
              type: 'editorContent',
              content
            });
          }
        });
        break;

      case 'inputChanged':
        // 입력 내용이 변경될 때 슬래시 명령어 제안
        this._updateCommandSuggestions(message.content);
        break;

      case 'showModelSelector':
        if (this._commandManager) {
          Promise.resolve(this._commandManager.selectModel()).catch((error: Error) => {
            console.error('모델 선택 명령 실행 오류:', error);
            vscode.window.showErrorMessage('모델 선택 기능을 실행할 수 없습니다');
          });
        } else {
          Promise.resolve(vscode.commands.executeCommand('ape.selectModel')).catch((error: Error) => {
            console.error('VSCode 명령어 실행 오류:', error);
            vscode.window.showErrorMessage('모델 선택 기능을 실행할 수 없습니다');
          });
        }
        break;
      
      case 'toggleSmartPrompting':
        // 스마트 프롬프팅 토글
        if (this._smartPromptingService) {
          this._smartPromptingService.toggle();
        }
        break;
        
      case 'setSmartPromptingMode':
        // 스마트 프롬프팅 모드 설정
        if (this._smartPromptingService && message.mode) {
          this._smartPromptingService.setMode(message.mode);
        }
        break;
      
      case 'openFile':
        // 첨부된 파일 열기
        if (message.fileName) {
          this._openAttachedFile(message.fileName);
        }
        break;
    }
  }

  /**
   * 명령어 제안 업데이트
   */
  private _updateCommandSuggestions(input: string): void {
    if (input.startsWith('/')) {
      // 슬래시 명령어 제안 가져오기
      const suggestions = this._commandManager.slashCommandManager.getCommandSuggestions(input);

      // 웹뷰에 제안 전송
      if (this._view) {
        this._view.webview.postMessage({
          type: 'commandSuggestions',
          suggestions
        });
      }

      // 이벤트 발생 (VSCode 통합용)
      this._onDidSuggestCommands.fire(suggestions);
    } else if (this._view) {
      // 제안 초기화
      this._view.webview.postMessage({
        type: 'commandSuggestions',
        suggestions: []
      });
    }
  }
  
  /**
   * 도움말에서 명령어를 채팅창에 입력
   */
  private _insertCommandToChat(command: string): void {
    if (!this._view) {
      return;
    }
    
    // 채팅창에 명령어 입력 요청
    this._view.webview.postMessage({
      type: 'insertCommandToInput',
      command: command
    });
  }
  
  /**
   * 외부에서 채팅 입력창에 텍스트 삽입
   */
  public handleChatInput(text: string): void {
    if (!this._view) {
      return;
    }

    // 채팅창에 텍스트 입력 요청
    this._view.webview.postMessage({
      type: 'insertCommandToInput',
      command: text
    });
  }

  /**
   * 채팅 입력창에 텍스트 삽입 (ape.insertToChatInput 명령어용)
   */
  public insertToChatInput(text: string): void {
    if (!this._view) {
      return;
    }

    // 채팅창에 텍스트 입력 요청
    this._view.webview.postMessage({
      type: 'insertCommandToInput',
      command: text
    });
  }

  /**
   * 명령어 제안 갱신 (ape.showCommandSuggestions 명령어용)
   */
  public updateCommandSuggestions(suggestions: any[]): void {
    if (!this._view) {
      return;
    }

    // 웹뷰에 명령어 제안 전송
    this._view.webview.postMessage({
      type: 'commandSuggestions',
      suggestions
    });
  }
  
  /**
   * 외부에서 직접 LLM 응답을 채팅 창에 추가
   */
  public async sendLlmResponse(message: { role: string; content: string }): Promise<void> {
    if (!this._view) {
      vscode.window.showErrorMessage('APE Chat view is not available');
      return;
    }

    // Create message object
    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      role: message.role as MessageRole,
      content: message.content,
      timestamp: new Date()
    };

    // Add message to list
    this._messages.push(newMessage);
    
    // Save to memory
    await this._memoryService.addMessage(newMessage);
    
    // Update UI
    this._updateChatView();
  }

  /**
   * Opens an attached file in the editor
   */
  private async _openAttachedFile(fileName: string): Promise<void> {
    try {
      let targetFile: vscode.Uri | undefined;

      if (vscode.workspace.workspaceFolders?.length) {
        const workspaceFolder = vscode.workspace.workspaceFolders[0];
        
        const searchPattern = new vscode.RelativePattern(
          workspaceFolder,
          `**/${fileName}`
        );
        
        const files = await vscode.workspace.findFiles(searchPattern, null, 1);
        
        if (files.length > 0) {
          targetFile = files[0];
        }
      }
      
      if (targetFile) {
        const document = await vscode.workspace.openTextDocument(targetFile);
        await vscode.window.showTextDocument(document);
      } else {
        vscode.window.showErrorMessage(`File not found: ${fileName}`);
      }
    } catch (error) {
      console.error('Error opening file:', error);
      vscode.window.showErrorMessage(`Failed to open file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Gets the current editor content
   */
  private async _getEditorContent(): Promise<string | null> {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const document = editor.document;
      const selection = editor.selection;

      // If there's a selection, return that, otherwise return the full document
      if (!selection.isEmpty) {
        return document.getText(selection);
      } else {
        return document.getText();
      }
    }

    return null;
  }

  /**
   * 명령어 제안 스크립트 가져오기
   * 고급스러운 슬래시 명령어 자동완성 UI를 위한 스크립트
   */
  private _getCommandSuggestionScript(): string {
    return `
    // 명령어 제안 시스템 - 럭셔리 미니멀 디자인
    (function() {
      // 상태 관리
      let activeSuggestionIndex = -1;
      let suggestions = [];
      let isPopoverVisible = false;
      let lastInputValue = '';
      let tabCount = 0;
      let lastTabTime = 0;

      // DOM 요소
      let chatInput;
      let suggestionContainer;
      
      // 자주 사용하는 명령어
      const frequentCommands = [
        { name: 'help', description: '도움말 보기' },
        { name: 'git', description: 'Git 관련 명령어' },
        { name: 'code', description: '코드 분석 및 생성' },
        { name: 'model', description: 'AI 모델 변경' },
        { name: 'clear', description: '대화 초기화' }
      ];
      
      // 초기화 함수
      function initialize() {
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', setup);
        } else {
          setup();
        }
      }
      
      // 설정 함수
      function setup() {
        // 필요한 DOM 요소 가져오기
        chatInput = document.getElementById('chat-input');
        
        // 명령어 제안 컨테이너 생성 또는 가져오기
        suggestionContainer = document.getElementById('command-suggestions');
        if (!suggestionContainer) {
          suggestionContainer = document.createElement('div');
          suggestionContainer.id = 'command-suggestions';
          document.getElementById('chat-input-container').appendChild(suggestionContainer);
        }
        
        // 이벤트 리스너 설정
        setupEventListeners();
      }
      
      // 이벤트 리스너 설정
      function setupEventListeners() {
        if (!chatInput) return;
        
        // 입력 이벤트 - 슬래시 감지
        chatInput.addEventListener('input', (e) => {
          const value = e.target.value;
          
          // 슬래시로 시작하면 명령어 제안 표시
          if (value.startsWith('/')) {
            // VSCode에 입력 변경 알림
            vscode.postMessage({ 
              type: 'inputChanged',
              content: value
            });
            
            lastInputValue = value;
          } else {
            // 슬래시가 아니면 제안 숨기기
            hideSuggestions();
          }
        });
        
        // 키보드 이벤트 - 탐색 및 선택
        chatInput.addEventListener('keydown', (e) => {
          if (!isPopoverVisible) return;
          
          switch (e.key) {
            case 'ArrowUp':
              e.preventDefault();
              navigateSuggestion('up');
              break;
              
            case 'ArrowDown':
              e.preventDefault();
              navigateSuggestion('down');
              break;
              
            case 'Tab':
              // 탭 키 입력 추적
              const now = Date.now();
              const isDoubleTap = (now - lastTabTime < 500);
              lastTabTime = now;
              
              if (isDoubleTap) {
                tabCount = (tabCount + 1) % suggestions.length;
              } else {
                tabCount = 0;
              }
              
              if (suggestions.length > 0) {
                e.preventDefault();
                activeSuggestionIndex = tabCount;
                highlightActiveSuggestion();
              }
              break;
              
            case 'Enter':
              if (activeSuggestionIndex >= 0) {
                e.preventDefault();
                selectSuggestion(activeSuggestionIndex);
              }
              break;
              
            case 'Escape':
              e.preventDefault();
              hideSuggestions();
              break;
          }
        });
        
        // 포커스 이벤트 - 포커스 잃으면 제안 숨기기
        chatInput.addEventListener('blur', () => {
          // 약간의 지연을 줘서 클릭 이벤트가 처리될 수 있게 함
          setTimeout(() => {
            if (document.activeElement !== suggestionContainer &&
                !suggestionContainer.contains(document.activeElement)) {
              hideSuggestions();
            }
          }, 100);
        });
        
        // 클릭 이벤트 위임 - 제안 항목 클릭
        suggestionContainer.addEventListener('click', (e) => {
          const suggestionEl = e.target.closest('.command-suggestion');
          if (suggestionEl) {
            const index = parseInt(suggestionEl.dataset.index, 10);
            if (!isNaN(index)) {
              selectSuggestion(index);
            }
          }
        });
        
        // 창 크기 변경 시 위치 조정
        window.addEventListener('resize', () => {
          if (isPopoverVisible) {
            positionSuggestionContainer();
          }
        });
      }
      
      // 명령어 제안 표시
      function showSuggestions(commandSuggestions) {
        if (!suggestionContainer || !chatInput) return;
        
        // 제안 항목 설정
        suggestions = commandSuggestions || [];
        activeSuggestionIndex = -1;
        
        // 제안 항목이 없으면 숨김
        if (suggestions.length === 0) {
          hideSuggestions();
          return;
        }
        
        // 컨테이너 초기화
        suggestionContainer.innerHTML = '';
        
        // 카테고리별 그룹화
        const categories = {};
        suggestions.forEach(suggestion => {
          if (!categories[suggestion.category]) {
            categories[suggestion.category] = [];
          }
          categories[suggestion.category].push(suggestion);
        });
        
        // 카테고리별로 제안 항목 추가
        Object.keys(categories).forEach(category => {
          // 카테고리 헤더 추가
          const categoryHeader = document.createElement('div');
          categoryHeader.className = 'suggestion-category';
          categoryHeader.textContent = getCategoryTitle(category);
          suggestionContainer.appendChild(categoryHeader);
          
          // 해당 카테고리의 제안 항목 추가
          categories[category].forEach((suggestion) => {
            const suggestionEl = document.createElement('div');
            suggestionEl.className = 'command-suggestion';
            suggestionEl.dataset.index = suggestions.indexOf(suggestion).toString();
            
            // 단축키 힌트 추가
            const index = suggestions.indexOf(suggestion);
            let shortcutHint = '';
            if (index < 9) {
              shortcutHint = \`Tab+\${index + 1}\`;
            } else if (index === 9) {
              shortcutHint = 'Tab+0';
            }
            suggestionEl.dataset.shortcut = shortcutHint;
            
            // 항목 내용 구성
            suggestionEl.innerHTML = \`
              <span class="suggestion-icon">\${getIconForCategory(category)}</span>
              <span class="suggestion-label">\${suggestion.label}</span>
              <span class="suggestion-description">\${suggestion.description}</span>
            \`;
            
            suggestionContainer.appendChild(suggestionEl);
          });
        });
        
        // 팝오버 위치 설정
        positionSuggestionContainer();
        
        // 표시 및 상태 업데이트
        suggestionContainer.style.display = 'block';
        isPopoverVisible = true;
        
        // 시각적 효과 - 등장 애니메이션
        suggestionContainer.style.opacity = '0';
        suggestionContainer.style.transform = 'translateY(8px)';
        
        // 약간의 지연 후 애니메이션 적용
        setTimeout(() => {
          suggestionContainer.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
          suggestionContainer.style.opacity = '1';
          suggestionContainer.style.transform = 'translateY(0)';
        }, 10);
      }
      
      // 명령어 제안 숨기기
      function hideSuggestions() {
        if (!suggestionContainer) return;
        
        // 부드러운 사라짐 효과
        suggestionContainer.style.opacity = '0';
        suggestionContainer.style.transform = 'translateY(8px)';
        
        setTimeout(() => {
          suggestionContainer.style.display = 'none';
          isPopoverVisible = false;
        }, 200);
        
        // 상태 초기화
        suggestions = [];
        activeSuggestionIndex = -1;
      }
      
      // 제안 컨테이너 위치 설정
      function positionSuggestionContainer() {
        if (!suggestionContainer || !chatInput) return;
        
        // 입력 필드 위치 가져오기
        const inputRect = chatInput.getBoundingClientRect();
        const containerRect = chatInput.closest('#chat-input-container').getBoundingClientRect();
        
        // 커서 위치 계산
        const cursorPosition = getCursorPosition();
        
        // 왼쪽 위치 계산 (커서 위치 기준)
        let leftPos = 16; // 기본 패딩
        
        if (cursorPosition > 0) {
          // 커서 위치 기준으로 배치
          leftPos = Math.min(
            cursorPosition,
            containerRect.width - 320 // 컨테이너 너비 - 팝오버 최대 너비
          );
        }
        
        // 스타일 적용
        suggestionContainer.style.position = 'absolute';
        suggestionContainer.style.bottom = \`\${containerRect.height + 8}px\`;
        suggestionContainer.style.left = \`\${leftPos}px\`;
        suggestionContainer.style.maxWidth = '320px';
        suggestionContainer.style.width = 'auto';
      }
      
      // 커서 위치 계산
      function getCursorPosition() {
        if (!chatInput) return 0;
        
        const value = chatInput.value;
        const selectionStart = chatInput.selectionStart;
        
        if (selectionStart <= 0) return 16; // 기본 패딩
        
        // 임시 요소 생성하여 텍스트 너비 측정
        const span = document.createElement('span');
        span.style.position = 'absolute';
        span.style.visibility = 'hidden';
        span.style.whiteSpace = 'pre';
        span.style.font = window.getComputedStyle(chatInput).font;
        
        // 커서 위치까지의 텍스트
        span.textContent = value.substring(0, selectionStart);
        
        // 요소 추가, 측정, 제거
        document.body.appendChild(span);
        const width = span.getBoundingClientRect().width;
        document.body.removeChild(span);
        
        return width + 16; // 입력 필드 패딩 추가
      }
      
      // 제안 탐색
      function navigateSuggestion(direction) {
        if (suggestions.length === 0) return;
        
        if (direction === 'up') {
          activeSuggestionIndex = (activeSuggestionIndex <= 0) ?
            suggestions.length - 1 : activeSuggestionIndex - 1;
        } else {
          activeSuggestionIndex = (activeSuggestionIndex >= suggestions.length - 1) ?
            0 : activeSuggestionIndex + 1;
        }
        
        highlightActiveSuggestion();
      }
      
      // 활성 제안 강조
      function highlightActiveSuggestion() {
        if (!suggestionContainer) return;
        
        // 모든 항목에서 활성 클래스 제거
        suggestionContainer.querySelectorAll('.command-suggestion').forEach(el => {
          el.classList.remove('active');
        });
        
        // 활성 항목에 클래스 추가
        if (activeSuggestionIndex >= 0 && activeSuggestionIndex < suggestions.length) {
          const activeEl = suggestionContainer.querySelector(
            \`.command-suggestion[data-index="\${activeSuggestionIndex}"]\`
          );
          
          if (activeEl) {
            activeEl.classList.add('active');
            
            // 필요시 스크롤
            const container = suggestionContainer;
            const elementTop = activeEl.offsetTop;
            const elementBottom = elementTop + activeEl.offsetHeight;
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
      
      // 제안 선택
      function selectSuggestion(index) {
        if (!chatInput || index < 0 || index >= suggestions.length) return;
        
        const suggestion = suggestions[index];
        
        // 입력 필드에 명령어 삽입
        chatInput.value = suggestion.insertText;
        chatInput.focus();
        
        // 커서 위치 조정
        chatInput.selectionStart = chatInput.selectionEnd = chatInput.value.length;
        
        // 자동 높이 조정
        adjustInputHeight();
        
        // 제안 숨기기
        hideSuggestions();
        
        // VSCode에 입력 변경 알림
        vscode.postMessage({
          type: 'inputChanged',
          content: suggestion.insertText
        });
      }
      
      // 입력 필드 높이 조정
      function adjustInputHeight() {
        if (!chatInput) return;
        
        chatInput.style.height = 'auto';
        chatInput.style.height = chatInput.scrollHeight + 'px';
      }
      
      // 카테고리 제목 가져오기
      function getCategoryTitle(category) {
        const titles = {
          'general': '일반 명령어',
          'git': 'Git 관련 명령어',
          'code': '코드 관련 명령어',
          'utility': '유틸리티 명령어',
          'advanced': '고급 명령어'
        };
        
        return titles[category] || category;
      }
      
      // 카테고리별 아이콘 가져오기
      function getIconForCategory(category) {
        const icons = {
          'general': '●',  // 일반 명령어
          'git': '◆',      // Git 명령어
          'code': '▢',     // 코드 관련
          'utility': '◈',  // 유틸리티
          'advanced': '◎'  // 고급 설정
        };
        
        return icons[category] || '○';
      }
      
      // 외부에서 호출하는 API
      window.updateCommandSuggestions = function(newSuggestions) {
        showSuggestions(newSuggestions);
      };
      
      // 초기화
      initialize();
    })();
    `;
  }

  /**
   * 세련된 메시지 처리 및 포맷팅 스크립트
   */
  private _getChatScript(): string {
    return `
    // APE Chat - Luxury Minimal UI Implementation
    const vscode = acquireVsCodeApi();
    
    // State variables
    let chatMessages;
    let chatInput;
    let sendButton;
    let clearButton;
    let attachButton;
    let modelIndicator;
    let modelSelector;
    let smartPromptingToggle;
    let smartPromptingLabel;
    let attachedFiles = [];
    let commandSuggestionsContainer;
    let isUserScrolled = false;
    let isScrollNearBottom = true;
    const SCROLL_THRESHOLD = 100;
    let suggestions = [];
    let activeSuggestionIndex = -1;
    
    // Initialize the chat interface
    function initialize() {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setup);
      } else {
        setup();
      }
    }
    
    // Setup function
    function setup() {
      // Get DOM elements
      chatMessages = document.getElementById('chat-messages');
      chatInput = document.getElementById('chat-input');
      sendButton = document.getElementById('send-button');
      clearButton = document.getElementById('clear-button');
      attachButton = document.getElementById('attach-button');
      modelIndicator = document.getElementById('model-indicator');
      modelSelector = document.getElementById('model-selector');
      smartPromptingToggle = document.getElementById('smart-prompting-toggle');
      smartPromptingLabel = document.getElementById('smart-prompting-label');
      
      // Create command suggestions container if it doesn't exist
      commandSuggestionsContainer = document.getElementById('command-suggestions');
      if (!commandSuggestionsContainer) {
        commandSuggestionsContainer = document.createElement('div');
        commandSuggestionsContainer.id = 'command-suggestions';
        document.getElementById('chat-input-container').appendChild(commandSuggestionsContainer);
      }
      
      // Set up event listeners
      setupEventListeners();
      
      // Load initial messages
      const initialMessages = ${JSON.stringify(this._messages)};
      const initialStreaming = ${this._isStreaming};
      updateMessages(initialMessages, initialStreaming);
      
      console.log('Chat interface initialized');
    }
    
    // Setup event listeners
    function setupEventListeners() {
      if (!chatMessages || !chatInput || !sendButton || !clearButton || !attachButton || 
          !modelSelector || !smartPromptingToggle) {
        console.error('Required elements not found');
        return;
      }
      
      // Smart scroll detection
      chatMessages.addEventListener('scroll', detectUserScroll);
      
      // Chat input events
      chatInput.addEventListener('input', () => {
        adjustInputHeight();
        
        // Notify about input changes for slash commands
        vscode.postMessage({ 
          type: 'inputChanged',
          content: chatInput.value
        });
      });
      
      // Key events for navigation and submission
      chatInput.addEventListener('keydown', handleKeyDown);
      
      // Button click events
      sendButton.addEventListener('click', handleSendClick);
      clearButton.addEventListener('click', handleClearClick);
      attachButton.addEventListener('click', handleAttachClick);
      modelSelector.addEventListener('click', handleModelSelectorClick);
      smartPromptingToggle.addEventListener('click', handleSmartPromptingToggle);
      
      // File attachment handling in message area
      chatMessages.addEventListener('click', handleMessageClick);
      
      // Listen for messages from extension
      window.addEventListener('message', handleExtensionMessages);
    }
    
    // Send button click handler
    function handleSendClick() {
      if (chatInput.disabled) {
        // Cancel stream if in progress
        vscode.postMessage({ type: 'cancelStream' });
      } else if (chatInput.value.trim()) {
        // Send message
        sendMessage();
      }
    }
    
    // Clear button click handler
    function handleClearClick() {
      vscode.postMessage({ type: 'clearChat' });
    }
    
    // Attach button click handler
    function handleAttachClick() {
      vscode.postMessage({ type: 'attachFile' });
    }
    
    // Model selector click handler
    function handleModelSelectorClick() {
      vscode.postMessage({ type: 'showModelSelector' });
    }
    
    // Smart prompting toggle handler
    function handleSmartPromptingToggle() {
      vscode.postMessage({ type: 'toggleSmartPrompting' });
    }
    
    // Handle clicks within message area (for file attachments, etc.)
    function handleMessageClick(event) {
      // File view button click handling
      if (event.target.closest('.attachment-action.view-file')) {
        const attachedFile = event.target.closest('.attached-file');
        if (attachedFile) {
          const fileName = attachedFile.querySelector('.attachment-name').textContent;
          // Request to open the file
          vscode.postMessage({
            type: 'openFile',
            fileName: fileName
          });
        }
      }
    }
    
    // Handle messages from the extension
    function handleExtensionMessages(event) {
      const message = event.data;
      
      switch (message.type) {
        case 'updateMessages':
          updateMessages(message.messages, message.isStreaming);
          break;
          
        case 'editorContent':
          handleEditorContent(message.content);
          break;
          
        case 'commandSuggestions':
          updateCommandSuggestions(message.suggestions);
          break;
          
        case 'insertCommandToInput':
          insertCommandFromHelp(message.command);
          break;
          
        case 'updateModelIndicator':
          updateModelName(message.modelName);
          break;
          
        case 'fileAttached':
          handleFileAttachment(message.file);
          break;
          
        case 'updateSmartPrompting':
          updateSmartPromptingUI(message.enabled, message.mode);
          break;
      }
    }
    
    // Handle keyboard events
    function handleKeyDown(e) {
      // Handle Enter key to send message (unless Shift is held for new line)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
        return;
      }
      
      // Handle command suggestions navigation
      if (suggestions.length > 0) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          navigateSuggestion('up');
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          navigateSuggestion('down');
        } else if (e.key === 'Tab') {
          e.preventDefault();
          selectActiveSuggestion();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          hideCommandSuggestions();
        } else if (e.key === 'Enter' && activeSuggestionIndex >= 0) {
          e.preventDefault();
          selectSuggestion(activeSuggestionIndex);
        }
      }
    }
    
    // Send message to extension
    function sendMessage() {
      const content = chatInput.value.trim();
      if (!content) return;
      
      // Send message with any attached files
      if (attachedFiles.length > 0) {
        vscode.postMessage({ 
          type: 'sendMessage', 
          content,
          metadata: {
            attachedFiles: attachedFiles
          }
        });
        // Reset attached files
        attachedFiles = [];
      } else {
        vscode.postMessage({ type: 'sendMessage', content });
      }
      
      // Clear input and reset height
      chatInput.value = '';
      adjustInputHeight();
      
      // Hide command suggestions
      hideCommandSuggestions();
    }
    
    // Update chat messages
    function updateMessages(messages, isStreaming) {
      if (!chatMessages) return;
      
      // Track current message IDs for comparison
      const currentMessageIds = Array.from(chatMessages.children)
        .map(el => el.getAttribute('data-message-id'))
        .filter(id => id);
      
      // Check scroll position
      detectUserScroll();
      
      // Update or add new messages
      messages.forEach(message => {
        const messageId = message.id;
        const isLastMessage = message.id === messages[messages.length - 1].id;
        const isStreamingLastMessage = isStreaming && isLastMessage && message.role === 'assistant';
        
        // Check if message already exists
        let messageElement = document.getElementById(\`msg-\${messageId}\`);
        
        // Create new message element if needed
        if (!messageElement) {
          messageElement = createMessageElement(message, isStreamingLastMessage);
          chatMessages.appendChild(messageElement);
        } else if (isStreamingLastMessage) {
          // Add streaming class to existing message
          messageElement.classList.add('streaming');
        } else {
          // Remove streaming class when done
          messageElement.classList.remove('streaming');
        }
        
        // Update message content if changed
        const contentElement = messageElement.querySelector('.message-content');
        const formattedContent = formatMessageContent(message.content);
        
        if (contentElement.innerHTML !== formattedContent) {
          // For streaming messages, update efficiently
          if (isStreamingLastMessage && contentElement.innerHTML && formattedContent.startsWith(contentElement.innerHTML)) {
            // Only append new content
            const additionalContent = formattedContent.substring(contentElement.innerHTML.length);
            if (additionalContent) {
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = additionalContent;
              const fragment = document.createDocumentFragment();
              while (tempDiv.firstChild) {
                fragment.appendChild(tempDiv.firstChild);
              }
              contentElement.appendChild(fragment);
              
              // Smart scroll during streaming
              performSmartScroll();
              return;
            }
          } else {
            // Replace entire content
            contentElement.innerHTML = formattedContent;
          }
        }
      });
      
      // Remove deleted messages
      const currentIds = messages.map(m => m.id);
      currentMessageIds.forEach(id => {
        if (!currentIds.includes(id)) {
          const element = document.querySelector(\`[data-message-id="\${id}"]\`);
          if (element) element.remove();
        }
      });
      
      // Smart scroll at end of update
      performSmartScroll(messages.length !== currentMessageIds.length || !isStreaming);
      
      // Update UI based on streaming state
      updateStreamingState(isStreaming);
    }
    
    // Create message element
    function createMessageElement(message, isStreaming) {
      const element = document.createElement('div');
      element.id = \`msg-\${message.id}\`;
      element.className = \`message \${message.role}\`;
      if (isStreaming) element.classList.add('streaming');
      element.setAttribute('data-message-id', message.id);
      
      const contentElement = document.createElement('div');
      contentElement.className = 'message-content';
      contentElement.innerHTML = formatMessageContent(message.content);
      element.appendChild(contentElement);
      
      return element;
    }
    
    // Format message content with code blocks, etc.
    function formatMessageContent(content) {
      if (!content) return '';
      
      // Check if content is already HTML
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
      
      // Process markdown-like content
      let formatted = content;
      
      // Replace code blocks with styled UI
      formatted = formatted.replace(/\`\`\`([a-zA-Z0-9_]*)\n([\\s\\S]*?)\n\`\`\`/g, function(match, language, code) {
        const codeId = 'code_' + Math.random().toString(36).substr(2, 9);
        const escapedCode = escapeHtml(code);
        const lang = language || 'plaintext';
        
        // Generate line numbers if code has multiple lines
        const lines = code.split('\\n');
        const lineNumbers = lines.map((_, i) => (i + 1)).join('\\n');
        const showLineNumbers = lines.length > 1;
        
        return '<div class="code-block-container code-block-popup">' +
          '<div class="code-block-header">' +
            '<span class="code-block-language language-' + lang + '">' + lang + '</span>' +
            '<div class="code-block-actions">' +
              '<button class="code-action-button copy-button" data-code-id="' + codeId + '" title="Copy">' +
                '<i class="codicon codicon-copy"></i>' +
                '<span class="tooltip">Copy to clipboard</span>' +
              '</button>' +
              '<button class="code-action-button insert-code-button" data-code-id="' + codeId + '" title="Insert to editor">' +
                '<i class="codicon codicon-arrow-small-right"></i>' +
                '<span class="tooltip">Insert to current file</span>' +
              '</button>' +
              '<button class="code-action-button new-file-button" data-code-id="' + codeId + '" title="Create new file">' +
                '<i class="codicon codicon-new-file"></i>' +
                '<span class="tooltip">Create new file</span>' +
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
      
      // Replace inline code
      formatted = formatted.replace(/\`([^\`]+)\`/g, '<code class="inline-code">$1</code>');
      
      // Enhance file attachment display
      formatted = formatted.replace(/첨부된 파일: ([^\\n]+)/g, function(match, fileName) {
        return '<div class="attached-file">' +
          '<span class="attachment-icon">◈</span> ' +
          '<span class="attachment-name">' + fileName + '</span>' +
          '<div class="attachment-actions">' +
            '<button class="attachment-action view-file" title="Open file">' +
              '<span class="emoji-icon">⌕</span>' +
            '</button>' +
          '</div>' +
        '</div>';
      });
      
      // Convert newlines to <br>
      formatted = formatted.replace(/\\n/g, '<br>');
      
      return formatted;
    }
    
    // Escape HTML entities
    function escapeHtml(unsafe) {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }
    
    // Update streaming state UI
    function updateStreamingState(isStreaming) {
      if (!sendButton || !chatInput) return;
      
      if (isStreaming) {
        sendButton.innerHTML = '<span class="emoji-icon">■</span>';
        sendButton.title = 'Stop generating';
        chatInput.disabled = true;
      } else {
        sendButton.innerHTML = '<span class="emoji-icon">↑</span>';
        sendButton.title = 'Send message';
        chatInput.disabled = false;
      }
    }
    
    // Handle command suggestions
    function updateCommandSuggestions(newSuggestions) {
      suggestions = newSuggestions || [];
      activeSuggestionIndex = -1;
      
      if (!commandSuggestionsContainer) return;
      
      // Clear container
      commandSuggestionsContainer.innerHTML = '';
      
      // Hide if no suggestions
      if (suggestions.length === 0) {
        commandSuggestionsContainer.style.display = 'none';
        return;
      }
      
      // Position container
      positionCommandSuggestions();
      
      // Group by category
      const categories = {};
      suggestions.forEach(suggestion => {
        if (!categories[suggestion.category]) {
          categories[suggestion.category] = [];
        }
        categories[suggestion.category].push(suggestion);
      });
      
      // Add category groups
      Object.keys(categories).forEach(category => {
        // Add category header
        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'suggestion-category';
        categoryHeader.textContent = getCategoryTitle(category);
        commandSuggestionsContainer.appendChild(categoryHeader);
        
        // Add suggestions for this category
        categories[category].forEach((suggestion) => {
          const suggestionEl = document.createElement('div');
          suggestionEl.className = 'command-suggestion';
          suggestionEl.dataset.index = suggestions.indexOf(suggestion).toString();
          
          // Add shortcut hint
          const index = suggestions.indexOf(suggestion);
          let shortcutHint = '';
          if (index < 9) {
            shortcutHint = \`Tab+\${index + 1}\`;
          } else if (index === 9) {
            shortcutHint = 'Tab+0';
          }
          suggestionEl.dataset.shortcut = shortcutHint;
          
          // Add icon and content
          suggestionEl.innerHTML = \`
            <span class="suggestion-icon">\${getIconForCategory(category)}</span>
            <span class="suggestion-label">\${suggestion.label}</span>
            <span class="suggestion-description">\${suggestion.description}</span>
          \`;
          
          // Add click handler
          suggestionEl.addEventListener('click', () => {
            selectSuggestion(index);
          });
          
          commandSuggestionsContainer.appendChild(suggestionEl);
        });
      });
      
      // Show container with animation
      commandSuggestionsContainer.style.display = 'block';
      commandSuggestionsContainer.style.opacity = '0';
      commandSuggestionsContainer.style.transform = 'translateY(8px)';
      
      // Apply animation after a small delay
      setTimeout(() => {
        commandSuggestionsContainer.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        commandSuggestionsContainer.style.opacity = '1';
        commandSuggestionsContainer.style.transform = 'translateY(0)';
      }, 10);
    }
    
    // Position the suggestions container
    function positionCommandSuggestions() {
      if (!commandSuggestionsContainer || !chatInput) return;
      
      const inputRect = chatInput.getBoundingClientRect();
      const containerRect = document.getElementById('chat-input-container').getBoundingClientRect();
      
      // Position above input
      commandSuggestionsContainer.style.position = 'absolute';
      commandSuggestionsContainer.style.bottom = \`\${containerRect.height}px\`;
      commandSuggestionsContainer.style.left = '16px';
      commandSuggestionsContainer.style.maxWidth = '320px';
      commandSuggestionsContainer.style.width = 'auto';
    }
    
    // Navigate suggestions with arrow keys
    function navigateSuggestion(direction) {
      if (suggestions.length === 0) return false;
      
      if (direction === 'up') {
        activeSuggestionIndex = (activeSuggestionIndex <= 0) ? 
          suggestions.length - 1 : activeSuggestionIndex - 1;
      } else {
        activeSuggestionIndex = (activeSuggestionIndex >= suggestions.length - 1) ? 
          0 : activeSuggestionIndex + 1;
      }
      
      highlightActiveSuggestion();
      return true;
    }
    
    // Highlight the active suggestion
    function highlightActiveSuggestion() {
      if (!commandSuggestionsContainer) return;
      
      // Remove highlighting from all suggestions
      commandSuggestionsContainer.querySelectorAll('.command-suggestion').forEach(el => {
        el.classList.remove('active');
      });
      
      // Add highlighting to active suggestion
      if (activeSuggestionIndex >= 0 && activeSuggestionIndex < suggestions.length) {
        const activeEl = commandSuggestionsContainer.querySelector(
          \`.command-suggestion[data-index="\${activeSuggestionIndex}"]\`
        );
        
        if (activeEl) {
          activeEl.classList.add('active');
          
          // Scroll into view if needed
          const containerTop = commandSuggestionsContainer.scrollTop;
          const containerBottom = containerTop + commandSuggestionsContainer.offsetHeight;
          const elementTop = activeEl.offsetTop;
          const elementBottom = elementTop + activeEl.offsetHeight;
          
          if (elementTop < containerTop) {
            commandSuggestionsContainer.scrollTop = elementTop;
          } else if (elementBottom > containerBottom) {
            commandSuggestionsContainer.scrollTop = elementBottom - commandSuggestionsContainer.offsetHeight;
          }
        }
      }
    }
    
    // Select active suggestion
    function selectActiveSuggestion() {
      if (activeSuggestionIndex >= 0 && activeSuggestionIndex < suggestions.length) {
        selectSuggestion(activeSuggestionIndex);
      } else if (suggestions.length > 0) {
        activeSuggestionIndex = 0;
        highlightActiveSuggestion();
      }
    }
    
    // Select a suggestion by index
    function selectSuggestion(index) {
      if (!chatInput || index < 0 || index >= suggestions.length) return;
      
      const suggestion = suggestions[index];
      
      // Insert text to input
      chatInput.value = suggestion.insertText;
      chatInput.focus();
      
      // Position cursor at end
      chatInput.selectionStart = chatInput.selectionEnd = chatInput.value.length;
      
      // Adjust input height
      adjustInputHeight();
      
      // Hide suggestions
      hideCommandSuggestions();
      
      // Notify about input change
      vscode.postMessage({
        type: 'inputChanged',
        content: chatInput.value
      });
    }
    
    // Hide command suggestions
    function hideCommandSuggestions() {
      if (!commandSuggestionsContainer) return;
      
      commandSuggestionsContainer.style.opacity = '0';
      commandSuggestionsContainer.style.transform = 'translateY(8px)';
      
      setTimeout(() => {
        commandSuggestionsContainer.style.display = 'none';
      }, 200);
      
      suggestions = [];
      activeSuggestionIndex = -1;
    }
    
    // Handle editor content for insertion
    function handleEditorContent(content) {
      if (!chatInput || !content) return;
      
      chatInput.value += \`\`\`\\n\${content}\\n\`\`\`\\n\`;
      adjustInputHeight();
    }
    
    // Handle file attachment
    function handleFileAttachment(file) {
      if (!chatInput) return;
      
      // Add file to list
      attachedFiles.push({
        path: file.relativePath || file.path,
        name: file.name,
        type: file.type,
        content: file.hasContent ? file.content : undefined
      });
      
      // Add file info to input
      const fileInfo = "첨부된 파일: " + file.name;
      if (chatInput.value) {
        chatInput.value += '\\n' + fileInfo;
      } else {
        chatInput.value = fileInfo;
      }
      
      adjustInputHeight();
      chatInput.focus();
    }
    
    // Insert command from help
    function insertCommandFromHelp(command) {
      if (!chatInput) return;
      
      // Ensure command has slash prefix
      if (!command.startsWith('/')) {
        command = '/' + command;
      }
      
      // Insert into input
      chatInput.value = command;
      chatInput.focus();
      
      // Move cursor to end
      chatInput.selectionStart = chatInput.selectionEnd = chatInput.value.length;
      
      // Adjust height
      adjustInputHeight();
      
      // Notify input change
      vscode.postMessage({
        type: 'inputChanged',
        content: chatInput.value
      });
    }
    
    // Update model name in UI
    function updateModelName(modelName) {
      if (!modelName) return;
      
      const modelNameEl = document.getElementById('model-name');
      if (modelNameEl) {
        modelNameEl.textContent = modelName;
      }
    }
    
    // Update smart prompting UI
    function updateSmartPromptingUI(enabled, mode) {
      if (!smartPromptingToggle || !smartPromptingLabel) return;
      
      if (enabled) {
        smartPromptingToggle.classList.add('active');
        
        // Update label based on mode
        let modeText = 'Smart Prompting';
        switch (mode) {
          case 'basic':
            modeText = 'Basic Mode';
            break;
          case 'advanced':
            modeText = 'Advanced Mode';
            break;
          case 'expert':
            modeText = 'Expert Mode';
            break;
        }
        
        smartPromptingLabel.textContent = modeText;
      } else {
        smartPromptingToggle.classList.remove('active');
        smartPromptingLabel.textContent = 'Smart Prompting';
      }
    }
    
    // Detect user scroll
    function detectUserScroll() {
      if (!chatMessages) return;
      
      // Calculate scroll position
      const scrollPosition = chatMessages.scrollTop + chatMessages.clientHeight;
      const scrollThreshold = chatMessages.scrollHeight - SCROLL_THRESHOLD;
      
      // Check if scroll is near bottom
      isScrollNearBottom = scrollPosition >= scrollThreshold;
      
      // Detect user scroll event
      if (!isScrollNearBottom) {
        isUserScrolled = true;
      }
    }
    
    // Smart scroll logic
    function performSmartScroll(forceScroll = false) {
      if (!chatMessages) return;
      
      // Scroll only if user hasn't scrolled up or if force scroll is requested
      if (forceScroll || !isUserScrolled || isScrollNearBottom) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
        isUserScrolled = false;
      }
    }
    
    // Adjust input height based on content
    function adjustInputHeight() {
      if (!chatInput) return;
      
      chatInput.style.height = 'auto';
      chatInput.style.height = (chatInput.scrollHeight) + 'px';
    }
    
    // Get category title
    function getCategoryTitle(category) {
      const titles = {
        'general': '일반 명령어',
        'git': 'Git 관련 명령어',
        'code': '코드 관련 명령어',
        'utility': '유틸리티 명령어',
        'advanced': '고급 명령어'
      };
      
      return titles[category] || category;
    }
    
    // Get icon for category
    function getIconForCategory(category) {
      const icons = {
        'general': '●',  // 일반 명령어
        'git': '◆',      // Git 명령어
        'code': '▢',     // 코드 관련
        'utility': '◈',  // 유틸리티
        'advanced': '◎'  // 고급 설정
      };
      
      return icons[category] || '○';
    }
    
    // 명령어 제안 시스템 초기화
    ${this._getCommandSuggestionScript()}
    
    // Initialize everything
    initialize();
    `;
  }

  /**
   * Generates the HTML for the webview
   */
  private _getHtmlForWebview(webview: vscode.Webview): string {
    // Get paths to local resources
    const modernStylesUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._context.extensionUri, 'media', 'chat-ape.css')
    );

    const codiconsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._context.extensionUri, 'media', 'codicon', 'codicon.css')
    );
    
    const codeBlockStylesUri = CodeService.getCodeBlockStyleUri(webview, this._context);

    const nonce = this._getNonce();

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource} data:; img-src ${webview.cspSource} https: data:; script-src 'nonce-${nonce}';">
      <link href="${modernStylesUri}" rel="stylesheet">
      <link href="${codiconsUri}" rel="stylesheet">
      <link href="${codeBlockStylesUri}" rel="stylesheet">
      <title>APE Chat</title>
    </head>
    <body>
      <div id="chat-container">
        <div id="chat-messages"></div>
        <div id="chat-input-container">
          <div id="input-actions">
            <button id="smart-prompting-toggle" title="Toggle Smart Prompting" class="input-top-button">
              <span class="emoji-icon">✦</span> <span id="smart-prompting-label">Smart Prompting</span>
            </button>
          </div>
          <textarea id="chat-input" placeholder="Type a message or / for commands..." rows="1"></textarea>
          <div id="input-buttons">
            <button id="attach-button" title="Attach File" class="input-action-button">
              <span class="emoji-icon">◈</span>
            </button>
            <button id="send-button" title="Send Message">
              <span class="emoji-icon">↑</span>
            </button>
            <button id="clear-button" title="Clear Chat">
              <span class="emoji-icon">○</span>
            </button>
          </div>
        </div>
        <div id="model-indicator">
          <span id="model-name">Loading model...</span>
          <button id="model-selector" title="Change Model">
            <span class="emoji-icon">◎</span> Change Model
          </button>
        </div>
      </div>
      
      <script nonce="${nonce}">
        ${this._getChatScript()}
      </script>
    </body>
    </html>`;
  }

  /**
   * Generates a random nonce for CSP
   */
  private _getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}