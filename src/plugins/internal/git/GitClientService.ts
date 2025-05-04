/**
 * Git 클라이언트 서비스
 * 
 * Git 명령어 실행 및 결과 처리 기능 제공
 * 커밋, 푸시, PR 생성 등의 기능 지원
 */

import * as vscode from 'vscode';
import { spawn } from 'child_process';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

/**
 * Git 명령어 결과 인터페이스
 */
interface GitCommandResult {
  /**
   * 성공 여부
   */
  success: boolean;
  
  /**
   * 표준 출력
   */
  stdout: string;
  
  /**
   * 표준 오류
   */
  stderr: string;
  
  /**
   * 종료 코드
   */
  code: number | null;
}

/**
 * Git 커밋 옵션 인터페이스
 */
export interface GitCommitOptions {
  /**
   * 커밋 메시지
   */
  message: string;
  
  /**
   * 모든 변경 사항 스테이징 여부
   */
  all?: boolean;
  
  /**
   * 작성자 이름
   */
  authorName?: string;
  
  /**
   * 작성자 이메일
   */
  authorEmail?: string;
}

/**
 * Git 푸시 옵션 인터페이스
 */
export interface GitPushOptions {
  /**
   * 원격 저장소 이름
   */
  remote?: string;
  
  /**
   * 브랜치 이름
   */
  branch?: string;
  
  /**
   * 강제 푸시 여부
   */
  force?: boolean;
  
  /**
   * 설정 저장 여부
   */
  setUpstream?: boolean;
}

/**
 * PR 생성 옵션 인터페이스
 */
export interface GitPROptions {
  /**
   * PR 제목
   */
  title: string;
  
  /**
   * PR 설명
   */
  description: string;
  
  /**
   * 소스 브랜치
   */
  sourceBranch: string;
  
  /**
   * 대상 브랜치
   */
  targetBranch: string;
  
  /**
   * 리뷰어 목록
   */
  reviewers?: string[];
  
  /**
   * 라벨 목록
   */
  labels?: string[];
  
  /**
   * 초안 여부
   */
  draft?: boolean;
}

/**
 * Git 클라이언트 서비스 클래스
 */
export class GitClientService {
  /**
   * Git 작업 디렉토리
   */
  private workingDirectory: string | undefined;
  
  /**
   * GitClientService 생성자
   */
  constructor() {
    this.initWorkingDirectory();
  }
  
  /**
   * 작업 디렉토리 초기화
   */
  private initWorkingDirectory(): void {
    try {
      // 1. VS Code 워크스페이스 폴더 확인 (확장 실행 시)
      try {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        
        if (workspaceFolders && workspaceFolders.length > 0) {
          this.workingDirectory = workspaceFolders[0].uri.fsPath;
          console.log(`VS Code 워크스페이스 디렉토리 설정: ${this.workingDirectory}`);
          
          // Git 저장소인지 확인
          this.isGitRepository(this.workingDirectory).then(isRepo => {
            if (!isRepo) {
              console.warn(`워크스페이스 디렉토리(${this.workingDirectory})는 Git 저장소가 아닙니다. 대체 경로를 찾습니다.`);
              this.findGitRepository();
            }
          });
          
          return;
        }
      } catch (workspaceError) {
        console.error('VS Code 워크스페이스 접근 중 오류 발생:', workspaceError);
      }
      
      // 2. 현재 프로세스 작업 디렉토리 확인 (CLI 모드)
      this.workingDirectory = process.cwd();
      console.log(`현재 작업 디렉토리 설정: ${this.workingDirectory}`);
      
      // Git 저장소인지 확인
      this.isGitRepository(this.workingDirectory).then(isRepo => {
        if (!isRepo) {
          console.warn(`현재 디렉토리(${this.workingDirectory})는 Git 저장소가 아닙니다. 대체 경로를 찾습니다.`);
          this.findGitRepository();
        }
      });
    } catch (error) {
      console.error('Git 작업 디렉토리 초기화 중 오류 발생:', error);
      
      // 3. 최후의 방법: 홈 디렉토리
      this.workingDirectory = os.homedir();
      console.log(`홈 디렉토리로 설정: ${this.workingDirectory}`);
    }
  }
  
  /**
   * 디렉토리가 Git 저장소인지 확인
   * @param directory 확인할 디렉토리
   * @returns Git 저장소 여부
   */
  private async isGitRepository(directory: string): Promise<boolean> {
    try {
      return new Promise<boolean>((resolve) => {
        const gitProcess = spawn('git', ['rev-parse', '--is-inside-work-tree'], { cwd: directory });
        
        gitProcess.stdout.on('data', (data) => {
          const output = data.toString().trim();
          resolve(output === 'true');
        });
        
        gitProcess.on('error', () => resolve(false));
        gitProcess.on('close', (code) => {
          if (code !== 0) resolve(false);
        });
      });
    } catch (error) {
      console.error(`Git 저장소 확인 중 오류: ${error}`);
      return false;
    }
  }
  
