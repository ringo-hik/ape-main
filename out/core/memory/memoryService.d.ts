import * as vscode from 'vscode';
import { Message, ChatSession } from '../../types/chat';
/**
 * Result of a memory operation including status and optional error
 */
export interface MemoryResult<T> {
    success: boolean;
    data?: T;
    error?: Error;
}
/**
 * Options for session creation
 */
export interface SessionOptions {
    /** Session metadata */
    metadata?: {
        /** Related project or workspace */
        project?: string;
        /** Default model for this session */
        defaultModel?: string;
        /** Custom session data */
        [key: string]: any;
    };
}
/**
 * Session summary for UI display
 */
export interface SessionSummary {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    messageCount: number;
    summary?: string;
}
/**
 * Memory service manages storing and retrieving conversation data
 */
export declare class MemoryService implements vscode.Disposable {
    private readonly _context;
    private _sessions;
    private _currentSessionId;
    private _storageDir;
    private _maxMessages;
    private _sessionDuration;
    private _configListener;
    /**
     * Creates a new MemoryService instance
     * @param _context The VSCode extension context
     */
    constructor(_context: vscode.ExtensionContext);
    /**
     * Loads configuration from VSCode settings
     */
    private _loadConfiguration;
    /**
     * Creates storage directory if it doesn't exist
     */
    private _ensureStorageDirectory;
    /**
     * Initializes default session
     */
    private _initializeDefaultSession;
    /**
     * Gets the current session ID
     * @returns Current session ID or null if no session is active
     */
    getCurrentSessionId(): string | null;
    /**
     * Gets the current session
     * @returns Current session or null if no session is active
     */
    getCurrentSession(): ChatSession | null;
    /**
     * Gets messages from the current session
     * @returns Promise that resolves to a MemoryResult containing messages
     */
    getMessages(): Promise<MemoryResult<Message[]>>;
    /**
     * Adds a message to the current session
     * @param message Message to add
     * @returns Promise that resolves to a MemoryResult indicating success or failure
     */
    addMessage(message: Message): Promise<MemoryResult<void>>;
    /**
     * Saves messages to the current session
     * @param messages Messages to save
     * @returns Promise that resolves to a MemoryResult indicating success or failure
     */
    saveMessages(messages: Message[]): Promise<MemoryResult<void>>;
    /**
     * Creates a new chat session
     * @param name Session name
     * @param options Optional session options
     * @returns Promise that resolves to a MemoryResult containing the session ID
     */
    createSession(name: string, options?: SessionOptions): Promise<MemoryResult<string>>;
    /**
     * Switches to a different session
     * @param sessionId Session ID to switch to
     * @returns Promise that resolves to a MemoryResult indicating success or failure
     */
    switchSession(sessionId: string): Promise<MemoryResult<boolean>>;
    /**
     * Gets all available sessions
     * @returns Promise that resolves to a MemoryResult containing session summaries
     */
    getSessions(): Promise<MemoryResult<SessionSummary[]>>;
    /**
     * Gets a specific session by ID
     * @param sessionId Session ID to get
     * @returns Promise that resolves to a MemoryResult containing the session
     */
    getSession(sessionId: string): Promise<MemoryResult<ChatSession>>;
    /**
     * Updates a session's properties (not including messages)
     * @param sessionId Session ID to update
     * @param updates Object containing updates to apply
     * @returns Promise that resolves to a MemoryResult indicating success or failure
     */
    updateSession(sessionId: string, updates: Partial<Pick<ChatSession, 'name' | 'metadata'>>): Promise<MemoryResult<void>>;
    /**
     * Deletes a session
     * @param sessionId Session ID to delete
     * @returns Promise that resolves to a MemoryResult indicating success or failure
     */
    deleteSession(sessionId: string): Promise<MemoryResult<void>>;
    /**
     * Clears messages from the current session
     * @returns Promise that resolves to a MemoryResult indicating success or failure
     */
    clearMessages(): Promise<MemoryResult<void>>;
    /**
     * Archives old sessions based on session duration configuration
     * @returns Promise that resolves to a MemoryResult indicating success or failure
     */
    archiveOldSessions(): Promise<MemoryResult<number>>;
    /**
     * Exports a session to a file
     * @param sessionId Session ID to export
     * @param filePath File path to export to
     * @returns Promise that resolves to a MemoryResult indicating success or failure
     */
    exportSession(sessionId: string, filePath: string): Promise<MemoryResult<void>>;
    /**
     * Imports a session from a file
     * @param filePath File path to import from
     * @param setAsCurrent Whether to set the imported session as current
     * @returns Promise that resolves to a MemoryResult containing the session ID
     */
    importSession(filePath: string, setAsCurrent?: boolean): Promise<MemoryResult<string>>;
    /**
     * Loads a specific session from storage
     * @param sessionId Session ID to load
     * @returns Promise that resolves to a ChatSession or null
     */
    private _loadSession;
    /**
     * Saves a session to storage
     * @param session Session to save
     * @returns Promise that resolves when the session is saved
     */
    private _saveSession;
    /**
     * Loads all sessions from storage
     * @returns Promise that resolves when all sessions are loaded
     */
    private _loadAllSessions;
    /**
     * Summarizes a conversation for long-term memory
     * @param messages Messages to summarize
     * @returns Summary of the conversation
     */
    private _summarizeConversation;
    /**
     * Disposes resources
     */
    dispose(): void;
}
