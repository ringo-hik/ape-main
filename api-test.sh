#!/bin/bash

# APE 내부망 API 테스트 스크립트
# 이 스크립트는 APE 확장 프로그램에서 사용하는 내부망 API 연결을 테스트합니다.

echo "==== APE 내부망 API 테스트 시작 ===="

# 테스트 요청 ID 생성
REQUEST_ID="req_$(date +%s)"
echo "요청 ID: $REQUEST_ID"

# 테스트 메시지 설정
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

# 1. Narrans 모델 테스트
echo -e "\n\n==== 1. Narrans 모델 테스트 ===="
echo "엔드포인트: https://api-se-dev.narrans.samsungds.net/v1/chat/completions"

read -r -d '' NARRANS_REQUEST_BODY << EOM
{
  "model": "narrans",
  "messages": $TEST_MESSAGES,
  "temperature": 0.7,
  "max_tokens": 100,
  "stream": false
}
EOM

echo "요청 본문:"
echo "$NARRANS_REQUEST_BODY"

echo -e "\n요청 전송 중..."
curl -k -X POST "https://api-se-dev.narrans.samsungds.net/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Send-System-Name: swdp" \
  -H "user-id: ape_ext" \
  -H "user-type: ape_ext" \
  -H "Prompt-Msg-Id: $REQUEST_ID" \
  -H "Completion-msg-Id: $REQUEST_ID" \
  -H "Authorization: Bearer dummy_key" \
  -d "$NARRANS_REQUEST_BODY" \
  -o narrans_response.json

if [ $? -eq 0 ]; then
  echo -e "\nNarrans 응답 파일 저장됨: narrans_response.json"
  echo "응답 미리보기:"
  cat narrans_response.json | head -n 20
else
  echo -e "\n[오류] Narrans API 요청 실패"
fi

# 2. Llama-4 Scout 모델 테스트
echo -e "\n\n==== 2. Llama-4 Scout 모델 테스트 ===="
echo "엔드포인트: http://apigw-stg.samsungds.net:8000/llama4/1/llama/aiserving/llama-4/scout/v1/chat/completions"

read -r -d '' LLAMA4_SCOUT_REQUEST_BODY << EOM
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
echo "$LLAMA4_SCOUT_REQUEST_BODY"

echo -e "\n요청 전송 중..."
curl -X POST "http://apigw-stg.samsungds.net:8000/llama4/1/llama/aiserving/llama-4/scout/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Send-System-Name: swdp" \
  -H "user-id: ape_ext" \
  -H "user-type: ape_ext" \
  -H "Prompt-Msg-Id: $REQUEST_ID" \
  -H "Completion-msg-Id: $REQUEST_ID" \
  -H "x-dep-ticket: test_ticket" \
  -d "$LLAMA4_SCOUT_REQUEST_BODY" \
  -o llama4_scout_response.json

if [ $? -eq 0 ]; then
  echo -e "\nLlama-4 Scout 응답 파일 저장됨: llama4_scout_response.json"
  echo "응답 미리보기:"
  cat llama4_scout_response.json | head -n 20
else
  echo -e "\n[오류] Llama-4 Scout API 요청 실패"
fi

# 3. Llama-4 Maverick 모델 테스트
echo -e "\n\n==== 3. Llama-4 Maverick 모델 테스트 ===="
echo "엔드포인트: http://apigw-stg.samsungds.net:8000/llama4/1/llama/aiserving/llama-4/maverick/v1/chat/completions"

read -r -d '' LLAMA4_MAVERICK_REQUEST_BODY << EOM
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
echo "$LLAMA4_MAVERICK_REQUEST_BODY"

echo -e "\n요청 전송 중..."
curl -X POST "http://apigw-stg.samsungds.net:8000/llama4/1/llama/aiserving/llama-4/maverick/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Send-System-Name: swdp" \
  -H "user-id: ape_ext" \
  -H "user-type: ape_ext" \
  -H "Prompt-Msg-Id: $REQUEST_ID" \
  -H "Completion-msg-Id: $REQUEST_ID" \
  -H "x-dep-ticket: test_ticket" \
  -d "$LLAMA4_MAVERICK_REQUEST_BODY" \
  -o llama4_maverick_response.json

if [ $? -eq 0 ]; then
  echo -e "\nLlama-4 Maverick 응답 파일 저장됨: llama4_maverick_response.json"
  echo "응답 미리보기:"
  cat llama4_maverick_response.json | head -n 20
else
  echo -e "\n[오류] Llama-4 Maverick API 요청 실패"
fi

# 4. 스트리밍 테스트: Narrans 모델 (스트리밍 모드)
echo -e "\n\n==== 4. Narrans 스트리밍 모드 테스트 ===="
echo "엔드포인트: https://api-se-dev.narrans.samsungds.net/v1/chat/completions"

read -r -d '' NARRANS_STREAM_REQUEST_BODY << EOM
{
  "model": "narrans",
  "messages": $TEST_MESSAGES,
  "temperature": 0.7,
  "max_tokens": 100,
  "stream": true
}
EOM

echo "요청 본문:"
echo "$NARRANS_STREAM_REQUEST_BODY"

echo -e "\n요청 전송 중..."
curl -k -X POST "https://api-se-dev.narrans.samsungds.net/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -H "Send-System-Name: swdp" \
  -H "user-id: ape_ext" \
  -H "user-type: ape_ext" \
  -H "Prompt-Msg-Id: $REQUEST_ID" \
  -H "Completion-msg-Id: $REQUEST_ID" \
  -H "Authorization: Bearer dummy_key" \
  -d "$NARRANS_STREAM_REQUEST_BODY" \
  -o narrans_stream_response.txt

if [ $? -eq 0 ]; then
  echo -e "\nNarrans 스트리밍 응답 파일 저장됨: narrans_stream_response.txt"
  echo "응답 미리보기:"
  cat narrans_stream_response.txt | head -n 20
else
  echo -e "\n[오류] Narrans 스트리밍 API 요청 실패"
fi

echo -e "\n\n==== 모든 API 테스트 완료 ===="
echo "결과 파일:"
echo "- narrans_response.json: Narrans 모델 응답"
echo "- llama4_scout_response.json: Llama-4 Scout 모델 응답"
echo "- llama4_maverick_response.json: Llama-4 Maverick 모델 응답"
echo "- narrans_stream_response.txt: Narrans 모델 스트리밍 응답"

# 실행 권한 부여
chmod +x api-test.sh