/**
 * Bitbucket 서비스
 *
 * Bitbucket API와 통신하여 PR 생성, 코멘트 추가 등의 기능을 제공합니다.
 */

import * as vscode from 'vscode';
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Bitbucket 서비스 클래스
 */
export class BitbucketService implements vscode.Disposable {
  private _disposables: vscode.Disposable[] = [];

  constructor(private readonly _context: vscode.ExtensionContext) {
    // 명령어 등록
    this._registerCommands();
  }

  /**
   * 명령어 등록
   */
  private _registerCommands(): void {
    // PR 생성 명령어
    this._disposables.push(
      vscode.commands.registerCommand('ape.createPullRequest', () => this.createPullRequest())
    );
  }

  /**
   * PR 생성
   */
  public async createPullRequest(): Promise<void> {
    try {
      // 현재는 미구현 상태
      vscode.window.showInformationMessage('Bitbucket PR 생성 기능이 아직 구현되지 않았습니다.');
    } catch (error) {
      vscode.window.showErrorMessage(`PR 생성 중 오류가 발생했습니다: ${error}`);
    }
  }

  /**
   * Git 사용자 이름 가져오기
   */
  public async getGitUsername(): Promise<string | null> {
    try {
      const { stdout } = await execAsync('git config user.name');
      return stdout.trim();
    } catch (error) {
      console.error('Git 사용자 이름을 가져오는 중 오류 발생:', error);
      return null;
    }
  }

  /**
   * 커밋 이력 가져오기
   */
  public async getCommitHistory(username: string, limit: number = 10): Promise<any[]> {
    try {
      // 실제 Bitbucket API 통합 전 로컬 Git으로 대체
      const { stdout } = await execAsync(`git log --author="${username}" --pretty=format:"%h%x09%s" -${limit}`);

      // 결과 파싱
      return stdout.split('\n')
        .filter(line => line.trim())
        .map(line => {
          const [displayId, message] = line.split('\t');
          return {
            displayId: displayId.trim(),
            message: message.trim()
          };
        });
    } catch (error) {
      console.error('커밋 이력을 가져오는 중 오류 발생:', error);
      return [];
    }
  }

  /**
   * Bitbucket 저장소 정보 조회
   */
  public async getRepositoryInfo(): Promise<any> {
    // 미구현 상태 - 향후 구현 예정
    return null;
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    this._disposables.forEach(d => d.dispose());
  }
}