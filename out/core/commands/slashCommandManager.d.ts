/**
 * 슬래시 커맨드 매니저
 *
 * 채팅 인터페이스에서 슬래시(/)로 시작하는 명령어를 처리하는 시스템
 */
import * as vscode from 'vscode';
import { SlashCommand, CommandSuggestion } from './slashCommand';
import { LLMService } from '../llm/llmService';
/**
 * 슬래시 커맨드 매니저 클래스
 */
export declare class SlashCommandManager {
    private readonly context;
    private readonly llmService?;
    private readonly services?;
    private readonly commands;
    private readonly aliasMap;
    private readonly koreanCommandMap;
    private readonly intentMap;
    private readonly _onDidSuggestCommands;
    /**
     * 명령어 제안 이벤트
     */
    readonly onDidSuggestCommands: vscode.Event<CommandSuggestion[]>;
    /**
     * 생성자
     */
    constructor(context: vscode.ExtensionContext, llmService?: LLMService | undefined, services?: any | undefined);
    /**
     * 기본 명령어 등록
     */
    private registerDefaultCommands;
    /**
     * VS Code 명령어 등록
     */
    private registerVSCodeCommands;
    /**
     * 명령어 등록
     */
    registerCommand(command: SlashCommand): void;
    /**
     * 이중 언어 명령어 등록
     * BilingualCommand 인터페이스로 정의된 명령어에 대한 한국어 지원을 등록합니다.
     */
    private registerBilingualCommand;
    /**
     * 명령어가 BilingualCommand 인터페이스를 구현하는지 확인
     */
    private isBilingualCommand;
    /**
     * 모든 명령어 가져오기
     */
    getAllCommands(): SlashCommand[];
    /**
     * 특정 명령어 가져오기
     */
    getCommand(name: string): SlashCommand | undefined;
    /**
     * 유사 명령어 찾기
     *
     * 레벤슈타인 거리 알고리즘을 사용하여 입력된 명령어와 가장 유사한 명령어를 찾습니다.
     * @param name 입력된 명령어 이름
     * @param maxDistance 최대 허용 거리 (기본값: 2)
     * @returns 가장 유사한 명령어 목록 (거리 오름차순)
     */
    findSimilarCommands(name: string, maxDistance?: number): Array<{
        command: SlashCommand;
        distance: number;
    }>;
    /**
     * 레벤슈타인 거리 계산
     *
     * 두 문자열 간의 편집 거리를 계산합니다. 값이 작을수록 문자열이 유사합니다.
     * @param a 첫 번째 문자열
     * @param b 두 번째 문자열
     * @returns 편집 거리
     */
    private levenshteinDistance;
    /**
     * 한글 의도 기반 명령어 매칭 (개선된 버전)
     *
     * 한글로 된 자연어 입력을 의도에 맞는 명령어로 매핑합니다.
     * 자연어 이해 기능으로 사용자 의도에 맞는 명령어를 찾아냅니다.
     * @param input 사용자 입력 (슬래시 포함)
     * @returns 매칭된 명령어 또는 undefined
     */
    private matchCommandByIntent;
    /**
     * 명령어 실행
     */
    executeCommand(input: string): Promise<boolean>;
    /**
     * 유사 명령어 추천 메시지 표시
     */
    private showSimilarCommandSuggestions;
    /**
     * 알 수 없는 명령어 처리 - LLM을 통한 해석 및 추천
     * @param commandName 알 수 없는 명령어 이름
     * @param originalInput 원본 입력
     */
    private handleUnknownCommand;
    /**
     * 알 수 없는 명령어 처리 - 유사 명령어 정보를 포함한 LLM 추천
     * @param commandName 알 수 없는 명령어 이름
     * @param originalInput 원본 입력
     * @param similarCommands 유사 명령어 목록
     */
    private handleUnknownCommandWithSuggestions;
    /**
     * 도움말 데이터 로드
     */
    private loadHelpData;
    /**
     * 가이드 데이터 로드
     */
    private loadGuideData;
    /**
     * 알 수 없는 명령어 처리를 위한 LLM 프롬프트 생성
     */
    private generateUnknownCommandPrompt;
    /**
     * 유사 명령어 정보를 포함한 알 수 없는 명령어 처리 프롬프트 생성
     */
    private generateUnknownCommandPromptWithSuggestions;
    /**
     * LLM 응답을 WebView 패널로 표시
     */
    private showLlmResponsePanel;
    /**
     * LLM 응답 HTML 생성
     */
    private getLlmResponseHtml;
    /**
     * 명령어 제안 항목 가져오기
     */
    getCommandSuggestions(input?: string): CommandSuggestion[];
    /**
     * 명령어 필터링
     */
    private filterCommands;
    /**
     * 카테고리별 아이콘 가져오기
     */
    private getIconForCategory;
    /**
     * 명령어 자동완성 제공
     */
    provideCompletions(input: string): string[];
    /**
     * 명령어 제안 업데이트
     *
     * 채팅 입력 필드 값이 변경될 때 호출됩니다.
     */
    updateSuggestions(input: string): void;
    /**
     * 명령어 도움말 표시
     *
     * 새로운 JSON 기반 도움말 시스템 사용
     */
    private showCommandHelp;
    /**
     * 도움말 명령어 처리
     *
     * 도움말 패널 내에서 명령어 실행 시 처리
     */
    private processHelpCommand;
    /**
     * 카테고리 제목 가져오기
     */
    private getCategoryTitle;
    /**
     * 도움말 패널 HTML 생성
     */
    private getHelpPanelHtml;
    /**
     * 마크다운을 HTML로 변환 (간단 구현)
     */
    private markdownToHtml;
    /**
     * Git 상태 표시
     */
    private showGitStatus;
    /**
     * 변경 유형 라벨 가져오기
     */
    private getChangeTypeLabel;
}
