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
  Basic = 'basic',         // 기본 모드 - 디버깅
  Advanced = 'advanced',   // 고급 모드 - 글쓰기
  Expert = 'expert',       // 전문가 모드 - 코드 분석
  Custom = 'custom'        // 사용자 정의 모드 - 리팩토링
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
      case SmartPromptingMode.Custom:
        return this.applyCustomPrompting(message);
      default:
        return message;
    }
  }
  
  /**
   * 기본 스마트 프롬프팅 적용 (디버깅 특화)
   * @param message 원본 메시지
   * @returns 증강된 메시지
   */
  private applyBasicPrompting(message: string): string {
    // 디버깅 특화 프롬프팅: 문제 진단 및 해결에 초점
    return `${message}\n\n이 코드 문제를 진단하고 해결하는 데 도움을 주세요. 다음 사항을 고려해 주세요:

1. 문제가 발생하는 정확한 조건과 상황 식별
2. 오류 원인에 대한 단계별 추적 및 분석
3. 명확한 해결책 제시 (코드 수정 포함)
4. 문제 재발 방지를 위한 제안

응답은 실행 가능한 해결책에 중점을 두고, 코드 예제에는 자세한 주석과 설명을 포함해 주세요.`;
  }

  /**
   * 고급 스마트 프롬프팅 적용 (글쓰기 특화)
   * @param message 원본 메시지
   * @returns 증강된 메시지
   */
  private applyAdvancedPrompting(message: string): string {
    // 글쓰기 특화 프롬프팅: 문서 및 콘텐츠 작성에 중점
    return `${message}\n\n요청하신 내용에 대한 명확하고 구조화된 글을 작성하겠습니다. 다음 요소를 포함할 것입니다:

1. 명확한 주제와 목적
2. 논리적인 구조와 단계별 설명
3. 기술적 개념의 이해하기 쉬운 설명
4. 적절한 예시와 사용 사례
5. 실용적인 요약 및 결론

글은 전문적이고 명확하며, 필요한 기술적 세부 사항과 실용적인 지침을 균형 있게 제공할 것입니다.`;
  }
  
  /**
   * 전문가 스마트 프롬프팅 적용 (코드 분석 특화)
   * @param message 원본 메시지
   * @returns 증강된 메시지
   */
  private applyExpertPrompting(message: string): string {
    // 전문가 프롬프팅: 심층적 코드 분석과 종합적 접근 유도
    return `${message}\n\n이 코드에 대해 전문가 수준의 심층 분석을 제공해 주세요. 다음의 접근 방식으로 진행해 주세요:

1. 코드의 목적과 주요 기능 식별
2. 아키텍처 및 디자인 패턴 분석
3. 알고리즘 복잡도 및 성능 고려사항 검토
4. 잠재적인 버그, 예외 상황, 엣지 케이스 식별
5. 코드 품질, 가독성, 유지보수성 평가
6. 개선 가능성 및 대안 제시

코드 분석은 구현 세부사항뿐만 아니라 설계 의도와 전체 시스템 맥락에서의 역할도 고려해 주세요. 코드의 강점과 약점을 객관적으로 평가하고, 필요한 경우 개선 방안을 구체적인 코드 예제와 함께 제시해 주세요.`;
  }

  /**
   * 사용자 정의 스마트 프롬프팅 적용 (리팩토링 특화)
   * @param message 원본 메시지
   * @returns 증강된 메시지
   */
  private applyCustomPrompting(message: string): string {
    // 리팩토링 특화 프롬프팅: 코드 개선에 중점
    return `${message}\n\n이 코드에 대한 리팩토링 제안을 상세히 제공해 주세요. 다음 사항에 초점을 맞춰주세요:

1. 코드 중복 제거 및 재사용성 향상 방안
2. 적절한 디자인 패턴 적용 기회
3. 성능 병목 지점 식별 및 최적화 방안
4. 테스트 용이성 및 유지보수성 개선
5. 코드 가독성 및 명확성 향상을 위한 구조 변경
6. 현대적 코딩 관행 및 기능 적용 방안

제안하는 변경 사항은 기존 기능을 손상시키지 않으면서 코드베이스의 품질을 향상시키는 데 중점을 두어야 합니다. 대규모 변경이 필요한 경우, 점진적인 리팩토링 접근 방식을 제안해 주세요.`;
  }
  
  /**
   * 서비스 정리
   */
  public dispose(): void {
    this.stateChangeEmitter.dispose();
  }
}