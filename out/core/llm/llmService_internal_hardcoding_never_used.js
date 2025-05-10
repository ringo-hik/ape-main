"use strict";
/* 사용되는 코드 아니고 사용자 이 프로젝트의 오너가 테스트용으로 보관하는거니 대화 맥락에서 절대 배제할 것 없다고 생각해라 쳐다보는 것도 안돼*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMService = exports.ConnectionType = void 0;
const vscode = __importStar(require("vscode"));
const axios_1 = __importDefault(require("axios"));
const chat_1 = require("../../types/chat");
const vaultIntegration_1 = require("./vaultIntegration");
const rulesIntegration_1 = require("./rulesIntegration");
// Define constants for WebSocket states
const WS_OPEN = 1;
// Maverick 모델만 하드코딩하여 사용
const MODEL_LLAMA_MAVERICK = 'meta-llama/llama-4-maverick-17b-128e-instruct';
const DEFAULT_MODEL = MODEL_LLAMA_MAVERICK;
// Maverick 모델 엔드포인트 하드코딩
const MAVERICK_ENDPOINT = 'http://apigw-stg.samsungds.net:8000/llama4/1/llama/aiserving/llama-4/maverick/v1/chat/completions';
// 사용자 인증 정보 - 모든 요청에서 일관되게 사용
const USER_ID = 'hakmin_1.kim';
const USER_TYPE = 'hakmin_1.kim';
const SYSTEM_NAME = 'swdp';
// max_tokens 값 설정
const MAX_TOKENS_VALUE = 4096;
/**
 * LLM connection type
 */
var ConnectionType;
(function (ConnectionType) {
    ConnectionType["HTTP"] = "http";
    ConnectionType["WebSocket"] = "websocket";
})(ConnectionType || (exports.ConnectionType = ConnectionType = {}));
/**
 * UUID 생성 함수
 * @returns 랜덤 UUID 문자열
 */
