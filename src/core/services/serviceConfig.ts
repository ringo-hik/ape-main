/**
 * 서비스 설정 관리자
 * 
 * Git, Jira, S3, SWDP 등의 외부 서비스 연결 설정을 관리합니다.
 * 각 서비스별 URL, 인증 정보 등을 VSCode 설정에서 가져오고 검증합니다.
 */

import * as vscode from 'vscode';

/**
 * 서비스 인증 방식 유형
 */
export enum AuthType {
  None = 'none',
  Basic = 'basic',
  OAuth = 'oauth',
  Token = 'token',
  AWS = 'aws'
}

/**
 * 서비스 연결 설정 인터페이스
 */
export interface ServiceConnectionConfig {
  enabled: boolean;
  url: string;
  authType: AuthType;
  username?: string;
  password?: string;
  token?: string;
  useMock: boolean;
  additionalParams?: Record<string, any>;
}

/**
 * 서비스 유형
 */
export enum ServiceType {
  Git = 'git',
  Bitbucket = 'bitbucket',
  Jira = 'jira',
  S3 = 'pocket', // S3/Pocket 서비스
  SWDP = 'swdp',
  Vault = 'vault', // VAULT 서비스
  Unknown = 'unknown'
}

/**
 * 서비스 설정 관리자 클래스
 */
export class ServiceConfigManager implements vscode.Disposable {
  private configs: Map<ServiceType, ServiceConnectionConfig> = new Map();
  private disposables: vscode.Disposable[] = [];
  
