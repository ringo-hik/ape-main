import { IPlugin, PluginCommand } from '../../types/PluginTypes';
import { CommandType, CommandPrefix } from '../../types/CommandTypes';
import { HttpClientService } from '../../core/http/HttpClientService';
import { HttpMethod } from '../../types/HttpTypes';

// API 명령어 설정
export interface ApiCommandConfig {
  id: string;
  name?: string;
  description?: string;
  syntax?: string;
  examples?: string[];
  api: {
    endpoint: string;
    method: string;
    headers?: Record<string, string>;
    body?: any;
    query?: Record<string, string>;
  };
}

// 동적 플러그인 서비스
export class DynamicPluginService implements IPlugin {
  public id: string;
  public name: string;
  private _description: string;
  private _commands: PluginCommand[] = [];
  private _enabled: boolean = true;
  private _initialized: boolean = false;
  private _httpClient: HttpClientService;
  private _apiCommandConfigs: ApiCommandConfig[] = [];

  constructor(
    id: string,
    name: string,
    description: string,
    apiCommands: ApiCommandConfig[],
    httpClient: HttpClientService
  ) {
    this.id = id;
    this.name = name;
    this._description = description;
    this._httpClient = httpClient;
    this._apiCommandConfigs = apiCommands;
  }

  public async initialize(): Promise<void> {
    this._commands = [];
    
    for (const cmdConfig of this._apiCommandConfigs) {
      try {
        const command: PluginCommand = {
          id: cmdConfig.id,
          name: cmdConfig.id, // ID와 동일하게 설정
          type: CommandType.AT,
          prefix: CommandPrefix.AT,
          description: cmdConfig.description || '',
          syntax: cmdConfig.syntax || `@${this.id}:${cmdConfig.id}`,
          examples: cmdConfig.examples || [],
          handler: async (...args: any[]) => this.executeApiCommand(cmdConfig, args)
        };
        
        this._commands.push(command);
      } catch (error) {
        console.error(`API command initialization error (${cmdConfig.id}):`, error);
      }
    }
    
    this._initialized = true;
  }

  public getCommands(): PluginCommand[] {
    return this._commands;
  }

  public async executeCommand(command: string, args: any[]): Promise<any> {
    const cmd = this._commands.find(c => c.id === command);
    if (!cmd) {
      throw new Error(`Command not found: ${command}`);
    }

    if (!cmd.handler) {
      throw new Error(`Command handler not defined: ${command}`);
    }

    try {
      return await cmd.handler(...args);
    } catch (error) {
      console.error(`Command execution error (${command}):`, error);
      throw error;
    }
  }

  private async executeApiCommand(config: ApiCommandConfig, args: any[]): Promise<any> {
    try {
      const endpoint = this.processTemplate(config.api.endpoint, args);
      // 문자열에서 HttpMethod 열거형으로 변환
      const methodStr = config.api.method.toUpperCase();
      const method = methodStr as HttpMethod;
      
      const headers: Record<string, string> = {};
      if (config.api.headers) {
        for (const [key, value] of Object.entries(config.api.headers)) {
          headers[key] = this.processTemplate(value, args);
        }
      }
      
      let body: any = null;
      if (config.api.body) {
        if (typeof config.api.body === 'string') {
          body = this.processTemplate(config.api.body, args);
        } else {
          body = this.processTemplateObject(config.api.body, args);
        }
      }
      
      const queryParams: Record<string, string> = {};
      if (config.api.query) {
        for (const [key, value] of Object.entries(config.api.query)) {
          queryParams[key] = this.processTemplate(value, args);
        }
      }
      
      const response = await this._httpClient.request({
        url: endpoint,
        method,
        headers,
        body: body, // data -> body로 수정
        params: queryParams
      });
      
      return response.data;
    } catch (error) {
      console.error(`API call error (${config.id}):`, error);
      throw error;
    }
  }

  private processTemplate(template: string, args: any[]): string {
    if (!template) return '';
    
    let result = template.replace(/\${arg(\d+)}/g, (match, index) => {
      const argIndex = parseInt(index, 10);
      return argIndex < args.length ? args[argIndex].toString() : '';
    });
    
    result = result.replace(/\${flag:([^}]+)}/g, (match, flagName) => {
      const flagArg = args.find(arg => arg === `--${flagName}` || arg.startsWith(`--${flagName}=`));
      
      if (!flagArg) return 'false';
      
      if (flagArg === `--${flagName}`) {
        return 'true';
      }
      
      const equalIndex = flagArg.indexOf('=');
      if (equalIndex >= 0) {
        return flagArg.substring(equalIndex + 1);
      }
      
      return 'true';
    });
    
    result = result.replace(/\${TIMESTAMP}/g, Date.now().toString());
    
    return result;
  }

  private processTemplateObject(obj: any, args: any[]): any {
    if (!obj) return null;
    
    if (typeof obj === 'string') {
      return this.processTemplate(obj, args);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.processTemplateObject(item, args));
    }
    
    if (typeof obj === 'object') {
      const result: any = {};
      
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.processTemplateObject(value, args);
      }
      
      return result;
    }
    
    return obj;
  }

  public isEnabled(): boolean {
    return this._enabled;
  }

  public setEnabled(enabled: boolean): void {
    this._enabled = enabled;
  }

  public isInitialized(): boolean {
    return this._initialized;
  }
}