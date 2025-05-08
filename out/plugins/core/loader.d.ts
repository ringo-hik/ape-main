import * as vscode from 'vscode';
import { PluginRegistry } from '../types/plugin';
import { PluginAPI } from '../types/api';
/**
 * Manages loading and unloading of plugins
 */
export declare class PluginLoader {
    private readonly _extensionContext;
    private readonly _registry;
    private readonly _pluginAPI;
    private _internalPluginPath;
    private _externalPluginPath;
    /**
     * Creates a new plugin loader
     * @param _extensionContext Extension context
     * @param _registry Plugin registry
     * @param _pluginAPI Plugin API
     */
    constructor(_extensionContext: vscode.ExtensionContext, _registry: PluginRegistry, _pluginAPI: PluginAPI);
    /**
     * Update external plugin path when configuration changes
     */
    private _updateExternalPluginPath;
    /**
     * Discover and load all internal plugins
     * @returns Promise that resolves to the number of plugins loaded
     */
    loadInternalPlugins(): Promise<number>;
    /**
     * Discover and load all external plugins
     * @returns Promise that resolves to the number of plugins loaded
     */
    loadExternalPlugins(): Promise<number>;
    /**
     * Load a plugin from a specific directory
     * @param pluginDir Plugin directory path
     * @param isInternal Whether this is an internal plugin
     * @returns Promise that resolves to true if the plugin was loaded
     */
    private _loadPluginFromDirectory;
    /**
     * Activate all plugins that match a specific activation event
     * @param activationEvent Activation event to match
     * @returns Promise that resolves to the number of plugins activated
     */
    activatePluginsByEvent(activationEvent: string): Promise<number>;
    /**
     * Activate all registered plugins
     * @returns Promise that resolves to the number of plugins activated
     */
    activateAllPlugins(): Promise<number>;
    /**
     * Deactivate all active plugins
     * @returns Promise that resolves to the number of plugins deactivated
     */
    deactivateAllPlugins(): Promise<number>;
    /**
     * Helper function to get directories in a path
     * @param dirPath Directory path to scan
     * @returns Promise that resolves to an array of directory names
     */
    private _getDirectories;
}
