# APE: 아키텍처 및 기능 상세 문서

## 1. 프로젝트 철학 및 가치

> **Agentic Vision. Development Illuminated.**  
> **Seamless • Plugin-driven • Lightweight For Our Developer.**

APE(Agentic Pipeline Extension)는 개발자의 생산성과 창의성을 극대화하기 위한 철학에 기반하여 설계되었습니다. 주요 가치는 다음과 같습니다:

- **에이전틱 비전(Agentic Vision)**: 개발자의 의도를 이해하고 지능적으로 협업하는 확장 프로그램
- **개발 조명(Development Illuminated)**: 코드 이해와 개발 과정의 명확한 시각화
- **원활함(Seamless)**: 개발 워크플로우와의 자연스러운 통합
- **플러그인 기반(Plugin-driven)**: 확장성과 커스터마이징 가능한 아키텍처
- **경량화(Lightweight)**: 빠른 응답 시간과 최소한의 리소스 사용

## 2. 시스템 아키텍처

APE는 모듈화된 레이어 구조로 설계되어 있어 확장성과 유지보수성을 제공합니다.

### 2.1 고수준 아키텍처

```
┌─────────────────────────────────────────┐
│              UI 레이어                  │
│  (채팅 인터페이스, 명령어 팔레트 등)     │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│             코어 레이어                 │
│ (LLM, 메모리, Git, 명령어, 자동완성 등) │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│            플러그인 레이어              │
│  (플러그인 API, 이벤트 시스템 등)       │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         VSCode 확장 API 레이어          │
└─────────────────────────────────────────┘
```

### 2.2 주요 모듈 구조

```
extension/
├── src/                  # 소스 코드
│   ├── extension.ts      # 진입점
│   ├── core/             # 핵심 기능
│   │   ├── commands/     # 명령어 관리
│   │   ├── completion/   # 코드 자동완성
│   │   ├── git/          # Git 통합
│   │   ├── llm/          # 언어 모델 서비스
│   │   ├── memory/       # 메모리 관리
│   │   └── services/     # 기타 서비스
│   ├── plugins/          # 플러그인 시스템
│   │   ├── core/         # 플러그인 핵심 기능
│   │   └── types/        # 플러그인 타입 정의
│   ├── ui/               # UI 컴포넌트
│   │   ├── chat/         # 채팅 인터페이스
│   │   └── tree/         # 트리 뷰 컴포넌트
│   └── types/            # 타입 정의
├── resources/            # 리소스 파일
└── out/                  # 빌드 출력
```

## 3. 핵심 컴포넌트 상세

### 3.1 LLM 서비스 (`src/core/llm/llmService.ts`)

LLM 서비스는 외부 언어 모델 API와의 통신을 담당하는 핵심 컴포넌트입니다.

#### 주요 기능:
- **다중 모델 지원**: 다양한 LLM 모델 사용 가능 (OpenAI, Anthropic, Google 등)
- **요청 관리**: API 요청 대기열 및 상태 관리
- **스트리밍 응답**: 실시간 응답 스트리밍 처리
- **컨텍스트 최적화**: 효율적인 토큰 사용을 위한 컨텍스트 관리
- **장애 처리**: 연결 오류 및 재시도 메커니즘

#### 구현 상세:
```typescript
export class LLMService {
  private _endpoint: string;
  private _defaultModel: LLMModel;
  private _connectionType: ConnectionType;
  private _wsConnection: WebSocket | null = null;
  private _messageQueue: LLMRequest[] = [];
  private _isProcessing: boolean = false;
  
  // 메시지 전송 및 응답 처리 메서드
  public async sendMessage(request: LLMRequest): Promise<LLMResponse> { ... }
  
  // 스트리밍 응답 핸들링
  private handleStreamResponse(response: any, callback: Function): void { ... }
  
  // 웹소켓 연결 관리
  private ensureConnection(): Promise<void> { ... }
}
```

### 3.2 메모리 서비스 (`src/core/memory/memoryService.ts`)

메모리 서비스는 대화 기록 및 세션 관리를 담당합니다.

