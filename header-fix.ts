/**
 * 내부망 모델용 요청 헤더 생성 (수정된 버전)
 * @param apiKey API 키 (내부망에서는 x-dep-ticket으로 사용)
 * @param requestId 고유 요청 ID (이제 UUID 형식 사용)
 * @param isStreaming 스트리밍 요청 여부
 * @param model 모델 유형
 * @returns 헤더 객체
 */
function createInternalApiHeaders(apiKey: string, requestId: string, isStreaming: boolean = false, model: LLMModel = '' as LLMModel): Record<string, string> {
  // 기본 헤더 (대소문자 주의: Completion-Msg-Id로 수정)
  const headers = {
    'Content-Type': 'application/json',
    'Accept': isStreaming ? 'text/event-stream' : 'application/json',
    'Send-System-Name': 'swdp',
    'user-id': 'ape_ext',
    'user-type': 'ape_ext',
    'Prompt-Msg-Id': requestId,
    'Completion-Msg-Id': requestId, // 대소문자 수정 (msg → Msg)
  };

  // Narrans 모델은 Bearer 인증 방식 사용
  if (model === LLMModel.NARRANS) {
    return {
      ...headers,
      'Authorization': `Bearer string` // dummy_key 대신 string 사용
    };
  }
  // 기타 내부망 모델은 x-dep-ticket 사용
  else {
    return {
      ...headers,
      'x-dep-ticket': 'string' // 값을 apiKey에서 "string"으로 변경
    };
  }
}

// UUID를 생성하는 유틸리티 함수 추가
function generateUUID(): string {
  // Node.js crypto 모듈 또는 uuid 패키지가 있는 경우 사용
  // 여기서는 간단한 구현만 제공
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 요청 ID 생성에 대한 변경 예시
function createRequest() {
  // 타임스탬프 방식 (기존)
  // const requestId = `req_${Date.now()}`;
  
  // UUID 방식 (새로운 방식)
  const requestId = generateUUID();
  
  console.log(`요청 ID (UUID): ${requestId}`);
  
  // 헤더 생성 예시
  const headers = createInternalApiHeaders('apiKey', requestId, false, 'narrans' as any);
  console.log('생성된 헤더:', headers);
}