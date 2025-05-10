/**
 * VAULT 서비스
 * 
 * VAULT 컨텍스트 및 아이템을 관리하는 서비스입니다.
 * 컨텍스트 저장, 불러오기, 아이템 관리 기능을 제공합니다.
 */

import * as vscode from 'vscode';
import { ServiceConfigManager, ServiceType } from './serviceConfig';
import { ServiceError } from './serviceError';

/**
 * VAULT 컨텍스트 타입
 */
export enum VaultContextType {
  System = 'system',
  Project = 'project',
  Personal = 'personal',
  Shared = 'shared',
  Template = 'template'
}

/**
 * VAULT 아이템 인터페이스
 */
export interface VaultItem {
  id: string;
  name: string;
  description?: string;
  content: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  contextType: VaultContextType;
  contextId?: string;
  metadata?: Record<string, any>;
}

/**
 * VAULT 컨텍스트 인터페이스
 */
export interface VaultContext {
  id: string;
  name: string;
  description?: string;
  type: VaultContextType;
  createdAt: Date;
  updatedAt: Date;
  items: VaultItem[];
  metadata?: Record<string, any>;
}

/**
 * VAULT 서비스 클래스
 */
export class VaultService implements vscode.Disposable {
  private _onDidChangeVault = new vscode.EventEmitter<void>();
  readonly onDidChangeVault = this._onDidChangeVault.event;
  
  private contexts: Map<string, VaultContext> = new Map();
  private disposables: vscode.Disposable[] = [];
  private vaultDir: string;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  private fs = require('fs');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  private path = require('path');
  
