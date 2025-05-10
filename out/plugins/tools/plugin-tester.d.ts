import * as vscode from 'vscode';
/**
 * Plugin tester for testing JSON plugins
 */
export declare class PluginTester {
    private readonly extensionContext;
    private readonly pluginValidator;
    private readonly testWorkspaceDir;
    private readonly testPluginsDir;
    constructor(extensionContext: vscode.ExtensionContext);
    /**
     * Test a plugin from a file path
     * @param filePath Path to the plugin JSON file
     */
    testPluginFromFile(filePath: string): Promise<boolean>;
    /**
     * Test a plugin from JSON content
     * @param content JSON content of the plugin
     */
    testPluginFromContent(content: string): Promise<boolean>;
    /**
     * Test a plugin's functionality
     * @param jsonPlugin Plugin to test
     */
    private testPlugin;
}
