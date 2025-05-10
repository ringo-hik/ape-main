/**
 * 채팅 뷰 프로바이더 통합 모듈
 *
 * 이 모듈은 분리된 각 컴포넌트를 통합하여 ChatViewProvider를 점진적으로 리팩토링하기 위한
 * 통합 계층을 제공합니다.
 */

import * as vscode from 'vscode';
import { Message, MessageRole } from '../../types/chat';
import { LLMService } from '../../core/llm/llmService';
import { MemoryService } from '../../core/memory/memoryService';
import { CommandManager } from '../../core/commands/commandManager';
import { ModelManager } from '../../core/llm/modelManager';
import { SmartPromptingService, SmartPromptingState } from '../../core/services/smartPromptingService';

// 새로운 모듈 가져오기
import { ChatViewCommandHandler } from './chatViewCommandHandler';
import { ChatViewFormatter } from './chatViewFormatter';
import { ChatViewMessageManager } from './chatViewMessageManager';
import { ChatViewRenderer } from './chatViewRenderer';
import { ChatViewStyleManager } from './chatViewStyleManager';
import { WelcomeViewProvider } from '../welcomeView';

/**
 * 채팅 뷰 프로바이더 통합 클래스
 * 
 * 점진적 리팩토링을 위한 초기 통합 클래스입니다.
 * 새로운 모듈화된 구조를 기존 ChatViewProvider와 통합합니다.
 */
export class ChatViewProviderIntegration {
  // 새로 분리된 모듈 인스턴스
  private _messageManager: ChatViewMessageManager;
  private _commandHandler: ChatViewCommandHandler;
  private _renderer: ChatViewRenderer;
  private _styleManager: ChatViewStyleManager;

  // 기존 메모리 참조용 프로퍼티
  private _view?: vscode.WebviewView;
  private _isStreaming = false;
  private _currentStreamMessageId: string | null = null;
  private _streamUpdateTimeout: NodeJS.Timeout | null = null;
  private _modelChangeListener?: vscode.Disposable;
  private _smartPromptingService?: SmartPromptingService;
  private _styleChangeListener?: vscode.Disposable;

  // 명령어 제안 이벤트 - 기존 ChatViewProvider와 호환성 유지
  private readonly _onDidSuggestCommands = new vscode.EventEmitter<any[]>();
  public readonly onDidSuggestCommands = this._onDidSuggestCommands.event;

  /**
   * ChatViewProviderIntegration 생성자
   */
  constructor(
    private readonly _context: vscode.ExtensionContext,
    private readonly _llmService: LLMService,
    private readonly _memoryService: MemoryService,
    private readonly _commandManager: CommandManager,
    private readonly _modelManager?: ModelManager
  ) {
    // 스마트 프롬프팅 서비스 생성
    this._smartPromptingService = new SmartPromptingService(_context, _llmService);

    // 새 모듈 초기화
    this._initializeModules();

    // 스타일 변경 리스너 등록
    this._styleChangeListener = this._styleManager.onDidChangeStyle(style => {
      if (this._view) {
        this._renderer.updateSmartPromptingUI(true, style.id, style.name);
      }
    });

    // 컨텍스트 서브스크립션에 리스너 등록
    this._context.subscriptions.push(this._styleChangeListener);
  }

  /**
   * 새로운 모듈 초기화
   */
  private _initializeModules(): void {
    // 메시지 관리자 초기화
    this._messageManager = new ChatViewMessageManager(
      this._context,
      this._memoryService,
      this._llmService,
      this._smartPromptingService
    );

    // 명령어 핸들러 초기화
    this._commandHandler = new ChatViewCommandHandler(this._commandManager);

    // 렌더러 초기화
    this._renderer = new ChatViewRenderer();

    // 스타일 관리자 초기화
    this._styleManager = new ChatViewStyleManager(
      this._context,
      this._smartPromptingService!
    );

    // 이벤트 리스너 연결 - 명령어 제안 이벤트 전달
    this._commandHandler.onDidSuggestCommands(suggestions => {
      this._onDidSuggestCommands.fire(suggestions);
    });
  }

