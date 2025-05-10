"use strict";
/**
 * Git Conflict Report View
 *
 * LLM이 제안한 충돌 해결 방법을 웹뷰로 제공하고 사용자 승인 후 적용하는 시스템
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
exports.ConflictReportViewProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const conflictSolver_1 = require("./conflictSolver");
/**
 * 충돌 보고서 웹뷰 제공자
 */
class ConflictReportViewProvider {
    context;
    llmService;
    conflictSolver;
    static viewType = 'apeConflictReport';
    _view;
    _proposals = [];
    _extensionUri;
    _workspaceRoot;
    _pendingConflictCount = 0;
    /**
     * 생성자
     */
    constructor(context, llmService, conflictSolver) {
        this.context = context;
        this.llmService = llmService;
        this.conflictSolver = conflictSolver;
        this._extensionUri = context.extensionUri;
        this._workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    }
    /**
     * 웹뷰 제공
     */
    resolveWebviewView(webviewView, _context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        // 웹뷰에서 메시지 수신
        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'approve':
                    await this._approveProposal(message.index);
                    break;
                case 'reject':
                    await this._rejectProposal(message.index);
                    break;
                case 'approveAll':
                    await this._approveAllProposals();
                    break;
                case 'apply':
                    await this._applyApprovedProposals();
                    break;
                case 'changeStrategy':
                    await this._changeStrategy(message.index, message.strategy);
                    break;
                case 'regenerate':
                    await this._regenerateProposal(message.index);
                    break;
                case 'edit':
                    await this._editProposal(message.index, message.content);
                    break;
            }
        });
    }
    /**
     * 충돌이 있는지 확인 및 보고서 생성
     */
    async checkForConflictsAndReport() {
        // 충돌 파일 목록 가져오기
        const conflictFiles = await this.conflictSolver.getConflictingFiles();
        if (conflictFiles.length === 0) {
            this._updateView({ type: 'noConflicts' });
            return 0;
        }
        // 진행 상황 UI
        this._pendingConflictCount = conflictFiles.length;
        this._proposals = [];
        const progressOptions = {
            location: vscode.ProgressLocation.Notification,
            title: '충돌 분석 중...',
            cancellable: true
        };
        await vscode.window.withProgress(progressOptions, async (progress, token) => {
            let i = 0;
            for (const filePath of conflictFiles) {
                if (token.isCancellationRequested) {
                    break;
                }
                progress.report({
                    message: `${filePath} (${i + 1}/${conflictFiles.length})`,
                    increment: 100 / conflictFiles.length
                });
                // 파일 절대 경로
                const absolutePath = path.join(this._workspaceRoot, filePath);
                // 충돌 제안 생성 및 추가
                await this._generateProposal(absolutePath, filePath);
                i++;
            }
        });
        // 웹뷰 업데이트
        this._updateView({ type: 'proposals', proposals: this._proposals });
        // 충돌 보고서 웹뷰 표시
        if (this._proposals.length > 0 && !this._view) {
            await vscode.commands.executeCommand('apeConflictReport.focus');
        }
        return this._proposals.length;
    }
    /**
     * 충돌 제안 생성
     */
    async _generateProposal(filePath, relativePath) {
        try {
            // 파일 확장자 확인
            const fileExt = path.extname(filePath).substring(1);
            // 현재 파일 내용 및 충돌 정보 파싱
            const fileContent = await vscode.workspace.fs.readFile(vscode.Uri.file(filePath));
            const content = Buffer.from(fileContent).toString('utf-8');
            // 충돌 정보 파싱
            const conflictInfo = await this.conflictSolver.parseConflicts(filePath, content);
            if (conflictInfo.conflicts.length === 0) {
                return;
            }
            // LLM을 사용한 충돌 해결 제안 생성
            let resolvedContent = content;
            // 각 충돌 부분에 대해 처리
            for (const conflict of conflictInfo.conflicts) {
                const strategy = this.conflictSolver.determineStrategy(conflict, fileExt);
                const mergeResult = await this.conflictSolver.applyStrategy(conflict, strategy, fileExt);
                if (mergeResult.success && mergeResult.resolvedContent) {
                    // 충돌 마커를 해결된 내용으로 교체
                    resolvedContent = resolvedContent.replace(conflict.marker, mergeResult.resolvedContent);
                }
            }
            // 제안에 추가
            this._proposals.push({
                filePath,
                relativePath,
                conflictCount: conflictInfo.conflicts.length,
                original: content,
                proposed: resolvedContent,
                strategy: conflictSolver_1.ConflictStrategy.LLM, // 기본 전략
                approved: false
            });
            // 웹뷰 업데이트
            this._updateView({ type: 'proposals', proposals: this._proposals });
        }
        catch (error) {
            console.error(`충돌 제안 생성 오류 (${filePath}):`, error);
            vscode.window.showErrorMessage(`충돌 제안 생성 중 오류가 발생했습니다: ${filePath}`);
        }
    }
    /**
     * 제안 승인
     */
    async _approveProposal(index) {
        if (index >= 0 && index < this._proposals.length) {
            this._proposals[index].approved = true;
            this._updateView({ type: 'proposals', proposals: this._proposals });
        }
    }
    /**
     * 제안 거부
     */
    async _rejectProposal(index) {
        if (index >= 0 && index < this._proposals.length) {
            this._proposals[index].approved = false;
            this._updateView({ type: 'proposals', proposals: this._proposals });
        }
    }
    /**
     * 모든 제안 승인
     */
    async _approveAllProposals() {
        for (let i = 0; i < this._proposals.length; i++) {
            this._proposals[i].approved = true;
        }
        this._updateView({ type: 'proposals', proposals: this._proposals });
    }
    /**
     * 승인된 제안 적용
     */
    async _applyApprovedProposals() {
        const approvedProposals = this._proposals.filter(p => p.approved);
        if (approvedProposals.length === 0) {
            vscode.window.showInformationMessage('적용할 승인된 제안이 없습니다');
            return;
        }
        // 진행 상황 UI
        const progressOptions = {
            location: vscode.ProgressLocation.Notification,
            title: '충돌 해결 적용 중...',
            cancellable: true
        };
        await vscode.window.withProgress(progressOptions, async (progress, token) => {
            let appliedCount = 0;
            for (let i = 0; i < approvedProposals.length; i++) {
                if (token.isCancellationRequested) {
                    break;
                }
                const proposal = approvedProposals[i];
                progress.report({
                    message: `${proposal.relativePath} (${i + 1}/${approvedProposals.length})`,
                    increment: 100 / approvedProposals.length
                });
                try {
                    // 파일에 제안 내용 쓰기
                    await vscode.workspace.fs.writeFile(vscode.Uri.file(proposal.filePath), Buffer.from(proposal.proposed, 'utf-8'));
                    // Git에 추가
                    if (this._workspaceRoot) {
                        const { exec } = require('child_process');
                        const { promisify } = require('util');
                        const execAsync = promisify(exec);
                        await execAsync(`git add "${proposal.filePath}"`, { cwd: this._workspaceRoot });
                    }
                    appliedCount++;
                }
                catch (error) {
                    console.error(`제안 적용 오류 (${proposal.filePath}):`, error);
                    vscode.window.showErrorMessage(`제안 적용 중 오류가 발생했습니다: ${proposal.relativePath}`);
                }
            }
            vscode.window.showInformationMessage(`${appliedCount}개 파일의 충돌이 해결되었습니다`);
            // 웹뷰 업데이트 (적용 완료된 제안 제거)
            this._proposals = this._proposals.filter(p => !p.approved);
            this._updateView({
                type: this._proposals.length > 0 ? 'proposals' : 'applied',
                proposals: this._proposals
            });
        });
    }
    /**
     * 제안 전략 변경
     */
    async _changeStrategy(index, strategy) {
        if (index >= 0 && index < this._proposals.length) {
            const proposal = this._proposals[index];
            // 전략 변경
            proposal.strategy = strategy;
            // 파일 확장자 확인
            const fileExt = path.extname(proposal.filePath).substring(1);
            // 충돌 정보 파싱
            const conflictInfo = await this.conflictSolver.parseConflicts(proposal.filePath, proposal.original);
            // 새 전략으로 내용 재생성
            let resolvedContent = proposal.original;
            // 각 충돌 부분에 대해 처리
            for (const conflict of conflictInfo.conflicts) {
                const mergeResult = await this.conflictSolver.applyStrategy(conflict, strategy, fileExt);
                if (mergeResult.success && mergeResult.resolvedContent) {
                    // 충돌 마커를 해결된 내용으로 교체
                    resolvedContent = resolvedContent.replace(conflict.marker, mergeResult.resolvedContent);
                }
            }
            // 제안 업데이트
            proposal.proposed = resolvedContent;
            proposal.approved = false;
            // 웹뷰 업데이트
            this._updateView({ type: 'proposals', proposals: this._proposals });
        }
    }
    /**
     * 제안 재생성
     */
    async _regenerateProposal(index) {
        if (index >= 0 && index < this._proposals.length) {
            const proposal = this._proposals[index];
            // 파일 확장자 확인
            const fileExt = path.extname(proposal.filePath).substring(1);
            // 충돌 정보 파싱
            const conflictInfo = await this.conflictSolver.parseConflicts(proposal.filePath, proposal.original);
            // LLM 전략으로 내용 재생성
            let resolvedContent = proposal.original;
            // 각 충돌 부분에 대해 처리
            for (const conflict of conflictInfo.conflicts) {
                // 항상 LLM 전략 사용
                const mergeResult = await this.conflictSolver.applyStrategy(conflict, conflictSolver_1.ConflictStrategy.LLM, fileExt);
                if (mergeResult.success && mergeResult.resolvedContent) {
                    // 충돌 마커를 해결된 내용으로 교체
                    resolvedContent = resolvedContent.replace(conflict.marker, mergeResult.resolvedContent);
                }
            }
            // 제안 업데이트
            proposal.proposed = resolvedContent;
            proposal.strategy = conflictSolver_1.ConflictStrategy.LLM;
            proposal.approved = false;
            // 웹뷰 업데이트
            this._updateView({ type: 'proposals', proposals: this._proposals });
        }
    }
    /**
     * 제안 직접 수정
     */
    async _editProposal(index, content) {
        if (index >= 0 && index < this._proposals.length) {
            this._proposals[index].proposed = content;
            this._proposals[index].strategy = conflictSolver_1.ConflictStrategy.LLM; // 사용자 편집은 LLM 전략으로 표시
            this._proposals[index].approved = false;
            // 웹뷰 업데이트
            this._updateView({ type: 'proposals', proposals: this._proposals });
        }
    }
    /**
     * 웹뷰 업데이트
     */
    _updateView(message) {
        if (this._view) {
            this._view.webview.postMessage(message);
        }
    }
    /**
     * 웹뷰 HTML 생성
     */
    _getHtmlForWebview(webview) {
        // 스타일 및 스크립트 URI 설정
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'chat-ape.css'));
        const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'codicon', 'codicon.css'));
        // 웹뷰 HTML
        return `<!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Git 충돌 보고서</title>
      <link href="${styleUri}" rel="stylesheet">
      <link href="${codiconsUri}" rel="stylesheet">
      <style>
        body {
          font-family: var(--vscode-font-family);
          color: var(--vscode-editor-foreground);
          background-color: var(--vscode-editor-background);
          padding: 20px;
          max-width: 100%;
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
        
        .title {
          font-size: 1.5rem;
          font-weight: bold;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .controls {
          display: flex;
          gap: 10px;
        }
        
        .btn {
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          border: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background-color: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
        }
        
        .btn:hover {
          background-color: var(--vscode-button-hoverBackground);
        }
        
        .btn-secondary {
          background-color: var(--vscode-button-secondaryBackground);
          color: var(--vscode-button-secondaryForeground);
        }
        
        .btn-secondary:hover {
          background-color: var(--vscode-button-secondaryHoverBackground);
        }
        
        .btn-danger {
          background-color: #d73a4a;
          color: white;
        }
        
        .btn-danger:hover {
          background-color: #cb2431;
        }
        
        .conflict-list {
          margin-bottom: 20px;
        }
        
        .conflict-item {
          margin-bottom: 24px;
          border: 1px solid var(--vscode-panel-border);
          border-radius: 6px;
          overflow: hidden;
        }
        
        .conflict-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background-color: var(--vscode-sideBar-background);
          border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        .conflict-path {
          font-weight: bold;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .conflict-info {
          font-size: 12px;
          color: var(--vscode-descriptionForeground);
        }
        
        .conflict-diff {
          display: flex;
          max-height: 400px;
          overflow: hidden;
        }
        
        .diff-panel {
          flex: 1;
          padding: 12px;
          overflow: auto;
          font-family: 'SF Mono', Monaco, Menlo, Consolas, 'Ubuntu Mono', monospace;
          font-size: 12px;
          white-space: pre-wrap;
          position: relative;
        }
        
        .diff-original {
          border-right: 1px solid var(--vscode-panel-border);
          background-color: var(--vscode-editor-background);
        }
        
        .diff-proposed {
          background-color: var(--vscode-editor-inactiveSelectionBackground);
        }
        
        .diff-panel-title {
          position: sticky;
          top: 0;
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 8px;
          color: var(--vscode-descriptionForeground);
          background-color: inherit;
          padding: 4px 0;
          z-index: 10;
        }
        
        .conflict-actions {
          display: flex;
          justify-content: space-between;
          padding: 12px 16px;
          background-color: var(--vscode-sideBar-background);
          border-top: 1px solid var(--vscode-panel-border);
        }
        
        .strategy-selector {
          padding: 4px 8px;
          background-color: var(--vscode-dropdown-background);
          color: var(--vscode-dropdown-foreground);
          border: 1px solid var(--vscode-dropdown-border);
          border-radius: 4px;
        }
        
        .loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 0;
        }
        
        .loading-spinner {
          border: 4px solid rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          border-top: 4px solid var(--vscode-progressBar-background);
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .no-conflicts {
          text-align: center;
          padding: 40px 0;
          color: var(--vscode-descriptionForeground);
        }
        
        .approved {
          border-left: 4px solid #28a745;
        }
        
        .conflict-badge {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 11px;
          background-color: var(--vscode-badge-background);
          color: var(--vscode-badge-foreground);
          margin-left: 8px;
        }
        
        /* Code syntax highlighting */
        .token.comment,
        .token.prolog,
        .token.doctype,
        .token.cdata {
          color: #6a9955;
        }
        
        .token.punctuation {
          color: #d4d4d4;
        }
        
        .token.property,
        .token.tag,
        .token.boolean,
        .token.number,
        .token.constant,
        .token.symbol,
        .token.deleted {
          color: #b5cea8;
        }
        
        .token.selector,
        .token.attr-name,
        .token.string,
        .token.char,
        .token.builtin,
        .token.inserted {
          color: #ce9178;
        }
        
        .token.operator,
        .token.entity,
        .token.url,
        .language-css .token.string,
        .style .token.string {
          color: #d4d4d4;
        }
        
        .token.atrule,
        .token.attr-value,
        .token.keyword {
          color: #569cd6;
        }
        
        .token.function,
        .token.class-name {
          color: #dcdcaa;
        }
        
        .token.regex,
        .token.important,
        .token.variable {
          color: #d16969;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="title">
            <span class="codicon codicon-git-merge"></span>
            Git 충돌 보고서
          </div>
          <div class="controls">
            <button class="btn" id="btn-approve-all">
              <span class="codicon codicon-check-all"></span>
              모두 승인
            </button>
            <button class="btn" id="btn-apply">
              <span class="codicon codicon-run"></span>
              승인된 항목 적용
            </button>
          </div>
        </div>
        
        <div id="content">
          <div class="loading">
            <div class="loading-spinner"></div>
            <p>충돌을 분석 중입니다...</p>
          </div>
        </div>
      </div>
      
      <script>
        // VSCode API 얻기
        const vscode = acquireVsCodeApi();
        
        // 상태 저장
        let proposals = [];
        
        // 웹뷰 초기화
        document.addEventListener('DOMContentLoaded', () => {
          // 모두 승인 버튼
          document.getElementById('btn-approve-all').addEventListener('click', () => {
            vscode.postMessage({ type: 'approveAll' });
          });
          
          // 적용 버튼
          document.getElementById('btn-apply').addEventListener('click', () => {
            vscode.postMessage({ type: 'apply' });
          });
        });
        
        // VSCode에서 메시지 수신
        window.addEventListener('message', event => {
          const message = event.data;
          
          switch (message.type) {
            case 'proposals':
              proposals = message.proposals;
              renderProposals();
              break;
            case 'noConflicts':
              renderNoConflicts();
              break;
            case 'applied':
              renderApplied();
              break;
          }
        });
        
        // 충돌 제안 렌더링
        function renderProposals() {
          const contentEl = document.getElementById('content');
          
          if (proposals.length === 0) {
            contentEl.innerHTML = '<div class="no-conflicts">처리할 충돌이 없습니다.</div>';
            return;
          }
          
          let html = '<div class="conflict-list">';
          
          proposals.forEach((proposal, index) => {
            const approvedClass = proposal.approved ? 'approved' : '';
            
            html += \`
              <div class="conflict-item \${approvedClass}" id="conflict-\${index}">
                <div class="conflict-header">
                  <div class="conflict-path">
                    <span class="codicon codicon-file"></span>
                    \${proposal.relativePath}
                    <span class="conflict-badge">\${proposal.conflictCount} 충돌</span>
                  </div>
                  <div class="conflict-info">
                    전략: <select class="strategy-selector" data-index="\${index}">
                      <option value="auto" \${proposal.strategy === 'auto' ? 'selected' : ''}>자동 선택</option>
                      <option value="ours" \${proposal.strategy === 'ours' ? 'selected' : ''}>현재 브랜치 (Ours)</option>
                      <option value="theirs" \${proposal.strategy === 'theirs' ? 'selected' : ''}>대상 브랜치 (Theirs)</option>
                      <option value="merge" \${proposal.strategy === 'merge' ? 'selected' : ''}>기본 병합</option>
                      <option value="llm" \${proposal.strategy === 'llm' ? 'selected' : ''}>LLM 지능형 병합</option>
                    </select>
                  </div>
                </div>
                
                <div class="conflict-diff">
                  <div class="diff-panel diff-original">
                    <div class="diff-panel-title">원본 (충돌 포함)</div>
                    <div class="diff-content">\${escapeHtml(proposal.original)}</div>
                  </div>
                  <div class="diff-panel diff-proposed">
                    <div class="diff-panel-title">제안된 해결</div>
                    <div class="diff-content">\${escapeHtml(proposal.proposed)}</div>
                  </div>
                </div>
                
                <div class="conflict-actions">
                  <div>
                    <button class="btn btn-secondary regenerate-btn" data-index="\${index}">
                      <span class="codicon codicon-refresh"></span>
                      LLM으로 재생성
                    </button>
                  </div>
                  <div>
                    \${proposal.approved 
                      ? \`<button class="btn btn-secondary reject-btn" data-index="\${index}">
                          <span class="codicon codicon-close"></span>
                          거부
                        </button>\` 
                      : \`<button class="btn approve-btn" data-index="\${index}">
                          <span class="codicon codicon-check"></span>
                          승인
                        </button>\`
                    }
                  </div>
                </div>
              </div>
            \`;
          });
          
          html += '</div>';
          contentEl.innerHTML = html;
          
          // 이벤트 리스너 추가
          document.querySelectorAll('.approve-btn').forEach(btn => {
            btn.addEventListener('click', e => {
              const index = parseInt(e.currentTarget.dataset.index);
              vscode.postMessage({ type: 'approve', index });
            });
          });
          
          document.querySelectorAll('.reject-btn').forEach(btn => {
            btn.addEventListener('click', e => {
              const index = parseInt(e.currentTarget.dataset.index);
              vscode.postMessage({ type: 'reject', index });
            });
          });
          
          document.querySelectorAll('.regenerate-btn').forEach(btn => {
            btn.addEventListener('click', e => {
              const index = parseInt(e.currentTarget.dataset.index);
              vscode.postMessage({ type: 'regenerate', index });
            });
          });
          
          document.querySelectorAll('.strategy-selector').forEach(select => {
            select.addEventListener('change', e => {
              const index = parseInt(e.currentTarget.dataset.index);
              const strategy = e.currentTarget.value;
              vscode.postMessage({ type: 'changeStrategy', index, strategy });
            });
          });
        }
        
        // 충돌 없음 렌더링
        function renderNoConflicts() {
          const contentEl = document.getElementById('content');
          contentEl.innerHTML = '<div class="no-conflicts"><span class="codicon codicon-check"></span> 충돌이 없습니다.</div>';
        }
        
        // 적용 완료 렌더링
        function renderApplied() {
          const contentEl = document.getElementById('content');
          contentEl.innerHTML = '<div class="no-conflicts"><span class="codicon codicon-check"></span> 모든 충돌이 해결되었습니다.</div>';
        }
        
        // HTML 이스케이프
        function escapeHtml(unsafe) {
          return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
        }
      </script>
    </body>
    </html>`;
    }
}
exports.ConflictReportViewProvider = ConflictReportViewProvider;
//# sourceMappingURL=conflictReportView.js.map