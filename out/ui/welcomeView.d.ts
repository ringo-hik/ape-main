import * as vscode from 'vscode';
/**
 * WelcomeViewProvider for luxury minimal welcome screen
 * Creates an elegant, clean welcome interface with premium aesthetics
 */
export declare class WelcomeViewProvider {
    /**
     * Generate welcome message HTML with luxury minimal design
     * This is used for the first-run experience and when clearing chat
     */
    static getWelcomeMessageHTML(): string;
    /**
     * Create standalone webview panel with welcome content
     */
    static createOrShow(context: vscode.ExtensionContext): vscode.WebviewPanel;
}
