/**
 * VAULT 관련 슬래시 커맨드 정의
 */

import * as vscode from 'vscode';
import { SlashCommand, CommandContext } from './slashCommand';
import { VaultContextType } from '../services/vaultService';

/**
 * VAULT 명령어 생성
 * @param vaultService VAULT 서비스 인스턴스
 */
export function createVaultCommands(vaultService: any): SlashCommand[] {
  const commands: SlashCommand[] = [];
  
  // VAULT 메인 명령어
  commands.push({
    name: 'vault',
    aliases: ['컨텍스트', '볼트', 'ctx', 'context'],
    description: 'VAULT 컨텍스트 및 아이템을 관리합니다',
    examples: ['/vault list', '/vault show system-context', '/vault use system-item-1', '/vault create personal 내 작업 메모'],
    category: 'utility',
    priority: 5,
    execute: async (context: CommandContext) => {
      const subCommand = context.args[0]?.toLowerCase();

      if (!subCommand) {
        // Vault 하위 명령어 목록 표시 (슬랙/디스코드 스타일 자동완성)
        const vaultSubcommands = [
          { command: 'list', description: '모든 컨텍스트 및 아이템 목록을 표시합니다' },
          { command: 'show', description: '특정 컨텍스트 또는 아이템 내용을 표시합니다' },
          { command: 'use', description: '아이템을 사용하여 채팅창에 내용을 삽입합니다' },
          { command: 'create', description: '새 컨텍스트 또는 아이템을 생성합니다' },
          { command: 'delete', description: '컨텍스트 또는 아이템을 삭제합니다' },
          { command: 'search', description: '컨텍스트 내에서 아이템을 검색합니다' }
        ];

        // 명령어 제안을 채팅 인터페이스의 자동완성 UI에 표시
        const suggestions = vaultSubcommands.map(cmd => ({
          label: `/vault ${cmd.command}`,
          description: cmd.description,
          category: 'utility',
          insertText: `/vault ${cmd.command} `
        }));

        // 명령어 제안 표시 - 채팅 입력창 자동완성 UI에 표시
        vscode.commands.executeCommand('ape.showCommandSuggestions', suggestions);

        // VSCode의 퀵픽 UI도 함께 표시 (백업 방법)
        vscode.window.showQuickPick(
          vaultSubcommands.map(cmd => ({
            label: cmd.command,
            description: cmd.description,
            detail: `Vault 하위 명령어: ${cmd.command}`
          })),
          {
            placeHolder: 'Vault 명령어를 선택하세요',
            matchOnDescription: true
          }
        ).then(selected => {
          if (selected) {
            // 선택한 명령어를 채팅 입력창에 삽입
            vscode.commands.executeCommand('ape.insertToChatInput', `/vault ${selected.label}`);
          }
        });
      } else if (subCommand === 'list' || subCommand === '목록') {
        // 컨텍스트 목록 표시
        await showContextList(vaultService);
      } else if (subCommand === 'show' || subCommand === '보기' || subCommand === 'view') {
        // 컨텍스트 또는 아이템 상세 보기
        const id = context.args[1];
        if (!id) {
          vscode.window.showErrorMessage('표시할 컨텍스트 또는 아이템 ID를 지정해주세요');
          return;
        }

        await showContextOrItem(vaultService, id);
      } else if (subCommand === 'use' || subCommand === '사용') {
        // 아이템 사용 (채팅창에 내용 삽입)
        const itemId = context.args[1];
        if (!itemId) {
          vscode.window.showErrorMessage('사용할 아이템 ID를 지정해주세요');
          return;
        }
        
        await useVaultItem(vaultService, itemId);
      } else if (subCommand === 'create' || subCommand === '생성' || subCommand === 'new' || subCommand === '새로만들기') {
        // 새 컨텍스트 또는 아이템 생성
        const type = context.args[1]?.toLowerCase();
        const name = context.args.slice(2).join(' ');
        
        if (!type || !name) {
          vscode.window.showErrorMessage('컨텍스트 유형과 이름을 지정해주세요');
          return;
        }
        
        await createContextOrItem(vaultService, type, name);
      } else if (subCommand === 'delete' || subCommand === '삭제' || subCommand === 'remove') {
        // 컨텍스트 또는 아이템 삭제
        const id = context.args[1];
        if (!id) {
          vscode.window.showErrorMessage('삭제할 컨텍스트 또는 아이템 ID를 지정해주세요');
          return;
        }
        
        await deleteContextOrItem(vaultService, id);
      } else if (subCommand === 'search' || subCommand === '검색') {
        // 아이템 검색
        const query = context.args.slice(1).join(' ');
        if (!query) {
          vscode.window.showErrorMessage('검색어를 입력해주세요');
          return;
        }
        
        await searchVaultItems(vaultService, query);
      } else {
        vscode.window.showErrorMessage(`알 수 없는 VAULT 하위 명령어입니다: ${subCommand}`);
      }
    },
    provideCompletions: (partialArgs) => {
      const parts = partialArgs.split(' ');
      
      // 첫 번째 인자 자동완성 (하위 명령어)
      if (parts.length <= 1) {
        const options = ['list', 'show', 'use', 'create', 'delete', 'search', '목록', '보기', '사용', '생성', '삭제', '검색'];
        return options.filter(option => 
          option.toLowerCase().startsWith(parts[0].toLowerCase() || '')
        );
      }
      
      // 두 번째 인자 자동완성
      if (parts.length === 2) {
        const subCommand = parts[0].toLowerCase();
        
        if (subCommand === 'create' || subCommand === '생성' || subCommand === 'new' || subCommand === '새로만들기') {
          // 컨텍스트 유형 제안
          const typeOptions = ['system', 'project', 'personal', 'shared', 'template', '시스템', '프로젝트', '개인', '공유', '템플릿'];
          return typeOptions.filter(option => 
            option.toLowerCase().startsWith(parts[1].toLowerCase() || '')
          );
        } else if (subCommand === 'show' || subCommand === '보기' || subCommand === 'view' || 
                  subCommand === 'use' || subCommand === '사용' ||
                  subCommand === 'delete' || subCommand === '삭제' || subCommand === 'remove') {
          // 컨텍스트/아이템 ID 제안 - 실제로는 vaultService에서 가져와야 함
          // 모의 데이터 사용
          const idOptions = ['system-context', 'project-context', 'personal-context', 'shared-context', 'template-context', 
                            'system-item-1', 'system-item-2', 'project-item-1', 'project-item-2', 'personal-item-1'];
          return idOptions.filter(option => 
            option.toLowerCase().startsWith(parts[1].toLowerCase() || '')
          );
        }
      }
      
      return [];
    }
  });
  
  return commands;
}

