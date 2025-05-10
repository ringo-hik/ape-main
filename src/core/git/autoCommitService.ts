/**
 * Auto Commit Service
 * 
 * 자동 커밋, 커밋 메시지 생성, 충돌 해결 기능을 제공하는 서비스
 */

import * as vscode from 'vscode';
import * as path from 'path';
// import * as fs from 'fs';
import { LLMService } from '../llm/llmService';
import { BitbucketService } from './bitbucketService';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * 자동 커밋 서비스 클래스
 */
export class AutoCommitService implements vscode.Disposable {
  private workspaceRoot: string | undefined;
  private statusBarItem: vscode.StatusBarItem;
  private commitInProgress: boolean = false;
  private disposables: vscode.Disposable[] = [];
  private gitWatcher: vscode.FileSystemWatcher | undefined;
  
  /**
   * 생성자
   */
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly llmService: LLMService,
    private readonly bitbucketService?: BitbucketService
  ) {
    // 워크스페이스 루트 설정
    this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    
    // 상태 표시줄 아이템 생성
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.statusBarItem.text = "$(git-commit) 자동 커밋 준비됨";
    this.statusBarItem.tooltip = "APE 자동 커밋 서비스";
    this.statusBarItem.command = "ape.git.toggleAutoCommit";
    this.statusBarItem.show();
    
    // 명령어 등록
    this.registerCommands();
    
    // Git 변경 감지 설정
    this.setupGitWatcher();
  }
  
  /**
   * 명령어 등록
   */
  private registerCommands(): void {
    // 자동 커밋 토글
    this.disposables.push(
      vscode.commands.registerCommand('ape.git.toggleAutoCommit', () => this.toggleAutoCommit())
    );
    
    // 수동 커밋
    this.disposables.push(
      vscode.commands.registerCommand('ape.git.commit', () => this.createCommit())
    );
    
    // 임시 커밋 통합
    this.disposables.push(
      vscode.commands.registerCommand('ape.git.consolidateTemporaryCommits', () => this.consolidateTemporaryCommits())
    );
  }
  
  /**
   * Git 변경 감지 설정
   */
  private setupGitWatcher(): void {
    if (!this.workspaceRoot) {
      return;
    }
    
    try {
      // .git/index 파일 변경 감지
      const gitIndexPath = path.join(this.workspaceRoot, '.git', 'index');
      this.gitWatcher = vscode.workspace.createFileSystemWatcher(gitIndexPath);
      
      // 파일 변경 시 상태 업데이트
      this.gitWatcher.onDidChange(() => {
        this.updateStatusBar();
      });
      
      this.disposables.push(this.gitWatcher);
      
      // 초기 상태 업데이트
      this.updateStatusBar();
      
      // 에디터 저장 이벤트 감지
      vscode.workspace.onDidSaveTextDocument(() => {
        // 자동 커밋이 활성화되었을 때 파일 저장 시 변경 사항 감지
        void this.handleFileSaved();
      }, this, this.disposables);
    } catch (error) {
      // Git 저장소가 아닌 경우 무시
      console.log('Git 저장소가 아닙니다:', error);
    }
  }
  
  /**
   * 상태 표시줄 업데이트
   */
  private async updateStatusBar(): Promise<void> {
    if (!this.workspaceRoot) {
      this.statusBarItem.hide();
      return;
    }
    
    try {
      // Git 상태 확인
      const { stdout } = await execAsync('git status --porcelain', { cwd: this.workspaceRoot });
      
      if (stdout.trim() === '') {
        // 변경 사항 없음
        this.statusBarItem.text = "$(git-commit) 자동 커밋 준비됨";
        this.statusBarItem.tooltip = "변경 사항이 없습니다";
      } else {
        // 변경된 파일 수 계산
        const changedFiles = stdout.split('\n').filter(line => line.trim() !== '').length;
        this.statusBarItem.text = `$(git-commit) 자동 커밋 (${changedFiles})`;
        this.statusBarItem.tooltip = `${changedFiles}개 파일이 변경되었습니다`;
      }
      
      this.statusBarItem.show();
    } catch {
      // Git 저장소가 아닌 경우
      this.statusBarItem.text = "$(git-commit) Git 저장소 아님";
      this.statusBarItem.tooltip = "현재 폴더는 Git 저장소가 아닙니다";
      this.statusBarItem.show();
    }
  }
  
  /**
   * 자동 커밋 토글
   */
  private toggleAutoCommit(): void {
    const config = vscode.workspace.getConfiguration('ape.git');
    const current = config.get<boolean>('autoCommit', false);
    
    // 설정 토글
    config.update('autoCommit', !current, vscode.ConfigurationTarget.Workspace).then(() => {
      vscode.window.showInformationMessage(`자동 커밋이 ${!current ? '활성화' : '비활성화'}되었습니다`);
      
      // 상태 표시줄 업데이트
      if (!current) {
        this.statusBarItem.text = "$(git-commit) 자동 커밋 활성화됨";
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      } else {
        this.statusBarItem.text = "$(git-commit) 자동 커밋 준비됨";
        this.statusBarItem.backgroundColor = undefined;
      }
    });
  }
  
  /**
   * 파일 저장 처리
   */
  private async handleFileSaved(): Promise<void> {
    if (this.commitInProgress) {
      return;
    }
    
    // 자동 커밋 설정 확인
    const config = vscode.workspace.getConfiguration('ape.git');
    const autoCommitEnabled = config.get<boolean>('autoCommit', false);
    
    if (!autoCommitEnabled) {
      return;
    }
    
    // 일정 시간 후 커밋 (연속 저장 방지)
    setTimeout(async () => {
      try {
        // 변경 사항 확인
        const { stdout } = await execAsync('git status --porcelain', { cwd: this.workspaceRoot });
        
        if (stdout.trim() !== '') {
          // 변경 사항이 있으면 커밋
          await this.createCommit();
        }
      } catch (error) {
        console.error('자동 커밋 오류:', error);
      }
    }, 2000); // 2초 지연
  }
  
  /**
   * 커밋 생성
   */
  public async createCommit(): Promise<void> {
    if (!this.workspaceRoot || this.commitInProgress) {
      return;
    }
    
    this.commitInProgress = true;
    
    try {
      // Git 상태 확인
      const { stdout: statusOutput } = await execAsync('git status --porcelain', { cwd: this.workspaceRoot });
      
      if (statusOutput.trim() === '') {
        vscode.window.showInformationMessage('커밋할 변경 사항이 없습니다');
        this.commitInProgress = false;
        return;
      }
      
      // 변경된 파일 목록
      const changedFiles = statusOutput
        .split('\n')
        .filter(line => line.trim() !== '')
        .map(line => {
          const status = line.substring(0, 2).trim();
          const file = line.substring(3).trim();
          return { status, file };
        });
      
      // 변경 내용 확인
      const { stdout: diffOutput } = await execAsync('git diff --staged', { cwd: this.workspaceRoot });
      const unstaged = await execAsync('git diff', { cwd: this.workspaceRoot });
      
      try {
        // 자동 커밋 메시지 생성
        let commitMessage = await this.generateCommitMessage(changedFiles, diffOutput + unstaged.stdout);
        
        // 자동 커밋의 경우 프리픽스 추가
        const config = vscode.workspace.getConfiguration('ape.git');
        const autoCommitEnabled = config.get<boolean>('autoCommit', false);
        
        if (autoCommitEnabled) {
          // 자동 커밋인 경우 [APE][Temporary] 프리픽스 추가
          commitMessage = `[APE][Temporary] ${commitMessage}`;
        }
        
        // 변경 사항 스테이징
        await execAsync('git add .', { cwd: this.workspaceRoot });
        
        // 커밋 생성
        await execAsync(`git commit -m "${commitMessage}"`, { cwd: this.workspaceRoot });
        
        // 성공 메시지
        vscode.window.showInformationMessage(`커밋 성공: ${commitMessage}`);
        
        // 상태 업데이트
        this.updateStatusBar();
      } catch (error: any) {
        // 커밋 메시지 생성 실패 처리
        const errorMessage = error.message || '알 수 없는 오류';
        
        // BitBucket 오류나 Jira 오류 등 외부 API 오류일 경우 구체적인 메시지 전달
        if (errorMessage.includes('BitBucket') || errorMessage.includes('Jira')) {
          vscode.window.showErrorMessage(`서비스 연결 실패: ${errorMessage}. 설정을 확인하세요.`);
        } else {
          vscode.window.showErrorMessage(`커밋 실패: ${errorMessage}`);
        }
        
        // API 설정 안내
        const openSettings = '설정 열기';
        vscode.window.showInformationMessage(
          '아틀라시안 API 설정이 올바르지 않거나 누락되었습니다. 설정에서 확인해보세요.', 
          openSettings
        ).then(selection => {
          if (selection === openSettings) {
            vscode.commands.executeCommand('workbench.action.openSettings', 'ape.bitbucket');
          }
        });
      }
    } catch (error: any) {
      // Git 명령 실행 자체의 오류 (status 조회, diff 실패 등)
      vscode.window.showErrorMessage(`Git 명령 실패: ${error.message}`);
    } finally {
      this.commitInProgress = false;
    }
  }
  
  /**
   * 자동 커밋 메시지 생성
   */
  private async generateCommitMessage(
    changedFiles: Array<{ status: string, file: string }>,
    diff: string
  ): Promise<string> {
    try {
      // 설정에서 LLM 사용 여부 확인
      const config = vscode.workspace.getConfiguration('ape.git');
      const useLLM = config.get<boolean>('useLLMForCommitMessages', false);
      
      // LLM 사용 시 고급 커밋 메시지 생성
      if (useLLM && diff.length > 0) {
        try {
          return await this.generateLLMCommitMessage(changedFiles, diff);
        } catch (error) {
          console.error('LLM 커밋 메시지 생성 실패:', error);
          // LLM 생성 실패 시 기본 메시지 생성 로직으로 폴백
        }
      }
      
      // 간단한 커밋 메시지 헤더 생성 로직
      let messagePrefix = '';
      
      // 변경 유형에 따른 접두사 결정
      const newFiles = changedFiles.filter(file => file.status.includes('A') || file.status.includes('?'));
      const modifiedFiles = changedFiles.filter(file => file.status.includes('M'));
      const deletedFiles = changedFiles.filter(file => file.status.includes('D'));
      
      if (newFiles.length > 0 && modifiedFiles.length === 0 && deletedFiles.length === 0) {
        messagePrefix = 'Add';
      } else if (modifiedFiles.length > 0 && newFiles.length === 0 && deletedFiles.length === 0) {
        messagePrefix = 'Update';
      } else if (deletedFiles.length > 0 && newFiles.length === 0 && modifiedFiles.length === 0) {
        messagePrefix = 'Remove';
      } else if (deletedFiles.length > 0 || newFiles.length > 0) {
        messagePrefix = 'Refactor';
      } else {
        messagePrefix = 'Fix';
      }
      
      // 변경된 파일 경로에서 주요 구성 요소 추출
      const fileComponents: string[] = [];
      for (const file of changedFiles) {
        const ext = path.extname(file.file);
        const dir = path.dirname(file.file);
        
        // 확장자 및 디렉토리 정보 수집
        if (ext && !fileComponents.includes(ext.substring(1))) {
          fileComponents.push(ext.substring(1));
        }
        
        // 주요 디렉토리 경로 추출
        const mainDir = dir.split('/')[0];
        if (mainDir && mainDir !== '.' && !fileComponents.includes(mainDir)) {
          fileComponents.push(mainDir);
        }
      }
      
      // 변경된 파일 목록 요약
      let fileList = '';
      if (changedFiles.length <= 3) {
        fileList = changedFiles.map(f => path.basename(f.file)).join(', ');
      } else {
        fileList = `${changedFiles.length} files`;
      }
      
      // 기본 커밋 메시지 생성
      const component = fileComponents.length > 0 ? fileComponents.join(', ') : 'code';
      const baseMessage = `${messagePrefix} ${component}: `;
      
      return `${baseMessage}${fileList}`;
    } catch (error) {
      console.error('커밋 메시지 생성 오류:', error);
      throw new Error(`커밋 메시지 생성 실패: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * LLM을 사용한 고급 커밋 메시지 생성
   * @throws Error 커밋 메시지 생성 실패 시 오류를 던짐
   */
  private async generateLLMCommitMessage(
    changedFiles: Array<{ status: string, file: string }>,
    diff: string
  ): Promise<string> {
    // 커밋 메시지 예제 가져오기
    let commitExamples = '';
    
    try {
      // BitBucket 서비스가 주입되었는지 확인
      if (this.bitbucketService) {
        try {
          // BitBucket API를 사용하여 사용자 이름 가져오기
          const userName = await this.bitbucketService.getGitUsername();
          
          if (userName) {
            // BitBucket API를 사용하여 사용자의 최근 커밋 이력 검색
            const commits = await this.bitbucketService.getCommitHistory(userName, 20);
            
            if (commits && commits.length > 0) {
              // 커밋 이력을 포맷팅하여 예제로 사용
              const formattedHistory = commits.map((commit: any) =>
                `${commit.displayId} - ${commit.message}`
              ).join('\n');
              
              // 사용자의 최근 커밋 메시지를 예제로 사용
              commitExamples = `Here are some example commit messages to follow the style:\n${formattedHistory}\n\n`;
            }
          }
        } catch (error) {
          console.error('BitBucket 서비스 오류:', error);
          // BitBucket 서비스 오류 시 로컬 Git 명령어를 사용하여 폴백
          await this.fallbackToLocalGitHistory();
        }
      } else {
        // BitBucket 서비스가 주입되지 않은 경우 로컬 Git 명령어 사용
        await this.fallbackToLocalGitHistory();
      }
    } catch (error) {
      console.error('커밋 이력 검색 오류:', error);
      // 모든 방법이 실패하면 기본 예제 사용
      const defaultExamples = [
        "feat(ui): add slash command suggestions to chat interface",
        "fix(core): resolve memory leak in service initialization",
        "docs(api): update API documentation with examples",
        "refactor(git): improve auto-commit change detection",
        "style(ui): update chat interface styling",
        "test(llm): add integration tests for LLM service",
        "perf(stream): optimize streaming response handling",
        "chore(deps): update dependencies to latest versions"
      ];
      commitExamples = `Here are some example commit messages to follow the style:\n${defaultExamples.join('\n')}\n\n`;
    }
    
    // diff가 너무 길면 잘라내기
    const maxDiffLength = 5000; // 최대 5000자
    const truncatedDiff = diff.length > maxDiffLength ? 
      diff.substring(0, maxDiffLength) + '\n... (truncated)' : diff;
    
    // 파일 목록 생성
    const fileChangeList = changedFiles.map(file => {
      return `${file.status} ${file.file}`;
    }).join('\n');
    
    // Conventional Commits 형식 안내
    const prompt = `Please generate a concise and meaningful Git commit message for the following changes. 
Use the Conventional Commits format: <type>(<scope>): <description>

Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert

${commitExamples}
Changed files:
${fileChangeList}

Diff:
${truncatedDiff}

Generate ONLY the commit message without any explanation. Keep it under 72 characters if possible.`;

    try {
      // LLM에 요청 보내기
      const result = await this.llmService.getCompletion(prompt);
      
      if (result.success && result.data) {
        // 공백 제거 및 정리
        const message = result.data.trim();
        
        // 결과가 짧고 의미있을 경우 사용
        if (message.length > 0 && message.length < 200) {
          return message;
        }
      }
      
      // LLM 결과가 적절하지 않을 경우 오류 발생
      throw new Error('LLM 생성 결과가 적절하지 않습니다');
    } catch (error) {
      // LLM 서비스 오류 로깅
      console.error('LLM 커밋 메시지 생성 오류:', error);
      
      // 오류 전파 - 호출자에서 기본 메시지 생성 로직으로 폴백
      throw new Error(`LLM 커밋 메시지 생성 실패: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * 로컬 Git 명령어를 사용하여 커밋 이력 가져오기 (BitBucket 폴백)
   * @private
   */
  private async fallbackToLocalGitHistory(): Promise<string> {
    try {
      const { stdout: userName } = await execAsync('git config --get user.name', { cwd: this.workspaceRoot });
      
      if (userName.trim()) {
        // 사용자 이름으로 커밋 이력 검색
        const { stdout: commitHistory } = await execAsync(
          `git log --author="${userName.trim()}" -n 20 --pretty=format:"%h - %s"`, 
          { cwd: this.workspaceRoot }
        );
        
        if (commitHistory.trim()) {
          // 사용자의 최근 커밋 메시지를 예제로 사용
          return `Here are some example commit messages to follow the style:\n${commitHistory.trim()}\n\n`;
        }
      }
      
      // 로컬 Git 명령어도 실패하면 빈 문자열 반환
      return '';
    } catch (error) {
      console.error('로컬 Git 이력 검색 오류:', error);
      return '';
    }
  }
  
  /**
   * 임시 커밋 통합
   * 
   * [APE][Temporary] 프리픽스가 붙은 모든 임시 커밋을 찾아서
   * 이들을 통합하여 하나의 정상적인 커밋으로 만듭니다.
   */
  public async consolidateTemporaryCommits(): Promise<void> {
    if (!this.workspaceRoot) {
      vscode.window.showErrorMessage('Git 저장소가 없습니다.');
      return;
    }
    
    try {
      // 진행 중 안내
      vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "임시 커밋 통합 중...",
        cancellable: false
      }, async (progress) => {
        progress.report({ message: "임시 커밋 찾는 중..." });
        
        // [APE][Temporary] 프리픽스가 붙은 커밋 찾기
        const { stdout: logOutput } = await execAsync(
          'git log --pretty=format:"%H %s" -n 30', 
          { cwd: this.workspaceRoot }
        );
        
        // 임시 커밋 목록 추출
        const allCommits = logOutput.split('\n')
          .map(line => {
            const space = line.indexOf(' ');
            return {
              hash: line.substring(0, space),
              message: line.substring(space + 1),
              isTemporary: line.substring(space + 1).includes('[APE][Temporary]')
            };
          });
        
        // 연속된 임시 커밋 그룹 찾기
        const temporaryGroups = [];
        let currentGroup = [];
        
        // 가장 최근 커밋부터 검사하여 연속된 임시 커밋 그룹 찾기
        for (const commit of allCommits) {
          if (commit.isTemporary) {
            currentGroup.push(commit);
          } else {
            // 일반 커밋을 만나면 지금까지의 그룹을 저장하고 새 그룹 시작
            if (currentGroup.length > 0) {
              temporaryGroups.push([...currentGroup]);
              currentGroup = [];
            }
          }
        }
        
        // 마지막 그룹이 남아있으면 추가
        if (currentGroup.length > 0) {
          temporaryGroups.push(currentGroup);
        }
        
        // 임시 커밋이 없는 경우
        if (temporaryGroups.length === 0 || temporaryGroups[0].length === 0) {
          vscode.window.showInformationMessage('통합할 임시 커밋이 없습니다.');
          return;
        }
        
        // 가장 최근의 연속된 임시 커밋 그룹 선택 (첫 번째 그룹)
        const commits = temporaryGroups[0];
        
        // 임시 커밋 이전 해시 찾기
        const oldestTempCommitHash = commits[commits.length - 1].hash;
        
        // 임시 커밋 이전 커밋 찾기
        const { stdout: parentHash } = await execAsync(
          `git rev-parse ${oldestTempCommitHash}^`, 
          { cwd: this.workspaceRoot }
        );
        
        // 통합할 커밋 수 확인
        const commitCount = commits.length;
        
        // 메시지 생성
        progress.report({ message: "변경 내용 취합 중..." });
        
        // 변경 사항 취합을 위한 설명 작성
        let commitDescription = '';
        try {
          // 변경 내용 diff 가져오기
          const { stdout: diffOutput } = await execAsync(
            `git diff ${parentHash.trim()} HEAD`, 
            { cwd: this.workspaceRoot }
          );
          
          // 임시 커밋 메시지 모음
          const messages = commits.map(c => c.message.replace('[APE][Temporary] ', '')).join('\n');
          
          // 설명 생성 (LLM 사용)
          progress.report({ message: "커밋 설명 생성 중..." });
          
          // LLM 사용 설정 확인
          const config = vscode.workspace.getConfiguration('ape.git');
          const useLLM = config.get<boolean>('useLLMForCommitMessages', false);
          
          if (useLLM) {
            // LLM으로 통합 커밋 메시지 생성
            const prompt = `다음은 여러 임시 커밋을 통합하기 위한 정보입니다.

임시 커밋 메시지들:
${messages}

변경 내용 요약 (diff):
${diffOutput.length > 5000 ? diffOutput.substring(0, 5000) + '\n... (잘림)' : diffOutput}

위 임시 커밋들을 통합하는 하나의 정식 커밋 메시지를 작성해주세요.
Conventional Commits 형식을 사용하세요: <type>(<scope>): <description>
타입: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
설명만 제공하고 다른 설명은 하지 마세요. 가능하면 72자 미만으로 작성하세요.`;

            const result = await this.llmService.getCompletion(prompt);
            if (result.success && result.data) {
              commitDescription = result.data.trim();
            }
          }
          
          // LLM 실패 또는 비활성화된 경우 기본 메시지 생성
          if (!commitDescription) {
            commitDescription = `chore(git): consolidate ${commitCount} temporary commits`;
          }
          
        } catch (error) {
          console.error('커밋 설명 생성 오류:', error);
          commitDescription = `chore(git): consolidate ${commitCount} temporary commits`;
        }
        
        // 사용자에게 최종 확인 요청
        progress.report({ message: "통합 준비 완료..." });
        
        const result = await vscode.window.showInformationMessage(
          `${commitCount}개의 임시 커밋을 통합하시겠습니까?`,
          { modal: true },
          '통합하기', '취소'
        );
        
        if (result !== '통합하기') {
          return;
        }
        
        // git reset --soft로 변경 사항 유지하며 커밋 취소
        progress.report({ message: "임시 커밋 리셋 중..." });
        
        await execAsync(
          `git reset --soft ${parentHash.trim()}`,
          { cwd: this.workspaceRoot }
        );
        
        // 통합 커밋 생성
        progress.report({ message: "통합 커밋 생성 중..." });
        
        await execAsync(
          `git commit -m "${commitDescription.replace(/"/g, '\\"')}"`, 
          { cwd: this.workspaceRoot }
        );
        
        // 성공 메시지
        vscode.window.showInformationMessage(
          `${commitCount}개의 임시 커밋이 성공적으로 통합되었습니다.`
        );
        
        // 상태 업데이트
        this.updateStatusBar();
      });
      
    } catch (error: any) {
      vscode.window.showErrorMessage(`임시 커밋 통합 오류: ${error.message}`);
    }
  }
  
  /**
   * 리소스 해제
   */
  public dispose(): void {
    this.statusBarItem.dispose();
    
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    
    this.disposables = [];
  }
}