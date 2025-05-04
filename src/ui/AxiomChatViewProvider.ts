/**
 * 채팅 웹뷰 제공자
 * VS Code 웹뷰 UI 관리 및 메시지 처리
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ChatService } from '../services/ChatService';
import { AxiomCoreService } from '../core/AxiomCoreService';

/**
 * 채팅 웹뷰 제공자 클래스
 */
export class AxiomChatViewProvider implements vscode.WebviewViewProvider {
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
    
    // 초기화 완료 메시지
    setTimeout(() => {
      if (this._view && this._view.visible) {
        webviewView.webview.postMessage({
          command: 'initialized',
          timestamp: Date.now()
        });
        console.log('웹뷰 초기화 완료 메시지 전송');
      }
    }, 1000);

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
          
        case 'executeCommand':
          // 웹뷰에서 직접 명령어 실행 요청
          console.log('명령어 실행 요청:', message.commandId);
          if (message.commandId) {
            // axiomCore를 통해 명령어 실행
            vscode.commands.executeCommand(message.commandId)
              .then(result => {
                console.log('명령어 실행 결과:', result);
                // 결과를 웹뷰에 전송
                this._sendResponse(`명령어 '${message.commandId}' 실행 결과: ${JSON.stringify(result)}`, 'system');
              })
              .catch(err => {
                console.error('명령어 실행 오류:', err);
                this._sendResponse(`명령어 실행 오류: ${err.message || '알 수 없는 오류'}`, 'system');
              });
          }
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