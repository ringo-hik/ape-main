/**
 * 인라인 완성 제공자
 *
 * VS Code 입력 중에 인라인 제안 및 고스트 텍스트를 제공하는 컴포넌트
 */
import * as vscode from 'vscode';
import { LLMService } from '../llm/llmService';
/**
 * 인라인 완성 제공자 클래스
 */
export declare class InlineCompletionProvider implements vscode.InlineCompletionItemProvider {
    private readonly llmService;
    private readonly context;
    private completionCache;
    private cacheTimeout;
    private requestQueue;
    private completionConfig;
    private debounceTimer;
    /**
     * 생성자
     */
    constructor(llmService: LLMService, context: vscode.ExtensionContext);
    /**
     * 설정 로드
     */
    private loadConfiguration;
    /**
     * 인라인 완성 제공
     */
    provideInlineCompletionItems(document: vscode.TextDocument, position: vscode.Position, _context: vscode.InlineCompletionContext, _token: vscode.CancellationToken): Promise<vscode.InlineCompletionItem[] | vscode.InlineCompletionList | null>;
    /**
     * 완성을 건너뛸지 결정
     */
    private shouldSkipCompletion;
    /**
     * 현재 위치가 주석 내에 있는지 확인
     */
    private isPositionInComment;
    /**
     * 완성 컨텍스트 수집
     */
    private getCompletionContext;
    /**
     * LLM을 통한 인라인 완성 요청
     */
    private requestInlineCompletions;
    /**
     * LLM 응답을 InlineCompletionItem으로 파싱
     */
    private parseInlineCompletionResponse;
    /**
     * 중복 제거
     */
    private removeDuplicates;
}
