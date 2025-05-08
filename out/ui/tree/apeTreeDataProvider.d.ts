/**
 * APE Navigator 트리 데이터 제공자
 *
 * VS Code TreeView API를 사용하여 APE 확장의 주요 기능을 계층적으로 표시합니다.
 * 주요 명령어, 설정, 플러그인 정보를 트리 형태로 보여줍니다.
 */
import * as vscode from 'vscode';
import { ApeTreeItem } from './treeNodeTypes';
import { LLMService } from '../../core/llm/llmService';
import { MemoryService } from '../../core/memory/memoryService';
import { TodoService } from '../../core/services/todoService';
import { VaultService } from '../../core/services/vaultService';
import { RulesService } from '../../core/services/rulesService';
import { JiraService } from '../../core/services/jiraService';
/**
 * APE Navigator 트리 데이터 제공자 클래스
 */
export declare class ApeTreeDataProvider implements vscode.TreeDataProvider<ApeTreeItem> {
    private readonly context;
    private readonly llmService;
    private readonly memoryService;
    private readonly todoService?;
    private readonly vaultService?;
    private readonly rulesService?;
    private readonly jiraService?;
    private _onDidChangeTreeData;
    readonly onDidChangeTreeData: vscode.Event<ApeTreeItem | undefined>;
    private treeData;
    /**
     * 생성자
     * @param context 확장 프로그램 컨텍스트
     * @param llmService LLM 서비스
     * @param memoryService 메모리 서비스
     */
    constructor(context: vscode.ExtensionContext, llmService: LLMService, memoryService: MemoryService, todoService?: TodoService | undefined, vaultService?: VaultService | undefined, rulesService?: RulesService | undefined, jiraService?: JiraService | undefined);
    /**
     * 트리 데이터 초기화
     */
    private initializeTreeData;
    /**
     * Git 아이템 가져오기
     */
    private getGitItems;
    /**
     * 명령어 아이템 가져오기
     */
    private getCommandItems;
    /**
     * 설정 아이템 가져오기
     */
    private getSettingsItems;
    /**
     * VAULT 아이템 가져오기
     */
    private getVaultItems;
    /**
     * VAULT 컨텍스트 노드 생성
     * @param context 컨텍스트
     */
    private createContextNode;
    /**
     * VAULT 아이템 노드 생성
     * @param item 아이템
     * @param context 컨텍스트
     */
    private createItemNode;
    /**
     * 지라 아이템 가져오기
     */
    private getJiraItems;
    /**
     * 특정 프로젝트의 Jira 이슈 가져오기
     * @param projectKey 프로젝트 키
     */
    private getJiraIssuesForProject;
    /**
     * 포켓 아이템 가져오기 (Mock)
     */
    private getPocketItems;
    /**
     * SWDP 아이템 가져오기 (Mock)
     */
    private getSWDPItems;
    /**
     * Rules 아이템 가져오기
     */
    private getRulesItems;
    /**
     * Rule 노드 생성
     * @param rule Rule 객체
     * @param isActive 활성화 여부
     */
    private createRuleNode;
    /**
     * 채팅 내역 아이템 가져오기
     */
    private getChatHistoryItems;
    /**
     * 채팅 내역 오류 노드 생성
     */
    private createChatHistoryErrorNode;
    /**
     * 채팅 내역 정보 노드 생성
     */
    private createChatHistoryInfoNode;
    /**
     * 플러그인 아이템 가져오기 - Stub 처리
     */
    private getPluginItems;
    /**
     * 설정 값 가져오기
     */
    private getConfigValue;
    /**
     * 아이콘 경로 가져오기
     * @param iconName 아이콘 이름
     * @param fallbackIcon 대체 테마 아이콘
     * @returns 테마 아이콘
     */
    private getIconPath;
    /**
     * TreeView 새로고침
     */
    refresh(): void;
    /**
     * 트리 아이템 가져오기
     */
    getTreeItem(element: ApeTreeItem): vscode.TreeItem;
    /**
     * 자식 노드 가져오기
     */
    getChildren(element?: ApeTreeItem): ApeTreeItem[] | null;
    /**
     * 부모 노드 가져오기
     */
    getParent(): vscode.ProviderResult<ApeTreeItem>;
}
