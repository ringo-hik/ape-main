import * as vscode from 'vscode';

/**
 * 웹뷰 HTML 헤더 생성
 * @param webview VSCode 웹뷰
 * @param extensionUri 확장 URI
 * @param nonce 보안 nonce
 * @returns 웹뷰 HTML 헤더
 */
export function generateHtmlHeader(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  nonce: string
): string {
  // 리소스 경로 가져오기
  const modernStylesUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'media', 'chat-ape.css')
  );

  const codiconsUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'media', 'codicon', 'codicon.css')
  );

  // 추가 CSS 로드
  const welcomeCustomCssUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'media', 'welcome-custom.css')
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource} data:; img-src ${webview.cspSource} https: data:; script-src 'nonce-${nonce}';">
  <link href="${modernStylesUri}" rel="stylesheet">
  <link href="${codiconsUri}" rel="stylesheet">
  <link href="${welcomeCustomCssUri}" rel="stylesheet">
  <title>APE Chat</title>
</head>`;
}

/**
 * UI 구성 요소 HTML 생성
 * @param webview VSCode 웹뷰
 * @param extensionUri 확장 URI
 * @param minimal 미니멀 UI 모드 (true: 간소화된 UI, false: 전체 UI)
 * @returns UI 구성 요소 HTML
 */
export function generateChatUiHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  minimal: boolean = false
): string {
  const mascotIconUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'media', 'icons', 'mascot.svg')
  );

  if (minimal) {
    // 미니멀 디자인 (입력 영역 버튼만 표시)
    return `<body>
  <div id="chat-container">
    <div id="chat-messages"></div>
    <div id="chat-input-container">
      <div id="input-wrapper">
        <textarea id="chat-input" placeholder="Type a message or / for commands..." rows="1"></textarea>
        <div id="input-buttons">
          <button id="ape-mascot-button" title="APE MODE" class="input-action-button">
            <img src="${mascotIconUri}" width="18" height="18" />
          </button>
          <button id="attach-button" title="Attach File" class="input-action-button">
            <span class="emoji-icon">◈</span>
          </button>
          <button id="clear-button" title="Clear Chat" class="input-action-button">
            <span class="emoji-icon">⌫</span>
          </button>
          <button id="send-button" title="Send Message">
            <span class="emoji-icon">↑</span>
          </button>
        </div>
      </div>
    </div>
    <div id="model-indicator">
      <span id="model-name">Loading model...</span>
      <button id="model-selector" title="Change Model">
        <span class="emoji-icon">◎</span> Change Model
      </button>
    </div>
  </div>`;
  } else {
    // 풀 디자인 (모든 UI 요소 표시)
    return `<body>
  <div id="chat-container">
    <div id="chat-messages"></div>
    <div id="chat-input-container">
      <div id="input-actions">
        <div id="smart-prompting-toggle" title="Toggle Smart Prompting">
          <span class="toggle-icon">⚙</span>
          <span id="smart-prompting-label">Smart Prompting</span>
        </div>
        <button id="search-button" title="Advanced Search" class="input-top-button">
          <span class="emoji-icon">⌕</span>
        </button>
      </div>
      <div id="input-wrapper">
        <textarea id="chat-input" placeholder="Type a message or / for commands..." rows="1"></textarea>
        <div id="input-buttons">
          <button id="ape-mascot-button" title="APE MODE" class="input-action-button">
            <img src="${mascotIconUri}" width="18" height="18" />
          </button>
          <button id="attach-button" title="Attach File" class="input-action-button">
            <span class="emoji-icon">◈</span>
          </button>
          <button id="clear-button" title="Clear Chat" class="input-action-button">
            <span class="emoji-icon">⌫</span>
          </button>
          <button id="send-button" title="Send Message">
            <span class="emoji-icon">↑</span>
          </button>
        </div>
      </div>
    </div>
    <div id="model-indicator">
      <span id="model-name">Loading model...</span>
      <button id="model-selector" title="Change Model">
        <span class="emoji-icon">◎</span> Change Model
      </button>
    </div>
  </div>`;
  }
}