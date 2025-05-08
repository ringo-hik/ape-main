/**
 * VAULT 서비스
 *
 * VAULT 컨텍스트 및 아이템을 관리하는 서비스입니다.
 * 컨텍스트 저장, 불러오기, 아이템 관리 기능을 제공합니다.
 */
import * as vscode from 'vscode';
import { ServiceConfigManager } from './serviceConfig';
/**
 * VAULT 컨텍스트 타입
 */
export declare enum VaultContextType {
    System = "system",
    Project = "project",
    Personal = "personal",
    Shared = "shared",
    Template = "template"
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
export declare class VaultService implements vscode.Disposable {
    private readonly context;
    private readonly configManager;
    private _onDidChangeVault;
    readonly onDidChangeVault: vscode.Event<void>;
    private contexts;
    private disposables;
    private vaultDir;
    private fs;
    private path;
    /**
     * 생성자
     * @param context VSCode 확장 컨텍스트
     * @param configManager 서비스 설정 관리자
     */
    constructor(context: vscode.ExtensionContext, configManager: ServiceConfigManager);
    /**
     * 사용자 홈 디렉토리 가져오기
     */
    private getUserHomeDir;
    /**
     * VAULT 디렉토리 존재 확인 및 생성
     */
    private ensureVaultDirectory;
    /**
     * 모든 컨텍스트 로드
     */
    private loadAllContexts;
    /**
     * 파일 시스템에서 컨텍스트 로드
     */
    private loadContextsFromFileSystem;
    /**
     * 특정 컨텍스트의 아이템 로드
     * @param contextId 컨텍스트 ID
     * @param contextType 컨텍스트 타입
     */
    private loadContextItems;
    /**
     * 기본 컨텍스트 생성
     */
    private createDefaultContexts;
    /**
     * 컨텍스트를 파일 시스템에 저장
     * @param context 저장할 컨텍스트
     */
    private saveContextToFileSystem;
    /**
     * 아이템을 파일 시스템에 저장
     * @param item 저장할 아이템
     * @param contextId 컨텍스트 ID
     * @param contextType 컨텍스트 타입
     */
    private saveItemToFileSystem;
    /**
     * 모의 컨텍스트 데이터 로드
     */
    private loadMockContexts;
    /**
     * 모든 컨텍스트 가져오기
     */
    getAllContexts(): VaultContext[];
    /**
     * 컨텍스트 타입별 컨텍스트 가져오기
     * @param type 컨텍스트 타입
     */
    getContextsByType(type: VaultContextType): VaultContext[];
    /**
     * 컨텍스트 ID로 컨텍스트 가져오기
     * @param contextId 컨텍스트 ID
     */
    getContextById(contextId: string): VaultContext | undefined;
    /**
     * 컨텍스트 생성
     * @param name 컨텍스트 이름
     * @param type 컨텍스트 타입
     * @param description 설명 (선택)
     */
    createContext(name: string, type: VaultContextType, description?: string): Promise<VaultContext>;
    /**
     * 컨텍스트 업데이트
     * @param contextId 컨텍스트 ID
     * @param updates 업데이트할 필드
     */
    updateContext(contextId: string, updates: Partial<Pick<VaultContext, 'name' | 'description' | 'metadata'>>): Promise<VaultContext>;
    /**
     * 컨텍스트 삭제
     * @param contextId 컨텍스트 ID
     */
    deleteContext(contextId: string): Promise<boolean>;
    /**
     * 파일 시스템에서 컨텍스트 삭제
     * @param context 삭제할 컨텍스트
     */
    private deleteContextFromFileSystem;
    /**
     * 디렉토리 재귀적 삭제
     * @param dirPath 삭제할 디렉토리 경로
     */
    private deleteDirectoryRecursive;
    /**
     * 아이템 생성
     * @param contextId 컨텍스트 ID
     * @param item 아이템 정보
     */
    createItem(contextId: string, item: Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt' | 'contextId'>): Promise<VaultItem>;
    /**
     * 아이템 업데이트
     * @param contextId 컨텍스트 ID
     * @param itemId 아이템 ID
     * @param updates 업데이트할 필드
     */
    updateItem(contextId: string, itemId: string, updates: Partial<Pick<VaultItem, 'name' | 'description' | 'content' | 'tags' | 'metadata'>>): Promise<VaultItem>;
    /**
     * 아이템 삭제
     * @param contextId 컨텍스트 ID
     * @param itemId 아이템 ID
     */
    deleteItem(contextId: string, itemId: string): Promise<boolean>;
    /**
     * 파일 시스템에서 아이템 삭제
     * @param item 삭제할 아이템
     * @param contextId 컨텍스트 ID
     * @param contextType 컨텍스트 타입
     */
    private deleteItemFromFileSystem;
    /**
     * 아이템 검색
     * @param query 검색어
     * @param filters 필터 (컨텍스트 타입, 태그 등)
     */
    searchItems(query: string, filters?: {
        contextTypes?: VaultContextType[];
        tags?: string[];
        contextIds?: string[];
    }): VaultItem[];
    /**
     * 아이템을 LLM 컨텍스트로 변환
     * @param item 아이템
     */
    itemToLLMContext(item: VaultItem): string;
    /**
     * 리소스 해제
     */
    dispose(): void;
}
