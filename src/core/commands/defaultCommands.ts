/**
 * 기본 슬래시 커맨드 정의
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { SlashCommand } from './slashCommand';
import { createGitCommands } from '../git/commands';
import { createVaultCommands } from './vaultCommands';
import { createRulesCommands } from './rulesCommands';
import { createJiraCommands } from './jiraCommands';
import { createTodoCommands } from './todoCommands';
import { Message, MessageRole } from '../../types/chat';

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
  
  // Todo 명령어 추가 (Todo 서비스가 있는 경우)
  if (services?.todoService) {
    const todoCommands = createTodoCommands(services.todoService);
    commands.push(...todoCommands);
  }
  
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

      if (!subCommand) {
        // Model 하위 명령어 목록 표시 (슬랙/디스코드 스타일 자동완성)
        const modelSubcommands = [
          { command: 'list', description: '사용 가능한 모델 목록을 표시합니다' },
          { command: 'use', description: '지정한 모델로 변경합니다' }
        ];

        // 명령어 제안을 채팅 인터페이스의 자동완성 UI에 표시
        const suggestions = modelSubcommands.map(cmd => ({
          label: `/model ${cmd.command}`,
          description: cmd.description,
          category: 'advanced',
          insertText: `/model ${cmd.command} `
        }));

        // 명령어 제안 표시 - 채팅 입력창 자동완성 UI에 표시
        vscode.commands.executeCommand('ape.showCommandSuggestions', suggestions);

        // VSCode의 퀵픽 UI도 함께 표시 (백업 방법)
        vscode.window.showQuickPick(
          modelSubcommands.map(cmd => ({
            label: cmd.command,
            description: cmd.description,
            detail: `Model 하위 명령어: ${cmd.command}`
          })),
          {
            placeHolder: 'Model 명령어를 선택하세요',
            matchOnDescription: true
          }
        ).then(selected => {
          if (selected) {
            // 선택한 명령어를 채팅 입력창에 삽입
            vscode.commands.executeCommand('ape.insertToChatInput', `/model ${selected.label}`);
          }
        });
      } else if (subCommand === 'list' || subCommand === '목록') {
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

  // Ask 명령어 - 가이드 및 도움말을 LLM 기반으로 제공
  commands.push({
    name: 'ask',
    aliases: ['질문', '물어보기', '가이드', '어떻게', '어떡해', '방법', '조언'],
    description: 'LLM을 사용하여 질문에 대한 가이드와 도움말을 제공합니다',
    examples: ['/ask 컨플릭 해결하려면 어떻게해?', '/ask 자동 커밋 사용 방법', '/질문 규칙 관리는 어떻게 하나요?'],
    category: 'general',
    priority: 1,
    execute: async (context) => {
      try {
        const question = context.args.join(' ').trim();

        if (!question) {
          vscode.window.showErrorMessage('질문을 입력해주세요');
          return;
        }

        // LLM 서비스 가져오기
        let llmService;

        if (services && services.llmService) {
          // 개발 환경에서는 services 객체가 전달됨
          llmService = services.llmService;
        } else {
          // 익스텐션에서 서비스 가져오기 시도
          const extension = vscode.extensions.getExtension('ape-team.ape-extension');
          if (extension && extension.isActive) {
            llmService = extension.exports.llmService;
          }
        }

        // LLM 서비스 존재 확인
        if (!llmService) {
          vscode.window.showErrorMessage('LLM 서비스를 찾을 수 없습니다');
          return;
        }

        // help.json과 guide.json 내용 로드
        const helpPath = path.join(vscode.extensions.getExtension('ape-team.ape-extension')?.extensionPath || '', 'src', 'data', 'help.json');
        const guidePath = path.join(vscode.extensions.getExtension('ape-team.ape-extension')?.extensionPath || '', 'src', 'data', 'guide.json');

        let helpData;
        let guideData;

        try {
          helpData = JSON.parse(fs.readFileSync(helpPath, 'utf8'));
        } catch (error) {
          console.error('help.json 파일 로드 오류:', error);
          helpData = { categories: [], faq: [], guides: [] };
        }

        try {
          guideData = JSON.parse(fs.readFileSync(guidePath, 'utf8'));
        } catch (error) {
          console.error('guide.json 파일 로드 오류:', error);
          guideData = { workflows: [], commandGuides: [] };
        }

        // 시스템 프롬프트 생성
        const systemPrompt = `당신은 APE(Agentic Programming Extension)의 가이드 도우미입니다.
사용자의 질문에 대해 help.json과 guide.json에 있는 정보를 기반으로 명확하고 구체적인 답변을 제공해야 합니다.
질문과 가장 관련성 높은 명령어, 워크플로우, 가이드를 찾아 답변하세요.

답변 시 다음 규칙을 따르세요:
1. 사용자 질문과 관련된 명령어가 있다면 명령어 이름, 설명, 예시를 포함하세요
2. 명령어 사용법과 별칭을 명확히 설명하세요
3. 관련된 워크플로우가 있다면 단계별로 설명하세요
4. 사용자가 질문한 작업을 수행하는 방법을 구체적인 예시와 함께 제공하세요
5. 모든 답변은 한국어로 제공합니다
6. 관련 명령어가 여러 개 있으면 가장 적합한 것을 중심으로 설명하고 다른 관련 명령어도 간략히 언급하세요
7. 답변은 간결하고 명확하게 작성하세요
8. 가이드와 도움말에 없는 내용에 대해서는 정확히 모른다고 답변하세요

답변은 다음 형식을 따르세요:
1. 핵심 명령어 또는 기능을 간략히 소개
2. 단계별 사용 방법
3. 예시 명령어

답변 형식:
[핵심 답변 - 1-2문장]

[상세 설명 및 단계별 방법]

[예시 및 관련 명령어]
`;

        // 컨텍스트 메시지 생성 (help.json, guide.json 데이터)
        const helpCommandsStr = helpData.categories
          .flatMap((category: any) => category.commands)
          .map((cmd: any) => `${cmd.name}: ${cmd.description}\n사용법: ${cmd.usage || '/' + cmd.name}\n예시: ${cmd.examples?.join(', ') || '없음'}\n별칭: ${cmd.aliases?.join(', ') || '없음'}\n`)
          .join('\n');

        const faqStr = helpData.faq
          .map((item: any) => `Q: ${item.question}\nA: ${item.answer}`)
          .join('\n\n');

        const guidesStr = guideData.commandGuides
          .map((guide: any) => `${guide.title}:\n${guide.content.replace(/#+\s/g, '')}`)
          .join('\n\n');

        const workflowsStr = guideData.workflows
          .map((workflow: any) => `${workflow.name}: ${workflow.description}\n권장 명령어: ${workflow.recommendedCommands.map((cmd: any) => cmd.command).join(', ')}`)
          .join('\n\n');

        // 질문을 LLM에 전송
        const messages = [
          {
            id: `system_${Date.now()}`,
            role: MessageRole.System,
            content: systemPrompt,
            timestamp: new Date()
          },
          {
            id: `context_1_${Date.now()}`,
            role: MessageRole.User,
            content: `다음은 APE의 명령어 목록입니다:\n\n${helpCommandsStr}`,
            timestamp: new Date()
          },
          {
            id: `context_2_${Date.now()}`,
            role: MessageRole.User,
            content: `다음은 APE의 FAQ 목록입니다:\n\n${faqStr}`,
            timestamp: new Date()
          },
          {
            id: `context_3_${Date.now()}`,
            role: MessageRole.User,
            content: `다음은 APE의 가이드 목록입니다:\n\n${guidesStr}`,
            timestamp: new Date()
          },
          {
            id: `context_4_${Date.now()}`,
            role: MessageRole.User,
            content: `다음은 APE의 워크플로우 목록입니다:\n\n${workflowsStr}`,
            timestamp: new Date()
          },
          {
            id: `question_${Date.now()}`,
            role: MessageRole.User,
            content: question,
            timestamp: new Date()
          }
        ];

        // 진행 중 메시지 표시
        await vscode.commands.executeCommand('ape.sendLlmResponse', {
          role: 'assistant',
          content: '질문을 분석하고 답변을 준비하고 있습니다...',
          messageId: 'temp_loading'
        });

        // LLM에 요청 전송
        const response = await llmService.sendRequest(messages, { temperature: 0.2 });

        if (response.success && response.data) {
          // 결과를 채팅창에 표시
          await vscode.commands.executeCommand('ape.sendLlmResponse', {
            role: 'assistant',
            content: response.data.message.content,
            replaceMessageId: 'temp_loading'
          });
        } else {
          // 실패 메시지 표시
          await vscode.commands.executeCommand('ape.sendLlmResponse', {
            role: 'assistant',
            content: '죄송합니다. 질문에 답변하는 중 오류가 발생했습니다.',
            replaceMessageId: 'temp_loading'
          });
        }
      } catch (error) {
        console.error('Ask 명령어 오류:', error);
        vscode.window.showErrorMessage(`질문 응답 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);

        // 오류 메시지 표시
        await vscode.commands.executeCommand('ape.sendLlmResponse', {
          role: 'assistant',
          content: '죄송합니다. 질문에 답변하는 중 오류가 발생했습니다.',
          replaceMessageId: 'temp_loading'
        });
      }
    }
  });

  // 시스템 상태 명령어
  commands.push({
    name: 'system',
    aliases: ['sys', '시스템', '상태'],
    description: '시스템 정보와 메모리 상태를 표시합니다',
    examples: ['/system', '/system memory', '/시스템'],
    category: 'utility',
    priority: 15,
    execute: async (context) => {
      try {
        const subCommand = context.args[0]?.toLowerCase();

        // 메모리 서비스와 LLM 서비스 참조
        let memoryService;
        let llmService;

        if (services && services.memoryService && services.llmService) {
          // 개발 환경에서는 services 객체가 전달됨
          memoryService = services.memoryService;
          llmService = services.llmService;
        } else {
          // 익스텐션에서 서비스 가져오기 시도
          const extension = vscode.extensions.getExtension('ape-team.ape-extension');
          if (extension && extension.isActive) {
            memoryService = extension.exports.memoryService;
            llmService = extension.exports.llmService;
          }
        }

        // 서비스 존재 확인
        if (!memoryService) {
          vscode.window.showErrorMessage('메모리 서비스를 찾을 수 없습니다');
          return;
        }

        if (!llmService) {
          vscode.window.showErrorMessage('LLM 서비스를 찾을 수 없습니다');
          return;
        }

        // 시스템 정보 구성 (일반 텍스트 형식)
        let output = 'APE 시스템 상태\n';
        output += '=================\n\n';

        // 현재 세션 정보
        const currentSession = memoryService.getCurrentSession();
        const messagesResult = await memoryService.getMessages();
        const messages = messagesResult.success ? messagesResult.data || [] : [];

        // 현재 모델 정보
        const currentModel = llmService.getActiveModel();
        const modelDisplayName = llmService.getModelDisplayName(currentModel);

        // 메시지 수 계산
        const userMessages = messages.filter((m: Message) => m.role === 'user').length;
        const assistantMessages = messages.filter((m: Message) => m.role === 'assistant').length;
        const systemMessages = messages.filter((m: Message) => m.role === 'system').length;

        // 기본 시스템 정보 표시 (텍스트 형식)
        output += '[ 세션 정보 ]\n\n';
        output += `현재 세션: ${currentSession?.name || '기본 세션'}\n`;
        output += `세션 ID: ${currentSession?.id || 'default'}\n`;
        output += `생성 시간: ${currentSession?.createdAt.toLocaleString() || '알 수 없음'}\n`;
        output += `마지막 업데이트: ${currentSession?.updatedAt.toLocaleString() || '알 수 없음'}\n\n`;

        output += '[ LLM 정보 ]\n\n';
        output += `현재 모델: ${modelDisplayName}\n`;
        output += `모델 ID: ${currentModel}\n\n`;

        output += '[ 메모리 통계 ]\n\n';
        output += `총 메시지 수: ${messages.length}개\n`;
        output += `사용자 메시지: ${userMessages}개\n`;
        output += `어시스턴트 메시지: ${assistantMessages}개\n`;
        output += `시스템 메시지: ${systemMessages}개\n\n`;

        // 메모리 상세 정보 (메모리 하위 명령어인 경우)
        if (!subCommand || subCommand === 'memory' || subCommand === '메모리') {
          output += '[ 메모리 세부 정보 ]\n\n';

          // 최근 메시지 5개 표시 (일반 텍스트 형식)
          if (messages.length > 0) {
            output += '최근 메시지 (최대 5개):\n\n';

            const recentMessages = messages.slice(-5).reverse();
            for (const msg of recentMessages) {
              let role = '';
              switch (msg.role) {
                case 'user': role = '사용자'; break;
                case 'assistant': role = 'Claude'; break;
                case 'system': role = '시스템'; break;
                default: role = msg.role as string;
              }

              // 내용 일부만 표시
              const content = String(msg.content).replace(/<[^>]*>/g, ''); // HTML 태그 제거
              const truncatedContent = content.substring(0, 30) + (content.length > 30 ? '...' : '');

              const timestamp = msg.timestamp.toLocaleTimeString();

              output += `* ${timestamp} | ${role}: ${truncatedContent}\n`;
            }
            output += '\n';
          }
        }

        // 사용자에게 정보 표시
        await vscode.commands.executeCommand('ape.sendLlmResponse', {
          role: 'assistant',
          content: output
        });

      } catch (error) {
        console.error('시스템 상태 명령어 오류:', error);
        vscode.window.showErrorMessage(`시스템 상태 조회 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
    provideCompletions: (partialArgs) => {
      const subCommands = ['memory', '메모리'];
      const parts = partialArgs.split(' ');

      // 첫 번째 인자 자동완성
      if (parts.length <= 1) {
        return subCommands.filter(cmd =>
          cmd.toLowerCase().startsWith(parts[0]?.toLowerCase() || '')
        );
      }

      return [];
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
  
  // 대화 내역 저장 기능
  commands.push({
    name: 'save',
    aliases: ['stack', 'history', 'save', '기록', '대화기록', '저장'],
    description: '현재 채팅 내역을 저장하고 관리합니다',
    examples: ['/save', '/stack', '/history', '/기록'],
    category: 'utility',
    priority: 25,
    execute: async () => {
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

채팅 내역은 트리 뷰에서 확인하고 관리할 수 있습니다.`
        });
        
      } catch (error) {
        console.error('대화 내역 저장 오류:', error);
        vscode.window.showErrorMessage(`대화 내역 저장 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  });
  
  // 대화 내역 보기 기능
  commands.push({
    name: 'show',
    aliases: ['view', 'display', '보기', '내역보기', '대화보기'],
    description: '저장된 채팅 내역을 확인합니다',
    examples: ['/show', '/view', '/보기', '/show 채팅ID'],
    category: 'utility',
    priority: 25,
    execute: async (context) => {
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
            content: '저장된 대화 내역이 없습니다. `/save` 명령어를 사용하여 먼저 대화 내역을 저장해주세요.'
          });
          return;
        }
        
        // 채팅 ID 지정 여부
        const chatId = context.args[0];
        
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
    },
    provideCompletions: (partialArgs) => {
      // 이 시점에서는 간단한 빈 배열만 반환
      // 실제 자동완성은 SlashCommandManager에서 처리할 때 구현
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
        content: '저장된 대화 내역이 없습니다. `/save` 명령어를 사용하여 먼저 대화 내역을 저장해주세요.'
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