#### 주요 기능:
- **세션 관리**: 대화 세션 생성, 저장, 및 전환
- **컨텍스트 유지**: 대화 컨텍스트 관리 및 최적화
- **메시지 저장**: 효율적인 메시지 저장 및 검색
- **세션 아카이빙**: 오래된 세션 자동 아카이빙
- **스마트 컨텍스트**: 코드 및 환경 맥락 통합

#### 구현 상세:
```typescript
export class MemoryService {
  private _sessions: Map<string, ChatSession> = new Map();
  private _activeSessions: string[] = [];
  private _storageManager: StorageManager;
  private _config: MemoryConfig;
  
  // 세션 관리 메서드
  public createSession(initialContext?: string): string { ... }
  public getSession(sessionId: string): ChatSession | undefined { ... }
  
  // 메시지 처리
  public addMessage(sessionId: string, message: ChatMessage): void { ... }
  public getMessages(sessionId: string, limit?: number): ChatMessage[] { ... }
  
  // 컨텍스트 관리
  public updateContext(sessionId: string, context: string): void { ... }
}
```

### 3.3 Git 통합 (`src/core/git/autoCommitService.ts`)

Git 통합은 버전 관리 작업을 자동화하고 개선합니다.

#### 주요 기능:
- **자동 커밋**: 코드 변경사항 자동 감지 및 커밋
- **커밋 메시지 생성**: LLM 기반 지능형 커밋 메시지 생성
- **충돌 해결**: Git 충돌 자동 해결 지원
- **변경 추적**: 변경 사항 추적 및 분석
- **BitBucket/GitHub 통합**: PR 및 이슈 관리 기능

#### 구현 상세:
```typescript
export class AutoCommitService {
  private _enabled: boolean = false;
  private _gitApi: GitAPI | undefined;
  private _config: AutoCommitConfig;
  
  // 자동 커밋 기능
  public async enableAutoCommit(): Promise<void> { ... }
  public async createCommit(message?: string): Promise<string> { ... }
  
  // 커밋 메시지 생성
  private async generateCommitMessage(changes: GitChange[]): Promise<string> { ... }
  
  // 충돌 처리
  public async resolveConflicts(files: string[]): Promise<boolean> { ... }
}
```

### 3.4 플러그인 시스템 (`src/plugins/core/registry.ts`)

플러그인 시스템은 확장 프로그램의 기능을 확장하는 메커니즘을 제공합니다.

#### 주요 기능:
- **플러그인 로드**: 플러그인 동적 로드 및 초기화
- **라이프사이클 관리**: 플러그인 활성화, 비활성화, 업데이트 관리
- **API 노출**: 안전한 확장 API 제공
- **이벤트 시스템**: 이벤트 기반 통신 구조
- **권한 관리**: 플러그인 권한 및 액세스 제어

#### 구현 상세:
```typescript
export class PluginRegistry implements IPluginRegistry {
  private _plugins: Map<string, RegisteredPlugin> = new Map();
  private _stateChangeEmitter = new EventEmitter<PluginStateChangeEvent>();
  
  // 플러그인 관리 메서드
  public register(plugin: IPlugin): boolean { ... }
  public activate(pluginId: string): Promise<boolean> { ... }
  public deactivate(pluginId: string): Promise<boolean> { ... }
  
  // 플러그인 API 생성
  private createPluginAPI(pluginId: string): PluginAPI { ... }
  
  // 이벤트 핸들링
  public onDidChangePluginState(listener: (event: PluginStateChangeEvent) => void): vscode.Disposable { ... }
}
```

### 3.5 명령어 관리 (`src/core/commands/commandManager.ts`)

명령어 관리자는 확장 프로그램의 명령어를 등록하고 실행합니다.

#### 주요 기능:
- **명령어 등록**: VSCode 명령어 등록 및 관리
- **슬래시 명령어**: 채팅 인터페이스용 슬래시 명령어
- **권한 관리**: 명령어 실행 권한 제어
- **컨텍스트 인식**: 명령어 컨텍스트 처리
- **명령어 그룹화**: 관련 명령어 그룹화 기능

