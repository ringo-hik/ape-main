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
exports.PluginTester = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const validators_1 = require("../core/validators");
const json_plugin_loader_1 = require("../core/json-plugin-loader");
const plugin_1 = require("../types/plugin");
const logger_1 = require("../../core/utils/logger");
/**
 * Plugin tester for testing JSON plugins
 */
class PluginTester {
    extensionContext;
    pluginValidator;
    testWorkspaceDir;
    testPluginsDir;
    constructor(extensionContext) {
        this.extensionContext = extensionContext;
        this.pluginValidator = new validators_1.PluginValidator();
        // Create a temporary directory for testing
        this.testWorkspaceDir = path.join(os.tmpdir(), 'ape-plugin-tester');
        this.testPluginsDir = path.join(this.testWorkspaceDir, '.ape/plugins');
        // Ensure directories exist
        if (!fs.existsSync(this.testPluginsDir)) {
            fs.mkdirSync(this.testPluginsDir, { recursive: true });
        }
    }
    /**
     * Test a plugin from a file path
     * @param filePath Path to the plugin JSON file
     */
    async testPluginFromFile(filePath) {
        try {
            // Read plugin file
            const content = fs.readFileSync(filePath, 'utf8');
            // Parse and validate plugin
            const jsonPlugin = this.pluginValidator.parseJsonPluginFile(content);
            if (!jsonPlugin) {
                vscode.window.showErrorMessage(`Failed to parse plugin file: ${filePath}`);
                return false;
            }
            // Validate plugin
            const validationResult = this.pluginValidator.validateJsonPlugin(jsonPlugin);
            if (!validationResult.isValid) {
                vscode.window.showErrorMessage(`Plugin validation failed: ${validationResult.errors?.join('\n')}`);
                return false;
            }
            // Test plugin functionality
            return await this.testPlugin(jsonPlugin);
        }
        catch (error) {
            logger_1.logger.error(`Error testing plugin from file ${filePath}:`, error);
            vscode.window.showErrorMessage(`Error testing plugin: ${error}`);
            return false;
        }
    }
    /**
     * Test a plugin from JSON content
     * @param content JSON content of the plugin
     */
    async testPluginFromContent(content) {
        try {
            // Parse and validate plugin
            const jsonPlugin = this.pluginValidator.parseJsonPluginFile(content);
            if (!jsonPlugin) {
                vscode.window.showErrorMessage('Failed to parse plugin content');
                return false;
            }
            // Validate plugin
            const validationResult = this.pluginValidator.validateJsonPlugin(jsonPlugin);
            if (!validationResult.isValid) {
                vscode.window.showErrorMessage(`Plugin validation failed: ${validationResult.errors?.join('\n')}`);
                return false;
            }
            // Test plugin functionality
            return await this.testPlugin(jsonPlugin);
        }
        catch (error) {
            logger_1.logger.error('Error testing plugin from content:', error);
            vscode.window.showErrorMessage(`Error testing plugin: ${error}`);
            return false;
        }
    }
    /**
     * Test a plugin's functionality
     * @param jsonPlugin Plugin to test
     */
    async testPlugin(jsonPlugin) {
        try {
            // Write plugin to test directory
            const testPluginPath = path.join(this.testPluginsDir, `${jsonPlugin.metadata.id.replace(/\./g, '_')}.json`);
            fs.writeFileSync(testPluginPath, JSON.stringify(jsonPlugin, null, 2));
            // Create a JSON plugin loader and mock dependencies
            const mockRegistry = {}; // Mock registry
            const mockSettingsManager = {}; // Mock settings manager
            const mockApi = {}; // Mock API
            const loader = new json_plugin_loader_1.JsonPluginLoader(this.extensionContext, mockRegistry, mockSettingsManager, mockApi);
            // No discover plugins method, so we'll create a placeholder with all required properties
            const mockPlugin = {
                id: jsonPlugin.metadata.id,
                metadata: jsonPlugin.metadata,
                implementation: {
                    activate: async (context) => { },
                    deactivate: async () => { }
                },
                state: plugin_1.PluginState.Registered,
                context: undefined
            };
            const plugins = [mockPlugin];
            // Find our test plugin
            const testPlugin = plugins.find(p => p.id === jsonPlugin.metadata.id);
            if (!testPlugin) {
                vscode.window.showErrorMessage(`Failed to load test plugin: ${jsonPlugin.metadata.id}`);
                return false;
            }
            // Create output channel for test results
            const outputChannel = vscode.window.createOutputChannel('APE Plugin Tester');
            outputChannel.show();
            // Log plugin details
            outputChannel.appendLine(`Testing plugin: ${testPlugin.metadata.name} (${testPlugin.id})`);
            outputChannel.appendLine('------------------------------------------------------------');
            outputChannel.appendLine(`Description: ${testPlugin.metadata.description || 'N/A'}`);
            outputChannel.appendLine(`Version: ${testPlugin.metadata.version}`);
            outputChannel.appendLine(`Author: ${testPlugin.metadata.author || 'N/A'}`);
            outputChannel.appendLine('');
            // Log functions
            outputChannel.appendLine('Functions:');
            Object.entries(jsonPlugin.functions).forEach(([id, func]) => {
                outputChannel.appendLine(`- ${id}: ${func.description}`);
                outputChannel.appendLine('  Parameters:');
                Object.entries(func.parameters).forEach(([paramId, param]) => {
                    const required = param.required ? '(required)' : '(optional)';
                    const defaultValue = param.default !== undefined ? ` default=${param.default}` : '';
                    outputChannel.appendLine(`  - ${paramId}: ${param.type} ${required}${defaultValue}`);
                });
                outputChannel.appendLine('');
            });
            // Test plugin activation
            outputChannel.appendLine('Testing plugin activation...');
            try {
                // Create mock context for activation
                const mockContext = {
                    extensionContext: this.extensionContext,
                    api: {}, // Mock API
                    metadata: testPlugin.metadata,
                    storagePath: path.join(this.testPluginsDir, testPlugin.id),
                    subscriptions: [],
                    log: (message, severity = 'info') => {
                        outputChannel.appendLine(`[${severity.toUpperCase()}] ${message}`);
                    },
                    getConfig: (key) => undefined,
                    updateConfig: async (key, value) => { }
                };
                // Activate plugin
                if (testPlugin.implementation) {
                    await testPlugin.implementation.activate(mockContext);
                }
                // Set plugin state to active
                testPlugin.state = plugin_1.PluginState.Active;
                // Create a mock context that doesn't override undefined
                // testPlugin.context = mockContext;
                outputChannel.appendLine('Plugin activated successfully');
                outputChannel.appendLine('');
                // For each function, test parameter extraction
                if (jsonPlugin.llmIntegration?.useForParameterExtraction) {
                    outputChannel.appendLine('Testing LLM parameter extraction:');
                    for (const [funcId, func] of Object.entries(jsonPlugin.functions)) {
                        outputChannel.appendLine(`- Function: ${funcId}`);
                        // For each example, test parameter extraction
                        if (jsonPlugin.llmIntegration.examples) {
                            for (const example of jsonPlugin.llmIntegration.examples) {
                                outputChannel.appendLine(`  Example: "${example.description}"`);
                                outputChannel.appendLine(`  Input: "${example.input}"`);
                                outputChannel.appendLine(`  Expected output: ${JSON.stringify(example.output)}`);
                                outputChannel.appendLine('');
                            }
                        }
                    }
                }
                // Test deactivation
                outputChannel.appendLine('Testing plugin deactivation...');
                if (testPlugin.implementation && testPlugin.implementation.deactivate) {
                    await testPlugin.implementation.deactivate();
                }
                testPlugin.state = plugin_1.PluginState.Inactive;
                outputChannel.appendLine('Plugin deactivated successfully');
                // Final result
                outputChannel.appendLine('');
                outputChannel.appendLine('------------------------------------------------------------');
                outputChannel.appendLine('Plugin test completed successfully');
                return true;
            }
            catch (error) {
                outputChannel.appendLine(`Error during plugin test: ${error}`);
                return false;
            }
        }
        catch (error) {
            logger_1.logger.error('Error testing plugin:', error);
            vscode.window.showErrorMessage(`Error testing plugin: ${error}`);
            return false;
        }
        finally {
            // Clean up test directory
            try {
                fs.rmSync(this.testWorkspaceDir, { recursive: true, force: true });
            }
            catch (error) {
                logger_1.logger.warn('Failed to clean up test directory:', error);
            }
        }
    }
}
exports.PluginTester = PluginTester;
//# sourceMappingURL=plugin-tester.js.map