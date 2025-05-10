#!/usr/bin/env node

/**
 * 내부망 LLM API 연결 테스트 스크립트
 * 
 * 사용법: 
 * 1. 필요한 패키지 설치: npm install axios uuid
 * 2. 스크립트 실행 권한 부여: chmod +x test-internal-api.js
 * 3. 모델 지정하여 스크립트 실행: ./test-internal-api.js narrans
 *    또는: ./test-internal-api.js llama4-scout
 *    또는: ./test-internal-api.js llama4-maverick
 * 
 * 각 내부망 API에 대한 간단한 요청을 보내 응답을 확인합니다.
 */

const axios = require('axios');
const https = require('https');
const { v4: uuidgen } = require('uuid');

// 테스트할 모델 (명령행 인수에서 가져옴)
const targetModel = process.argv[2]?.toLowerCase() || 'narrans';

// 인증 정보
const AUTH_CONFIG = {
  NARRANS_TOKEN: process.env.NARRANS_TOKEN || 'dummytoken',
  LLAMA_TICKET: process.env.LLAMA_TICKET || 'dummy-credential-key'
};

// 모델 정보 매핑
const MODEL_CONFIG = {
  'narrans': {
    endpoint: 'https://api-se-dev.narrans.samsungds.net/v1/chat/completions',
    model: 'narrans',
    auth: {
      type: 'bearer',
      value: AUTH_CONFIG.NARRANS_TOKEN
    }
  },
  'llama4-scout': {
    endpoint: 'http://apigw-stg.samsungds.net:8000/llama4/1/llama/aiserving/llama-4/scout/v1/chat/completions',
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    auth: {
      type: 'ticket',
      value: AUTH_CONFIG.LLAMA_TICKET
    }
  },
  'llama4-maverick': {
    endpoint: 'http://apigw-stg.samsungds.net:8000/llama4/1/llama/aiserving/llama-4/maverick/v1/chat/completions',
    model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
    auth: {
      type: 'ticket',
      value: AUTH_CONFIG.LLAMA_TICKET
    }
  }
};

// 선택한 모델 설정 가져오기
const modelConfig = MODEL_CONFIG[targetModel];
if (!modelConfig) {
  console.error(`지원되지 않는 모델: ${targetModel}`);
  console.error('지원되는 모델: narrans, llama4-scout, llama4-maverick');
  process.exit(1);
}

// 요청 ID 생성
const requestId = uuidgen();

// 헤더 생성
function createHeaders(modelConfig, requestId) {
  // 기본 헤더
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Send-System-Name': 'narrans',
    'User-Id': 'ape_ext',
    'User-Type': 'ape_ext',
    'Prompt-Msg-Id': requestId,
    'Completion-Msg-Id': requestId
  };

  // 인증 추가
  if (modelConfig.auth.type === 'bearer') {
    headers['Authorization'] = `Bearer ${modelConfig.auth.value}`;
  } else if (modelConfig.auth.type === 'ticket') {
    headers['x-dep-ticket'] = modelConfig.auth.value;
  }

  return headers;
}

// 요청 본문 생성
const requestBody = {
  model: modelConfig.model,
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: '안녕하세요, 자기소개 부탁드립니다.' }
  ],
  temperature: 0.7,
  stream: false
};

// 추가 필드 - llama4 모델용
if (targetModel.startsWith('llama4')) {
  requestBody.system_name = 'narrans';
  requestBody.user_id = 'ape_ext';
  requestBody.user_type = 'ape_ext';
  requestBody.max_tokens = 50000;
}

// API 요청 실행
async function testInternalApi() {
  console.log(`\n========================================================`);
  console.log(`${modelConfig.model} 모델 API 테스트 시작...`);
  console.log(`--------------------------------------------------------`);
  console.log(`엔드포인트: ${modelConfig.endpoint}`);
  console.log(`인증 방식: ${modelConfig.auth.type}`);
  console.log(`요청 ID: ${requestId}`);
  
  try {
    console.log(`\n[요청 전송 중...]`);
    
    // 요청 옵션
    const axiosConfig = {
      headers: createHeaders(modelConfig, requestId),
      proxy: false,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      timeout: 30000 // 30초 타임아웃
    };
    
    console.log(`\n[요청 헤더]`);
    console.log(JSON.stringify(axiosConfig.headers, null, 2));
    
    console.log(`\n[요청 본문]`);
    console.log(JSON.stringify(requestBody, null, 2));
    
    // API 요청 보내기
    const startTime = Date.now();
    const response = await axios.post(modelConfig.endpoint, requestBody, axiosConfig);
    const duration = Date.now() - startTime;
    
    console.log(`\n[응답 수신 (${duration}ms)]`);
    console.log(`상태 코드: ${response.status}`);
    console.log(`상태 텍스트: ${response.statusText}`);
    
    console.log(`\n[응답 헤더]`);
    console.log(JSON.stringify(response.headers, null, 2));
    
    console.log(`\n[응답 본문]`);
    console.log(JSON.stringify(response.data, null, 2));
    
    console.log(`\n테스트 성공! API가 정상적으로 응답했습니다.`);
  } catch (error) {
    console.error(`\n[API 요청 오류]`);
    
    if (error.response) {
      // 서버가 응답했지만 2xx 범위가 아닌 상태 코드
      console.error(`상태 코드: ${error.response.status}`);
      console.error(`응답 데이터: ${JSON.stringify(error.response.data, null, 2)}`);
      console.error(`응답 헤더: ${JSON.stringify(error.response.headers, null, 2)}`);
    } else if (error.request) {
      // 요청이 전송되었지만 응답을 받지 못함
      console.error(`응답 없음: ${error.message}`);
      console.error('네트워크 연결, 프록시 설정, 또는 서버 가용성을 확인하세요.');
    } else {
      // 요청 설정 중 오류 발생
      console.error(`요청 설정 오류: ${error.message}`);
    }
    
    if (error.code === 'EPROTO') {
      console.error('\nEPROTO 오류: SSL/TLS 프로토콜 오류');
      console.error('이 오류는 일반적으로 SSL 인증서 검증 문제로 발생합니다.');
      console.error('해결책: --insecure 옵션 또는 SSL 검증 비활성화를 사용하세요.');
    }
    
    console.error('\n테스트 실패! 자세한 오류 메시지를 확인하세요.');
  }
  
  console.log(`========================================================\n`);
}

// 테스트 실행
testInternalApi().catch(console.error);