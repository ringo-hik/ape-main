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
exports.JsonPluginLoader = exports.JsonPluginImpl = void 0;
const path = __importStar(require("path"));
const settings_1 = require("../types/settings");
const plugin_1 = require("../types/plugin");
/**
 * Implementation of slash commands for JSON plugins
 */
class JsonPluginSlashCommandImpl {
    _config;
    _command;
    _api;
    constructor(_config, _command, // 타입 변경
    _api) {
        this._config = _config;
        this._command = _command;
        this._api = _api;
    }
    /**
     * Execute the slash command
     * @param args Command arguments
     * @returns Promise that resolves when execution is complete
     */
    async execute(args) {
        const { handlerType, handler } = this._command;
        switch (handlerType) {
            case 'http':
                await this._executeHttpHandler(args, handler);
                break;
            case 'template':
                await this._executeTemplateHandler(args, handler);
                break;
            case 'function':
                await this._executeFunctionHandler(args, handler);
                break;
            default:
                throw new Error(`Unsupported handler type: ${handlerType}`);
        }
    }
    /**
     * Execute a HTTP-based command handler
     */
    async _executeHttpHandler(args, handler) {
        const { url, method = 'GET', headers = {} } = handler;
        if (!url) {
            throw new Error('URL is required for HTTP handlers');
        }
        try {
            // Prepare parameters
            const params = this._prepareParams(args, handler.params || []);
            // Make the HTTP request
            const response = await this._api.sendHttpRequest({
                url,
                method,
                headers,
                data: params
            });
            // Display the response
            await this._api.sendResponse({
                content: typeof response === 'string'
                    ? response
                    : JSON.stringify(response, null, 2)
            });
        }
        catch (error) {
            console.error('Error executing HTTP handler:', error);
            await this._api.sendResponse({
                content: `Error: ${error instanceof Error ? error.message : String(error)}`
            });
        }
    }
    /**
     * Execute a template-based command handler
     */
    async _executeTemplateHandler(args, handler) {
        const { template } = handler;
        if (!template) {
            throw new Error('Template is required for template handlers');
        }
        try {
            // Prepare parameters
            const params = this._prepareParams(args, handler.params || []);
            // Process the template
            const result = this._processTemplate(template, params);
            // Display the result
            await this._api.sendResponse({
                content: result
            });
        }
        catch (error) {
            console.error('Error executing template handler:', error);
            await this._api.sendResponse({
                content: `Error: ${error instanceof Error ? error.message : String(error)}`
            });
        }
    }
    /**
     * Execute a function-based command handler
     */
    async _executeFunctionHandler(args, handler) {
        const { function: functionName } = handler;
        if (!functionName) {
            throw new Error('Function name is required for function handlers');
        }
        try {
            // Send a not-yet-implemented response
            await this._api.sendResponse({
                content: `Function handlers are not yet implemented (${functionName})`
            });
        }
        catch (error) {
            console.error('Error executing function handler:', error);
            await this._api.sendResponse({
                content: `Error: ${error instanceof Error ? error.message : String(error)}`
            });
        }
    }
    /**
     * Prepare parameters for a command execution
     */
    _prepareParams(args, paramDefs) {
        const result = {};
        // Parse each parameter
        for (let i = 0; i < paramDefs.length; i++) {
            const paramDef = paramDefs[i];
            const { name, type, required, defaultValue } = paramDef;
            // Get the argument value
            const argValue = args[i];
            // If argument is missing but required, throw an error
            if (argValue === undefined) {
                if (required) {
                    throw new Error(`Missing required parameter: ${name}`);
                }
                // Use default value if available
                if (defaultValue !== undefined) {
                    result[name] = defaultValue;
                }
                continue;
            }
            // Parse the value based on type
            switch (type) {
                case 'string':
                    result[name] = argValue;
                    break;
                case 'number':
                    result[name] = Number(argValue);
                    if (isNaN(result[name])) {
                        throw new Error(`Invalid number for parameter ${name}: ${argValue}`);
                    }
                    break;
                case 'boolean':
                    result[name] = argValue.toLowerCase() === 'true';
                    break;
                case 'array':
                    try {
                        result[name] = JSON.parse(argValue);
                        if (!Array.isArray(result[name])) {
                            throw new Error(`Parameter ${name} must be an array`);
                        }
                    }
                    catch (error) {
                        throw new Error(`Invalid array for parameter ${name}: ${argValue}`);
                    }
                    break;
                case 'object':
                    try {
                        result[name] = JSON.parse(argValue);
                        if (typeof result[name] !== 'object' || result[name] === null) {
                            throw new Error(`Parameter ${name} must be an object`);
                        }
                    }
                    catch (error) {
                        throw new Error(`Invalid object for parameter ${name}: ${argValue}`);
                    }
                    break;
                default:
                    result[name] = argValue;
            }
        }
        return result;
    }
    /**
     * Process a template with parameters
     */
    _processTemplate(template, params) {
        // Replace all {{paramName}} with the parameter value
        return template.replace(/\{\{([^}]+)\}\}/g, (match, paramName) => {
            const value = params[paramName.trim()];
            return value !== undefined ? String(value) : match;
        });
    }
}
/**
 * Implementation of JSON-based plugins
 */
