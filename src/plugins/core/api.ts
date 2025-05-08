import * as vscode from 'vscode';
import { 
  PluginAPI, 
  LLMServiceAPI, 
  MemoryServiceAPI, 
  UIServiceAPI,
  FileSystemAPI,
  GitServiceAPI,
  WorkspaceAPI,
  DebugAPI,
  ServiceResult
} from '../types/api';
import { EventEmitter } from '../types/events';
import { LLMService } from '../../core/llm/llmService';
import { MemoryService } from '../../core/memory/memoryService';
import { Message, LLMModel, LLMRequestOptions, LLMResponse } from '../../types/chat';

/**
 * Implementation of the LLM Service API
 */
class LLMServiceAPIImpl implements LLMServiceAPI {
  constructor(private readonly _llmService: LLMService) {}
  
  /**
   * Get currently active LLM model
   * @returns Active LLM model
   */
  public getActiveModel(): LLMModel {
    return this._llmService.getActiveModel();
  }
  
  /**
   * Set active LLM model
   * @param model Model to set as active
   */
  public setActiveModel(model: LLMModel): void {
    this._llmService.setActiveModel(model);
  }
  
  /**
   * Get available LLM models
   * @returns Array of available models
   */
  public getAvailableModels(): LLMModel[] {
    return this._llmService.getAvailableModels();
  }
  
  /**
   * Send a request to the LLM
   * @param messages Messages to send
   * @param options Request options
   * @returns Promise that resolves to a service result containing the response
   */
  public async sendRequest(
    messages: Message[],
    options?: LLMRequestOptions
  ): Promise<ServiceResult<LLMResponse>> {
    return await this._llmService.sendRequest(messages, options);
  }
  
  /**
   * Stream a response from the LLM
   * @param messages Messages to send
   * @param onChunk Callback for each chunk of the response
   * @param options Request options
   * @returns Promise that resolves to a service result indicating success
   */
  public async streamResponse(
    messages: Message[],
    onChunk: (chunk: string, done: boolean) => void,
    options?: LLMRequestOptions
  ): Promise<ServiceResult<void>> {
    return await this._llmService.streamResponse(messages, onChunk, options);
  }
  
  /**
   * Cancel an ongoing streaming response
   */
  public cancelStream(): void {
    this._llmService.cancelStream();
  }
}

/**
 * Implementation of the Memory Service API
 */
class MemoryServiceAPIImpl implements MemoryServiceAPI {
  constructor(private readonly _memoryService: MemoryService) {}
  
  /**
   * Get current session ID
   * @returns Current session ID or null if no session is active
   */
  public getCurrentSessionId(): string | null {
    return this._memoryService.getCurrentSessionId();
  }
  
  /**
   * Get messages from current session
   * @returns Promise that resolves to a service result containing messages
   */
  public async getMessages(): Promise<ServiceResult<Message[]>> {
    return await this._memoryService.getMessages();
  }
  
  /**
   * Add a message to the current session
   * @param message Message to add
   * @returns Promise that resolves to a service result indicating success
   */
  public async addMessage(message: Message): Promise<ServiceResult<void>> {
    return await this._memoryService.addMessage(message);
  }
  
  /**
   * Create a new session
   * @param options Session creation options
   * @returns Promise that resolves to a service result containing the session ID
   */
  public async createSession(options: { name: string; metadata?: any }): Promise<ServiceResult<string>> {
    return await this._memoryService.createSession(options.name, { metadata: options.metadata });
  }
  
  /**
   * Switch to a different session
   * @param sessionId Session ID to switch to
   * @returns Promise that resolves to a service result indicating success
   */
  public async switchSession(sessionId: string): Promise<ServiceResult<boolean>> {
    return await this._memoryService.switchSession(sessionId);
  }
  
  /**
   * Get all available sessions
   * @returns Promise that resolves to a service result containing session summaries
   */
  public async getSessions(): Promise<ServiceResult<Array<{
    id: string;
    name: string;
    messageCount: number;
    updatedAt: Date;
  }>>> {
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
    
    return result as any;
  }
  
