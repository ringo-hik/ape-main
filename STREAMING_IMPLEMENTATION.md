# Axiom 스트리밍 구현 가이드

## 개발 및 실행 환경 차이 (철칙)

**필수 규칙: 환경 차이를 반드시 이해하고 코드를 작성해야 합니다.**

1. **개발 환경 (WSL/외부망):**
   - 외부망 연결이 가능한 환경에서 개발
   - OpenRouter의 Gemini 모델을 사용해 개발 및 테스트
   - Claude Code 등 외부 AI 도구 사용 가능
   - `/home/username` 경로 사용

2. **실행 환경 (Windows/내부망):**
   - 회사 내부망 환경에서만 실행
   - NARRANS, Llama4 등 내부 LLM 모델만 접근 가능
   - 외부 API에 대한 접근 불가능
   - `\\wsl$\Ubuntu\home\username` 경로 사용
   - 내부 엔드포인트 및 API 게이트웨이만 접근 가능

## LLM 모델 구성 및 환경 자동 감지

Axiom은 다양한 LLM 모델을 지원하며, 환경에 따라 적절한 모델을 자동으로 선택합니다:

1. **인터넷 환경 (개발):**
   - OpenRouter를 통한 Gemini 모델 사용
   - Anthropic Claude 모델 사용 가능
   - 기타 외부 API 기반 모델 (GPT-4 등)

2. **내부망 환경 (실행):**
   - 내부 NARRANS 모델 사용 (기본값)
   - Llama 및 기타 로컬 호스팅 모델
   - api-se-dev.narrans 엔드포인트 사용

## 스트리밍 응답 구현

Axiom은 모든 LLM 모델에서 스트리밍 응답을 지원합니다. 이를 통해 사용자는 응답이 생성되는 과정을 실시간으로 확인할 수 있습니다.

### 내부 구현 구조

1. **요청 전송:**
   ```typescript
   // LLM 서비스로 응답 생성 (스트리밍 모드)
   const response = await this._llmService.sendRequest({
     model: modelId,
     messages: promptData.messages,
     temperature: promptData.temperature,
     stream: true,
     onUpdate: onUpdate
   });
   ```

2. **스트리밍 콜백 처리:**
   ```typescript
   // 스트리밍 업데이트 처리
   private handleStreamingUpdate(chunk: string, webview: vscode.Webview) {
     // 웹뷰로 청크 전송
     webview.postMessage({
       type: 'stream',
       content: chunk
     });
   }
   ```

3. **서로 다른 모델 지원:**
   각 모델 제공자(OpenAI, Anthropic, NARRANS 등)는 서로 다른 스트리밍 형식을 사용합니다. Axiom은 이러한 차이를 추상화하여 일관된 인터페이스를 제공합니다.

## Git 통합 및 LLM 활용

Axiom은 Git 작업을 위한 다양한 명령어를 제공하며, 특히 LLM을 활용한 고급 기능을 포함합니다:

### 주요 Git 명령어

1. **기본 명령어:**
   - `@git:status` - 저장소 상태 확인
   - `@git:diff` - 변경 내역 확인
   - `@git:add` - 파일 스테이징
   - `@git:commit` - 변경 내용 커밋
   - `@git:push` - 변경 사항 푸시

2. **LLM 활용 명령어:**
   - `@git:auto-commit` - 변경 사항 분석 후 자동으로 커밋 메시지 생성 및 커밋
   - `@git:explain` - 특정 커밋의 변경 내용을 자세히 설명
   - `@git:summarize` - 여러 커밋을 분석하여 요약
   - `@git:analyze` - 현재 변경 사항 분석 및 피드백 제공

### LLM을 활용한 자동 커밋 메시지 생성

```typescript
// 커밋 메시지 생성 프롬프트
const prompt = `
당신은 Git 커밋 메시지 작성 전문가입니다. 현재 변경 사항을 분석하여 좋은 커밋 메시지를 작성해주세요.
작성 규칙:
1. 간결하고 명확하게 작성
2. 현재형 시제 사용 ("Add feature" 형식)
3. 50자 이내의 제목줄과 빈 줄을 두고 본문으로 구성
4. 제목은 "${commitType}: " 접두어로 시작
5. 무엇을 변경했는지가 아니라 왜 변경했는지 설명
6. 여러 변경 사항이 있을 경우 가장 중요한 변경에 집중

변경된 파일:
${changedFiles.map(item => `${item.status} ${item.file}`).join('\n')}

