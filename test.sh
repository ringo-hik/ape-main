#\!/bin/bash

# APE 확장 프로그램 테스트 스크립트
echo "APE 확장 프로그램 테스트 시작..."

# 환경 변수 확인
if [ "$APE_TEST_MODE" = "true" ]; then
    echo "테스트 모드 활성화됨"
    export LLM_TEST_MODE=mock
else
    echo "일반 모드 실행"
fi

# 테스트 디렉토리 생성
mkdir -p logs
mkdir -p test-results

# 기본 테스트 실행
echo "기본 빌드 검증 테스트 실행 중..."
npm run test:basic

# 테스트 결과 확인
if [ $? -ne 0 ]; then
    echo "기본 테스트 실패\!"
    exit 1
fi

echo "기본 테스트 성공\!"

# LLM 자체 테스트 실행
echo "LLM 자체 테스트 실행 중..."
npm run test:llm-self

# 테스트 결과 확인
if [ $? -ne 0 ]; then
    echo "LLM 자체 테스트 실패\!"
    exit 1
fi

echo "LLM 자체 테스트 성공\!"

# WebdriverIO 테스트 실행 (선택적)
if [ "$APE_TEST_WEBVIEW" = "true" ]; then
    echo "웹뷰 테스트 실행 중..."
    npm run test:webview
    
    # 테스트 결과 확인
    if [ $? -ne 0 ]; then
        echo "웹뷰 테스트 실패\!"
        exit 1
    fi
    
    echo "웹뷰 테스트 성공\!"
fi

echo "모든 테스트 성공\!"
exit 0
