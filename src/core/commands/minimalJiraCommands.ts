/**
 * Jira 관련 최소한의 슬래시 명령어 정의
 * 
 * VSCode 확장과 Atlassian Extension API를 활용한 미니멀 구현
 */
import * as vscode from 'vscode';
import { SlashCommand } from './slashCommand';

// Atlassian 확장 API 확인
const ATLASSIAN_EXTENSION_ID = 'atlassian.atlascode';

/**
 * Jira 명령어 생성
 */
export function createJiraCommands(): SlashCommand[] {
  const commands: SlashCommand[] = [];

  // Jira 메인 명령어
  commands.push({
    name: 'jira',
    aliases: ['j', '지라', '이슈'],
    description: 'Jira 이슈 관련 작업을 수행합니다',
    examples: ['/jira', '/jira issue', '/jira search', '/jira create', '/지라'],
    category: 'utility',
    priority: 8,
    execute: async (context) => {
      const subCommand = context.args[0]?.toLowerCase();
      
      // 먼저 Atlassian 확장이 설치되어 있는지 확인
      const atlassianExt = vscode.extensions.getExtension(ATLASSIAN_EXTENSION_ID);
      if (!atlassianExt) {
        await showAtlassianExtensionNotInstalledMessage();
        return;
      }
      
      // 하위 명령어 없이 기본 목록 표시
      if (!subCommand) {
        await showJiraMainMenu();
        return;
      }
      
      // 하위 명령어 처리
      switch (subCommand) {
        case 'create':
        case '생성':
        case '만들기':
          await handleJiraCreate();
          break;
          
        case 'search':
        case '검색':
        case '찾기':
          await handleJiraSearch(context);
          break;
          
        case 'issue':
        case '이슈':
        case '보기':
          await handleJiraIssue(context);
          break;
          
        default:
          vscode.window.showErrorMessage(`알 수 없는 Jira 하위 명령어: ${subCommand}`);
          break;
      }
    },
    provideCompletions: (partialArgs) => {
      const parts = partialArgs.split(' ');
      
      // 첫 번째 인자 자동완성 (하위 명령어)
      if (parts.length <= 1) {
        const subCommands = ['create', 'search', 'issue', '생성', '검색', '이슈'];
        return subCommands.filter(cmd => 
          cmd.toLowerCase().startsWith(parts[0]?.toLowerCase() || '')
        );
      }
      
      return [];
    }
  });

  return commands;
}

/**
 * Jira 메인 메뉴 표시
 */
async function showJiraMainMenu(): Promise<void> {
  const content = `
## Jira 통합

아래 명령어를 사용하여 Jira 작업을 수행할 수 있습니다:

- **/jira create** - 새 Jira 이슈 생성
- **/jira issue [이슈키]** - 특정 이슈 정보 보기
- **/jira search [검색어]** - Jira 이슈 검색

이 기능은 VSCode Atlassian 확장을 통해 제공됩니다.
`;

  await vscode.commands.executeCommand('ape.sendLlmResponse', {
    role: 'assistant',
    content
  });
}

/**
 * Jira 이슈 생성 처리
 */
async function handleJiraCreate(): Promise<void> {
  try {
    // Atlassian 확장의 이슈 생성 명령 실행
    await vscode.commands.executeCommand('atlascode.jira.createIssue');
    
    // 사용자에게 알림
    await vscode.commands.executeCommand('ape.sendLlmResponse', {
      role: 'assistant',
      content: `## Jira 이슈 생성\n\nJira 이슈 생성 화면이 열렸습니다. 화면을 통해 새 이슈를 생성하세요.`
    });
  } catch (error) {
    handleCommandError('이슈 생성', error);
  }
}

/**
 * Jira 이슈 검색 처리
 */