/**
 * 컨텍스트 목록 표시
 */
async function showContextList(vaultService: any, context?: CommandContext): Promise<void> {
  try {
    const allContexts = vaultService.getAllContexts();
    
    if (allContexts.length === 0) {
      await vscode.commands.executeCommand('ape.sendLlmResponse', {
        role: 'assistant',
        content: 'VAULT에 저장된 컨텍스트가 없습니다.'
      });
      return;
    }
    
    let content = '## VAULT 컨텍스트 목록\n\n';
    
    // 컨텍스트 타입별 그룹화
    const groupedContexts: Record<string, any[]> = {
      'system': [],
      'project': [],
      'personal': [],
      'shared': [],
      'template': []
    };
    
    allContexts.forEach((ctx: any) => {
      groupedContexts[ctx.type].push(ctx);
    });
    
    // 타입별로 표시
    for (const [type, contexts] of Object.entries(groupedContexts)) {
      if (contexts.length > 0) {
        // 타입명 한글로 변환
        let typeKorean = '';
        switch (type) {
          case 'system': typeKorean = '시스템'; break;
          case 'project': typeKorean = '프로젝트'; break;
          case 'personal': typeKorean = '개인'; break;
          case 'shared': typeKorean = '공유'; break;
          case 'template': typeKorean = '템플릿'; break;
          default: typeKorean = type;
        }
        
        content += `### ${typeKorean} 컨텍스트\n\n`;
        
        contexts.forEach(context => {
          content += `- **${context.name}** (ID: \`${context.id}\`): ${context.items.length}개 항목`;
          if (context.description) {
            content += ` - ${context.description}`;
          }
          content += '\n';
          
          // 해당 컨텍스트의 아이템들 표시
          if (context.items.length > 0) {
            content += '  - 아이템 목록:\n';
            context.items.forEach((item: any) => {
              content += `    - ${item.name} (ID: \`${item.id}\`)`;
              if (item.description) {
                content += ` - ${item.description}`;
              }
              content += '\n';
            });
          }
          content += '\n';
        });
      }
    }
    
    // 컨텍스트를 사용하는 방법 안내
    content += '\n### 사용 방법\n\n';
    content += '- 컨텍스트 상세 정보 보기: `/vault show [컨텍스트ID]`\n';
    content += '- 아이템 내용 보기: `/vault show [아이템ID]`\n';
    content += '- 아이템 사용하기: `/vault use [아이템ID]`\n';
    
    await vscode.commands.executeCommand('ape.sendLlmResponse', {
      role: 'assistant',
      content
    });
  } catch (error) {
    console.error('컨텍스트 목록 표시 오류:', error);
    vscode.window.showErrorMessage('컨텍스트 목록을 가져오는 중 오류가 발생했습니다');
  }
}

