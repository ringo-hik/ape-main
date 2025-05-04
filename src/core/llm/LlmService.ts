import * as vscode from 'vscode';
import { HttpClientService } from '../http/HttpClientService';
import { 
  ChatMessage, 
  LlmRequestOptions, 
  LlmResponse, 
  ModelConfig,
  ModelProvider
} from '../../types/LlmTypes';

/**
 * LLM 서비스 클래스
 * 다양한 제공자의 LLM API와 통신
 */
export class LlmService {
  private httpClient: HttpClientService;
  private models: Map<string, ModelConfig> = new Map();
  private defaultModel: string = 'gemini-2.5-flash'; // 기본 모델을 Google Gemini 2.5 Flash로 변경
  private idCounter: number = 0;
  
  constructor() {
    this.httpClient = new HttpClientService();
    this.httpClient.setSSLBypass(true);
    
    try {
      // VS Code 설정에서 기본 모델 ID 로드
      const config = vscode.workspace.getConfiguration('axiom.llm');
      this.defaultModel = config.get<string>('defaultModel', 'gemini-2.5-flash');
      
      console.log(`LLM 서비스 초기화: 기본 모델 ID - ${this.defaultModel}`);
      
      // 스트리밍 지원 여부 확인
      const supportsStreaming = config.get<boolean>('supportsStreaming', true);
      console.log(`스트리밍 지원 여부: ${supportsStreaming ? '지원' : '미지원'}`);
      
      // 서비스 환경 로그 (내부망/외부망)
      if (this.canConnectToInternalNetwork()) {
        console.log('내부망 환경으로 감지됨 - 내부 LLM 모델 사용 가능');
      } else {
        console.log('외부망 환경으로 감지됨 - 외부 LLM 모델 (OpenRouter 등) 사용 권장');
      }
      
      this.loadModelsFromConfig();
    } catch (error) {
      console.error('LLM 서비스 초기화 오류:', error);
      this.defaultModel = 'local';
      this.loadModelsFromConfig();
    }
  }
  
  /**
   * 내부망 연결 가능 여부 확인 (간단한 체크)
   * 철칙: 이 코드는 두 환경 모두에서 작동해야 함
   */
  private canConnectToInternalNetwork(): boolean {
    try {
      // 내부망 주소 패턴 체크 (간단한 휴리스틱)
      const modelsConfig = vscode.workspace.getConfiguration('axiom.llm').get<Record<string, ModelConfig>>('models', {});
      
      // 1. 모델 구성에서 내부망 주소 확인
      for (const modelConfig of Object.values(modelsConfig)) {
        // 내부망 도메인 체크
        if (modelConfig.apiUrl && (
            modelConfig.apiUrl.includes('narrans') || 
            modelConfig.apiUrl.includes('api-se-dev') ||
            modelConfig.apiUrl.includes('apigw-stg'))) {
          
          // 2. 내부망 체크를 위한 추가 조건 (실제 환경 체크)
          if (process.platform === 'win32') {
            // Windows 환경에서는 내부망일 가능성이 높음
            console.log('Windows 환경에서 실행 중 - 내부망 환경 가정');
            return true;
          } else {
            // WSL/Linux 환경에서는 내부망 테스트
            console.log('WSL/Linux 환경에서 실행 중 - 도메인 체크 필요');
            
            // 여기서는 단순 패턴 체크만 수행 (실제로는 핑이나 요청 테스트 필요)
            // 실시간 연결 체크는 하지 않고, 설정 기반으로 판단
            const forceInternalNetwork = vscode.workspace.getConfiguration('axiom.core').get<boolean>('forceInternalNetwork', false);
            
            if (forceInternalNetwork) {
              console.log('설정에 의해 내부망 모드 강제 적용됨');
              return true;
            }
            
            return false; // 기본적으로 WSL/Linux에서는 외부망으로 가정
          }
        }
      }
      
      // 모델 설정에 내부망 주소가 없으면 외부망으로 간주
      return false;
    } catch (error) {
      console.error('내부망 확인 오류:', error);
      return false;
    }
  }
  
  /**
   * 고유 ID 생성 (uuid 대신 간단한 구현)
   */
  private generateId(): string {
    this.idCounter++;
    return `llm-${Date.now()}-${this.idCounter}`;
  }
  
  /**
   * 설정에서 모델 정보 로드
   */
  private loadModelsFromConfig(): void {
    console.log('LLM 모델 설정 로드 시작');
    const config = vscode.workspace.getConfiguration('axiom.llm');
    const modelConfigs = config.get<Record<string, ModelConfig>>('models', {});
    
    console.log(`설정에서 ${Object.keys(modelConfigs).length}개의 모델 구성 로드됨`);
    
    Object.entries(modelConfigs).forEach(([id, modelConfig]) => {
      console.log(`모델 등록: ${id} (${modelConfig.name})`);
      this.models.set(id, modelConfig);
    });
    
    this.defaultModel = config.get<string>('defaultModel', this.defaultModel);
    console.log(`기본 모델 ID: ${this.defaultModel}`);
    
    // 설정이 없는 경우 기본 모델 등록
    if (this.models.size === 0) {
      console.log('등록된 모델이 없습니다. 기본 모델을 등록합니다.');
      this.registerDefaultModels();
    }
    
    // 모든 등록된 모델 로깅
    console.log('등록된 모든 모델:');
    this.models.forEach((config, id) => {
      console.log(`- ${id}: ${config.name} (${config.provider})`);
    });
    
    console.log('LLM 모델 설정 로드 완료');
  }
  
