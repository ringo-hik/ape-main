/**
 * 명령어 레지스트리 모듈
 * 
 * 명령어 등록 및 관리 기능 제공
 * 내부 플러그인 및 외부 플러그인 명령어 통합 관리
 */

import { EventEmitter } from 'events';
import { ICommand, ICommandRegistry, CommandType, CommandPrefix, CommandHandler, CommandUsage } from '../../types/CommandTypes';
import { PluginRegistryService } from '../plugin-system/PluginRegistryService';

/**
 * 명령어 레지스트리 클래스
 * 명령어 핸들러 등록 및 조회 담당
 */
export class CommandRegistryService extends EventEmitter implements ICommandRegistry {
  /**
   * 명령어 핸들러 맵
   * 에이전트 ID => {명령어 이름 => 핸들러}
   */
  private _handlers: Map<string, Map<string, CommandHandler>> = new Map();
  
  /**
   * 명령어 사용법 맵
   * 에이전트 ID => {명령어 이름 => 사용법}
   */
  private _usages: Map<string, Map<string, CommandUsage>> = new Map();
  
  /**
   * 레거시 명령어 맵
   */
  private _commands: Map<string, ICommand> = new Map();
  
  /**
   * 플러그인 레지스트리
   */
  private _pluginRegistry?: PluginRegistryService;
  
  /**
   * 명령어 레지스트리 생성자
   * @param pluginRegistry 플러그인 레지스트리 (선택적)
   */
  constructor(pluginRegistry?: PluginRegistryService) {
    super();
    this._pluginRegistry = pluginRegistry;
    
    // 플러그인 레지스트리가 제공된 경우 이벤트 구독
    if (this._pluginRegistry) {
      this._pluginRegistry.on('plugin-registered', () => this.refreshCommands());
      this._pluginRegistry.on('plugin-unregistered', () => this.refreshCommands());
      this._pluginRegistry.on('plugins-initialized', () => this.refreshCommands());
    }
    
    // 기본 내장 명령어 등록
    this.registerCoreCommands();
  }
  
