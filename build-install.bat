@echo off
echo ===== Axiom 확장 빌드 및 설치 시작 =====

REM 현재 디렉토리 출력
echo 현재 작업 디렉토리: %cd%

REM 의존성 설치
echo 의존성 설치 중...
call npm install

REM 클린 빌드 실행
echo 클린 빌드 실행 중...
call npm run build:clean

REM 확장 디렉토리 설정 (Windows용)
set EXTENSION_DIR=%USERPROFILE%\.vscode\extensions\axiom-team.axiom-0.0.1

REM 기존 확장 제거
if exist "%EXTENSION_DIR%" (
    echo 기존 Axiom 확장 제거 중...
    rmdir /s /q "%EXTENSION_DIR%"
)

REM 확장 설치 디렉토리 생성
echo Axiom 확장 설치 디렉토리 생성 중...
mkdir "%EXTENSION_DIR%"

REM 필요한 파일 복사
echo 필요한 파일 복사 중...
xcopy /E /I /Y dist "%EXTENSION_DIR%\dist"
xcopy /E /I /Y resources "%EXTENSION_DIR%\resources"
copy /Y package.json "%EXTENSION_DIR%\"
if exist README.md copy /Y README.md "%EXTENSION_DIR%\"
if exist CHANGELOG.md copy /Y CHANGELOG.md "%EXTENSION_DIR%\"
if exist LICENSE copy /Y LICENSE "%EXTENSION_DIR%\"

REM node_modules 필요한 모듈 복사 (선택적)
echo 필요한 노드 모듈 복사 중...
mkdir "%EXTENSION_DIR%\node_modules"

echo ===== Axiom 확장 빌드 및 설치 완료 =====
echo 설치 위치: %EXTENSION_DIR%
echo VS Code를 다시 시작하여 확장을 로드하세요.