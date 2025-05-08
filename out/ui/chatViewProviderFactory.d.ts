/**
 * 채팅 뷰 프로바이더 팩토리
 * 설정에 따라 적절한 채팅 인터페이스를 선택하는 팩토리 모듈
 */
import * as vscode from 'vscode';
import { LLMService } from '../core/llm/llmService';
import { MemoryService } from '../core/memory/memoryService';
import { CommandManager } from '../core/commands/commandManager';
import { ModelManager } from '../core/llm/modelManager';
/**
 * 채팅 뷰 프로바이더 타입
 */
export type ViewProviderType = 'default' | 'main';
/**
 * 채팅 뷰 인터페이스 프로바이더 팩토리
 * 다양한 UI 스타일을 선택할 수 있는 공장 패턴 구현
 */
export declare class ChatViewProviderFactory {
    /**
     * 설정에 따라 적절한 채팅 뷰 프로바이더를 생성
     */
    static createProvider(context: vscode.ExtensionContext, llmService: LLMService, memoryService: MemoryService, commandManager: CommandManager | null, modelManager?: ModelManager): vscode.WebviewViewProvider;
    /**
     * 현재 설정된 뷰 프로바이더 타입 가져오기
     */
    static getCurrentViewType(): ViewProviderType;
    /**
     * 사용자가 UI 스타일을 변경할 수 있는 퀵픽 대화상자 표시
     */
    static showStyleSelector(): Promise<void>;
}
