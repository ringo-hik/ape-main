import * as vscode from 'vscode';
import { Message, LLMResponse, LLMRequestOptions, StreamCallback, LLMModel } from '../../types/chat';
import { ModelManager } from './modelManager';
import { VaultService } from '../services/vaultService';
import { RulesService } from '../services/rulesService';
/**
 * LLM connection type
 */
export declare enum ConnectionType {
    HTTP = "http",
    WebSocket = "websocket"
}
/**
 * Result of an LLM operation including status and optional error
 */
export interface LLMResult<T> {
    success: boolean;
    data?: T;
    error?: Error;
}
/**
 * Service for interacting with LLM APIs
 * 성공한 curl 기반으로 Maverick 모델만 하드코딩된 서비스
 */
export declare class LLMService implements vscode.Disposable {
    private readonly _context;
    private readonly _modelManager;
    private _endpoint;
    private _connectionType;
    private _wsConnection;
    private _cancelTokenSource;
    private _configListener;
    private _modelChangeListener;
    private _apiKey;
    private _activeModel;
    private _vaultService;
    private _rulesService;
    /**
     * 생성자
     * @param _context VSCode 확장 컨텍스트
     * @param _modelManager 모델 관리자
     */
    constructor(_context: vscode.ExtensionContext, _modelManager: ModelManager);
    /**
     * VAULT 서비스 설정
     * @param vaultService VAULT 서비스 인스턴스
     */
    setVaultService(vaultService: VaultService): void;
    /**
     * Rules 서비스 설정
     * @param rulesService Rules 서비스 인스턴스
     */
    setRulesService(rulesService: RulesService): void;
    /**
     * VSCode 설정에서 구성 다시 로드
     * 중앙화된 설정 관리로 일관성 보장
     */
    private _loadConfiguration;
    /**
     * 현재 활성 LLM 모델 가져오기
     * @returns 활성 LLM 모델
     */
    getActiveModel(): LLMModel;
    /**
     * 활성 LLM 모델 변경 (현재는 Maverick으로 고정)
     * @param model 전환할 모델 (무시됨)
     */
    setActiveModel(model: string): Promise<boolean>;
    /**
     * 사용 가능한 모든 LLM 모델 가져오기
     * @returns 사용 가능한 LLM 모델 배열
     */
    getAvailableModels(): LLMModel[];
    /**
     * 모델 ID에 대한 사용자 친화적 표시 이름 가져오기
     * @param modelId 모델 ID
     * @returns 포맷된 표시 이름
     */
    getModelDisplayName(modelId: string): string;
    /**
     * curl 명령어와 동일한 방식으로 LLM에 요청을 보내고 응답 받기
     * @param messages 보낼 메시지
     * @param options 요청 옵션
     * @returns LLM 응답이 포함된 LLMResult로 해결되는 Promise
     */
    sendRequest(messages: Message[], options?: LLMRequestOptions): Promise<LLMResult<LLMResponse>>;
    /**
     * curl 명령어와 동일한 방식으로 LLM으로부터 응답 스트리밍
     * @param messages 보낼 메시지
     * @param streamCallback 청크 및 완료를 위한 스트리밍 콜백
     * @param options 요청 옵션
     * @returns 스트리밍 성공 또는 실패를 나타내는 LLMResult로 해결되는 Promise
     */
    streamResponse(messages: Message[], streamCallback: StreamCallback, options?: LLMRequestOptions): Promise<LLMResult<void>>;
    /**
     * 진행 중인 스트리밍 응답 취소
     * 리소스 낭비 방지 및 사용자 경험 향상
     */
    cancelStream(): void;
    /**
     * API용 메시지 포맷팅
     * 다양한 모델 요구사항 충족을 위한 메시지 변환
     * @param messages 포맷할 메시지
     * @param options 옵션 요청 옵션
     * @returns 포맷된 메시지 배열
     */
    private _formatMessagesForAPI;
    /**
     * HTTP API 응답 처리
     * 다양한 API 응답 형식 표준화
     * @param responseData 원시 응답 데이터
     * @returns 처리된 LLM 응답
     */
    private _processHttpResponse;
    /**
     * 프롬프트에 대한 간단한 완성 가져오기
     * 단일 질문-응답 상호작용 최적화
     * @param prompt LLM에 보낼 프롬프트
     * @param options 옵션 요청 옵션
     * @returns 완료 텍스트가 포함된 LLMResult로 해결되는 Promise
     */
    getCompletion(prompt: string, options?: LLMRequestOptions): Promise<LLMResult<string>>;
    /**
     * 리소스 해제
     * 메모리 누수 방지 및 성능 최적화
     */
    dispose(): void;
}