function generateUUID() {
    // UUID v4 형식 생성
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
/**
 * 세밀한 디버깅을 위한 로깅 유틸리티
 * 시스템 전체 데이터 흐름을 추적하고 문제 지점을 정확히 식별하기 위한 도구
 */
class LogUtil {
    // 로그 수준 정의
    static LOG_LEVEL = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3
    };
    // 현재 로그 수준 - 필요에 따라 조정 가능
    static CURRENT_LOG_LEVEL = LogUtil.LOG_LEVEL.DEBUG;
    // 로그 ID 생성을 위한 카운터
    static logCounter = 0;
    /**
     * 고유 로그 ID 생성
     * 로그 추적성 향상을 위한 솔루션
     */
    static getLogId() {
        return `log_${Date.now()}_${++LogUtil.logCounter}`;
    }
    /**
     * 객체를 가독성 있게 출력
     * 복잡한 객체 구조도 명확하게 분석 가능
     * 인증 정보 마스킹 없이 전체 표시
     */
    static formatObject(obj, depth = 2) {
        try {
            // 인증 정보 마스킹 없이 원본 그대로 표시
            return JSON.stringify(obj, null, 2);
        }
        catch (error) {
            console.error('로깅 중 오류 발생:', error);
            return '[로깅 불가 객체]';
        }
    }
    /**
     * 요청 데이터 로깅 - 향상된 시각적 구분과 추적성
     */
    static logRequest(endpoint, headers, body) {
        const logId = LogUtil.getLogId();
        if (LogUtil.CURRENT_LOG_LEVEL <= LogUtil.LOG_LEVEL.DEBUG) {
            console.log(`
╔════════════════════════════════════════════════════════════
║ 요청 데이터 [ID:${logId}] (${new Date().toISOString()})
╠════════════════════════════════════════════════════════════
║ 엔드포인트: ${endpoint}
║ 
║ 요청 헤더:
${LogUtil.formatObject(headers).split('\n').map((line) => `║ ${line}`).join('\n')}
║
║ 요청 본문:
${LogUtil.formatObject(body).split('\n').map((line) => `║ ${line}`).join('\n')}
╚════════════════════════════════════════════════════════════
      `);
        }
    }
    /**
     * 응답 데이터 로깅 - 구조적 정보 표현 강화
     */
    static logResponse(responseData) {
        const logId = LogUtil.getLogId();
        if (LogUtil.CURRENT_LOG_LEVEL <= LogUtil.LOG_LEVEL.DEBUG) {
            console.log(`
╔════════════════════════════════════════════════════════════
║ 응답 데이터 [ID:${logId}] (${new Date().toISOString()})
╠════════════════════════════════════════════════════════════
║ 응답 본문:
${LogUtil.formatObject(responseData).split('\n').map((line) => `║ ${line}`).join('\n')}
╚════════════════════════════════════════════════════════════
      `);
        }
    }
    /**
     * 에러 로깅 - 상세 진단 정보 포함
     */
    static logError(operation, error) {
        const logId = LogUtil.getLogId();
        if (LogUtil.CURRENT_LOG_LEVEL <= LogUtil.LOG_LEVEL.ERROR) {
            console.error(`
╔════════════════════════════════════════════════════════════
║ ⚠️ 에러 발생 [ID:${logId}] (${new Date().toISOString()})
╠════════════════════════════════════════════════════════════
║ 작업: ${operation}
║ 에러 코드: ${error?.code || 'N/A'}
║ 상태 코드: ${error?.response?.status || 'N/A'}
║ 에러 메시지: ${error?.message || '알 수 없는 에러'}
║ 응답 데이터: ${error?.response?.data ? LogUtil.formatObject(error.response.data) : 'N/A'}
║ 
║ 에러 상세:
${(error?.stack || LogUtil.formatObject(error)).split('\n').map((line) => `║ ${line}`).join('\n')}
╚════════════════════════════════════════════════════════════
      `);
        }
    }
    /**
     * 스트리밍 청크 로깅 - 효율적 데이터 흐름 모니터링
     */
    static logStreamChunk(chunk, parsed) {
        const logId = LogUtil.getLogId();
        if (LogUtil.CURRENT_LOG_LEVEL <= LogUtil.LOG_LEVEL.DEBUG) {
            console.log(`
╔════════════════════════════════════════════════════════════
║ 스트림 청크 [ID:${logId}] (${new Date().toISOString()})
╠════════════════════════════════════════════════════════════
║ 원본 청크: 
${(typeof chunk === 'string' ? chunk : LogUtil.formatObject(chunk)).split('\n').map((line) => `║ ${line}`).join('\n')}
║
║ 파싱된 데이터:
${LogUtil.formatObject(parsed).split('\n').map((line) => `║ ${line}`).join('\n')}
╚════════════════════════════════════════════════════════════
      `);
        }
    }
    /**
     * 일반 정보 로깅 - 시스템 상태 추적
     */
    static logInfo(message, data) {
        const logId = LogUtil.getLogId();
        if (LogUtil.CURRENT_LOG_LEVEL <= LogUtil.LOG_LEVEL.INFO) {
            console.log(`
╔════════════════════════════════════════════════════════════
║ 정보 [ID:${logId}] (${new Date().toISOString()})
╠════════════════════════════════════════════════════════════
║ ${message}
${data ? `║ 
${LogUtil.formatObject(data).split('\n').map((line) => `║ ${line}`).join('\n')}` : ''}
╚════════════════════════════════════════════════════════════
      `);
        }
    }
}
/**
 * Service for interacting with LLM APIs
 * 성공한 curl 기반으로 Maverick 모델만 하드코딩된 서비스
 */