#### 구현 상세:
```typescript
export class CommandManager {
  private _commands: Map<string, Command> = new Map();
  private _disposables: vscode.Disposable[] = [];
  
  // 명령어 등록 및 실행
  public register(command: Command): vscode.Disposable { ... }
  public execute(commandId: string, ...args: any[]): Promise<any> { ... }
  
  // 슬래시 명령어 처리
  public registerSlashCommand(command: SlashCommand): vscode.Disposable { ... }
  public parseSlashCommand(text: string): { command: string; args: string } | null { ... }
}
```

### 3.6 채팅 인터페이스 (`src/ui/chat/chatViewService.ts`)

채팅 인터페이스는 사용자와 AI 간의 상호작용을 위한 UI를 제공합니다.

#### 주요 기능:
- **메시지 렌더링**: 마크다운 및 코드 블록 렌더링
- **스트리밍 표시**: 실시간 응답 스트리밍
- **메시지 입력**: 입력 필드 및 자동완성
- **명령어 인식**: 슬래시 명령어 처리
- **테마 지원**: 라이트/다크 테마 지원

#### 구현 상세:
```typescript
export class ChatViewService {
  private _view: vscode.WebviewView | undefined;
  private _memoryService: MemoryService;
  private _llmService: LLMService;
  private _currentSessionId: string | undefined;
  
  // 메시지 처리
  public async sendMessage(message: string): Promise<void> { ... }
  public async renderResponse(response: LLMResponse): Promise<void> { ... }
  
  // UI 업데이트
  private postMessageToWebview(message: any): void { ... }
  private handleWebviewMessage(message: any): void { ... }
}
```

## 4. 기능 상세

### 4.1 핵심 기능

#### 4.1.1 AI 기반 채팅 인터페이스
- **컨텍스트 인식 대화**: 코드베이스 및 작업 컨텍스트 유지
- **멀티턴 대화**: 연속적인 대화 흐름 지원
- **코드 블록 처리**: 코드 강조 및 실행 기능
- **유연한 입력**: 마크다운, 코드, 질문 등 다양한 입력 지원

#### 4.1.2 코드 분석 및 생성
- **코드 이해**: 선택된 코드 분석 및 설명
- **리팩토링 제안**: 코드 개선 및 최적화 제안
- **버그 식별**: 잠재적 이슈 및 버그 감지
- **코드 생성**: 요구사항 기반 코드 스니펫 생성

#### 4.1.3 Git 통합
- **지능형 커밋**: 변경 사항 기반 커밋 메시지 생성
- **자동 커밋**: 코드 변경 자동 감지 및 커밋
- **충돌 해결**: Git 충돌 자동 분석 및 해결
- **PR 관리**: PR 생성 및 관리 기능

#### 4.1.4 자동완성
- **컨텍스트 인식 완성**: 현재 코드베이스 기반 자동완성
- **LLM 기반 제안**: 지능적인 코드 및 문서 자동완성
- **탭 완성**: 효율적인 탭 기반 자동완성
- **인라인 완성**: 코드 입력 중 실시간 완성 제안

### 4.2 확장 기능

#### 4.2.1 플러그인 시스템
- **동적 로드**: 플러그인 런타임 로드 및 활성화
- **이벤트 기반 통신**: 이벤트 기반 아키텍처
- **API 노출**: 안전한 확장 API 제공
- **설정 통합**: 플러그인별 설정 관리

#### 4.2.2 규칙 시스템
- **사용자 정의 규칙**: 동작 규칙 정의 및 관리
- **컨텍스트 규칙**: 컨텍스트 기반 동작 조정
- **액션 규칙**: 자동 액션 트리거 설정
- **우선순위 관리**: 규칙 충돌 해결 및 우선순위 설정

#### 4.2.3 작업 관리
- **TODO 추적**: 코드 내 TODO 항목 추적
- **태스크 관리**: 개발 작업 관리
- **일정 추적**: 작업 진행 및 완료 추적
- **리마인더**: 중요 작업 알림

## 5. 데이터 흐름

### 5.1 채팅 인터페이스 흐름

```
사용자 메시지 입력
     │
     ▼
ChatView (UI 레이어)
     │
     ▼
ChatViewProvider
     │
     ▼
MemoryService (메시지 저장)
     │
     ▼
LLMService (모델에 요청)
     │
     ▼
외부 LLM API
     │
     ▼
LLMService (응답 수신)
     │
     ▼
MemoryService (응답 저장)
     │
     ▼
ChatView (응답 표시)
```

