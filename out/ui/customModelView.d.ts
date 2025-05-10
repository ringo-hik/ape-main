import * as vscode from 'vscode';
import { ModelManager } from '../core/llm/modelManager';
/**
 * 커스텀 LLM 모델 설정 인터페이스 관리 클래스
 * AI Toolkit을 벤치마킹한 사용자 친화적인 모델 관리 UI 제공
 */
export declare class CustomModelView {
    private static _panel;
    private static _modelManager;
    private static _context;
    /**
     * CustomModelView 초기화
     * @param context VS Code 확장 컨텍스트
     * @param modelManager 모델 관리자 인스턴스
     */
    static initialize(context: vscode.ExtensionContext, modelManager: ModelManager): void;
    /**
     * 커스텀 모델 설정 뷰 생성 또는 표시
     * 이미 존재하면 기존 패널을 표시하고, 없으면 새로 생성
     */
    static createOrShow(): void;
    /**
     * 새 커스텀 모델 추가
     * @param model 추가할 커스텀 모델 데이터
     */
    private static addCustomModel;
    /**
     * 커스텀 모델 업데이트
     * @param model 업데이트할 커스텀 모델 데이터
     */
    private static updateCustomModel;
    /**
     * 커스텀 모델 삭제
     * @param id 삭제할 커스텀 모델 ID
     */
    private static deleteCustomModel;
    /**
     * 커스텀 모델 활성화
     * @param id 활성화할 커스텀 모델 ID
     */
    private static activateCustomModel;
    /**
     * 연결 테스트
     * @param model 테스트할 모델 설정
     */
    private static testConnection;
    /**
     * 모델 목록 새로고침
     */
    private static refreshModels;
    /**
     * 웹뷰로 메시지 전송
     * @param message 전송할 메시지
     */
    private static sendMessageToWebview;
    /**
     * 웹뷰 콘텐츠 생성
     * @param webview 웹뷰 인스턴스
     * @returns HTML 문자열
     */
    private static _getWebviewContent;
    /**
     * 모델 ID 생성
     * @param name 모델 이름
     * @returns 생성된 ID
     */
    private static generateModelId;
    /**
     * URL 유효성 검사
     * @param url 검사할 URL
     * @returns 유효 여부
     */
    private static isValidUrl;
    /**
     * nonce 생성
     * @returns 생성된 nonce 문자열
     */
    private static getNonce;
}
