/**
 * 명령어 서비스
 *
 * CLI/GUI 하이브리드 명령어 처리를 담당하는 서비스
 */
import * as vscode from 'vscode';
import { SlashCommandManager } from './slashCommandManager';
/**
 * 슬래시 명령어 서비스 클래스
 * GUI/CLI 하이브리드 접근을 제공합니다.
 */
export declare class CommandService {
    private readonly _context;
    private readonly _commandManager;
    private readonly _formProvider;
    /**
     * 생성자
     */
    constructor(_context: vscode.ExtensionContext, _commandManager: SlashCommandManager);
    /**
     * 리소스 정리를 위한 dispose 메서드
     */
    dispose(): void;
    /**
     * 명령어 실행
     *
     * CLI와 GUI를 모두 지원하는 하이브리드 방식으로 명령어를 실행합니다.
     */
    executeCommand(commandText: string): Promise<boolean>;
    /**
     * 인라인 폼 HTML 가져오기
     * 채팅 UI에서 인라인으로 표시할 때 사용
     */
    getInlineFormHtml(commandName: string): string | null;
    /**
     * UI 모드 결정
     * 명령어와 인자에 따라 적절한 UI 모드를 결정합니다.
     */
    private _determineUIMode;
    /**
     * 명령어 폼 표시
     */
    private _showCommandForm;
    /**
     * 폼 제출 처리
     */
    private _handleFormSubmit;
    /**
     * 기존 방식으로 명령어 직접 실행
     */
    private _executeCommandDirectly;
    /**
     * 객체 형태의 인자를 배열로 변환
     */
    private _convertArgsToArray;
    /**
     * 명령어 문자열 생성
     */
    private _buildCommandString;
}
