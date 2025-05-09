/**
 * Rules 슬래시 커맨드 정의
 */

import * as vscode from 'vscode';
import { SlashCommand } from './slashCommand';
import { RulesService } from '../services/rulesService';

/**
 * Rules 슬래시 커맨드 목록 생성
 */
export function createRulesCommands(rulesService: RulesService): SlashCommand[] {
  if (!rulesService) {
    return [];
  }
  
  const commands: SlashCommand[] = [];
  
  // rules 명령어: Rules 관리 기능 제공
  commands.push({
    name: 'rules',
    aliases: ['rule', 'ape-rules', '룰', '규칙', '규칙관리'],
    description: 'APE Rules를 관리합니다 (목록, 활성화, 비활성화, 생성, 삭제)',
    examples: [
      '/rules list', 
      '/rules active', 
      '/rules inactive', 
      '/rules activate 규칙이름', 
      '/rules deactivate 규칙이름',
      '/rules create 규칙이름',
      '/rules delete 규칙이름',
      '/rules open 규칙이름',
      '/rules info'
    ],
    category: 'advanced',
    priority: 15,
    execute: async (context) => {
      const subCommand = context.args[0]?.toLowerCase();
      
      if (!subCommand || subCommand === 'list' || subCommand === '목록') {
        // Rules 목록 표시
        await listRules(rulesService);
      } else if (subCommand === 'active' || subCommand === '활성' || subCommand === '활성화목록') {
        // 활성화된 Rules 목록 표시
        await listActiveRules(rulesService);
      } else if (subCommand === 'inactive' || subCommand === '비활성' || subCommand === '비활성화목록') {
        // 비활성화된 Rules 목록 표시
        await listInactiveRules(rulesService);
      } else if (subCommand === 'activate' || subCommand === '활성화') {
        // Rule 활성화
        const ruleName = context.args.slice(1).join(' ');
        if (ruleName) {
          await activateRule(rulesService, ruleName);
        } else {
          vscode.window.showErrorMessage('활성화할 Rule 이름을 지정해주세요');
        }
      } else if (subCommand === 'deactivate' || subCommand === '비활성화') {
        // Rule 비활성화
        const ruleName = context.args.slice(1).join(' ');
        if (ruleName) {
          await deactivateRule(rulesService, ruleName);
        } else {
          vscode.window.showErrorMessage('비활성화할 Rule 이름을 지정해주세요');
        }
      } else if (subCommand === 'create' || subCommand === '생성' || subCommand === '만들기') {
        // Rule 생성
        const ruleName = context.args.slice(1).join(' ');
        if (ruleName) {
          await createRule(rulesService, ruleName);
        } else {
          vscode.window.showErrorMessage('새 Rule 이름을 지정해주세요');
        }
      } else if (subCommand === 'delete' || subCommand === '삭제') {
        // Rule 삭제
        const ruleName = context.args.slice(1).join(' ');
        if (ruleName) {
          await deleteRule(rulesService, ruleName);
        } else {
          vscode.window.showErrorMessage('삭제할 Rule 이름을 지정해주세요');
        }
      } else if (subCommand === 'open' || subCommand === '열기') {
        // Rule 파일 열기
        const ruleName = context.args.slice(1).join(' ');
        if (ruleName) {
          await openRuleFile(rulesService, ruleName);
        } else {
          vscode.window.showErrorMessage('열 Rule 이름을 지정해주세요');
        }
      } else if (subCommand === 'info' || subCommand === '정보') {
        // Rules 정보 표시
        await showRulesInfo(rulesService);
      } else {
        vscode.window.showErrorMessage(`알 수 없는 Rules 하위 명령어입니다: ${subCommand}`);
      }
    },
    provideCompletions: (partialArgs: string) => {
      const subCommands = [
        'list', 'active', 'inactive', 'activate', 'deactivate', 'create', 'delete', 'open', 'info',
        '목록', '활성', '비활성', '활성화', '비활성화', '생성', '만들기', '삭제', '열기', '정보'
      ];
      
      const parts = partialArgs.split(' ');
      
      // 첫 번째 인자 자동완성 (하위 명령어)
      if (parts.length <= 1) {
        return subCommands.filter(cmd => 
          cmd.toLowerCase().startsWith(parts[0]?.toLowerCase() || '')
        );
      }
      
      // 두 번째 인자 자동완성 (Rule 이름)
      if (parts.length === 2 && ['activate', 'deactivate', 'delete', 'open', '활성화', '비활성화', '삭제', '열기'].includes(parts[0])) {
        // 현재는 비어있는 배열 반환
        // 모든 활성화된/비활성화된 Rule 목록을 가져오는 방법은 아직 구현되지 않음
        return [];
      }
      
      return [];
    }
  });
  
  
  return commands;
}

