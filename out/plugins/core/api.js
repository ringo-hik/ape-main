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
exports.PluginAPIImpl = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Implementation of the LLM Service API
 */
class LLMServiceAPIImpl {
    _llmService;
    constructor(_llmService) {
        this._llmService = _llmService;
    }
    /**
     * Get currently active LLM model
     * @returns Active LLM model
     */
    getActiveModel() {
        return this._llmService.getActiveModel();
    }
    /**
     * Set active LLM model
     * @param model Model to set as active
     */
    setActiveModel(model) {
        this._llmService.setActiveModel(model);
    }
    /**
     * Get available LLM models
     * @returns Array of available models
     */
    getAvailableModels() {
        return this._llmService.getAvailableModels();
    }
    /**
     * Send a request to the LLM
     * @param messages Messages to send
     * @param options Request options
     * @returns Promise that resolves to a service result containing the response
     */
    async sendRequest(messages, options) {
        return await this._llmService.sendRequest(messages, options);
    }
    /**
     * Stream a response from the LLM
     * @param messages Messages to send
     * @param onChunk Callback for each chunk of the response
     * @param options Request options
     * @returns Promise that resolves to a service result indicating success
     */
    async streamResponse(messages, onChunk, options) {
        return await this._llmService.streamResponse(messages, onChunk, options);
    }
    /**
     * Cancel an ongoing streaming response
     */
    cancelStream() {
        this._llmService.cancelStream();
    }
}
/**
 * Implementation of the Memory Service API
 */
class MemoryServiceAPIImpl {
    _memoryService;
    constructor(_memoryService) {
        this._memoryService = _memoryService;
    }
    /**
     * Get current session ID
     * @returns Current session ID or null if no session is active
     */
    getCurrentSessionId() {
        return this._memoryService.getCurrentSessionId();
    }
    /**
     * Get messages from current session
     * @returns Promise that resolves to a service result containing messages
     */
    async getMessages() {
        return await this._memoryService.getMessages();
    }
    /**
     * Add a message to the current session
     * @param message Message to add
     * @returns Promise that resolves to a service result indicating success
     */
    async addMessage(message) {
        return await this._memoryService.addMessage(message);
    }
    /**
     * Create a new session
     * @param options Session creation options
     * @returns Promise that resolves to a service result containing the session ID
     */
    async createSession(options) {
        return await this._memoryService.createSession(options.name, { metadata: options.metadata });
    }
    /**
     * Switch to a different session
     * @param sessionId Session ID to switch to
     * @returns Promise that resolves to a service result indicating success
     */
    async switchSession(sessionId) {
        return await this._memoryService.switchSession(sessionId);
    }
    /**
     * Get all available sessions
     * @returns Promise that resolves to a service result containing session summaries
     */
    async getSessions() {
        const result = await this._memoryService.getSessions();
        if (result.success && result.data) {
            const simplifiedSessions = result.data.map(session => ({
                id: session.id,
                name: session.name,
                messageCount: session.messageCount,
                updatedAt: session.updatedAt
            }));
            return {
                success: true,
                data: simplifiedSessions
            };
        }
        return result;
    }
    /**
     * Clear messages from current session
     * @returns Promise that resolves to a service result indicating success
     */
    async clearMessages() {
        return await this._memoryService.clearMessages();
    }
}
/**
 * Implementation of the UI Service API
 */
