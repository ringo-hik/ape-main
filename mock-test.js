/**
 * Axiom 통합 테스트 스크립트
 * 실제 서비스 연결 없이 명령어 파싱 및 처리 테스트
 */

const { CommandParserService } = require('./dist/core/command/CommandParserService');

// 명령어 파서 생성
const parser = new CommandParserService();

// 모의 명령어 처리기
function mockCommandHandler(command) {
  if (command === null) {
    return {
      type: 'text',
      content: '일반 텍스트 메시지로 처리됨'
    };
  }
  
  if (command.prefix === '@') {
    switch(command.agentId) {
      case 'git':
        return mockGitCommand(command);
      case 'jira':
        return mockJiraCommand(command);
      case 'swdp':
        return mockSwdpCommand(command);
      default:
        return {
          type: 'error',
          content: `${command.agentId} 플러그인이 연결되지 않았습니다.`
        };
    }
  } else if (command.prefix === '/') {
    return mockInternalCommand(command);
  }
  
  return {
    type: 'error',
    content: '알 수 없는 명령어 형식입니다.'
  };
}

// Git 명령어 모의 처리
function mockGitCommand(command) {
  switch(command.command) {
    case 'status':
      return {
        type: 'success',
        content: `
# Git 상태 (모의 응답)
현재 브랜치: master

수정된 파일:
  M src/core/command/CommandParserService.ts
  M src/core/command/CommandExecutorService.ts
  M STREAMING_IMPLEMENTATION.md

추적되지 않은 파일:
  tests/manualCommandParserTest.js
  tests/suite/commandParser.test.ts
`
      };
    case 'commit':
      return {
        type: 'success',
        content: `변경 사항 커밋 완료: ${command.args.join(' ') || '커밋 메시지 없음'}`
      };
    case 'pull':
      return {
        type: 'success',
        content: '원격 저장소에서 변경 사항을 성공적으로 가져왔습니다.'
      };
    case 'push':
      return {
        type: 'success',
        content: '원격 저장소로 변경 사항을 성공적으로 푸시했습니다.'
      };
    default:
      return {
        type: 'error',
        content: `알 수 없는 Git 명령어: ${command.command}`
      };
  }
}

// Jira 명령어 모의 처리
function mockJiraCommand(command) {
  switch(command.command) {
    case 'issue':
      if (command.args[0] === 'create') {
        return {
          type: 'success',
          content: `
# Jira 이슈 생성 완료 (모의 응답)
이슈 키: AXIOM-123
제목: ${command.flags.title || '새 이슈'}
유형: ${command.flags.type || '작업'}
담당자: ${command.flags.assignee || '미지정'}
우선순위: ${command.flags.priority || '보통'}
`
        };
      } else if (command.args[0] === 'list') {
        return {
          type: 'success',
          content: `
# Jira 이슈 목록 (모의 응답)
AXIOM-123: 명령어 파싱 버그 수정 (진행 중)
AXIOM-122: 내부망/외부망 구성 분리 (완료)
AXIOM-121: 모델 구성 관리 개선 (검토 중)
AXIOM-120: 스트리밍 응답 처리 개선 (할 일)
`
        };
      } else {
        return {
          type: 'error',
          content: `알 수 없는 Jira issue 하위 명령어: ${command.args[0] || '없음'}`
        };
      }
    case 'project':
      return {
        type: 'success',
        content: `
# Jira 프로젝트 정보 (모의 응답)
프로젝트 키: AXIOM
이름: Axiom VS Code Extension
총 이슈: 57개
해결됨: 34개
미해결: 23개
내 이슈: 12개
`
      };
    default:
      return {
        type: 'error',
        content: `알 수 없는 Jira 명령어: ${command.command}`
      };
  }
}

// SWDP 명령어 모의 처리
function mockSwdpCommand(command) {
  switch(command.command) {
    case 'build':
      if (command.args[0] === 'status') {
        return {
          type: 'success',
          content: `
# SWDP 빌드 상태 (모의 응답)
현재 빌드: #123
상태: 성공
시작 시간: 2023-05-04 14:32:15
종료 시간: 2023-05-04 14:45:23
테스트 결과: 통과 (87/87)
커버리지: 92%
`
        };
      } else {
        return {
          type: 'success',
          content: `
# SWDP 빌드 시작 (모의 응답)
빌드 번호: #124
타입: ${command.args[0] || 'standard'}
소스 브랜치: master
시작 시간: ${new Date().toLocaleString()}
예상 완료: 15분 후
`
        };
      }
    case 'deploy':
      return {
        type: 'success',
        content: `
# SWDP 배포 시작 (모의 응답)
배포 ID: DEP-456
환경: ${command.args[0] || 'dev'}
빌드: #123
상태: 진행 중
시작 시간: ${new Date().toLocaleString()}
예상 완료: 10분 후
`
      };
    case 'monitor':
      return {
        type: 'success',
        content: `
# SWDP 모니터링 (모의 응답)
서비스 상태: 정상
활성 인스턴스: 3
CPU 사용률: 45%
메모리 사용률: 60%
최근 오류: 없음
`
      };
    default:
      return {
        type: 'error',
        content: `알 수 없는 SWDP 명령어: ${command.command}`
      };
  }
}

