# LLM 테스트 가이드

## 개요

이 문서는 APE Extension의 LLM(Large Language Model) 테스트 시스템에 대한 상세한 설명과 사용 방법을 제공합니다. LLM 테스트는 크게 두 가지 모드로 구성되어 있습니다:

1. **기본 단위 테스트 (llm-self-test)**: 모의(mock) 데이터를 사용하여 LLM 서비스의 기본 기능 테스트
2. **종합 테스트 (llm-full-test)**: 실제 UI 상호작용을 포함한 통합 테스트

## 테스트 메커니즘

### 1. 모의(Mock) 메커니즘

테스트 시스템은 LLM API 호출을 모의 응답으로 대체하여 실제 API 호출 없이도 기능을 테스트할 수 있습니다:

```
사용자 요청 → LLM 서비스 → [모의 응답 시스템] → 응답 처리
```

이 과정에서 다음과 같은 주요 컴포넌트가 작동합니다:

- **LLMServiceMock**: LLM 서비스의 메소드를 모킹하는 클래스
- **응답 템플릿**: 다양한 시나리오의 모의 응답을 JSON 형식으로 저장
- **환경 변수**: `LLM_TEST_MODE=mock`으로 설정하여 모의 모드 활성화

### 2. DOM 테스트 메커니즘

UI 테스트는 WebdriverIO를 사용하여 실제 VSCode 웹뷰와 상호작용합니다:

```
테스트 케이스 → WebdriverIO → VSCode 웹뷰 → DOM 요소 검증 → 결과 평가
```

이 과정에서 다음 컴포넌트가 작동합니다:

- **LLMDOMValidator**: LLM UI 요소를 검증하는 클래스
- **MockBrowser**: 브라우저 환경이 없을 때 사용하는 모의 브라우저
- **Orchestrator**: 테스트 흐름을 조정하는 중앙 컴포넌트

## 테스트 종류

### 1. 기본 단위 테스트 (npm run test:llm-self)

이 테스트는 LLM 서비스의 코어 기능만 검증합니다:

- 모의 응답 형식 검증
- 기본 대화 흐름 테스트
- 오류 응답 처리 테스트
- 스트리밍 메커니즘 테스트

### 2. 종합 테스트 (npm run test:llm-full)

이 테스트는 실제 VSCode 환경에서 UI 요소와의 상호작용을 포함한 종합적인 테스트를 수행합니다:

- LLM 관련 DOM 요소 검증
- 메시지 전송 및 응답 처리 테스트
- 특정 프롬프트에 대한 응답 패턴 테스트

## 사용자 역할

### 개발자 역할

개발자는 다음과 같은 작업을 수행할 수 있습니다:

1. **테스트 실행**:
   ```bash
   # 기본 단위 테스트 실행
   npm run test:llm-self
   
   # 종합 테스트 실행 (모의 환경)
   npm run test:llm-full
   
   # 실제 VSCode 환경에서 종합 테스트 실행 (VSCode 확장 개발 환경 필요)
   # VSCode 확장 개발 창에서 F5로 디버깅 모드 실행 후:
   npm run test:webview -- --spec src/test/suite/llm-full.test.ts
   ```

2. **테스트 케이스 추가**:
   - `src/test/mocks/response-templates/` 디렉토리에 새 응답 템플릿 추가
   - `src/test/llm-webview-tests/` 디렉토리에 새 테스트 케이스 추가
   - `LLMServiceMock` 클래스에 필요한 모킹 로직 추가

3. **테스트 디버깅**:
   - 테스트 실패 시 각 단계별 로그 확인
   - VSCode 디버깅 도구를 사용한 단계별 실행
   - `test:llm-self` 모드에서 상세 로그 활성화

### LLM(AI 모델) 역할

LLM은 테스트 시스템에서 다음과 같은 역할을 담당합니다:

1. **응답 생성**: 실제 환경에서 대화 입력에 대한 응답 생성
2. **모의 응답 접근**: `LLM_TEST_MODE=mock`일 때 모의 응답 반환
3. **오류 처리**: 오류 상황에 대한 적절한 응답 생성

## 테스트 환경 설정

### 모의 환경

모의 환경에서는 실제 VSCode API나 브라우저가 필요하지 않습니다:

1. **환경 변수 설정**:
   ```bash
   export LLM_TEST_MODE=mock
   ```