class UIServiceAPIImpl {
    /**
     * Show an information message
     * @param message Message to show
     * @param items Items to include in the message
     * @returns Promise that resolves to the selected item
     */
    async showInformationMessage(message, ...items) {
        return await vscode.window.showInformationMessage(message, ...items);
    }
    /**
     * Show a warning message
     * @param message Message to show
     * @param items Items to include in the message
     * @returns Promise that resolves to the selected item
     */
    async showWarningMessage(message, ...items) {
        return await vscode.window.showWarningMessage(message, ...items);
    }
    /**
     * Show an error message
     * @param message Message to show
     * @param items Items to include in the message
     * @returns Promise that resolves to the selected item
     */
    async showErrorMessage(message, ...items) {
        return await vscode.window.showErrorMessage(message, ...items);
    }
    /**
     * Show quick pick selection
     * @param items Items to show in the quick pick
     * @param options Quick pick options
     * @returns Promise that resolves to the selected item
     */
    async showQuickPick(items, options) {
        // Convert string items to QuickPickItems if needed
        const quickPickItems = Array.isArray(items) && items.length > 0 && typeof items[0] === 'string'
            ? items.map(item => ({ label: item }))
            : items;
        return await vscode.window.showQuickPick(quickPickItems, options);
    }
    /**
     * Show input box
     * @param options Input box options
     * @returns Promise that resolves to the entered text
     */
    async showInputBox(options) {
        return await vscode.window.showInputBox(options);
    }
    /**
     * Create and show a webview panel
     * @param viewType Type of the webview
     * @param title Title of the webview
     * @param options Webview options
     * @returns The created webview panel
     */
    createWebviewPanel(viewType, title, options) {
        const viewColumn = options?.viewColumn || vscode.ViewColumn.Active;
        const preserveFocus = options?.preserveFocus || false;
        return vscode.window.createWebviewPanel(viewType, title, { viewColumn, preserveFocus });
    }
    /**
     * Create status bar item
     * @param options Status bar item options
     * @returns The created status bar item
     */
    createStatusBarItem(options) {
        const alignment = options?.alignment || vscode.StatusBarAlignment.Left;
        const priority = options?.priority || 0;
        return vscode.window.createStatusBarItem(alignment, priority);
    }
}
/**
 * Implementation of the File System API
 */
