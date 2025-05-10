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
exports.CommandManager = void 0;
const vscode = __importStar(require("vscode"));
const slashCommandManager_1 = require("./slashCommandManager");
/**
 * Manages all commands for the extension
 */
class CommandManager {
    _context;
    _chatViewProvider;
    _llmService;
    _memoryService;
    _modelManager;
    _rulesService;
    _vaultService;
    _jiraService;
    _slashCommandManager;
    constructor(_context, _chatViewProvider, _llmService, _memoryService, _modelManager, _rulesService, // Rules 서비스
    _vaultService, // Vault 서비스
    _jiraService // Jira 서비스
    ) {
        this._context = _context;
        this._chatViewProvider = _chatViewProvider;
        this._llmService = _llmService;
        this._memoryService = _memoryService;
        this._modelManager = _modelManager;
        this._rulesService = _rulesService;
        this._vaultService = _vaultService;
        this._jiraService = _jiraService;
        // Initialize slash command manager with LLMService for smart help and services
        const services = {
            llmService: this._llmService,
            memoryService: this._memoryService,
            modelManager: this._modelManager,
            rulesService: this._rulesService,
            vaultService: this._vaultService,
            jiraService: this._jiraService
        };
        this._slashCommandManager = new slashCommandManager_1.SlashCommandManager(this._context, this._llmService, services);
    }
    /**
     * Gets the slash command manager instance
     */
    get slashCommandManager() {
        return this._slashCommandManager;
    }
    /**
     * Registers all commands for the extension
     */
    registerCommands() {
        // Chat commands
        this._registerCommand('ape.openChat', this._openChat.bind(this));
        this._registerCommand('ape.clearChat', this._clearChat.bind(this));
        this._registerCommand('ape.sendMessage', this._sendMessage.bind(this));
        // Model commands
        this._registerCommand('ape.selectModel', this.selectModel.bind(this));
        this._registerCommand('ape.switchModel', this.switchModel.bind(this));
        // Code commands
        this._registerCommand('ape.analyzeCode', this._analyzeCode.bind(this));
        // Slash commands
        this._registerCommand('ape.executeSlashCommand', this._executeSlashCommand.bind(this));
    }
    /**
     * Registers a single command with safety check for duplicates
     */
    _registerCommand(commandId, handler) {
        // 비동기 처리를 동기화하기 위한 즉시 실행 함수
        (async () => {
            try {
                // 명령어가 이미 존재하는지 확인
                const commands = await vscode.commands.getCommands(true);
                if (!commands.includes(commandId)) {
                    // 명령어가 없는 경우에만 등록
                    const disposable = vscode.commands.registerCommand(commandId, handler);
                    this._context.subscriptions.push(disposable);
                }
                else {
                    console.log(`명령 '${commandId}'는 이미 등록되어 있어 건너뜁니다.`);
                }
            }
            catch (error) {
                console.error(`명령 등록 중 오류 발생 (${commandId}):`, error);
            }
        })();
    }
    /**
     * Opens the chat view
     */
    async _openChat() {
        await vscode.commands.executeCommand('workbench.view.extension.ape-sidebar');
    }
    /**
     * Clears the chat history
     */
    async _clearChat() {
        await this._chatViewProvider.clearChat();
    }
    /**
     * Sends a message to the chat
     */
    async _sendMessage(content) {
        if (!content) {
            // If no content provided, prompt the user
            const message = await vscode.window.showInputBox({
                prompt: 'Enter message to send to APE',
                placeHolder: 'Type your message here...'
            });
            if (message) {
                await this._chatViewProvider.sendMessage(message);
            }
        }
        else {
            await this._chatViewProvider.sendMessage(content);
        }
    }
    /**
     * Opens model selection dialog
     */
    async selectModel() {
        const models = this._modelManager.getAvailableModels();
        const activeModel = this._modelManager.getActiveModel();
        // Create friendly display names for models
        const selectedModel = await vscode.window.showQuickPick(models.map(model => ({
            label: this._modelManager.getModelDisplayName(model),
            description: model === activeModel ? '(active)' : '',
            detail: this._modelManager.getModelDescription(model),
            model: model // Keep original model ID
        })), {
            placeHolder: 'Select a model to use',
            title: 'APE Model Selection'
        });
        if (selectedModel) {
            await this.switchModel(selectedModel.model);
        }
    }
    /**
     * Switches to a specific model
     */
    async switchModel(modelName) {
        try {
            // Use the ModelManager to switch models
            const success = await this._modelManager.setActiveModel(modelName);
            if (success) {
                // Update the UI to reflect the model change
                this._chatViewProvider.updateModelIndicator();
                vscode.window.showInformationMessage(`${this._modelManager.getModelDisplayName(modelName)} 모델로 전환했습니다`);
            }
            else {
                vscode.window.showErrorMessage(`모델 전환 실패: 유효하지 않은 모델 또는 전환 중 오류 발생`);
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`모델 전환 실패: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Gets user-friendly display name for a model - Deprecated, use ModelManager.getModelDisplayName instead
     * @param modelId The model ID
     * @returns User-friendly display name
     * @deprecated This method is kept for backward compatibility. Use ModelManager.getModelDisplayName instead
     */
    _getModelDisplayName(modelId) {
        return this._modelManager.getModelDisplayName(modelId);
    }
    /**
     * Executes a slash command
     */
    async _executeSlashCommand(commandText) {
        const executed = await this._slashCommandManager.executeCommand(commandText);
        if (!executed) {
            // If not a slash command, treat as regular message
            await this._sendMessage(commandText);
        }
    }
    /**
     * Gets description for a model - Deprecated, use ModelManager.getModelDescription instead
     * @param model The model ID
     * @returns Model description
     * @deprecated This method is kept for backward compatibility. Use ModelManager.getModelDescription instead
     */
    _getModelDescription(model) {
        return this._modelManager.getModelDescription(model);
    }
    /**
     * Analyzes selected code with APE
     */
    async _analyzeCode() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }
        const selection = editor.selection;
        if (selection.isEmpty) {
            vscode.window.showInformationMessage('Please select code to analyze');
            return;
        }
        const selectedText = editor.document.getText(selection);
        const filePath = editor.document.fileName;
        const fileExtension = filePath.split('.').pop() || '';
        const fileName = filePath.split('/').pop() || '';
        // Create analysis prompt with improved message for APE analysis
        const prompt = `Please analyze this ${fileExtension} code from ${fileName}:\n\n\`\`\`${fileExtension}\n${selectedText}\n\`\`\`\n\nProvide a detailed APE analysis including:\n1. Code functionality\n2. Potential issues or improvements\n3. Best practices recommendations`;
        // Show notification that analysis is starting
        vscode.window.showInformationMessage('Analyzing selected code with APE...');
        // Open chat and send the prompt
        await this._openChat();
        await this._sendMessage(prompt);
    }
}
exports.CommandManager = CommandManager;
//# sourceMappingURL=commandManager.js.map