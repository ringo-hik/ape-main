import * as vscode from 'vscode';
import { PluginMetadata, PluginRegistry } from '../types/plugin';
import { PluginSettingsManager } from '../types/settings';
import { JSONPluginSchema } from '../types/json-plugin-schema';
/**
 * Settings plugin loader manages loading and initializing plugin settings and JSON plugins
 */
export declare class SettingsPluginLoader {
    private readonly _extensionContext;
    private readonly _registry;
    private readonly _settingsManager;
    private _templates;
    private _jsonPlugins;
    private readonly _builtInTemplateIds;
    private readonly _templatesPath;
    private readonly _disposables;
    /**
     * Creates a new settings plugin loader
     * @param _extensionContext Extension context
     * @param _registry Plugin registry
     * @param _settingsManager Plugin settings manager
     */
    constructor(_extensionContext: vscode.ExtensionContext, _registry: PluginRegistry, _settingsManager: PluginSettingsManager);
    /**
     * Load plugin templates from the filesystem and settings
     */
    private _loadTemplates;
    /**
     * Load built-in templates from the filesystem
     */
    private _loadBuiltInTemplates;
    /**
     * Create default templates if they don't exist
     */
    private _createDefaultTemplates;
    /**
     * Create Jira template
     */
    private _createJiraTemplate;
    /**
     * Create Bitbucket template
     */
    private _createBitbucketTemplate;
    /**
     * Create Pocket/S3 template
     */
    private _createPocketTemplate;
    /**
     * Create SWDP template
     */
    private _createSWDPTemplate;
    /**
     * Load custom templates from settings
     */
    private _loadCustomTemplates;
    /**
     * Load settings for all plugins from configuration
     */
    private _loadPluginSettings;
    /**
     * Process a built-in template plugin
     * @param pluginId Plugin ID
     * @param settings Plugin settings
     */
    private _processBuiltInTemplate;
    /**
     * Process a plugin from settings
     * @param pluginId Plugin ID
     * @param settings Plugin settings
     */
    private _processPluginSettings;
    /**
     * Process a custom plugin from settings
     * @param pluginId Plugin ID
     * @param settings Plugin settings including JSON definition
     */
    private _processCustomPlugin;
    /**
     * Register all loaded JSON plugins with the plugin registry
     */
    private _registerJsonPlugins;
    /**
     * Register plugin settings schema with the settings manager
     * @param plugin Plugin instance
     */
    private _registerPluginSettingsSchema;
    /**
     * Apply settings to a specific plugin
     * @param pluginId Plugin ID
     * @param settings Settings object
     */
    private _applyPluginSettings;
    /**
     * Handle plugin state changes
     * @param pluginId Plugin ID
     * @param oldState Old plugin state
     * @param newState New plugin state
     */
    private _handlePluginStateChange;
    /**
     * Handle configuration changes
     * @param event Configuration change event
     */
    private _handleConfigChange;
    /**
     * Get all available templates
     * @returns Map of templates by ID
     */
    getTemplates(): Map<string, JSONPluginSchema>;
    /**
     * Get a template by ID
     * @param templateId Template ID
     * @returns Template schema or undefined
     */
    getTemplate(templateId: string): JSONPluginSchema | undefined;
    /**
     * Create a new plugin from a template
     * @param templateId Template ID
     * @param pluginId New plugin ID
     * @param customizations Custom configuration values
     * @returns Promise resolving to true if successful
     */
    createPluginFromTemplate(templateId: string, pluginId: string, customizations: Record<string, any>): Promise<boolean>;
    /**
     * Customize a template and save it as a custom template
     * @param templateId Original template ID
     * @param newTemplateId New template ID
     * @param customizations Customizations to apply to the template
     * @returns Promise resolving to true if successful
     */
    customizeTemplate(templateId: string, newTemplateId: string, customizations: Record<string, any>): Promise<boolean>;
    /**
     * Get customizable fields for a template
     * @param templateId Template ID
     * @returns Array of customizable field definitions
     */
    getTemplateCustomizableFields(templateId: string): Array<{
        path: string;
        name: string;
        description: string;
        type: string;
        defaultValue: any;
    }>;
    /**
     * Delete a custom template
     * @param templateId Template ID to delete
     * @returns Promise resolving to true if successful
     */
    deleteTemplate(templateId: string): Promise<boolean>;
    /**
     * Update an existing plugin
     * @param pluginId Plugin ID
     * @param customizations Updated configuration values
     * @returns Promise resolving to true if successful
     */
    updatePlugin(pluginId: string, customizations: Record<string, any>): Promise<boolean>;
    /**
     * Enable or disable a plugin
     * @param pluginId Plugin ID
     * @param disabled Whether to disable the plugin
     * @returns Promise resolving to true if successful
     */
    setPluginDisabled(pluginId: string, disabled: boolean): Promise<boolean>;
    /**
     * Delete a custom plugin
     * @param pluginId Plugin ID
     * @returns Promise resolving to true if successful
     */
    deletePlugin(pluginId: string): Promise<boolean>;
    /**
     * Add a new plugin setting
     * @param pluginId Plugin ID
     * @param settings Settings object
     * @returns Promise resolving to true if successful
     */
    addPluginSettings(pluginId: string, settings: any): Promise<boolean>;
    /**
     * Get settings for a specific plugin
     * @param pluginId Plugin ID
     * @returns Plugin settings or undefined
     */
    getPluginSettings(pluginId: string): any;
    /**
     * Check if a plugin is disabled in settings
     * @param pluginId Plugin ID
     * @returns Whether the plugin is disabled
     */
    isPluginDisabled(pluginId: string): boolean;
    /**
     * Initialize a new plugin with default settings
     * @param pluginId Plugin ID
     * @param metadata Plugin metadata
     * @returns Promise resolving to true if successful
     */
    initializePluginSettings(pluginId: string, metadata: PluginMetadata): Promise<boolean>;
    /**
     * Dispose of resources
     */
    dispose(): void;
}
