import * as assert from 'assert';
import { CommandParserService } from '../../src/core/command/CommandParserService';
import { CommandPrefix, CommandType } from '../../src/types/CommandTypes';

/**
 * 명령어 파서 버그 수정 테스트
 * 
 * 이 테스트는 다음 사항을 검증합니다:
 * 1. @ 접두사 명령어가 콜론 없이 입력될 경우 (예: "@알려줘") null을 반환해야 함
 * 2. 올바른 @ 명령어 (예: "@git:status")는 정상적으로 파싱되어야 함
 * 3. 슬래시 명령어 (예: "/help")는 정상적으로 파싱되어야 함
 */
describe('CommandParserService Tests', () => {
  let parser: CommandParserService;

  beforeEach(() => {
    // 각 테스트 전에 새 파서 인스턴스 생성
    parser = new CommandParserService();
  });

  it('should return null for @ message without a colon', () => {
    // 콜론 없는 @ 메시지 테스트
    const result = parser.parse('@알려줘');
    assert.strictEqual(result, null, '콜론 없는 @ 메시지는 null을 반환해야 합니다');
    
    // 다른 예시도 테스트
    const result2 = parser.parse('@help');
    assert.strictEqual(result2, null, '콜론 없는 @ 메시지는 null을 반환해야 합니다');
  });

  it('should correctly parse @ command with a colon', () => {
    // 콜론이 있는 올바른 @ 명령어 테스트
    const result = parser.parse('@git:status');
    
    // 결과가 null이 아닌지 확인
    assert.notStrictEqual(result, null, '올바른 @ 명령어는 null이 아니어야 합니다');
    
    // 올바른 파싱 결과 확인
    if (result) {
      assert.strictEqual(result.prefix, CommandPrefix.AT, '접두사가 @ 이어야 합니다');
      assert.strictEqual(result.type, CommandType.AT, '타입이 AT 이어야 합니다');
      assert.strictEqual(result.agentId, 'git', '에이전트 ID가 git 이어야 합니다');
      assert.strictEqual(result.command, 'status', '명령어가 status 이어야 합니다');
      assert.strictEqual(result.rawInput, '@git:status', '원본 입력이 보존되어야 합니다');
    }
    
    // 인자가 있는 @ 명령어 테스트
    const resultWithArgs = parser.parse('@jira:issue --title="버그 수정" --priority=high');
    
    assert.notStrictEqual(resultWithArgs, null, '인자가 있는 @ 명령어는 null이 아니어야 합니다');
    
    if (resultWithArgs) {
      assert.strictEqual(resultWithArgs.agentId, 'jira', '에이전트 ID가 jira 이어야 합니다');
      assert.strictEqual(resultWithArgs.command, 'issue', '명령어가 issue 이어야 합니다');
      assert.strictEqual(resultWithArgs.flags.title, '버그 수정', 'title 플래그가 올바르게 파싱되어야 합니다');
      assert.strictEqual(resultWithArgs.flags.priority, 'high', 'priority 플래그가 올바르게 파싱되어야 합니다');
    }
  });

  it('should correctly parse / commands', () => {
    // 기본 슬래시 명령어 테스트
    const result = parser.parse('/help');
    
    assert.notStrictEqual(result, null, '슬래시 명령어는 null이 아니어야 합니다');
    
    if (result) {
      assert.strictEqual(result.prefix, CommandPrefix.SLASH, '접두사가 / 이어야 합니다');
      assert.strictEqual(result.type, CommandType.SLASH, '타입이 SLASH 이어야 합니다');
      assert.strictEqual(result.agentId, 'core', '에이전트 ID가 core 이어야 합니다');
      assert.strictEqual(result.command, 'help', '명령어가 help 이어야 합니다');
      assert.strictEqual(result.rawInput, '/help', '원본 입력이 보존되어야 합니다');
    }
    
    // 인자가 있는 슬래시 명령어 테스트
    const resultWithArgs = parser.parse('/settings --theme=dark');
    
    assert.notStrictEqual(resultWithArgs, null, '인자가 있는 슬래시 명령어는 null이 아니어야 합니다');
    
    if (resultWithArgs) {
      assert.strictEqual(resultWithArgs.agentId, 'core', '에이전트 ID가 core 이어야 합니다');
      assert.strictEqual(resultWithArgs.command, 'settings', '명령어가 settings 이어야 합니다');
      assert.strictEqual(resultWithArgs.flags.theme, 'dark', 'theme 플래그가 올바르게 파싱되어야 합니다');
    }
  });
  
  it('should handle normal text correctly', () => {
    // 일반 텍스트는 명령어가 아니므로 null 반환 확인
    const result = parser.parse('이것은 일반 텍스트입니다');
    assert.strictEqual(result, null, '일반 텍스트는 null을 반환해야 합니다');
  });
});