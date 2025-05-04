/**
 * 명령어 파서 모듈
 * 
 * 사용자 입력에서 명령어 구문을 파싱하는 기능 제공
 * @ 및 / 접두사 모두 지원하는 하이브리드 명령 시스템 구현
 */

import { Command, CommandPrefix, CommandType, ICommandParser, ParsedCommand } from '../../types/CommandTypes';

/**
 * 명령어 파서 클래스
 * 사용자 입력에서 명령어, 인자, 플래그 추출
 */
export class CommandParserService implements ICommandParser {
  /**
   * 명령어 파싱
   * @param input 명령어 입력 문자열
   * @returns 파싱된 명령어 또는 null (명령어가 아닌 경우)
   */
  parse(input: string): Command | null {
    if (!input || !input.trim()) {
      return null;
    }
    
    const trimmed = input.trim();
    
    // 명령어 접두사 확인
    let prefix = CommandPrefix.NONE;
    let content = trimmed;
    let commandType = CommandType.NONE;
    
    if (trimmed.startsWith('@')) {
      // '@' 명령어는 반드시 ':' 형식을 가져야 함 (에이전트:명령)
      // ':' 없이 '@알려줘'와 같은 형식은 명령어가 아닌 일반 텍스트로 처리
      if (!trimmed.includes(':')) {
        // '@'로 시작하지만 ':' 없음 - 일반 텍스트로 처리
        return null;
      }
      
      prefix = CommandPrefix.AT;
      commandType = CommandType.AT;
      content = trimmed.substring(1);
    } else if (trimmed.startsWith('/')) {
      prefix = CommandPrefix.SLASH;
      commandType = CommandType.SLASH;
      content = trimmed.substring(1);
    } else {
      // 일반 텍스트는 명령어로 처리하지 않음
      return null;
    }
    
    // 토큰화
    const tokens = this.tokenize(content);
    
    if (tokens.length === 0) {
      return null;
    }
    
    // 에이전트 및 명령어 추출
    const [agentId, commandName] = this.extractAgentAndCommand(tokens[0]);
    
    // agentId가 없는 경우 명령어로 처리하지 않음
    if (!agentId || !commandName) {
      return null;
    }
    
    // 인자 및 플래그 추출
    const { args, flags } = this.extractArgsAndFlags(tokens.slice(1));
    
    return {
      prefix,
      type: commandType,
      agentId,
      command: commandName,
      args,
      flags,
      rawInput: trimmed
    };
  }
  
  /**
   * ParsedCommand 인터페이스 형식으로 파싱
   * @param text 입력 텍스트
   * @returns 파싱된 명령어 또는 null
   */
  public parseCommand(text: string): ParsedCommand | null {
    const command = this.parse(text);
    if (!command) {
      return null;
    }
    
    // Command를 ParsedCommand로 변환
    const flagsMap = new Map<string, string | boolean>();
    Object.entries(command.flags).forEach(([key, value]) => {
      flagsMap.set(key, value);
    });
    
    return {
      prefix: command.prefix,
      type: command.type,
      command: command.command,
      args: command.args,
      flags: flagsMap,
      raw: command.rawInput
    };
  }
  
  /**
   * 에이전트 ID와 명령어 이름 추출
   * @param token 첫 번째 토큰
   * @returns [에이전트 ID, 명령어 이름] 또는 잘못된 형식이면 [null, null]
   */
  private extractAgentAndCommand(token: string): [string | null, string | null] {
    const parts = token.split(':');
    
    if (parts.length > 1) {
      // 'agent:command' 형식
      const agentId = parts[0].trim();
      const commandName = parts.slice(1).join(':').trim();
      
      // 빈 에이전트 ID 또는 명령어 체크
      if (!agentId || !commandName) {
        return [null, null];
      }
      
      return [agentId, commandName];
    }
    
    // @ 명령어는 항상 ':' 형식이어야 함 (이미 상위 메서드에서 처리)
    // / 명령어는 기본 'core' 에이전트에 할당
    return ['core', token];
  }
  
