"use strict";
/**
 * 플러그인 시스템 - 타입 정의
 *
 * JSON 기반 플러그인 정의와 LLM 에이전트 기반 플러그인 시스템을 위한 타입 정의
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParameterType = exports.HttpMethod = exports.PluginAuthType = void 0;
/**
 * 플러그인 인증 유형
 */
var PluginAuthType;
(function (PluginAuthType) {
    PluginAuthType["NONE"] = "none";
    PluginAuthType["API_KEY"] = "api_key";
    PluginAuthType["BASIC"] = "basic";
    PluginAuthType["BEARER"] = "bearer";
    PluginAuthType["OAUTH2"] = "oauth2"; // OAuth2 인증
})(PluginAuthType || (exports.PluginAuthType = PluginAuthType = {}));
/**
 * API 요청 메서드
 */
var HttpMethod;
(function (HttpMethod) {
    HttpMethod["GET"] = "GET";
    HttpMethod["POST"] = "POST";
    HttpMethod["PUT"] = "PUT";
    HttpMethod["DELETE"] = "DELETE";
    HttpMethod["PATCH"] = "PATCH";
    HttpMethod["HEAD"] = "HEAD";
    HttpMethod["OPTIONS"] = "OPTIONS";
})(HttpMethod || (exports.HttpMethod = HttpMethod = {}));
/**
 * 파라미터 타입
 */
var ParameterType;
(function (ParameterType) {
    ParameterType["STRING"] = "string";
    ParameterType["NUMBER"] = "number";
    ParameterType["BOOLEAN"] = "boolean";
    ParameterType["ARRAY"] = "array";
    ParameterType["OBJECT"] = "object";
})(ParameterType || (exports.ParameterType = ParameterType = {}));
//# sourceMappingURL=plugin.js.map