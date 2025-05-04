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
  private defaultModel: string = 'narrans'; // 기본 모델을 온프레미스 Narrans로 변경
  private idCounter: number = 0;
  
  constructor() {
    this.httpClient = new HttpClientService();
    this.httpClient.setSSLBypass(true);
    this.loadModelsFromConfig();
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
   */
  private registerDefaultModels(): void {
    // 기본 시스템 프롬프트
    const defaultSystemPrompt = '당신은 코딩과 개발을 도와주는 유능한 AI 어시스턴트입니다.';
    
    // ----- OpenRouter 모델들 -----
    
    // OpenRouter - Google Gemini 2.5 Flash Preview 모델 (기본 모델)
    this.models.set('gemini-2.5-flash', {
      name: 'Google Gemini 2.5 Flash Preview',
      provider: 'openrouter',
      apiUrl: 'https://openrouter.ai/api/v1/chat/completions',
      contextWindow: 32000,
      maxTokens: 8192,
      temperature: 0.7,
      systemPrompt: defaultSystemPrompt
    });
    
    // OpenRouter - Claude 3 Opus
    this.models.set('claude-3-opus', {
      name: 'Claude 3 Opus',
      provider: 'openrouter',
      apiUrl: 'https://openrouter.ai/api/v1/chat/completions',
      contextWindow: 200000,
      maxTokens: 4096,
      temperature: 0.7,
      systemPrompt: defaultSystemPrompt
    });
    
    // OpenRouter - Claude 3 Sonnet
    this.models.set('claude-3-sonnet', {
      name: 'Claude 3 Sonnet',
      provider: 'openrouter',
      apiUrl: 'https://openrouter.ai/api/v1/chat/completions',
      contextWindow: 200000,
      maxTokens: 4096,
      temperature: 0.7,
      systemPrompt: defaultSystemPrompt
    });
    
    // OpenRouter - GPT-4o
    this.models.set('gpt-4o', {
      name: 'GPT-4o',
      provider: 'openrouter',
      apiUrl: 'https://openrouter.ai/api/v1/chat/completions',
      contextWindow: 128000,
      maxTokens: 4096,
      temperature: 0.7,
      systemPrompt: defaultSystemPrompt
    });
    
    // ----- 직접 API 연결 모델들 -----
    
    // OpenAI 기본 모델
    this.models.set('gpt-3.5-turbo', {
      name: 'GPT-3.5 Turbo',
      provider: 'openai',
      contextWindow: 16385,
      maxTokens: 4096,
      temperature: 0.7,
      systemPrompt: defaultSystemPrompt
    });
    
    // Anthropic 기본 모델
    this.models.set('claude-3-haiku', {
      name: 'Claude 3 Haiku',
      provider: 'anthropic',
      contextWindow: 200000,
      maxTokens: 4096,
      temperature: 0.7,
      systemPrompt: defaultSystemPrompt
    });
    
    // ----- 로컬 모델들 -----
    
    // Ollama 로컬 모델
    this.models.set('llama3', {
      name: 'Llama 3',
      provider: 'ollama',
      apiUrl: 'http://localhost:11434/api/chat',
      contextWindow: 8192,
      maxTokens: 2048,
      temperature: 0.7,
      systemPrompt: defaultSystemPrompt
    });
    
    // 로컬 시뮤레이션 모델 (API 키 없이 사용 가능)
    this.models.set('local', {
      name: '로컬 시뮤레이션',
      provider: 'local',
      temperature: 0.7,
      systemPrompt: defaultSystemPrompt
    });
    
    console.log(`기본 모델 ${this.models.size}개가 등록되었습니다.`);
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
    
    const modelConfig = this.models.get(model);
    if (!modelConfig) {
      console.error(`sendRequest: model '${model}' not found`);
      throw new Error(`모델 '${model}'을 찾을 수 없습니다.`);
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
      let requestModel: string;
      
      // 모델명에 따른 적절한 API 모델 ID 매핑
      switch (modelConfig.name) {
        case 'Google Gemini 2.5 Flash Preview':
          requestModel = "google/gemini-2.5-flash-preview";
          break;
        case 'Claude 3 Opus':
          requestModel = "anthropic/claude-3-opus";
          break;
        case 'Claude 3 Sonnet':
          requestModel = "anthropic/claude-3-sonnet";
          break;
        case 'GPT-4o':
          requestModel = "openai/gpt-4o";
          break;
        default:
          // 기본적으로 모델 이름을 그대로 사용
          requestModel = modelConfig.name;
      }
      
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
      let requestModel: string;
      
      // 모델명에 따른 적절한 API 모델 ID 매핑
      switch (modelConfig.name) {
        case 'Google Gemini 2.5 Flash Preview':
          requestModel = "google/gemini-2.5-flash-preview";
          break;
        case 'Claude 3 Opus':
          requestModel = "anthropic/claude-3-opus";
          break;
        case 'Claude 3 Sonnet':
          requestModel = "anthropic/claude-3-sonnet";
          break;
        case 'GPT-4o':
          requestModel = "openai/gpt-4o";
          break;
        default:
          // 기본적으로 모델 이름을 그대로 사용
          requestModel = modelConfig.name;
      }
      
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
      
      // SSL 인증서 검증 오류 회피를 위해 fetch API 직접 사용
      const fetchResponse = await fetch(modelConfig.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelConfig.name.toLowerCase(),
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
      
      // 스트리밍 요청 전송
      const response = await fetch(modelConfig.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          model: modelConfig.name.toLowerCase(),
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
    // OpenRouter API 키는 기본값이 설정되어 있음
    if (provider === 'openrouter') {
      return config.get<string>(`${provider}ApiKey`, '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');
    }
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
    return this.defaultModel;
  }
}