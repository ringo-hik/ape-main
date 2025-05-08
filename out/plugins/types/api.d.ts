import * as vscode from 'vscode';
import { Message, LLMModel, LLMRequestOptions, LLMResponse } from '../../types/chat';
import { EventEmitter } from './events';
/**
 * Represents the result of a service operation
 */
export interface ServiceResult<T> {
    /** Whether the operation was successful */
    success: boolean;
    /** Result data (if successful) */
    data?: T;
    /** Error (if unsuccessful) */
    error?: Error;
}
/**
 * LLM service API available to plugins
 */
export interface LLMServiceAPI {
    /** Get currently active LLM model */
    getActiveModel(): LLMModel;
    /** Set active LLM model */
    setActiveModel(model: LLMModel): void;
    /** Get available LLM models */
    getAvailableModels(): LLMModel[];
    /** Send a request to the LLM */
    sendRequest(messages: Message[], options?: LLMRequestOptions): Promise<ServiceResult<LLMResponse>>;
    /** Stream a response from the LLM */
    streamResponse(messages: Message[], onChunk: (chunk: string, done: boolean) => void, options?: LLMRequestOptions): Promise<ServiceResult<void>>;
    /** Cancel an ongoing streaming response */
    cancelStream(): void;
}
/**
 * Options for creating a new chat session
 */
export interface SessionCreationOptions {
    /** Session name */
    name: string;
    /** Session metadata */
    metadata?: {
        /** Related project */
        project?: string;
        /** Default model */
        defaultModel?: string;
        /** Custom data */
        [key: string]: any;
    };
}
/**
 * Memory service API available to plugins
 */
export interface MemoryServiceAPI {
    /** Get current session ID */
    getCurrentSessionId(): string | null;
    /** Get messages from current session */
    getMessages(): Promise<ServiceResult<Message[]>>;
    /** Add a message to the current session */
    addMessage(message: Message): Promise<ServiceResult<void>>;
    /** Create a new session */
    createSession(options: SessionCreationOptions): Promise<ServiceResult<string>>;
    /** Switch to a different session */
    switchSession(sessionId: string): Promise<ServiceResult<boolean>>;
    /** Get all available sessions */
    getSessions(): Promise<ServiceResult<Array<{
        id: string;
        name: string;
        messageCount: number;
        updatedAt: Date;
    }>>>;
    /** Clear messages from current session */
    clearMessages(): Promise<ServiceResult<void>>;
}
/**
 * UI service API available to plugins
 */
export interface UIServiceAPI {
    /** Show an information message */
    showInformationMessage(message: string, ...items: string[]): Promise<string | undefined>;
    /** Show a warning message */
    showWarningMessage(message: string, ...items: string[]): Promise<string | undefined>;
    /** Show an error message */
    showErrorMessage(message: string, ...items: string[]): Promise<string | undefined>;
    /** Show quick pick selection */
    showQuickPick(items: string[] | vscode.QuickPickItem[], options?: vscode.QuickPickOptions): Promise<string | vscode.QuickPickItem | undefined>;
    /** Show input box */
    showInputBox(options?: vscode.InputBoxOptions): Promise<string | undefined>;
    /** Create and show a webview panel */
    createWebviewPanel(viewType: string, title: string, options?: {
        viewColumn?: vscode.ViewColumn;
        preserveFocus?: boolean;
    }): vscode.WebviewPanel;
    /** Create status bar item */
    createStatusBarItem(options?: {
        alignment?: vscode.StatusBarAlignment;
        priority?: number;
    }): vscode.StatusBarItem;
}
/**
 * File system API available to plugins
 */
export interface FileSystemAPI {
    /** Read file contents */
    readFile(uri: vscode.Uri): Promise<Uint8Array>;
    /** Read file as text */
    readFileAsText(uri: vscode.Uri): Promise<string>;
    /** Write data to a file */
    writeFile(uri: vscode.Uri, content: Uint8Array): Promise<void>;
    /** Write text to a file */
    writeFileAsText(uri: vscode.Uri, content: string): Promise<void>;
    /** Delete a file */
    deleteFile(uri: vscode.Uri): Promise<void>;
    /** Check if a file exists */
    fileExists(uri: vscode.Uri): Promise<boolean>;
    /** List files in a directory */
    readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]>;
    /** Create a directory */
    createDirectory(uri: vscode.Uri): Promise<void>;
    /** Delete a directory */
    deleteDirectory(uri: vscode.Uri, options?: {
        recursive?: boolean;
    }): Promise<void>;
    /** Rename a file or directory */
    rename(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<void>;
    /** Copy a file or directory */
    copy(source: vscode.Uri, target: vscode.Uri): Promise<void>;
}
/**
 * Git service API available to plugins
 */
