/**
 * 도움말 렌더러
 * 
 * 도움말 데이터를 웹뷰에 표시하기 위한 HTML로 변환합니다.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { LLMService } from '../llm/llmService';

// vscode 확장 인스턴스 캐시
// 현재 사용되지 않지만 향후 사용 가능성이 있어 주석으로 유지
// let _extensionContext: vscode.ExtensionContext | undefined;

/**
 * 확장 컨텍스트 설정
 */
export function setExtensionContext(): void {
  // 지금은 사용되지 않지만 향후 확장성을 위해 유지
  // 매개변수도 제거
}

/**
 * 카테고리별 미니멀 아이콘 가져오기
 * @param category 카테고리 ID
 * @returns 미니멀 아이콘
 */
/* 현재 사용되지 않는 함수이지만 향후 사용 가능성이 있어 주석으로 유지
function getCategorySimpleIcon(category: string): string {
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
*/

/**
 * Codicon CSS 파일에 대한 URI 가져오기
 */
function getCodiconCssUri(): vscode.Uri {
  const extension = vscode.extensions.getExtension('ape-team.ape-extension');
  if (!extension) {
    throw new Error('APE 확장을 찾을 수 없습니다');
  }
  
  return vscode.Uri.joinPath(extension.extensionUri, 'media', 'codicon', 'codicon.css');
}
import {
  generateHelpSystemPrompt,
  // 현재 사용되지 않는 함수들이지만 향후 사용 가능성이 있어 주석으로 유지
  // generateCommandDetailPrompt,
  // generateFaqPrompt,
  // generateGuidePrompt,
  // generateGuidesListPrompt
} from '../../data/helpSystemPrompt';

// 도움말 데이터 캐시
let helpDataCache: any = null;

/**
 * 도움말 데이터 로드
 * @returns 도움말 데이터 객체
 */
export async function loadHelpData(): Promise<any> {
  if (helpDataCache) {
    return helpDataCache;
  }

  try {
    const extensionPath = vscode.extensions.getExtension('ape-team.ape-extension')?.extensionPath;
    if (!extensionPath) {
      throw new Error('확장 프로그램 경로를 찾을 수 없습니다.');
    }

    const helpFilePath = path.join(extensionPath, 'src', 'data', 'help.json');
    const helpDataStr = fs.readFileSync(helpFilePath, 'utf8');
    helpDataCache = JSON.parse(helpDataStr);
    return helpDataCache;
  } catch (error) {
    console.error('도움말 데이터 로드 오류:', error);
    throw new Error('도움말 데이터를 로드할 수 없습니다.');
  }
}

/**
 * 특정 명령어 데이터 가져오기
 * @param commandName 명령어 이름
 * @returns 명령어 데이터 객체
 */