/**
 * 컨텍스트 또는 아이템 상세 보기
 */
async function showContextOrItem(vaultService: any, id: string): Promise<void> {
  try {
    // 먼저 컨텍스트 검색
    const context = vaultService.getContextById(id);
    
    if (context) {
      // 컨텍스트 정보 표시
      let content = `## 컨텍스트: ${context.name}\n\n`;
      content += `- **ID**: \`${context.id}\`\n`;
      content += `- **유형**: ${getContextTypeKorean(context.type)}\n`;
      if (context.description) {
        content += `- **설명**: ${context.description}\n`;
      }
      content += `- **생성일**: ${formatDate(context.createdAt)}\n`;
      content += `- **수정일**: ${formatDate(context.updatedAt)}\n`;
      content += `- **항목 수**: ${context.items.length}개\n\n`;
      
      if (context.items.length > 0) {
        content += '### 포함된 아이템\n\n';
        context.items.forEach((item: any) => {
          content += `- **${item.name}** (ID: \`${item.id}\`)`;
          if (item.description) {
            content += ` - ${item.description}`;
          }
          content += '\n';
        });
      }
      
      await vscode.commands.executeCommand('ape.sendLlmResponse', {
        role: 'assistant',
        content
      });
      return;
    }
    
    // 아이템 검색
    const allContexts = vaultService.getAllContexts();
    for (const context of allContexts) {
      const item = context.items.find((item: any) => item.id === id);
      if (item) {
        // 아이템 정보 표시
        let content = `## 아이템: ${item.name}\n\n`;
        content += `- **ID**: \`${item.id}\`\n`;
        content += `- **컨텍스트**: ${context.name} (${getContextTypeKorean(context.type)})\n`;
        if (item.description) {
          content += `- **설명**: ${item.description}\n`;
        }
        content += `- **생성일**: ${formatDate(item.createdAt)}\n`;
        content += `- **수정일**: ${formatDate(item.updatedAt)}\n`;
        
        if (item.tags && item.tags.length > 0) {
          content += `- **태그**: ${item.tags.join(', ')}\n`;
        }
        
        content += '\n### 내용\n\n';
        content += '```\n' + item.content + '\n```\n\n';
        
        content += '이 아이템을 사용하려면 `/vault use ' + item.id + '` 명령어를 실행하세요.';
        
        await vscode.commands.executeCommand('ape.sendLlmResponse', {
          role: 'assistant',
          content
        });
        return;
      }
    }
    
    // 컨텍스트나 아이템을 찾지 못한 경우
    await vscode.commands.executeCommand('ape.sendLlmResponse', {
      role: 'assistant',
      content: `ID가 \`${id}\`인 컨텍스트나 아이템을 찾을 수 없습니다.`
    });
  } catch (error) {
    console.error('컨텍스트/아이템 표시 오류:', error);
    vscode.window.showErrorMessage('컨텍스트 또는 아이템 정보를 가져오는 중 오류가 발생했습니다');
  }
}

/**
 * 아이템 사용 (채팅창에 내용 삽입)
 */
async function useVaultItem(vaultService: any, itemId: string): Promise<void> {
  try {
    // 아이템 검색
    const allContexts = vaultService.getAllContexts();
    for (const context of allContexts) {
      const item = context.items.find((item: any) => item.id === itemId);
      if (item) {
        // 아이템 내용을 LLM에게 제공
        await vscode.commands.executeCommand('ape.sendUserMessage', {
          content: item.content
        });
        return;
      }
    }
    
    // 아이템을 찾지 못한 경우
    await vscode.commands.executeCommand('ape.sendLlmResponse', {
      role: 'assistant',
      content: `ID가 \`${itemId}\`인 아이템을 찾을 수 없습니다.`
    });
  } catch (error) {
    console.error('아이템 사용 오류:', error);
    vscode.window.showErrorMessage('아이템을 사용하는 중 오류가 발생했습니다');
  }
}

/**
 * 새 컨텍스트 또는 아이템 생성
 */
