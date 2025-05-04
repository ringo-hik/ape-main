const assert = require('assert');
const vscode = require('vscode');

suite('Axiom Extension 테스트', () => {
  // 테스트 실행 전 준비
  setup(async () => {
    // 필요한 경우 여기에 초기화 코드 추가
  });

  // 테스트 종료 후 정리
  teardown(async () => {
    // 필요한 경우 여기에 정리 코드 추가
  });

  test('확장 프로그램이 활성화됨', async () => {
    // 확장 프로그램이 제대로 활성화되었는지 확인
    const extension = vscode.extensions.getExtension('axiom-team.axiom');
    assert.ok(extension);
    await extension.activate();
    assert.ok(extension.isActive);
  });

  test('명령어가 등록됨', () => {
    // 명령어가 제대로 등록되었는지 확인
    return vscode.commands.getCommands(true).then(commands => {
      // 필수 명령어가 있는지 확인
      const axiomCommands = commands.filter(cmd => cmd.startsWith('axiom.'));
      assert.ok(axiomCommands.includes('axiom.openSidebar'));
      assert.ok(axiomCommands.includes('axiom.openChat'));
      assert.ok(axiomCommands.includes('axiom.clearChat'));
    });
  });

  // 추가 테스트는 여기에 작성
});