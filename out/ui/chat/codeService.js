"use strict";
/**
 * 코드 서비스
 *
 * 코드 블록 UI 및 상호 작용 기능, 코드 삽입 기능을 통합 제공
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
exports.CodeService = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * 통합된 코드 서비스 클래스
 */
class CodeService {
    static codeBlockCounter = 0;
    /**
     * 웹뷰에서 메시지 핸들러 등록
     * @param context 확장 컨텍스트
     * @param webview 웹뷰
     */
    static async registerHandlers(context, webview) {
        console.log('CodeService.registerHandlers called');
        // 코드 블록 관련 명령 등록 (비동기 함수로 변경됨)
        await this.registerCommands(context);
        // 웹뷰 메시지 핸들러 등록
        webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'copyCode': {
                    await this.handleCopyCode(message.code);
                    break;
                }
                case 'insertCodeToEditor': {
                    await this.handleInsertCode(message);
                    break;
                }
                case 'createFileWithCode': {
                    await this.handleCreateFile(message);
                    break;
                }
                case 'attachFile': {
                    await this.handleAttachFile(webview);
                    break;
                }
            }
        }, undefined, context.subscriptions);
    }
    /**
     * 코드 복사 처리
     * @param code 복사할 코드
     */
    static async handleCopyCode(code) {
        try {
            await vscode.env.clipboard.writeText(code);
            vscode.window.showInformationMessage('코드가 클립보드에 복사되었습니다.');
        }
        catch (error) {
            console.error('코드 복사 중 오류 발생:', error);
            vscode.window.showErrorMessage('코드 복사 중 오류가 발생했습니다.');
        }
    }
    /**
     * 코드 삽입 처리
     * @param message 메시지 객체
     */
    static async handleInsertCode(message) {
        try {
            const options = {
                code: message.code,
                language: message.language || 'plaintext',
                insertAtCursor: message.insertAtCursor,
                replaceSelection: message.replaceSelection,
                createNewFile: message.createNewFile,
                filename: message.filename
            };
            const result = await vscode.commands.executeCommand('ape.insertCodeToEditor', options);
            if (!result) {
                vscode.window.showErrorMessage('코드를 에디터에 삽입하지 못했습니다.');
            }
        }
        catch (error) {
            console.error('코드 삽입 중 오류 발생:', error);
            vscode.window.showErrorMessage('코드 삽입 중 오류가 발생했습니다.');
        }
    }
    /**
     * 새 파일 생성 처리
     * @param message 메시지 객체
     */
    static async handleCreateFile(message) {
        try {
            const options = {
                code: message.code,
                language: message.language || 'plaintext',
                createNewFile: true,
                filename: message.filename
            };
            const result = await vscode.commands.executeCommand('ape.createNewFileWithCode', options);
            if (!result) {
                vscode.window.showErrorMessage('새 파일을 생성하지 못했습니다.');
            }
        }
        catch (error) {
            console.error('파일 생성 중 오류 발생:', error);
            vscode.window.showErrorMessage('파일 생성 중 오류가 발생했습니다.');
        }
    }
    /**
     * 파일 첨부 처리
     * @param webview 웹뷰
     */
    static async handleAttachFile(webview) {
        try {
            // VSCode의 파일 선택 대화상자 표시
            const fileUris = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: '첨부',
                filters: {
                    'All Files': ['*']
                }
            });
            if (!fileUris || fileUris.length === 0) {
                return; // 사용자가 취소함
            }
            const fileUri = fileUris[0];
            const fileName = path.basename(fileUri.fsPath);
            const fileExtension = path.extname(fileUri.fsPath).toLowerCase();
            let fileContent = '';
            // 파일 크기 확인 (큰 파일은 내용 로드하지 않음)
            const stat = await vscode.workspace.fs.stat(fileUri);
            const fileSize = stat.size;
            const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
            // 작은 파일인 경우 내용 로드
            if (fileSize <= MAX_FILE_SIZE) {
                try {
                    const buffer = await vscode.workspace.fs.readFile(fileUri);
                    fileContent = new TextDecoder().decode(buffer);
                }
                catch (error) {
                    console.log('텍스트 파일이 아닌 것으로 추정됩니다:', error);
                    // 텍스트가 아닌 파일은 내용 로드하지 않음
                }
            }
            // 상대 경로 구하기
            let relativePath = fileUri.fsPath;
            if (vscode.workspace.workspaceFolders?.length) {
                const workspaceFolder = vscode.workspace.workspaceFolders[0];
                const workspacePath = workspaceFolder.uri.fsPath;
                if (fileUri.fsPath.startsWith(workspacePath)) {
                    relativePath = fileUri.fsPath.substring(workspacePath.length + 1);
                }
            }
            // 파일 정보 웹뷰로 전송
            webview.postMessage({
                type: 'fileAttached',
                file: {
                    path: fileUri.fsPath,
                    relativePath: relativePath,
                    name: fileName,
                    type: fileExtension,
                    size: fileSize,
                    content: fileContent,
                    hasContent: fileContent.length > 0
                }
            });
            vscode.window.showInformationMessage(`${fileName} 파일이 첨부되었습니다.`);
        }
        catch (error) {
            console.error('파일 첨부 중 오류 발생:', error);
            vscode.window.showErrorMessage(`파일 첨부 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * 코드 블록 CSS 스타일 로드
     * @param webview 웹뷰
     * @param context 확장 컨텍스트
     * @returns CSS URI
     */
    static getCodeBlockStyleUri(webview, context) {
        return webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'code-block.css'));
    }
    /**
     * 코드 블록 스크립트 생성
     * @returns JavaScript 코드
     */
    static getCodeBlockScript() {
        return `
    // 코드 블록 관련 기능
    (function() {
      document.addEventListener('click', function(event) {
        const target = event.target;
        
        // 복사 버튼 클릭 (버튼 또는 버튼 내부 아이콘)
        const copyButton = target.closest('.code-action-button.copy-button');
        if (copyButton) {
          const codeId = copyButton.getAttribute('data-code-id');
          const codeElement = document.getElementById('code-' + codeId);
          
          if (codeElement) {
            const code = codeElement.textContent;
            
            // VS Code에 복사 요청 전송
            vscode.postMessage({
              type: 'copyCode',
              code: code,
              language: codeElement.className.replace('language-', '')
            });
            
            // 복사 성공 시각적 피드백
            const codeBlock = copyButton.closest('.code-block-container');
            codeBlock.classList.add('success-animation');
            setTimeout(() => {
              codeBlock.classList.remove('success-animation');
            }, 1000);
          }
          
          event.preventDefault();
          return;
        }
        
        // 에디터에 삽입 버튼 클릭
        const insertButton = target.closest('.code-action-button.insert-code-button');
        if (insertButton) {
          const codeId = insertButton.getAttribute('data-code-id');
          const codeElement = document.getElementById('code-' + codeId);
          
          if (codeElement) {
            const code = codeElement.textContent;
            const language = codeElement.className.replace('language-', '');
            
            // VS Code에 삽입 요청 전송
            vscode.postMessage({
              type: 'insertCodeToEditor',
              code: code,
              language: language,
              insertAtCursor: true
            });
          }
          
          event.preventDefault();
          return;
        }
        
        // 새 파일 생성 버튼 클릭
        const newFileButton = target.closest('.code-action-button.new-file-button');
        if (newFileButton) {
          const codeId = newFileButton.getAttribute('data-code-id');
          const codeElement = document.getElementById('code-' + codeId);
          
          if (codeElement) {
            const code = codeElement.textContent;
            const language = codeElement.className.replace('language-', '');
            
            // VS Code에 새 파일 생성 요청 전송
            vscode.postMessage({
              type: 'createFileWithCode',
              code: code,
              language: language
            });
          }
          
          event.preventDefault();
          return;
        }
      });
      
      // 스트리밍 중인 코드 블록 표시
      function markStreamingCodeBlock(id, isStreaming) {
        const codeBlock = document.getElementById('code-' + id)?.closest('.code-block-container');
        if (codeBlock) {
          if (isStreaming) {
            codeBlock.classList.add('streaming-code-block');
          } else {
            codeBlock.classList.remove('streaming-code-block');
          }
        }
      }
      
      // 스트리밍 시작/종료 이벤트 리스닝
      window.addEventListener('message', (event) => {
        const message = event.data;
        if (message.type === 'streamingCodeStart') {
          markStreamingCodeBlock(message.codeId, true);
        } 
        else if (message.type === 'streamingCodeEnd') {
          markStreamingCodeBlock(message.codeId, false);
        }
      });
    })();
    `;
    }
    /**
     * 코드 블록 템플릿 가져오기
     */
    static async getCodeBlockTemplate() {
        const extensionPath = vscode.extensions.getExtension('ape.ape-extension')?.extensionPath;
        if (!extensionPath) {
            console.error('확장 프로그램 경로를 찾을 수 없습니다.');
            return this.getDefaultCodeBlockTemplate();
        }
        const templatePath = path.join(extensionPath, 'src', 'data', 'codeBlockTemplate.html');
        try {
            return await fs.promises.readFile(templatePath, 'utf-8');
        }
        catch (error) {
            console.error('코드 블록 템플릿을 로드할 수 없습니다:', error);
            return this.getDefaultCodeBlockTemplate();
        }
    }
    /**
     * 기본 코드 블록 템플릿 반환
     */
    static getDefaultCodeBlockTemplate() {
        return '<div class="code-block-container code-block-popup">\n' +
            '  <div class="code-block-header">\n' +
            '    <span class="code-block-language language-${language}">${language}</span>\n' +
            '    <div class="code-block-actions">\n' +
            '      <button class="code-action-button copy-button" data-code-id="${codeId}" title="복사">\n' +
            '        <i class="codicon codicon-copy"></i>\n' +
            '        <span class="tooltip">클립보드에 복사</span>\n' +
            '      </button>\n' +
            '      <button class="code-action-button insert-code-button" data-code-id="${codeId}" title="에디터에 삽입">\n' +
            '        <i class="codicon codicon-arrow-small-right"></i>\n' +
            '        <span class="tooltip">현재 파일에 복사</span>\n' +
            '      </button>\n' +
            '      <button class="code-action-button new-file-button" data-code-id="${codeId}" title="새 파일로 생성">\n' +
            '        <i class="codicon codicon-new-file"></i>\n' +
            '        <span class="tooltip">새 파일로 생성</span>\n' +
            '      </button>\n' +
            '    </div>\n' +
            '  </div>\n' +
            '  <div class="code-content ${showLineNumbers ? \'with-line-numbers\' : \'\'}">\n' +
            '    ${showLineNumbers ? \'<div class="line-numbers">${lineNumbers}</div>\' : \'\'}\n' +
            '    <div class="code-area">\n' +
            '      <code class="language-${language}" id="code-${codeId}">${codeContent}</code>\n' +
            '    </div>\n' +
            '  </div>\n' +
            '</div>';
    }
    /**
     * 코드를 현재 열려있는 파일에 삽입
     * @param options 코드 삽입 옵션
     * @returns 성공 여부
     */
    static async insertCodeToEditor(options) {
        try {
            const { code, replaceSelection, insertAtCursor, createNewFile, filename } = options;
            // 새 파일 생성 옵션이 있는 경우
            if (createNewFile) {
                return await this.createNewFileWithCode(code, options.language, filename);
            }
            // 현재 활성화된 에디터 가져오기
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                // 활성화된 에디터가 없는 경우, 새 파일 생성 제안
                const createNewFile = await vscode.window.showInformationMessage('열린 편집기가 없습니다. 새 파일을 생성할까요?', '새 파일 생성', '취소');
                if (createNewFile === '새 파일 생성') {
                    return await this.createNewFileWithCode(code, options.language);
                }
                return false;
            }
            // 현재 선택 영역 가져오기
            const selection = editor.selection;
            // 에디터에 코드 삽입
            await editor.edit(editBuilder => {
                if (replaceSelection && !selection.isEmpty) {
                    // 선택 영역 대체
                    editBuilder.replace(selection, code);
                }
                else if (insertAtCursor) {
                    // 커서 위치에 삽입
                    editBuilder.insert(selection.active, code);
                }
                else {
                    // 선택 영역이 없는 경우 커서 위치에 삽입
                    editBuilder.insert(selection.active, code);
                }
            });
            // 삽입된 코드 포맷팅 (언어에 따라 다를 수 있음)
            try {
                await vscode.commands.executeCommand('editor.action.formatDocument');
            }
            catch (error) {
                console.log('코드 포맷팅 중 오류 발생:', error);
                // 포맷팅 실패는 무시 (모든 언어가 포맷터를 지원하지는 않음)
            }
            return true;
        }
        catch (error) {
            console.error('코드 삽입 중 오류 발생:', error);
            vscode.window.showErrorMessage(`코드 삽입 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    }
    /**
     * 코드로 새 파일 생성
     * @param code 코드 내용
     * @param language 언어
     * @param suggestedFilename 제안 파일명
     * @returns 성공 여부
     */
    static async createNewFileWithCode(code, language, suggestedFilename) {
        try {
            // 파일 확장자 추론
            const extension = this.getFileExtensionForLanguage(language);
            const filename = suggestedFilename || `new_file${extension}`;
            // 새 파일 생성
            const document = await vscode.workspace.openTextDocument({
                language: language,
                content: code
            });
            await vscode.window.showTextDocument(document);
            // 파일을 실제로 저장할지 물어보기
            const saveFile = await vscode.window.showInformationMessage('새 파일이 생성되었습니다. 저장하시겠습니까?', '저장', '나중에');
            if (saveFile === '저장') {
                if (document.isDirty) {
                    const uri = await vscode.window.showSaveDialog({
                        defaultUri: vscode.Uri.file(filename),
                        filters: {
                            '모든 파일': ['*']
                        }
                    });
                    if (uri) {
                        await vscode.workspace.fs.writeFile(uri, Buffer.from(code));
                        vscode.window.showInformationMessage(`파일이 저장되었습니다: ${uri.fsPath}`);
                    }
                }
            }
            return true;
        }
        catch (error) {
            console.error('새 파일 생성 중 오류 발생:', error);
            vscode.window.showErrorMessage(`새 파일 생성 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    }
    /**
     * 언어 ID로 파일 확장자 추론
     * @param language 언어 ID
     * @returns 파일 확장자
     */
    static getFileExtensionForLanguage(language) {
        const languageToExtension = {
            'typescript': '.ts',
            'javascript': '.js',
            'python': '.py',
            'java': '.java',
            'csharp': '.cs',
            'c': '.c',
            'cpp': '.cpp',
            'go': '.go',
            'rust': '.rs',
            'php': '.php',
            'ruby': '.rb',
            'html': '.html',
            'css': '.css',
            'json': '.json',
            'markdown': '.md',
            'plaintext': '.txt',
            'xml': '.xml',
            'yaml': '.yml',
            'shell': '.sh',
            'bash': '.sh',
            'powershell': '.ps1',
            'sql': '.sql'
        };
        return languageToExtension[language] || '.txt';
    }
    /**
     * 코드 삽입 전 위치 선택 대화상자 표시
     * @returns 삽입 옵션
     */
    static async promptForInsertionMode() {
        const options = await vscode.window.showQuickPick([
            {
                label: '$(cursor) 커서 위치에 삽입',
                description: '현재 커서 위치에 코드를 삽입합니다.',
                detail: '기존 텍스트는 그대로 유지됩니다.',
                value: 'insert'
            },
            {
                label: '$(edit) 선택 영역 대체',
                description: '현재 선택 영역을 코드로 대체합니다.',
                detail: '선택 영역이 없으면 커서 위치에 삽입합니다.',
                value: 'replace'
            },
            {
                label: '$(new-file) 새 파일 생성',
                description: '코드로 새 파일을 생성합니다.',
                detail: '에디터에서 새 파일을 열고 코드를 삽입합니다.',
                value: 'new'
            }
        ], {
            placeHolder: '코드 삽입 방식을 선택하세요',
            matchOnDescription: true,
            matchOnDetail: true
        });
        if (!options) {
            return undefined; // 사용자가 취소함
        }
        switch (options.value) {
            case 'insert': {
                return { insertAtCursor: true };
            }
            case 'replace': {
                return { replaceSelection: true };
            }
            case 'new': {
                return { createNewFile: true };
            }
        }
        return undefined;
    }
    /**
     * 코드 삽입 명령 등록
     * @param context 확장 컨텍스트
     */
    static async registerCommands(context) {
        // 명령어 등록 전에 이미 등록되어 있는지 확인
        const existingCommands = await vscode.commands.getCommands();
        // 코드 삽입 명령 등록 (중복 방지)
        if (!existingCommands.includes('ape.insertCodeToEditor')) {
            context.subscriptions.push(vscode.commands.registerCommand('ape.insertCodeToEditor', async (options) => {
                const insertionOptions = await this.promptForInsertionMode();
                if (!insertionOptions) {
                    return false;
                }
                return await this.insertCodeToEditor({
                    ...options,
                    ...insertionOptions
                });
            }));
        }
        // 명령 바로 실행 (옵션 선택 없이)
        if (!existingCommands.includes('ape.insertCodeAtCursor')) {
            context.subscriptions.push(vscode.commands.registerCommand('ape.insertCodeAtCursor', async (options) => {
                return await this.insertCodeToEditor({
                    ...options,
                    insertAtCursor: true
                });
            }));
        }
        // 선택 영역 대체 명령
        if (!existingCommands.includes('ape.replaceSelectionWithCode')) {
            context.subscriptions.push(vscode.commands.registerCommand('ape.replaceSelectionWithCode', async (options) => {
                return await this.insertCodeToEditor({
                    ...options,
                    replaceSelection: true
                });
            }));
        }
        // 새 파일 생성 명령
        if (!existingCommands.includes('ape.createNewFileWithCode')) {
            context.subscriptions.push(vscode.commands.registerCommand('ape.createNewFileWithCode', async (options) => {
                return await this.insertCodeToEditor({
                    ...options,
                    createNewFile: true
                });
            }));
        }
        // 파일 첨부 명령
        if (!existingCommands.includes('ape.attachFile')) {
            context.subscriptions.push(vscode.commands.registerCommand('ape.attachFile', async () => {
                try {
                    // 현재 웹뷰 찾기
                    const activeViewColumn = vscode.window.activeTextEditor?.viewColumn || vscode.ViewColumn.One;
                    const panel = vscode.window.visibleTextEditors
                        .find(editor => editor.viewColumn === activeViewColumn);
                    if (panel) {
                        // 파일 선택 대화상자 표시
                        const fileUris = await vscode.window.showOpenDialog({
                            canSelectFiles: true,
                            canSelectFolders: false,
                            canSelectMany: false,
                            openLabel: '첨부',
                            filters: {
                                'All Files': ['*']
                            }
                        });
                        if (fileUris && fileUris.length > 0) {
                            return fileUris[0].fsPath;
                        }
                    }
                    return null;
                }
                catch (error) {
                    console.error('파일 첨부 중 오류:', error);
                    vscode.window.showErrorMessage(`파일 첨부 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
                    return null;
                }
            }));
        }
    }
    /**
     * 코드 블록 UI 생성
     * @param codeContent 코드 내용
     * @param language 언어
     * @param showLineNumbers 라인 번호 표시 여부
     * @returns 포맷팅된 HTML
     */
    static formatCodeBlock(codeContent, language = 'plaintext', showLineNumbers = true) {
        const codeId = `code_${++this.codeBlockCounter}`;
        const escapedCode = this.escapeHtml(codeContent);
        // 라인 번호 생성
        const lineNumbers = showLineNumbers ?
            codeContent.split('\n').map((_, i) => `${i + 1}`).join('\n') : '';
        // 코드 블록 템플릿 사용
        const template = `<div class="code-block-container code-block-popup">
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
        return template;
    }
    /**
     * HTML 이스케이프 처리
     * @param unsafe 이스케이프할 문자열
     * @returns 이스케이프된 문자열
     */
    static escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}
exports.CodeService = CodeService;
//# sourceMappingURL=codeService.js.map