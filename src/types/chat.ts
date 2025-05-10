/**
 * Message roles representing different participants in a conversation
 */
export enum MessageRole {
  User = 'user',           // Messages from the user
  Assistant = 'assistant', // Messages from the AI assistant
  System = 'system'        // System messages (e.g., errors, notifications)
}

/**
 * Supported LLM models
 */
export enum LLMModel {
  // OpenAI models (최신 모델들)
  GPT_4_1_MINI = 'openai/gpt-4.1-mini',            // 기본 모델
  GPT_4_1_PREVIEW = 'openai/gpt-4.1-preview',      // 최신 고성능
  GPT_4O = 'openai/gpt-4o',                        // 고성능
  GPT_3_5_TURBO = 'openai/gpt-3.5-turbo',          // 경제적인 모델

  // Anthropic models (Claude 모델들)
  CLAUDE_3_OPUS = 'anthropic/claude-3-opus-20240229',     // 최고 성능 모델
  CLAUDE_3_SONNET = 'anthropic/claude-3-sonnet-20240229', // 균형잡힌 성능
  CLAUDE_3_HAIKU = 'anthropic/claude-3-haiku-20240307',   // 빠른 응답 모델

  // 추가 모델들
  GEMINI_PRO = 'google/gemini-pro',                // Google의 최신 모델
  GEMMA_7B = 'google/gemma-7b-it',                 // 소형 오픈소스 모델
  QWEN_72B = 'qwen/qwen-72b-chat',                 // Alibaba의 고성능 모델
  DEEPSEEK = 'deepseek/deepseek-coder',            // 코딩 특화 모델

  // 무료 모델들
  MISTRAL_7B = 'mistralai/mistral-7b-instruct',    // 무료 오픈소스 모델
  LLAMA3_8B = 'meta-llama/llama-3-8b-instruct',    // 무료 오픈소스 모델

  // 내부망 모델들
  NARRANS = 'narrans',                            // 내부 LLM Narrans 모델
  LLAMA4_SCOUT = 'meta-llama/llama-4-scout-17b-16e-instruct',  // 내부망 Llama-4 Scout 모델
  LLAMA4_MAVERICK = 'meta-llama/llama-4-maverick-17b-128e-instruct'  // 내부망 Llama-4 Maverick 모델
}

/**
 * Represents a chat message
 */
export interface Message {
  /** Unique identifier for the message */
  id: string;
  
  /** Role of the message sender */
  role: MessageRole;
  
  /** Message content */
  content: string;
  
  /** Timestamp when the message was created */
  timestamp: Date;
  
  /** Additional message metadata (optional) */
  metadata?: MessageMetadata;
}

/**
 * Optional metadata for messages
 */
export interface MessageMetadata {
  /** Related file paths */
  relatedFiles?: string[];
  
  /** Attached files data */
  attachedFiles?: {
    /** File path within workspace */
    path: string;
    /** File name */
    name: string;
    /** File type/extension */
    type: string;
    /** Content if available (optional for large files) */
    content?: string;
  }[];
  
  /** Token count information */
  tokens?: {
    prompt?: number;
    completion?: number;
    total?: number;
  };
  
  /** Model used for this message */
  model?: string;
  
  /** Additional custom metadata */
  [key: string]: any;
}

/**
 * Request to the LLM API
 */
export interface LLMRequest {
  /** Messages to send to the LLM */
  messages: Message[];
  
  /** Model to use for this request */
  model: string;
  
  /** Temperature for response generation */
  temperature?: number;
  
  /** Maximum tokens to generate */
  maxTokens?: number;
  
  /** Whether to stream the response */
  stream?: boolean;
  
  /** Additional request parameters */
  parameters?: Record<string, any>;
}

/**
 * Response from the LLM API
 */
export interface LLMResponse {
  /** Generated message */
  message: Message;
  
  /** Token usage information */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  
  /** Additional response metadata */
  metadata?: Record<string, any>;
  
  /** Raw content (for compatibility) */
  content?: string;
}

/**
 * Represents a chat session
 */
export interface ChatSession {
  /** Unique identifier for the session */
  id: string;
  
  /** Human-readable name for the session */
  name: string;
  
  /** When the session was created */
  createdAt: Date;
  
  /** When the session was last updated */
  updatedAt: Date;
  
  /** Messages in this session */
  messages: Message[];
  
  /** Additional session metadata */
  metadata?: {
    /** Related project or workspace */
    project?: string;
    
    /** Session summary */
    summary?: string;
    
    /** Default model for this session */
    defaultModel?: string;
    
    /** Custom session data */
    [key: string]: any;
  };
}

/**
 * Options for LLM API requests
 */
export interface LLMRequestOptions {
  /** Model to use */
  model?: string;
  
  /** Temperature for response generation */
  temperature?: number;
  
  /** Maximum tokens to generate */
  maxTokens?: number;
  
  /** Whether to stream the response */
  stream?: boolean;
  
  /** System prompt to use */
  systemPrompt?: string;
  
  /** Additional context messages */
  contextMessages?: Message[];
  
  /** Additional model parameters */
  modelParameters?: Record<string, any>;
}

/**
 * Callback for streaming responses
 */
export type StreamCallback = (chunk: string, done: boolean) => void;