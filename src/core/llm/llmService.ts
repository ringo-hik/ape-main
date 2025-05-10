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

/**
 * 내부망 모델 API 엔드포인트 정의
 */
const INTERNAL_API_ENDPOINTS: Record<string, string> = {
  [LLMModel.NARRANS]: 'https://api-se-dev.narrans.samsungds.net/v1/chat/completions',
  [LLMModel.LLAMA4_SCOUT]: 'http://apigw-stg.samsungds.net:8000/llama4/1/llama/aiserving/llama-4/scout/v1/chat/completions',
  [LLMModel.LLAMA4_MAVERICK]: 'http://apigw-stg.samsungds.net:8000/llama4/1/llama/aiserving/llama-4/maverick/v1/chat/completions'
};

// Define constants for WebSocket states
const WS_OPEN = 1;

/**
 * 내부망 모델 여부 확인
 * @param model 모델 ID
 * @returns 내부망 모델 여부
 */
function isInternalModel(model: string): boolean {
  return Object.keys(INTERNAL_API_ENDPOINTS).includes(model);
}

/**
 * 내부망 모델용 요청 헤더 생성
 * @param apiKey API 키 (내부망에서는 x-dep-ticket으로 사용)
 * @param isStreaming 스트리밍 요청 여부
 * @returns 헤더 객체
 */
function createInternalApiHeaders(apiKey: string, requestId: string, isStreaming: boolean = false, model: LLMModel = '' as LLMModel): Record<string, string> {
  // 기본 헤더
  const headers = {
    'Content-Type': 'application/json',
    'Accept': isStreaming ? 'text/event-stream' : 'application/json',
    'Send-System-Name': 'swdp',
    'user-id': 'ape_ext',
    'user-type': 'ape_ext',
    'Prompt-Msg-Id': requestId,
    'Completion-msg-Id': requestId,
  };

  // Narrans 모델은 Bearer 인증 방식 사용
  if (model === LLMModel.NARRANS) {
    return {
      ...headers,
      'Authorization': `Bearer dummy_key` // 임시 API 키
    };
  }
  // 기타 내부망 모델은 x-dep-ticket 사용
  else {
    return {
      ...headers,
      'x-dep-ticket': apiKey
    };
  }
}

/**
 * 내부망 모델용 요청 본문 생성
 * @param model 모델 ID
 * @param messages 메시지 배열
 * @param options 요청 옵션
 * @returns 모델에 맞는 요청 본문 객체
 */
function createInternalApiRequestBody(model: string, messages: any[], options?: LLMRequestOptions): any {
  const baseRequest = {
    model: model,
    messages: messages,
    temperature: options?.temperature || 0.7,
    stream: !!options?.stream
  };

  if (model === LLMModel.NARRANS) {
    return {
      ...baseRequest,
      max_tokens: options?.maxTokens || 16000
    };
  } else if (model === LLMModel.LLAMA4_SCOUT || model === LLMModel.LLAMA4_MAVERICK) {
    return {
      ...baseRequest,
      system_name: 'swdp',
      user_id: 'ape_ext',
      user_type: 'ape_ext',
      max_tokens: options?.maxTokens || 50000
    };
  }

  // 기본 요청 본문 반환 (내부망 모델이 아닌 경우)
  return baseRequest;
}

/**
 * API 엔드포인트 선택
 * @param model 모델 ID
 * @param defaultEndpoint 기본 엔드포인트
 * @returns 사용할 API 엔드포인트
 */
