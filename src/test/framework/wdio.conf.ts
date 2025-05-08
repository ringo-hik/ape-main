import type { Options } from '@wdio/types';
import path from 'path';

export const config: Options.Testrunner = {
  // WebdriverIO 실행 관련 설정
  runner: 'local',
  autoCompileOpts: {
    autoCompile: true,
    tsNodeOpts: {
      project: './tsconfig.json',
      transpileOnly: true
    }
  },
  
  // VSCode 확장 테스트를 위한 설정
  specs: [
    path.join(process.cwd(), './src/test/suite/**/*.test.ts')
  ],
  exclude: [],
  
  // 최대 인스턴스 수
  maxInstances: 1,
  
  // VSCode 브라우저 설정
  capabilities: [{
    browserName: 'vscode',
    browserVersion: 'stable', // 최신 VSCode 버전 사용
    'wdio:vscodeOptions': {
      extensionPath: process.cwd(), // 확장 프로그램 경로
      userSettings: {
        "editor.fontSize": 14,
        "ape.llm.apiKey": "test_api_key",
        "ape.llm.endpoint": "https://test-endpoint.example.com/api"
      }
    }
  }],
  
  // 로그 레벨
  logLevel: 'info',
  
  // 베이스 URL (VSCode에서는 사용되지 않음)
  baseUrl: '',
  
  // 기본 타임아웃 설정
  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,
  
  // 서비스 설정 (VSCode 서비스 사용)
  services: ['vscode'],
  
  // 테스트 프레임워크 설정
  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 60000
  },
  
  // 리포터 설정
  reporters: ['spec'],
  
  // 훅 설정
  onPrepare: function (config, capabilities) {
    console.log('WebdriverIO 테스트 준비 중...');
  },
  
  onComplete: function () {
    console.log('WebdriverIO 테스트 완료');
  }
};