class JsonPluginImpl {
    _config;
    _api;
    _slashCommands = new Map();
    _eventHandlers = new Map();
    /**
     * Create a new JSON plugin implementation
     * @param _config JSON plugin configuration
     * @param _api Plugin API
     */
    constructor(_config, _api) {
        this._config = _config;
        this._api = _api;
    }
    /**
     * Activate the plugin
     * @param context Plugin context
     */
    async activate(context) {
        // Register slash commands
        if (this._config.slashCommands && this._config.slashCommands.length > 0) {
            for (const command of this._config.slashCommands) {
                const implementation = new JsonPluginSlashCommandImpl(this._config, command, this._api);
                this._slashCommands.set(command.name, implementation);
                // Register the command with the API
                await this._api.registerSlashCommand({
                    name: command.name,
                    description: command.description,
                    execute: (args) => implementation.execute(args)
                });
            }
            console.log(`Registered ${this._slashCommands.size} slash commands for plugin ${this._config.id}`);
        }
        // Register event handlers
        if (this._config.events && this._config.events.length > 0) {
            for (const event of this._config.events) {
                // Event handling is not yet implemented
                console.log(`Event handler for ${event.event} is not yet implemented`);
            }
        }
        console.log(`Activated JSON plugin: ${this._config.name} (${this._config.id})`);
    }
    /**
     * Deactivate the plugin
     */
    async deactivate() {
        // Unregister slash commands
        for (const [name] of this._slashCommands) {
            await this._api.unregisterSlashCommand(name);
        }
        this._slashCommands.clear();
        this._eventHandlers.clear();
        console.log(`Deactivated JSON plugin: ${this._config.name} (${this._config.id})`);
    }
}
exports.JsonPluginImpl = JsonPluginImpl;
/**
 * Loader for JSON-based plugins
 */
