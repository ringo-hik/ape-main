# Axiom: 완벽한 개발 워크플로우 허브 (v0.0.1)

Axiom은 VS Code 내에서 개발자가 전체 DevOps 파이프라인에 접근할 수 있는 통합 확장 프로그램입니다. 개발 작업부터 배포까지 전체 워크플로우를 단일 환경에서 관리할 수 있습니다.

## 주요 기능

- **통합 채팅 인터페이스**: 다양한 AI 모델과 상호작용
- **명령어 시스템**: @ 및 / 명령어를 통한 직관적인 작업 수행
- **플러그인 아키텍처**: 외부 시스템과 쉽게 연동 가능
- **VS Code 완벽 통합**: 사이드바 및 활동 바에 통합된 인터페이스

## 핵심 모듈

Axiom은 다음과 같은 핵심 모듈로 구성되어 있습니다:

### 코어 시스템
- **AxiomCoreService**: 모든 핵심 서비스를 통합하고 관리하는 중앙 서비스
- **명령어 시스템**: @ 및 / 접두사 기반 명령어 파싱 및 실행
- **플러그인 시스템**: 내부 및 외부 플러그인을 동적으로 로드하고 관리
- **프롬프트 시스템**: 컨텍스트 기반 프롬프트 생성 및 변수 치환

### 내부 플러그인
- **Git 플러그인**: 형상 관리 및 PR 생성 지원
- **JIRA 플러그인**: 이슈 관리 및 프로젝트 추적
- **SWDP 플러그인**: 빌드, 테스트, 배포 파이프라인 통합

### DevOps 워크플로우 지원
- 코드 개발부터 배포까지 완전한 워크플로우 지원
- 로컬 빌드 수행 및 오류 해결 지원
- 테스트 파이프라인 통합 및 품질 관리
- PR 생성, 검토, 병합 프로세스 최적화

## 설치 방법

### 개발 환경 설정

1. 저장소 클론:
```bash
git clone https://github.com/your-repo/axiom-extension.git
cd axiom-extension
```

2. 의존성 설치 및 빌드:

#### Windows에서 WSL을 사용하는 경우:

```bash
# WSL 터미널에서 직접 실행
./build-install.sh
```

또는 Windows 명령 프롬프트에서:

```cmd
# WSL 경로 문제를 해결하는 특수 스크립트 사용
wsl-build.bat
```

#### Windows에서 직접 실행 (WSL 없이):

```cmd
build-install.bat
```

#### Linux에서 실행:

```bash
./build-install.sh
```

### Windows-WSL 개발 환경에서의 주의사항

Windows PowerShell/CMD에서 WSL 경로(`\\wsl.localhost\...`)를 직접 사용해 npm 명령어를 실행하면 심볼릭 링크 처리 문제가 발생할 수 있습니다:

```
npm error EISDIR: illegal operation on a directory, lstat '\\wsl.localhost\Ubuntu\home\...\node_modules\.bin\acorn'
```

이 문제를 해결하는 방법:

1. **WSL 터미널 사용 (권장)**: WSL 터미널을 열고 Linux 환경에서 직접 명령어 실행
2. **Windows 네트워크 드라이브 매핑**: PowerShell에서 WSL 경로를 드라이브 문자로 매핑
3. **빌드 스크립트 사용**: 제공된 `wsl-build.bat` 또는 `windows-build.bat` 스크립트 사용

### 디버깅 및 테스트

VS Code에서 F5 키를 눌러 확장 프로그램을 디버그 모드로 실행할 수 있습니다. 
또는 다음 명령어로 지속적인 개발 환경을 설정할 수 있습니다:

```bash
npm run watch
```

## 구성 및 설정

확장 프로그램의 설정은 VS Code의 설정 메뉴에서 "Axiom"을 검색하여 구성할 수 있습니다:

- **SSL 우회**: 온프레미스 환경을 위한 SSL 인증서 검증 우회 설정
- **로그 레벨**: 로깅 상세 수준 설정 (debug, info, warn, error)
- **기본 LLM 모델**: 기본으로 사용할 AI 모델 설정
- **API 키**: 다양한 AI 서비스 제공업체의 API 키 설정

## 주요 명령어

Axiom은 두 가지 유형의 명령어 체계를 제공합니다:

### @ 명령어 (외부 시스템 상호작용)

- `@jira:issue`: JIRA 이슈 생성 및 관리
- `@git:commit`: Git 커밋 생성
- `@swdp:build`: SWDP 플랫폼에서 빌드 실행

### / 명령어 (내부 기능)

- `/help`: 도움말 정보 표시
- `/settings`: 설정 메뉴 열기
- `/clear`: 채팅 내역 지우기

## 아키텍처

Axiom은 플러그인 기반 아키텍처를 채택하고 있습니다:

- **코어 서비스**: 기본 기능 및 내부 로직 제공
- **명령어 시스템**: 사용자 입력 파싱 및 처리
- **플러그인 시스템**: 외부 서비스와의 연동
- **UI 컴포넌트**: 사용자 인터페이스 및 상호작용

## 개발자 정보

### 디렉토리 구조

```
axiom-extension/
├── src/                   # 소스 코드
│   ├── core/              # 코어 서비스
│   ├── plugins/           # 플러그인 시스템
│   ├── types/             # 타입 정의
│   └── extension.ts       # 확장 진입점
├── resources/             # 웹뷰 리소스
│   ├── css/               # 스타일 시트
│   ├── html/              # HTML 템플릿
│   └── js/                # 클라이언트 스크립트
├── dist/                  # 빌드 출력 (자동 생성)
├── .vscode/               # VS Code 설정
└── package.json           # 프로젝트 메타데이터
```

### 빌드 스크립트

- `npm run compile`: 소스 코드 컴파일
- `npm run watch`: 파일 변경 감지 및 자동 빌드
- `npm run package`: 배포용 패키지 생성
- `npm run build:clean`: 모든 캐시 지우고 새로 빌드

## 라이선스

이 프로젝트는 [라이선스 정보를 추가하세요] 라이선스 하에 배포됩니다.

## 기여 방법

이슈 등록 및 풀 리퀘스트를 통해 기여할 수 있습니다. 모든 기여는 환영합니다!

## 연락처

문의사항이 있으시면 [연락처 정보를 추가하세요]로 연락 주세요.