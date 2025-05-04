/**
 * 인덱스 파일
 * 
 * 이 파일은 확장 프로그램의 진입점이 되는 파일을 내보냅니다.
 */

export { activate, deactivate } from './extension';

// 추가 내보내기
export * from './services/ChatService';
export * from './ui/AxiomChatViewProvider';