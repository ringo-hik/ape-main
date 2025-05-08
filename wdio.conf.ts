import type { Options } from '@wdio/types';
import path from 'path';
import fs from 'fs';

// 권한 설정 파일 로드
const authPermissionsPath = path.join(__dirname, 'auth-permissions.json');
const authPermissions = fs.existsSync(authPermissionsPath) 
  ? JSON.parse(fs.readFileSync(authPermissionsPath, 'utf8'))
  : {};

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
  
  // 출력 디렉토리
  outputDir: 'trace',
  
  // VSCode 확장 테스트를 위한 설정
  specs: [
    './src/test/suite/**/*.test.ts',
    './test-scenarios/**/*.test.ts'
  ],
  
  // 최대 인스턴스 수
  maxInstances: 1,
  
  // VSCode 브라우저 설정
  capabilities: [{
    browserName: 'vscode',
    browserVersion: 'stable', // 최신 VSCode 버전 사용
    'wdio:vscodeOptions': {
      extensionPath: __dirname, // 확장 프로그램 경로
      userSettings: {
        "editor.fontSize": 14,
        "ape.llm.apiKey": "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",
        "ape.llm.endpoint": "https://openrouter.ai/api/v1/chat/completions",
        "security.workspace.trust.enabled": false,
        "security.workspace.trust.startupPrompt": "never",
        "security.workspace.trust.banner": "never",
        "workbench.dialogs.customEnabled": false,
        "extensions.ignoreRecommendations": true
      },
      // 자동 권한 허용 설정
      permissionAuto: true,
      // 권한 요청 스킵 설정
      skipPermissionPrompts: true,
      // 권한 미리 승인
      permissions: authPermissions
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
  
  // 재시도 설정
  specFileRetries: 1,
  specFileRetriesDelay: 0,
  specFileRetriesDeferred: false,
  
  // 훅 설정
  onPrepare: function (config, capabilities) {
    console.log('WebdriverIO 테스트 준비 중...');
  },
  
  before: async function () {
    console.log('권한 자동 허용 설정 적용 중...');
    // WebdriverIO 권한 요청 자동 수락 설정
    if (browser && browser.executeScript) {
      await browser.executeScript(`
        // 모든 권한 요청 자동 수락 설정
        window.permissionAutoAccept = true;
        
        // 권한 요청 자동 수락 처리
        if (window.navigator.permissions && window.navigator.permissions.query) {
          const originalQuery = window.navigator.permissions.query;
          window.navigator.permissions.query = function(permissionDesc) {
            return Promise.resolve({state: 'granted', addEventListener: () => {}});
          };
        }
        
        console.log('[WebdriverIO] 권한 자동 수락 설정 완료');
      `);
    }
  },
  
  onComplete: function () {
    console.log('WebdriverIO 테스트 완료');
  }
};