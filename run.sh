#!/bin/bash

# APE Extension 직접 실행 스크립트
# 이 스크립트는 TypeScript를 컴파일하고 F5 없이 코드를 직접 실행합니다.

set -e  # 오류 발생 시 스크립트 중단

# 색상 코드
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}===== APE Extension 빌드 및 실행 스크립트 =====${NC}"

# 1. 의존성 패키지 설치
echo -e "${GREEN}의존성 패키지 설치 중...${NC}"
npm install

# 2. TypeScript 컴파일
echo -e "${GREEN}TypeScript 컴파일 중...${NC}"
npm run compile

# 3. 성공 메시지 출력
echo -e "${GREEN}빌드 완료!${NC}"
echo -e "${YELLOW}VS Code에서 F5를 눌러 익스텐션을 디버그 모드로 실행할 수 있습니다.${NC}"

exit 0