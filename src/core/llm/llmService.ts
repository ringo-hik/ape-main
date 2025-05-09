import * as vscode from 'vscode';
import axios, { CancelTokenSource } from 'axios';
import { WebSocket } from 'ws';
import * as https from 'https';
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
 * 내부망 모델 API 엔드포인트 정의 (하드코딩)
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
  return model === LLMModel.NARRANS ||
         model === LLMModel.LLAMA4_SCOUT ||
         model === LLMModel.LLAMA4_MAVERICK;
}

/**
 * 내부망 모델용 요청 헤더 생성 (하드코딩)
 */
function createInternalApiHeaders(apiKey: string, requestId: string, isStreaming: boolean = false, model: LLMModel = '' as LLMModel): Record<string, string> {
  // Narrans 모델 요청 헤더
  if (model === LLMModel.NARRANS) {
    return {
      'Content-Type': 'application/json',
      'Accept': isStreaming ? 'text/event-stream; charset=utf-8' : 'application/json',
      'Send-System-Name': 'hik',
      'User-Id': 'ringo',
      'User-Type': 'ringo',
      'Prompt-Msg-Id': requestId,
      'Completion-Msg-Id': requestId,
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXkiOiJoYWttaW5fMS5raW0iLCJleHAiOjI1NTYxNDM5OTl9.vO_UgDXQKxYlZrGB1D6iD_WwiC-nXSr6VzBPUi7AM3U'  // 실제 Narrans 토큰
    };
  }
  // LLAMA4 모델 요청 헤더
  else {
    return {
      'Content-Type': 'application/json',
      'Accept': isStreaming ? 'text/event-stream; charset=utf-8' : 'application/json',
      'Send-System-Name': 'hik',
      'User-Id': 'ringo',
      'User-Type': 'ringo',
      'Prompt-Msg-Id': requestId,
      'Completion-Msg-Id': requestId,
      'x-dep-ticket': 'credential:TICKET-440ea61b-4691-427a-a248-67dce1e839a7:be36c69d-70c7-4453-a8c1-6fbc9ede5f6d:fd95297d-bc8e-4a9e-9279-159a05dd65f8_8223307b-9b7e-4957-95f8-bb0404370a67:-1:VmyKrVeastm47m242e3mmlkbUEptgvvozKe+8qDoyVH4vG49kh0f4cx5k2AT/oquE4G14Ov56iadf4Szrjtp5A==:signature=13OBqywSvP+YAQOMCrosjVsjlFZH5n3M584XMhpA07tXhp/HD5503Dq0DHkVm9XxpYAy5NJYo6VkaD7hfK2KAw=='  // 실제 x-dep-ticket
    };
  }
}

/**
 * 내부망 모델용 요청 본문 생성 (하드코딩)
 */
