import * as vscode from 'vscode';
/**
 * This is a simple test extension to verify webview functionality
 * It loads a basic HTML file into a webview panel and handles communication
 */
export declare class WebviewTest {
    private _panel;
    private _context;
    constructor(context: vscode.ExtensionContext);
    /**
     * Create or show the test webview panel
     */
    createOrShow(): void;
    /**
     * Get the webview content
     */
    private _getWebviewContent;
    /**
     * Dispose the webview panel
     */
    dispose(): void;
}
/**
 * Command to run the webview test
 */
export declare function runWebviewTest(context: vscode.ExtensionContext): void;