class FileSystemAPIImpl {
    /**
     * Read file contents
     * @param uri File URI
     * @returns Promise that resolves to file contents
     */
    async readFile(uri) {
        return await vscode.workspace.fs.readFile(uri);
    }
    /**
     * Read file as text
     * @param uri File URI
     * @returns Promise that resolves to file contents as text
     */
    async readFileAsText(uri) {
        const data = await vscode.workspace.fs.readFile(uri);
        return new TextDecoder().decode(data);
    }
    /**
     * Write data to a file
     * @param uri File URI
     * @param content Content to write
     * @returns Promise that resolves when the file is written
     */
    async writeFile(uri, content) {
        await vscode.workspace.fs.writeFile(uri, content);
    }
    /**
     * Write text to a file
     * @param uri File URI
     * @param content Content to write
     * @returns Promise that resolves when the file is written
     */
    async writeFileAsText(uri, content) {
        const data = new TextEncoder().encode(content);
        await vscode.workspace.fs.writeFile(uri, data);
    }
    /**
     * Delete a file
     * @param uri File URI
     * @returns Promise that resolves when the file is deleted
     */
    async deleteFile(uri) {
        await vscode.workspace.fs.delete(uri);
    }
    /**
     * Check if a file exists
     * @param uri File URI
     * @returns Promise that resolves to true if the file exists
     */
    async fileExists(uri) {
        try {
            await vscode.workspace.fs.stat(uri);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * List files in a directory
     * @param uri Directory URI
     * @returns Promise that resolves to an array of files and their types
     */
    async readDirectory(uri) {
        return await vscode.workspace.fs.readDirectory(uri);
    }
    /**
     * Create a directory
     * @param uri Directory URI
     * @returns Promise that resolves when the directory is created
     */
    async createDirectory(uri) {
        await vscode.workspace.fs.createDirectory(uri);
    }
    /**
     * Delete a directory
     * @param uri Directory URI
     * @param options Delete options
     * @returns Promise that resolves when the directory is deleted
     */
    async deleteDirectory(uri, options) {
        await vscode.workspace.fs.delete(uri, {
            recursive: options?.recursive || false,
            useTrash: false
        });
    }
    /**
     * Rename a file or directory
     * @param oldUri Old URI
     * @param newUri New URI
     * @returns Promise that resolves when the rename is complete
     */
    async rename(oldUri, newUri) {
        await vscode.workspace.fs.rename(oldUri, newUri);
    }
    /**
     * Copy a file or directory
     * @param source Source URI
     * @param target Target URI
     * @returns Promise that resolves when the copy is complete
     */
    async copy(source, target) {
        await vscode.workspace.fs.copy(source, target);
    }
}
/**
 * Implementation of the Git Service API
 */
class GitServiceAPIImpl {
    /**
     * Get Git repositories in workspace
     * @returns Promise that resolves to an array of repository URIs
     */
    async getRepositories() {
        try {
            // Try to get git extension
            const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
            if (gitExtension) {
                const api = gitExtension.getAPI(1);
                if (api) {
                    // Return URIs for all repositories
                    return api.repositories.map((repo) => {
                        return vscode.Uri.parse(repo.rootUri.toString());
                    });
                }
            }
            // If extension not available or no repositories, try to infer from workspace folders
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders && workspaceFolders.length > 0) {
                // Filter to include only folders that contain a .git directory
                const repoFolders = [];
                for (const folder of workspaceFolders) {
                    try {
                        const gitFolder = vscode.Uri.joinPath(folder.uri, '.git');
                        const stat = await vscode.workspace.fs.stat(gitFolder);
                        if (stat.type === vscode.FileType.Directory) {
                            repoFolders.push(folder.uri);
                        }
                    }
                    catch (e) {
                        // No .git folder, skip
                    }
                }
                return repoFolders;
            }
        }
        catch (error) {
            console.error('Error getting Git repositories:', error);
        }
        return [];
    }
    /**
     * Get current branch name
     * @param repoUri Repository URI
     * @returns Promise that resolves to the branch name
     */
    async getCurrentBranch(repoUri) {
        try {
            // Try to get git extension
            const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
            if (gitExtension) {
                const api = gitExtension.getAPI(1);
                if (api) {
                    const repo = api.repositories.find((r) => r.rootUri.toString() === repoUri.toString());
                    if (repo) {
                        return repo.state.HEAD?.name || 'main';
                    }
                }
            }
            // If extension not available, try to read from .git/HEAD
            try {
                const headFile = vscode.Uri.joinPath(repoUri, '.git', 'HEAD');
                const headContent = await vscode.workspace.fs.readFile(headFile);
                const headText = new TextDecoder().decode(headContent);
                const match = /ref: refs\/heads\/(.+)/.exec(headText);
                if (match && match[1]) {
                    return match[1];
                }
            }
            catch (e) {
                // Failed to read HEAD file
            }
        }
        catch (error) {
            console.error('Error getting current branch:', error);
        }
        return 'main'; // Default fallback
    }
    /**
     * Get repository status
     * @param repoUri Repository URI
     * @returns Promise that resolves to an array of resource states
     */
    async getStatus(repoUri) {
        try {
            // Try to get git extension
            const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
            if (gitExtension) {
                const api = gitExtension.getAPI(1);
                if (api) {
                    const repo = api.repositories.find((r) => r.rootUri.toString() === repoUri.toString());
                    if (repo) {
                        // Combine working tree and index changes
                        return [
                            ...repo.state.workingTreeChanges,
                            ...repo.state.indexChanges
                        ];
                    }
                }
            }
        }
        catch (error) {
            console.error('Error getting repository status:', error);
        }
        return [];
    }
    /**
     * Commit changes
     * @param repoUri Repository URI
     * @param message Commit message
     * @param stagedOnly Whether to commit only staged changes
     * @returns Promise that resolves when the commit is complete
     */
    async commit(repoUri, message, stagedOnly) {
        // This implementation now correctly handles the repository URI parameter
        try {
            await vscode.commands.executeCommand('git.commit', {
                repository: repoUri.toString(),
                message: message,
                stagedOnly: stagedOnly || false
            });
        }
        catch (error) {
            console.error('Error committing changes:', error);
            // Fallback to default git command if the repository-specific command fails
            await vscode.commands.executeCommand('git.commit', stagedOnly);
        }
    }
    /**
     * Create a new branch
     * @param repoUri Repository URI
     * @param name Branch name
     * @param checkout Whether to checkout the new branch
     * @returns Promise that resolves when the branch is created
     */
    async createBranch(repoUri, name, checkout) {
        // This implementation now correctly handles the repository URI parameter
        try {
            await vscode.commands.executeCommand('git.branch', {
                repository: repoUri.toString(),
                name: name,
                checkout: checkout || false
            });
        }
        catch (error) {
            console.error('Error creating branch:', error);
            // Fallback to default git command if the repository-specific command fails
            await vscode.commands.executeCommand('git.createBranch', name);
        }
    }
    /**
     * Checkout a branch
     * @param repoUri Repository URI
     * @param name Branch name
     * @returns Promise that resolves when the branch is checked out
     */
    async checkoutBranch(repoUri, name) {
        // This implementation now correctly handles the repository URI parameter
        try {
            await vscode.commands.executeCommand('git.checkout', {
                repository: repoUri.toString(),
                name: name
            });
        }
        catch (error) {
            console.error('Error checking out branch:', error);
            // Fallback to default git command if the repository-specific command fails
            await vscode.commands.executeCommand('git.checkout', name);
        }
    }
    /**
     * Pull changes
     * @param repoUri Repository URI
     * @returns Promise that resolves when the pull is complete
     */
    async pull(repoUri) {
        // This implementation now correctly handles the repository URI parameter
        try {
            await vscode.commands.executeCommand('git.pull', {
                repository: repoUri.toString()
            });
        }
        catch (error) {
            console.error('Error pulling changes:', error);
            // Fallback to default git command if the repository-specific command fails
            await vscode.commands.executeCommand('git.pull');
        }
    }
    /**
     * Push changes
     * @param repoUri Repository URI
     * @param forcePush Whether to force push
     * @returns Promise that resolves when the push is complete
     */
    async push(repoUri, forcePush) {
        // This implementation now correctly handles the repository URI parameter
        try {
            await vscode.commands.executeCommand('git.push', {
                repository: repoUri.toString(),
                forcePush: forcePush || false
            });
        }
        catch (error) {
            console.error('Error pushing changes:', error);
            // Fallback to default git command if the repository-specific command fails
            await vscode.commands.executeCommand('git.push', forcePush ? '--force' : undefined);
        }
    }
}
/**
 * Implementation of the Workspace API
 */
class WorkspaceAPIImpl {
    /**
     * Get workspace folders
     * @returns Workspace folders or undefined if none
     */
    getWorkspaceFolders() {
        return vscode.workspace.workspaceFolders;
    }
    /**
     * Find files matching a glob pattern
     * @param include Include pattern
     * @param exclude Exclude pattern
     * @returns Promise that resolves to an array of matching file URIs
     */
    async findFiles(include, exclude) {
        return await vscode.workspace.findFiles(include, exclude);
    }
    /**
     * Save all dirty editors
     * @param includeUntitled Whether to include untitled documents
     * @returns Promise that resolves to true if all files were saved
     */
    async saveAll(includeUntitled) {
        return await vscode.workspace.saveAll(includeUntitled);
    }
    /**
     * Open a text document
     * @param uri Document URI
     * @returns Promise that resolves to the opened document
     */
    async openTextDocument(uri) {
        return await vscode.workspace.openTextDocument(uri);
    }
    /**
     * Create a file system watcher
     * @param globPattern Glob pattern to watch
     * @param ignoreCreateEvents Whether to ignore create events
     * @param ignoreChangeEvents Whether to ignore change events
     * @param ignoreDeleteEvents Whether to ignore delete events
     * @returns File system watcher
     */
    createFileSystemWatcher(globPattern, ignoreCreateEvents, ignoreChangeEvents, ignoreDeleteEvents) {
        return vscode.workspace.createFileSystemWatcher(globPattern, ignoreCreateEvents, ignoreChangeEvents, ignoreDeleteEvents);
    }
    /**
     * Register a text document content provider
     * @param scheme URI scheme
     * @param provider Content provider
     * @returns Disposable for unregistering
     */
    registerTextDocumentContentProvider(scheme, provider) {
        return vscode.workspace.registerTextDocumentContentProvider(scheme, provider);
    }
}
/**
 * Implementation of the Debug API
 */
class DebugAPIImpl {
    /**
     * Register a debug adapter descriptor factory
     * @param debugType Debug type
     * @param factory Factory implementation
     * @returns Disposable for unregistering
     */
    registerDebugAdapterDescriptorFactory(debugType, factory) {
        return vscode.debug.registerDebugAdapterDescriptorFactory(debugType, factory);
    }
    /**
     * Start debugging
     * @param folder Workspace folder
     * @param nameOrConfig Debug configuration name or configuration object
     * @returns Promise that resolves to true if debugging started
     */
    async startDebugging(folder, nameOrConfig) {
        return await vscode.debug.startDebugging(folder, nameOrConfig);
    }
    /**
     * Add breakpoints
     * @param breakpoints Breakpoints to add
     */
    addBreakpoints(breakpoints) {
        vscode.debug.addBreakpoints(breakpoints);
    }
    /**
     * Remove breakpoints
     * @param breakpoints Breakpoints to remove
     */
    removeBreakpoints(breakpoints) {
        vscode.debug.removeBreakpoints(breakpoints);
    }
    /**
     * Get current debug session
     * @returns Active debug session or undefined if none
     */
    getActiveDebugSession() {
        return vscode.debug.activeDebugSession;
    }
}
/**
 * Implementation of the Plugin API
 */
class PluginAPIImpl {
    _llmService;
    _memoryService;
    events;
    vscode = vscode;
    llm;
    memory;
    ui;
    fs;
    git;
    workspace;
    debug;
    /**
     * Creates a new Plugin API implementation
     * @param _llmService LLM service
     * @param _memoryService Memory service
     * @param _events Event emitter
     */
    constructor(_llmService, _memoryService, events) {
        this._llmService = _llmService;
        this._memoryService = _memoryService;
        this.events = events;
        // Initialize API implementations
        this.llm = new LLMServiceAPIImpl(_llmService);
        this.memory = new MemoryServiceAPIImpl(_memoryService);
        this.ui = new UIServiceAPIImpl();
        this.fs = new FileSystemAPIImpl();
        this.git = new GitServiceAPIImpl();
        this.workspace = new WorkspaceAPIImpl();
        this.debug = new DebugAPIImpl();
    }
    /**
     * Register a command with VSCode
     * @param command Command ID
     * @param callback Command implementation
     * @param thisArg 'this' context for the callback
     * @returns Disposable for unregistering the command
     */
    registerCommand(command, callback, thisArg) {
        return vscode.commands.registerCommand(command, callback, thisArg);
    }
    /**
     * Execute a command
     * @param command Command ID
     * @param args Command arguments
     * @returns Promise that resolves to the command result
     */
    async executeCommand(command, ...args) {
        return await vscode.commands.executeCommand(command, ...args);
    }
    /**
     * Get configuration section
     * @param section Configuration section name
     * @returns Configuration object
     */
    getConfiguration(section) {
        return vscode.workspace.getConfiguration(section);
    }
}
exports.PluginAPIImpl = PluginAPIImpl;
//# sourceMappingURL=api.js.map