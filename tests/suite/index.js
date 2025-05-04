const path = require('path');
const Mocha = require('mocha');
const glob = require('glob');

function run() {
  // 모카 테스트 러너 생성
  const mocha = new Mocha({
    ui: 'tdd',
    color: true,
    timeout: 10000
  });

  const testsRoot = path.resolve(__dirname, './');

  return new Promise((resolve, reject) => {
    // 모든 테스트 파일 찾기
    glob('**/**.test.js', { cwd: testsRoot }, (err, files) => {
      if (err) {
        return reject(err);
      }

      // 찾은 테스트 파일을 모카에 추가
      files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

      try {
        // 테스트 실행
        mocha.run(failures => {
          if (failures > 0) {
            reject(new Error(`${failures} 개의 테스트가 실패했습니다.`));
          } else {
            resolve();
          }
        });
      } catch (err) {
        console.error(err);
        reject(err);
      }
    });
  });
}

module.exports = {
  run
};