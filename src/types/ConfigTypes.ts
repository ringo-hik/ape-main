/**
 * 설정 관련 타입 정의
 * 
 * Axiom 시스템의 설정 관리를 위한 인터페이스 및 타입 정의
 */

/**
 * 설정 섹션 타입
 */
export type ConfigSection = Record<string, any>;

/**
 * 코어 설정 인터페이스
 */
export interface CoreConfig {
  /**
   * 로그 레벨
   */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  
  /**
   * SSL 우회 여부
   */
  sslBypass?: boolean;
  
  /**
   * 로컬 저장소 경로
   */
  storagePath?: string;
  
  /**
   * 오프라인 모드 여부
   */
  offlineMode?: boolean;
}

/**
 * 에이전트 설정 인터페이스
 */
export interface AgentConfig {
  /**
   * 활성화 여부
   */
  enabled?: boolean;
  
  /**
   * 에이전트 이름
   */
  name?: string;
  
  /**
   * 에이전트 설명
   */
  description?: string;
  
  /**
   * API 엔드포인트
   */
  endpoint?: string;
  
  /**
   * 인증 정보
   */
  auth?: {
    type: string;
    token?: string;
    username?: string;
    password?: string;
  };
  
  /**
   * 명령어 설정
   */
  commands?: Record<string, any>;
  
  /**
   * 추가 설정
   */
  options?: Record<string, any>;
}

/**
 * 플러그인 설정 인터페이스
 */
export interface PluginConfig {
  /**
   * 활성화 여부
   */
  enabled?: boolean;
  
  /**
   * 플러그인 이름
   */
  name?: string;
  
  /**
   * 플러그인 설명
   */
  description?: string;
  
  /**
   * 명령어 설정 목록
   */
  commands?: {
    /**
     * 명령어 이름
     */
    name: string;
    
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
    
    /**
     * API 설정
     */
    api?: {
      /**
       * API 엔드포인트
       */
      endpoint: string;
      
      /**
       * HTTP 메서드
       */
      method: string;
      
      /**
       * HTTP 헤더
       */
      headers?: Record<string, string>;
      
      /**
       * 요청 본문
       */
      body?: any;
    };
  }[];
}

/**
 * 설정 로더 인터페이스
 */
export interface IConfigLoader {
  /**
   * 설정 로드
   * @returns 로드 성공 여부
   */
  load(): Promise<boolean>;
  
  /**
   * 설정 섹션 가져오기
   * @param section 섹션 경로
   * @returns 설정 섹션
   */
  getSection<T extends ConfigSection>(section: string): T;
  
  /**
   * 코어 설정 가져오기
   * @returns 코어 설정
   */
  getCoreConfig(): CoreConfig;
  
  /**
   * 에이전트 설정 가져오기
   * @param agentId 에이전트 ID
   * @returns 에이전트 설정
   */
  getAgentConfig(agentId?: string): AgentConfig | Record<string, AgentConfig>;
  
  /**
   * 플러그인 설정 가져오기
   * @param pluginId 플러그인 ID
   * @returns 플러그인 설정
   */
  getPluginConfig(pluginId?: string): PluginConfig | Record<string, PluginConfig>;
  
  /**
   * 설정 값 가져오기
   * @param key 설정 키
   * @param defaultValue 기본값
   * @returns 설정 값 또는 기본값
   */
  get<T>(key: string, defaultValue: T): T;
  
  /**
   * 환경 변수 해석
   * @param value 환경 변수 포함 문자열
   * @returns 해석된 문자열
   */
  resolveEnvVars(value: string): string;
  
  /**
   * 설정 값 설정
   * @param key 설정 키
   * @param value 설정 값
   */
  set(key: string, value: any): void;
  
  /**
   * 설정 저장
   * @returns 저장 성공 여부
   */
  save(): boolean;
}