/**
 * VAULT 서비스와 LLM 서비스 통합 모듈
 *
 * VAULT 컨텍스트를 LLM 요청에 적용하는 기능을 제공합니다.
 */
import { LLMRequestOptions, Message } from '../../types/chat';
import { VaultService, VaultContextType } from '../services/vaultService';
/**
 * VAULT 컨텍스트 적용 옵션
 */
export interface VaultContextOptions {
    contextIds?: string[];
    contextTypes?: VaultContextType[];
    itemIds?: string[];
    tags?: string[];
    searchQuery?: string;
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
export declare function applyVaultContext(messages: Message[], vaultService: VaultService, options: VaultContextOptions): Message[];
