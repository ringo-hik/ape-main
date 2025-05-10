/**
 * 채팅 뷰 렌더러
 * 
 * 채팅 메시지 UI 렌더링 및 웹뷰 인터페이스 관리를 담당하는 모듈
 */

import * as vscode from 'vscode';
import { Message, MessageRole } from '../../types/chat';
import { ChatViewFormatter } from './chatViewFormatter';

/**
 * 채팅 뷰 렌더링 옵션
 */
export interface RenderOptions {
  smoothScrolling: boolean;
  showTimestamps: boolean;
  syntaxHighlighting: boolean;
  renderMarkdown: boolean;
}

/**
 * 채팅 뷰 렌더러 클래스
 */
export class ChatViewRenderer {
  private _webview?: vscode.Webview;
  private _renderOptions: RenderOptions = {
    smoothScrolling: true,
    showTimestamps: false,
    syntaxHighlighting: true,
    renderMarkdown: true
  };

  /**
   * 렌더러 초기화
   * @param webview VSCode 웹뷰
   * @param options 렌더링 옵션
   * @param styleModalHtml 스타일 모달 HTML (optional)
   */
  public initialize(webview: vscode.Webview, options?: Partial<RenderOptions>, styleModalHtml?: string): void {
    this._webview = webview;

    if (options) {
      this._renderOptions = { ...this._renderOptions, ...options };
    }

    // 스타일 모달 HTML 추가
    if (styleModalHtml) {
      this.injectStyleModal(styleModalHtml);
    }
  }

  /**
   * 스타일 모달 HTML 삽입
   * @param html 모달 HTML
   */
  public injectStyleModal(html: string): void {
    if (!this._webview) {
      return;
    }

    this._webview.postMessage({
      type: 'injectStyleModal',
      html: html
    });
  }

  /**
   * 메시지 목록 렌더링 (WebView에 메시지 목록 전송)
   * @param messages 메시지 목록
   * @param isStreaming 스트리밍 여부
   */
  public renderMessages(messages: Message[], isStreaming: boolean = false): void {
    if (!this._webview) {
      console.log('렌더링 실패: 웹뷰가 초기화되지 않았습니다');
      return;
    }

    this._webview.postMessage({
      type: 'updateMessages',
      messages: messages,
      isStreaming: isStreaming
    });
  }

  /**
   * 명령어 제안 렌더링
   * @param suggestions 명령어 제안 목록
   */
  public renderCommandSuggestions(suggestions: any[]): void {
    if (!this._webview) {
      return;
    }

    this._webview.postMessage({
      type: 'commandSuggestions',
      suggestions: suggestions
    });
  }

  /**
   * 모델 정보 표시 업데이트
   * @param modelName 모델 표시 이름
   */
  public updateModelIndicator(modelName: string): void {
    if (!this._webview) {
      return;
    }

    this._webview.postMessage({
      type: 'updateModelIndicator',
      modelName: modelName
    });
  }

  /**
   * 스마트 프롬프팅 UI 업데이트
   * @param enabled 활성화 여부
   * @param mode 모드
   * @param modeName 모드 표시 이름
   */
  public updateSmartPromptingUI(enabled: boolean, mode: string, modeName: string): void {
    if (!this._webview) {
      return;
    }

    this._webview.postMessage({
      type: 'updateSmartPrompting',
      enabled: enabled,
      mode: mode,
      modeName: modeName
    });
  }

  /**
   * 채팅창에 텍스트 삽입
   * @param text 삽입할 텍스트
   */
  public insertTextToChatInput(text: string): void {
    if (!this._webview) {
      return;
    }

    this._webview.postMessage({
      type: 'insertCommandToInput',
      command: text
    });
  }

  /**
   * 메시지 컨텍스트 포함/제외 상태 토글 알림
   * @param messageId 메시지 ID
   * @param excludeFromContext 컨텍스트 제외 여부
   */
  public notifyMessageContextToggled(messageId: string, excludeFromContext: boolean): void {
    if (!this._webview) {
      return;
    }

    this._webview.postMessage({
      type: 'messageContextToggled',
      messageId: messageId,
      excludeFromContext: excludeFromContext
    });
  }

  /**
   * 텍스트 포맷 응답 전송
   * @param formattedText 포맷된 텍스트
   */
  public sendFormattedText(formattedText: string): void {
    if (!this._webview) {
      return;
    }

    this._webview.postMessage({
      type: 'formatResponse',
      formattedText: formattedText
    });
  }

  /**
   * 입력 내용 가져오기 요청
   */
  public requestInputContent(): void {
    if (!this._webview) {
      return;
    }

    this._webview.postMessage({
      type: 'getInputContent'
    });
  }

  /**
   * 메시지 목록에서 시스템 메시지 필터링
   * @param messages 모든 메시지 목록
   * @returns 필터링된 메시지 목록
   */
  public filterSystemMessages(messages: Message[]): Message[] {
    return messages.filter(message => {
      // 시스템 메시지 중 UI용 메시지 제외
      if (message.role === MessageRole.System) {
        // UI 전용 메시지 제외
        if (message.metadata?.uiOnly === true) {
          return false;
        }

        // HTML 콘텐츠를 가진 시스템 메시지 제외
        const content = message.content || '';
        if (content.includes('<div class="welcome-container"') ||
            (content.trim().startsWith('<') && content.includes('</div>'))) {
          return false;
        }
      }

      // 나머지 메시지는 유지
      return true;
    });
  }

  /**
   * 웰컴 메시지 생성
   * @param greeting 인사말 텍스트
   * @returns 웰컴 메시지 객체
   */
  public createWelcomeMessage(greeting: string): Message {
    return {
      id: `assistant_welcome_${Date.now()}`,
      role: MessageRole.Assistant,
      content: greeting,
      timestamp: new Date()
    };
  }

  /**
   * 렌더링 옵션 설정
   * @param options 렌더링 옵션
   */
  public setRenderOptions(options: Partial<RenderOptions>): void {
    this._renderOptions = { ...this._renderOptions, ...options };
  }
}