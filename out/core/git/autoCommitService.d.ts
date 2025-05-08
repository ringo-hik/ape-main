/**
 * Auto Commit Service
 *
 * 자동 커밋, 커밋 메시지 생성, 충돌 해결 기능을 제공하는 서비스
 */
import * as vscode from 'vscode';
import { LLMService } from '../llm/llmService';
import { BitbucketService } from './bitbucketService';
/**
 * 자동 커밋 서비스 클래스
 */
export declare class AutoCommitService implements vscode.Disposable {
    private readonly context;
    private readonly llmService;
    private readonly bitbucketService?;
    private workspaceRoot;
    private statusBarItem;
    private commitInProgress;
    private disposables;
    private gitWatcher;
    /**
     * 생성자
     */
    constructor(context: vscode.ExtensionContext, llmService: LLMService, bitbucketService?: BitbucketService | undefined);
    /**
     * 명령어 등록
     */
    private registerCommands;
    /**
     * Git 변경 감지 설정
     */
    private setupGitWatcher;
    /**
     * 상태 표시줄 업데이트
     */
    private updateStatusBar;
    /**
     * 자동 커밋 토글
     */
    private toggleAutoCommit;
    /**
     * 파일 저장 처리
     */
    private handleFileSaved;
    /**
     * 커밋 생성
     */
    createCommit(): Promise<void>;
    /**
     * 자동 커밋 메시지 생성
     */
    private generateCommitMessage;
    /**
     * LLM을 사용한 고급 커밋 메시지 생성
     * @throws Error 커밋 메시지 생성 실패 시 오류를 던짐
     */
    private generateLLMCommitMessage;
    /**
     * 로컬 Git 명령어를 사용하여 커밋 이력 가져오기 (BitBucket 폴백)
     * @private
     */
    private fallbackToLocalGitHistory;
    /**
     * 임시 커밋 통합
     *
     * [APE][Temporary] 프리픽스가 붙은 모든 임시 커밋을 찾아서
     * 이들을 통합하여 하나의 정상적인 커밋으로 만듭니다.
     */
    consolidateTemporaryCommits(): Promise<void>;
    /**
     * 리소스 해제
     */
    dispose(): void;
}
