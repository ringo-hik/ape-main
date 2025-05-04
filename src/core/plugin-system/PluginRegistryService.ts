/**
 * 플러그인 레지스트리
 * 
 * 내부 및 외부 플러그인 등록 및 관리
 * 명령어 등록 및 실행 관리
 */

import { EventEmitter } from 'events';
import { IPlugin, IPluginRegistry, PluginCommand, PluginType } from '../../types/PluginTypes';
import { IConfigLoader } from '../../types/ConfigTypes';

/**
 * 플러그인 레지스트리 클래스
 * 플러그인 등록 및 관리
 */
export class PluginRegistryService extends EventEmitter implements IPluginRegistry {
  /**
   * 내부 플러그인 맵
   */
  private _internalPlugins: Map<string, IPlugin> = new Map();
  
  /**
   * 외부 플러그인 맵
   */
  private _externalPlugins: Map<string, IPlugin> = new Map();
  
  /**
   * 플러그인 레지스트리 생성자
   * @param configLoader 설정 로더
   */
  constructor(private configLoader: IConfigLoader) {
    super();
  }
  
  /**
   * 플러그인 등록
   * @param plugin 등록할 플러그인
   * @param type 플러그인 타입 (기본: 외부)
   * @returns 등록 성공 여부
   */
  registerPlugin(plugin: IPlugin, type: PluginType | string = PluginType.EXTERNAL): boolean {
    try {
      if (!plugin || !plugin.id) {
        console.error('유효하지 않은 플러그인:', plugin);
        return false;
      }
      
      // 플러그인 인터페이스 디버깅
      console.log('플러그인 등록 시도:', {
        id: plugin.id,
        name: plugin.name,
        methods: Object.getOwnPropertyNames(plugin),
        type: type
      });
      
      // 문자열로 전달된 경우 PluginType 열거형으로 변환
      const pluginType = typeof type === 'string' ? 
        (type === 'internal' ? PluginType.INTERNAL : PluginType.EXTERNAL) : type;
      
      const pluginMap = pluginType === PluginType.INTERNAL ? 
        this._internalPlugins : this._externalPlugins;
      
      // 이미 등록된 플러그인 확인
      if (pluginMap.has(plugin.id)) {
        console.warn(`이미 등록된 플러그인: ${plugin.id}`);
        return false;
      }
      
      // 플러그인 등록
      pluginMap.set(plugin.id, plugin);
      console.log(`플러그인 등록 성공: ${plugin.id} (${pluginType})`);
      this.emit('plugin-registered', { id: plugin.id, type: pluginType });
      return true;
    } catch (error) {
      console.error(`플러그인 등록 중 오류 발생 (${plugin?.id}):`, error);
      console.error('오류 세부 정보:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      return false;
    }
  }
  
  /**
   * 플러그인 제거
   * @param pluginId 플러그인 ID
   * @param type 플러그인 타입 (기본: 외부)
   * @returns 제거 성공 여부
   */
  unregisterPlugin(pluginId: string, type: PluginType | string = PluginType.EXTERNAL): boolean {
    try {
      // 문자열로 전달된 경우 PluginType 열거형으로 변환
      const pluginType = typeof type === 'string' ? 
        (type === 'internal' ? PluginType.INTERNAL : PluginType.EXTERNAL) : type;
      
      const pluginMap = pluginType === PluginType.INTERNAL ? 
        this._internalPlugins : this._externalPlugins;
      
      if (!pluginMap.has(pluginId)) {
        console.warn(`등록되지 않은 플러그인: ${pluginId}`);
        return false;
      }
      
      pluginMap.delete(pluginId);
      this.emit('plugin-unregistered', { id: pluginId, type: pluginType });
      return true;
    } catch (error) {
      console.error(`플러그인 제거 중 오류 발생 (${pluginId}):`, error);
      return false;
    }
  }
  
  /**
   * 플러그인 가져오기
   * @param pluginId 플러그인 ID
   * @returns 플러그인 또는 undefined
   */
  getPlugin(pluginId: string): IPlugin | undefined {
    return this._internalPlugins.get(pluginId) || this._externalPlugins.get(pluginId);
  }
  
  /**
   * 내부 플러그인 목록 가져오기
   * @returns 내부 플러그인 목록
   */
  getInternalPlugins(): IPlugin[] {
    return Array.from(this._internalPlugins.values());
  }
  
  /**
   * 외부 플러그인 목록 가져오기
   * @returns 외부 플러그인 목록
   */
  getExternalPlugins(): IPlugin[] {
    return Array.from(this._externalPlugins.values());
  }
  
  /**
   * 모든 플러그인 가져오기
   * @returns 플러그인 목록
   */
  getAllPlugins(): IPlugin[] {
    return [...this.getInternalPlugins(), ...this.getExternalPlugins()];
  }
  
  /**
   * 활성화된 플러그인 목록 가져오기
   * @returns 활성화된 플러그인 목록
   */
  getEnabledPlugins(): IPlugin[] {
    return this.getAllPlugins().filter(plugin => plugin.isEnabled());
  }
  
  /**
   * 모든 플러그인 명령어 가져오기
   * @returns 명령어 목록
   */
  getAllCommands(): PluginCommand[] {
    const commands: PluginCommand[] = [];
    
    for (const plugin of this.getAllPlugins()) {
      if (plugin.isEnabled()) {
        commands.push(...plugin.getCommands());
      }
    }
    
    return commands;
  }
  
  /**
   * 모든 플러그인 초기화
   * @returns 초기화 성공 여부
   */
  async initialize(): Promise<boolean> {
    try {
      for (const plugin of this.getAllPlugins()) {
        if (plugin.isEnabled()) {
          try {
            await plugin.initialize();
          } catch (error) {
            console.error(`플러그인 초기화 중 오류 발생 (${plugin.id}):`, error);
          }
        }
      }
      
      this.emit('plugins-initialized');
      return true;
    } catch (error) {
      console.error('플러그인 초기화 중 오류 발생:', error);
      return false;
    }
  }
  
  /**
   * 명령어로 플러그인 및 메서드 찾기
   * @param pluginId 플러그인 ID
   * @param commandName 명령어 이름
   * @returns 플러그인과 명령어 정보
   */
  findCommand(pluginId: string, commandName: string): { plugin: IPlugin, command: PluginCommand } | null {
    const plugin = this.getPlugin(pluginId);
    
    if (!plugin || !plugin.isEnabled()) {
      return null;
    }
    
    const command = plugin.getCommands().find(cmd => (cmd.name === commandName) || (cmd.id === commandName));
    
    if (!command) {
      return null;
    }
    
    return { plugin, command };
  }
  
  /**
   * 명령어 실행
   * @param pluginId 플러그인 ID
   * @param commandName 명령어 이름
   * @param args 명령어 인자
   * @returns 실행 결과
   */
  async executeCommand(pluginId: string, commandName: string, args: any[]): Promise<any> {
    const found = this.findCommand(pluginId, commandName);
    
    if (!found) {
      throw new Error(`명령어를 찾을 수 없음: ${pluginId}:${commandName}`);
    }
    
    return await found.plugin.executeCommand(commandName, args);
  }
  
  /**
   * 외부 플러그인 로드
   * @returns 로드된 플러그인 수
   */
  async loadExternalPlugins(): Promise<number> {
    try {
      this._externalPlugins.clear();
      
      const pluginsConfig = this.configLoader.getPluginConfig();
      if (!pluginsConfig) {
        return 0;
      }
      
      // TODO: 설정에서 외부 플러그인 로드 로직 구현
      
      return this._externalPlugins.size;
    } catch (error) {
      console.error('외부 플러그인 로드 중 오류 발생:', error);
      return 0;
    }
  }
}