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
exports.PluginValidator = void 0;
const vscode = __importStar(require("vscode"));
const Ajv = __importStar(require("ajv"));
/**
 * Utility class for validating and parsing JSON plugins
 */
class PluginValidator {
    ajv;
    jsonPluginSchema;
    constructor() {
        this.ajv = new Ajv.default({ allErrors: true });
        // Convert TypeScript interface to JSON Schema
        this.jsonPluginSchema = this.buildJsonSchema();
    }
    /**
     * Build JSON schema from TypeScript interface
     * This is a simplified version - in production, we would use a more sophisticated approach
     */
    buildJsonSchema() {
        return {
            type: 'object',
            required: ['metadata', 'functions'],
            properties: {
                metadata: {
                    type: 'object',
                    required: ['id', 'name', 'version'],
                    properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        version: { type: 'string' },
                        description: { type: 'string' },
                        author: { type: 'string' },
                        icon: { type: 'string' },
                        homepage: { type: 'string' },
                        category: { type: 'string' },
                        tags: {
                            type: 'array',
                            items: { type: 'string' }
                        },
                        minExtensionVersion: { type: 'string' }
                    }
                },
                features: {
                    type: 'array',
                    items: {
                        type: 'object',
                        required: ['type', 'id', 'name'],
                        properties: {
                            type: { type: 'string' },
                            id: { type: 'string' },
                            name: { type: 'string' },
                            description: { type: 'string' }
                        }
                    }
                },
                functions: {
                    type: 'object',
                    additionalProperties: {
                        type: 'object',
                        required: ['name', 'description', 'parameters', 'request', 'response'],
                        properties: {
                            name: { type: 'string' },
                            description: { type: 'string' },
                            parameters: {
                                type: 'object',
                                additionalProperties: {
                                    type: 'object',
                                    required: ['name', 'description', 'type', 'required'],
                                    properties: {
                                        name: { type: 'string' },
                                        description: { type: 'string' },
                                        type: {
                                            type: 'string',
                                            enum: ['string', 'number', 'boolean', 'array', 'object']
                                        },
                                        required: { type: 'boolean' },
                                        default: {},
                                        enum: {
                                            type: 'array',
                                            items: { type: 'string' }
                                        },
                                        items: {
                                            type: 'object',
                                            properties: {
                                                type: {
                                                    type: 'string',
                                                    enum: ['string', 'number', 'boolean', 'object']
                                                },
                                                properties: {
                                                    type: 'object',
                                                    additionalProperties: { type: 'object' }
                                                }
                                            }
                                        },
                                        properties: {
                                            type: 'object',
                                            additionalProperties: { type: 'object' }
                                        }
                                    }
                                }
                            },
                            request: {
                                type: 'object',
                                required: ['method', 'baseUrl', 'path'],
                                properties: {
                                    method: {
                                        type: 'string',
                                        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
                                    },
                                    baseUrl: { type: 'string' },
                                    path: { type: 'string' },
                                    headers: {
                                        type: 'object',
                                        additionalProperties: { type: 'string' }
                                    },
                                    query: {
                                        type: 'object',
                                        additionalProperties: { type: 'string' }
                                    },
                                    body: {
                                        oneOf: [
                                            { type: 'string' },
                                            { type: 'object' }
                                        ]
                                    },
                                    auth: {
                                        type: 'object',
                                        properties: {
                                            type: {
                                                type: 'string',
                                                enum: ['basic', 'bearer', 'api_key', 'oauth2']
                                            },
                                            apiKeyName: { type: 'string' },
                                            apiKeyIn: {
                                                type: 'string',
                                                enum: ['header', 'query']
                                            },
                                            token: { type: 'string' },
                                            tokenUrl: { type: 'string' },
                                            authorizationUrl: { type: 'string' },
                                            clientId: { type: 'string' },
                                            clientSecret: { type: 'string' },
                                            scopes: {
                                                type: 'array',
                                                items: { type: 'string' }
                                            }
                                        }
                                    }
                                }
                            },
                            response: {
                                type: 'object',
                                required: ['parse', 'template'],
                                properties: {
                                    parse: {
                                        type: 'string',
                                        enum: ['json', 'text', 'binary']
                                    },
                                    template: { type: 'string' },
                                    dataPath: { type: 'string' },
                                    errorHandling: {
                                        type: 'object',
                                        properties: {
                                            errorCodes: {
                                                type: 'array',
                                                items: { type: 'number' }
                                            },
                                            errorMessagePath: { type: 'string' },
                                            errorTemplate: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                auth: {
                    type: 'object',
                    required: ['type', 'fields'],
                    properties: {
                        type: {
                            type: 'string',
                            enum: ['basic', 'bearer', 'api_key', 'oauth2']
                        },
                        instructions: { type: 'string' },
                        fields: {
                            type: 'object',
                            properties: {
                                username: {
                                    type: 'object',
                                    properties: {
                                        description: { type: 'string' },
                                        required: { type: 'boolean' }
                                    }
                                },
                                password: {
                                    type: 'object',
                                    properties: {
                                        description: { type: 'string' },
                                        required: { type: 'boolean' }
                                    }
                                },
                                apiKey: {
                                    type: 'object',
                                    properties: {
                                        description: { type: 'string' },
                                        required: { type: 'boolean' }
                                    }
                                },
                                token: {
                                    type: 'object',
                                    properties: {
                                        description: { type: 'string' },
                                        required: { type: 'boolean' }
                                    }
                                },
                                clientId: {
                                    type: 'object',
                                    properties: {
                                        description: { type: 'string' },
                                        required: { type: 'boolean' }
                                    }
                                },
                                clientSecret: {
                                    type: 'object',
                                    properties: {
                                        description: { type: 'string' },
                                        required: { type: 'boolean' }
                                    }
                                }
                            }
                        },
                        oauth2: {
                            type: 'object',
                            properties: {
                                authorizationUrl: { type: 'string' },
                                tokenUrl: { type: 'string' },
                                scopes: {
                                    type: 'array',
                                    items: { type: 'string' }
                                },
                                responseType: {
                                    type: 'string',
                                    enum: ['code', 'token']
                                }
                            }
                        }
                    }
                },
                llmIntegration: {
                    type: 'object',
                    required: ['useForParameterExtraction', 'useForResponseFormatting'],
                    properties: {
                        useForParameterExtraction: { type: 'boolean' },
                        useForResponseFormatting: { type: 'boolean' },
                        examples: {
                            type: 'array',
                            items: {
                                type: 'object',
                                required: ['description', 'input', 'output'],
                                properties: {
                                    description: { type: 'string' },
                                    input: { type: 'string' },
                                    output: { type: 'object' }
                                }
                            }
                        },
                        parameterExtractionPrompt: { type: 'string' },
                        responseFormattingPrompt: { type: 'string' }
                    }
                },
                commandUI: {
                    type: 'object',
                    additionalProperties: {
                        type: 'object',
                        properties: {
                            displayName: { type: 'string' },
                            icon: { type: 'string' },
                            category: { type: 'string' },
                            position: { type: 'number' },
                            showInContextMenu: { type: 'boolean' },
                            showInCommandPalette: { type: 'boolean' },
                            enableKeyboardShortcut: { type: 'boolean' },
                            defaultKeyboardShortcut: { type: 'string' }
                        }
                    }
                },
                configuration: {
                    type: 'object',
                    properties: {
                        properties: {
                            type: 'object',
                            additionalProperties: {
                                type: 'object',
                                properties: {
                                    type: {
                                        type: 'string',
                                        enum: ['string', 'number', 'boolean', 'array', 'object']
                                    },
                                    default: {},
                                    description: { type: 'string' },
                                    enum: {
                                        type: 'array',
                                        items: { type: 'string' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        };
    }
    /**
     * Validate a JSON plugin against the schema
     * @param jsonPlugin The JSON plugin to validate
     * @returns Validation result with errors if any
     */
    validateJsonPlugin(jsonPlugin) {
        const validate = this.ajv.compile(this.jsonPluginSchema);
        const valid = validate(jsonPlugin);
        if (valid) {
            return { isValid: true };
        }
        else {
            return {
                isValid: false,
                errors: validate.errors?.map(err => {
                    return `${err.instancePath} ${err.message}`;
                })
            };
        }
    }
    /**
     * Convert a JSON plugin to a plugin instance
     * @param jsonPlugin The JSON plugin schema
     * @param pluginPath The path to the plugin file
     * @returns A plugin instance
     */
    convertJsonToPlugin(jsonPlugin, pluginPath) {
        // Extract metadata from JSON schema
        const metadata = {
            id: jsonPlugin.metadata.id,
            name: jsonPlugin.metadata.name,
            version: jsonPlugin.metadata.version,
            description: jsonPlugin.metadata.description,
            author: jsonPlugin.metadata.author,
            icon: jsonPlugin.metadata.icon,
            homepage: jsonPlugin.metadata.homepage,
            category: jsonPlugin.metadata.category,
            features: jsonPlugin.features,
            configuration: jsonPlugin.configuration,
            enabledByDefault: true,
            isBuiltIn: false
        };
        // Create plugin instance
        const plugin = {
            activate: async (context) => {
                // Register commands for each function
                for (const [functionId, functionDef] of Object.entries(jsonPlugin.functions)) {
                    const commandId = `${jsonPlugin.metadata.id}.${functionId}`;
                    context.subscriptions.push(vscode.commands.registerCommand(commandId, async (...args) => {
                        // This is a simplified implementation
                        // In a real implementation, we would:
                        // 1. Extract parameters from args or prompt user
                        // 2. Make the API request
                        // 3. Format the response
                        // 4. Display to user
                        // For now, just show a message
                        await vscode.window.showInformationMessage(`Executing ${functionDef.name}: ${functionDef.description}`);
                    }));
                    // Log successful registration
                    context.log(`Registered command ${commandId}`);
                }
            },
            deactivate: async () => {
                // Plugin cleanup logic would go here
            }
        };
        return { metadata, plugin };
    }
    /**
     * Parse a JSON plugin file
     * @param content The file content as string
     * @returns Parsed JSON plugin or null if parsing fails
     */
    parseJsonPluginFile(content) {
        try {
            const jsonPlugin = JSON.parse(content);
            return jsonPlugin;
        }
        catch (error) {
            console.error('Failed to parse JSON plugin:', error);
            return null;
        }
    }
}
exports.PluginValidator = PluginValidator;
//# sourceMappingURL=validators.js.map