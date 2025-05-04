/**
 * 설정 로딩 및 관리 모듈
 * 
 * settings.json 설정 파일을 로드하고 관리하는 클래스
 * 내부 플러그인 및 외부 플러그인을 위한 설정 제공
 */

import * as fs from 'fs';
import * as path from 'path';
import { IConfigLoader, ConfigSection, CoreConfig, AgentConfig, PluginConfig } from '../../types/ConfigTypes';
import { ConfigValidatorService } from './ConfigValidatorService';

// VS Code 환경에서만 import되도록 타입 정의 분리
type VSCodeExtensionContext = {
  extensionPath: string;
  globalStorageUri?: { fsPath: string };
};

/**
 * 설정 로더 클래스
 * settings.json 파일을 로드하고 설정 값을 관리
 * VS Code 확장 및 CLI 환경 모두 지원
 */
export class ConfigLoaderService implements IConfigLoader {
  protected config: any = {};
  private validator: ConfigValidatorService;
  protected configPath: string;
  
  /**
   * ConfigLoaderService 생성자
   * @param context VSCode 확장 컨텍스트 (CLI 환경에서는 null)
   */
  constructor(private context?: VSCodeExtensionContext | null) {
    this.validator = new ConfigValidatorService();
    
    // 설정 파일 경로 설정
    if (context) {
      // VS Code 환경
      try {
        // VS Code API가 존재하는 경우에만 실행
        if (typeof require('vscode') !== 'undefined' && require('vscode').workspace) {
          const vscode = require('vscode');
          const workspaceFolders = vscode.workspace.workspaceFolders;
          if (workspaceFolders && workspaceFolders.length > 0) {
            this.configPath = path.join(workspaceFolders[0].uri.fsPath, 'settings.json');
            return;
          }
        }
      } catch (e) {
        // VS Code API 접근 실패 - 기본 경로 사용
      }
      
      // 워크스페이스 없는 경우 확장 경로 사용
      if (this.context && this.context.extensionPath) {
        this.configPath = path.join(this.context.extensionPath, 'settings.json');
      } else {
        // 확장 경로도 없는 경우 현재 디렉토리 사용
        this.configPath = path.join(process.cwd(), 'settings.json');
      }
    } else {
      // CLI 환경 - 현재 디렉토리 사용
      this.configPath = path.join(process.cwd(), 'settings.json');
    }
  }
  
  /**
   * 설정 로드
   * settings.json 파일을 로드하고 유효성 검증
   * @returns 로드 성공 여부
   */
  async load(): Promise<boolean> {
    try {
      // 설정 파일 존재 여부 확인
      if (!fs.existsSync(this.configPath)) {
        console.log('설정 파일이 없습니다. 템플릿 파일로부터 기본 설정을 생성합니다.');
        
        // 템플릿 파일 경로 결정
        let templatePath = '';
        if (this.context) {
          // VS Code 환경에서는 확장 경로 사용
          templatePath = path.join(this.context.extensionPath, 'settings.json.template');
        } else {
          // CLI 환경에서는 현재 디렉토리 혹은 실행 파일 위치 사용
          const possiblePaths = [
            path.join(process.cwd(), 'settings.json.template'),
            path.join(__dirname, '..', '..', '..', 'settings.json.template') // dist 폴더에서 상위로 이동
          ];
          
          for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
              templatePath = p;
              break;
            }
          }
        }
        
        // 템플릿 파일이 존재하는지 확인
        if (!templatePath || !fs.existsSync(templatePath)) {
          console.error('템플릿 설정 파일을 찾을 수 없음');
          return false;
        }
        
        // 템플릿 파일을 설정 파일로 복사
        fs.copyFileSync(templatePath, this.configPath);
        console.log(`기본 설정 파일이 생성되었습니다: ${this.configPath}`);
      }
      
      // 설정 파일 로드
      const configContent = fs.readFileSync(this.configPath, 'utf8');
      this.config = JSON.parse(configContent);
      
