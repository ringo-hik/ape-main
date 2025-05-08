import * as vscode from 'vscode';
import { ChatViewProvider } from '../../ui/chatViewProvider';
import { LLMService } from '../llm/llmService';
import { MemoryService } from '../memory/memoryService';
import { SlashCommandManager } from './slashCommandManager';
import { ModelManager } from '../llm/modelManager';
/**
 * Manages all commands for the extension
 */
export declare class CommandManager {
    private readonly _context;
    private readonly _chatViewProvider;
    private readonly _llmService;
    private readonly _memoryService;
    private readonly _modelManager;
    private readonly _rulesService?;
    private readonly _vaultService?;
    private readonly _jiraService?;
    private readonly _slashCommandManager;
    constructor(_context: vscode.ExtensionContext, _chatViewProvider: ChatViewProvider, _llmService: LLMService, _memoryService: MemoryService, _modelManager: ModelManager, _rulesService?: any | undefined, // Rules 서비스
    _vaultService?: any | undefined, // Vault 서비스
    _jiraService?: any | undefined);
    /**
     * Gets the slash command manager instance
     */
    get slashCommandManager(): SlashCommandManager;
    /**
     * Registers all commands for the extension
     */
    registerCommands(): void;
    /**
     * Registers a single command
     */
    private _registerCommand;
    /**
     * Opens the chat view
     */
    private _openChat;
    /**
     * Clears the chat history
     */
    private _clearChat;
    /**
     * Sends a message to the chat
     */
    private _sendMessage;
    /**
     * Opens model selection dialog
     */
    selectModel(): Promise<void>;
    /**
     * Switches to a specific model
     */
    switchModel(modelName: string): Promise<void>;
    /**
     * Gets user-friendly display name for a model - Deprecated, use ModelManager.getModelDisplayName instead
     * @param modelId The model ID
     * @returns User-friendly display name
     * @deprecated This method is kept for backward compatibility. Use ModelManager.getModelDisplayName instead
     */
    private _getModelDisplayName;
    /**
     * Executes a slash command
     */
    private _executeSlashCommand;
    /**
     * Gets description for a model - Deprecated, use ModelManager.getModelDescription instead
     * @param model The model ID
     * @returns Model description
     * @deprecated This method is kept for backward compatibility. Use ModelManager.getModelDescription instead
     */
    private _getModelDescription;
    /**
     * Analyzes selected code with APE
     */
    private _analyzeCode;
}
