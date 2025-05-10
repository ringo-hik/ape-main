#!/bin/bash

# Narrans 내부망 API 단일 테스트 스크립트
# 최소한의 테스트로 Narrans API 연결 테스트

echo "==== Narrans API 연결 테스트 시작 ===="
echo "엔드포인트: https://api-se-dev.narrans.samsungds.net/v1/chat/completions"

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

# 요청 본문 생성
read -r -d '' REQUEST_BODY << EOM
{
  "model": "narrans",
  "messages": $TEST_MESSAGES,
  "temperature": 0.7,
  "max_tokens": 100,
  "stream": false
}
EOM

echo "요청 본문:"
echo "$REQUEST_BODY"

# 네트워크 진단 - 호스트 연결 확인
echo -e "\n호스트 연결 확인:"
ping -c 2 api-se-dev.narrans.samsungds.net
if [ $? -eq 0 ]; then
  echo "✅ 호스트에 ping 성공"
else
  echo "❌ 호스트에 ping 불가"
fi

# 현재 프록시 설정 출력
echo -e "\n현재 프록시 설정:"
echo "http_proxy = $http_proxy"
echo "https_proxy = $https_proxy"
echo "no_proxy = $no_proxy"

# API 요청 실행
echo -e "\n요청 전송 중..."
curl -kv -X POST "https://api-se-dev.narrans.samsungds.net/v1/chat/completions" \
  --noproxy '*' \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Send-System-Name: swdp" \
  -H "user-id: ape_ext" \
  -H "user-type: ape_ext" \
  -H "Prompt-Msg-Id: $REQUEST_ID" \
  -H "Completion-Msg-Id: $REQUEST_ID" \
  -H "Authorization: Bearer string" \
  -d "$REQUEST_BODY" \
  -o narrans_response.json 2>&1 | tee narrans_request.log

if [ ${PIPESTATUS[0]} -eq 0 ]; then
  echo -e "\n✅ 요청 성공"
  echo "응답 파일: narrans_response.json"
  echo "응답 미리보기:"
  cat narrans_response.json | head -n 20
else
  echo -e "\n❌ 요청 실패"
  echo "자세한 내용은 narrans_request.log 파일을 확인하세요."
fi

echo -e "\n==== Narrans API 연결 테스트 완료 ===="

# 실행 권한 부여
chmod +x narrans-test.sh