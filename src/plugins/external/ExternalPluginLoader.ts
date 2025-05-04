import * as vscode from 'vscode';
import { PluginRegistryService } from '../../core/plugin-system/PluginRegistryService';
import { ConfigLoaderService } from '../../core/config/ConfigLoaderService';
import { PluginType } from '../../types/PluginTypes';
import { DynamicPluginService } from './DynamicPluginService';
import { HttpClientService } from '../../core/http/HttpClientService';

// 외부 플러그인 로더
export class ExternalPluginLoader {
  private _pluginRegistry: PluginRegistryService;
  private _configLoader: ConfigLoaderService;
  private _httpClient: HttpClientService;

  constructor(
    pluginRegistry: PluginRegistryService,
    configLoader: ConfigLoaderService,
    httpClient: HttpClientService
  ) {
    this._pluginRegistry = pluginRegistry;
    this._configLoader = configLoader;
    this._httpClient = httpClient;
  }

  public async loadExternalPlugins(): Promise<number> {
    try {
      const pluginsConfig = this._configLoader.getPluginConfig();
      if (!pluginsConfig) {
        console.log('No external plugin configuration found');
        return 0;
      }
      
      // Type assertion to avoid TypeScript errors with unknown type
      const typedPluginsConfig = pluginsConfig as Record<string, any>;

      let loadedCount = 0;

      for (const [pluginId, pluginConfig] of Object.entries(typedPluginsConfig.plugins || {})) {
        try {
          // Type assertion for plugin config
          const typedConfig = pluginConfig as Record<string, any>;
          
          if (!typedConfig.enabled) {
            continue;
          }

          const dynamicPlugin = new DynamicPluginService(
            pluginId,
            typedConfig.name || pluginId,
            typedConfig.description || '',
            typedConfig.commands || [],
            this._httpClient
          );

          const registered = this._pluginRegistry.registerPlugin(
            dynamicPlugin,
            PluginType.EXTERNAL
          );

          if (registered) {
            loadedCount++;
          }
        } catch (error) {
          console.error(`External plugin load error (${pluginId}):`, error);
        }
      }
      return loadedCount;
    } catch (error) {
      console.error('External plugin loading error:', error);
      return 0;
    }
  }

  public async reloadExternalPlugins(): Promise<number> {
    const plugins = this._pluginRegistry.getExternalPlugins();
    for (const plugin of plugins) {
      this._pluginRegistry.unregisterPlugin(plugin.id, PluginType.EXTERNAL);
    }

    return this.loadExternalPlugins();
  }
}