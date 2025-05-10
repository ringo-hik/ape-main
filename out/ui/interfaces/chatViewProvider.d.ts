import * as vscode from 'vscode';
import { CommandSuggestion } from '../../core/commands/slashCommand';
import { CommandManager } from '../../core/commands/commandManager';
import { CommandService } from '../../core/commands/commandService';
/**
 * ChatViewProvider 인터페이스
 * 모든 채팅 뷰 제공자 구현체가 공통으로 구현해야 하는 인터페이스
 */
export interface IChatViewProvider extends vscode.WebviewViewProvider {
    /**
     * 메시지를 LLM에 전송하고 응답을 처리하는 메서드
     */
    sendMessage(content: string): Promise<void>;
    /**
     * 모든 채팅 메시지를 지우고 웰컴 화면 표시
     */
    clearChat(): void;
    /**
     * 모델 인디케이터 UI 업데이트
     */
    updateModelIndicator(): void;
    /**
     * 외부에서 채팅 입력창에 텍스트 삽입
     */
    handleChatInput(text: string): void;
    /**
     * 외부에서 직접 LLM 응답을 채팅 창에 추가
     */
    sendLlmResponse(message: {
        role: string;
        content: string;
    }): Promise<void>;
    /**
     * 웹뷰 URI 리소스 변환
     */
    getWebviewResource(uri: vscode.Uri): vscode.Uri | null;
    /**
     * 명령어 제안 이벤트
     */
    readonly onDidSuggestCommands: vscode.Event<CommandSuggestion[]>;
    /**
     * 명령 관리자 참조
     * extension.ts에서 초기화 후 설정
     */
    _commandManager?: CommandManager;
    /**
     * 명령 서비스 참조
     * extension.ts에서 초기화 후 설정
     */
    _commandService?: CommandService;
}
/**
 * 기본 ChatViewProvider 설정값
 */
export declare const DEFAULT_CHAT_VIEW_TYPE = "apeChat";
