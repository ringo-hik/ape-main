"use strict";
/**
 * 서비스 결과 모듈
 *
 * 외부 서비스 호출의 결과를 표준화된 형식으로 처리하는 인터페이스 정의
 * 성공/실패 여부, 데이터, 오류 정보를 일관된 방식으로 관리
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSuccessResult = createSuccessResult;
exports.createErrorResult = createErrorResult;
/**
 * 성공 결과 생성 유틸리티 함수
 *
 * @param data 결과 데이터
 * @returns 성공 결과 객체
 */
function createSuccessResult(data) {
    return {
        success: true,
        data
    };
}
/**
 * 실패 결과 생성 유틸리티 함수
 *
 * @param error 오류 정보
 * @returns 실패 결과 객체
 */
function createErrorResult(error) {
    return {
        success: false,
        error
    };
}
//# sourceMappingURL=serviceResult.js.map