  /**
   * 생성자
   * @param context VSCode 확장 컨텍스트
   * @param configManager 서비스 설정 관리자
   */
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly configManager: ServiceConfigManager
  ) {
    // VAULT 디렉토리 경로 설정
    const config = this.configManager.getServiceConfig(ServiceType.Vault);
    this.vaultDir = config.additionalParams?.vaultDirectory || '.ape-vault';
    
    // 절대 경로가 아니면 홈 디렉토리 기준으로 설정
    if (!this.path.isAbsolute(this.vaultDir)) {
      this.vaultDir = this.path.join(this.getUserHomeDir(), this.vaultDir);
    }
    
    // VAULT 디렉토리 존재 확인 및 생성
    this.ensureVaultDirectory();
    
    // 설정 변경 이벤트 구독
    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('ape.vault')) {
          // 설정이 변경되면 디렉토리 경로 업데이트
          const newConfig = this.configManager.getServiceConfig(ServiceType.Vault);
          const newDir = newConfig.additionalParams?.vaultDirectory || '.ape-vault';
          
          if (newDir !== this.vaultDir) {
            this.vaultDir = this.path.isAbsolute(newDir) 
              ? newDir 
              : this.path.join(this.getUserHomeDir(), newDir);
            
            this.ensureVaultDirectory();
            this.loadAllContexts();
          } else {
            this.loadAllContexts();
          }
        }
      })
    );
    
    // 초기 데이터 로드
    this.loadAllContexts();
  }
  
  /**
   * 사용자 홈 디렉토리 가져오기
   */
  private getUserHomeDir(): string {
    return process.env.HOME || process.env.USERPROFILE || '.';
  }
  
  /**
   * VAULT 디렉토리 존재 확인 및 생성
   */
  private ensureVaultDirectory(): void {
    try {
      // 메인 VAULT 디렉토리
      if (!this.fs.existsSync(this.vaultDir)) {
        this.fs.mkdirSync(this.vaultDir, { recursive: true });
        console.log(`VAULT 디렉토리 생성됨: ${this.vaultDir}`);
      }
      
      // 컨텍스트 타입별 하위 디렉토리
      const contextTypeDirs = Object.values(VaultContextType);
      for (const dir of contextTypeDirs) {
        const typePath = this.path.join(this.vaultDir, dir);
        if (!this.fs.existsSync(typePath)) {
          this.fs.mkdirSync(typePath, { recursive: true });
        }
      }
    } catch (error) {
      console.error('VAULT 디렉토리 생성 오류:', error);
      vscode.window.showErrorMessage(`VAULT 디렉토리를 생성할 수 없습니다: ${error}`);
    }
  }
  
  /**
   * 모든 컨텍스트 로드
   */
  private async loadAllContexts(): Promise<void> {
    try {
      this.contexts.clear();
      const config = this.configManager.getServiceConfig(ServiceType.Vault);
      
      if (config.useMock) {
        // 모의 데이터 로드
        this.loadMockContexts();
      } else if (config.enabled) {
        // 파일 시스템에서 데이터 로드
        await this.loadContextsFromFileSystem();
        
        // 컨텍스트가 없으면 기본 컨텍스트 생성
        if (this.contexts.size === 0) {
          this.createDefaultContexts();
        }
      }
      
      // 변경 이벤트 발생
      this._onDidChangeVault.fire();
    } catch (error) {
      console.error('VAULT 컨텍스트 로드 오류:', error);
      vscode.window.showErrorMessage(`VAULT 컨텍스트 로드 중 오류가 발생했습니다: ${error}`);
    }
  }
  
  /**
   * 파일 시스템에서 컨텍스트 로드
   */
  private async loadContextsFromFileSystem(): Promise<void> {
    try {
      // 각 컨텍스트 타입 디렉토리 처리
      for (const contextType of Object.values(VaultContextType)) {
        const typeDir = this.path.join(this.vaultDir, contextType);
        
        // 디렉토리가 없으면 건너뛰기
        if (!this.fs.existsSync(typeDir)) {
          continue;
        }
        
        // 컨텍스트 메타데이터 파일 목록 가져오기
        const contextFiles = this.fs.readdirSync(typeDir)
          .filter((file: string) => file.endsWith('.context.json'));
        
        // 각 컨텍스트 파일 로드
        for (const fileName of contextFiles) {
          try {
            const filePath = this.path.join(typeDir, fileName);
            const data = this.fs.readFileSync(filePath, 'utf8');
            const contextData = JSON.parse(data);
            
            // 날짜 문자열을 Date 객체로 변환
            contextData.createdAt = new Date(contextData.createdAt);
            contextData.updatedAt = new Date(contextData.updatedAt);
            
            // 컨텍스트 아이템 로드
            contextData.items = await this.loadContextItems(contextData.id, contextType as VaultContextType);
            
            // 컨텍스트 맵에 추가
            this.contexts.set(contextData.id, contextData);
          } catch (error) {
            console.error(`컨텍스트 파일 로드 오류 (${fileName}):`, error);
          }
        }
      }
    } catch (error) {
      console.error('파일 시스템에서 컨텍스트 로드 오류:', error);
      throw error;
    }
  }
  
  /**
   * 특정 컨텍스트의 아이템 로드
   * @param contextId 컨텍스트 ID
   * @param contextType 컨텍스트 타입
   */
  private async loadContextItems(contextId: string, contextType: VaultContextType): Promise<VaultItem[]> {
    const items: VaultItem[] = [];
    const itemsDir = this.path.join(this.vaultDir, contextType, contextId);
    
    // 아이템 디렉토리가 없으면 빈 배열 반환
    if (!this.fs.existsSync(itemsDir)) {
      return items;
    }
    
    // 아이템 파일 목록 가져오기
    const itemFiles = this.fs.readdirSync(itemsDir)
      .filter((file: string) => file.endsWith('.item.json'));
    
    // 각 아이템 파일 로드
    for (const fileName of itemFiles) {
      try {
        const filePath = this.path.join(itemsDir, fileName);
        const data = this.fs.readFileSync(filePath, 'utf8');
        const itemData = JSON.parse(data);
        
        // 날짜 문자열을 Date 객체로 변환
        itemData.createdAt = new Date(itemData.createdAt);
        itemData.updatedAt = new Date(itemData.updatedAt);
        
        // 콘텐츠 파일 로드
        const contentFilePath = this.path.join(itemsDir, `${itemData.id}.content.md`);
        if (this.fs.existsSync(contentFilePath)) {
          itemData.content = this.fs.readFileSync(contentFilePath, 'utf8');
        }
        
        items.push(itemData);
      } catch (error) {
        console.error(`아이템 파일 로드 오류 (${fileName}):`, error);
      }
    }
    
    return items;
  }
  
  /**
   * 기본 컨텍스트 생성
   */
  private createDefaultContexts(): void {
    // 모의 데이터 로드하여 기본 컨텍스트로 저장
    this.loadMockContexts();
    
    // 각 컨텍스트 저장
    this.contexts.forEach(context => {
      this.saveContextToFileSystem(context);
    });
  }
  
  /**
   * 컨텍스트를 파일 시스템에 저장
   * @param context 저장할 컨텍스트
   */
  private saveContextToFileSystem(context: VaultContext): void {
    try {
      // 컨텍스트 타입 디렉토리 경로
      const typeDir = this.path.join(this.vaultDir, context.type);
      
      // 컨텍스트 메타데이터 저장
      const contextMetadata: any = { ...context };
      delete contextMetadata.items; // 아이템은 별도로 저장
      
      const contextFilePath = this.path.join(typeDir, `${context.id}.context.json`);
      this.fs.writeFileSync(contextFilePath, JSON.stringify(contextMetadata, null, 2), 'utf8');
      
      // 컨텍스트 아이템 디렉토리 생성
      const itemsDir = this.path.join(typeDir, context.id);
      if (!this.fs.existsSync(itemsDir)) {
        this.fs.mkdirSync(itemsDir, { recursive: true });
      }
      
      // 각 아이템 저장
      context.items.forEach(item => {
        this.saveItemToFileSystem(item, context.id, context.type);
      });
    } catch (error) {
      console.error(`컨텍스트 저장 오류 (${context.id}):`, error);
    }
  }
  
  /**
   * 아이템을 파일 시스템에 저장
   * @param item 저장할 아이템
   * @param contextId 컨텍스트 ID
   * @param contextType 컨텍스트 타입
   */
  private saveItemToFileSystem(item: VaultItem, contextId: string, contextType: VaultContextType): void {
    try {
      // 아이템 디렉토리 경로
      const itemsDir = this.path.join(this.vaultDir, contextType, contextId);
      
      // 아이템 메타데이터 저장
      const itemMetadata: any = { ...item };
      const content = itemMetadata.content;
      delete itemMetadata.content; // 내용은 별도 파일로 저장
      
      const itemFilePath = this.path.join(itemsDir, `${item.id}.item.json`);
      this.fs.writeFileSync(itemFilePath, JSON.stringify(itemMetadata, null, 2), 'utf8');
      
      // 아이템 내용 저장
      const contentFilePath = this.path.join(itemsDir, `${item.id}.content.md`);
      this.fs.writeFileSync(contentFilePath, content, 'utf8');
    } catch (error) {
      console.error(`아이템 저장 오류 (${item.id}):`, error);
    }
  }
  
  /**
   * 모의 컨텍스트 데이터 로드
   */
  private loadMockContexts(): void {
    this.contexts.clear();
    
    // 시스템 컨텍스트
    const systemContext: VaultContext = {
      id: 'system-context',
      name: '시스템 컨텍스트',
      description: '시스템 기본 컨텍스트입니다.',
      type: VaultContextType.System,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
      items: [
        {
          id: 'system-item-1',
          name: '기본 시스템 프롬프트',
          description: '표준 시스템 프롬프트입니다.',
          content: 'You are an AI assistant. Answer questions concisely and accurately.',
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01'),
          contextType: VaultContextType.System,
          contextId: 'system-context',
          tags: ['system', 'default', 'prompt']
        },
        {
          id: 'system-item-2',
          name: '코드 리뷰 프롬프트',
          description: '코드 리뷰용 시스템 프롬프트입니다.',
          content: 'You are a code review assistant. Analyze the provided code and give feedback.',
          createdAt: new Date('2023-01-02'),
          updatedAt: new Date('2023-01-02'),
          contextType: VaultContextType.System,
          contextId: 'system-context',
          tags: ['system', 'code-review', 'prompt']
        }
      ]
    };
    
    // 프로젝트 컨텍스트
    const projectContext: VaultContext = {
      id: 'project-context',
      name: 'APE 프로젝트 컨텍스트',
      description: 'APE 프로젝트 관련 컨텍스트입니다.',
      type: VaultContextType.Project,
      createdAt: new Date('2023-02-01'),
      updatedAt: new Date('2023-02-01'),
      items: [
        {
          id: 'project-item-1',
          name: '프로젝트 아키텍처',
          description: 'APE 프로젝트 아키텍처 설명입니다.',
          content: 'APE 프로젝트는 다음과 같은 구조로 이루어져 있습니다. Core 모듈, UI 모듈, 서비스 모듈...',
          createdAt: new Date('2023-02-01'),
          updatedAt: new Date('2023-02-01'),
          contextType: VaultContextType.Project,
          contextId: 'project-context',
          tags: ['project', 'architecture', 'documentation']
        },
        {
          id: 'project-item-2',
          name: '개발 가이드라인',
          description: '프로젝트 개발 가이드라인입니다.',
          content: '코드 작성 시 다음 가이드라인을 따라주세요. 1. 함수는 단일 책임을 가집니다...',
          createdAt: new Date('2023-02-02'),
          updatedAt: new Date('2023-02-02'),
          contextType: VaultContextType.Project,
          contextId: 'project-context',
          tags: ['project', 'guidelines', 'development']
        }
      ]
    };
    
    // 개인 컨텍스트
    const personalContext: VaultContext = {
      id: 'personal-context',
      name: '개인 컨텍스트',
      description: '개인적인 작업 맥락입니다.',
      type: VaultContextType.Personal,
      createdAt: new Date('2023-03-01'),
      updatedAt: new Date('2023-03-01'),
      items: [
        {
          id: 'personal-item-1',
          name: '내 작업 메모',
          description: '현재 작업 메모입니다.',
          content: '트리뷰 기능 구현 중이며, 다음 단계로 컨텍스트 처리 기능 구현 예정...',
          createdAt: new Date('2023-03-01'),
          updatedAt: new Date('2023-03-01'),
          contextType: VaultContextType.Personal,
          contextId: 'personal-context',
          tags: ['personal', 'memo', 'work']
        }
      ]
    };
    
    // 공유 컨텍스트
    const sharedContext: VaultContext = {
      id: 'shared-context',
      name: '팀 공유 컨텍스트',
      description: '팀 간 공유되는 컨텍스트입니다.',
      type: VaultContextType.Shared,
      createdAt: new Date('2023-04-01'),
      updatedAt: new Date('2023-04-01'),
      items: [
        {
          id: 'shared-item-1',
          name: '팀 회의록',
          description: '최근 팀 회의록입니다.',
          content: '날짜: 2023-04-01\n참석자: ...\n안건: 프로젝트 진행 상황 공유 및 이슈 논의...',
          createdAt: new Date('2023-04-01'),
          updatedAt: new Date('2023-04-01'),
          contextType: VaultContextType.Shared,
          contextId: 'shared-context',
          tags: ['shared', 'meeting', 'team']
        }
      ]
    };
    
    // 템플릿 컨텍스트
    const templateContext: VaultContext = {
      id: 'template-context',
      name: '템플릿 컨텍스트',
      description: '재사용 가능한 템플릿 모음입니다.',
      type: VaultContextType.Template,
      createdAt: new Date('2023-05-01'),
      updatedAt: new Date('2023-05-01'),
      items: [
        {
          id: 'template-item-1',
          name: '코드 생성 템플릿',
          description: '표준 코드 생성 템플릿입니다.',
          content: '다음 템플릿을 사용하여 [기능명]을 구현하는 코드를 생성해주세요...',
          createdAt: new Date('2023-05-01'),
          updatedAt: new Date('2023-05-01'),
          contextType: VaultContextType.Template,
          contextId: 'template-context',
          tags: ['template', 'code-generation']
        },
        {
          id: 'template-item-2',
          name: '문서 템플릿',
          description: '기술 문서 템플릿입니다.',
          content: '# [문서 제목]\n\n## 개요\n\n## 아키텍처\n\n## 기능 설명\n\n## 주의사항',
          createdAt: new Date('2023-05-02'),
          updatedAt: new Date('2023-05-02'),
          contextType: VaultContextType.Template,
          contextId: 'template-context',
          tags: ['template', 'documentation']
        }
      ]
    };
    
    // 컨텍스트 맵에 추가
    this.contexts.set(systemContext.id, systemContext);
    this.contexts.set(projectContext.id, projectContext);
    this.contexts.set(personalContext.id, personalContext);
    this.contexts.set(sharedContext.id, sharedContext);
    this.contexts.set(templateContext.id, templateContext);
  }
  
  /**
   * 모든 컨텍스트 가져오기
   */
  public getAllContexts(): VaultContext[] {
    return Array.from(this.contexts.values());
  }
  
  /**
   * 컨텍스트 타입별 컨텍스트 가져오기
   * @param type 컨텍스트 타입
   */
  public getContextsByType(type: VaultContextType): VaultContext[] {
    return Array.from(this.contexts.values()).filter(context => context.type === type);
  }
  
  /**
   * 컨텍스트 ID로 컨텍스트 가져오기
   * @param contextId 컨텍스트 ID
   */
  public getContextById(contextId: string): VaultContext | undefined {
    return this.contexts.get(contextId);
  }
  
  /**
   * 컨텍스트 생성
   * @param name 컨텍스트 이름
   * @param type 컨텍스트 타입
   * @param description 설명 (선택)
   */
  public async createContext(
    name: string,
    type: VaultContextType,
    description?: string
  ): Promise<VaultContext> {
    try {
      const config = this.configManager.getServiceConfig(ServiceType.Vault);
      
      if (!config.enabled) {
        throw new ServiceError('VAULT 서비스가 비활성화되어 있습니다.', 'vault-disabled');
      }
      
      const newContext: VaultContext = {
        id: `${type}-${Date.now()}`,
        name,
        description,
        type,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: []
      };
      
      if (!config.useMock) {
        // 파일 시스템에 컨텍스트 저장
        this.saveContextToFileSystem(newContext);
      }
      
      // 컨텍스트 맵에 추가
      this.contexts.set(newContext.id, newContext);
      
      // 변경 이벤트 발생
      this._onDidChangeVault.fire();
      
      return newContext;
    } catch (error) {
      console.error('VAULT 컨텍스트 생성 오류:', error);
      throw new ServiceError(
        `VAULT 컨텍스트 생성 중 오류가 발생했습니다: ${error}`,
        'vault-context-creation-failed'
      );
    }
  }
  
  /**
   * 컨텍스트 업데이트
   * @param contextId 컨텍스트 ID
   * @param updates 업데이트할 필드
   */
  public async updateContext(
    contextId: string,
    updates: Partial<Pick<VaultContext, 'name' | 'description' | 'metadata'>>
  ): Promise<VaultContext> {
    try {
      const context = this.contexts.get(contextId);
      
      if (!context) {
        throw new ServiceError(`ID가 ${contextId}인 컨텍스트를 찾을 수 없습니다.`, 'vault-context-not-found');
      }
      
      const config = this.configManager.getServiceConfig(ServiceType.Vault);
      
      if (!config.enabled) {
        throw new ServiceError('VAULT 서비스가 비활성화되어 있습니다.', 'vault-disabled');
      }
      
      // 컨텍스트 업데이트
      const updatedContext: VaultContext = {
        ...context,
        ...updates,
        updatedAt: new Date()
      };
      
      if (!config.useMock) {
        // 파일 시스템에 업데이트된 컨텍스트 저장
        this.saveContextToFileSystem(updatedContext);
      }
      
      // 컨텍스트 맵 업데이트
      this.contexts.set(contextId, updatedContext);
      
      // 변경 이벤트 발생
      this._onDidChangeVault.fire();
      
      return updatedContext;
    } catch (error) {
      console.error('VAULT 컨텍스트 업데이트 오류:', error);
      throw new ServiceError(
        `VAULT 컨텍스트 업데이트 중 오류가 발생했습니다: ${error}`,
        'vault-context-update-failed'
      );
    }
  }
  
  /**
   * 컨텍스트 삭제
   * @param contextId 컨텍스트 ID
   */
  public async deleteContext(contextId: string): Promise<boolean> {
    try {
      const context = this.contexts.get(contextId);
      
      if (!context) {
        throw new ServiceError(`ID가 ${contextId}인 컨텍스트를 찾을 수 없습니다.`, 'vault-context-not-found');
      }
      
      // 시스템 컨텍스트는 삭제 불가
      if (context.type === VaultContextType.System) {
        throw new ServiceError('시스템 컨텍스트는 삭제할 수 없습니다.', 'vault-system-context-deletion-forbidden');
      }
      
      const config = this.configManager.getServiceConfig(ServiceType.Vault);
      
      if (!config.enabled) {
        throw new ServiceError('VAULT 서비스가 비활성화되어 있습니다.', 'vault-disabled');
      }
      
      if (!config.useMock) {
        // 파일 시스템에서 컨텍스트 삭제
        this.deleteContextFromFileSystem(context);
      }
      
      // 컨텍스트 맵에서 제거
      this.contexts.delete(contextId);
      
      // 변경 이벤트 발생
      this._onDidChangeVault.fire();
      
      return true;
    } catch (error) {
      console.error('VAULT 컨텍스트 삭제 오류:', error);
      throw new ServiceError(
        `VAULT 컨텍스트 삭제 중 오류가 발생했습니다: ${error}`,
        'vault-context-deletion-failed'
      );
    }
  }
  
  /**
   * 파일 시스템에서 컨텍스트 삭제
   * @param context 삭제할 컨텍스트
   */
  private deleteContextFromFileSystem(context: VaultContext): void {
    try {
      // 컨텍스트 타입 디렉토리 경로
      const typeDir = this.path.join(this.vaultDir, context.type);
      
      // 컨텍스트 메타데이터 파일 삭제
      const contextFilePath = this.path.join(typeDir, `${context.id}.context.json`);
      if (this.fs.existsSync(contextFilePath)) {
        this.fs.unlinkSync(contextFilePath);
      }
      
      // 컨텍스트 아이템 디렉토리 삭제 (재귀적으로)
      const itemsDir = this.path.join(typeDir, context.id);
      if (this.fs.existsSync(itemsDir)) {
        this.deleteDirectoryRecursive(itemsDir);
      }
    } catch (error) {
      console.error(`컨텍스트 파일 삭제 오류 (${context.id}):`, error);
      throw error;
    }
  }
  
  /**
   * 디렉토리 재귀적 삭제
   * @param dirPath 삭제할 디렉토리 경로
   */
  private deleteDirectoryRecursive(dirPath: string): void {
    if (this.fs.existsSync(dirPath)) {
      this.fs.readdirSync(dirPath).forEach((file: string) => {
        const curPath = this.path.join(dirPath, file);
        if (this.fs.lstatSync(curPath).isDirectory()) {
          // 재귀적 호출로 하위 디렉토리 삭제
          this.deleteDirectoryRecursive(curPath);
        } else {
          // 파일 삭제
          this.fs.unlinkSync(curPath);
        }
      });
      
      // 디렉토리 자체 삭제
      this.fs.rmdirSync(dirPath);
    }
  }
  
  /**
   * 아이템 생성
   * @param contextId 컨텍스트 ID
   * @param item 아이템 정보
   */
  public async createItem(
    contextId: string,
    item: Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt' | 'contextId'>
  ): Promise<VaultItem> {
    try {
      const context = this.contexts.get(contextId);
      
      if (!context) {
        throw new ServiceError(`ID가 ${contextId}인 컨텍스트를 찾을 수 없습니다.`, 'vault-context-not-found');
      }
      
      const config = this.configManager.getServiceConfig(ServiceType.Vault);
      
      if (!config.enabled) {
        throw new ServiceError('VAULT 서비스가 비활성화되어 있습니다.', 'vault-disabled');
      }
      
      const newItem: VaultItem = {
        ...item,
        id: `${contextId}-item-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        contextId: contextId
      };
      
      if (!config.useMock) {
        // 파일 시스템에 아이템 저장
        this.saveItemToFileSystem(newItem, contextId, context.type);
      }
      
      // 컨텍스트 아이템 추가
      context.items.push(newItem);
      context.updatedAt = new Date();
      
      // 변경 이벤트 발생
      this._onDidChangeVault.fire();
      
      return newItem;
    } catch (error) {
      console.error('VAULT 아이템 생성 오류:', error);
      throw new ServiceError(
        `VAULT 아이템 생성 중 오류가 발생했습니다: ${error}`,
        'vault-item-creation-failed'
      );
    }
  }
  
  /**
   * 아이템 업데이트
   * @param contextId 컨텍스트 ID
   * @param itemId 아이템 ID
   * @param updates 업데이트할 필드
   */
  public async updateItem(
    contextId: string,
    itemId: string,
    updates: Partial<Pick<VaultItem, 'name' | 'description' | 'content' | 'tags' | 'metadata'>>
  ): Promise<VaultItem> {
    try {
      const context = this.contexts.get(contextId);
      
      if (!context) {
        throw new ServiceError(`ID가 ${contextId}인 컨텍스트를 찾을 수 없습니다.`, 'vault-context-not-found');
      }
      
      const itemIndex = context.items.findIndex(item => item.id === itemId);
      
      if (itemIndex === -1) {
        throw new ServiceError(`ID가 ${itemId}인 아이템을 찾을 수 없습니다.`, 'vault-item-not-found');
      }
      
      const config = this.configManager.getServiceConfig(ServiceType.Vault);
      
      if (!config.enabled) {
        throw new ServiceError('VAULT 서비스가 비활성화되어 있습니다.', 'vault-disabled');
      }
      
      // 아이템 업데이트
      const item = context.items[itemIndex];
      const updatedItem: VaultItem = {
        ...item,
        ...updates,
        updatedAt: new Date()
      };
      
      if (!config.useMock) {
        // 파일 시스템에 업데이트된 아이템 저장
        this.saveItemToFileSystem(updatedItem, contextId, context.type);
      }
      
      // 컨텍스트 아이템 업데이트
      context.items[itemIndex] = updatedItem;
      context.updatedAt = new Date();
      
      // 변경 이벤트 발생
      this._onDidChangeVault.fire();
      
      return updatedItem;
    } catch (error) {
      console.error('VAULT 아이템 업데이트 오류:', error);
      throw new ServiceError(
        `VAULT 아이템 업데이트 중 오류가 발생했습니다: ${error}`,
        'vault-item-update-failed'
      );
    }
  }
  
  /**
   * 아이템 삭제
   * @param contextId 컨텍스트 ID
   * @param itemId 아이템 ID
   */
  public async deleteItem(contextId: string, itemId: string): Promise<boolean> {
    try {
      const context = this.contexts.get(contextId);
      
      if (!context) {
        throw new ServiceError(`ID가 ${contextId}인 컨텍스트를 찾을 수 없습니다.`, 'vault-context-not-found');
      }
      
      const itemIndex = context.items.findIndex(item => item.id === itemId);
      
      if (itemIndex === -1) {
        throw new ServiceError(`ID가 ${itemId}인 아이템을 찾을 수 없습니다.`, 'vault-item-not-found');
      }
      
      const config = this.configManager.getServiceConfig(ServiceType.Vault);
      
      if (!config.enabled) {
        throw new ServiceError('VAULT 서비스가 비활성화되어 있습니다.', 'vault-disabled');
      }
      
      if (!config.useMock) {
        // 파일 시스템에서 아이템 삭제
        this.deleteItemFromFileSystem(context.items[itemIndex], contextId, context.type);
      }
      
      // 컨텍스트 아이템 삭제
      context.items.splice(itemIndex, 1);
      context.updatedAt = new Date();
      
      // 변경 이벤트 발생
      this._onDidChangeVault.fire();
      
      return true;
    } catch (error) {
      console.error('VAULT 아이템 삭제 오류:', error);
      throw new ServiceError(
        `VAULT 아이템 삭제 중 오류가 발생했습니다: ${error}`,
        'vault-item-deletion-failed'
      );
    }
  }
  
  /**
   * 파일 시스템에서 아이템 삭제
   * @param item 삭제할 아이템
   * @param contextId 컨텍스트 ID
   * @param contextType 컨텍스트 타입
   */
  private deleteItemFromFileSystem(item: VaultItem, contextId: string, contextType: VaultContextType): void {
    try {
      // 아이템 디렉토리 경로
      const itemsDir = this.path.join(this.vaultDir, contextType, contextId);
      
      // 아이템 메타데이터 파일 삭제
      const itemFilePath = this.path.join(itemsDir, `${item.id}.item.json`);
      if (this.fs.existsSync(itemFilePath)) {
        this.fs.unlinkSync(itemFilePath);
      }
      
      // 아이템 내용 파일 삭제
      const contentFilePath = this.path.join(itemsDir, `${item.id}.content.md`);
      if (this.fs.existsSync(contentFilePath)) {
        this.fs.unlinkSync(contentFilePath);
      }
    } catch (error) {
      console.error(`아이템 파일 삭제 오류 (${item.id}):`, error);
      throw error;
    }
  }
  
  /**
   * 아이템 검색
   * @param query 검색어
   * @param filters 필터 (컨텍스트 타입, 태그 등)
   */
  public searchItems(
    query: string,
    filters?: {
      contextTypes?: VaultContextType[];
      tags?: string[];
      contextIds?: string[];
    }
  ): VaultItem[] {
    const allContexts = this.getAllContexts();
    let filteredContexts = allContexts;
    
    // 컨텍스트 타입 필터링
    if (filters?.contextTypes && filters.contextTypes.length > 0) {
      filteredContexts = filteredContexts.filter(context => 
        filters.contextTypes!.includes(context.type)
      );
    }
    
    // 컨텍스트 ID 필터링
    if (filters?.contextIds && filters.contextIds.length > 0) {
      filteredContexts = filteredContexts.filter(context => 
        filters.contextIds!.includes(context.id)
      );
    }
    
    // 모든 아이템 가져오기
    let items = filteredContexts.flatMap(context => context.items);
    
    // 태그 필터링
    if (filters?.tags && filters.tags.length > 0) {
      items = items.filter(item => {
        if (!item.tags) return false;
        return filters.tags!.some(tag => item.tags!.includes(tag));
      });
    }
    
    // 검색어가 있는 경우 아이템 검색
    if (query) {
      const lowerQuery = query.toLowerCase();
      items = items.filter(item => 
        item.name.toLowerCase().includes(lowerQuery) ||
        (item.description && item.description.toLowerCase().includes(lowerQuery)) ||
        item.content.toLowerCase().includes(lowerQuery) ||
        (item.tags && item.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
      );
    }
    
    return items;
  }
  
  /**
   * 아이템을 LLM 컨텍스트로 변환
   * @param item 아이템
   */
  public itemToLLMContext(item: VaultItem): string {
    // 기본 형식: 아이템 내용 그대로 반환
    return item.content;
  }
  
  /**
   * 리소스 해제
   */
  public dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }
}