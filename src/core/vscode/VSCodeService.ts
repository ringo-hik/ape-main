import * as vscode from 'vscode';

/**
 * VS Code API와 통합하는 서비스 클래스입니다.
 * VS Code 기능에 대한 래퍼를 제공하여 확장 프로그램 코드와 VS Code API 간의 결합도를 낮쾅니다.
 */
export class VSCodeService {
  private _extensionContext: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this._extensionContext = context;
  }

  /**
   * 전역 상태에서 값을 가져옵니다.
   * @param key 상태 키
   * @param defaultValue 기본값
   * @returns 상태 값
   */
  public getGlobalState<T>(key: string, defaultValue: T): T {
    return this._extensionContext.globalState.get<T>(key, defaultValue);
  }

  /**
   * 전역 상태에 값을 저장합니다.
   * @param key 상태 키
   * @param value 저장할 값
   * @returns Promise
   */
  public async setGlobalState<T>(key: string, value: T): Promise<void> {
    await this._extensionContext.globalState.update(key, value);
  }

  /**
   * 작업 영역 상태에서 값을 가져옵니다.
   * @param key 상태 키
   * @param defaultValue 기본값
   * @returns 상태 값
   */
  public getWorkspaceState<T>(key: string, value: T): T {
    return this._extensionContext.workspaceState.get<T>(key, value);
  }

  /**
   * 작업 영역 상태에 값을 저장합니다.
   * @param key 상태 키
   * @param value 저장할 값
   * @returns Promise
   */
  public async setWorkspaceState<T>(key: string, value: T): Promise<void> {
    await this._extensionContext.workspaceState.update(key, value);
  }

  /**
   * 현재 열린 텍스트 편집기를 가져옵니다.
   * @returns 활성 텍스트 편집기 또는 undefined
   */
  public getActiveTextEditor(): vscode.TextEditor | undefined {
    return vscode.window.activeTextEditor;
  }

  /**
   * 현재 선택된 텍스트를 가져옵니다.
   * @returns 선택된 텍스트 또는 빈 문자열
   */
  public getSelectedText(): string {
    const editor = this.getActiveTextEditor();
    if (!editor) return '';
    
    return editor.document.getText(editor.selection);
  }

  /**
   * 텍스트 편집기에 텍스트를 삽입합니다.
   * @param text 삽입할 텍스트
   * @param position 삽입 위치 (선택 사항)
   * @returns 성공 여부
   */
  public async insertText(text: string, position?: vscode.Position): Promise<boolean> {
    const editor = this.getActiveTextEditor();
    if (!editor) return false;
    
    try {
      await editor.edit(editBuilder => {
        if (position) {
          editBuilder.insert(position, text);
        } else {
          // 현재 선택 범위에 삽입 (또는 커서 위치)
          const selections = editor.selections;
          selections.forEach(selection => {
            editBuilder.replace(selection, text);
          });
        }
      });
      return true;
    } catch (error) {
      console.error('텍스트 삽입 오류:', error);
      return false;
    }
  }

  /**
   * 명령어를 등록합니다.
   * @param command 명령어 ID
   * @param callback 콜백 함수
   * @returns Disposable
   */
  public registerCommand(command: string, callback: (...args: any[]) => any): vscode.Disposable {
    return vscode.commands.registerCommand(command, callback);
  }

  /**
   * 텍스트 문서 내용 변경 이벤트를 등록합니다.
   * @param callback 콜백 함수
   * @returns Disposable
   */
  public onDidChangeTextDocument(callback: (e: vscode.TextDocumentChangeEvent) => any): vscode.Disposable {
    return vscode.workspace.onDidChangeTextDocument(callback);
  }

  /**
   * 활성 편집기 변경 이벤트를 등록합니다.
   * @param callback 콜백 함수
   * @returns Disposable
   */
  public onDidChangeActiveTextEditor(callback: (e: vscode.TextEditor | undefined) => any): vscode.Disposable {
    return vscode.window.onDidChangeActiveTextEditor(callback);
  }

  /**
   * 정보 메시지를 표시합니다.
   * @param message 메시지 내용
   * @returns void
   */
  public showInformationMessage(message: string): Thenable<string | undefined> {
    return vscode.window.showInformationMessage(message);
  }

  /**
   * 경고 메시지를 표시합니다.
   * @param message 메시지 내용
   * @returns void
   */
  public showWarningMessage(message: string): Thenable<string | undefined> {
    return vscode.window.showWarningMessage(message);
  }

  /**
   * 오류 메시지를 표시합니다.
   * @param message 메시지 내용
   * @returns void
   */
  public showErrorMessage(message: string): Thenable<string | undefined> {
    return vscode.window.showErrorMessage(message);
  }

  /**
   * 진행 상태를 보여주는 함수입니다.
   * @param title 진행 상태 제목
   * @param task 진행할 작업 함수
   * @returns Task 결과
   */
  public async withProgress<T>(
    title: string, 
    task: (progress: vscode.Progress<{ message?: string; increment?: number }>) => Thenable<T>
  ): Promise<T> {
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title,
        cancellable: false
      },
      task
    );
  }

  /**
   * 확장 프로그램 컨텍스트를 반환합니다.
   * @returns 확장 프로그램 컨텍스트
   */
  public getExtensionContext(): vscode.ExtensionContext {
    return this._extensionContext;
  }

  /**
   * VS Code 확장 URI를 반환합니다.
   * @returns 확장 URI
   */
  public getExtensionUri(): vscode.Uri {
    return this._extensionContext.extensionUri;
  }
  
  /**
   * 현재 편집기 컨텍스트 정보를 수집합니다.
   * 활성 파일, 선택된 텍스트, 프로젝트 정보 등을 포함합니다.
   * @returns 편집기 컨텍스트 정보
   */
  public async getEditorContext(): Promise<any> {
    try {
      const editor = this.getActiveTextEditor();
      const activeFilePath = editor?.document.uri.fsPath;
      const selectedText = this.getSelectedText();
      const activeFileContent = editor ? editor.document.getText() : '';
      
      // 워크스페이스 정보 수집
      const workspaceFolders = vscode.workspace.workspaceFolders || [];
      const workspaceInfo = workspaceFolders.map(folder => ({
        name: folder.name,
        path: folder.uri.fsPath
      }));
      
      // VS Code 설정 정보
      const config = vscode.workspace.getConfiguration('axiom');
      
      // 언어 모드 확인
      const languageId = editor?.document.languageId;
      
      // 커서 위치 정보
      const cursorPosition = editor?.selection.active;
      const line = cursorPosition ? editor.document.lineAt(cursorPosition.line).text : '';
      
      // 에디터 컨텍스트 정보 구성
      const editorContext = {
        activeFile: {
          path: activeFilePath,
          language: languageId,
          selection: selectedText,
          cursorPosition: cursorPosition ? {
            line: cursorPosition.line,
            character: cursorPosition.character
          } : null,
          currentLine: line
        },
        workspace: {
          folders: workspaceInfo,
          name: workspaceFolders.length > 0 ? workspaceFolders[0].name : 'No Workspace'
        },
        config: {
          settings: {
            llm: config.get('llm'),
            plugins: config.get('plugins')
          }
        }
      };
      
      return editorContext;
    } catch (error) {
      console.error('편집기 컨텍스트 수집 중 오류 발생:', error);
      return {
        error: 'Failed to collect editor context',
        activeFile: null,
        workspace: null
      };
    }
  }
}