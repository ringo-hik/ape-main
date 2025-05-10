import { PluginRegistry } from '../types/plugin';
interface SlashCommand {
    name: string;
    description: string;
    execute: (args: string) => Promise<string>;
    getHelp?: () => string;
    getCompletions?: (partialArgs: string) => string[];
}
interface SlashCommandManager {
    registerCommand: (command: SlashCommand) => void;
    unregisterCommand: (commandName: string) => boolean;
    getCommands: () => SlashCommand[];
}
/**
 * 플러그인 슬래시 커맨드 통합
 */
export declare class PluginSlashCommandIntegration {
    private readonly _pluginRegistry;
    private readonly _slashCommandManager;
    private readonly _pluginCommands;
    /**
     * 플러그인 슬래시 커맨드 통합 생성
     * @param pluginRegistry 플러그인 레지스트리
     * @param slashCommandManager 슬래시 커맨드 매니저
     */
    constructor(pluginRegistry: PluginRegistry, slashCommandManager: SlashCommandManager);
    /**
     * 플러그인 상태 변경 처리
     * @param pluginId 플러그인 ID
     * @param oldState 이전 상태
     * @param newState 새 상태
     */
    private _handlePluginStateChange;
    /**
     * 모든 활성 플러그인의 명령어 등록
     */
    registerAllPluginCommands(): void;
    /**
     * 플러그인의 명령어 등록
     * @param pluginId 플러그인 ID
     */
    private _registerPluginCommands;
    /**
     * 플러그인의 명령어 해제
     * @param pluginId 플러그인 ID
     */
    private _unregisterPluginCommands;
    /**
     * LLM을 사용하여 사용자 입력에서 파라미터 추출
     * @param plugin 플러그인 스키마
     * @param functionId 함수 ID
     * @param userInput 사용자 입력
     * @returns 추출된 파라미터
     */
    private _extractParameters;
    /**
     * 사용자 입력에서 파라미터 수동 파싱
     * @param plugin 플러그인 스키마
     * @param functionId 함수 ID
     * @param userInput 사용자 입력
     * @returns 추출된 파라미터
     */
    private _parseParametersManually;
    /**
     * 응답 포맷팅
     * @param plugin 플러그인 스키마
     * @param functionId 함수 ID
     * @param response API 응답
     * @param params 요청 파라미터
     * @returns 포맷팅된 응답
     */
    private _formatResponse;
    /**
     * 응답 수동 포맷팅
     * @param func 함수 정의
     * @param response API 응답
     * @param params 요청 파라미터
     * @returns 포맷팅된 응답
     */
    private _formatResponseManually;
    /**
     * 객체에서 경로로 값 가져오기
     * @param obj 객체
     * @param path 경로 (점 표기법)
     * @returns 값 또는 undefined
     */
    private _getValueByPath;
    /**
     * 각 블록 처리 (간단한 구현)
     * @param template 템플릿
     * @param response 응답
     * @param params 파라미터
     * @returns 처리된 템플릿
     */
    private _processEachBlocks;
    /**
     * 조건 블록 처리 (간단한 구현)
     * @param template 템플릿
     * @param response 응답
     * @param params 파라미터
     * @returns 처리된 템플릿
     */
    private _processIfBlocks;
    /**
     * LLM 서비스 가져오기 (실제 구현에서는 적절한 방식으로 구현 필요)
     * @returns LLM 서비스 또는 undefined
     */
    private _getLLMService;
}
export {};
