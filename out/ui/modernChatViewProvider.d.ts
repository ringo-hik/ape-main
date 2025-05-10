import * as vscode from 'vscode';
import { LLMService } from '../core/llm/llmService';
import { MemoryService } from '../core/memory/memoryService';
import { CommandManager } from '../core/commands/commandManager';
import { CommandSuggestion } from '../core/commands/slashCommand';
import { ModelManager } from '../core/llm/modelManager';
import { BaseWebViewProvider } from './common/baseWebViewProvider';
/**
 * 현대적인 채팅 뷰 제공자
 * BaseWebViewProvider를 확장하여 CSP 관련 문제 해결
 */
export declare class ModernChatViewProvider extends BaseWebViewProvider implements vscode.WebviewViewProvider {
    private readonly _llmService;
    private readonly _memoryService;
    private readonly _commandManager;
    private readonly _modelManager?;
    static readonly viewType = "apeChat";
    private _messages;
    private _isStreaming;
    private _currentStreamMessageId;
    private _streamUpdateTimeout;
    private _modelChangeListener?;
    private _smartPromptingService?;
    private _smartPromptingStateListener?;
    private _view?;
    private readonly _onDidSuggestCommands;
    readonly onDidSuggestCommands: vscode.Event<CommandSuggestion[]>;
    constructor(context: vscode.ExtensionContext, _llmService: LLMService, _memoryService: MemoryService, _commandManager: CommandManager, _modelManager?: ModelManager | undefined);
    /**
     * Called when the view is first created or becomes visible again
     */
    resolveWebviewView(webviewView: vscode.WebviewView, _context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken): Promise<void>;
    /**
     * BaseWebViewProvider에서 요구하는 CSP 정책 구현
     */
    protected getContentSecurityPolicy(webview: vscode.Webview, nonce: string): string;
    /**
     * BaseWebViewProvider에서 요구하는 제목 구현
     */
    protected getTitle(): string;
    /**
     * 언어 설정 재정의 (옵션)
     */
    protected getLanguage(): string;
    /**
     * BaseWebViewProvider에서 요구하는 스타일시트 목록 구현
     */
    protected getStylesheets(webview: vscode.Webview): vscode.Uri[];
    /**
     * BaseWebViewProvider에서 요구하는 스크립트 목록 구현
     */
    protected getScripts(webview: vscode.Webview): vscode.Uri[];
    /**
     * BaseWebViewProvider에서 요구하는 바디 콘텐츠 구현
     */
    protected getBodyContent(): string;
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
     * Gets the current editor content
     */
    private _getEditorContent;
}