  /**
   * Git 저장소 탐색
   * 현재 디렉토리에서 상위 디렉토리로 이동하며 Git 저장소를 찾음
   */
  private async findGitRepository(): Promise<void> {
    try {
      // 현재 디렉토리
      let currentDir = this.workingDirectory || process.cwd();
      
      // 최대 5단계 상위 디렉토리까지 탐색
      for (let i = 0; i < 5; i++) {
        const parentDir = path.dirname(currentDir);
        
        // 루트 디렉토리인 경우 중단
        if (parentDir === currentDir) {
          break;
        }
        
        // 상위 디렉토리로 이동
        currentDir = parentDir;
        
        // Git 저장소 확인
        const isRepo = await this.isGitRepository(currentDir);
        if (isRepo) {
          this.workingDirectory = currentDir;
          console.log(`Git 저장소 발견: ${currentDir}`);
          return;
        }
      }
      
      // 가장 가능성 높은 경로: 확장 프로그램 디렉토리
      try {
        // __dirname은 컴파일된 JS 파일 위치이므로 적절한 상위 디렉토리로 이동
        let extensionDir = __dirname;
        
        // dist/extension.js, out/extension.js 등의 패턴 처리
        if (extensionDir.includes('dist') || extensionDir.includes('out')) {
          extensionDir = path.resolve(extensionDir, '..', '..');
        }
        
        if (await this.isGitRepository(extensionDir)) {
          this.workingDirectory = extensionDir;
          console.log(`확장 프로그램 디렉토리가 Git 저장소임: ${extensionDir}`);
          return;
        }
      } catch (dirError) {
        console.error('확장 프로그램 디렉토리 확인 중 오류:', dirError);
      }
      
      // 대체 위치: 프로젝트 루트 (package.json이 있는 위치)
      let currentSearchDir = this.workingDirectory || process.cwd();
      
      for (let i = 0; i < 5; i++) {
        if (fs.existsSync(path.join(currentSearchDir, 'package.json'))) {
          this.workingDirectory = currentSearchDir;
          console.log(`Package.json 발견, 작업 디렉토리 설정: ${currentSearchDir}`);
          return;
        }
        
        const parentDir = path.dirname(currentSearchDir);
        if (parentDir === currentSearchDir) break;
        currentSearchDir = parentDir;
      }
      
      console.warn('Git 저장소를 찾을 수 없습니다.');
    } catch (error) {
      console.error('Git 저장소 탐색 중 오류 발생:', error);
    }
  }
  
  /**
   * Git 명령어 실행
   * @param args 명령어 인자
   * @param workingDir 작업 디렉토리 (기본값: 현재 작업 디렉토리)
   * @returns 명령어 실행 결과
   */
  private async executeGitCommand(args: string[], workingDir?: string): Promise<GitCommandResult> {
    return new Promise<GitCommandResult>((resolve) => {
      try {
        const cwd = workingDir || this.workingDirectory || os.homedir();
        
        // 명령어 로깅
        console.log(`Git 명령어 실행: git ${args.join(' ')} (in ${cwd})`);
        
        // Git 프로세스 생성
        const gitProcess = spawn('git', args, { cwd });
        
        let stdout = '';
        let stderr = '';
        
        // 표준 출력 수집
        gitProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        // 표준 오류 수집
        gitProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        // 프로세스 종료 처리
        gitProcess.on('close', (code) => {
          const success = code === 0;
          
          // 결과 로깅
          if (success) {
            console.log(`Git 명령어 성공: git ${args.join(' ')}`);
          } else {
            console.error(`Git 명령어 실패 (${code}): git ${args.join(' ')}`);
            console.error(`오류: ${stderr}`);
          }
          
          resolve({
            success,
            stdout,
            stderr,
            code
          });
        });
        
        // 오류 처리
        gitProcess.on('error', (error) => {
          console.error(`Git 프로세스 실행 오류:`, error);
          
          resolve({
            success: false,
            stdout: '',
            stderr: error.message,
            code: null
          });
        });
      } catch (error: any) {
        console.error(`Git 명령어 실행 중 예외 발생:`, error);
        
        resolve({
          success: false,
          stdout: '',
          stderr: error.message || String(error),
          code: null
        });
      }
    });
  }
  
