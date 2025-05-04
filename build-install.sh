#!/bin/bash

# Axiom 확장 빌드 및 설치 스크립트

set -e  # 오류 발생 시 스크립트 종료

echo "===== Axiom 확장 빌드 및 설치 시작 ====="

# 작업 디렉토리 출력
echo "현재 작업 디렉토리: $(pwd)"

# Node.js 버전 확인
echo "Node.js 버전: $(node -v)"
echo "NPM 버전: $(npm -v)"

# 의존성 설치
echo "의존성 설치 중..."
npm install

# 클린 빌드 실행
echo "클린 빌드 실행 중..."
npm run build:clean

# 확장 디렉토리 설정
EXTENSION_DIR="$HOME/.vscode-server/extensions/axiom-team.axiom-0.0.1"

# 기존 확장 제거
if [ -d "$EXTENSION_DIR" ]; then
    echo "기존 Axiom 확장 제거 중..."
    rm -rf "$EXTENSION_DIR"
fi

# 확장 설치 디렉토리 생성
echo "Axiom 확장 설치 디렉토리 생성 중..."
mkdir -p "$EXTENSION_DIR"

# 필요한 파일 복사
echo "필요한 파일 복사 중..."
cp -r dist "$EXTENSION_DIR/"
cp -r resources "$EXTENSION_DIR/"
cp package.json "$EXTENSION_DIR/"
cp README.md "$EXTENSION_DIR/" 2>/dev/null || echo "README.md가 없습니다."
cp CHANGELOG.md "$EXTENSION_DIR/" 2>/dev/null || echo "CHANGELOG.md가 없습니다."
cp LICENSE "$EXTENSION_DIR/" 2>/dev/null || echo "LICENSE가 없습니다."

# node_modules 필요한 모듈 복사 (선택적)
echo "필요한 노드 모듈 복사 중..."
mkdir -p "$EXTENSION_DIR/node_modules"
# 필요한 모듈만 복사 (예: vscode-jsonrpc, vscode-languageclient 등)

echo "===== Axiom 확장 빌드 및 설치 완료 ====="
echo "설치 위치: $EXTENSION_DIR"
echo "VS Code를 다시 시작하여 확장을 로드하세요."

# VS Code 다시 시작 (선택적)
if [ "$1" = "--start" ]; then
  echo "VS Code 다시 시작..."
  # VS Code 프로세스 종료 시도
  pkill -f "code" || true
  # 잠시 대기
  sleep 2
  # VS Code 다시 시작 (백그라운드에서)
  code . &
  
  # 로그 확인을 위한 대기
  sleep 10
  
  # 최신 로그 찾기 및 표시
  echo "=== 최신 Axiom 로그 찾기... ==="
  LATEST_LOG=$(find ~/.vscode-server/data/logs -path "*/2025*" -name "*output_logging*" -type d -mmin -20 | xargs -I {} find {} -name "*Axiom.log" 2>/dev/null | sort -r | head -1)
  
  if [ -n "$LATEST_LOG" ]; then
    echo "=== 최신 로그 파일: $LATEST_LOG ==="
    cat "$LATEST_LOG"
  else
    echo "최신 Axiom 로그 파일을 찾을 수 없습니다."
    echo "=== 디버그 출력: 최근 exthost 디렉토리 ==="
    find ~/.vscode-server/data/logs -path "*/2025*" -type d -mmin -20 | grep exthost | sort -r | head -5
  fi
fi