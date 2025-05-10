/**
 * 사용자 정의 Jira 명령어
 * 
 * 특정 사용자 ID로 Jira 이슈 생성 페이지를 여는 커스텀 명령어
 */

import * as vscode from 'vscode';
import { SlashCommand } from './slashCommand';
import { JiraService } from '../services/jiraService';

/**
 * 사용자 정의 Jira 명령어 생성
 * @param jiraService Jira 서비스 인스턴스
 * @returns 사용자 정의 Jira 명령어 배열
 */
export function createCustomJiraCommand(jiraService?: JiraService): SlashCommand[] {
  const commands: SlashCommand[] = [];

  // Jira 이슈 생성 명령어 (지정된 사용자 ID 사용)
  commands.push({
    name: 'jira-create',
    aliases: ['jira-new', '지라생성', '이슈생성', 'create-jira'],
    description: '지정된 사용자 ID로 Jira 이슈 생성 페이지를 엽니다',
    examples: ['/jira-create', '/jira-create 프로젝트키', '/지라생성 APE'],
    category: 'utility',
    priority: 8,
    execute: async (context) => {
      if (!jiraService) {
        vscode.window.showErrorMessage('Jira 서비스를 사용할 수 없습니다');
        return;
      }
      
      try {
        // 프로젝트 키 입력 받기 (명령어 인자로 받을 수도 있음)
        let projectKey = context.args[0];

        if (!projectKey) {
          const inputResult = await vscode.window.showInputBox({
            prompt: 'Jira 프로젝트 키를 입력하세요',
            placeHolder: '예: APE, DEV, TEST 등'
          });

          if (!inputResult) return; // 취소됨
          projectKey = inputResult;
        }
        
        // 이슈 유형 입력 받기
        const issueType = await vscode.window.showQuickPick(
          ['Task', 'Bug', 'Story', 'Epic'],
          { placeHolder: '이슈 유형을 선택하세요' }
        );
        
        if (!issueType) return; // 취소됨
        
        // 이슈 제목 입력 받기
        const summary = await vscode.window.showInputBox({
          prompt: '이슈 제목을 입력하세요',
          placeHolder: '이슈 제목'
        });
        
        if (!summary) return; // 취소됨
        
        // 이슈 설명 입력 받기
        const description = await vscode.window.showInputBox({
          prompt: '이슈 설명을 입력하세요 (선택사항)',
          placeHolder: '이슈 설명'
        });
        
        // 이슈 생성
        const result = await jiraService.createIssue({
          projectKey,
          issueType,
          summary,
          description: description || '',
          assignee: 'hakmin_1.kim' // 지정된 사용자 ID
        });
        
        if (result.success && result.data) {
          vscode.window.showInformationMessage(`Jira 이슈가 생성되었습니다: ${result.data.key}`);
          
          // 채팅에 결과 표시
          await vscode.commands.executeCommand('ape.sendLlmResponse', {
            role: 'assistant',
            content: `## Jira 이슈 생성 완료\n\n이슈 **${result.data.key}**가 성공적으로 생성되었습니다.\n\n- **제목**: ${summary}\n- **유형**: ${issueType}\n- **프로젝트**: ${projectKey}\n- **담당자**: hakmin_1.kim`
          });
        } else {
          throw new Error(result.error?.message || '이슈 생성에 실패했습니다');
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Jira 이슈 생성 오류: ${error instanceof Error ? error.message : String(error)}`);
        
        // 채팅에 오류 표시
        await vscode.commands.executeCommand('ape.sendLlmResponse', {
          role: 'assistant',
          content: `## Jira 이슈 생성 오류\n\n이슈 생성 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`
        });
      }
    },
    provideCompletions: (partialArgs) => {
      // 자동완성 기능은 프로젝트 키 제안이 필요한 경우 구현
      return [];
    }
  });

  return commands;
}