export interface GitServiceAPI {
    /** Get Git repositories in workspace */
    getRepositories(): Promise<vscode.Uri[]>;
    /** Get current branch name */
    getCurrentBranch(repoUri: vscode.Uri): Promise<string>;
    /** Get repository status */
    getStatus(repoUri: vscode.Uri): Promise<vscode.SourceControlResourceState[]>;
    /** Commit changes */
    commit(repoUri: vscode.Uri, message: string, stagedOnly?: boolean): Promise<void>;
    /** Create a new branch */
    createBranch(repoUri: vscode.Uri, name: string, checkout?: boolean): Promise<void>;
    /** Checkout a branch */
    checkoutBranch(repoUri: vscode.Uri, name: string): Promise<void>;
    /** Pull changes */
    pull(repoUri: vscode.Uri): Promise<void>;
    /** Push changes */
    push(repoUri: vscode.Uri, forcePush?: boolean): Promise<void>;
}
/**
 * Workspace API available to plugins
 */
export interface WorkspaceAPI {
    /** Get workspace folders */
    getWorkspaceFolders(): readonly vscode.WorkspaceFolder[] | undefined;
    /** Find files matching a glob pattern */
    findFiles(include: vscode.GlobPattern, exclude?: vscode.GlobPattern): Promise<vscode.Uri[]>;
    /** Save all dirty editors */
    saveAll(includeUntitled?: boolean): Promise<boolean>;
    /** Open a text document */
    openTextDocument(uri: vscode.Uri): Promise<vscode.TextDocument>;
    /** Create a file watcher */
    createFileSystemWatcher(globPattern: vscode.GlobPattern, ignoreCreateEvents?: boolean, ignoreChangeEvents?: boolean, ignoreDeleteEvents?: boolean): vscode.FileSystemWatcher;
    /** Register a text document content provider */
    registerTextDocumentContentProvider(scheme: string, provider: vscode.TextDocumentContentProvider): vscode.Disposable;
}
/**
 * Debug API available to plugins
 */
export interface DebugAPI {
    /** Register a debug adapter descriptor factory */
    registerDebugAdapterDescriptorFactory(debugType: string, factory: vscode.DebugAdapterDescriptorFactory): vscode.Disposable;
    /** Start debugging */
    startDebugging(folder: vscode.WorkspaceFolder | undefined, nameOrConfig: string | vscode.DebugConfiguration): Promise<boolean>;
    /** Add breakpoints */
    addBreakpoints(breakpoints: vscode.Breakpoint[]): void;
    /** Remove breakpoints */
    removeBreakpoints(breakpoints: vscode.Breakpoint[]): void;
    /** Get current debug session */
    getActiveDebugSession(): vscode.DebugSession | undefined;
}
/**
 * Plugin API surface exposed to plugins
 */
export interface PluginAPI {
    /** VSCode namespace */
    vscode: typeof vscode;
    /** Event emitter for inter-plugin communication */
    events: EventEmitter;
    /** LLM service API */
    llm: LLMServiceAPI;
    /** Memory service API */
    memory: MemoryServiceAPI;
    /** UI service API */
    ui: UIServiceAPI;
    /** File system API */
    fs: FileSystemAPI;
    /** Git service API */
    git: GitServiceAPI;
    /** Workspace API */
    workspace: WorkspaceAPI;
    /** Debug API */
    debug: DebugAPI;
    /** Register a command with VSCode */
    registerCommand(command: string, callback: (...args: any[]) => any, thisArg?: any): vscode.Disposable;
    /** Execute a command */
    executeCommand<T>(command: string, ...args: any[]): Promise<T | undefined>;
    /** Get configuration section */
    getConfiguration(section?: string): vscode.WorkspaceConfiguration;
}
