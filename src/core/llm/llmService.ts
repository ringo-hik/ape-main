import * as vscode from 'vscode';
import axios, { CancelTokenSource } from 'axios';
import { WebSocket } from 'ws';
import { 
  Message, 
  MessageRole, 
  LLMRequest, 
  LLMResponse, 
  LLMRequestOptions,
  StreamCallback
} from '../../types/chat';
import { ModelId } from '../../types/models';
import { ModelManager } from './modelManager';
import { VaultService } from '../services/vaultService';
import { RulesService } from '../services/rulesService';
import {
  LLMRequestOptionsWithVault,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
 * UUID 생성 함수 - 분산 환경에서의 추적성 향상
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, 
        v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 세밀한 진단을 위한 로깅 유틸리티 - 기존 코드에 영향 없이 추가됨
 */
class LogUtil {
  // 로그 수준 설정으로 진단 깊이 조절 가능
  static LOG_LEVEL = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  };
  
  static CURRENT_LOG_LEVEL = LogUtil.LOG_LEVEL.INFO;
  private static logCounter = 0;
  
  static getLogId(): string {
    return `log_${Date.now()}_${++LogUtil.logCounter}`;
  }
  
  // 순환 참조 객체 안전하게 JSON으로 변환
  private static getCircularReplacer() {
    const seen = new WeakSet();
    return (key: string, value: any) => {
      // undefined 값은 건너뜀
      if (value === undefined) return '[undefined]';
      
      // 원시 타입이나 null이면 그대로 반환
      if (typeof value !== 'object' || value === null) return value;
      
      // 순환 참조 감지
      if (seen.has(value)) {
        return '[Circular Reference]';
      }
      
      // Error 객체 특수 처리
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: value.stack
        };
      }
      
      // 객체 추적에 추가 (비원시 타입만)
      seen.add(value);
      return value;
    };
  }
  
  // 진단 가능한 구조화 정보 출력 (순환 참조 안전처리)
  static formatObject(obj: any, _depth: number = 2): string {
    try {
      return JSON.stringify(obj, this.getCircularReplacer(), 2);
    } catch (error) {
      console.error('로깅 중 오류 발생:', error);
      return '[로깅 불가 객체]';
    }
  }

  // 향상된 시각적 패턴으로 API 요청 추적
  static logRequest(endpoint: string, headers: any, body: any): void {
    const logId = LogUtil.getLogId();
    if (LogUtil.CURRENT_LOG_LEVEL <= LogUtil.LOG_LEVEL.DEBUG) {
      console.log(`
╔════════════════════════════════════════════════════════════
║ API 요청 [ID:${logId}] (${new Date().toISOString()})
╠════════════════════════════════════════════════════════════
║ 엔드포인트: ${endpoint}
║ 
║ 요청 헤더:
${LogUtil.formatObject(headers).split('\n').map((line: string) => `║ ${line}`).join('\n')}
║
║ 요청 본문:
${LogUtil.formatObject(body).split('\n').map((line: string) => `║ ${line}`).join('\n')}
╚════════════════════════════════════════════════════════════
      `);
    }
  }

  // 응답 데이터 구조적 분석 도구
  static logResponse(responseData: any): void {
    const logId = LogUtil.getLogId();
    if (LogUtil.CURRENT_LOG_LEVEL <= LogUtil.LOG_LEVEL.DEBUG) {
      console.log(`
╔════════════════════════════════════════════════════════════
║ API 응답 [ID:${logId}] (${new Date().toISOString()})
╠════════════════════════════════════════════════════════════
║ 응답 본문:
${LogUtil.formatObject(responseData).split('\n').map((line: string) => `║ ${line}`).join('\n')}
╚════════════════════════════════════════════════════════════
      `);
    }
  }

  // 복합적 오류 컨텍스트 캡처
  static logError(operation: string, error: any): void {
    const logId = LogUtil.getLogId();
    if (LogUtil.CURRENT_LOG_LEVEL <= LogUtil.LOG_LEVEL.ERROR) {
      // 순환 구조 문제를 방지하기 위해 안전한 오류 출력
      let errorDetails = '';
      try {
        // 기본 오류 정보 추출
        errorDetails = `
║ 작업 컨텍스트: ${operation}
║ 에러 코드: ${error?.code || 'N/A'}
║ 상태 코드: ${error?.response?.status || 'N/A'}
║ 에러 메시지: ${error?.message || '알 수 없는 오류'}`;
        
        // 응답 데이터가 있으면 안전하게 추가
        if (error?.response?.data) {
          try {
            const safeResponseData = typeof error.response.data === 'object' ? 
              JSON.stringify(error.response.data, this.getCircularReplacer()) : 
              String(error.response.data);
            errorDetails += `\n║ 응답 데이터: ${safeResponseData}`;
          } catch (formatError) {
            errorDetails += '\n║ 응답 데이터: [순환 참조 또는 직렬화 불가 객체]';
          }
        } else {
          errorDetails += '\n║ 응답 데이터: N/A';
        }
        
        // 스택 트레이스 안전하게 추가
        errorDetails += '\n║ \n║ 스택 트레이스:';
        if (error?.stack) {
          errorDetails += `\n${error.stack.split('\n').map((line: string) => `║ ${line}`).join('\n')}`;
        } else {
          try {
            const safeErrorString = JSON.stringify(error, this.getCircularReplacer());
            errorDetails += `\n${safeErrorString.split('\n').map((line: string) => `║ ${line}`).join('\n')}`;
          } catch (stringifyError) {
            errorDetails += '\n║ [순환 참조로 인해 스택 트레이스를 표시할 수 없음]';
          }
        }
      } catch (loggingError) {
        // 최악의 경우에도 기본 오류 정보는 제공
        errorDetails = `
║ 작업 컨텍스트: ${operation}
║ 기본 에러 정보: 순환 참조로 인해 자세한 정보를 표시할 수 없습니다
║ 에러 메시지: ${error?.message || '알 수 없는 오류'}`;
      }
      
      // 최종 오류 출력
      console.error(`
╔════════════════════════════════════════════════════════════
║ ⚠️ 시스템 오류 [ID:${logId}] (${new Date().toISOString()})
╠════════════════════════════════════════════════════════════${errorDetails}
╚════════════════════════════════════════════════════════════
      `);
    }
  }

  // 스트리밍 데이터 흐름 추적
  static logStreamChunk(chunk: any, parsed: any): void {
    // Skip logging empty chunks or when only structural content exists
    const isEmpty = !chunk ||
      (typeof chunk === 'string' && !chunk.trim()) ||
      (parsed && Object.keys(parsed).length === 0);

    if (isEmpty) {
      return;
    }

    // Check if content is empty (to reduce logging noise)
    const hasContent = parsed &&
      (parsed.content || parsed.text || parsed.delta?.content ||
       parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content);

    // Only log if DEBUG level is enabled and content exists
    const logId = LogUtil.getLogId();
    if (LogUtil.CURRENT_LOG_LEVEL <= LogUtil.LOG_LEVEL.DEBUG && hasContent) {
      console.log(`
╔════════════════════════════════════════════════════════════
║ 스트림 데이터 청크 [ID:${logId}] (${new Date().toISOString()})
╠════════════════════════════════════════════════════════════
║ 원본 데이터:
${(typeof chunk === 'string' ? chunk : LogUtil.formatObject(chunk)).split('\n').map((line: string) => `║ ${line}`).join('\n')}
║
║ 구조화 데이터:
${LogUtil.formatObject(parsed).split('\n').map((line: string) => `║ ${line}`).join('\n')}
╚════════════════════════════════════════════════════════════
      `);
    }
  }
  
  // 시스템 상태 및 주요 이벤트 추적
  static logInfo(message: string, data?: any): void {
    const logId = LogUtil.getLogId();
    if (LogUtil.CURRENT_LOG_LEVEL <= LogUtil.LOG_LEVEL.INFO) {
      try {
        const safeData = data ? LogUtil.formatObject(data) : '';
        console.log(`
╔════════════════════════════════════════════════════════════
║ 시스템 이벤트 [ID:${logId}] (${new Date().toISOString()})
╠════════════════════════════════════════════════════════════
║ ${message}
${data ? `║ 
${safeData.split('\n').map((line: string) => `║ ${line}`).join('\n')}` : ''}
╚════════════════════════════════════════════════════════════
        `);
      } catch (error) {
        // 로깅 실패 시에도 최소한의 정보는 출력
        console.log(`
╔════════════════════════════════════════════════════════════
║ 시스템 이벤트 [ID:${logId}] (${new Date().toISOString()})
╠════════════════════════════════════════════════════════════
║ ${message}
║ [로깅 불가 데이터: 순환 참조 또는 직렬화 오류]
╚════════════════════════════════════════════════════════════
        `);
      }
    }
  }
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
    
    LogUtil.logInfo('LLMService 초기화 시작...');
    
    // Load configuration
    this._loadConfiguration();
    
    // Listen for configuration changes
    this._configListener = vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('ape.llm') && 
          !event.affectsConfiguration('ape.llm.defaultModel')) { // Only handle non-model configs
        LogUtil.logInfo('LLM 설정 변경 감지:', event);
        this._loadConfiguration();
      }
    });
    
    // Listen for model changes from ModelManager
    this._modelChangeListener = this._modelManager.onDidChangeModel(event => {
      LogUtil.logInfo(`모델 변경 감지: ${event.oldModel} -> ${event.newModel}`);
      // No need to update internal state as we'll always use modelManager.getActiveModel()
    });
    
    LogUtil.logInfo('LLMService 초기화 완료, 기본 모델:', this.getActiveModel());
  }
  
  /**
   * VAULT 서비스 설정
   * @param vaultService VAULT 서비스 인스턴스
   */
  public setVaultService(vaultService: VaultService): void {
    this._vaultService = vaultService;
    LogUtil.logInfo('VAULT 서비스 설정됨');
  }
  
  /**
   * Rules 서비스 설정
   * @param rulesService Rules 서비스 인스턴스
   */
  public setRulesService(rulesService: RulesService): void {
    this._rulesService = rulesService;
    LogUtil.logInfo('Rules 서비스 설정됨');
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
      LogUtil.logInfo('엔드포인트 설정 변경됨', { endpoint: this._endpoint });
    }
    
    if (this._apiKey !== newApiKey) {
      this._apiKey = newApiKey;
      LogUtil.logInfo('API 키 설정 변경됨', { keyLength: this._apiKey.length });
    }
    
    // Update connection type
    const newConnectionType = this._endpoint && this._endpoint.startsWith('ws') 
      ? ConnectionType.WebSocket 
      : ConnectionType.HTTP;
    
    if (this._connectionType !== newConnectionType) {
      this._connectionType = newConnectionType;
      LogUtil.logInfo('연결 타입 변경됨', { connectionType: this._connectionType });
      
      // Handle WebSocket connection changes
      if (this._connectionType === ConnectionType.WebSocket && this._wsConnection) {
        this._wsConnection.close();
        this._wsConnection = null;
        LogUtil.logInfo('기존 WebSocket 연결 종료됨');
      }
    }
  }
  
  /**
   * Gets the currently active LLM model
   * @returns The active LLM model
   */
  public getActiveModel(): ModelId {
    return this._modelManager.getActiveModel();
  }
  
  /**
   * Changes the active LLM model
   * @param model The model to switch to
   */
  public async setActiveModel(model: ModelId): Promise<boolean> {
    LogUtil.logInfo('모델 변경 요청', { newModel: model });
    return this._modelManager.setActiveModel(model);
  }
  
  /**
   * Gets all available LLM models
   * @returns Array of available LLM models
   */
  public getAvailableModels(): ModelId[] {
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
      LogUtil.logInfo('LLM 요청 시작', {
        messageCount: messages.length,
        options: options
      });
      
      // 모델 지정 (디버깅 목적으로 사용됩니다)
      // options?.model || this.getActiveModel();
      
      if (this._connectionType === ConnectionType.WebSocket) {
        LogUtil.logInfo('WebSocket 요청 실행', { 
          model: options?.model || this.getActiveModel() 
        });
        const response = await this._sendWebSocketRequest(messages, options);
        return { success: true, data: response };
      } else {
        LogUtil.logInfo('HTTP 요청 실행', { 
          model: options?.model || this.getActiveModel() 
        });
        const response = await this._sendHttpRequest(messages, options);
        return { success: true, data: response };
      }
    } catch (error) {
      LogUtil.logError('LLM 요청 중 오류 발생', error);
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
      LogUtil.logInfo('LLM 스트리밍 요청 시작', {
        messageCount: messages.length,
        options: options
      });
      
      // 모델 지정 (디버깅 목적으로 사용됩니다)
      // options?.model || this.getActiveModel();

      if (this._connectionType === ConnectionType.WebSocket) {
        LogUtil.logInfo('WebSocket 스트리밍 시작', {
          model: options?.model || this.getActiveModel()
        });
        await this._streamWebSocketResponse(messages, streamCallback, options);
        return { success: true };
      } else {
        LogUtil.logInfo('HTTP 스트리밍 시작', {
          model: options?.model || this.getActiveModel()
        });
        await this._streamHttpResponse(messages, streamCallback, options);
        return { success: true };
      }
    } catch (error) {
      LogUtil.logError('LLM 스트리밍 중 오류 발생', error);

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
    LogUtil.logInfo('스트림 취소 요청됨');
    
    if (this._connectionType === ConnectionType.HTTP && this._cancelTokenSource) {
      this._cancelTokenSource.cancel('Operation canceled by user');
      this._cancelTokenSource = null;
      LogUtil.logInfo('HTTP 스트림 취소됨');

      // 취소 알림 메시지 전달 (선택적)
      if (streamCallback) {
        streamCallback('\n\n*요청이 취소되었습니다.*', true);
      }
    } else if (this._connectionType === ConnectionType.WebSocket && this._wsConnection) {
      // Send cancel message if supported
      try {
        this._wsConnection.send(JSON.stringify({ type: 'cancel' }));
        LogUtil.logInfo('WebSocket 취소 메시지 전송됨');

        // 취소 알림 메시지 전달 (선택적)
        if (streamCallback) {
          streamCallback('\n\n*요청이 취소되었습니다.*', true);
        }
      } catch (error) {
        LogUtil.logError('WebSocket 취소 메시지 전송 실패', error);
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
    const requestId = generateUUID();
    
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
    
    LogUtil.logRequest(this._endpoint, headers, request);
    
    try {
      const response = await axios.post(this._endpoint, request, { headers });
      LogUtil.logResponse(response.data);
      
      return this._processHttpResponse(response.data);
    } catch (error) {
      LogUtil.logError('HTTP 요청 중 오류 발생', error);
      throw error;
    }
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
        const error = new Error('Failed to establish WebSocket connection');
        LogUtil.logError('WebSocket 연결 실패', error);
        reject(error);
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
      const requestId = generateUUID();
      LogUtil.logInfo('WebSocket 요청 준비 완료', { requestId });
      
      // Set up one-time message handler for this request
      const messageHandler = (data: any) => {
        try {
          const dataStr = data.toString();
          LogUtil.logInfo('WebSocket 응답 수신', {
            dataPreview: dataStr.substring(0, 100) + (dataStr.length > 100 ? '...' : '')
          });
          
          const response = JSON.parse(dataStr);
          
          // Check if this is the response to our request
          if (response.requestId === requestId) {
            // Remove the listener once we get our response
            if (this._wsConnection) {
              this._wsConnection.removeListener('message', messageHandler);
            }
            
            if (response.error) {
              LogUtil.logError('WebSocket 응답 오류', new Error(response.error));
              reject(new Error(response.error));
            } else {
              LogUtil.logInfo('WebSocket 응답 처리 성공');
              resolve(this._processWebSocketResponse(response));
            }
          }
        } catch (error) {
          LogUtil.logError('WebSocket 응답 처리 중 오류', error);
          reject(error);
        }
      };
      
      // Add the message handler
      this._wsConnection.on('message', messageHandler);
      
      // Send the request with the request ID
      try {
        this._wsConnection.send(JSON.stringify({
          ...request,
          requestId
        }));
        LogUtil.logInfo('WebSocket 요청 전송 완료', { requestId });
      } catch (error) {
        LogUtil.logError('WebSocket 요청 전송 실패', error);
        reject(error);
        return;
      }
      
      // Set a timeout in case of no response
      const timeoutId = setTimeout(() => {
        if (this._wsConnection) {
          this._wsConnection.removeListener('message', messageHandler);
        }
        const timeoutError = new Error('Request timed out');
        LogUtil.logError('WebSocket 요청 타임아웃', timeoutError);
        reject(timeoutError);
      }, 30000); // 30 seconds timeout
      
      // Also set up an error handler
      const errorHandler = (error: Error) => {
        clearTimeout(timeoutId);
        this._wsConnection?.removeListener('message', messageHandler);
        this._wsConnection?.removeListener('error', errorHandler);
        LogUtil.logError('WebSocket 오류 발생', error);
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
    const requestId = generateUUID();

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

    LogUtil.logRequest(this._endpoint, headers, request);
    LogUtil.logInfo('HTTP 스트리밍 요청 시작', { requestId });

    try {
      // 누적 텍스트는 디버깅 목적으로 사용될 수 있음
      let chunkCount = 0;
      let accumulatedText = '';

      const response = await axios.post(this._endpoint, request, {
        responseType: 'stream',
        cancelToken: this._cancelTokenSource.token,
        headers: headers
      });

      LogUtil.logInfo('스트리밍 응답 시작됨', {
        status: response.status,
        statusText: response.statusText
      });

      response.data.on('data', (chunk: Buffer) => {
        const chunkStr = chunk.toString();
        LogUtil.logInfo(`스트림 데이터 청크 #${++chunkCount} 수신`, {
          chunkSize: chunkStr.length,
          chunkPreview: chunkStr.substring(0, 100) + (chunkStr.length > 100 ? '...' : '')
        });

        const lines = chunkStr.split('\n').filter(Boolean);

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring('data: '.length);
            if (data === '[DONE]') {
              LogUtil.logInfo('스트림 완료 신호 [DONE] 수신');
              streamCallback('', true); // 스트림 완료 신호
            } else {
              try {
                const parsed = JSON.parse(data);
                LogUtil.logStreamChunk(data, parsed);
                
                if (parsed.choices && parsed.choices.length > 0) {
                  const content = parsed.choices[0].delta?.content ||
                                 parsed.choices[0].message?.content || '';
                  if (content) {
                    accumulatedText += content;
                    LogUtil.logInfo('스트림 콘텐츠 추출', {
                      contentLength: content.length,
                      contentPreview: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
                      totalAccumulated: accumulatedText.length
                    });
                    
                    streamCallback(content, false);
                  }
                } else if (parsed.error) {
                  // 스트리밍 중 API 에러 처리
                  const errorContent = `\n\n**오류 발생**: ${parsed.error.message || '알 수 없는 오류가 발생했습니다.'}`;
                  LogUtil.logError('API 스트리밍 오류 응답', new Error(parsed.error.message));
                  streamCallback(errorContent, true); // 에러 메시지 전달 후 스트림 완료 처리
                  throw new Error(parsed.error.message || 'API error during streaming');
                }
              } catch (err) {
                LogUtil.logError('스트림 데이터 파싱 오류', err);
                // JSON 파싱 에러는 스트림을 중단시키지 않음 (단일 청크 손상 처리)
              }
            }
          }
        }
      });

      response.data.on('end', () => {
        this._cancelTokenSource = null;
        LogUtil.logInfo('스트림 종료', {
          totalChunks: chunkCount,
          totalAccumulatedLength: accumulatedText.length
        });
        streamCallback('', true); // 스트림 완료 신호
      });

      response.data.on('error', (err: Error) => {
        this._cancelTokenSource = null;
        
        // 스트림 에러 처리 (TLS 소켓 순환 참조 오류 등)
        let errorMessage = '연결이 중단되었습니다.';
        try {
          errorMessage = err.message || errorMessage;
        } catch (serializationError) {
          // 순환 참조 객체로 인한 오류 - 기본 메시지 사용
        }
        
        LogUtil.logError('스트림 에러', { 
          message: errorMessage,
          name: err.name || 'Unknown Error'
        });
        
        // 스트림 에러 발생 시 에러 메시지 전달 후 스트림 완료 처리
        const errorContent = `\n\n**스트림 오류 발생**: ${errorMessage}`;
        streamCallback(errorContent, true);
      });
    } catch (error) {
      this._cancelTokenSource = null;
      if (axios.isCancel(error)) {
        // Request was canceled intentionally
        LogUtil.logInfo('스트림 요청이 취소됨');
        streamCallback('\n\n*요청이 취소되었습니다.*', true); // 사용자에게 취소 알림
      } else {
        // Real error - 순환 참조 방지 처리
        let errorMessage = '연결 실패';
        try {
          errorMessage = error instanceof Error ? error.message : String(error);
        } catch (serializationError) {
          // 순환 참조 객체로 인한 오류 - 기본 메시지 사용
        }
        
        LogUtil.logError('스트림 요청 처리 중 오류 발생', { 
          message: errorMessage,
          name: error instanceof Error ? error.name : 'Unknown Error'
        });
        
        const errorContent = `\n\n**API 오류 발생**: ${errorMessage}`;
        streamCallback(errorContent, true); // 에러 메시지 전달 후 스트림 완료 처리
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
        LogUtil.logError('WebSocket 연결 실패', new Error('Failed to establish WebSocket connection'));
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
      const requestId = generateUUID();
      LogUtil.logInfo('WebSocket 스트리밍 요청 준비 완료', { requestId });

      let chunkCount = 0;
      let accumulatedText = '';

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
              LogUtil.logError('WebSocket 스트리밍 오류 응답', new Error(response.error));
              streamCallback(errorMessage, true); // 에러 메시지 전달 후 스트림 완료 처리

              if (this._wsConnection) {
                this._wsConnection.removeListener('message', messageHandler);
              }
              reject(new Error(response.error));
            } else if (response.type === 'chunk') {
              // Streaming chunk
              chunkCount++;
              const content = response.content || '';
              
              if (content) {
                accumulatedText += content;
                LogUtil.logInfo(`WebSocket 스트림 청크 #${chunkCount}`, {
                  contentLength: content.length,
                  contentPreview: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
                  totalAccumulated: accumulatedText.length
                });
              }
              
              streamCallback(content, false);
            } else if (response.type === 'complete') {
              // Stream complete
              LogUtil.logInfo('WebSocket 스트리밍 완료', {
                totalChunks: chunkCount,
                totalAccumulatedLength: accumulatedText.length
              });
              
              if (this._wsConnection) {
                this._wsConnection.removeListener('message', messageHandler);
              }
              streamCallback('', true); // Signal completion
              resolve();
            }
          }
        } catch (error) {
          // JSON 파싱 에러 등의 예외 처리
          let errorMessage = '알 수 없는 오류';
          try {
            errorMessage = error instanceof Error ? error.message : String(error);
          } catch (serializationError) {
            // 순환 참조 객체로 인한 오류 - 기본 메시지 사용
          }
          
          LogUtil.logError('WebSocket 데이터 처리 오류', { 
            message: errorMessage,
            name: error instanceof Error ? error.name : 'Unknown Error'
          });
          
          const wsErrorMessage = `\n\n**WebSocket 데이터 처리 오류**: ${errorMessage}`;
          streamCallback(wsErrorMessage, true);

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
        LogUtil.logInfo('WebSocket 스트리밍 요청 전송 완료', { requestId });
      } catch (error) {
        // 전송 실패 시 에러 처리
        let errorMessage = '알 수 없는 오류';
        try {
          errorMessage = error instanceof Error ? error.message : String(error);
        } catch (serializationError) {
          // 순환 참조 객체로 인한 오류 - 기본 메시지 사용
        }
        
        LogUtil.logError('WebSocket 스트리밍 요청 전송 실패', { 
          message: errorMessage,
          name: error instanceof Error ? error.name : 'Unknown Error'
        });
        
        const wsErrorMessage = `\n\n**WebSocket 요청 전송 실패**: ${errorMessage}`;
        streamCallback(wsErrorMessage, true);
        reject(error);
        return;
      }

      // Set a timeout for the entire streaming session
      const timeoutId = setTimeout(() => {
        if (this._wsConnection) {
          this._wsConnection.removeListener('message', messageHandler);
        }
        // 타임아웃 발생 시 에러 메시지 전달
        const timeoutError = new Error('Streaming request timed out');
        LogUtil.logError('WebSocket 스트리밍 요청 타임아웃', timeoutError);
        const timeoutMessage = '\n\n**연결 시간 초과**: 응답을 기다리는 시간이 너무 깁니다.';
        streamCallback(timeoutMessage, true);
        reject(timeoutError);
      }, 300000); // 5 minutes timeout for streaming

      // Also set up an error handler
      const errorHandler = (error: Error) => {
        clearTimeout(timeoutId);
        // WebSocket 에러 발생 시 에러 메시지 전달
        let errorMessage = '연결 중 오류가 발생했습니다.';
        try {
          errorMessage = error.message || errorMessage;
        } catch (serializationError) {
          // 순환 참조 객체로 인한 오류 - 기본 메시지 사용
        }
        
        LogUtil.logError('WebSocket 오류 발생', { 
          message: errorMessage,
          name: error.name || 'Unknown Error'
        });
        
        const wsErrorMessage = `\n\n**WebSocket 오류 발생**: ${errorMessage}`;
        streamCallback(wsErrorMessage, true);

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
      LogUtil.logInfo('WebSocket 연결 필요 없음 - HTTP 모드로 동작 중');
      return;
    }
    
    if (!this._wsConnection || this._wsConnection.readyState !== WS_OPEN) {
      LogUtil.logInfo('새 WebSocket 연결 시도', { endpoint: this._endpoint });
      
      try {
        // Create a new WebSocket connection
        this._wsConnection = new WebSocket(this._endpoint);
        
        // Set up event handlers
        if (this._wsConnection) {
          this._wsConnection.on('error', (error) => {
            LogUtil.logError('WebSocket 오류', error);
            this._wsConnection = null;
          });
          
          this._wsConnection.on('close', () => {
            LogUtil.logInfo('WebSocket 연결 닫힘');
            this._wsConnection = null;
          });
          
          // Wait for connection to be established
          this._wsConnection.on('open', () => {
            LogUtil.logInfo('WebSocket 연결 성공적으로 설정됨');
          });
        }
      } catch (error) {
        LogUtil.logError('WebSocket 연결 생성 실패', error);
        this._wsConnection = null;
      }
    } else {
      LogUtil.logInfo('기존 WebSocket 연결 재사용');
    }
  }
  
  /**
   * Formats messages for the API
   * @param messages Messages to format
   * @param options Optional request options
   * @returns Formatted messages array
   */
  private _formatMessagesForAPI(messages: Message[], options?: LLMRequestOptions): Message[] {
    LogUtil.logInfo('API용 메시지 포맷팅 시작', { 
      messageCount: messages.length,
      hasSystemPrompt: !!options?.systemPrompt,
      hasContextMessages: options?.contextMessages ? options.contextMessages.length : 0 
    });
    
    let formattedMessages: Message[] = [...messages];
    
    // Add system prompt as a system message if provided
    if (options?.systemPrompt) {
      formattedMessages.unshift({
        id: `system_${Date.now()}`,
        role: MessageRole.System,
        content: options.systemPrompt,
        timestamp: new Date()
      });
      LogUtil.logInfo('시스템 프롬프트 추가됨');
    }
    
    // Add context messages if provided
    if (options?.contextMessages && options.contextMessages.length > 0) {
      formattedMessages = [...options.contextMessages, ...formattedMessages];
      LogUtil.logInfo(`컨텍스트 메시지 ${options.contextMessages.length}개 추가됨`);
    }
    
    // Apply VAULT context if available and requested
    if (this._vaultService && (options as LLMRequestOptionsWithVault)?.vaultOptions) {
      const vaultOptions = (options as LLMRequestOptionsWithVault).vaultOptions;
      // vaultOptions가 undefined일 수 없지만 타입 에러를 해결하기 위해 기본 객체 제공
      formattedMessages = applyVaultContext(formattedMessages, this._vaultService, vaultOptions || {});
      LogUtil.logInfo('VAULT 컨텍스트 적용됨');
    }
    
    // Apply Rules if available
    if (this._rulesService) {
      const rulesOptions = (options as LLMRequestOptionsWithRules)?.rulesOptions;
      formattedMessages = applyRulesContext(formattedMessages, this._rulesService, rulesOptions);
      LogUtil.logInfo('Rules 컨텍스트 적용됨');
    }
    
    // Return formatted messages
    LogUtil.logInfo('메시지 포맷팅 완료', { finalMessageCount: formattedMessages.length });
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
      
      LogUtil.logInfo('OpenAI/OpenRouter 형식 응답 처리', {
        responseId: responseData.id,
        contentLength: content.length
      });
      
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
      const messageContent = responseData.content || responseData.message?.content || '';
      
      LogUtil.logInfo('기존 형식 응답 처리', {
        responseId: responseData.message?.id,
        contentLength: messageContent.length
      });
      
      return {
        message: {
          id: responseData.message?.id || `msg_${Date.now()}`,
          role: MessageRole.Assistant,
          content: messageContent,
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
    const messageContent = responseData.content || responseData.message?.content || '';
    
    LogUtil.logInfo('WebSocket 응답 처리', {
      responseId: responseData.message?.id,
      contentLength: messageContent.length
    });
    
    return {
      message: {
        id: responseData.message?.id || `msg_${Date.now()}`,
        role: MessageRole.Assistant,
        content: messageContent,
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
    // Skip processing for empty chunks
    if (!chunk) {
      return '';
    }

    LogUtil.logInfo('스트림 청크 처리 시작');

    // Process based on the API's streaming format
    try {
      if (typeof chunk === 'string') {
        // Skip empty strings
        if (!chunk.trim()) {
          return '';
        }

        try {
          // Try to parse as JSON if it's a string
          const data = JSON.parse(chunk);
          const content = data.content || data.text || data.chunk || '';

          // Only log non-empty content
          if (content) {
            LogUtil.logInfo('청크 처리 완료 (문자열 형식)', {
              contentLength: content.length
            });
          }

          return content;
        } catch (e) {
          // If it's not JSON, return as is
          return chunk;
        }
      } else if (typeof chunk === 'object') {
        // Already a parsed object
        const content = chunk.content || chunk.text || chunk.chunk || '';

        // Only log non-empty content
        if (content) {
          LogUtil.logInfo('청크 처리 완료 (객체 형식)', {
            contentLength: content.length
          });
        }

        return content;
      }
    } catch (error) {
      // If parsing fails, return as is but log error
      LogUtil.logError('청크 파싱 실패', error);
      return chunk ? chunk.toString() : '';
    }

    // Default case - return empty string for anything else
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
      LogUtil.logInfo('단순 완성 요청 시작', {
        promptLength: prompt.length,
        promptPreview: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : '')
      });
      
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
        LogUtil.logInfo('완성 요청 성공', {
          contentLength: result.data.message.content.length
        });
        
        return {
          success: true,
          data: result.data.message.content
        };
      } else {
        LogUtil.logError('완성 요청 실패', result.error || new Error('Failed to get completion'));
        
        return {
          success: false,
          error: result.error || new Error('Failed to get completion')
        };
      }
    } catch (error) {
      LogUtil.logError('완성 가져오기 중 오류', error);
      
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
    LogUtil.logInfo('LLMService 리소스 정리 시작');
    
    // Dispose event listeners
    this._configListener.dispose();
    this._modelChangeListener.dispose();
    
    // Cancel any ongoing operations
    if (this._cancelTokenSource) {
      this._cancelTokenSource.cancel('Extension deactivated');
      this._cancelTokenSource = null;
      LogUtil.logInfo('진행 중인 HTTP 요청 취소됨');
    }
    
    // Close WebSocket connection
    if (this._wsConnection) {
      this._wsConnection.close();
      this._wsConnection = null;
      LogUtil.logInfo('WebSocket 연결 닫힘');
    }
    
    LogUtil.logInfo('LLMService 리소스 정리 완료');
  }
}