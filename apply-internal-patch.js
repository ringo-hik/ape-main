#!/usr/bin/env node

/**
 * 내부망 LLM API 연결 패치 적용 스크립트
 * 
 * 사용법: 
 * 1. 필요한 패키지 설치: npm install uuid fs-extra
 * 2. 스크립트 실행 권한 부여: chmod +x apply-internal-patch.js
 * 3. 스크립트 실행: ./apply-internal-patch.js
 * 
 * 이 스크립트는 다음 작업을 수행합니다:
 * 1. 내부망 API 연결을 위한 패치 생성
 * 2. llmService.ts 파일에 패치 코드 주입
 * 3. 인증 정보 설정 (NARRANS_TOKEN, LLAMA_TICKET)
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

// 설정
const CONFIG = {
  // 패치 관련 경로
  PATCH_FILE: path.join(__dirname, 'patches', 'internal-network-fix.js'),
  
  // 인증 정보 (여기서 변경하거나 실행 시 인자로 제공)
  NARRANS_TOKEN: process.env.NARRANS_TOKEN || 'dummytoken',
  LLAMA_TICKET: process.env.LLAMA_TICKET || 'dummy-credential-key',
  
  // 내부망 엔드포인트 (필요에 따라 수정)
  NARRANS_ENDPOINT: process.env.NARRANS_ENDPOINT || 'https://api-se-dev.narrans.samsungds.net/v1/chat/completions',
  LLAMA4_SCOUT_ENDPOINT: process.env.LLAMA4_SCOUT_ENDPOINT || 'http://apigw-stg.samsungds.net:8000/llama4/1/llama/aiserving/llama-4/scout/v1/chat/completions',
  LLAMA4_MAVERICK_ENDPOINT: process.env.LLAMA4_MAVERICK_ENDPOINT || 'http://apigw-stg.samsungds.net:8000/llama4/1/llama/aiserving/llama-4/maverick/v1/chat/completions'
};

// 메인 함수
async function main() {
  console.log('내부망 LLM API 연결 패치 적용 시작...');
  
  // 패치 설정 업데이트
  await updatePatchConfig();
  
  // 패치 적용
  console.log('패치를 적용합니다...');
  
  try {
    // 패치 로드 코드를 extension.ts에 추가 (또는 이미 있는지 확인)
    const extensionFile = path.join(__dirname, 'src', 'extension.ts');
    let extensionContent = await fs.readFile(extensionFile, 'utf-8');
    
    if (!extensionContent.includes('내부망 LLM API 패치')) {
      console.log('extension.ts에 패치 로드 코드 추가...');
      
      // activate 함수 찾기
      const activateFuncMatch = extensionContent.match(/export\s+async\s+function\s+activate\s*\([^)]*\)\s*\{/);
      
      if (activateFuncMatch) {
        const insertPosition = activateFuncMatch.index + activateFuncMatch[0].length;
        
        // 패치 로드 코드 삽입
        const patchCode = `
  // 내부망 LLM API 패치 (개발/테스트 환경에서만 사용)
  try {
    const internalNetworkPatch = require('./patches/internal-network-fix.js');
    console.log('내부망 LLM API 패치가 로드되었습니다.');
  } catch (error) {
    console.log('내부망 LLM API 패치 로드 실패:', error);
  }
`;
        
        // 코드 삽입
        extensionContent = 
          extensionContent.substring(0, insertPosition) + 
          patchCode + 
          extensionContent.substring(insertPosition);
        
        // 파일 저장
        await fs.writeFile(extensionFile, extensionContent, 'utf-8');
      } else {
        console.error('activate 함수를 찾을 수 없습니다. 패치를 수동으로 적용해야 합니다.');
      }
    } else {
      console.log('이미 패치 로드 코드가 extension.ts에 있습니다.');
    }
    
    // 패치 적용 후 빌드
    console.log('웹팩 빌드 중...');
    execSync('npm run webpack', { stdio: 'inherit' });
    
    console.log('\n내부망 LLM API 연결 패치가 성공적으로 적용되었습니다!');
    console.log(`
========================================================
패치 적용 완료!
--------------------------------------------------------
적용된 인증 정보:
- Narrans Token: ${CONFIG.NARRANS_TOKEN.substring(0, 5)}...
- LLAMA Ticket: ${CONFIG.LLAMA_TICKET.substring(0, 5)}...

내부망 모델 엔드포인트:
- Narrans: ${CONFIG.NARRANS_ENDPOINT}
- LLAMA4 Scout: ${CONFIG.LLAMA4_SCOUT_ENDPOINT}
- LLAMA4 Maverick: ${CONFIG.LLAMA4_MAVERICK_ENDPOINT}

다른 인증 정보나 엔드포인트를 사용하려면:
- patches/internal-network-fix.js 파일을 수정하거나
- 환경 변수로 제공하세요: 
  NARRANS_TOKEN=값 LLAMA_TICKET=값 ./apply-internal-patch.js
========================================================
`);
  } catch (error) {
    console.error('패치 적용 중 오류 발생:', error);
    process.exit(1);
  }
}

// 패치 설정 업데이트
async function updatePatchConfig() {
  try {
    console.log('패치 설정 업데이트 중...');
    
    // 패치 파일 내용 읽기
    const patchContent = await fs.readFile(CONFIG.PATCH_FILE, 'utf-8');
    
    // 인증 정보 및 엔드포인트 업데이트
    let updatedContent = patchContent
      .replace(/NARRANS_TOKEN: ['"].*['"]/, `NARRANS_TOKEN: '${CONFIG.NARRANS_TOKEN}'`)
      .replace(/LLAMA_TICKET: ['"].*['"]/, `LLAMA_TICKET: '${CONFIG.LLAMA_TICKET}'`)
      .replace(/\[LLMModel\.NARRANS\]: ['"].*['"]/, `[LLMModel.NARRANS]: '${CONFIG.NARRANS_ENDPOINT}'`)
      .replace(/\[LLMModel\.LLAMA4_SCOUT\]: ['"].*['"]/, `[LLMModel.LLAMA4_SCOUT]: '${CONFIG.LLAMA4_SCOUT_ENDPOINT}'`) 
      .replace(/\[LLMModel\.LLAMA4_MAVERICK\]: ['"].*['"]/, `[LLMModel.LLAMA4_MAVERICK]: '${CONFIG.LLAMA4_MAVERICK_ENDPOINT}'`);
    
    // 업데이트된 내용 저장
    await fs.writeFile(CONFIG.PATCH_FILE, updatedContent, 'utf-8');
    
    console.log('패치 설정이 업데이트되었습니다.');
  } catch (error) {
    console.error('패치 설정 업데이트 중 오류 발생:', error);
    throw error;
  }
}

// 스크립트 실행
main().catch(error => {
  console.error('스크립트 실행 중 오류 발생:', error);
  process.exit(1);
});