async function createContextOrItem(vaultService: any, typeStr: string, name: string): Promise<void> {
  try {
    // 컨텍스트 유형 결정
    let contextType: VaultContextType | undefined;
    
    switch (typeStr.toLowerCase()) {
      case 'system':
      case '시스템':
        contextType = VaultContextType.System;
        break;
      case 'project':
      case '프로젝트':
        contextType = VaultContextType.Project;
        break;
      case 'personal':
      case '개인':
        contextType = VaultContextType.Personal;
        break;
      case 'shared':
      case '공유':
        contextType = VaultContextType.Shared;
        break;
      case 'template':
      case '템플릿':
        contextType = VaultContextType.Template;
        break;
      default:
        // 컨텍스트 ID인지 확인 (아이템 생성 모드)
        const context = vaultService.getContextById(typeStr);
        if (context) {
          // 아이템 생성 모드
          await createItem(vaultService, context, name);
          return;
        }
        
        // 유효하지 않은 유형
        vscode.window.showErrorMessage('유효하지 않은 컨텍스트 유형이나 ID입니다');
        return;
    }
    
    // 컨텍스트 생성
    await createContext(vaultService, contextType, name);
  } catch (error) {
    console.error('컨텍스트/아이템 생성 오류:', error);
    vscode.window.showErrorMessage('컨텍스트 또는 아이템을 생성하는 중 오류가 발생했습니다');
  }
}

/**
 * 새 컨텍스트 생성
 */
async function createContext(vaultService: any, type: VaultContextType, name: string): Promise<void> {
  try {
    // 설명 입력 받기
    const description = await vscode.window.showInputBox({
      prompt: '컨텍스트 설명을 입력하세요 (선택사항)',
      placeHolder: '컨텍스트에 대한 설명'
    });
    
    // 컨텍스트 생성
    const newContext = await vaultService.createContext(name, type, description);
    
    await vscode.commands.executeCommand('ape.sendLlmResponse', {
      role: 'assistant',
      content: `${getContextTypeKorean(type)} 컨텍스트 "${name}"가 생성되었습니다. (ID: \`${newContext.id}\`)`
    });
  } catch (error) {
    console.error('컨텍스트 생성 오류:', error);
    vscode.window.showErrorMessage('컨텍스트를 생성하는 중 오류가 발생했습니다');
  }
}

/**
 * 새 아이템 생성
 */
async function createItem(vaultService: any, context: any, name: string): Promise<void> {
  try {
    // 설명 입력 받기
    const description = await vscode.window.showInputBox({
      prompt: '아이템 설명을 입력하세요 (선택사항)',
      placeHolder: '아이템에 대한 설명'
    });
    
    // 태그 입력 받기
    const tagsInput = await vscode.window.showInputBox({
      prompt: '태그를 입력하세요 (쉼표로 구분, 선택사항)',
      placeHolder: 'tag1, tag2, tag3'
    });
    
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()) : undefined;
    
    // 내용 입력 받기 (에디터 열기)
    const document = await vscode.workspace.openTextDocument({
      content: '',
      language: 'markdown'
    });
    
    const editor = await vscode.window.showTextDocument(document);
    
    // 사용자가 내용 편집을 완료할 때까지 대기
    const content = await new Promise<string>(resolve => {
      const disposable = vscode.workspace.onDidCloseTextDocument(
        closedDoc => {
          if (closedDoc === document) {
            resolve(document.getText());
            disposable.dispose();
          }
        }
      );
    });
    
    if (!content.trim()) {
      vscode.window.showErrorMessage('아이템 내용이 비어 있습니다. 아이템 생성이 취소되었습니다.');
      return;
    }
    
    // 아이템 생성
    const newItem = await vaultService.createItem(context.id, {
      name,
      description,
      content,
      tags,
      contextType: context.type
    });
    
    await vscode.commands.executeCommand('ape.sendLlmResponse', {
      role: 'assistant',
      content: `"${context.name}" 컨텍스트에 "${name}" 아이템이 생성되었습니다. (ID: \`${newItem.id}\`)`
    });
  } catch (error) {
    console.error('아이템 생성 오류:', error);
    vscode.window.showErrorMessage('아이템을 생성하는 중 오류가 발생했습니다');
  }
}

/**
 * 컨텍스트 또는 아이템 삭제
 */
