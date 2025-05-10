# APE Extension VSIX 패키지 생성 및 설치 가이드

이 문서는 APE Extension의 VSIX 패키지를 생성하고 설치하는 방법을 설명합니다.

## VSIX 패키지 생성하기

VSIX(Visual Studio Extension) 패키지는 VS Code 확장을 배포하고 설치하기 위한 표준 형식입니다. APE Extension의 VSIX 파일을 생성하려면 다음 단계를 따르세요:

### 1. 필수 조건

- Node.js 및 npm이 설치되어 있어야 합니다.
- 프로젝트 의존성이 설치되어 있어야 합니다.

```bash
# 의존성 설치
npm install
```

### 2. VSIX 패키지 빌드

프로젝트에는 VSIX 패키지를 생성하는 명령이 이미 포함되어 있습니다:

```bash
# 프로덕션 빌드 생성
npm run webpack:prod

# VSIX 패키지 생성
npm run package
```

또는 한 번에 실행하려면:

```bash
npm run vscode:prepublish && npm run package
```

이 명령은 현재 프로젝트 디렉토리에 `ape-extension-0.9.22.vsix` 파일을 생성합니다(버전 번호는 package.json의 버전에 따라 달라질 수 있습니다).

## VSIX 패키지 설치하기

생성된 VSIX 패키지를 설치하는 데는 여러 방법이 있습니다:

### 방법 1: VS Code UI 사용

1. VS Code를 실행합니다.
2. 활동 바에서 확장 아이콘을 클릭하거나 `Ctrl+Shift+X`(macOS에서는 `Cmd+Shift+X`)를 누릅니다.
3. 확장 뷰의 오른쪽 상단에 있는 점 세 개(...)를 클릭합니다.
4. 드롭다운 메뉴에서 "VSIX에서 설치..."를 선택합니다.
5. 파일 선택 대화 상자에서 생성된 `ape-extension-0.9.22.vsix` 파일을 찾아 선택합니다.
6. VS Code를 다시 시작하라는 메시지가 표시되면 "다시 시작"을 클릭합니다.

### 방법 2: 명령줄 사용

VS Code CLI를 사용하여 VSIX 패키지를 설치할 수도 있습니다:

```bash
code --install-extension ape-extension-0.9.22.vsix
```

이 명령은 VS Code가 환경 변수 PATH에 추가되어 있을 때 작동합니다.

### 방법 3: 확장 관리자 사용 (관리자 권한이 있는 경우)

여러 사용자 또는 시스템 전체에 확장을 설치하려면:

```bash
# Windows (관리자 권한 필요)
code --install-extension ape-extension-0.9.22.vsix --force

# Linux/macOS (sudo 권한 필요)
sudo code --install-extension ape-extension-0.9.22.vsix
```

## 설치 확인

설치가 완료되면 다음과 같이 확인할 수 있습니다:

1. VS Code를 재시작합니다.
2. 확장 탭(`Ctrl+Shift+X` 또는 `Cmd+Shift+X`)을 열고 "APE"를 검색합니다.
3. 설치된 확장 목록에 "APE: Agentic Pipeline Extension"이 표시되어야 합니다.
4. 활동 바에서 APE 아이콘이 보여야 합니다.

## 문제 해결

설치 중 문제가 발생한 경우:

1. VS Code가 최신 버전인지 확인하세요.
2. 기존에 설치된 APE 확장이 있다면 먼저 제거하세요.
3. VS Code를 관리자 권한으로 실행한 후 설치를 시도하세요.
4. VS Code 개발자 도구(도움말 > 개발자 도구 토글)에서 콘솔 로그를 확인하세요.

## 확장 제거

확장을 제거하려면:

1. 확장 탭(`Ctrl+Shift+X` 또는 `Cmd+Shift+X`)을 엽니다.
2. "APE: Agentic Pipeline Extension"을 찾습니다.
3. 확장 항목에서 "제거" 버튼을 클릭합니다.
4. VS Code를 다시 시작합니다.

또는 명령줄에서:

```bash
code --uninstall-extension ape-team.ape-extension
```