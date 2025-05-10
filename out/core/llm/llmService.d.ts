import * as vscode from 'vscode';
import { Message, LLMResponse, LLMRequestOptions, StreamCallback } from '../../types/chat';
import { ModelId } from '../../types/models';
import { ModelManager } from './modelManager';
import { VaultService } from '../services/vaultService';
import { RulesService } from '../services/rulesService';
/**
 * LLM connection type
 */
export declare enum ConnectionType {
    HTTP = "http",
    WebSocket = "websocket"
}
/**
 * Result of an LLM operation including status and optional error
 */
export interface LLMResult<T> {
    success: boolean;
    data?: T;
    error?: Error;
}
/**
 * Service for interacting with LLM APIs
 */
export declare class LLMService implements vscode.Disposable {
    private readonly _context;
    private readonly _modelManager;
    private _endpoint;
    private _connectionType;
    private _wsConnection;
    private _cancelTokenSource;
    private _configListener;
    private _modelChangeListener;
    /**
     * Creates a new LLMService instance
     * @param _context The VSCode extension context
     * @param _modelManager The model manager service
     */
    private _vaultService;
    private _rulesService;
    /**
     * 생성자
     * @param _context VSCode 확장 컨텍스트
     * @param _modelManager 모델 관리자
     */
    constructor(_context: vscode.ExtensionContext, _modelManager: ModelManager);
    /**
     * VAULT 서비스 설정
     * @param vaultService VAULT 서비스 인스턴스
     */
    setVaultService(vaultService: VaultService): void;
    /**
     * Rules 서비스 설정
     * @param rulesService Rules 서비스 인스턴스
     */
    setRulesService(rulesService: RulesService): void;
    /**
     * Reloads configuration from VSCode settings
     */
    private _apiKey;
    private _loadConfiguration;
    /**
     * Gets the currently active LLM model
     * @returns The active LLM model
     */
    getActiveModel(): ModelId;
    /**
     * Changes the active LLM model
     * @param model The model to switch to
     */
    setActiveModel(model: ModelId): Promise<boolean>;
    /**
     * Gets all available LLM models
     * @returns Array of available LLM models
     */
    getAvailableModels(): ModelId[];
    /**
     * Gets a user-friendly display name for a model
     * @param modelId The model ID
     * @returns A formatted display name
     */
    getModelDisplayName(modelId: string): string;
    /**
     * Sends a request to the LLM and gets a response
     * @param messages Messages to send
     * @param options Request options
     * @returns Promise that resolves to LLMResult containing the LLM response
     */
    sendRequest(messages: Message[], options?: LLMRequestOptions): Promise<LLMResult<LLMResponse>>;
    /**
     * Streams a response from the LLM
     * @param messages Messages to send
     * @param streamCallback Callback for streaming chunks and completion
     * @param options Request options
     * @returns Promise that resolves to LLMResult indicating streaming success or failure
     */
    streamResponse(messages: Message[], streamCallback: StreamCallback, options?: LLMRequestOptions): Promise<LLMResult<void>>;
    /**
     * Cancels an ongoing streaming response
     * @param streamCallback Optional callback to notify about cancellation
     */
    cancelStream(streamCallback?: StreamCallback): void;
    /**
     * HTTP implementation of sendRequest
     * @param messages Messages to send
     * @param options Request options
     * @returns Promise that resolves to the LLM response
     */
    private _sendHttpRequest;
    /**
     * WebSocket implementation of sendRequest
     * @param messages Messages to send
     * @param options Request options
     * @returns Promise that resolves to the LLM response
     */
    private _sendWebSocketRequest;
    /**
     * HTTP implementation of streamResponse
     * @param messages Messages to send
     * @param streamCallback Callback for streaming chunks and completion
     * @param options Request options
     */
    private _streamHttpResponse;
    /**
     * WebSocket implementation of streamResponse
     * @param messages Messages to send
     * @param streamCallback Callback for streaming chunks and completion
     * @param options Request options
     */
    private _streamWebSocketResponse;
    /**
     * Ensures a WebSocket connection is established
     */
    private _ensureWebSocketConnection;
    /**
     * Formats messages for the API
     * @param messages Messages to format
     * @param options Optional request options
     * @returns Formatted messages array
     */
    private _formatMessagesForAPI;
    /**
     * Processes an HTTP API response
     * @param responseData Raw response data
     * @returns Processed LLM response
     */
    private _processHttpResponse;
    /**
     * Processes a WebSocket API response
     * @param responseData Raw response data
     * @returns Processed LLM response
     */
    private _processWebSocketResponse;
    /**
     * Processes a streaming chunk
     * @param chunk Raw chunk data
     * @returns Processed chunk as a string
     */
    private _processStreamChunk;
    /**
     * Gets a simple completion from the LLM for a prompt
     * @param prompt The prompt to send to the LLM
     * @param options Optional request options
     * @returns Promise that resolves to LLMResult containing the completion text
     */
    getCompletion(prompt: string, options?: LLMRequestOptions): Promise<LLMResult<string>>;
    /**
     * Disposes resources
     */
    dispose(): void;
}