  /**
   * 기본 내장 명령어 등록
   */
  private registerCoreCommands(): void {
    // 도움말 명령어 (@ 버전)
    this.register('core', 'help', async (args, flags) => {
      const commands = this.getAllCommandUsages();
      const atCommands = commands.filter(cmd => cmd.syntax.startsWith('@'));
      
      let helpText = '사용 가능한 @ 명령어:\n\n';
      
      // 플러그인별로 그룹화
      const pluginGroups = new Map<string, CommandUsage[]>();
      atCommands.forEach(cmd => {
        const groupName = cmd.agentId;
        if (!pluginGroups.has(groupName)) {
          pluginGroups.set(groupName, []);
        }
        pluginGroups.get(groupName)!.push(cmd);
      });
      
      // 각 그룹 출력
      for (const [plugin, cmds] of pluginGroups.entries()) {
        helpText += `[${plugin}]\n`;
        cmds.forEach(cmd => {
          helpText += `  ${cmd.syntax} - ${cmd.description}\n`;
        });
        helpText += '\n';
      }
      
      return helpText;
    });
    
    // 도움말 명령어 (/ 버전)
    this.register('core', '/help', async (args, flags) => {
      const commands = this.getAllCommandUsages();
      const slashCommands = commands.filter(cmd => cmd.syntax.startsWith('/'));
      
      let helpText = '사용 가능한 / 명령어:\n\n';
      
      slashCommands.forEach(cmd => {
        helpText += `${cmd.syntax} - ${cmd.description}\n`;
      });
      
      helpText += '\n/clear - 대화 기록 지우기\n';
      helpText += '/model <모델ID> - 사용할 모델 변경\n';
      
      return helpText;
    });
    
    // 모델 변경 명령어
    this.register('core', '/model', async (args, flags) => {
      try {
        // 모델 ID가 제공되지 않은 경우
        if (args.length < 1) {
          return '사용법: /model <모델ID> - 예: /model gpt-3.5-turbo';
        }
        
        const modelId = args[0].toString();
        
        // VS Code 설정 업데이트
        const vscode = require('vscode');
        const config = vscode.workspace.getConfiguration('axiom.llm');
        await config.update('defaultModel', modelId, vscode.ConfigurationTarget.Global);
        
        return `모델이 '${modelId}'(으)로 변경되었습니다.`;
      } catch (error) {
        console.error('모델 변경 중 오류 발생:', error);
        return `모델 변경 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`;
      }
    });
    
    // 모델 목록 명령어
    this.register('core', 'models', async (args, flags) => {
      try {
        // LLM 서비스 가져오기 (여기서는 임시로 하드코딩된 정보 사용)
        const models = [
          { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI' },
          { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI' },
          { id: 'claude-2', name: 'Claude 2', provider: 'Anthropic' },
          { id: 'claude-instant', name: 'Claude Instant', provider: 'Anthropic' }
        ];
        
        let response = '사용 가능한 LLM 모델:\n\n';
        
        // 모델 정보 포맷팅
        for (const model of models) {
          response += `- ${model.name} (${model.provider})\n  ID: ${model.id}\n\n`;
        }
        
        response += '모델을 변경하려면 /model <모델ID> 명령어를 사용하세요.';
        
        return response;
      } catch (error) {
        console.error('모델 목록 조회 중 오류 발생:', error);
        return '모델 목록을 가져오는 중 오류가 발생했습니다.';
      }
    });
  }
  
  /**
   * 명령어 핸들러 등록
   * @param agentId 에이전트 ID
   * @param command 명령어 이름
   * @param handler 명령어 핸들러
   * @returns 등록 성공 여부
   */
  register(agentId: string, command: string, handler: CommandHandler): boolean {
    try {
      if (!agentId || !command || !handler) {
        console.error('유효하지 않은 명령어 등록 정보:', { agentId, command });
        return false;
      }
      
      // 에이전트 맵 생성 (없는 경우)
      if (!this._handlers.has(agentId)) {
        this._handlers.set(agentId, new Map());
      }
      
      const agentCommands = this._handlers.get(agentId)!;
      
      // 이미 등록된 명령어 확인
      if (agentCommands.has(command)) {
        console.warn(`이미 등록된 명령어: ${agentId}:${command}`);
        return false;
      }
      
      // 명령어 핸들러 등록
      agentCommands.set(command, handler);
      
      // 이벤트 발행
      this.emit('command-registered', { agentId, command });
      this.emit('commands-changed');
      
      return true;
    } catch (error) {
      console.error(`명령어 등록 오류 (${agentId}:${command}):`, error);
      return false;
    }
  }
  
  /**
   * 명령어 핸들러 조회
   * @param agentId 에이전트 ID
   * @param command 명령어 이름
   * @returns 명령어 핸들러 또는 undefined
   */
  getHandler(agentId: string, command: string): CommandHandler | undefined {
    const agentCommands = this._handlers.get(agentId);
    if (!agentCommands) {
      return undefined;
    }
    
    return agentCommands.get(command);
  }
  
  /**
   * 모든 명령어 핸들러 조회
   * @returns 명령어 핸들러 맵
   */
  getAllHandlers(): Map<string, Map<string, CommandHandler>> {
    return this._handlers;
  }
  
  /**
   * 명령어 사용법 등록
   * @param usage 명령어 사용법
   * @returns 등록 성공 여부
   */
  registerUsage(usage: CommandUsage): boolean {
    try {
      if (!usage.agentId || !usage.command) {
        console.error('유효하지 않은 명령어 사용법:', usage);
        return false;
      }
      
      // 에이전트 맵 생성 (없는 경우)
      if (!this._usages.has(usage.agentId)) {
        this._usages.set(usage.agentId, new Map());
      }
      
      const agentUsages = this._usages.get(usage.agentId)!;
      
      // 명령어 사용법 등록
      agentUsages.set(usage.command, usage);
      
      return true;
    } catch (error) {
      console.error(`명령어 사용법 등록 오류 (${usage.agentId}:${usage.command}):`, error);
      return false;
    }
  }
  
  /**
   * 명령어 사용법 조회
   * @param agentId 에이전트 ID
   * @param command 명령어 이름
   * @returns 명령어 사용법 또는 undefined
   */
  getUsage(agentId: string, command: string): CommandUsage | undefined {
    const agentUsages = this._usages.get(agentId);
    if (!agentUsages) {
      return undefined;
    }
    
    return agentUsages.get(command);
  }
  
  /**
   * 에이전트의 모든 명령어 사용법 조회
   * @param agentId 에이전트 ID
   * @returns 명령어 사용법 목록
   */
  getAgentCommands(agentId: string): CommandUsage[] {
    const agentUsages = this._usages.get(agentId);
    if (!agentUsages) {
      return [];
    }
    
    return Array.from(agentUsages.values());
  }
  
  /**
   * 모든 명령어 사용법 조회
   * @returns 명령어 사용법 목록
   */
  getAllCommandUsages(): CommandUsage[] {
    const allUsages: CommandUsage[] = [];
    
    for (const agentUsages of this._usages.values()) {
      allUsages.push(...agentUsages.values());
    }
    
    return allUsages;
  }
  
  /**
   * 명령어 실행
   * @param fullCommand 전체 명령어 (agentId:command 형식)
   * @param args 명령어 인자
   * @param flags 명령어 플래그
   * @returns 명령어 실행 결과
   */
  public async executeCommand(fullCommand: string, args: any[] = [], flags: Record<string, any> = {}): Promise<any> {
    const parts = fullCommand.split(':');
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
    
    const handler = this.getHandler(agentId, command);
    if (!handler) {
      throw new Error(`명령어를 찾을 수 없음: ${agentId}:${command}`);
    }
    
    try {
      return await handler(args, flags);
    } catch (error) {
      console.error(`명령어 실행 오류 (${agentId}:${command}):`, error);
      throw error;
    }
  }
  
  /**
   * 플러그인에서 모든 명령어를 다시 로드합니다.
   * @returns 로드된 명령어 수
   */
  public refreshCommands(): number {
    if (!this._pluginRegistry) {
      return 0;
    }
    
    // 기존 명령어 모두 제거
    this._handlers.clear();
    this._usages.clear();
    
    // 활성화된 모든 플러그인에서 명령어 가져오기
    const plugins = this._pluginRegistry.getEnabledPlugins();
    let commandCount = 0;
    
    for (const plugin of plugins) {
      const pluginCommands = plugin.getCommands();
      for (const cmd of pluginCommands) {
        const fullCommandName = cmd.name;
        
        // 명령어 핸들러 등록
        if (this.register(plugin.id, fullCommandName, async (args, flags) => {
          return await plugin.executeCommand(fullCommandName, args);
        })) {
          // 명령어 사용법 등록
          this.registerUsage({
            agentId: plugin.id,
            command: fullCommandName,
            description: cmd.description || '',
            syntax: cmd.syntax || `@${plugin.id}:${fullCommandName}`,
            examples: cmd.examples || []
          });
          commandCount++;
        }
      }
    }
    
    this.emit('commands-changed');
    return commandCount;
  }
  
  /**
   * 명령어 변경 이벤트 리스너를 등록합니다.
   * @param listener 이벤트 리스너
   * @returns this
   */
  public onCommandsChanged(listener: () => void): this {
    this.on('commands-changed', listener);
    return this;
  }
  
  /**
   * 명령어를 등록합니다. (레거시 호환성)
   * @param command 명령어 객체
   * @returns 등록 성공 여부
   */
  public registerCommand(command: ICommand): boolean {
    try {
      if (!command || !command.id) {
        console.error('유효하지 않은 명령어:', command);
        return false;
      }
      
      // 명령어 ID 파싱
      const parts = command.id.split(':');
      let agentId: string;
      let commandName: string;
      
      if (parts.length === 1) {
        // 내부 명령어 (core 플러그인)
        agentId = 'core';
        commandName = parts[0];
      } else {
        // 플러그인 명령어 (agentId:command)
        agentId = parts[0];
        commandName = parts.slice(1).join(':');
      }
      
      // 레거시 명령어 맵에 저장
      this._commands.set(command.id, command);
      
      // 명령어 핸들러 등록
      return this.register(agentId, commandName, command.handler);
    } catch (error) {
      console.error(`명령어 등록 오류 (${command?.id}):`, error);
      return false;
    }
  }
  
  /**
   * 레거시 UI 호환성 메서드: 명령어 존재 여부 확인
   * @param commandId 명령어 ID
   * @returns 명령어 존재 여부
   */
  public hasCommand(commandId: string): boolean {
    const parts = commandId.split(':');
    let agentId: string;
    let command: string;
    
    if (parts.length === 1) {
      agentId = 'core';
      command = parts[0];
    } else {
      agentId = parts[0];
      command = parts.slice(1).join(':');
    }
    
    return this.getHandler(agentId, command) !== undefined;
  }
  
  /**
   * 레거시 UI 호환성 메서드: 특정 타입의 명령어 목록 가져오기
   * @param type 명령어 타입
   * @returns 명령어 목록
   */
  public getCommandsByType(type: CommandType): ICommand[] {
    const commands: ICommand[] = [];
    
    // 모든 에이전트에서 명령어 검색
    for (const [agentId, handlers] of this._handlers.entries()) {
      for (const [commandName, handler] of handlers.entries()) {
        // 사용법 정보 가져오기
        const usage = this.getUsage(agentId, commandName);
        
        if (usage) {
          // 명령어 접두사 확인
          let commandType = CommandType.NONE;
          let prefix = CommandPrefix.NONE;
          
          if (usage.syntax.startsWith('@')) {
            commandType = CommandType.AT;
            prefix = CommandPrefix.AT;
          } else if (usage.syntax.startsWith('/')) {
            commandType = CommandType.SLASH;
            prefix = CommandPrefix.SLASH;
          }
          
          // 요청된 타입과 일치하는 경우만 추가
          if (commandType === type) {
            commands.push({
              id: `${agentId}:${commandName}`,
              type: commandType,
              prefix: prefix,
              description: usage.description,
              handler
            });
          }
        }
      }
    }
    
    return commands;
  }
}