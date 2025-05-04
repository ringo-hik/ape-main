const path = require('path');
const { runTests } = require('@vscode/test-electron');

async function main() {
  try {
    // 확장 프로그램 경로
    const extensionDevelopmentPath = path.resolve(__dirname, '../');

    // 테스트 파일 경로
    const extensionTestsPath = path.resolve(__dirname, './suite');

    // VS Code에서 확장 프로그램 테스트 실행
    await runTests({ 
      extensionDevelopmentPath, 
      extensionTestsPath,
      launchArgs: ['--disable-extensions'] 
    });
  } catch (err) {
    console.error('테스트 실행 중 오류가 발생했습니다:', err);
    process.exit(1);
  }
}

main();