// 내부 명령어 모의 처리
function mockInternalCommand(command) {
  switch(command.command) {
    case 'help':
      return {
        type: 'success',
        content: `
# Axiom 도움말 (모의 응답)

## 외부 명령어 (@)
- @git:status - Git 상태 확인
- @git:commit "메시지" - 변경 사항 커밋
- @git:pull - 원격 저장소에서 가져오기
- @git:push - 원격 저장소로 푸시

- @jira:issue create --title="제목" --type="유형" - Jira 이슈 생성
- @jira:issue list - Jira 이슈 목록 조회
- @jira:project - Jira 프로젝트 정보 조회

- @swdp:build - SWDP 빌드 시작
- @swdp:build status - SWDP 빌드 상태 확인
- @swdp:deploy [환경] - SWDP 배포 시작
- @swdp:monitor - SWDP 모니터링

## 내부 명령어 (/)
- /help - 도움말 표시
- /clear - 대화 내역 지우기
- /settings - 설정 열기
- /update - 확장 업데이트 확인
- /model - AI 모델 선택
- /version - 버전 정보 표시
`
      };
    case 'clear':
      return {
        type: 'success',
        content: '대화 내역이 지워졌습니다.'
      };
    case 'settings':
      return {
        type: 'success',
        content: '설정 창이 열렸습니다.'
      };
    case 'update':
      return {
        type: 'success',
        content: '최신 버전을 사용 중입니다 (0.0.1).'
      };
    case 'model':
      return {
        type: 'success',
        content: `
# AI 모델 설정 (모의 응답)
현재 모델: gemini-2.5-flash
사용 가능한 모델:
- gemini-2.5-flash (기본)
- gemini-2.5-pro
- claude-3.5-sonnet
- claude-3.5-haiku
- llama4-130b
- mistral-large
`
      };
    case 'version':
      return {
        type: 'success',
        content: `
# Axiom 버전 정보 (모의 응답)
버전: 0.0.1
빌드: 20250504.1
Node.js: v18.19.1
VS Code: 1.87.0
플랫폼: linux
`
      };
    default:
      return {
        type: 'error',
        content: `알 수 없는 내부 명령어: ${command.command}`
      };
  }
}

// 사용자 입력 테스트 함수
function testInput(input) {
  console.log(`\n\n${'-'.repeat(80)}`);
  console.log(`사용자 입력: "${input}"`);
  console.log(`${'-'.repeat(80)}`);
  
  // 명령어 파싱
  const parsedCommand = parser.parse(input);
  console.log('파싱 결과:', parsedCommand);
  
  // 명령어 처리
  const response = mockCommandHandler(parsedCommand);
  
  // 응답 출력
  if (response.type === 'success') {
    console.log('\n✓ 성공:');
  } else if (response.type === 'error') {
    console.log('\n✗ 오류:');
  } else {
    console.log('\nℹ 정보:');
  }
  
  console.log(response.content);
}

// 테스트 목록
console.log('='.repeat(80));
console.log('Axiom 명령어 테스트 시작');
console.log('='.repeat(80));

// 일반 텍스트 테스트
testInput('안녕하세요, Axiom입니다.');
testInput('@알려줘 뭔가를 해줘');
testInput('@help without colon');

// Git 명령어 테스트
testInput('@git:status');
testInput('@git:commit "명령어 파싱 버그 수정"');
testInput('@git:pull');

// Jira 명령어 테스트
testInput('@jira:issue create --title="명령어 파싱 버그" --type="버그" --priority="높음"');
testInput('@jira:issue list');
testInput('@jira:project');

// SWDP 명령어 테스트
testInput('@swdp:build');
testInput('@swdp:build status');
testInput('@swdp:deploy production');

// 내부 명령어 테스트
testInput('/help');
testInput('/clear');
testInput('/model');
testInput('/version');

// 알 수 없는 명령어 테스트
testInput('@unknown:command');
testInput('/invalid');

console.log('\n='.repeat(80));
console.log('테스트 완료');
console.log('='.repeat(80));