### 5.2 플러그인 활성화 흐름

```
확장 프로그램 활성화
     │
     ▼
extension.ts
     │
     ▼
PluginLoader
     │
     ▼
플러그인 모듈 검색
     │
     ▼
플러그인 로드 및 유효성 검사
     │
     ▼
PluginRegistry (플러그인 등록)
     │
     ▼
이벤트 발생 (onDidActivatePlugin)
     │
     ▼
플러그인 초기화 실행
```

### 5.3 Git 자동 커밋 흐름

```
파일 변경 감지
     │
     ▼
AutoCommitService
     │
     ▼
변경 파일 분석
     │
     ▼
LLMService (커밋 메시지 생성 요청)
     │
     ▼
메시지 생성 및 반환
     │
     ▼
Git API (변경 사항 스테이징)
     │
     ▼
Git API (커밋 실행)
     │
     ▼
이벤트 발생 (onDidCommit)
```

## 6. 확장 메커니즘

### 6.1 플러그인 개발

플러그인 시스템을 통해 APE의 기능을 확장할 수 있습니다:

```typescript
// 플러그인 예시
export const plugin: IPlugin = {
  id: 'my-custom-plugin',
  name: 'My Custom Plugin',
  version: '1.0.0',
  description: '커스텀 플러그인 예시',
  author: 'APE Team',
  
  async initialize(api) {
    // API 초기화 및 명령어 등록
    api.commands.register('myPlugin.customCommand', () => {
      vscode.window.showInformationMessage('커스텀 명령어 실행!');
    });
  },
  
  async activate() {
    console.log('플러그인 활성화');
  },
  
  async deactivate() {
    console.log('플러그인 비활성화');
  }
};
```

### 6.2 이벤트 시스템

이벤트 시스템을 통해 컴포넌트간 느슨한 결합을 유지할 수 있습니다:

```typescript
// 이벤트 발생
events.emit('session:created', { sessionId: 'new-session' });

// 이벤트 수신
const disposable = events.on('session:created', (data) => {
  console.log(`새 세션 생성: ${data.sessionId}`);
});
```

### 6.3 규칙 시스템

규칙 시스템을 통해 동적 동작을 정의할 수 있습니다:

```typescript
// 규칙 정의
const rule: Rule = {
  id: 'auto-commit-on-file-save',
  name: '파일 저장 시 자동 커밋',
  condition: (context) => context.event === 'file:saved',
  action: async (context, services) => {
    await services.git.createCommit(`Update ${context.file}`);
  }
};

// 규칙 등록
rulesService.registerRule(rule);
```

## 7. 사용자 인터페이스

### 7.1 웰컴 뷰

웰컴 뷰는 APE의 첫 진입점으로, 주요 기능과 시작 옵션을 제공합니다:

- **헤더 섹션**: 타이틀과 소개
- **액션 섹션**: 빠른 시작 액션 버튼
- **예제 섹션**: 일반적인 사용 사례
- **빠른 액션**: 도움말, 설정 등 액세스

### 7.2 채팅 인터페이스

채팅 인터페이스는 사용자와 AI 간의 주요 상호작용 공간입니다:

- **대화 영역**: 메시지 스레드 표시
- **입력 영역**: 메시지 입력 및 전송
- **코드 블록**: 구문 강조 및 실행 버튼
- **명령 팔레트**: 슬래시 명령어 액세스

### 7.3 네비게이터 뷰

네비게이터 뷰는 확장 기능과 리소스를 탐색하는 트리 구조를 제공합니다:

- **명령어 섹션**: 주요 명령어 목록
- **플러그인 섹션**: 설치된 플러그인 관리
- **규칙 섹션**: 활성 및 비활성 규칙
- **설정 섹션**: 빠른 설정 액세스

## 8. 설정 및 구성

APE는 다양한 설정 옵션을 통해 사용자 경험을 커스터마이즈할 수 있습니다:

### 8.1 LLM 설정

