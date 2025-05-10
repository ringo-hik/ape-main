import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { Message, MessageRole, ChatSession } from '../../types/chat';

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
export class MemoryService implements vscode.Disposable {
  private _sessions: Map<string, ChatSession> = new Map();
  private _currentSessionId: string | null = null;
  private _storageDir: string;
  private _maxMessages: number;
  private _sessionDuration: number;
  private _configListener: vscode.Disposable;
  
  /**
   * Creates a new MemoryService instance
   * @param _context The VSCode extension context
   */
  constructor(private readonly _context: vscode.ExtensionContext) {
    // Initialize properties
    this._maxMessages = 30;
    this._sessionDuration = 240;
    
    // Create storage directory
    this._storageDir = path.join(_context.globalStoragePath, 'memory');
    this._ensureStorageDirectory();
    
    // Load configuration
    this._loadConfiguration();
    
    // Initialize with default session
    this._initializeDefaultSession();
    
    // Listen for configuration changes
    this._configListener = vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('ape.memory')) {
        this._loadConfiguration();
      }
    });
  }
  
  /**
   * Loads configuration from VSCode settings
   */
  private _loadConfiguration(): void {
    const config = vscode.workspace.getConfiguration('ape.memory');
    this._maxMessages = config.get('maxMessages', 30);
    this._sessionDuration = config.get('sessionDuration', 240); // minutes
  }
  
  /**
   * Creates storage directory if it doesn't exist
   */
  private _ensureStorageDirectory(): void {
    if (!existsSync(this._storageDir)) {
      mkdirSync(this._storageDir, { recursive: true });
    }
  }
  
  /**
   * Initializes default session
   */
  private async _initializeDefaultSession(): Promise<void> {
    const defaultSessionId = 'default';
    
    try {
      // Check if default session exists
      const existingSession = await this._loadSession(defaultSessionId);
      
      if (existingSession) {
        this._sessions.set(defaultSessionId, existingSession);
      } else {
        // Create new default session
        const newSession: ChatSession = {
          id: defaultSessionId,
          name: 'Default Session',
          createdAt: new Date(),
          updatedAt: new Date(),
          messages: []
        };
        
        this._sessions.set(defaultSessionId, newSession);
        await this._saveSession(newSession);
      }
      
      this._currentSessionId = defaultSessionId;
    } catch (error) {
      console.error('Failed to initialize default session:', error);
      // Create an in-memory default session as fallback
      this._sessions.set(defaultSessionId, {
        id: defaultSessionId,
        name: 'Default Session',
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: []
      });
      this._currentSessionId = defaultSessionId;
    }
  }
  
  /**
   * Gets the current session ID
   * @returns Current session ID or null if no session is active
   */
  public getCurrentSessionId(): string | null {
    return this._currentSessionId;
  }
  
  /**
   * Gets the current session
   * @returns Current session or null if no session is active
   */
  public getCurrentSession(): ChatSession | null {
    if (!this._currentSessionId) {
      return null;
    }
    
    return this._sessions.get(this._currentSessionId) || null;
  }
  
  /**
   * Gets messages from the current session
   * @returns Promise that resolves to a MemoryResult containing messages
   */
  public async getMessages(): Promise<MemoryResult<Message[]>> {
    try {
      if (!this._currentSessionId) {
        return { success: true, data: [] };
      }
      
      const session = this._sessions.get(this._currentSessionId);
      return {
        success: true,
        data: session ? session.messages : []
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
  
  /**
   * Adds a message to the current session
   * @param message Message to add
   * @returns Promise that resolves to a MemoryResult indicating success or failure
   */
  public async addMessage(message: Message): Promise<MemoryResult<void>> {
    try {
      if (!this._currentSessionId) {
        return {
          success: false,
          error: new Error('No active session')
        };
      }

      const session = this._sessions.get(this._currentSessionId);
      if (session) {
        // 기존 메시지가 있는지 확인
        const existingIndex = session.messages.findIndex(m => m.id === message.id);

        if (existingIndex >= 0) {
          // 기존 메시지 업데이트
          session.messages[existingIndex] = message;
        } else {
          // 새 메시지 추가
          session.messages.push(message);
        }

        // Limit messages if needed
        if (this._maxMessages > 0 && session.messages.length > this._maxMessages) {
          // Keep the most recent messages
          session.messages = session.messages.slice(-this._maxMessages);
        }

        // Update session timestamp
        session.updatedAt = new Date();

        // Save session
        await this._saveSession(session);

        return { success: true };
      } else {
        return {
          success: false,
          error: new Error('Session not found')
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * 특정 메시지를 업데이트
   * @param message 업데이트할 메시지
   * @returns Promise that resolves to a MemoryResult indicating success or failure
   */
  public async updateMessage(message: Message): Promise<MemoryResult<void>> {
    try {
      if (!this._currentSessionId) {
        return {
          success: false,
          error: new Error('No active session')
        };
      }

      const session = this._sessions.get(this._currentSessionId);
      if (session) {
        // 기존 메시지 찾기
        const index = session.messages.findIndex(m => m.id === message.id);

        if (index === -1) {
          return {
            success: false,
            error: new Error(`Message with ID ${message.id} not found`)
          };
        }

        // 메시지 업데이트
        session.messages[index] = message;

        // Update session timestamp
        session.updatedAt = new Date();

        // Save session
        await this._saveSession(session);

        return { success: true };
      } else {
        return {
          success: false,
          error: new Error('Session not found')
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
  
  /**
   * Saves messages to the current session
   * @param messages Messages to save
   * @returns Promise that resolves to a MemoryResult indicating success or failure
   */
  public async saveMessages(messages: Message[]): Promise<MemoryResult<void>> {
    try {
      if (!this._currentSessionId) {
        return { 
          success: false, 
          error: new Error('No active session')
        };
      }
      
      const session = this._sessions.get(this._currentSessionId);
      if (session) {
        // Replace messages in the session
        session.messages = messages;
        
        // Limit messages if needed
        if (this._maxMessages > 0 && session.messages.length > this._maxMessages) {
          // Keep the most recent messages
          session.messages = session.messages.slice(-this._maxMessages);
        }
        
        // Update session timestamp
        session.updatedAt = new Date();
        
        // Save session
        await this._saveSession(session);
        
        return { success: true };
      } else {
        return { 
          success: false, 
          error: new Error('Session not found')
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
  
  /**
   * Creates a new chat session
   * @param name Session name
   * @param options Optional session options
   * @returns Promise that resolves to a MemoryResult containing the session ID
   */
  public async createSession(name: string, options?: SessionOptions): Promise<MemoryResult<string>> {
    try {
      const sessionId = `session_${Date.now()}`;
      
      const newSession: ChatSession = {
        id: sessionId,
        name,
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: [],
        metadata: options?.metadata
      };
      
      this._sessions.set(sessionId, newSession);
      await this._saveSession(newSession);
      
      return { 
        success: true, 
        data: sessionId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
  
  /**
   * Switches to a different session
   * @param sessionId Session ID to switch to
   * @returns Promise that resolves to a MemoryResult indicating success or failure
   */
  public async switchSession(sessionId: string): Promise<MemoryResult<boolean>> {
    try {
      // If session is not loaded, try to load it
      if (!this._sessions.has(sessionId)) {
        const session = await this._loadSession(sessionId);
        if (!session) {
          return { 
            success: false, 
            error: new Error(`Session ${sessionId} not found`)
          };
        }
        this._sessions.set(sessionId, session);
      }
      
      this._currentSessionId = sessionId;
      return {
        success: true,
        data: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
  
  /**
   * Gets all available sessions
   * @returns Promise that resolves to a MemoryResult containing session summaries
   */
  public async getSessions(): Promise<MemoryResult<SessionSummary[]>> {
    try {
      // Load all sessions from storage
      await this._loadAllSessions();
      
      const sessionSummaries: SessionSummary[] = Array.from(this._sessions.values()).map(session => ({
        id: session.id,
        name: session.name,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        messageCount: session.messages.length,
        summary: session.metadata?.summary || this._summarizeConversation(session.messages)
      }));
      
      return {
        success: true,
        data: sessionSummaries
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
  
  /**
   * Gets a specific session by ID
   * @param sessionId Session ID to get
   * @returns Promise that resolves to a MemoryResult containing the session
   */
  public async getSession(sessionId: string): Promise<MemoryResult<ChatSession>> {
    try {
      // If session is not loaded, try to load it
      if (!this._sessions.has(sessionId)) {
        const session = await this._loadSession(sessionId);
        if (!session) {
          return { 
            success: false, 
            error: new Error(`Session ${sessionId} not found`)
          };
        }
        this._sessions.set(sessionId, session);
      }
      
      const session = this._sessions.get(sessionId);
      if (!session) {
        return { 
          success: false, 
          error: new Error(`Session ${sessionId} not found`)
        };
      }
      
      return {
        success: true,
        data: session
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
  
  /**
   * Updates a session's properties (not including messages)
   * @param sessionId Session ID to update
   * @param updates Object containing updates to apply
   * @returns Promise that resolves to a MemoryResult indicating success or failure
   */
  public async updateSession(
    sessionId: string, 
    updates: Partial<Pick<ChatSession, 'name' | 'metadata'>>
  ): Promise<MemoryResult<void>> {
    try {
      const sessionResult = await this.getSession(sessionId);
      if (!sessionResult.success || !sessionResult.data) {
        return { 
          success: false, 
          error: sessionResult.error || new Error(`Session ${sessionId} not found`)
        };
      }
      
      const session = sessionResult.data;
      
      // Apply updates
      if (updates.name) {
        session.name = updates.name;
      }
      
      if (updates.metadata) {
        session.metadata = {
          ...session.metadata,
          ...updates.metadata
        };
      }
      
      // Update timestamp
      session.updatedAt = new Date();
      
      // Save session
      await this._saveSession(session);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
  
  /**
   * Deletes a session
   * @param sessionId Session ID to delete
   * @returns Promise that resolves to a MemoryResult indicating success or failure
   */
  public async deleteSession(sessionId: string): Promise<MemoryResult<void>> {
    try {
      // Don't allow deleting the default session
      if (sessionId === 'default') {
        return {
          success: false,
          error: new Error('Cannot delete the default session')
        };
      }
      
      // Remove from memory
      this._sessions.delete(sessionId);
      
      // If this was the current session, switch to default
      if (this._currentSessionId === sessionId) {
        await this.switchSession('default');
      }
      
      // Remove from disk
      const sessionFile = path.join(this._storageDir, `${sessionId}.json`);
      if (existsSync(sessionFile)) {
        await fs.unlink(sessionFile);
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
  
  /**
   * Clears messages from the current session
   * @returns Promise that resolves to a MemoryResult indicating success or failure
   */
  public async clearMessages(): Promise<MemoryResult<void>> {
    try {
      if (!this._currentSessionId) {
        return { 
          success: false, 
          error: new Error('No active session')
        };
      }
      
      const session = this._sessions.get(this._currentSessionId);
      if (session) {
        session.messages = [];
        session.updatedAt = new Date();
        
        await this._saveSession(session);
        
        return { success: true };
      } else {
        return { 
          success: false, 
          error: new Error('Session not found')
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
  
  /**
   * Archives old sessions based on session duration configuration
   * @returns Promise that resolves to a MemoryResult indicating success or failure
   */
  public async archiveOldSessions(): Promise<MemoryResult<number>> {
    try {
      // Load all sessions from storage
      await this._loadAllSessions();
      
      const now = new Date();
      const archiveThreshold = new Date(now.getTime() - this._sessionDuration * 60 * 1000);
      let archivedCount = 0;
      
      for (const [sessionId, session] of this._sessions.entries()) {
        // Skip the default session and current session
        if (sessionId === 'default' || sessionId === this._currentSessionId) {
          continue;
        }
        
        // Archive sessions older than the threshold
        if (session.updatedAt < archiveThreshold) {
          // Create an archive copy
          const archiveDir = path.join(this._storageDir, 'archive');
          if (!existsSync(archiveDir)) {
            mkdirSync(archiveDir, { recursive: true });
          }
          
          // Generate summary if not already present
          if (!session.metadata) {
            session.metadata = {};
          }
          
          if (!session.metadata.summary) {
            session.metadata.summary = this._summarizeConversation(session.messages);
          }
          
          // Save to archive
          const archiveFile = path.join(archiveDir, `${session.id}_${Math.floor(session.updatedAt.getTime() / 1000)}.json`);
          await fs.writeFile(archiveFile, JSON.stringify(session, null, 2), 'utf-8');
          
          // Remove from active sessions
          this._sessions.delete(sessionId);
          
          // Remove from disk
          const sessionFile = path.join(this._storageDir, `${sessionId}.json`);
          if (existsSync(sessionFile)) {
            await fs.unlink(sessionFile);
          }
          
          archivedCount++;
        }
      }
      
      return {
        success: true,
        data: archivedCount
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
  
  /**
   * Exports a session to a file
   * @param sessionId Session ID to export
   * @param filePath File path to export to
   * @returns Promise that resolves to a MemoryResult indicating success or failure
   */
  public async exportSession(sessionId: string, filePath: string): Promise<MemoryResult<void>> {
    try {
      const sessionResult = await this.getSession(sessionId);
      if (!sessionResult.success || !sessionResult.data) {
        return { 
          success: false, 
          error: sessionResult.error || new Error(`Session ${sessionId} not found`)
        };
      }
      
      const session = sessionResult.data;
      
      // Export to file
      await fs.writeFile(filePath, JSON.stringify(session, null, 2), 'utf-8');
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
  
  /**
   * Imports a session from a file
   * @param filePath File path to import from
   * @param setAsCurrent Whether to set the imported session as current
   * @returns Promise that resolves to a MemoryResult containing the session ID
   */
  public async importSession(filePath: string, setAsCurrent: boolean = false): Promise<MemoryResult<string>> {
    try {
      // Read and parse file
      const data = await fs.readFile(filePath, 'utf-8');
      const sessionData = JSON.parse(data);
      
      // Validate session data
      if (!sessionData.id || !sessionData.name || !sessionData.createdAt || !sessionData.updatedAt) {
        return {
          success: false,
          error: new Error('Invalid session data')
        };
      }
      
      // Convert date strings to Date objects
      sessionData.createdAt = new Date(sessionData.createdAt);
      sessionData.updatedAt = new Date(sessionData.updatedAt);
      
      if (sessionData.messages) {
        sessionData.messages.forEach((message: any) => {
          message.timestamp = new Date(message.timestamp);
        });
      }
      
      // Generate a new ID to avoid conflicts
      const originalId = sessionData.id;
      sessionData.id = `imported_${Date.now()}`;
      
      // Add a note about the import
      if (!sessionData.metadata) {
        sessionData.metadata = {};
      }
      
      sessionData.metadata.importedFrom = originalId;
      sessionData.metadata.importedAt = new Date();
      
      // Save the session
      this._sessions.set(sessionData.id, sessionData);
      await this._saveSession(sessionData);
      
      // Switch to the imported session if requested
      if (setAsCurrent) {
        this._currentSessionId = sessionData.id;
      }
      
      return {
        success: true,
        data: sessionData.id
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
  
  /**
   * Loads a specific session from storage
   * @param sessionId Session ID to load
   * @returns Promise that resolves to a ChatSession or null
   */
  private async _loadSession(sessionId: string): Promise<ChatSession | null> {
    const sessionFile = path.join(this._storageDir, `${sessionId}.json`);
    
    try {
      if (existsSync(sessionFile)) {
        const data = await fs.readFile(sessionFile, 'utf-8');
        const sessionData = JSON.parse(data);
        
        // Convert date strings back to Date objects
        sessionData.createdAt = new Date(sessionData.createdAt);
        sessionData.updatedAt = new Date(sessionData.updatedAt);
        
        if (sessionData.messages) {
          sessionData.messages.forEach((message: any) => {
            message.timestamp = new Date(message.timestamp);
          });
        }
        
        return sessionData as ChatSession;
      }
    } catch (error) {
      console.error(`Error loading session ${sessionId}:`, error);
    }
    
    return null;
  }
  
  /**
   * Saves a session to storage
   * @param session Session to save
   * @returns Promise that resolves when the session is saved
   */
  private async _saveSession(session: ChatSession): Promise<void> {
    const sessionFile = path.join(this._storageDir, `${session.id}.json`);
    
    try {
      const sessionJson = JSON.stringify(session, null, 2);
      await fs.writeFile(sessionFile, sessionJson, 'utf-8');
    } catch (error) {
      console.error(`Error saving session ${session.id}:`, error);
      throw error;
    }
  }
  
  /**
   * Loads all sessions from storage
   * @returns Promise that resolves when all sessions are loaded
   */
  private async _loadAllSessions(): Promise<void> {
    try {
      if (!existsSync(this._storageDir)) {
        return;
      }
      
      const files = await fs.readdir(this._storageDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const sessionId = path.basename(file, '.json');
          
          // Don't reload sessions we already have in memory
          if (!this._sessions.has(sessionId)) {
            const session = await this._loadSession(sessionId);
            if (session) {
              this._sessions.set(sessionId, session);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      throw error;
    }
  }
  
  /**
   * Summarizes a conversation for long-term memory
   * @param messages Messages to summarize
   * @returns Summary of the conversation
   */
  private _summarizeConversation(messages: Message[]): string {
    if (messages.length === 0) {
      return 'Empty conversation';
    }
    
    // Find the first user message
    const firstUserMessage = messages.find(m => m.role === MessageRole.User);
    if (!firstUserMessage) {
      return `Conversation with ${messages.length} messages`;
    }
    
    // Get first user message content
    const content = firstUserMessage.content;
    const truncatedContent = content.substring(0, 50) + (content.length > 50 ? '...' : '');
    
    // Count messages by role
    const userMessages = messages.filter(m => m.role === MessageRole.User).length;
    const assistantMessages = messages.filter(m => m.role === MessageRole.Assistant).length;
    
    return `Conversation with ${userMessages} user and ${assistantMessages} assistant messages. Started with: "${truncatedContent}"`;
  }
  
  /**
   * Disposes resources
   */
  public dispose(): void {
    // Dispose configuration change listener
    this._configListener.dispose();
    
    // Save any unsaved sessions
    for (const session of this._sessions.values()) {
      this._saveSession(session).catch(error => {
        console.error(`Error saving session ${session.id} during disposal:`, error);
      });
    }
  }
}