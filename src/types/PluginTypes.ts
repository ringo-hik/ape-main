/**
 * 플러그인 관련 타입 정의
 * 
 * Axiom 시스템의 플러그인 아키텍처를 위한 인터페이스 및 타입 정의
 * 내부 및 외부 플러그인을 위한 공통 타입 포함
 */

import { CommandPrefix, CommandType } from './CommandTypes';

/**
 * 플러그인 타입 열거형
 */
export enum PluginType {
  INTERNAL = 'internal',
  EXTERNAL = 'external'
}

/**
 * 플러그인 명령어 인터페이스
 * 플러그인이 제공하는 명령어 정의
 */
export interface PluginCommand {
  /**
   * 명령어 ID
   */
  id: string;
  
  /**
   * 명령어 이름 (레거시 호환성)
   */
  name: string;
  
  /**
   * 명령어 타입
   */
  type: CommandType;
  
  /**
   * 명령어 접두사
   */
  prefix: CommandPrefix;
  
  /**
   * 명령어 설명
   */
  description?: string;
  
  /**
   * 명령어 사용법
   */
  syntax?: string;
  
  /**
   * 명령어 예시
   */
  examples?: string[];
  
  /**
   * 명령어 핸들러 (신규)
   */
  handler?: (...args: any[]) => Promise<any>;
  
  /**
   * 명령어 실행 함수 (레거시)
   */
  execute?: (args: any[]) => Promise<any>;
}

/**
 * 플러그인 인터페이스
 * 모든 플러그인이 구현해야 하는 인터페이스
 */
export interface IPlugin {
  /**
   * 플러그인 ID
   */
  id: string;
  
  /**
   * 플러그인 이름
   */
  name: string;
  
  /**
   * 플러그인 초기화
   * @returns 초기화 결과
   */
  initialize(): Promise<void>;
  
  /**
   * 플러그인 초기화 상태 확인
   * @returns 초기화 여부
   */
  isInitialized(): boolean;
  
  /**
   * 플러그인 명령어 목록 가져오기
   * @returns 명령어 목록
   */
  getCommands(): PluginCommand[];
  
  /**
   * 명령어 실행
   * @param command 명령어 이름
   * @param args 명령어 인자
   * @returns 실행 결과
   */
  executeCommand(command: string, args: any[]): Promise<any>;
  
  /**
   * 플러그인 활성화 여부 확인
   * @returns 활성화 여부
   */
  isEnabled(): boolean;
}

/**
 * 플러그인 레지스트리 인터페이스
 * 플러그인 등록 및 관리
 */
export interface IPluginRegistry {
  /**
   * 플러그인 등록
   * @param plugin 등록할 플러그인
   * @param type 플러그인 타입 (기본: 외부)
   * @returns 등록 성공 여부
   */
  registerPlugin(plugin: IPlugin, type?: PluginType | string): boolean;
  
  /**
   * 플러그인 가져오기
   * @param pluginId 플러그인 ID
   * @returns 플러그인 또는 undefined
   */
  getPlugin(pluginId: string): IPlugin | undefined;
  
  /**
   * 모든 플러그인 가져오기
   * @returns 플러그인 목록
   */
  getAllPlugins(): IPlugin[];
  
  /**
   * 모든 플러그인 명령어 가져오기
   * @returns 명령어 목록
   */
  getAllCommands(): PluginCommand[];
  
  /**
   * 모든 플러그인 초기화
   * @returns 초기화 성공 여부
   */
  initialize(): Promise<boolean>;
  
  /**
   * 명령어 실행
   * @param pluginId 플러그인 ID
   * @param commandName 명령어 이름
   * @param args 명령어 인자
   * @returns 실행 결과
   */
  executeCommand(pluginId: string, commandName: string, args: any[]): Promise<any>;
}

/**
 * Jira 이슈 데이터 인터페이스
 */
export interface JiraIssueData {
  /**
   * 프로젝트 키
   */
  projectKey: string;
  
  /**
   * 이슈 요약
   */
  summary: string;
  
  /**
   * 이슈 설명
   */
  description: string;
  
  /**
   * 이슈 유형
   */
  issueType: string;
  
  /**
   * 우선순위
   */
  priority?: string;
  
  /**
   * 담당자
   */
  assignee?: string;
  
  /**
   * 라벨
   */
  labels?: string[];
  
  /**
   * 사용자 정의 필드
   */
  customFields?: Record<string, any>;
}