export async function getCommandData(commandName: string): Promise<any | null> {
  try {
    const helpData = await loadHelpData();
    
    // 모든 카테고리 검색
    for (const category of helpData.categories) {
      // 카테고리 내 명령어 검색
      for (const command of category.commands) {
        // 명령어 이름 또는 별칭 매칭
        if (command.name === commandName || (command.aliases && command.aliases.includes(commandName))) {
          return {
            ...command,
            category: category.id,
            categoryName: category.name
          };
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('명령어 데이터 검색 오류:', error);
    return null;
  }
}

/**
 * 카테고리별 명령어 목록 가져오기
 * @param categoryId 카테고리 ID (옵션)
 * @returns 카테고리별 명령어 목록
 */
export async function getCommandsByCategory(categoryId?: string): Promise<any[]> {
  try {
    const helpData = await loadHelpData();
    
    // 특정 카테고리 요청 시
    if (categoryId) {
      const category = helpData.categories.find((c: any) => c.id === categoryId);
      return category ? [category] : [];
    }
    
    // 모든 카테고리 반환
    return helpData.categories;
  } catch (error) {
    console.error('카테고리별 명령어 목록 가져오기 오류:', error);
    return [];
  }
}

/**
 * 도움말 HTML 생성 (기본 카테고리 목록)
 * @param categoryId 카테고리 ID (옵션)
 * @returns HTML 문자열
 */
export async function generateHelpHtml(categoryId?: string): Promise<string> {
  try {
    const categories = await getCommandsByCategory(categoryId);

    let content = `
      <header class="help-header">
        <h1>APE 도움말</h1>
        <p class="help-description">사용 가능한 명령어 목록입니다. 명령어를 클릭하면 자세한 정보를 볼 수 있습니다.</p>
      </header>

      <div class="quick-actions">
        <h2>자주 사용하는 명령어</h2>
        <div class="quick-buttons">
          <button class="quick-button git" onclick="sendCommandToVSCode('git status')">
            <span class="codicon codicon-git-commit"></span>Git 상태
          </button>
          <button class="quick-button code" onclick="sendCommandToVSCode('analyze')">
            <span class="codicon codicon-code"></span>코드 분석
          </button>
          <button class="quick-button utility" onclick="sendCommandToVSCode('clear')">
            <span class="codicon codicon-clear-all"></span>채팅 지우기
          </button>
          <button class="quick-button model" onclick="sendCommandToVSCode('model list')">
            <span class="codicon codicon-settings-gear"></span>모델 선택
          </button>
        </div>
      </div>
    `;
    
    // 카테고리별 명령어 목록
    for (const category of categories) {
      content += `
        <div class="help-category">
          <h2>${category.name}</h2>
          <p>${category.description || ''}</p>
          <div class="command-grid">
      `;
      
      // 카테고리 내 명령어
      for (const command of category.commands) {
        // 명령어 아이콘 선택
        const iconName = getCategoryIcon(category.id);

        // 명령어 요약 카드 - 미니멀 버전
        content += `
          <div class="command-card" onclick="sendCommandToVSCode('${command.name}')">
            <div class="command-name">
              <span class="command-icon codicon codicon-${iconName}"></span>
              <span class="command-text">/${command.name}</span>
            </div>
            <div class="command-description">${command.description}</div>
            <div class="command-card-footer">
              ${command.examples && command.examples.length > 0 ?
                `<div class="command-examples">예시: ${command.examples[0]}</div>` : ''}
              ${command.aliases && command.aliases.length > 0 ?
                `<div class="command-aliases">/${command.aliases[0]}${command.aliases.length > 1 ? ' +' + (command.aliases.length - 1) : ''}</div>` : ''}
            </div>
          </div>
        `;
      }
      
      content += `
          </div>
        </div>
      `;
    }
    
    // 전체 HTML 래핑
    return getHelpPageHtml(content);
  } catch (error) {
    console.error('도움말 HTML 생성 오류:', error);
    return getHelpPageHtml(`
      <h1>도움말 로드 오류</h1>
      <p>도움말 데이터를 로드하는 중 오류가 발생했습니다: ${error}</p>
    `);
  }
}

/**
 * 명령어 상세 정보 HTML 생성
 * @param commandName 명령어 이름
 * @returns HTML 문자열
 */
export async function generateCommandDetailHtml(commandName: string): Promise<string> {
  try {
    const commandData = await getCommandData(commandName);
    
    if (!commandData) {
      return getHelpPageHtml(`
        <h1>명령어를 찾을 수 없음</h1>
        <p>'${commandName}' 명령어를 찾을 수 없습니다.</p>
        <p><a href="#" onclick="sendCommandToVSCode('help')">모든 명령어 보기</a></p>
      `);
    }
    
    let content = `
      <header class="help-header">
        <h1>/${commandData.name}</h1>
        <p class="help-description">${commandData.description}</p>
      </header>

      <div class="command-detail">
        <div class="detail-section">
          <h2>상세 정보</h2>
          <p>${commandData.longDescription || commandData.description}</p>
        </div>

        <div class="detail-section">
          <h2>사용법</h2>
          <div class="command-usage">
            <code>${commandData.usage || `/${commandData.name}`}</code>
          </div>
        </div>
    `;
    
    // 예시
    if (commandData.examples && commandData.examples.length > 0) {
      content += `
        <div class="detail-section">
          <h2>예시</h2>
          <ul class="command-examples-list">
            ${commandData.examples.map((example: string) => `<li><code>${example}</code></li>`).join('')}
          </ul>
        </div>
      `;
    }

    // 별칭
    if (commandData.aliases && commandData.aliases.length > 0) {
      content += `
        <div class="detail-section">
          <h2>별칭</h2>
          <div class="command-aliases-list">
            ${commandData.aliases.map((alias: string) => `<span class="detail-alias">/${alias}</span>`).join('')}
          </div>
        </div>
      `;
    }

    // 관련 명령어
    if (commandData.related && commandData.related.length > 0) {
      content += `
        <div class="detail-section">
          <h2>관련 명령어</h2>
          <div class="related-commands">
            ${commandData.related.map((cmd: string) =>
              `<a href="#" class="related-command" onclick="sendCommandToVSCode('${cmd}')">${cmd}</a>`
            ).join('')}
          </div>
        </div>
      `;
    }

    content += `
      </div>
      <div class="back-link">
        <a href="#" onclick="sendCommandToVSCode('help')">
          <span class="codicon codicon-arrow-left"></span> 모든 명령어 보기
        </a>
      </div>
    `;
    
    return getHelpPageHtml(content);
  } catch (error) {
    console.error('명령어 상세 정보 HTML 생성 오류:', error);
    return getHelpPageHtml(`
      <h1>명령어 정보 로드 오류</h1>
      <p>명령어 정보를 로드하는 중 오류가 발생했습니다: ${error}</p>
    `);
  }
}

/**
 * FAQ HTML 생성
 * @returns HTML 문자열
 */
export async function generateFaqHtml(): Promise<string> {
  try {
    const helpData = await loadHelpData();
    const faqs = helpData.faq || [];
    
    let content = `
      <header class="help-header">
        <h1>자주 묻는 질문 (FAQ)</h1>
        <p class="help-description">APE 사용 시 자주 묻는 질문들과 그에 대한 답변입니다.</p>
      </header>

      <div class="faq-list">
    `;

    for (const faq of faqs) {
      content += `
        <div class="faq-item">
          <div class="faq-question">
            <span class="faq-icon codicon codicon-question"></span>
            ${faq.question}
          </div>
          <div class="faq-answer">${faq.answer}</div>
        </div>
      `;
    }

    content += `
      </div>
      <div class="back-link">
        <a href="#" onclick="sendCommandToVSCode('help')">
          <span class="codicon codicon-arrow-left"></span> 도움말로 돌아가기
        </a>
      </div>
    `;
    
    return getHelpPageHtml(content);
  } catch (error) {
    console.error('FAQ HTML 생성 오류:', error);
    return getHelpPageHtml(`
      <h1>FAQ 로드 오류</h1>
      <p>FAQ 데이터를 로드하는 중 오류가 발생했습니다: ${error}</p>
    `);
  }
}

/**
 * 가이드 문서 HTML 생성
 * @param guideId 가이드 ID
 * @returns HTML 문자열
 */
export async function generateGuideHtml(guideId: string): Promise<string> {
  try {
    const helpData = await loadHelpData();
    const guides = helpData.guides || [];
    const guide = guides.find((g: any) => g.id === guideId);
    
    if (!guide) {
      return getHelpPageHtml(`
        <h1>가이드를 찾을 수 없음</h1>
        <p>'${guideId}' 가이드를 찾을 수 없습니다.</p>
        <p><a href="#" onclick="sendCommandToVSCode('help guides')">모든 가이드 보기</a></p>
      `);
    }
    
    // 마크다운 형식 표시 개선
    const content = `
      <header class="help-header">
        <h1>${guide.title}</h1>
      </header>

      <div class="guide-content markdown-body">
        ${guide.content}
      </div>

      <div class="back-link">
        <a href="#" onclick="sendCommandToVSCode('help guides')">
          <span class="codicon codicon-arrow-left"></span> 모든 가이드 보기
        </a>
      </div>
    `;
    
    return getHelpPageHtml(content);
  } catch (error) {
    console.error('가이드 HTML 생성 오류:', error);
    return getHelpPageHtml(`
      <h1>가이드 로드 오류</h1>
      <p>가이드 데이터를 로드하는 중 오류가 발생했습니다: ${error}</p>
    `);
  }
}

/**
 * 모든 가이드 목록 HTML 생성
 * @returns HTML 문자열
 */
export async function generateGuidesListHtml(): Promise<string> {
  try {
    const helpData = await loadHelpData();
    const guides = helpData.guides || [];
    
    let content = `
      <header class="help-header">
        <h1>APE 가이드 문서</h1>
        <p class="help-description">사용 가능한 가이드 문서 목록입니다. 제목을 클릭하면 해당 가이드의 자세한 내용을 볼 수 있습니다.</p>
      </header>

      <div class="guides-list">
    `;

    for (const guide of guides) {
      content += `
        <div class="guide-item">
          <h2 class="guide-title">
            <span class="guide-icon codicon codicon-book"></span>
            <a href="#" onclick="sendCommandToVSCode('help guide ${guide.id}')">${guide.title}</a>
          </h2>
          <div class="guide-description">
            ${guide.content.split('\n')[0].replace(/^#+\s+.*$/, '')}
          </div>
          <div class="guide-action">
            <a href="#" class="read-more-link" onclick="sendCommandToVSCode('help guide ${guide.id}')">
              자세히 읽기 <span class="codicon codicon-arrow-right"></span>
            </a>
          </div>
        </div>
      `;
    }

    content += `
      </div>
      <div class="back-link">
        <a href="#" onclick="sendCommandToVSCode('help')">
          <span class="codicon codicon-arrow-left"></span> 도움말로 돌아가기
        </a>
      </div>
    `;
    
    return getHelpPageHtml(content);
  } catch (error) {
    console.error('가이드 목록 HTML 생성 오류:', error);
    return getHelpPageHtml(`
      <h1>가이드 목록 로드 오류</h1>
      <p>가이드 목록을 로드하는 중 오류가 발생했습니다: ${error}</p>
    `);
  }
}

/**
 * LLM을 사용한 스마트 도움말 생성
 * @param query 사용자 질문
 * @param llmService LLM 서비스 인스턴스
 * @returns HTML 문자열
 */
export async function generateSmartHelpHtml(query: string, llmService: LLMService): Promise<string> {
  try {
    const helpData = await loadHelpData();
    
    // LLM 프롬프트 생성
    const prompt = generateHelpSystemPrompt(helpData, query);
    
    // LLM에 질문 전송
    const result = await llmService.getCompletion(prompt);
    
    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'LLM 응답을 받을 수 없습니다.');
    }
    
    // 마크다운 응답을 HTML로 변환
    const markdownResponse = result.data;
    
    const content = `
      <div class="smart-help">
        <h1>APE 도움말 - ${escapeHtml(query)}</h1>
        <div class="markdown-body">
          ${markdownToHtml(markdownResponse)}
        </div>
      </div>
      <div class="back-link">
        <a href="#" onclick="sendCommandToVSCode('help')">← 도움말로 돌아가기</a>
      </div>
    `;
    
    return getHelpPageHtml(content);
  } catch (error) {
    console.error('스마트 도움말 생성 오류:', error);
    return getHelpPageHtml(`
      <h1>도움말 응답 오류</h1>
      <p>도움말을 생성하는 중 오류가 발생했습니다: ${error}</p>
      <p><a href="#" onclick="sendCommandToVSCode('help')">도움말로 돌아가기</a></p>
    `);
  }
}

/**
 * 도움말 페이지 HTML 래핑
 * @param content 내용 HTML
 * @returns 완성된 HTML 문자열
 */
function getHelpPageHtml(content: string): string {
  return `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>APE 도움말</title>
      <link rel="stylesheet" href="${getCodiconCssUri().toString()}" />
      <style>
        /* 핵심 변수 - Claude.ai 스타일 */
        :root {
          /* 레이아웃 변수 */
          --ape-container-max-width: 960px;
          --ape-content-padding: 1.5rem;
          --ape-mobile-padding: 1rem;

          /* 색상 변수 - VS Code 테마 통합 */
          --ape-bg-primary: var(--vscode-editor-background, #1e1e1e);
          --ape-bg-secondary: var(--vscode-sideBar-background, #252526);
          --ape-bg-tertiary: var(--vscode-dropdown-background, #3c3c3c);
          --ape-bg-hover: var(--vscode-list-hoverBackground, #2a2d2e);
          --ape-bg-active: var(--vscode-list-activeSelectionBackground, #094771);

          /* 경계선 강조 색상 */
          --ape-border-highlight: var(--vscode-button-background, #0e639c);
          --ape-highlight-light: var(--vscode-button-hoverBackground, #1177bb);
          --ape-highlight-dark: #094771;
          --ape-highlight-accent: var(--vscode-textLink-foreground, #3794ff);

          /* 텍스트 색상 */
          --ape-text-primary: var(--vscode-foreground, #cccccc);
          --ape-text-secondary: var(--vscode-descriptionForeground, #8a8a8a);
          --ape-text-accent: var(--vscode-textLink-foreground, #3794ff);
          --ape-text-error: var(--vscode-errorForeground, #f48771);

          /* 강조 색상 */
          --ape-accent-primary: var(--vscode-button-background, #0e639c);
          --ape-accent-secondary: var(--vscode-button-hoverBackground, #1177bb);
          --ape-accent-tertiary: rgba(55, 148, 255, 0.1);

          /* 테두리 및 구분선 */
          --ape-border-subtle: var(--vscode-widget-border, #454545);
          --ape-border-strong: var(--vscode-input-border, #6b6b6b);

          /* 그림자 효과 */
          --ape-shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.1);
          --ape-shadow-md: 0 4px 8px rgba(0, 0, 0, 0.12);
          --ape-shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.14);

          /* 타이포그래피 */
          --ape-font-sans: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif);
          --ape-font-mono: var(--vscode-editor-font-family, 'SF Mono', Monaco, Menlo, Consolas, 'Ubuntu Mono', monospace);

          /* 레이아웃 값 */
          --ape-border-radius-sm: 4px;
          --ape-border-radius-md: 8px;
          --ape-border-radius-lg: 12px;
          --ape-border-radius-full: 9999px;

          /* 애니메이션 */
          --ape-transition-fast: 150ms ease;
          --ape-transition-normal: 250ms ease;
          --ape-transition-slow: 350ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* 기본 레이아웃 - 미니멀 스타일 */
        body {
          font-family: var(--ape-font-sans);
          line-height: 1.6;
          color: var(--ape-text-primary);
          background-color: var(--ape-bg-primary);
          margin: 0;
          padding: 0;
          max-width: var(--ape-container-max-width);
          margin: 0 auto;
          overflow-x: hidden;
          font-size: 14px;
          letter-spacing: -0.011em;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          box-sizing: border-box;
        }

        /* 도움말 콘텐츠 래퍼 */
        .help-content {
          max-width: var(--ape-container-max-width);
          margin: 0 auto;
          padding: 2rem;
        }

        /* 헤더 스타일 - 미니멀 */
        .help-header {
          margin-bottom: 2rem;
          animation: fade-in 0.5s ease-out;
        }

        .help-description {
          color: var(--ape-text-secondary);
          font-size: 15px;
          max-width: 600px;
          margin-bottom: 1.5rem;
        }

        /* 타이포그래피 - 미니멀 */
        h1, h2, h3, h4, h5, h6 {
          color: var(--ape-text-primary);
          margin-top: 2rem;
          margin-bottom: 1rem;
          font-weight: 600;
          line-height: 1.3;
          letter-spacing: -0.02em;
        }

        h1 {
          font-size: 2rem;
          margin-top: 0;
          margin-bottom: 1.5rem;
          font-weight: 700;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--ape-border-subtle);
        }

        h2 {
          font-size: 1.4rem;
          padding-bottom: 0.2rem;
          margin-top: 2rem;
        }

        a {
          color: var(--ape-text-accent);
          text-decoration: none;
          transition: color var(--ape-transition-fast);
          border-radius: var(--ape-border-radius-sm);
        }

        a:hover {
          color: var(--ape-accent-secondary);
          background-color: var(--ape-accent-tertiary);
        }

        p {
          margin: 0 0 1rem 0;
          line-height: 1.6;
        }

        /* 코드 스타일 - 미니멀 */
        code {
          font-family: var(--ape-font-mono);
          padding: 0.2em 0.4em;
          margin: 0;
          font-size: 90%;
          background-color: var(--ape-bg-tertiary);
          border-radius: var(--ape-border-radius-sm);
          color: var(--ape-text-primary);
        }

        pre {
          background-color: var(--ape-bg-tertiary);
          border-radius: var(--ape-border-radius-md);
          padding: 1rem;
          overflow: auto;
          margin-bottom: 1.5rem;
        }

        pre code {
          background-color: transparent;
          padding: 0;
          margin: 0;
          font-size: 13px;
          white-space: pre;
        }

        /* 목록 스타일 */
        ul, ol {
          margin: 0 0 1.5rem 0;
          padding-left: 1.5rem;
        }

        li {
          margin-bottom: 0.5rem;
        }

        /* 명령어 카테고리 - 미니멀 스타일 */
        .help-category {
          margin-bottom: 2.5rem;
          animation: fade-in 0.4s ease-out;
        }

        /* 명령어 그리드 - 미니멀 카드 */
        .command-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        /* 명령어 카드 - 미니멀 */
        .command-card {
          background-color: var(--ape-bg-secondary);
          border-radius: var(--ape-border-radius-md);
          padding: 1.2rem;
          cursor: pointer;
          transition: all var(--ape-transition-normal);
          border: 1px solid var(--ape-border-subtle);
          box-shadow: var(--ape-shadow-sm);
          position: relative;
          overflow: hidden;
        }

        .command-card:hover {
          transform: translateY(-3px);
          box-shadow: var(--ape-shadow-md);
          border-color: var(--ape-border-highlight);
          background-color: var(--ape-bg-secondary);
        }

        .command-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 3px;
          height: 100%;
          background-color: var(--ape-border-highlight);
          opacity: 0;
          transition: opacity var(--ape-transition-fast);
        }

        .command-card:hover::before {
          opacity: 1;
        }

        /* 명령어 이름 - 미니멀 */
        .command-name {
          font-weight: 600;
          margin-bottom: 0.6rem;
          color: var(--ape-text-accent);
          font-family: var(--ape-font-mono);
          font-size: 15px;
          display: flex;
          align-items: center;
        }

        .command-icon {
          font-size: 16px;
          margin-right: 0.5rem;
          position: relative;
          top: 1px;
          color: var(--ape-text-accent);
        }

        .command-text {
          font-weight: 600;
        }

        .command-description {
          margin-bottom: 0.7rem;
          color: var(--ape-text-primary);
          line-height: 1.5;
          font-size: 13px;
        }

        /* 명령어 카드 푸터 - 미니멀 */
        .command-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-top: 0.8rem;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          padding-top: 0.8rem;
          font-size: 12px;
        }

        /* 명령어 별칭 및 예시 - 미니멀 */
        .command-examples {
          font-size: 12px;
          color: var(--ape-text-secondary);
          font-style: italic;
          flex: 1;
        }

        .command-aliases {
          font-size: 11px;
          color: var(--ape-text-accent);
          background-color: rgba(55, 148, 255, 0.1);
          border-radius: var(--ape-border-radius-full);
          padding: 0.1rem 0.6rem;
          margin-left: 0.5rem;
          white-space: nowrap;
        }

        /* 클릭 가능한 명령어 */
        .clickable-command {
          cursor: pointer;
          transition: all var(--ape-transition-fast);
        }

        .clickable-command:hover {
          color: var(--ape-text-accent);
          background-color: var(--ape-accent-tertiary);
          padding: 0.2em 0.4em;
          border-radius: var(--ape-border-radius-sm);
        }

        /* 명령어 상세 페이지 */
        .command-detail {
          max-width: 800px;
          margin: 0 auto;
          animation: fade-in 0.4s ease-out;
        }

        .detail-section {
          margin-bottom: 1.8rem;
          padding-bottom: 1.2rem;
          border-bottom: 1px solid var(--ape-border-subtle);
        }

        .detail-section h2 {
          font-size: 1.2rem;
          margin-bottom: 1rem;
          color: var(--ape-text-accent);
        }

        .detail-section p {
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 1rem;
        }

        .command-usage {
          background-color: var(--ape-bg-tertiary);
          border-radius: var(--ape-border-radius-md);
          padding: 1rem;
          margin-bottom: 0.5rem;
          font-family: var(--ape-font-mono);
          font-size: 14px;
          color: var(--ape-text-primary);
        }

        .command-examples-list {
          margin: 0;
          padding-left: 1.5rem;
        }

        .command-examples-list li {
          margin-bottom: 0.6rem;
        }

        .command-examples-list code {
          font-size: 13px;
          color: var(--ape-text-primary);
        }

        .command-aliases-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.6rem;
        }

        .detail-alias {
          font-family: var(--ape-font-mono);
          font-size: 13px;
          background-color: var(--ape-accent-tertiary);
          color: var(--ape-text-accent);
          padding: 0.3rem 0.8rem;
          border-radius: var(--ape-border-radius-full);
        }

        .related-commands {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .related-command {
          background-color: var(--ape-accent-tertiary);
          color: var(--ape-text-accent);
          padding: 0.3rem 0.8rem;
          border-radius: var(--ape-border-radius-full);
          font-size: 13px;
          transition: all var(--ape-transition-fast);
        }

        .related-command:hover {
          background-color: var(--ape-accent-primary);
          color: white;
        }

        /* 퀵 액션 섹션 - 미니멀 디자인 */
        .quick-actions {
          margin: 1.5rem 0 2.5rem;
          background-color: rgba(55, 148, 255, 0.05);
          border-radius: var(--ape-border-radius-lg);
          padding: 1.5rem;
          border: 1px solid var(--ape-border-subtle);
          animation: fade-in 0.4s ease-out;
        }

        .quick-actions h2 {
          margin-top: 0;
          margin-bottom: 1rem;
          font-size: 16px;
          color: var(--ape-text-primary);
          font-weight: 600;
          letter-spacing: -0.01em;
        }

        .quick-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 0.6rem;
        }

        /* 퀵 버튼 - 미니멀 디자인 */
        .quick-button {
          display: flex;
          align-items: center;
          padding: 0.6rem 1.2rem;
          border-radius: var(--ape-border-radius-md);
          cursor: pointer;
          font-weight: 500;
          border: none;
          font-size: 13px;
          transition: all var(--ape-transition-normal);
          color: white;
          box-shadow: var(--ape-shadow-sm);
        }

        .quick-button:hover {
          transform: translateY(-2px);
          box-shadow: var(--ape-shadow-md);
          filter: brightness(1.1);
        }

        .quick-button .codicon {
          margin-right: 0.5rem;
          font-size: 16px;
        }

        /* 퀵 버튼 색상 */
        .quick-button.git {
          background-color: #F05033;
        }

        .quick-button.code {
          background-color: #007ACC;
        }

        .quick-button.utility {
          background-color: #6C757D;
        }

        .quick-button.model {
          background-color: #28A745;
        }

        /* 돌아가기 링크 */
        .back-link {
          margin-top: 2rem;
          padding-top: 1rem;
          border-top: 1px solid var(--ape-border-subtle);
          font-size: 14px;
        }

        .back-link a {
          display: inline-flex;
          align-items: center;
          color: var(--ape-text-accent);
          padding: 0.5rem 0.8rem;
          background-color: var(--ape-accent-tertiary);
          border-radius: var(--ape-border-radius-md);
          transition: all var(--ape-transition-fast);
        }

        .back-link a:hover {
          background-color: var(--ape-accent-primary);
          color: white;
          text-decoration: none;
        }

        /* FAQ 스타일 - 미니멀 */
        .faq-list {
          margin-top: 2rem;
          animation: fade-in 0.4s ease-out;
        }

        .faq-item {
          margin-bottom: 1.5rem;
          border-bottom: 1px solid var(--ape-border-subtle);
          padding-bottom: 1.5rem;
        }

        .faq-question {
          font-weight: 600;
          font-size: 16px;
          margin-bottom: 0.8rem;
          color: var(--ape-text-accent);
          display: flex;
          align-items: center;
        }

        .faq-icon {
          margin-right: 0.5rem;
          font-size: 14px;
          background-color: var(--ape-accent-tertiary);
          color: var(--ape-text-accent);
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--ape-border-radius-full);
        }

        .faq-answer {
          font-size: 14px;
          line-height: 1.6;
        }

        /* 가이드 목록 - 미니멀 */
        .guides-list {
          margin-top: 2rem;
          animation: fade-in 0.4s ease-out;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
          gap: 1.5rem;
        }

        .guide-item {
          margin-bottom: 0;
          background-color: var(--ape-bg-secondary);
          border-radius: var(--ape-border-radius-md);
          padding: 1.5rem;
          border: 1px solid var(--ape-border-subtle);
          box-shadow: var(--ape-shadow-sm);
          transition: all var(--ape-transition-normal);
        }

        .guide-item:hover {
          transform: translateY(-3px);
          border-color: var(--ape-border-highlight);
          box-shadow: var(--ape-shadow-md);
        }

        .guide-title {
          font-size: 18px;
          margin-bottom: 0.8rem;
          margin-top: 0;
          display: flex;
          align-items: center;
        }

        .guide-icon {
          margin-right: 0.6rem;
          font-size: 16px;
          color: var(--ape-text-accent);
          background-color: var(--ape-accent-tertiary);
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--ape-border-radius-md);
        }

        .guide-title a {
          color: var(--ape-text-accent);
        }

        .guide-description {
          font-size: 14px;
          line-height: 1.6;
          color: var(--ape-text-secondary);
          margin-bottom: 1.2rem;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          position: relative;
          max-height: 4.8em;
        }

        .guide-action {
          text-align: right;
          margin-top: 1.2rem;
          border-top: 1px solid var(--ape-border-subtle);
          padding-top: 1rem;
        }

        .read-more-link {
          font-size: 13px;
          color: var(--ape-text-accent);
          display: inline-flex;
          align-items: center;
          transition: all var(--ape-transition-fast);
          padding: 0.4rem 0.8rem;
          border-radius: var(--ape-border-radius-md);
          background-color: var(--ape-accent-tertiary);
        }

        .read-more-link .codicon {
          margin-left: 0.4rem;
          font-size: 12px;
          transition: transform var(--ape-transition-fast);
        }

        .read-more-link:hover {
          background-color: var(--ape-accent-primary);
          color: white;
          text-decoration: none;
        }

        .read-more-link:hover .codicon {
          transform: translateX(3px);
        }

        /* 마크다운 콘텐츠 스타일 */
        .markdown-body {
          line-height: 1.6;
          font-size: 14px;
        }

        .markdown-body img {
          max-width: 100%;
          border-radius: var(--ape-border-radius-md);
          margin: 1.5rem 0;
        }

        .markdown-body blockquote {
          padding: 0.8rem 1.2rem;
          color: var(--ape-text-secondary);
          border-left: 4px solid var(--ape-border-highlight);
          margin: 1.2rem 0;
          background-color: rgba(55, 148, 255, 0.05);
          border-radius: 0 var(--ape-border-radius-md) var(--ape-border-radius-md) 0;
        }

        .markdown-body table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5rem 0;
          overflow-x: auto;
          display: block;
        }

        .markdown-body table th,
        .markdown-body table td {
          padding: 0.6rem 1rem;
          border: 1px solid var(--ape-border-subtle);
        }

        .markdown-body table th {
          background-color: var(--ape-bg-tertiary);
          font-weight: 600;
        }

        .markdown-body table tr:nth-child(2n) {
          background-color: rgba(0, 0, 0, 0.1);
        }

        /* 애니메이션 */
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* 반응형 디자인 */
        @media (max-width: 768px) {
          .help-content {
            padding: 1.2rem;
          }

          .command-grid {
            grid-template-columns: 1fr;
          }

          .quick-buttons {
            flex-direction: column;
          }

          .quick-button {
            width: 100%;
          }

          .guides-list {
            grid-template-columns: 1fr;
          }

          .guide-action {
            text-align: center;
          }

          .command-detail {
            padding: 0 0.5rem;
          }

          .related-commands {
            flex-direction: column;
          }

          .related-command {
            margin-bottom: 0.5rem;
            text-align: center;
          }
        }

        @media (max-width: 480px) {
          .help-content {
            padding: 1rem;
          }

          h1 {
            font-size: 1.8rem;
          }

          .command-card-footer {
            flex-direction: column;
          }

          .command-aliases {
            margin: 0.5rem 0 0 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="help-content">
        ${content}
      </div>
      
      <script>
        // VS Code API와 통신
        const vscode = acquireVsCodeApi();
        
        // 명령어 VS Code로 전송
        function sendCommandToVSCode(command) {
          vscode.postMessage({
            type: 'command',
            command: command
          });
        }
        
        // 채팅창에 명령어 입력
        function insertCommandToChatInput(command) {
          vscode.postMessage({
            type: 'insertCommand',
            command: command
          });
        }
        
        // 명령어 카드 클릭 시 명령어 입력
        document.addEventListener('click', (event) => {
          const target = event.target;
          
          // 명령어 카드 클릭 처리
          const commandCard = target.closest('.command-card');
          if (commandCard) {
            const cmdName = commandCard.querySelector('.command-name')?.textContent;
            if (cmdName) {
              insertCommandToChatInput(cmdName);
            }
          }
          
          // A 태그 이벤트 처리
          if (target.tagName === 'A' && target.getAttribute('href') === '#') {
            event.preventDefault();
            // 이벤트 처리는 각 요소의 onclick에서 처리
          }
        });
        
        // 코드 블록 내 명령어 클릭 처리
        document.querySelectorAll('code').forEach(codeElement => {
          if (codeElement.textContent.startsWith('/')) {
            codeElement.classList.add('clickable-command');
            codeElement.addEventListener('click', () => {
              insertCommandToChatInput(codeElement.textContent);
            });
          }
        });
      </script>
    </body>
    </html>
  `;
}

/**
 * HTML 이스케이프
 * @param unsafe 이스케이프할 문자열
 * @returns 이스케이프된 문자열
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * 카테고리별 Codicon 아이콘 이름 가져오기
 * @param category 카테고리 ID
 * @returns Codicon 아이콘 이름
 */
function getCategoryIcon(category: string): string {
  switch (category) {
    case 'general':
      return 'info';
    case 'git':
      return 'git-commit';
    case 'code':
      return 'code';
    case 'utility':
      return 'tools';
    case 'advanced':
      return 'settings-gear';
    default:
      return 'symbol-event';
  }
}

/**
 * 도구별 미니멀 아이콘 가져오기
 * @param toolName 도구 이름
 * @returns 미니멀 아이콘
 */
function getToolEmoji(toolName: string): string {
  switch (toolName) {
    case 'Bash':
      return '▶';     // 터미널 실행
    case 'Batch':
      return '⧉';     // 병렬 실행
    case 'Glob':
      return '◎';     // 검색 조회
    case 'Grep':
      return '⌕';     // 내용 검색
    case 'LS':
      return '⊞';     // 디렉토리 목록
    case 'Read':
      return '◯';     // 파일 읽기
    case 'Edit':
      return '✎';     // 편집
    case 'MultiEdit':
      return '⧠';     // 다중 편집
    case 'Write':
      return '⊕';     // 새 파일 생성
    case 'TodoRead':
      return '☰';     // 할일 목록
    case 'TodoWrite':
      return '✓';     // 할일 완료
    case 'WebFetch':
      return '⇥';     // 웹 가져오기
    case 'WebSearch':
      return '⌕';     // 웹 검색
    case 'Task':
      return '◈';     // 작업 실행
    default:
      return '◇';     // 기본 도구
  }
}

/**
 * 마크다운을 HTML로 변환 (간단 구현)
 */
function markdownToHtml(markdown: string): string {
  return markdown
    // 헤더 변환
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^##### (.+)$/gm, '<h5>$1</h5>')
    .replace(/^###### (.+)$/gm, '<h6>$1</h6>')

    // 코드 블록 변환
    .replace(/```([a-z]*)\n([\s\S]*?)\n```/g, '<pre><code class="language-$1">$2</code></pre>')

    // 인라인 코드 변환
    .replace(/`([^`]+)`/g, '<code>$1</code>')

    // 볼드 텍스트 변환
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')

    // 이탤릭 텍스트 변환
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')

    // 목록 변환
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^([0-9]+)\. (.+)$/gm, '<li>$2</li>')
    .replace(/(<li>.*<\/li>\n)+/g, '<ul>$&</ul>')

    // 링크 변환
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

    // 줄바꿈 변환
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')

    // 단락 감싸기
    .replace(/^(.+?)(?=<\/p>|<h[1-6]|<ul>|$)/s, '<p>$1</p>');
}

/**
 * Agent 도구 목록 HTML 생성
 * @returns HTML 문자열
 */
export async function generateToolsHelpHtml(): Promise<string> {
  try {
    // 도구 페이지 스타일
    const toolsPageStyle = `
      .tools-page {
        max-width: 900px;
        margin: 0 auto;
        padding: 10px 0;
      }
      
      .tools-page h1 {
        text-align: center;
        margin-bottom: 30px;
        color: var(--vscode-editor-foreground);
        font-size: 32px;
      }
      
      .tools-page p {
        text-align: center;
        margin-bottom: 40px;
        line-height: 1.6;
        color: var(--text-color);
        opacity: 0.8;
      }
      
      .tools-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 24px;
        margin-bottom: 40px;
      }
      
      .tool-card {
        background-color: var(--bg-color);
        border-radius: var(--modern-radius);
        padding: 24px;
        box-shadow: var(--modern-card-shadow);
        transition: var(--modern-transition);
        border: 1px solid rgba(0, 0, 0, 0.05);
        cursor: pointer;
        position: relative;
        overflow: hidden;
      }
      
      .tool-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 4px;
        background: linear-gradient(90deg, var(--modern-accent), #7C4DFF);
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      
      .tool-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      }
      
      .tool-card:hover::before {
        opacity: 1;
      }
      
      .tool-header {
        display: flex;
        align-items: center;
        margin-bottom: 16px;
      }
      
      .tool-icon {
        margin-right: 12px;
        font-size: 24px;
        color: var(--modern-accent);
        background-color: var(--modern-accent-light);
        width: 40px;
        height: 40px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: var(--modern-transition);
      }
      
      .tool-card:hover .tool-icon {
        transform: scale(1.1);
        background-color: var(--modern-accent);
        color: white;
      }
      
      .tool-icon-svg {
        width: 24px;
        height: 24px;
        filter: var(--vscode-editor-foreground-filter, none);
      }
      
      .tool-name {
        font-size: 18px;
        font-weight: 600;
        color: var(--heading-color);
      }
      
      .tool-description {
        font-size: 14px;
        color: var(--text-color);
        opacity: 0.8;
        line-height: 1.6;
        margin-bottom: 16px;
      }
      
      .tool-examples {
        background-color: var(--card-bg-color);
        border-radius: 8px;
        padding: 10px;
      }
      
      .tool-examples-title {
        font-size: 13px;
        font-weight: 600;
        color: var(--heading-color);
        margin-bottom: 8px;
      }
      
      .tool-examples-list {
        font-size: 12px;
        color: var(--text-color);
        opacity: 0.8;
        line-height: 1.5;
      }
      
      .tool-examples-list li {
        margin-bottom: 4px;
      }
      
      /* 다크 모드 조정 */
      .vscode-dark .tool-card {
        background-color: var(--bg-color);
        border-color: rgba(255, 255, 255, 0.1);
      }
      
      .vscode-dark .tool-examples {
        background-color: rgba(30, 30, 30, 0.6);
      }
      
      /* 반응형 */
      @media (max-width: 768px) {
        .tools-grid {
          grid-template-columns: 1fr;
        }
      }
    `;
    
    // 도구 데이터 목록
    const tools = [
      {
        name: 'Bash',
        description: '쉘 명령을 실행하여 파일 시스템을 조작하고 시스템 작업을 수행합니다.',
        icon: 'terminal',
        examples: ['디렉터리 내용 나열', '파일 이동 및 복사', '시스템 정보 조회']
      },
      {
        name: 'Batch',
        description: '여러 도구 호출을 병렬로 실행하여 작업 속도를 향상시킵니다.',
        icon: 'layers',
        examples: ['여러 파일 동시 읽기', '복수 Bash 명령 실행', '병렬 검색 수행']
      },
      {
        name: 'Glob',
        description: '패턴 매칭을 사용하여 파일 시스템에서 파일을 검색합니다.',
        icon: 'filter',
        examples: ['.js 파일 찾기', '특정 디렉터리 내 파일 검색', '제외 패턴 사용']
      },
      {
        name: 'Grep',
        description: '파일 내용에서 정규식 패턴을 검색합니다.',
        icon: 'search',
        examples: ['함수 정의 찾기', '오류 메시지 검색', '코드 패턴 식별']
      },
      {
        name: 'LS',
        description: '디렉터리 내용을 나열하여 파일과 폴더를 표시합니다.',
        icon: 'folder-opened',
        examples: ['디렉터리 구조 확인', '숨겨진 파일 표시', '파일 메타데이터 확인']
      },
      {
        name: 'Read',
        description: '파일 내용을 읽어 텍스트로 표시합니다.',
        icon: 'preview',
        examples: ['소스 코드 읽기', '구성 파일 검사', '로그 파일 분석']
      },
      {
        name: 'Edit',
        description: '파일 내용을 수정하고 변경 사항을 저장합니다.',
        icon: 'edit',
        examples: ['코드 버그 수정', '구성 설정 업데이트', '문서 수정']
      },
      {
        name: 'MultiEdit',
        description: '여러 편집 작업을 단일 파일에 원자적으로 적용합니다.',
        icon: 'multiple-edit',
        examples: ['여러 코드 섹션 수정', '클래스/함수 이름 변경', '여러 버그 한 번에 수정']
      },
      {
        name: 'Write',
        description: '새 파일을 생성하거나 기존 파일을 덮어씁니다.',
        icon: 'new-file',
        examples: ['새 소스 파일 생성', '구성 파일 작성', '로그 파일 생성']
      },
      {
        name: 'WebFetch',
        description: '웹 URL에서 콘텐츠를 가져와 분석합니다.',
        icon: 'globe',
        examples: ['API 문서 읽기', '웹 페이지 콘텐츠 분석', '외부 데이터 가져오기']
      },
      {
        name: 'WebSearch',
        description: '인터넷에서 최신 정보를 검색합니다.',
        icon: 'web-search',
        examples: ['기술 문서 찾기', '오류 솔루션 검색', '라이브러리 사용법 검색']
      },
      {
        name: 'TodoRead',
        description: '세션의 현재 할 일 목록을 읽습니다.',
        icon: 'list-selection',
        examples: ['작업 진행 상황 확인', '남은 작업 파악', '작업 우선순위 확인']
      },
      {
        name: 'TodoWrite',
        description: '할 일 목록을 업데이트하고 작업 상태를 관리합니다.',
        icon: 'checklist',
        examples: ['새 작업 추가', '작업 상태 업데이트', '완료된 작업 표시']
      },
      {
        name: 'Task',
        description: '하위 에이전트를 실행하여 독립적인 작업을 수행합니다.',
        icon: 'agent',
        examples: ['코드베이스 검색', '복잡한의 작업 위임', '배경 분석 수행']
      }
    ];
    
    // HTML 생성
    let content = `
      <div class="tools-page">
        <h1>APE 지원 도구</h1>
        <p>APE에서 사용할 수 있는 다양한 Agent 도구 목록입니다. 이러한 도구를 활용하여 코드 작성, 검색, 분석 등 다양한 작업을 수행할 수 있습니다.</p>
        
        <div class="tools-grid">
    `;
    
    // 각 도구별 카드 생성
    for (const tool of tools) {
      // 미니멀 아이콘 사용
      const iconEmoji = getToolEmoji(tool.name);
      const iconHtml = `<div class="tool-icon minimal-icon">${iconEmoji}</div>`;
      
      content += `
        <div class="tool-card">
          <div class="tool-header">
            ${iconHtml}
            <div class="tool-name">${tool.name}</div>
          </div>
          <div class="tool-description">${tool.description}</div>
          
          <div class="tool-examples">
            <div class="tool-examples-title">주요 사용 사례</div>
            <ul class="tool-examples-list">
              ${tool.examples.map(ex => `<li>${ex}</li>`).join('')}
            </ul>
          </div>
        </div>
      `;
    }
    
    content += `
        </div>
        
        <div class="back-link">
          <a href="#" onclick="sendCommandToVSCode('help')">← 도움말로 돌아가기</a>
        </div>
      </div>
    `;
    
    // 전체 HTML 생성
    return getHelpPageHtml(toolsPageStyle + content);
  } catch (error) {
    console.error('Agent 도구 HTML 생성 오류:', error);
    return getHelpPageHtml(`
      <h1>도구 목록 로드 오류</h1>
      <p>도구 목록을 로드하는 중 오류가 발생했습니다: ${error}</p>
      <div class="back-link">
        <a href="#" onclick="sendCommandToVSCode('help')">← 도움말로 돌아가기</a>
      </div>
    `);
  }
}