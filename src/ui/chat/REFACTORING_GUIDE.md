# ChatViewProvider 리팩토링 가이드

## 개요

ChatViewProvider는 현재 약 3,000줄에 달하는 대형 파일로, 다양한 책임을 가지고 있습니다. 이를 더 작고 관리하기 쉬운 모듈로 분리하여 유지보수성을 향상시키기 위한 리팩토링 가이드입니다.

## 현재 구조 분석

현재 `ChatViewProvider`는 다음과 같은 책임을 가지고 있습니다:

1. WebView 생성 및 초기화
2. 메시지 저장 및 관리
3. LLM 통신 처리
4. 명령어 처리 및 제안
5. UI 요소 렌더링 및 스타일링
6. 이벤트 처리 및 메시지 송수신
7. 메시지 포맷팅 및 HTML 생성

이는 단일 책임 원칙(SRP)에 위배되며, 코드의 복잡성과 유지보수 비용을 증가시킵니다.

## 새로운 구조

다음과 같은 모듈로 분리하여 각 모듈이 단일 책임을 가지도록 리팩토링합니다:

1. **ChatViewFormatter**: 메시지와 마크다운 포맷팅 담당 (이미 구현됨)
   - 마크다운 파싱
   - 코드 블록 처리
   - HTML 이스케이프 및 변환

2. **ChatViewCommandHandler**: 명령어 처리 및 제안 담당 (이미 구현됨)
   - 슬래시 명령어 실행
   - 명령어 제안 생성
   - 명령어 관련 이벤트 처리

3. **ChatViewRenderer**: UI 렌더링 담당 (이미 구현됨)
   - 메시지 렌더링
   - 웹뷰 통신
   - UI 업데이트

4. **ChatViewMessageManager**: 메시지 상태 관리 담당 (이미 구현됨)
   - 메시지 저장 및 로드
   - 메시지 필터링
   - LLM 통신

5. **ChatViewProvider**: 다른 모듈을 조합하여 웹뷰를 관리하는 컨트롤러 역할
   - 웹뷰 생성 및 초기화
   - 이벤트 핸들링
   - 다른 모듈 조합

## 통합 방법

### 1단계: 모듈 생성 및 구현

✅ 다음 모듈을 구현합니다:
- ✅ ChatViewFormatter (완료)
- ✅ ChatViewCommandHandler (완료)
- ✅ ChatViewRenderer (완료)
- ✅ ChatViewMessageManager (완료)

### 2단계: ChatViewProvider 업데이트

- 기존 ChatViewProvider 코드를 유지하면서, 새로운 구조를 점진적으로 도입합니다.
- 모든 의존성을 생성자를 통해 주입받도록 수정합니다.
- 새로운 모듈들을 인스턴스화하고 사용합니다.

예시:
```typescript
export class ChatViewProvider implements vscode.WebviewViewProvider {
  private _messageManager: ChatViewMessageManager;
  private _commandHandler: ChatViewCommandHandler;
  private _renderer: ChatViewRenderer;
  
  constructor(
    private readonly _context: vscode.ExtensionContext,
    private readonly _llmService: LLMService,
    private readonly _memoryService: MemoryService,
    private readonly _commandManager: CommandManager,
    private readonly _modelManager?: ModelManager
  ) {
    // 새 모듈 초기화
    this._messageManager = new ChatViewMessageManager(_context, _memoryService, _llmService);
    this._commandHandler = new ChatViewCommandHandler(_commandManager);
    this._renderer = new ChatViewRenderer();
    
    // 스마트 프롬프팅 서비스 초기화 (기존 코드)
    this._smartPromptingService = new SmartPromptingService(_context, _llmService);
    
    // 상태 변경 리스너 등록 (기존 코드)
    this._smartPromptingStateListener = this._smartPromptingService.onStateChanged(state => {
      this._updateSmartPromptingUI(state);
    });
    
    // 컨텍스트 서브스크립션에 리스너 등록 (기존 코드)
    this._context.subscriptions.push(this._smartPromptingStateListener);
  }
  
  // 각 메소드를 새 모듈을 사용하도록 수정
}
```

### 3단계: 점진적 마이그레이션

- 기존 메서드를 새 모듈의 메서드를 호출하도록 수정합니다.
- 각 메서드를 하나씩 마이그레이션하고 테스트합니다.
- 모든 메서드 마이그레이션 후, 코드를 정리합니다.

### 4단계: 최종 정리

- 모든 기능이 새 모듈로 이동되었는지 확인합니다.
- 불필요한 코드를 제거합니다.
- 필요한 경우 인터페이스를 추가하여 결합도를 낮춥니다.

## 장점

1. **유지보수성 향상**: 각 모듈이 단일 책임을 가지므로 코드 이해가 쉬워집니다.
2. **테스트 용이성**: 작은 모듈은 독립적으로 테스트하기 쉽습니다.
3. **확장성**: 특정 기능을 수정하거나 확장할 때 관련 모듈만 수정하면 됩니다.
4. **재사용성**: 모듈화된 코드는 다른 부분에서 재사용하기 쉽습니다.

## 주의사항

- 리팩토링 중에는 기능 변경을 하지 않습니다. 동일한 기능을 유지하면서 코드 구조만 개선합니다.
- 각 단계마다 테스트하여 기능이 정상적으로 작동하는지 확인합니다.
- 기존 코드와의 호환성을 유지합니다.

---

이 가이드는 코드베이스의 모듈화 및 유지보수성 향상을 위한 첫 번째 단계입니다. 제안된 구조는 필요에 따라 조정될 수 있습니다.