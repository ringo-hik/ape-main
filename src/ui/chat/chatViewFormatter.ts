/**
 * 채팅 뷰 포맷터
 * 
 * 채팅 메시지와 UI 요소를 포맷팅하는 유틸리티 함수 모음
 */

import * as vscode from 'vscode';
import { Message, MessageRole } from '../../types/chat';
import { CommandSuggestion } from '../../core/commands/slashCommand';

/**
 * 메시지 포맷팅 옵션
 */
export interface FormatOptions {
  enableCodeBlocks: boolean;
  enableSyntaxHighlighting: boolean;
  enableMarkdown: boolean;
}

/**
 * 채팅 뷰 포맷터 클래스
 */
export class ChatViewFormatter {
  private static codeBlockCounter = 0;
  
  /**
   * 메시지 콘텐츠를 HTML로 포맷팅
   * @param content 메시지 콘텐츠
   * @param options 포맷팅 옵션
   * @returns 포맷팅된 HTML
   */
  public static formatMessageContent(content: string, options: Partial<FormatOptions> = {}): string {
    if (!content) return '';
    
    const defaultOptions: FormatOptions = {
      enableCodeBlocks: true,
      enableSyntaxHighlighting: true,
      enableMarkdown: true
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    // HTML이 이미 포함된 경우 그대로 반환
    if (this.containsHtml(content)) {
      return content;
    }
    
    // 마크다운 파싱
    if (finalOptions.enableMarkdown) {
      return this.parseMarkdown(content, finalOptions);
    }
    
    // 단순 텍스트
    return this.escapeHtml(content).replace(/\\n/g, '<br>');
  }
  
  /**
   * HTML 포함 여부 확인
   * @param content 검사할 콘텐츠
   * @returns HTML 포함 여부
   */
  private static containsHtml(content: string): boolean {
    const trimmedContent = content.trim();
    return trimmedContent.startsWith('<') && (
      trimmedContent.includes('</div>') ||
      trimmedContent.includes('</p>') ||
      trimmedContent.includes('</h') ||
      trimmedContent.includes('</span>') ||
      trimmedContent.includes('</ul>') ||
      trimmedContent.includes('</li>') ||
      trimmedContent.includes('</table>') ||
      trimmedContent.match(/<[a-zA-Z0-9_]+[^>]*>/)
    );
  }
  
  /**
   * 마크다운을 HTML로 변환
   * @param content 마크다운 콘텐츠
   * @param options 포맷팅 옵션
   * @returns HTML 문자열
   */
  private static parseMarkdown(content: string, options: FormatOptions): string {
    // 마크다운 컨테이너로 시작
    let formatted = '<div class="markdown-content">';
    let processedContent = content;
    
    // 코드 블록 처리
    if (options.enableCodeBlocks) {
      processedContent = this.replaceCodeBlocks(processedContent, options);
    }
    
    // 헤더 변환 (h1-h6)
    processedContent = processedContent
      .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
      .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
      .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
      .replace(/^#### (.*?)$/gm, '<h4>$1</h4>')
      .replace(/^##### (.*?)$/gm, '<h5>$1</h5>')
      .replace(/^###### (.*?)$/gm, '<h6>$1</h6>');
    
    // 볼드, 이탤릭, 취소선
    processedContent = processedContent
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/~~(.*?)~~/g, '<del>$1</del>');
    
    // 인라인 코드
    processedContent = processedContent.replace(/\`([^\`]+)\`/g, (match, code) => {
      return `<code class="inline-code">${this.escapeHtml(code)}</code>`;
    });
    
    // 링크 및 이미지
    processedContent = processedContent
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
      .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">');
    
    // 목록 및 인용구 처리
    processedContent = this.processLists(processedContent);
    processedContent = this.processBlockquotes(processedContent);
    
    // 단락 처리
    processedContent = this.processParagraphs(processedContent);
    
    // 마크다운 컨테이너 닫기
    formatted += processedContent + '</div>';
    
    return formatted;
  }
  
  /**
   * 코드 블록 대체
   * @param content 원본 내용
   * @param options 포맷팅 옵션
   * @returns 처리된 내용
   */
  private static replaceCodeBlocks(content: string, options: FormatOptions): string {
    return content.replace(/\`\`\`([a-zA-Z0-9_]*)\n([\s\S]*?)\n\`\`\`/g, (match, language, code) => {
      return this.formatCodeBlock(code.trim(), language || 'plaintext', options);
    });
  }
  
  /**
   * 단일 코드 블록 포맷팅
   * @param codeContent 코드 내용
   * @param language 언어
   * @param options 포맷팅 옵션
   * @returns 포맷팅된 HTML
   */
  private static formatCodeBlock(
    codeContent: string,
    language: string,
    options: FormatOptions
  ): string {
    const codeId = `code_${++this.codeBlockCounter}`;
    const escapedCode = this.escapeHtml(codeContent);

    // 라인 번호 생성
    const lines = codeContent.split('\n');
    const lineNumbers = lines.map((_, i) => (i + 1)).join('\n');
    const showLineNumbers = lines.length > 1;

    return `<div class="code-block-container code-block-popup">
  <div class="code-block-header">
    <span class="code-block-language language-${language}">${language}</span>
    <div class="code-block-actions">
      <button class="code-action-button copy-button" data-code-id="${codeId}" title="복사">
        <i class="codicon codicon-copy"></i>
        <span class="tooltip">클립보드에 복사</span>
      </button>
      <button class="code-action-button insert-code-button" data-code-id="${codeId}" title="에디터에 삽입">
        <i class="codicon codicon-arrow-small-right"></i>
        <span class="tooltip">현재 파일에 복사</span>
      </button>
      <button class="code-action-button new-file-button" data-code-id="${codeId}" title="새 파일로 생성">
        <i class="codicon codicon-new-file"></i>
        <span class="tooltip">새 파일로 생성</span>
      </button>
    </div>
  </div>
  <div class="code-content ${showLineNumbers ? 'with-line-numbers' : ''}">
    ${showLineNumbers ? `<div class="line-numbers">${lineNumbers}</div>` : ''}
    <div class="code-area">
      <code class="language-${language}" id="code-${codeId}">${escapedCode}</code>
    </div>
  </div>
</div>`;
  }
  
  /**
   * 목록 처리
   * @param content 마크다운 콘텐츠
   * @returns 처리된 콘텐츠
   */
  private static processLists(content: string): string {
    let result = content;
    
    // 순서 없는 목록
    let inList = false;
    let listContent = '';
    
    result = result.replace(/^[\*\-\+] (.*?)$/gm, (match, item) => {
      if (!inList) {
        inList = true;
        listContent = '<ul>\n<li>' + item + '</li>\n';
        return '';
      } else {
        listContent += '<li>' + item + '</li>\n';
        return '';
      }
    });
    
    if (inList) {
      listContent += '</ul>';
      result += listContent;
    }
    
    // 순서 있는 목록
    let inOrderedList = false;
    let orderedListContent = '';
    
    result = result.replace(/^(\d+)\. (.*?)$/gm, (match, number, item) => {
      if (!inOrderedList) {
        inOrderedList = true;
        orderedListContent = '<ol>\n<li>' + item + '</li>\n';
        return '';
      } else {
        orderedListContent += '<li>' + item + '</li>\n';
        return '';
      }
    });
    
    if (inOrderedList) {
      orderedListContent += '</ol>';
      result += orderedListContent;
    }
    
    return result;
  }
  
  /**
   * 인용구 처리
   * @param content 마크다운 콘텐츠
   * @returns 처리된 콘텐츠
   */
  private static processBlockquotes(content: string): string {
    let result = content;
    let inQuote = false;
    let quoteContent = '';
    
    result = result.replace(/^> (.*?)$/gm, (match, content) => {
      if (!inQuote) {
        inQuote = true;
        quoteContent = '<blockquote>\n<p>' + content + '</p>\n';
        return '';
      } else {
        quoteContent += '<p>' + content + '</p>\n';
        return '';
      }
    });
    
    if (inQuote) {
      quoteContent += '</blockquote>';
      result += quoteContent;
    }
    
    return result;
  }
  
  /**
   * 단락 처리
   * @param content 콘텐츠
   * @returns 처리된 콘텐츠
   */
  private static processParagraphs(content: string): string {
    const paragraphs = content.split(/\n\n+/);
    
    if (paragraphs.length > 1) {
      return paragraphs
        .map(p => p.trim())
        .filter(p => p.length > 0)
        .map(p => {
          // 이미 HTML 태그로 시작하는 경우 그대로 유지
          if (p.startsWith('<') &&
              (p.startsWith('<h') ||
               p.startsWith('<ul') ||
               p.startsWith('<ol') ||
               p.startsWith('<blockquote') ||
               p.startsWith('<pre') ||
               p.startsWith('<div'))) {
            return p;
          } else {
            // 일반 텍스트는 p 태그로 감싸고 내부 줄바꿈은 <br>로 변환
            return '<p>' + p.replace(/\n/g, '<br>') + '</p>';
          }
        })
        .join('\n');
    } else {
      // 단락이 하나면 단순히 줄바꿈만 처리
      return content.replace(/\n/g, '<br>');
    }
  }
  
  /**
   * HTML 이스케이프 처리
   * @param unsafe 이스케이프할 문자열
   * @returns 이스케이프된 문자열
   */
  public static escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  
  /**
   * 명령어 제안 UI 생성
   * @param suggestions 명령어 제안 목록
   * @returns HTML 문자열
   */
  public static formatCommandSuggestions(suggestions: CommandSuggestion[]): string {
    if (!suggestions || suggestions.length === 0) {
      return '';
    }
    
    const sortedSuggestions = [...suggestions].sort((a, b) => {
      // 카테고리별로 정렬
      const categoryOrder: Record<string, number> = {
        'general': 1,
        'git': 2,
        'code': 3,
        'utility': 4,
        'advanced': 5
      };
      
      const catA = categoryOrder[a.category] || 99;
      const catB = categoryOrder[b.category] || 99;
      
      if (catA !== catB) return catA - catB;
      
      // 그 다음 우선순위로 정렬
      if (a.priority !== b.priority) {
        return (b.priority || 0) - (a.priority || 0);
      }
      
      // 마지막으로 레이블로 정렬
      return a.label.localeCompare(b.label);
    });
    
    // HTML 생성
    let html = '<div class="command-suggestions-container">';
    let currentCategory = '';
    
    for (let i = 0; i < sortedSuggestions.length; i++) {
      const suggestion = sortedSuggestions[i];
      
      // 카테고리 헤더 추가
      if (suggestion.category !== currentCategory) {
        currentCategory = suggestion.category;
        html += `<div class="suggestion-category">${this.getCategoryTitle(currentCategory)}</div>`;
      }
      
      // 제안 항목 추가
      html += `
        <div class="command-suggestion" data-index="${i}" data-command="${suggestion.insertText}">
          <span class="suggestion-icon">${this.getSvgIconForCategory(currentCategory)}</span>
          <span class="suggestion-label">${this.escapeHtml(suggestion.label)}</span>
          <span class="suggestion-description">${this.escapeHtml(suggestion.description || '')}</span>
        </div>
      `;
    }
    
    html += '</div>';
    return html;
  }
  
  /**
   * 카테고리 제목 가져오기
   */
  private static getCategoryTitle(category: string): string {
    switch (category) {
      case 'general':
        return '일반 명령어';
      case 'git':
        return 'Git 관련 명령어';
      case 'code':
        return '코드 관련 명령어';
      case 'utility':
        return '유틸리티 명령어';
      case 'advanced':
        return '고급 명령어';
      default:
        return category;
    }
  }
  
  /**
   * 카테고리별 아이콘 가져오기
   */
  private static getSvgIconForCategory(category: string): string {
    switch (category) {
      case 'general':
        return '●';  // 일반 명령어 - 심플한 원형
      case 'git':
        return '◆';  // Git 명령어 - 다이아몬드
      case 'code':
        return '▢';  // 코드 관련 - 사각형
      case 'utility':
        return '◈';  // 유틸리티 - 특수 문자
      case 'advanced':
        return '◎';  // 고급 설정 - 이중 원형
      default:
        return '○';  // 기본값 - 빈 원형
    }
  }
}