import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { AxiomCoreService } from './core/AxiomCoreService';
import { LlmService } from './core/llm/LlmService';

/**
 * 채팅 메시지 타입
 */
interface ChatMessage {
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

/**
 * 채팅 서비스 클래스
 * 대화 히스토리 관리 및 UI 상호작용 담당
 */
class ChatService {
  private conversation: ChatMessage[] = [];
  private axiomCore: AxiomCoreService;
  private readonly welcomeMessages = [
    '안녕하세요! Axiom 채팅에 오신 것을 환영합니다.',
    '문의사항이나 도움이 필요한 내용을 입력해주세요.',
    '@ 명령어나 / 명령어를 사용하여 특별한 기능을 사용할 수 있습니다.'
  ];
  
  constructor(context: vscode.ExtensionContext) {
    // Axiom 코어 서비스 초기화
    this.axiomCore = AxiomCoreService.getInstance(context);
    
    // 코어 서비스 초기화
    this.axiomCore.initialize().then(() => {
      this.addSystemMessage('Axiom 코어 서비스가 초기화되었습니다.');
    }).catch(error => {
      this.addSystemMessage('Axiom 코어 서비스 초기화 중 오류가 발생했습니다.');
      console.error('코어 서비스 초기화 오류:', error);
    });
  }
  
  /**
   * 사용자 메시지 처리 후 응답 생성
   */
  public async processMessage(text: string): Promise<string> {
    // 대화 기록에 사용자 메시지 추가
    this.addMessage('user', text);
    
    // /clear 명령어 특별 처리 (UI 관련이므로 여기서 처리)
    if (text.trim().toLowerCase() === '/clear') {
      this.clearConversation();
      const clearMessage = '대화 기록이 초기화되었습니다.';
      this.addMessage('system', clearMessage);
      return Promise.resolve(clearMessage);
    }
    
    try {
      // Axiom 코어 서비스를 통한 메시지 처리
      const response = await this.axiomCore.processMessage(text);
      
      let responseContent: string;
      
      if (typeof response === 'object') {
        if (response.content) {
          responseContent = response.content;
        } else {
          responseContent = JSON.stringify(response, null, 2);
        }
      } else {
        responseContent = response.toString();
      }
      
      // 응답 추가
      this.addMessage('assistant', responseContent);
      return responseContent;
    } catch (error) {
      console.error('메시지 처리 중 오류 발생:', error);
      
      // 오류 발생 시 대체 응답
      const errorMessage = '죄송합니다. 응답을 생성하는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
      this.addMessage('assistant', errorMessage);
      return errorMessage;
    }
  }
  
  /**
   * 메시지 추가
   */
  private addMessage(type: 'user' | 'assistant' | 'system', content: string) {
    this.conversation.push({
      type,
      content,
      timestamp: Date.now()
    });
  }
  
  /**
   * 시스템 메시지 추가
   */
  public addSystemMessage(content: string) {
    this.addMessage('system', content);
  }
  
  /**
   * 대화 내용 초기화
   */
  public clearConversation() {
    this.conversation = [];
  }
  
  /**
   * 웰컴 메시지 가져오기
   */
  public getWelcomeMessage(): string {
    return this.welcomeMessages[Math.floor(Math.random() * this.welcomeMessages.length)];
  }
  
  /**
   * 대화 히스토리 가져오기
   */
  public getConversation(): ChatMessage[] {
    return [...this.conversation];
  }
}

/**
 * 채팅 웹뷰 제공자 클래스
 */
class AxiomChatViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _chatService: ChatService
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    // 웹뷰 제목 설정
    webviewView.description = "채팅 인터페이스";

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    // 웹뷰 HTML 설정
    webviewView.webview.html = this._getHtmlContent(webviewView.webview);
    console.log('채팅 웹뷰 HTML이 설정되었습니다.');

    // 웹뷰에서 메시지 받기
    webviewView.webview.onDidReceiveMessage(message => {
      console.log('채팅 웹뷰로부터 메시지를 받았습니다:', message);
      
      switch (message.command) {
        case 'sendMessage':
          this._handleUserMessage(message);
          return;
          
        case 'clearChat':
          this.clearChat();
          this._chatService.clearConversation();
          return;
          
        case 'changeModel':
          this._changeModel(message.model);
          return;
      }
    });
    
