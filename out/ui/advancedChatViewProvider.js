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
exports.AdvancedChatViewProvider = void 0;
const vscode = __importStar(require("vscode"));
const chat_1 = require("../types/chat");
const codeService_1 = require("./chat/codeService");
const smartPromptingService_1 = require("../core/services/smartPromptingService");
const welcomeView_1 = require("./welcomeView");
const baseWebViewProvider_1 = require("./common/baseWebViewProvider");
const cspProfiles_1 = require("../core/utils/cspProfiles");
/**
 * 고급 채팅 뷰 제공자
 * BaseWebViewProvider를 확장하여 CSP 관련 문제 해결 및 고급 기능 제공
 */
class AdvancedChatViewProvider extends baseWebViewProvider_1.BaseWebViewProvider {
    _llmService;
    _memoryService;
    _commandManager;
    _modelManager;
    static viewType = 'apeChat';
    _messages = [];
    _isStreaming = false;
    _currentStreamMessageId = null;
    _streamUpdateTimeout = null;
    _streamUpdateInterval = 100; // 100ms 간격으로 스트리밍 업데이트 (깜빡임 줄이기)
    _modelChangeListener;
    _smartPromptingService;
    _smartPromptingStateListener;
    // BaseWebViewProvider와 호환되도록 _view 타입 선언 제거
    // 명령어 제안 이벤트
    _onDidSuggestCommands = new vscode.EventEmitter();
    onDidSuggestCommands = this._onDidSuggestCommands.event;
    constructor(context, _llmService, _memoryService, _commandManager, _modelManager) {
        super(context);
        this._llmService = _llmService;
        this._memoryService = _memoryService;
        this._commandManager = _commandManager;
        this._modelManager = _modelManager;
        // SmartPromptingService 생성
        this._smartPromptingService = new smartPromptingService_1.SmartPromptingService(context, _llmService);
        // 상태 변경 리스너 등록
        this._smartPromptingStateListener = this._smartPromptingService.onStateChanged(state => {
            this._updateSmartPromptingUI(state);
        });
        // 컨텍스트 서브스크립션에 리스너 등록
        this._context.subscriptions.push(this._smartPromptingStateListener);
    }
    /**
     * Called when the view is first created or becomes visible again
     */
    async resolveWebviewView(webviewView, _context, _token) {
        // BaseWebViewProvider의 _view에 할당
        this._view = webviewView;
        if (this._view && this._view.webview) {
            this._view.webview.options = {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(this._context.extensionUri, 'media'),
                    vscode.Uri.joinPath(this._context.extensionUri, 'out'),
                    vscode.Uri.joinPath(this._context.extensionUri, 'src')
                ]
            };
        }
        // Load previous messages from memory service
        await this._loadMessages();
        // Set initial HTML content
        if (webviewView.webview) {
            webviewView.webview.html = this.getWebviewHtml(webviewView.webview);
        }
        // Handle messages from the webview
        if (webviewView.webview) {
            webviewView.webview.onDidReceiveMessage(this._handleMessage.bind(this));
            // Register code service handlers
            try {
                await codeService_1.CodeService.registerHandlers(this._context, webviewView.webview);
            }
            catch (error) {
                console.log('Code service handlers may already be registered:', error);
            }
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
     * BaseWebViewProvider에서 요구하는 CSP 정책 구현
     */
    getContentSecurityPolicy(webview, nonce) {
        return cspProfiles_1.CSPProfiles.getChatView(webview, nonce);
    }
    /**
     * BaseWebViewProvider에서 요구하는 제목 구현
     */
    getTitle() {
        return 'APE Chat';
    }
    /**
     * 언어 설정 재정의 (옵션)
     */
    getLanguage() {
        return 'ko';
    }
    /**
     * BaseWebViewProvider에서 요구하는 스타일시트 목록 구현
     */
    getStylesheets(webview) {
        return [
            webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'media', 'chat-ape.css')),
            webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'media', 'codicon', 'codicon.css')),
            codeService_1.CodeService.getCodeBlockStyleUri(webview, this._context)
        ];
    }
    /**
     * BaseWebViewProvider에서 요구하는 스크립트 목록 구현
     */
    getScripts(webview) {
        return [
            webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'media', 'js', 'common', 'vscode-utils.js')),
            webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'media', 'js', 'views', 'chatView.js'))
        ];
    }
    /**
     * BaseWebViewProvider에서 요구하는 바디 콘텐츠 구현
     */
    getBodyContent() {
        return `
    <div id="chat-container">
      <div id="chat-messages"></div>
      <div id="chat-input-container">
        <div id="input-wrapper">
          <textarea id="chat-input" placeholder="Type a message or / for commands..." rows="1"></textarea>
          <div id="input-buttons">
            <button id="ape-mascot-button" title="APE MODE" class="input-action-button">
              <img src="${this.getWebviewResource(vscode.Uri.joinPath(this._context.extensionUri, 'media', 'icons', 'mascot.svg'))}" width="18" height="18" />
            </button>
            <button id="attach-button" title="Attach File" class="input-action-button">
              <span class="emoji-icon">◈</span>
            </button>
            <button id="clear-button" title="Clear Chat" class="input-action-button">
              <span class="emoji-icon">⌫</span>
            </button>
            <button id="send-button" title="Send Message">
              <span class="emoji-icon">↑</span>
            </button>
          </div>
        </div>
      </div>
      <div id="model-indicator">
        <span id="model-name">Loading model...</span>
        <button id="model-selector" title="Change Model">
          <span class="emoji-icon">◎</span> Change Model
        </button>
      </div>
      <div id="smart-prompting-container">
        <button id="smart-prompting-toggle" class="toggle-button">
          <div class="toggle-indicator"></div>
        </button>
        <span id="smart-prompting-label">Smart Prompting</span>
      </div>
    </div>
    `;
    }
    /**
     * Updates the model indicator UI with the current model
     */
    updateModelIndicator() {
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
            }
            else {
                currentModel = this._llmService.getActiveModel();
                displayName = this._llmService.getModelDisplayName(currentModel);
            }
            // Send message to webview to update model name display
            this.sendMessageToWebview({
                type: 'updateModelIndicator',
                modelName: displayName
            });
        }
        catch (error) {
            console.error('모델 인디케이터 업데이트 중 오류:', error);
        }
    }
    /**
     * 스마트 프롬프팅 UI 업데이트
     */
    _updateSmartPromptingUI(state) {
        if (!this._view) {
            return;
        }
        // 웹뷰에 상태 업데이트 메시지 전송
        this.sendMessageToWebview({
            type: 'updateSmartPrompting',
            enabled: state.enabled,
            mode: state.mode
        });
    }
    /**
     * Sends a user message to the LLM and processes the response
     */
    async sendMessage(content) {
        if (!this._view) {
            vscode.window.showErrorMessage('Chat view is not available');
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
        const userMessage = {
            id: `msg_${Date.now()}`,
            role: chat_1.MessageRole.User,
            content: processedContent,
            timestamp: new Date()
        };
        this._messages.push(userMessage);
        this._updateChatView();
        try {
            // Create assistant message placeholder for streaming
            const assistantMessageId = `msg_${Date.now() + 1}`;
            const assistantMessage = {
                id: assistantMessageId,
                role: chat_1.MessageRole.Assistant,
                content: '',
                timestamp: new Date()
            };
            this._messages.push(assistantMessage);
            this._currentStreamMessageId = assistantMessageId;
            this._isStreaming = true;
            this._updateChatView();
            // Start streaming response from LLM
            await this._llmService.streamResponse(this._messages, (chunk, done) => {
                // Update the assistant message with the new chunk
                const assistantMessage = this._messages.find(m => m.id === this._currentStreamMessageId);
                if (assistantMessage) {
                    assistantMessage.content += chunk;
                    // Debounce updates for efficiency with increased interval to reduce flickering
                    if (!this._streamUpdateTimeout) {
                        this._streamUpdateTimeout = setTimeout(() => {
                            this._updateChatView();
                            this._streamUpdateTimeout = null;
                        }, this._streamUpdateInterval); // 스트리밍 업데이트 간격 사용
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
                        // Save messages to memory
                        this._saveMessages();
                        this._updateChatView();
                    }
                }
            });
        }
        catch (error) {
            this._isStreaming = false;
            this._currentStreamMessageId = null;
            // Cancel any pending timeout
            if (this._streamUpdateTimeout) {
                clearTimeout(this._streamUpdateTimeout);
                this._streamUpdateTimeout = null;
            }
            // Add error message
            const errorMessage = {
                id: `msg_error_${Date.now()}`,
                role: chat_1.MessageRole.System,
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
    clearChat() {
        console.log('채팅 초기화 중 - 새 웰컴 메시지 생성');
        // 메모리 서비스에서 메시지 삭제
        this._memoryService.clearMessages();
        try {
            // 새로운 웰컴 메시지 HTML 콘텐츠 가져오기
            const welcomeHTML = welcomeView_1.WelcomeViewProvider.getWelcomeMessageHTML();
            // 새로운 웰컴뷰 사용
            const welcomeId = `welcome_${Date.now()}`;
            const assistantId = `assistant_welcome_${Date.now()}`;
            this._messages = [
                {
                    id: welcomeId,
                    role: chat_1.MessageRole.System,
                    content: welcomeHTML,
                    timestamp: new Date()
                },
                {
                    id: assistantId,
                    role: chat_1.MessageRole.Assistant,
                    content: 'How can I assist with your development today?',
                    timestamp: new Date()
                }
            ];
            // 즉시 UI 업데이트
            this._updateChatView();
        }
        catch (error) {
            console.error('웰컴 메시지 생성 중 오류:', error);
            this._messages = [{
                    id: `error_${Date.now()}`,
                    role: chat_1.MessageRole.System,
                    content: 'Error loading welcome screen.',
                    timestamp: new Date()
                }];
            this._updateChatView();
        }
    }
    /**
     * Loads messages from memory service
     */
    async _loadMessages() {
        console.log('메시지 로드 중 - 기존 메시지 확인');
        const result = await this._memoryService.getMessages();
        if (result.success && result.data && result.data.length > 0) {
            console.log(`${result.data.length}개의 저장된 메시지를 로드함`);
            this._messages = result.data;
        }
        else {
            console.log('저장된 메시지 없음, 웰컴 메시지 추가');
            try {
                // 새로운 웰컴 메시지 HTML 콘텐츠 가져오기
                const welcomeHTML = welcomeView_1.WelcomeViewProvider.getWelcomeMessageHTML();
                // 메시지가 없으면 웰컴 메시지 추가
                const welcomeId = `welcome_${Date.now()}`;
                const assistantId = `assistant_welcome_${Date.now()}`;
                this._messages = [
                    {
                        id: welcomeId,
                        role: chat_1.MessageRole.System,
                        content: welcomeHTML,
                        timestamp: new Date()
                    },
                    {
                        id: assistantId,
                        role: chat_1.MessageRole.Assistant,
                        content: 'How can I assist with your development today?',
                        timestamp: new Date()
                    }
                ];
            }
            catch (error) {
                console.error('웰컴 메시지 생성 중 오류:', error);
                this._messages = [{
                        id: `error_${Date.now()}`,
                        role: chat_1.MessageRole.System,
                        content: 'Error loading welcome screen.',
                        timestamp: new Date()
                    }];
            }
        }
    }
    /**
     * Saves messages to memory service
     */
    async _saveMessages() {
        for (const message of this._messages) {
            await this._memoryService.addMessage(message);
        }
    }
    /**
     * Updates the chat view with the current messages
     */
    _updateChatView() {
        if (this._view) {
            this.sendMessageToWebview({
                type: 'updateMessages',
                messages: this._messages,
                isStreaming: this._isStreaming
            });
        }
    }
    /**
     * Handles messages sent from the webview
     */
    _handleMessage(message) {
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
                        this.sendMessageToWebview({
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
                    Promise.resolve(this._commandManager.selectModel()).catch((error) => {
                        console.error('모델 선택 명령 실행 오류:', error);
                        vscode.window.showErrorMessage('모델 선택 기능을 실행할 수 없습니다');
                    });
                }
                else {
                    Promise.resolve(vscode.commands.executeCommand('ape.selectModel')).catch((error) => {
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
            case 'advancedSearch':
                // 고급 검색 기능
                vscode.window.showInformationMessage('Advanced search feature activated');
                // 여기에 고급 검색 기능 구현
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
    _updateCommandSuggestions(input) {
        if (input.startsWith('/')) {
            // 슬래시 명령어 제안 가져오기
            const suggestions = this._commandManager.slashCommandManager.getCommandSuggestions(input);
            // 웹뷰에 제안 전송
            if (this._view) {
                this.sendMessageToWebview({
                    type: 'commandSuggestions',
                    suggestions
                });
            }
            // 이벤트 발생 (VSCode 통합용)
            this._onDidSuggestCommands.fire(suggestions);
        }
        else if (this._view) {
            // 제안 초기화
            this.sendMessageToWebview({
                type: 'commandSuggestions',
                suggestions: []
            });
        }
    }
    /**
     * 도움말에서 명령어를 채팅창에 입력
     */
    _insertCommandToChat(command) {
        if (!this._view) {
            return;
        }
        // 채팅창에 명령어 입력 요청
        this.sendMessageToWebview({
            type: 'insertCommandToInput',
            command: command
        });
    }
    /**
     * 외부에서 채팅 입력창에 텍스트 삽입
     */
    handleChatInput(text) {
        if (!this._view) {
            return;
        }
        // 채팅창에 텍스트 입력 요청
        this.sendMessageToWebview({
            type: 'insertCommandToInput',
            command: text
        });
    }
    /**
     * 외부에서 직접 LLM 응답을 채팅 창에 추가
     */
    async sendLlmResponse(message) {
        if (!this._view) {
            vscode.window.showErrorMessage('Chat view is not available');
            return;
        }
        // Create message object
        const newMessage = {
            id: `msg_${Date.now()}`,
            role: message.role,
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
    async _openAttachedFile(fileName) {
        try {
            let targetFile;
            if (vscode.workspace.workspaceFolders?.length) {
                const workspaceFolder = vscode.workspace.workspaceFolders[0];
                const searchPattern = new vscode.RelativePattern(workspaceFolder, `**/${fileName}`);
                const files = await vscode.workspace.findFiles(searchPattern, null, 1);
                if (files.length > 0) {
                    targetFile = files[0];
                }
            }
            if (targetFile) {
                const document = await vscode.workspace.openTextDocument(targetFile);
                await vscode.window.showTextDocument(document);
            }
            else {
                vscode.window.showErrorMessage(`File not found: ${fileName}`);
            }
        }
        catch (error) {
            console.error('Error opening file:', error);
            vscode.window.showErrorMessage(`Failed to open file: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Gets the current editor content
     */
    async _getEditorContent() {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            const selection = editor.selection;
            // If there's a selection, return that, otherwise return the full document
            if (!selection.isEmpty) {
                return document.getText(selection);
            }
            else {
                return document.getText();
            }
        }
        return null;
    }
}
exports.AdvancedChatViewProvider = AdvancedChatViewProvider;
//# sourceMappingURL=advancedChatViewProvider.js.map