  /**
   * Clear messages from current session
   * @returns Promise that resolves to a service result indicating success
   */
  public async clearMessages(): Promise<ServiceResult<void>> {
    return await this._memoryService.clearMessages();
  }
}

/**
 * Implementation of the UI Service API
 */
class UIServiceAPIImpl implements UIServiceAPI {
  /**
   * Show an information message
   * @param message Message to show
   * @param items Items to include in the message
   * @returns Promise that resolves to the selected item
   */
  public async showInformationMessage(
    message: string,
    ...items: string[]
  ): Promise<string | undefined> {
    return await vscode.window.showInformationMessage(message, ...items);
  }
  
  /**
   * Show a warning message
   * @param message Message to show
   * @param items Items to include in the message
   * @returns Promise that resolves to the selected item
   */
  public async showWarningMessage(
    message: string,
    ...items: string[]
  ): Promise<string | undefined> {
    return await vscode.window.showWarningMessage(message, ...items);
  }
  
  /**
   * Show an error message
   * @param message Message to show
   * @param items Items to include in the message
   * @returns Promise that resolves to the selected item
   */
  public async showErrorMessage(
    message: string,
    ...items: string[]
  ): Promise<string | undefined> {
    return await vscode.window.showErrorMessage(message, ...items);
  }
  
  /**
   * Show quick pick selection
   * @param items Items to show in the quick pick
   * @param options Quick pick options
   * @returns Promise that resolves to the selected item
   */
  public async showQuickPick(
    items: string[] | vscode.QuickPickItem[],
    options?: vscode.QuickPickOptions
  ): Promise<string | vscode.QuickPickItem | undefined> {
    // Convert string items to QuickPickItems if needed
    const quickPickItems = Array.isArray(items) && items.length > 0 && typeof items[0] === 'string'
      ? (items as string[]).map(item => ({ label: item }))
      : (items as vscode.QuickPickItem[]);
    
    return await vscode.window.showQuickPick(quickPickItems, options);
  }
  
  /**
   * Show input box
   * @param options Input box options
   * @returns Promise that resolves to the entered text
   */
  public async showInputBox(
    options?: vscode.InputBoxOptions
  ): Promise<string | undefined> {
    return await vscode.window.showInputBox(options);
  }
  
  /**
   * Create and show a webview panel
   * @param viewType Type of the webview
   * @param title Title of the webview
   * @param options Webview options
   * @returns The created webview panel
   */
  public createWebviewPanel(
    viewType: string,
    title: string,
    options?: { viewColumn?: vscode.ViewColumn; preserveFocus?: boolean }
  ): vscode.WebviewPanel {
    const viewColumn = options?.viewColumn || vscode.ViewColumn.Active;
    const preserveFocus = options?.preserveFocus || false;
    
    return vscode.window.createWebviewPanel(
      viewType,
      title,
      { viewColumn, preserveFocus }
    );
  }
  
  /**
   * Create status bar item
   * @param options Status bar item options
   * @returns The created status bar item
   */
  public createStatusBarItem(
    options?: { alignment?: vscode.StatusBarAlignment; priority?: number }
  ): vscode.StatusBarItem {
    const alignment = options?.alignment || vscode.StatusBarAlignment.Left;
    const priority = options?.priority || 0;
    
    return vscode.window.createStatusBarItem(alignment, priority);
  }
}

/**
 * Implementation of the File System API
 */