```json
"ape.llm.endpoint": {
  "type": "string",
  "default": "https://openrouter.ai/api/v1/chat/completions",
  "description": "LLM API 엔드포인트 URL"
},
"ape.llm.apiKey": {
  "type": "string",
  "default": "sk-or-v1-...",
  "description": "LLM API 키"
},
"ape.llm.defaultModel": {
  "type": "string",
  "default": "openai/gpt-4.1-mini",
  "enum": [
    "openai/gpt-4.1-mini",
    "openai/gpt-4.1-preview",
    "anthropic/claude-3-opus-20240229",
    "google/gemini-pro",
    // 기타 지원 모델
  ],
  "description": "기본 LLM 모델"
}
```

### 8.2 메모리 설정

```json
"ape.memory.sessionDuration": {
  "type": "number",
  "default": 240,
  "description": "세션 지속 시간(분)"
},
"ape.memory.maxMessages": {
  "type": "number",
  "default": 30,
  "description": "활성 메모리에 유지할 최대 메시지 수"
}
```

### 8.3 Git 설정

```json
"ape.git.autoCommit": {
  "type": "boolean",
  "default": false,
  "description": "자동으로 변경사항을 커밋합니다"
},
"ape.git.autoResolveConflicts": {
  "type": "boolean",
  "default": false,
  "description": "Git 충돌을 자동으로 해결합니다"
},
"ape.git.commitMessageTemplate": {
  "type": "string",
  "default": "[${type}] ${message}",
  "description": "커밋 메시지 템플릿 (${type}, ${message}, ${files} 변수 지원)"
}
```

## 9. 성능 고려사항

### 9.1 메모리 최적화
- **세션 관리**: 오래된 세션 자동 아카이빙
- **토큰 최적화**: 효율적인 토큰 사용 전략
- **지연 로딩**: 필요 시 컴포넌트 로드
- **캐싱**: 반복 계산 결과 캐싱

### 9.2 응답 시간
- **스트리밍 응답**: 지연 감소를 위한 스트리밍
- **병렬 처리**: 독립 작업 병렬 실행
- **로컬 모델**: 단순 작업용 경량 로컬 모델
- **백그라운드 처리**: 중요하지 않은 작업 백그라운드 실행

### 9.3 확장성
- **모듈화**: 독립적 모듈 구조
- **이벤트 기반**: 느슨한 결합 아키텍처
- **지연 초기화**: 필요 시 서비스 초기화
- **리소스 해제**: 사용하지 않는 리소스 정리

## 10. 보안 및 개인정보 보호

### 10.1 데이터 처리
- **로컬 저장**: 민감한 데이터 로컬 저장
- **익명화**: 필요 시 개인 식별 정보 제거
- **최소 권한**: 필요한 최소 권한만 요청
- **데이터 보존 정책**: 불필요한 데이터 자동 삭제

### 10.2 API 보안
- **키 관리**: API 키 안전 저장
- **인증 관리**: 보안 인증 처리
- **HTTPS 강제**: 보안 연결만 허용
- **요청 검증**: 모든 API 요청 검증

### 10.3 플러그인 보안
- **샌드박싱**: 플러그인 샌드박스 환경 실행
- **권한 제어**: 세분화된 권한 시스템
- **코드 감사**: 플러그인 코드 검증
- **서명 확인**: 플러그인 서명 확인

## 11. 향후 개선 계획

### 11.1 기능 개선
- **다중 모델 상호작용**: 여러 모델 협업 기능
- **코드 자동화**: 자동화된 코드 생성 및 최적화
- **맞춤형 학습**: 사용자 패턴 기반 개인화
- **워크플로우 통합**: CI/CD 파이프라인 통합

### 11.2 성능 향상
- **응답 시간 개선**: API 요청 최적화
- **메모리 사용 최적화**: 효율적 메모리 관리
- **UI 성능**: 대화형 인터페이스 최적화
- **백그라운드 처리**: 비동기 작업 개선

### 11.3 확장성
- **플러그인 마켓플레이스**: 플러그인 공유 시스템
- **협업 기능**: 팀 협업 도구 통합
- **커스텀 모델**: 사용자 정의 모델 지원
- **다국어 지원**: 다양한 언어 지원

---

문서 작성일: 2025년 5월 9일