변경 내용(diff):
\`\`\`diff
${diffContent}
\`\`\`

응답 포맷:
{
  "subject": "한 줄 요약 (50자 이내)",
  "body": "상세 설명 (선택 사항)"
}

JSON 형식으로만 응답해주세요.
`;
```

## VS Code 통합 및 UI

Axiom은 VS Code 확장으로 동작하며, 다음과 같은 UI 요소를 포함합니다:

1. **채팅 인터페이스:**
   - 웹뷰 기반 채팅 UI
   - 마크다운 렌더링 지원
   - 코드 블록 하이라이팅

2. **명령어 팔레트:**
   - Axiom 명령어 쉽게 접근
   - 단축키 지원

3. **상태 표시줄:**
   - 현재 LLM 모델 표시
   - 연결 상태 표시

## 설정 및 커스터마이징

Axiom의 설정은 VS Code의 settings.json 파일을 통해 관리됩니다. 주요 설정 항목은 다음과 같습니다:

```json
{
  "internalPlugins": {
    "git": {
      "enabled": true,
      "useLocalGit": true,
      "autoCommitMessage": true,
      "commitMessageModel": "",
      "defaultBranch": "master",
      "commitMessageTemplate": "{{type}}: {{subject}}\n\n{{body}}"
    }
  },
  "llm": {
    "defaultModel": "gemini-2.5-flash",
    "models": {
      "gemini-2.5-flash": {
        "name": "Gemini 2.5 Flash",
        "provider": "openrouter",
        "apiModel": "google/gemini-2.5-flash-preview"
      },
      "narrans-7b": {
        "name": "NARRANS 7B",
        "provider": "custom",
        "apiUrl": "https://api-se-dev.narrans:8000/v1/chat/completions",
        "apiModel": "narrans-7b"
      }
    }
  },
  "core": {
    "sslBypass": true,
    "logLevel": "info"
  }
}
```

## 메시지 처리 흐름

1. **사용자 입력 처리:**
   ```typescript
   public async processMessage(text: string, options?: {
     stream?: boolean;
     onUpdate?: (chunk: string) => void;
   }): Promise<any> {
     // 명령어 파싱
     const command = this._commandParser.parse(text);
     
     // 명령어인 경우 실행
     if (command) {
       return await this.executeCommand(command);
     }
     
     // 일반 텍스트는 LLM 응답 생성
     if (options?.stream && options?.onUpdate) {
       // 스트리밍 모드
       return await this.generateStreamingResponse(text, options.onUpdate);
     } else {
       // 일반 모드
       return await this.generateResponse(text);
     }
   }
   ```

2. **명령어 처리:**
   - @ 명령어: 외부 시스템 연동 (Git, Jira, SWDP 등)
   - / 명령어: 내부 기능 (설정, 도움말 등)

3. **LLM 응답 생성:**
   - 스트리밍/비스트리밍 응답 처리
   - 오류 처리 및 재시도 로직

## 내부망 안전 대책

1. **SSL 우회 옵션:**
   내부망 환경에서는 자체 서명 인증서를 사용하는 경우가 많습니다. Axiom은 이러한 환경에서도 동작할 수 있도록 SSL 인증서 검증을 우회하는 옵션을 제공합니다.

2. **환경 자동 감지:**
   Axiom은 현재 환경이 내부망인지 외부망인지 자동으로 감지하여 적절한 설정을 적용합니다.

3. **기본 모델 우선순위:**
   내부망 환경에서는 NARRANS와 같은 내부 모델을 우선적으로 사용하며, 외부망 환경에서는 Gemini나 Claude와 같은 외부 모델을 우선적으로 사용합니다.

## 핵심 알고리즘 및 처리 흐름

```
사용자 입력
  ↓
명령어 파싱 (CommandParserService)
  ↓
명령어인 경우 → 명령어 실행 (CommandExecutorService)
  ↓         → 플러그인 처리 (PluginRegistryService)
일반 텍스트인 경우
  ↓
프롬프트 어셈블리 (PromptAssemblerService)
  ↓
LLM 요청 전송 (LlmService)
  ↓
응답 처리 및 표시 (AxiomChatViewProvider)
```

## 결론

Axiom은 개발 및 실행 환경의 차이를 고려하여 설계되었으며, 내부망과 외부망 모두에서 원활하게 동작할 수 있습니다. 특히 Git 통합과 LLM을 활용한 다양한 기능을 제공하여 개발자의 생산성을 크게 향상시킵니다.

향후 개발 방향은 더 많은 내부 시스템과의 통합 및 사용자 경험 개선에 초점을 맞출 예정입니다.