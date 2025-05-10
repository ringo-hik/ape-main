import { PluginFeatureType } from './plugin';
/**
 * JSON Plugin Schema for APE Extension
 *
 * This schema defines the structure of JSON-based plugins that can be loaded
 * by the APE Extension without requiring TypeScript code.
 */
/**
 * Parameter definition for a function
 */
export interface ParameterDefinition {
    /** Parameter name */
    name: string;
    /** Parameter description */
    description: string;
    /** Parameter type */
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    /** Whether the parameter is required */
    required: boolean;
    /** Default value for the parameter */
    default?: any;
    /** For string type, enumeration of allowed values */
    enum?: string[];
    /** For array type, the type of items in the array */
    items?: {
        type: 'string' | 'number' | 'boolean' | 'object';
        properties?: Record<string, ParameterDefinition>;
    };
    /** For object type, the properties of the object */
    properties?: Record<string, ParameterDefinition>;
}
/**
 * Function definition for a JSON plugin
 */
export interface FunctionDefinition {
    /** Function name (used as command name) */
    name: string;
    /** Function description */
    description: string;
    /** Parameters for the function */
    parameters: Record<string, ParameterDefinition>;
    /** HTTP request configuration */
    request: {
        /** HTTP method */
        method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
        /** Base URL for the request */
        baseUrl: string;
        /** Path for the request (can include parameter placeholders like {param}) */
        path: string;
        /** Headers to include with the request */
        headers?: Record<string, string>;
        /** Query parameters */
        query?: Record<string, string>;
        /** Request body template (can include parameter references) */
        body?: string | Record<string, any>;
        /** Authentication configuration */
        auth?: {
            /** Authentication type */
            type: 'basic' | 'bearer' | 'api_key' | 'oauth2';
            /** For api_key type, the header or query parameter name */
            apiKeyName?: string;
            /** For api_key type, whether to send as header or query parameter */
            apiKeyIn?: 'header' | 'query';
            /** For bearer type, the token */
            token?: string;
            /** For oauth2 type, the token URL */
            tokenUrl?: string;
            /** For oauth2 type, the authorization URL */
            authorizationUrl?: string;
            /** For oauth2 type, the client ID */
            clientId?: string;
            /** For oauth2 type, the client secret */
            clientSecret?: string;
            /** For oauth2 type, the scopes to request */
            scopes?: string[];
        };
    };
    /** Response handling configuration */
    response: {
        /** How to parse the response */
        parse: 'json' | 'text' | 'binary';
        /** Template for formatting the response data as a message */
        template: string;
        /** JSON path for extracting data from the response */
        dataPath?: string;
        /** Error handling configuration */
        errorHandling?: {
            /** Status codes to consider as errors */
            errorCodes?: number[];
            /** JSON path for extracting error message */
            errorMessagePath?: string;
            /** Template for formatting error messages */
            errorTemplate?: string;
        };
    };
}
/**
 * Authentication configuration for the plugin
 */
export interface AuthConfig {
    /** Type of authentication */
    type: 'basic' | 'bearer' | 'api_key' | 'oauth2';
    /** Authentication setup instructions for users */
    instructions?: string;
    /** Fields to collect from the user */
    fields: {
        /** For basic auth: username and password */
        username?: {
            description: string;
            required: boolean;
        };
        password?: {
            description: string;
            required: boolean;
        };
        /** For API key auth */
        apiKey?: {
            description: string;
            required: boolean;
        };
        /** For bearer token auth */
        token?: {
            description: string;
            required: boolean;
        };
        /** For OAuth2 */
        clientId?: {
            description: string;
            required: boolean;
        };
        clientSecret?: {
            description: string;
            required: boolean;
        };
    };
    /** OAuth2 specific configuration */
    oauth2?: {
        authorizationUrl: string;
        tokenUrl: string;
        scopes: string[];
        responseType: 'code' | 'token';
    };
}
/**
 * LLM integration configuration for the plugin
 */
export interface LLMIntegration {
    /** Whether to use LLM for parameter extraction */
    useForParameterExtraction: boolean;
    /** Whether to use LLM for response formatting */
    useForResponseFormatting: boolean;
    /** Examples for function call format to help the LLM understand the function */
    examples?: Array<{
        description: string;
        input: string;
        output: Record<string, any>;
    }>;
    /** Prompt template for parameter extraction */
    parameterExtractionPrompt?: string;
    /** Prompt template for response formatting */
    responseFormattingPrompt?: string;
}
/**
 * Command UI definition
 */
export interface CommandUIDefinition {
    /** Display name for the command */
    displayName: string;
    /** Icon to use for the command (path to SVG or icon name) */
    icon?: string;
    /** Category for grouping in the command palette */
    category?: string;
    /** Position in the command list (lower numbers appear first) */
    position?: number;
    /** Whether to show this command in the context menu */
    showInContextMenu?: boolean;
    /** Whether to show this command in the command palette */
    showInCommandPalette?: boolean;
    /** Whether to enable keyboard shortcut */
    enableKeyboardShortcut?: boolean;
    /** Default keyboard shortcut if enabled */
    defaultKeyboardShortcut?: string;
}
/**
 * JSON Plugin definition
 */
export interface JSONPluginSchema {
    /** Plugin metadata */
    metadata: {
        /** Unique plugin identifier */
        id: string;
        /** Display name */
        name: string;
        /** Plugin version */
        version: string;
        /** Plugin description */
        description?: string;
        /** Plugin author */
        author?: string;
        /** Path to icon (if any) */
        icon?: string;
        /** Plugin homepage/repository */
        homepage?: string;
        /** Plugin category for grouping */
        category?: string;
        /** Tags for searching/filtering */
        tags?: string[];
        /** Minimum extension version required */
        minExtensionVersion?: string;
    };
    /** Features provided by this plugin */
    features: Array<{
        /** Feature type */
        type: PluginFeatureType;
        /** Feature ID (must be unique within the plugin) */
        id: string;
        /** Display name for the feature */
        name: string;
        /** Feature description */
        description?: string;
    }>;
    /** Functions/commands provided by this plugin */
    functions: Record<string, FunctionDefinition>;
    /** Authentication configuration */
    auth?: AuthConfig;
    /** LLM integration configuration */
    llmIntegration?: LLMIntegration;
    /** UI configuration for commands */
    commandUI?: Record<string, CommandUIDefinition>;
    /** Configuration schema */
    configuration?: {
        /** Configuration properties */
        properties: Record<string, {
            /** Value type */
            type: 'string' | 'number' | 'boolean' | 'array' | 'object';
            /** Default value */
            default?: any;
            /** Description */
            description?: string;
            /** Enumeration of allowed values (for string type) */
            enum?: string[];
        }>;
    };
}
/**
 * JSON Plugin validation result
 */
export interface JSONPluginValidationResult {
    /** Is the plugin valid? */
    isValid: boolean;
    /** Validation errors if any */
    errors?: string[];
    /** Validation warnings if any */
    warnings?: string[];
}
