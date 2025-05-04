# WSL에서 Axiom Extension 개발 및 Windows에서 테스트하기

WSL(Windows Subsystem for Linux)에서 Axiom Extension을 개발하고 Windows에서 테스트하는 방법에 대한 안내서입니다.

## 문제

WSL에서 Windows 명령 프롬프트를 사용해 Node.js 스크립트를 실행할 때 다음과 같은 오류가 발생할 수 있습니다:

```
'\\wsl.localhost\Ubuntu\home\username\axiom-extension'
위의 경로를 현재 디렉터리로 하여 CMD.EXE가 실행되었습니다. UNC 경로는
지원되지 않습니다. Windows 디렉터리를 기본으로 합니다.
node:internal/modules/cjs/loader:1228
  throw err;
  ^

Error: Cannot find module 'C:\Windows\esbuild.config.js'
```

## 해결 방법

다음 방법 중 하나를 선택하여 WSL 경로 문제를 해결할 수 있습니다:

### 방법 1: WSL 터미널에서 직접 빌드

WSL 터미널을 열고 다음 명령을 실행합니다:

```bash
cd /path/to/axiom-extension
./build-install.sh
```

### 방법 2: wsl-build.bat 스크립트 사용

Windows 명령 프롬프트에서 다음 명령을 실행합니다:

```cmd
wsl-build.bat
```

이 스크립트는 자동으로 WSL 경로를 감지하고 WSL 환경 내에서 빌드 스크립트를 실행합니다.

### 방법 3: WSL 디렉토리를 Windows 경로로 매핑

Windows에서 WSL 파일 시스템에 접근하는 방법:

1. 파일 탐색기에서 `\\wsl$\Ubuntu` 접근
2. 프로젝트 디렉토리로 이동
3. Windows 기반 도구에서 이 경로 사용

## WSL에서 개발하고 Windows에서 테스트하기

### 개발 흐름

1. WSL에서 소스 코드 개발:
   - VSCode의 WSL 확장으로 WSL 내에서 개발
   - 코드 변경 및 기능 개발

2. 패키지 빌드:
   - WSL 터미널에서 빌드 (권장):
     ```bash
     cd /path/to/axiom-extension
     ./build-install.sh
     ```
   - 또는 Windows에서 `wsl-build.bat` 실행

3. Windows VS Code에서 테스트:
   - 빌드된 VSIX 파일은 공유 디렉토리에 생성됨
   - Windows VS Code에서 Extension 설치:
     1. VS Code 실행
     2. Extensions 뷰 열기 (Ctrl+Shift+X)
     3. More Actions (...) 클릭 > Install from VSIX 선택
     4. WSL 경로에 있는 VSIX 파일 선택:
        ```
        \\wsl$\Ubuntu\home\username\axiom-extension\*.vsix
        ```

### 주의 사항: 경로 문제 해결

Windows PowerShell/CMD에서 WSL 경로(`\\wsl.localhost\...`)를 직접 사용해 npm 명령어를 실행하면 심볼릭 링크 처리 문제가 발생합니다:

```
npm error EISDIR: illegal operation on a directory, lstat '\\wsl.localhost\Ubuntu\home\...\node_modules\.bin\acorn'
```

이 문제를 해결하는 방법:

1. **WSL 터미널 사용 (권장)**: 
   - WSL 터미널을 열고 Linux 환경에서 직접 명령어 실행
   ```bash
   cd /home/username/axiom-extension
   npm install
   npm run build
   ```

2. **Windows 네트워크 드라이브 매핑**:
   - PowerShell에서 WSL 경로를 드라이브 문자로 매핑
   ```powershell
   New-PSDrive -Name "W" -PSProvider FileSystem -Root "\\wsl.localhost\Ubuntu\home\username\axiom-extension"
   cd W:
   npm install
   ```

3. **wsl-build.bat 사용**:
   - 제공된 배치 스크립트를 사용하여 WSL 내부에서 빌드
   ```cmd
   wsl-build.bat
   ```

4. **Windows 사본 사용**:
   - WSL 디렉토리 내용을 Windows 경로에 복사한 후 작업
   - 단, 이 방법은 동기화 문제가 발생할 수 있음

### 중요 사항

- 동일한 디렉토리를 사용하기 때문에 WSL과 Windows 간에 파일이 공유됨
- VS Code에서 확장을 테스트할 때마다 VS Code 재시작 또는 "Developer: Reload Window" 명령 실행
- Windows와 WSL 환경의 Node.js 버전 차이에 주의
- 경로 관련 코드는 Windows와 Linux 양쪽에서 모두 작동하는지 확인

## 추가 팁

- VSCode의 WSL 확장 프로그램을 사용하면 WSL 환경에서 직접 개발할 수 있습니다.
- WSL 내에서 npm 스크립트를 실행할 때는 Linux 경로 문법을 사용하세요.
- Windows에서 WSL 파일 시스템의 파일을 편집할 때는 성능 문제가 발생할 수 있으므로 VS Code의 WSL 확장을 권장합니다.
- `\\wsl$\Ubuntu\...` 경로를 통해 Windows에서 WSL 파일에 접근할 수 있습니다.