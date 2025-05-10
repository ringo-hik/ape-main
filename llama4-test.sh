#!/bin/bash

# Llama4 내부망 API 단일 테스트 스크립트
# 최소한의 테스트로 Llama4 Scout/Maverick API 연결 테스트

echo "==== Llama4 API 연결 테스트 시작 ===="

# 테스트 요청 ID 생성 (UUID 형식)
REQUEST_ID=$(cat /proc/sys/kernel/random/uuid)
echo "요청 ID (UUID): $REQUEST_ID"

# 테스트 메시지 생성
read -r -d '' TEST_MESSAGES << EOM
[
  {
    "role": "system",
    "content": "당신은 APE(Agentic Pipeline Engine)라는 VS Code 확장 프로그램의 내부 API 연결 테스트를 위한 메시지입니다."
  },
  {
    "role": "user",
    "content": "안녕하세요, 이것은 API 연결 테스트입니다. 짧게 응답해주세요."
  }
]
EOM

# 1. Llama4 Scout 테스트
echo -e "\n==== 1. Llama4 Scout 테스트 ===="
echo "엔드포인트: http://apigw-stg.samsungds.net:8000/llama4/1/llama/aiserving/llama-4/scout/v1/chat/completions"

# 요청 본문 생성
read -r -d '' SCOUT_REQUEST_BODY << EOM
{
  "model": "meta-llama/llama-4-scout-17b-16e-instruct",
  "messages": $TEST_MESSAGES,
  "temperature": 0.7,
  "max_tokens": 100,
  "stream": false,
  "system_name": "swdp",
  "user_id": "ape_ext",
  "user_type": "ape_ext"
}
EOM

echo "요청 본문:"
echo "$SCOUT_REQUEST_BODY"

# 네트워크 진단 - 호스트 연결 확인
echo -e "\n호스트 연결 확인:"
ping -c 2 apigw-stg.samsungds.net
if [ $? -eq 0 ]; then
  echo "✅ 호스트에 ping 성공"
else
  echo "❌ 호스트에 ping 불가"
fi

# 포트 연결 확인
echo -e "\n포트 연결 확인 (8000):"
timeout 5 bash -c "echo > /dev/tcp/apigw-stg.samsungds.net/8000"
if [ $? -eq 0 ]; then
  echo "✅ 포트 8000 연결 성공"
else
  echo "❌ 포트 8000 연결 실패"
fi

# API 요청 실행
echo -e "\n요청 전송 중..."
curl -v -X POST "http://apigw-stg.samsungds.net:8000/llama4/1/llama/aiserving/llama-4/scout/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Send-System-Name: swdp" \
  -H "user-id: ape_ext" \
  -H "user-type: ape_ext" \
  -H "Prompt-Msg-Id: $REQUEST_ID" \
  -H "Completion-Msg-Id: $REQUEST_ID" \
  -H "x-dep-ticket: string" \
  -d "$SCOUT_REQUEST_BODY" \
  -o llama4_scout_response.json 2>&1 | tee llama4_scout_request.log

if [ ${PIPESTATUS[0]} -eq 0 ]; then
  echo -e "\n✅ Scout 요청 성공"
  echo "응답 파일: llama4_scout_response.json"
  echo "응답 미리보기:"
  cat llama4_scout_response.json | head -n 20
else
  echo -e "\n❌ Scout 요청 실패"
  echo "자세한 내용은 llama4_scout_request.log 파일을 확인하세요."
fi

# 2. Llama4 Maverick 테스트
echo -e "\n\n==== 2. Llama4 Maverick 테스트 ===="
echo "엔드포인트: http://apigw-stg.samsungds.net:8000/llama4/1/llama/aiserving/llama-4/maverick/v1/chat/completions"

# 요청 본문 생성
read -r -d '' MAVERICK_REQUEST_BODY << EOM
{
  "model": "meta-llama/llama-4-maverick-17b-128e-instruct",
  "messages": $TEST_MESSAGES,
  "temperature": 0.7,
  "max_tokens": 100,
  "stream": false,
  "system_name": "swdp",
  "user_id": "ape_ext",
  "user_type": "ape_ext"
}
EOM

echo "요청 본문:"
echo "$MAVERICK_REQUEST_BODY"

# API 요청 실행
echo -e "\n요청 전송 중..."
curl -v -X POST "http://apigw-stg.samsungds.net:8000/llama4/1/llama/aiserving/llama-4/maverick/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Send-System-Name: swdp" \
  -H "user-id: ape_ext" \
  -H "user-type: ape_ext" \
  -H "Prompt-Msg-Id: $REQUEST_ID" \
  -H "Completion-Msg-Id: $REQUEST_ID" \
  -H "x-dep-ticket: string" \
  -d "$MAVERICK_REQUEST_BODY" \
  -o llama4_maverick_response.json 2>&1 | tee llama4_maverick_request.log

if [ ${PIPESTATUS[0]} -eq 0 ]; then
  echo -e "\n✅ Maverick 요청 성공"
  echo "응답 파일: llama4_maverick_response.json"
  echo "응답 미리보기:"
  cat llama4_maverick_response.json | head -n 20
else
  echo -e "\n❌ Maverick 요청 실패"
  echo "자세한 내용은 llama4_maverick_request.log 파일을 확인하세요."
fi

echo -e "\n==== Llama4 API 연결 테스트 완료 ===="

# 실행 권한 부여
chmod +x llama4-test.sh