async function deleteContextOrItem(vaultService: any, id: string): Promise<void> {
  try {
    // 컨텍스트인지 확인
    const context = vaultService.getContextById(id);
    
    if (context) {
      // 컨텍스트 삭제 확인
      const confirmed = await vscode.window.showWarningMessage(
        `"${context.name}" 컨텍스트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며, 포함된 모든 아이템이 함께 삭제됩니다.`,
        { modal: true },
        '삭제'
      );
      
      if (confirmed !== '삭제') {
        await vscode.commands.executeCommand('ape.sendLlmResponse', {
          role: 'assistant',
          content: '컨텍스트 삭제가 취소되었습니다.'
        });
        return;
      }
      
      // 컨텍스트 삭제
      await vaultService.deleteContext(id);
      
      await vscode.commands.executeCommand('ape.sendLlmResponse', {
        role: 'assistant',
        content: `"${context.name}" 컨텍스트가 삭제되었습니다.`
      });
      return;
    }
    
    // 아이템 검색
    const allContexts = vaultService.getAllContexts();
    for (const ctx of allContexts) {
      const itemIndex = ctx.items.findIndex((item: any) => item.id === id);
      if (itemIndex !== -1) {
        const item = ctx.items[itemIndex];
        
        // 아이템 삭제 확인
        const confirmed = await vscode.window.showWarningMessage(
          `"${item.name}" 아이템을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
          { modal: true },
          '삭제'
        );
        
        if (confirmed !== '삭제') {
          await vscode.commands.executeCommand('ape.sendLlmResponse', {
            role: 'assistant',
            content: '아이템 삭제가 취소되었습니다.'
          });
          return;
        }
        
        // 아이템 삭제
        await vaultService.deleteItem(ctx.id, id);
        
        await vscode.commands.executeCommand('ape.sendLlmResponse', {
          role: 'assistant',
          content: `"${item.name}" 아이템이 삭제되었습니다.`
        });
        return;
      }
    }
    
    // 컨텍스트나 아이템을 찾지 못한 경우
    await vscode.commands.executeCommand('ape.sendLlmResponse', {
      role: 'assistant',
      content: `ID가 \`${id}\`인 컨텍스트나 아이템을 찾을 수 없습니다.`
    });
  } catch (error) {
    console.error('컨텍스트/아이템 삭제 오류:', error);
    vscode.window.showErrorMessage('컨텍스트 또는 아이템을 삭제하는 중 오류가 발생했습니다');
  }
}

/**
 * 아이템 검색
 */
async function searchVaultItems(vaultService: any, query: string): Promise<void> {
  try {
    // 아이템 검색
    const items = vaultService.searchItems(query);
    
    if (items.length === 0) {
      await vscode.commands.executeCommand('ape.sendLlmResponse', {
        role: 'assistant',
        content: `"${query}" 검색어와 일치하는 아이템이 없습니다.`
      });
      return;
    }
    
    // 결과 표시
    let content = `## "${query}" 검색 결과\n\n`;
    content += `총 ${items.length}개의 아이템이 검색되었습니다.\n\n`;
    
    // 아이템 그룹화 (컨텍스트별)
    const groupedItems: Record<string, any[]> = {};
    
    items.forEach((item: any) => {
      if (!groupedItems[item.contextId || 'unknown']) {
        groupedItems[item.contextId || 'unknown'] = [];
      }
      groupedItems[item.contextId || 'unknown'].push(item);
    });
    
    // 컨텍스트별로 표시
    for (const [contextId, ctxItems] of Object.entries(groupedItems)) {
      const context = vaultService.getContextById(contextId);
      
      if (context) {
        content += `### ${context.name} (${getContextTypeKorean(context.type)})\n\n`;
        
        ctxItems.forEach((item: any) => {
          content += `- **${item.name}** (ID: \`${item.id}\`)`;
          if (item.description) {
            content += ` - ${item.description}`;
          }
          content += '\n';
          
          if (item.tags && item.tags.length > 0) {
            content += `  - 태그: ${item.tags.join(', ')}\n`;
          }
          
          // 내용 일부 표시 (최대 100자)
          const previewContent = item.content.length > 100 
            ? item.content.substring(0, 100) + '...' 
            : item.content;
          content += `  - 내용 미리보기: ${previewContent.replace(/\n/g, ' ')}\n\n`;
        });
      }
    }
    
    content += '자세히 보려면 `/vault show [아이템ID]` 명령어를 사용하세요.';
    
    await vscode.commands.executeCommand('ape.sendLlmResponse', {
      role: 'assistant',
      content
    });
  } catch (error) {
    console.error('아이템 검색 오류:', error);
    vscode.window.showErrorMessage('아이템을 검색하는 중 오류가 발생했습니다');
  }
}

/**
 * 컨텍스트 유형의 한글 이름 가져오기
 */
function getContextTypeKorean(type: VaultContextType): string {
  switch (type) {
    case VaultContextType.System: return '시스템';
    case VaultContextType.Project: return '프로젝트';
    case VaultContextType.Personal: return '개인';
    case VaultContextType.Shared: return '공유';
    case VaultContextType.Template: return '템플릿';
    default: return String(type);
  }
}

/**
 * 날짜 포맷팅
 */
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
}