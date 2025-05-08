// LLM 테스트 실행을 위한 Node.js 스크립트
const { spawnSync } = require('child_process');
const path = require('path');

console.log('LLM 자체 테스트 실행 중...');

// 환경 변수 설정
process.env.LLM_TEST_MODE = 'mock';

// Mocha 실행
const result = spawnSync('npx', [
  'mocha',
  '--require',
  'ts-node/register',
  'src/test/suite/llm-self.test.ts'
], {
  stdio: 'inherit',
  cwd: process.cwd()
});

// 종료 코드 반환
process.exit(result.status);