  /**
   * 입력 문자열 토큰화
   * 따옴표로 묶인 인자 및 공백 처리
   * @param input 입력 문자열
   * @returns 토큰 배열
   */
  private tokenize(input: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let inQuote = false;
    let quoteChar = '';
    let escaped = false;
    
    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      
      // 이스케이프 처리
      if (escaped) {
        current += char;
        escaped = false;
        continue;
      }
      
      // 이스케이프 문자
      if (char === '\\') {
        escaped = true;
        continue;
      }
      
      if ((char === '"' || char === "'") && (!inQuote || quoteChar === char)) {
        if (inQuote) {
          // 따옴표 종료
          inQuote = false;
          quoteChar = '';
        } else {
          // 따옴표 시작
          inQuote = true;
          quoteChar = char;
        }
        continue;
      }
      
      if (char === ' ' && !inQuote) {
        // 공백 처리 (따옴표 밖에 있는 경우만)
        if (current) {
          tokens.push(current);
          current = '';
        }
        continue;
      }
      
      // 일반 문자
      current += char;
    }
    
    // 마지막 토큰 추가
    if (current) {
      tokens.push(current);
    }
    
    return tokens;
  }
  
  /**
   * 인자 및 플래그 추출
   * @param tokens 토큰 배열 (첫 번째 토큰 제외)
   * @returns 인자 및 플래그 객체
   */
  private extractArgsAndFlags(tokens: string[]): { args: any[], flags: Record<string, any> } {
    const args: any[] = [];
    const flags: Record<string, any> = {};
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      
      if (token.startsWith('--')) {
        // 플래그 (--key=value 또는 --flag)
        const flagParts = token.substring(2).split('=');
        const key = flagParts[0];
        
        if (flagParts.length > 1) {
          // --key=value 형식
          flags[key] = this.parseValue(flagParts.slice(1).join('='));
        } else {
          // --flag 형식 (불리언 플래그)
          flags[key] = true;
        }
      } else if (token.startsWith('-') && token.length === 2) {
        // 짧은 플래그 처리 (-f 또는 -f value)
        const flagName = token.substring(1);
        
        // 다음 요소가 있고 플래그나 명령어가 아닌 경우 값으로 처리
        if (i + 1 < tokens.length && !tokens[i + 1].startsWith('-')) {
          flags[flagName] = this.parseValue(tokens[i + 1]);
          i++; // 다음 요소 건너뛰기
        } else {
          flags[flagName] = true;
        }
      } else {
        // 일반 인자
        args.push(this.parseValue(token));
      }
    }
    
    return { args, flags };
  }
  
  /**
   * 값 파싱 (문자열, 숫자, 불리언 등)
   * @param value 문자열 값
   * @returns 파싱된 값
   */
  private parseValue(value: string): any {
    // 불리언 값 처리
    if (value.toLowerCase() === 'true') {
      return true;
    }
    
    if (value.toLowerCase() === 'false') {
      return false;
    }
    
    // 숫자 처리
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      return Number(value);
    }
    
    // JSON 객체 처리 시도
    if ((value.startsWith('{') && value.endsWith('}')) || 
        (value.startsWith('[') && value.endsWith(']'))) {
      try {
        return JSON.parse(value);
      } catch {
        // 파싱 실패 시 문자열로 처리
        return value;
      }
    }
    
    // 기본적으로 문자열 반환
    return value;
  }
  
  /**
   * 명령어 ID를 기반으로 명령어 문자열을 생성합니다.
   * @param commandId 명령어 ID
   * @param type 명령어 타입
   * @returns 명령어 문자열
   */
  public formatCommand(commandId: string, type: CommandType): string {
    if (!commandId) {
      return '';
    }
    
    let prefix = '';
    
    switch (type) {
      case CommandType.AT:
        prefix = '@';
        break;
      case CommandType.SLASH:
        prefix = '/';
        break;
      default:
        break;
    }
    
    return `${prefix}${commandId}`;
  }
  
  /**
   * 명령어와 인자를 조합하여 전체 명령어 문자열을 생성합니다.
   * @param commandId 명령어 ID
   * @param type 명령어 타입
   * @param args 인자 배열
   * @param flags 플래그 객체
   * @returns 전체 명령어 문자열
   */
  public formatCommandWithArgs(
    commandId: string, 
    type: CommandType, 
    args: string[] = [], 
    flags: Record<string, string | boolean> = {}
  ): string {
    const command = this.formatCommand(commandId, type);
    
    const parts: string[] = [command];
    
    // 인자 추가
    args.forEach(arg => {
      // 공백이 포함된 인자는 따옴표로 묶기
      if (arg.includes(' ')) {
        parts.push(`"${arg.replace(/"/g, '\\"')}"`);
      } else {
        parts.push(arg);
      }
    });
    
    // 플래그 추가
    Object.entries(flags).forEach(([key, value]) => {
      if (value === true) {
        parts.push(`--${key}`);
      } else {
        parts.push(`--${key}=${value}`);
      }
    });
    
    return parts.join(' ');
  }
}