/**
 * Rules 목록 표시
 */
async function listRules(rulesService: RulesService): Promise<void> {
  try {
    const rules = rulesService.getAllRules();
    
    if (rules.length === 0) {
      await vscode.commands.executeCommand('ape.sendLlmResponse', {
        role: 'assistant',
        content: '등록된 Rule이 없습니다. `/rules create 이름`으로 새 Rule을 생성하세요.'
      });
      return;
    }
    
    let content = '## APE Rules 목록\n\n';
    
    // 활성화된 Rules 먼저 표시
    const activeRules = rules.filter(rule => rule.status === 'active');
    const inactiveRules = rules.filter(rule => rule.status === 'inactive');
    
    if (activeRules.length > 0) {
      content += '### 🟢 활성화된 Rules\n\n';
      activeRules.forEach(rule => {
        content += `- **${rule.name}** - \`${rule.id}.md\`\n`;
      });
      content += '\n';
    }
    
    if (inactiveRules.length > 0) {
      content += '### ⚪ 비활성화된 Rules\n\n';
      inactiveRules.forEach(rule => {
        content += `- **${rule.name}** - \`${rule.id}.md\`\n`;
      });
      content += '\n';
    }
    
    content += '\n**Rules 관리 명령어**:\n';
    content += '- `/rules activate 규칙이름` - Rule 활성화\n';
    content += '- `/rules deactivate 규칙이름` - Rule 비활성화\n';
    content += '- `/rules create 규칙이름` - 새 Rule 생성\n';
    content += '- `/rules delete 규칙이름` - Rule 삭제\n';
    content += '- `/rules open 규칙이름` - Rule 파일 열기\n';
    
    await vscode.commands.executeCommand('ape.sendLlmResponse', {
      role: 'assistant',
      content
    });
  } catch (error) {
    vscode.window.showErrorMessage(`Rules 목록 조회 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 활성화된 Rules 목록 표시
 */
async function listActiveRules(rulesService: RulesService): Promise<void> {
  try {
    const activeRules = rulesService.getActiveRules();
    
    if (activeRules.length === 0) {
      await vscode.commands.executeCommand('ape.sendLlmResponse', {
        role: 'assistant',
        content: '현재 활성화된 Rule이 없습니다. `/rules activate 이름`으로 Rule을 활성화하세요.'
      });
      return;
    }
    
    let content = '## 🟢 활성화된 APE Rules\n\n';
    
    activeRules.forEach(rule => {
      // 첫 100자 내용만 표시
      const previewContent = rule.content.length > 100 
        ? rule.content.substring(0, 100) + '...' 
        : rule.content;
      
      content += `### ${rule.name}\n\n`;
      content += `- **ID**: \`${rule.id}\`\n`;
      content += `- **파일**: \`${rule.filePath.split('/').pop()}\`\n`;
      content += `- **내용 미리보기**:\n\n\`\`\`\n${previewContent}\n\`\`\`\n\n`;
    });
    
    await vscode.commands.executeCommand('ape.sendLlmResponse', {
      role: 'assistant',
      content
    });
  } catch (error) {
    vscode.window.showErrorMessage(`활성화된 Rules 목록 조회 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 비활성화된 Rules 목록 표시
 */
async function listInactiveRules(rulesService: RulesService): Promise<void> {
  try {
    const allRules = rulesService.getAllRules();
    const activeRules = rulesService.getActiveRules();
    
    const inactiveRules = allRules.filter(rule => 
      !activeRules.some(activeRule => activeRule.id === rule.id)
    );
    
    if (inactiveRules.length === 0) {
      await vscode.commands.executeCommand('ape.sendLlmResponse', {
        role: 'assistant',
        content: '현재 비활성화된 Rule이 없습니다. 모든 Rules가 활성화 상태입니다.'
      });
      return;
    }
    
    let content = '## ⚪ 비활성화된 APE Rules\n\n';
    
    inactiveRules.forEach(rule => {
      // 첫 100자 내용만 표시
      const previewContent = rule.content.length > 100 
        ? rule.content.substring(0, 100) + '...' 
        : rule.content;
      
      content += `### ${rule.name}\n\n`;
      content += `- **ID**: \`${rule.id}\`\n`;
      content += `- **파일**: \`${rule.filePath.split('/').pop()}\`\n`;
      content += `- **내용 미리보기**:\n\n\`\`\`\n${previewContent}\n\`\`\`\n\n`;
    });
    
    await vscode.commands.executeCommand('ape.sendLlmResponse', {
      role: 'assistant',
      content
    });
  } catch (error) {
    vscode.window.showErrorMessage(`비활성화된 Rules 목록 조회 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Rule 활성화
 */
async function activateRule(rulesService: RulesService, ruleName: string): Promise<void> {
  try {
    const rules = rulesService.getAllRules();
    
    // 이름 또는 ID로 Rule 찾기
    const rule = rules.find(r => 
      r.name.toLowerCase() === ruleName.toLowerCase() || 
      r.id.toLowerCase() === ruleName.toLowerCase()
    );
    
    if (!rule) {
      await vscode.commands.executeCommand('ape.sendLlmResponse', {
        role: 'assistant',
        content: `'${ruleName}' 이름 또는 ID를 가진 Rule을 찾을 수 없습니다. '/rules list'로 사용 가능한 Rules를 확인하세요.`
      });
      return;
    }
    
    // 이미 활성화된 경우
    if (rule.status === 'active') {
      await vscode.commands.executeCommand('ape.sendLlmResponse', {
        role: 'assistant',
        content: `'${rule.name}' Rule은 이미 활성화되어 있습니다.`
      });
      return;
    }
    
    // Rule 활성화
    await rulesService.activateRule(rule.id);
    
    await vscode.commands.executeCommand('ape.sendLlmResponse', {
      role: 'assistant',
      content: `'${rule.name}' Rule이 활성화되었습니다. 이제 LLM 시스템 프롬프트에 적용됩니다.`
    });
  } catch (error) {
    vscode.window.showErrorMessage(`Rule 활성화 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Rule 비활성화
 */
async function deactivateRule(rulesService: RulesService, ruleName: string): Promise<void> {
  try {
    const rules = rulesService.getAllRules();
    
    // 이름 또는 ID로 Rule 찾기
    const rule = rules.find(r => 
      r.name.toLowerCase() === ruleName.toLowerCase() || 
      r.id.toLowerCase() === ruleName.toLowerCase()
    );
    
    if (!rule) {
      await vscode.commands.executeCommand('ape.sendLlmResponse', {
        role: 'assistant',
        content: `'${ruleName}' 이름 또는 ID를 가진 Rule을 찾을 수 없습니다. '/rules list'로 사용 가능한 Rules를 확인하세요.`
      });
      return;
    }
    
    // 이미 비활성화된 경우
    if (rule.status === 'inactive') {
      await vscode.commands.executeCommand('ape.sendLlmResponse', {
        role: 'assistant',
        content: `'${rule.name}' Rule은 이미 비활성화되어 있습니다.`
      });
      return;
    }
    
    // Rule 비활성화
    await rulesService.deactivateRule(rule.id);
    
    await vscode.commands.executeCommand('ape.sendLlmResponse', {
      role: 'assistant',
      content: `'${rule.name}' Rule이 비활성화되었습니다. 더 이상 LLM 시스템 프롬프트에 적용되지 않습니다.`
    });
  } catch (error) {
    vscode.window.showErrorMessage(`Rule 비활성화 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 새 Rule 생성
 */
async function createRule(rulesService: RulesService, ruleName: string): Promise<void> {
  try {
    // Rule 내용 템플릿
    const ruleContent = `# ${ruleName}\n\n여기에 LLM에 적용할 규칙 내용을 작성하세요.\n\n규칙은 마크다운 형식으로 작성됩니다.\n\n## 예시\n\n1. 항상 코드에 주석을 추가해주세요.\n2. 응답은 간결하게 유지해주세요.\n3. 에러 처리를 항상 포함해주세요.`;
    
    // Rule 생성
    const rule = await rulesService.createRule(ruleName, ruleContent, false);
    
    // Rule 파일 열기
    await rulesService.openRuleFile(rule.id);
    
    await vscode.commands.executeCommand('ape.sendLlmResponse', {
      role: 'assistant',
      content: `'${rule.name}' Rule이 생성되었습니다. 파일을 수정한 후 저장하고, '/rules activate ${rule.name}'로 활성화할 수 있습니다.`
    });
  } catch (error) {
    vscode.window.showErrorMessage(`Rule 생성 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Rule 삭제
 */
async function deleteRule(rulesService: RulesService, ruleName: string): Promise<void> {
  try {
    const rules = rulesService.getAllRules();
    
    // 이름 또는 ID로 Rule 찾기
    const rule = rules.find(r => 
      r.name.toLowerCase() === ruleName.toLowerCase() || 
      r.id.toLowerCase() === ruleName.toLowerCase()
    );
    
    if (!rule) {
      await vscode.commands.executeCommand('ape.sendLlmResponse', {
        role: 'assistant',
        content: `'${ruleName}' 이름 또는 ID를 가진 Rule을 찾을 수 없습니다. '/rules list'로 사용 가능한 Rules를 확인하세요.`
      });
      return;
    }
    
    // 삭제 확인 (프롬프트 대화상자 사용)
    const confirmation = await vscode.window.showWarningMessage(
      `'${rule.name}' Rule을 삭제하시겠습니까?`,
      { modal: true },
      '삭제',
      '취소'
    );
    
    if (confirmation !== '삭제') {
      await vscode.commands.executeCommand('ape.sendLlmResponse', {
        role: 'assistant',
        content: `'${rule.name}' Rule 삭제가 취소되었습니다.`
      });
      return;
    }
    
    // Rule 삭제
    await rulesService.deleteRule(rule.id);
    
    await vscode.commands.executeCommand('ape.sendLlmResponse', {
      role: 'assistant',
      content: `'${rule.name}' Rule이 삭제되었습니다.`
    });
  } catch (error) {
    vscode.window.showErrorMessage(`Rule 삭제 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Rule 파일 열기
 */
async function openRuleFile(rulesService: RulesService, ruleName: string): Promise<void> {
  try {
    const rules = rulesService.getAllRules();
    
    // 이름 또는 ID로 Rule 찾기
    const rule = rules.find(r => 
      r.name.toLowerCase() === ruleName.toLowerCase() || 
      r.id.toLowerCase() === ruleName.toLowerCase()
    );
    
    if (!rule) {
      await vscode.commands.executeCommand('ape.sendLlmResponse', {
        role: 'assistant',
        content: `'${ruleName}' 이름 또는 ID를 가진 Rule을 찾을 수 없습니다. '/rules list'로 사용 가능한 Rules를 확인하세요.`
      });
      return;
    }
    
    // Rule 파일 열기
    await rulesService.openRuleFile(rule.id);
    
    await vscode.commands.executeCommand('ape.sendLlmResponse', {
      role: 'assistant',
      content: `'${rule.name}' Rule 파일이 열렸습니다.`
    });
  } catch (error) {
    vscode.window.showErrorMessage(`Rule 파일 열기 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Rules 정보 표시
 */
async function showRulesInfo(rulesService: RulesService): Promise<void> {
  try {
    const rules = rulesService.getAllRules();
    const activeRules = rulesService.getActiveRules();
    
    let content = '## APE Rules 정보\n\n';
    
    content += `- **총 Rules 수**: ${rules.length}개\n`;
    content += `- **활성화된 Rules**: ${activeRules.length}개\n`;
    content += `- **비활성화된 Rules**: ${rules.length - activeRules.length}개\n\n`;
    
    content += '### Rules 시스템에 대하여\n\n';
    content += 'APE Rules는 LLM에 적용되는 규칙을 관리하는 시스템입니다. 각 Rule은 마크다운 형식의 파일로 저장되며, 활성화된 Rules는 LLM 시스템 프롬프트에 자동으로 추가됩니다.\n\n';
    
    content += '### 주요 기능\n\n';
    content += '- **목록 보기**: `/rules list` - 모든 Rules 목록 표시\n';
    content += '- **활성화된 Rules**: `/rules active` - 활성화된 Rules 목록 표시\n';
    content += '- **비활성화된 Rules**: `/rules inactive` - 비활성화된 Rules 목록 표시\n';
    content += '- **Rule 활성화**: `/rules activate 이름` - 지정한 Rule 활성화\n';
    content += '- **Rule 비활성화**: `/rules deactivate 이름` - 지정한 Rule 비활성화\n';
    content += '- **Rule 생성**: `/rules create 이름` - 새 Rule 생성\n';
    content += '- **Rule 삭제**: `/rules delete 이름` - 지정한 Rule 삭제\n';
    content += '- **Rule 파일 열기**: `/rules open 이름` - 지정한 Rule 파일 열기\n';
    
    await vscode.commands.executeCommand('ape.sendLlmResponse', {
      role: 'assistant',
      content
    });
  } catch (error) {
    vscode.window.showErrorMessage(`Rules 정보 표시 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`);
  }
}