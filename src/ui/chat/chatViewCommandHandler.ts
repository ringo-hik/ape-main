/**
 * 채팅 뷰 명령어 핸들러
 * 
 * 채팅 인터페이스의 명령어 처리 및 제안 기능을 담당하는 모듈
 */

import * as vscode from 'vscode';
import { CommandManager } from '../../core/commands/commandManager';
import { CommandSuggestion } from '../../core/commands/slashCommand';
import { Message, MessageRole } from '../../types/chat';

/**
 * 채팅 뷰 명령어 핸들러 클래스
 */
export class ChatViewCommandHandler {
  private readonly _onDidSuggestCommands = new vscode.EventEmitter<CommandSuggestion[]>();
  public readonly onDidSuggestCommands = this._onDidSuggestCommands.event;

  constructor(private readonly _commandManager: CommandManager) {}

  /**
   * 슬래시 명령어 실행
   * @param command 명령어 문자열
   * @returns 명령어 실행 결과 메시지
   */
  public async executeCommand(command: string): Promise<Message[]> {
    const messages: Message[] = [];

    // 슬래시 명령어를 별도의 메시지로 기록 (LLM 컨텍스트에서 제외됨)
    const commandMessageId = `cmd_${Date.now()}`;
    const commandMessage: Message = {
      id: commandMessageId,
      role: MessageRole.User,
      content: command,
      timestamp: new Date(),
      metadata: {
        isSlashCommand: true,
        excludeFromContext: true
      }
    };

    // 명령어 메시지 추가
    messages.push(commandMessage);

    try {
      // 슬래시 명령어 실행
      const commandResult = await this._commandManager.slashCommandManager.executeCommand(command);

      // 명령어 실행 결과 메시지 추가 (선택적)
      if (commandResult) {
        const resultMessageId = `cmd_result_${Date.now()}`;
        const resultMessage: Message = {
          id: resultMessageId,
          role: MessageRole.System,
          content: `Command executed: ${command}`,
          timestamp: new Date(),
          metadata: {
            commandResult: true,
            excludeFromContext: true
          }
        };

        messages.push(resultMessage);
      }
    } catch (error) {
      // 명령어 실행 오류 메시지 추가
      const errorMessageId = `cmd_error_${Date.now()}`;
      const errorMessage: Message = {
        id: errorMessageId,
        role: MessageRole.System,
        content: `Error executing command: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date(),
        metadata: {
          excludeFromContext: true
        }
      };

      messages.push(errorMessage);
    }

    return messages;
  }

  /**
   * 입력 내용 변경에 따른 명령어 제안 업데이트
   * @param input 사용자 입력 텍스트
   * @returns 명령어 제안 목록
   */
  public getCommandSuggestions(input: string): CommandSuggestion[] {
    if (input.startsWith('/')) {
      // 슬래시 명령어 제안 가져오기
      const suggestions = this._commandManager.slashCommandManager.getCommandSuggestions(input);
      
      // 이벤트 발생 (VSCode 통합용)
      this._onDidSuggestCommands.fire(suggestions);
      
      return suggestions;
    }
    
    // 슬래시로 시작하지 않는 경우 빈 배열 반환
    return [];
  }
  
  /**
   * 자주 사용되는 명령어 제안 목록 가져오기
   * @returns 인기 명령어 목록
   */
  public getFrequentCommandSuggestions(): CommandSuggestion[] {
    // 기본 인기 명령어 목록
    const defaultCommands = [
      { name: 'help', description: '도움말 표시' },
      { name: 'clear', description: '대화 초기화' },
      { name: 'model', description: 'AI 모델 선택' },
      { name: 'code', description: '코드 분석 및 생성' },
      { name: 'git', description: 'Git 명령어' }
    ];
    
    // 명령어 매니저에서 해당 명령어 찾기
    return defaultCommands
      .map(cmd => {
        // 슬래시 명령어 매니저에서 명령어 검색
        const suggestions = this._commandManager.slashCommandManager.getCommandSuggestions(`/${cmd.name}`);
        
        // 일치하는 명령어가 있으면 첫 번째 항목 반환
        if (suggestions && suggestions.length > 0) {
          return suggestions[0];
        }
        
        // 일치하는 명령어가 없으면 기본 형식으로 반환
        return {
          label: `/${cmd.name}`,
          description: cmd.description,
          insertText: `/${cmd.name}`,
          category: 'general',
          priority: 10
        };
      });
  }
  
  /**
   * 카테고리별 추천 명령어 가져오기
   * @param category 명령어 카테고리
   * @param limit 최대 개수
   * @returns 추천 명령어 목록
   */
  public getCategoryCommands(category: string, limit: number = 5): CommandSuggestion[] {
    // 카테고리별 명령어 가져오기
    return this._commandManager.slashCommandManager.getCommandsByCategory(category)
      .slice(0, limit);
  }
  
  /**
   * 특정 키워드에 대한 명령어 검색
   * @param keyword 검색 키워드
   * @param limit 최대 개수
   * @returns 검색된 명령어 목록
   */
  public searchCommands(keyword: string, limit: number = 10): CommandSuggestion[] {
    // 명령어 목록 전체 가져오기
    const allCommands = this._commandManager.slashCommandManager.getAllCommands();
    
    // 키워드 기반 필터링
    return allCommands
      .filter(cmd => 
        cmd.label.toLowerCase().includes(keyword.toLowerCase()) ||
        (cmd.description && cmd.description.toLowerCase().includes(keyword.toLowerCase()))
      )
      .slice(0, limit);
  }
  
  /**
   * 명령어 실행 로그 기록 (향후 사용 빈도 분석용)
   * @param command 실행된 명령어
   */
  public logCommandExecution(command: string): void {
    // 현재는 콘솔에만 로깅
    console.log(`Command executed: ${command}`);
    
    // 향후 확장: 로컬 스토리지에 명령어 사용 빈도 저장
    // 자주 사용하는 명령어를 추천하는 기능 구현 가능
  }
}