/**
 * 채팅 뷰 스타일 관리자
 * 
 * 스마트 프롬프팅 및 응답 스타일 관리를 담당하는 모듈
 */

import * as vscode from 'vscode';
import { SmartPromptingService, SmartPromptingState } from '../../core/services/smartPromptingService';

/**
 * 응답 스타일 인터페이스
 */
export interface ResponseStyle {
  id: string;
  name: string;
  description: string;
  icon: string;
  promptTemplate?: string;
}

/**
 * 채팅 뷰 스타일 관리자 클래스
 */
export class ChatViewStyleManager {
  // 기본 제공 스타일 목록
  private static readonly DEFAULT_STYLES: ResponseStyle[] = [
    {
      id: 'basic',
      name: '기본 모드',
      description: '일반적인 응답',
      icon: '◯'
    },
    {
      id: 'debug',
      name: '디버깅하기',
      description: '코드 디버깅에 최적화',
      icon: '▢',
      promptTemplate: '코드 디버깅을 위해 다음 질문에 답해주세요: {input}'
    },
    {
      id: 'analysis',
      name: '코드 분석',
      description: '코드 분석에 최적화',
      icon: '◈',
      promptTemplate: '다음 코드를 심층적으로 분석해주세요: {input}'
    },
    {
      id: 'refactor',
      name: '리팩토링',
      description: '코드 개선에 최적화',
      icon: '◎',
      promptTemplate: '다음 코드를 리팩토링해주세요: {input}'
    },
    {
      id: 'idea',
      name: '아이디어 구상하기',
      description: '창의적인 아이디어 생성',
      icon: '◆',
      promptTemplate: '다음 주제에 대한 창의적인 아이디어를 제안해주세요: {input}'
    }
  ];

  // 이벤트 이미터
  private readonly _onDidChangeStyle = new vscode.EventEmitter<ResponseStyle>();
  public readonly onDidChangeStyle = this._onDidChangeStyle.event;

  private _activeStyle: ResponseStyle;
  private _smartPromptingService: SmartPromptingService;
  private _smartPromptingStateListener?: vscode.Disposable;

  constructor(
    private readonly _context: vscode.ExtensionContext,
    smartPromptingService: SmartPromptingService
  ) {
    this._smartPromptingService = smartPromptingService;
    this._activeStyle = this.getStyleById('basic');
    
    // 스마트 프롬프팅 상태 변경 리스너 등록
    this._smartPromptingStateListener = this._smartPromptingService.onStateChanged(state => {
      // 스마트 프롬프팅 모드가 변경되면 스타일도 업데이트
      if (state.mode) {
        const newStyle = this.getStyleById(state.mode);
        this._activeStyle = newStyle;
        this._onDidChangeStyle.fire(newStyle);
      }
    });
    
    // 컨텍스트 서브스크립션에 리스너 등록
    this._context.subscriptions.push(this._smartPromptingStateListener);
  }

  /**
   * 스타일 목록 가져오기
   * @returns 사용 가능한 모든 스타일 목록
   */
  public getStyles(): ResponseStyle[] {
    return ChatViewStyleManager.DEFAULT_STYLES;
  }

  /**
   * 현재 활성화된 스타일 가져오기
   * @returns 현재 스타일
   */
  public getActiveStyle(): ResponseStyle {
    return this._activeStyle;
  }

  /**
   * ID로 스타일 찾기
   * @param id 스타일 ID
   * @returns 스타일 객체 또는 기본 스타일
   */
  public getStyleById(id: string): ResponseStyle {
    const style = ChatViewStyleManager.DEFAULT_STYLES.find(s => s.id === id);
    return style || ChatViewStyleManager.DEFAULT_STYLES[0];
  }

  /**
   * 응답 스타일 설정
   * @param styleId 스타일 ID
   */
  public setStyle(styleId: string): void {
    const newStyle = this.getStyleById(styleId);
    this._activeStyle = newStyle;
    
    // 스마트 프롬프팅 서비스에 모드 업데이트
    this._smartPromptingService.setEnabled(true);
    this._smartPromptingService.setMode(styleId);
    
    // 이벤트 발생
    this._onDidChangeStyle.fire(newStyle);
  }

  /**
   * 스타일 토글
   * @returns 토글 결과 (활성화 여부)
   */
  public toggleStyle(): boolean {
    const isEnabled = this._smartPromptingService.isEnabled();
    this._smartPromptingService.setEnabled(!isEnabled);
    return !isEnabled;
  }

  /**
   * 입력 메시지에 스타일 템플릿 적용
   * @param message 원본 메시지
   * @returns 처리된 메시지
   */
  public processMessage(message: string): string {
    if (!this._smartPromptingService.isEnabled() || !this._activeStyle.promptTemplate) {
      return message;
    }
    
    return this._activeStyle.promptTemplate.replace('{input}', message);
  }

  /**
   * 스타일 모달 HTML 생성
   * @returns 스타일 선택 모달 HTML
   */
  public generateStyleModalHtml(): string {
    const styles = this.getStyles();
    const activeStyleId = this._activeStyle.id;
    
    let html = '<div id="style-modal" class="style-modal">';
    html += '<div class="style-header">응답 스타일 선택</div>';
    html += '<div class="style-options">';
    
    styles.forEach(style => {
      const isActive = style.id === activeStyleId;
      html += `<div class="style-option ${isActive ? 'active' : ''}" data-style="${style.id}">`;
      html += `<span class="style-icon">${style.icon}</span>`;
      html += `<div class="style-info">`;
      html += `<span class="style-label">${style.name}</span>`;
      html += `<span class="style-description">${style.description}</span>`;
      html += `</div>`;
      html += `</div>`;
    });
    
    html += '</div>'; // style-options
    html += '</div>'; // style-modal
    
    return html;
  }

  /**
   * 스마트 프롬프팅 상태로부터 스타일 표시 이름 가져오기
   * @param state 스마트 프롬프팅 상태
   * @returns 표시 이름
   */
  public getDisplayNameFromState(state: SmartPromptingState): string {
    if (!state.enabled) {
      return '스타일 선택';
    }
    
    const style = this.getStyleById(state.mode);
    return style.name;
  }
}