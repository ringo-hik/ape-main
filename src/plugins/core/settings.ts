import * as vscode from 'vscode';
import { PluginSettingsManager, PluginSettingsSchema } from '../types/settings';

/**
 * Implementation of PluginSettingsManager
 */
export class PluginSettingsManagerImpl implements PluginSettingsManager {
  // Map of registered schemas by plugin ID
  private _schemas: Map<string, PluginSettingsSchema> = new Map();
  
  // Map of configuration change listeners
  private _listeners: Map<string, vscode.Disposable[]> = new Map();
  
  /**
   * Creates a new PluginSettingsManager
   * @param _extensionContext Extension context
   */
  constructor(private readonly _extensionContext: vscode.ExtensionContext) {
    // Listen for configuration changes
    vscode.workspace.onDidChangeConfiguration(this._handleConfigChange, this);
  }
  
  /**
   * Register configuration schema for a plugin
   * @param pluginId Plugin ID
   * @param schema Settings schema
   */
  public registerSettings(pluginId: string, schema: PluginSettingsSchema): void {
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
  public getConfiguration(pluginId: string): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(`ape.plugins.${pluginId}`);
  }
  
  /**
   * Get a specific setting value
   * @param pluginId Plugin ID
   * @param key Setting key
   * @param defaultValue Default value if setting is not found
   * @returns Setting value or default value
   */
  public get<T>(pluginId: string, key: string, defaultValue?: T): T {
    const config = this.getConfiguration(pluginId);
    return config.get<T>(key, defaultValue as T);
  }
  
  /**
   * Update a specific setting value
   * @param pluginId Plugin ID
   * @param key Setting key
   * @param value New value
   * @param configurationTarget Where to update the setting
   * @returns Promise that resolves when the update is complete
   */
  public async update<T>(
    pluginId: string,
    key: string,
    value: T,
    configurationTarget: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global
  ): Promise<void> {
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
  public onDidChangeConfiguration(
    pluginId: string,
    key: string,
    callback: (newValue: any) => void
  ): vscode.Disposable {
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
    (disposable as any)._lastValue = initialValue;
    (disposable as any)._pluginId = pluginId;
    (disposable as any)._key = key;
    (disposable as any)._callback = callback;
    
    return disposable;
  }
  
  /**
   * Handle configuration changes
   * @param event Configuration change event
   */
  private _handleConfigChange(event: vscode.ConfigurationChangeEvent): void {
    // Check each plugin and its listeners
    for (const [pluginId, listeners] of this._listeners.entries()) {
      const configSection = `ape.plugins.${pluginId}`;
      
      if (event.affectsConfiguration(configSection)) {
        // Configuration for this plugin has changed
        for (const listener of listeners) {
          // Get stored properties
          const key = (listener as any)._key;
          const lastValue = (listener as any)._lastValue;
          const callback = (listener as any)._callback;
          
          // Check if this specific key was affected
          if (event.affectsConfiguration(`${configSection}.${key}`)) {
            // Get the new value
            const newValue = this.get(pluginId, key);
            
            // Only notify if value actually changed
            if (JSON.stringify(newValue) !== JSON.stringify(lastValue)) {
              // Update stored last value
              (listener as any)._lastValue = newValue;
              
              // Call the callback with the new value
              try {
                callback(newValue);
              } catch (error) {
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
  public dispose(): void {
    // Clear all listeners
    this._listeners.clear();
    this._schemas.clear();
  }
}