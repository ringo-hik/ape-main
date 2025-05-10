import * as vscode from 'vscode';
import { LLMService } from '../core/llm/llmService';
import { MemoryService } from '../core/memory/memoryService';
import { CommandManager } from '../core/commands/commandManager';
import { Message } from '../types/chat';
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
     * 스마트 프롬프팅 UI 업데이트 - Claude AI 스타일
     */
    private _updateSmartPromptingUI;
    /**
     * 모드에 따른 표시 이름을 반환하는 함수
     */
    private _getModeDisplayName;
    /**
     * Sends a user message to the LLM and processes the response
     */
    sendMessage(content: string): Promise<void>;
    /**
     * Clears all messages from the chat and shows welcome screen
     */
    clearChat(): void;
    console: any;
    log(: any): any;
    const result: import("../core/memory/memoryService").MemoryResult<Message[]>;
    if(result: any, success: any): any;
}
