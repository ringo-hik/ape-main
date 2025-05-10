# ChatViewProvider 구현 가이드

## 개요

이 가이드는 새로 생성된 모듈화된 컴포넌트를 기존 ChatViewProvider에 통합하기 위한 단계별 방법을 설명합니다. 점진적인 마이그레이션을 통해 코드베이스를 개선하고 모듈화합니다.

## 생성된 모듈 구조

다음 모듈을 생성했습니다:

1. **ChatViewFormatter**: 마크다운 및 코드 포맷팅 담당
2. **ChatViewCommandHandler**: 명령어 처리 및 제안 담당
3. **ChatViewRenderer**: UI 렌더링 담당
4. **ChatViewMessageManager**: 메시지 상태 관리 담당
5. **ChatViewProviderIntegration**: 통합 계층

## 통합 단계

### 1단계: ChatViewProviderIntegration을 확장명으로 import

기존 코드에 영향을 주지 않으면서 점진적으로 리팩토링하기 위해 먼저 새로운 통합 클래스를 extension.ts에 import합니다.

```typescript
// extension.ts
import { ChatViewProviderIntegration } from './ui/chat/chatViewProviderIntegration';

// 기존 코드 유지하면서 통합 인스턴스 생성
const chatViewIntegration = new ChatViewProviderIntegration(
  context,
  llmService,
  memoryService,
  commandManager,
  modelManager
);
```

### 2단계: 기존 ChatViewProvider에 사용성 검증 및 테스트

새 모듈을 대체하기 전에 모든 기능이 제대로 작동하는지 검증합니다:

1. 필요한 세부 기능을 통합하고
2. 일부 메서드를 새 모듈을 사용하도록 변경하고
3. 테스트하여 모든 기능이 예상대로 작동하는지 확인합니다.

예를 들어 ChatViewProvider의 formatContent 메서드를 ChatViewFormatter를 사용하도록 변경할 수 있습니다:

```typescript
// chatViewProvider.ts 내부
private formatMessageContent(content: string): string {
  // 기존 포맷팅 로직 대신 ChatViewFormatter 사용
  return ChatViewFormatter.formatMessageContent(content);
}
```

### 3단계: 전체 마이그레이션

모든 기능이 검증된 후, 다음 단계는 전체 마이그레이션입니다:

1. `ChatViewProviderIntegration`을 `ChatViewProvider`의 대체품으로 사용
2. `ChatViewProviderIntegration`을 `ChatViewProvider`로 이름 변경
3. 기존 `ChatViewProvider`를 `ChatViewProvider_Legacy`로 이름 변경 (참조용)

### 4단계: 향후 개선 사항

모듈화 후 다음과 같은 추가 개선이 가능합니다:

1. **명시적 의존성 관리**: 의존성 주입을 통해 코드의 결합도 낮추기
2. **단위 테스트 추가**: 각 모듈별 테스트 추가
3. **성능 최적화**: 포맷팅 및 렌더링 로직 최적화
4. **확장성 개선**: 플러그인 시스템 구현을 위한 후크 추가

## 코드 정리 가이드

이번 리팩토링을 통해 다음 패턴을 따르세요:

1. **단일 책임 원칙(SRP)**: 각 모듈은 하나의 책임만 가지도록 합니다.
2. **느슨한 결합**: 컴포넌트 간의 결합도를 낮춰 유지보수성을 향상시킵니다.
3. **높은 응집도**: 관련 기능은 동일한 모듈 내에 두어 코드 이해를 쉽게 합니다.
4. **일관된 네이밍**: 명확하고 일관된 이름을 사용하여 코드 가독성을 높입니다.
5. **중복 제거**: 중복 코드를 제거하고 재사용 가능한 유틸리티 함수를 활용합니다.

## 확장성 지침

새로운 기능을 추가할 때는 다음 과정을 따르세요:

1. 어떤 책임 영역에 해당하는지 결정합니다.
2. 적절한 모듈에 기능을 추가합니다.
3. 필요한 경우에만 새 모듈을 생성합니다.
4. 기존 인터페이스와의 일관성을 유지합니다.

## 알려진 이슈 및 제한사항

1. 현재 멀티 패널 지원 미구현
2. 스마트 프롬프팅 서비스와의 결합도가 여전히 높음
3. UI 렌더링과 상태 관리 일부가 서로 결합되어 있음

## 참고 자료

기존 파일:
- `/home/hik90/ape/new_ape-extension/src/ui/chatViewProvider.ts`

새 모듈화된 파일:
- `/home/hik90/ape/new_ape-extension/src/ui/chat/chatViewFormatter.ts`
- `/home/hik90/ape/new_ape-extension/src/ui/chat/chatViewCommandHandler.ts`
- `/home/hik90/ape/new_ape-extension/src/ui/chat/chatViewRenderer.ts`
- `/home/hik90/ape/new_ape-extension/src/ui/chat/chatViewMessageManager.ts`
- `/home/hik90/ape/new_ape-extension/src/ui/chat/chatViewProviderIntegration.ts`

리팩토링 가이드:
- `/home/hik90/ape/new_ape-extension/src/ui/chat/REFACTORING_GUIDE.md`