  /**
   * 웹뷰가 초기화될 때 호출되는 메서드
   * @param webviewView VSCode 웹뷰
   */
  public async initializeWebview(webviewView: vscode.WebviewView): Promise<void> {
    this._view = webviewView;

    // 웹뷰를 수정하여 스타일 모달 추가
    const styleModalHtml = this._styleManager.generateStyleModalHtml();

    // 렌더러 초기화 (스타일 모달 HTML 포함)
    this._renderer.initialize(webviewView.webview, undefined, styleModalHtml);

    // 웹뷰 메시지 핸들러 등록
    webviewView.webview.onDidReceiveMessage(this.handleWebviewMessage.bind(this));

    // 메시지 로드
    await this._loadMessages();

    // 현재 스타일 상태 UI 업데이트
    const currentStyle = this._styleManager.getActiveStyle();
    this._renderer.updateSmartPromptingUI(
      this._smartPromptingService!.isEnabled(),
      currentStyle.id,
      currentStyle.name
    );
  }

  /**
   * 메시지 로드 및 초기화
   */
  private async _loadMessages(): Promise<void> {
    const hasMessages = await this._messageManager.loadMessages();
    
    if (!hasMessages) {
      // 웰컴 메시지 생성
      try {
        // 웰컴 HTML 메시지 생성
        let welcomeHTML = '';
        try {
          welcomeHTML = WelcomeViewProvider.getWelcomeMessageHTML();
        } catch (welcomeError) {
          console.error('Load messages: Error getting welcome HTML from provider:', welcomeError);
          welcomeHTML = '<div class="welcome-container minimal"><h1>Welcome to APE</h1></div>';
        }

        // 웰컴 HTML이 비어있는 경우 기본값 사용
        if (!welcomeHTML || welcomeHTML.trim() === '') {
          welcomeHTML = '<div class="welcome-container minimal"><h1>Welcome to APE</h1></div>';
        }

        // 웰컴 UI 메시지 생성
        const welcomeId = `welcome_ui_${Date.now()}`;
        const welcomeMessage: Message = {
          id: welcomeId,
          role: MessageRole.System,
          content: welcomeHTML,
          timestamp: new Date(),
          metadata: {
            uiOnly: true,
            type: 'welcome'
          }
        };

        // 인사말 생성
        const greeting = this._getRandomGreeting();
        const assistantMessage = this._renderer.createWelcomeMessage(greeting);

        // 메시지 추가
        this._messageManager.addMessage(welcomeMessage);
        this._messageManager.addMessage(assistantMessage);
      } catch (error) {
        console.error('웰컴 메시지 생성 중 오류:', error);
        const errorMessage: Message = {
          id: `error_${Date.now()}`,
          role: MessageRole.System,
          content: 'Error loading welcome screen.',
          timestamp: new Date()
        };
        this._messageManager.addMessage(errorMessage);
      }
    }

    // 렌더링
    this._updateChatView();
  }

  /**
   * 채팅 뷰 업데이트
   */
  private _updateChatView(): void {
    if (this._view) {
      const messages = this._messageManager.getMessages();
      const isStreaming = this._messageManager.isStreaming();
      this._renderer.renderMessages(messages, isStreaming);
    }
  }

