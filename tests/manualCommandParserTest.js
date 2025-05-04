/**
 * CommandParserService 수동 테스트 스크립트
 * 
 * 이 스크립트는 Mocha 없이 직접 CommandParserService를 테스트합니다.
 * 빌드 없이 직접 실행할 수 있는 간단한 테스트입니다.
 * 
 * 실행 방법: node manualCommandParserTest.js
 */

// TypeScript 파일 직접 로드를 위한 ts-node 등록
require('ts-node').register();

// CommandParserService 및 관련 타입 임포트
const { CommandParserService } = require('../src/core/command/CommandParserService');
const { CommandPrefix, CommandType } = require('../src/types/CommandTypes');

// 테스트 함수
function runTests() {
  console.log('CommandParserService 수동 테스트 시작...\n');
  
  // 파서 인스턴스 생성
  const parser = new CommandParserService();
  
  // 테스트 케이스 정의
  const testCases = [
    {
      name: '콜론 없는 @ 메시지 테스트 (@알려줘)',
      input: '@알려줘',
      expect: null,
      check: (result) => result === null
    },
    {
      name: '콜론 없는 @ 메시지 테스트 (@help)',
      input: '@help',
      expect: null,
      check: (result) => result === null
    },
    {
      name: '올바른 @ 명령어 테스트 (@git:status)',
      input: '@git:status',
      expect: {
        prefix: CommandPrefix.AT,
        type: CommandType.AT,
        agentId: 'git',
        command: 'status'
      },
      check: (result) => 
        result !== null &&
        result.prefix === CommandPrefix.AT &&
        result.type === CommandType.AT &&
        result.agentId === 'git' &&
        result.command === 'status'
    },
    {
      name: '인자가 있는 @ 명령어 테스트 (@jira:issue --title="버그 수정")',
      input: '@jira:issue --title="버그 수정"',
      expect: {
        agentId: 'jira',
        command: 'issue',
        flags: { title: '버그 수정' }
      },
      check: (result) =>
        result !== null &&
        result.agentId === 'jira' &&
        result.command === 'issue' &&
        result.flags.title === '버그 수정'
    },
    {
      name: '슬래시 명령어 테스트 (/help)',
      input: '/help',
      expect: {
        prefix: CommandPrefix.SLASH,
        type: CommandType.SLASH,
        agentId: 'core',
        command: 'help'
      },
      check: (result) =>
        result !== null &&
        result.prefix === CommandPrefix.SLASH &&
        result.type === CommandType.SLASH &&
        result.agentId === 'core' &&
        result.command === 'help'
    },
    {
      name: '일반 텍스트 테스트 (일반 텍스트)',
      input: '이것은 일반 텍스트입니다',
      expect: null,
      check: (result) => result === null
    }
  ];
  
  // 테스트 실행
  let passCount = 0;
  let failCount = 0;
  
  testCases.forEach((test) => {
    console.log(`테스트: ${test.name}`);
    console.log(`입력: "${test.input}"`);
    
    // 명령어 파싱
    const result = parser.parse(test.input);
    
    // 결과 출력
    console.log('결과:', result !== null ? JSON.stringify(result, null, 2) : 'null');
    console.log('기대:', test.expect !== null ? JSON.stringify(test.expect, null, 2) : 'null');
    
    // 테스트 결과 확인
    const passed = test.check(result);
    console.log(`테스트 ${passed ? '통과 ✓' : '실패 ✗'}`);
    
    if (passed) {
      passCount++;
    } else {
      failCount++;
    }
    
    console.log('-'.repeat(50));
  });
  
  // 테스트 요약
  console.log(`\n테스트 결과: ${passCount}개 통과, ${failCount}개 실패`);
  
  if (failCount === 0) {
    console.log('CommandParserService의 버그 수정이 올바르게 작동합니다!');
    console.log('1. "@알려줘"와 같은 콜론 없는 @ 메시지는 null을 반환');
    console.log('2. "@git:status"와 같은 콜론이 있는 @ 명령어는 정상 파싱');
    console.log('3. "/help"와 같은 슬래시 명령어는 정상 파싱');
  } else {
    console.log('일부 테스트가 실패했습니다. 코드를 다시 확인해주세요.');
  }
}

// 테스트 실행
runTests();