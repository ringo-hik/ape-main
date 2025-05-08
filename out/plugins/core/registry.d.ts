import * as vscode from 'vscode';
import { EventEmitter } from '../types/events';
import { Plugin, PluginMetadata, PluginRegistry, PluginInstance, PluginState } from '../types/plugin';
/**
 * Implementation of the Plugin Registry
 */
export declare class PluginRegistryImpl implements PluginRegistry {
    private readonly _eventEmitter;
    /** Maps plugin IDs to plugin instances */
    private _plugins;
    /** Event emitters for plugin state changes */
    private _stateChangeEmitter;
    /** Observable for plugin state changes */
    readonly onDidChangePluginState: (listener: (pluginId: string, oldState: PluginState, newState: PluginState) => void) => vscode.Disposable;
    /**
     * Creates a new plugin registry
     * @param _eventEmitter Event emitter for plugin events
     */
    constructor(_eventEmitter: EventEmitter);
    /**
     * Register a plugin with the registry
     * @param plugin Plugin implementation
     * @param metadata Plugin metadata
     * @returns Promise that resolves to the plugin ID
     */
    registerPlugin(plugin: Plugin, metadata: PluginMetadata): Promise<string>;
    /**
     * Unregister a plugin from the registry
     * @param pluginId Plugin ID to unregister
     * @returns Promise that resolves to true if successful
     */
    unregisterPlugin(pluginId: string): Promise<boolean>;
    /**
     * Activate a plugin
     * @param pluginId Plugin ID to activate
     * @returns Promise that resolves to true if successful
     */
    activatePlugin(pluginId: string): Promise<boolean>;
    /**
     * Deactivate a plugin
     * @param pluginId Plugin ID to deactivate
     * @returns Promise that resolves to true if successful
     */
    deactivatePlugin(pluginId: string): Promise<boolean>;
    /**
     * Check if a plugin is active
     * @param pluginId Plugin ID to check
     * @returns Whether the plugin is active
     */
    isPluginActive(pluginId: string): boolean;
    /**
     * Get a plugin instance by ID
     * @param pluginId Plugin ID to get
     * @returns Plugin instance or undefined if not found
     */
    getPlugin(pluginId: string): PluginInstance | undefined;
    /**
     * Get all registered plugins
     * @returns Array of all plugin instances
     */
    getAllPlugins(): PluginInstance[];
    /**
     * Get plugins by state
     * @param state State to filter by
     * @returns Array of matching plugin instances
     */
    getPluginsByState(state: PluginState): PluginInstance[];
    /**
     * Get active plugins only
     * @returns Array of active plugin instances
     */
    getActivePlugins(): PluginInstance[];
    /**
     * Update a plugin's state and emit change event
     * @param plugin Plugin instance to update
     * @param newState New state to set
     */
    private _changePluginState;
}
