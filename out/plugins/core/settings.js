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
exports.PluginSettingsManagerImpl = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Implementation of PluginSettingsManager
 */
class PluginSettingsManagerImpl {
    _extensionContext;
    // Map of registered schemas by plugin ID
    _schemas = new Map();
    // Map of configuration change listeners
    _listeners = new Map();
    /**
     * Creates a new PluginSettingsManager
     * @param _extensionContext Extension context
     */
    constructor(_extensionContext) {
        this._extensionContext = _extensionContext;
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(this._handleConfigChange, this);
    }
    /**
     * Register configuration schema for a plugin
     * @param pluginId Plugin ID
     * @param schema Settings schema
     */
    registerSettings(pluginId, schema) {
        this._schemas.set(pluginId, schema);
        // TODO: Register settings with VSCode dynamically
        // This is normally done via package.json, but for dynamically loaded plugins
        // we might need a different approach
    }
    /**
     * Get configuration for a plugin
     * @param pluginId Plugin ID
     * @returns Configuration object
     */
    getConfiguration(pluginId) {
        return vscode.workspace.getConfiguration(`ape.plugins.${pluginId}`);
    }
    /**
     * Get a specific setting value
     * @param pluginId Plugin ID
     * @param key Setting key
     * @param defaultValue Default value if setting is not found
     * @returns Setting value or default value
     */
    get(pluginId, key, defaultValue) {
        const config = this.getConfiguration(pluginId);
        return config.get(key, defaultValue);
    }
    /**
     * Update a specific setting value
     * @param pluginId Plugin ID
     * @param key Setting key
     * @param value New value
     * @param configurationTarget Where to update the setting
     * @returns Promise that resolves when the update is complete
     */
    async update(pluginId, key, value, configurationTarget = vscode.ConfigurationTarget.Global) {
        const config = this.getConfiguration(pluginId);
        await config.update(key, value, configurationTarget);
    }
    /**
     * Listen for setting changes
     * @param pluginId Plugin ID
     * @param key Setting key
     * @param callback Callback function invoked when the setting changes
     * @returns Disposable for unsubscribing
     */
    onDidChangeConfiguration(pluginId, key, callback) {
        // Get current value as baseline
        const initialValue = this.get(pluginId, key);
        // Create a disposable to manage this listener
        const disposable = {
            dispose: () => {
                // Remove this listener from our records
                const listeners = this._listeners.get(pluginId) || [];
                const index = listeners.findIndex(l => l === disposable);
                if (index !== -1) {
                    listeners.splice(index, 1);
                }
                this._listeners.set(pluginId, listeners);
            }
        };
        // Add to our listeners
        const listeners = this._listeners.get(pluginId) || [];
        listeners.push(disposable);
        this._listeners.set(pluginId, listeners);
        // Store state for this listener
        disposable._lastValue = initialValue;
        disposable._pluginId = pluginId;
        disposable._key = key;
        disposable._callback = callback;
        return disposable;
    }
    /**
     * Handle configuration changes
     * @param event Configuration change event
     */
    _handleConfigChange(event) {
        // Check each plugin and its listeners
        for (const [pluginId, listeners] of this._listeners.entries()) {
            const configSection = `ape.plugins.${pluginId}`;
            if (event.affectsConfiguration(configSection)) {
                // Configuration for this plugin has changed
                for (const listener of listeners) {
                    // Get stored properties
                    const key = listener._key;
                    const lastValue = listener._lastValue;
                    const callback = listener._callback;
                    // Check if this specific key was affected
                    if (event.affectsConfiguration(`${configSection}.${key}`)) {
                        // Get the new value
                        const newValue = this.get(pluginId, key);
                        // Only notify if value actually changed
                        if (JSON.stringify(newValue) !== JSON.stringify(lastValue)) {
                            // Update stored last value
                            listener._lastValue = newValue;
                            // Call the callback with the new value
                            try {
                                callback(newValue);
                            }
                            catch (error) {
                                console.error(`Error in settings change listener for ${pluginId}.${key}:`, error);
                            }
                        }
                    }
                }
            }
        }
    }
    /**
     * Dispose of all listeners
     */
    dispose() {
        // Clear all listeners
        this._listeners.clear();
        this._schemas.clear();
    }
}
exports.PluginSettingsManagerImpl = PluginSettingsManagerImpl;
//# sourceMappingURL=settings.js.map