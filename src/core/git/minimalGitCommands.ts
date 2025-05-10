/**
 * Git 최소 명령어 모듈
 * 
 * VS Code의 Git 확장과 연동하여 간단한 Git 작업을 수행하는 명령어들을 정의합니다.
 */

import * as vscode from 'vscode';
import { SlashCommand } from '../commands/slashCommand';

/**
 * Git 명령어 목록 생성
 */
export function createMinimalGitCommands(): SlashCommand[] {
  const commands: SlashCommand[] = [];
  
  // Git 명령어 정의
  commands.push({
    name: 'git',
    aliases: ['g', '깃', '깃작업'],
    description: 'Git 작업을 수행합니다',
    examples: ['/git status', '/git commit', '/git diff', '/git log', '/깃 상태', '/깃 로그'],
    category: 'git',
    priority: 3,
    execute: async (context) => {
      const subCommand = context.args[0]?.toLowerCase();
      
      if (!subCommand || subCommand === 'status' || subCommand === '상태') {
        // Git 상태 확인
        await handleGitStatus();
      } else if (subCommand === 'commit' || subCommand === '커밋' || subCommand === '저장') {
        // Git 커밋
        await handleGitCommit();
      } else if (subCommand === 'diff' || subCommand === '차이' || subCommand === '변경사항') {
        // Git diff
        await handleGitDiff();
      } else if (subCommand === 'log' || subCommand === '로그' || subCommand === '이력') {
        // Git log
        await handleGitLog();
      } else {
        vscode.window.showErrorMessage('알 수 없는 Git 하위 명령어입니다');
      }
    },
    provideCompletions: (partialArgs) => {
      const subCommands = ['status', 'commit', 'diff', 'log',
                      '상태', '커밋', '저장', '차이', '변경사항', '로그', '이력'];
      
      // 첫 번째 인자 자동완성
      if (!partialArgs.includes(' ')) {
        return subCommands.filter(cmd => 
          cmd.startsWith(partialArgs.toLowerCase())
        );
      }
      
      return [];
    }
  });
  
  return commands;
}

/**
 * Git 상태 확인
 */
