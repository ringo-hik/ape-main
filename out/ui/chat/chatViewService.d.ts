/**
 * 채팅 뷰 서비스
 *
 * 채팅 인터페이스 관련 기능을 통합 제공
 * - 메시지 포맷팅
 * - 코드 블록 변환
 * - 채팅 UI 스크립트 생성
 */
/**
 * 메시지 포맷팅 옵션
 */
export interface FormatOptions {
    enableModernCodeBlocks: boolean;
    enableLineNumbers: boolean;
    enableSyntaxHighlighting: boolean;
}
/**
 * 채팅 뷰 서비스 클래스
 */
export declare class ChatViewService {
    private static codeBlockCounter;
    /**
     * 채팅 뷰 스크립트 생성
     * @param initialMessages 초기 메시지
     * @param isStreaming 스트리밍 상태
     * @returns 스크립트 문자열
     */
    static getChatViewScript(initialMessages: any[], isStreaming: boolean): string;
    /**
     * 메시지 내용을 HTML로 포맷팅
     * @param content 원본 메시지 내용
     * @param options 포맷팅 옵션
     * @returns 포맷팅된 HTML
     */
    static formatContent(content: string, options?: Partial<FormatOptions>): string;
    /**
     * 코드 블록을 모던 UI로 변환
     * @param content 원본 내용
     * @param options 포맷팅 옵션
     * @returns 변환된 내용
     */
    private static replaceCodeBlocks;
    /**
     * 단일 코드 블록 포맷팅
     * @param codeContent 코드 내용
     * @param language 언어
     * @param options 포맷팅 옵션
     * @returns 포맷팅된 HTML
     */
    private static formatCodeBlock;
    /**
     * HTML 이스케이프 처리
     * @param unsafe 이스케이프할 문자열
     * @returns 이스케이프된 문자열
     */
    private static escapeHtml;
}