  /**
   * 기본 모델 등록
   * 철칙: 내부망 모델 설정 및 주소는 절대 수정/삭제 불가
   */
  private registerDefaultModels(): void {
    // 기본 시스템 프롬프트
    const defaultSystemPrompt = '당신은 코딩과 개발을 도와주는 유능한 AI 어시스턴트입니다.';
    
    try {
      // 설정에서 모델 구성 로드
      const config = vscode.workspace.getConfiguration('axiom.llm');
      const modelsConfig = config.get<Record<string, ModelConfig>>('models', {});
      
      console.log(`설정에서 ${Object.keys(modelsConfig).length}개의 모델 구성 로드됨`);
      
      // 환경 체크로 내부망/외부망 감지
      const isInternalNetwork = this.canConnectToInternalNetwork();
      
      // 설정된 모델이 있으면 그것들을 사용
      if (Object.keys(modelsConfig).length > 0) {
        for (const [id, modelConfig] of Object.entries(modelsConfig)) {
          // OpenRouter 모델인 경우 apiModel 필드 추가
          if (modelConfig.provider === 'openrouter') {
            // 이미 apiModel이 있는지 확인
            if (!modelConfig.apiModel) {
              // 모델 이름이 gemini 관련인 경우 apiModel 설정
              if (id.includes('gemini') || modelConfig.name.includes('Gemini')) {
                modelConfig.apiModel = 'google/gemini-2.5-flash-preview';
              }
              // 다른 모델들에 대한 apiModel 매핑 추가 가능
            }
          }
          
          console.log(`모델 등록: ${id} (${modelConfig.name} - ${modelConfig.provider})`);
          this.models.set(id, modelConfig);
        }
      } else {
        // 설정이 없는 경우 기본값 사용 - 철칙: 내부망 모델은 항상 포함해야 함
        console.log('설정된 모델 없음. 기본 모델 등록 (철칙: 내부망 모델은 항상 포함)');
        
        // ===== OpenRouter - Google Gemini 2.5 Flash Preview (외부망 테스트용) =====
        this.models.set('gemini-2.5-flash', {
          name: 'Google Gemini 2.5 Flash',
          provider: 'openrouter',
          apiUrl: 'https://openrouter.ai/api/v1/chat/completions',
          contextWindow: 32000,
          maxTokens: 8192,
          temperature: 0.7,
          systemPrompt: defaultSystemPrompt,
          apiModel: 'google/gemini-2.5-flash-preview' // API 요청 시 사용할 정확한 모델 ID
        });
        
        // ===== NARRANS (내부망 기본 모델) - 철칙: 절대 수정/삭제 불가 =====
        this.models.set('narrans', {
          name: 'NARRANS (Default)',
          provider: 'custom',
          apiUrl: 'https://api-se-dev.narrans/v1/chat/completions',
          contextWindow: 10000,
          maxTokens: 10000,
          temperature: 0,
          systemPrompt: defaultSystemPrompt
        });
        
        // ===== Llama 4 Maverick (내부망 모델) - 철칙: 절대 수정/삭제 불가 =====
        this.models.set('llama-4-maverick', {
          name: 'Llama 4 Maverick',
          provider: 'custom',
          apiUrl: 'http://apigw-stg:8000/llama4/1/llama/aiserving/llama-4/maverick/v1/chat/completions',
          contextWindow: 50000,
          maxTokens: 50000,
          temperature: 0,
          systemPrompt: defaultSystemPrompt
        });
        
        // ===== 로컬 시뮬레이션 모델 (API 키/연결 없이 사용 가능) =====
        this.models.set('local', {
          name: '로컬 시뮬레이션 (오프라인)',
          provider: 'local',
          temperature: 0.7,
          systemPrompt: defaultSystemPrompt
        });
      }
      
      // 환경에 따른 기본 모델 설정 조정 (내부망의 경우)
      if (isInternalNetwork) {
        // 내부망일 경우 narrans로 기본 모델 변경
        if (this.models.has('narrans')) {
          console.log('내부망 환경 감지됨: 기본 모델을 narrans로 자동 설정');
          this.defaultModel = 'narrans';
        }
      }
      
      // 등록된 모든 모델 수 로깅
      console.log(`총 ${this.models.size}개의 모델이 등록되었습니다.`);
      for (const [id, model] of this.models.entries()) {
        console.log(`- ${id}: ${model.name} (${model.provider})`);
      }
    } catch (error) {
      console.error('모델 로딩 중 오류 발생:', error);
      
      // 오류 발생 시 기본 모델만 등록
      this.models.set('local', {
        name: '로컬 시뮬레이션 (오프라인 - 오류 복구)',
        provider: 'local',
        temperature: 0.7,
        systemPrompt: defaultSystemPrompt
      });
      
      console.log('오류로 인해 로컬 시뮬레이션 모델만 등록됨');
    }
  }
  
