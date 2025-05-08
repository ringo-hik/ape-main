/**
 * 서비스 결과 모듈
 *
 * 외부 서비스 호출의 결과를 표준화된 형식으로 처리하는 인터페이스 정의
 * 성공/실패 여부, 데이터, 오류 정보를 일관된 방식으로 관리
 */
import { IServiceError } from './serviceError';
/**
 * 서비스 호출 결과 인터페이스
 *
 * @template T 결과 데이터 타입
 */
export interface ServiceResult<T> {
    /** 성공 여부 */
    success: boolean;
    /** 결과 데이터 (성공 시) */
    data?: T;
    /** 오류 정보 (실패 시) */
    error?: IServiceError;
}
/**
 * 성공 결과 생성 유틸리티 함수
 *
 * @param data 결과 데이터
 * @returns 성공 결과 객체
 */
export declare function createSuccessResult<T>(data: T): ServiceResult<T>;
/**
 * 실패 결과 생성 유틸리티 함수
 *
 * @param error 오류 정보
 * @returns 실패 결과 객체
 */
export declare function createErrorResult<T>(error: IServiceError): ServiceResult<T>;
