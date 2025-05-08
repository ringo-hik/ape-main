import * as vscode from 'vscode';
import { LLMService } from '../llm/llmService';

/**
 * 스마트 프롬프팅 상태 인터페이스
 */
export interface SmartPromptingState {
  enabled: boolean;
  mode: SmartPromptingMode;
}

/**
 * 스마트 프롬프팅 모드 열거형
 */
export enum SmartPromptingMode {
  Basic = 'basic',         // 기본 모드
  Advanced = 'advanced',   // 고급 모드
  Expert = 'expert'        // 전문가 모드
}

/**
 * 스마트 프롬프팅 서비스
 * 
 * 메시지 처리 전에 프롬프트를 증강하여 LLM 응답 품질을 향상시킵니다.
 * Chain of Thought(CoT) 및 동적 프롬프트 어셈블링을 지원합니다.
 */
export class SmartPromptingService {
  private state: SmartPromptingState = {
    enabled: false,
    mode: SmartPromptingMode.Basic
  };
  
  private readonly stateChangeEmitter = new vscode.EventEmitter<SmartPromptingState>();
  public readonly onStateChanged = this.stateChangeEmitter.event;
  
  /**
   * 스마트 프롬프팅 서비스 생성자
   * @param context VSCode 확장 컨텍스트
   * @param llmService LLM 서비스
   */
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly llmService: LLMService
  ) {
    // 저장된 상태 복원
    this.restoreState();
    
    // 컨텍스트 서브스크립션에 이벤트 에미터 등록
    this.context.subscriptions.push(this.stateChangeEmitter);
  }
  
  /**
   * 저장된 상태 복원
   */
  private restoreState(): void {
    const savedState = this.context.globalState.get<SmartPromptingState>('ape.smartPrompting.state');
    if (savedState) {
      this.state = savedState;
    }
  }
  
  /**
   * 상태 저장
   */
  private saveState(): void {
    this.context.globalState.update('ape.smartPrompting.state', this.state);
  }
  
  /**
   * 스마트 프롬프팅 활성화 여부 반환
   */
  public isEnabled(): boolean {
    return this.state.enabled;
  }
  
  /**
   * 현재 스마트 프롬프팅 모드 반환
   */
  public getMode(): SmartPromptingMode {
    return this.state.mode;
  }
  
  /**
   * 현재 상태 반환
   */
  public getState(): SmartPromptingState {
    return { ...this.state };
  }
  
  /**
   * 스마트 프롬프팅 활성화/비활성화
   * @param enabled 활성화 여부
   */
  public setEnabled(enabled: boolean): void {
    if (this.state.enabled !== enabled) {
      this.state.enabled = enabled;
      this.saveState();
      this.stateChangeEmitter.fire(this.getState());
    }
  }
  
  /**
   * 스마트 프롬프팅 모드 설정
   * @param mode 스마트 프롬프팅 모드
   */
  public setMode(mode: SmartPromptingMode): void {
    if (this.state.mode !== mode) {
      this.state.mode = mode;
      this.saveState();
      this.stateChangeEmitter.fire(this.getState());
    }
  }
  
  /**
   * 스마트 프롬프팅 토글
   */
  public toggle(): void {
    this.setEnabled(!this.state.enabled);
  }
  
  /**
   * 사용자 메시지를 스마트 프롬프팅으로 처리
   * @param message 원본 사용자 메시지
   * @returns 증강된 메시지
   */
  public processMessage(message: string): string {
    if (!this.state.enabled) {
      return message;
    }
    
    // 현재 모드에 따라 다른 프롬프팅 전략 적용
    switch (this.state.mode) {
      case SmartPromptingMode.Basic:
        return this.applyBasicPrompting(message);
      case SmartPromptingMode.Advanced:
        return this.applyAdvancedPrompting(message);
      case SmartPromptingMode.Expert:
        return this.applyExpertPrompting(message);
      default:
        return message;
    }
  }
  
  /**
   * 기본 스마트 프롬프팅 적용
   * @param message 원본 메시지
   * @returns 증강된 메시지
   */
  private applyBasicPrompting(message: string): string {
    // 기본 프롬프팅: 명확한 지시와 구조화된 응답 요청 추가
    return `${message}\n\n당신의 응답은 명확하고 구조화된 방식으로 제공해 주세요. 필요한 경우 단계별 접근 방식을 사용하고, 코드 예제에는 주석과 설명을 포함해 주세요.`;
  }
  
  /**
   * 고급 스마트 프롬프팅 적용
   * @param message 원본 메시지
   * @returns 증강된 메시지
   */
  private applyAdvancedPrompting(message: string): string {
    // 고급 프롬프팅: Chain of Thought 유도 및 다각적 분석 추가
    return `${message}\n\n이 문제에 대해 단계별로 생각해 주세요. 먼저 문제를 분석하고, 가능한 접근 방식들을 고려한 후, 최적의 솔루션을 선택하여 구현해 주세요. 코드 예제는 효율성, 가독성, 유지보수성을 모두 고려하여 작성해 주세요. 대안적 접근 방식이 있다면 장단점과 함께 간략히 언급해 주세요.`;
  }
  
  /**
   * 전문가 스마트 프롬프팅 적용
   * @param message 원본 메시지
   * @returns 증강된 메시지
   */
  private applyExpertPrompting(message: string): string {
    // 전문가 프롬프팅: 심층적 분석과 종합적 접근 유도
    return `${message}\n\n이 문제에 대해 전문가 수준의 분석을 제공해 주세요. 다음의 접근 방식으로 진행해 주세요:
    
1. 문제 정의 및 요구사항 분석
2. 가능한 해결책과 접근 방식 탐색 (각각의 장단점 포함)
3. 최적의 접근 방식 선택 및 그 이유 설명
4. 구현 세부사항 및 코드 예제 제시
5. 잠재적 리팩토링 기회 및 최적화 방안 고려
6. 검증 및 테스트 전략 제안

코드 예제는 최신 모범 사례, 패턴, 효율적인 알고리즘을 활용하고, 예외 처리 및 엣지 케이스를 고려해 주세요. 필요한 경우 성능, 확장성 또는 유지보수성 측면의 절충점을 명시적으로 언급해 주세요.`;
  }
  
  /**
   * 서비스 정리
   */
  public dispose(): void {
    this.stateChangeEmitter.dispose();
  }
}