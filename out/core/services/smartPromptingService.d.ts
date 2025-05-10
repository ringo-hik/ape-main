import * as vscode from 'vscode';
import { LLMService } from '../llm/llmService';
/**
 * 스마트 프롬프팅 상태 인터페이스
 */
export interface SmartPromptingState {
    enabled: boolean;
    mode: SmartPromptingMode;
}
/**
 * 스마트 프롬프팅 모드 열거형
 */
export declare enum SmartPromptingMode {
    Basic = "basic",// 기본 모드 - 디버깅
    Advanced = "advanced",// 고급 모드 - 글쓰기
    Expert = "expert",// 전문가 모드 - 코드 분석
    Custom = "custom",// 사용자 정의 모드 - 리팩토링
    Creative = "creative",// 창의적 모드 - 아이디어 생성
    Friendly = "friendly"
}
/**
 * 스마트 프롬프팅 서비스
 *
 * 메시지 처리 전에 프롬프트를 증강하여 LLM 응답 품질을 향상시킵니다.
 * Chain of Thought(CoT) 및 동적 프롬프트 어셈블링을 지원합니다.
 */
export declare class SmartPromptingService {
    private readonly context;
    private readonly llmService;
    private state;
    private readonly stateChangeEmitter;
    readonly onStateChanged: vscode.Event<SmartPromptingState>;
    /**
     * 스마트 프롬프팅 서비스 생성자
     * @param context VSCode 확장 컨텍스트
     * @param llmService LLM 서비스
     */
    constructor(context: vscode.ExtensionContext, llmService: LLMService);
    /**
     * 저장된 상태 복원
     */
    private restoreState;
    /**
     * 상태 저장
     */
    private saveState;
    /**
     * 스마트 프롬프팅 활성화 여부 반환
     */
    isEnabled(): boolean;
    /**
     * 현재 스마트 프롬프팅 모드 반환
     */
    getMode(): SmartPromptingMode;
    /**
     * 현재 상태 반환
     */
    getState(): SmartPromptingState;
    /**
     * 스마트 프롬프팅 활성화/비활성화
     * @param enabled 활성화 여부
     */
    setEnabled(enabled: boolean): void;
    /**
     * 스마트 프롬프팅 모드 설정
     * @param mode 스마트 프롬프팅 모드
     */
    setMode(mode: SmartPromptingMode): void;
    /**
     * 스마트 프롬프팅 토글
     */
    toggle(): void;
    /**
     * 사용자 메시지를 스마트 프롬프팅으로 처리
     * @param message 원본 사용자 메시지
     * @returns 증강된 메시지
     */
    processMessage(message: string): string;
    /**
     * 기본 스마트 프롬프팅 적용 (디버깅 특화)
     * @param message 원본 메시지
     * @returns 증강된 메시지
     */
    private applyBasicPrompting;
    /**
     * 고급 스마트 프롬프팅 적용 (글쓰기 특화)
     * @param message 원본 메시지
     * @returns 증강된 메시지
     */
    private applyAdvancedPrompting;
    /**
     * 전문가 스마트 프롬프팅 적용 (코드 분석 특화)
     * @param message 원본 메시지
     * @returns 증강된 메시지
     */
    private applyExpertPrompting;
    /**
     * 사용자 정의 스마트 프롬프팅 적용 (리팩토링 특화)
     * @param message 원본 메시지
     * @returns 증강된 메시지
     */
    private applyCustomPrompting;
    /**
     * 창의적 스마트 프롬프팅 적용 (아이디어 생성 특화)
     * @param message 원본 메시지
     * @returns 증강된 메시지
     */
    private applyCreativePrompting;
    /**
     * 친근한 스마트 프롬프팅 적용 (친구 모드)
     * @param message 원본 메시지
     * @returns 증강된 메시지
     */
    private applyFriendlyPrompting;
    /**
     * 서비스 정리
     */
    dispose(): void;
}
