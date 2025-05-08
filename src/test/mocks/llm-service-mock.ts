import { LLMResponse, Message, MessageRole, LLMRequestOptions, StreamCallback } from '../../types/chat';
import { ConnectionType, LLMResult, LLMService } from '../../core/llm/llmService';
import * as fs from 'fs';
import * as path from 'path';

/**
 * LLM 서비스 Mock 클래스
 * 테스트 환경에서 실제 API 호출 없이 LLM 서비스를 시뮬레이션합니다.
 */
export class LLMServiceMock {
  private static instance: LLMServiceMock;
  private responseTemplates: Map<string, any> = new Map();
  
  /**
   * 싱글톤 인스턴스 가져오기
   */
  public static getInstance(): LLMServiceMock {
    if (!LLMServiceMock.instance) {
      LLMServiceMock.instance = new LLMServiceMock();
    }
    return LLMServiceMock.instance;
  }
  
  /**
   * 생성자
   */
  private constructor() {
    this.loadResponseTemplates();
    console.log('LLMServiceMock 초기화됨');
  }
  
  /**
   * 응답 템플릿 로드
   */
  private loadResponseTemplates(): void {
    try {
      const templatesDir = path.join(__dirname, '../mocks/response-templates');
      const templateFiles = fs.readdirSync(templatesDir);
      
      templateFiles.forEach(file => {
        if (file.endsWith('.json')) {
          const templateName = file.replace('.json', '');
          const templateData = JSON.parse(fs.readFileSync(path.join(templatesDir, file), 'utf8'));
          this.responseTemplates.set(templateName, templateData);
        }
      });
      
      console.log(`${this.responseTemplates.size}개의 응답 템플릿 로드됨`);
    } catch (error) {
      console.error('응답 템플릿 로드 실패:', error);
    }
  }
  
  /**
   * LLM 서비스 메소드를 모킹하여 LLMService를 반환
   * @param originalService 원본 LLM 서비스 인스턴스
   * @returns 모킹된 LLM 서비스
   */
  public mockService(originalService: LLMService): LLMService {
    // sendRequest 메소드 모킹
    originalService.sendRequest = async (
      messages: Message[],
      options?: LLMRequestOptions
    ): Promise<LLMResult<LLMResponse>> => {
      console.log('LLM 요청 모킹:', options);
      
      try {
        // 요청 내용 기반으로 적절한 응답 템플릿 선택
        const templateKey = this.selectTemplateByRequest(messages, options);
        const responseData = this.getResponseTemplate(templateKey);
        
        // 응답에 타임스탬프 업데이트
        if (responseData && responseData.message) {
          responseData.message.timestamp = new Date();
        }
        
        return {
          success: true,
          data: responseData
        };
      } catch (error) {
        console.error('Mock 응답 생성 실패:', error);
        return {
          success: false,
          error: error instanceof Error ? error : new Error(String(error))
        };
      }
    };
    
    // streamResponse 메소드 모킹
    originalService.streamResponse = async (
      messages: Message[],
      streamCallback: StreamCallback,
      options?: LLMRequestOptions
    ): Promise<LLMResult<void>> => {
      console.log('LLM 스트림 요청 모킹:', options);
      
      try {
        // 요청 내용 기반으로 적절한 응답 템플릿 선택
        const templateKey = this.selectTemplateByRequest(messages, options);
        const responseData = this.getResponseTemplate(templateKey);
        
        // 스트리밍 시뮬레이션
        await this.simulateStreaming(responseData.content, streamCallback);
        
        return { success: true };
      } catch (error) {
        console.error('Mock 스트림 응답 생성 실패:', error);
        return {
          success: false,
          error: error instanceof Error ? error : new Error(String(error))
        };
      }
    };
    
    // getCompletion 메소드 모킹
    originalService.getCompletion = async (
      prompt: string,
      options?: LLMRequestOptions
    ): Promise<LLMResult<string>> => {
      console.log('LLM 완성 요청 모킹:', options);
      
      try {
        // 간단한 메시지 생성
        const messages: Message[] = [{
          id: `user_${Date.now()}`,
          role: MessageRole.User,
          content: prompt,
          timestamp: new Date()
        }];
        
        // 응답 템플릿 가져오기
        const templateKey = this.selectTemplateByRequest(messages, options);
        const responseData = this.getResponseTemplate(templateKey);
        
        return {
          success: true,
          data: responseData.content
        };
      } catch (error) {
        console.error('Mock 완성 응답 생성 실패:', error);
        return {
          success: false,
          error: error instanceof Error ? error : new Error(String(error))
        };
      }
    };
    
    return originalService;
  }
  
  /**
   * 요청 내용을 기반으로 적절한 응답 템플릿 선택
   * @param messages 메시지 배열
   * @param options 요청 옵션
   * @returns 템플릿 키
   */
  private selectTemplateByRequest(messages: Message[], options?: LLMRequestOptions): string {
    // 마지막 사용자 메시지 찾기
    const lastUserMessage = [...messages].reverse().find(msg => msg.role === MessageRole.User);
    
    // 키워드 기반 템플릿 선택
    if (lastUserMessage) {
      const content = lastUserMessage.content.toLowerCase();
      
      // 키워드 기반 템플릿 매칭
      if (content.includes('error') || content.includes('오류')) {
        return 'error-response';
      }
      
      if (content.includes('fix') || content.includes('수정')) {
        return 'error-fix';
      }
      
      if (content.includes('code') || content.includes('코드') || content.includes('완성')) {
        return 'code-completion';
      }
    }
    
    // 기본 템플릿 반환
    return 'default';
  }
  
  /**
   * 응답 템플릿 가져오기
   * @param templateKey 템플릿 키
   * @returns 응답 데이터
   */
  private getResponseTemplate(templateKey: string): any {
    if (this.responseTemplates.has(templateKey)) {
      return JSON.parse(JSON.stringify(this.responseTemplates.get(templateKey)));
    }
    
    console.warn(`템플릿 "${templateKey}" 없음, 기본 템플릿 사용`);
    return JSON.parse(JSON.stringify(this.responseTemplates.get('default')));
  }
  
  /**
   * 스트리밍 응답 시뮬레이션
   * @param content 전체 콘텐츠
   * @param streamCallback 스트림 콜백
   */
  private async simulateStreaming(content: string, streamCallback: StreamCallback): Promise<void> {
    // 응답이 없으면 빈 응답 반환
    if (!content) {
      streamCallback('', true);
      return;
    }
    
    // 응답을 단어 단위로 분할
    const words = content.split(' ');
    const chunkSize = 3; // 한 번에 보낼 단어 수
    
    // 워드 청크로 나누기
    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(' ') + ' ';
      streamCallback(chunk, false);
      
      // 스트리밍 지연 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // 스트림 완료
    streamCallback('', true);
  }
}