import { JSONPluginSchema } from '../types/json-plugin-schema';
import * as vscode from 'vscode';
/**
 * 플러그인 HTTP 요청을 처리하는 클라이언트
 */
export declare class PluginHttpClient {
    private static _tokenStorage;
    /**
     * 토큰 저장소 초기화
     * @param secretStorage VSCode 확장 컨텍스트의 SecretStorage
     */
    static initialize(secretStorage: vscode.SecretStorage): void;
    /**
     * 인증 정보 저장
     * @param pluginId 플러그인 ID
     * @param authType 인증 유형
     * @param credentials 인증 정보
     * @returns 성공 여부
     */
    static storeCredentials(pluginId: string, authType: string, credentials: Record<string, string>): Promise<boolean>;
    /**
     * 인증 정보 조회
     * @param pluginId 플러그인 ID
     * @param authType 인증 유형
     * @returns 인증 정보 또는 null
     */
    static getCredentials(pluginId: string, authType: string): Promise<Record<string, string> | null>;
    /**
     * 인증 정보 삭제
     * @param pluginId 플러그인 ID
     * @param authType 인증 유형
     * @returns 성공 여부
     */
    static deleteCredentials(pluginId: string, authType: string): Promise<boolean>;
    /**
     * 플러그인 함수에 대한 HTTP 요청 실행
     * @param plugin 플러그인 스키마
     * @param functionId 함수 ID
     * @param params 파라미터
     * @returns HTTP 응답
     */
    static executeRequest(plugin: JSONPluginSchema, functionId: string, params: Record<string, any>): Promise<any>;
    /**
     * 경로 파라미터 치환
     * @param path URL 경로
     * @param params 파라미터
     * @returns 치환된 경로
     */
    private static _replacePathParams;
    /**
     * 환경 변수 및 설정 값 치환
     * @param value 치환할 문자열
     * @param pluginId 플러그인 ID
     * @returns 치환된 문자열
     */
    private static _replaceConfigVars;
    /**
     * 파라미터 참조 치환
     * @param value 치환할 문자열
     * @param params 파라미터
     * @returns 치환된 문자열
     */
    private static _replaceParamRef;
    /**
     * 인증 적용
     * @param headers 요청 헤더
     * @param authConfig 인증 설정
     * @param pluginId 플러그인 ID
     * @param queryParams 쿼리 파라미터
     */
    private static _applyAuthentication;
    /**
     * 요청 바디 처리
     * @param body 요청 바디 템플릿
     * @param params 파라미터
     * @returns 처리된 요청 바디
     */
    private static _processRequestBody;
    /**
     * 객체 내 모든 문자열 필드의 파라미터 참조를 재귀적으로 치환
     * @param obj 처리할 객체
     * @param params 파라미터
     */
    private static _deepReplaceParams;
    /**
     * HTTP 응답 처리
     * @param response Axios 응답
     * @param responseConfig 응답 처리 설정
     * @returns 처리된 응답 데이터
     */
    private static _processResponse;
    /**
     * 객체에서 경로로 값 추출
     * @param obj 객체
     * @param path 경로 (예: 'data.items[0].name' 또는 '$.data.items[0].name')
     * @returns 추출된 값
     */
    private static _extractValueByPath;
    /**
     * 오류 응답 형식화
     * @param error 발생한 오류
     * @returns 형식화된 오류 응답
     */
    private static _formatErrorResponse;
}
