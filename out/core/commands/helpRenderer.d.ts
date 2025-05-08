/**
 * 도움말 렌더러
 *
 * 도움말 데이터를 웹뷰에 표시하기 위한 HTML로 변환합니다.
 */
import { LLMService } from '../llm/llmService';
/**
 * 확장 컨텍스트 설정
 */
export declare function setExtensionContext(): void;
/**
 * 도움말 데이터 로드
 * @returns 도움말 데이터 객체
 */
export declare function loadHelpData(): Promise<any>;
/**
 * 특정 명령어 데이터 가져오기
 * @param commandName 명령어 이름
 * @returns 명령어 데이터 객체
 */
export declare function getCommandData(commandName: string): Promise<any | null>;
/**
 * 카테고리별 명령어 목록 가져오기
 * @param categoryId 카테고리 ID (옵션)
 * @returns 카테고리별 명령어 목록
 */
export declare function getCommandsByCategory(categoryId?: string): Promise<any[]>;
/**
 * 도움말 HTML 생성 (기본 카테고리 목록)
 * @param categoryId 카테고리 ID (옵션)
 * @returns HTML 문자열
 */
export declare function generateHelpHtml(categoryId?: string): Promise<string>;
/**
 * 명령어 상세 정보 HTML 생성
 * @param commandName 명령어 이름
 * @returns HTML 문자열
 */
export declare function generateCommandDetailHtml(commandName: string): Promise<string>;
/**
 * FAQ HTML 생성
 * @returns HTML 문자열
 */
export declare function generateFaqHtml(): Promise<string>;
/**
 * 가이드 문서 HTML 생성
 * @param guideId 가이드 ID
 * @returns HTML 문자열
 */
export declare function generateGuideHtml(guideId: string): Promise<string>;
/**
 * 모든 가이드 목록 HTML 생성
 * @returns HTML 문자열
 */
export declare function generateGuidesListHtml(): Promise<string>;
/**
 * LLM을 사용한 스마트 도움말 생성
 * @param query 사용자 질문
 * @param llmService LLM 서비스 인스턴스
 * @returns HTML 문자열
 */
export declare function generateSmartHelpHtml(query: string, llmService: LLMService): Promise<string>;
/**
 * Agent 도구 목록 HTML 생성
 * @returns HTML 문자열
 */
export declare function generateToolsHelpHtml(): Promise<string>;
