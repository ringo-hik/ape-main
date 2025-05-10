import * as vscode from 'vscode';
import axios, { CancelTokenSource } from 'axios';
import { WebSocket } from 'ws';
import { 
  Message, 
  MessageRole, 
  LLMRequest, 
  LLMResponse, 
  LLMRequestOptions,
  StreamCallback,
  LLMModel
} from '../../types/chat';
import { ModelManager } from './modelManager';
import { VaultService } from '../services/vaultService';
import { RulesService } from '../services/rulesService';
import { 
  LLMRequestOptionsWithVault, 
  VaultContextOptions, 
  applyVaultContext 
} from './vaultIntegration';
import {
  LLMRequestOptionsWithRules,
  applyRulesContext
} from './rulesIntegration';

// Define constants for WebSocket states
const WS_OPEN = 1;

/**
 * LLM connection type
 */
export enum ConnectionType {
  HTTP = 'http',
  WebSocket = 'websocket'
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
export class LLMService implements vscode.Disposable {
  private _endpoint: string;
  private _connectionType: ConnectionType;
  private _wsConnection: WebSocket | null = null;
  private _cancelTokenSource: CancelTokenSource | null = null;
  private _configListener: vscode.Disposable;
  private _modelChangeListener: vscode.Disposable;
  
  /**
   * Creates a new LLMService instance
   * @param _context The VSCode extension context
   * @param _modelManager The model manager service
   */
  private _vaultService: VaultService | null = null;
  private _rulesService: RulesService | null = null;
  
