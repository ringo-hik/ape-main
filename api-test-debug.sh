#!/bin/bash

# APE 내부망 API 디버깅 테스트 스크립트
# 더 자세한 로깅과 네트워크 진단을 포함한 향상된 테스트

echo "============================================================="
echo "==== APE 내부망 API 연결 디버깅 테스트 시작 ================="
echo "============================================================="
echo "실행 시간: $(date)"
echo

# 테스트 요청 ID 생성 (UUID 형식)
REQUEST_ID=$(cat /proc/sys/kernel/random/uuid)
echo "요청 ID (UUID): $REQUEST_ID"

# 결과 저장 디렉토리 생성
RESULTS_DIR="api_test_results_$(date +%Y%m%d_%H%M%S)"
mkdir -p $RESULTS_DIR
echo "테스트 결과는 ${RESULTS_DIR} 디렉토리에 저장됩니다."
echo

# 네트워크 진단 수행
echo "==== 네트워크 진단 ====="
echo "내부망 엔드포인트 연결 확인 중..."

# 연결 테스트 함수
test_connection() {
    local endpoint=$1
    local protocol=$(echo $endpoint | cut -d':' -f1)
    local host=$(echo $endpoint | cut -d'/' -f3 | cut -d':' -f1)
    local port=$(echo $endpoint | cut -d':' -f3 | cut -d'/' -f1)
    
    # 포트가 없으면 기본값 설정
    if [ -z "$port" ]; then
        if [ "$protocol" = "https" ]; then
            port=443
        else
            port=80
        fi
    fi
    
    echo "호스트 $host에 대해 ping 테스트:"
    ping -c 3 $host > "${RESULTS_DIR}/ping_${host}.log" 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ ping 성공: $host"
    else
        echo "❌ ping 실패: $host"
    fi
    
    echo "포트 $port에 대한 연결 테스트:"
    timeout 5 bash -c "echo > /dev/tcp/$host/$port" > "${RESULTS_DIR}/port_${host}_${port}.log" 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ 포트 $port 연결 성공"
    else
        echo "❌ 포트 $port 연결 실패"
    fi
    
    # 경로 검증 (traceroute)
    echo "네트워크 경로 진단:"
    traceroute -m 15 $host > "${RESULTS_DIR}/traceroute_${host}.log" 2>&1
    echo "traceroute 완료, 결과는 ${RESULTS_DIR}/traceroute_${host}.log에 저장됨"
    echo
}

# 내부망 엔드포인트 연결 테스트
echo "1. Narrans API 연결 테스트"
test_connection "https://api-se-dev.narrans.samsungds.net"

echo "2. Llama4 Scout API 연결 테스트"
test_connection "http://apigw-stg.samsungds.net:8000"

echo "3. Llama4 Maverick API 연결 테스트"
test_connection "http://apigw-stg.samsungds.net:8000"

# DNS 조회 정보
echo "==== DNS 확인 ====="
echo "내부망 호스트 DNS 조회:"
echo "api-se-dev.narrans.samsungds.net:" > "${RESULTS_DIR}/dns_lookup.log"
nslookup api-se-dev.narrans.samsungds.net >> "${RESULTS_DIR}/dns_lookup.log" 2>&1
echo "apigw-stg.samsungds.net:" >> "${RESULTS_DIR}/dns_lookup.log"
nslookup apigw-stg.samsungds.net >> "${RESULTS_DIR}/dns_lookup.log" 2>&1
echo "DNS 조회 결과는 ${RESULTS_DIR}/dns_lookup.log에 저장됨"
echo

# 시스템 프록시 설정 확인
echo "==== 프록시 설정 확인 ====="
echo "환경 변수 확인:"
echo "http_proxy: $http_proxy" | tee "${RESULTS_DIR}/proxy_settings.log"
echo "https_proxy: $https_proxy" | tee -a "${RESULTS_DIR}/proxy_settings.log"
echo "no_proxy: $no_proxy" | tee -a "${RESULTS_DIR}/proxy_settings.log"
echo

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

# API 테스트 함수 정의
run_api_test() {
    local name=$1
    local endpoint=$2
    local request_body=$3
    local output_file=$4
    local auth_header=$5
    local stream_mode=$6
    local use_proxy=${7:-true}
    local skip_ssl_verify=${8:-false}
    
    echo -e "\n\n==== ${name} 테스트 시작 ===="
    echo "엔드포인트: ${endpoint}"
    
    echo "요청 본문:" | tee "${RESULTS_DIR}/${output_file}.log"
    echo "$request_body" | tee -a "${RESULTS_DIR}/${output_file}.log"
    
    # 커맨드 구성
    local curl_cmd="curl -v"
    
    # SSL 검증 비활성화 옵션
    if [ "$skip_ssl_verify" = "true" ]; then
        curl_cmd="${curl_cmd} -k"
    fi
    
    # 프록시 비활성화 옵션
    if [ "$use_proxy" = "false" ]; then
        curl_cmd="${curl_cmd} --noproxy '*'"
    fi
    
    # 스트리밍 모드
    local accept_header="application/json"
    if [ "$stream_mode" = "true" ]; then
        accept_header="text/event-stream"
    fi
    
    echo -e "\n요청 전송 중... (자세한 로그는 ${RESULTS_DIR}/${output_file}.log 참조)"
    
    # 실제 요청 실행
    ${curl_cmd} -X POST "${endpoint}" \
        -H "Content-Type: application/json" \
        -H "Accept: ${accept_header}" \
        -H "Send-System-Name: swdp" \
        -H "user-id: ape_ext" \
        -H "user-type: ape_ext" \
        -H "Prompt-Msg-Id: ${REQUEST_ID}" \
        -H "Completion-Msg-Id: ${REQUEST_ID}" \
        -H "${auth_header}" \
        -d "${request_body}" \
        -o "${RESULTS_DIR}/${output_file}.json" \
        >> "${RESULTS_DIR}/${output_file}.log" 2>&1
    
    local result=$?
    
    if [ $result -eq 0 ]; then
        echo -e "\n✅ ${name} API 요청 성공"
        echo "응답 파일 저장됨: ${RESULTS_DIR}/${output_file}.json"
        echo "응답 미리보기 (처음 10줄):"
        head -n 10 "${RESULTS_DIR}/${output_file}.json" | tee -a "${RESULTS_DIR}/${output_file}.log"
    else
        echo -e "\n❌ ${name} API 요청 실패 (종료 코드: $result)"
        echo "오류 로그는 ${RESULTS_DIR}/${output_file}.log 파일을 확인하세요."
    fi
    
    # HTTP 응답 코드 추출 시도
    local http_code=$(grep "< HTTP" "${RESULTS_DIR}/${output_file}.log" | tail -1 | cut -d' ' -f3)
    if [ ! -z "$http_code" ]; then
        echo "HTTP 응답 코드: $http_code"
    fi
    
    echo "==== ${name} 테스트 완료 ===="
    return $result
}

