/**
 * 프롬프트 어셈블러 서비스
 * 
 * 컨텍스트 기반 프롬프트 생성 및 변수 치환 기능 제공
 * 템플릿 및 규칙 기반 프롬프트 생성 지원
 */

import { 
  IPromptAssembler, 
  PromptTemplate, 
  PromptContext, 
  PromptTemplateType
} from './PromptTypes';
import { IConfigLoader } from '../../types/ConfigTypes';
import { RulesEngineService } from './RulesEngineService';

/**
 * 프롬프트 어셈블러 서비스 클래스
 */
export class PromptAssemblerService implements IPromptAssembler {
  /**
   * 템플릿 맵
   */
  private templates: Map<string, PromptTemplate> = new Map();
  
  /**
   * 기본 시스템 프롬프트
   */
  private defaultSystemPrompt: string = `
    당신은 Axiom이라는 개발 워크플로우 허브에 통합된 AI 어시스턴트입니다.
    개발자들에게 코드 작성, 버그 해결, 문서화 등 다양한 개발 작업을 지원합니다.
    온프레미스 환경에서 실행되며, 보안과 성능이 중요합니다.
    명확하고 정확한 답변을 제공하되, 필요 시 추가 정보를 요청하세요.
  `.trim();
  
  /**
   * PromptAssemblerService 생성자
   * @param configLoader 설정 로더
   * @param rulesEngine 규칙 엔진
   */
  constructor(
    private configLoader: IConfigLoader,
    private rulesEngine: RulesEngineService
  ) {
    // 기본 템플릿 등록
    this.registerDefaultTemplates();
  }
  
  /**
   * 기본 템플릿 등록
   */
  private registerDefaultTemplates(): void {
    // 시스템 프롬프트 템플릿
    this.registerTemplate({
      id: 'default_system',
      type: PromptTemplateType.SYSTEM,
      content: this.defaultSystemPrompt,
      description: '기본 시스템 프롬프트'
    });
    
    // 코드 생성 템플릿
    this.registerTemplate({
      id: 'code_generation',
      type: PromptTemplateType.USER,
      content: `
        다음 조건으로 코드를 생성해주세요:
        
        언어: {{languageId}}
        파일: {{filePath}}
        요청: {{input}}
        
        코드만 생성하고 추가 설명은 작성하지 마세요.
      `.trim(),
      description: '코드 생성 프롬프트',
      tags: ['code', 'generation']
    });
    
    // 코드 리팩토링 템플릿
    this.registerTemplate({
      id: 'code_refactoring',
      type: PromptTemplateType.USER,
      content: `
        다음 코드를 리팩토링해주세요:
        
        \`\`\`{{languageId}}
        {{selectedCode}}
        \`\`\`
        
        요청: {{input}}
        
        더 효율적이고 가독성 높은 코드로 변경해주세요.
        리팩토링된 코드만 제공하고 추가 설명은 작성하지 마세요.
      `.trim(),
      description: '코드 리팩토링 프롬프트',
      tags: ['code', 'refactoring']
    });
    
    // 버그 해결 템플릿
    this.registerTemplate({
      id: 'bug_fixing',
      type: PromptTemplateType.USER,
      content: `
        다음 코드의 버그를 해결해주세요:
        
        \`\`\`{{languageId}}
        {{selectedCode}}
        \`\`\`
        
        오류 내용: {{input}}
        
        수정된 코드를 제공하고 변경 사항에 대해 간략히 설명해주세요.
      `.trim(),
      description: '버그 해결 프롬프트',
      tags: ['code', 'bug', 'fixing']
    });
  }
  
  /**
   * 템플릿 등록
   * @param template 프롬프트 템플릿
   * @returns 등록 성공 여부
   */
  registerTemplate(template: PromptTemplate): boolean {
    try {
      this.templates.set(template.id, template);
      return true;
    } catch (error) {
      console.error(`템플릿 등록 실패 (${template.id}):`, error);
      return false;
    }
  }
  
  /**
   * 템플릿 가져오기
   * @param templateId 템플릿 ID
   * @returns 템플릿 또는 undefined
   */
  private getTemplate(templateId: string): PromptTemplate | undefined {
    return this.templates.get(templateId);
  }
  
