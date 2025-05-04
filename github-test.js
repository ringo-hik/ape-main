/**
 * GitHub 연결 테스트 스크립트
 * 
 * 이 스크립트는 Axiom의 Git 플러그인을 사용하여 GitHub과 직접 연결하는 방법을 시연합니다.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 설정 파일 경로
const settingsPath = path.join(__dirname, 'settings.json');

// 기본 설정 객체
const defaultSettings = {
  "axiom": {
    "core": {
      "logLevel": "debug"
    },
    "internalPlugins": {
      "git": {
        "enabled": true,
        "credentials": {
          "username": "your-github-username",
          "token": "your-github-token" // 개인 액세스 토큰 (PAT)
        },
        "remotes": {
          "github": "https://github.com/your-username/axiom-extension.git"
        }
      }
    }
  }
};

/**
 * GitHub 연결 테스트 실행
 */
async function runGitHubTest() {
  console.log('='.repeat(80));
  console.log('GitHub 연결 테스트 시작');
  console.log('='.repeat(80));
  
  // 1. Git 구성 확인
  checkGitConfiguration();
  
  // 2. 설정 파일 생성
  createSettingsFile();
  
  // 3. Git 작업 테스트
  await testGitOperations();
  
  console.log('\n='.repeat(80));
  console.log('테스트 완료');
  console.log('='.repeat(80));
}

/**
 * Git 구성 확인
 */
function checkGitConfiguration() {
  console.log('\n[1] Git 구성 확인');
  console.log('-'.repeat(50));
  
  try {
    // Git 사용자 정보 확인
    const userEmail = execSync('git config user.email').toString().trim();
    const userName = execSync('git config user.name').toString().trim();
    
    console.log(`Git 사용자: ${userName} <${userEmail}>`);
    
    // Git 원격 저장소 확인
    const remotes = execSync('git remote -v').toString().trim();
    
    if (remotes) {
      console.log('원격 저장소:');
      console.log(remotes);
    } else {
      console.log('원격 저장소가 설정되지 않았습니다.');
      
      // 사용자에게 안내
      console.log('\n원격 저장소를 추가하려면:');
      console.log('git remote add origin https://github.com/your-username/axiom-extension.git');
    }
    
    // Git 상태 확인
    const status = execSync('git status').toString().trim();
    console.log('\nGit 상태:');
    console.log(status.split('\n').slice(0, 3).join('\n'));
    console.log('...');
  } catch (error) {
    console.error('Git 구성 확인 중 오류 발생:', error.message);
  }
}

/**
 * 설정 파일 생성
 */
function createSettingsFile() {
  console.log('\n[2] 설정 파일 생성');
  console.log('-'.repeat(50));
  
  try {
    // 기존 설정 파일이 있으면 백업
    if (fs.existsSync(settingsPath)) {
      const backupPath = `${settingsPath}.backup.${Date.now()}`;
      fs.copyFileSync(settingsPath, backupPath);
      console.log(`기존 설정 파일 백업: ${backupPath}`);
    }
    
    // 설정 파일 저장
    fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2));
    console.log(`설정 파일 생성됨: ${settingsPath}`);
    console.log('\n설정 내용:');
    console.log(JSON.stringify(defaultSettings, null, 2));
    
    console.log('\n중요: GitHub 토큰과 사용자 이름을 설정 파일에 직접 업데이트해야 합니다.');
    console.log('settings.json 파일을 열고 "your-github-username"과 "your-github-token"을 실제 값으로 변경하세요.');
  } catch (error) {
    console.error('설정 파일 생성 중 오류 발생:', error.message);
  }
}

/**
 * Git 작업 테스트
 */
async function testGitOperations() {
  console.log('\n[3] Git 작업 테스트');
  console.log('-'.repeat(50));
  
  // Git 작업 테스트
  const gitOperations = [
    {
      name: 'Git 상태 확인',
      command: 'git status',
      requiresAuth: false
    },
    {
      name: 'Git 로그 확인',
      command: 'git log --oneline -n 5',
      requiresAuth: false
    },
    {
      name: '원격 저장소 확인',
      command: 'git remote -v',
      requiresAuth: false
    }
  ];
  
  // 각 Git 작업 실행
  for (const op of gitOperations) {
    console.log(`\n실행: ${op.name}`);
    try {
      const result = execSync(op.command).toString().trim();
      console.log('결과:');
      console.log(result);
    } catch (error) {
      console.error(`오류: ${error.message}`);
    }
  }
  
  console.log('\nGitHub 연결을 위한 추가 단계:');
  console.log('1. GitHub 개인 액세스 토큰(PAT) 생성: https://github.com/settings/tokens');
  console.log('2. 설정 파일(settings.json)에 토큰과 사용자 이름 입력');
  console.log('3. 원격 저장소 설정: git remote add origin https://github.com/your-username/axiom-extension.git');
  console.log('4. 필요한 경우 .gitignore 파일 업데이트');
  
  console.log('\n원격 저장소 작업 예시 (GitHub 토큰 설정 후):');
  console.log('git pull origin master');
  console.log('git push -u origin master');
}

// 테스트 실행
runGitHubTest().catch(console.error);