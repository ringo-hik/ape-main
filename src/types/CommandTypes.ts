/**
 * 명령어 관련 타입 정의
 * 
 * Axiom 시스템의 명령어 처리를 위한 인터페이스 및 타입 정의
 */

/**
 * 명령어 접두사 열거형
 */
export enum CommandPrefix {
  /**
   * 접두사 없음
   */
  NONE = '',
  
  /**
   * @ 접두사 (외부 시스템 명령어)
   */
  AT = '@',
  
  /**
   * / 접두사 (내부 명령어)
   */
  SLASH = '/'
}

/**
 * 명령어 유형 열거형
 */
export enum CommandType {
  NONE = 'none',
  AT = 'at',
  SLASH = 'slash'
}

/**
 * 명령어 인터페이스
 */
export interface Command {
  /**
   * 명령어 접두사
   */
  prefix: CommandPrefix;
  
  /**
   * 명령어 유형
   */
  type: CommandType;
  
  /**
   * 에이전트/플러그인 ID
   */
  agentId: string;
  
  /**
   * 명령어 이름
   */
  command: string;
  
  /**
   * 명령어 인자
   */
  args: any[];
  
  /**
   * 명령어 플래그
   */
  flags: Record<string, any>;
  
  /**
   * 원본 입력 문자열
   */
  rawInput: string;
}

/**
 * 파싱된 명령어 인터페이스
 */
export interface ParsedCommand {
  /**
   * 명령어 접두사
   */
  prefix: CommandPrefix;
  
  /**
   * 명령어 유형
   */
  type: CommandType;
  
  /**
   * 명령어 이름
   */
  command: string;
  
  /**
   * 명령어 인자
   */
  args: any[];
  
  /**
   * 명령어 플래그
   */
  flags: Map<string, string | boolean>;
  
  /**
   * 원본 입력 문자열
   */
  raw: string;
}

/**
 * 명령어 인터페이스
 */
export interface ICommand {
  /**
   * 명령어 ID
   */
  id: string;
  
  /**
   * 명령어 유형
   */
  type: CommandType;
  
  /**
   * 명령어 접두사
   */
  prefix: CommandPrefix;
  
  /**
   * 명령어 설명
   */
  description: string;
  
  /**
   * 명령어 핸들러
   */
  handler: (...args: any[]) => Promise<any>;
}

/**
 * 명령어 핸들러 타입
 */
export type CommandHandler = (args: any[], flags: Record<string, any>) => Promise<any>;

/**
 * 명령어 사용법 인터페이스
 */
export interface CommandUsage {
  /**
   * 에이전트/플러그인 ID
   */
  agentId: string;
  
  /**
   * 명령어 이름
   */
  command: string;
  
  /**
   * 명령어 설명
   */
  description: string;
  
  /**
   * 명령어 문법
   */
  syntax: string;
  
  /**
   * 명령어 예시
   */
  examples: string[];
}

/**
 * 명령어 파서 인터페이스
 */
export interface ICommandParser {
  /**
   * 명령어 파싱
   * @param input 입력 문자열
   * @returns 파싱된 명령어 또는 null
   */
  parse(input: string): Command | null;
}

/**
 * 명령어 레지스트리 인터페이스
 */
export interface ICommandRegistry {
  /**
   * 명령어 등록
   * @param agentId 에이전트/플러그인 ID
   * @param command 명령어 이름
   * @param handler 명령어 핸들러
   * @returns 등록 성공 여부
   */
  register(agentId: string, command: string, handler: CommandHandler): boolean;
  
  /**
   * 명령어 핸들러 조회
   * @param agentId 에이전트/플러그인 ID
   * @param command 명령어 이름
   * @returns 명령어 핸들러
   */
  getHandler(agentId: string, command: string): CommandHandler | undefined;
  
  /**
   * 모든 명령어 핸들러 조회
   * @returns 명령어 핸들러 맵
   */
  getAllHandlers(): Map<string, Map<string, CommandHandler>>;
  
  /**
   * 명령어 사용법 등록
   * @param usage 명령어 사용법
   * @returns 등록 성공 여부
   */
  registerUsage(usage: CommandUsage): boolean;
  
  /**
   * 명령어 사용법 조회
   * @param agentId 에이전트/플러그인 ID
   * @param command 명령어 이름
   * @returns 명령어 사용법
   */
  getUsage(agentId: string, command: string): CommandUsage | undefined;
  
  /**
   * 에이전트의 모든 명령어 사용법 조회
   * @param agentId 에이전트/플러그인 ID
   * @returns 명령어 사용법 목록
   */
  getAgentCommands(agentId: string): CommandUsage[];
  
  /**
   * 모든 명령어 사용법 조회
   * @returns 명령어 사용법 목록
   */
  getAllCommandUsages(): CommandUsage[];
}

/**
 * 명령어 실행기 인터페이스
 */
export interface ICommandExecutor {
  /**
   * 명령어 실행
   * @param command 명령어
   * @returns 실행 결과
   */
  execute(command: Command): Promise<any>;
}