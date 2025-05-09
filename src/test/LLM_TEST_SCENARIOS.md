# LLM 테스트 시나리오

본 문서는 APE Extension의 LLM 기능 테스트를 위한 주요 시나리오를 설명합니다. 개발자와 테스터는 이 시나리오들을 참조하여 기능이 정상적으로 작동하는지 확인할 수 있습니다.

## 기본 대화 시나리오

### 1. 기본 질의응답 테스트

**목적**: LLM의 기본적인 질의응답 기능 검증

**단계**:
1. 사용자가 일반적인 질문 입력 (예: "안녕하세요, 테스트입니다.")
2. LLM이 적절한 응답 반환 확인
3. 응답 형식 및 내용 검증

**기대 결과**:
- 응답이 빈 문자열이 아님
- 응답 형식이 올바름 (역할이 assistant)
- 응답 내용이 질문과 관련성 있음

### 2. 코드 생성 테스트

**목적**: LLM의 코드 생성 기능 검증

**단계**:
1. 사용자가 코드 샘플 요청 (예: "간단한 JavaScript 함수를 보여주세요.")
2. LLM이 코드 블록이 포함된 응답 반환 확인
3. 코드 블록 형식 및 내용 검증

**기대 결과**:
- 응답에 코드 블록이 포함됨 (```로 감싸짐)
- 코드가 실행 가능하고 문법적으로 올바름
- 코드 주석 또는 설명이 포함됨

### 3. 오류 처리 테스트

**목적**: LLM 서비스의 오류 처리 기능 검증

**단계**:
1. 잘못된 형식의 요청 또는 오류 발생 시나리오 시뮬레이션
2. LLM 서비스의 오류 처리 및 응답 확인
3. 오류 메시지 형식 및 내용 검증

**기대 결과**:
- 오류 상황에서 명확한 오류 메시지 제공
- 서비스 중단 없이 오류 상태에서 복구
- 사용자에게 오류 원인 및 해결 방법 안내

## UI 상호작용 시나리오

### 4. 채팅 입력 및 전송 테스트

**목적**: 채팅 UI의 입력 및 전송 기능 검증

**단계**:
1. 채팅 입력창에 텍스트 입력
2. 전송 버튼 클릭 또는 Enter 키 누름
3. 메시지 전송 및 UI 업데이트 확인

**기대 결과**:
- 사용자 메시지가 채팅창에 표시됨
- 입력창이 초기화됨
- 응답 대기 중 상태 표시 (로딩 인디케이터)

### 5. 응답 스트리밍 테스트

**목적**: LLM 응답 스트리밍 기능 검증

**단계**:
1. 사용자 메시지 전송
2. 응답이 점진적으로 표시되는지 확인
3. 스트리밍 완료 후 상태 확인

**기대 결과**:
- 응답이 한 글자씩 또는 청크 단위로 점진적으로 표시됨
- 스트리밍 중 사용자 인터페이스가 반응성을 유지함
- 스트리밍 완료 시 로딩 인디케이터가 사라짐

### 6. 다중 메시지 대화 테스트

**목적**: 여러 메시지 교환을 포함한 대화 흐름 검증

**단계**:
1. 첫 번째 사용자 메시지 전송
2. LLM 응답 수신 및 확인
3. 두 번째 사용자 메시지 전송 (이전 대화 참조)
4. 두 번째 응답이 대화 맥락을 유지하는지 확인

**기대 결과**:
- 두 번째 응답이 이전 대화 맥락을 고려함
- 대화 이력이 올바르게 표시됨
- 스크롤 위치가 최신 메시지로 자동 조정됨

## 고급 기능 시나리오

### 7. VAULT 통합 테스트

**목적**: LLM과 VAULT 서비스 통합 검증

**단계**:
1. VAULT 컨텍스트를 포함한 요청 생성
2. LLM 서비스가 VAULT 컨텍스트를 처리하는지 확인
3. 응답에 VAULT 정보가 적절히 반영되었는지 검증

**기대 결과**:
- VAULT 컨텍스트가 LLM 요청에 포함됨
- 응답이 VAULT 컨텍스트를 고려하여 생성됨
- 민감 정보가 보호되며 필요한 정보만 노출됨

### 8. Rules 통합 테스트

**목적**: LLM과 Rules 서비스 통합 검증

**단계**:
1. 활성화된 Rules가 있는 상태에서 요청 생성
2. LLM 서비스가 Rules를 준수하는지 확인
3. 응답이 Rules에 맞게 필터링되는지 검증

**기대 결과**:
- Rules가 LLM 요청에 적용됨
- 응답이 Rules를 준수함
- Rules 위반 시 적절한 처리 또는 경고 메시지 표시

### 9. 모델 전환 테스트

**목적**: 다른 LLM 모델 간 전환 기능 검증

**단계**:
1. 기본 모델로 요청 생성 및 응답 확인
2. 다른 모델로 전환
3. 동일한 요청으로 새 모델의 응답 확인

**기대 결과**:
- 모델 전환이 성공적으로 이루어짐
- 각 모델이 특성에 맞는 응답 생성
- 모델 전환 후 UI에 현재 모델 표시됨

## 성능 및 안정성 시나리오

### 10. 장시간 대화 테스트

**목적**: 장시간 대화 세션에서의 안정성 검증

**단계**:
1. 10회 이상의 메시지 교환을 포함한 대화 진행
2. 메모리 사용량 및 응답 시간 모니터링
3. 장시간 후의 대화 맥락 유지 확인

**기대 결과**:
- 메모리 누수 없이 안정적으로 작동
- 응답 시간이 일관적으로 유지됨
- 대화 맥락이 최대 한도까지 유지됨

### 11. 대용량 응답 테스트

**목적**: 대용량 텍스트 응답 처리 검증

**단계**:
1. 긴 응답을 유발하는 요청 생성 (예: "긴 소설을 써주세요.")
2. 응답 생성 및 표시 과정 모니터링
3. UI 렌더링 및 사용자 인터페이스 반응성 확인

**기대 결과**:
- 대용량 응답이 성공적으로 처리됨
- UI가 응답을 적절히 렌더링함
- 스크롤 및 상호작용이 원활하게 작동함

### 12. 네트워크 중단 테스트

**목적**: 네트워크 연결 문제 시 동작 검증

**단계**:
1. 요청 전송 중 네트워크 연결 중단 시뮬레이션
2. 오류 처리 및 복구 과정 확인
3. 연결 복구 후 기능 정상화 확인

**기대 결과**:
- 네트워크 오류 시 적절한 오류 메시지 표시
- 부분적으로 수신된 응답이 있다면 해당 부분까지 표시
- 연결 복구 시 대화를 계속할 수 있는 옵션 제공

## 테스트 환경 구성

### 모의 환경 테스트

모의 환경에서는 각 시나리오에 대한 모의 응답을 준비하여 테스트합니다:

```javascript
// 예: 코드 생성 테스트를 위한 모의 응답
{
  "message": {
    "role": "assistant",
    "content": "다음은 간단한 JavaScript 함수입니다:\n\n```javascript\nfunction greet(name) {\n  return `Hello, ${name}!`;\n}\n```\n\n이 함수는 이름을 매개변수로 받아 인사말을 반환합니다."
  }
}
```

### 실제 환경 테스트

실제 환경에서는 VSCode 확장 개발 모드에서 실제 LLM API를 호출하여 테스트합니다:

1. `LLM_TEST_MODE` 환경 변수를 설정하지 않음
2. 유효한 API 키 구성
3. VSCode 확장 개발 창에서 테스트 실행

## 테스트 결과 해석

테스트 결과는 다음과 같은 방식으로 해석합니다:

- **성공**: 모든 기대 결과가 충족됨
- **부분 성공**: 핵심 기능은 작동하나 일부 기대 결과가 충족되지 않음
- **실패**: 핵심 기능이 작동하지 않거나 오류 발생

테스트 성공 여부는 각 시나리오의 주요 목적과 기대 결과를 기준으로 판단합니다.