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
exports.MainChatViewProvider = void 0;
const vscode = __importStar(require("vscode"));
const chat_1 = require("../types/chat");
const codeService_1 = require("./chat/codeService");
const welcomeView_1 = require("./welcomeView");
/**
 * MainChatViewProvider manages the primary chat interface WebView
 * with a clean, modern, and user-friendly design
 */
class MainChatViewProvider {
    _context;
    _llmService;
    _memoryService;
    _commandManager;
    _modelManager;
    static viewType = 'apeChat';
    _view;
    _messages = [];
    _isStreaming = false;
    _currentStreamMessageId = null;
    _streamUpdateTimeout = null;
    _modelChangeListener;
    // Command suggestion event
    _onDidSuggestCommands = new vscode.EventEmitter();
    onDidSuggestCommands = this._onDidSuggestCommands.event;
    constructor(_context, _llmService, _memoryService, _commandManager, _modelManager) {
        this._context = _context;
        this._llmService = _llmService;
        this._memoryService = _memoryService;
        this._commandManager = _commandManager;
        this._modelManager = _modelManager;
    }
    /**
     * Converts a URI to a webview-compatible URI
     */
    getWebviewResource(uri) {
        if (!this._view) {
            return null;
        }
        return this._view.webview.asWebviewUri(uri);
    }
    /**
     * Called when the view is first created or becomes visible again
     */
    async resolveWebviewView(webviewView, _context, _token) {
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
            await codeService_1.CodeService.registerHandlers(this._context, webviewView.webview);
        }
        catch (error) {
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
     * (Minimal UI version - only logs the model change)
     */
    updateModelIndicator() {
        if (!this._view) {
            return;
        }
        try {
            // Get the current model for logging only
            let currentModel;
            if (this._modelManager) {
                currentModel = this._modelManager.getActiveModel();
                console.log('Model changed to:', currentModel);
            }
            else {
                currentModel = this._llmService.getActiveModel();
                console.log('Model changed to:', currentModel);
            }
            // Just log the change - UI element has been removed for minimal interface
        }
        catch (error) {
            console.error('Error logging model update:', error);
        }
    }
    /**
     * Converts model ID to a user-friendly display name
     * @deprecated Use the ModelManager.getModelDisplayName method instead
     */
    getModelDisplayName(modelId) {
        return this._llmService.getModelDisplayName(modelId);
    }
    /**
     * Sends a user message to the LLM and processes the response
     */
    async sendMessage(content) {
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
        // Create and add user message
        const userMessage = {
            id: `msg_${Date.now()}`,
            role: chat_1.MessageRole.User,
            content,
            timestamp: new Date()
        };
        this._messages.push(userMessage);
        this.updateChatView();
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
            this.updateChatView();
            // Filter messages before sending to LLM
            const filteredMessages = this._messages.filter(message => {
                // Remove UI-only messages by checking metadata flag
                if (message.metadata?.uiOnly === true) {
                    console.log(`Filtering out UI-only message: ${message.id}`);
                    return false;
                }
                // As a fallback, also filter by content for older message formats
                if (message.role === chat_1.MessageRole.System) {
                    const content = message.content || '';
                    if (content.includes('<div class="welcome-container"') ||
                        (content.trim().startsWith('<') && content.includes('</div>'))) {
                        console.log(`Filtering out HTML system message: ${message.id}`);
                        return false;
                    }
                }
                // Keep all other messages
                return true;
            });
            console.log(`Filtered out ${this._messages.length - filteredMessages.length} UI-only messages before LLM request`);
            // Start streaming response from LLM with filtered messages
            await this._llmService.streamResponse(filteredMessages, (chunk, done) => {
                // Update the assistant message with the new chunk only if it has content
                const assistantMessage = this._messages.find(m => m.id === this._currentStreamMessageId);
                if (assistantMessage) {
                    // Only append non-empty chunks
                    if (chunk && chunk.trim()) {
                        assistantMessage.content += chunk;
                        // Debounce updates for efficiency
                        if (!this._streamUpdateTimeout) {
                            this._streamUpdateTimeout = setTimeout(() => {
                                this.updateChatView();
                                this._streamUpdateTimeout = null;
                            }, 30); // 30ms debouncing
                        }
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
                        this.saveMessages();
                        this.updateChatView();
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
            this.updateChatView();
        }
    }
    /**
     * Clears all messages from the chat and shows welcome screen
     */
    clearChat() {
        console.log('Clearing chat - creating new welcome message');
        // Clear messages from memory service
        this._memoryService.clearMessages();
        try {
            // Get HTML content for welcome message
            const welcomeHTML = welcomeView_1.WelcomeViewProvider.getWelcomeMessageHTML();
            console.log('WelcomeViewProvider used - welcome HTML generated, length:', welcomeHTML.length);
            // Create welcome messages
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
                    content: '안녕하세요! 무엇을 도와드릴까요?',
                    timestamp: new Date()
                }
            ];
            console.log('Welcome messages added - IDs:', welcomeId, assistantId);
            // Update UI immediately
            this.updateChatView();
        }
        catch (error) {
            console.error('Error creating welcome message:', error);
            this._messages = [{
                    id: `error_${Date.now()}`,
                    role: chat_1.MessageRole.System,
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
    async loadMessages() {
        console.log('Loading messages - checking for existing messages');
        const result = await this._memoryService.getMessages();
        if (result.success && result.data && result.data.length > 0) {
            console.log(`Loaded ${result.data.length} saved messages`);
            this._messages = result.data;
        }
        else {
            console.log('No saved messages found, adding welcome message');
            try {
                // Get HTML content for welcome message with error handling
                let welcomeHTML = '';
                try {
                    welcomeHTML = welcomeView_1.WelcomeViewProvider.getWelcomeMessageHTML();
                    console.log('WelcomeViewProvider used - welcome HTML generated');
                }
                catch (welcomeError) {
                    console.error('Error getting welcome HTML from provider:', welcomeError);
                    welcomeHTML = '<div class="welcome-container minimal"><h1>Welcome to APE</h1></div>';
                }
                // Create UI-only welcome message and conversation starter
                const welcomeId = `welcome_ui_${Date.now()}`;
                const assistantId = `assistant_welcome_${Date.now()}`;
                // Ensure welcome HTML is not empty
                if (!welcomeHTML || welcomeHTML.trim() === '') {
                    welcomeHTML = '<div class="welcome-container minimal"><h1>Welcome to APE</h1></div>';
                    console.warn('Empty welcome HTML detected, using fallback');
                }
                this._messages = [
                    // UI-only message with metadata flag
                    {
                        id: welcomeId,
                        role: chat_1.MessageRole.System,
                        content: welcomeHTML,
                        timestamp: new Date(),
                        metadata: {
                            uiOnly: true, // Flag to indicate this shouldn't be sent to LLM
                            type: 'welcome' // Mark this as a welcome message
                        }
                    },
                    // Actual assistant greeting message
                    {
                        id: assistantId,
                        role: chat_1.MessageRole.Assistant,
                        content: 'Welcome to APE. How can I assist with your development today?',
                        timestamp: new Date()
                    }
                ];
                console.log('Welcome messages added - IDs:', welcomeId, assistantId);
            }
            catch (error) {
                console.error('Error creating welcome message:', error);
                this._messages = [{
                        id: `error_${Date.now()}`,
                        role: chat_1.MessageRole.System,
                        content: '웰컴 화면을 불러오는 중 오류가 발생했습니다.',
                        timestamp: new Date()
                    }];
            }
        }
    }
    /**
     * Saves messages to memory service
     */
    async saveMessages() {
        for (const message of this._messages) {
            await this._memoryService.addMessage(message);
        }
    }
    /**
     * Updates the chat view with the current messages
     */
    updateChatView() {
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
    _handleMessage(message) {
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
                        Promise.resolve(this._commandManager.selectModel()).catch((error) => {
                            console.error('Error executing model selection command:', error);
                            vscode.window.showErrorMessage('Unable to execute model selection');
                        });
                    }
                    else {
                        // Fallback: Use VSCode command system
                        Promise.resolve(vscode.commands.executeCommand('ape.selectModel')).catch((error) => {
                            console.error('Error executing VSCode command:', error);
                            vscode.window.showErrorMessage('Unable to execute model selection');
                        });
                    }
                }
                catch (error) {
                    console.error('Unexpected error:', error);
                    vscode.window.showErrorMessage('Unexpected error during model selection');
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
    updateCommandSuggestions(input) {
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
        }
        else if (this._view) {
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
    insertCommandToChat(command) {
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
    handleChatInput(text) {
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
    async sendLlmResponse(message) {
        if (!this._view) {
            vscode.window.showErrorMessage('APE Chat view is not available');
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
        this.updateChatView();
    }
    /**
     * Gets content from the active editor
     */
    async getEditorContent() {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            const selection = editor.selection;
            // Return selected text if there's a selection, otherwise entire document
            if (!selection.isEmpty) {
                return document.getText(selection);
            }
            else {
                return document.getText();
            }
        }
        return null;
    }
    /**
     * Generates the HTML for the main chat interface webview
     */
    _getHtmlForWebview(webview) {
        console.log('Generating main chat interface HTML for webview');
        // Get paths to local resources
        const mainStylesUri = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'media', 'chat-ape.css'));
        console.log('chat-main.css URI:', mainStylesUri.toString());
        const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'media', 'codicon', 'codicon.css'));
        console.log('codicon.css URI:', codiconsUri.toString());
        const codeBlockStylesUri = codeService_1.CodeService.getCodeBlockStyleUri(webview, this._context);
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
      <style>
        /* Additional minimal styling */
        #chat-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          padding: 0;
          margin: 0;
        }

        #chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }

        #chat-input-container {
          padding: 12px;
          border-top: 1px solid var(--vscode-input-border);
          background: var(--vscode-editor-background);
        }

        #chat-input {
          width: 100%;
          min-height: 40px;
          max-height: 120px;
          padding: 10px 12px;
          resize: none;
          border-radius: 8px;
          font-size: 14px;
        }

        #input-buttons {
          display: flex;
          margin-top: 8px;
          justify-content: flex-end;
        }

        #clear-button, #send-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          margin-left: 6px;
        }

        #command-suggestions {
          background-color: var(--vscode-editor-background);
          border: 1px solid var(--vscode-input-border);
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          max-height: 300px;
          overflow-y: auto;
          z-index: 1000;
        }
      </style>
    </head>
    <body>
      <div id="chat-container">
        <div id="chat-messages"></div>
        <div id="chat-input-container">
          <textarea id="chat-input" placeholder="메시지 입력..." rows="1"></textarea>
          <div id="input-buttons">
            <button id="clear-button" title="대화 지우기">
              <span class="emoji-icon">ⓧ</span>
            </button>
            <button id="send-button" title="메시지 전송">
              <svg class="send-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
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
                // Model indicator removed for minimal UI
                console.log('Model updated:', message.modelName);
                break;
              }
            }
          });
          
          // DOM Elements - initialize as variables first, we'll get them in init()
          let chatMessages;
          let chatInput;
          let sendButton;
          let clearButton;

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
            commandSuggestionsContainer = document.getElementById('command-suggestions');

            // Check if elements are found
            if (!chatMessages || !chatInput || !sendButton || !clearButton || !commandSuggestionsContainer) {
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
            
            // Model selector removed for minimal UI
            
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
    _getNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
    /**
     * Smart Prompting UI update - required for interface compatibility
     * No-op in this implementation as we don't need this feature for the iPhone style
     */
    _updateSmartPromptingUI(enabled) {
        // No-op for this implementation
    }
    /**
     * Open attached file - required for interface compatibility
     * No-op in this implementation as we don't need this feature for the iPhone style
     */
    _openAttachedFile(filePath) {
        return Promise.resolve();
    }
}
exports.MainChatViewProvider = MainChatViewProvider;
//# sourceMappingURL=mainChatViewProvider.js.map