/**
 * VS Code 확장 캐시 초기화 스크립트
 *
 * 이 스크립트는 VS Code 확장 개발 시 캐시 관련 문제를 해결하기 위한 유틸리티입니다.
 * Node.js 모듈 캐시를 초기화하고 VS Code 설정 캐시를 지웁니다.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const childProcess = require('child_process');

// 사용자 홈 디렉토리 기준 VS Code 캐시 경로
const vscodeCachePaths = {
  windows: [
    path.join(os.homedir(), 'AppData', 'Roaming', 'Code', 'User', 'workspaceStorage'),
    path.join(os.homedir(), 'AppData', 'Roaming', 'Code', 'Cache')
  ],
  linux: [
    path.join(os.homedir(), '.config', 'Code', 'User', 'workspaceStorage'),
    path.join(os.homedir(), '.config', 'Code', 'Cache')
  ],
  darwin: [
    path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User', 'workspaceStorage'),
    path.join(os.homedir(), 'Library', 'Caches', 'Code')
  ]
};

// 현재 OS에 맞는 경로 선택
const platform = process.platform;
const cachePaths = platform === 'win32' 
  ? vscodeCachePaths.windows 
  : platform === 'darwin' 
    ? vscodeCachePaths.darwin 
    : vscodeCachePaths.linux;

/**
 * 현재 프로젝트의 VS Code 캐시 디렉토리 찾기
 */
function findProjectCacheDir() {
  const projectName = path.basename(process.cwd());
  console.log(`프로젝트 이름: ${projectName}`);
  
  const workspaceStoragePath = cachePaths[0];
  
  if (!fs.existsSync(workspaceStoragePath)) {
    console.log(`워크스페이스 스토리지 경로를 찾을 수 없음: ${workspaceStoragePath}`);
    return null;
  }
  
  const dirs = fs.readdirSync(workspaceStoragePath);
  
  // 각 워크스페이스 폴더 검사
  for (const dir of dirs) {
    const workspaceInfoPath = path.join(workspaceStoragePath, dir, 'workspace.json');
    
    if (fs.existsSync(workspaceInfoPath)) {
      try {
        const workspaceInfo = JSON.parse(fs.readFileSync(workspaceInfoPath, 'utf8'));
        
        if (workspaceInfo.folder && workspaceInfo.folder.includes(projectName)) {
          console.log(`프로젝트 캐시 디렉토리 발견: ${dir}`);
          return path.join(workspaceStoragePath, dir);
        }
      } catch (e) {
        console.log(`워크스페이스 정보 파싱 오류: ${e.message}`);
      }
    }
  }
  
  console.log('프로젝트 관련 캐시 디렉토리를 찾을 수 없음');
  return null;
}

/**
 * 확장 캐시 초기화
 */
function clearExtensionCache() {
  // 1. 확장 개발자 캐시 디렉토리 정리
  const devCacheDir = path.join(process.cwd(), '.vscode', '.roamingState');
  if (fs.existsSync(devCacheDir)) {
    console.log(`개발자 캐시 디렉토리 초기화: ${devCacheDir}`);
    try {
      const files = fs.readdirSync(devCacheDir);
      for (const file of files) {
        if (file !== '.gitignore') { // .gitignore는 보존
          fs.rmSync(path.join(devCacheDir, file), { recursive: true, force: true });
        }
      }
      console.log('개발자 캐시 정리 완료');
    } catch (e) {
      console.error(`개발자 캐시 정리 오류: ${e.message}`);
    }
  }
  
  // 2. 프로젝트 워크스페이스 캐시 정리
  const projectCacheDir = findProjectCacheDir();
  if (projectCacheDir) {
    console.log(`프로젝트 캐시 초기화: ${projectCacheDir}`);
    
    // 중요: 전체 디렉토리를 삭제하지는 않고, 
    // 확장 관련 파일만 선택적으로 정리
    const extensionCachePath = path.join(projectCacheDir, 'ape-extension');
    
    if (fs.existsSync(extensionCachePath)) {
      try {
        fs.rmSync(extensionCachePath, { recursive: true, force: true });
        console.log('확장 프로그램 캐시 정리 완료');
      } catch (e) {
        console.error(`확장 프로그램 캐시 정리 오류: ${e.message}`);
      }
    }
  }
  
  // 3. out 디렉토리 정리 (컴파일된 파일)
  const outDir = path.join(process.cwd(), 'out');
  if (fs.existsSync(outDir)) {
    console.log(`컴파일된 파일 정리: ${outDir}`);
    try {
      fs.rmSync(outDir, { recursive: true, force: true });
      console.log('컴파일된 파일 정리 완료');
    } catch (e) {
      console.error(`컴파일된 파일 정리 오류: ${e.message}`);
    }
  }
  
  // 4. node_modules/.vscode-test 정리
  const vscodeDir = path.join(process.cwd(), 'node_modules', '.vscode-test');
  if (fs.existsSync(vscodeDir)) {
    console.log(`VS Code 캐시 정리: ${vscodeDir}`);
    try {
      fs.rmSync(vscodeDir, { recursive: true, force: true });
      console.log('VS Code 캐시 정리 완료');
    } catch (e) {
      console.error(`VS Code 캐시 정리 오류: ${e.message}`);
    }
  }
}

/**
 * VS Code 재시작 명령 실행
 */
function restartVSCode() {
  console.log('VS Code 재시작 명령 실행 시도...');
  
  // VS Code CLI가 PATH에 있다고 가정
  try {
    // 현재 열린 VS Code 창에 명령 보내기
    childProcess.execSync('code --remote-send "workbench.action.reloadWindow"');
    console.log('VS Code 재시작 명령 전송됨');
  } catch (e) {
    console.log('VS Code 재시작 명령 실패, 수동으로 VS Code를 재시작해주세요.');
  }
}

/**
 * 메인 함수
 */
function main() {
  console.log('APE 확장 프로그램 캐시 초기화 유틸리티');
  console.log('----------------------------------------');
  
  // 캐시 초기화
  clearExtensionCache();
  
  // 리빌드
  console.log('\n프로젝트 리빌드 중...');
  try {
    childProcess.execSync('npm run compile', { stdio: 'inherit' });
    console.log('프로젝트 리빌드 완료');
  } catch (e) {
    console.error('프로젝트 리빌드 실패:', e.message);
    // 빌드가 실패해도 계속 진행
  }
  
  // VS Code 재시작
  restartVSCode();
  
  console.log('\n캐시 초기화 프로세스 완료!');
  console.log('이제 VS Code에서 확장 프로그램이 새로운 설정으로 로드되어야 합니다.');
  console.log('문제가 계속되면 VS Code를 완전히 종료한 후 다시 시작해보세요.');
}

// 스크립트 실행
main();