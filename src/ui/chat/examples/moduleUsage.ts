/**
 * 모듈화된 ChatViewProvider 컴포넌트 사용 예제
 * 
 * 이 파일은 새로 모듈화된 컴포넌트를 어떻게 활용할 수 있는지 보여주는 예제입니다.
 */

import * as vscode from 'vscode';
import { Message, MessageRole } from '../../../types/chat';
import { LLMService } from '../../../core/llm/llmService';
import { MemoryService } from '../../../core/memory/memoryService';
import { CommandManager } from '../../../core/commands/commandManager';
import { ModelManager } from '../../../core/llm/modelManager';

// 새로운 모듈화된 컴포넌트 가져오기
import { ChatViewFormatter } from '../chatViewFormatter';
import { ChatViewCommandHandler } from '../chatViewCommandHandler';
import { ChatViewRenderer } from '../chatViewRenderer';
import { ChatViewMessageManager } from '../chatViewMessageManager';
import { ChatViewProviderIntegration } from '../chatViewProviderIntegration';

/**
 * 컴포넌트 사용 예제 클래스
 */
export class ModuleUsageExample {
  // 인스턴스 생성
  private formatter: ChatViewFormatter;
  private commandHandler: ChatViewCommandHandler;
  private renderer: ChatViewRenderer;
  private messageManager: ChatViewMessageManager;
  private integration: ChatViewProviderIntegration;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly llmService: LLMService,
    private readonly memoryService: MemoryService,
    private readonly commandManager: CommandManager,
    private readonly modelManager?: ModelManager
  ) {
    // 개별 컴포넌트 사용 (필요한 경우)
    this.formatter = new ChatViewFormatter();
    this.commandHandler = new ChatViewCommandHandler(commandManager);
    this.renderer = new ChatViewRenderer();
    
    this.messageManager = new ChatViewMessageManager(
      context,
      memoryService,
      llmService
    );
    
    // 통합 인스턴스는 개별 컴포넌트를 내부적으로 관리
    this.integration = new ChatViewProviderIntegration(
      context,
      llmService,
      memoryService,
      commandManager,
      modelManager
    );
  }

  /**
   * 각 컴포넌트의 독립적 사용 예제
   */
  public async demonstrateIndividualComponents() {
    // 1. 포맷터 사용 예제
    const markdownContent = "# 제목\n\n코드 예제:\n```javascript\nfunction hello() {\n  console.log('Hello world');\n}\n```";
    const formattedHtml = ChatViewFormatter.formatMessageContent(markdownContent);
    console.log('Formatted HTML:', formattedHtml);
    
    // 2. 명령어 핸들러 사용 예제
    const suggestions = this.commandHandler.getCommandSuggestions('/he');
    console.log('Command suggestions:', suggestions);
    
    // 3. 메시지 관리자 사용 예제
    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: MessageRole.User,
      content: '안녕하세요, 도움이 필요합니다.',
      timestamp: new Date()
    };
    
    this.messageManager.addMessage(userMessage);
    await this.messageManager.saveMessages();
    
    const messages = this.messageManager.getMessages();
    console.log('Current messages:', messages.length);
    
    return {
      formattedHtml,
      suggestions,
      messages
    };
  }

  /**
   * 통합 인스턴스 사용 예제 (ChatViewProvider 대체용)
   */
  public async demonstrateIntegration(webviewView?: vscode.WebviewView) {
    if (webviewView) {
      // 웹뷰가 있는 경우 초기화
      await this.integration.initializeWebview(webviewView);
      
      // 모델 표시기 업데이트
      this.integration.updateModelIndicator();
      
      // 명령어 제안 업데이트
      this.integration.updateCommandSuggestions('/');
      
      // 메시지 전송
      await this.integration.sendMessage('안녕하세요, 도움이 필요합니다.');
    }
    
    return 'Integration demonstration complete';
  }
  
  /**
   * UI 외부에서 모듈 활용 예제 (예: 다른 VSCode 컴포넌트에서 사용)
   */
  public formatCodeForDisplay(code: string, language: string): string {
    // ChatViewFormatter를 활용한 코드 포맷팅
    const formattedCode = ChatViewFormatter.formatMessageContent(
      '```' + language + '\n' + code + '\n```'
    );
    return formattedCode;
  }
  
  /**
   * 명령어 실행 예제
   */
  public async executeCommand(command: string): Promise<void> {
    // 명령어 처리기를 통한 명령어 실행
    const messages = await this.commandHandler.executeCommand(command);
    console.log(`Command "${command}" executed with ${messages.length} result messages`);
  }
}

/**
 * 실제 확장 코드에서의 활용 예시
 */
export function registerChatProvider(
  context: vscode.ExtensionContext,
  llmService: LLMService,
  memoryService: MemoryService,
  commandManager: CommandManager,
  modelManager: ModelManager
): vscode.Disposable {
  // 리팩토링 예시: 통합 인스턴스를 사용하여 ChatViewProvider 대체
  const chatIntegration = new ChatViewProviderIntegration(
    context,
    llmService,
    memoryService,
    commandManager,
    modelManager
  );
  
  // VSCode 웹뷰 제공자 등록
  return vscode.window.registerWebviewViewProvider(
    'apeChat',
    {
      resolveWebviewView: async (webviewView, webviewContext, token) => {
        // 통합 인스턴스를 사용하여 웹뷰 초기화
        await chatIntegration.initializeWebview(webviewView);
      }
    },
    {
      webviewOptions: {
        retainContextWhenHidden: true
      }
    }
  );
}