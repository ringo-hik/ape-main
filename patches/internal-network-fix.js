/**
 * 내부망 LLM API 연결을 위한 특수 패치
 * 
 * 패치 목적:
 * 1. Narrans 모델은 Bearer 인증 사용
 * 2. 다른 내부망 모델(LLAMA4_SCOUT, LLAMA4_MAVERICK)은 x-dep-ticket 사용
 * 3. 모든 내부망 모델에 대해 SSL 검증 비활성화
 * 4. 모든 내부망 모델에 대해 프록시 우회
 * 5. 요청 헤더 통합
 * 
 * 사용 방법:
 * 1. 확장 프로그램 로드 후 개발자 도구 콘솔에서 실행:
 *    require('./patches/internal-network-fix.js')
 */

const https = require('https');
const { LLMModel } = require('../out/types/chat');

// 인증 정보 설정
const AUTH_CONFIG = {
  // Narrans 모델용 Bearer 토큰
  NARRANS_TOKEN: 'dummytoken',
  
  // LLAMA4 모델용 x-dep-ticket 토큰
  LLAMA_TICKET: 'dummy-credential-key'
};

// 내부망 엔드포인트 설정
const INTERNAL_ENDPOINTS = {
  [LLMModel.NARRANS]: 'https://api-se-dev.narrans.samsungds.net/v1/chat/completions',
  [LLMModel.LLAMA4_SCOUT]: 'http://apigw-stg.samsungds.net:8000/llama4/1/llama/aiserving/llama-4/scout/v1/chat/completions',
  [LLMModel.LLAMA4_MAVERICK]: 'http://apigw-stg.samsungds.net:8000/llama4/1/llama/aiserving/llama-4/maverick/v1/chat/completions'
};

// 내부망 모델 여부 확인 함수
function isInternalModel(model) {
  return model === LLMModel.NARRANS || 
         model === LLMModel.LLAMA4_SCOUT || 
         model === LLMModel.LLAMA4_MAVERICK;
}

// 내부망 API 헤더 생성 함수 (패치)
function createInternalApiHeaders(model, requestId, isStreaming) {
  // 기본 헤더
  const headers = {
    'Content-Type': 'application/json',
    'Accept': isStreaming ? 'text/event-stream; charset=utf-8' : 'application/json',
    'Send-System-Name': 'narrans',
    'User-Id': 'ape_ext',
    'User-Type': 'ape_ext',
    'Prompt-Msg-Id': requestId,
    'Completion-Msg-Id': requestId
  };

  // Narrans 모델은 Bearer 인증 방식 사용
  if (model === LLMModel.NARRANS) {
    return {
      ...headers,
      'Authorization': `Bearer ${AUTH_CONFIG.NARRANS_TOKEN}`
    };
  } 
  // 기타 내부망 모델은 x-dep-ticket 사용
  else {
    return {
      ...headers,
      'x-dep-ticket': AUTH_CONFIG.LLAMA_TICKET
    };
  }
}

// LLMService의 원본 메서드 저장
const originalAxiosPostMethod = require('axios').post;

// axios.post 메서드 패치하여 내부망 API 호출 처리
require('axios').post = function(url, data, config) {
  const model = data.model;
  
  // 내부망 모델 요청인 경우 특수 처리
  if (isInternalModel(model)) {
    console.log(`[Internal API Patch] 내부망 모델 감지: ${model}`);
    
    // 요청 ID 생성 (UUID 형식)
    const requestId = require('uuid').v4();
    console.log(`[Internal API Patch] 요청 ID 생성: ${requestId}`);
    
    // 엔드포인트 덮어쓰기
    url = INTERNAL_ENDPOINTS[model];
    console.log(`[Internal API Patch] 엔드포인트 설정: ${url}`);
    
    // 헤더 덮어쓰기
    const isStreaming = data.stream === true;
    config.headers = createInternalApiHeaders(model, requestId, isStreaming);
    console.log(`[Internal API Patch] 헤더 설정:`, config.headers);
    
    // SSL 검증 비활성화 및 프록시 무시
    config.proxy = false;
    config.httpsAgent = new https.Agent({ rejectUnauthorized: false });
    console.log(`[Internal API Patch] SSL 검증 비활성화 및 프록시 무시 설정`);
  }
  
  // 원본 axios.post 메서드 호출
  return originalAxiosPostMethod(url, data, config);
};

console.log(`
========================================================
내부망 LLM API 연결 패치가 성공적으로 적용되었습니다.
--------------------------------------------------------
지원 모델:
- Narrans (Bearer 인증)
- LLAMA4_SCOUT (x-dep-ticket 인증)
- LLAMA4_MAVERICK (x-dep-ticket 인증)

모든 내부망 모델에 대해:
- SSL 인증서 검증 비활성화됨
- 프록시 설정 무시됨
- 고정 헤더 및 인증 정보 사용
========================================================
`);

module.exports = {
  isInternalModel,
  createInternalApiHeaders,
  AUTH_CONFIG,
  INTERNAL_ENDPOINTS
};