/**
 * Bitbucket 서비스
 *
 * Bitbucket API와 통신하여 PR 생성, 코멘트 추가 등의 기능을 제공합니다.
 */
import * as vscode from 'vscode';
/**
 * Bitbucket 서비스 클래스
 */
export declare class BitbucketService implements vscode.Disposable {
    private readonly _context;
    private _disposables;
    constructor(_context: vscode.ExtensionContext);
    /**
     * 명령어 등록
     */
    private _registerCommands;
    /**
     * PR 생성
     */
    createPullRequest(): Promise<void>;
    /**
     * Git 사용자 이름 가져오기
     */
    getGitUsername(): Promise<string | null>;
    /**
     * 커밋 이력 가져오기
     */
    getCommitHistory(username: string, limit?: number): Promise<any[]>;
    /**
     * Bitbucket 저장소 정보 조회
     */
    getRepositoryInfo(): Promise<any>;
    /**
     * Dispose resources
     */
    dispose(): void;
}
