import * as vscode from 'vscode';
import { EventEmitter } from '../types/events';
import { 
  Plugin, 
  PluginMetadata, 
  PluginRegistry, 
  PluginInstance, 
  PluginState,
  // PluginContext, // 현재 사용하지 않음
  PluginActivationError
} from '../types/plugin';

/**
 * Implementation of the Plugin Registry
 */
export class PluginRegistryImpl implements PluginRegistry {
  /** Maps plugin IDs to plugin instances */
  private _plugins: Map<string, PluginInstance> = new Map();
  
  /** Event emitters for plugin state changes */
  private _stateChangeEmitter = new vscode.EventEmitter<{
    pluginId: string;
    oldState: PluginState;
    newState: PluginState;
  }>();
  
  /** Observable for plugin state changes */
  public readonly onDidChangePluginState = (listener: (pluginId: string, oldState: PluginState, newState: PluginState) => void): vscode.Disposable => {
    return this._stateChangeEmitter.event(e => listener(e.pluginId, e.oldState, e.newState));
  };
  
  /**
   * Creates a new plugin registry
   * @param _eventEmitter Event emitter for plugin events
   */
  constructor(private readonly _eventEmitter: EventEmitter) {}
  
  /**
   * Register a plugin with the registry
   * @param plugin Plugin implementation
   * @param metadata Plugin metadata
   * @returns Promise that resolves to the plugin ID
   */
  public async registerPlugin(plugin: Plugin, metadata: PluginMetadata): Promise<string> {
    // Check for duplicate plugin ID
    if (this._plugins.has(metadata.id)) {
      throw new Error(`Plugin with ID ${metadata.id} is already registered`);
    }
    
    // Create plugin instance
    const instance: PluginInstance = {
      id: metadata.id,
      metadata,
      implementation: plugin,
      state: PluginState.Registered
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
  public async unregisterPlugin(pluginId: string): Promise<boolean> {
    const plugin = this._plugins.get(pluginId);
    
    if (!plugin) {
      return false;
    }
    
    // Deactivate plugin if it's active
    if (plugin.state === PluginState.Active) {
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
  public async activatePlugin(pluginId: string): Promise<boolean> {
    const plugin = this._plugins.get(pluginId);
    
    if (!plugin) {
      return false;
    }
    
    // Check if already active or activating
    if (plugin.state === PluginState.Active) {
      return true;
    }
    
    if (plugin.state === PluginState.Activating) {
      return false; // Already activating
    }
    
    // Update state to activating
    this._changePluginState(plugin, PluginState.Activating);
    
    try {
      // Check and activate dependencies if needed
      if (plugin.metadata.dependencies?.length) {
        for (const depId of plugin.metadata.dependencies) {
          const dependency = this._plugins.get(depId);
          
          if (!dependency) {
            throw new PluginActivationError(
              pluginId,
              `Missing dependency: ${depId}`
            );
          }
          
          if (dependency.state !== PluginState.Active) {
            const success = await this.activatePlugin(depId);
            if (!success) {
              throw new PluginActivationError(
                pluginId,
                `Failed to activate dependency: ${depId}`
              );
            }
          }
        }
      }
      
      // Context will be provided by PluginLoader
      if (!plugin.context) {
        throw new PluginActivationError(
          pluginId,
          'Plugin context not set. This is likely an internal error.'
        );
      }
      
      // Activate the plugin
      await plugin.implementation.activate(plugin.context);
      
      // Update state to active
      this._changePluginState(plugin, PluginState.Active);
      
      // Emit event
      this._eventEmitter.emit('plugin:activated', {
        pluginId,
        metadata: plugin.metadata
      });
      
      return true;
    } catch (error) {
      // Update state to activation failed
      plugin.error = error instanceof Error ? error : new Error(String(error));
      this._changePluginState(plugin, PluginState.ActivationFailed);
      
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
  public async deactivatePlugin(pluginId: string): Promise<boolean> {
    const plugin = this._plugins.get(pluginId);
    
    if (!plugin) {
      return false;
    }
    
    // Check if already inactive or deactivating
    if (plugin.state === PluginState.Inactive || 
        plugin.state === PluginState.Registered ||
        plugin.state === PluginState.Discovered) {
      return true;
    }
    
    if (plugin.state === PluginState.Deactivating) {
      return false; // Already deactivating
    }
    
    // Check if this plugin is a dependency of any active plugins
    const activePlugins = this.getPluginsByState(PluginState.Active);
    const dependents = activePlugins.filter(p => 
      p.metadata.dependencies?.includes(pluginId)
    );
    
    // Deactivate dependents first
    for (const dependent of dependents) {
      await this.deactivatePlugin(dependent.id);
    }
    
    // Update state to deactivating
    this._changePluginState(plugin, PluginState.Deactivating);
    
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
          } catch (error) {
            console.error(`Error disposing subscription for plugin ${pluginId}:`, error);
          }
        }
      }
      
      // Update state to inactive
      this._changePluginState(plugin, PluginState.Inactive);
      
      // Clear error if previously failed
      delete plugin.error;
      
      // Emit event
      this._eventEmitter.emit('plugin:deactivated', {
        pluginId,
        metadata: plugin.metadata
      });
      
      return true;
    } catch (error) {
      // Still mark as inactive, but keep error
      plugin.error = error instanceof Error ? error : new Error(String(error));
      this._changePluginState(plugin, PluginState.Inactive);
      
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
  public isPluginActive(pluginId: string): boolean {
    const plugin = this._plugins.get(pluginId);
    return plugin?.state === PluginState.Active;
  }
  
  /**
   * Get a plugin instance by ID
   * @param pluginId Plugin ID to get
   * @returns Plugin instance or undefined if not found
   */
  public getPlugin(pluginId: string): PluginInstance | undefined {
    return this._plugins.get(pluginId);
  }
  
  /**
   * Get all registered plugins
   * @returns Array of all plugin instances
   */
  public getAllPlugins(): PluginInstance[] {
    return Array.from(this._plugins.values());
  }
  
  /**
   * Get plugins by state
   * @param state State to filter by
   * @returns Array of matching plugin instances
   */
  public getPluginsByState(state: PluginState): PluginInstance[] {
    return Array.from(this._plugins.values()).filter(p => p.state === state);
  }
  
  /**
   * Get active plugins only
   * @returns Array of active plugin instances
   */
  public getActivePlugins(): PluginInstance[] {
    return this.getPluginsByState(PluginState.Active);
  }
  
  /**
   * Update a plugin's state and emit change event
   * @param plugin Plugin instance to update
   * @param newState New state to set
   */
  private _changePluginState(plugin: PluginInstance, newState: PluginState): void {
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