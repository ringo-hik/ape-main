# APE Extension 테스트 시스템

## 개요

APE Extension 테스트 시스템은 확장 프로그램의 다양한 기능을 검증하기 위한 통합 테스트 프레임워크입니다. 이 시스템은 LLM(Large Language Model) 서비스, UI 요소, 그리고 전체 시스템 통합을 테스트합니다.

## 테스트 문서

테스트 시스템에 대한 자세한 정보는 다음 문서들을 참조하세요:

- [LLM 테스트 가이드](./LLM_TEST_GUIDE.md) - LLM 테스트 시스템 개요 및 사용 방법
- [LLM 테스트 아키텍처](./LLM_TEST_ARCHITECTURE.md) - LLM 테스트 시스템의 기술적 아키텍처
- [LLM 테스트 시나리오](./LLM_TEST_SCENARIOS.md) - 주요 테스트 시나리오 및 케이스

## 테스트 종류

테스트는 다음과 같은 종류로 구분됩니다:

1. **기본 테스트 (Basic Tests)**
   ```bash
   npm run test:basic
   ```
   VSCode 확장의 기본적인 기능 검증

2. **LLM 자체 테스트 (Self Tests)**
   ```bash
   npm run test:llm-self
   ```
   LLM 서비스 코어 기능 검증 (모의 환경)

3. **LLM 종합 테스트 (Full Tests)**
   ```bash
   npm run test:llm-full
   ```
   LLM 서비스와 UI 통합 테스트 (모의 환경)

4. **웹뷰 테스트 (WebView Tests)**
   ```bash
   npm run test:webview
   ```
   실제 VSCode 웹뷰 환경에서의 통합 테스트

## 테스트 환경 설정

### 모의 환경 테스트

모의 환경 테스트는 실제 API 호출 없이 확장의 기능을 검증합니다:

1. 환경 변수 설정:
   ```bash
   export LLM_TEST_MODE=mock
   ```

2. 테스트 실행:
   ```bash
   npm run test:llm-self   # 기본 단위 테스트
   npm run test:llm-full   # 모의 종합 테스트
   ```

### 실제 VSCode 환경 테스트

VSCode 확장 개발 창에서의 테스트는 다음과 같이 설정합니다:

1. VSCode 확장 개발 모드 실행:
   - VSCode에서 프로젝트 열기
   - F5 키로 디버깅 모드 실행 (새 VSCode 창 열림)

2. 테스트 실행:
   ```bash
   npm run test:webview
   ```

## 테스트 파일 구조

```
src/test/
├── framework/              # 테스트 프레임워크 컴포넌트
├── llm-webview-tests/      # LLM 웹뷰 테스트
├── mocks/                  # 모의 서비스 및 데이터
├── simple/                 # 단순 테스트 러너
├── suite/                  # 테스트 스위트
├── types/                  # 타입 정의
├── LLM_TEST_ARCHITECTURE.md # 아키텍처 문서
├── LLM_TEST_GUIDE.md       # 사용 가이드
├── LLM_TEST_README.md      # LLM 테스트 설명
├── LLM_TEST_SCENARIOS.md   # 테스트 시나리오
├── README.md               # 본 문서
├── mock-browser.js         # 모의 브라우저 환경
├── mock-test.js            # 모의 테스트 러너
└── setup-test.ts           # 테스트 환경 설정
```

## 테스트 결과 및 로그

테스트 결과 및 로그는 콘솔에 출력됩니다. 실패한 테스트는 명확한 오류 메시지와 함께 표시됩니다. 더 자세한 로그는 다음 방법으로 확인할 수 있습니다:

- VSCode 출력 패널 (Output Panel)에서 "APE Extension" 채널 선택
- VSCode 개발자 도구 콘솔 (F12 또는 Ctrl+Shift+I)
- 테스트 실행 시 `--verbose` 옵션 추가

## 테스트 커스터마이징

### 새 테스트 추가

1. 적절한 디렉토리에 테스트 파일 생성:
   - 단위 테스트: `src/test/suite/`
   - UI 테스트: `src/test/llm-webview-tests/`

2. 모의 데이터 추가:
   - `src/test/mocks/response-templates/` 디렉토리에 JSON 파일 추가

3. 테스트 스크립트 수정:
   - `package.json`의 "scripts" 섹션에 새 테스트 명령 추가

## 문제 해결

일반적인 문제 및 해결 방법:

1. **타입스크립트 오류**:
   - `// @ts-nocheck` 지시어 사용
   - 필요한 타입 정의 추가

2. **테스트 타임아웃**:
   - Mocha 타임아웃 값 증가
   - 비동기 테스트에 충분한 대기 시간 추가

3. **WebdriverIO 오류**:
   - VSCode 확장 개발 모드 확인
   - WebdriverIO 버전 호환성 확인