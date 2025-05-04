/**
 * Git CLI 테스트 스크립트
 * 
 * Node.js의 child_process를 사용하여 직접 Git 명령어를 실행하고
 * 결과를 분석하는 간단한 스크립트입니다.
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Git CLI 명령어 실행
 * @param {string[]} args Git 명령어 인자
 * @returns {Promise<{success: boolean, stdout: string, stderr: string, code: number|null}>} 실행 결과
 */
function executeGitCommand(args) {
  return new Promise((resolve) => {
    console.log(`실행: git ${args.join(' ')}`);
    
    const gitProcess = spawn('git', args);
    let stdout = '';
    let stderr = '';
    
    gitProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    gitProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    gitProcess.on('close', (code) => {
      const success = code === 0;
      
      if (success) {
        console.log('명령어 성공');
      } else {
        console.error(`명령어 실패 (${code}): ${stderr}`);
      }
      
      resolve({
        success,
        stdout,
        stderr,
        code
      });
    });
    
    gitProcess.on('error', (error) => {
      console.error('프로세스 오류:', error.message);
      
      resolve({
        success: false,
        stdout: '',
        stderr: error.message,
        code: null
      });
    });
  });
}

/**
 * Git 초기 설정 확인 및 필요시 설정
 */
async function setupGitConfig() {
  console.log('\n[1] Git 초기 설정 확인');
  console.log('-'.repeat(50));
  
  try {
    // Git 사용자 설정 확인
    const userEmail = execSync('git config user.email').toString().trim();
    const userName = execSync('git config user.name').toString().trim();
    
    console.log(`현재 사용자: ${userName} <${userEmail}>`);
  } catch (error) {
    console.log('Git 사용자 정보가 설정되지 않았습니다. 설정합니다...');
    
    // 임시 사용자 정보 설정
    execSync('git config user.name "Axiom Test User"');
    execSync('git config user.email "axiom.test@example.com"');
    
    console.log('임시 사용자 정보가 설정되었습니다:');
    console.log('- 이름: Axiom Test User');
    console.log('- 이메일: axiom.test@example.com');
  }
  
  // 원격 저장소 확인
  const remotes = execSync('git remote -v 2>/dev/null || echo ""').toString().trim();
  
  if (remotes) {
    console.log('\n원격 저장소:');
    console.log(remotes);
  } else {
    console.log('\n원격 저장소가 설정되지 않았습니다.');
    console.log('GitHub 저장소를 추가하려면:');
    console.log('git remote add origin https://github.com/your-username/axiom-extension.git');
  }
}

/**
 * Git 상태 확인
 */
async function checkGitStatus() {
  console.log('\n[2] Git 상태 확인');
  console.log('-'.repeat(50));
  
  const result = await executeGitCommand(['status']);
  
  if (result.success) {
    console.log('\n상태 정보:');
    console.log(result.stdout);
  }
  
  return result;
}

/**
 * 테스트 파일 생성 및 스테이징
 */
