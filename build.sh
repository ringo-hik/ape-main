#!/bin/bash

# APE Extension 빌드 및 실행 스크립트
# 이 스크립트는 VSCode Extension을 빌드하고 실행하는 데 도움을 줍니다.

set -e  # 오류 발생 시 스크립트 중단

# 색상 코드
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}===== APE Extension 빌드 스크립트 =====${NC}"

# 필요한 도구 확인
command -v node >/dev/null 2>&1 || { echo -e "${RED}Node.js가 설치되어 있지 않습니다. 먼저 설치해주세요.${NC}" >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo -e "${RED}npm이 설치되어 있지 않습니다. 먼저 설치해주세요.${NC}" >&2; exit 1; }

# 현재 Node.js 버전 확인
NODE_VERSION=$(node -v)
echo -e "${YELLOW}Node.js 버전: ${NODE_VERSION}${NC}"

# 현재 디렉토리 확인
CURRENT_DIR=$(pwd)
DIR_NAME=$(basename "$CURRENT_DIR")
if [ "$DIR_NAME" != "extension" ]; then
  echo -e "${YELLOW}경고: 현재 디렉토리가 'extension'이 아닙니다. 현재 경로: ${CURRENT_DIR}${NC}"
fi

# 필요한 의존성 설치
echo -e "${GREEN}의존성 패키지 설치 중...${NC}"
npm install

# 린트 검사 실행
echo -e "${GREEN}린트 검사 실행 중...${NC}"
npm run compile || { 
  echo -e "${YELLOW}컴파일 오류가 있습니다. 코드를 수정한 후 다시 시도하세요.${NC}"
  read -p "계속 진행하시겠습니까? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
}

# 빌드 실행
echo -e "${GREEN}TypeScript 컴파일 중...${NC}"
npm run compile || { 
  echo -e "${RED}컴파일 실패! 오류를 수정한 후 다시 시도하세요.${NC}" >&2
  exit 1
}

# 단위 테스트 (선택 사항)
read -p "단위 테스트를 실행하시겠습니까? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${GREEN}단위 테스트 실행 중...${NC}"
  npm run test:unit || echo -e "${YELLOW}일부 테스트가 실패했습니다.${NC}"
fi

# 통합 테스트 (선택 사항)
read -p "통합 테스트를 실행하시겠습니까? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${GREEN}통합 테스트 실행 중...${NC}"
  npm run test:integration || echo -e "${YELLOW}일부 테스트가 실패했습니다.${NC}"
fi

# VSIX 패키지 빌드 (선택 사항)
read -p "VSIX 패키지를 빌드하시겠습니까? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${GREEN}VSIX 패키지 빌드 중...${NC}"
  npm run package || { 
    echo -e "${RED}패키지 빌드 실패!${NC}" >&2
    exit 1
  }
  echo -e "${GREEN}패키지가 성공적으로 빌드되었습니다.${NC}"
fi

echo -e "${GREEN}빌드 완료!${NC}"
echo -e "${YELLOW}VSCode에서 익스텐션을 실행하려면:${NC}"
echo -e "  1. VSCode에서 F5를 눌러 디버그 모드로 실행하거나"
echo -e "  2. VSCode 명령 팔레트(F1)에서 'Developer: Reload Window'를 실행하세요."
echo -e "  3. 또는 다음 명령어로 VSIX 파일을 설치할 수 있습니다:"
echo -e "     code --install-extension ape-extension-*.vsix"

# 개발 모드로 실행 (선택 사항)
read -p "개발 모드로 실행하시겠습니까? (VS Code가 이미 실행 중이어야 합니다) (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${GREEN}개발 모드로 실행 중...${NC}"
  echo -e "${YELLOW}개발 모드에서는 코드 변경 시 자동으로 다시 컴파일됩니다.${NC}"
  npm run watch
  # 개발 모드에서는 명령어가 백그라운드로 실행되므로 스크립트가 여기서 계속됩니다.
fi

echo -e "${GREEN}완료!${NC}"
echo -e "${YELLOW}문제가 발생하면 로그를 확인하세요: 'F1 > Developer: Show Running Extensions'${NC}"

exit 0