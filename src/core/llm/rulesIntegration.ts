/**
 * Rules 통합 모듈
 * 
 * LLM 서비스에 Rules 기능을 통합하는 모듈입니다.
 * LLM 요청 시 Rules 시스템 프롬프트를 적용합니다.
 */

import { Message, MessageRole, LLMRequestOptions } from '../../types/chat';
import { RulesService } from '../services/rulesService';

/**
 * Rules 옵션 인터페이스
 */
export interface LLMRequestOptionsWithRules extends LLMRequestOptions {
  rulesOptions?: {
    includeRules?: boolean;   // Rules 포함 여부 (기본값: true)
  };
}

/**
 * Rules 시스템 프롬프트를 메시지에 적용
 * @param messages 메시지 배열
 * @param rulesService Rules 서비스
 * @param options Rules 옵션
 * @returns Rules가 적용된 메시지 배열
 */
export function applyRulesContext(
  messages: Message[],
  rulesService: RulesService,
  options?: LLMRequestOptionsWithRules['rulesOptions']
): Message[] {
  // Rules 옵션이 명시적으로 false가 아니면 Rules 적용
  const includeRules = options?.includeRules !== false;
  
  if (!includeRules || !rulesService) {
    return messages;
  }
  
  try {
    // 활성화된 Rules가 있는지 확인
    const activeRules = rulesService.getActiveRules();
    if (activeRules.length === 0) {
      return messages;
    }
    
    // Rules 시스템 프롬프트 생성
    const rulesPrompt = rulesService.getRulesAsSystemPrompt();
    if (!rulesPrompt) {
      return messages;
    }
    
    // 기존 시스템 메시지가 있는지 확인
    const systemMessageIndex = messages.findIndex(msg => msg.role === MessageRole.System);
    
    if (systemMessageIndex >= 0) {
      // 기존 시스템 메시지가 있으면 Rules 프롬프트를 추가
      const updatedMessages = [...messages];
      const existingSystemMessage = updatedMessages[systemMessageIndex];
      
      updatedMessages[systemMessageIndex] = {
        ...existingSystemMessage,
        content: `${rulesPrompt}\n\n${existingSystemMessage.content}`
      };
      
      return updatedMessages;
    } else {
      // 시스템 메시지가 없으면 새 시스템 메시지를 추가
      return [
        {
          id: `system_rules_${Date.now()}`,
          role: MessageRole.System,
          content: rulesPrompt,
          timestamp: new Date()
        },
        ...messages
      ];
    }
  } catch (error) {
    console.error('Rules 적용 중 오류 발생:', error);
    return messages;
  }
}