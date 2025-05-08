import * as vscode from 'vscode';
import { PluginAPI } from './api';
/**
 * Possible states for a plugin
 */
export declare enum PluginState {
    /** Plugin has been discovered but not registered yet */
    Discovered = "discovered",
    /** Plugin is registered but not activated */
    Registered = "registered",
    /** Plugin is currently being activated */
    Activating = "activating",
    /** Plugin is active */
    Active = "active",
    /** Plugin is currently being deactivated */
    Deactivating = "deactivating",
    /** Plugin has been activated and is now deactivated */
    Inactive = "inactive",
    /** Plugin activation failed */
    ActivationFailed = "activation_failed",
    /** Plugin is disabled */
    Disabled = "disabled"
}
/**
 * Error thrown when plugin activation fails
 */
export declare class PluginActivationError extends Error {
    readonly pluginId: string;
    readonly cause?: Error | undefined;
    constructor(pluginId: string, message: string, cause?: Error | undefined);
}
/**
 * Supported plugin feature types
 */
export declare enum PluginFeatureType {
    WebviewPanel = "webview_panel",
    StatusBarItem = "status_bar_item",
    TreeView = "tree_view",
    Command = "command",
    ContextMenu = "context_menu",
    KeyBinding = "key_binding",
    CodeLens = "code_lens",
    CompletionProvider = "completion_provider",
    DiagnosticProvider = "diagnostic_provider",
    FormattingProvider = "formatting_provider",
    Watcher = "watcher",
    Task = "task",
    Custom = "custom"
}
/**
 * Plugin feature descriptor
 */
export interface PluginFeature {
    /** Feature type */
    type: PluginFeatureType;
    /** Feature ID (must be unique within the plugin) */
    id: string;
    /** Display name for the feature */
    name: string;
    /** Optional description */
    description?: string;
}
/**
 * Plugin configuration schema
 */
export interface PluginConfigSchema {
    /** Configuration properties */
    properties: {
        [key: string]: {
            /** Value type */
            type: 'string' | 'number' | 'boolean' | 'array' | 'object';
            /** Default value */
            default?: any;
            /** Description */
            description?: string;
            /** Enumeration of allowed values (for string type) */
            enum?: string[];
        };
    };
}
/**
 * Plugin metadata describes a plugin and its capabilities
 */
export interface PluginMetadata {
    /** Unique plugin identifier */
    id: string;
    /** Display name */
    name: string;
    /** Plugin version */
    version: string;
    /** Plugin description */
    description?: string;
    /** Plugin author */
    author?: string;
    /** Path to icon (if any) */
    icon?: string;
    /** Plugin homepage/repository */
    homepage?: string;
    /** IDs of plugins this plugin depends on */
    dependencies?: string[];
    /** Default activation triggers */
    activationEvents?: string[];
    /** Features provided by this plugin */
    features?: PluginFeature[];
    /** Configuration schema */
    configuration?: PluginConfigSchema;
    /** Plugin category */
    category?: string;
    /** Minimum VSCode version supported */
    minVSCodeVersion?: string;
    /** Whether this is a built-in plugin */
    isBuiltIn?: boolean;
    /** Whether plugin should be enabled by default */
    enabledByDefault?: boolean;
}
/**
 * Context provided to plugins during activation
 */
export interface PluginContext {
    /** Extension context */
    extensionContext: vscode.ExtensionContext;
    /** Plugin API */
    api: PluginAPI;
    /** Plugin metadata */
    metadata: PluginMetadata;
    /** Plugin-specific storage path */
    storagePath: string;
    /** Plugin-specific subscription handler for resource cleanup */
    subscriptions: vscode.Disposable[];
    /** Logger for plugin */
    log(message: string, severity?: 'info' | 'warn' | 'error'): void;
    /** Get plugin configuration */
    getConfig<T>(key: string): T | undefined;
    /** Update plugin configuration */
    updateConfig<T>(key: string, value: T): Promise<void>;
}
/**
 * Core plugin interface that all plugins must implement
 */
export interface Plugin {
    /** Plugin activation handler */
    activate(context: PluginContext): Promise<void>;
    /** Plugin deactivation handler */
    deactivate?(): Promise<void>;
}
/**
 * Plugin instance with metadata and state information
 */
export interface PluginInstance {
    /** Plugin ID */
    id: string;
    /** Plugin metadata */
    metadata: PluginMetadata;
    /** Plugin implementation */
    implementation: Plugin;
    /** Plugin state */
    state: PluginState;
    /** Error details if activation failed */
    error?: Error;
    /** Plugin context (only available when active) */
    context?: PluginContext;
}
/**
 * Plugin registry manages the lifecycle of plugins
 */
export interface PluginRegistry {
    /** Register a plugin with the registry */
    registerPlugin(plugin: Plugin, metadata: PluginMetadata): Promise<string>;
    /** Unregister a plugin from the registry */
    unregisterPlugin(pluginId: string): Promise<boolean>;
    /** Activate a plugin */
    activatePlugin(pluginId: string): Promise<boolean>;
    /** Deactivate a plugin */
    deactivatePlugin(pluginId: string): Promise<boolean>;
    /** Check if a plugin is active */
    isPluginActive(pluginId: string): boolean;
    /** Get a plugin instance by ID */
    getPlugin(pluginId: string): PluginInstance | undefined;
    /** Get all registered plugins */
    getAllPlugins(): PluginInstance[];
    /** Get plugins by state */
    getPluginsByState(state: PluginState): PluginInstance[];
    /** Get active plugins only */
    getActivePlugins(): PluginInstance[];
    /** Subscribe to plugin state changes */
    onDidChangePluginState(listener: (pluginId: string, oldState: PluginState, newState: PluginState) => void): vscode.Disposable;
}
