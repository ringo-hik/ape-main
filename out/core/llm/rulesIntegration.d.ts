/**
 * Rules 통합 모듈
 *
 * LLM 서비스에 Rules 기능을 통합하는 모듈입니다.
 * LLM 요청 시 Rules 시스템 프롬프트를 적용합니다.
 */
import { Message, LLMRequestOptions } from '../../types/chat';
import { RulesService } from '../services/rulesService';
/**
 * Rules 옵션 인터페이스
 */
export interface LLMRequestOptionsWithRules extends LLMRequestOptions {
    rulesOptions?: {
        includeRules?: boolean;
    };
}
/**
 * Rules 시스템 프롬프트를 메시지에 적용
 * @param messages 메시지 배열
 * @param rulesService Rules 서비스
 * @param options Rules 옵션
 * @returns Rules가 적용된 메시지 배열
 */
export declare function applyRulesContext(messages: Message[], rulesService: RulesService, options?: LLMRequestOptionsWithRules['rulesOptions']): Message[];
