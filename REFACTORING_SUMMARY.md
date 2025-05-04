# Axiom 확장 리팩토링 요약

## 수행된 작업

### 1. 불필요한 파일 정리
- dist/ 폴더 정리 및 .gitignore 유지
- 중복 문서 파일 제거 (docs/HISTORY.md, claude_settings/CLAUDE.md)
- 불필요한 백업 파일 및 테스트 관련 파일 확인 및 정리

### 2. 코드 수정
- extension.ts에서 chat-test.html 참조를 chat.html로 수정
- 레거시 코드 참조 제거

### 3. 코드 구조 개선
- extension.ts 파일 구조 개선 및 모듈 분리
  - `src/services/ChatService.ts`: 채팅 관련 비즈니스 로직 분리
  - `src/ui/AxiomChatViewProvider.ts`: 웹뷰 UI 관련 로직 분리
  - extension.ts를 간결하게 유지
- index.ts 파일 업데이트 및 문서화

### 4. 문서 재작성
- README.md 개선 및 업데이트
- HISTORY.md 현재 상태에 맞게 최신화
- REFACTORING_PLAN.md 생성으로 리팩토링 계획 문서화
- STREAMING_IMPLEMENTATION.md 작성으로 스트리밍 구현 가이드 제공

### 5. LLM 서비스 개선
- 하드코딩된 API 키 및 모델 설정 제거
- 설정 파일에서 모든 LLM 설정을 로드하도록 변경
- `apiModel` 속성 추가로 내부 모델 ID와 API 요청 모델 ID 분리
- 스트리밍 구현 개선
- 설정 스키마(settings.schema.json)에 LLM 모델 구성 스키마 추가

## 코드 구성 변경

### 변경 전:
- 모든 기능이 extension.ts에 집중됨
- 긴 파일 (500+ 라인)
- 로직과 UI 코드가 혼합됨

### 변경 후:
```
src/
├── extension.ts           # 간결한 진입점 (100+ 라인)
├── index.ts               # 모듈 내보내기 정의
├── services/
│   └── ChatService.ts     # 채팅 비즈니스 로직
├── ui/
│     └── AxiomChatViewProvider.ts  # UI 관련 로직
├── core/
│     ├── AxiomCoreService.ts      # 핵심 서비스 통합
│     ├── command/                 # 명령어 처리 시스템
│     ├── config/                  # 설정 관리 시스템
│     ├── http/                    # HTTP 클라이언트
│     ├── llm/                     # LLM 서비스
│     │     └── LlmService.ts      # 다양한 LLM API 연동
│     ├── plugin-system/           # 플러그인 시스템
│     ├── prompt/                  # 프롬프트 처리
│     ├── utils/                   # 유틸리티
│     └── vscode/                  # VS Code 연동
└── types/                         # 타입 정의
      ├── CommandTypes.ts          # 명령어 타입
      ├── ConfigTypes.ts           # 설정 타입
      ├── HttpTypes.ts             # HTTP 타입
      ├── LlmTypes.ts              # LLM 타입
      └── PluginTypes.ts           # 플러그인 타입
```

## 개선된 점

1. **코드 가독성 개선**: 각 파일이 단일 책임을 갖도록 분리하여 가독성 향상
2. **파일 구조 정리**: 불필요한 파일 제거로 더 깔끔한 프로젝트 구조 구현
3. **문서 업데이트**: README.md와 HISTORY.md 파일 개선으로 문서 최신화
4. **유지보수성 향상**: 모듈화된 구조로 향후 기능 추가 및 변경이 용이해짐
5. **의존성 개선**: 명확한 모듈 경계와 책임 분리
6. **설정 기반 LLM 통합**: 코드가 아닌 설정 파일을 통한 LLM 모델 관리
7. **하드코딩 제거**: API 키 및 모델 설정을 코드에서 제거하고 설정으로 이동
8. **스트리밍 기능 강화**: LLM 응답 스트리밍 구현 개선 및 문서화
9. **스키마 정의**: 설정 스키마 작성으로 설정 구조 명확화
10. **철칙 준수**: 개발 및 실행 환경 차이를 철칙으로 명확히 구분하고 문서화
11. **내부망 모델 보존**: 내부망 모델 설정 및 주소는 절대 수정/삭제하지 않음

## 검증

빌드 테스트를 실행하여 변경사항이 성공적으로 컴파일되는지 확인했습니다:
```
npm run build
```

결과:
```
> axiom@0.0.1 build
> node esbuild.config.js

Copying web assets to dist directory...
Web assets copied successfully!
Build completed successfully!
dist/extension.js      198.9kb
dist/extension.js.map  371.1kb

⚡ Done in 36ms
```

## 향후 개선 사항

1. **테스트 케이스 추가**: 분리된 모듈에 대한 단위 테스트 작성
2. **WebView UI 개선**: 사용자 경험 향상을 위한 UI 개선
3. **추가 리팩토링**: 코어 서비스의 모듈화 추가 개선
4. **기능 확장**: 분리된 구조를 활용한 새로운 기능 추가 용이
5. **설정 관리 개선**: 사용자 친화적인 설정 인터페이스 제공
6. **스트리밍 응답 개선**: 코드 블록 및 마크다운 실시간 렌더링 개선
7. **내부망 환경 지원 강화**: 내부망에서 안정적인 동작을 위한 추가 개선
8. **LLM 모델 다양화**: 다양한 로컬 및 온프레미스 모델 지원 확장
9. **환경 감지 강화**: 내부망/외부망 환경을 정확히 감지하는 알고리즘 개선
10. **철칙 준수 지속**: 환경 차이에 대한 철칙을 지속적으로 업데이트하고 준수

## 모델 설정 구조 예시

```json
"axiom.llm": {
  "defaultModel": "gemini-2.5-flash", // 외부망에서는 Gemini, 내부망에서는 narrans로 자동 설정
  "models": {
    "gemini-2.5-flash": {
      "name": "Google Gemini 2.5 Flash",
      "provider": "openrouter",
      "apiUrl": "https://openrouter.ai/api/v1/chat/completions",
      "contextWindow": 32000,
      "maxTokens": 8192,
      "temperature": 0.7,
      "systemPrompt": "당신은 코딩과 개발을 도와주는 유능한 AI 어시스턴트입니다.",
      "apiModel": "google/gemini-2.5-flash-preview"
    },
    "narrans": {
      "name": "NARRANS (내부망)",
      "provider": "custom",
      "apiUrl": "https://api-se-dev.narrans/v1/chat/completions",
      "contextWindow": 10000,
      "maxTokens": 10000,
      "temperature": 0,
      "systemPrompt": "당신은 코딩과 개발을 도와주는 유능한 AI 어시스턴트입니다."
    }
  },
  "openrouterApiKey": "your-api-key-here"
}
```