class FileSystemAPIImpl implements FileSystemAPI {
  /**
   * Read file contents
   * @param uri File URI
   * @returns Promise that resolves to file contents
   */
  public async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    return await vscode.workspace.fs.readFile(uri);
  }
  
  /**
   * Read file as text
   * @param uri File URI
   * @returns Promise that resolves to file contents as text
   */
  public async readFileAsText(uri: vscode.Uri): Promise<string> {
    const data = await vscode.workspace.fs.readFile(uri);
    return new TextDecoder().decode(data);
  }
  
  /**
   * Write data to a file
   * @param uri File URI
   * @param content Content to write
   * @returns Promise that resolves when the file is written
   */
  public async writeFile(uri: vscode.Uri, content: Uint8Array): Promise<void> {
    await vscode.workspace.fs.writeFile(uri, content);
  }
  
  /**
   * Write text to a file
   * @param uri File URI
   * @param content Content to write
   * @returns Promise that resolves when the file is written
   */
  public async writeFileAsText(uri: vscode.Uri, content: string): Promise<void> {
    const data = new TextEncoder().encode(content);
    await vscode.workspace.fs.writeFile(uri, data);
  }
  
  /**
   * Delete a file
   * @param uri File URI
   * @returns Promise that resolves when the file is deleted
   */
  public async deleteFile(uri: vscode.Uri): Promise<void> {
    await vscode.workspace.fs.delete(uri);
  }
  
  /**
   * Check if a file exists
   * @param uri File URI
   * @returns Promise that resolves to true if the file exists
   */
  public async fileExists(uri: vscode.Uri): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(uri);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * List files in a directory
   * @param uri Directory URI
   * @returns Promise that resolves to an array of files and their types
   */
  public async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
    return await vscode.workspace.fs.readDirectory(uri);
  }
  
  /**
   * Create a directory
   * @param uri Directory URI
   * @returns Promise that resolves when the directory is created
   */
  public async createDirectory(uri: vscode.Uri): Promise<void> {
    await vscode.workspace.fs.createDirectory(uri);
  }
  
  /**
   * Delete a directory
   * @param uri Directory URI
   * @param options Delete options
   * @returns Promise that resolves when the directory is deleted
   */
  public async deleteDirectory(
    uri: vscode.Uri,
    options?: { recursive?: boolean }
  ): Promise<void> {
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
  public async rename(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<void> {
    await vscode.workspace.fs.rename(oldUri, newUri);
  }
  
  /**
   * Copy a file or directory
   * @param source Source URI
   * @param target Target URI
   * @returns Promise that resolves when the copy is complete
   */
  public async copy(source: vscode.Uri, target: vscode.Uri): Promise<void> {
    await vscode.workspace.fs.copy(source, target);
  }
}

/**
 * Implementation of the Git Service API
 */
class GitServiceAPIImpl implements GitServiceAPI {
  /**
   * Get Git repositories in workspace
   * @returns Promise that resolves to an array of repository URIs
   */
  public async getRepositories(): Promise<vscode.Uri[]> {
    try {
      // Try to get git extension
      const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
      
      if (gitExtension) {
        const api = gitExtension.getAPI(1);
        if (api) {
          // Return URIs for all repositories
          return api.repositories.map((repo: any) => {
            return vscode.Uri.parse(repo.rootUri.toString());
          });
        }
      }
      
      // If extension not available or no repositories, try to infer from workspace folders
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        // Filter to include only folders that contain a .git directory
        const repoFolders: vscode.Uri[] = [];
        
        for (const folder of workspaceFolders) {
          try {
            const gitFolder = vscode.Uri.joinPath(folder.uri, '.git');
            const stat = await vscode.workspace.fs.stat(gitFolder);
            if (stat.type === vscode.FileType.Directory) {
              repoFolders.push(folder.uri);
            }
          } catch (e) {
            // No .git folder, skip
          }
        }
        
        return repoFolders;
      }
    } catch (error) {
      console.error('Error getting Git repositories:', error);
    }
    
    return [];
  }
  
  /**
   * Get current branch name
   * @param repoUri Repository URI
   * @returns Promise that resolves to the branch name
   */
  public async getCurrentBranch(repoUri: vscode.Uri): Promise<string> {
    try {
      // Try to get git extension
      const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
      
      if (gitExtension) {
        const api = gitExtension.getAPI(1);
        if (api) {
          const repo = api.repositories.find((r: any) => 
            r.rootUri.toString() === repoUri.toString()
          );
          
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
      } catch (e) {
        // Failed to read HEAD file
      }
    } catch (error) {
      console.error('Error getting current branch:', error);
    }
    
    return 'main'; // Default fallback
  }
  
  /**
   * Get repository status
   * @param repoUri Repository URI
   * @returns Promise that resolves to an array of resource states
   */
  public async getStatus(repoUri: vscode.Uri): Promise<vscode.SourceControlResourceState[]> {
    try {
      // Try to get git extension
      const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
      
      if (gitExtension) {
        const api = gitExtension.getAPI(1);
        if (api) {
          const repo = api.repositories.find((r: any) => 
            r.rootUri.toString() === repoUri.toString()
          );
          
          if (repo) {
            // Combine working tree and index changes
            return [
              ...repo.state.workingTreeChanges,
              ...repo.state.indexChanges
            ];
          }
        }
      }
    } catch (error) {
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
  public async commit(repoUri: vscode.Uri, message: string, stagedOnly?: boolean): Promise<void> {
    // This implementation now correctly handles the repository URI parameter
    try {
      await vscode.commands.executeCommand('git.commit', { 
        repository: repoUri.toString(),
        message: message,
        stagedOnly: stagedOnly || false
      });
    } catch (error) {
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
  public async createBranch(repoUri: vscode.Uri, name: string, checkout?: boolean): Promise<void> {
    // This implementation now correctly handles the repository URI parameter
    try {
      await vscode.commands.executeCommand('git.branch', {
        repository: repoUri.toString(),
        name: name,
        checkout: checkout || false
      });
    } catch (error) {
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
  public async checkoutBranch(repoUri: vscode.Uri, name: string): Promise<void> {
    // This implementation now correctly handles the repository URI parameter
    try {
      await vscode.commands.executeCommand('git.checkout', {
        repository: repoUri.toString(),
        name: name
      });
    } catch (error) {
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
  public async pull(repoUri: vscode.Uri): Promise<void> {
    // This implementation now correctly handles the repository URI parameter
    try {
      await vscode.commands.executeCommand('git.pull', {
        repository: repoUri.toString()
      });
    } catch (error) {
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
  public async push(repoUri: vscode.Uri, forcePush?: boolean): Promise<void> {
    // This implementation now correctly handles the repository URI parameter
    try {
      await vscode.commands.executeCommand('git.push', {
        repository: repoUri.toString(),
        forcePush: forcePush || false
      });
    } catch (error) {
      console.error('Error pushing changes:', error);
      // Fallback to default git command if the repository-specific command fails
      await vscode.commands.executeCommand('git.push', forcePush ? '--force' : undefined);
    }
  }
}

/**
 * Implementation of the Workspace API
 */
class WorkspaceAPIImpl implements WorkspaceAPI {
  /**
   * Get workspace folders
   * @returns Workspace folders or undefined if none
   */
  public getWorkspaceFolders(): readonly vscode.WorkspaceFolder[] | undefined {
    return vscode.workspace.workspaceFolders;
  }
  
  /**
   * Find files matching a glob pattern
   * @param include Include pattern
   * @param exclude Exclude pattern
   * @returns Promise that resolves to an array of matching file URIs
   */
  public async findFiles(
    include: vscode.GlobPattern,
    exclude?: vscode.GlobPattern
  ): Promise<vscode.Uri[]> {
    return await vscode.workspace.findFiles(include, exclude);
  }
  
  /**
   * Save all dirty editors
   * @param includeUntitled Whether to include untitled documents
   * @returns Promise that resolves to true if all files were saved
   */
  public async saveAll(includeUntitled?: boolean): Promise<boolean> {
    return await vscode.workspace.saveAll(includeUntitled);
  }
  
  /**
   * Open a text document
   * @param uri Document URI
   * @returns Promise that resolves to the opened document
   */
  public async openTextDocument(uri: vscode.Uri): Promise<vscode.TextDocument> {
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
  public createFileSystemWatcher(
    globPattern: vscode.GlobPattern,
    ignoreCreateEvents?: boolean,
    ignoreChangeEvents?: boolean,
    ignoreDeleteEvents?: boolean
  ): vscode.FileSystemWatcher {
    return vscode.workspace.createFileSystemWatcher(
      globPattern,
      ignoreCreateEvents,
      ignoreChangeEvents,
      ignoreDeleteEvents
    );
  }
  
  /**
   * Register a text document content provider
   * @param scheme URI scheme
   * @param provider Content provider
   * @returns Disposable for unregistering
   */
  public registerTextDocumentContentProvider(
    scheme: string,
    provider: vscode.TextDocumentContentProvider
  ): vscode.Disposable {
    return vscode.workspace.registerTextDocumentContentProvider(scheme, provider);
  }
}

/**
 * Implementation of the Debug API
 */
class DebugAPIImpl implements DebugAPI {
  /**
   * Register a debug adapter descriptor factory
   * @param debugType Debug type
   * @param factory Factory implementation
   * @returns Disposable for unregistering
   */
  public registerDebugAdapterDescriptorFactory(
    debugType: string,
    factory: vscode.DebugAdapterDescriptorFactory
  ): vscode.Disposable {
    return vscode.debug.registerDebugAdapterDescriptorFactory(debugType, factory);
  }
  
  /**
   * Start debugging
   * @param folder Workspace folder
   * @param nameOrConfig Debug configuration name or configuration object
   * @returns Promise that resolves to true if debugging started
   */
  public async startDebugging(
    folder: vscode.WorkspaceFolder | undefined,
    nameOrConfig: string | vscode.DebugConfiguration
  ): Promise<boolean> {
    return await vscode.debug.startDebugging(folder, nameOrConfig);
  }
  
  /**
   * Add breakpoints
   * @param breakpoints Breakpoints to add
   */
  public addBreakpoints(breakpoints: vscode.Breakpoint[]): void {
    vscode.debug.addBreakpoints(breakpoints);
  }
  
  /**
   * Remove breakpoints
   * @param breakpoints Breakpoints to remove
   */
  public removeBreakpoints(breakpoints: vscode.Breakpoint[]): void {
    vscode.debug.removeBreakpoints(breakpoints);
  }
  
  /**
   * Get current debug session
   * @returns Active debug session or undefined if none
   */
  public getActiveDebugSession(): vscode.DebugSession | undefined {
    return vscode.debug.activeDebugSession;
  }
}

/**
 * Implementation of the Plugin API
 */
export class PluginAPIImpl implements PluginAPI {
  public readonly vscode = vscode;
  public readonly llm: LLMServiceAPI;
  public readonly memory: MemoryServiceAPI;
  public readonly ui: UIServiceAPI;
  public readonly fs: FileSystemAPI;
  public readonly git: GitServiceAPI;
  public readonly workspace: WorkspaceAPI;
  public readonly debug: DebugAPI;
  
  /**
   * Creates a new Plugin API implementation
   * @param _llmService LLM service
   * @param _memoryService Memory service
   * @param _events Event emitter
   */
  constructor(
    private readonly _llmService: LLMService,
    private readonly _memoryService: MemoryService,
    public readonly events: EventEmitter
  ) {
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
  public registerCommand(
    command: string,
    callback: (...args: any[]) => any,
    thisArg?: any
  ): vscode.Disposable {
    return vscode.commands.registerCommand(command, callback, thisArg);
  }
  
  /**
   * Execute a command
   * @param command Command ID
   * @param args Command arguments
   * @returns Promise that resolves to the command result
   */
  public async executeCommand<T>(command: string, ...args: any[]): Promise<T | undefined> {
    return await vscode.commands.executeCommand(command, ...args);
  }
  
  /**
   * Get configuration section
   * @param section Configuration section name
   * @returns Configuration object
   */
  public getConfiguration(section?: string): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(section);
  }
}