      // 로컬 설정 파일 로드 (있는 경우)
      const localConfigPath = path.join(path.dirname(this.configPath), 'settings.local.json');
      if (fs.existsSync(localConfigPath)) {
        try {
          const localConfigContent = fs.readFileSync(localConfigPath, 'utf8');
          const localConfig = JSON.parse(localConfigContent);
          
          // 로컬 설정을 기본 설정에 깊은 병합
          this.mergeDeep(this.config, localConfig);
          console.log('로컬 설정이 로드되었습니다:', localConfigPath);
        } catch (localError) {
          console.warn('로컬 설정 로드 중 오류 발생:', localError);
          // 로컬 설정 로드 실패는 전체 로드 실패로 간주하지 않음
        }
      }
      
      // 설정 유효성 검증
      const isValid = await this.validator.validate(this.config);
      if (!isValid) {
        console.error('설정 파일 유효성 검증 실패');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('설정 로드 중 오류 발생:', error);
      return false;
    }
  }
  
  /**
   * 객체 깊은 병합 (두 번째 객체의 속성을 첫 번째 객체에 병합)
   * @param target 대상 객체
   * @param source 소스 객체
   * @returns 병합된 객체
   */
  private mergeDeep(target: any, source: any): any {
    if (!source) return target;
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (source[key] instanceof Object && !Array.isArray(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          this.mergeDeep(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }
    
    return target;
  }
  
  /**
   * 특정 섹션의 설정 가져오기
   * @param section 설정 섹션 경로
   * @returns 설정 섹션 객체
   */
  getSection<T extends ConfigSection>(section: string): T {
    return this.get<T>(section, {} as T);
  }
  
  /**
   * 코어 설정 가져오기
   * @returns 코어 설정 객체
   */
  getCoreConfig(): CoreConfig {
    return this.getSection<CoreConfig>('core');
  }
  
  /**
   * 에이전트 설정 가져오기
   * @param agentId 에이전트 ID (생략 시 전체 에이전트 설정)
   * @returns 에이전트 설정 객체
   */
  getAgentConfig(agentId?: string): AgentConfig | Record<string, AgentConfig> {
    if (agentId) {
      return this.getSection<AgentConfig>(`agents.${agentId}`);
    }
    return this.getSection<Record<string, AgentConfig>>('agents');
  }
  
  /**
   * 플러그인 설정 가져오기
   * @param pluginId 플러그인 ID (생략 시 전체 플러그인 설정)
   * @returns 플러그인 설정 객체
   */
  getPluginConfig(pluginId?: string): PluginConfig | Record<string, PluginConfig> {
    if (pluginId) {
      return this.getSection<PluginConfig>(`plugins.${pluginId}`);
    }
    return this.getSection<Record<string, PluginConfig>>('plugins');
  }
  
  /**
   * 특정 설정 값 가져오기
   * @param key 설정 키 경로 (점으로 구분, 예: 'core.logLevel')
   * @param defaultValue 기본값
   * @returns 설정 값 또는 기본값
   */
  get<T>(key: string, defaultValue: T): T {
    try {
      const parts = key.split('.');
      let current: any = this.config;
      
      for (const part of parts) {
        if (current === undefined || current === null || current[part] === undefined) {
          return defaultValue;
        }
        current = current[part];
      }
      
      return current as T;
    } catch (error) {
      console.error(`설정 값 가져오기 실패 (${key}):`, error);
      return defaultValue;
    }
  }
  
  /**
   * 환경 변수 확인 및 대체
   * @param value 환경 변수를 포함할 수 있는 문자열
   * @returns 환경 변수가 대체된 문자열
   */
  resolveEnvVars(value: string): string {
    if (typeof value !== 'string') {
      return value;
    }
    
    // ${ENV_VAR} 패턴의 환경 변수를 실제 값으로 대체
    return value.replace(/\${([^}]+)}/g, (match, varName) => {
      const envValue = process.env[varName];
      return envValue !== undefined ? envValue : match;
    });
  }
  
  /**
   * 설정 값 설정 (저장하지 않음)
   * @param key 설정 키 경로
   * @param value 설정 값
   */
  set(key: string, value: any): void {
    const parts = key.split('.');
    const lastPart = parts.pop();
    
    if (!lastPart) {
      return;
    }
    
    let current: any = this.config;
    
    for (const part of parts) {
      if (current[part] === undefined) {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[lastPart] = value;
  }
  
  /**
   * 설정 저장
   * @returns 저장 성공 여부
   */
  save(): boolean {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      return true;
    } catch (error) {
      console.error('설정 저장 중 오류 발생:', error);
      return false;
    }
  }
}