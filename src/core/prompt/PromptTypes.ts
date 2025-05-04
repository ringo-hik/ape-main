/**
 * 프롬프트 관련 타입 정의
 * 
 * 동적 프롬프트 생성 및 규칙 엔진을 위한 타입 정의
 */

/**
 * 프롬프트 템플릿 타입
 */
export enum PromptTemplateType {
  /**
   * 시스템 프롬프트
   */
  SYSTEM = 'system',
  
  /**
   * 사용자 프롬프트
   */
  USER = 'user',
  
  /**
   * 응답 프롬프트
   */
  ASSISTANT = 'assistant'
}

/**
 * 프롬프트 템플릿 인터페이스
 */
export interface PromptTemplate {
  /**
   * 템플릿 ID
   */
  id: string;
  
  /**
   * 템플릿 유형
   */
  type: PromptTemplateType;
  
  /**
   * 템플릿 내용
   */
  content: string;
  
  /**
   * 템플릿 설명
   */
  description?: string;
  
  /**
   * 태그 목록
   */
  tags?: string[];
}

/**
 * 프롬프트 컨텍스트 인터페이스
 */
export interface PromptContext {
  /**
   * 사용자 입력
   */
  input?: string;
  
  /**
   * 선택된 코드
   */
  selectedCode?: string;
  
  /**
   * 활성 파일 경로
   */
  filePath?: string;
  
  /**
   * 현재 프로젝트 이름
   */
  project?: string;
  
  /**
   * 언어 ID
   */
  languageId?: string;
  
  /**
   * 사용자 정의 변수
   */
  variables?: Record<string, any>;
}

/**
 * 규칙 조건 인터페이스
 */
export interface RuleCondition {
  /**
   * 조건 필드
   */
  field: string;
  
  /**
   * 조건 연산자
   */
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex' | 'notEquals' | 'exists';
  
  /**
   * 조건 값
   */
  value: any;
}

/**
 * 규칙 인터페이스
 */
export interface Rule {
  /**
   * 규칙 ID
   */
  id: string;
  
  /**
   * 규칙 이름
   */
  name: string;
  
  /**
   * 규칙 우선순위
   */
  priority: number;
  
  /**
   * 규칙 조건 목록 (모든 조건이 만족해야 함)
   */
  conditions: RuleCondition[];
  
  /**
   * 적용할 템플릿 ID
   */
  templateId: string;
  
  /**
   * 규칙 태그
   */
  tags?: string[];
}

/**
 * 프롬프트 어셈블러 인터페이스
 */
export interface IPromptAssembler {
  /**
   * 프롬프트 생성
   * @param basePrompt 기본 프롬프트
   * @param context 컨텍스트
   * @returns 완성된 프롬프트
   */
  assemblePrompt(basePrompt: string, context: PromptContext): string;
  
  /**
   * 템플릿 ID로 프롬프트 생성
   * @param templateId 템플릿 ID
   * @param context 컨텍스트
   * @returns 완성된 프롬프트
   */
  assembleFromTemplate(templateId: string, context: PromptContext): string;
  
  /**
   * 규칙 기반 프롬프트 생성
   * @param context 컨텍스트
   * @returns 규칙 기반 프롬프트 목록
   */
  assembleFromRules(context: PromptContext): string[];
  
  /**
   * 템플릿 등록
   * @param template 프롬프트 템플릿
   * @returns 등록 성공 여부
   */
  registerTemplate(template: PromptTemplate): boolean;
}

/**
 * 규칙 엔진 인터페이스
 */
export interface IRulesEngine {
  /**
   * 규칙 등록
   * @param rule 규칙
   * @returns 등록 성공 여부
   */
  registerRule(rule: Rule): boolean;
  
  /**
   * 컨텍스트에 적용 가능한 규칙 조회
   * @param context 컨텍스트
   * @returns 적용 가능한 규칙 목록
   */
  getApplicableRules(context: PromptContext): Rule[];
  
  /**
   * 규칙 조건 평가
   * @param condition 조건
   * @param context 컨텍스트
   * @returns 조건 만족 여부
   */
  evaluateCondition(condition: RuleCondition, context: PromptContext): boolean;
}