  /**
   * 저장소 상태 조회
   * @returns Git 상태 정보
   */
  async getStatus(): Promise<any> {
    try {
      const result = await this.executeGitCommand(['status', '--porcelain=v2', '--branch']);
      
      if (!result.success) {
        throw new Error(`Git status 명령어 실패: ${result.stderr}`);
      }
      
      // 상태 파싱
      const statusLines = result.stdout.split('\n').filter(line => line.trim() !== '');
      const status: any = {
        branch: '',
        tracking: '',
        changes: []
      };
      
      // 브랜치 정보 추출
      const branchLine = statusLines.find(line => line.startsWith('# branch.head'));
      if (branchLine) {
        status.branch = branchLine.split(' ')[2];
      }
      
      // 트래킹 브랜치 정보
      const trackingLine = statusLines.find(line => line.startsWith('# branch.upstream'));
      if (trackingLine) {
        status.tracking = trackingLine.split(' ')[2];
      }
      
      // 변경 사항 추출
      const changeLines = statusLines.filter(line => !line.startsWith('#'));
      status.changes = changeLines.map(line => {
        const parts = line.split(' ');
        let type = '';
        let path = '';
        
        if (line.startsWith('1 ')) {  // 변경된 파일
          type = parts[1];
          path = parts.slice(8).join(' ');
        } else if (line.startsWith('2 ')) {  // 이름 변경된 파일
          type = parts[1];
          path = `${parts[9]} -> ${parts[10]}`;
        } else if (line.startsWith('? ')) {  // Untracked 파일
          type = '?';
          path = parts.slice(1).join(' ');
        } else if (line.startsWith('u ')) {  // Unmerged 파일
          type = 'u';
          path = parts.slice(10).join(' ');
        }
        
        return { type, path };
      });
      
      return status;
    } catch (error) {
      console.error('Git 상태 조회 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 변경 사항 조회
   * @param staged 스테이징된 변경 사항 조회 여부
   * @returns 변경 사항 목록
   */
  async getDiff(staged: boolean = false): Promise<string> {
    try {
      const args = ['diff'];
      
      // 버전 호환성을 위한 옵션 선택 (--staged 또는 --cached)
      if (staged) {
        // 먼저 --staged 옵션이 지원되는지 확인
        try {
          const stagedCheck = await this.executeGitCommand(['diff', '--staged', '--quiet']);
          
          if (stagedCheck.stderr && stagedCheck.stderr.includes('unknown option')) {
            // --staged가 지원되지 않는 경우 --cached 사용
            console.log('Git diff --staged 옵션이 지원되지 않아 --cached 사용');
            args.push('--cached');
          } else {
            args.push('--staged');
          }
        } catch (optError) {
          // 오류 발생 시 기본적으로 --cached 사용 (더 오래된 Git 버전과 호환)
          console.log('옵션 확인 실패, 안전하게 --cached 사용');
          args.push('--cached');
        }
      }
      
      // Git 명령어 실행 로그
      console.log(`Git diff 명령어 실행: git ${args.join(' ')}`);
      
      // 명령어 실행
      const result = await this.executeGitCommand(args);
      
      if (!result.success) {
        throw new Error(`Git diff 명령어 실패: ${result.stderr}`);
      }
      
      return result.stdout;
    } catch (error) {
      console.error('Git 변경 사항 조회 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 파일 스테이징
   * @param files 파일 경로 목록 (생략 시 모든 변경 사항)
   * @returns 실행 결과
   */
  async stageFiles(files?: string[]): Promise<any> {
    try {
      const args = ['add'];
      
      if (files && files.length > 0) {
        args.push(...files);
      } else {
        args.push('.');
      }
      
      const result = await this.executeGitCommand(args);
      
      if (!result.success) {
        throw new Error(`Git add 명령어 실패: ${result.stderr}`);
      }
      
      // 상태 조회 및 반환
      return await this.getStatus();
    } catch (error) {
      console.error('Git 파일 스테이징 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 커밋 생성
   * @param options 커밋 옵션
   * @returns 커밋 정보
   */
  async commit(options: GitCommitOptions): Promise<any> {
    try {
      const args = ['commit', '-m', options.message];
      
      // 모든 변경 사항 스테이징
      if (options.all) {
        args.push('-a');
      }
      
      // 작성자 정보 설정
      if (options.authorName && options.authorEmail) {
        args.push(`--author="${options.authorName} <${options.authorEmail}>"`);
      }
      
      const result = await this.executeGitCommand(args);
      
      if (!result.success) {
        throw new Error(`Git commit 명령어 실패: ${result.stderr}`);
      }
      
      // 커밋 정보 반환
      const commitInfo = await this.executeGitCommand(['log', '-1', '--format=%H%n%an%n%ae%n%at%n%s']);
      
      if (!commitInfo.success) {
        throw new Error(`Git log 명령어 실패: ${commitInfo.stderr}`);
      }
      
      const [hash, authorName, authorEmail, timestamp, subject] = commitInfo.stdout.split('\n');
      
      return {
        hash,
        authorName,
        authorEmail,
        timestamp: parseInt(timestamp),
        subject
      };
    } catch (error) {
      console.error('Git 커밋 생성 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 브랜치 생성
   * @param branchName 브랜치 이름
   * @param startPoint 시작 지점 (기본값: HEAD)
   * @param checkout 생성 후 체크아웃 여부
   * @returns 실행 결과
   */
  async createBranch(branchName: string, startPoint?: string, checkout: boolean = true): Promise<any> {
    try {
      let args: string[];
      
      if (checkout) {
        args = ['checkout', '-b', branchName];
      } else {
        args = ['branch', branchName];
      }
      
      if (startPoint) {
        args.push(startPoint);
      }
      
      const result = await this.executeGitCommand(args);
      
      if (!result.success) {
        throw new Error(`Git 브랜치 생성 실패: ${result.stderr}`);
      }
      
      return {
        branch: branchName,
        checkout
      };
    } catch (error) {
      console.error('Git 브랜치 생성 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 브랜치 목록 조회
   * @param all 모든 브랜치 조회 여부 (로컬 + 원격)
   * @returns 브랜치 목록
   */
  async getBranches(all: boolean = false): Promise<any[]> {
    try {
      const args = ['branch'];
      
      if (all) {
        args.push('-a');
      }
      
      const result = await this.executeGitCommand(args);
      
      if (!result.success) {
        throw new Error(`Git branch 명령어 실패: ${result.stderr}`);
      }
      
      // 브랜치 목록 파싱
      const branches = result.stdout.split('\n')
        .filter(branch => branch.trim() !== '')
        .map(branch => {
          const isCurrent = branch.startsWith('*');
          const name = branch.replace('*', '').trim();
          
          return {
            name,
            isCurrent
          };
        });
      
      return branches;
    } catch (error) {
      console.error('Git 브랜치 목록 조회 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 원격 저장소로 푸시
   * @param options 푸시 옵션
   * @returns 실행 결과
   */
  async push(options: GitPushOptions = {}): Promise<any> {
    try {
      const args = ['push'];
      
      const remote = options.remote || 'origin';
      args.push(remote);
      
      if (options.branch) {
        args.push(options.branch);
      }
      
      if (options.force) {
        args.push('--force');
      }
      
      if (options.setUpstream) {
        args.push('--set-upstream');
      }
      
      const result = await this.executeGitCommand(args);
      
      if (!result.success) {
        throw new Error(`Git push 명령어 실패: ${result.stderr}`);
      }
      
      return {
        success: true,
        remote,
        branch: options.branch || 'current'
      };
    } catch (error) {
      console.error('Git 푸시 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 원격 저장소에서 풀
   * @param remote 원격 저장소 이름
   * @param branch 브랜치 이름
   * @returns 실행 결과
   */
  async pull(remote: string = 'origin', branch?: string): Promise<any> {
    try {
      const args = ['pull', remote];
      
      if (branch) {
        args.push(branch);
      }
      
      const result = await this.executeGitCommand(args);
      
      if (!result.success) {
        throw new Error(`Git pull 명령어 실패: ${result.stderr}`);
      }
      
      return {
        success: true,
        remote,
        branch: branch || 'current'
      };
    } catch (error) {
      console.error('Git 풀 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * PR 생성 (GitHub CLI 사용)
   * @param options PR 옵션
   * @returns PR 정보
   */
  async createPR(options: GitPROptions): Promise<any> {
    try {
      // GitHub CLI (gh) 설치 확인
      const ghVersionResult = await this.executeGitCommand(['--no-git-dir', 'gh', 'version'], process.cwd());
      
      if (!ghVersionResult.success) {
        throw new Error('GitHub CLI (gh)가 설치되어 있지 않습니다');
      }
      
      // PR 생성 명령어 구성
      const args = [
        '--no-git-dir',
        'gh',
        'pr',
        'create',
        '--title',
        options.title,
        '--body',
        options.description,
        '--base',
        options.targetBranch,
        '--head',
        options.sourceBranch
      ];
      
      if (options.reviewers && options.reviewers.length > 0) {
        args.push('--reviewer', options.reviewers.join(','));
      }
      
      if (options.labels && options.labels.length > 0) {
        args.push('--label', options.labels.join(','));
      }
      
      if (options.draft) {
        args.push('--draft');
      }
      
      const result = await this.executeGitCommand(args);
      
      if (!result.success) {
        throw new Error(`PR 생성 실패: ${result.stderr}`);
      }
      
      // PR URL 추출
      const prUrl = result.stdout.trim();
      
      return {
        success: true,
        url: prUrl,
        title: options.title,
        sourceBranch: options.sourceBranch,
        targetBranch: options.targetBranch
      };
    } catch (error) {
      console.error('PR 생성 중 오류 발생:', error);
      throw error;
    }
  }
}