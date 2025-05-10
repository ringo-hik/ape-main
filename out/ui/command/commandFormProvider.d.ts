/**
 * 명령어 인자 폼 제공자
 *
 * 슬래시 명령어의 인자 입력을 위한 하이브리드 UI 구현
 * 텍스트 입력과 GUI 컴포넌트를 결합하여 최적의 UX 제공
 */
import * as vscode from 'vscode';
import { SlashCommand } from '../../core/commands/slashCommand';
/**
 * 명령어 인자 정의 (CLI와 GUI 모두 지원)
 */
export interface CommandArgument {
    name: string;
    description: string;
    required: boolean;
    type: 'text' | 'file' | 'folder' | 'select' | 'checkbox' | 'number' | 'date';
    defaultValue?: string | number | boolean;
    options?: Array<{
        label: string;
        value: string;
    }>;
    validation?: {
        pattern?: string;
        min?: number;
        max?: number;
        errorMessage?: string;
    };
    cliPattern?: string;
}
/**
 * 명령어 폼 상태 인터페이스
 */
export interface CommandFormState {
    command: SlashCommand;
    values: Record<string, any>;
    isValid: boolean;
    errors: Record<string, string>;
}
/**
 * 명령어 인자 폼 제공자
 * 슬래시 명령어의 인자 입력을 위한 폼 UI를 제공합니다.
 */
export declare class CommandFormProvider {
    private readonly _context;
    private _panel?;
    private _state;
    private readonly _onDidSubmitForm;
    readonly onDidSubmitForm: vscode.Event<{
        command: string;
        args: Record<string, any>;
    }>;
    private readonly _onDidCancelForm;
    readonly onDidCancelForm: vscode.Event<void>;
    /**
     * 생성자
     */
    constructor(_context: vscode.ExtensionContext);
    /**
     * 특정 명령어에 대한 인자 폼 표시
     */
    showFormForCommand(command: SlashCommand, initialValues?: Record<string, any>): void;
    /**
     * 인자 폼을 인라인 컴포넌트로 렌더링할 HTML 반환
     * (chatViewProvider에서 사용)
     */
    getInlineFormHtml(command: SlashCommand, initialValues?: Record<string, any>): string;
    /**
     * 웹뷰를 위한 HTML 생성
     */
    private _getHtmlForWebview;
    /**
     * 인자 폼 필드 HTML 렌더링
     */
    private _renderFormFields;
    /**
     * 개별 폼 필드 렌더링
     */
    private _renderField;
    /**
     * 웹뷰 메시지 핸들러
     */
    private _handleMessage;
    /**
     * 필드 값 업데이트
     */
    private _updateFieldValue;
    /**
     * 폼 유효성 검사
     */
    private _validateForm;
    /**
     * 폼 제출 처리
     */
    private _submitForm;
    /**
     * 폼 취소 처리
     */
    private _cancelForm;
    /**
     * 파일/폴더 선택 다이얼로그 표시
     */
    private _browsePath;
    /**
     * 미디어 URI 가져오기
     */
    private _getMediaUri;
    /**
     * Nonce 생성 (보안)
     */
    private _getNonce;
    /**
     * 리소스 정리
     */
    dispose(): void;
}
