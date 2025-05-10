/**
 * 기본 슬래시 커맨드 정의
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { SlashCommand } from './slashCommand';
import { createGitCommands } from '../git/commands';
import { createVaultCommands } from './vaultCommands';
import { createRulesCommands } from './rulesCommands';
import { createJiraCommands } from './jiraCommands';

/**
 * 기본 슬래시 커맨드 목록 생성
 */
export function createDefaultCommands(services?: any): SlashCommand[] {
  const commands: SlashCommand[] = [];
  
  // VAULT 명령어 추가 (VAULT 서비스가 있는 경우)
  if (services?.vaultService) {
    const vaultCommands = createVaultCommands(services.vaultService);
    commands.push(...vaultCommands);
  }
  
  // Rules 명령어 추가 (Rules 서비스가 있는 경우)
  if (services?.rulesService) {
    const rulesCommands = createRulesCommands(services.rulesService);
    commands.push(...rulesCommands);
  }
  
  // Jira 명령어 추가 (Jira 서비스가 있는 경우)
  if (services?.jiraService) {
    const jiraCommands = createJiraCommands(services.jiraService);
    commands.push(...jiraCommands);
  }
  
  // Todo 관련 코드 삭제됨
  
  // 도움말 명령어
  commands.push({
    name: 'help',
    aliases: ['?', 'commands', '도움말', '도움', '명령어', '알려줘', 'search', '검색'],
    description: '사용 가능한 명령어 목록과 도움말을 표시합니다',
    examples: ['/help', '/help git', '/help search 커밋 방법', '/도움말', '/도움말 검색 파일 열기'],
    category: 'general',
    priority: 1,
    execute: async (context) => {
      // 도움말 표시 명령은 SlashCommandManager에서 처리
      const firstArg = context.args[0]?.toLowerCase();
      
      if (firstArg === 'search' || firstArg === '검색' || firstArg === 'find' || firstArg === '찾기') {
        // 검색 모드: 자연어 검색으로 처리
        const searchQuery = context.args.slice(1).join(' ');
        if (searchQuery) {
          await vscode.commands.executeCommand('ape.showCommandHelp', `search ${searchQuery}`);
        } else {
          vscode.window.showErrorMessage('검색어를 입력해주세요');
        }
      } else if (firstArg === 'faq' || firstArg === '자주묻는질문') {
        // FAQ 모드
        await vscode.commands.executeCommand('ape.showCommandHelp', 'faq');
      } else if (firstArg === 'guide' || firstArg === 'guides' || firstArg === '가이드' || firstArg === '가이드목록') {
        // 가이드 목록 모드
        if (context.args.length > 1) {
          // 특정 가이드 선택
          const guideId = context.args[1];
          await vscode.commands.executeCommand('ape.showCommandHelp', `guide ${guideId}`);
        } else {
          // 가이드 목록
          await vscode.commands.executeCommand('ape.showCommandHelp', 'guides');
        }
      } else {
        // 기본 도움말 또는 카테고리/명령어 상세 도움말
        await vscode.commands.executeCommand('ape.showCommandHelp', firstArg);
      }
    },
    provideCompletions: (partialArgs) => {
      const parts = partialArgs.split(' ');
      
      // 첫 번째 인자 자동완성
      if (parts.length <= 1) {
        const options = ['general', 'git', 'code', 'utility', 'advanced', 'search', 'find', 'faq', 'guide', 'guides', '검색', '찾기', '자주묻는질문', '가이드'];
        return options.filter(option => 
          option.toLowerCase().startsWith(parts[0].toLowerCase())
        );
      }
      
      // 두 번째 인자 자동완성 (가이드인 경우)
      if ((parts[0] === 'guide' || parts[0] === 'guides' || parts[0] === '가이드') && parts.length === 2) {
        const guideOptions = ['auto-commit', 'git-integration', 'slash-commands', 'plugins'];
        return guideOptions.filter(option => 
          option.toLowerCase().startsWith(parts[1].toLowerCase())
        );
      }
      
      return [];
    }
  });
  
  // 채팅 내역 지우기
  commands.push({
    name: 'clear',
    aliases: ['cls', 'clean', '지우기', '초기화', '클리어'],
    description: '채팅 내역을 지웁니다',
    category: 'general',
    priority: 2,
    execute: async () => {
      await vscode.commands.executeCommand('ape.clearChat');
    }
  });
  
  // 모델 변경
  commands.push({
    name: 'model',
    aliases: ['use', '모델', '모델변경', '모델선택'],
    description: '사용할 LLM 모델을 변경합니다',
    examples: ['/model list', '/model use LLAMA4-MAVERICK', '/모델 목록'],
    category: 'advanced',
    priority: 10,
    execute: async (context) => {
      const subCommand = context.args[0]?.toLowerCase();
      
      if (!subCommand || subCommand === 'list' || subCommand === '목록') {
        // 모델 목록 표시
        await vscode.commands.executeCommand('ape.selectModel');
      } else if (subCommand === 'use' || subCommand === 'switch' || subCommand === '사용' || subCommand === '변경') {
        // 특정 모델로 변경
        const modelName = context.args[1];
        if (modelName) {
          await vscode.commands.executeCommand('ape.switchModel', modelName);
        } else {
          vscode.window.showErrorMessage('모델 이름을 지정해주세요');
        }
      } else {
        vscode.window.showErrorMessage('알 수 없는 하위 명령어입니다');
      }
    },
    provideCompletions: (partialArgs) => {
      // 고정된 모델 목록 사용
      const models = [
        'openai/gpt-4.1-mini',
        'anthropic/claude-3-haiku-20240307',
        'anthropic/claude-3-sonnet-20240229',
        'perplexity/sonar-small-online',
        'mistralai/mistral-large-latest',
        'google/gemma-7b-it'
      ];
      const subCommands = ['list', 'use', 'switch', '목록', '사용', '변경'];
      
      const parts = partialArgs.split(' ');
      
      // 첫 번째 인자 자동완성
      if (parts.length <= 1) {
        return subCommands.filter(cmd => 
          cmd.toLowerCase().startsWith(partialArgs.toLowerCase())
        );
      }
      
      // 두 번째 인자 자동완성 (모델 이름)
      if (parts[0] === 'use' || parts[0] === 'switch' || parts[0] === '사용' || parts[0] === '변경') {
        const modelQuery = parts[1] || '';
        return models.filter((model: string) => 
          model.toLowerCase().startsWith(modelQuery.toLowerCase())
        );
      }
      
      return [];
    }
  });
  
  // 코드 분석
  commands.push({
    name: 'analyze',
    aliases: ['code', '분석', '코드', '코드분석'],
    description: '현재 선택된 코드를 APE로 분석합니다',
    examples: ['/analyze', '/code', '/분석'],
    category: 'code',
    priority: 5,
    execute: async () => {
      await vscode.commands.executeCommand('ape.analyzeCode');
    }
  });
  
  // Git 명령어 추가
  const gitCommands = createGitCommands();
  commands.push(...gitCommands);
  
  // 설정
  commands.push({
    name: 'settings',
    aliases: ['config', 'preferences', '설정', '환경설정', '프리퍼런스'],
    description: 'APE 설정을 변경합니다',
    category: 'utility',
    priority: 15,
    execute: async () => {
      await vscode.commands.executeCommand('workbench.action.openSettings', 'ape');
    }
  });
  
  // 파일 열기
  commands.push({
    name: 'open',
    aliases: ['file', '열기', '파일', '파일열기'],
    description: '파일을 엽니다',
    examples: ['/open package.json', '/open src/index.ts', '/파일열기 package.json'],
    category: 'utility',
    priority: 20,
    execute: async (context) => {
      const filePath = context.args.join(' ');
      
      if (!filePath) {
        vscode.window.showErrorMessage('열 파일 경로를 지정해주세요');
        return;
      }
      
      try {
        const document = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(document);
      } catch {
        vscode.window.showErrorMessage(`파일을 열 수 없습니다: ${filePath}`);
      }
    }
  });
  
  // 채팅 관리 기능
  commands.push({
    name: 'chat',
    aliases: ['대화', '채팅', 'c'],
    description: '채팅 내역을 저장하고 관리합니다',
    examples: ['/chat save', '/chat list', '/chat show ID', '/대화 저장', '/채팅 목록'],
    category: 'utility',
    priority: 25,
    execute: async (context) => {
      const subCommand = context.args[0]?.toLowerCase();

      if (!subCommand || subCommand === 'help' || subCommand === '도움말') {
        // 도움말 표시
        await vscode.commands.executeCommand('ape.sendLlmResponse', {
          role: 'assistant',
          content: `## 채팅 관리 명령어 사용법

다음 하위 명령어를 사용할 수 있습니다:

- \`/chat save\`: 현재 채팅 내용을 저장합니다.
- \`/chat list\`: 저장된 모든 채팅 목록을 표시합니다.
- \`/chat show [ID]\`: 특정 채팅 내역을 표시합니다.

예시: \`/chat save\`, \`/chat list\`, \`/chat show chat_12345\``
        });
        return;
      }

      if (subCommand === 'save' || subCommand === '저장') {
        // 대화 내역 저장 기능
      try {
        // 메모리 서비스 가져오기
        const memoryService = vscode.extensions.getExtension('ape-team.ape-extension')?.exports?.memoryService;
        if (!memoryService) {
          vscode.window.showErrorMessage('메모리 서비스를 찾을 수 없습니다');
          return;
        }
        
        // VAULT 서비스 가져오기
        const vaultService = vscode.extensions.getExtension('ape-team.ape-extension')?.exports?.vaultService;
        if (!vaultService) {
          vscode.window.showErrorMessage('VAULT 서비스를 찾을 수 없습니다');
          return;
        }
        
        // LLM 서비스 가져오기
        const llmService = vscode.extensions.getExtension('ape-team.ape-extension')?.exports?.llmService;
        
        // 현재 메시지 목록 가져오기
        const messagesResult = await memoryService.getMessages();
        if (!messagesResult.success || !messagesResult.data) {
          vscode.window.showErrorMessage('대화 내역을 가져올 수 없습니다');
          return;
        }
        
        const messages = messagesResult.data;
        
        // 대화 내역 마크다운 형식으로 변환
        let markdown = '';
        
        // 현재 시간 추가
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0];
        const timestamp = now.toISOString();
        
        markdown += `## ${dateStr} ${timeStr}\n\n`;
        
        // 메시지 역순으로 변환 (최신 메시지가 위에 오도록)
        for (let i = messages.length - 1; i >= 0; i--) {
          const message = messages[i];
          
          // 시스템 메시지나 웰컴 메시지는 건너뛰기
          if (message.role === 'system' && message.content.includes('welcome-container')) {
            continue;
          }
          
          // 사용자나 어시스턴트 메시지만 포함
          if (message.role === 'user' || message.role === 'assistant') {
            const role = message.role === 'user' ? '사용자' : 'Claude';
            
            // HTML 태그 제거 (간단한 방식으로)
            const contentStr = message.content.replace(/<[^>]*>/g, '');
            
            markdown += `**${role}**: ${contentStr}\n\n`;
            
            // 구분선 추가 (마지막 메시지 제외)
            if (i > 0) {
              markdown += '---\n\n';
            }
          }
        }
        
        // 채팅 내역 제목 생성 (LLM 서비스 사용)
        let chatTitle = `채팅 내역 ${dateStr} ${timeStr}`;
        
        if (llmService && messages.length > 0) {
          try {
            // 첫 번째 사용자 메시지 찾기
            const firstUserMessage = messages.find((m: any) => m.role === 'user');
            if (firstUserMessage) {
              // LLM에 요약 요청
              const summaryPrompt = `다음 메시지의 내용을 20자 이내의 한국어 제목으로 요약해주세요: "${firstUserMessage.content.replace(/<[^>]*>/g, '').slice(0, 200)}${firstUserMessage.content.length > 200 ? '...' : ''}"`;
              const summaryResult = await llmService.getSingleCompletion(summaryPrompt);
              
              if (summaryResult && summaryResult.trim()) {
                // 요약 결과에서 따옴표나 공백 제거
                chatTitle = summaryResult.trim().replace(/^["']|["']$/g, '');
              }
            }
          } catch (error) {
            console.error('채팅 제목 생성 오류:', error);
            // 오류 발생 시 기본 제목 사용 (이미 설정됨)
          }
        }
        
        // UUID 생성
        const uuid = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        
        // 워크스페이스 루트 경로 가져오기
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
          vscode.window.showErrorMessage('워크스페이스 폴더를 찾을 수 없습니다');
          return;
        }
        
        // Vault 내 채팅 내역 경로 확인 및 생성
        const chatHistoryDir = path.join(workspaceFolder.uri.fsPath, 'vault', 'chat-history');
        const chatHistoryUri = vscode.Uri.file(chatHistoryDir);
        
        try {
          await vscode.workspace.fs.stat(chatHistoryUri);
        } catch {
          // 디렉토리가 없으면 생성
          await vscode.workspace.fs.createDirectory(chatHistoryUri);
        }
        
        // 채팅 내역 파일 경로 (UUID 사용)
        const chatHistoryPath = vscode.Uri.joinPath(chatHistoryUri, `${uuid}.md`);
        
        // 메타데이터 파일 경로
        const metadataPath = vscode.Uri.joinPath(chatHistoryUri, `${uuid}.meta.json`);
        
        // 메타데이터 생성
        const metadata = {
          id: uuid,
          title: chatTitle,
          createdAt: timestamp,
          updatedAt: timestamp,
          messageCount: messages.length
        };
        
        // 파일 저장 (채팅 내역)
        await vscode.workspace.fs.writeFile(
          chatHistoryPath,
          Buffer.from(markdown, 'utf8')
        );
        
        // 파일 저장 (메타데이터)
        await vscode.workspace.fs.writeFile(
          metadataPath,
          Buffer.from(JSON.stringify(metadata, null, 2), 'utf8')
        );
        
        // 트리 뷰 새로고침
        try {
          await vscode.commands.executeCommand('ape.refreshTreeView');
        } catch (error) {
          console.error('트리 뷰 새로고침 오류:', error);
        }
        
        // 결과를 채팅창에 표시
        await vscode.commands.executeCommand('ape.sendLlmResponse', {
          role: 'assistant',
          content: `대화 내역이 **${chatTitle}**으로 저장되었습니다. 총 ${messages.length}개의 메시지가 기록되었습니다.

채팅 내역은 트리 뷰에서 확인하거나 \`/chat list\` 명령어로 확인할 수 있습니다.`
        });

      } catch (error) {
        console.error('대화 내역 저장 오류:', error);
        vscode.window.showErrorMessage(`대화 내역 저장 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else if (subCommand === 'list' || subCommand === 'ls' || subCommand === '목록') {
      // 저장된 모든 채팅 내역 목록 표시
      try {
        // 워크스페이스 루트 경로 가져오기
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
          vscode.window.showErrorMessage('워크스페이스 폴더를 찾을 수 없습니다');
          return;
        }

        // 채팅 내역 폴더 경로
        const chatHistoryDir = path.join(workspaceFolder.uri.fsPath, 'vault', 'chat-history');
        const chatHistoryUri = vscode.Uri.file(chatHistoryDir);

        // 폴더 존재 확인
        try {
          await vscode.workspace.fs.stat(chatHistoryUri);
        } catch {
          // 폴더가 없는 경우
          await vscode.commands.executeCommand('ape.sendLlmResponse', {
            role: 'assistant',
            content: '저장된 대화 내역이 없습니다. `/chat save` 명령어를 사용하여 먼저 대화 내역을 저장해주세요.'
          });
          return;
        }

        // 저장된 모든 채팅 내역 목록 표시
        await showChatList(chatHistoryUri);
      } catch (error) {
        console.error('대화 내역 목록 표시 오류:', error);
        vscode.window.showErrorMessage(`대화 내역 목록 표시 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else if (subCommand === 'show' || subCommand === 'view' || subCommand === '보기') {
      try {
        // 워크스페이스 루트 경로 가져오기
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
          vscode.window.showErrorMessage('워크스페이스 폴더를 찾을 수 없습니다');
          return;
        }

        // 채팅 내역 폴더 경로
        const chatHistoryDir = path.join(workspaceFolder.uri.fsPath, 'vault', 'chat-history');
        const chatHistoryUri = vscode.Uri.file(chatHistoryDir);

        // 폴더 존재 확인
        try {
          await vscode.workspace.fs.stat(chatHistoryUri);
        } catch {
          // 폴더가 없는 경우
          await vscode.commands.executeCommand('ape.sendLlmResponse', {
            role: 'assistant',
            content: '저장된 대화 내역이 없습니다. `/chat save` 명령어를 사용하여 먼저 대화 내역을 저장해주세요.'
          });
          return;
        }

        // 채팅 ID 지정 여부
        const chatId = context.args[1];

        if (chatId) {
          // 특정 채팅 내역 표시
          await showSpecificChat(chatId, chatHistoryUri);
        } else {
          // 저장된 모든 채팅 내역 목록 표시
          await showChatList(chatHistoryUri);
        }
      } catch (error) {
        console.error('대화 내역 표시 오류:', error);
        vscode.window.showErrorMessage(`대화 내역 표시 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      vscode.window.showErrorMessage(`알 수 없는 채팅 명령어입니다: ${subCommand}. 사용 가능한 명령어: save, list, show`);
    }
  },
  provideCompletions: (partialArgs) => {
    const subCommands = ['save', 'list', 'show', 'help', '저장', '목록', '보기', '도움말'];

      const parts = partialArgs.split(' ');

      // 첫 번째 인자 자동완성 (서브커맨드)
      if (parts.length <= 1) {
        return subCommands.filter(cmd =>
          cmd.toLowerCase().startsWith(parts[0]?.toLowerCase() || '')
        );
      }

      return [];
    }
  });

  /**
   * 특정 채팅 내역 표시
   * @param chatId 채팅 ID
   * @param chatHistoryUri 채팅 내역 폴더 URI
   */
  async function showSpecificChat(chatId: string, chatHistoryUri: vscode.Uri): Promise<void> {
    // 메타데이터 파일 경로
    const metadataPath = vscode.Uri.joinPath(chatHistoryUri, `${chatId}.meta.json`);
    
    // 채팅 내역 파일 경로
    const chatHistoryPath = vscode.Uri.joinPath(chatHistoryUri, `${chatId}.md`);
    
    // 파일 존재 확인
    try {
      await vscode.workspace.fs.stat(metadataPath);
      await vscode.workspace.fs.stat(chatHistoryPath);
    } catch {
      // 파일이 없는 경우
      await vscode.commands.executeCommand('ape.sendLlmResponse', {
        role: 'assistant',
        content: `ID가 '${chatId}'인 채팅 내역을 찾을 수 없습니다.`
      });
      return;
    }
    
    // 메타데이터 읽기
    const metadataData = await vscode.workspace.fs.readFile(metadataPath);
    const metadata = JSON.parse(Buffer.from(metadataData).toString('utf8'));
    
    // 채팅 내역 읽기
    const fileData = await vscode.workspace.fs.readFile(chatHistoryPath);
    const content = Buffer.from(fileData).toString('utf8');
    
    // 결과를 채팅창에 표시
    await vscode.commands.executeCommand('ape.sendLlmResponse', {
      role: 'assistant',
      content: `## ${metadata.title}\n\n\`\`\`markdown\n${content}\n\`\`\``
    });
  }
  
  /**
   * 저장된 채팅 내역 목록 표시
   * @param chatHistoryUri 채팅 내역 폴더 URI
   */
  async function showChatList(chatHistoryUri: vscode.Uri): Promise<void> {
    // 메타데이터 파일 목록 가져오기
    const files = await vscode.workspace.fs.readDirectory(chatHistoryUri);
    const metaFiles = files.filter(([name]) => name.endsWith('.meta.json'));
    
    if (metaFiles.length === 0) {
      // 저장된 채팅 내역이 없는 경우
      await vscode.commands.executeCommand('ape.sendLlmResponse', {
        role: 'assistant',
        content: '저장된 대화 내역이 없습니다. `/save-chat` 명령어를 사용하여 먼저 대화 내역을 저장해주세요.'
      });
      return;
    }
    
    // 메타데이터 읽기
    const chatList = [];
    
    for (const [fileName] of metaFiles) {
      const metadataPath = vscode.Uri.joinPath(chatHistoryUri, fileName);
      const metadataData = await vscode.workspace.fs.readFile(metadataPath);
      const metadata = JSON.parse(Buffer.from(metadataData).toString('utf8'));
      
      // 날짜 포맷팅
      const createdDate = new Date(metadata.createdAt);
      const dateStr = createdDate.toLocaleDateString();
      const timeStr = createdDate.toLocaleTimeString();
      
      chatList.push({
        id: metadata.id,
        title: metadata.title,
        createdAt: `${dateStr} ${timeStr}`,
        messageCount: metadata.messageCount
      });
    }
    
    // 최신순 정렬
    chatList.sort((a, b) => b.id.localeCompare(a.id));
    
    // 마크다운 테이블 생성
    let output = '## 저장된 채팅 내역 목록\n\n';
    output += '| 제목 | 저장 시간 | 메시지 수 | 명령어 |\n';
    output += '|------|-------|----------|--------|\n';
    
    for (const chat of chatList) {
      output += `| ${chat.title} | ${chat.createdAt} | ${chat.messageCount}개 | \`/show ${chat.id}\` |\n`;
    }
    
    output += '\n특정 채팅 내역을 보려면 위 명령어를 사용하세요.';
    
    // 결과를 채팅창에 표시
    await vscode.commands.executeCommand('ape.sendLlmResponse', {
      role: 'assistant',
      content: output
    });
  }
  
  return commands;
}