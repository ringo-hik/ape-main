import * as vscode from 'vscode';
import { JsonPluginConfig, PluginSettingsManager } from '../types/settings';
import { Plugin, PluginRegistry, PluginContext } from '../types/plugin';
import { PluginAPI } from '../types/api';
/**
 * Implementation of JSON-based plugins
 */
export declare class JsonPluginImpl implements Plugin {
    private readonly _config;
    private readonly _api;
    private _slashCommands;
    private _eventHandlers;
    /**
     * Create a new JSON plugin implementation
     * @param _config JSON plugin configuration
     * @param _api Plugin API
     */
    constructor(_config: JsonPluginConfig, _api: PluginAPI);
    /**
     * Activate the plugin
     * @param context Plugin context
     */
    activate(context: PluginContext): Promise<void>;
    /**
     * Deactivate the plugin
     */
    deactivate(): Promise<void>;
}
/**
 * Loader for JSON-based plugins
 */
export declare class JsonPluginLoader {
    private readonly _extensionContext;
    private readonly _registry;
    private readonly _settingsManager;
    private readonly _api;
    /**
     * Creates a new JSON plugin loader
     * @param _extensionContext Extension context
     * @param _registry Plugin registry
     * @param _settingsManager Plugin settings manager
     * @param _api Plugin API
     */
    constructor(_extensionContext: vscode.ExtensionContext, _registry: PluginRegistry, _settingsManager: PluginSettingsManager, _api: PluginAPI);
    /**
     * Load all JSON-based plugins
     * @returns Promise that resolves to the number of plugins loaded
     */
    loadPlugins(): Promise<number>;
    /**
     * Create a plugin instance from JSON configuration
     * @param jsonConfig JSON configuration string
     * @returns Promise that resolves to the plugin instance
     */
    createPluginFromJson(jsonConfig: string): Promise<Plugin>;
    /**
     * Discover JSON plugins from the configured locations
     * @returns Promise that resolves to array of discovered plugin metadata
     */
    discoverPlugins(): Promise<any[]>;
    /**
     * Add a new JSON-based plugin
     * @param config Plugin configuration
     * @returns Promise that resolves to true if successful
     */
    addPlugin(config: JsonPluginConfig): Promise<boolean>;
    /**
     * Remove a JSON-based plugin
     * @param pluginId Plugin ID to remove
     * @returns Promise that resolves to true if successful
     */
    removePlugin(pluginId: string): Promise<boolean>;
    /**
     * Update a JSON-based plugin
     * @param pluginId Plugin ID to update
     * @param config New plugin configuration
     * @returns Promise that resolves to true if successful
     */
    updatePlugin(pluginId: string, config: JsonPluginConfig): Promise<boolean>;
    /**
     * Get the storage path for a plugin
     * @param pluginId Plugin ID
     * @returns Storage path for the plugin
     */
    getPluginStoragePath(pluginId: string): string;
    /**
     * Enable or disable a JSON-based plugin
     * @param pluginId Plugin ID to update
     * @param enabled Whether to enable or disable the plugin
     * @returns Promise that resolves to true if successful
     */
    setPluginEnabled(pluginId: string, enabled: boolean): Promise<boolean>;
}
