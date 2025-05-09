/**
 * Git 명령어 모듈
 * 
 * Git 관련 명령어들을 정의합니다.
 */

import * as vscode from 'vscode';
import { SlashCommand } from '../commands/slashCommand';
import { ConflictStrategy } from './conflictSolver';

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

      if (!subCommand) {
        // Git 하위 명령어 목록 표시 (슬랙/디스코드 스타일 자동완성)
        const gitSubcommands = [
          { command: 'status', description: 'Git 저장소 상태를 확인합니다' },
          { command: 'commit', description: '변경 사항을 커밋합니다' },
          { command: 'auto', description: '자동 커밋 기능을 켜거나 끕니다' },
          { command: 'auto-on', description: '자동 커밋 기능을 켭니다' },
          { command: 'auto-off', description: '자동 커밋 기능을 끕니다' },
          { command: 'consolidate', description: '임시 커밋들을 하나의 정식 커밋으로 통합합니다' },
          { command: 'solve', description: '웹뷰를 통한 Git 충돌 해결 제안을 제공합니다' },
          { command: 'solve-auto', description: '모든 Git 충돌을 자동으로 해결합니다' },
          { command: 'solve-ours', description: '모든 Git 충돌을 현재 브랜치의 코드로 해결합니다' },
          { command: 'solve-theirs', description: '모든 Git 충돌을 다른 브랜치의 코드로 해결합니다' },
          { command: 'solve-llm', description: 'LLM을 사용해 Git 충돌을 지능적으로 해결합니다' }
        ];

        // 명령어 제안을 채팅 인터페이스의 자동완성 UI에 표시
        const suggestions = gitSubcommands.map(cmd => ({
          label: `/git ${cmd.command}`,
          description: cmd.description,
          category: 'git',
          insertText: `/git ${cmd.command} `
        }));

        // 명령어 제안 표시 - 채팅 입력창 자동완성 UI에 표시
        vscode.commands.executeCommand('ape.showCommandSuggestions', suggestions);

        // VSCode의 퀵픽 UI도 함께 표시 (백업 방법)
        vscode.window.showQuickPick(
          gitSubcommands.map(cmd => ({
            label: cmd.command,
            description: cmd.description,
            detail: `Git 하위 명령어: ${cmd.command}`
          })),
          {
            placeHolder: 'Git 명령어를 선택하세요',
            matchOnDescription: true
          }
        ).then(selected => {
          if (selected) {
            // 선택한 명령어를 채팅 입력창에 삽입
            vscode.commands.executeCommand('ape.insertToChatInput', `/git ${selected.label}`);
          }
        });
      } else if (subCommand === 'status' || subCommand === '상태') {
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
      } else if (subCommand === 'solve' || subCommand === 'conflict' || subCommand === 'conflicts' || subCommand === '충돌' || subCommand === '충돌해결') {
        // 충돌 해결 - 웹뷰 버전 (새로 추가)
        await vscode.commands.executeCommand('ape.git.solveConflictsWithReport');
      } else if (subCommand === 'solve-auto' || subCommand === '충돌자동해결') {
        // 충돌 자동 해결 (기존 방식)
        await vscode.commands.executeCommand('ape.git.resolveConflict');
      } else if (subCommand === 'solve-ours' || subCommand === '충돌내것선택') {
        // 충돌 해결 - 현재 브랜치 선택
        await vscode.commands.executeCommand('ape.git.resolveConflictWithStrategy', ConflictStrategy.OURS);
      } else if (subCommand === 'solve-theirs' || subCommand === '충돌저것선택') {
        // 충돌 해결 - 대상 브랜치 선택
        await vscode.commands.executeCommand('ape.git.resolveConflictWithStrategy', ConflictStrategy.THEIRS);
      } else if (subCommand === 'solve-llm' || subCommand === '충돌지능해결') {
        // 충돌 해결 - LLM 지능형 병합
        await vscode.commands.executeCommand('ape.git.resolveConflictWithStrategy', ConflictStrategy.LLM);
      } else {
        vscode.window.showErrorMessage('알 수 없는 Git 하위 명령어입니다');
      }
    },
    provideCompletions: (partialArgs) => {
      const subCommands = [
        // 기존 명령어
        'status', 'commit', 'auto', 'auto-on', 'auto-off', 'consolidate', 'squash',
        
        // 충돌 해결 관련 명령어
        'solve', 'conflict', 'conflicts', 'solve-auto', 'solve-ours', 'solve-theirs', 'solve-llm',
        
        // 한국어 명령어
        '상태', '커밋', '저장', '자동', '자동커밋', '자동켜기', '자동끄기', '자동커밋켜기', '자동커밋끄기', '통합', '임시통합', '통합커밋',
        '충돌', '충돌해결', '충돌자동해결', '충돌내것선택', '충돌저것선택', '충돌지능해결'
      ];
      
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