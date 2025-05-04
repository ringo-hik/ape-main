/**
 * 명령어 파서 테스트 실행 스크립트
 * 
 * 이 스크립트는 mocha를 사용하여 CommandParserService 테스트를 실행합니다.
 * 특정 버그 수정을 검증하기 위한 간단한 테스트 스크립트입니다.
 */

const path = require('path');
const Mocha = require('mocha');

// Mocha 인스턴스 생성
const mocha = new Mocha({
  color: true,
  ui: 'bdd'
});

// 테스트 파일 추가
// commandParser.test.ts 파일만 실행합니다
mocha.addFile(path.resolve(__dirname, './suite/commandParser.test.js'));

// 테스트 실행
console.log('CommandParserService 버그 수정 테스트 실행 중...');
mocha.run(failures => {
  process.exitCode = failures ? 1 : 0; // 실패 시 종료 코드 설정
  if (failures) {
    console.error(`테스트 실패: ${failures}개의 실패가 발생했습니다.`);
  } else {
    console.log('모든 테스트가 성공적으로 통과했습니다!');
    console.log('CommandParserService의 버그 수정이 올바르게 작동합니다:');
    console.log('1. "@알려줘"와 같은 콜론 없는 @ 메시지는 null을 반환');
    console.log('2. "@git:status"와 같은 콜론이 있는 @ 명령어는 정상 파싱');
    console.log('3. "/help"와 같은 슬래시 명령어는 정상 파싱');
  }
});