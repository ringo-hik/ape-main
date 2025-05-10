# API 스키마 설정 문서

## 내부망 모델 API 헤더 설정

내부망 모델에 접근할 때 사용해야 하는 헤더 설정입니다. 각 모델마다 URL과 헤더 설정이 다르므로 주의해서 사용해야 합니다.

### 1. Narrans 모델

**기본 URL**: `https://api-se-dev.narrans.samsungds.net/v1/chat/completions`

**필수 헤더**:
```javascript
{
  'Content-Type': 'application/json',
  'Accept': 'text/event-stream',  // 스트리밍 요청 시 필수
  'Send-System-Name': 'swdp',
  'user-id': 'ape_ext',
  'user-type': 'ape_ext',
  'Prompt-Msg-Id': requestId,  // 고유 요청 ID
  'Completion-msg-Id': requestId,  // 동일한 고유 ID
  'x-dep-ticket': apiKey  // API 키 대신 사용되는 인증 토큰
}
```

**요청 본문 예시**:
```json
{
  "model": "narrans",
  "messages": [
    {"role": "system", "content": "당신은 코딩과 개발을 도와주는 유능한 AI 어시스턴트입니다."},
    {"role": "user", "content": "안녕하세요? 질문이 있어요."}
  ],
  "temperature": 0.7,
  "max_tokens": 16000,
  "stream": true
}
```

### 2. Llama-4-Internal-Scout 모델

**기본 URL**: `http://apigw-stg.samsungds.net:8000/llama4/1/llama/aiserving/llama-4/scout/v1/chat/completions`

**필수 헤더**:
```javascript
{
  'Content-Type': 'application/json',
  'Accept': 'text/event-stream',  // 스트리밍 요청 시 필수
  'Send-System-Name': 'swdp',
  'user-id': 'ape_ext',
  'user-type': 'ape_ext',
  'Prompt-Msg-Id': requestId,  // 고유 요청 ID
  'Completion-msg-Id': requestId,  // 동일한 고유 ID
  'x-dep-ticket': apiKey  // API 키 대신 사용되는 인증 토큰
}
```

**요청 본문 예시**:
```json
{
  "model": "meta-llama/llama-4-scout-17b-16e-instruct",
  "system_name": "swdp",
  "user_id": "ape_ext",
  "user_type": "ape_ext",
  "messages": [
    {"role": "system", "content": "당신은 코딩과 개발을 도와주는 유능한 AI 어시스턴트입니다."},
    {"role": "user", "content": "안녕하세요? 질문이 있어요."}
  ],
  "temperature": 0.7,
  "max_tokens": 50000,
  "stream": true
}
```

### 3. Llama-4-Internal-Maverick 모델

**기본 URL**: `http://apigw-stg.samsungds.net:8000/llama4/1/llama/aiserving/llama-4/maverick/v1/chat/completions`

**필수 헤더**:
```javascript
{
  'Content-Type': 'application/json',
  'Accept': 'text/event-stream',  // 스트리밍 요청 시 필수
  'Send-System-Name': 'swdp',
  'user-id': 'ape_ext',
  'user-type': 'ape_ext',
  'Prompt-Msg-Id': requestId,  // 고유 요청 ID
  'Completion-msg-Id': requestId,  // 동일한 고유 ID
  'x-dep-ticket': apiKey  // API 키 대신 사용되는 인증 토큰
}
```

**요청 본문 예시**:
```json
{
  "model": "meta-llama/llama-4-maverick-17b-128e-instruct",
  "system_name": "swdp",
  "user_id": "ape_ext",
  "user_type": "ape_ext",
  "messages": [
    {"role": "system", "content": "당신은 코딩과 개발을 도와주는 유능한 AI 어시스턴트입니다."},
    {"role": "user", "content": "안녕하세요? 질문이 있어요."}
  ],
  "temperature": 0.7,
  "max_tokens": 50000,
  "stream": true
}
```

## 주의사항

1. 모든 헤더는 필수이며, 하나라도 빠지면 API 호출이 실패할 수 있습니다.
2. 스트리밍 응답을 받으려면 반드시 `Accept: text/event-stream` 헤더와 요청 본문의 `stream: true`를 설정해야 합니다.
3. 요청 ID는 매 요청마다 고유하게 생성되어야 합니다.
4. 내부망에서만 접근 가능한 모델들이므로, 외부망에서는 사용할 수 없습니다.
5. `x-dep-ticket` 인증 방식은 표준 Bearer 토큰 방식과 다릅니다. 내부망 인증에 특화된 방식입니다.