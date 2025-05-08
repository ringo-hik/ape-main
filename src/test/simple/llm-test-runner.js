/**
 * LLM 서비스 테스트를 위한 간단한 러너
 * 
 * 이 스크립트는 LLM 모의 서비스를 사용하여 기본 기능을 테스트합니다.
 * vscode 모듈이 필요 없는 형태로 구현되어 독립적으로 실행 가능합니다.
 */

// 모의 메시지 데이터 유형 정의
const MessageRole = {
  System: 'system',
  User: 'user',
  Assistant: 'assistant'
};

// 모의 메시지 생성 함수
function createMessage(role, content) {
  return {
    id: `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    role: role,
    content: content,
    timestamp: new Date()
  };
}

// 테스트 시작
console.log('\n=======================================');
console.log('LLM 서비스 자체 테스트 시작');
console.log('=======================================\n');

// 테스트 환경 모드 설정
process.env.LLM_TEST_MODE = 'mock';

// 모의 응답 로드
const fs = require('fs');
const path = require('path');

// 모의 응답 로드 함수
function loadMockResponses() {
  const responses = {};
  const templatesDir = path.join(__dirname, '../mocks/response-templates');
  
  try {
    const templateFiles = fs.readdirSync(templatesDir);
    
    templateFiles.forEach(file => {
      if (file.endsWith('.json')) {
        const templateName = file.replace('.json', '');
        const templateData = JSON.parse(fs.readFileSync(path.join(templatesDir, file), 'utf8'));
        responses[templateName] = templateData;
      }
    });
    
    console.log(`${Object.keys(responses).length}개의 응답 템플릿 로드됨`);
    return responses;
  } catch (error) {
    console.error('모의 응답 로드 실패:', error);
    return {};
  }
}

// 테스트 결과 추적
const testResults = {
  total: 0,
  passed: 0,
  failed: 0
};

// 테스트 함수
function test(name, testFn) {
  testResults.total++;
  console.log(`\n🧪 테스트: ${name}`);
  
  try {
    testFn();
    console.log('✅ 통과');
    testResults.passed++;
  } catch (error) {
    console.error('❌ 실패:', error.message);
    testResults.failed++;
  }
}

// 테스트 실행
function runTests() {
  const mockResponses = loadMockResponses();
  
  // 기본 응답 형식 테스트
  test('모의 응답 형식이 올바른지 확인', () => {
    const defaultResponse = mockResponses['default'];
    
    if (!defaultResponse) throw new Error('기본 응답이 없습니다');
    if (!defaultResponse.message) throw new Error('message 속성이 없습니다');
    if (!defaultResponse.message.content) throw new Error('content 속성이 없습니다');
    if (defaultResponse.message.role !== 'assistant') throw new Error('role 값이 올바르지 않습니다');
  });
  
  // 모의 대화 테스트
  test('기본 대화 흐름 확인', () => {
    // 사용자 메시지 생성
    const userMessage = createMessage(MessageRole.User, '안녕하세요, 테스트입니다.');
    
    // 기본 응답 획득
    const response = mockResponses['default'];
    
    // 응답 확인
    if (!response.message.content.includes('mock')) {
      throw new Error('모킹된 응답을 반환하지 않습니다');
    }
  });
  
  // 에러 응답 테스트
  test('오류 응답 형식 확인', () => {
    const errorResponse = mockResponses['error-response'];
    
    if (!errorResponse) throw new Error('오류 응답이 없습니다');
    if (!errorResponse.message) throw new Error('message 속성이 없습니다');
    if (!errorResponse.message.content) throw new Error('content 속성이 없습니다');
  });
  
  // 코드 완성 응답 테스트
  test('코드 완성 응답 형식 확인', () => {
    const codeResponse = mockResponses['code-completion'];
    
    if (!codeResponse) throw new Error('코드 완성 응답이 없습니다');
    if (!codeResponse.message) throw new Error('message 속성이 없습니다');
    if (!codeResponse.message.content) throw new Error('content 속성이 없습니다');
  });
  
  // LLM_TEST_MODE 환경 변수 확인
  test('LLM_TEST_MODE 환경 변수 설정 확인', () => {
    if (process.env.LLM_TEST_MODE !== 'mock') {
      throw new Error('LLM_TEST_MODE가 mock으로 설정되지 않았습니다');
    }
  });
  
  // 스트리밍 시뮬레이션 테스트
  test('스트리밍 시뮬레이션 확인', () => {
    // 스트리밍 프로세스 모의 테스트
    function streamingTest(content) {
      const chunks = [];
      const words = content.split(' ');
      const chunkSize = 3;
      
      for (let i = 0; i < words.length; i += chunkSize) {
        const chunk = words.slice(i, i + chunkSize).join(' ') + ' ';
        chunks.push(chunk);
      }
      
      return chunks.join('') === content + ' ';
    }
    
    const content = '이것은 스트리밍 테스트를 위한 텍스트입니다';
    const result = streamingTest(content);
    
    if (!result) {
      throw new Error('스트리밍 시뮬레이션이 올바르게 작동하지 않습니다');
    }
  });
  
  // 모든 응답 템플릿 포맷 확인
  test('모든 응답 템플릿이 유효한 형식을 가지는지 확인', () => {
    Object.keys(mockResponses).forEach(key => {
      const response = mockResponses[key];
      
      if (!response.message) throw new Error(`${key} 응답에 message 속성이 없습니다`);
      if (!response.message.id) throw new Error(`${key} 응답에 id 속성이 없습니다`);
      if (!response.message.content) throw new Error(`${key} 응답에 content 속성이 없습니다`);
    });
  });
  
  // 최종 테스트 결과 표시
  console.log('\n=======================================');
  console.log('LLM 자체 테스트 결과 요약');
  console.log('=======================================');
  console.log(`총 테스트: ${testResults.total}`);
  console.log(`통과: ${testResults.passed}`);
  console.log(`실패: ${testResults.failed}`);
  console.log('=======================================\n');
  
  return testResults.failed === 0;
}

// 메인 실행
const success = runTests();
process.exit(success ? 0 : 1);