  /**
   * 생성자
   * @param context VSCode 확장 컨텍스트
   */
  constructor(private readonly context: vscode.ExtensionContext) {
    // 초기 설정 로드
    this.loadAllConfigs();
    
    // 설정 변경 감지
    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration(e => {
        let configChanged = false;
        
        for (const serviceType of Object.values(ServiceType)) {
          if (e.affectsConfiguration(`ape.${serviceType}`)) {
            this.loadServiceConfig(serviceType as ServiceType);
            configChanged = true;
          }
        }
        
        if (configChanged) {
          // 설정 변경 이벤트 발생
          this.onConfigChange();
        }
      })
    );
  }
  
  /**
   * 설정 변경 시 호출될 이벤트 핸들러
   * @private
   */
  private onConfigChange(): void {
    // 설정 변경 이벤트를 구독자에게 알림
    // 향후 EventEmitter 추가 가능
  }
  
  /**
   * 모든 서비스 설정 로드
   * @private
   */
  private loadAllConfigs(): void {
    for (const serviceType of Object.values(ServiceType)) {
      this.loadServiceConfig(serviceType as ServiceType);
    }
  }
  
  /**
   * 특정 서비스 설정 로드
   * @param serviceType 서비스 유형
   * @private
   */
  private loadServiceConfig(serviceType: ServiceType): void {
    const config = vscode.workspace.getConfiguration(`ape.${serviceType}`);
    
    const serviceConfig: ServiceConnectionConfig = {
      enabled: config.get('enabled', false),
      url: config.get('url', ''),
      authType: config.get('authType', AuthType.None),
      username: config.get('username', ''),
      password: config.get('password', ''),
      token: config.get('token', ''),
      useMock: config.get('useMock', true),
      additionalParams: {}
    };
    
    // VAULT 서비스인 경우 디렉토리 경로 추가
    if (serviceType === ServiceType.Vault) {
      serviceConfig.additionalParams = {
        vaultDirectory: config.get('vaultDirectory', '.ape-vault')
      };
    } else {
      serviceConfig.additionalParams = config.get('additionalParams', {});
    }
    
    this.configs.set(serviceType, serviceConfig);
  }
  
  /**
   * 서비스 설정 가져오기
   * @param serviceType 서비스 유형
   */
  public getServiceConfig(serviceType: ServiceType): ServiceConnectionConfig {
    // 설정이 없으면 새로 로드
    if (!this.configs.has(serviceType)) {
      this.loadServiceConfig(serviceType);
    }
    
    return this.configs.get(serviceType) as ServiceConnectionConfig;
  }
  
  /**
   * 서비스 설정 업데이트
   * @param serviceType 서비스 유형
   * @param config 새 설정
   */
  public async updateServiceConfig(
    serviceType: ServiceType, 
    config: Partial<ServiceConnectionConfig>
  ): Promise<boolean> {
    try {
      const vscodeConfig = vscode.workspace.getConfiguration(`ape.${serviceType}`);
      
      // 각 필드 업데이트
      for (const [key, value] of Object.entries(config)) {
        if (value !== undefined) {
          await vscodeConfig.update(key, value, vscode.ConfigurationTarget.Global);
        }
      }
      
      // 설정 다시 로드
      this.loadServiceConfig(serviceType);
      
      return true;
    } catch (error) {
      console.error(`서비스 설정 업데이트 오류 (${serviceType}):`, error);
      return false;
    }
  }
  
  /**
   * 서비스 설정 검증
   * @param serviceType 서비스 유형
   */
  public validateServiceConfig(serviceType: ServiceType): string[] {
    const config = this.getServiceConfig(serviceType);
    const errors: string[] = [];
    
    // 기본 검증: 서비스가 활성화되어 있는 경우 URL 필수
    if (config.enabled && !config.useMock) {
      if (!config.url) {
        errors.push(`${serviceType} 서비스 URL이 설정되지 않았습니다.`);
      } else if (!this.isValidUrl(config.url)) {
        errors.push(`${serviceType} 서비스 URL 형식이 올바르지 않습니다: ${config.url}`);
      }
      
      // 인증 유형에 따른 검증
      if (config.authType === AuthType.Basic) {
        if (!config.username) {
          errors.push(`${serviceType} 서비스 사용자 이름이 설정되지 않았습니다.`);
        }
        if (!config.password) {
          errors.push(`${serviceType} 서비스 비밀번호가 설정되지 않았습니다.`);
        }
      } else if (config.authType === AuthType.Token) {
        if (!config.token) {
          errors.push(`${serviceType} 서비스 토큰이 설정되지 않았습니다.`);
        }
      } else if (config.authType === AuthType.OAuth) {
        if (!config.token) {
          errors.push(`${serviceType} 서비스 OAuth 토큰이 설정되지 않았습니다.`);
        }
      } else if (config.authType === AuthType.AWS) {
        const params = config.additionalParams || {};
        if (!params.accessKeyId) {
          errors.push(`${serviceType} 서비스 AWS 액세스 키 ID가 설정되지 않았습니다.`);
        }
        if (!params.secretAccessKey) {
          errors.push(`${serviceType} 서비스 AWS 시크릿 액세스 키가 설정되지 않았습니다.`);
        }
        if (!params.region) {
          errors.push(`${serviceType} 서비스 AWS 리전이 설정되지 않았습니다.`);
        }
      }
    }
    
    return errors;
  }
  
  /**
   * URL 유효성 검사
   * @param url 검사할 URL
   * @private
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * 서비스 연결 테스트
   * @param serviceType 서비스 유형
   */
  public async testConnection(serviceType: ServiceType): Promise<{success: boolean, message: string}> {
    const config = this.getServiceConfig(serviceType);
    
    // 모의 모드인 경우 항상 성공
    if (config.useMock) {
      return { 
        success: true, 
        message: `${serviceType} 서비스가 모의 모드로 설정되어 있습니다. 실제 서버에 연결하지 않습니다.` 
      };
    }
    
    // 유효성 검사
    const errors = this.validateServiceConfig(serviceType);
    if (errors.length > 0) {
      return { 
        success: false, 
        message: `설정 오류: ${errors.join(' ')}` 
      };
    }
    
    // 실제 연결 테스트는 각 서비스별 클래스에서 구현
    return { 
      success: true, 
      message: `${serviceType} 서비스 설정이 유효합니다. 실제 연결 테스트는 각 서비스 클래스에서 수행합니다.` 
    };
  }
  
  /**
   * 리소스 해제
   */
  public dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }
}