async function handleJiraSearch(context: any): Promise<void> {
  try {
    // 검색어 구성
    const searchArgs = context?.args.slice(1) || [];
    const searchText = searchArgs.join(' ');
    
    // 검색어가 없으면 단순 검색 화면 열기
    if (!searchText) {
      await vscode.commands.executeCommand('atlascode.jira.searchIssues');
      
      await vscode.commands.executeCommand('ape.sendLlmResponse', {
        role: 'assistant',
        content: `## Jira 이슈 검색\n\nJira 이슈 검색 화면이 열렸습니다. 검색 조건을 입력하여 이슈를 검색하세요.`
      });
      return;
    }
    
    // 검색어가 특정 이슈 키 형식이면 해당 이슈 바로 열기
    const issueKeyPattern = /^[A-Z0-9]+-\d+$/;
    if (issueKeyPattern.test(searchText)) {
      await handleJiraIssue({ args: ['issue', searchText] });
      return;
    }
    
    // 검색어가 있으면 해당 검색어로 검색 실행
    // 여기서는 단순히 검색 화면을 열고 사용자에게 알림만 함
    // (Atlassian Extension API에서 직접 검색어 전달 기능이 제한적임)
    await vscode.commands.executeCommand('atlascode.jira.searchIssues');
    
    await vscode.commands.executeCommand('ape.sendLlmResponse', {
      role: 'assistant',
      content: `## Jira 이슈 검색: ${searchText}\n\nJira 이슈 검색 화면이 열렸습니다. 검색창에 "${searchText}"를 입력하여 검색을 진행하세요.`
    });
  } catch (error) {
    handleCommandError('이슈 검색', error);
  }
}

/**
 * Jira 이슈 정보 표시
 */
async function handleJiraIssue(context: any): Promise<void> {
  try {
    // 이슈 키 가져오기
    const issueArgs = context?.args.slice(1) || [];
    const issueKey = issueArgs.join(' ');
    
    // 이슈 키가 없으면 입력 받기
    if (!issueKey) {
      // 이슈 탐색기 열기
      await vscode.commands.executeCommand('atlascode.views.jira-explorer.focus');
      
      await vscode.commands.executeCommand('ape.sendLlmResponse', {
        role: 'assistant',
        content: `## Jira 이슈 탐색기\n\nJira 이슈 탐색기가 열렸습니다. 이슈 목록에서 원하는 이슈를 선택하세요.`
      });
      return;
    }
    
    // 이슈 키 검증
    const issueKeyPattern = /^[A-Z0-9]+-\d+$/;
    if (!issueKeyPattern.test(issueKey)) {
      await vscode.commands.executeCommand('ape.sendLlmResponse', {
        role: 'assistant',
        content: `## 잘못된 Jira 이슈 키\n\n입력한 값 \`${issueKey}\`은(는) 유효한 Jira 이슈 키 형식이 아닙니다.\n\n이슈 키는 프로젝트 키와 숫자를 하이픈(-)으로 연결한 형태여야 합니다. 예: APE-123, DEV-456`
      });
      return;
    }
    
    // 이슈 열기
    await vscode.commands.executeCommand('atlascode.jira.openIssue', issueKey);
    
    await vscode.commands.executeCommand('ape.sendLlmResponse', {
      role: 'assistant',
      content: `## Jira 이슈: ${issueKey}\n\nJira 이슈 ${issueKey}가 열렸습니다.`
    });
  } catch (error) {
    handleCommandError('이슈 보기', error);
  }
}

/**
 * Atlassian 확장 설치 안내 메시지
 */
async function showAtlassianExtensionNotInstalledMessage(): Promise<void> {
  const content = `
## Atlassian 확장 필요

이 기능을 사용하려면 VSCode Atlassian 확장(atlascode)이 필요합니다.

1. VSCode 마켓플레이스에서 Atlassian 확장을 설치하세요.
2. Atlassian 계정으로 로그인하세요.
3. Jira 사이트 설정을 구성하세요.

[Atlassian 확장 설치하기](https://marketplace.visualstudio.com/items?itemName=Atlassian.atlascode)
`;

  await vscode.commands.executeCommand('ape.sendLlmResponse', {
    role: 'assistant',
    content
  });
  
  // 마켓플레이스 열기 제안
  const action = await vscode.window.showInformationMessage(
    'Jira 기능을 사용하려면 VSCode Atlassian 확장이 필요합니다.', 
    '설치하기'
  );
  
  if (action === '설치하기') {
    vscode.commands.executeCommand(
      'workbench.extensions.search', 
      '@id:atlassian.atlascode'
    );
  }
}

/**
 * 명령 실행 오류 처리
 */
async function handleCommandError(commandName: string, error: any): Promise<void> {
  console.error(`Jira ${commandName} 명령 오류:`, error);
  
  const errorMessage = error instanceof Error ? error.message : String(error);
  vscode.window.showErrorMessage(`Jira ${commandName} 오류: ${errorMessage}`);
  
  await vscode.commands.executeCommand('ape.sendLlmResponse', {
    role: 'assistant',
    content: `## Jira ${commandName} 오류\n\n${commandName} 작업 중 오류가 발생했습니다: ${errorMessage}\n\n확장 설정을 확인하고 다시 시도하세요.`
  });
}