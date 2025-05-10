"use strict";
/**
 * 도움말 렌더러
 *
 * 도움말 데이터를 웹뷰에 표시하기 위한 HTML로 변환합니다.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.setExtensionContext = setExtensionContext;
exports.loadHelpData = loadHelpData;
exports.getCommandData = getCommandData;
exports.getCommandsByCategory = getCommandsByCategory;
exports.generateHelpHtml = generateHelpHtml;
exports.generateCommandDetailHtml = generateCommandDetailHtml;
exports.generateFaqHtml = generateFaqHtml;
exports.generateGuideHtml = generateGuideHtml;
exports.generateGuidesListHtml = generateGuidesListHtml;
exports.generateSmartHelpHtml = generateSmartHelpHtml;
exports.generateToolsHelpHtml = generateToolsHelpHtml;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
// vscode 확장 인스턴스 캐시
// 현재 사용되지 않지만 향후 사용 가능성이 있어 주석으로 유지
// let _extensionContext: vscode.ExtensionContext | undefined;
/**
 * 확장 컨텍스트 설정
 */
function setExtensionContext() {
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
function getCodiconCssUri() {
    const extension = vscode.extensions.getExtension('ape-team.ape-extension');
    if (!extension) {
        throw new Error('APE 확장을 찾을 수 없습니다');
    }
    return vscode.Uri.joinPath(extension.extensionUri, 'media', 'codicon', 'codicon.css');
}
const helpSystemPrompt_1 = require("../../data/helpSystemPrompt");
// 도움말 데이터 캐시
let helpDataCache = null;
/**
 * 도움말 데이터 로드
 * @returns 도움말 데이터 객체
 */
async function loadHelpData() {
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
    }
    catch (error) {
        console.error('도움말 데이터 로드 오류:', error);
        throw new Error('도움말 데이터를 로드할 수 없습니다.');
    }
}
/**
 * 특정 명령어 데이터 가져오기
 * @param commandName 명령어 이름
 * @returns 명령어 데이터 객체
 */
async function getCommandData(commandName) {
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
    }
    catch (error) {
        console.error('명령어 데이터 검색 오류:', error);
        return null;
    }
}
/**
 * 카테고리별 명령어 목록 가져오기
 * @param categoryId 카테고리 ID (옵션)
 * @returns 카테고리별 명령어 목록
 */
async function getCommandsByCategory(categoryId) {
    try {
        const helpData = await loadHelpData();
        // 특정 카테고리 요청 시
        if (categoryId) {
            const category = helpData.categories.find((c) => c.id === categoryId);
            return category ? [category] : [];
        }
        // 모든 카테고리 반환
        return helpData.categories;
    }
    catch (error) {
        console.error('카테고리별 명령어 목록 가져오기 오류:', error);
        return [];
    }
}
/**
 * 도움말 HTML 생성 (기본 카테고리 목록)
 * @param categoryId 카테고리 ID (옵션)
 * @returns HTML 문자열
 */
