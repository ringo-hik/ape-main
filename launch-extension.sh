#!/bin/bash

# APE Extension 빌드 및 VS Code로 실행
echo "APE Extension 빌드 및 VS Code로 시작"

# 의존성 설치
echo "의존성 패키지 설치 중..."
npm install

# 컴파일
echo "TypeScript 컴파일 중..."
npm run compile

# VS Code로 익스텐션 디렉토리 열기
echo "VS Code로 익스텐션 디렉토리 열기..."
code .

echo "완료! VS Code에서 F5를 눌러 익스텐션을 실행하세요."