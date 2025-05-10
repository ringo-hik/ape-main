/**
 * 채팅 뷰 메시지 관리자
 * 
 * 채팅 메시지의 상태 관리, 필터링, 저장 및 로드를 담당하는 모듈
 */

import * as vscode from 'vscode';
import { Message, MessageRole } from '../../types/chat';
import { MemoryService } from '../../core/memory/memoryService';
import { LLMService } from '../../core/llm/llmService';
import { SmartPromptingService } from '../../core/services/smartPromptingService';

/**
 * 채팅 뷰 메시지 관리자 클래스
 */
export class ChatViewMessageManager {
  private _messages: Message[] = [];
  private _isStreaming = false;
  private _currentStreamMessageId: string | null = null;
  private _streamUpdateTimeout: NodeJS.Timeout | null = null;

  constructor(
    private readonly _context: vscode.ExtensionContext,
    private readonly _memoryService: MemoryService,
    private readonly _llmService: LLMService,
    private readonly _smartPromptingService?: SmartPromptingService
  ) {}

  /**
   * 모든 메시지 가져오기
   * @returns 메시지 목록
   */
  public getMessages(): Message[] {
    return this._messages;
  }

  /**
   * 스트리밍 상태 확인
   * @returns 스트리밍 중 여부
   */
  public isStreaming(): boolean {
    return this._isStreaming;
  }

  /**
   * 메시지 추가
   * @param message 추가할 메시지
   */
  public addMessage(message: Message): void {
    this._messages.push(message);
  }

  /**
   * 메시지 저장
   */
  public async saveMessages(): Promise<void> {
    for (const message of this._messages) {
      await this._memoryService.addMessage(message);
    }
  }

  /**
   * 메시지 로드
   */
  public async loadMessages(): Promise<boolean> {
    console.log('메시지 로드 중 - 기존 메시지 확인');
    const result = await this._memoryService.getMessages();
    if (result.success && result.data && result.data.length > 0) {
      console.log(`${result.data.length}개의 저장된 메시지를 로드함`);
      this._messages = result.data;
      return true;
    }
    
    return false;
  }

  /**
   * 메시지 초기화 (채팅 초기화)
   * @param greeting 새로운 인사말
   */
  public clearMessages(greeting: string): void {
    // 메모리 서비스에서 메시지 삭제
    this._memoryService.clearMessages();
    
    // 새로운 어시스턴트 메시지만 표시
    const assistantId = `assistant_welcome_${Date.now()}`;
    
    // 간단한 인사말만 포함한 메시지 설정
    this._messages = [
      {
        id: assistantId,
        role: MessageRole.Assistant,
        content: greeting,
        timestamp: new Date()
      }
    ];
  }

  /**
   * LLM에 사용자 메시지 전송
   * @param content 사용자 메시지 내용
   * @param updateMessageCallback 메시지 업데이트 콜백 함수
   */
  public async sendMessageToLlm(
    content: string,
    updateMessageCallback: () => void
  ): Promise<void> {
    if (this._isStreaming) {
      throw new Error('현재 응답이 완료될 때까지 기다려주세요.');
    }

    // 스마트 프롬프팅 적용 (활성화된 경우)
    let processedContent = content;
    if (this._smartPromptingService && this._smartPromptingService.isEnabled()) {
      processedContent = this._smartPromptingService.processMessage(content);
    }

    // 사용자 메시지 생성 및 추가
    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: MessageRole.User,
      content: processedContent,
      timestamp: new Date()
    };

    this._messages.push(userMessage);
    updateMessageCallback();

    try {
      // 어시스턴트 메시지 생성 (빈 내용으로 시작)
      const assistantMessageId = `msg_${Date.now() + 1}`;
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: MessageRole.Assistant,
        content: '',
        timestamp: new Date()
      };

      this._messages.push(assistantMessage);
      this._currentStreamMessageId = assistantMessageId;
      this._isStreaming = true;
      updateMessageCallback();

      // LLM 컨텍스트에 포함할 메시지 필터링
      const filteredMessages = this.getFilteredMessages();

