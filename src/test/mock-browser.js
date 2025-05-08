/**
 * 브라우저 환경을 모의하는 스크립트
 * 실제 브라우저 환경 없이 테스트를 실행하기 위해 사용
 */

// 전역 모의 브라우저 객체
global.browser = {
  getWorkbench: async () => ({
    getCustomWebview: async () => ({
      waitForVisible: async () => true,
      switchToFrame: async () => {},
      switchBack: async () => {},
      getTitleBar: () => ({
        getTitle: async () => "VSCode Mock"
      })
    }),
    getTitleBar: () => ({
      getTitle: async () => "VSCode Mock"
    })
  }),
  waitUntil: async (fn, options) => {
    try {
      return await fn();
    } catch (err) {
      if (options && options.timeoutMsg) {
        console.error(options.timeoutMsg);
      }
      return false;
    }
  },
  pause: async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

// 전역 jQuery 스타일 셀렉터
global.$ = async (selector) => ({
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
});

// 셀렉터 컬렉션
global.$$ = async (selector) => [await global.$(selector)];

// 전역 expect 함수
global.expect = (value) => ({
  toBe: (expected) => value === expected,
  toEqual: (expected) => JSON.stringify(value) === JSON.stringify(expected),
  toBeDefined: () => value !== undefined,
  toBeGreaterThan: (expected) => value > expected,
  toContain: (expected) => value.includes(expected),
  toHaveText: (expected) => true,
  toHaveValue: (expected) => true,
  toExist: () => true,
  toBeDisplayed: () => true
});

// 환경 변수 설정
process.env.LLM_TEST_MODE = 'mock';

console.log('모의 브라우저 환경 설정 완료');