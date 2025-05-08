# LLM 서비스 자체 테스트 (llm-self-test)

이 문서는 APE Extension의 LLM 서비스에 대한 자체 테스트 구현에 대해 설명합니다.

## 개요

LLM 자체 테스트는 실제 API 호출 없이 LLM 서비스의 기능을 테스트하기 위한 목적으로 구현되었습니다. 이 테스트는 실제 LLM API와의 통신을 모킹하여 다양한 시나리오에서 서비스의 동작을 검증합니다.

## 테스트 구조

LLM 테스트는 다음 파일들로 구성되어 있습니다:

1. **모의 서비스 구현**:
   - `src/test/mocks/llm-service-mock.ts`: LLM 서비스를 모킹하는 클래스
   - `src/test/mocks/response-templates/*.json`: 다양한 응답 시나리오를 위한 템플릿

2. **테스트 파일**:
   - `src/test/suite/llm-self.test.ts`: VSCode 환경에서 실행하기 위한 테스트 파일 (현재 미사용)
   - `src/test/simple/llm-test-runner.js`: 독립적인 Node.js 환경에서 실행할 수 있는 테스트 러너

3. **테스트 실행 설정**:
   - `package.json`에 정의된 `test:llm-self` 스크립트

## 실행 방법

LLM 자체 테스트는 다음 명령으로 실행할 수 있습니다:

```bash
npm run test:llm-self
```

이 명령은 `LLM_TEST_MODE=mock` 환경 변수를 설정하고 테스트 러너를 실행합니다.

## 모의 데이터

테스트는 다음과 같은 모의 응답 템플릿을 사용합니다:

1. **default.json**: 기본 응답 템플릿
2. **error-response.json**: 오류 상황에 대한 응답 템플릿
3. **code-completion.json**: 코드 완성 요청에 대한 응답 템플릿
4. **error-fix.json**: 오류 수정 제안에 대한 응답 템플릿

각 템플릿은 다음과 같은 구조를 가집니다:

```json
{
  "message": {
    "id": "고유 식별자",
    "role": "assistant",
    "content": "응답 내용",
    "timestamp": "타임스탬프",
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

## 테스트 케이스

현재 구현된 테스트 케이스는 다음과 같습니다:

1. 모의 응답 형식 확인
2. 기본 대화 흐름 확인
3. 오류 응답 형식 확인
4. 코드 완성 응답 형식 확인
5. LLM_TEST_MODE 환경 변수 설정 확인
6. 스트리밍 시뮬레이션 확인
7. 모든 응답 템플릿의 유효성 확인

## LLM 모의 서비스 이해

`llm-service-mock.ts`는 실제 LLM 서비스의 주요 메소드를 오버라이드하여 테스트 환경에서 작동하도록 합니다:

1. **sendRequest**: 모의 응답 데이터를 반환
2. **streamResponse**: 모의 스트리밍 응답을 시뮬레이션
3. **getCompletion**: 간단한 완성 요청을 시뮬레이션

## 확장 방법

더 많은 테스트 케이스를 추가하려면:

1. `src/test/mocks/response-templates/`에 새로운 응답 템플릿 추가
2. `llm-service-mock.ts`의 `selectTemplateByRequest` 메소드에 새 템플릿 선택 로직 추가
3. `llm-test-runner.js`에 새로운 테스트 케이스 추가

## 향후 개선 사항

1. 실제 VSCode 환경에서 실행 가능한 테스트 추가
2. 더 다양한 응답 시나리오 및 에러 상황 테스트 추가
3. 단위 테스트 커버리지 개선