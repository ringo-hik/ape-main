import * as vscode from 'vscode';
import { JSONPluginSchema } from '../types/json-plugin-schema';
/**
 * Plugin runner for executing plugin commands
 */
export declare class PluginRunner {
    private readonly extensionContext;
    constructor(extensionContext: vscode.ExtensionContext);
    /**
     * Execute a plugin function
     * @param plugin The plugin schema
     * @param functionId The function ID to execute
     * @param params Parameters for the function
     */
    executeFunction(plugin: JSONPluginSchema, functionId: string, params: Record<string, any>): Promise<string>;
    /**
     * Process and validate function parameters
     * @param paramDefs Parameter definitions
     * @param params Provided parameters
     * @returns Processed parameters
     */
    private processParameters;
    /**
     * Prepare HTTP request
     * @param requestDef Request definition
     * @param params Processed parameters
     * @param plugin Plugin schema
     * @returns Request object
     */
    private prepareRequest;
    /**
     * Simulate response for a function
     * @param func Function definition
     * @returns Simulated response data
     */
    private simulateResponse;
}
