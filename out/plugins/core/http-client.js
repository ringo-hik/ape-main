"use strict";
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
exports.PluginHttpClient = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../../core/utils/logger");
const vscode = __importStar(require("vscode"));
/**
 * 플러그인 HTTP 요청을 처리하는 클라이언트
 */
class PluginHttpClient {
    // 토큰 저장소 인스턴스
    static _tokenStorage = null;
    /**
     * 토큰 저장소 초기화
     * @param secretStorage VSCode 확장 컨텍스트의 SecretStorage
     */
    static initialize(secretStorage) {
        this._tokenStorage = secretStorage;
    }
    /**
     * 인증 정보 저장
     * @param pluginId 플러그인 ID
     * @param authType 인증 유형
     * @param credentials 인증 정보
     * @returns 성공 여부
     */
    static async storeCredentials(pluginId, authType, credentials) {
        if (!this._tokenStorage) {
            throw new Error('Token storage not initialized');
        }
        try {
            const key = `plugin_auth_${pluginId}_${authType}`;
            await this._tokenStorage.store(key, JSON.stringify(credentials));
            return true;
        }
        catch (error) {
            logger_1.logger.error(`Error storing credentials for plugin ${pluginId}:`, error);
            return false;
        }
    }
    /**
     * 인증 정보 조회
     * @param pluginId 플러그인 ID
     * @param authType 인증 유형
     * @returns 인증 정보 또는 null
     */
    static async getCredentials(pluginId, authType) {
        if (!this._tokenStorage) {
            throw new Error('Token storage not initialized');
        }
        try {
            const key = `plugin_auth_${pluginId}_${authType}`;
            const credentials = await this._tokenStorage.get(key);
            if (credentials) {
                return JSON.parse(credentials);
            }
            return null;
        }
        catch (error) {
            logger_1.logger.error(`Error retrieving credentials for plugin ${pluginId}:`, error);
            return null;
        }
    }
    /**
     * 인증 정보 삭제
     * @param pluginId 플러그인 ID
     * @param authType 인증 유형
     * @returns 성공 여부
     */
    static async deleteCredentials(pluginId, authType) {
        if (!this._tokenStorage) {
            throw new Error('Token storage not initialized');
        }
        try {
            const key = `plugin_auth_${pluginId}_${authType}`;
            await this._tokenStorage.delete(key);
            return true;
        }
        catch (error) {
            logger_1.logger.error(`Error deleting credentials for plugin ${pluginId}:`, error);
            return false;
        }
    }
    /**
     * 플러그인 함수에 대한 HTTP 요청 실행
     * @param plugin 플러그인 스키마
     * @param functionId 함수 ID
     * @param params 파라미터
     * @returns HTTP 응답
     */
    static async executeRequest(plugin, functionId, params) {
        const func = plugin.functions[functionId];
        if (!func) {
            throw new Error(`Function ${functionId} not found in plugin ${plugin.metadata.id}`);
        }
        try {
            // 기본 URL 처리
            let baseUrl = func.request.baseUrl;
            // 환경 변수 및 설정 값 치환
            baseUrl = this._replaceConfigVars(baseUrl, plugin.metadata.id);
            // 경로 파라미터 치환
            let path = func.request.path;
            path = this._replacePathParams(path, params);
            // URL 조합
            let url = baseUrl + path;
            // 쿼리 파라미터 처리
            const queryParams = {};
            if (func.request.query) {
                for (const [key, value] of Object.entries(func.request.query)) {
                    const paramValue = this._replaceParamRef(value, params);
                    if (paramValue) {
                        queryParams[key] = paramValue;
                    }
                }
            }
            // 헤더 처리
            const headers = { ...func.request.headers };
            // 인증 처리
            if (func.request.auth) {
                await this._applyAuthentication(headers, func.request.auth, plugin.metadata.id, queryParams);
            }
            // 요청 바디 처리
            let body = undefined;
            if (func.request.body) {
                body = this._processRequestBody(func.request.body, params);
            }
            // Axios 요청 구성
            const requestConfig = {
                method: func.request.method,
                url,
                headers,
                params: queryParams,
                data: body,
                timeout: 30000, // 30초 타임아웃
                validateStatus: null // 모든 상태 코드 허용 (에러 핸들링에서 처리)
            };
            // 요청 실행
            const response = await (0, axios_1.default)(requestConfig);
            // 응답 처리
            return this._processResponse(response, func.response);
        }
        catch (error) {
            logger_1.logger.error(`Error executing request for ${functionId}:`, error);
            // 에러 응답 형식화
            return this._formatErrorResponse(error);
        }
    }
    /**
     * 경로 파라미터 치환
     * @param path URL 경로
     * @param params 파라미터
     * @returns 치환된 경로
     */
    static _replacePathParams(path, params) {
        return path.replace(/\{([^{}]+)\}/g, (match, key) => {
            const value = params[key];
            if (value === undefined) {
                throw new Error(`Path parameter ${key} is not provided`);
            }
            return encodeURIComponent(String(value));
        });
    }
    /**
     * 환경 변수 및 설정 값 치환
     * @param value 치환할 문자열
     * @param pluginId 플러그인 ID
     * @returns 치환된 문자열
     */
    static _replaceConfigVars(value, pluginId) {
        return value.replace(/\{([^{}]+)\}/g, (match, key) => {
            // 설정에서 값 가져오기
            const config = vscode.workspace.getConfiguration(`ape.plugins.${pluginId}`);
            const configValue = config.get(key);
            if (configValue !== undefined) {
                return configValue;
            }
            // 값을 찾지 못한 경우 그대로 반환
            return match;
        });
    }
    /**
     * 파라미터 참조 치환
     * @param value 치환할 문자열
     * @param params 파라미터
     * @returns 치환된 문자열
     */
    static _replaceParamRef(value, params) {
        return value.replace(/\{([^{}]+)\}/g, (match, key) => {
            const paramValue = params[key];
            return paramValue !== undefined ? String(paramValue) : '';
        });
    }
    /**
     * 인증 적용
     * @param headers 요청 헤더
     * @param authConfig 인증 설정
     * @param pluginId 플러그인 ID
     * @param queryParams 쿼리 파라미터
     */
    static async _applyAuthentication(headers, authConfig, pluginId, queryParams) {
        // 저장된 인증 정보 조회
        const credentials = await this.getCredentials(pluginId, authConfig.type);
        if (!credentials && authConfig.type !== 'none') {
            throw new Error(`Authentication credentials not found for plugin ${pluginId}`);
        }
        switch (authConfig.type) {
            case 'basic':
                if (credentials && credentials.username && credentials.password) {
                    const basicAuth = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
                    headers['Authorization'] = `Basic ${basicAuth}`;
                }
                break;
            case 'bearer':
                if (credentials && credentials.token) {
                    headers['Authorization'] = `Bearer ${credentials.token}`;
                }
                break;
            case 'api_key':
                if (credentials && credentials.apiKey) {
                    const apiKeyName = authConfig.apiKeyName || 'api-key';
                    const apiKeyIn = authConfig.apiKeyIn || 'header';
                    if (apiKeyIn === 'header') {
                        headers[apiKeyName] = credentials.apiKey;
                    }
                    else if (apiKeyIn === 'query') {
                        queryParams[apiKeyName] = credentials.apiKey;
                    }
                }
                break;
            case 'oauth2':
                // OAuth 2.0 인증은 복잡하므로 별도 구현 필요
                // 여기서는 이미 토큰이 저장되어 있다고 가정
                if (credentials && credentials.access_token) {
                    headers['Authorization'] = `Bearer ${credentials.access_token}`;
                }
                break;
            case 'none':
                // 인증 없음
                break;
            default:
                throw new Error(`Unsupported authentication type: ${authConfig.type}`);
        }
    }
    /**
     * 요청 바디 처리
     * @param body 요청 바디 템플릿
     * @param params 파라미터
     * @returns 처리된 요청 바디
     */
    static _processRequestBody(body, params) {
        if (typeof body === 'string') {
            // 문자열 바디의 파라미터 참조 치환
            return this._replaceParamRef(body, params);
        }
        else {
            // 객체 바디의 경우 재귀적으로 각 필드의 파라미터 참조 치환
            const processedBody = JSON.parse(JSON.stringify(body));
            this._deepReplaceParams(processedBody, params);
            return processedBody;
        }
    }
    /**
     * 객체 내 모든 문자열 필드의 파라미터 참조를 재귀적으로 치환
     * @param obj 처리할 객체
     * @param params 파라미터
     */
    static _deepReplaceParams(obj, params) {
        if (!obj || typeof obj !== 'object') {
            return;
        }
        for (const key of Object.keys(obj)) {
            const value = obj[key];
            if (typeof value === 'string') {
                obj[key] = this._replaceParamRef(value, params);
            }
            else if (typeof value === 'object' && value !== null) {
                this._deepReplaceParams(value, params);
            }
        }
    }
    /**
     * HTTP 응답 처리
     * @param response Axios 응답
     * @param responseConfig 응답 처리 설정
     * @returns 처리된 응답 데이터
     */
    static _processResponse(response, responseConfig) {
        // 오류 처리
        if (responseConfig.errorHandling?.errorCodes?.includes(response.status)) {
            let errorMessage = 'API request failed';
            if (responseConfig.errorHandling.errorMessagePath) {
                try {
                    // 오류 메시지 추출 경로가 지정된 경우
                    errorMessage = this._extractValueByPath(response.data, responseConfig.errorHandling.errorMessagePath) || errorMessage;
                }
                catch (error) {
                    logger_1.logger.error('Error extracting error message:', error);
                }
            }
            throw new Error(errorMessage);
        }
        // 응답 파싱
        let responseData = response.data;
        // dataPath가 지정된 경우 해당 경로에서 데이터 추출
        if (responseConfig.parse === 'json' && responseConfig.dataPath) {
            try {
                responseData = this._extractValueByPath(responseData, responseConfig.dataPath);
            }
            catch (error) {
                logger_1.logger.error('Error extracting data from response:', error);
            }
        }
        return responseData;
    }
    /**
     * 객체에서 경로로 값 추출
     * @param obj 객체
     * @param path 경로 (예: 'data.items[0].name' 또는 '$.data.items[0].name')
     * @returns 추출된 값
     */
    static _extractValueByPath(obj, path) {
        // JSONPath 형식 처리 (예: '$.data.items[0].name')
        if (path.startsWith('$')) {
            path = path.substring(1);
        }
        // 빈 경로인 경우 전체 객체 반환
        if (!path || path === '$') {
            return obj;
        }
        // 배열 인덱스 처리를 위한 정규식
        const segments = path.split(/\.|\[|\]/).filter(Boolean);
        let result = obj;
        for (const segment of segments) {
            if (!result) {
                return undefined;
            }
            // 숫자인 경우 배열 인덱스로 처리
            const index = Number.parseInt(segment, 10);
            if (!Number.isNaN(index) && Array.isArray(result)) {
                result = result[index];
            }
            else {
                result = result[segment];
            }
        }
        return result;
    }
    /**
     * 오류 응답 형식화
     * @param error 발생한 오류
     * @returns 형식화된 오류 응답
     */
    static _formatErrorResponse(error) {
        // Axios 오류 처리
        if (error.response) {
            return {
                error: true,
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data
            };
        }
        // 요청 오류 또는 네트워크 오류
        if (error.request) {
            return {
                error: true,
                type: 'request_error',
                message: 'Request failed to complete',
                details: error.message
            };
        }
        // 기타 오류
        return {
            error: true,
            type: 'general_error',
            message: error.message || 'Unknown error'
        };
    }
}
exports.PluginHttpClient = PluginHttpClient;
//# sourceMappingURL=http-client.js.map