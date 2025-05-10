/**
 * VAULT 서비스와 LLM 서비스 통합 모듈
 * 
 * VAULT 컨텍스트를 LLM 요청에 적용하는 기능을 제공합니다.
 */

import { LLMRequestOptions, Message, MessageRole } from '../../types/chat';
import { VaultService, VaultContextType, VaultItem } from '../services/vaultService';

/**
 * VAULT 컨텍스트 적용 옵션
 */
export interface VaultContextOptions {
  // 사용할 컨텍스트 ID 목록
  contextIds?: string[];
  
  // 사용할 컨텍스트 유형 목록
  contextTypes?: VaultContextType[];
  
  // 사용할 아이템 ID 목록
  itemIds?: string[];
  
  // 아이템 태그 필터
  tags?: string[];
  
  // 검색어 (아이템 콘텐츠 내 검색)
  searchQuery?: string;
  
  // 결합 방식: 'prepend'(앞에 추가), 'append'(뒤에 추가), 'replace'(대체)
  combinationMode?: 'prepend' | 'append' | 'replace';
}

/**
 * LLMRequestOptions를 확장하여 VAULT 옵션 추가
 */
export interface LLMRequestOptionsWithVault extends LLMRequestOptions {
  vaultOptions?: VaultContextOptions;
}

/**
 * VAULT 컨텍스트를 LLM 요청에 적용
 * @param messages 원본 메시지 배열
 * @param vaultService VAULT 서비스 인스턴스
 * @param options VAULT 컨텍스트 적용 옵션
 * @returns VAULT 컨텍스트가 적용된 메시지 배열
 */
export function applyVaultContext(
  messages: Message[],
  vaultService: VaultService,
  options: VaultContextOptions
): Message[] {
  if (!options) {
    return messages;
  }
  
  // 조건에 맞는 아이템 검색
  const items = findRelevantVaultItems(vaultService, options);
  
  if (items.length === 0) {
    return messages;
  }
  
  // 컨텍스트 메시지 생성
  const contextMessages = createContextMessages(items);
  
  // 결합 방식에 따라 메시지 배열 업데이트
  return combineMessages(messages, contextMessages, options.combinationMode || 'prepend');
}

/**
 * 조건에 맞는 VAULT 아이템 찾기
 */
function findRelevantVaultItems(
  vaultService: VaultService,
  options: VaultContextOptions
): VaultItem[] {
  let result: VaultItem[] = [];
  
  // 1. 아이템 ID로 직접 조회 (가장 우선순위 높음)
  if (options.itemIds && options.itemIds.length > 0) {
    const allContexts = vaultService.getAllContexts();
    
    for (const context of allContexts) {
      const matchingItems = context.items.filter(item => 
        options.itemIds!.includes(item.id)
      );
      
      result.push(...matchingItems);
    }
    
    // 아이템 ID가 지정된 경우 다른 필터는 적용하지 않음
    return result;
  }
  
  // 2. 컨텍스트 ID로 해당 컨텍스트의 모든 아이템 조회
  if (options.contextIds && options.contextIds.length > 0) {
    for (const contextId of options.contextIds) {
      const context = vaultService.getContextById(contextId);
      if (context) {
        result.push(...context.items);
      }
    }
    
    // 여기서 바로 반환하지 않고 아래 필터를 추가로 적용
  }
  
  // 3. 컨텍스트 유형으로 조회 (contextIds가 없는 경우)
  if ((!options.contextIds || options.contextIds.length === 0) && 
      options.contextTypes && options.contextTypes.length > 0) {
    for (const contextType of options.contextTypes) {
      const contexts = vaultService.getContextsByType(contextType);
      for (const context of contexts) {
        result.push(...context.items);
      }
    }
  }
  
  // 4. 아무 컨텍스트도 지정되지 않은 경우, 검색어나 태그가 있으면 전체 검색
  if ((!options.contextIds || options.contextIds.length === 0) && 
      (!options.contextTypes || options.contextTypes.length === 0) &&
      (options.searchQuery || (options.tags && options.tags.length > 0))) {
    result = vaultService.searchItems(
      options.searchQuery || '', 
      { tags: options.tags }
    );
  }
  
  // 추가 필터: 태그로 필터링 (이미 다른 기준으로 필터된 아이템들에 대해)
  if (options.tags && options.tags.length > 0) {
    result = result.filter(item => {
      if (!item.tags) return false;
      return options.tags!.some(tag => item.tags!.includes(tag));
    });
  }
  
  // 추가 필터: 검색어로 필터링 (이미 다른 기준으로 필터된 아이템들에 대해)
  if (options.searchQuery) {
    const query = options.searchQuery.toLowerCase();
    result = result.filter(item => 
      item.name.toLowerCase().includes(query) ||
      (item.description && item.description.toLowerCase().includes(query)) ||
      item.content.toLowerCase().includes(query) ||
      (item.tags && item.tags.some(tag => tag.toLowerCase().includes(query)))
    );
  }
  
  return result;
}

/**
 * VAULT 아이템들로부터 컨텍스트 메시지 생성
 */
function createContextMessages(items: VaultItem[]): Message[] {
  const contextMessages: Message[] = [];
  
  // 각 아이템마다 메시지 생성
  for (const item of items) {
    // 아이템의 컨텍스트 유형에 따라 적절한 역할 지정
    let role = MessageRole.System;
    
    if (item.contextType === VaultContextType.Personal ||
        item.contextType === VaultContextType.Project ||
        item.contextType === VaultContextType.Shared) {
      role = MessageRole.User;
    }
    
    contextMessages.push({
      id: `vault_${item.id}_${Date.now()}`,
      role,
      content: formatItemContent(item),
      timestamp: new Date(),
      metadata: {
        isVaultContext: true,
        vaultItemId: item.id,
        vaultContextType: item.contextType,
        vaultTags: item.tags
      }
    });
  }
  
  return contextMessages;
}

/**
 * VAULT 아이템 콘텐츠 포맷팅
 */
function formatItemContent(item: VaultItem): string {
  // 기본적으로 콘텐츠를 그대로 사용
  const content = item.content;
  
  // 아이템 유형에 따라 특별한 포맷팅 적용
  if (item.contextType === VaultContextType.System) {
    // 시스템 프롬프트로 사용
    return content;
  } else if (item.contextType === VaultContextType.Template) {
    // 템플릿은 그대로 사용
    return content;
  } else {
    // 다른 유형들은 메타데이터 추가
    const header = `VAULT 컨텍스트: ${item.name}\n`;
    const tags = item.tags?.length ? `태그: ${item.tags.join(', ')}\n` : '';
    return `${header}${tags}${content}`;
  }
}

/**
 * 원본 메시지와 컨텍스트 메시지 결합
 */
function combineMessages(
  originalMessages: Message[],
  contextMessages: Message[],
  mode: 'prepend' | 'append' | 'replace'
): Message[] {
  if (mode === 'replace') {
    return contextMessages;
  } else if (mode === 'append') {
    return [...originalMessages, ...contextMessages];
  } else { // prepend (기본값)
    return [...contextMessages, ...originalMessages];
  }
}