# 1. Narrans 모델 테스트
read -r -d '' NARRANS_REQUEST_BODY << EOM
{
  "model": "narrans",
  "messages": $TEST_MESSAGES,
  "temperature": 0.7,
  "max_tokens": 100,
  "stream": false
}
EOM

run_api_test "Narrans 모델" \
    "https://api-se-dev.narrans.samsungds.net/v1/chat/completions" \
    "$NARRANS_REQUEST_BODY" \
    "narrans_response" \
    "Authorization: Bearer string" \
    "false" \
    "false" \
    "true"

# 2. Llama-4 Scout 모델 테스트
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

run_api_test "Llama-4 Scout 모델" \
    "http://apigw-stg.samsungds.net:8000/llama4/1/llama/aiserving/llama-4/scout/v1/chat/completions" \
    "$LLAMA4_SCOUT_REQUEST_BODY" \
    "llama4_scout_response" \
    "x-dep-ticket: string" \
    "false"

# 3. Llama-4 Maverick 모델 테스트
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

run_api_test "Llama-4 Maverick 모델" \
    "http://apigw-stg.samsungds.net:8000/llama4/1/llama/aiserving/llama-4/maverick/v1/chat/completions" \
    "$LLAMA4_MAVERICK_REQUEST_BODY" \
    "llama4_maverick_response" \
    "x-dep-ticket: string" \
    "false"

# 4. Narrans 스트리밍 테스트
read -r -d '' NARRANS_STREAM_REQUEST_BODY << EOM
{
  "model": "narrans",
  "messages": $TEST_MESSAGES,
  "temperature": 0.7,
  "max_tokens": 100,
  "stream": true
}
EOM

run_api_test "Narrans 스트리밍" \
    "https://api-se-dev.narrans.samsungds.net/v1/chat/completions" \
    "$NARRANS_STREAM_REQUEST_BODY" \
    "narrans_stream_response" \
    "Authorization: Bearer string" \
    "true" \
    "false" \
    "true"

# 테스트 결과 요약
echo -e "\n\n============================================================="
echo "==== APE 내부망 API 테스트 결과 요약 ======================="
echo "============================================================="

echo "테스트 결과 디렉토리: ${RESULTS_DIR}"
echo

# 연결 테스트 결과 확인
echo "==== 네트워크 연결 테스트 요약 ===="
if grep -q "ping 성공" "${RESULTS_DIR}/ping_api-se-dev.narrans.samsungds.net.log" 2>/dev/null; then
    echo "✅ Narrans API 호스트 ping 성공"
else
    echo "❌ Narrans API 호스트 ping 실패"
fi

if grep -q "ping 성공" "${RESULTS_DIR}/ping_apigw-stg.samsungds.net.log" 2>/dev/null; then
    echo "✅ Llama4 API 호스트 ping 성공"
else
    echo "❌ Llama4 API 호스트 ping 실패"
fi

# API 테스트 결과 확인
echo -e "\n==== API 요청 테스트 요약 ===="
for model in "narrans" "llama4_scout" "llama4_maverick" "narrans_stream"; do
    if [ -f "${RESULTS_DIR}/${model}_response.json" ]; then
        size=$(stat -c%s "${RESULTS_DIR}/${model}_response.json" 2>/dev/null || echo "0")
        if [ "$size" -gt "10" ]; then
            echo "✅ ${model} 응답 수신됨 (${size} 바이트)"
        else
            echo "⚠️ ${model} 응답 크기가 너무 작음 (${size} 바이트)"
        fi
    else
        echo "❌ ${model} 응답 파일 없음"
    fi
done

echo -e "\n==== 진단 정보 ===="
echo "자세한 진단 로그는 ${RESULTS_DIR} 디렉토리에서 확인할 수 있습니다."
echo "주요 파일:"
echo "- DNS 조회: dns_lookup.log"
echo "- 프록시 설정: proxy_settings.log"
echo "- 네트워크 경로: traceroute_*.log"
echo "- API 요청 로그: *_response.log"
echo "- API 응답 데이터: *_response.json"

# 결과 압축 파일 생성
tar -czf "${RESULTS_DIR}.tar.gz" "${RESULTS_DIR}"
echo -e "\n테스트 결과 디렉토리를 압축 파일로 저장했습니다: ${RESULTS_DIR}.tar.gz"
echo "이 파일을 개발팀에 보내 추가 진단을 요청할 수 있습니다."

echo -e "\n============================================================="
echo "==== APE 내부망 API 테스트 완료 ==========================="
echo "============================================================="

# 실행 권한 부여
chmod +x api-test-debug.sh