    // 모델 목록 전송
    setTimeout(() => {
      this._sendModelList();
    }, 500);
    
    // 현재 모델 설정
    setTimeout(() => {
      this._sendCurrentModel();
    }, 600);
    
    // 웰컴 메시지 전송
    setTimeout(() => {
      this._sendResponse(this._chatService.getWelcomeMessage(), 'assistant');
    }, 1000);
  }

  /**
   * 사용자 메시지 처리
   */
  private async _handleUserMessage(message: any) {
    if (!this._view) {
      return;
    }

    const text = message.text;
    const selectedModel = message.model; // 선택된 모델 ID

    try {
      // 로딩 상태 표시
      this._sendResponse('생각 중...', 'system');
      
      // 현재 선택된 모델 정보 업데이트 (필요한 경우)
      if (selectedModel) {
        this._changeModel(selectedModel);
      }
      
      // 메시지 처리 및 응답 생성
      const response = await this._chatService.processMessage(text);
      
      // 시스템 로딩 메시지 제거
      if (this._view && this._view.visible) {
        // 로딩 메시지 제거 (필요한 경우)
        this._view.webview.postMessage({
          command: 'removeSystemMessage',
          content: '생각 중...'
        });
      }
      
      // 응답이 비어있지 않은 경우만 전송
      if (response && response.trim() !== '' && this._view && this._view.visible) {
        this._sendResponse(response, text.startsWith('/') ? 'system' : 'assistant');
      }
    } catch (error) {
      console.error('메시지 처리 중 오류 발생:', error);
      this._sendResponse('메시지 처리 중 오류가 발생했습니다. 다시 시도해주세요.', 'system');
    }
  }

  /**
   * 응답 메시지 전송
   */
  private _sendResponse(text: string, type: 'assistant' | 'system' = 'assistant') {
    if (this._view) {
      this._view.webview.postMessage({
        command: 'addMessage',
        type: type,
        content: text
      });
    }
  }
  
  /**
   * 모델 목록 전송
   */
  private _sendModelList() {
    if (this._view) {
      const coreService = AxiomCoreService.getInstance();
      const llmService = coreService.llmService;
      
      // models Map에서 key-value 쌍으로 변환하여 id 속성 추가
      const modelsArray = Array.from(llmService.getAvailableModels());
      const models = modelsArray.map((model) => ({
        id: model.name.toLowerCase().replace(/\s+/g, '-'),
        name: model.name
      }));
      
      this._view.webview.postMessage({
        command: 'updateModels',
        models: models
      });
    }
  }
  
  /**
   * 현재 모델 전송
   */
  private _sendCurrentModel() {
    if (this._view) {
      const coreService = AxiomCoreService.getInstance();
      const llmService = coreService.llmService;
      const defaultModelId = llmService.getDefaultModelId();
      
      this._view.webview.postMessage({
        command: 'setCurrentModel',
        modelId: defaultModelId
      });
    }
  }
  
  /**
   * 모델 변경
   */
  private _changeModel(modelId: string) {
    if (!modelId) {
      return;
    }
    
    try {
      const config = vscode.workspace.getConfiguration('axiom.llm');
      config.update('defaultModel', modelId, vscode.ConfigurationTarget.Global);
      
      console.log(`모델이 ${modelId}로 변경되었습니다.`);
    } catch (error) {
      console.error('모델 변경 중 오류 발생:', error);
    }
  }

  /**
   * 채팅 초기화
   */
  public clearChat() {
    if (this._view) {
      this._view.webview.postMessage({
        command: 'clearChat'
      });
      
      // 시스템 메시지 추가
      setTimeout(() => {
        this._view?.webview.postMessage({
          command: 'addMessage',
          type: 'system',
          content: '채팅이 초기화되었습니다.'
        });
        
        // 웰컴 메시지 다시 표시
        setTimeout(() => {
          this._sendResponse(this._chatService.getWelcomeMessage(), 'assistant');
        }, 500);
      }, 100);
    }
  }

  /**
   * HTML 내용 생성
   */
  private _getHtmlContent(webview: vscode.Webview) {
    // 리소스 경로 가져오기
    const htmlPath = vscode.Uri.joinPath(this._extensionUri, 'resources', 'html', 'chat.html');
    
    // CSS 및 JS 경로 설정
    const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'css', 'chat.css'));
    const modelSelectorUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'js', 'model-selector.js'));
    
    try {
      // HTML 파일이 존재하는지 확인
      if (!fs.existsSync(htmlPath.fsPath)) {
        console.error(`HTML 파일을 찾을 수 없습니다: ${htmlPath.fsPath}`);
        throw new Error('HTML 파일을 찾을 수 없습니다.');
      }
      
      // HTML 파일 읽기
      let htmlContent = fs.readFileSync(htmlPath.fsPath, 'utf8');
      
      // CSP 소스 및 리소스 경로 설정
      const cspSource = webview.cspSource;
      htmlContent = htmlContent.replace(/\$\{cspSource\}/g, cspSource);
      htmlContent = htmlContent.replace(/\$\{cssUri\}/g, cssUri.toString());
      htmlContent = htmlContent.replace(/\$\{modelSelectorUri\}/g, modelSelectorUri.toString());
      
      console.log('HTML 파일 로드 성공:', htmlPath.fsPath);
      console.log('CSS URI:', cssUri.toString());
      console.log('JS URI:', modelSelectorUri.toString());
      
      return htmlContent;
    } catch (error) {
      console.error('HTML 파일을 읽는 중 오류 발생:', error);
      
      // 오류 시 기본 HTML 반환
      return `<!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline';">
        <title>Axiom 채팅</title>
        <style>
          body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
          }
          .error {
            color: var(--vscode-errorForeground);
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <h1>Axiom 채팅</h1>
        <div class="error">
          <p>오류: 채팅 인터페이스를 로드할 수 없습니다.</p>
          <p>HTML 파일을 찾을 수 없거나 읽는 중 오류가 발생했습니다.</p>
          <p>경로: ${htmlPath.fsPath}</p>
        </div>
        <script>
          const vscode = acquireVsCodeApi();
        </script>
      </body>
      </html>`;
    }
  }
}

