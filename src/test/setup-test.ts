// @ts-nocheck
/**
 * 테스트 환경 설정 파일
 * 
 * 이 파일은 테스트 실행 전에 필요한 전역 설정을 초기화합니다.
 * mocha의 --require 옵션을 통해 로드됩니다.
 * 타입 체크 비활성화 (VSCode/WebdriverIO 연동 문제 해결)
 */

// TypeScript 불일치 경고 무시
process.env.TS_NODE_IGNORE = 'true';

// 필요한 글로벌 객체 모킹 (jQuery 스타일 셀렉터)
if (typeof global.$ === 'undefined') {
  global.$ = async (selector: string) => {
    // 실제 테스트 실행 환경(WebdriverIO)에서는 오버라이드됨
    return {
      waitForExist: async () => true,
      waitForDisplayed: async () => true,
      isExisting: async () => true,
      isDisplayed: async () => true,
      isEnabled: async () => true,
      getText: async () => "Mock Text",
      getValue: async () => "Mock Value",
      setValue: async () => {},
      click: async () => {},
      isClickable: async () => true
    };
  };
}

// LLM_TEST_MODE 환경 변수 설정
if (!process.env.LLM_TEST_MODE) {
  process.env.LLM_TEST_MODE = 'mock';
}

// 로깅
console.log(`테스트 환경 초기화 완료 (모드: ${process.env.LLM_TEST_MODE})`);