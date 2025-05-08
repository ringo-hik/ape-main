# LLM 테스트 아키텍처

이 문서는 APE Extension의 LLM 서비스 테스트 아키텍처에 대해 설명합니다.

## 개요

APE Extension의 LLM 테스트는 크게 두 가지 레벨로 구성됩니다:

1. **단위 테스트 (llm-self-test)**: 모의(mock) 데이터를 사용하여 LLM 서비스의 핵심 기능을 테스트합니다.
2. **통합 테스트 (llm-full-test)**: WebDriver를 사용하여 웹뷰 DOM과 실제 UI 상호작용을 포함한 종합 테스트를 수행합니다.

## 테스트 아키텍처 구성

테스트 아키텍처는 다음과 같은 구성 요소로 이루어져 있습니다:

```
src/test/
├── mocks/
│   ├── llm-service-mock.ts      # LLM 서비스 모킹 구현
│   └── response-templates/      # 다양한 응답 시나리오 템플릿
│       ├── default.json
│       ├── error-response.json
│       ├── code-completion.json
│       └── error-fix.json
├── simple/
│   └── llm-test-runner.js       # 단순 테스트 러너 (DOM 테스트 없음)
├── llm-webview-tests/
│   ├── llm-dom-validator.ts     # LLM 웹뷰 DOM 검증기
│   ├── llm-message-test.ts      # LLM 메시지 송수신 테스트
│   └── llm-orchestrator.ts      # LLM 테스트 오케스트레이터
├── suite/
│   ├── llm-self.test.ts         # LLM 자체 테스트 (현재 비활성)
│   └── llm-full.test.ts         # LLM 종합 테스트 (WebDriver 통합)
└── framework/
    ├── webview-dom-validator.ts # 일반 웹뷰 DOM 검증기
    ├── orchestrator.ts          # 일반 테스트 오케스트레이터
    └── ...                      # 기타 공통 테스트 프레임워크 컴포넌트
```

## 테스트 레벨

### 1. 단위 테스트 (llm-self-test)

`npm run test:llm-self` 명령으로 실행되는 단위 테스트는 다음 기능을 검증합니다:

- 모의 응답 형식 확인
- 기본 대화 흐름 확인
- 오류 응답 형식 확인
- 코드 완성 응답 형식 확인
- 환경 변수 설정 확인
- 스트리밍 시뮬레이션 확인
- 모든 응답 템플릿의 유효성 확인

이 테스트는 DOM이나 웹뷰 요소와 관련 없이 순수하게 LLM 서비스의 로직을 검증합니다.

### 2. 통합 테스트 (llm-full-test)

`npm run test:llm-full` 명령으로 실행되는 통합 테스트는 다음을 포함합니다:

- 웹뷰 DOM에 LLM 관련 요소가 올바르게 로드되었는지 확인
- LLM 메시지 전송 및 응답 처리가 올바르게 작동하는지 확인
- 전체 LLM 테스트 사이클이 성공적으로 완료되는지 확인
- 특정 프롬프트에 대한 응답이 기대한 패턴과 일치하는지 확인

이 테스트는 WebDriver를 사용하여 실제 VS Code 환경에서 실행되며, 웹뷰와의 상호작용을 포함합니다.

## 테스트 컴포넌트

### 1. LLM 서비스 모킹 (llm-service-mock.ts)

실제 LLM API 호출 없이 LLM 서비스의 기능을 테스트하기 위한 모킹 구현입니다.

주요 기능:
- `sendRequest`: 모의 응답 데이터 반환
- `streamResponse`: 모의 스트리밍 응답 시뮬레이션
- `getCompletion`: 간단한 완성 요청 시뮬레이션

### 2. LLM DOM 검증기 (llm-dom-validator.ts)

웹뷰 내 LLM 관련 DOM 요소를 검증하는 컴포넌트입니다.

주요 기능:
- LLM UI 요소 검증
- 요소의 인터랙티브 상태 확인
- 메시지 전송 및 응답 처리 테스트

### 3. LLM 메시지 테스트 (llm-message-test.ts)

LLM과의 대화 기능을 테스트하는 컴포넌트입니다.

주요 기능:
- 다양한 테스트 메시지 전송
- 응답 내용 및 형식 검증
- 특정 패턴과의 일치 확인

### 4. LLM 테스트 오케스트레이터 (llm-orchestrator.ts)

LLM 테스트 흐름을 조정하는 중앙 컴포넌트입니다.

주요 기능:
- DOM 검증, 메시지 테스트 등의 흐름 관리
- 테스트 결과 통합
- 특정 프롬프트에 대한 응답 패턴 테스트

## 테스트 커버리지

현재 LLM 테스트는 다음 영역을 커버합니다:

1. **LLM 서비스 로직**
   - 요청 및 응답 처리
   - 메시지 스트리밍
   - 오류 처리

2. **LLM UI 요소**
   - 필수 DOM 요소 검증
   - 사용자 인터페이스 상호작용

3. **메시지 흐름**
   - 메시지 전송
   - 응답 수신 및 표시
   - 다양한 응답 유형 처리

## 확장 및 개선 방향

LLM 테스트를 더욱 강화하기 위한 개선 방향은 다음과 같습니다:

1. **테스트 커버리지 확장**
   - VAULT 통합 테스트
   - Rules 통합 테스트
   - 다양한 모델 전환 테스트
   - 시스템 프롬프트 적용 테스트
   - 컨텍스트 관리 테스트
   - 토큰 제한 처리 테스트
   - 오류 복구 메커니즘 테스트
   - 스트림 취소 기능 테스트

2. **실제 API 연동 테스트**
   - API 키가 있는 환경에서 실제 LLM 서비스와의 통합 테스트
   - 네트워크 지연 및 오류 시나리오 테스트

3. **성능 및 안정성 테스트**
   - 장시간 대화 세션 테스트
   - 메모리 누수 및 성능 저하 확인
   - 다양한 크기의 프롬프트 및 응답 처리 테스트