2. **모의 브라우저 로드**:
   ```javascript
   require('./mock-browser');
   ```

### 실제 VSCode 환경

실제 VSCode 확장 개발 환경에서는 다음 설정이 필요합니다:

1. **VSCode 확장 개발 모드 실행**:
   - F5 키를 눌러 디버깅 모드에서 확장 실행
   - 새 VSCode 인스턴스가 열리면 테스트 실행 준비 완료

2. **테스트 명령 실행**:
   ```bash
   npm run test:webview -- --spec src/test/suite/llm-full.test.ts
   ```

## 테스트 파일 구조

```
src/test/
├── mocks/                     # 모의 응답 및 서비스
│   ├── llm-service-mock.ts    # LLM 서비스 모킹
│   └── response-templates/    # 다양한 응답 템플릿
│       ├── default.json
│       ├── error-response.json
│       ├── code-completion.json
│       └── error-fix.json
├── simple/                    # 단순 테스트
│   └── llm-test-runner.js     # 기본 테스트 러너
├── llm-webview-tests/         # UI 통합 테스트
│   ├── llm-dom-validator.ts   # DOM 요소 검증
│   ├── llm-message-test.ts    # 메시지 테스트
│   └── llm-orchestrator.ts    # 테스트 조정
├── suite/                     # Mocha 테스트 스위트
│   └── llm-full.test.ts       # 종합 테스트
├── mock-browser.js            # 모의 브라우저 환경
├── mock-test.js               # 모의 환경 테스트 러너
└── setup-test.ts              # 테스트 환경 설정
```

## 응답 템플릿 구조

각 모의 응답 템플릿은 다음과 같은 구조를 가집니다:

```json
{
  "message": {
    "id": "고유 ID",
    "role": "assistant",
    "content": "응답 내용",
    "timestamp": "시간 정보",
    "metadata": {
      "model": "모델 이름"
    }
  },
  "usage": {
    "promptTokens": 토큰 수,
    "completionTokens": 토큰 수,
    "totalTokens": 토큰 수
  },
  "content": "응답 내용"
}
```

## 테스트 커스터마이징

### 새 응답 템플릿 추가

1. `src/test/mocks/response-templates/` 디렉토리에 새 JSON 파일 생성
2. 응답 템플릿 형식에 맞춰 내용 작성
3. `llm-service-mock.ts`에서 템플릿 선택 로직 수정

```javascript
private selectTemplateByRequest(messages: Message[], options?: LLMRequestOptions): string {
  // 마지막 사용자 메시지 찾기
  const lastUserMessage = [...messages].reverse().find(msg => msg.role === MessageRole.User);
  
  if (lastUserMessage) {
    const content = lastUserMessage.content.toLowerCase();
    
    // 새 템플릿 매칭 조건 추가
    if (content.includes('my_new_keyword')) {
      return 'my-new-template';
    }
  }
  
  return 'default';
}
```

### 새 테스트 케이스 추가

1. `src/test/llm-webview-tests/` 또는 `src/test/suite/`에 새 테스트 파일 추가
2. 기존 테스트 패턴 참조하여 구현
3. `package.json`에 새 테스트 스크립트 추가

## 문제 해결

### 타입스크립트 오류

테스트 파일에서 WebdriverIO 관련 타입 오류가 발생하는 경우:

1. 파일 상단에 `// @ts-nocheck` 추가
2. `src/test/types/` 디렉토리에 필요한 타입 정의 추가

### WebdriverIO 오류

"No browser instance registered" 오류가 발생하는 경우:

1. VSCode 확장 개발 모드에서 실행 중인지 확인
2. 모의 환경에서 테스트하려면 `mock-browser.js` 로드 확인

### 테스트 타임아웃

테스트가 타임아웃되는 경우:

1. Mocha 설정에서 타임아웃 값 증가: `--timeout 60000`
2. 긴 작업 전후에 적절한 대기 시간 추가

## 베스트 프랙티스

1. **모듈화된 테스트 작성**: 작은 단위로 테스트 분리
2. **명확한 단언문 사용**: 테스트 결과 검증 시 구체적인 조건 명시
3. **적절한 모킹 수준 선택**: 필요한 부분만 모킹하여 실제 환경과 유사하게 유지
4. **테스트 환경 분리**: 단위 테스트와 통합 테스트 분리 실행
5. **지속적 테스트 실행**: 코드 변경 후 항상 관련 테스트 실행