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
          
        case 'getCommands':
          // 명령어 목록 요청 처리
          this._sendCommandsList();
          return;
          
        case 'executeCommand':
          // 웹뷰에서 직접 명령어 실행 요청
          console.log('명령어 실행 요청:', message.commandId);
          if (message.commandId) {
            this._executeCommand(message.commandId);
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
    const useStreaming = true; // 스트리밍 사용 여부 (추후 설정으로 변경 가능)

    try {
      // 로딩 상태 표시
      this._sendResponse('생각 중...', 'system');
      
      // 현재 선택된 모델 정보 업데이트 (필요한 경우)
      if (selectedModel) {
        this._changeModel(selectedModel);
      }
      
      // 시스템 로딩 메시지 제거
      if (this._view && this._view.visible) {
        this._view.webview.postMessage({
          command: 'removeSystemMessage',
          content: '생각 중...'
        });
      }
      
      // @ 명령어 및 / 명령어 처리 (명령어 형식인지 확인)
      const isAtCommand = text.trim().startsWith('@');
      const isSlashCommand = text.trim().startsWith('/');
      
      // 명령어인 경우 스트리밍 없이 직접 처리
      if (isAtCommand || isSlashCommand) {
        console.log(`AxiomChatViewProvider: ${isAtCommand ? '@' : '/'}명령어 감지 - "${text}"`);
        
        // 명령어 처리 전 로딩 표시
        const commandResponseId = `cmd-${Date.now()}`;
        this._view.webview.postMessage({
          command: 'startStreaming',
          responseId: commandResponseId,
          type: 'system'
        });
        
        // 명령어 실행 (스트리밍 없이)
        const commandResponse = await this._chatService.processMessage(text);
        
        // 명령어 응답 처리
        if (commandResponse) {
          // 응답 형식에 따라 처리
          let responseContent = '';
          let responseType = 'system';
          
          if (typeof commandResponse === 'object') {
            // 객체 응답 처리
            if (commandResponse.content) {
              responseContent = commandResponse.content;
              responseType = commandResponse.error ? 'system' : 'assistant';
            } else {
              responseContent = JSON.stringify(commandResponse, null, 2);
            }
          } else {
            responseContent = commandResponse.toString();
          }
          
          // 스트리밍 종료 및 응답 표시
          if (this._view && this._view.visible) {
            // 스트리밍 애니메이션 중지
            this._view.webview.postMessage({
              command: 'endStreaming',
              responseId: commandResponseId
            });
            
            // 명령어 응답 표시
            this._sendResponse(responseContent, responseType);
          }
        }
        
        return;
      }
      
      // 일반 메시지는 스트리밍 모드로 처리
      if (useStreaming) {
        // 스트리밍 응답 처리를 위한 변수
        let isFirstChunk = true;
        let chunkCount = 0;
        let startTime = Date.now();
        
        // 스트리밍 응답 ID
        const responseId = `resp-${Date.now()}`;
        
        console.log(`AxiomChatViewProvider: 스트리밍 시작 - 응답 ID: ${responseId}`);
        
        // 스트리밍 시작 메시지 전송
        this._view.webview.postMessage({
          command: 'startStreaming',
          responseId: responseId,
          type: 'assistant'
        });
        
        // 스트리밍 콜백
        const streamHandler = (chunk: string) => {
          if (!this._view || !this._view.visible) return;
          
          chunkCount++;
          
          // 첫 청크인 경우 초기화 메시지 전송
          if (isFirstChunk) {
            console.log(`AxiomChatViewProvider: 첫 청크 수신 - 길이: ${chunk.length}자`);
            isFirstChunk = false;
          }
          
          // 로그 간소화를 위해 일부 청크만 로깅
          if (chunkCount <= 2 || chunkCount % 50 === 0) {
            console.log(`AxiomChatViewProvider: 스트리밍 청크 #${chunkCount} 수신 - 길이: ${chunk.length}자`);
          }
          
          // 청크 전송
          this._view.webview.postMessage({
            command: 'appendStreamChunk',
            responseId: responseId,
            content: chunk,
            type: 'assistant'
          });
        };
        
        // 스트리밍 모드로 처리
        await this._chatService.processMessage(text, streamHandler);
        
        // 스트리밍 완료 메시지 전송
        if (this._view && this._view.visible) {
          const endTime = Date.now();
          const duration = (endTime - startTime) / 1000;
          
          console.log(`AxiomChatViewProvider: 스트리밍 완료 - 총 청크: ${chunkCount}, 소요 시간: ${duration.toFixed(2)}초`);
          
          this._view.webview.postMessage({
            command: 'endStreaming',
            responseId: responseId
          });
        }
      } else {
        // 일반 모드로 처리
        const response = await this._chatService.processMessage(text);
        
        // 응답이 비어있지 않은 경우만 전송
        if (response && this._view && this._view.visible) {
          // 응답 형식에 따라 처리
          if (typeof response === 'object') {
            if (response.content) {
              const responseType = response.error ? 'system' : 'assistant';
              this._sendResponse(response.content, responseType);
            } else {
              this._sendResponse(JSON.stringify(response, null, 2), 'assistant');
            }
          } else if (response.trim && response.trim() !== '') {
            this._sendResponse(response, 'assistant');
          }
        }
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
   * 명령어 목록 전송
   */
  private _sendCommandsList() {
    if (!this._view) {
      return;
    }
    
    try {
      const coreService = AxiomCoreService.getInstance();
      const commandRegistry = coreService.commandRegistry;
      
      // 모든 명령어 사용법 가져오기
      const allUsages = commandRegistry.getAllCommandUsages();
      
      // 명령어 목록 생성
      const commands = allUsages.map(usage => {
        // 명령어 타입 결정
        const isAtCommand = usage.syntax.startsWith('@');
        const isSlashCommand = usage.syntax.startsWith('/');
        
        return {
          id: usage.syntax,
          label: usage.command,
          description: usage.description,
          type: isAtCommand ? 'at' : (isSlashCommand ? 'slash' : 'other'),
          frequent: ['help', 'model', 'debug', 'clear'].includes(usage.command)
        };
      });
      
      // 명령어 목록 전송
      this._view.webview.postMessage({
        command: 'updateCommands',
        commands: commands
      });
      
      console.log(`${commands.length}개의 명령어를 웹뷰로 전송했습니다.`);
    } catch (error) {
      console.error('명령어 목록 전송 중 오류 발생:', error);
    }
  }
  
  /**
   * 명령어 실행
   */
  private async _executeCommand(commandId: string) {
    if (!this._view) {
      return;
    }
    
    try {
      console.log(`명령어 실행: ${commandId}`);
      
      // 명령어 실행 전 로딩 표시
      this._sendResponse(`명령어 '${commandId}' 실행 중...`, 'system');
      
      // 내부 명령어와 외부 명령어 구분하여 처리
      const isInternalCommand = commandId.startsWith('/');
      const isExternalCommand = commandId.startsWith('@');
      
      if (isInternalCommand || isExternalCommand) {
        // AxiomCoreService를 통해 명령어 실행
        const result = await this._chatService.processMessage(commandId);
        
        // 명령어 결과를 채팅으로 표시
        if (result) {
          // 시스템 메시지 삭제
          if (this._view && this._view.visible) {
            this._view.webview.postMessage({
              command: 'removeSystemMessage',
              content: `명령어 '${commandId}' 실행 중...`
            });
          }
          
          // 결과 형식에 따른 처리
          if (typeof result === 'object') {
            if (result.content) {
              const responseType = result.error ? 'system' : 'assistant';
              this._sendResponse(result.content, responseType);
            } else {
              this._sendResponse(JSON.stringify(result, null, 2), 'assistant');
            }
          } else {
            this._sendResponse(result, 'assistant');
          }
        }
      } else {
        // VS Code 명령어 실행
        vscode.commands.executeCommand(commandId)
          .then(result => {
            console.log('VS Code 명령어 실행 결과:', result);
            // 결과를 웹뷰에 전송
            this._sendResponse(`명령어 '${commandId}' 실행 완료`, 'system');
          })
          .catch(err => {
            console.error('VS Code 명령어 실행 오류:', err);
            this._sendResponse(`명령어 실행 오류: ${err.message || '알 수 없는 오류'}`, 'system');
          });
      }
    } catch (error) {
      console.error('명령어 실행 중 오류 발생:', error);
      this._sendResponse(`명령어 실행 중 오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`, 'system');
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
    const codeBlocksCssUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'css', 'code-blocks.css'));
    const commandAutocompleteCssUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'css', 'command-autocomplete.css'));
    const modelSelectorUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'js', 'model-selector.js'));
    const codeBlocksJsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'js', 'code-blocks.js'));
    const commandAutocompleteJsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'js', 'command-autocomplete.js'));
    const commandsHtmlUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'html', 'command-buttons.html'));
    const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'codicons', 'codicon.css'));
    const commandButtonsJsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'js', 'command-buttons.js'));
    
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
      htmlContent = htmlContent.replace(/\$\{codeBlocksCssUri\}/g, codeBlocksCssUri.toString());
      htmlContent = htmlContent.replace(/\$\{commandAutocompleteCssUri\}/g, commandAutocompleteCssUri.toString());
      htmlContent = htmlContent.replace(/\$\{modelSelectorUri\}/g, modelSelectorUri.toString());
      htmlContent = htmlContent.replace(/\$\{codeBlocksJsUri\}/g, codeBlocksJsUri.toString());
      htmlContent = htmlContent.replace(/\$\{commandAutocompleteJsUri\}/g, commandAutocompleteJsUri.toString());
      htmlContent = htmlContent.replace(/\$\{commandsHtmlUri\}/g, commandsHtmlUri.toString());
      htmlContent = htmlContent.replace(/\$\{codiconsUri\}/g, codiconsUri.toString());
      htmlContent = htmlContent.replace(/\$\{commandButtonsJsUri\}/g, commandButtonsJsUri.toString());
      
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