async function generateHelpHtml(categoryId) {
    try {
        const categories = await getCommandsByCategory(categoryId);
        let content = `
      <h1>APE 도움말</h1>
      <p>사용 가능한 명령어 목록입니다. 각 명령어에 대한 자세한 정보를 보려면 명령어를 클릭하세요.</p>
      
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
                // 명령어 요약 카드
                content += `
          <div class="command-card" onclick="sendCommandToVSCode('${command.name}')">
            <div class="command-name">
              <span class="command-icon codicon codicon-${iconName}"></span>
              <span class="command-text">/${command.name}</span>
            </div>
            <div class="command-description">${command.description}</div>
            ${command.examples && command.examples.length > 0 ?
                    `<div class="command-examples">예시: ${command.examples[0]}</div>` : ''}
            ${command.aliases && command.aliases.length > 0 ?
                    `<div class="command-aliases">별칭: ${command.aliases.map((a) => `/${a}`).join(', ')}</div>` : ''}
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
    }
    catch (error) {
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
async function generateCommandDetailHtml(commandName) {
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
      <div class="command-detail">
        <h1>/${commandData.name}</h1>
        <div class="command-description">${commandData.description}</div>
        
        <h2>상세 정보</h2>
        <p>${commandData.longDescription || commandData.description}</p>
        
        <h2>사용법</h2>
        <div class="command-usage">
          <code>${commandData.usage || `/${commandData.name}`}</code>
        </div>
    `;
        // 예시
        if (commandData.examples && commandData.examples.length > 0) {
            content += `
        <h2>예시</h2>
        <ul class="command-examples-list">
          ${commandData.examples.map((example) => `<li><code>${example}</code></li>`).join('')}
        </ul>
      `;
        }
        // 별칭
        if (commandData.aliases && commandData.aliases.length > 0) {
            content += `
        <h2>별칭</h2>
        <div class="command-aliases">
          ${commandData.aliases.map((alias) => `<code>/${alias}</code>`).join(', ')}
        </div>
      `;
        }
        // 관련 명령어
        if (commandData.related && commandData.related.length > 0) {
            content += `
        <h2>관련 명령어</h2>
        <div class="related-commands">
          ${commandData.related.map((cmd) => `<a href="#" class="related-command" onclick="sendCommandToVSCode('${cmd}')">${cmd}</a>`).join(', ')}
        </div>
      `;
        }
        content += `
      </div>
      <div class="back-link">
        <a href="#" onclick="sendCommandToVSCode('help')">← 모든 명령어 보기</a>
      </div>
    `;
        return getHelpPageHtml(content);
    }
    catch (error) {
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
async function generateFaqHtml() {
    try {
        const helpData = await loadHelpData();
        const faqs = helpData.faq || [];
        let content = `
      <h1>APE 자주 묻는 질문 (FAQ)</h1>
      <div class="faq-list">
    `;
        for (const faq of faqs) {
            content += `
        <div class="faq-item">
          <div class="faq-question">${faq.question}</div>
          <div class="faq-answer">${faq.answer}</div>
        </div>
      `;
        }
        content += `
      </div>
      <div class="back-link">
        <a href="#" onclick="sendCommandToVSCode('help')">← 도움말로 돌아가기</a>
      </div>
    `;
        return getHelpPageHtml(content);
    }
    catch (error) {
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
async function generateGuideHtml(guideId) {
    try {
        const helpData = await loadHelpData();
        const guides = helpData.guides || [];
        const guide = guides.find((g) => g.id === guideId);
        if (!guide) {
            return getHelpPageHtml(`
        <h1>가이드를 찾을 수 없음</h1>
        <p>'${guideId}' 가이드를 찾을 수 없습니다.</p>
        <p><a href="#" onclick="sendCommandToVSCode('help guides')">모든 가이드 보기</a></p>
      `);
        }
        // 마크다운 형식 그대로 표시
        const content = `
      <div class="guide-content markdown-body">
        ${guide.content}
      </div>
      <div class="back-link">
        <a href="#" onclick="sendCommandToVSCode('help guides')">← 모든 가이드 보기</a>
      </div>
    `;
        return getHelpPageHtml(content);
    }
    catch (error) {
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
async function generateGuidesListHtml() {
    try {
        const helpData = await loadHelpData();
        const guides = helpData.guides || [];
        let content = `
      <h1>APE 가이드 문서</h1>
      <p>사용 가능한 가이드 문서 목록입니다. 각 가이드에 대한 자세한 정보를 보려면 제목을 클릭하세요.</p>
      <div class="guides-list">
    `;
        for (const guide of guides) {
            content += `
        <div class="guide-item">
          <h2 class="guide-title">
            <a href="#" onclick="sendCommandToVSCode('help guide ${guide.id}')">${guide.title}</a>
          </h2>
          <div class="guide-description">
            ${guide.content.split('\n')[0].replace(/^#+\s+.*$/, '')}
          </div>
        </div>
      `;
        }
        content += `
      </div>
      <div class="back-link">
        <a href="#" onclick="sendCommandToVSCode('help')">← 도움말로 돌아가기</a>
      </div>
    `;
        return getHelpPageHtml(content);
    }
    catch (error) {
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
async function generateSmartHelpHtml(query, llmService) {
    try {
        const helpData = await loadHelpData();
        // LLM 프롬프트 생성
        const prompt = (0, helpSystemPrompt_1.generateHelpSystemPrompt)(helpData, query);
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
    }
    catch (error) {
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
function getHelpPageHtml(content) {
    return `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>APE 도움말</title>
      <link rel="stylesheet" href="${getCodiconCssUri().toString()}" />
      <style>
        :root {
          --bg-color: var(--vscode-editor-background, #ffffff);
          --text-color: var(--vscode-editor-foreground, #333333);
          --link-color: var(--vscode-textLink-foreground, #3794ff);
          --heading-color: var(--vscode-editor-foreground, #333333);
          --border-color: var(--vscode-panel-border, #e7e7e7);
          --accent-color: var(--vscode-button-background, #0e639c);
          --accent-hover-color: var(--vscode-button-hoverBackground, #1177bb);
          --card-bg-color: var(--vscode-editor-inactiveSelectionBackground, #f5f5f5);
          --code-bg-color: var(--vscode-textBlockQuote-background, #f1f1f1);
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          line-height: 1.6;
          color: var(--text-color);
          background-color: var(--bg-color);
          margin: 0;
          padding: 20px;
          max-width: 1000px;
          margin: 0 auto;
        }
        
        h1, h2, h3, h4, h5, h6 {
          color: var(--heading-color);
          margin-top: 24px;
          margin-bottom: 16px;
          font-weight: 600;
          line-height: 1.25;
        }
        
        h1 {
          font-size: 2em;
          padding-bottom: 0.3em;
          border-bottom: 1px solid var(--border-color);
        }
        
        h2 {
          font-size: 1.5em;
          padding-bottom: 0.3em;
        }
        
        a {
          color: var(--link-color);
          text-decoration: none;
        }
        
        a:hover {
          text-decoration: underline;
        }
        
        p {
          margin-top: 0;
          margin-bottom: 16px;
        }
        
        code {
          font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, Courier, monospace;
          padding: 0.2em 0.4em;
          margin: 0;
          font-size: 85%;
          background-color: var(--code-bg-color);
          border-radius: 3px;
        }
        
        pre {
          background-color: var(--code-bg-color);
          border-radius: 3px;
          padding: 16px;
          overflow: auto;
        }
        
        pre code {
          background-color: transparent;
          padding: 0;
          margin: 0;
          font-size: 100%;
          word-break: normal;
          white-space: pre;
        }
        
        ul, ol {
          margin-top: 0;
          margin-bottom: 16px;
          padding-left: 2em;
        }
        
        li {
          margin-top: 0.25em;
        }
        
        .help-category {
          margin-bottom: 30px;
        }
        
        .command-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }
        
        .command-card {
          background-color: var(--card-bg-color);
          border-radius: 8px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid var(--border-color);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          position: relative;
          overflow: hidden;
        }
        
        .command-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          border-color: var(--accent-color);
        }
        
        .command-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background-color: var(--accent-color);
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        
        .command-card:hover::before {
          opacity: 1;
        }
        
        .clickable-command {
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .clickable-command:hover {
          color: var(--accent-color);
          text-decoration: underline;
        }
        
        .command-name {
          font-weight: bold;
          margin-bottom: 10px;
          color: var(--accent-color);
          font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, Courier, monospace;
          font-size: 1.1em;
          display: flex;
          align-items: center;
        }
        
        .command-description {
          margin-bottom: 10px;
          color: var(--text-color);
          line-height: 1.4;
        }
        
        .command-examples {
          font-size: 0.85em;
          color: var(--vscode-descriptionForeground, #747474);
          font-style: italic;
          padding: 4px 0;
        }
        
        .command-aliases {
          font-size: 0.85em;
          color: var(--vscode-descriptionForeground, #747474);
          background-color: var(--code-bg-color);
          border-radius: 3px;
          padding: 2px 6px;
          display: inline-block;
          margin-top: 4px;
        }
        
        .command-icon {
          font-size: 1em;
          margin-right: 6px;
          position: relative;
          top: 1px;
        }
        
        .command-text {
          font-weight: bold;
        }
        
        .command-usage {
          margin-bottom: 16px;
        }
        
        .command-aliases, .related-commands {
          margin-bottom: 16px;
        }
        
        .related-command {
          margin-right: 8px;
        }
        
        .back-link {
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid var(--border-color);
        }
        
        .faq-list {
          margin-top: 24px;
        }
        
        .faq-item {
          margin-bottom: 24px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 16px;
        }
        
        .faq-question {
          font-weight: 600;
          font-size: 1.2em;
          margin-bottom: 8px;
          color: var(--accent-color);
        }
        
        .guides-list {
          margin-top: 24px;
        }
        
        .guide-item {
          margin-bottom: 24px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 16px;
        }
        
        .guide-title {
          margin-bottom: 8px;
        }
        
        .guide-description {
          margin-bottom: 8px;
        }
        
        .markdown-body {
          line-height: 1.6;
        }
        
        .markdown-body img {
          max-width: 100%;
          box-sizing: content-box;
        }
        
        .markdown-body blockquote {
          padding: 0 1em;
          color: var(--vscode-editor-foreground, #6a737d);
          border-left: 0.25em solid var(--vscode-panel-border, #dfe2e5);
          margin: 0 0 16px 0;
        }
        
        .markdown-body table {
          display: block;
          width: 100%;
          overflow: auto;
          border-collapse: collapse;
          margin-bottom: 16px;
        }
        
        .markdown-body table th,
        .markdown-body table td {
          padding: 6px 13px;
          border: 1px solid var(--vscode-panel-border, #dfe2e5);
        }
        
        .markdown-body table tr {
          background-color: var(--bg-color);
          border-top: 1px solid var(--vscode-panel-border, #c6cbd1);
        }
        
        .markdown-body table tr:nth-child(2n) {
          background-color: var(--vscode-editor-inactiveSelectionBackground, #f6f8fa);
        }
        
        /* 퀵 액션 스타일 */
        .quick-actions {
          margin: 20px 0 30px;
          background-color: var(--vscode-editor-inactiveSelectionBackground, #f6f8fa);
          border-radius: 8px;
          padding: 16px;
          border: 1px solid var(--border-color);
        }
        
        .quick-actions h2 {
          margin-top: 0;
          font-size: 1.3em;
          color: var(--accent-color);
          padding-left: 4px;
        }
        
        .quick-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        
        .quick-button {
          display: flex;
          align-items: center;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          border: none;
          min-width: 120px;
          font-size: 0.95em;
          transition: all 0.2s ease;
          color: white;
        }
        
        .quick-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }
        
        .quick-button .codicon {
          margin-right: 8px;
          font-size: 1.2em;
        }
        
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
function escapeHtml(unsafe) {
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
function getCategoryIcon(category) {
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
function getToolEmoji(toolName) {
    switch (toolName) {
        case 'Bash':
            return '▶'; // 터미널 실행
        case 'Batch':
            return '⧉'; // 병렬 실행
        case 'Glob':
            return '◎'; // 검색 조회
        case 'Grep':
            return '⌕'; // 내용 검색
        case 'LS':
            return '⊞'; // 디렉토리 목록
        case 'Read':
            return '◯'; // 파일 읽기
        case 'Edit':
            return '✎'; // 편집
        case 'MultiEdit':
            return '⧠'; // 다중 편집
        case 'Write':
            return '⊕'; // 새 파일 생성
        case 'TodoRead':
            return '☰'; // 할일 목록
        case 'TodoWrite':
            return '✓'; // 할일 완료
        case 'WebFetch':
            return '⇥'; // 웹 가져오기
        case 'WebSearch':
            return '⌕'; // 웹 검색
        case 'Task':
            return '◈'; // 작업 실행
        default:
            return '◇'; // 기본 도구
    }
}
/**
 * 마크다운을 HTML로 변환 (간단 구현)
 */
function markdownToHtml(markdown) {
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
async function generateToolsHelpHtml() {
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
    }
    catch (error) {
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
//# sourceMappingURL=helpRenderer.js.map