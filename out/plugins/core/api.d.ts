import * as vscode from 'vscode';
import { PluginAPI, LLMServiceAPI, MemoryServiceAPI, UIServiceAPI, FileSystemAPI, GitServiceAPI, WorkspaceAPI, DebugAPI } from '../types/api';
import { EventEmitter } from '../types/events';
import { LLMService } from '../../core/llm/llmService';
import { MemoryService } from '../../core/memory/memoryService';
/**
 * Implementation of the Plugin API
 */
export declare class PluginAPIImpl implements PluginAPI {
    private readonly _llmService;
    private readonly _memoryService;
    readonly events: EventEmitter;
    readonly vscode: typeof vscode;
    readonly llm: LLMServiceAPI;
    readonly memory: MemoryServiceAPI;
    readonly ui: UIServiceAPI;
    readonly fs: FileSystemAPI;
    readonly git: GitServiceAPI;
    readonly workspace: WorkspaceAPI;
    readonly debug: DebugAPI;
    /**
     * Creates a new Plugin API implementation
     * @param _llmService LLM service
     * @param _memoryService Memory service
     * @param _events Event emitter
     */
    constructor(_llmService: LLMService, _memoryService: MemoryService, events: EventEmitter);
    /**
     * Register a command with VSCode
     * @param command Command ID
     * @param callback Command implementation
     * @param thisArg 'this' context for the callback
     * @returns Disposable for unregistering the command
     */
    registerCommand(command: string, callback: (...args: any[]) => any, thisArg?: any): vscode.Disposable;
    /**
     * Execute a command
     * @param command Command ID
     * @param args Command arguments
     * @returns Promise that resolves to the command result
     */
    executeCommand<T>(command: string, ...args: any[]): Promise<T | undefined>;
    /**
     * Get configuration section
     * @param section Configuration section name
     * @returns Configuration object
     */
    getConfiguration(section?: string): vscode.WorkspaceConfiguration;
}