  /**
   * 사용자 메시지 전송
   * @param content 메시지 내용
   * @param metadata 추가 메타데이터
   */
  public async sendMessage(content: string, metadata?: any): Promise<void> {
    if (!this._view) {
      vscode.window.showErrorMessage('APE Chat view is not available');
      return;
    }

    if (this._messageManager.isStreaming()) {
      vscode.window.showInformationMessage('Please wait for the current response to complete');
      return;
    }

    // 슬래시 명령어 처리
    if (content.trim().startsWith('/')) {
      const commandMessages = await this._commandHandler.executeCommand(content);

      // 명령어 실행 결과 메시지 추가
      for (const message of commandMessages) {
        this._messageManager.addMessage(message);
      }

      // 메시지 저장 및 뷰 업데이트
      await this._messageManager.saveMessages();
      this._updateChatView();
      return;
    }

    try {
      // 스마트 프롬프팅/스타일 적용
      let processedContent = content;
      if (this._smartPromptingService!.isEnabled()) {
        processedContent = this._styleManager.processMessage(content);
      }

      // LLM에 메시지 전송
      await this._messageManager.sendMessageToLlm(processedContent, () => {
        this._updateChatView();
      });
    } catch (error) {
      vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 채팅 지우기
   */
  public clearChat(): void {
    const greeting = this._getRandomGreeting();
    this._messageManager.clearMessages(greeting);
    this._updateChatView();
  }

  /**
   * 스트림 취소
   */
  public cancelStream(): void {
    if (this._messageManager.isStreaming()) {
      this._messageManager.cancelStream('\n\n*생성이 취소되었습니다.*', () => {
        this._updateChatView();
      });
    }
  }

  /**
   * 명령어 제안 업데이트
   * @param input 사용자 입력
   */
  public updateCommandSuggestions(input: string): void {
    if (input.startsWith('/')) {
      const suggestions = this._commandHandler.getCommandSuggestions(input);
      if (this._view) {
        this._renderer.renderCommandSuggestions(suggestions);
      }
    } else if (this._view) {
      this._renderer.renderCommandSuggestions([]);
    }
  }

  /**
   * 모델 표시기 업데이트
   */
  public updateModelIndicator(): void {
    if (!this._view) {
      return;
    }
    
    try {
      // 모델 매니저 또는 LLM 서비스에서 현재 모델 정보 가져오기
      let currentModel, displayName;
      
      if (this._modelManager) {
        currentModel = this._modelManager.getActiveModel();
        displayName = this._modelManager.getModelDisplayName(currentModel);
      } else {
        currentModel = this._llmService.getActiveModel();
        displayName = this._llmService.getModelDisplayName(currentModel);
      }
      
      // 렌더러를 통해 모델 정보 업데이트
      this._renderer.updateModelIndicator(displayName);
    } catch (error) {
      console.error('모델 인디케이터 업데이트 중 오류:', error);
    }
  }

  /**
   * 응답 스타일 설정
   * @param styleId 스타일 ID
   */
  public setResponseStyle(styleId: string): void {
    // 스타일 매니저에 스타일 설정
    this._styleManager.setStyle(styleId);
  }

  /**
   * 스마트 프롬프팅 토글
   */
  public toggleSmartPrompting(): void {
    const isEnabled = this._styleManager.toggleStyle();

    // 현재 스타일 정보 가져오기
    const currentStyle = this._styleManager.getActiveStyle();

    // UI 업데이트
    this._renderer.updateSmartPromptingUI(isEnabled, currentStyle.id, currentStyle.name);
  }

  /**
   * 웹뷰 메시지 핸들러
   * @param message 웹뷰에서 받은 메시지
   */
  public handleWebviewMessage(message: any): void {
    if (!message || !message.type) return;

    switch (message.type) {
      case 'sendMessage':
        this.sendMessage(message.content, message.metadata);
        break;

      case 'cancelStream':
        this.cancelStream();
        break;

      case 'clearChat':
        this.clearChat();
        break;

      case 'command':
        this.sendMessage(message.command);
        break;

      case 'insertCommand':
        this.insertTextToChat(message.command);
        break;

      case 'getEditorContent':
        // TODO: Editor content retrieval
        break;

      case 'inputChanged':
        this.updateCommandSuggestions(message.content);
        break;

      case 'showModelSelector':
        // TODO: Model selector
        break;

      case 'toggleSmartPrompting':
        this.toggleSmartPrompting();
        break;

      case 'setResponseStyle':
        this.setResponseStyle(message.style);
        break;

      case 'formatText':
        this.requestTextFormatting();
        break;

      case 'inputContent':
        this.processFormattedText(message.content);
        break;

      case 'openFile':
        if (message.fileName) {
          this.openAttachedFile(message.fileName);
        }
        break;

      case 'toggleMessageContext':
        if (message.messageId) {
          this.toggleMessageContext(message.messageId);
        }
        break;
    }
  }

  /**
   * 채팅창에 텍스트 삽입
   * @param text 삽입할 텍스트
   */
  public insertTextToChat(text: string): void {
    if (!this._view) {
      return;
    }
    
    this._renderer.insertTextToChatInput(text);
  }

  /**
   * 메시지 컨텍스트 포함/제외 토글
   * @param messageId 메시지 ID
   */
  public async toggleMessageContext(messageId: string): Promise<void> {
    const excludeFromContext = await this._messageManager.toggleMessageContext(messageId);
    
    if (this._view) {
      this._renderer.notifyMessageContextToggled(messageId, excludeFromContext);
    }
  }

  /**
   * 텍스트 포맷팅 요청
   */
  public requestTextFormatting(): void {
    if (!this._view) {
      return;
    }
    
    this._renderer.requestInputContent();
  }

  /**
   * 텍스트 포맷팅 처리
   * @param content 포맷할 텍스트
   */
  public processFormattedText(content: string): void {
    if (!this._view) {
      return;
    }
    
    try {
      // 간단한 텍스트 포맷팅 처리
      let formattedText = content;

      // 기본 포맷팅 규칙 적용
      // 1. 줄 시작 부분 공백 제거
      formattedText = formattedText.split('\n')
        .map(line => line.trimStart())
        .join('\n');

      // 2. 연속된 공백 제거
      formattedText = formattedText.replace(/\s{2,}/g, ' ');

      // 3. 마크다운 제목 앞뒤에 공백 추가
      formattedText = formattedText.replace(/^(#{1,6})([^\s#])/gm, '$1 $2');

      // 4. 리스트 항목 포맷팅
      formattedText = formattedText.replace(/^([*+-])([^\s])/gm, '$1 $2');
      formattedText = formattedText.replace(/^(\d+\.)([^\s])/gm, '$1 $2');

      // 포맷된 텍스트 전송
      this._renderer.sendFormattedText(formattedText);
    } catch (error) {
      console.error('텍스트 포맷 처리 중 오류 발생:', error);
      // 오류 시 원본 텍스트 반환
      this._renderer.sendFormattedText(content);
    }
  }

  /**
   * 첨부 파일 열기
   * @param fileName 파일 이름
   */
  public async openAttachedFile(fileName: string): Promise<void> {
    try {
      let targetFile: vscode.Uri | undefined;

      if (vscode.workspace.workspaceFolders?.length) {
        const workspaceFolder = vscode.workspace.workspaceFolders[0];

        const searchPattern = new vscode.RelativePattern(
          workspaceFolder,
          `**/${fileName}`
        );

        const files = await vscode.workspace.findFiles(searchPattern, null, 1);

        if (files.length > 0) {
          targetFile = files[0];
        }
      }

      if (targetFile) {
        const document = await vscode.workspace.openTextDocument(targetFile);
        await vscode.window.showTextDocument(document);
      } else {
        vscode.window.showErrorMessage(`File not found: ${fileName}`);
      }
    } catch (error) {
      console.error('Error opening file:', error);
      vscode.window.showErrorMessage(`Failed to open file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 외부에서 직접 LLM 응답을 채팅 창에 추가
   * @param message 메시지 객체
   */
  public async sendLlmResponse(message: { role: string; content: string }): Promise<void> {
    if (!this._view) {
      vscode.window.showErrorMessage('APE Chat view is not available');
      return;
    }

    // LLM 응답 추가
    await this._messageManager.addLlmResponse(message.role, message.content);
    
    // UI 업데이트
    this._updateChatView();
  }

  /**
   * 랜덤 인사말 메시지 가져오기
   * @returns 랜덤 인사말 문자열
   */
  private _getRandomGreeting(): string {
    const defaultGreeting = 'Welcome to APE. How can I assist with your development today?';

    try {
      const greetingsPath = vscode.Uri.joinPath(this._context.extensionUri, 'src', 'data', 'greetings.json');
      const fs = require('fs');
      const greetingsContent = fs.readFileSync(greetingsPath.fsPath, 'utf-8');
      const greetingsData = JSON.parse(greetingsContent);

      if (greetingsData && greetingsData.greetings && greetingsData.greetings.length > 0) {
        // 랜덤 인사말 선택
        const randomIndex = Math.floor(Math.random() * greetingsData.greetings.length);
        return greetingsData.greetings[randomIndex].text;
      }
    } catch (error) {
      console.warn('인사말을 불러오는 데 실패했습니다:', error);
    }

    return defaultGreeting;
  }
}