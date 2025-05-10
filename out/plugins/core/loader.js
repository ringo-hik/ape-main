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
exports.PluginLoader = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const fs_1 = require("fs");
const plugin_1 = require("../types/plugin");
/**
 * Manages loading and unloading of plugins
 */
class PluginLoader {
    _extensionContext;
    _registry;
    _pluginAPI;
    _internalPluginPath;
    _externalPluginPath = null;
    /**
     * Creates a new plugin loader
     * @param _extensionContext Extension context
     * @param _registry Plugin registry
     * @param _pluginAPI Plugin API
     */
    constructor(_extensionContext, _registry, _pluginAPI) {
        this._extensionContext = _extensionContext;
        this._registry = _registry;
        this._pluginAPI = _pluginAPI;
        // Set up plugin paths
        this._internalPluginPath = path.join(_extensionContext.extensionPath, 'out', 'plugins', 'internal');
        // Load external plugin path from configuration
        const config = vscode.workspace.getConfiguration('ape.plugins');
        const configuredPath = config.get('path', '');
        if (configuredPath) {
            this._externalPluginPath = configuredPath;
        }
        else {
            // Use default path in global storage
            this._externalPluginPath = path.join(_extensionContext.globalStoragePath, 'plugins');
            // Create directory if it doesn't exist
            if (!(0, fs_1.existsSync)(this._externalPluginPath)) {
                (0, fs_1.mkdirSync)(this._externalPluginPath, { recursive: true });
            }
        }
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration('ape.plugins.path')) {
                this._updateExternalPluginPath();
            }
        });
    }
    /**
     * Update external plugin path when configuration changes
     */
    _updateExternalPluginPath() {
        const config = vscode.workspace.getConfiguration('ape.plugins');
        const configuredPath = config.get('path', '');
        if (configuredPath) {
            this._externalPluginPath = configuredPath;
        }
        else {
            this._externalPluginPath = path.join(this._extensionContext.globalStoragePath, 'plugins');
        }
    }
    /**
     * Discover and load all internal plugins
     * @returns Promise that resolves to the number of plugins loaded
     */
    async loadInternalPlugins() {
        console.log('Loading internal plugins from:', this._internalPluginPath);
        try {
            const pluginDirs = await this._getDirectories(this._internalPluginPath);
            let loadedCount = 0;
            for (const dir of pluginDirs) {
                try {
                    const loaded = await this._loadPluginFromDirectory(path.join(this._internalPluginPath, dir), true);
                    if (loaded) {
                        loadedCount++;
                    }
                }
                catch (error) {
                    console.error(`Error loading internal plugin from ${dir}:`, error);
                }
            }
            return loadedCount;
        }
        catch (error) {
            console.error('Error loading internal plugins:', error);
            return 0;
        }
    }
    /**
     * Discover and load all external plugins
     * @returns Promise that resolves to the number of plugins loaded
     */
    async loadExternalPlugins() {
        if (!this._externalPluginPath) {
            return 0;
        }
        console.log('Loading external plugins from:', this._externalPluginPath);
        try {
            const pluginDirs = await this._getDirectories(this._externalPluginPath);
            let loadedCount = 0;
            for (const dir of pluginDirs) {
                try {
                    const loaded = await this._loadPluginFromDirectory(path.join(this._externalPluginPath, dir), false);
                    if (loaded) {
                        loadedCount++;
                    }
                }
                catch (error) {
                    console.error(`Error loading external plugin from ${dir}:`, error);
                }
            }
            return loadedCount;
        }
        catch (error) {
            console.error('Error loading external plugins:', error);
            return 0;
        }
    }
    /**
     * Load a plugin from a specific directory
     * @param pluginDir Plugin directory path
     * @param isInternal Whether this is an internal plugin
     * @returns Promise that resolves to true if the plugin was loaded
     */
    async _loadPluginFromDirectory(pluginDir, isInternal) {
        // Check for package.json
        const packageJsonPath = path.join(pluginDir, 'package.json');
        if (!(0, fs_1.existsSync)(packageJsonPath)) {
            console.log(`No package.json found in ${pluginDir}, skipping`);
            return false;
        }
        try {
            // Load package.json
            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
            // Skip if this is not an APE plugin
            if (packageJson.apePlugin !== true) {
                console.log(`Directory ${pluginDir} is not an APE plugin, skipping`);
                return false;
            }
            // Extract metadata
            const metadata = {
                id: packageJson.name,
                name: packageJson.displayName || packageJson.name,
                version: packageJson.version || '0.0.1',
                description: packageJson.description,
                author: packageJson.author,
                dependencies: packageJson.apeDependencies || [],
                activationEvents: packageJson.activationEvents || [],
                features: packageJson.apeFeatures || [],
                configuration: packageJson.apeConfiguration,
                category: packageJson.category,
                isBuiltIn: isInternal,
                enabledByDefault: packageJson.enabledByDefault !== false
            };
            // Load the plugin implementation
            const mainModulePath = path.join(pluginDir, packageJson.main || 'index.js');
            if (!(0, fs_1.existsSync)(mainModulePath)) {
                throw new Error(`Plugin main module not found: ${mainModulePath}`);
            }
            // Use require() for webpack compatibility instead of dynamic import
            // This is still dynamic but uses CommonJS which webpack can handle better
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const pluginModule = require(mainModulePath);
            const pluginImpl = pluginModule.default || pluginModule;
            // Check if plugin implements required interface
            if (!pluginImpl || typeof pluginImpl.activate !== 'function') {
                throw new Error(`Plugin does not implement the required interface`);
            }
            // Register the plugin
            const pluginId = await this._registry.registerPlugin(pluginImpl, metadata);
            // Create storage path for the plugin
            const pluginStoragePath = path.join(this._extensionContext.globalStoragePath, 'plugin-storage', pluginId);
            // Ensure storage directory exists
            if (!(0, fs_1.existsSync)(pluginStoragePath)) {
                (0, fs_1.mkdirSync)(pluginStoragePath, { recursive: true });
            }
            // Create plugin context
            const plugin = this._registry.getPlugin(pluginId);
            if (plugin) {
                const subscriptions = [];
                const context = {
                    extensionContext: this._extensionContext,
                    api: this._pluginAPI,
                    metadata,
                    storagePath: pluginStoragePath,
                    subscriptions,
                    log: (message, severity = 'info') => {
                        switch (severity) {
                            case 'info':
                                console.log(`[Plugin: ${pluginId}] ${message}`);
                                break;
                            case 'warn':
                                console.warn(`[Plugin: ${pluginId}] ${message}`);
                                break;
                            case 'error':
                                console.error(`[Plugin: ${pluginId}] ${message}`);
                                break;
                        }
                    },
                    getConfig: (key) => {
                        const config = vscode.workspace.getConfiguration(`ape.plugins.${pluginId}`);
                        return config.get(key);
                    },
                    updateConfig: (key, value) => {
                        const config = vscode.workspace.getConfiguration(`ape.plugins.${pluginId}`);
                        return Promise.resolve(config.update(key, value, vscode.ConfigurationTarget.Global));
                    }
                };
                // Set the context on the plugin instance
                plugin.context = context;
                // Auto-activate if configured
                const autoActivate = vscode.workspace.getConfiguration('ape.plugins')
                    .get('autoActivate', true);
                if (autoActivate && metadata.enabledByDefault !== false) {
                    // Queue activation to avoid blocking the loading process
                    setImmediate(() => {
                        this._registry.activatePlugin(pluginId).catch(error => {
                            console.error(`Error auto-activating plugin ${pluginId}:`, error);
                        });
                    });
                }
                return true;
            }
            return false;
        }
        catch (error) {
            console.error(`Error loading plugin from ${pluginDir}:`, error);
            return false;
        }
    }
    /**
     * Activate all plugins that match a specific activation event
     * @param activationEvent Activation event to match
     * @returns Promise that resolves to the number of plugins activated
     */
    async activatePluginsByEvent(activationEvent) {
        const plugins = this._registry.getAllPlugins().filter(plugin => plugin.state === plugin_1.PluginState.Registered &&
            plugin.metadata.activationEvents?.some(event => {
                // Exact match
                if (event === activationEvent) {
                    return true;
                }
                // Wildcard match
                if (event.endsWith('*')) {
                    const prefix = event.slice(0, -1);
                    return activationEvent.startsWith(prefix);
                }
                return false;
            }));
        let activatedCount = 0;
        for (const plugin of plugins) {
            try {
                const success = await this._registry.activatePlugin(plugin.id);
                if (success) {
                    activatedCount++;
                }
            }
            catch (error) {
                console.error(`Error activating plugin ${plugin.id} for event ${activationEvent}:`, error);
            }
        }
        return activatedCount;
    }
    /**
     * Activate all registered plugins
     * @returns Promise that resolves to the number of plugins activated
     */
    async activateAllPlugins() {
        const plugins = this._registry.getAllPlugins().filter(plugin => plugin.state === plugin_1.PluginState.Registered);
        let activatedCount = 0;
        for (const plugin of plugins) {
            try {
                const success = await this._registry.activatePlugin(plugin.id);
                if (success) {
                    activatedCount++;
                }
            }
            catch (error) {
                console.error(`Error activating plugin ${plugin.id}:`, error);
            }
        }
        return activatedCount;
    }
    /**
     * Deactivate all active plugins
     * @returns Promise that resolves to the number of plugins deactivated
     */
    async deactivateAllPlugins() {
        const activePlugins = this._registry.getActivePlugins();
        let deactivatedCount = 0;
        for (const plugin of activePlugins) {
            try {
                const success = await this._registry.deactivatePlugin(plugin.id);
                if (success) {
                    deactivatedCount++;
                }
            }
            catch (error) {
                console.error(`Error deactivating plugin ${plugin.id}:`, error);
            }
        }
        return deactivatedCount;
    }
    /**
     * Helper function to get directories in a path
     * @param dirPath Directory path to scan
     * @returns Promise that resolves to an array of directory names
     */
    async _getDirectories(dirPath) {
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            return entries
                .filter(entry => entry.isDirectory())
                .map(entry => entry.name);
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                // Directory doesn't exist, return empty array
                return [];
            }
            throw error;
        }
    }
}
exports.PluginLoader = PluginLoader;
//# sourceMappingURL=loader.js.map