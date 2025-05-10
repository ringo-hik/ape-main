/**
 * 명령 시스템 인터페이스
 * 
 * ChatViewProvider에서 CommandManager에 의존성 없이 
 * 명령 관련 기능을 호출할 수 있는 인터페이스 정의
 */

import { SlashCommandManager } from "../../core/commands/slashCommandManager";

/**
 * 채팅뷰가 사용하는 명령 관련 기능 인터페이스
 */
export interface CommandInterface {
  /**
   * 슬래시 명령어 매니저에 접근
   */
  readonly slashCommandManager: SlashCommandManager;

  /**
   * 모델 인디케이터 UI 업데이트
   */
  updateModelIndicator(): Promise<void>;

  /**
   * 명령어 실행
   * @param commandId 명령어 ID
   * @param args 명령어 인자
   */
  executeCommand(commandId: string, ...args: any[]): Promise<any>;
}