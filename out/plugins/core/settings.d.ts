import * as vscode from 'vscode';
import { PluginSettingsManager, PluginSettingsSchema } from '../types/settings';
/**
 * Implementation of PluginSettingsManager
 */
export declare class PluginSettingsManagerImpl implements PluginSettingsManager {
    private readonly _extensionContext;
    private _schemas;
    private _listeners;
    /**
     * Creates a new PluginSettingsManager
     * @param _extensionContext Extension context
     */
    constructor(_extensionContext: vscode.ExtensionContext);
    /**
     * Register configuration schema for a plugin
     * @param pluginId Plugin ID
     * @param schema Settings schema
     */
    registerSettings(pluginId: string, schema: PluginSettingsSchema): void;
    /**
     * Get configuration for a plugin
     * @param pluginId Plugin ID
     * @returns Configuration object
     */
    getConfiguration(pluginId: string): vscode.WorkspaceConfiguration;
    /**
     * Get a specific setting value
     * @param pluginId Plugin ID
     * @param key Setting key
     * @param defaultValue Default value if setting is not found
     * @returns Setting value or default value
     */
    get<T>(pluginId: string, key: string, defaultValue?: T): T;
    /**
     * Update a specific setting value
     * @param pluginId Plugin ID
     * @param key Setting key
     * @param value New value
     * @param configurationTarget Where to update the setting
     * @returns Promise that resolves when the update is complete
     */
    update<T>(pluginId: string, key: string, value: T, configurationTarget?: vscode.ConfigurationTarget): Promise<void>;
    /**
     * Listen for setting changes
     * @param pluginId Plugin ID
     * @param key Setting key
     * @param callback Callback function invoked when the setting changes
     * @returns Disposable for unsubscribing
     */
    onDidChangeConfiguration(pluginId: string, key: string, callback: (newValue: any) => void): vscode.Disposable;
    /**
     * Handle configuration changes
     * @param event Configuration change event
     */
    private _handleConfigChange;
    /**
     * Dispose of all listeners
     */
    dispose(): void;
}
