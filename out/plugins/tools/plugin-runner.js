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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginRunner = void 0;
const vscode = __importStar(require("vscode"));
const logger_1 = require("../../core/utils/logger");
/**
 * Template engine for plugin response formatting
 */
class TemplateEngine {
    /**
     * Simple template rendering engine
     * @param template Template string with Handlebars-like syntax
     * @param data Data to use in the template
     * @returns Rendered string
     */
    static render(template, data) {
        // This is a very simplified template engine
        // In a real implementation, we would use a proper template engine like Handlebars
        // Replace simple variables
        let result = template.replace(/\{([^{}]+)\}/g, (match, key) => {
            const keyPath = key.trim().split('.');
            let value = data;
            for (const k of keyPath) {
                if (value === undefined || value === null) {
                    return '';
                }
                value = value[k];
            }
            return value !== undefined && value !== null ? String(value) : '';
        });
        return result;
    }
}
/**
 * Plugin runner for executing plugin commands
 */
class PluginRunner {
    extensionContext;
    constructor(extensionContext) {
        this.extensionContext = extensionContext;
    }
    /**
     * Execute a plugin function
     * @param plugin The plugin schema
     * @param functionId The function ID to execute
     * @param params Parameters for the function
     */
    async executeFunction(plugin, functionId, params) {
        try {
            // Get function definition
            const func = plugin.functions[functionId];
            if (!func) {
                throw new Error(`Function ${functionId} not found in plugin ${plugin.metadata.id}`);
            }
            // Validate and prepare parameters
            const processedParams = this.processParameters(func.parameters, params);
            // Prepare the request
            const request = this.prepareRequest(func.request, processedParams, plugin);
            // Create output channel
            const outputChannel = vscode.window.createOutputChannel(`APE Plugin: ${plugin.metadata.name} - ${func.name}`);
            outputChannel.show();
            outputChannel.appendLine(`Executing: ${func.name}`);
            outputChannel.appendLine(`Description: ${func.description}`);
            outputChannel.appendLine('');
            outputChannel.appendLine('Parameters:');
            for (const [key, value] of Object.entries(processedParams)) {
                outputChannel.appendLine(`- ${key}: ${JSON.stringify(value)}`);
            }
            outputChannel.appendLine('');
            outputChannel.appendLine('Request:');
            outputChannel.appendLine(`${request.method} ${request.url}`);
            if (request.headers) {
                outputChannel.appendLine('Headers:');
                for (const [key, value] of Object.entries(request.headers)) {
                    // Don't log authorization headers
                    if (key.toLowerCase() === 'authorization') {
                        outputChannel.appendLine(`- ${key}: ********`);
                    }
                    else {
                        outputChannel.appendLine(`- ${key}: ${value}`);
                    }
                }
            }
            if (request.body) {
                outputChannel.appendLine('');
                outputChannel.appendLine('Body:');
                outputChannel.appendLine(typeof request.body === 'string'
                    ? request.body
                    : JSON.stringify(request.body, null, 2));
            }
            outputChannel.appendLine('');
            outputChannel.appendLine('Executing request...');
            // In a real implementation, we would make the actual HTTP request
            // For this example, we'll simulate a response
            // Simulate delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            // Simulate response
            const response = this.simulateResponse(func);
            outputChannel.appendLine('');
            outputChannel.appendLine('Response:');
            outputChannel.appendLine(JSON.stringify(response, null, 2));
            // Process response
            let formattedResponse;
            if (func.response.parse === 'json') {
                // Extract data using JSON path if specified
                let responseData = response;
                if (func.response.dataPath) {
                    // Simplified data path extraction - in a real implementation,
                    // we would use a proper JSON path library
                    const path = func.response.dataPath.replace('$', '').split('.');
                    let current = response;
                    for (const segment of path) {
                        if (segment && current) {
                            current = current[segment];
                        }
                    }
                    responseData = current;
                }
                // Apply template
                formattedResponse = TemplateEngine.render(func.response.template, {
                    ...processedParams,
                    data: responseData,
                    ...response
                });
            }
            else {
                // For text and binary responses, just use the template
                formattedResponse = TemplateEngine.render(func.response.template, {
                    ...processedParams,
                    response
                });
            }
            outputChannel.appendLine('');
            outputChannel.appendLine('Formatted Response:');
            outputChannel.appendLine(formattedResponse);
            return formattedResponse;
        }
        catch (error) {
            logger_1.logger.error(`Error executing plugin function ${functionId}:`, error);
            throw error;
        }
    }
    /**
     * Process and validate function parameters
     * @param paramDefs Parameter definitions
     * @param params Provided parameters
     * @returns Processed parameters
     */
    processParameters(paramDefs, params) {
        const result = {};
        // Process each parameter
        for (const [paramId, paramDef] of Object.entries(paramDefs)) {
            const value = params[paramId];
            // Check required parameters
            if (paramDef.required && (value === undefined || value === null)) {
                throw new Error(`Required parameter ${paramId} is missing`);
            }
            // Use default value if not provided
            if (value === undefined && paramDef.default !== undefined) {
                result[paramId] = paramDef.default;
                continue;
            }
            // Skip if no value and not required
            if (value === undefined) {
                continue;
            }
            // Validate value type
            switch (paramDef.type) {
                case 'string':
                    if (typeof value !== 'string') {
                        throw new Error(`Parameter ${paramId} must be a string`);
                    }
                    // Validate enum values
                    if (paramDef.enum && !paramDef.enum.includes(value)) {
                        throw new Error(`Parameter ${paramId} must be one of: ${paramDef.enum.join(', ')}`);
                    }
                    result[paramId] = value;
                    break;
                case 'number':
                    if (typeof value !== 'number') {
                        throw new Error(`Parameter ${paramId} must be a number`);
                    }
                    result[paramId] = value;
                    break;
                case 'boolean':
                    if (typeof value !== 'boolean') {
                        throw new Error(`Parameter ${paramId} must be a boolean`);
                    }
                    result[paramId] = value;
                    break;
                case 'array':
                    if (!Array.isArray(value)) {
                        throw new Error(`Parameter ${paramId} must be an array`);
                    }
                    result[paramId] = value;
                    break;
                case 'object':
                    if (typeof value !== 'object' || value === null) {
                        throw new Error(`Parameter ${paramId} must be an object`);
                    }
                    result[paramId] = value;
                    break;
                default:
                    throw new Error(`Unsupported parameter type: ${paramDef.type}`);
            }
        }
        return result;
    }
    /**
     * Prepare HTTP request
     * @param requestDef Request definition
     * @param params Processed parameters
     * @param plugin Plugin schema
     * @returns Request object
     */
    prepareRequest(requestDef, params, plugin) {
        // Resolve path parameters
        let path = requestDef.path;
        // Replace path parameters
        path = path.replace(/\{([^{}]+)\}/g, (match, key) => {
            const paramValue = params[key];
            if (paramValue === undefined) {
                throw new Error(`Path parameter ${key} is not provided`);
            }
            return encodeURIComponent(String(paramValue));
        });
        // Resolve base URL
        let baseUrl = requestDef.baseUrl;
        // Replace config variables
        baseUrl = baseUrl.replace(/\{([^{}]+)\}/g, (match, key) => {
            // In a real implementation, we would get this from the plugin configuration
            // For this example, we'll just use a placeholder value
            return key === 'jiraBaseUrl' ? 'https://jira.example.com' : match;
        });
        // Prepare URL with query parameters
        let url = baseUrl + path;
        if (requestDef.query) {
            const queryParams = [];
            for (const [key, value] of Object.entries(requestDef.query)) {
                // Replace parameter references
                let paramValue = value;
                paramValue = paramValue.replace(/\{([^{}]+)\}/g, (match, paramKey) => {
                    const param = params[paramKey];
                    return param !== undefined ? String(param) : '';
                });
                // Skip empty values
                if (paramValue) {
                    queryParams.push(`${key}=${encodeURIComponent(paramValue)}`);
                }
            }
            if (queryParams.length > 0) {
                url += `?${queryParams.join('&')}`;
            }
        }
        // Prepare headers
        const headers = { ...requestDef.headers };
        // Add authentication headers
        if (requestDef.auth) {
            switch (requestDef.auth.type) {
                case 'basic':
                    // In a real implementation, we would get credentials from secure storage
                    headers['Authorization'] = 'Basic ' +
                        Buffer.from('username:password').toString('base64');
                    break;
                case 'bearer':
                    // In a real implementation, we would get token from secure storage
                    headers['Authorization'] = 'Bearer token123';
                    break;
                case 'api_key':
                    const apiKeyName = requestDef.auth.apiKeyName || 'api-key';
                    const apiKeyIn = requestDef.auth.apiKeyIn || 'header';
                    if (apiKeyIn === 'header') {
                        headers[apiKeyName] = 'api-key-value';
                    }
                    else if (apiKeyIn === 'query') {
                        // Add API key to query string
                        url += url.includes('?') ? '&' : '?';
                        url += `${apiKeyName}=api-key-value`;
                    }
                    break;
            }
        }
        // Prepare body
        let body = undefined;
        if (requestDef.body) {
            if (typeof requestDef.body === 'string') {
                // Replace parameter references in string body
                body = requestDef.body.replace(/\{([^{}]+)\}/g, (match, key) => {
                    const paramValue = params[key];
                    return paramValue !== undefined ? String(paramValue) : '';
                });
            }
            else {
                // Clone the body object
                body = JSON.parse(JSON.stringify(requestDef.body));
                // Replace parameter references in object body
                const replaceInObject = (obj) => {
                    for (const key of Object.keys(obj)) {
                        const value = obj[key];
                        if (typeof value === 'string') {
                            obj[key] = value.replace(/\{([^{}]+)\}/g, (match, paramKey) => {
                                const paramValue = params[paramKey];
                                return paramValue !== undefined ? paramValue : '';
                            });
                        }
                        else if (typeof value === 'object' && value !== null) {
                            replaceInObject(value);
                        }
                    }
                };
                replaceInObject(body);
            }
        }
        return {
            method: requestDef.method,
            url,
            headers,
            body
        };
    }
    /**
     * Simulate response for a function
     * @param func Function definition
     * @returns Simulated response data
     */
    simulateResponse(func) {
        // This is just a simulation for testing purposes
        // In a real implementation, we would make an actual HTTP request
        switch (func.name) {
            case 'listIssues':
                return [
                    {
                        id: 1,
                        number: 101,
                        title: 'Fix login page bug',
                        state: 'open',
                        user: { login: 'user1' },
                        created_at: '2023-01-10T10:00:00Z',
                        labels: [{ name: 'bug' }, { name: 'high' }],
                        body: 'Users are unable to login when using Safari browser.'
                    },
                    {
                        id: 2,
                        number: 102,
                        title: 'Add dark mode support',
                        state: 'open',
                        user: { login: 'user2' },
                        created_at: '2023-01-12T14:30:00Z',
                        labels: [{ name: 'enhancement' }, { name: 'ui' }],
                        body: 'Implement dark mode following the design mockups.'
                    }
                ];
            case 'createIssue':
                return {
                    id: 3,
                    number: 103,
                    title: 'New feature request',
                    html_url: 'https://github.com/org/repo/issues/103',
                    created_at: '2023-01-15T09:45:00Z'
                };
            case 'findIssues':
                return {
                    issues: [
                        {
                            key: 'PROJECT-123',
                            fields: {
                                summary: 'Fix login page bug',
                                issuetype: { name: 'Bug' },
                                status: { name: 'In Progress' },
                                priority: { name: 'High' },
                                assignee: { displayName: 'John Doe' },
                                created: '2023-01-10T10:00:00.000+0000',
                                updated: '2023-01-14T15:30:00.000+0000',
                                description: 'Users are unable to login when using Safari browser.'
                            }
                        },
                        {
                            key: 'PROJECT-124',
                            fields: {
                                summary: 'Add dark mode support',
                                issuetype: { name: 'Task' },
                                status: { name: 'To Do' },
                                priority: { name: 'Medium' },
                                assignee: { displayName: 'Jane Smith' },
                                created: '2023-01-12T14:30:00.000+0000',
                                updated: '2023-01-12T14:30:00.000+0000',
                                description: 'Implement dark mode following the design mockups.'
                            }
                        }
                    ],
                    total: 2
                };
            case 'getIssue':
                return {
                    key: 'PROJECT-123',
                    fields: {
                        summary: 'Fix login page bug',
                        issuetype: { name: 'Bug' },
                        status: { name: 'In Progress' },
                        priority: { name: 'High' },
                        assignee: { displayName: 'John Doe' },
                        reporter: { displayName: 'Manager User' },
                        created: '2023-01-10T10:00:00.000+0000',
                        updated: '2023-01-14T15:30:00.000+0000',
                        description: 'Users are unable to login when using Safari browser.',
                        comment: {
                            comments: [
                                {
                                    author: { displayName: 'John Doe' },
                                    created: '2023-01-12T10:15:00.000+0000',
                                    body: 'I have reproduced the issue and am working on a fix.'
                                },
                                {
                                    author: { displayName: 'Manager User' },
                                    created: '2023-01-13T09:30:00.000+0000',
                                    body: 'Please prioritize this as it is blocking our release.'
                                }
                            ]
                        },
                        attachment: [
                            {
                                filename: 'screenshot.png',
                                content: 'https://example.com/attachments/screenshot.png',
                                sizeInBytes: 256000,
                                created: '2023-01-11T11:20:00.000+0000'
                            }
                        ]
                    }
                };
            case 'getActiveSprints':
                return {
                    values: [
                        {
                            id: 1001,
                            name: 'Sprint 10',
                            state: 'active',
                            startDate: '2023-01-01T00:00:00.000+0000',
                            endDate: '2023-01-14T23:59:59.000+0000',
                            goal: 'Complete core features for Q1 release'
                        }
                    ]
                };
            case 'getSprintIssues':
                return {
                    issues: [
                        {
                            key: 'PROJECT-123',
                            fields: {
                                summary: 'Fix login page bug',
                                issuetype: { name: 'Bug' },
                                status: { name: 'In Progress' },
                                priority: { name: 'High' },
                                assignee: { displayName: 'John Doe' }
                            }
                        },
                        {
                            key: 'PROJECT-124',
                            fields: {
                                summary: 'Add dark mode support',
                                issuetype: { name: 'Task' },
                                status: { name: 'To Do' },
                                priority: { name: 'Medium' },
                                assignee: { displayName: 'Jane Smith' }
                            }
                        }
                    ]
                };
            default:
                return {
                    message: 'Simulated response for ' + func.name
                };
        }
    }
}
exports.PluginRunner = PluginRunner;
//# sourceMappingURL=plugin-runner.js.map