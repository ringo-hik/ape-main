import * as vscode from 'vscode';
import { LLMService } from '../core/llm/llmService';
import { MemoryService } from '../core/memory/memoryService';
import { CommandManager } from '../core/commands/commandManager';
import { CommandSuggestion } from '../core/commands/slashCommand';
import { ModelManager } from '../core/llm/modelManager';
/**
 * ChatViewProvider manages the WebView that displays the luxurious chat interface
 */
export declare class ChatViewProvider implements vscode.WebviewViewProvider {
    private readonly _context;
    private readonly _llmService;
    private readonly _memoryService;
    private readonly _commandManager;
    private readonly _modelManager?;
    static readonly viewType = "apeChat";
    private _view?;
    private _messages;
    private _isStreaming;
    private _currentStreamMessageId;
    private _streamUpdateTimeout;
    private _modelChangeListener?;
    private _smartPromptingService?;
    private _smartPromptingStateListener?;
    private readonly _onDidSuggestCommands;
    readonly onDidSuggestCommands: vscode.Event<CommandSuggestion[]>;
    constructor(_context: vscode.ExtensionContext, _llmService: LLMService, _memoryService: MemoryService, _commandManager: CommandManager, _modelManager?: ModelManager | undefined);
    /**
     * 웹뷰에서 사용할 수 있는 리소스 URI로 변환
     */
    getWebviewResource(uri: vscode.Uri): vscode.Uri | null;
    /**
     * Called when the view is first created or becomes visible again
     */
    resolveWebviewView(webviewView: vscode.WebviewView, _context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken): Promise<void>;
    /**
     * Updates the model indicator UI with the current model
     */
    updateModelIndicator(): void;
    /**
     * 스마트 프롬프팅 UI 업데이트
     */
    private _updateSmartPromptingUI;
    /**
     * Sends a user message to the LLM and processes the response
     */
    sendMessage(content: string): Promise<void>;
    /**
     * Clears all messages from the chat and shows welcome screen
     */
    clearChat(): void;
    /**
     * Loads messages from memory service
     */
    private _loadMessages;
    /**
     * Saves messages to memory service
     */
    private _saveMessages;
    /**
     * Updates the chat view with the current messages
     */
    private _updateChatView;
    /**
     * Handles messages sent from the webview
     */
    private _handleMessage;
    /**
     * 명령어 제안 업데이트
     */
    private _updateCommandSuggestions;
    /**
     * 도움말에서 명령어를 채팅창에 입력
     */
    private _insertCommandToChat;
    /**
     * 외부에서 채팅 입력창에 텍스트 삽입
     */
    handleChatInput(text: string): void;
    /**
     * 외부에서 직접 LLM 응답을 채팅 창에 추가
     */
    sendLlmResponse(message: {
        role: string;
        content: string;
    }): Promise<void>;
    /**
     * Opens an attached file in the editor
     */
    private _openAttachedFile;
    /**
     * 메시지 컨텍스트 포함/제외 토글
     */
    private _toggleMessageContext;
    /**
     * Gets the current editor content
     */
    private _getEditorContent;
    /**
     * 명령어 제안 스크립트 가져오기
     * 고급스러운 슬래시 명령어 자동완성 UI를 위한 스크립트
     */
    private _getCommandSuggestionScript;
    /**
     * 세련된 메시지 처리 및 포맷팅 스크립트
     */
    private _getChatScript;
    /**
     * Generates the HTML for the webview
     */
    private _getHtmlForWebview;
    /**
     * Generates a random nonce for CSP
     */
    private _getNonce;
}
