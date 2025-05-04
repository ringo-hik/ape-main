/**
 * 채팅 서비스
 * 대화 히스토리 관리 및 메시지 처리 담당
 */

import * as vscode from 'vscode';
import { AxiomCoreService } from '../core/AxiomCoreService';

/**
 * 채팅 메시지 타입
 */
export interface ChatMessage {
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

/**
 * 채팅 서비스 클래스
 * 대화 히스토리 관리 및 UI 상호작용 담당
 */
export class ChatService {
  private conversation: ChatMessage[] = [];
  private axiomCore: AxiomCoreService;
  private readonly welcomeMessages = [
    '안녕하세요! Axiom 채팅에 오신 것을 환영합니다.',
    '문의사항이나 도움이 필요한 내용을 입력해주세요.',
    '@ 명령어나 / 명령어를 사용하여 특별한 기능을 사용할 수 있습니다.'
  ];
  
  constructor(context: vscode.ExtensionContext) {
    // Axiom 코어 서비스 초기화
    this.axiomCore = AxiomCoreService.getInstance(context);
    
    // 코어 서비스 초기화
    this.axiomCore.initialize().then(() => {
      this.addSystemMessage('Axiom 코어 서비스가 초기화되었습니다.');
    }).catch(error => {
      this.addSystemMessage('Axiom 코어 서비스 초기화 중 오류가 발생했습니다.');
      console.error('코어 서비스 초기화 오류:', error);
    });
  }
  
  /**
   * 사용자 메시지 처리 후 응답 생성
   */
  public async processMessage(text: string, onUpdate?: (chunk: string) => void): Promise<string> {
    // 대화 기록에 사용자 메시지 추가
    this.addMessage('user', text);
    
    console.log(`ChatService: 메시지 처리 시작 - "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`);
    console.log(`ChatService: 스트리밍 모드 - ${onUpdate ? '켜짐' : '꺼짐'}`);
    
    // /clear 명령어 특별 처리 (UI 관련이므로 여기서 처리)
    if (text.trim().toLowerCase() === '/clear') {
      this.clearConversation();
      const clearMessage = '대화 기록이 초기화되었습니다.';
      this.addMessage('system', clearMessage);
      return Promise.resolve(clearMessage);
    }
    
    try {
      // 스트리밍 처리를 위한 내부 콜백
      let accumulatedResponse = '';
      let chunkCount = 0;
      
      const streamingCallback = onUpdate ? (chunk: string) => {
        accumulatedResponse += chunk;
        onUpdate(chunk);
        
        chunkCount++;
        if (chunkCount <= 2 || chunkCount % 50 === 0) {
          console.log(`ChatService: 스트리밍 청크 #${chunkCount} 수신 및 전달 - 길이: ${chunk.length}자`);
        }
      } : undefined;
      
      console.log('ChatService: AxiomCoreService에 메시지 전달');
      
      // Axiom 코어 서비스를 통한 메시지 처리 (스트리밍 지원)
      const response = await this.axiomCore.processMessage(text, streamingCallback ? {
        stream: true,
        onUpdate: streamingCallback
      } : undefined);
      
      let responseContent: string;
      
      // 스트리밍 모드에서는 누적된 응답 사용
      if (streamingCallback && accumulatedResponse) {
        console.log(`ChatService: 스트리밍 응답 완료 - 총 청크: ${chunkCount}, 전체 길이: ${accumulatedResponse.length}자`);
        responseContent = accumulatedResponse;
      } else {
        console.log('ChatService: 일반 응답 처리');
        // 비스트리밍 모드에서는 응답 객체에서 콘텐츠 추출
        if (typeof response === 'object') {
          if (response.content) {
            responseContent = response.content;
          } else {
            responseContent = JSON.stringify(response, null, 2);
          }
        } else {
          responseContent = response.toString();
        }
        console.log(`ChatService: 응답 길이: ${responseContent.length}자`);
      }
      
      // 응답 추가
      this.addMessage('assistant', responseContent);
      return responseContent;
    } catch (error) {
      console.error('메시지 처리 중 오류 발생:', error);
      
      // 오류 발생 시 대체 응답
      const errorMessage = '죄송합니다. 응답을 생성하는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
      this.addMessage('assistant', errorMessage);
      return errorMessage;
    }
  }
  
  /**
   * 메시지 추가
   */
  private addMessage(type: 'user' | 'assistant' | 'system', content: string) {
    this.conversation.push({
      type,
      content,
      timestamp: Date.now()
    });
  }
  
  /**
   * 시스템 메시지 추가
   */
  public addSystemMessage(content: string) {
    this.addMessage('system', content);
  }
  
  /**
   * 대화 내용 초기화
   */
  public clearConversation() {
    this.conversation = [];
  }
  
  /**
   * 웰컴 메시지 가져오기
   */
  public getWelcomeMessage(): string {
    return this.welcomeMessages[Math.floor(Math.random() * this.welcomeMessages.length)];
  }
  
  /**
   * 대화 히스토리 가져오기
   */
  public getConversation(): ChatMessage[] {
    return [...this.conversation];
  }
}