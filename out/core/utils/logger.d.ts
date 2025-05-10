/**
 * 로깅 시스템
 *
 * console.log 직접 사용을 방지하고 중앙화된 로깅 관리를 위한 유틸리티
 */
/**
 * 로그 레벨 정의
 */
export declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    NONE = 4
}
/**
 * Logger 클래스 - APE 확장의 중앙 로깅 시스템
 */
export declare class Logger {
    private static instance;
    private outputChannel;
    private logLevel;
    /**
     * 생성자 - 싱글톤 패턴으로 직접 호출하지 않음
     */
    private constructor();
    /**
     * 싱글톤 인스턴스 가져오기
     */
    static getInstance(): Logger;
    /**
     * 설정에서 로그 레벨 업데이트
     */
    private updateLogLevel;
    /**
     * 디버그 로그 (가장 상세한 로그)
     * @param message 로그 메시지
     * @param data 추가 데이터 (선택 사항)
     */
    debug(message: string, data?: any): void;
    /**
     * 정보 로그 (일반적인 작업 정보)
     * @param message 로그 메시지
     * @param data 추가 데이터 (선택 사항)
     */
    info(message: string, data?: any): void;
    /**
     * 경고 로그 (잠재적 문제)
     * @param message 로그 메시지
     * @param data 추가 데이터 (선택 사항)
     */
    warn(message: string, data?: any): void;
    /**
     * 오류 로그 (실패한 작업)
     * @param message 로그 메시지
     * @param error 에러 객체 또는 추가 데이터
     */
    error(message: string, error?: any): void;
    /**
     * 내부 로그 메서드
     * @param level 로그 레벨
     * @param message 로그 메시지
     * @param data 추가 데이터 (선택 사항)
     */
    private log;
    /**
     * 출력 채널 표시
     */
    show(): void;
    /**
     * 출력 채널 내용 지우기
     */
    clear(): void;
}
/**
 * 로거 싱글톤 인스턴스 (간편한 임포트를 위한 내보내기)
 */
export declare const logger: Logger;