class JsonPluginLoader {
    _extensionContext;
    _registry;
    _settingsManager;
    _api;
    /**
     * Creates a new JSON plugin loader
     * @param _extensionContext Extension context
     * @param _registry Plugin registry
     * @param _settingsManager Plugin settings manager
     * @param _api Plugin API
     */
    constructor(_extensionContext, _registry, _settingsManager, _api) {
        this._extensionContext = _extensionContext;
        this._registry = _registry;
        this._settingsManager = _settingsManager;
        this._api = _api;
    }
    /**
     * Load all JSON-based plugins
     * @returns Promise that resolves to the number of plugins loaded
     */
    async loadPlugins() {
        try {
            // Get all JSON plugins from settings
            const jsonPlugins = this._settingsManager.listJsonPlugins();
            console.log(`Found ${jsonPlugins.length} JSON-based plugins`);
            // Register each plugin
            let loadedCount = 0;
            for (const config of jsonPlugins) {
                // Skip disabled plugins
                if (config.enabled === false) {
                    console.log(`Skipping disabled JSON plugin: ${config.name} (${config.id})`);
                    continue;
                }
                try {
                    // Create metadata
                    const metadata = (0, settings_1.jsonConfigToMetadata)(config);
                    if (config.lazyLoad) {
                        // Register metadata only, implementation will be loaded later
                        await this._registry.registerPluginMetadata(metadata, JSON.stringify(config), { lazyLoad: true });
                    }
                    else {
                        // Create and register plugin instance
                        const plugin = new JsonPluginImpl(config, this._api);
                        await this._registry.registerPlugin(plugin, metadata);
                    }
                    loadedCount++;
                }
                catch (error) {
                    console.error(`Failed to load JSON plugin ${config.id}:`, error);
                }
            }
            console.log(`Successfully loaded ${loadedCount} JSON-based plugins`);
            return loadedCount;
        }
        catch (error) {
            console.error('Failed to load JSON plugins:', error);
            return 0;
        }
    }
    /**
     * Create a plugin instance from JSON configuration
     * @param jsonConfig JSON configuration string
     * @returns Promise that resolves to the plugin instance
     */
    async createPluginFromJson(jsonConfig) {
        try {
            // Parse the JSON config
            const config = JSON.parse(jsonConfig);
            // Create the plugin
            return new JsonPluginImpl(config, this._api);
        }
        catch (error) {
            throw new Error(`Failed to create plugin from JSON: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Discover JSON plugins from the configured locations
     * @returns Promise that resolves to array of discovered plugin metadata
     */
    async discoverPlugins() {
        try {
            // Get all JSON plugins from settings
            const jsonPlugins = this._settingsManager.listJsonPlugins();
            // Convert to simplified metadata objects
            return jsonPlugins.map(config => ({
                id: config.id,
                metadata: (0, settings_1.jsonConfigToMetadata)(config)
            }));
        }
        catch (error) {
            console.error('Failed to discover JSON plugins:', error);
            return [];
        }
    }
    /**
     * Add a new JSON-based plugin
     * @param config Plugin configuration
     * @returns Promise that resolves to true if successful
     */
    async addPlugin(config) {
        try {
            // Add to settings
            const success = await this._settingsManager.addJsonPlugin(config);
            if (success) {
                // Create metadata
                const metadata = (0, settings_1.jsonConfigToMetadata)(config);
                // Register with the registry
                if (config.lazyLoad) {
                    await this._registry.registerPluginMetadata(metadata, JSON.stringify(config), { lazyLoad: true });
                }
                else {
                    const plugin = new JsonPluginImpl(config, this._api);
                    await this._registry.registerPlugin(plugin, metadata);
                }
            }
            return success;
        }
        catch (error) {
            console.error(`Failed to add JSON plugin ${config.id}:`, error);
            return false;
        }
    }
    /**
     * Remove a JSON-based plugin
     * @param pluginId Plugin ID to remove
     * @returns Promise that resolves to true if successful
     */
    async removePlugin(pluginId) {
        try {
            // First check if it's active
            const isActive = this._registry.isPluginActive(pluginId);
            // If active, deactivate it
            if (isActive) {
                await this._registry.deactivatePlugin(pluginId);
            }
            // Remove from registry
            await this._registry.unregisterPlugin(pluginId);
            // Remove from settings
            return await this._settingsManager.removeJsonPlugin(pluginId);
        }
        catch (error) {
            console.error(`Failed to remove JSON plugin ${pluginId}:`, error);
            return false;
        }
    }
    /**
     * Update a JSON-based plugin
     * @param pluginId Plugin ID to update
     * @param config New plugin configuration
     * @returns Promise that resolves to true if successful
     */
    async updatePlugin(pluginId, config) {
        try {
            // Update in settings
            const success = await this._settingsManager.updateJsonPlugin(pluginId, config);
            if (success) {
                // First check if it's active or registered
                const instance = this._registry.getPlugin(pluginId);
                if (instance) {
                    // If active, deactivate it
                    if (instance.state === plugin_1.PluginState.Active) {
                        await this._registry.deactivatePlugin(pluginId);
                    }
                    // Remove from registry
                    await this._registry.unregisterPlugin(pluginId);
                    // Create metadata
                    const metadata = (0, settings_1.jsonConfigToMetadata)(config);
                    // Register with the registry
                    if (config.lazyLoad) {
                        await this._registry.registerPluginMetadata(metadata, JSON.stringify(config), { lazyLoad: true });
                    }
                    else {
                        const plugin = new JsonPluginImpl(config, this._api);
                        await this._registry.registerPlugin(plugin, metadata);
                    }
                    // If it was active, activate it again
                    if (instance.state === plugin_1.PluginState.Active) {
                        await this._registry.activatePlugin(pluginId);
                    }
                }
            }
            return success;
        }
        catch (error) {
            console.error(`Failed to update JSON plugin ${pluginId}:`, error);
            return false;
        }
    }
    /**
     * Get the storage path for a plugin
     * @param pluginId Plugin ID
     * @returns Storage path for the plugin
     */
    getPluginStoragePath(pluginId) {
        return path.join(this._extensionContext.globalStoragePath, 'plugins', pluginId);
    }
    /**
     * Enable or disable a JSON-based plugin
     * @param pluginId Plugin ID to update
     * @param enabled Whether to enable or disable the plugin
     * @returns Promise that resolves to true if successful
     */
    async setPluginEnabled(pluginId, enabled) {
        try {
            // Update in settings
            const success = await this._settingsManager.setJsonPluginEnabled(pluginId, enabled);
            if (success) {
                // Get the plugin instance
                const instance = this._registry.getPlugin(pluginId);
                if (instance) {
                    if (!enabled && instance.state === plugin_1.PluginState.Active) {
                        // If disabling an active plugin, deactivate it
                        await this._registry.deactivatePlugin(pluginId);
                    }
                    else if (enabled && this._registry.canPluginBeActivated(pluginId)) {
                        // If enabling a plugin that can be activated, activate it
                        await this._registry.activatePlugin(pluginId);
                    }
                }
            }
            return success;
        }
        catch (error) {
            console.error(`Failed to ${enabled ? 'enable' : 'disable'} JSON plugin ${pluginId}:`, error);
            return false;
        }
    }
}
exports.JsonPluginLoader = JsonPluginLoader;
//# sourceMappingURL=json-plugin-loader.js.map