  /**
   * LLM API로 요청 전송
   */
  public async sendRequest(options: LlmRequestOptions): Promise<LlmResponse> {
    const { model = this.defaultModel, messages = [], temperature, maxTokens, stream, onUpdate } = options;
    
    // 메시지 배열이 유효한지 확인
    if (!Array.isArray(messages)) {
      console.error('sendRequest: messages is not an array:', messages);
      throw new Error('요청 메시지가 유효하지 않습니다.');
    }
    
    // 메시지가 비어있는 경우 기본 메시지 추가
    if (messages.length === 0) {
      console.warn('sendRequest: empty messages array, adding default message');
      messages.push({
        role: 'user',
        content: '안녕하세요'
      });
    }
    
    console.log(`sendRequest: 요청 모델 ID - '${model}'`);
    console.log(`sendRequest: 등록된 모델 목록 - ${Array.from(this.models.keys()).join(', ')}`);
    
    const modelConfig = this.models.get(model);
    if (!modelConfig) {
      console.error(`sendRequest: model '${model}' not found`);
      // 오류 발생 시 로컬 모델로 대체
      console.log(`sendRequest: 모델을 찾을 수 없어 로컬 시뮬레이션 모델로 대체합니다.`);
      return this.simulateLocalModel({
        name: '임시 대체 모델',
        provider: 'local',
        systemPrompt: '당신은 코딩과 개발을 도와주는 유능한 AI 어시스턴트입니다.'
      }, messages);
    }
    
    // 시스템 프롬프트가 제공되지 않은 경우 기본값 추가
    if (modelConfig.systemPrompt && !messages.some(m => m.role === 'system')) {
      messages.unshift({
        role: 'system',
        content: modelConfig.systemPrompt
      });
    }
    
    console.log('sendRequest: prepared messages:', JSON.stringify(messages));
    
    // API 키가 없을 경우 로컬 시뮤레이션 모드로 전환
    try {
      // 모델 제공자에 따라 적절한 요청 생성 및 전송
      switch (modelConfig.provider) {
        case 'openai':
          return this.sendOpenAIRequest(modelConfig, messages, temperature, maxTokens, stream, onUpdate);
        case 'anthropic':
          return this.sendAnthropicRequest(modelConfig, messages, temperature, maxTokens, stream, onUpdate);
        case 'ollama':
          return this.sendOllamaRequest(modelConfig, messages, temperature, maxTokens, stream, onUpdate);
        case 'azure':
          return this.sendAzureOpenAIRequest(modelConfig, messages, temperature, maxTokens, stream, onUpdate);
        case 'openrouter':
          return this.sendOpenRouterRequest(modelConfig, messages, temperature, maxTokens, stream, onUpdate);
        case 'custom':
          return this.sendCustomRequest(modelConfig, messages, temperature, maxTokens, stream, onUpdate);
        case 'local':
          return this.simulateLocalModel(modelConfig, messages);
        default:
          console.warn(`알 수 없는 프로바이더: ${modelConfig.provider}, 로컬 시뮤레이션으로 전환합니다.`);
          return this.simulateLocalModel(modelConfig, messages);
      }
    } catch (error: any) {
      // API 키 오류인 경우 로컬 시뮤레이션으로 대체
      if (error.code === 'missing_api_key' || error.code === 'invalid_api_key') {
        console.warn(`API 키 오류로 인해 로컬 시뮤레이션으로 전환: ${error.message}`);
        return this.simulateLocalModel(modelConfig, messages);
      }
      throw error;
    }
  }
  
