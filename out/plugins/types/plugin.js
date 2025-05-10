"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginFeatureType = exports.PluginActivationError = exports.PluginState = void 0;
/**
 * Possible states for a plugin
 */
var PluginState;
(function (PluginState) {
    /** Plugin has been discovered but not registered yet */
    PluginState["Discovered"] = "discovered";
    /** Plugin is registered but not activated */
    PluginState["Registered"] = "registered";
    /** Plugin is currently being activated */
    PluginState["Activating"] = "activating";
    /** Plugin is active */
    PluginState["Active"] = "active";
    /** Plugin is currently being deactivated */
    PluginState["Deactivating"] = "deactivating";
    /** Plugin has been activated and is now deactivated */
    PluginState["Inactive"] = "inactive";
    /** Plugin activation failed */
    PluginState["ActivationFailed"] = "activation_failed";
    /** Plugin is disabled */
    PluginState["Disabled"] = "disabled";
})(PluginState || (exports.PluginState = PluginState = {}));
/**
 * Error thrown when plugin activation fails
 */
class PluginActivationError extends Error {
    pluginId;
    cause;
    constructor(pluginId, message, cause) {
        super(`Failed to activate plugin ${pluginId}: ${message}${cause ? ` (${cause.message})` : ''}`);
        this.pluginId = pluginId;
        this.cause = cause;
        this.name = 'PluginActivationError';
    }
}
exports.PluginActivationError = PluginActivationError;
/**
 * Supported plugin feature types
 */
var PluginFeatureType;
(function (PluginFeatureType) {
    // UI components
    PluginFeatureType["WebviewPanel"] = "webview_panel";
    PluginFeatureType["StatusBarItem"] = "status_bar_item";
    PluginFeatureType["TreeView"] = "tree_view";
    // Commands and actions
    PluginFeatureType["Command"] = "command";
    PluginFeatureType["ContextMenu"] = "context_menu";
    PluginFeatureType["KeyBinding"] = "key_binding";
    // Language features
    PluginFeatureType["CodeLens"] = "code_lens";
    PluginFeatureType["CompletionProvider"] = "completion_provider";
    PluginFeatureType["DiagnosticProvider"] = "diagnostic_provider";
    PluginFeatureType["FormattingProvider"] = "formatting_provider";
    // Other
    PluginFeatureType["Watcher"] = "watcher";
    PluginFeatureType["Task"] = "task";
    PluginFeatureType["Custom"] = "custom";
})(PluginFeatureType || (exports.PluginFeatureType = PluginFeatureType = {}));
//# sourceMappingURL=plugin.js.map