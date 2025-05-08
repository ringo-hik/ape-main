/**
 * 채팅 뷰 프로바이더 팩토리
 * 설정에 따라 적절한 채팅 인터페이스를 선택하는 팩토리 모듈
 */

import * as vscode from 'vscode';
import { ChatViewProvider } from './chatViewProvider';
import { MainChatViewProvider } from './mainChatViewProvider';
import { LLMService } from '../core/llm/llmService';
import { MemoryService } from '../core/memory/memoryService';
import { CommandManager } from '../core/commands/commandManager';
import { ModelManager } from '../core/llm/modelManager';

/**
 * 채팅 뷰 프로바이더 타입
 */
export type ViewProviderType = 'default' | 'main';

/**
 * 채팅 뷰 인터페이스 프로바이더 팩토리
 * 다양한 UI 스타일을 선택할 수 있는 공장 패턴 구현
 */
export class ChatViewProviderFactory {
  /**
   * 설정에 따라 적절한 채팅 뷰 프로바이더를 생성
   */
  static createProvider(
    context: vscode.ExtensionContext,
    llmService: LLMService,
    memoryService: MemoryService,
    commandManager: CommandManager | null,
    modelManager?: ModelManager
  ): vscode.WebviewViewProvider {
    // 현재 설정에서 UI 테마 가져오기
    const uiTheme = vscode.workspace.getConfiguration('ape').get<string>('ui.theme', 'main');
    
    // 설정에 따라 적절한 프로바이더 생성
    switch (uiTheme) {        
      case 'main':
      default:
        console.log('기본 채팅 인터페이스를 사용합니다.');
        return new MainChatViewProvider(
          context,
          llmService,
          memoryService,
          commandManager as CommandManager, // null일 수도 있지만 나중에 설정됨
          modelManager
        ) as unknown as ChatViewProvider;
    }
  }
  
  /**
   * 현재 설정된 뷰 프로바이더 타입 가져오기
   */
  static getCurrentViewType(): ViewProviderType {
    const uiTheme = vscode.workspace.getConfiguration('ape').get<string>('ui.theme', 'main');
    return uiTheme === 'default' ? 'default' : 'main';
  }
  
  /**
   * 사용자가 UI 스타일을 변경할 수 있는 퀵픽 대화상자 표시
   */
  static async showStyleSelector(): Promise<void> {
    const currentStyle = ChatViewProviderFactory.getCurrentViewType();
    
    const styles = [
      {
        label: '메인 스타일',
        description: '기본 채팅 인터페이스',
        value: 'main',
        picked: currentStyle === 'main'
      },
      {
        label: '대체 스타일',
        description: '대체 VSCode 스타일 인터페이스',
        value: 'default',
        picked: currentStyle === 'default'
      }
    ];
    
    const selected = await vscode.window.showQuickPick(styles, {
      placeHolder: '채팅 인터페이스 스타일을 선택하세요',
      title: 'APE 채팅 스타일 선택'
    });
    
    if (selected && selected.value !== currentStyle) {
      // 설정 업데이트
      await vscode.workspace.getConfiguration('ape').update('ui.theme', selected.value, vscode.ConfigurationTarget.Global);
      
      // 재시작 제안
      const restart = await vscode.window.showInformationMessage(
        `채팅 인터페이스가 ${selected.label}로 변경되었습니다. 변경사항을 적용하려면 VS Code를 재시작해야 합니다.`,
        '재시작',
        '나중에'
      );
      
      if (restart === '재시작') {
        vscode.commands.executeCommand('workbench.action.reloadWindow');
      }
    }
  }
}