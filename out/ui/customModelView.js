"use strict";
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
exports.CustomModelView = void 0;
const vscode = __importStar(require("vscode"));
/**
 * 커스텀 LLM 모델 설정 인터페이스 관리 클래스
 * AI Toolkit을 벤치마킹한 사용자 친화적인 모델 관리 UI 제공
 */
class CustomModelView {
    // 웹뷰 패널 레퍼런스
    static _panel;
    // 모델 관리자 레퍼런스 (싱글톤)
    static _modelManager;
    // 컨텍스트 레퍼런스
    static _context;
    /**
     * CustomModelView 초기화
     * @param context VS Code 확장 컨텍스트
     * @param modelManager 모델 관리자 인스턴스
     */
    static initialize(context, modelManager) {
        this._context = context;
        this._modelManager = modelManager;
    }
    /**
     * 커스텀 모델 설정 뷰 생성 또는 표시
     * 이미 존재하면 기존 패널을 표시하고, 없으면 새로 생성
     */
    static createOrShow() {
        // 컨텍스트 확인
        if (!this._context || !this._modelManager) {
            vscode.window.showErrorMessage('CustomModelView가 초기화되지 않았습니다');
            return;
        }
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        // 기존 패널이 있으면 표시
        if (CustomModelView._panel) {
            CustomModelView._panel.reveal(column);
            return;
        }
        // 새 패널 생성
        CustomModelView._panel = vscode.window.createWebviewPanel('apeCustomModelSettings', 'APE 커스텀 LLM 모델 설정', column || vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [vscode.Uri.joinPath(this._context.extensionUri, 'media')]
        });
        // 패널 닫힘 이벤트 처리
        CustomModelView._panel.onDidDispose(() => {
            CustomModelView._panel = undefined;
        }, null, this._context.subscriptions);
        // 웹뷰 메시지 처리
        CustomModelView._panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'addModel':
                    await this.addCustomModel(message.model);
                    break;
                case 'updateModel':
                    await this.updateCustomModel(message.model);
                    break;
                case 'deleteModel':
                    await this.deleteCustomModel(message.id);
                    break;
                case 'activateModel':
                    await this.activateCustomModel(message.id);
                    break;
                case 'testConnection':
                    await this.testConnection(message.model);
                    break;
                case 'refreshModels':
                    this.refreshModels();
                    break;
                case 'openSettings':
                    vscode.commands.executeCommand('workbench.action.openSettings', 'ape.llm');
                    break;
            }
        }, undefined, this._context.subscriptions);
        // 웹뷰 HTML 설정
        if (this._panel) {
            this._panel.webview.html = this._getWebviewContent(this._panel.webview);
        }
        // 모델 목록 초기화
        this.refreshModels();
    }
    /**
     * 새 커스텀 모델 추가
     * @param model 추가할 커스텀 모델 데이터
     */
    static async addCustomModel(model) {
        try {
            // 기본 ID 생성 (없는 경우)
            if (!model.id) {
                model.id = this.generateModelId(model.displayName);
            }
            // 모델 추가
            const success = await this._modelManager.addCustomModel(model);
            if (success) {
                vscode.window.showInformationMessage(`커스텀 모델 '${model.displayName}'이(가) 추가되었습니다`);
                this.refreshModels();
            }
            else {
                vscode.window.showErrorMessage(`커스텀 모델 추가 실패: ${model.displayName}`);
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`커스텀 모델 추가 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * 커스텀 모델 업데이트
     * @param model 업데이트할 커스텀 모델 데이터
     */
    static async updateCustomModel(model) {
        try {
            // 모델 업데이트
            const success = await this._modelManager.updateCustomModel(model);
            if (success) {
                vscode.window.showInformationMessage(`커스텀 모델 '${model.displayName}'이(가) 업데이트되었습니다`);
                this.refreshModels();
            }
            else {
                vscode.window.showErrorMessage(`커스텀 모델 업데이트 실패: ${model.displayName}`);
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`커스텀 모델 업데이트 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * 커스텀 모델 삭제
     * @param id 삭제할 커스텀 모델 ID
     */
    static async deleteCustomModel(id) {
        try {
            // 모델 삭제
            const success = await this._modelManager.removeCustomModel(id);
            if (success) {
                vscode.window.showInformationMessage(`커스텀 모델이 삭제되었습니다`);
                this.refreshModels();
            }
            else {
                vscode.window.showErrorMessage(`커스텀 모델 삭제 실패: ${id}`);
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`커스텀 모델 삭제 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * 커스텀 모델 활성화
     * @param id 활성화할 커스텀 모델 ID
     */
    static async activateCustomModel(id) {
        try {
            // 모델 활성화
            const success = await this._modelManager.setActiveCustomModel(id);
            if (success) {
                const model = this._modelManager.getCustomModelById(id);
                if (model) {
                    vscode.window.showInformationMessage(`커스텀 모델 '${model.displayName}'이(가) 활성화되었습니다`);
                }
                else {
                    vscode.window.showInformationMessage(`커스텀 모델이 활성화되었습니다`);
                }
                this.refreshModels();
            }
            else {
                vscode.window.showErrorMessage(`커스텀 모델 활성화 실패: ${id}`);
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`커스텀 모델 활성화 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * 연결 테스트
     * @param model 테스트할 모델 설정
     */
    static async testConnection(model) {
        try {
            if (!model.endpoint) {
                vscode.window.showErrorMessage('API 엔드포인트를 입력하세요');
                this.sendMessageToWebview({
                    command: 'testResult',
                    success: false,
                    message: 'API 엔드포인트가 설정되지 않았습니다'
                });
                return;
            }
            // TODO: 실제 API 연결 테스트 구현
            // 현재는 단순히 엔드포인트 형식만 확인
            const isValidUrl = this.isValidUrl(model.endpoint);
            if (isValidUrl) {
                this.sendMessageToWebview({
                    command: 'testResult',
                    success: true,
                    message: '연결 테스트가 성공했습니다.'
                });
            }
            else {
                this.sendMessageToWebview({
                    command: 'testResult',
                    success: false,
                    message: '유효하지 않은 API 엔드포인트 URL 형식입니다.'
                });
            }
        }
        catch (error) {
            this.sendMessageToWebview({
                command: 'testResult',
                success: false,
                message: `연결 테스트 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`
            });
        }
    }
    /**
     * 모델 목록 새로고침
     */
    static refreshModels() {
        if (!CustomModelView._panel) {
            return;
        }
        // 현재 활성 모델 확인
        const activeModel = this._modelManager.getActiveModel();
        const isCustomActive = this._modelManager.isActiveModelCustom();
        const activeCustomModel = this._modelManager.getActiveCustomModel();
        // 커스텀 모델 목록 가져오기
        const customModels = this._modelManager.getCustomModels();
        // 웹뷰에 데이터 전송
        this.sendMessageToWebview({
            command: 'modelsUpdated',
            customModels,
            activeModelIsCustom: isCustomActive,
            activeCustomModelId: activeCustomModel?.id
        });
    }
    /**
     * 웹뷰로 메시지 전송
     * @param message 전송할 메시지
     */
    static sendMessageToWebview(message) {
        if (CustomModelView._panel && CustomModelView._panel.webview) {
            CustomModelView._panel.webview.postMessage(message);
        }
    }
    /**
     * 웹뷰 콘텐츠 생성
     * @param webview 웹뷰 인스턴스
     * @returns HTML 문자열
     */
    static _getWebviewContent(webview) {
        // 컨텍스트 확인
        if (!this._context) {
            console.error('CustomModelView가 초기화되지 않았습니다');
            return '초기화 오류가 발생했습니다. 확장 재로드가 필요합니다.';
        }
        // 리소스 URI 가져오기
        const mainScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'media', 'customModelView.js'));
        const mainStyleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'media', 'chat-ape.css'));
        // nonce 생성
        const nonce = this.getNonce();
        return `<!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';">
      <link href="${mainStyleUri}" rel="stylesheet">
      <title>APE 커스텀 LLM 모델 설정</title>
      <style>
        body {
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          color: var(--vscode-foreground);
          background-color: var(--vscode-editor-background);
        }
        
        .container {
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        .header h1 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: normal;
        }
        
        .header-actions {
          display: flex;
          gap: 10px;
        }
        
        .models-container {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        
        .model-list {
          flex: 1;
          min-width: 250px;
          max-width: 350px;
          border: 1px solid var(--vscode-panel-border);
          border-radius: 4px;
          overflow: hidden;
        }
        
        .model-list-header {
          background-color: var(--vscode-panel-background);
          padding: 10px 15px;
          border-bottom: 1px solid var(--vscode-panel-border);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .model-list-header h2 {
          margin: 0;
          font-size: 1rem;
          font-weight: normal;
        }
        
        .model-list-content {
          padding: 10px;
          max-height: 400px;
          overflow-y: auto;
        }
        
        .model-item {
          padding: 8px 10px;
          margin-bottom: 5px;
          border-radius: 3px;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .model-item:hover {
          background-color: var(--vscode-list-hoverBackground);
        }
        
        .model-item.active {
          background-color: var(--vscode-list-activeSelectionBackground);
          color: var(--vscode-list-activeSelectionForeground);
        }
        
        .model-item-info {
          flex: 1;
        }
        
        .model-item-name {
          font-weight: 500;
        }
        
        .model-item-endpoint {
          font-size: 0.8rem;
          opacity: 0.8;
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
          max-width: 200px;
        }
        
        .model-item-actions {
          display: flex;
          gap: 5px;
          opacity: 0.5;
        }
        
        .model-item:hover .model-item-actions {
          opacity: 1;
        }
        
        .model-editor {
          flex: 2;
          min-width: 450px;
          border: 1px solid var(--vscode-panel-border);
          border-radius: 4px;
          overflow: hidden;
        }
        
        .model-editor-header {
          background-color: var(--vscode-panel-background);
          padding: 10px 15px;
          border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        .model-editor-header h2 {
          margin: 0;
          font-size: 1rem;
          font-weight: normal;
        }
        
        .model-editor-content {
          padding: 15px;
        }
        
        .form-group {
          margin-bottom: 15px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 5px;
        }
        
        .form-row {
          display: flex;
          gap: 15px;
          margin-bottom: 15px;
        }
        
        .form-col {
          flex: 1;
        }
        
        .form-control {
          width: 100%;
          padding: 8px;
          border: 1px solid var(--vscode-input-border);
          background-color: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
          border-radius: 2px;
          box-sizing: border-box;
        }
        
        .form-control:focus {
          outline: 1px solid var(--vscode-focusBorder);
        }
        
        .form-control[readonly] {
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        input[type="number"] {
          width: 100%;
        }
        
        .advanced-toggle {
          margin-top: 5px;
          cursor: pointer;
          color: var(--vscode-textLink-foreground);
          display: inline-block;
          user-select: none;
        }
        
        .advanced-toggle:hover {
          text-decoration: underline;
        }
        
        .advanced-settings {
          margin-top: 10px;
          border-top: 1px solid var(--vscode-panel-border);
          padding-top: 10px;
        }
        
        .headers-container {
          border: 1px solid var(--vscode-panel-border);
          border-radius: 3px;
          margin-bottom: 10px;
        }
        
        .header-row {
          display: flex;
          gap: 10px;
          padding: 8px;
          border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        .header-row:last-child {
          border-bottom: none;
        }
        
        .header-key, .header-value {
          flex: 1;
        }
        
        .header-actions {
          width: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .btn {
          padding: 6px 12px;
          border: 1px solid var(--vscode-button-border, transparent);
          border-radius: 2px;
          cursor: pointer;
          font-size: 1rem;
          line-height: 1.5;
          text-align: center;
          white-space: nowrap;
          vertical-align: middle;
          transition: background-color 0.2s ease-in-out;
        }
        
        .btn-primary {
          background-color: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
        }
        
        .btn-primary:hover {
          background-color: var(--vscode-button-hoverBackground);
        }
        
        .btn-secondary {
          background-color: transparent;
          color: var(--vscode-button-foreground);
          border: 1px solid var(--vscode-button-border, var(--vscode-panel-border));
        }
        
        .btn-secondary:hover {
          background-color: var(--vscode-button-secondaryHoverBackground, rgba(90, 93, 94, 0.31));
        }
        
        .btn-sm {
          padding: 3px 8px;
          font-size: 0.8rem;
        }
        
        .btn-icon {
          padding: 3px;
          border-radius: 3px;
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--vscode-foreground);
        }
        
        .btn-icon:hover {
          background-color: var(--vscode-toolbar-hoverBackground);
        }
        
        .editor-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 20px;
        }
        
        .no-models {
          text-align: center;
          color: var(--vscode-descriptionForeground);
          padding: 20px;
        }
        
        .test-result {
          margin-top: 10px;
          padding: 10px;
          border-radius: 3px;
        }
        
        .test-success {
          background-color: rgba(0, 128, 0, 0.1);
          color: var(--vscode-testing-iconPassed);
          border: 1px solid var(--vscode-testing-iconPassed);
        }
        
        .test-failure {
          background-color: rgba(128, 0, 0, 0.1);
          color: var(--vscode-testing-iconFailed);
          border: 1px solid var(--vscode-testing-iconFailed);
        }
        
        /* 테마 지원을 위한 추가 CSS 변수 */
        body.vscode-dark .btn-secondary:hover {
          background-color: rgba(90, 93, 94, 0.31);
        }
        
        body.vscode-light .btn-secondary:hover {
          background-color: rgba(220, 220, 220, 0.5);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>APE 커스텀 LLM 모델 설정</h1>
          <div class="header-actions">
            <button id="btnRefresh" class="btn btn-secondary">새로고침</button>
            <button id="btnSettings" class="btn btn-secondary">전체 설정</button>
          </div>
        </div>
        
        <div class="models-container">
          <div class="model-list">
            <div class="model-list-header">
              <h2>커스텀 모델</h2>
              <button id="btnAddModel" class="btn btn-sm btn-primary">추가</button>
            </div>
            <div id="modelListContent" class="model-list-content">
              <div class="no-models">커스텀 모델이 없습니다.</div>
            </div>
          </div>
          
          <div class="model-editor">
            <div class="model-editor-header">
              <h2 id="editorTitle">새 커스텀 모델 추가</h2>
            </div>
            <div class="model-editor-content">
              <form id="modelForm">
                <input type="hidden" id="modelId" name="id">
                
                <div class="form-group">
                  <label for="displayName">모델 이름 *</label>
                  <input type="text" id="displayName" name="displayName" class="form-control" required placeholder="예: 내 커스텀 모델">
                </div>
                
                <div class="form-group">
                  <label for="endpoint">API 엔드포인트 *</label>
                  <input type="text" id="endpoint" name="endpoint" class="form-control" required placeholder="예: https://api.example.com/v1/chat/completions">
                </div>
                
                <div class="form-row">
                  <div class="form-col">
                    <div class="form-group">
                      <label for="apiKey">API 키</label>
                      <input type="password" id="apiKey" name="apiKey" class="form-control" placeholder="API 키 또는 토큰">
                    </div>
                  </div>
                  <div class="form-col">
                    <div class="form-group">
                      <label for="provider">제공업체 (선택사항)</label>
                      <input type="text" id="provider" name="provider" class="form-control" placeholder="예: OpenAI, Anthropic, 내부 서버">
                    </div>
                  </div>
                </div>
                
                <div class="advanced-toggle" id="advancedToggle">고급 설정 표시 ▼</div>
                
                <div class="advanced-settings" id="advancedSettings" style="display: none;">
                  <div class="form-row">
                    <div class="form-col">
                      <div class="form-group">
                        <label for="temperature">Temperature</label>
                        <input type="number" id="temperature" name="temperature" class="form-control" min="0" max="2" step="0.1" value="0.7">
                      </div>
                    </div>
                    <div class="form-col">
                      <div class="form-group">
                        <label for="maxTokens">최대 토큰 수</label>
                        <input type="number" id="maxTokens" name="maxTokens" class="form-control" min="1" value="2048">
                      </div>
                    </div>
                  </div>
                  
                  <div class="form-group">
                    <label>헤더 (선택사항)</label>
                    <div id="headersContainer" class="headers-container">
                      <div class="header-row">
                        <div class="header-key">
                          <input type="text" class="form-control header-key-input" placeholder="키">
                        </div>
                        <div class="header-value">
                          <input type="text" class="form-control header-value-input" placeholder="값">
                        </div>
                        <div class="header-actions">
                          <button type="button" class="btn-icon btn-add-header">+</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div class="editor-actions">
                  <button type="button" id="btnTestConnection" class="btn btn-secondary">연결 테스트</button>
                  <button type="button" id="btnCancel" class="btn btn-secondary">취소</button>
                  <button type="submit" id="btnSave" class="btn btn-primary">저장</button>
                </div>
                
                <div id="testResult" style="display: none;" class="test-result"></div>
              </form>
            </div>
          </div>
        </div>
      </div>
      
      <script nonce="${nonce}">
        (function() {
          const vscode = acquireVsCodeApi();
          let customModels = [];
          let activeCustomModelId = null;
          let currentEditingModelId = null;
          let isAdvancedOpen = false;
          let isAddingNewModel = true;
          
          // DOM Elements
          const modelListContent = document.getElementById('modelListContent');
          const editorTitle = document.getElementById('editorTitle');
          const modelForm = document.getElementById('modelForm');
          const btnAddModel = document.getElementById('btnAddModel');
          const btnCancel = document.getElementById('btnCancel');
          const btnSave = document.getElementById('btnSave');
          const btnTestConnection = document.getElementById('btnTestConnection');
          const btnRefresh = document.getElementById('btnRefresh');
          const btnSettings = document.getElementById('btnSettings');
          const advancedToggle = document.getElementById('advancedToggle');
          const advancedSettings = document.getElementById('advancedSettings');
          const headersContainer = document.getElementById('headersContainer');
          const testResult = document.getElementById('testResult');
          
          // Form Fields
          const modelIdField = document.getElementById('modelId');
          const displayNameField = document.getElementById('displayName');
          const endpointField = document.getElementById('endpoint');
          const apiKeyField = document.getElementById('apiKey');
          const providerField = document.getElementById('provider');
          const temperatureField = document.getElementById('temperature');
          const maxTokensField = document.getElementById('maxTokens');
          
          // Event Handlers
          btnAddModel.addEventListener('click', showAddModelForm);
          btnCancel.addEventListener('click', handleCancel);
          btnSave.addEventListener('click', handleSave);
          btnTestConnection.addEventListener('click', handleTestConnection);
          btnRefresh.addEventListener('click', () => vscode.postMessage({ command: 'refreshModels' }));
          btnSettings.addEventListener('click', () => vscode.postMessage({ command: 'openSettings' }));
          advancedToggle.addEventListener('click', toggleAdvancedSettings);
          modelForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleSave();
          });
          
          // 헤더 행 추가 이벤트 위임
          headersContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-add-header')) {
              addHeaderRow();
            } else if (e.target.classList.contains('btn-remove-header')) {
              removeHeaderRow(e.target.closest('.header-row'));
            }
          });
          
          // VSCode 메시지 핸들러
          window.addEventListener('message', (event) => {
            const message = event.data;
            
            switch (message.command) {
              case 'modelsUpdated':
                customModels = message.customModels || [];
                activeCustomModelId = message.activeCustomModelId;
                renderModelList();
                break;
              case 'testResult':
                showTestResult(message.success, message.message);
                break;
            }
          });
          
          // 모델 목록 렌더링
          function renderModelList() {
            if (customModels.length === 0) {
              modelListContent.innerHTML = '<div class="no-models">커스텀 모델이 없습니다.</div>';
              return;
            }
            
            modelListContent.innerHTML = '';
            
            customModels.forEach(model => {
              const isActive = model.id === activeCustomModelId;
              
              const modelItem = document.createElement('div');
              modelItem.className = \`model-item \${isActive ? 'active' : ''}\`;
              modelItem.dataset.id = model.id;
              
              modelItem.innerHTML = \`
                <div class="model-item-info">
                  <div class="model-item-name">\${model.displayName}</div>
                  <div class="model-item-endpoint">\${model.endpoint}</div>
                </div>
                <div class="model-item-actions">
                  \${!isActive ? \`<button class="btn-icon btn-activate" title="활성화">▶</button>\` : ''}
                  <button class="btn-icon btn-edit" title="편집">✎</button>
                  <button class="btn-icon btn-delete" title="삭제">✕</button>
                </div>
              \`;
              
              modelListContent.appendChild(modelItem);
              
              // 모델 항목 클릭 이벤트
              modelItem.querySelector('.model-item-info').addEventListener('click', () => {
                showEditModelForm(model);
              });
              
              // 버튼 이벤트
              if (!isActive) {
                modelItem.querySelector('.btn-activate').addEventListener('click', (e) => {
                  e.stopPropagation();
                  activateModel(model.id);
                });
              }
              
              modelItem.querySelector('.btn-edit').addEventListener('click', (e) => {
                e.stopPropagation();
                showEditModelForm(model);
              });
              
              modelItem.querySelector('.btn-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteModel(model.id, model.displayName);
              });
            });
          }
          
          // 신규 모델 추가 폼 표시
          function showAddModelForm() {
            isAddingNewModel = true;
            currentEditingModelId = null;
            editorTitle.textContent = '새 커스텀 모델 추가';
            
            modelForm.reset();
            modelIdField.value = '';
            temperatureField.value = '0.7';
            maxTokensField.value = '2048';
            
            // 헤더 초기화
            resetHeaders();
            
            hideTestResult();
          }
          
          // 모델 편집 폼 표시
          function showEditModelForm(model) {
            isAddingNewModel = false;
            currentEditingModelId = model.id;
            editorTitle.textContent = \`'\${model.displayName}' 모델 편집\`;
            
            modelIdField.value = model.id;
            displayNameField.value = model.displayName || '';
            endpointField.value = model.endpoint || '';
            apiKeyField.value = model.apiKey || '';
            providerField.value = model.provider || '';
            temperatureField.value = model.temperature !== undefined ? model.temperature : '0.7';
            maxTokensField.value = model.maxTokens || '2048';
            
            // 헤더 설정
            resetHeaders();
            
            if (model.headers && Object.keys(model.headers).length > 0) {
              // 기존 헤더가 있으면 높급 설정 표시
              showAdvancedSettings();
              
              // 첫 번째 빈 헤더 행 제거
              const firstHeaderRow = headersContainer.querySelector('.header-row');
              if (firstHeaderRow) {
                firstHeaderRow.remove();
              }
              
              // 헤더 추가
              for (const [key, value] of Object.entries(model.headers)) {
                addHeaderRow(key, value);
              }
            }
            
            hideTestResult();
          }
          
          // 저장 처리
          function handleSave() {
            // 필수 필드 검증
            if (!displayNameField.value || !endpointField.value) {
              vscode.postMessage({
                command: 'showError', 
                message: '모델 이름과 API 엔드포인트는 필수입니다'
              });
              return;
            }
            
            // 폼 데이터 수집
            const modelData = {
              id: modelIdField.value || generateModelId(displayNameField.value),
              displayName: displayNameField.value,
              endpoint: endpointField.value,
              apiKey: apiKeyField.value,
              provider: providerField.value,
              temperature: parseFloat(temperatureField.value),
              maxTokens: parseInt(maxTokensField.value, 10),
              headers: getHeadersFromForm()
            };
            
            // 저장 메시지 전송
            vscode.postMessage({
              command: isAddingNewModel ? 'addModel' : 'updateModel',
              model: modelData
            });
            
            // 폼 초기화 (성공 시)
            if (isAddingNewModel) {
              showAddModelForm();
            }
          }
          
          // 모델 삭제
          function deleteModel(id, name) {
            // 사용자 확인
            const confirmation = confirm(\`'\${name}' 모델을 삭제하시겠습니까?\`);
            
            if (confirmation) {
              vscode.postMessage({
                command: 'deleteModel',
                id: id
              });
              
              // 현재 편집 중인 모델이 삭제된 경우 폼 초기화
              if (currentEditingModelId === id) {
                showAddModelForm();
              }
            }
          }
          
          // 모델 활성화
          function activateModel(id) {
            vscode.postMessage({
              command: 'activateModel',
              id: id
            });
          }
          
          // 취소 처리
          function handleCancel() {
            showAddModelForm();
          }
          
          // 연결 테스트
          function handleTestConnection() {
            hideTestResult();
            
            const modelData = {
              endpoint: endpointField.value,
              apiKey: apiKeyField.value,
              headers: getHeadersFromForm()
            };
            
            if (!modelData.endpoint) {
              showTestResult(false, 'API 엔드포인트를 입력하세요');
              return;
            }
            
            vscode.postMessage({
              command: 'testConnection',
              model: modelData
            });
          }
          
          // 테스트 결과 표시
          function showTestResult(success, message) {
            testResult.style.display = 'block';
            testResult.className = success ? 'test-result test-success' : 'test-result test-failure';
            testResult.textContent = message;
          }
          
          // 테스트 결과 숨기기
          function hideTestResult() {
            testResult.style.display = 'none';
          }
          
          // 고급 설정 토글
          function toggleAdvancedSettings() {
            isAdvancedOpen = !isAdvancedOpen;
            
            if (isAdvancedOpen) {
              showAdvancedSettings();
            } else {
              hideAdvancedSettings();
            }
          }
          
          // 고급 설정 표시
          function showAdvancedSettings() {
            advancedSettings.style.display = 'block';
            advancedToggle.textContent = '고급 설정 숨기기 ▲';
            isAdvancedOpen = true;
          }
          
          // 고급 설정 숨기기
          function hideAdvancedSettings() {
            advancedSettings.style.display = 'none';
            advancedToggle.textContent = '고급 설정 표시 ▼';
            isAdvancedOpen = false;
          }
          
          // 헤더 행 추가
          function addHeaderRow(key = '', value = '') {
            const headerRow = document.createElement('div');
            headerRow.className = 'header-row';
            
            const btnAction = key === '' && value === '' ? 
              '<button type="button" class="btn-icon btn-add-header">+</button>' : 
              '<button type="button" class="btn-icon btn-remove-header">-</button>';
            
            headerRow.innerHTML = \`
              <div class="header-key">
                <input type="text" class="form-control header-key-input" placeholder="키" value="\${key}">
              </div>
              <div class="header-value">
                <input type="text" class="form-control header-value-input" placeholder="값" value="\${value}">
              </div>
              <div class="header-actions">
                \${btnAction}
              </div>
            \`;
            
            headersContainer.appendChild(headerRow);
            
            // 마지막 행의 키나 값이 입력되면 새 행 추가
            const lastRow = headersContainer.lastElementChild;
            const keyInput = lastRow.querySelector('.header-key-input');
            const valueInput = lastRow.querySelector('.header-value-input');
            
            [keyInput, valueInput].forEach(input => {
              input.addEventListener('input', () => {
                const lastRow = headersContainer.lastElementChild;
                const lastKeyInput = lastRow.querySelector('.header-key-input');
                const lastValueInput = lastRow.querySelector('.header-value-input');
                
                if (lastKeyInput.value && lastValueInput.value) {
                  // 키와 값이 모두 입력되었으면 새 행 추가
                  const hasEmptyRow = Array.from(headersContainer.children).some(row => {
                    const k = row.querySelector('.header-key-input').value;
                    const v = row.querySelector('.header-value-input').value;
                    return k === '' && v === '';
                  });
                  
                  if (!hasEmptyRow) {
                    addHeaderRow();
                  }
                }
              });
            });
          }
          
          // 헤더 행 제거
          function removeHeaderRow(row) {
            if (row) {
              row.remove();
              
              // 최소 한 개의 빈 행 유지
              if (headersContainer.children.length === 0) {
                addHeaderRow();
              }
            }
          }
          
          // 폼에서 헤더 정보 가져오기
          function getHeadersFromForm() {
            const headers = {};
            
            Array.from(headersContainer.querySelectorAll('.header-row')).forEach(row => {
              const keyInput = row.querySelector('.header-key-input');
              const valueInput = row.querySelector('.header-value-input');
              
              if (keyInput && valueInput && keyInput.value && valueInput.value) {
                headers[keyInput.value] = valueInput.value;
              }
            });
            
            return headers;
          }
          
          // 헤더 초기화
          function resetHeaders() {
            headersContainer.innerHTML = '';
            addHeaderRow();
          }
          
          // 모델 ID 생성
          function generateModelId(displayName) {
            const base = displayName.toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, '');
              
            return \`custom-\${base}-\${Date.now().toString(36)}\`;
          }
          
          // URL 유효성 검사
          function isValidUrl(url) {
            try {
              new URL(url);
              return true;
            } catch (e) {
              return false;
            }
          }
          
          // 초기화
          function initialize() {
            // 모델 목록 요청
            vscode.postMessage({ command: 'refreshModels' });
            
            // 기본 헤더 행 추가
            addHeaderRow();
          }
          
          initialize();
        })();
      </script>
    </body>
    </html>`;
    }
    /**
     * 모델 ID 생성
     * @param name 모델 이름
     * @returns 생성된 ID
     */
    static generateModelId(name) {
        const base = name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
        return `custom-${base}-${Date.now().toString(36)}`;
    }
    /**
     * URL 유효성 검사
     * @param url 검사할 URL
     * @returns 유효 여부
     */
    static isValidUrl(url) {
        try {
            new URL(url);
            return true;
        }
        catch (e) {
            return false;
        }
    }
    /**
     * nonce 생성
     * @returns 생성된 nonce 문자열
     */
    static getNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}
exports.CustomModelView = CustomModelView;
//# sourceMappingURL=customModelView.js.map