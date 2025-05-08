/**
 * Tab Completion Provider
 *
 * 탭 자동 완성 기능을 제공하는 모듈
 */
import * as vscode from 'vscode';
import { LLMService } from '../llm/llmService';
/**
 * 자동 완성 아이템
 */
export interface CompletionItem extends vscode.CompletionItem {
    sourceFile?: string;
    confidence?: number;
}
/**
 * 탭 자동 완성 제공자
 */
export declare class TabCompletionProvider implements vscode.CompletionItemProvider {
    private readonly llmService;
    private cachedCompletions;
    private cacheTimeout;
    private suggestionCache;
    private contextAwareCommands;
    /**
     * 생성자
     */
    constructor(llmService: LLMService);
    /**
     * 컨텍스트 인식 명령어 초기화
     */
    private initializeContextAwareCommands;
    /**
     * 자동 완성 제안
     */
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): Promise<vscode.CompletionItem[] | vscode.CompletionList>;
    /**
     * 명령어 자동 완성인지 확인
     */
    private isCommandCompletion;
    /**
     * 명령어 자동 완성 제공
     */
    private provideCommandCompletions;
    /**
     * 현재 컨텍스트 파악
     */
    private getActiveContext;
    /**
     * Git 저장소인지 확인
     */
    private isGitRepository;
    /**
     * 코드 자동 완성 제공
     */
    private provideCodeCompletions;
    /**
     * LLM을 통한 코드 완성 요청
     */
    private requestCodeCompletions;
    /**
     * LLM 응답을 CompletionItem으로 파싱
     */
    private parseCompletionResponse;
    /**
     * 현재 줄과 제안 사이의 겹치는 부분 찾기
     */
    private findOverlap;
    /**
     * CompletionItem 생성 헬퍼 함수
     */
    private createCompletionItem;
}
