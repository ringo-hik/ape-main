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
exports.PluginRegistryImpl = void 0;
const vscode = __importStar(require("vscode"));
const plugin_1 = require("../types/plugin");
/**
 * Implementation of the Plugin Registry
 */
class PluginRegistryImpl {
    _eventEmitter;
    /** Maps plugin IDs to plugin instances */
    _plugins = new Map();
    /** Event emitters for plugin state changes */
    _stateChangeEmitter = new vscode.EventEmitter();
    /** Observable for plugin state changes */
    onDidChangePluginState = (listener) => {
        return this._stateChangeEmitter.event(e => listener(e.pluginId, e.oldState, e.newState));
    };
    /**
     * Creates a new plugin registry
     * @param _eventEmitter Event emitter for plugin events
     */
    constructor(_eventEmitter) {
        this._eventEmitter = _eventEmitter;
    }
    /**
     * Register a plugin with the registry
     * @param plugin Plugin implementation
     * @param metadata Plugin metadata
     * @returns Promise that resolves to the plugin ID
     */
    async registerPlugin(plugin, metadata) {
        // Check for duplicate plugin ID
        if (this._plugins.has(metadata.id)) {
            throw new Error(`Plugin with ID ${metadata.id} is already registered`);
        }
        // Create plugin instance
        const instance = {
            id: metadata.id,
            metadata,
            implementation: plugin,
            state: plugin_1.PluginState.Registered
        };
        // Add to registry
        this._plugins.set(metadata.id, instance);
        // Emit event
        this._eventEmitter.emit('plugin:registered', {
            pluginId: metadata.id,
            metadata
        });
        return metadata.id;
    }
    /**
     * Unregister a plugin from the registry
     * @param pluginId Plugin ID to unregister
     * @returns Promise that resolves to true if successful
     */
    async unregisterPlugin(pluginId) {
        const plugin = this._plugins.get(pluginId);
        if (!plugin) {
            return false;
        }
        // Deactivate plugin if it's active
        if (plugin.state === plugin_1.PluginState.Active) {
            await this.deactivatePlugin(pluginId);
        }
        // Remove from registry
        this._plugins.delete(pluginId);
        // Emit event
        this._eventEmitter.emit('plugin:unregistered', {
            pluginId
        });
        return true;
    }
    /**
     * Activate a plugin
     * @param pluginId Plugin ID to activate
     * @returns Promise that resolves to true if successful
     */
    async activatePlugin(pluginId) {
        const plugin = this._plugins.get(pluginId);
        if (!plugin) {
            return false;
        }
        // Check if already active or activating
        if (plugin.state === plugin_1.PluginState.Active) {
            return true;
        }
        if (plugin.state === plugin_1.PluginState.Activating) {
            return false; // Already activating
        }
        // Update state to activating
        this._changePluginState(plugin, plugin_1.PluginState.Activating);
        try {
            // Check and activate dependencies if needed
            if (plugin.metadata.dependencies?.length) {
                for (const depId of plugin.metadata.dependencies) {
                    const dependency = this._plugins.get(depId);
                    if (!dependency) {
                        throw new plugin_1.PluginActivationError(pluginId, `Missing dependency: ${depId}`);
                    }
                    if (dependency.state !== plugin_1.PluginState.Active) {
                        const success = await this.activatePlugin(depId);
                        if (!success) {
                            throw new plugin_1.PluginActivationError(pluginId, `Failed to activate dependency: ${depId}`);
                        }
                    }
                }
            }
            // Context will be provided by PluginLoader
            if (!plugin.context) {
                throw new plugin_1.PluginActivationError(pluginId, 'Plugin context not set. This is likely an internal error.');
            }
            // Activate the plugin
            await plugin.implementation.activate(plugin.context);
            // Update state to active
            this._changePluginState(plugin, plugin_1.PluginState.Active);
            // Emit event
            this._eventEmitter.emit('plugin:activated', {
                pluginId,
                metadata: plugin.metadata
            });
            return true;
        }
        catch (error) {
            // Update state to activation failed
            plugin.error = error instanceof Error ? error : new Error(String(error));
            this._changePluginState(plugin, plugin_1.PluginState.ActivationFailed);
            // Emit failure event
            this._eventEmitter.emit('plugin:activation:failed', {
                pluginId,
                error: plugin.error
            });
            return false;
        }
    }
    /**
     * Deactivate a plugin
     * @param pluginId Plugin ID to deactivate
     * @returns Promise that resolves to true if successful
     */
    async deactivatePlugin(pluginId) {
        const plugin = this._plugins.get(pluginId);
        if (!plugin) {
            return false;
        }
        // Check if already inactive or deactivating
        if (plugin.state === plugin_1.PluginState.Inactive ||
            plugin.state === plugin_1.PluginState.Registered ||
            plugin.state === plugin_1.PluginState.Discovered) {
            return true;
        }
        if (plugin.state === plugin_1.PluginState.Deactivating) {
            return false; // Already deactivating
        }
        // Check if this plugin is a dependency of any active plugins
        const activePlugins = this.getPluginsByState(plugin_1.PluginState.Active);
        const dependents = activePlugins.filter(p => p.metadata.dependencies?.includes(pluginId));
        // Deactivate dependents first
        for (const dependent of dependents) {
            await this.deactivatePlugin(dependent.id);
        }
        // Update state to deactivating
        this._changePluginState(plugin, plugin_1.PluginState.Deactivating);
        try {
            // Call deactivate if implemented
            if (plugin.implementation.deactivate) {
                await plugin.implementation.deactivate();
            }
            // Dispose context subscriptions
            if (plugin.context) {
                for (const subscription of plugin.context.subscriptions) {
                    try {
                        subscription.dispose();
                    }
                    catch (error) {
                        console.error(`Error disposing subscription for plugin ${pluginId}:`, error);
                    }
                }
            }
            // Update state to inactive
            this._changePluginState(plugin, plugin_1.PluginState.Inactive);
            // Clear error if previously failed
            delete plugin.error;
            // Emit event
            this._eventEmitter.emit('plugin:deactivated', {
                pluginId,
                metadata: plugin.metadata
            });
            return true;
        }
        catch (error) {
            // Still mark as inactive, but keep error
            plugin.error = error instanceof Error ? error : new Error(String(error));
            this._changePluginState(plugin, plugin_1.PluginState.Inactive);
            // Emit warning event
            this._eventEmitter.emit('plugin:deactivation:warning', {
                pluginId,
                error: plugin.error
            });
            // Still return true because the plugin is now inactive
            return true;
        }
    }
    /**
     * Check if a plugin is active
     * @param pluginId Plugin ID to check
     * @returns Whether the plugin is active
     */
    isPluginActive(pluginId) {
        const plugin = this._plugins.get(pluginId);
        return plugin?.state === plugin_1.PluginState.Active;
    }
    /**
     * Get a plugin instance by ID
     * @param pluginId Plugin ID to get
     * @returns Plugin instance or undefined if not found
     */
    getPlugin(pluginId) {
        return this._plugins.get(pluginId);
    }
    /**
     * Get all registered plugins
     * @returns Array of all plugin instances
     */
    getAllPlugins() {
        return Array.from(this._plugins.values());
    }
    /**
     * Get plugins by state
     * @param state State to filter by
     * @returns Array of matching plugin instances
     */
    getPluginsByState(state) {
        return Array.from(this._plugins.values()).filter(p => p.state === state);
    }
    /**
     * Get active plugins only
     * @returns Array of active plugin instances
     */
    getActivePlugins() {
        return this.getPluginsByState(plugin_1.PluginState.Active);
    }
    /**
     * Update a plugin's state and emit change event
     * @param plugin Plugin instance to update
     * @param newState New state to set
     */
    _changePluginState(plugin, newState) {
        const oldState = plugin.state;
        plugin.state = newState;
        // Emit event for state change
        this._stateChangeEmitter.fire({
            pluginId: plugin.id,
            oldState,
            newState
        });
    }
}
exports.PluginRegistryImpl = PluginRegistryImpl;
//# sourceMappingURL=registry.js.map