/**
 * Message roles representing different participants in a conversation
 */
export enum MessageRole {
  User = 'user',           // Messages from the user
  Assistant = 'assistant', // Messages from the AI assistant
  System = 'system'        // System messages (e.g., errors, notifications)
}

/**
 * @deprecated Use ModelId from 'types/models.ts' instead.
 * This type is kept for backward compatibility.
 */
export { ModelId as LLMModel } from './models';

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

  /** Whether to exclude this message from context when sending to LLM */
  excludeFromContext?: boolean;

  /** Whether this message is a slash command */
  isSlashCommand?: boolean;

  /** Result of executing a slash command */
  commandResult?: boolean;

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