/**
 * 확장 활성화 함수
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('Axiom 확장이 활성화되었습니다!');

  // Axiom 코어 서비스 초기화
  const axiomCore = AxiomCoreService.getInstance(context);
  
  // 채팅 서비스 인스턴스 생성
  const chatService = new ChatService(context);

  // 채팅 웹뷰 제공자 등록
  const chatProvider = new AxiomChatViewProvider(context.extensionUri, chatService);
  
  // 웹뷰를 사이드바에 등록
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'axiom.chatView', 
      chatProvider,
      {
        webviewOptions: { retainContextWhenHidden: true }
      }
    )
  );

  // 상태 표시줄 항목 추가
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = '$(comment) Axiom';
  statusBarItem.command = 'axiom.openChat';
  statusBarItem.tooltip = 'Axiom 채팅 열기';
  statusBarItem.show();
  
  context.subscriptions.push(statusBarItem);
  
  // 명령어 등록
  context.subscriptions.push(
    vscode.commands.registerCommand('axiom.openSidebar', () => {
      vscode.commands.executeCommand('workbench.view.extension.axiom-sidebar');
    }),
    
    vscode.commands.registerCommand('axiom.openChat', () => {
      vscode.commands.executeCommand('workbench.view.extension.axiom-sidebar');
    }),
    
    vscode.commands.registerCommand('axiom.clearChat', () => {
      chatProvider.clearChat();
      chatService.clearConversation();
    })
  );
  
  // 코어 서비스 초기화
  axiomCore.initialize().then(success => {
    if (success) {
      console.log('Axiom 코어 서비스가 성공적으로 초기화되었습니다.');
    } else {
      console.error('Axiom 코어 서비스 초기화 실패');
    }
  }).catch(error => {
    console.error('Axiom 코어 서비스 초기화 중 오류 발생:', error);
  });
  
  // 확장 활성화 시 자동으로 사이드바 열기
  vscode.commands.executeCommand('workbench.view.extension.axiom-sidebar');
}

/**
 * 확장 비활성화 함수
 */
export function deactivate() {
  console.log('Axiom 확장이 비활성화되었습니다!');
}