class LLMService {
    _context;
    _modelManager;
    _endpoint = MAVERICK_ENDPOINT;
    _connectionType = ConnectionType.HTTP;
    _wsConnection = null;
    _cancelTokenSource = null;
    _configListener;
    _modelChangeListener;
    _apiKey = '';
    _activeModel = DEFAULT_MODEL;
    _vaultService = null;
    _rulesService = null;
    /**
     * 생성자
     * @param _context VSCode 확장 컨텍스트
     * @param _modelManager 모델 관리자
     */
    constructor(_context, _modelManager) {
        this._context = _context;
        this._modelManager = _modelManager;
        LogUtil.logInfo('LLMService 객체 생성 시작');
        // Maverick 엔드포인트로 하드코딩
        this._endpoint = MAVERICK_ENDPOINT;
        this._connectionType = ConnectionType.HTTP;
        LogUtil.logInfo('LLMService 초기화 시작...', {
            defaultEndpoint: this._endpoint,
            connectionType: this._connectionType
        });
        // 설정 로드
        this._loadConfiguration();
        // 설정 변경 리스너
        this._configListener = vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration('ape.llm') &&
                !event.affectsConfiguration('ape.llm.defaultModel')) {
                LogUtil.logInfo('LLM 설정 변경 감지', event);
                this._loadConfiguration();
            }
        });
        // 모델 변경 리스너 (하드코딩으로 인해 실제로는 항상 Maverick로 설정됨)
        this._modelChangeListener = this._modelManager.onDidChangeModel(event => {
            LogUtil.logInfo(`모델 변경 감지 - Maverick으로 고정됨`, {
                oldModel: event.oldModel,
                newModel: 'meta-llama/llama-4-maverick-17b-128e-instruct' // 항상 Maverick
            });
            // Maverick 모델 고정
            this._activeModel = MODEL_LLAMA_MAVERICK;
        });
        LogUtil.logInfo('LLMService 초기화 완료', {
            activeModel: this.getActiveModel(),
            endpoint: this._endpoint
        });
    }
    /**
     * VAULT 서비스 설정
     * @param vaultService VAULT 서비스 인스턴스
     */
    setVaultService(vaultService) {
        LogUtil.logInfo('VAULT 서비스 설정됨');
        this._vaultService = vaultService;
    }
    /**
     * Rules 서비스 설정
     * @param rulesService Rules 서비스 인스턴스
     */
    setRulesService(rulesService) {
        LogUtil.logInfo('Rules 서비스 설정됨');
        this._rulesService = rulesService;
    }
    /**
     * VSCode 설정에서 구성 다시 로드
     * 중앙화된 설정 관리로 일관성 보장
     */
    _loadConfiguration() {
        LogUtil.logInfo('설정 로드 시작');
        const config = vscode.workspace.getConfiguration('ape.llm');
        const oldApiKey = this._apiKey;
        this._apiKey = config.get('apiKey', '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');
        // API 키 전체 로깅 (중요 정보를 마스킹하지 않음)
        LogUtil.logInfo('API 키가 설정됨', { apiKey: this._apiKey });
        if (oldApiKey !== this._apiKey) {
            LogUtil.logInfo('API 키가 변경됨', {
                oldApiKey: oldApiKey,
                newApiKey: this._apiKey
            });
        }
        // 모델은 Maverick으로 고정
        this._activeModel = MODEL_LLAMA_MAVERICK;
        LogUtil.logInfo('모델이 Maverick으로 고정됨');
        LogUtil.logInfo('설정 로드 완료');
    }
    /**
     * 현재 활성 LLM 모델 가져오기
     * @returns 활성 LLM 모델
     */
    getActiveModel() {
        // 항상 Maverick 모델 반환
        return MODEL_LLAMA_MAVERICK;
    }
    /**
     * 활성 LLM 모델 변경 (현재는 Maverick으로 고정)
     * @param model 전환할 모델 (무시됨)
     */
    async setActiveModel(model) {
        LogUtil.logInfo(`모델 변경 요청이 있었으나 Maverick으로 고정됨 (요청 모델: ${model})`);
        // 항상 Maverick 모델로 고정
        this._activeModel = MODEL_LLAMA_MAVERICK;
        this._endpoint = MAVERICK_ENDPOINT;
        return true;
    }
    /**
     * 사용 가능한 모든 LLM 모델 가져오기
     * @returns 사용 가능한 LLM 모델 배열
     */
    getAvailableModels() {
        // Maverick 모델만 반환
        return [MODEL_LLAMA_MAVERICK];
    }
    /**
     * 모델 ID에 대한 사용자 친화적 표시 이름 가져오기
     * @param modelId 모델 ID
     * @returns 포맷된 표시 이름
     */
    getModelDisplayName(modelId) {
        // 항상 Maverick 표시명 반환
        return 'Llama-4 Maverick';
    }
    /**
     * curl 명령어와 동일한 방식으로 LLM에 요청을 보내고 응답 받기
     * @param messages 보낼 메시지
     * @param options 요청 옵션
     * @returns LLM 응답이 포함된 LLMResult로 해결되는 Promise
     */
    async sendRequest(messages, options) {
        try {
            LogUtil.logInfo('LLM 요청 시작', {
                messageCount: messages.length,
                options: options
            });
            // curl과 정확히 동일한 엔드포인트 사용
            const endpoint = MAVERICK_ENDPOINT;
            const requestId = generateUUID();
            LogUtil.logInfo('HTTP 요청 UUID 생성', { requestId });
            // curl과 동일한 형식으로 메시지 포맷팅
            const formattedMessages = this._formatMessagesForAPI(messages, options);
            // curl과 동일한 요청 구조
            const request = {
                model: MODEL_LLAMA_MAVERICK,
                messages: formattedMessages.map(msg => ({
                    role: msg.role,
                    content: msg.content
                })),
                temperature: options?.temperature || 0.7,
                stream: false,
                max_tokens: MAX_TOKENS_VALUE
            };
            // curl과 동일한 헤더 구조
            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Send-System-Name': SYSTEM_NAME,
                'User-Id': USER_ID,
                'User-Type': USER_TYPE,
                'Prompt-Msg-Id': requestId,
                'Completion-Msg-Id': requestId,
                'X-Dep-Ticket': this._apiKey
            };
            LogUtil.logRequest(endpoint, headers, request);
            try {
                const response = await axios_1.default.post(endpoint, request, { headers });
                LogUtil.logResponse(response.data);
                return {
                    success: true,
                    data: this._processHttpResponse(response.data)
                };
            }
            catch (error) {
                LogUtil.logError('HTTP 요청 중 오류 발생', error);
                throw error;
            }
        }
        catch (error) {
            LogUtil.logError('LLM 요청 중 오류 발생', error);
            return {
                success: false,
                error: error instanceof Error
                    ? error
                    : new Error(`Failed to communicate with LLM service: ${String(error)}`)
            };
        }
    }
    /**
     * curl 명령어와 동일한 방식으로 LLM으로부터 응답 스트리밍
     * @param messages 보낼 메시지
     * @param streamCallback 청크 및 완료를 위한 스트리밍 콜백
     * @param options 요청 옵션
     * @returns 스트리밍 성공 또는 실패를 나타내는 LLMResult로 해결되는 Promise
     */
    async streamResponse(messages, streamCallback, options) {
        try {
            LogUtil.logInfo('LLM 스트리밍 요청 시작', {
                messageCount: messages.length,
                options: options
            });
            // curl과 정확히 동일한 엔드포인트 사용
            const endpoint = MAVERICK_ENDPOINT;
            const requestId = generateUUID();
            LogUtil.logInfo('HTTP 스트리밍 UUID 생성', { requestId });
            // curl과 동일한 형식으로 메시지 포맷팅
            const formattedMessages = this._formatMessagesForAPI(messages, options);
            // curl과 동일한 요청 구조 (stream: true로 설정)
            const request = {
                model: MODEL_LLAMA_MAVERICK,
                messages: formattedMessages.map(msg => ({
                    role: msg.role,
                    content: msg.content
                })),
                temperature: options?.temperature || 0.7,
                stream: true,
                max_tokens: MAX_TOKENS_VALUE
            };
            // curl과 동일한 헤더 구조 (스트리밍용 Accept 헤더)
            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream; charset=utf-8',
                'Send-System-Name': SYSTEM_NAME,
                'User-Id': USER_ID,
                'User-Type': USER_TYPE,
                'Prompt-Msg-Id': requestId,
                'Completion-Msg-Id': requestId,
                'X-Dep-Ticket': this._apiKey
            };
            // 취소 토큰 생성
            this._cancelTokenSource = axios_1.default.CancelToken.source();
            try {
                // 요청 로깅
                LogUtil.logRequest(endpoint, headers, request);
                const response = await axios_1.default.post(endpoint, request, {
                    responseType: 'stream',
                    cancelToken: this._cancelTokenSource.token,
                    headers: headers
                });
                LogUtil.logInfo('스트리밍 응답 시작', {
                    status: response.status,
                    headers: response.headers
                });
                let chunkCount = 0;
                let accumulatedText = ''; // 디버깅 용
                response.data.on('data', (chunk) => {
                    const chunkStr = chunk.toString();
                    LogUtil.logInfo(`스트림 데이터 청크 #${++chunkCount} 수신`, {
                        chunkSize: chunkStr.length,
                        chunkPreview: chunkStr.substring(0, 100) + (chunkStr.length > 100 ? '...' : '')
                    });
                    const lines = chunkStr.split('\n').filter(Boolean);
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.substring('data: '.length);
                            if (data === '[DONE]') {
                                LogUtil.logInfo('스트림 완료 신호 [DONE] 수신');
                                streamCallback('', true); // 스트림 완료 신호
                            }
                            else {
                                try {
                                    const parsed = JSON.parse(data);
                                    LogUtil.logStreamChunk(data, parsed);
                                    if (parsed.choices && parsed.choices.length > 0) {
                                        const content = parsed.choices[0].delta?.content ||
                                            parsed.choices[0].message?.content || '';
                                        if (content) {
                                            accumulatedText += content;
                                            LogUtil.logInfo('스트림 콘텐츠 추출', {
                                                contentLength: content.length,
                                                contentPreview: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
                                                totalAccumulated: accumulatedText.length
                                            });
                                            streamCallback(content, false);
                                        }
                                    }
                                }
                                catch (err) {
                                    LogUtil.logError('스트림 데이터 파싱 오류', err);
                                }
                            }
                        }
                    }
                });
                response.data.on('end', () => {
                    this._cancelTokenSource = null;
                    LogUtil.logInfo('스트림 종료', {
                        totalChunks: chunkCount,
                        totalAccumulatedLength: accumulatedText.length
                    });
                    streamCallback('', true); // 스트림 완료 신호
                });
                response.data.on('error', (err) => {
                    this._cancelTokenSource = null;
                    LogUtil.logError('스트림 에러', err);
                    streamCallback('', true);
                });
            }
            catch (error) {
                this._cancelTokenSource = null;
                if (axios_1.default.isCancel(error)) {
                    // Request was canceled intentionally
                    LogUtil.logInfo('스트림 요청이 의도적으로 취소됨');
                    streamCallback('', true); // Signal completion with empty chunk and done=true
                }
                else {
                    // Real error
                    LogUtil.logError('스트림 요청 중 오류 발생', error);
                    throw error;
                }
            }
            return { success: true };
        }
        catch (error) {
            LogUtil.logError('LLM 스트리밍 중 오류 발생', error);
            return {
                success: false,
                error: error instanceof Error
                    ? error
                    : new Error(`Failed to stream from LLM service: ${String(error)}`)
            };
        }
    }
    /**
     * 진행 중인 스트리밍 응답 취소
     * 리소스 낭비 방지 및 사용자 경험 향상
     */
    cancelStream() {
        LogUtil.logInfo('스트림 취소 요청됨');
        if (this._cancelTokenSource) {
            this._cancelTokenSource.cancel('Operation canceled by user');
            this._cancelTokenSource = null;
            LogUtil.logInfo('HTTP 스트림 취소됨');
        }
    }
    /**
     * API용 메시지 포맷팅
     * 다양한 모델 요구사항 충족을 위한 메시지 변환
     * @param messages 포맷할 메시지
     * @param options 옵션 요청 옵션
     * @returns 포맷된 메시지 배열
     */
    _formatMessagesForAPI(messages, options) {
        LogUtil.logInfo('API용 메시지 포맷팅 시작', {
            messageCount: messages.length,
            hasSystemPrompt: !!options?.systemPrompt,
            hasContextMessages: options?.contextMessages ? options.contextMessages.length : 0
        });
        let formattedMessages = [...messages];
        // Add system prompt as a system message if provided
        if (options?.systemPrompt) {
            formattedMessages.unshift({
                id: `system_${Date.now()}`,
                role: chat_1.MessageRole.System,
                content: options.systemPrompt,
                timestamp: new Date()
            });
            LogUtil.logInfo('시스템 프롬프트 추가됨');
        }
        // Add context messages if provided
        if (options?.contextMessages && options.contextMessages.length > 0) {
            formattedMessages = [...options.contextMessages, ...formattedMessages];
            LogUtil.logInfo(`${options.contextMessages.length}개의 컨텍스트 메시지 추가됨`);
        }
        // Apply VAULT context if available and requested
        if (this._vaultService && options?.vaultOptions) {
            const vaultOptions = options.vaultOptions;
            // vaultOptions가 undefined일 수 없지만 타입 에러를 해결하기 위해 기본 객체 제공
            formattedMessages = (0, vaultIntegration_1.applyVaultContext)(formattedMessages, this._vaultService, vaultOptions || {});
            LogUtil.logInfo('VAULT 컨텍스트 적용됨');
        }
        // Apply Rules if available
        if (this._rulesService) {
            const rulesOptions = options?.rulesOptions;
            formattedMessages = (0, rulesIntegration_1.applyRulesContext)(formattedMessages, this._rulesService, rulesOptions);
            LogUtil.logInfo('Rules 컨텍스트 적용됨');
        }
        LogUtil.logInfo('메시지 포맷팅 완료', {
            finalMessageCount: formattedMessages.length
        });
        // Return formatted messages
        return formattedMessages;
    }
    /**
     * HTTP API 응답 처리
     * 다양한 API 응답 형식 표준화
     * @param responseData 원시 응답 데이터
     * @returns 처리된 LLM 응답
     */
    _processHttpResponse(responseData) {
        LogUtil.logInfo('HTTP 응답 처리 시작', {
            hasChoices: responseData.choices ? true : false,
            responseType: responseData.choices ? 'OpenAI/OpenRouter 형식' : '기존 형식'
        });
        // OpenRouter/OpenAI 형식 응답 처리 (choices 배열 사용)
        if (responseData.choices && Array.isArray(responseData.choices)) {
            const content = responseData.choices[0]?.message?.content || '';
            const processedResponse = {
                message: {
                    id: responseData.id || `msg_${Date.now()}`,
                    role: chat_1.MessageRole.Assistant,
                    content: content,
                    timestamp: new Date(),
                    metadata: {
                        model: MODEL_LLAMA_MAVERICK
                    }
                },
                usage: responseData.usage || {
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0
                },
                metadata: responseData.metadata || {},
                content: content // 호환성을 위해 추가
            };
            LogUtil.logInfo('OpenAI 형식 응답 처리 완료', {
                messageId: processedResponse.message.id,
                contentLength: content.length,
                model: processedResponse.message.metadata.model
            });
            return processedResponse;
        }
        // 기존 응답 형식 처리
        else {
            const processedResponse = {
                message: {
                    id: responseData.message?.id || `msg_${Date.now()}`,
                    role: chat_1.MessageRole.Assistant,
                    content: responseData.content || responseData.message?.content || '',
                    timestamp: new Date(),
                    metadata: responseData.message?.metadata || {
                        model: MODEL_LLAMA_MAVERICK
                    }
                },
                usage: responseData.usage || {
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0
                },
                metadata: responseData.metadata || {}
            };
            LogUtil.logInfo('기존 형식 응답 처리 완료', {
                messageId: processedResponse.message.id,
                contentLength: processedResponse.message.content.length,
                model: processedResponse.message.metadata.model
            });
            return processedResponse;
        }
    }
    /**
     * 프롬프트에 대한 간단한 완성 가져오기
     * 단일 질문-응답 상호작용 최적화
     * @param prompt LLM에 보낼 프롬프트
     * @param options 옵션 요청 옵션
     * @returns 완료 텍스트가 포함된 LLMResult로 해결되는 Promise
     */
    async getCompletion(prompt, options) {
        try {
            LogUtil.logInfo('단순 완성 요청 시작', {
                promptLength: prompt.length,
                promptPreview: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : '')
            });
            // Create a simple message with the prompt
            const messages = [
                {
                    id: `user_${Date.now()}`,
                    role: chat_1.MessageRole.User,
                    content: prompt,
                    timestamp: new Date()
                }
            ];
            // Send the request
            const result = await this.sendRequest(messages, options);
            if (result.success && result.data) {
                LogUtil.logInfo('완성 요청 성공', {
                    contentLength: result.data.message.content.length
                });
                return {
                    success: true,
                    data: result.data.message.content
                };
            }
            else {
                LogUtil.logError('완성 요청 실패', result.error || new Error('Failed to get completion'));
                return {
                    success: false,
                    error: result.error || new Error('Failed to get completion')
                };
            }
        }
        catch (error) {
            LogUtil.logError('완성 가져오기 중 오류', error);
            return {
                success: false,
                error: error instanceof Error
                    ? error
                    : new Error(`Failed to get completion: ${String(error)}`)
            };
        }
    }
    /**
     * 리소스 해제
     * 메모리 누수 방지 및 성능 최적화
     */
    dispose() {
        LogUtil.logInfo('LLMService 리소스 정리 시작');
        // Dispose event listeners
        this._configListener.dispose();
        this._modelChangeListener.dispose();
        // Cancel any ongoing operations
        if (this._cancelTokenSource) {
            this._cancelTokenSource.cancel('Extension deactivated');
            this._cancelTokenSource = null;
            LogUtil.logInfo('진행 중인 HTTP 요청 취소됨');
        }
        // Close WebSocket connection (현재 미사용)
        if (this._wsConnection) {
            this._wsConnection.close();
            this._wsConnection = null;
            LogUtil.logInfo('WebSocket 연결 닫힘');
        }
        LogUtil.logInfo('LLMService 리소스 정리 완료');
    }
}
exports.LLMService = LLMService;
//# sourceMappingURL=llmService_internal_hardcoding_never_used.js.map