  /**
   * OpenAI API 요청
   */
  private async sendOpenAIRequest(
    modelConfig: ModelConfig, 
    messages: ChatMessage[], 
    temperature?: number, 
    maxTokens?: number,
    stream?: boolean,
    onUpdate?: (chunk: string) => void
  ): Promise<LlmResponse> {
    const apiKey = modelConfig.apiKey || this.getApiKey('openai');
    if (!apiKey) {
      throw this.createApiKeyError('missing_api_key', modelConfig.name, 'openai');
    }
    
    const apiUrl = modelConfig.apiUrl || 'https://api.openai.com/v1/chat/completions';
    
    try {
      const response = await this.httpClient.post(
        apiUrl,
        {
          model: modelConfig.name,
          messages,
          temperature: temperature ?? modelConfig.temperature ?? 0.7,
          max_tokens: maxTokens ?? modelConfig.maxTokens,
          stream: !!stream
        },
        {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      );
      
      if (stream && onUpdate) {
        // 스트리밍 처리 로직 (실제 구현 필요)
        return {
          id: this.generateId(),
          content: '스트리밍 응답이 진행 중입니다.',
          model: modelConfig.name
        };
      }
      
      // 응답 처리
      return {
        id: response.data.id || this.generateId(),
        content: response.data.choices[0].message.content,
        model: modelConfig.name,
        usage: {
          promptTokens: response.data.usage?.prompt_tokens || 0,
          completionTokens: response.data.usage?.completion_tokens || 0,
          totalTokens: response.data.usage?.total_tokens || 0
        }
      };
    } catch (error) {
      console.error('OpenAI API 요청 오류:', error);
      throw error;
    }
  }
  
  /**
   * Anthropic API 요청
   */
  private async sendAnthropicRequest(
    modelConfig: ModelConfig, 
    messages: ChatMessage[], 
    temperature?: number, 
    maxTokens?: number,
    stream?: boolean,
    onUpdate?: (chunk: string) => void
  ): Promise<LlmResponse> {
    const apiKey = modelConfig.apiKey || this.getApiKey('anthropic');
    if (!apiKey) {
      throw this.createApiKeyError('missing_api_key', modelConfig.name, 'anthropic');
    }
    
    const apiUrl = modelConfig.apiUrl || 'https://api.anthropic.com/v1/messages';
    
    try {
      const response = await this.httpClient.post(
        apiUrl,
        {
          model: modelConfig.name,
          messages,
          max_tokens: maxTokens ?? modelConfig.maxTokens ?? 1024,
          temperature: temperature ?? modelConfig.temperature ?? 0.7,
          stream: !!stream
        },
        {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        }
      );
      
      if (stream && onUpdate) {
        // 스트리밍 처리 로직 (실제 구현 필요)
        return {
          id: this.generateId(),
          content: '스트리밍 응답이 진행 중입니다.',
          model: modelConfig.name
        };
      }
      
      // 응답 처리
      return {
        id: response.data.id || this.generateId(),
        content: response.data.content?.[0]?.text || '',
        model: modelConfig.name,
        usage: {
          promptTokens: 0, // Anthropic API는 토큰 사용량을 제공하지 않음
          completionTokens: 0,
          totalTokens: 0
        }
      };
    } catch (error) {
      console.error('Anthropic API 요청 오류:', error);
      throw error;
    }
  }
  
  /**
   * Ollama API 요청
   */
  private async sendOllamaRequest(
    modelConfig: ModelConfig, 
    messages: ChatMessage[], 
    temperature?: number, 
    maxTokens?: number,
    stream?: boolean,
    onUpdate?: (chunk: string) => void
  ): Promise<LlmResponse> {
    const apiUrl = modelConfig.apiUrl || 'http://localhost:11434/api/chat';
    
    try {
      const response = await this.httpClient.post(
        apiUrl,
        {
          model: modelConfig.name,
          messages,
          temperature: temperature ?? modelConfig.temperature ?? 0.7,
          max_tokens: maxTokens ?? modelConfig.maxTokens,
          stream: !!stream
        }
      );
      
      // 응답 처리
      return {
        id: this.generateId(),
        content: response.data.message?.content || '',
        model: modelConfig.name
      };
    } catch (error) {
      console.error('Ollama API 요청 오류:', error);
      throw error;
    }
  }
  
  /**
   * Azure OpenAI API 요청
   */
  private async sendAzureOpenAIRequest(
    modelConfig: ModelConfig, 
    messages: ChatMessage[], 
    temperature?: number, 
    maxTokens?: number,
    stream?: boolean,
    onUpdate?: (chunk: string) => void
  ): Promise<LlmResponse> {
    const apiKey = modelConfig.apiKey || this.getApiKey('azure');
    if (!apiKey) {
      throw this.createApiKeyError('missing_api_key', modelConfig.name, 'azure');
    }
    
    if (!modelConfig.apiUrl) {
      throw new Error('Azure OpenAI API URL이 지정되지 않았습니다.');
    }
    
    try {
      const response = await this.httpClient.post(
        modelConfig.apiUrl,
        {
          messages,
          temperature: temperature ?? modelConfig.temperature ?? 0.7,
          max_tokens: maxTokens ?? modelConfig.maxTokens,
          stream: !!stream
        },
        {
          'api-key': apiKey,
          'Content-Type': 'application/json'
        }
      );
      
      // 응답 처리
      return {
        id: response.data.id || this.generateId(),
        content: response.data.choices[0].message.content,
        model: modelConfig.name,
        usage: {
          promptTokens: response.data.usage?.prompt_tokens || 0,
          completionTokens: response.data.usage?.completion_tokens || 0,
          totalTokens: response.data.usage?.total_tokens || 0
        }
      };
    } catch (error) {
      console.error('Azure OpenAI API 요청 오류:', error);
      throw error;
    }
  }
  
  /**
   * OpenRouter API 요청
   */
  private async sendOpenRouterRequest(
    modelConfig: ModelConfig, 
    messages: ChatMessage[], 
    temperature?: number, 
    maxTokens?: number,
    stream?: boolean,
    onUpdate?: (chunk: string) => void
  ): Promise<LlmResponse> {
    const apiKey = modelConfig.apiKey || this.getApiKey('openrouter');
    if (!apiKey) {
      throw this.createApiKeyError('missing_api_key', modelConfig.name, 'openrouter');
    }
    
    const apiUrl = modelConfig.apiUrl || 'https://openrouter.ai/api/v1/chat/completions';
    
    try {
      // 요청 모델 설정 (OpenRouter API 모델명 포맷으로 변환)
      // apiModel 속성을 최우선적으로 사용, 항상 설정 파일에서 로드
      let requestModel = modelConfig.apiModel || "google/gemini-2.5-flash-preview";
      
      console.log(`OpenRouter API 요청 - 모델: ${modelConfig.name} → API 요청 모델: ${requestModel}`);
      console.log(`메시지 수: ${messages.length}, 온도: ${temperature ?? modelConfig.temperature ?? 0.7}, 스트리밍: ${stream ? '켜짐' : '꺼짐'}`);
      
      // 스트리밍 모드인 경우
      if (stream && onUpdate) {
        return await this.handleOpenRouterStream(
          apiUrl,
          apiKey,
          modelConfig,
          messages,
          temperature,
          maxTokens,
          onUpdate
        );
      }
      
      // 일반 모드 (비스트리밍)
      console.log('일반 모드(비스트리밍)로 요청 전송');
      
      // SSL 인증서 검증 오류 회피를 위해 fetch API 직접 사용
      const fetchResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/anthropics/claude-code',
          'X-Title': 'Axiom VSCode Extension'
        },
        body: JSON.stringify({
          model: requestModel,
          messages,
          temperature: temperature ?? modelConfig.temperature ?? 0.7,
          max_tokens: maxTokens ?? modelConfig.maxTokens ?? 4096,
          stream: false
        })
      });
      
