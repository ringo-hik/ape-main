/**
 * Vault 트리 데이터 제공자
 * 
 * VS Code TreeView API를 사용하여 Vault 문서 시스템을 Explorer와 유사한 UI로 표시합니다.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { existsSync } from 'fs';
import { VaultService, VaultContextType, VaultContext, VaultItem } from '../../core/services/vaultService';

/**
 * Vault 트리 아이템 인터페이스
 */
export interface VaultTreeItem {
  id: string;
  label: string;
  description?: string;
  tooltip?: string;
  iconPath?: string | vscode.ThemeIcon | vscode.Uri;
  contextValue?: string;
  resourceUri?: vscode.Uri;
  children?: VaultTreeItem[];
  metadata?: {
    contextType?: VaultContextType;
    contextId?: string;
    itemId?: string;
    content?: string;
    filePath?: string;
    isDirectory?: boolean;
  };
}

/**
 * Vault 트리 뷰 제공자 클래스
 */
export class VaultTreeProvider implements vscode.TreeDataProvider<VaultTreeItem> {
  // 트리 데이터 변경 이벤트
  private _onDidChangeTreeData: vscode.EventEmitter<VaultTreeItem | undefined> = new vscode.EventEmitter<VaultTreeItem | undefined>();
  readonly onDidChangeTreeData: vscode.Event<VaultTreeItem | undefined> = this._onDidChangeTreeData.event;
  
