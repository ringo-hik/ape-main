/**
 * 슬래시 명령 및 컨텍스트 제외 기능 검증 스크립트
 */

const { Message, MessageRole, MessageMetadata } = require('../out/types/chat');

// 테스트를 위한 메시지 배열 생성
const messages = [
  // 일반 사용자 메시지
  {
    id: 'msg_1',
    role: 'user',
    content: '안녕하세요, 도움이 필요합니다',
    timestamp: new Date(),
    metadata: {}
  },
  
  // 일반 시스템 메시지
  {
    id: 'msg_2',
    role: 'assistant',
    content: '안녕하세요! 어떻게 도와드릴까요?',
    timestamp: new Date(),
    metadata: {}
  },
  
  // 슬래시 명령 메시지
  {
    id: 'cmd_1',
    role: 'user',
    content: '/help',
    timestamp: new Date(),
    metadata: {
      isSlashCommand: true,
      excludeFromContext: true
    }
  },
  
  // 슬래시 명령 결과
  {
    id: 'cmd_result_1',
    role: 'system',
    content: '사용 가능한 명령어: /help, /clear, /todo',
    timestamp: new Date(),
    metadata: {
      commandResult: true,
      excludeFromContext: true
    }
  },
  
  // 사용자가 수동으로 제외한 메시지
  {
    id: 'msg_3',
    role: 'user',
    content: '이 메시지는 중요하지 않습니다',
    timestamp: new Date(),
    metadata: {
      excludeFromContext: true
    }
  },
  
  // 일반 메시지 추가
  {
    id: 'msg_4',
    role: 'user',
    content: '이 메시지는 컨텍스트에 포함됩니다',
    timestamp: new Date(),
    metadata: {}
  }
];

/**
 * 메시지를 필터링하는 함수 (LLM에 전송 전)
 */
function filterMessagesForLLM(messages) {
  return messages.filter(message => {
    // 컨텍스트에서 제외된 메시지 필터링
    if (message.metadata?.excludeFromContext === true) {
      console.log(`필터링됨: ${message.id} - ${message.content} (컨텍스트 제외)`);
      return false;
    }
    
    return true;
  });
}

// 테스트 실행
console.log('===== 전체 메시지 =====');
messages.forEach(msg => {
  console.log(`[${msg.role}] ${msg.content} ${msg.metadata.isSlashCommand ? '(슬래시 명령)' : ''} ${msg.metadata.excludeFromContext ? '(컨텍스트 제외)' : ''}`);
});

console.log('\n===== LLM에 전송될 메시지 =====');
const filteredMessages = filterMessagesForLLM(messages);
filteredMessages.forEach(msg => {
  console.log(`[${msg.role}] ${msg.content}`);
});

console.log('\n===== 통계 =====');
console.log(`전체 메시지: ${messages.length}`);
console.log(`필터링된 메시지: ${messages.length - filteredMessages.length}`);
console.log(`LLM에 전송될 메시지: ${filteredMessages.length}`);