      if (!fetchResponse.ok) {
        throw new Error(`OpenRouter API 응답 오류: ${fetchResponse.status} ${fetchResponse.statusText}`);
      }
      
      console.log(`OpenRouter API 응답 성공 - 상태 코드: ${fetchResponse.status}`);
      
      const responseData = await fetchResponse.json();
      
      // Headers 객체를 일반 객체로 변환
      const headersObj: Record<string, string> = {};
      fetchResponse.headers.forEach((value, key) => {
        headersObj[key] = value;
      });
      
      const response = {
        data: responseData,
        statusCode: fetchResponse.status,
        headers: headersObj,
        ok: fetchResponse.ok
      };
      
      // 응답 처리
      return {
        id: response.data.id || this.generateId(),
        content: response.data.choices[0].message.content,
        model: modelConfig.name,
        usage: {
          promptTokens: response.data.usage?.prompt_tokens || 0,
          completionTokens: response.data.usage?.completion_tokens || 0,
          totalTokens: response.data.usage?.total_tokens || 0
        }
      };
    } catch (error) {
      console.error('OpenRouter API 요청 오류:', error);
      throw error;
    }
  }
  
  /**
   * OpenRouter 스트리밍 응답 처리
   */
  private async handleOpenRouterStream(
    apiUrl: string,
    apiKey: string,
    modelConfig: ModelConfig,
    messages: ChatMessage[],
    temperature?: number, 
    maxTokens?: number,
    onUpdate: (chunk: string) => void
  ): Promise<LlmResponse> {
    try {
      // 요청 모델 설정 (OpenRouter API 모델명 포맷으로 변환)
      // apiModel 속성을 최우선적으로 사용
      const requestModel = modelConfig.apiModel || "google/gemini-2.5-flash-preview";
      
      console.log(`OpenRouter 스트리밍 요청 - 모델: ${modelConfig.name} → API 요청 모델: ${requestModel}`);
      console.log(`메시지 수: ${messages.length}, 온도: ${temperature ?? modelConfig.temperature ?? 0.7}`);
      
      // 스트리밍 요청 전송
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'HTTP-Referer': 'https://github.com/anthropics/claude-code',
          'X-Title': 'Axiom VSCode Extension'
        },
        body: JSON.stringify({
          model: requestModel,
          messages,
          temperature: temperature ?? modelConfig.temperature ?? 0.7,
          max_tokens: maxTokens ?? modelConfig.maxTokens ?? 4096,
          stream: true
        })
      });
      
      if (!response.ok || !response.body) {
        throw new Error(`OpenRouter 스트리밍 API 응답 오류: ${response.status} ${response.statusText}`);
      }
      
      console.log('OpenRouter 스트리밍 연결 성공 - 응답 처리 시작');
      
      // 응답 ID 및 누적 콘텐츠
      let responseId = this.generateId();
      let accumulatedContent = '';
      
      // 스트림 리더 생성
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      // 스트림 처리
      let done = false;
      let eventCount = 0;
      let contentChunks = 0;
      
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        
        // Server-Sent Events 형식 파싱
        const events = chunk
          .split('\n\n')
          .filter(line => line.trim() !== '' && line.trim() !== 'data: [DONE]');
        
        eventCount += events.length;
        
        for (const event of events) {
          // 'data: ' 접두사 제거 및 JSON 파싱
          if (event.startsWith('data: ')) {
            try {
              const data = JSON.parse(event.slice(6));
              
              if (data.id) {
                responseId = data.id;
              }
              
              // 실제 콘텐츠 추출
              const content = data.choices[0]?.delta?.content || '';
              if (content) {
                accumulatedContent += content;
                onUpdate(content);
                contentChunks++;
                
                // 처음 몇 개의 청크만 로깅
                if (contentChunks <= 3 || contentChunks % 50 === 0) {
                  console.log(`스트리밍 청크 수신 #${contentChunks}: ${content.length > 20 ? content.substring(0, 20) + '...' : content}`);
                }
              }
            } catch (error) {
              console.warn('스트리밍 데이터 파싱 오류:', error);
            }
          }
        }
      }
      
      console.log(`스트리밍 완료 - 총 이벤트: ${eventCount}, 콘텐츠 청크: ${contentChunks}, 응답 길이: ${accumulatedContent.length}자`);
      
      // 완료된 응답 반환
      return {
        id: responseId,
        content: accumulatedContent,
        model: modelConfig.name
      };
    } catch (error) {
      console.error('OpenRouter 스트리밍 오류:', error);
      throw error;
    }
  }
  
  /**
   * Custom API 요청 (Narrans, Llama 등 온프레미스 모델)
   */
  private async sendCustomRequest(
    modelConfig: ModelConfig, 
    messages: ChatMessage[], 
    temperature?: number, 
    maxTokens?: number,
    stream?: boolean,
    onUpdate?: (chunk: string) => void
  ): Promise<LlmResponse> {
    if (!modelConfig.apiUrl) {
      throw new Error(`Custom 모델 ${modelConfig.name}의 API URL이 지정되지 않았습니다.`);
    }
    
    console.log(`Custom API 요청 - 모델: ${modelConfig.name}, API URL: ${modelConfig.apiUrl}`);
    console.log(`메시지 수: ${messages.length}, 온도: ${temperature ?? modelConfig.temperature ?? 0}, 스트리밍: ${stream ? '켜짐' : '꺼짐'}`);
    
    try {
      // 스트리밍 모드인 경우
      if (stream && onUpdate) {
        return await this.handleCustomStream(
          modelConfig,
          messages,
          temperature,
          maxTokens,
          onUpdate
        );
      }
      
      // 일반 모드 (비스트리밍)
      console.log('일반 모드(비스트리밍)로 요청 전송');
      
      // 모델별 특수 헤더 생성
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // API 키 정보 설정
      const apiKey = modelConfig.apiKey || this.getApiKey(modelConfig.provider as ModelProvider);
      
      // 내부망 모델인 Llama나 NARRANS일 경우 특수 헤더 추가
      if (modelConfig.name.includes('Llama') || modelConfig.apiUrl.includes('apigw-stg.samsungds.net')) {
        console.log('Llama 모델 요청을 위한 특수 헤더 추가');
        
        // 고유 ID 생성
        const requestId = this.generateId();
        
        Object.assign(headers, {
          'Send-System-Name': 'swdp',
          'user-id': 'axiom_ext',
          'user-type': 'axiom_ext',
          'Prompt-Msg-Id': requestId,
          'Completion-msg-Id': requestId
        });
        
        // API 키가 있으면 티켓 헤더에 추가
        if (apiKey) {
          headers['x-dep-ticket'] = apiKey;
        }
      } else if (apiKey) {
        // 다른 모델의 경우 일반 인증 헤더 사용
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      
      // 모델 ID 결정 (apiModel이 있으면 그것 사용, 없으면 모델 이름 기반)
      let modelId = modelConfig.apiModel;
      
      // Llama 4 모델 특수 처리
      if (modelConfig.name.includes('Llama 4 Maverick')) {
        modelId = 'meta-llama/llama-4-maverick-17b-128e-instruct';
      } else if (modelConfig.name.includes('Llama 4 Scout')) {
        modelId = 'meta-llama/llama-4-scout-17b-16e-instruct';
      } else if (!modelId) {
        modelId = modelConfig.name.toLowerCase();
      }
      
      console.log(`사용 모델 ID: ${modelId}`);
      
      // SSL 인증서 검증 오류 회피를 위해 fetch API 직접 사용
      const fetchResponse = await fetch(modelConfig.apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: modelId,
          messages,
          temperature: temperature ?? modelConfig.temperature ?? 0,
          max_tokens: maxTokens ?? modelConfig.maxTokens ?? 4096,
          stream: false
        })
      });
      
      if (!fetchResponse.ok) {
        throw new Error(`Custom API 응답 오류: ${fetchResponse.status} ${fetchResponse.statusText}`);
      }
      
      console.log(`Custom API 응답 성공 - 상태 코드: ${fetchResponse.status}`);
      
      const responseData = await fetchResponse.json();
      
      // 응답 처리
      return {
        id: responseData.id || this.generateId(),
        content: responseData.choices[0].message.content,
        model: modelConfig.name,
        usage: responseData.usage ? {
          promptTokens: responseData.usage.prompt_tokens || 0,
          completionTokens: responseData.usage.completion_tokens || 0,
          totalTokens: responseData.usage.total_tokens || 0
        } : undefined
      };
    } catch (error) {
      console.error(`Custom API(${modelConfig.name}) 요청 오류:`, error);
      
      // 오류 발생 시 로컬 시뮤레이션으로 대체
      console.warn(`API 오류로 인해 로컬 시뮤레이션으로 전환: ${error}`);
      return this.simulateLocalModel(modelConfig, messages);
    }
  }
  
  /**
   * Custom 스트리밍 응답 처리
   */
  private async handleCustomStream(
    modelConfig: ModelConfig,
    messages: ChatMessage[],
    temperature?: number, 
    maxTokens?: number,
    onUpdate: (chunk: string) => void
  ): Promise<LlmResponse> {
    try {
      console.log(`Custom 스트리밍 요청 - 모델: ${modelConfig.name}, API URL: ${modelConfig.apiUrl}`);
      
      // 모델별 특수 헤더 생성
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      };
      
      // API 키 정보 설정
      const apiKey = modelConfig.apiKey || this.getApiKey(modelConfig.provider as ModelProvider);
      
      // 내부망 모델인 Llama나 NARRANS일 경우 특수 헤더 추가
      if (modelConfig.name.includes('Llama') || modelConfig.apiUrl.includes('apigw-stg.samsungds.net')) {
        console.log('Llama 모델 스트리밍 요청을 위한 특수 헤더 추가');
        
        // 고유 ID 생성
        const requestId = this.generateId();
        
        Object.assign(headers, {
          'Send-System-Name': 'swdp',
          'user-id': 'axiom_ext',
          'user-type': 'axiom_ext',
          'Prompt-Msg-Id': requestId,
          'Completion-msg-Id': requestId,
          'accept': 'text/event-stream, charset=utf-8'
        });
        
        // API 키가 있으면 티켓 헤더에 추가
        if (apiKey) {
          headers['x-dep-ticket'] = apiKey;
        }
      } else if (apiKey) {
        // 다른 모델의 경우 일반 인증 헤더 사용
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      
      // 모델 ID 결정 (apiModel이 있으면 그것 사용, 없으면 모델 이름 기반)
      let modelId = modelConfig.apiModel;
      
      // Llama 4 모델 특수 처리
      if (modelConfig.name.includes('Llama 4 Maverick')) {
        modelId = 'meta-llama/llama-4-maverick-17b-128e-instruct';
      } else if (modelConfig.name.includes('Llama 4 Scout')) {
        modelId = 'meta-llama/llama-4-scout-17b-16e-instruct';
      } else if (!modelId) {
        modelId = modelConfig.name.toLowerCase();
      }
      
      console.log(`스트리밍 사용 모델 ID: ${modelId}`);
      
      // 스트리밍 요청 전송
      const response = await fetch(modelConfig.apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: modelId,
          messages,
          temperature: temperature ?? modelConfig.temperature ?? 0,
          max_tokens: maxTokens ?? modelConfig.maxTokens ?? 4096,
          stream: true
        })
      });
      
      if (!response.ok || !response.body) {
        throw new Error(`Custom 스트리밍 API 응답 오류: ${response.status} ${response.statusText}`);
      }
      
      console.log('Custom 스트리밍 연결 성공 - 응답 처리 시작');
      
      // 응답 ID 및 누적 콘텐츠
      let responseId = this.generateId();
      let accumulatedContent = '';
      
      // 스트림 리더 생성
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      // 스트림 처리
      let done = false;
      let eventCount = 0;
      let contentChunks = 0;
      
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        
        // Server-Sent Events 형식 파싱
        const events = chunk
          .split('\n\n')
          .filter(line => line.trim() !== '' && line.trim() !== 'data: [DONE]');
        
        eventCount += events.length;
        
        for (const event of events) {
          // 'data: ' 접두사 제거 및 JSON 파싱
          if (event.startsWith('data: ')) {
            try {
              const data = JSON.parse(event.slice(6));
              
              if (data.id) {
                responseId = data.id;
              }
              
              // 실제 콘텐츠 추출
              const content = data.choices[0]?.delta?.content || '';
              if (content) {
                accumulatedContent += content;
                onUpdate(content);
                contentChunks++;
                
                // 처음 몇 개의 청크만 로깅
                if (contentChunks <= 3 || contentChunks % 50 === 0) {
                  console.log(`스트리밍 청크 수신 #${contentChunks}: ${content.length > 20 ? content.substring(0, 20) + '...' : content}`);
                }
              }
            } catch (error) {
              console.warn('스트리밍 데이터 파싱 오류:', error);
            }
          }
        }
      }
      
      console.log(`스트리밍 완료 - 총 이벤트: ${eventCount}, 콘텐츠 청크: ${contentChunks}, 응답 길이: ${accumulatedContent.length}자`);
      
      // 완료된 응답 반환
      return {
        id: responseId,
        content: accumulatedContent,
        model: modelConfig.name
      };
    } catch (error) {
      console.error(`Custom 스트리밍 오류(${modelConfig.name}):`, error);
      
      // 오류 발생 시 로컬 시뮤레이션으로 대체
      console.warn(`API 오류로 인해 로컬 시뮤레이션으로 전환: ${error}`);
      return this.simulateLocalModel(modelConfig, messages);
    }
  }

  /**
   * 로컬 모델 시뮤레이션 (실제 API 호출 없이 데모용)
   */
  private async simulateLocalModel(modelConfig: ModelConfig, messages: ChatMessage[]): Promise<LlmResponse> {
    // 마지막 메시지 추출
    const lastMessage = messages[messages.length - 1];
    
    // 간단한 질의응답 패턴 구현
    let responseText = '';
    
    if (lastMessage.content.match(/안녕|반가워|헬로|하이/i)) {
      responseText = '안녕하세요! 무엇을 도와드릴까요?';
    } 
    else if (lastMessage.content.match(/시간|날짜|오늘|몇 시/i)) {
      responseText = `현재 시간은 ${new Date().toLocaleString()} 입니다.`;
    }
    else if (lastMessage.content.match(/코드|프로그램|개발|버그/i)) {
      responseText = '코드에 대해 질문이 있으신가요? 어떤 부분에서 도움이 필요하신지 자세히 알려주세요.';
    }
    else if (lastMessage.content.match(/도움|도와줘|어떻게|사용법/i)) {
      responseText = '무엇을 도와드릴까요? 더 구체적인 질문을 해주시면 더 정확한 답변을 드릴 수 있습니다.';
    }
    else {
      responseText = `"${lastMessage.content}"에 대한 답변을 찾고 있습니다. 로컬 모델 시뮤레이션 모드에서는 제한된 응답만 제공합니다.`;
    }
    
    // 응답 대기 시간 시뮤레이션
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      id: this.generateId(),
      content: responseText,
      model: modelConfig.name
    };
  }
  
  /**
   * 환경 변수 또는 설정에서 API 키 가져오기
   */
  private getApiKey(provider: ModelProvider): string | undefined {
    const config = vscode.workspace.getConfiguration('axiom.llm');
    return config.get<string>(`${provider}ApiKey`);
  }
  
  /**
   * API 키 오류 생성
   */
  private createApiKeyError(
    code: 'missing_api_key' | 'invalid_api_key', 
    modelName: string, 
    provider: ModelProvider
  ): Error {
    const error = new Error(`${provider} API 키가 필요합니다.`) as any;
    error.code = code;
    error.model = modelName;
    error.provider = provider;
    return error;
  }
  
  /**
   * 사용 가능한 모델 목록 가져오기
   */
  public getAvailableModels(): ModelConfig[] {
    return Array.from(this.models.values());
  }
  
  /**
   * 모델 설정 가져오기
   */
  public getModelConfig(modelId: string): ModelConfig | undefined {
    return this.models.get(modelId);
  }
  
  /**
   * 기본 모델 ID 가져오기
   */
  public getDefaultModelId(): string {
    // 모델이 실제로 등록되어 있는지 확인
    if (!this.models.has(this.defaultModel)) {
      console.warn(`주의: 기본 모델 ID '${this.defaultModel}'가 등록된 모델 목록에 없습니다.`);
      console.log(`등록된 모델 목록: ${Array.from(this.models.keys()).join(', ')}`);
      
      // 대체 모델 사용: 등록된 첫 번째 모델 또는 'local'
      if (this.models.size > 0) {
        const fallbackModel = Array.from(this.models.keys())[0];
        console.log(`대체 모델 ID로 '${fallbackModel}'를 사용합니다.`);
        return fallbackModel;
      } else {
        console.log(`등록된 모델이 없어 'local' 모델을 사용합니다.`);
        // 최후의 수단: local 모델 등록 및 사용
        this.models.set('local', {
          name: '로컬 시뮬레이션 (오프라인)',
          provider: 'local',
          temperature: 0.7,
          systemPrompt: '당신은 코딩과 개발을 도와주는 유능한 AI 어시스턴트입니다.'
        });
        return 'local';
      }
    }
    
    console.log(`현재 기본 모델 ID: ${this.defaultModel}`);
    return this.defaultModel;
  }
}