  /**
   * 생성자
   * @param context 확장 프로그램 컨텍스트
   * @param vaultService Vault 서비스
   */
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly vaultService: VaultService
  ) {
    // Vault 서비스 변경 이벤트 구독
    this.vaultService.onDidChangeVault(() => {
      this.refresh();
    });
  }
  
  /**
   * 트리 뷰 새로고침
   */
  public refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }
  
  /**
   * 트리 아이템 가져오기
   */
  getTreeItem(element: VaultTreeItem): vscode.TreeItem {
    const treeItem = new vscode.TreeItem(
      element.label,
      element.children && element.children.length > 0
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );
    
    // 아이템 속성 설정
    treeItem.description = element.description || '';
    treeItem.tooltip = element.tooltip || element.description || element.label;
    treeItem.contextValue = element.contextValue || '';
    
    // 아이콘 설정
    if (element.iconPath) {
      treeItem.iconPath = element.iconPath;
    }
    
    // 리소스 URI 설정 (파일 경로가 있는 경우)
    if (element.resourceUri) {
      treeItem.resourceUri = element.resourceUri;
    }
    
    // 컨텍스트별 명령어 설정
    if (element.contextValue === 'vaultItem') {
      // Vault 아이템 클릭 시 내용 보기
      treeItem.command = {
        command: 'ape.vault.revealDocument',
        title: 'Vault 문서 열기',
        arguments: [element.metadata]
      };
    }
    
    return treeItem;
  }
  
  /**
   * 자식 노드 가져오기
   */
  getChildren(element?: VaultTreeItem): Thenable<VaultTreeItem[]> {
    if (!element) {
      // 루트 노드: 컨텍스트 타입별 카테고리 표시
      return Promise.resolve(this.getRootItems());
    } else if (element.contextValue === 'vaultContextType') {
      // 컨텍스트 타입 노드: 해당 타입의 컨텍스트 목록 표시
      return Promise.resolve(this.getContextsForType(element.metadata?.contextType));
    } else if (element.contextValue === 'vaultContext') {
      // 컨텍스트 노드: 해당 컨텍스트의 아이템 목록 표시
      return Promise.resolve(this.getItemsForContext(element.metadata?.contextId));
    }
    
    return Promise.resolve([]);
  }
  
  /**
   * 루트 아이템 가져오기
   */
  private getRootItems(): VaultTreeItem[] {
    const rootItems: VaultTreeItem[] = [];
    
    // 시스템 컨텍스트
    const systemContexts = this.vaultService.getContextsByType(VaultContextType.System);
    if (systemContexts.length > 0) {
      rootItems.push(this.createContextTypeNode(
        VaultContextType.System,
        '시스템 문서',
        systemContexts.length,
        new vscode.ThemeIcon('server')
      ));
    }
    
    // 프로젝트 컨텍스트
    const projectContexts = this.vaultService.getContextsByType(VaultContextType.Project);
    if (projectContexts.length > 0) {
      rootItems.push(this.createContextTypeNode(
        VaultContextType.Project,
        '프로젝트 문서',
        projectContexts.length,
        new vscode.ThemeIcon('project')
      ));
    }
    
    // 개인 컨텍스트
    const personalContexts = this.vaultService.getContextsByType(VaultContextType.Personal);
    if (personalContexts.length > 0) {
      rootItems.push(this.createContextTypeNode(
        VaultContextType.Personal,
        '개인 문서',
        personalContexts.length,
        new vscode.ThemeIcon('person')
      ));
    }
    
    // 공유 컨텍스트
    const sharedContexts = this.vaultService.getContextsByType(VaultContextType.Shared);
    if (sharedContexts.length > 0) {
      rootItems.push(this.createContextTypeNode(
        VaultContextType.Shared,
        '공유 문서',
        sharedContexts.length,
        new vscode.ThemeIcon('organization')
      ));
    }
    
    // 템플릿 컨텍스트
    const templateContexts = this.vaultService.getContextsByType(VaultContextType.Template);
    if (templateContexts.length > 0) {
      rootItems.push(this.createContextTypeNode(
        VaultContextType.Template,
        '템플릿 문서',
        templateContexts.length,
        new vscode.ThemeIcon('file-code')
      ));
    }
    
    return rootItems;
  }
  
  /**
   * 컨텍스트 타입 노드 생성
   */
  private createContextTypeNode(
    contextType: VaultContextType,
    label: string,
    count: number,
    iconPath: vscode.ThemeIcon
  ): VaultTreeItem {
    return {
      id: `vault-type-${contextType}`,
      label,
      description: `${count}개 카테고리`,
      iconPath,
      contextValue: 'vaultContextType',
      tooltip: `${label} (${count}개 카테고리)`,
      metadata: {
        contextType
      }
    };
  }
  
  /**
   * 특정 타입의 컨텍스트 목록 가져오기
   */
  private getContextsForType(contextType?: VaultContextType): VaultTreeItem[] {
    if (!contextType) {
      return [];
    }
    
    const contexts = this.vaultService.getContextsByType(contextType);
    return contexts.map(context => this.createContextNode(context));
  }
  
  /**
   * 컨텍스트 노드 생성
   */
  private createContextNode(context: VaultContext): VaultTreeItem {
    return {
      id: `vault-context-${context.id}`,
      label: context.name,
      description: `${context.items.length}개 문서`,
      tooltip: context.description || context.name,
      iconPath: new vscode.ThemeIcon('folder'),
      contextValue: 'vaultContext',
      metadata: {
        contextId: context.id,
        contextType: context.type
      }
    };
  }
  
  /**
   * 특정 컨텍스트의 아이템 목록 가져오기
   */
  private getItemsForContext(contextId?: string): VaultTreeItem[] {
    if (!contextId) {
      return [];
    }
    
    const context = this.vaultService.getContextById(contextId);
    if (!context) {
      return [];
    }
    
    return context.items.map(item => this.createItemNode(item, context));
  }
  
  /**
   * 아이템 노드 생성
   */
  private createItemNode(item: VaultItem, context: VaultContext): VaultTreeItem {
    // 아이템 아이콘 결정
    let iconPath: vscode.ThemeIcon;
    
    if (item.tags) {
      if (item.tags.includes('prompt')) {
        iconPath = new vscode.ThemeIcon('symbol-text');
      } else if (item.tags.includes('code') || item.tags.includes('typescript') || item.tags.includes('javascript')) {
        iconPath = new vscode.ThemeIcon('file-code');
      } else if (item.tags.includes('markdown') || item.tags.includes('documentation')) {
        iconPath = new vscode.ThemeIcon('markdown');
      } else if (item.tags.includes('json')) {
        iconPath = new vscode.ThemeIcon('json');
      } else {
        iconPath = new vscode.ThemeIcon('file');
      }
    } else {
      iconPath = new vscode.ThemeIcon('file');
    }
    
    // 업데이트 날짜 포맷
    const updatedAtStr = item.updatedAt instanceof Date 
      ? item.updatedAt.toLocaleDateString() 
      : new Date(item.updatedAt).toLocaleDateString();
    
    // 파일 경로 생성 (실제 파일 시스템 경로와 매핑)
    const filePath = this.getItemFilePath(item, context);
    
    return {
      id: `vault-item-${item.id}`,
      label: item.name,
      description: updatedAtStr,
      tooltip: item.description || item.name,
      iconPath,
      contextValue: 'vaultItem',
      resourceUri: vscode.Uri.file(filePath),
      metadata: {
        itemId: item.id,
        contextId: context.id,
        contextType: context.type,
        content: item.content,
        filePath
      }
    };
  }
  
  /**
   * 아이템 파일 경로 가져오기
   */
  private getItemFilePath(item: VaultItem, context: VaultContext): string {
    // Vault 서비스에서 파일 경로 정보 가져오기
    const vaultDir = (this.vaultService as any).vaultDir;
    if (!vaultDir) {
      // 실제 경로 알 수 없는 경우 가상 경로 생성
      return `/vault/${context.type}/${context.id}/${item.id}.md`;
    }
    
    // 실제 파일 경로 생성
    const contentFilePath = path.join(vaultDir, context.type, context.id, `${item.id}.content.md`);
    if (existsSync(contentFilePath)) {
      return contentFilePath;
    }
    
    // 파일이 없는 경우 가상 경로 생성
    return `/vault/${context.type}/${context.id}/${item.id}.md`;
  }
  
  /**
   * 부모 노드 가져오기
   */
  getParent(element: VaultTreeItem): vscode.ProviderResult<VaultTreeItem> {
    // 실제 구현 필요시 추가
    return null;
  }
}