function createInternalApiRequestBody(model: string, messages: any[], options?: LLMRequestOptions): any {
  // Narrans 모델 요청 본문
  if (model === LLMModel.NARRANS) {
    return {
      model: model,
      messages: messages,
      temperature: options?.temperature || 0.7,
      stream: !!options?.stream,
      max_tokens: 16000
    };
  }
  // LLAMA4_SCOUT 모델 요청 본문
  else if (model === LLMModel.LLAMA4_SCOUT) {
    return {
      model: model,
      messages: messages,
      temperature: options?.temperature || 0.7,
      stream: !!options?.stream,
      system_name: 'hik',
      user_id: 'ringo',
      user_type: 'ringo',
      max_tokens: 50000
    };
  }
  // LLAMA4_MAVERICK 모델 요청 본문
  else if (model === LLMModel.LLAMA4_MAVERICK) {
    return {
      model: model,
      messages: messages,
      temperature: options?.temperature || 0.7,
      stream: !!options?.stream,
      system_name: 'hik',
      user_id: 'ringo',
      user_type: 'ringo',
      max_tokens: 50000
    };
  }
  // 기본 요청 본문 (외부 API)
  else {
    return {
      model: model,
      messages: messages,
      temperature: options?.temperature || 0.7,
      stream: !!options?.stream
    };
  }
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
      const model = options?.model || this.getActiveModel();
      console.log(`[LLMService] 요청 시작: 모델=${model}, 연결 타입=${this._connectionType}`);
      console.log(`[LLMService] 현재 API 엔드포인트: ${this._endpoint}`);

      if (isInternalModel(model)) {
        console.log(`[LLMService] 내부망 모델 요청 - 엔드포인트: ${selectApiEndpoint(model, this._endpoint)}`);
      }

      if (this._connectionType === ConnectionType.WebSocket) {
        console.log(`[LLMService] WebSocket 요청 시작`);
        const response = await this._sendWebSocketRequest(messages, options);
        console.log(`[LLMService] WebSocket 응답 수신 완료`);
        return { success: true, data: response };
      } else {
        console.log(`[LLMService] HTTP 요청 시작`);
        const response = await this._sendHttpRequest(messages, options);
        console.log(`[LLMService] HTTP 응답 수신 완료`);
        return { success: true, data: response };
      }
    } catch (error) {
      console.error('[LLMService] 요청 오류:', error);
      if (error instanceof Error) {
        console.error('[LLMService] 오류 메시지:', error.message);
        console.error('[LLMService] 스택 트레이스:', error.stack);

        // 추가 진단 정보
        if ('response' in error && error.response) {
          // axios 오류인 경우
          const axiosError = error as any;
          console.error(`[LLMService] 상위 오류 상태 코드: ${axiosError.response.status}`);
          console.error(`[LLMService] 상위 오류 응답 데이터:`, axiosError.response.data);

          // 422 에러 특수 처리
          if (axiosError.response.status === 422) {
            console.error('[LLMService] 상위 핸들러에서 422 에러 감지 - 최상위 스택 로그');
            console.error('[LLMService] 사용 모델:', options?.model || this.getActiveModel());

            // 메시지 요약 정보
            const messagesSummary = messages.map(m => ({
              role: m.role,
              contentLength: m.content.length,
              contentPreview: m.content.length > 100 ? `${m.content.substring(0, 100)}...` : m.content
            }));
            console.error('[LLMService] 메시지 요약:', JSON.stringify(messagesSummary, null, 2));

            // 요청 옵션 요약
            if (options) {
              console.error('[LLMService] 요청 옵션:', JSON.stringify({
                model: options.model,
                temperature: options.temperature,
                maxTokens: options.maxTokens,
                hasSystemPrompt: !!options.systemPrompt,
                systemPromptLength: options.systemPrompt?.length || 0,
                hasContextMessages: !!options.contextMessages && options.contextMessages.length > 0,
                contextMessagesCount: options.contextMessages?.length || 0
              }, null, 2));
            }
          }
        }
      }
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
      const model = options?.model || this.getActiveModel();
      console.log(`[LLMService] 스트리밍 요청 시작: 모델=${model}, 연결 타입=${this._connectionType}`);
      console.log(`[LLMService] 스트리밍 API 엔드포인트: ${this._endpoint}`);

      if (isInternalModel(model)) {
        const apiEndpoint = selectApiEndpoint(model, this._endpoint);
        console.log(`[LLMService] 내부망 모델 스트리밍 요청 - 엔드포인트: ${apiEndpoint}`);

        // Narrans 모델 특수 처리 로그
        if (model === LLMModel.NARRANS) {
          console.log(`[LLMService] Narrans 모델 스트리밍 요청 - 프록시 무시 및 SSL 검증 비활성화 활성화됨`);
        }
      }

      if (this._connectionType === ConnectionType.WebSocket) {
        console.log(`[LLMService] WebSocket 스트리밍 요청 시작`);
        await this._streamWebSocketResponse(messages, streamCallback, options);
        console.log(`[LLMService] WebSocket 스트리밍 완료`);
        return { success: true };
      } else {
        console.log(`[LLMService] HTTP 스트리밍 요청 시작`);
        await this._streamHttpResponse(messages, streamCallback, options);
        console.log(`[LLMService] HTTP 스트리밍 완료`);
        return { success: true };
      }
    } catch (error) {
      console.error('[LLMService] 스트리밍 요청 오류:', error);
      if (error instanceof Error) {
        console.error('[LLMService] 스트리밍 오류 메시지:', error.message);
        console.error('[LLMService] 스트리밍 스택 트레이스:', error.stack);

        // 추가 진단 정보
        if ('response' in error && error.response) {
          // axios 오류인 경우
          const axiosError = error as any;
          console.error(`[LLMService] 스트리밍 상위 오류 상태 코드: ${axiosError.response.status}`);
          console.error(`[LLMService] 스트리밍 상위 오류 응답 데이터:`, axiosError.response.data);

          // 422 에러 특수 처리
          if (axiosError.response.status === 422) {
            console.error('[LLMService] 스트리밍 상위 핸들러에서 422 에러 감지 - 최상위 스택 로그');
            console.error('[LLMService] 모델:', options?.model || this.getActiveModel());

            // 메시지 요약 정보
            const messagesSummary = messages.map(m => ({
              role: m.role,
              contentLength: m.content.length,
              contentPreview: m.content.length > 100 ? `${m.content.substring(0, 100)}...` : m.content
            }));
            console.error('[LLMService] 메시지 요약:', JSON.stringify(messagesSummary, null, 2));
          }
        }
      }
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

    console.log("[LLMService] LLM 요청 본문:", JSON.stringify(request, null, 2));
    console.log("[LLMService] 요청 엔드포인트:", endpoint);

    // 메시지 내용 상세 로깅
    if (request.messages && Array.isArray(request.messages)) {
      const messageCount = request.messages.length;
      console.log(`[LLMService] 메시지 개수: ${messageCount}`);

      // 메시지 메모리 사용량 추정을 위한 변수
      let totalChars = 0;
      let totalTokens = 0;
      let largeMessagesCount = 0;

      // 각 메시지 내용 로그
      request.messages.forEach((msg: any, index: number) => {
        const role = msg.role || 'unknown';
        const content = msg.content || '';
        const contentLength = content.length;
        totalChars += contentLength;

        // 대략적인 토큰 추정 (4자당 1토큰으로 가정)
        const estimatedTokens = Math.ceil(contentLength / 4);
        totalTokens += estimatedTokens;

        console.log(`[LLMService] 메시지 #${index} 역할: ${role}`);

        if (contentLength > 500) {
          // 큰 메시지는 앞부분만 로깅
          largeMessagesCount++;
          console.log(`[LLMService] 메시지 #${index} 내용(일부): ${content.substring(0, 500)}...`);
          console.log(`[LLMService] 메시지 #${index} 총 길이: ${contentLength} 자 (추정 토큰: ${estimatedTokens})`);

          // 매우 큰 메시지에 대한 추가 진단
          if (contentLength > 10000) {
            console.log(`[LLMService] 경고: 메시지 #${index}는 매우 큼 (${contentLength} 자) - 토큰 제한 초과 가능성 있음`);

            // 코드 블록 개수 세기 (마크다운 코드 블록은 추가 토큰 소모)
            const codeBlockMatches = content.match(/```[\s\S]*?```/g);
            if (codeBlockMatches && codeBlockMatches.length > 0) {
              console.log(`[LLMService] 메시지 #${index}에 ${codeBlockMatches.length}개의 코드 블록이 포함됨`);

              // 코드 블록 총 길이 계산
              const codeBlocksTotalLength = codeBlockMatches.reduce((total: number, block: string) => total + block.length, 0);
              console.log(`[LLMService] 코드 블록 총 길이: ${codeBlocksTotalLength} 자 (전체 메시지의 ${Math.round(codeBlocksTotalLength / contentLength * 100)}%)`);
            }
          }
        } else {
          // 작은 메시지는 전체 내용 로깅
          console.log(`[LLMService] 메시지 #${index} 내용: ${content}`);
          console.log(`[LLMService] 메시지 #${index} 총 길이: ${contentLength} 자 (추정 토큰: ${estimatedTokens})`);
        }
      });

      // 메시지 통계 요약
      console.log(`[LLMService] 메시지 통계 요약:`);
      console.log(`[LLMService] - 총 메시지 수: ${messageCount}`);
      console.log(`[LLMService] - 큰 메시지(500자 초과) 수: ${largeMessagesCount}`);
      console.log(`[LLMService] - 총 문자 수: ${totalChars} 자`);
      console.log(`[LLMService] - 추정 총 토큰 수: ${totalTokens} 토큰`);

      // 토큰 한도 경고
      const modelName = model || this.getActiveModel();
      if (totalTokens > 15000) {
        console.warn(`[LLMService] 경고: 추정 총 토큰 수(${totalTokens})가 많습니다. 모델(${modelName})의 토큰 제한을 초과할 수 있습니다.`);
      }

      // 요청 JSON 크기
      const requestSize = JSON.stringify(request).length;
      console.log(`[LLMService] 전체 요청 JSON 크기: ${requestSize} 바이트`);
      if (requestSize > 1000000) {
        console.warn(`[LLMService] 경고: 요청 크기가 1MB를 초과합니다 (${Math.round(requestSize/1024/1024*100)/100}MB)`);
      }
    }

    // 요청 설정
    const axiosConfig: any = { headers };

    // 내부망 모델인 경우 특수 설정 적용
    if (isInternalModel(model)) {
      console.log(`[LLMService] 내부망 모델(${model}) 요청: 내부망 설정 적용`);

      // 프록시 무시
      console.log(`[LLMService] 프록시 설정 무시`);
      axiosConfig.proxy = false;

      // SSL 검증 비활성화
      console.log(`[LLMService] SSL 인증서 검증 비활성화`);
      axiosConfig.httpsAgent = new https.Agent({ rejectUnauthorized: false });

      // 타임아웃 연장 (60초)
      console.log(`[LLMService] 타임아웃 설정: 60초`);
      axiosConfig.timeout = 60000;

      // 최대 컨텐츠 길이 증가
      axiosConfig.maxContentLength = 50 * 1024 * 1024; // 50MB

      // 최대 본문 길이 증가
      axiosConfig.maxBodyLength = 50 * 1024 * 1024; // 50MB
    }

    console.log("[LLMService] HTTP 요청 세부정보:");
    console.log(`[LLMService] - URL: ${endpoint}`);
    console.log(`[LLMService] - 메서드: POST`);
    console.log(`[LLMService] - 헤더:`, headers);
    console.log(`[LLMService] - 설정:`, JSON.stringify(axiosConfig, (key, value) => {
      // httpsAgent 객체는 직렬화 불가능하므로 분리하여 로깅
      if (key === 'httpsAgent') return value ? 'SSL Agent (rejectUnauthorized: false)' : undefined;
      return value;
    }, 2));

    try {
      console.log("[LLMService] 요청 전송 중...");
      const response = await axios.post(endpoint, request, axiosConfig);
      console.log("[LLMService] 응답 성공:", response.status, response.statusText);
      console.log("[LLMService] 응답 헤더:", response.headers);
      console.log("[LLMService] 응답 데이터:", JSON.stringify(response.data, null, 2));
      return this._processHttpResponse(response.data);
    } catch (error: any) {
      // axios 오류 상세 로깅
      console.error("[LLMService] HTTP 요청 실패:");
      if (error.response) {
        // 서버가 응답을 반환했지만 상태 코드가 2xx 범위를 벗어남
        console.error(`[LLMService] 상태 코드: ${error.response.status}`);
        console.error(`[LLMService] 응답 데이터:`, error.response.data);
        console.error(`[LLMService] 응답 헤더:`, error.response.headers);

        // 422 에러 특수 처리 (Unprocessable Entity)
        if (error.response.status === 422) {
          console.error('[LLMService] 422 에러 감지 (Unprocessable Entity) - 잘못된 요청 형식 또는 유효성 검사 실패');

          // 요청 내용 자세히 로깅
          console.error('[LLMService] 422 에러 발생한 요청 본문:', JSON.stringify(request, null, 2));

          // 모델별 특화 진단 정보
          if (isInternalModel(model)) {
            if (model === LLMModel.NARRANS) {
              console.error('[LLMService] Narrans 모델 422 오류 - 가능한 원인:');
              console.error('  1. 메시지 형식 오류 (누락된 필드 또는 잘못된 타입)');
              console.error('  2. 메시지 내용이 너무 긺 (메시지당 최대 토큰 수 초과)');
              console.error('  3. 요청 헤더 인증 오류 (Authorization 토큰 문제)');

              // 메시지 길이 분석
              if (request.messages && Array.isArray(request.messages)) {
                let totalChars = 0;
                request.messages.forEach((msg: any, idx: number) => {
                  const contentLength = msg.content ? msg.content.length : 0;
                  totalChars += contentLength;
                  if (contentLength > 10000) {
                    console.error(`[LLMService] 메시지 #${idx}의 길이가 매우 깁니다: ${contentLength} 자 (10,000자 초과)`);
                  }
                });
                console.error(`[LLMService] 총 메시지 길이: ${totalChars} 자 (대략 ${Math.round(totalChars/4)} 토큰)`);
              }
            } else if (model === LLMModel.LLAMA4_SCOUT || model === LLMModel.LLAMA4_MAVERICK) {
              console.error('[LLMService] LLAMA4 모델 422 오류 - 가능한 원인:');
              console.error('  1. x-dep-ticket 인증 오류');
              console.error('  2. 요청 본문 형식 불일치');
              console.error('  3. 모델 이름 형식 오류 (전체 모델 경로가 필요할 수 있음)');
              console.error('  4. 메시지 토큰 수 초과');

              // 메시지 내용 분석
              if (request.messages && Array.isArray(request.messages)) {
                const systemMessages = request.messages.filter((m: any) => m.role === 'system');
                console.error(`[LLMService] 시스템 메시지 수: ${systemMessages.length}`);

                // 시스템 메시지가 여러 개인 경우 문제가 될 수 있음
                if (systemMessages.length > 1) {
                  console.error('[LLMService] 경고: 여러 개의 시스템 메시지가 있습니다. LLAMA4 모델은 하나의 시스템 메시지만 지원할 수 있습니다.');
                }
              }
            }
          } else {
            console.error('[LLMService] 외부 API 422 오류 - 가능한 원인:');
            console.error('  1. 모델 이름 오류 또는 지원되지 않는 모델');
            console.error('  2. 메시지 형식 오류');
            console.error('  3. 인증 오류 (API 키)');
          }
        }
      } else if (error.request) {
        // 요청이 전송되었지만 응답이 없음
        console.error('[LLMService] 응답이 수신되지 않음. 네트워크나 CORS 이슈 가능성');
        console.error('[LLMService] 요청 세부 정보:', error.request);

        if (isInternalModel(model)) {
          console.error('[LLMService] 내부망 모델 연결 실패 - 가능한 원인:');
          console.error('  1. 내부망 연결 문제 - 프록시 설정 확인 필요');
          console.error('  2. API 엔드포인트 URL 오류');
          console.error('  3. SSL 인증 오류 - 인증서 검증 문제');
          console.error('  4. 네트워크 타임아웃 - 서버 접근성 문제');
        }
      } else {
        // 요청 설정 중 오류 발생
        console.error('[LLMService] 요청 설정 오류:', error.message);
      }
      // 오류 스택 트레이스 출력
      if (error.stack) {
        console.error('[LLMService] 스택 트레이스:', error.stack);
      }
      throw error; // 오류를 다시 던져서 상위 핸들러에서 처리
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
      console.log("[LLMService] 스트리밍 요청 세부 정보:");
      console.log(`[LLMService] - 요청 본문:`, JSON.stringify(request, null, 2));
      console.log(`[LLMService] - 엔드포인트: ${endpoint}`);

      // 메시지 내용 상세 로깅
      if (request.messages && Array.isArray(request.messages)) {
        const messageCount = request.messages.length;
        console.log(`[LLMService] 스트리밍 메시지 개수: ${messageCount}`);

        // 메시지 메모리 사용량 추정을 위한 변수
        let totalChars = 0;
        let totalTokens = 0;
        let largeMessagesCount = 0;

        // 각 메시지 내용 로그
        request.messages.forEach((msg: any, index: number) => {
          const role = msg.role || 'unknown';
          const content = msg.content || '';
          const contentLength = content.length;
          totalChars += contentLength;

          // 대략적인 토큰 추정 (4자당 1토큰으로 가정)
          const estimatedTokens = Math.ceil(contentLength / 4);
          totalTokens += estimatedTokens;

          console.log(`[LLMService] 스트리밍 메시지 #${index} 역할: ${role}`);

          if (contentLength > 500) {
            // 큰 메시지는 앞부분만 로깅
            largeMessagesCount++;
            console.log(`[LLMService] 스트리밍 메시지 #${index} 내용(일부): ${content.substring(0, 500)}...`);
            console.log(`[LLMService] 스트리밍 메시지 #${index} 총 길이: ${contentLength} 자 (추정 토큰: ${estimatedTokens})`);

            // 매우 큰 메시지에 대한 추가 진단
            if (contentLength > 10000) {
              console.log(`[LLMService] 경고: 스트리밍 메시지 #${index}는 매우 큼 (${contentLength} 자) - 토큰 제한 초과 가능성 있음`);

              // 코드 블록 개수 세기 (마크다운 코드 블록은 추가 토큰 소모)
              const codeBlockMatches = content.match(/```[\s\S]*?```/g);
              if (codeBlockMatches && codeBlockMatches.length > 0) {
                console.log(`[LLMService] 스트리밍 메시지 #${index}에 ${codeBlockMatches.length}개의 코드 블록이 포함됨`);

                // 코드 블록 총 길이 계산
                const codeBlocksTotalLength = codeBlockMatches.reduce((total: number, block: string) => total + block.length, 0);
                console.log(`[LLMService] 코드 블록 총 길이: ${codeBlocksTotalLength} 자 (전체 메시지의 ${Math.round(codeBlocksTotalLength / contentLength * 100)}%)`);
              }
            }
          } else {
            // 작은 메시지는 전체 내용 로깅
            console.log(`[LLMService] 스트리밍 메시지 #${index} 내용: ${content}`);
            console.log(`[LLMService] 스트리밍 메시지 #${index} 총 길이: ${contentLength} 자 (추정 토큰: ${estimatedTokens})`);
          }
        });

        // 메시지 통계 요약
        console.log(`[LLMService] 스트리밍 메시지 통계 요약:`);
        console.log(`[LLMService] - 총 메시지 수: ${messageCount}`);
        console.log(`[LLMService] - 큰 메시지(500자 초과) 수: ${largeMessagesCount}`);
        console.log(`[LLMService] - 총 문자 수: ${totalChars} 자`);
        console.log(`[LLMService] - 추정 총 토큰 수: ${totalTokens} 토큰`);

        // 토큰 한도 경고
        const modelName = model || this.getActiveModel();
        if (totalTokens > 15000) {
          console.warn(`[LLMService] 경고: 스트리밍 추정 총 토큰 수(${totalTokens})가 많습니다. 모델(${modelName})의 토큰 제한을 초과할 수 있습니다.`);
        }

        // 요청 JSON 크기
        const requestSize = JSON.stringify(request).length;
        console.log(`[LLMService] 전체 스트리밍 요청 JSON 크기: ${requestSize} 바이트`);
        if (requestSize > 1000000) {
          console.warn(`[LLMService] 경고: 스트리밍 요청 크기가 1MB를 초과합니다 (${Math.round(requestSize/1024/1024*100)/100}MB)`);
        }
      }

      // 내부망 모델의 경우 요청 분석 추가
      if (isInternalModel(model)) {
        const modelType = model === LLMModel.NARRANS ? 'Narrans' :
                          model === LLMModel.LLAMA4_SCOUT ? 'LLAMA4_SCOUT' : 'LLAMA4_MAVERICK';
        console.log(`[LLMService] 내부망 모델 ${modelType} 스트리밍 요청 분석:`);
        console.log(`[LLMService] - 현재 타임스탬프: ${new Date().toISOString()}`);
        console.log(`[LLMService] - 요청 ID: ${requestId}`);
        console.log(`[LLMService] - 총 메시지 토큰 수 추정: ${JSON.stringify(request).length / 4} 토큰`);
      }

      // 스트리밍 요청 설정
      const axiosConfig: any = {
        responseType: 'stream',
        cancelToken: this._cancelTokenSource.token,
        headers: headers
      };

      // 내부망 모델인 경우 특수 설정 적용
      if (isInternalModel(model)) {
        console.log(`[LLMService] 내부망 모델(${model}) 스트리밍 요청: 내부망 설정 적용`);

        // 프록시 무시
        console.log(`[LLMService] 프록시 설정 무시`);
        axiosConfig.proxy = false;

        // SSL 검증 비활성화
        console.log(`[LLMService] SSL 인증서 검증 비활성화`);
        axiosConfig.httpsAgent = new https.Agent({ rejectUnauthorized: false });

        // 타임아웃 연장 (5분)
        console.log(`[LLMService] 타임아웃 설정: 300초`);
        axiosConfig.timeout = 300000;

        // 최대 컨텐츠 길이 증가
        axiosConfig.maxContentLength = 100 * 1024 * 1024; // 100MB

        // 최대 본문 길이 증가
        axiosConfig.maxBodyLength = 50 * 1024 * 1024; // 50MB
      }

      console.log(`[LLMService] - 헤더:`, headers);
      console.log(`[LLMService] - 설정:`, JSON.stringify(axiosConfig, (key, value) => {
        // httpsAgent 객체는 직렬화 불가능하므로 분리하여 로깅
        if (key === 'httpsAgent') return value ? 'SSL Agent (rejectUnauthorized: false)' : undefined;
        if (key === 'cancelToken') return value ? 'CancelToken (present)' : undefined;
        return value;
      }, 2));

      console.log("[LLMService] 스트리밍 요청 전송 중...");
      const response = await axios.post(endpoint, request, axiosConfig);
      console.log("[LLMService] 스트리밍 응답 연결 성공:", response.status, response.statusText);

      response.data.on('data', (chunk: Buffer) => {
        const chunkStr = chunk.toString();
        console.log(`[LLMService] 스트리밍 청크 수신 (${chunkStr.length} 바이트)`);

        const lines = chunkStr.split('\n').filter(Boolean);
        console.log(`[LLMService] 청크 내 라인 수: ${lines.length}`);

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            console.log(`[LLMService] 데이터 라인 발견: ${line.substring(0, 50)}${line.length > 50 ? '...' : ''}`);
            const data = line.substring('data: '.length);

            if (data === '[DONE]') {
              console.log(`[LLMService] 스트림 완료 신호 ([DONE]) 수신`);
              streamCallback('', true, 200); // 스트림 완료 신호
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
                    console.warn('[LLMService] 잘린 JSON 문자열 감지, 복구 시도 중');
                    console.warn('[LLMService] 원본 데이터:', validData);
                    // 닫는 큰따옴표와 괄호들 추가
                    validData = validData + '"}}}';
                    console.warn('[LLMService] 수정된 데이터:', validData);
                  }
                }

                console.log(`[LLMService] JSON 파싱 시도 중...`);
                const parsed = JSON.parse(validData);
                console.log(`[LLMService] JSON 파싱 성공`);

                // 내부망 API의 응답 형식은 표준 OpenAI와 다를 수 있으므로 분기 처리
                if (isInternalModel(model)) {
                  // 내부망 모델의 스트리밍 응답 처리
                  console.log(`[LLMService] 내부망 모델 응답 처리 중`);
                  const content = parsed.choices?.[0]?.delta?.content ||
                                 parsed.choices?.[0]?.message?.content ||
                                 parsed.delta?.content ||
                                 parsed.content ||
                                 '';
                  if (content) {
                    console.log(`[LLMService] 콘텐츠 발견 (${content.length} 글자)`);
                    streamCallback(content, false, 200);
                  } else {
                    console.log(`[LLMService] 콘텐츠 없음, 응답 구조:`, Object.keys(parsed));
                  }
                } else {
                  // 표준 OpenAI 형식의 스트리밍 응답 처리
                  console.log(`[LLMService] 표준 OpenAI 형식 응답 처리 중`);
                  if (parsed.choices && parsed.choices.length > 0) {
                    const content = parsed.choices[0].delta?.content ||
                                  parsed.choices[0].message?.content || '';
                    if (content) {
                      console.log(`[LLMService] 콘텐츠 발견 (${content.length} 글자)`);
                      streamCallback(content, false, 200);
                    } else {
                      console.log(`[LLMService] 콘텐츠 없음, choices 구조:`, parsed.choices[0]);
                    }
                  } else {
                    console.log(`[LLMService] choices 배열 없음, 응답 구조:`, Object.keys(parsed));
                  }
                }
              } catch (err) {
                console.error('[LLMService] 스트림 파싱 오류:', err);
                console.error('[LLMService] 문제가 된 데이터:', data);
                if (err instanceof Error) {
                  console.error('[LLMService] 오류 상세:', err.message, err.stack);
                }
              }
            }
          } else {
            console.log(`[LLMService] 데이터 라인 아님:`, line);
          }
        }
      });

      response.data.on('end', () => {
        this._cancelTokenSource = null;
        console.log('[LLMService] 스트림 데이터 수신 완료');
        streamCallback('', true, 200); // 스트림 완료 신호
      });

      response.data.on('error', (err: Error) => {
        this._cancelTokenSource = null;
        console.error('[LLMService] 스트림 오류:', err);
        console.error('[LLMService] 스트림 오류 메시지:', err.message);
        console.error('[LLMService] 스트림 오류 스택:', err.stack);
        // 오류가 발생해도 클라이언트에게 스트림 완료 신호 전송
        streamCallback('\n\n[연결 오류가 발생했습니다. 다시 시도해주세요.]', true, 500);
      });
    } catch (error: any) {
      this._cancelTokenSource = null;
      if (axios.isCancel(error)) {
        // Request was canceled intentionally
        console.log('[LLMService] 스트리밍 요청이 취소되었습니다.');
        streamCallback('', true, 499); // Signal completion with empty chunk and done=true, status 499 (Client Closed Request)
      } else {
        // 스트리밍 오류 상세 로깅
        console.error("[LLMService] 스트리밍 HTTP 요청 실패:");
        if (error.response) {
          // 서버가 응답을 반환했지만 상태 코드가 2xx 범위를 벗어남
          console.error(`[LLMService] 스트리밍 상태 코드: ${error.response.status}`);
          console.error(`[LLMService] 스트리밍 응답 데이터:`, error.response.data);
          console.error(`[LLMService] 스트리밍 응답 헤더:`, error.response.headers);

          // 422 에러 특수 처리 (Unprocessable Entity)
          if (error.response.status === 422) {
            console.error('[LLMService] 스트리밍 422 에러 감지 (Unprocessable Entity) - 잘못된 요청 형식 또는 유효성 검사 실패');

            // 요청 내용 자세히 로깅
            console.error('[LLMService] 스트리밍 422 에러 발생한 요청 본문:', JSON.stringify(request, null, 2));

            // 모델별 특화 진단 정보
            if (isInternalModel(model)) {
              if (model === LLMModel.NARRANS) {
                console.error('[LLMService] Narrans 스트리밍 422 오류 - 가능한 원인:');
                console.error('  1. 스트리밍 메시지 형식 오류 (누락된 필드 또는 잘못된 타입)');
                console.error('  2. 메시지 내용이 너무 긺 (메시지당 최대 토큰 수 초과)');
                console.error('  3. Accept 헤더 형식 오류 (text/event-stream 누락)');
                console.error('  4. 요청 헤더 인증 오류 (Authorization 토큰 문제)');

                // 메시지 길이 분석
                if (request.messages && Array.isArray(request.messages)) {
                  let totalChars = 0;
                  request.messages.forEach((msg: any, idx: number) => {
                    const contentLength = msg.content ? msg.content.length : 0;
                    totalChars += contentLength;
                    if (contentLength > 10000) {
                      console.error(`[LLMService] 스트리밍 메시지 #${idx}의 길이가 매우 깁니다: ${contentLength} 자 (10,000자 초과)`);
                    }
                  });
                  console.error(`[LLMService] 스트리밍 총 메시지 길이: ${totalChars} 자 (대략 ${Math.round(totalChars/4)} 토큰)`);
                }
              } else if (model === LLMModel.LLAMA4_SCOUT || model === LLMModel.LLAMA4_MAVERICK) {
                console.error('[LLMService] LLAMA4 스트리밍 422 오류 - 가능한 원인:');
                console.error('  1. x-dep-ticket 인증 오류');
                console.error('  2. Accept 헤더 형식 오류 (text/event-stream 누락)');
                console.error('  3. 요청 본문 형식 불일치');
                console.error('  4. 모델 이름 형식 오류 (전체 모델 경로가 필요할 수 있음)');
                console.error('  5. 메시지 토큰 수 초과');

                // 메시지 내용 분석
                if (request.messages && Array.isArray(request.messages)) {
                  const systemMessages = request.messages.filter((m: any) => m.role === 'system');
                  console.error(`[LLMService] 스트리밍 시스템 메시지 수: ${systemMessages.length}`);

                  // 시스템 메시지가 여러 개인 경우 문제가 될 수 있음
                  if (systemMessages.length > 1) {
                    console.error('[LLMService] 경고: 여러 개의 시스템 메시지가 있습니다. LLAMA4 모델은 하나의 시스템 메시지만 지원할 수 있습니다.');
                  }
                }
              }
            } else {
              console.error('[LLMService] 외부 API 스트리밍 422 오류 - 가능한 원인:');
              console.error('  1. 모델 이름 오류 또는 지원되지 않는 모델');
              console.error('  2. 메시지 형식 오류');
              console.error('  3. 인증 오류 (API 키)');
              console.error('  4. Accept 헤더 형식 오류');
            }
          }
        } else if (error.request) {
          // 요청이 전송되었지만 응답이 없음
          console.error('[LLMService] 스트리밍 응답이 수신되지 않음. 네트워크나 CORS 이슈 가능성');
          console.error('[LLMService] 스트리밍 요청 세부 정보:', error.request);

          if (isInternalModel(model)) {
            console.error('[LLMService] 내부망 모델 스트리밍 연결 실패 - 가능한 원인:');
            console.error('  1. 내부망 연결 문제 - 프록시 설정 확인 필요');
            console.error('  2. API 엔드포인트 URL 오류');
            console.error('  3. SSL 인증 오류 - 인증서 검증 문제');
            console.error('  4. 네트워크 타임아웃 - 서버 접근성 문제');
          }
        } else {
          // 요청 설정 중 오류 발생
          console.error('[LLMService] 스트리밍 요청 설정 오류:', error.message);
        }
        // 오류 스택 트레이스 출력
        if (error.stack) {
          console.error('[LLMService] 스트리밍 스택 트레이스:', error.stack);
        }

        // 사용자에게 오류 메시지 전송 - 오류 코드도 함께 전달
        streamCallback('\n\n[API 연결 오류: 서버 응답 오류가 발생했습니다. 메시지 형식이나 크기를 확인해주세요.]', true, error.response ? error.response.status : 0);
        throw error; // 오류를 다시 던져서 상위 핸들러에서 처리
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
              streamCallback(response.content || '', false, 200);
            } else if (response.type === 'complete') {
              // Stream complete
              if (this._wsConnection) {
                this._wsConnection.removeListener('message', messageHandler);
              }
              streamCallback('', true, 200); // Signal completion
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