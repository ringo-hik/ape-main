/**
 * 전역 타입 선언
 */

// jQuery 스타일 셀렉터 전역 함수
declare function $(selector: string): Promise<any>;
declare function $$(selector: string): Promise<any[]>;

// 테스트 환경에서 사용되는 전역 인터페이스

interface GlobalTestEnvironment {
  LLM_TEST_MODE?: 'mock' | 'live';
  TS_NODE_IGNORE?: string;
}

// Node.js 프로세스 환경 확장
declare namespace NodeJS {
  interface ProcessEnv extends GlobalTestEnvironment {}
}