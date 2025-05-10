/**
 * 명령어 인자 폼 관련 인터페이스
 *
 * 슬래시 명령어의 인자 입력을 위한 하이브리드 UI 구현
 * 텍스트 입력과 GUI 컴포넌트를 결합하여 최적의 UX 제공
 */
import * as vscode from 'vscode';
import { SlashCommand } from './slash-command';
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
 * 명령어 폼 제공자 인터페이스
 */
export interface ICommandFormProvider {
    /**
     * 특정 명령어에 대한 인자 폼 표시
     */
    showFormForCommand(command: SlashCommand, initialValues?: Record<string, any>): void;
    /**
     * 폼 제출 이벤트
     */
    readonly onDidSubmitForm: vscode.Event<{
        command: string;
        args: Record<string, any>;
    }>;
    /**
     * 폼 취소 이벤트
     */
    readonly onDidCancelForm: vscode.Event<void>;
    /**
     * 인라인 폼 HTML 생성
     */
    getInlineFormHtml(command: SlashCommand, initialValues?: Record<string, any>): string;
    /**
     * 리소스 정리
     */
    dispose(): void;
}