  /**
   * 생성자
   * @param _context VSCode 확장 컨텍스트
   * @param _modelManager 모델 관리자
   */
  constructor(
    private readonly _context: vscode.ExtensionContext,
    private readonly _modelManager: ModelManager
  ) {
    // Initialize properties
    this._endpoint = '';
    this._connectionType = ConnectionType.HTTP;
    
    console.log('LLMService 초기화 시작...');
    
    // Load configuration
    this._loadConfiguration();
    
    // Listen for configuration changes
    this._configListener = vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('ape.llm') && 
          !event.affectsConfiguration('ape.llm.defaultModel')) { // Only handle non-model configs
        console.log('LLM 설정 변경 감지:', event);
        this._loadConfiguration();
      }
    });
    
    // Listen for model changes from ModelManager
    this._modelChangeListener = this._modelManager.onDidChangeModel(event => {
      console.log(`모델 변경 감지: ${event.oldModel} -> ${event.newModel}`);
      // No need to update internal state as we'll always use modelManager.getActiveModel()
    });
    
    console.log('LLMService 초기화 완료, 기본 모델:', this.getActiveModel());
  }
  
  /**
   * VAULT 서비스 설정
   * @param vaultService VAULT 서비스 인스턴스
   */
  public setVaultService(vaultService: VaultService): void {
    this._vaultService = vaultService;
  }
  
  /**
   * Rules 서비스 설정
   * @param rulesService Rules 서비스 인스턴스
   */
  public setRulesService(rulesService: RulesService): void {
    this._rulesService = rulesService;
  }
  
  /**
   * Reloads configuration from VSCode settings
   */
  private _apiKey = '';
  
  private _loadConfiguration(): void {
    const config = vscode.workspace.getConfiguration('ape.llm');
    const newEndpoint = config.get('endpoint', 'https://openrouter.ai/api/v1/chat/completions');
    const newApiKey = config.get('apiKey', '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');
    
    // Only update endpoint and API key if changed
    if (this._endpoint !== newEndpoint) {
      this._endpoint = newEndpoint;
    }
    
    if (this._apiKey !== newApiKey) {
      this._apiKey = newApiKey;
    }
    
    // Update connection type
    const newConnectionType = this._endpoint && this._endpoint.startsWith('ws') 
      ? ConnectionType.WebSocket 
      : ConnectionType.HTTP;
    
    if (this._connectionType !== newConnectionType) {
      this._connectionType = newConnectionType;
      
      // Handle WebSocket connection changes
      if (this._connectionType === ConnectionType.WebSocket && this._wsConnection) {
        this._wsConnection.close();
        this._wsConnection = null;
      }
    }
  }
  
  /**
   * Gets the currently active LLM model
   * @returns The active LLM model
   */
  public getActiveModel(): LLMModel {
    return this._modelManager.getActiveModel();
  }
  
  /**
   * Changes the active LLM model
   * @param model The model to switch to
   */
  public async setActiveModel(model: LLMModel): Promise<boolean> {
    return this._modelManager.setActiveModel(model);
  }
  
  /**
   * Gets all available LLM models
   * @returns Array of available LLM models
   */
  public getAvailableModels(): LLMModel[] {
    return this._modelManager.getAvailableModels();
  }
  
  /**
   * Gets a user-friendly display name for a model
   * @param modelId The model ID
   * @returns A formatted display name
   */
  public getModelDisplayName(modelId: string): string {
    return this._modelManager.getModelDisplayName(modelId);
  }
  
  /**
   * Sends a request to the LLM and gets a response
   * @param messages Messages to send
   * @param options Request options
   * @returns Promise that resolves to LLMResult containing the LLM response
   */
  public async sendRequest(
    messages: Message[],
    options?: LLMRequestOptions
  ): Promise<LLMResult<LLMResponse>> {
    try {
      // 모델 지정 (디버깅 목적으로 사용됩니다)
      // options?.model || this.getActiveModel();
      
      if (this._connectionType === ConnectionType.WebSocket) {
        const response = await this._sendWebSocketRequest(messages, options);
        return { success: true, data: response };
      } else {
        const response = await this._sendHttpRequest(messages, options);
        return { success: true, data: response };
      }
    } catch (error) {
      console.error('Error sending LLM request:', error);
      return { 
        success: false, 
        error: error instanceof Error 
          ? error
          : new Error(`Failed to communicate with LLM service: ${String(error)}`)
      };
    }
  }
  
  /**
   * Streams a response from the LLM
   * @param messages Messages to send
   * @param streamCallback Callback for streaming chunks and completion
   * @param options Request options
   * @returns Promise that resolves to LLMResult indicating streaming success or failure
   */
  public async streamResponse(
    messages: Message[],
    streamCallback: StreamCallback,
    options?: LLMRequestOptions
  ): Promise<LLMResult<void>> {
    try {
      // 모델 지정 (디버깅 목적으로 사용됩니다)
      // options?.model || this.getActiveModel();

      if (this._connectionType === ConnectionType.WebSocket) {
        await this._streamWebSocketResponse(messages, streamCallback, options);
        return { success: true };
      } else {
        await this._streamHttpResponse(messages, streamCallback, options);
        return { success: true };
      }
    } catch (error) {
      console.error('Error streaming LLM response:', error);

      // 에러 발생 시 스트리밍 완료 콜백 호출로 UI가 대기 상태에서 벗어나게 함
      // 에러 메시지를 마지막 청크로 전달하여 사용자에게 표시
      const errorMessage = error instanceof Error
        ? `오류 발생: ${error.message}`
        : `오류 발생: LLM 서비스 연결 실패 (${String(error)})`;

      // 에러 메시지를 전달하고 스트리밍 완료 플래그(true)를 보냄
      streamCallback(errorMessage, true);

      return {
        success: false,
        error: error instanceof Error
          ? error
          : new Error(`Failed to stream from LLM service: ${String(error)}`)
      };
    }
  }
  
  /**
   * Cancels an ongoing streaming response
   * @param streamCallback Optional callback to notify about cancellation
   */
  public cancelStream(streamCallback?: StreamCallback): void {
    if (this._connectionType === ConnectionType.HTTP && this._cancelTokenSource) {
      this._cancelTokenSource.cancel('Operation canceled by user');
      this._cancelTokenSource = null;

      // 취소 알림 메시지 전달 (선택적)
      if (streamCallback) {
        streamCallback('\n\n*요청이 취소되었습니다.*', true);
      }
    } else if (this._connectionType === ConnectionType.WebSocket && this._wsConnection) {
      // Send cancel message if supported
      try {
        this._wsConnection.send(JSON.stringify({ type: 'cancel' }));

        // 취소 알림 메시지 전달 (선택적)
        if (streamCallback) {
          streamCallback('\n\n*요청이 취소되었습니다.*', true);
        }
      } catch (error) {
        console.error('Error sending cancel message to WebSocket:', error);
        // 취소 오류 알림 (선택적)
        if (streamCallback) {
          streamCallback('\n\n*요청 취소 중 오류가 발생했습니다.*', true);
        }
      }
    }
  }
  
  /**
   * HTTP implementation of sendRequest
   * @param messages Messages to send
   * @param options Request options
   * @returns Promise that resolves to the LLM response
   */
  private async _sendHttpRequest(
    messages: Message[],
    options?: LLMRequestOptions
  ): Promise<LLMResponse> {
    const formattedMessages = this._formatMessagesForAPI(messages, options);
    
    // OpenRouter API 요청 형식으로 변환
    const openRouterMessages = formattedMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    const request = {
      model: options?.model || this.getActiveModel(),
      messages: openRouterMessages,
      temperature: options?.temperature || 0.7,
      max_tokens: options?.maxTokens || 1000,
      stream: false
    };
    
    // OpenRouter API 요청에 필요한 헤더 추가
    const headers: any = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this._apiKey}`,
      'HTTP-Referer': 'APE-Extension',
      'X-Title': 'APE (Agentic Pipeline Engine)'
    };
    
    console.log("LLM 요청:", JSON.stringify(request, null, 2));
    const response = await axios.post(this._endpoint, request, { headers });
    console.log("LLM 응답:", JSON.stringify(response.data, null, 2));
    
    return this._processHttpResponse(response.data);
  }
  
  /**
   * WebSocket implementation of sendRequest
   * @param messages Messages to send
   * @param options Request options
   * @returns Promise that resolves to the LLM response
   */
  private async _sendWebSocketRequest(
    messages: Message[],
    options?: LLMRequestOptions
  ): Promise<LLMResponse> {
    return new Promise((resolve, reject) => {
      this._ensureWebSocketConnection();
      
      if (!this._wsConnection) {
        reject(new Error('Failed to establish WebSocket connection'));
        return;
      }
      
      const formattedMessages = this._formatMessagesForAPI(messages, options);
      
      const request: LLMRequest = {
        messages: formattedMessages,
        model: options?.model || this.getActiveModel(),
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
        stream: false,
        parameters: options?.modelParameters
      };
      
      // Generate a unique request ID
      const requestId = `req_${Date.now()}`;
      
      // Set up one-time message handler for this request
      const messageHandler = (data: any) => {
        try {
          const dataStr = data.toString();
          const response = JSON.parse(dataStr);
          
          // Check if this is the response to our request
          if (response.requestId === requestId) {
            // Remove the listener once we get our response
            if (this._wsConnection) {
              this._wsConnection.removeListener('message', messageHandler);
            }
            
            if (response.error) {
              reject(new Error(response.error));
            } else {
              resolve(this._processWebSocketResponse(response));
            }
          }
        } catch (error) {
          reject(error);
        }
      };
      
      // Add the message handler
      this._wsConnection.on('message', messageHandler);
      
      // Send the request with the request ID
      this._wsConnection.send(JSON.stringify({
        ...request,
        requestId
      }));
      
      // Set a timeout in case of no response
      const timeoutId = setTimeout(() => {
        if (this._wsConnection) {
          this._wsConnection.removeListener('message', messageHandler);
        }
        reject(new Error('Request timed out'));
      }, 30000); // 30 seconds timeout
      
      // Also set up an error handler
      const errorHandler = (error: Error) => {
        clearTimeout(timeoutId);
        this._wsConnection?.removeListener('message', messageHandler);
        this._wsConnection?.removeListener('error', errorHandler);
        reject(error);
      };
      
      this._wsConnection.on('error', errorHandler);
    });
  }
  
  /**
   * HTTP implementation of streamResponse
   * @param messages Messages to send
   * @param streamCallback Callback for streaming chunks and completion
   * @param options Request options
   */
  private async _streamHttpResponse(
    messages: Message[],
    streamCallback: StreamCallback,
    options?: LLMRequestOptions
  ): Promise<void> {
    const formattedMessages = this._formatMessagesForAPI(messages, options);

    // OpenRouter API 요청 형식으로 변환
    const openRouterMessages = formattedMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const request = {
      model: options?.model || this.getActiveModel(),
      messages: openRouterMessages,
      temperature: options?.temperature || 0.7,
      max_tokens: options?.maxTokens || 1000,
      stream: true
    };

    // OpenRouter API 요청에 필요한 헤더 추가
    const headers: any = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this._apiKey}`,
      'HTTP-Referer': 'APE-Extension',
      'X-Title': 'APE (Agentic Pipeline Engine)'
    };

    // Create a cancellation token
    this._cancelTokenSource = axios.CancelToken.source();

    try {
      // 누적 텍스트는 디버깅 목적으로 사용될 수 있음

      const response = await axios.post(this._endpoint, request, {
        responseType: 'stream',
        cancelToken: this._cancelTokenSource.token,
        headers: headers
      });

      response.data.on('data', (chunk: Buffer) => {
        const lines = chunk.toString().split('\n').filter(Boolean);

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring('data: '.length);
            if (data === '[DONE]') {
              streamCallback('', true); // 스트림 완료 신호
            } else {
              try {
                const parsed = JSON.parse(data);
                if (parsed.choices && parsed.choices.length > 0) {
                  const content = parsed.choices[0].delta?.content ||
                                 parsed.choices[0].message?.content || '';
                  if (content) {
                    streamCallback(content, false);
                  }
                } else if (parsed.error) {
                  // 스트리밍 중 API 에러 처리
                  const errorContent = `\n\n**오류 발생**: ${parsed.error.message || '알 수 없는 오류가 발생했습니다.'}`;
                  streamCallback(errorContent, true); // 에러 메시지 전달 후 스트림 완료 처리
                  throw new Error(parsed.error.message || 'API error during streaming');
                }
              } catch (err) {
                console.error('Stream parsing error:', err);
                // JSON 파싱 에러는 스트림을 중단시키지 않음 (단일 청크 손상 처리)
              }
            }
          }
        }
      });

      response.data.on('end', () => {
        this._cancelTokenSource = null;
        streamCallback('', true); // 스트림 완료 신호
      });

      response.data.on('error', (err: Error) => {
        this._cancelTokenSource = null;
        console.error('Stream error:', err);
        // 스트림 에러 발생 시 에러 메시지 전달 후 스트림 완료 처리
        const errorContent = `\n\n**스트림 오류 발생**: ${err.message || '연결이 중단되었습니다.'}`;
        streamCallback(errorContent, true);
      });
    } catch (error) {
      this._cancelTokenSource = null;
      if (axios.isCancel(error)) {
        // Request was canceled intentionally
        streamCallback('\n\n*요청이 취소되었습니다.*', true); // 사용자에게 취소 알림
      } else {
        // Real error
        const errorMessage = error instanceof Error
          ? `\n\n**API 오류 발생**: ${error.message}`
          : `\n\n**API 오류 발생**: 연결 실패 (${String(error)})`;

        streamCallback(errorMessage, true); // 에러 메시지 전달 후 스트림 완료 처리
        throw error;
      }
    }
  }
  
  /**
   * WebSocket implementation of streamResponse
   * @param messages Messages to send
   * @param streamCallback Callback for streaming chunks and completion
   * @param options Request options
   */
  private async _streamWebSocketResponse(
    messages: Message[],
    streamCallback: StreamCallback,
    options?: LLMRequestOptions
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this._ensureWebSocketConnection();

      if (!this._wsConnection) {
        // 연결 실패 시 에러 메시지 전달 후 스트림 완료 처리
        const errorMessage = '\n\n**WebSocket 연결 실패**: 서버에 연결할 수 없습니다.';
        streamCallback(errorMessage, true);
        reject(new Error('Failed to establish WebSocket connection'));
        return;
      }

      const formattedMessages = this._formatMessagesForAPI(messages, options);

      const request: LLMRequest = {
        messages: formattedMessages,
        model: options?.model || this.getActiveModel(),
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
        stream: true,
        parameters: options?.modelParameters
      };

      // Generate a unique request ID
      const requestId = `req_${Date.now()}`;

      // Set up message handler for streaming
      const messageHandler = (data: any) => {
        try {
          const dataStr = data.toString();
          const response = JSON.parse(dataStr);

          // Check if this is a response to our request
          if (response.requestId === requestId) {
            if (response.error) {
              // Error response - 에러 메시지를 사용자에게 표시
              const errorMessage = `\n\n**WebSocket 오류 발생**: ${response.error}`;
              streamCallback(errorMessage, true); // 에러 메시지 전달 후 스트림 완료 처리

              if (this._wsConnection) {
                this._wsConnection.removeListener('message', messageHandler);
              }
              reject(new Error(response.error));
            } else if (response.type === 'chunk') {
              // Streaming chunk
              streamCallback(response.content || '', false);
            } else if (response.type === 'complete') {
              // Stream complete
              if (this._wsConnection) {
                this._wsConnection.removeListener('message', messageHandler);
              }
              streamCallback('', true); // Signal completion
              resolve();
            }
          }
        } catch (error) {
          // JSON 파싱 에러 등의 예외 처리
          const errorMessage = `\n\n**WebSocket 데이터 처리 오류**: ${error instanceof Error ? error.message : '알 수 없는 오류'}`;
          streamCallback(errorMessage, true);

          if (this._wsConnection) {
            this._wsConnection.removeListener('message', messageHandler);
          }
          reject(error);
        }
      };

      // Add the message handler
      this._wsConnection.on('message', messageHandler);

      // Send the streaming request
      try {
        this._wsConnection.send(JSON.stringify({
          ...request,
          requestId
        }));
      } catch (error) {
        // 전송 실패 시 에러 처리
        const errorMessage = `\n\n**WebSocket 요청 전송 실패**: ${error instanceof Error ? error.message : '알 수 없는 오류'}`;
        streamCallback(errorMessage, true);
        reject(error);
        return;
      }

      // Set a timeout for the entire streaming session
      const timeoutId = setTimeout(() => {
        if (this._wsConnection) {
          this._wsConnection.removeListener('message', messageHandler);
        }
        // 타임아웃 발생 시 에러 메시지 전달
        const timeoutMessage = '\n\n**연결 시간 초과**: 응답을 기다리는 시간이 너무 깁니다.';
        streamCallback(timeoutMessage, true);
        reject(new Error('Streaming request timed out'));
      }, 300000); // 5 minutes timeout for streaming

      // Also set up an error handler
      const errorHandler = (error: Error) => {
        clearTimeout(timeoutId);
        // WebSocket 에러 발생 시 에러 메시지 전달
        const errorMessage = `\n\n**WebSocket 오류 발생**: ${error.message || '연결 중 오류가 발생했습니다.'}`;
        streamCallback(errorMessage, true);

        this._wsConnection?.removeListener('message', messageHandler);
        this._wsConnection?.removeListener('error', errorHandler);
        reject(error);
      };

      this._wsConnection.on('error', errorHandler);
    });
  }
  
  /**
   * Ensures a WebSocket connection is established
   */
  private _ensureWebSocketConnection(): void {
    if (this._connectionType !== ConnectionType.WebSocket) {
      return;
    }
    
    if (!this._wsConnection || this._wsConnection.readyState !== WS_OPEN) {
      try {
        // Create a new WebSocket connection
        this._wsConnection = new WebSocket(this._endpoint);
        
        // Set up event handlers
        if (this._wsConnection) {
          this._wsConnection.on('error', (error) => {
            console.error('WebSocket error:', error);
            this._wsConnection = null;
          });
          
          this._wsConnection.on('close', () => {
            this._wsConnection = null;
          });
          
          // Wait for connection to be established
          this._wsConnection.on('open', () => {
            console.log('WebSocket connection established');
          });
        }
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        this._wsConnection = null;
      }
    }
  }
  
  /**
   * Formats messages for the API
   * @param messages Messages to format
   * @param options Optional request options
   * @returns Formatted messages array
   */
  private _formatMessagesForAPI(messages: Message[], options?: LLMRequestOptions): Message[] {
    let formattedMessages: Message[] = [...messages];
    
    // Add system prompt as a system message if provided
    if (options?.systemPrompt) {
      formattedMessages.unshift({
        id: `system_${Date.now()}`,
        role: MessageRole.System,
        content: options.systemPrompt,
        timestamp: new Date()
      });
    }
    
    // Add context messages if provided
    if (options?.contextMessages && options.contextMessages.length > 0) {
      formattedMessages = [...options.contextMessages, ...formattedMessages];
    }
    
    // Apply VAULT context if available and requested
    if (this._vaultService && (options as LLMRequestOptionsWithVault)?.vaultOptions) {
      const vaultOptions = (options as LLMRequestOptionsWithVault).vaultOptions;
      // vaultOptions가 undefined일 수 없지만 타입 에러를 해결하기 위해 기본 객체 제공
      formattedMessages = applyVaultContext(formattedMessages, this._vaultService, vaultOptions || {});
    }
    
    // Apply Rules if available
    if (this._rulesService) {
      const rulesOptions = (options as LLMRequestOptionsWithRules)?.rulesOptions;
      formattedMessages = applyRulesContext(formattedMessages, this._rulesService, rulesOptions);
    }
    
    // Return formatted messages
    return formattedMessages;
  }
  
  /**
   * Processes an HTTP API response
   * @param responseData Raw response data
   * @returns Processed LLM response
   */
  private _processHttpResponse(responseData: any): LLMResponse {
    // OpenRouter/OpenAI 형식 응답 처리 (choices 배열 사용)
    if (responseData.choices && Array.isArray(responseData.choices)) {
      const content = responseData.choices[0]?.message?.content || '';
      
      return {
        message: {
          id: responseData.id || `msg_${Date.now()}`,
          role: MessageRole.Assistant,
          content: content,
          timestamp: new Date(),
          metadata: {
            model: responseData.model || this.getActiveModel()
          }
        },
        usage: responseData.usage || {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0
        },
        metadata: responseData.metadata || {},
        content: content // 호환성을 위해 추가
      };
    } 
    // 기존 응답 형식 처리
    else {
      return {
        message: {
          id: responseData.message?.id || `msg_${Date.now()}`,
          role: MessageRole.Assistant,
          content: responseData.content || responseData.message?.content || '',
          timestamp: new Date(),
          metadata: responseData.message?.metadata || {
            model: responseData.model || this.getActiveModel()
          }
        },
        usage: responseData.usage || {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0
        },
        metadata: responseData.metadata || {}
      };
    }
  }
  
  /**
   * Processes a WebSocket API response
   * @param responseData Raw response data
   * @returns Processed LLM response
   */
  private _processWebSocketResponse(responseData: any): LLMResponse {
    // Process according to the WebSocket response format
    return {
      message: {
        id: responseData.message?.id || `msg_${Date.now()}`,
        role: MessageRole.Assistant,
        content: responseData.content || responseData.message?.content || '',
        timestamp: new Date(),
        metadata: responseData.message?.metadata || {
          model: responseData.model || this.getActiveModel()
        }
      },
      usage: responseData.usage || {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
      },
      metadata: responseData.metadata || {}
    };
  }
  
  /**
   * Processes a streaming chunk
   * @param chunk Raw chunk data
   * @returns Processed chunk as a string
   */
  private _processStreamChunk(chunk: any): string {
    // Process based on the API's streaming format
    try {
      if (typeof chunk === 'string') {
        // Try to parse as JSON if it's a string
        const data = JSON.parse(chunk);
        return data.content || data.text || data.chunk || '';
      } else if (typeof chunk === 'object') {
        // Already a parsed object
        return chunk.content || chunk.text || chunk.chunk || '';
      }
    } catch {
      // If parsing fails, return as is
      return chunk.toString();
    }
    
    return '';
  }
  
  /**
   * Gets a simple completion from the LLM for a prompt
   * @param prompt The prompt to send to the LLM
   * @param options Optional request options
   * @returns Promise that resolves to LLMResult containing the completion text
   */
  public async getCompletion(
    prompt: string,
    options?: LLMRequestOptions
  ): Promise<LLMResult<string>> {
    try {
      // Create a simple message with the prompt
      const messages: Message[] = [
        {
          id: `user_${Date.now()}`,
          role: MessageRole.User,
          content: prompt,
          timestamp: new Date()
        }
      ];
      
      // Send the request
      const result = await this.sendRequest(messages, options);
      
      if (result.success && result.data) {
        return {
          success: true,
          data: result.data.message.content
        };
      } else {
        return {
          success: false,
          error: result.error || new Error('Failed to get completion')
        };
      }
    } catch (error) {
      console.error('Error getting completion:', error);
      return {
        success: false,
        error: error instanceof Error 
          ? error
          : new Error(`Failed to get completion: ${String(error)}`)
      };
    }
  }
  
  /**
   * Disposes resources
   */
  public dispose(): void {
    // Dispose event listeners
    this._configListener.dispose();
    this._modelChangeListener.dispose();
    
    // Cancel any ongoing operations
    if (this._cancelTokenSource) {
      this._cancelTokenSource.cancel('Extension deactivated');
      this._cancelTokenSource = null;
    }
    
    // Close WebSocket connection
    if (this._wsConnection) {
      this._wsConnection.close();
      this._wsConnection = null;
    }
  }
}