  /**
   * 변수 치환
   * @param template 템플릿 문자열
   * @param context 컨텍스트
   * @returns 치환된 문자열
   */
  private replaceVariables(template: string, context: PromptContext): string {
    if (!template) {
      return '';
    }
    
    // {{variable}} 형식의 변수 치환
    return template.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
      // 컨텍스트에서 변수 찾기
      if (context[varName as keyof PromptContext] !== undefined) {
        return String(context[varName as keyof PromptContext] || '');
      }
      
      // 사용자 정의 변수 확인
      if (context.variables && context.variables[varName] !== undefined) {
        return String(context.variables[varName] || '');
      }
      
      // 변수를 찾지 못한 경우 원본 유지
      return match;
    });
  }
  
  /**
   * 프롬프트 생성
   * @param basePrompt 기본 프롬프트
   * @param context 컨텍스트
   * @returns 완성된 프롬프트
   */
  /**
   * 텍스트를 기반으로 프롬프트 데이터 생성
   */
  async assemblePrompt(text: string): Promise<{ messages: Array<{role: string, content: string}>, temperature: number }> {
    try {
      // 기본 메시지 구성
      const messages = [
        {
          role: 'system',
          content: this.defaultSystemPrompt
        },
        {
          role: 'user',
          content: text
        }
      ];
      
      // 기본 온도값
      const temperature = 0.7;
      
      return {
        messages,
        temperature
      };
    } catch (error) {
      console.error('프롬프트 생성 중 오류 발생:', error);
      // 오류 발생 시 최소한의 메시지 반환
      return {
        messages: [
          {
            role: 'user',
            content: text || '안녕하세요'
          }
        ],
        temperature: 0.7
      };
    }
  }
  
  /**
   * 기존 메서드 (이전 버전과의 호환성을 위해 유지)
   */
  assemblePromptLegacy(basePrompt: string, context: PromptContext): string {
    try {
      // 변수 치환
      const prompt = this.replaceVariables(basePrompt, context);
      
      // 프롬프트 조정 (필요시 컨텍스트 정보 추가)
      return this.enhancePrompt(prompt, context);
    } catch (error) {
      console.error('프롬프트 생성 중 오류 발생:', error);
      return basePrompt;
    }
  }
  
  /**
   * 템플릿 ID로 프롬프트 생성
   * @param templateId 템플릿 ID
   * @param context 컨텍스트
   * @returns 완성된 프롬프트
   */
  assembleFromTemplate(templateId: string, context: PromptContext): string {
    try {
      // 템플릿 가져오기
      const template = this.getTemplate(templateId);
      
      if (!template) {
        console.warn(`템플릿을 찾을 수 없음: ${templateId}`);
        return '';
      }
      
      // 템플릿 내용 변수 치환
      return this.assemblePrompt(template.content, context);
    } catch (error) {
      console.error(`템플릿 기반 프롬프트 생성 중 오류 발생 (${templateId}):`, error);
      return '';
    }
  }
  
  /**
   * 규칙 기반 프롬프트 생성
   * @param context 컨텍스트
   * @returns 규칙 기반 프롬프트 목록
   */
  assembleFromRules(context: PromptContext): string[] {
    try {
      // 적용 가능한 규칙 조회
      const rules = this.rulesEngine.getApplicableRules(context);
      
      // 규칙별로 템플릿 가져와 프롬프트 생성
      return rules.map(rule => {
        const template = this.getTemplate(rule.templateId);
        
        if (!template) {
          console.warn(`규칙 ${rule.id}에 대한 템플릿을 찾을 수 없음: ${rule.templateId}`);
          return '';
        }
        
        return this.assemblePrompt(template.content, context);
      }).filter(prompt => prompt !== '');
    } catch (error) {
      console.error('규칙 기반 프롬프트 생성 중 오류 발생:', error);
      return [];
    }
  }
  
  /**
   * 프롬프트 개선
   * @param prompt 기본 프롬프트
   * @param context 컨텍스트
   * @returns 개선된 프롬프트
   */
  private enhancePrompt(prompt: string, context: PromptContext): string {
    // 필요에 따라 컨텍스트 정보 추가
    // 이 부분은 필요에 따라 확장 가능
    
    return prompt;
  }
}