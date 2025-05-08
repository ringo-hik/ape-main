/**
 * Git 명령어 모듈
 * 
 * Git 관련 명령어들을 정의합니다.
 */

import * as vscode from 'vscode';
import { SlashCommand } from '../commands/slashCommand';

/**
 * Git 명령어 목록 생성
 */
export function createGitCommands(): SlashCommand[] {
  const commands: SlashCommand[] = [];
  
  // Git 명령어 정의
  commands.push({
    name: 'git',
    aliases: ['g', '깃', '깃작업'],
    description: 'Git 작업을 수행합니다',
    examples: ['/git status', '/git commit', '/git auto', '/git consolidate', '/깃 상태', '/깃 통합'],
    category: 'git',
    priority: 3,
    execute: async (context) => {
      const subCommand = context.args[0]?.toLowerCase();
      
      if (!subCommand || subCommand === 'status' || subCommand === '상태') {
        // Git 상태 확인
        await vscode.commands.executeCommand('ape.git.showStatus');
      } else if (subCommand === 'commit' || subCommand === '커밋' || subCommand === '저장') {
        // Git 커밋
        await vscode.commands.executeCommand('ape.git.commit');
      } else if (subCommand === 'auto' || subCommand === '자동' || subCommand === '자동커밋') {
        // 자동 커밋 토글
        await vscode.commands.executeCommand('ape.git.toggleAutoCommit');
      } else if (subCommand === 'auto-on' || subCommand === 'autoon' || subCommand === '자동켜기' || subCommand === '자동커밋켜기') {
        // 자동 커밋 켜기
        await vscode.workspace.getConfiguration('ape.git')
          .update('autoCommit', true, vscode.ConfigurationTarget.Workspace);
        vscode.window.showInformationMessage('자동 커밋이 켜졌습니다');
      } else if (subCommand === 'auto-off' || subCommand === 'autooff' || subCommand === '자동끄기' || subCommand === '자동커밋끄기') {
        // 자동 커밋 끄기
        await vscode.workspace.getConfiguration('ape.git')
          .update('autoCommit', false, vscode.ConfigurationTarget.Workspace);
        vscode.window.showInformationMessage('자동 커밋이 꺼졌습니다');
      } else if (subCommand === 'consolidate' || subCommand === 'squash' || subCommand === '통합' || subCommand === '임시통합' || subCommand === '통합커밋') {
        // 임시 커밋 통합
        await vscode.commands.executeCommand('ape.git.consolidateTemporaryCommits');
      } else {
        vscode.window.showErrorMessage('알 수 없는 Git 하위 명령어입니다');
      }
    },
    provideCompletions: (partialArgs) => {
      const subCommands = ['status', 'commit', 'auto', 'auto-on', 'auto-off', 'consolidate', 'squash',
                      '상태', '커밋', '저장', '자동', '자동커밋', '자동켜기', '자동끄기', '자동커밋켜기', '자동커밋끄기', '통합', '임시통합', '통합커밋'];
      
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