async function createAndStageTestFile() {
  console.log('\n[3] 테스트 파일 생성 및 스테이징');
  console.log('-'.repeat(50));
  
  // 테스트 파일 생성
  const testFileName = `git-test-file-${Date.now()}.txt`;
  const testFilePath = path.join(process.cwd(), testFileName);
  
  try {
    fs.writeFileSync(testFilePath, `이 파일은 Git 테스트를 위해 생성되었습니다.\n생성 시간: ${new Date().toLocaleString()}`);
    console.log(`테스트 파일 생성됨: ${testFileName}`);
    
    // 파일 스테이징
    const stageResult = await executeGitCommand(['add', testFileName]);
    
    if (stageResult.success) {
      console.log(`${testFileName} 파일이 성공적으로 스테이징되었습니다.`);
      return { success: true, fileName: testFileName };
    } else {
      return { success: false, error: stageResult.stderr };
    }
  } catch (error) {
    console.error('파일 생성 중 오류 발생:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 변경 사항 커밋
 */
async function commitChanges() {
  console.log('\n[4] 변경 사항 커밋');
  console.log('-'.repeat(50));
  
  const commitMessage = `테스트 파일 추가 (${new Date().toLocaleString()})`;
  const result = await executeGitCommand(['commit', '-m', commitMessage]);
  
  if (result.success) {
    console.log('커밋 성공:');
    console.log(result.stdout);
    
    // 커밋 정보 조회
    const logResult = await executeGitCommand(['log', '-1']);
    if (logResult.success) {
      console.log('\n커밋 정보:');
      console.log(logResult.stdout);
    }
    
    return { success: true, commitMessage };
  } else {
    return { success: false, error: result.stderr };
  }
}

/**
 * GitHub 연결 테스트
 */
async function testGitHubConnection() {
  console.log('\n[5] GitHub 연결 테스트');
  console.log('-'.repeat(50));
  
  // 원격 저장소 설정 확인
  const remoteResult = await executeGitCommand(['remote', '-v']);
  
  if (!remoteResult.stdout.includes('origin')) {
    console.log('GitHub 원격 저장소가 설정되지 않았습니다.');
    console.log('다음 명령어로 GitHub 저장소를 추가할 수 있습니다:');
    console.log('git remote add origin https://github.com/your-username/axiom-extension.git');
    return { success: false, reason: 'remote-not-configured' };
  }
  
  // 원격 저장소 푸시 시도 (로컬 커밋이 있는 경우)
  console.log('\nGitHub으로 푸시 시도...');
  
  try {
    // fetch 먼저 시도 (원격 브랜치 확인용)
    await executeGitCommand(['fetch', '--quiet']);
    
    // 푸시 시도
    const pushResult = await executeGitCommand(['push', 'origin', 'master']);
    
    if (pushResult.success) {
      console.log('GitHub으로 성공적으로 푸시되었습니다.');
      return { success: true };
    } else {
      if (pushResult.stderr.includes('Authentication failed')) {
        console.log('\nGitHub 인증 실패. 다음 방법으로 인증을 설정하세요:');
        console.log('1. Personal Access Token 생성: https://github.com/settings/tokens');
        console.log('2. 자격 증명 저장: git config credential.helper store');
      }
      return { success: false, error: pushResult.stderr };
    }
  } catch (error) {
    console.error('GitHub 연결 테스트 중 오류 발생:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 메인 테스트 실행 함수
 */
async function runTests() {
  console.log('='.repeat(80));
  console.log('GitHub 연결 테스트 시작');
  console.log('='.repeat(80));
  
  try {
    // 1. Git 초기 설정 확인
    await setupGitConfig();
    
    // 2. Git 상태 확인
    await checkGitStatus();
    
    // 3. 테스트 파일 생성 및 스테이징
    const stageResult = await createAndStageTestFile();
    
    if (stageResult.success) {
      // 4. 변경 사항 커밋
      const commitResult = await commitChanges();
      
      if (commitResult.success) {
        // 5. GitHub 연결 테스트
        await testGitHubConnection();
      }
    }
  } catch (error) {
    console.error('테스트 실행 중 오류 발생:', error.message);
  }
  
  console.log('\n='.repeat(80));
  console.log('GitHub 연결 테스트 완료');
  console.log('='.repeat(80));
  
  console.log('\n[요약] GitHub 연결 설정 방법:');
  console.log('1. GitHub 계정 및 저장소 생성: https://github.com/new');
  console.log('2. 원격 저장소 추가: git remote add origin https://github.com/your-username/axiom-extension.git');
  console.log('3. 개인 액세스 토큰(PAT) 생성: https://github.com/settings/tokens');
  console.log('4. 자격 증명 저장: git config credential.helper store');
  console.log('5. 변경사항 푸시: git push -u origin master');
  console.log('\n이후 Axiom 설정:');
  console.log('1. settings.json 파일에 GitHub 자격 증명 추가');
  console.log('2. GitClientService 클래스 사용하여 Git 명령 수행');
}

// 테스트 실행
runTests().catch(console.error);