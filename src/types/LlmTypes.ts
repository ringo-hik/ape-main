/**
 * LLM 메시지 역할
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * 채팅 메시지 인터페이스
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
}

/**
 * 모델 제공자 타입
 */
export type ModelProvider = 'openai' | 'anthropic' | 'ollama' | 'azure' | 'openrouter' | 'local';

/**
 * 모델 설정 인터페이스
 */
export interface ModelConfig {
  name: string;
  provider: ModelProvider;
  apiKey?: string;
  apiUrl?: string;
  contextWindow?: number;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

/**
 * LLM 요청 옵션
 */
export interface LlmRequestOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  onUpdate?: (chunk: string) => void;
}

/**
 * LLM 응답 인터페이스
 */
export interface LlmResponse {
  id: string;
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * API 키 오류 인터페이스
 */
export interface ApiKeyError extends Error {
  code: 'missing_api_key' | 'invalid_api_key';
  model: string;
  provider: ModelProvider;
}