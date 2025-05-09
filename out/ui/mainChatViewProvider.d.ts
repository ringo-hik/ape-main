import * as vscode from 'vscode';
import { LLMService } from '../core/llm/llmService';
import { MemoryService } from '../core/memory/memoryService';
import { CommandManager } from '../core/commands/commandManager';
import { CommandSuggestion } from '../core/commands/slashCommand';
import { ModelManager } from '../core/llm/modelManager';
import { SmartPromptingState } from '../core/services/smartPromptingService';
/**
 * MainChatViewProvider manages the primary chat interface WebView
 * with a clean, modern, and user-friendly design
 */
export declare class MainChatViewProvider implements vscode.WebviewViewProvider {
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
     * Converts a URI to a webview-compatible URI
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
     * Converts model ID to a user-friendly display name
     * @deprecated Use the ModelManager.getModelDisplayName method instead
     */
    private getModelDisplayName;
    /**
     * 랜덤 인사말 생성 - 유저 컨텍스트에 맞는 인사말과 팁 제공
     */
    private getRandomGreeting;
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
    private loadMessages;
    /**
     * Saves messages to memory service
     */
    private saveMessages;
    /**
     * Updates the chat view with the current messages
     */
    private updateChatView;
    /**
     * Handles messages sent from the webview
     */
    private _handleMessage;
    /**
     * Updates command suggestions
     */
    private updateCommandSuggestions;
    /**
     * Inserts a command into the chat input
     */
    private insertCommandToChat;
    /**
     * Inserts text into the chat input from external sources
     */
    handleChatInput(text: string): void;
    /**
     * Adds a direct LLM response to the chat from external sources
     * Used for automated test results or system messages
     */
    sendLlmResponse(message: {
        role: string;
        content: string;
    }): Promise<void>;
    /**
     * Gets content from the active editor
     */
    private getEditorContent;
    /**
     * Generates the HTML for the main chat interface webview
     */
    private _getHtmlForWebview;
    /**
     * Generates a random nonce for CSP
     */
    private _getNonce;
    /**
     * Updates the Smart Prompting UI with the current state
     * @param state The current SmartPromptingState
     */
    _updateSmartPromptingUI(state: SmartPromptingState): void;
    /**
     * Open attached file - required for interface compatibility
     * No-op in this implementation as we don't need this feature for the iPhone style
     */
    _openAttachedFile(filePath: string): Promise<void>;
}
