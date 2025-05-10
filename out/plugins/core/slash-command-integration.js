"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginSlashCommandIntegration = void 0;
const plugin_1 = require("../types/plugin");
const llm_integration_1 = require("./llm-integration");
const http_client_1 = require("./http-client");
const logger_1 = require("../../core/utils/logger");
/**
 * 플러그인 슬래시 커맨드 통합
 */
class PluginSlashCommandIntegration {
    _pluginRegistry;
    _slashCommandManager;
    _pluginCommands = new Map();
    /**
     * 플러그인 슬래시 커맨드 통합 생성
     * @param pluginRegistry 플러그인 레지스트리
     * @param slashCommandManager 슬래시 커맨드 매니저
     */
    constructor(pluginRegistry, slashCommandManager) {
        this._pluginRegistry = pluginRegistry;
        this._slashCommandManager = slashCommandManager;
        // 플러그인 상태 변경 리스너 등록
        this._pluginRegistry.onDidChangePluginState(this._handlePluginStateChange.bind(this));
    }
    /**
     * 플러그인 상태 변경 처리
     * @param pluginId 플러그인 ID
     * @param oldState 이전 상태
     * @param newState 새 상태
     */
    _handlePluginStateChange(pluginId, oldState, newState) {
        const plugin = this._pluginRegistry.getPlugin(pluginId);
        if (!plugin) {
            return;
        }
        // 활성화된 경우 명령어 등록
        if (newState === plugin_1.PluginState.Active && oldState !== plugin_1.PluginState.Active) {
            this._registerPluginCommands(plugin.id);
        }
        // 비활성화된 경우 명령어 해제
        if (oldState === plugin_1.PluginState.Active && newState !== plugin_1.PluginState.Active) {
            this._unregisterPluginCommands(plugin.id);
        }
    }
    /**
     * 모든 활성 플러그인의 명령어 등록
     */
    registerAllPluginCommands() {
        const activePlugins = this._pluginRegistry.getActivePlugins();
        for (const plugin of activePlugins) {
            this._registerPluginCommands(plugin.id);
        }
    }
    /**
     * 플러그인의 명령어 등록
     * @param pluginId 플러그인 ID
     */
    _registerPluginCommands(pluginId) {
        const plugin = this._pluginRegistry.getPlugin(pluginId);
        if (!plugin || !plugin.implementation) {
            return;
        }
        try {
            // 플러그인의 JSON 스키마 가져오기
            // 여기서는 플러그인이 'jsonSchema' 속성을 가진다고 가정
            // 실제 구현에서는 이 부분을 조정해야 함
            const jsonSchema = plugin.jsonSchema;
            if (!jsonSchema) {
                return;
            }
            // 함수마다 슬래시 커맨드 등록
            for (const [functionId, func] of Object.entries(jsonSchema.functions)) {
                const commandName = `${plugin.metadata.id}.${functionId}`;
                // UI 설정 가져오기
                const uiConfig = jsonSchema.commandUI?.[functionId];
                // 슬래시 커맨드 생성
                const slashCommand = {
                    name: uiConfig?.displayName || func.name,
                    description: func.description,
                    // 명령어 실행 함수
                    execute: async (args) => {
                        try {
                            // LLM을 사용하여 파라미터 추출
                            const params = await this._extractParameters(jsonSchema, functionId, args);
                            // HTTP 요청 실행
                            const response = await http_client_1.PluginHttpClient.executeRequest(jsonSchema, functionId, params);
                            // 응답 포맷팅
                            return await this._formatResponse(jsonSchema, functionId, response, params);
                        }
                        catch (error) {
                            logger_1.logger.error(`Error executing plugin command ${commandName}:`, error);
                            return `Error: ${error instanceof Error ? error.message : String(error)}`;
                        }
                    },
                    // 도움말 제공 함수
                    getHelp: () => {
                        let help = `${func.name}: ${func.description}\n\n`;
                        help += 'Parameters:\n';
                        // 파라미터 설명 추가
                        for (const [paramId, param] of Object.entries(func.parameters)) {
                            const required = param.required ? '[필수]' : '[선택]';
                            const defaultValue = param.default !== undefined ? ` (기본값: ${param.default})` : '';
                            const enumValues = param.enum ? ` (가능한 값: ${param.enum.join(', ')})` : '';
                            help += `- ${paramId}: ${param.type} ${required} - ${param.description}${defaultValue}${enumValues}\n`;
                        }
                        // 예제 추가
                        if (jsonSchema.llmIntegration?.examples && jsonSchema.llmIntegration.examples.length > 0) {
                            help += '\n예제:\n';
                            jsonSchema.llmIntegration.examples.forEach((example, index) => {
                                help += `- "${example.input}"\n`;
                            });
                        }
                        return help;
                    },
                    // 자동 완성 제안 제공 함수
                    getCompletions: (partialArgs) => {
                        const completions = [];
                        // 파라미터 자동 완성 제안
                        for (const [paramId, param] of Object.entries(func.parameters)) {
                            // enum 값 제안
                            if (param.enum) {
                                param.enum.forEach(value => {
                                    completions.push(`${paramId}=${value}`);
                                });
                            }
                            else {
                                completions.push(`${paramId}=`);
                            }
                        }
                        // 예제 기반 자동 완성 제안
                        if (jsonSchema.llmIntegration?.examples) {
                            jsonSchema.llmIntegration.examples.forEach(example => {
                                completions.push(example.input);
                            });
                        }
                        return completions.filter(completion => completion.toLowerCase().includes(partialArgs.toLowerCase()));
                    }
                };
                // 슬래시 커맨드 등록
                this._slashCommandManager.registerCommand(slashCommand);
                // 추적을 위해 맵에 저장
                this._pluginCommands.set(commandName, slashCommand);
                logger_1.logger.info(`Registered slash command: ${commandName}`);
            }
        }
        catch (error) {
            logger_1.logger.error(`Error registering commands for plugin ${pluginId}:`, error);
        }
    }
    /**
     * 플러그인의 명령어 해제
     * @param pluginId 플러그인 ID
     */
    _unregisterPluginCommands(pluginId) {
        // 이 플러그인의 모든 명령어 찾기
        const commandsToRemove = [];
        for (const [commandName, _] of this._pluginCommands.entries()) {
            if (commandName.startsWith(`${pluginId}.`)) {
                commandsToRemove.push(commandName);
            }
        }
        // 명령어 해제
        for (const commandName of commandsToRemove) {
            const command = this._pluginCommands.get(commandName);
            if (command) {
                this._slashCommandManager.unregisterCommand(command.name);
                this._pluginCommands.delete(commandName);
                logger_1.logger.info(`Unregistered slash command: ${commandName}`);
            }
        }
    }
    /**
     * LLM을 사용하여 사용자 입력에서 파라미터 추출
     * @param plugin 플러그인 스키마
     * @param functionId 함수 ID
     * @param userInput 사용자 입력
     * @returns 추출된 파라미터
     */
    async _extractParameters(plugin, functionId, userInput) {
        // LLM 기반 추출 사용 여부 확인
        if (plugin.llmIntegration?.useForParameterExtraction) {
            try {
                // LLM 서비스 API 호출
                const llmService = await this._getLLMService();
                if (llmService) {
                    // Function Calling 정의 생성
                    const functionDef = llm_integration_1.LLMIntegration.createFunctionDefinition(plugin, functionId);
                    // LLM API 호출 (OpenAI Function Calling 예시)
                    const response = await llmService.sendFunctionCallingRequest(userInput, functionDef);
                    // 응답에서 파라미터 추출
                    return response.parameters;
                }
            }
            catch (error) {
                logger_1.logger.error(`Error extracting parameters with LLM for ${functionId}:`, error);
                // LLM 추출 실패 시 수동 파싱으로 폴백
            }
        }
        // LLM을 사용하지 않거나 실패한 경우 수동 파싱
        return this._parseParametersManually(plugin, functionId, userInput);
    }
    /**
     * 사용자 입력에서 파라미터 수동 파싱
     * @param plugin 플러그인 스키마
     * @param functionId 함수 ID
     * @param userInput 사용자 입력
     * @returns 추출된 파라미터
     */
    _parseParametersManually(plugin, functionId, userInput) {
        const func = plugin.functions[functionId];
        const result = {};
        // 기본값 설정
        for (const [paramId, param] of Object.entries(func.parameters)) {
            if (param.default !== undefined) {
                result[paramId] = param.default;
            }
        }
        // 파라미터 추출 (name=value 형식)
        const paramRegex = /([a-zA-Z0-9_]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s]*))/g;
        let match;
        while ((match = paramRegex.exec(userInput)) !== null) {
            const paramName = match[1];
            const value = match[3] || match[4] || match[5]; // 따옴표 있는 경우와 없는 경우 모두 처리
            // 파라미터 존재 확인
            if (func.parameters[paramName]) {
                const param = func.parameters[paramName];
                // 타입 변환
                switch (param.type) {
                    case 'number':
                        result[paramName] = Number(value);
                        break;
                    case 'boolean':
                        result[paramName] = value.toLowerCase() === 'true';
                        break;
                    case 'array':
                        try {
                            // 쉼표로 구분된 값을 배열로 변환
                            result[paramName] = value.split(',').map(item => item.trim());
                        }
                        catch (error) {
                            result[paramName] = [];
                        }
                        break;
                    case 'object':
                        try {
                            // JSON 문자열을 객체로 변환
                            result[paramName] = JSON.parse(value);
                        }
                        catch (error) {
                            result[paramName] = {};
                        }
                        break;
                    default:
                        result[paramName] = value;
                }
            }
        }
        // 필수 파라미터 확인
        for (const [paramId, param] of Object.entries(func.parameters)) {
            if (param.required && result[paramId] === undefined) {
                throw new Error(`Required parameter '${paramId}' is missing`);
            }
        }
        return result;
    }
    /**
     * 응답 포맷팅
     * @param plugin 플러그인 스키마
     * @param functionId 함수 ID
     * @param response API 응답
     * @param params 요청 파라미터
     * @returns 포맷팅된 응답
     */
    async _formatResponse(plugin, functionId, response, params) {
        const func = plugin.functions[functionId];
        // LLM 기반 포맷팅 사용 여부 확인
        if (plugin.llmIntegration?.useForResponseFormatting) {
            try {
                // LLM 서비스 API 호출
                const llmService = await this._getLLMService();
                if (llmService) {
                    // 응답 포맷팅 프롬프트 생성
                    const prompt = llm_integration_1.LLMIntegration.createResponseFormattingPrompt(plugin, functionId, response, params);
                    // LLM API 호출
                    const formattedResponse = await llmService.sendTextRequest(prompt);
                    return formattedResponse;
                }
            }
            catch (error) {
                logger_1.logger.error(`Error formatting response with LLM for ${functionId}:`, error);
                // LLM 포맷팅 실패 시 수동 포맷팅으로 폴백
            }
        }
        // LLM을 사용하지 않거나 실패한 경우 수동 포맷팅
        return this._formatResponseManually(func, response, params);
    }
    /**
     * 응답 수동 포맷팅
     * @param func 함수 정의
     * @param response API 응답
     * @param params 요청 파라미터
     * @returns 포맷팅된 응답
     */
    _formatResponseManually(func, response, params) {
        try {
            // 템플릿 기반 포맷팅
            let template = func.response.template;
            // 단순 변수 치환
            template = template.replace(/\{([^{}]+)\}/g, (match, key) => {
                // params에서 값 찾기
                if (params[key] !== undefined) {
                    return String(params[key]);
                }
                // response에서 값 찾기
                const value = this._getValueByPath(response, key);
                if (value !== undefined) {
                    return String(value);
                }
                // 변수를 찾지 못한 경우 원래 표현식 유지
                return match;
            });
            // 기본 배열 반복 처리 (간단한 구현)
            template = this._processEachBlocks(template, response, params);
            // 기본 조건 처리 (간단한 구현)
            template = this._processIfBlocks(template, response, params);
            return template;
        }
        catch (error) {
            logger_1.logger.error('Error formatting response manually:', error);
            // 포맷팅 실패 시 JSON 문자열로 반환
            return '```json\n' + JSON.stringify(response, null, 2) + '\n```';
        }
    }
    /**
     * 객체에서 경로로 값 가져오기
     * @param obj 객체
     * @param path 경로 (점 표기법)
     * @returns 값 또는 undefined
     */
    _getValueByPath(obj, path) {
        const parts = path.split('.');
        let current = obj;
        for (const part of parts) {
            if (current === null || current === undefined) {
                return undefined;
            }
            current = current[part];
        }
        return current;
    }
    /**
     * 각 블록 처리 (간단한 구현)
     * @param template 템플릿
     * @param response 응답
     * @param params 파라미터
     * @returns 처리된 템플릿
     */
    _processEachBlocks(template, response, params) {
        // {#each data}...{/each} 형식 처리
        const eachRegex = /\{#each\s+([^}]+)\}([\s\S]*?)\{\/each\}/g;
        return template.replace(eachRegex, (match, arrayPath, content) => {
            // 배열 가져오기
            const array = this._getValueByPath(response, arrayPath) ||
                this._getValueByPath(params, arrayPath) ||
                [];
            if (!Array.isArray(array)) {
                return '';
            }
            // 각 항목에 대해 콘텐츠 반복
            return array.map((item, index) => {
                let itemContent = content;
                // {item.property} 형식 치환
                itemContent = itemContent.replace(/\{([^{}]+)\}/g, (itemMatch, itemKey) => {
                    // @index, @first, @last와 같은 특수 변수 처리
                    if (itemKey === '@index') {
                        return String(index);
                    }
                    else if (itemKey === '@first') {
                        return index === 0 ? 'true' : 'false';
                    }
                    else if (itemKey === '@last') {
                        return index === array.length - 1 ? 'true' : 'false';
                    }
                    // 일반 속성 접근
                    const value = this._getValueByPath(item, itemKey);
                    if (value !== undefined) {
                        return String(value);
                    }
                    return itemMatch;
                });
                return itemContent;
            }).join('');
        });
    }
    /**
     * 조건 블록 처리 (간단한 구현)
     * @param template 템플릿
     * @param response 응답
     * @param params 파라미터
     * @returns 처리된 템플릿
     */
    _processIfBlocks(template, response, params) {
        // {#if condition}...{#else}...{/if} 형식 처리
        const ifRegex = /\{#if\s+([^}]+)\}([\s\S]*?)(?:\{#else\}([\s\S]*?))?\{\/if\}/g;
        return template.replace(ifRegex, (match, condition, ifContent, elseContent = '') => {
            // 조건 평가
            const value = this._getValueByPath(response, condition) ||
                this._getValueByPath(params, condition);
            const conditionMet = Boolean(value);
            return conditionMet ? ifContent : elseContent;
        });
    }
    /**
     * LLM 서비스 가져오기 (실제 구현에서는 적절한 방식으로 구현 필요)
     * @returns LLM 서비스 또는 undefined
     */
    async _getLLMService() {
        try {
            // LLM 서비스 접근 방법은 실제 구현에 맞게 조정 필요
            // 여기서는 임의의 인터페이스를 가정
            return {
                sendFunctionCallingRequest: async (userInput, functionDef) => {
                    // 실제 구현에서는 여기서 OpenAI 또는 Claude API 호출
                    return { parameters: {} };
                },
                sendTextRequest: async (prompt) => {
                    // 실제 구현에서는 여기서 LLM API 호출
                    return '';
                }
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting LLM service:', error);
            return undefined;
        }
    }
}
exports.PluginSlashCommandIntegration = PluginSlashCommandIntegration;
//# sourceMappingURL=slash-command-integration.js.map