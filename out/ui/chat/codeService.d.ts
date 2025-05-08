/**
 * 코드 서비스
 *
 * 코드 블록 UI 및 상호 작용 기능, 코드 삽입 기능을 통합 제공
 */
import * as vscode from 'vscode';
/**
 * 코드 삽입 옵션 인터페이스
 */
export interface CodeInsertionOptions {
    code: string;
    language: string;
    replaceSelection?: boolean;
    insertAtCursor?: boolean;
    createNewFile?: boolean;
    filename?: string;
}
/**
 * 통합된 코드 서비스 클래스
 */
export declare class CodeService {
    private static codeBlockCounter;
    /**
     * 웹뷰에서 메시지 핸들러 등록
     * @param context 확장 컨텍스트
     * @param webview 웹뷰
     */
    static registerHandlers(context: vscode.ExtensionContext, webview: vscode.Webview): Promise<void>;
    /**
     * 코드 복사 처리
     * @param code 복사할 코드
     */
    private static handleCopyCode;
    /**
     * 코드 삽입 처리
     * @param message 메시지 객체
     */
    private static handleInsertCode;
    /**
     * 새 파일 생성 처리
     * @param message 메시지 객체
     */
    private static handleCreateFile;
    /**
     * 파일 첨부 처리
     * @param webview 웹뷰
     */
    private static handleAttachFile;
    /**
     * 코드 블록 CSS 스타일 로드
     * @param webview 웹뷰
     * @param context 확장 컨텍스트
     * @returns CSS URI
     */
    static getCodeBlockStyleUri(webview: vscode.Webview, context: vscode.ExtensionContext): vscode.Uri;
    /**
     * 코드 블록 스크립트 생성
     * @returns JavaScript 코드
     */
    static getCodeBlockScript(): string;
    /**
     * 코드 블록 템플릿 가져오기
     */
    static getCodeBlockTemplate(): Promise<string>;
    /**
     * 기본 코드 블록 템플릿 반환
     */
    private static getDefaultCodeBlockTemplate;
    /**
     * 코드를 현재 열려있는 파일에 삽입
     * @param options 코드 삽입 옵션
     * @returns 성공 여부
     */
    static insertCodeToEditor(options: CodeInsertionOptions): Promise<boolean>;
    /**
     * 코드로 새 파일 생성
     * @param code 코드 내용
     * @param language 언어
     * @param suggestedFilename 제안 파일명
     * @returns 성공 여부
     */
    private static createNewFileWithCode;
    /**
     * 언어 ID로 파일 확장자 추론
     * @param language 언어 ID
     * @returns 파일 확장자
     */
    private static getFileExtensionForLanguage;
    /**
     * 코드 삽입 전 위치 선택 대화상자 표시
     * @returns 삽입 옵션
     */
    static promptForInsertionMode(): Promise<Partial<CodeInsertionOptions> | undefined>;
    /**
     * 코드 삽입 명령 등록
     * @param context 확장 컨텍스트
     */
    static registerCommands(context: vscode.ExtensionContext): Promise<void>;
    /**
     * 코드 블록 UI 생성
     * @param codeContent 코드 내용
     * @param language 언어
     * @param showLineNumbers 라인 번호 표시 여부
     * @returns 포맷팅된 HTML
     */
    static formatCodeBlock(codeContent: string, language?: string, showLineNumbers?: boolean): string;
    /**
     * HTML 이스케이프 처리
     * @param unsafe 이스케이프할 문자열
     * @returns 이스케이프된 문자열
     */
    private static escapeHtml;
}
