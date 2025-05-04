/**
 * 명령어 실행기 모듈
 * 
 * 파싱된 명령어를 실행하고 결과를 반환하는 기능 제공
 * @ 명령어(외부 시스템)와 / 명령어(내부 기능) 구분하여 처리
 */

import { Command, CommandPrefix, CommandType, ICommandExecutor, ICommandRegistry } from '../../types/CommandTypes';
import { IPluginRegistry } from '../../types/PluginTypes';

/**
 * 명령어 실행기 클래스
 * 명령어 실행 및 결과 처리 담당
 */
export class CommandExecutorService implements ICommandExecutor {
  /**
   * CommandExecutorService 생성자
   * @param commandRegistry 명령어 레지스트리
   * @param pluginRegistry 플러그인 레지스트리
   */
  constructor(
    private commandRegistry: ICommandRegistry,
    private pluginRegistry: IPluginRegistry
  ) {}
  
  /**
   * 명령어 실행
   * @param command 실행할 명령어
   * @returns 실행 결과
   */
  async execute(command: Command): Promise<any> {
    try {
      // 타이머 시작
      const startTime = Date.now();
      
      // 접두사에 따라 다른 처리
      let result: any;
      
      switch (command.prefix) {
        case CommandPrefix.AT:
          // @ 명령어는 플러그인 시스템으로 실행 (외부 시스템 상호작용)
          result = await this.executePluginCommand(command);
          break;
          
        case CommandPrefix.SLASH:
          // / 명령어는 내부 명령어로 실행 (내부 기능)
          result = await this.executeInternalCommand(command);
          break;
          
        default:
          throw new Error(`지원하지 않는 명령어 접두사: ${command.prefix}`);
      }
      
      // 타이머 종료
      const executionTime = Date.now() - startTime;
      console.log(`명령어 실행 완료 (${executionTime}ms): ${command.prefix}${command.agentId}:${command.command}`);
      
      return result;
    } catch (error) {
      // 오류 처리
      console.error(`명령어 실행 실패 (${command.prefix}${command.agentId}:${command.command}):`, error);
      throw error;
    }
  }
  
  /**
   * 플러그인 명령어 실행 (@ 명령어)
   * @param command 실행할 명령어
   * @returns 실행 결과
   */
  private async executePluginCommand(command: Command): Promise<any> {
    // 플러그인 존재 여부 확인
    const plugin = this.pluginRegistry.getPlugin(command.agentId);
    
    if (!plugin) {
      // 플러그인 설정 안내 메시지
      if (command.agentId === 'jira') {
        return {
          content: `# Jira 플러그인이 등록되지 않았습니다\n\n` +
                   `설정 파일에 Jira 인증 정보를 추가하세요:\n` +
                   "```json\n\"internalPlugins\": {\n  \"jira\": {\n    \"credentials\": {\n      \"token\": \"실제_토큰_값\"\n    }\n  }\n}\n```",
          error: true,
          type: 'plugin-not-found'
        };
      }
      throw new Error(`플러그인을 찾을 수 없음: ${command.agentId}`);
    }
    
    if (!plugin.isEnabled()) {
      throw new Error(`플러그인이 비활성화됨: ${command.agentId}`);
    }
    
    // 플러그인 초기화 상태 확인 (Jira 플러그인인 경우)
    if (command.agentId === 'jira' && !plugin.isInitialized()) {
      return {
        content: `# Jira 플러그인 인증 정보가 필요합니다\n\n` +
                 `설정 파일에 Jira 인증 정보를 추가하세요:\n` +
                 "```json\n\"internalPlugins\": {\n  \"jira\": {\n    \"credentials\": {\n      \"token\": \"실제_토큰_값\"\n    }\n  }\n}\n```",
        error: true,
        type: 'jira-auth-required'
      };
    }
    
    // 플러그인 명령어 실행
    console.log(`플러그인 명령어 실행: ${command.agentId}:${command.command}`);
    return await plugin.executeCommand(command.command, command.args);
  }
  
  /**
   * 내부 명령어 실행 (/ 명령어)
   * @param command 실행할 명령어
   * @returns 실행 결과
   */
  private async executeInternalCommand(command: Command): Promise<any> {
    // 명령어 핸들러 조회
    const handler = this.commandRegistry.getHandler(command.agentId, command.command);
    
    if (!handler) {
      throw new Error(`내부 명령어를 찾을 수 없음: ${command.agentId}:${command.command}`);
    }
    
    // 내부 명령어 실행
    console.log(`내부 명령어 실행: ${command.agentId}:${command.command}`);
    return await handler(command.args, command.flags);
  }
  
  /**
   * 명령어 실행 (직접 문자열 명령어 실행)
   * @param commandString 명령어 문자열
   * @param args 명령어 인자 (선택적)
   * @param flags 명령어 플래그 (선택적)
   * @returns 실행 결과
   */
  public async executeCommandString(
    commandString: string, 
    args: any[] = [], 
    flags: Record<string, any> = {}
  ): Promise<any> {
    // 명령어 문자열 파싱
    let prefix = CommandPrefix.NONE;
    let type = CommandType.NONE;
    let content = commandString;
    
    if (commandString.startsWith('@')) {
      prefix = CommandPrefix.AT;
      type = CommandType.AT;
      content = commandString.substring(1);
    } else if (commandString.startsWith('/')) {
      prefix = CommandPrefix.SLASH;
      type = CommandType.SLASH;
      content = commandString.substring(1);
    } else {
      throw new Error('명령어 형식이 올바르지 않습니다. @ 또는 / 접두사가 필요합니다.');
    }
    
    // 에이전트/명령어 분리
    const parts = content.split(':');
    let agentId: string;
    let command: string;
    
    if (parts.length === 1) {
      // 내부 명령어 (core 플러그인)
      agentId = 'core';
      command = parts[0];
    } else {
      // 플러그인 명령어 (agentId:command)
      agentId = parts[0];
      command = parts.slice(1).join(':');
    }
    
    // Command 객체 생성
    const commandObj: Command = {
      prefix,
      type,
      agentId,
      command,
      args,
      flags,
      rawInput: commandString
    };
    
    // 명령어 실행
    return await this.execute(commandObj);
  }
}