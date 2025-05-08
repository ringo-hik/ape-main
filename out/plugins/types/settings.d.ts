import * as vscode from 'vscode';
/**
 * Plugin settings schema definition
 */
export interface PluginSettingsSchema {
    /** Property name */
    [key: string]: {
        /** Value type */
        type: 'string' | 'number' | 'boolean' | 'array' | 'object';
        /** Default value */
        default?: any;
        /** Description */
        description?: string;
        /** Allowable values for string type */
        enum?: string[];
        /** Minimum value for number type */
        minimum?: number;
        /** Maximum value for number type */
        maximum?: number;
        /** Object schema for object type */
        properties?: PluginSettingsSchema;
        /** Item type for array type */
        items?: {
            type: 'string' | 'number' | 'boolean' | 'object';
            enum?: string[];
            properties?: PluginSettingsSchema;
        };
    };
}
/**
 * Settings manager for plugins
 */
export interface PluginSettingsManager {
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
}
