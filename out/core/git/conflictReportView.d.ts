/**
 * Git Conflict Report View
 *
 * LLM이 제안한 충돌 해결 방법을 웹뷰로 제공하고 사용자 승인 후 적용하는 시스템
 */
import * as vscode from 'vscode';
import { ConflictSolver } from './conflictSolver';
import { LLMService } from '../llm/llmService';
/**
 * 충돌 보고서 웹뷰 제공자
 */
export declare class ConflictReportViewProvider implements vscode.WebviewViewProvider {
    private readonly context;
    private readonly llmService;
    private readonly conflictSolver;
    static readonly viewType = "apeConflictReport";
    private _view?;
    private _proposals;
    private _extensionUri;
    private _workspaceRoot;
    private _pendingConflictCount;
    /**
     * 생성자
     */
    constructor(context: vscode.ExtensionContext, llmService: LLMService, conflictSolver: ConflictSolver);
    /**
     * 웹뷰 제공
     */
    resolveWebviewView(webviewView: vscode.WebviewView, _context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken): void;
    /**
     * 충돌이 있는지 확인 및 보고서 생성
     */
    checkForConflictsAndReport(): Promise<number>;
    /**
     * 충돌 제안 생성
     */
    private _generateProposal;
    /**
     * 제안 승인
     */
    private _approveProposal;
    /**
     * 제안 거부
     */
    private _rejectProposal;
    /**
     * 모든 제안 승인
     */
    private _approveAllProposals;
    /**
     * 승인된 제안 적용
     */
    private _applyApprovedProposals;
    /**
     * 제안 전략 변경
     */
    private _changeStrategy;
    /**
     * 제안 재생성
     */
    private _regenerateProposal;
    /**
     * 제안 직접 수정
     */
    private _editProposal;
    /**
     * 웹뷰 업데이트
     */
    private _updateView;
    /**
     * 웹뷰 HTML 생성
     */
    private _getHtmlForWebview;
}
