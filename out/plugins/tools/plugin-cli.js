#!/usr/bin/env node
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
exports.PluginCLI = void 0;
const fs = __importStar(require("fs"));
const validators_1 = require("../core/validators");
const plugin_1 = require("../types/plugin");
/**
 * CLI tool for validating and testing JSON plugins
 */
class PluginCLI {
    validator;
    constructor() {
        this.validator = new validators_1.PluginValidator();
    }
    /**
     * Print help information
     */
    printHelp() {
        console.log('APE Plugin CLI Tool');
        console.log('------------------');
        console.log('');
        console.log('Commands:');
        console.log('  validate <file>        Validate a JSON plugin file');
        console.log('  analyze <file>         Analyze a JSON plugin and show its structure');
        console.log('  create-template        Create a template JSON plugin file');
        console.log('  help                   Show this help information');
        console.log('');
        console.log('Examples:');
        console.log('  plugin-cli validate plugins/github-plugin.json');
        console.log('  plugin-cli analyze plugins/jira-plugin.json');
        console.log('  plugin-cli create-template > my-plugin.json');
        console.log('');
    }
    /**
     * Validate a JSON plugin file
     * @param filePath Path to the plugin file
     */
    validatePlugin(filePath) {
        try {
            if (!fs.existsSync(filePath)) {
                console.error(`Error: File not found: ${filePath}`);
                process.exit(1);
            }
            const content = fs.readFileSync(filePath, 'utf8');
            const jsonPlugin = this.validator.parseJsonPluginFile(content);
            if (!jsonPlugin) {
                console.error('Error: Failed to parse plugin file as JSON');
                process.exit(1);
            }
            const validationResult = this.validator.validateJsonPlugin(jsonPlugin);
            if (validationResult.isValid) {
                console.log(`✅ Plugin "${jsonPlugin.metadata.name}" (${jsonPlugin.metadata.id}) is valid.`);
                // Print basic plugin info
                console.log('');
                console.log('Plugin details:');
                console.log(`Name: ${jsonPlugin.metadata.name}`);
                console.log(`ID: ${jsonPlugin.metadata.id}`);
                console.log(`Version: ${jsonPlugin.metadata.version}`);
                console.log(`Description: ${jsonPlugin.metadata.description || 'N/A'}`);
                console.log(`Author: ${jsonPlugin.metadata.author || 'N/A'}`);
                console.log(`Functions: ${Object.keys(jsonPlugin.functions).length}`);
            }
            else {
                console.error('❌ Plugin validation failed');
                console.error('');
                console.error('Validation errors:');
                validationResult.errors?.forEach(error => {
                    console.error(`- ${error}`);
                });
                process.exit(1);
            }
        }
        catch (error) {
            console.error('Error validating plugin:', error);
            process.exit(1);
        }
    }
    /**
     * Analyze a JSON plugin file and print its structure
     * @param filePath Path to the plugin file
     */
    analyzePlugin(filePath) {
        try {
            if (!fs.existsSync(filePath)) {
                console.error(`Error: File not found: ${filePath}`);
                process.exit(1);
            }
            const content = fs.readFileSync(filePath, 'utf8');
            const jsonPlugin = this.validator.parseJsonPluginFile(content);
            if (!jsonPlugin) {
                console.error('Error: Failed to parse plugin file as JSON');
                process.exit(1);
            }
            console.log(`Analyzing plugin: ${jsonPlugin.metadata.name} (${jsonPlugin.metadata.id})`);
            console.log('=====================================');
            console.log('');
            // Basic info
            console.log('📄 Basic Information:');
            console.log(`Name: ${jsonPlugin.metadata.name}`);
            console.log(`ID: ${jsonPlugin.metadata.id}`);
            console.log(`Version: ${jsonPlugin.metadata.version}`);
            console.log(`Description: ${jsonPlugin.metadata.description || 'N/A'}`);
            console.log(`Author: ${jsonPlugin.metadata.author || 'N/A'}`);
            console.log(`Category: ${jsonPlugin.metadata.category || 'N/A'}`);
            console.log(`Tags: ${jsonPlugin.metadata.tags?.join(', ') || 'N/A'}`);
            console.log('');
            // Features
            console.log('⚙️ Features:');
            if (jsonPlugin.features && jsonPlugin.features.length > 0) {
                jsonPlugin.features.forEach(feature => {
                    console.log(`- [${feature.type}] ${feature.name}: ${feature.description || 'No description'}`);
                });
            }
            else {
                console.log('No features defined');
            }
            console.log('');
            // Functions
            console.log('🔧 Functions:');
            const functionIds = Object.keys(jsonPlugin.functions);
            if (functionIds.length > 0) {
                functionIds.forEach(id => {
                    const func = jsonPlugin.functions[id];
                    console.log(`- ${id}: ${func.description}`);
                    // Parameters
                    console.log('  Parameters:');
                    Object.entries(func.parameters).forEach(([paramId, param]) => {
                        const required = param.required ? '(required)' : '(optional)';
                        const defaultValue = param.default !== undefined ? ` default=${param.default}` : '';
                        console.log(`  - ${paramId}: ${param.type} ${required}${defaultValue}`);
                    });
                    // Request info
                    console.log(`  Request: ${func.request.method} ${func.request.path}`);
                    console.log(`  Auth Type: ${func.request.auth?.type || 'none'}`);
                    console.log('');
                });
            }
            else {
                console.log('No functions defined');
            }
            console.log('');
            // Authentication
            console.log('🔒 Authentication:');
            if (jsonPlugin.auth) {
                console.log(`Type: ${jsonPlugin.auth.type}`);
                if (jsonPlugin.auth.instructions) {
                    console.log(`Instructions: ${jsonPlugin.auth.instructions}`);
                }
                console.log('Fields:');
                Object.entries(jsonPlugin.auth.fields).forEach(([fieldId, field]) => {
                    const required = field.required ? '(required)' : '(optional)';
                    console.log(`- ${fieldId}: ${field.description} ${required}`);
                });
            }
            else {
                console.log('No authentication configuration defined');
            }
            console.log('');
            // LLM Integration
            console.log('🧠 LLM Integration:');
            if (jsonPlugin.llmIntegration) {
                console.log(`Parameter Extraction: ${jsonPlugin.llmIntegration.useForParameterExtraction ? 'Enabled' : 'Disabled'}`);
                console.log(`Response Formatting: ${jsonPlugin.llmIntegration.useForResponseFormatting ? 'Enabled' : 'Disabled'}`);
                if (jsonPlugin.llmIntegration.examples && jsonPlugin.llmIntegration.examples.length > 0) {
                    console.log(`Examples: ${jsonPlugin.llmIntegration.examples.length}`);
                    jsonPlugin.llmIntegration.examples.forEach((example, index) => {
                        console.log(`Example ${index + 1}: ${example.description}`);
                    });
                }
            }
            else {
                console.log('No LLM integration configuration defined');
            }
            console.log('');
            // UI Configuration
            console.log('🖥️ UI Configuration:');
            if (jsonPlugin.commandUI) {
                Object.entries(jsonPlugin.commandUI).forEach(([commandId, ui]) => {
                    console.log(`- ${commandId}:`);
                    console.log(`  Display Name: ${ui.displayName}`);
                    console.log(`  Category: ${ui.category || 'Default'}`);
                    console.log(`  Position: ${ui.position || 'Default'}`);
                    console.log(`  Icon: ${ui.icon || 'None'}`);
                    console.log(`  Command Palette: ${ui.showInCommandPalette ? 'Visible' : 'Hidden'}`);
                    console.log(`  Context Menu: ${ui.showInContextMenu ? 'Visible' : 'Hidden'}`);
                    console.log('');
                });
            }
            else {
                console.log('No UI configuration defined');
            }
            console.log('');
            // Configuration
            console.log('⚙️ Configuration:');
            if (jsonPlugin.configuration && jsonPlugin.configuration.properties) {
                Object.entries(jsonPlugin.configuration.properties).forEach(([propId, prop]) => {
                    const defaultValue = prop.default !== undefined ? ` (default: ${prop.default})` : '';
                    console.log(`- ${propId}: ${prop.type}${defaultValue}`);
                    console.log(`  ${prop.description || 'No description'}`);
                });
            }
            else {
                console.log('No configuration properties defined');
            }
        }
        catch (error) {
            console.error('Error analyzing plugin:', error);
            process.exit(1);
        }
    }
    /**
     * Create a template JSON plugin file
     */
    createTemplate() {
        const template = {
            metadata: {
                id: 'my.awesome-plugin',
                name: 'My Awesome Plugin',
                version: '1.0.0',
                description: 'A plugin for the APE Extension',
                author: 'Your Name',
                icon: 'plugin-icon.svg',
                category: 'Development',
                tags: ['example', 'template']
            },
            features: [
                {
                    type: plugin_1.PluginFeatureType.Command,
                    id: 'example-command',
                    name: 'Example Command',
                    description: 'An example command provided by this plugin'
                }
            ],
            functions: {
                helloWorld: {
                    name: 'helloWorld',
                    description: 'A simple hello world function',
                    parameters: {
                        name: {
                            name: 'name',
                            description: 'Your name',
                            type: 'string',
                            required: true
                        },
                        greeting: {
                            name: 'greeting',
                            description: 'Custom greeting',
                            type: 'string',
                            required: false,
                            default: 'Hello'
                        }
                    },
                    request: {
                        method: 'GET',
                        baseUrl: 'https://httpbin.org',
                        path: '/get',
                        headers: {
                            'Accept': 'application/json',
                            'User-Agent': 'APE-Plugin-Template'
                        },
                        query: {
                            'name': '{name}',
                            'greeting': '{greeting}'
                        },
                        auth: {
                            type: 'basic'
                        }
                    },
                    response: {
                        parse: 'json',
                        template: '# {greeting}, {name}!\n\nYour request was successful!\n\n```json\n{data}\n```'
                    }
                }
            },
            auth: {
                type: 'api_key',
                instructions: 'To use this plugin, you need an API key. You can get one by...',
                fields: {
                    apiKey: {
                        description: 'API Key',
                        required: true
                    }
                }
            },
            llmIntegration: {
                useForParameterExtraction: true,
                useForResponseFormatting: true,
                examples: [
                    {
                        description: 'Basic greeting',
                        input: 'Say hello to John',
                        output: {
                            name: 'John',
                            greeting: 'Hello'
                        }
                    },
                    {
                        description: 'Custom greeting',
                        input: 'Greet Mary with Howdy',
                        output: {
                            name: 'Mary',
                            greeting: 'Howdy'
                        }
                    }
                ]
            },
            commandUI: {
                helloWorld: {
                    displayName: 'Say Hello',
                    icon: 'greeting.svg',
                    category: 'Greetings',
                    position: 1,
                    showInCommandPalette: true,
                    showInContextMenu: false
                }
            },
            configuration: {
                properties: {
                    defaultGreeting: {
                        type: 'string',
                        description: 'Default greeting to use when not specified',
                        default: 'Hello'
                    },
                    maxNameLength: {
                        type: 'number',
                        description: 'Maximum length for names',
                        default: 50
                    }
                }
            }
        };
        console.log(JSON.stringify(template, null, 2));
    }
    /**
     * Run the CLI tool
     * @param args Command line arguments
     */
    run(args) {
        const command = args[0];
        const filePath = args[1];
        switch (command) {
            case 'validate':
                if (!filePath) {
                    console.error('Error: Missing file path');
                    this.printHelp();
                    process.exit(1);
                }
                this.validatePlugin(filePath);
                break;
            case 'analyze':
                if (!filePath) {
                    console.error('Error: Missing file path');
                    this.printHelp();
                    process.exit(1);
                }
                this.analyzePlugin(filePath);
                break;
            case 'create-template':
                this.createTemplate();
                break;
            case 'help':
            case '--help':
            case '-h':
                this.printHelp();
                break;
            default:
                console.error(`Error: Unknown command "${command}"`);
                this.printHelp();
                process.exit(1);
        }
    }
}
exports.PluginCLI = PluginCLI;
// If this file is being run directly
if (require.main === module) {
    const cli = new PluginCLI();
    cli.run(process.argv.slice(2));
}
//# sourceMappingURL=plugin-cli.js.map