async function handleGitStatus(): Promise<void> {
  try {
    // VS Code Git 확장 API 사용
    const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
    if (!gitExtension) {
      vscode.window.showErrorMessage('VS Code Git 확장을 찾을 수 없습니다');
      return;
    }

    const git = gitExtension.getAPI(1);
    if (!git) {
      vscode.window.showErrorMessage('Git API를 가져올 수 없습니다');
      return;
    }

    // 현재 저장소 확인
    const repositories = git.repositories;
    if (repositories.length === 0) {
      await vscode.commands.executeCommand('ape.sendLlmResponse', {
        role: 'assistant',
        content: `## Git 상태\n\n현재 워크스페이스에서 Git 저장소를 찾을 수 없습니다.`
      });
      return;
    }

    // 첫 번째 저장소 상태 표시
    const repo = repositories[0];
    const state = repo.state;

    // 변경사항 개수
    const changes = state.workingTreeChanges.length;
    const staged = state.indexChanges.length;
    const untracked = state.untrackedChanges.length;

    // 브랜치 정보
    const branchName = state.HEAD?.name || 'detached HEAD';
    const upstream = state.HEAD?.upstream?.name;
    const ahead = state.HEAD?.ahead || 0;
    const behind = state.HEAD?.behind || 0;

    // 변경 파일 목록
    let changedFiles = '';
    if (changes > 0) {
      changedFiles = '\n### 변경된 파일\n\n';
      state.workingTreeChanges.forEach(change => {
        const fileName = change.uri.fsPath.split('/').pop();
        const status = getChangeTypeLabel(change.status);
        changedFiles += `- **${fileName}** (${status})\n`;
      });
    }

    // 스테이징된 파일 목록
    let stagedFiles = '';
    if (staged > 0) {
      stagedFiles = '\n### 스테이징된 파일\n\n';
      state.indexChanges.forEach(change => {
        const fileName = change.uri.fsPath.split('/').pop();
        const status = getChangeTypeLabel(change.status);
        stagedFiles += `- **${fileName}** (${status})\n`;
      });
    }

    // 추적되지 않는 파일 목록
    let untrackedFilesList = '';
    if (untracked > 0) {
      untrackedFilesList = '\n### 추적되지 않는 파일\n\n';
      state.untrackedChanges.forEach(change => {
        const fileName = change.uri.fsPath.split('/').pop();
        untrackedFilesList += `- **${fileName}**\n`;
      });
    }

    // 상태 메시지 구성
    let statusMessage = `## Git 상태\n\n`;
    statusMessage += `**브랜치**: ${branchName}\n`;
    
    if (upstream) {
      statusMessage += `**업스트림**: ${upstream}\n`;
      
      if (ahead > 0 || behind > 0) {
        statusMessage += `**상태**: `;
        if (ahead > 0) {
          statusMessage += `${ahead}개 커밋 앞서 있음 ↑ `;
        }
        if (behind > 0) {
          statusMessage += `${behind}개 커밋 뒤처져 있음 ↓`;
        }
        statusMessage += '\n';
      }
    }
    
    statusMessage += `\n### 요약\n\n`;
    statusMessage += `- **변경**: ${changes}개 파일\n`;
    statusMessage += `- **스테이징**: ${staged}개 파일\n`;
    statusMessage += `- **추적되지 않음**: ${untracked}개 파일\n`;

    // 커밋 가능 여부
    if (staged > 0) {
      statusMessage += `\n✅ **커밋 준비 완료**: 스테이징된 변경사항이 있습니다. \`/git commit\` 명령으로 커밋할 수 있습니다.\n`;
    } else if (changes > 0 || untracked > 0) {
      statusMessage += `\n⚠️ **커밋 불가**: 변경사항을 먼저 스테이징해야 합니다. VS Code의 Git 탭에서 변경사항을 스테이징하세요.\n`;
    } else {
      statusMessage += `\n✓ **워킹 트리 깨끗함**: 커밋할 변경사항이 없습니다.\n`;
    }

    // 파일 목록 추가
    statusMessage += changedFiles + stagedFiles + untrackedFilesList;

    // 메시지 전송
    await vscode.commands.executeCommand('ape.sendLlmResponse', {
      role: 'assistant',
      content: statusMessage
    });

  } catch (error) {
    console.error('Git 상태 확인 오류:', error);
    vscode.window.showErrorMessage(`Git 상태 확인 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Git 커밋 처리
 */
async function handleGitCommit(): Promise<void> {
  try {
    // VS Code의 Git 확장을 통해 커밋 명령 실행
    await vscode.commands.executeCommand('git.commit');
    
    // 실행 결과 알림
    await vscode.commands.executeCommand('ape.sendLlmResponse', {
      role: 'assistant',
      content: `## Git 커밋\n\n커밋 창이 열렸습니다. 커밋 메시지를 입력하고 "✓" 버튼을 클릭하여 커밋을 완료하세요.`
    });
  } catch (error) {
    console.error('Git 커밋 오류:', error);
    vscode.window.showErrorMessage(`Git 커밋 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Git diff 처리
 */
async function handleGitDiff(): Promise<void> {
  try {
    // VS Code Git 확장 API 사용
    const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
    if (!gitExtension) {
      vscode.window.showErrorMessage('VS Code Git 확장을 찾을 수 없습니다');
      return;
    }

    const git = gitExtension.getAPI(1);
    if (!git) {
      vscode.window.showErrorMessage('Git API를 가져올 수 없습니다');
      return;
    }

    // 현재 저장소 확인
    const repositories = git.repositories;
    if (repositories.length === 0) {
      await vscode.commands.executeCommand('ape.sendLlmResponse', {
        role: 'assistant',
        content: `## Git Diff\n\n현재 워크스페이스에서 Git 저장소를 찾을 수 없습니다.`
      });
      return;
    }

    // VS Code의 diff 뷰어 실행
    await vscode.commands.executeCommand('git.openAllChanges');
    
    // 결과 알림
    await vscode.commands.executeCommand('ape.sendLlmResponse', {
      role: 'assistant',
      content: `## Git Diff\n\n모든 변경사항에 대한 Diff 뷰가 열렸습니다.`
    });
  } catch (error) {
    console.error('Git diff 오류:', error);
    vscode.window.showErrorMessage(`Git diff 표시 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Git 로그 처리
 */
async function handleGitLog(): Promise<void> {
  try {
    // VS Code Git 확장 API 사용
    const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
    if (!gitExtension) {
      vscode.window.showErrorMessage('VS Code Git 확장을 찾을 수 없습니다');
      return;
    }

    const git = gitExtension.getAPI(1);
    if (!git) {
      vscode.window.showErrorMessage('Git API를 가져올 수 없습니다');
      return;
    }

    // 현재 저장소 확인
    const repositories = git.repositories;
    if (repositories.length === 0) {
      await vscode.commands.executeCommand('ape.sendLlmResponse', {
        role: 'assistant',
        content: `## Git 로그\n\n현재 워크스페이스에서 Git 저장소를 찾을 수 없습니다.`
      });
      return;
    }

    // Git 로그 열기
    await vscode.commands.executeCommand('git.viewHistory');
    
    // 결과 알림
    await vscode.commands.executeCommand('ape.sendLlmResponse', {
      role: 'assistant',
      content: `## Git 로그\n\nGit 커밋 이력이 VS Code에서 열렸습니다.`
    });
  } catch (error) {
    console.error('Git 로그 오류:', error);
    vscode.window.showErrorMessage(`Git 로그 표시 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 변경 유형 라벨 가져오기
 */
function getChangeTypeLabel(status: number): string {
  // VS Code Git extension의 FileStatus enum과 대응
  switch (status) {
    case 0: return '추가됨';
    case 1: return '수정됨';
    case 2: return '삭제됨';
    case 3: return '이름 변경됨';
    case 4: return '복사됨';
    case 5: return '인덱스 변경됨';
    case 6: return '병합됨';
    case 7: return '충돌 있음';
    default: return '알 수 없음';
  }
}