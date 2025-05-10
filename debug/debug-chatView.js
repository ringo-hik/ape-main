// 첫 번째 줄에 추가할 디버그 로깅
console.log('DEBUG: chatView.js 로딩 시작');

// 원본 파일 내용 가져오기
const originalContent = require('fs').readFileSync('/home/hik90/ape/new_ape-extension/media/js/views/chatView.js', 'utf8');

// 초기화 함수에 디버그 코드 추가
const enhancedContent = originalContent.replace(
  'function initialize() {',
  `function initialize() {
    console.log('DEBUG: initialize 함수 호출됨');`
).replace(
  'function setup() {',
  `function setup() {
    console.log('DEBUG: setup 함수 호출됨');
    console.log('DEBUG: document.readyState =', document.readyState);
    console.log('DEBUG: #chat-messages element =', document.querySelector('#chat-messages'));
    console.log('DEBUG: #chat-input element =', document.querySelector('#chat-input'));`
).replace(
  'function updateMessages(messages, isStreaming) {',
  `function updateMessages(messages, isStreaming) {
    console.log('DEBUG: updateMessages 함수 호출됨', messages ? messages.length : 0, 'messages, isStreaming =', isStreaming);
    if (\!elements.chatMessages) {
      console.error('DEBUG: CRITICAL ERROR - elements.chatMessages is null or undefined in updateMessages');
      console.trace();
    }`
).replace(
  'function formatMessageContent(content) {',
  `function formatMessageContent(content) {
    console.log('DEBUG: formatMessageContent 함수 호출됨', content ? content.length : 0, 'bytes');
    if (\!content) {
      console.warn('DEBUG: 콘텐츠가 비어있음');
      return '';
    }`
);

// 디버그 내용 새 파일로 저장
require('fs').writeFileSync('/home/hik90/ape/new_ape-extension/debug/chatView.js.debug', enhancedContent);

// 수정 전후 비교할 수 있는 디버그 정보 출력
console.log('DEBUG VERSION created at: /home/hik90/ape/new_ape-extension/debug/chatView.js.debug');

// 수정된 버전을 원본 파일 위치에 복사
require('fs').copyFileSync('/home/hik90/ape/new_ape-extension/debug/chatView.js.debug', '/home/hik90/ape/new_ape-extension/media/js/views/chatView.js');
console.log('DEBUG VERSION installed, original backed up to: /home/hik90/ape/new_ape-extension/debug/chatView.js.original');
