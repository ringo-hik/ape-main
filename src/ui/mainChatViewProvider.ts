import * as vscode from 'vscode';
import { LLMService } from '../core/llm/llmService';
import { MemoryService } from '../core/memory/memoryService';
import { CommandManager } from '../core/commands/commandManager';
import { Message, MessageRole } from '../types/chat';
import { CommandSuggestion } from '../core/commands/slashCommand';
import { CodeService } from './chat/codeService';
import { ModelManager } from '../core/llm/modelManager';
import { SmartPromptingService, SmartPromptingState, SmartPromptingMode } from '../core/services/smartPromptingService';
import { WelcomeViewProvider } from './welcomeView';

/**
 * MainChatViewProvider manages the primary chat interface WebView
 * with a clean, modern, and user-friendly design
 */
export class MainChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'apeChat';

  private _view?: vscode.WebviewView;
  private _messages: Message[] = [];
  private _isStreaming = false;
  private _currentStreamMessageId: string | null = null;
  private _streamUpdateTimeout: NodeJS.Timeout | null = null;
  private _modelChangeListener?: vscode.Disposable;
  private _smartPromptingService?: SmartPromptingService;
  private _smartPromptingStateListener?: vscode.Disposable;

  // Command suggestion event
  private readonly _onDidSuggestCommands = new vscode.EventEmitter<CommandSuggestion[]>();
  public readonly onDidSuggestCommands = this._onDidSuggestCommands.event;

  constructor(
    private readonly _context: vscode.ExtensionContext,
    private readonly _llmService: LLMService,
    private readonly _memoryService: MemoryService,
    private readonly _commandManager: CommandManager,
    private readonly _modelManager?: ModelManager
  ) {
    // Initialize SmartPromptingService
    this._smartPromptingService = new SmartPromptingService(_context, _llmService);

    // Register state change listener
    this._smartPromptingStateListener = this._smartPromptingService.onStateChanged(state => {
      this._updateSmartPromptingUI(state);
    });

    // Add listener to context subscriptions for proper disposal
    this._context.subscriptions.push(this._smartPromptingStateListener);
  }
  
  /**
   * Converts a URI to a webview-compatible URI
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
    await this.loadMessages();
    
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
  }

  /**
   * Updates the model indicator UI with the current model
   */
  public updateModelIndicator(): void {
    if (!this._view) {
      console.log('Model indicator update failed: no webview');
      return;
    }
    
    try {
      // Use ModelManager if available, otherwise fall back to LLMService
      let currentModel, displayName;
      
      if (this._modelManager) {
        currentModel = this._modelManager.getActiveModel();
        displayName = this._modelManager.getModelDisplayName(currentModel);
        console.log('Using ModelManager to get current model info:', currentModel);
      } else {
        currentModel = this._llmService.getActiveModel();
        displayName = this.getModelDisplayName(currentModel);
        console.log('Using LLMService to get current model info:', currentModel);
      }
      
      // Send message to webview to update model name display
      this._view.webview.postMessage({
        type: 'updateModelIndicator',
        modelName: displayName
      });
      console.log('Model indicator update message sent to webview');
    } catch (error) {
      console.error('Error updating model indicator:', error);
    }
  }
  
  /**
   * Converts model ID to a user-friendly display name
   * @deprecated Use the ModelManager.getModelDisplayName method instead
   */
  private getModelDisplayName(modelId: string): string {
    return this._llmService.getModelDisplayName(modelId);
  }

  /**
   * 랜덤 인사말 생성 - 유저 컨텍스트에 맞는 인사말과 팁 제공
   */
  private getRandomGreeting(): string {
    try {
      // greetings.json 파일에서 인사말 데이터 불러오기 (빌드된 확장 프로그램의 경로 사용)
      const greetingsUri = vscode.Uri.joinPath(this._context.extensionUri, 'out', 'data', 'greetings.json');

      console.log('Loading greetings from:', greetingsUri.fsPath);

      // 파일 읽기 - fs 모듈 사용
      const fs = require('fs');
      let greetingsContent;

      try {
        // 먼저 빌드된 경로에서 시도
        greetingsContent = fs.readFileSync(greetingsUri.fsPath, 'utf8');
      } catch (fsError) {
        console.warn('Failed to read from build output, trying source directory:', fsError);

        // 빌드 경로에서 실패하면 소스 디렉토리에서 시도
        const sourceGreetingsUri = vscode.Uri.joinPath(this._context.extensionUri, 'src', 'data', 'greetings.json');
        greetingsContent = fs.readFileSync(sourceGreetingsUri.fsPath, 'utf8');
      }

      // JSON 파싱
      const greetingsFile = JSON.parse(greetingsContent);

      // 변경된 포맷의 greetings.json 파일 처리
      if (greetingsFile.messages && Array.isArray(greetingsFile.messages) && greetingsFile.messages.length > 0) {
        // 단순 messages 배열에서 랜덤 메시지 선택
        return greetingsFile.messages[Math.floor(Math.random() * greetingsFile.messages.length)];
      }

      // 이전 포맷의 파일도 지원 (하위 호환성)
      if (greetingsFile.greetings && Array.isArray(greetingsFile.greetings)) {
        // 모든 개별 인사말 메시지 수집
        const allMessages: string[] = [];

        // 일반 카테고리 메시지 수집
        for (const category of greetingsFile.greetings) {
          if (category.messages && Array.isArray(category.messages)) {
            allMessages.push(...category.messages);
          }
        }

        // 조합 카테고리도 포함
        if (greetingsFile.combinations && Array.isArray(greetingsFile.combinations)) {
          for (const combo of greetingsFile.combinations) {
            if (combo.messages && Array.isArray(combo.messages)) {
              allMessages.push(...combo.messages);
            }
          }
        }

        // 유효한 메시지가 있는지 확인
        if (allMessages.length > 0) {
          return allMessages[Math.floor(Math.random() * allMessages.length)];
        }
      }

      throw new Error('No valid greeting messages found');

    } catch (error) {
      console.error('Error loading greetings:', error);

      // 오류 발생 시 기본 인사말 반환
      const fallbackGreetings = [
        "안녕하세요! 무엇을 도와드릴까요? 도움이 필요하시면 '/'를 입력해보세요.",
        "어떤 개발 작업을 도와드릴까요? 슬래시(/) 명령어로 다양한 기능을 사용하실 수 있어요.",
        "오늘은 어떤 코드를 작성하고 계신가요? 도움이 필요하시면 알려주세요."
      ];

      return fallbackGreetings[Math.floor(Math.random() * fallbackGreetings.length)];
    }
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

    // Handle slash commands
    if (content.trim().startsWith('/')) {
      // Execute slash command directly via commandManager
      await this._commandManager.slashCommandManager.executeCommand(content);
      return;
    }

    // Apply smart prompting (if enabled)
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
    this.updateChatView();

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
      this.updateChatView();

      // Start streaming response from LLM
      await this._llmService.streamResponse(
        this._messages,
        (chunk: string, done: boolean) => {
          // Update the assistant message with the new chunk
          const assistantMessage = this._messages.find(m => m.id === this._currentStreamMessageId);
          if (assistantMessage) {
            assistantMessage.content += chunk;

            // Debounce updates for efficiency
            if (!this._streamUpdateTimeout) {
              this._streamUpdateTimeout = setTimeout(() => {
                this.updateChatView();
                this._streamUpdateTimeout = null;
              }, 30); // 30ms debouncing
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

              // 메시지가 오류 메시지인지 확인
              const assistantMessage = this._messages.find(m => m.id === this._currentStreamMessageId);
              if (assistantMessage && assistantMessage.content.includes('[연결 오류가 발생했습니다]')) {
                // 오류 메시지를 시스템 메시지로 변경
                assistantMessage.role = MessageRole.System;
                assistantMessage.content = '연결 오류가 발생했습니다. 다시 시도해주세요.';
              }

              // Save messages to memory
              this.saveMessages();

              this.updateChatView();
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
      this.updateChatView();
    }
  }

  /**
   * Clears all messages from the chat and shows welcome screen
   */
  public clearChat(): void {
    console.log('Clearing chat - creating new welcome message');
    
    // Clear messages from memory service
    this._memoryService.clearMessages();
    
    try {
      // Get HTML content for welcome message
      const welcomeHTML = WelcomeViewProvider.getWelcomeMessageHTML();
      console.log('WelcomeViewProvider used - welcome HTML generated, length:', welcomeHTML.length);
      
      // Create welcome messages
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
          content: this.getRandomGreeting(),
          timestamp: new Date()
        }
      ];
      console.log('Welcome messages added - IDs:', welcomeId, assistantId);
      
      // Update UI immediately
      this.updateChatView();
    } catch (error) {
      console.error('Error creating welcome message:', error);
      this._messages = [{
        id: `error_${Date.now()}`,
        role: MessageRole.System,
        content: '웰컴 화면을 불러오는 중 오류가 발생했습니다.',
        timestamp: new Date()
      }];
      
      // Update UI with error message
      this.updateChatView();
    }
  }

  /**
   * Loads messages from memory service
   */
  private async loadMessages(): Promise<void> {
    console.log('Loading messages - checking for existing messages');
    const result = await this._memoryService.getMessages();
    if (result.success && result.data && result.data.length > 0) {
      console.log(`Loaded ${result.data.length} saved messages`);
      this._messages = result.data;
    } else {
      console.log('No saved messages found, adding welcome message');
      
      try {
        // Get HTML content for welcome message
        const welcomeHTML = WelcomeViewProvider.getWelcomeMessageHTML();
        console.log('WelcomeViewProvider used - welcome HTML generated, length:', welcomeHTML.length);
        
        // Create welcome messages
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
            content: this.getRandomGreeting(),
            timestamp: new Date()
          }
        ];
        console.log('Welcome messages added - IDs:', welcomeId, assistantId);
      } catch (error) {
        console.error('Error creating welcome message:', error);
        this._messages = [{
          id: `error_${Date.now()}`,
          role: MessageRole.System,
          content: '웰컴 화면을 불러오는 중 오류가 발생했습니다.',
          timestamp: new Date()
        }];
      }
    }
  }

  /**
   * Saves messages to memory service
   */
  private async saveMessages(): Promise<void> {
    for (const message of this._messages) {
      await this._memoryService.addMessage(message);
    }
  }

  /**
   * Updates the chat view with the current messages
   */
  private updateChatView(): void {
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

        // Cancel any pending timeout
        if (this._streamUpdateTimeout) {
          clearTimeout(this._streamUpdateTimeout);
          this._streamUpdateTimeout = null;
        }

        this.updateChatView();
        break;

      case 'clearChat':
        this.clearChat();
        break;
        
      case 'command':
        // Execute command from help panel
        this.sendMessage(message.command);
        break;
        
      case 'insertCommand':
        // Insert command text into chat input
        this.insertCommandToChat(message.command);
        break;

      case 'getEditorContent':
        this.getEditorContent().then(content => {
          if (this._view) {
            this._view.webview.postMessage({
              type: 'editorContent',
              content
            });
          }
        });
        break;

      case 'inputChanged':
        // Update command suggestions when input changes
        this.updateCommandSuggestions(message.content);
        break;

      case 'showModelSelector':
        console.log('Model selector request received');
        
        try {
          // Call CommandManager's selectModel directly
          if (this._commandManager) {
            Promise.resolve(this._commandManager.selectModel()).catch((error: Error) => {
              console.error('Error executing model selection command:', error);
              vscode.window.showErrorMessage('Unable to execute model selection');
            });
          } else {
            // Fallback: Use VSCode command system
            Promise.resolve(vscode.commands.executeCommand('ape.selectModel')).catch((error: Error) => {
              console.error('Error executing VSCode command:', error);
              vscode.window.showErrorMessage('Unable to execute model selection');
            });
          }
        } catch (error) {
          console.error('Unexpected error:', error);
          vscode.window.showErrorMessage('Unexpected error during model selection');
        }
        break;
        
      case 'toggleSmartPrompting':
        // Toggle Smart Prompting service
        if (this._smartPromptingService) {
          this._smartPromptingService.toggle();
        }
        break;

      case 'setSmartPromptingMode':
        // Set Smart Prompting mode
        if (this._smartPromptingService && message.mode) {
          this._smartPromptingService.setMode(message.mode as SmartPromptingMode);
        }
        break;

      case 'copyCode':
      case 'insertCodeToEditor':
      case 'createFileWithCode':
        // Code block actions handled by CodeService
        break;
    }
  }

  /**
   * Updates command suggestions
   */
  private updateCommandSuggestions(input: string): void {
    if (input.startsWith('/')) {
      // Get slash command suggestions
      const suggestions = this._commandManager.slashCommandManager.getCommandSuggestions(input);

      // Send suggestions to webview
      if (this._view) {
        this._view.webview.postMessage({
          type: 'commandSuggestions',
          suggestions
        });
      }

      // Fire event for VSCode integration
      this._onDidSuggestCommands.fire(suggestions);
    } else if (this._view) {
      // Clear suggestions
      this._view.webview.postMessage({
        type: 'commandSuggestions',
        suggestions: []
      });
    }
  }
  
  /**
   * Inserts a command into the chat input
   */
  private insertCommandToChat(command: string): void {
    if (!this._view) {
      return;
    }
    
    // Send insert command request to webview
    this._view.webview.postMessage({
      type: 'insertCommandToInput',
      command: command
    });
  }
  
  /**
   * Inserts text into the chat input from external sources
   */
  public handleChatInput(text: string): void {
    if (!this._view) {
      return;
    }
    
    // Send insert text request to webview
    this._view.webview.postMessage({
      type: 'insertCommandToInput',
      command: text
    });
  }
  
  /**
   * Adds a direct LLM response to the chat from external sources
   * Used for automated test results or system messages
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
    this.updateChatView();
  }

  /**
   * Gets content from the active editor
   */
  private async getEditorContent(): Promise<string | null> {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const document = editor.document;
      const selection = editor.selection;

      // Return selected text if there's a selection, otherwise entire document
      if (!selection.isEmpty) {
        return document.getText(selection);
      } else {
        return document.getText();
      }
    }

    return null;
  }

  /**
   * Generates the HTML for the main chat interface webview
   */
  private _getHtmlForWebview(webview: vscode.Webview): string {
    console.log('Generating main chat interface HTML for webview');
    
    // Get paths to local resources
    const mainStylesUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._context.extensionUri, 'media', 'chat-ape.css')
    );
    console.log('chat-main.css URI:', mainStylesUri.toString());

    const codiconsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._context.extensionUri, 'media', 'codicon', 'codicon.css')
    );
    console.log('codicon.css URI:', codiconsUri.toString());
    
    const codeBlockStylesUri = CodeService.getCodeBlockStyleUri(webview, this._context);
    console.log('code-block.css URI:', codeBlockStylesUri.toString());

    const nonce = this._getNonce();

    return `<!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource} data:; img-src ${webview.cspSource} https: data:; script-src 'nonce-${nonce}' 'unsafe-inline';">
      <link href="${mainStylesUri}" rel="stylesheet" onload="console.log('chat-main.css loaded')" onerror="console.error('Failed to load chat-main.css')">
      <link href="${codiconsUri}" rel="stylesheet" onload="console.log('codicon.css loaded')" onerror="console.error('Failed to load codicon.css')">
      <link href="${codeBlockStylesUri}" rel="stylesheet" onload="console.log('code-block.css loaded')" onerror="console.error('Failed to load code-block.css')">
      <title>APE Chat</title>
    </head>
    <body>
      <div id="chat-container">
        <div class="chat-header">
        </div>
        <div id="chat-messages"></div>
        <div id="chat-input-container">
          <div id="input-actions">
            <button id="smart-prompting-toggle" title="스마트 프롬프팅 전환" class="input-top-button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 3L14.057 8.17159L19.5 8.88418L15.75 12.8789L16.7135 19L12 16L7.2865 19L8.25 12.8789L4.5 8.88418L9.943 8.17159L12 3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span id="smart-prompting-label">스마트 프롬프팅</span>
            </button>
          </div>
          <div class="input-wrapper">
            <textarea id="chat-input" placeholder="메시지를 입력하세요..." rows="1"></textarea>
            <div id="input-buttons">
              <button id="clear-button" title="대화 지우기" class="action-button">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 6L5 20M5 6L19 20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </button>
              <button id="send-button" title="메시지 전송" class="action-button">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
        <div id="model-indicator">
          <span id="model-name">LLM Model</span>
          <button id="model-selector" title="모델 변경">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 4L19 8V16L12 20L5 16V8L12 4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 12L19 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 12V20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 12L5 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            모델 변경
          </button>
        </div>
        <div id="command-suggestions"></div>
      </div>
      
      <script nonce="${nonce}">
        // Main script
        (function() {
          // Initial data
          const vscode = acquireVsCodeApi();
          const initialMessages = ${JSON.stringify(this._messages)};
          const isStreaming = ${this._isStreaming};
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
                insertCommandFromHelp(message.command);
                break;
              }
                
              case 'updateModelIndicator': {
                // Update model name display
                if (modelIndicator) {
                  modelIndicator.textContent = message.modelName;
                }
                break;
              }

              case 'updateSmartPrompting': {
                // Update Smart Prompting UI state
                if (smartPromptingToggle && smartPromptingLabel) {
                  if (message.enabled) {
                    smartPromptingToggle.classList.add('active');
                    smartPromptingLabel.textContent = '스마트 프롬프팅 켜짐';
                  } else {
                    smartPromptingToggle.classList.remove('active');
                    smartPromptingLabel.textContent = '스마트 프롬프팅';
                  }
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
          let modelIndicator;
          let modelSelector;
          let smartPromptingToggle;
          let smartPromptingLabel;

          // Command suggestions container
          let commandSuggestionsContainer;
          
          // Active suggestion index
          let activeSuggestionIndex = -1;
          let suggestions = [];
          
          // Smart scroll state management
          let isUserScrolled = false;
          let isScrollNearBottom = true;
          const SCROLL_THRESHOLD = 100; // Distance from bottom to consider "near bottom"
        
          // Detect user scroll function
          function detectUserScroll() {
            if (!chatMessages) return;
            
            // Calculate scroll position
            const scrollPosition = chatMessages.scrollTop + chatMessages.clientHeight;
            const scrollThreshold = chatMessages.scrollHeight - SCROLL_THRESHOLD;
            
            // Check if scroll is near bottom
            isScrollNearBottom = scrollPosition >= scrollThreshold;
            
            // Detect user scrolling up
            if (!isScrollNearBottom) {
              isUserScrolled = true;
            }
          }
          
          // Smart scroll function
          function performSmartScroll(forceScroll = false) {
            if (!chatMessages) return;
            
            // Only scroll if user hasn't scrolled up, or a force scroll is needed
            if (forceScroll || !isUserScrolled || isScrollNearBottom) {
              chatMessages.scrollTop = chatMessages.scrollHeight;
              isUserScrolled = false;
            }
          }

          // Helper function to format date for iOS-style timestamp display
          function formatMessageDate(date) {
            if (!date) return '';
            
            // Create a date object
            const messageDate = new Date(date);
            
            // Get current date
            const now = new Date();
            
            // Check if message is from today
            const isToday = messageDate.toDateString() === now.toDateString();
            
            // Format the time (HH:MM)
            const hours = messageDate.getHours().toString().padStart(2, '0');
            const minutes = messageDate.getMinutes().toString().padStart(2, '0');
            const timeStr = \`\${hours}:\${minutes}\`;
            
            // Return appropriate format based on age
            if (isToday) {
              return timeStr;
            } else {
              // For older messages, include date
              const month = messageDate.getMonth() + 1;
              const day = messageDate.getDate();
              return \`\${month}월 \${day}일 \${timeStr}\`;
            }
          }
          
          // Get the timestamp group for a message
          function getTimestampGroup(date) {
            if (!date) return 'unknown';
            
            const messageDate = new Date(date);
            return messageDate.toDateString();
          }
          
          // Add timestamp dividers between message groups
          function addTimestampDividers(messages) {
            const result = [];
            let currentGroup = null;
            
            messages.forEach((message, index) => {
              // Determine the timestamp group for this message
              const group = getTimestampGroup(message.timestamp);
              
              // If group changed, add timestamp divider
              if (group !== currentGroup) {
                currentGroup = group;
                
                // Skip adding timestamp for welcome message
                if (index > 0) {
                  const divider = {
                    id: \`timestamp_\${Date.now()}_\${index}\`,
                    type: 'timestamp',
                    content: formatMessageDate(message.timestamp),
                    timestamp: message.timestamp
                  };
                  result.push(divider);
                }
              }
              
              // Add the actual message
              result.push(message);
            });
            
            return result;
          }
          
          // Message DOM ID converter
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
            
            // Get current messages in the DOM
            const currentMessageIds = Array.from(chatMessages.children)
              .filter(el => el.classList.contains('message'))
              .map(el => el.getAttribute('data-message-id'))
              .filter(id => id);
            
            // Check scroll position
            detectUserScroll();
            
            // Add timestamp dividers
            const messagesWithTimestamps = addTimestampDividers(messages);
            
            // Get DOM elements that should be in the view
            const shouldContainIds = messagesWithTimestamps.map(m => m.id);

            // Add typing indicator if streaming
            if (isStreaming) {
              if (!document.querySelector('.typing-indicator')) {
                const typingIndicator = document.createElement('div');
                typingIndicator.className = 'typing-indicator';
                typingIndicator.innerHTML = \`
                  <span class="typing-dot"></span>
                  <span class="typing-dot"></span>
                  <span class="typing-dot"></span>
                \`;
                
                // Add after last message
                chatMessages.appendChild(typingIndicator);
              }
            } else {
              // Remove typing indicator if present
              const typingIndicator = document.querySelector('.typing-indicator');
              if (typingIndicator) {
                typingIndicator.remove();
              }
            }
            
            // Remove elements that should no longer be in the view
            Array.from(chatMessages.children).forEach(el => {
              const id = el.getAttribute('data-message-id');
              // Keep timestamp dividers
              if (!id || !shouldContainIds.includes(id)) {
                // Don't remove typing indicator
                if (!el.classList.contains('typing-indicator')) {
                  el.remove();
                }
              }
            });
            
            // Clear existing timestamp dividers (we'll recreate them)
            Array.from(chatMessages.querySelectorAll('.timestamp-divider')).forEach(el => {
              el.remove();
            });
            
            // Create mapping for quick element lookup
            const elementMap = {};
            Array.from(chatMessages.children).forEach(el => {
              const id = el.getAttribute('data-message-id');
              if (id) {
                elementMap[id] = el;
              }
            });
            
            // Process messages and add to DOM
            let previousElement = null;
            messagesWithTimestamps.forEach((item, index) => {
              // Handle timestamp dividers
              if (item.type === 'timestamp') {
                const dividerElement = document.createElement('div');
                dividerElement.className = 'timestamp-divider';
                dividerElement.setAttribute('data-message-id', item.id);
                
                dividerElement.innerHTML = \`
                  <span class="timestamp-text">\${item.content}</span>
                \`;
                
                // Insert divider at correct position
                if (previousElement) {
                  previousElement.after(dividerElement);
                } else {
                  chatMessages.appendChild(dividerElement);
                }
                
                previousElement = dividerElement;
                return;
              }
              
              // Handle regular messages
              const message = item;
              const messageId = message.id;
              let messageElement = elementMap[messageId];
              const isLastMessage = message.id === messages[messages.length - 1].id;
              
              // Create new message element if needed
              if (!messageElement) {
                messageElement = document.createElement('div');
                messageElement.className = 'message ' + message.role;
                messageElement.setAttribute('data-message-id', messageId);
                
                const contentElement = document.createElement('div');
                contentElement.className = 'message-content';
                messageElement.appendChild(contentElement);
                
                // Add read/delivered indicator for user messages
                if (message.role === 'user') {
                  const statusElement = document.createElement('div');
                  statusElement.className = 'message-status';
                  messageElement.appendChild(statusElement);
                }
                
                // Insert at correct position
                if (previousElement) {
                  previousElement.after(messageElement);
                } else {
                  chatMessages.appendChild(messageElement);
                }
              }
              
              // Update content if changed
              const contentElement = messageElement.querySelector('.message-content');
              const formattedContent = formatMessageContent(message.content);
              
              if (contentElement.innerHTML !== formattedContent) {
                contentElement.innerHTML = formattedContent;
              }
              
              previousElement = messageElement;
            });
            
            // Smart scroll (force scroll for new messages or when streaming ends)
            performSmartScroll(messages.length !== currentMessageIds.length || !isStreaming);
            
            // Update UI based on streaming state
            if (isStreaming) {
              sendButton.innerHTML = \`<span class="emoji-icon">■</span>\`;
              sendButton.title = '생성 중단';
              chatInput.disabled = true;
            } else {
              sendButton.innerHTML = \`
                <svg class="send-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              \`;
              sendButton.title = '메시지 전송';
              chatInput.disabled = false;
            }
          }
          
          // Format message content with code blocks and other formatting
          function formatMessageContent(content) {
            if (!content) return '';
            
            // If content is already HTML, return as is
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
            
            // Format content
            let formatted = content;
            
            // Replace code blocks with modern UI
            formatted = formatted.replace(/\`\`\`(\\w*)\\n([\\s\\S]*?)\\n\`\`\`/g, function(match, language, code) {
              const codeId = 'code_' + (++codeBlockCounter);
              const escapedCode = escapeHtml(code);
              const lang = language || 'plaintext';
              
              // Generate line numbers
              const lines = code.split('\\n');
              const lineNumbers = lines.map((_, i) => (i + 1)).join('\\n');
              const showLineNumbers = lines.length > 1;
              
              // Create code block HTML
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
            
            // Replace inline code
            formatted = formatted.replace(/\`([^\`]+)\`/g, function(match, code) {
              return '<code class="inline-code">' + escapeHtml(code) + '</code>';
            });
            
            // Replace newlines with <br>
            formatted = formatted.replace(/\\n/g, '<br>');
            
            return formatted;
          }
          
          // HTML escape function
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
          
          // Update command suggestions in popover
          function updateCommandSuggestions(newSuggestions) {
            suggestions = newSuggestions || [];
            activeSuggestionIndex = -1;
            
            // Clear the container
            commandSuggestionsContainer.innerHTML = '';
            
            if (suggestions.length === 0) {
              // Hide the container if no suggestions
              commandSuggestionsContainer.style.display = 'none';
              return;
            }
            
            // Position the suggestions container
            positionCommandSuggestions();
            
            // Show the container
            commandSuggestionsContainer.style.display = 'block';
            
            // Group suggestions by category
            const categorizedSuggestions = {};
            suggestions.forEach(suggestion => {
              // Add category data attribute
              suggestion.categoryAttr = suggestion.category;
              
              if (!categorizedSuggestions[suggestion.category]) {
                categorizedSuggestions[suggestion.category] = [];
              }
              categorizedSuggestions[suggestion.category].push(suggestion);
            });
            
            // Add each category and its suggestions
            Object.keys(categorizedSuggestions).forEach(category => {
              // Create category header
              const categoryHeader = document.createElement('div');
              categoryHeader.className = 'suggestion-category';
              categoryHeader.textContent = getCategoryTitle(category);
              commandSuggestionsContainer.appendChild(categoryHeader);
              
              // Add suggestions for this category
              categorizedSuggestions[category].forEach((suggestion, index) => {
                const suggestionElement = document.createElement('div');
                suggestionElement.className = 'command-suggestion';
                suggestionElement.dataset.category = suggestion.categoryAttr;
                const suggestionIndex = suggestions.findIndex(s => s.label === suggestion.label);
                suggestionElement.dataset.index = String(suggestionIndex);
                
                // Add icon
                const iconElement = document.createElement('span');
                iconElement.className = 'suggestion-icon';
                iconElement.textContent = getSvgIconForCategory(suggestion.category);
                suggestionElement.appendChild(iconElement);
                
                // Add label
                const labelElement = document.createElement('span');
                labelElement.className = 'suggestion-label';
                labelElement.textContent = suggestion.label;
                suggestionElement.appendChild(labelElement);
                
                // Add description
                const descriptionElement = document.createElement('span');
                descriptionElement.className = 'suggestion-description';
                descriptionElement.textContent = suggestion.description;
                suggestionElement.appendChild(descriptionElement);
                
                // Add click handler
                suggestionElement.addEventListener('click', () => {
                  insertSuggestion(suggestion);
                });
                
                // Add mouseover handler
                suggestionElement.addEventListener('mouseover', () => {
                  activeSuggestionIndex = Number(suggestionElement.dataset.index);
                  highlightActiveSuggestion();
                });
                
                commandSuggestionsContainer.appendChild(suggestionElement);
              });
            });
            
            // Scroll to top
            commandSuggestionsContainer.scrollTop = 0;
          }
          
          // Position command suggestions popover
          function positionCommandSuggestions() {
            if (!chatInput || !commandSuggestionsContainer) return;
            
            // Get the input container's position
            const inputContainer = document.getElementById('chat-input-container');
            if (!inputContainer) return;
            
            const inputRect = inputContainer.getBoundingClientRect();
            
            // Set the position relative to the input container
            commandSuggestionsContainer.style.position = 'absolute';
            commandSuggestionsContainer.style.bottom = (inputRect.height + 8) + 'px';
            commandSuggestionsContainer.style.left = '12px';
            commandSuggestionsContainer.style.right = '12px';
            
            // Make sure it's visible
            commandSuggestionsContainer.style.zIndex = '1000';
          }
          
          // Get category title
          function getCategoryTitle(category) {
            switch (category) {
              case 'general': return '일반 명령어';
              case 'git': return 'Git 관련 명령어';
              case 'code': return '코드 관련 명령어';
              case 'utility': return '유틸리티 명령어';
              case 'advanced': return '고급 명령어';
              default: return category;
            }
          }
          
          // Get icon for category
          function getSvgIconForCategory(category) {
            switch (category) {
              case 'general': return '✓';
              case 'git': return '⎇';
              case 'code': return '❮❯';
              case 'utility': return '⚙';
              case 'advanced': return '★';
              default: return '○';
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
            
            // Notify about input change
            notifyInputChanged();
          }
          
          // List of standalone commands (ones that can be auto-executed)
          const standAloneCommands = ['help', 'clear', 'settings', 'model'];
          
          // Check if a command can be executed standalone
          function isStandAloneCommand(commandText) {
            if (!commandText.startsWith('/')) return false;
            
            const commandParts = commandText.substring(1).split(/ +/);
            const baseCommand = commandParts[0];
            
            return standAloneCommands.includes(baseCommand) && commandParts.length === 1;
          }
          
          // Send message function
          function sendMessage() {
            const content = chatInput.value.trim();
            if (content) {
              vscode.postMessage({ type: 'sendMessage', content });
              chatInput.value = '';
              resizeInput();
              
              // Clear suggestions
              updateCommandSuggestions([]);
            }
          }
          
          // Navigate through suggestions
          function navigateSuggestions(direction) {
            if (suggestions.length === 0) return false;
            
            // Set active index to 0 if not set
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
            }
            
            highlightActiveSuggestion();
            return true;
          }
          
          // Notify about input change
          function notifyInputChanged() {
            const inputValue = chatInput.value;
            
            vscode.postMessage({ 
              type: 'inputChanged', 
              content: inputValue 
            });
          }
          
          // Insert command from help panel
          function insertCommandFromHelp(command) {
            // Add slash if not present
            if (!command.startsWith('/')) {
              command = '/' + command;
            }
            
            // Set input value
            chatInput.value = command;
            chatInput.focus();
            
            // Position cursor at end
            chatInput.selectionStart = chatInput.selectionEnd = chatInput.value.length;
            
            // Resize input and notify
            resizeInput();
            notifyInputChanged();
          }
          
          // Set up event listeners for code actions
          function setupCodeBlockListeners() {
            chatMessages.addEventListener('click', event => {
              const target = event.target;
              
              // Check for copy button
              if (target.closest('.copy-button')) {
                const button = target.closest('.copy-button');
                const codeId = button.getAttribute('data-code-id');
                const codeElement = document.getElementById('code-' + codeId);
                
                if (codeElement) {
                  vscode.postMessage({ 
                    type: 'copyCode', 
                    code: codeElement.textContent 
                  });
                  
                  // Show copied feedback
                  button.classList.add('copied');
                  setTimeout(() => {
                    button.classList.remove('copied');
                  }, 2000);
                }
              }
              
              // Check for insert code button
              if (target.closest('.insert-code-button')) {
                const button = target.closest('.insert-code-button');
                const codeId = button.getAttribute('data-code-id');
                const codeElement = document.getElementById('code-' + codeId);
                
                if (codeElement) {
                  vscode.postMessage({ 
                    type: 'insertCodeToEditor', 
                    code: codeElement.textContent 
                  });
                }
              }
              
              // Check for new file button
              if (target.closest('.new-file-button')) {
                const button = target.closest('.new-file-button');
                const codeId = button.getAttribute('data-code-id');
                const codeElement = document.getElementById('code-' + codeId);
                const languageElement = button.closest('.code-block-container').querySelector('.code-block-language');
                
                if (codeElement) {
                  const language = languageElement ? 
                    languageElement.textContent.trim() || 'plaintext' : 
                    'plaintext';
                    
                  vscode.postMessage({ 
                    type: 'createFileWithCode', 
                    code: codeElement.textContent,
                    language: language
                  });
                }
              }
            });
          }
          
          // Initialize UI
          function init() {
            console.log("Initializing iOS-style chat UI");
            
            // Get DOM elements
            chatMessages = document.getElementById('chat-messages');
            chatInput = document.getElementById('chat-input');
            sendButton = document.getElementById('send-button');
            clearButton = document.getElementById('clear-button');
            modelIndicator = document.getElementById('model-name');
            modelSelector = document.getElementById('model-selector');
            commandSuggestionsContainer = document.getElementById('command-suggestions');
            
            // Get Smart Prompting elements
            smartPromptingToggle = document.getElementById('smart-prompting-toggle');
            smartPromptingLabel = document.getElementById('smart-prompting-label');

            // Check if elements are found
            if (!chatMessages || !chatInput || !sendButton || !clearButton ||
                !commandSuggestionsContainer || !smartPromptingToggle || !smartPromptingLabel) {
              console.error("Critical UI elements missing");
              setTimeout(init, 500);
              return;
            }
            
            console.log("UI elements initialized successfully");
            
            // Set up smart scroll detection
            chatMessages.addEventListener('scroll', detectUserScroll);
            
            // Set up event listeners
            sendButton.addEventListener('click', () => {
              if (chatInput.disabled) {
                vscode.postMessage({ type: 'cancelStream' });
              } else {
                sendMessage();
              }
            });
            
            clearButton.addEventListener('click', () => {
              vscode.postMessage({ type: 'clearChat' });
            });
            
            chatInput.addEventListener('input', () => {
              resizeInput();
              notifyInputChanged();
              
              // Directly check for slash commands here as well
              if (chatInput.value.startsWith('/')) {
                console.log('Slash command detected:', chatInput.value);
              }
            });
            
            chatInput.addEventListener('keydown', (e) => {
              if (suggestions.length > 0) {
                if (e.key === 'ArrowUp') {
                  if (navigateSuggestions('up')) {
                    e.preventDefault();
                    return;
                  }
                } else if (e.key === 'ArrowDown') {
                  if (navigateSuggestions('down')) {
                    e.preventDefault();
                    return;
                  }
                } else if (e.key === 'Enter' && activeSuggestionIndex >= 0) {
                  if (activeSuggestionIndex >= 0 && activeSuggestionIndex < suggestions.length) {
                    const suggestion = suggestions[activeSuggestionIndex];
                    insertSuggestion(suggestion);
                    
                    if (isStandAloneCommand(suggestion.insertText)) {
                      e.preventDefault();
                      sendMessage();
                    }
                    return;
                  }
                } else if (e.key === 'Escape') {
                  updateCommandSuggestions([]);
                  e.preventDefault();
                  return;
                }
              }
              
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              } else if (e.key === '/' && chatInput.value === '') {
                // Special handling for slash key
                setTimeout(() => {
                  notifyInputChanged();
                  console.log('Slash key pressed on empty input');
                }, 10);
              }
            });
            
            modelSelector.addEventListener('click', () => {
              vscode.postMessage({ type: 'showModelSelector' });
            });

            // Smart Prompting toggle click handler
            smartPromptingToggle.addEventListener('click', () => {
              vscode.postMessage({ type: 'toggleSmartPrompting' });
            });
            
            // Set up code block action listeners
            setupCodeBlockListeners();
            
            // Initialize with stored messages
            const state = vscode.getState();
            if (state && state.messages) {
              updateMessages(state.messages, isStreaming);
            } else {
              updateMessages(initialMessages, isStreaming);
            }
            
            // Set initial input height
            resizeInput();
            
            // Set focus to input
            setTimeout(() => {
              if (chatInput) {
                chatInput.focus();
              }
            }, 300);
          }
          
          // Start the app when document is ready
          if (document.readyState === 'complete' || document.readyState === 'interactive') {
            console.log('Document already ready, initializing chat view immediately');
            setTimeout(init, 0);
          } else {
            console.log('Waiting for DOMContentLoaded before initializing chat view');
            document.addEventListener('DOMContentLoaded', () => {
              console.log('DOMContentLoaded fired, initializing chat view');
              init();
            });
          }
        })();
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
  
  /**
   * Updates the Smart Prompting UI with the current state
   * @param state The current SmartPromptingState
   */
  public _updateSmartPromptingUI(state: SmartPromptingState): void {
    if (!this._view) {
      return;
    }

    // Send update message to webview
    this._view.webview.postMessage({
      type: 'updateSmartPrompting',
      enabled: state.enabled,
      mode: state.mode
    });
  }
  
  /**
   * Open attached file - required for interface compatibility
   * No-op in this implementation as we don't need this feature for the iPhone style
   */
  public _openAttachedFile(filePath: string): Promise<void> {
    return Promise.resolve();
  }
}