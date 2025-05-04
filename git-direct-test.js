/**
 * Git 직접 테스트 스크립트
 * 
 * Axiom의 GitClientService를 직접 사용하여 Git 명령어를
 * 모의 환경 없이 실제 Git 저장소에서 테스트합니다.
 */

const { GitClientService } = require('./dist/plugins/internal/git/GitClientService');

/**
 * GitClientService 테스트 실행
 */
async function runGitTest() {
  console.log('='.repeat(80));
  console.log('Git 클라이언트 직접 테스트 시작');
  console.log('='.repeat(80));
  
  // GitClientService 인스턴스 생성
  const gitClient = new GitClientService();
  
  // 테스트 함수 정의
  const runTest = async (name, testFn) => {
    console.log('\n' + '-'.repeat(50));
    console.log(`테스트: ${name}`);
    console.log('-'.repeat(50));
    
    try {
      const result = await testFn();
      console.log('성공:', JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error('실패:', error.message);
      return null;
    }
  };
  
  // 1. Git 상태 확인
  await runTest('Git 상태 확인', async () => {
    return await gitClient.getStatus();
  });
  
  // 2. 변경 내역 확인
  await runTest('변경 내역 확인', async () => {
    const diff = await gitClient.getDiff();
    return { diffLength: diff.length };
  });
  
  // 3. 브랜치 목록 확인
  await runTest('브랜치 목록 확인', async () => {
    return await gitClient.getBranches(true);
  });
  
  // 4. 파일 스테이징 (테스트 파일만)
  await runTest('파일 스테이징 (테스트 파일)', async () => {
    // 테스트 파일 생성
    const fs = require('fs');
    const testFilePath = 'git-test-file.txt';
    fs.writeFileSync(testFilePath, `Git 테스트 파일 내용 - ${new Date().toISOString()}`);
    
    return await gitClient.stageFiles([testFilePath]);
  });
  
  // 5. 커밋 테스트
  const commitResult = await runTest('커밋 테스트', async () => {
    return await gitClient.commit({
      message: 'Git 테스트: 테스트 파일 추가',
      all: false // 스테이징된 변경사항만 커밋
    });
  });
  
  // 6. 원격 저장소 설정 확인
  await runTest('원격 저장소 확인', async () => {
    const { spawn } = require('child_process');
    const gitProcess = spawn('git', ['remote', '-v']);
    
    return new Promise((resolve) => {
      let output = '';
      
      gitProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      gitProcess.on('close', () => {
        const remotes = output.trim().split('\n')
          .filter(line => line.trim() !== '')
          .map(line => {
            const [name, url, type] = line.split(/\s+/);
            return { name, url, type: type.replace(/[()]/g, '') };
          });
          
        resolve({ remotes });
      });
    });
  });
  
  // 7. 원격 저장소 푸시 (origin이 설정된 경우만)
  if (commitResult) {
    await runTest('원격 저장소 푸시 (origin이 설정된 경우)', async () => {
      try {
        return await gitClient.push({
          remote: 'origin',
          branch: 'master',
          setUpstream: true
        });
      } catch (error) {
        if (error.message.includes('origin')) {
          console.log('원격 저장소 설정 방법:');
          console.log('git remote add origin https://github.com/your-username/axiom-extension.git');
          throw new Error('원격 저장소가 설정되지 않았습니다');
        }
        throw error;
      }
    });
  }
  
  console.log('\n='.repeat(80));
  console.log('Git 테스트 완료');
  console.log('='.repeat(80));
  
  console.log('\n실제 원격 저장소 설정 방법:');
  console.log('1. GitHub에서 새 저장소 생성 (https://github.com/new)');
  console.log('2. 로컬 저장소에 원격 저장소 추가:');
  console.log('   git remote add origin https://github.com/your-username/axiom-extension.git');
  console.log('3. 개인 액세스 토큰(PAT) 생성: https://github.com/settings/tokens');
  console.log('4. 자격 증명 저장:');
  console.log('   git config credential.helper store');
  console.log('5. 원격 저장소로 푸시:');
  console.log('   git push -u origin master');
}

// 테스트 실행
runGitTest().catch(console.error);