      // LLM에서 스트리밍 응답 시작
      await this._llmService.streamResponse(
        filteredMessages,
        (chunk: string, done: boolean) => {
          // 어시스턴트 메시지에 새 청크 추가
          const assistantMessage = this._messages.find(m => m.id === this._currentStreamMessageId);
          if (assistantMessage) {
            // 내용이 있는 청크만 추가
            if (chunk && chunk.trim()) {
              assistantMessage.content += chunk;

              // 성능을 위한 디바운싱
              if (!this._streamUpdateTimeout) {
                this._streamUpdateTimeout = setTimeout(() => {
                  updateMessageCallback();
                  this._streamUpdateTimeout = null;
                }, 30); // 30ms 디바운스
              }
            }

            if (done) {
              // 스트림 완료
              this._isStreaming = false;
              this._currentStreamMessageId = null;

              // 대기 중인 타임아웃 취소
              if (this._streamUpdateTimeout) {
                clearTimeout(this._streamUpdateTimeout);
                this._streamUpdateTimeout = null;
              }

              // 메시지 저장
              this.saveMessages();
              updateMessageCallback();
            }
          }
        }
      );
    } catch (error) {
      this._isStreaming = false;
      this._currentStreamMessageId = null;

      // 대기 중인 타임아웃 취소
      if (this._streamUpdateTimeout) {
        clearTimeout(this._streamUpdateTimeout);
        this._streamUpdateTimeout = null;
      }

      // 오류 메시지 추가
      const errorMessage: Message = {
        id: `msg_error_${Date.now()}`,
        role: MessageRole.System,
        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date(),
        metadata: {
          excludeFromContext: true
        }
      };

      this._messages.push(errorMessage);
      updateMessageCallback();
      
      throw error;
    }
  }

  /**
   * 현재 스트림 취소
   * @param cancelMessage 취소 메시지
   * @param updateMessageCallback 메시지 업데이트 콜백
   */
  public cancelStream(cancelMessage: string, updateMessageCallback: () => void): void {
    // 취소 메시지를 표시하기 위한 콜백 정의
    const cancelCallback = (chunk: string, _done: boolean) => {
      // 현재 스트리밍 중인 메시지가 있는 경우
      if (this._currentStreamMessageId) {
        const assistantMessage = this._messages.find(m => m.id === this._currentStreamMessageId);
        if (assistantMessage && chunk) {
          // 취소 메시지 추가
          assistantMessage.content += chunk;
        }
        // 메시지 UI 업데이트 (취소 메시지 표시)
        updateMessageCallback();
      }
    };

    // 취소 콜백과 함께 스트림 취소
    this._llmService.cancelStream(cancelCallback);
    this._isStreaming = false;
    this._currentStreamMessageId = null;

    if (this._streamUpdateTimeout) {
      clearTimeout(this._streamUpdateTimeout);
      this._streamUpdateTimeout = null;
    }

    updateMessageCallback();
  }

  /**
   * LLM 컨텍스트에 포함할 메시지 필터링
   * @returns 필터링된 메시지 목록
   */
  public getFilteredMessages(): Message[] {
    return this._messages.filter(message => {
      // 컨텍스트에서 제외된 메시지 필터링
      if (message.metadata?.excludeFromContext === true) {
        return false;
      }

      // UI 전용 메시지 필터링
      if (message.metadata?.uiOnly === true) {
        return false;
      }

      // 내용으로 HTML 메시지 필터링
      if (message.role === MessageRole.System) {
        const content = message.content || '';
        if (content.includes('<div class="welcome-container"') ||
            (content.trim().startsWith('<') && content.includes('</div>'))) {
          return false;
        }
      }

      // 나머지 메시지는 유지
      return true;
    });
  }

  /**
   * 메시지 컨텍스트 포함/제외 토글
   * @param messageId 메시지 ID
   */
  public async toggleMessageContext(messageId: string): Promise<boolean> {
    // 메시지 찾기
    const message = this._messages.find(m => m.id === messageId);
    if (!message) {
      console.error(`Message with ID ${messageId} not found`);
      return false;
    }

    // 메타데이터가 없으면 생성
    if (!message.metadata) {
      message.metadata = {};
    }

    // 컨텍스트 포함/제외 토글
    message.metadata.excludeFromContext = !message.metadata.excludeFromContext;

    // 메모리 서비스 업데이트
    await this._memoryService.updateMessage(message);
    
    return message.metadata.excludeFromContext;
  }

  /**
   * 외부에서 직접 LLM 응답을 채팅 창에 추가
   * @param role 메시지 역할
   * @param content 메시지 내용
   */
  public async addLlmResponse(role: string, content: string): Promise<Message> {
    // 메시지 객체 생성
    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      role: role as MessageRole,
      content: content,
      timestamp: new Date()
    };

    // 메시지 목록에 추가
    this._messages.push(newMessage);
    
    // 메모리에 저장
    await this._memoryService.addMessage(newMessage);
    
    return newMessage;
  }
}