function selectApiEndpoint(model: string, defaultEndpoint: string): string {
  if (isInternalModel(model) && INTERNAL_API_ENDPOINTS[model]) {
    return INTERNAL_API_ENDPOINTS[model];
  }
  return defaultEndpoint;
}

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
   */
  public cancelStream(): void {
    if (this._connectionType === ConnectionType.HTTP && this._cancelTokenSource) {
      this._cancelTokenSource.cancel('Operation canceled by user');
      this._cancelTokenSource = null;
    } else if (this._connectionType === ConnectionType.WebSocket && this._wsConnection) {
      // Send cancel message if supported
      this._wsConnection.send(JSON.stringify({ type: 'cancel' }));
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
    const model = options?.model || this.getActiveModel();
    const requestId = `req_${Date.now()}`;

    // 메시지 형식을 표준화 (모든 API가 동일한 기본 구조 사용)
    const standardMessages = formattedMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    let headers: Record<string, string>;
    let request: any;
    let endpoint: string;

    // 내부망 모델인지 확인하고 적절한 설정 적용
    if (isInternalModel(model)) {
      // 내부망 모델 API 설정 적용
      endpoint = selectApiEndpoint(model, this._endpoint);
      headers = createInternalApiHeaders(this._apiKey, requestId, false, model as LLMModel);
      request = createInternalApiRequestBody(model, standardMessages, options);
    } else {
      // 기본 API 설정 (OpenRouter 등)
      endpoint = this._endpoint;
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this._apiKey}`,
        'HTTP-Referer': 'APE-Extension',
        'X-Title': 'APE (Agentic Pipeline Engine)'
      };

      request = {
        model: model,
        messages: standardMessages,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 1000,
        stream: false
      };
    }

    console.log("LLM 요청:", JSON.stringify(request, null, 2));
    console.log("요청 엔드포인트:", endpoint);

    // 요청 설정
    const axiosConfig: any = { headers };

    // Narrans 모델인 경우 프록시 무시 및 SSL 인증서 검증 비활성화
    if (model === LLMModel.NARRANS) {
      console.log("Narrans 모델 요청: 프록시 무시 및 SSL 검증 비활성화");
      axiosConfig.proxy = false;
      axiosConfig.httpsAgent = new (require('https').Agent)({ rejectUnauthorized: false });
    }

    const response = await axios.post(endpoint, request, axiosConfig);
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
    const model = options?.model || this.getActiveModel();
    const requestId = `req_${Date.now()}`;

    // 메시지 형식을 표준화
    const standardMessages = formattedMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    let headers: Record<string, string>;
    let request: any;
    let endpoint: string;

    // 내부망 모델인지 확인하고 적절한 설정 적용
    if (isInternalModel(model)) {
      // 내부망 모델 API 설정 적용
      endpoint = selectApiEndpoint(model, this._endpoint);
      headers = createInternalApiHeaders(this._apiKey, requestId, true, model as LLMModel);  // 스트리밍 요청

      // 내부망 모델 요청 본문 (스트리밍 활성화)
      const internalOptions = { ...options, stream: true };
      request = createInternalApiRequestBody(model, standardMessages, internalOptions);
    } else {
      // 기본 API 설정 (OpenRouter 등)
      endpoint = this._endpoint;
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this._apiKey}`,
        'HTTP-Referer': 'APE-Extension',
        'X-Title': 'APE (Agentic Pipeline Engine)'
      };

      request = {
        model: model,
        messages: standardMessages,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 1000,
        stream: true
      };
    }

    // Create a cancellation token
    this._cancelTokenSource = axios.CancelToken.source();

    try {
      console.log("스트리밍 요청:", JSON.stringify(request, null, 2));
      console.log("스트리밍 엔드포인트:", endpoint);

      // 스트리밍 요청 설정
      const axiosConfig: any = {
        responseType: 'stream',
        cancelToken: this._cancelTokenSource.token,
        headers: headers
      };

      // Narrans 모델인 경우 프록시 무시 및 SSL 인증서 검증 비활성화
      if (model === LLMModel.NARRANS) {
        console.log("Narrans 모델 스트리밍 요청: 프록시 무시 및 SSL 검증 비활성화");
        axiosConfig.proxy = false;
        axiosConfig.httpsAgent = new (require('https').Agent)({ rejectUnauthorized: false });
      }

      const response = await axios.post(endpoint, request, axiosConfig);

      response.data.on('data', (chunk: Buffer) => {
        const lines = chunk.toString().split('\n').filter(Boolean);

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring('data: '.length);
            if (data === '[DONE]') {
              streamCallback('', true); // 스트림 완료 신호
            } else {
              try {
                // 데이터 유효성 검사 및 잘린 JSON 처리
                let validData = data;
                try {
                  // JSON 파싱 시도
                  JSON.parse(validData);
                } catch (jsonError) {
                  // 잘린 JSON 문자열 처리 - 마지막 괄호 닫기 추가
                  if (jsonError instanceof SyntaxError && jsonError.message.includes('Unterminated string')) {
                    console.warn('잘린 JSON 문자열 감지, 복구 시도 중');
                    // 닫는 큰따옴표와 괄호들 추가
                    validData = validData + '"}}}';
                  }
                }

                const parsed = JSON.parse(validData);

                // 내부망 API의 응답 형식은 표준 OpenAI와 다를 수 있으므로 분기 처리
                if (isInternalModel(model)) {
                  // 내부망 모델의 스트리밍 응답 처리
                  const content = parsed.choices?.[0]?.delta?.content ||
                                 parsed.choices?.[0]?.message?.content ||
                                 parsed.delta?.content ||
                                 parsed.content ||
                                 '';
                  if (content) {
                    streamCallback(content, false);
                  }
                } else {
                  // 표준 OpenAI 형식의 스트리밍 응답 처리
                  if (parsed.choices && parsed.choices.length > 0) {
                    const content = parsed.choices[0].delta?.content ||
                                  parsed.choices[0].message?.content || '';
                    if (content) {
                      streamCallback(content, false);
                    }
                  }
                }
              } catch (err) {
                console.error('Stream parsing error:', err);
                console.error('문제가 된 데이터:', data);
              }
            }
          }
        }
      });

      response.data.on('end', () => {
        this._cancelTokenSource = null;
        console.log('스트림 데이터 수신 완료');
        streamCallback('', true); // 스트림 완료 신호
      });

      response.data.on('error', (err: Error) => {
        this._cancelTokenSource = null;
        console.error('스트림 오류:', err);
        // 오류가 발생해도 클라이언트에게 스트림 완료 신호 전송
        streamCallback('\n\n[연결 오류가 발생했습니다. 다시 시도해주세요.]', true);
      });
    } catch (error) {
      this._cancelTokenSource = null;
      if (axios.isCancel(error)) {
        // Request was canceled intentionally
        streamCallback('', true); // Signal completion with empty chunk and done=true
      } else {
        // Real error
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
              // Error response
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
          if (this._wsConnection) {
            this._wsConnection.removeListener('message', messageHandler);
          }
          reject(error);
        }
      };
      
      // Add the message handler
      this._wsConnection.on('message', messageHandler);
      
      // Send the streaming request
      this._wsConnection.send(JSON.stringify({
        ...request,
        requestId
      }));
      
      // Set a timeout for the entire streaming session
      const timeoutId = setTimeout(() => {
        if (this._wsConnection) {
          this._wsConnection.removeListener('message', messageHandler);
        }
        reject(new Error('Streaming request timed out'));
      }, 300000); // 5 minutes timeout for streaming
      
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
    const model = responseData.model || this.getActiveModel();

    // 내부망 모델 응답 처리
    if (isInternalModel(model)) {
      // 내부망 모델은 다양한 응답 형식을 가질 수 있음
      // choices, content, message 등 다양한 필드 확인
      let content = '';

      if (responseData.choices && Array.isArray(responseData.choices)) {
        content = responseData.choices[0]?.message?.content ||
                 responseData.choices[0]?.content || '';
      } else if (responseData.message && responseData.message.content) {
        content = responseData.message.content;
      } else if (responseData.content) {
        content = responseData.content;
      }

      return {
        message: {
          id: responseData.id || `msg_${Date.now()}`,
          role: MessageRole.Assistant,
          content: content,
          timestamp: new Date(),
          metadata: {
            model: model
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
    // OpenRouter/OpenAI 형식 응답 처리 (choices 배열 사용)
    else if (responseData.choices && Array.isArray(responseData.choices)) {
      const content = responseData.choices[0]?.message?.content || '';

      return {
        message: {
          id: responseData.id || `msg_${Date.now()}`,
          role: MessageRole.Assistant,
          content: content,
          timestamp: new Date(),
          metadata: {
            model: model
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
            model: model
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