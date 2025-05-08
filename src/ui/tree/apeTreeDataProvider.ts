/**
 * APE Navigator 트리 데이터 제공자
 * 
 * VS Code TreeView API를 사용하여 APE 확장의 주요 기능을 계층적으로 표시합니다.
 * 주요 명령어, 설정, 플러그인 정보를 트리 형태로 보여줍니다.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { existsSync } from 'fs';
import { ApeTreeItem, TreeNodeType } from './treeNodeTypes';
import { LLMService } from '../../core/llm/llmService';
import { MemoryService } from '../../core/memory/memoryService';
import { TodoService } from '../../core/services/todoService';
import { VaultService, VaultContextType } from '../../core/services/vaultService';
import { RulesService } from '../../core/services/rulesService';
import { JiraService } from '../../core/services/jiraService';

/**
 * APE Navigator 트리 데이터 제공자 클래스
 */
export class ApeTreeDataProvider implements vscode.TreeDataProvider<ApeTreeItem> {
  // 트리 데이터 변경 이벤트
  private _onDidChangeTreeData: vscode.EventEmitter<ApeTreeItem | undefined> = new vscode.EventEmitter<ApeTreeItem | undefined>();
  readonly onDidChangeTreeData: vscode.Event<ApeTreeItem | undefined> = this._onDidChangeTreeData.event;
  
  // 트리 데이터
  private treeData: ApeTreeItem[] = [];
  
  /**
   * 생성자
   * @param context 확장 프로그램 컨텍스트
   * @param llmService LLM 서비스
   * @param memoryService 메모리 서비스
   */
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly llmService: LLMService,
    private readonly memoryService: MemoryService,
    private readonly todoService?: TodoService,
    private readonly vaultService?: VaultService,
    private readonly rulesService?: RulesService,
    private readonly jiraService?: JiraService
  ) {
    // 트리 데이터 초기화
    this.initializeTreeData();
    
    // 설정 변경 이벤트 구독
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('ape')) {
        this.refresh();
      }
    });
    
    // VAULT 서비스 변경 이벤트 구독
    if (this.vaultService) {
      this.vaultService.onDidChangeVault(() => {
        this.refresh();
      });
    }
    
    // Rules 서비스 변경 이벤트 구독
    if (this.rulesService) {
      this.rulesService.onDidChangeRules(() => {
        this.refresh();
      });
    }
  }
  
  /**
   * 트리 데이터 초기화
   */
  private initializeTreeData(): void {
    this.treeData = [
      // Git 섹션 (최상위로 이동)
      {
        id: 'git-root',
        label: 'Git',
        type: TreeNodeType.GIT_ROOT,
        iconPath: this.getIconPath('git-version-control', 'git-commit'),
        contextValue: 'gitRoot',
        children: this.getGitItems()
      },
      
      // 채팅 내역 섹션
      {
        id: 'chat-history-root',
        label: '채팅 내역',
        type: TreeNodeType.CHAT_HISTORY_ROOT,
        iconPath: this.getIconPath('chat', 'history'),
        contextValue: 'chatHistoryRoot',
        children: this.getChatHistoryItems()
      },
      
      // 명령어 섹션
      {
        id: 'commands',
        label: '명령어',
        type: TreeNodeType.COMMAND_ROOT,
        iconPath: this.getIconPath('command-line', 'symbol-method'),
        contextValue: 'commandRoot',
        children: this.getCommandItems()
      },
      
      // 설정 섹션
      {
        id: 'settings',
        label: '설정',
        type: TreeNodeType.SETTINGS_ROOT,
        iconPath: this.getIconPath('config', 'gear'),
        contextValue: 'settingsRoot',
        children: this.getSettingsItems()
      },
      
      // Rules 섹션
      {
        id: 'rules-root',
        label: 'Rules',
        type: TreeNodeType.RULES_ROOT,
        iconPath: this.getIconPath('notebook', 'book'),
        contextValue: 'rulesRoot',
        children: this.getRulesItems()
      },
      
      // VAULT 섹션
      {
        id: 'vault',
        label: 'VAULT 컨텍스트',
        type: TreeNodeType.VAULT_ROOT,
        iconPath: this.getIconPath('brain-ai', 'library'),
        contextValue: 'vaultRoot',
        children: this.getVaultItems()
      },
      
      // 지라 섹션 (Mock)
      {
        id: 'jira',
        label: 'Jira 이슈',
        type: TreeNodeType.JIRA_ROOT,
        iconPath: this.getIconPath('jira', 'issues'),
        contextValue: 'jiraRoot',
        children: this.getJiraItems()
      },
      
      // 포켓 섹션 (Mock)
      {
        id: 'pocket',
        label: 'Pocket 저장소',
        type: TreeNodeType.POCKET_ROOT,
        iconPath: this.getIconPath('folder', 'library'),
        contextValue: 'pocketRoot',
        children: this.getPocketItems()
      },
      
      // SWDP 섹션 (Mock)
      {
        id: 'swdp',
        label: 'SWDP',
        type: TreeNodeType.SWDP_ROOT,
        iconPath: this.getIconPath('cicd', 'package'),
        contextValue: 'swdpRoot',
        children: this.getSWDPItems()
      },
      
      // 플러그인 섹션
      {
        id: 'plugins',
        label: '플러그인',
        type: TreeNodeType.PLUGIN_ROOT,
        iconPath: this.getIconPath('plugin', 'extensions'),
        contextValue: 'pluginRoot',
        children: this.getPluginItems()
      }
    ];
  }
  
  /**
   * Git 아이템 가져오기
   */
  private getGitItems(): ApeTreeItem[] {
    return [
      {
        id: 'git-commands',
        label: 'Git 명령어',
        type: TreeNodeType.GIT_CATEGORY,
        iconPath: this.getIconPath('git-version-control', 'git-commit'),
        tooltip: 'Git 관련 작업을 수행하는 명령어입니다. 커밋, 상태 확인, 자동 커밋 기능 등을 제공합니다.',
        contextValue: 'gitCategory',
        children: [
          {
            id: 'git-command-status',
            label: '/git status',
            type: TreeNodeType.GIT_COMMAND,
            description: 'Git 상태 확인',
            tooltip: '현재 Git 저장소의 상태를 확인합니다. 변경된 파일, 스테이징된 파일, 브랜치 정보 등을 보여줍니다.',
            iconPath: this.getIconPath('git-version-control', 'git-pull-request'),
            contextValue: 'gitCommand',
            metadata: {
              name: 'git',
              args: ['status'],
              category: 'git'
            }
          },
          {
            id: 'git-command-commit',
            label: '/git commit',
            type: TreeNodeType.GIT_COMMAND,
            description: '변경사항 커밋',
            tooltip: '변경된 파일을 Git에 커밋합니다. 자동으로 적절한 커밋 메시지를 생성합니다.',
            iconPath: this.getIconPath('git-version-control', 'git-commit'),
            contextValue: 'gitCommand',
            metadata: {
              name: 'git',
              args: ['commit'],
              category: 'git'
            }
          },
          {
            id: 'git-command-auto',
            label: '/git auto',
            type: TreeNodeType.GIT_COMMAND,
            description: '자동 커밋 토글',
            tooltip: '자동 커밋 기능을 켜거나 끕니다. 켜진 상태에서는 파일 저장 시 자동으로 변경사항이 커밋됩니다.',
            iconPath: this.getIconPath('config', 'settings-gear'),
            contextValue: 'gitCommand',
            metadata: {
              name: 'git',
              args: ['auto'],
              category: 'git'
            }
          },
          {
            id: 'git-command-consolidate',
            label: '/git consolidate',
            type: TreeNodeType.GIT_COMMAND,
            description: '임시 커밋 통합',
            tooltip: '[APE][Temporary] 접두사가 붙은 연속된 임시 커밋들을 하나의 정식 커밋으로 통합합니다.',
            iconPath: this.getIconPath('github', 'git-merge'),
            contextValue: 'gitCommand',
            metadata: {
              name: 'git',
              args: ['consolidate'],
              category: 'git'
            }
          },
          {
            id: 'git-command-pr-list',
            label: '/git pr-list [Mock]',
            type: TreeNodeType.GIT_COMMAND,
            description: 'PR 목록 조회',
            tooltip: 'Git 저장소의 PR(Pull Request) 목록을 조회합니다.',
            iconPath: this.getIconPath('github', 'git-pull-request'),
            contextValue: 'gitCommand',
            metadata: {
              name: 'git',
              args: ['pr-list'],
              category: 'git'
            }
          },
          {
            id: 'git-command-pr-create',
            label: '/git pr-create [Mock]',
            type: TreeNodeType.GIT_COMMAND,
            description: '새 PR 생성',
            tooltip: 'Git 저장소에 새로운 PR(Pull Request)을 생성합니다.',
            iconPath: this.getIconPath('github', 'diff-added'),
            contextValue: 'gitCommand',
            metadata: {
              name: 'git',
              args: ['pr-create'],
              category: 'git'
            }
          },
          {
            id: 'git-command-branch-list',
            label: '/git branch-list [Mock]',
            type: TreeNodeType.GIT_COMMAND,
            description: '브랜치 목록 조회',
            tooltip: 'Git 저장소의 브랜치 목록을 조회합니다.',
            iconPath: this.getIconPath('git-version-control', 'git-branch'),
            contextValue: 'gitCommand',
            metadata: {
              name: 'git',
              args: ['branch-list'],
              category: 'git'
            }
          }
        ]
      }
    ];
  }
  
  /**
   * 명령어 아이템 가져오기
   */
  private getCommandItems(): ApeTreeItem[] {
    const categories = [
      {
        id: 'commands-general',
        label: '일반 명령어',
        type: TreeNodeType.COMMAND_CATEGORY,
        iconPath: this.getIconPath('command-line', 'info'),
        tooltip: '기본적인 채팅 및 도움말 관련 명령어입니다.',
        contextValue: 'commandCategory',
        children: [
          {
            id: 'command-help',
            label: '/help',
            type: TreeNodeType.COMMAND,
            description: '도움말 표시',
            tooltip: '사용 가능한 모든 명령어 목록과 설명을 보여줍니다. "/?" 또는 "/도움말"로도 사용 가능합니다.',
            iconPath: this.getIconPath('message', 'question'),
            contextValue: 'command',
            metadata: {
              name: 'help',
              category: 'general'
            }
          },
          {
            id: 'command-clear',
            label: '/clear',
            type: TreeNodeType.COMMAND,
            description: '채팅 내역 지우기',
            tooltip: '현재 채팅 내역을 모두 삭제합니다. "/cls" 또는 "/지우기"로도 사용 가능합니다.',
            iconPath: this.getIconPath('chat', 'clear-all'),
            contextValue: 'command',
            metadata: {
              name: 'clear',
              category: 'general'
            }
          },
          {
            id: 'command-model',
            label: '/model',
            type: TreeNodeType.COMMAND,
            description: 'LLM 모델 변경',
            tooltip: '사용할 LLM 모델을 선택하거나 변경합니다. "/model list"로 사용 가능한 모델 목록을 확인할 수 있습니다.',
            iconPath: this.getIconPath('llm', 'server-process'),
            contextValue: 'command',
            metadata: {
              name: 'model',
              category: 'general'
            }
          }
        ]
      },
      {
        id: 'commands-code',
        label: '코드 및 유틸리티 명령어',
        type: TreeNodeType.COMMAND_CATEGORY,
        iconPath: this.getIconPath('coding', 'symbol-class'),
        tooltip: '코드 분석 및 VS Code 기능 접근을 위한 유틸리티 명령어입니다.',
        contextValue: 'commandCategory',
        children: [
          {
            id: 'command-analyze',
            label: '/analyze',
            type: TreeNodeType.COMMAND,
            description: '코드 분석',
            tooltip: '선택한 코드를 상세히 분석합니다. 코드 기능, 개선점, 모범 사례 등을 제안합니다. "/code" 또는 "/분석"으로도 사용 가능합니다.',
            iconPath: this.getIconPath('code-editor', 'inspect'),
            contextValue: 'command',
            metadata: {
              name: 'analyze',
              category: 'code'
            }
          },
          {
            id: 'command-settings',
            label: '/settings',
            type: TreeNodeType.COMMAND,
            description: 'APE 설정 열기',
            tooltip: 'VS Code 설정에서 APE 관련 설정을 열어 확인하고 수정할 수 있습니다. "/config" 또는 "/설정"으로도 사용 가능합니다.',
            iconPath: this.getIconPath('config', 'gear'),
            contextValue: 'command',
            metadata: {
              name: 'settings',
              category: 'utility'
            }
          },
          {
            id: 'command-open',
            label: '/open',
            type: TreeNodeType.COMMAND,
            description: '파일 열기',
            tooltip: '지정한 파일을 VS Code에서 엽니다. "/file" 또는 "/파일열기"로도 사용 가능합니다.',
            iconPath: this.getIconPath('code-file', 'go-to-file'),
            contextValue: 'command',
            metadata: {
              name: 'open',
              category: 'utility'
            }
          }
        ]
      }
    ];
    
    return categories;
  }
  
  /**
   * 설정 아이템 가져오기
   */
  private getSettingsItems(): ApeTreeItem[] {
    return [
      {
        id: 'settings-llm',
        label: 'LLM 설정',
        type: TreeNodeType.SETTINGS_CATEGORY,
        iconPath: this.getIconPath('llm', 'server'),
        contextValue: 'settingsCategory',
        children: [
          {
            id: 'settings-llm-model',
            label: '기본 모델',
            type: TreeNodeType.SETTINGS_ITEM,
            iconPath: this.getIconPath('ai-neural-network', 'symbol-enum'),
            contextValue: 'settingsItem',
            description: this.getConfigValue('ape.llm.defaultModel') || 'openai/gpt-4.1-mini',
            metadata: {
              settingKey: 'ape.llm.defaultModel'
            }
          },
          {
            id: 'settings-llm-endpoint',
            label: 'API 엔드포인트',
            type: TreeNodeType.SETTINGS_ITEM,
            iconPath: this.getIconPath('api', 'link'),
            contextValue: 'settingsItem',
            description: this.getConfigValue('ape.llm.endpoint') || 'http://localhost:8000/api/chat',
            metadata: {
              settingKey: 'ape.llm.endpoint'
            }
          }
        ]
      },
      {
        id: 'settings-memory',
        label: '메모리 설정',
        type: TreeNodeType.SETTINGS_CATEGORY,
        iconPath: this.getIconPath('database', 'database'),
        contextValue: 'settingsCategory',
        children: [
          {
            id: 'settings-memory-duration',
            label: '세션 유지 기간',
            type: TreeNodeType.SETTINGS_ITEM,
            iconPath: this.getIconPath('event', 'history'),
            contextValue: 'settingsItem',
            description: `${this.getConfigValue('ape.memory.sessionDuration') || '240'}분`,
            metadata: {
              settingKey: 'ape.memory.sessionDuration'
            }
          },
          {
            id: 'settings-memory-messages',
            label: '최대 메시지 수',
            type: TreeNodeType.SETTINGS_ITEM,
            iconPath: this.getIconPath('message', 'symbol-number'),
            contextValue: 'settingsItem',
            description: this.getConfigValue('ape.memory.maxMessages') || '30',
            metadata: {
              settingKey: 'ape.memory.maxMessages'
            }
          }
        ]
      },
      {
        id: 'settings-ui',
        label: 'UI 설정',
        type: TreeNodeType.SETTINGS_CATEGORY,
        iconPath: this.getIconPath('code-editor', 'browser'),
        contextValue: 'settingsCategory',
        children: [
          {
            id: 'settings-ui-theme',
            label: 'UI 테마',
            type: TreeNodeType.SETTINGS_ITEM,
            iconPath: this.getIconPath('vscode', 'symbol-color'),
            contextValue: 'settingsItem',
            description: this.getConfigValue('ape.ui.theme') || 'auto',
            metadata: {
              settingKey: 'ape.ui.theme'
            }
          }
        ]
      }
    ];
  }
  
  /**
   * VAULT 아이템 가져오기
   */
  private getVaultItems(): ApeTreeItem[] {
    // VAULT 서비스가 없으면 스텁 반환
    if (!this.vaultService) {
      return [{
        id: 'vault-not-initialized',
        label: 'VAULT 서비스 초기화 필요',
        type: TreeNodeType.VAULT_ROOT,
        iconPath: this.getIconPath('brain-ai', 'error'),
        contextValue: 'vaultError',
        description: '서비스가 초기화되지 않음',
        tooltip: 'VAULT 서비스가 초기화되지 않았습니다. 확장 설정을 확인하세요.'
      }];
    }
    
    // 컨텍스트 타입별 아이템 구성
    const contextTypeItems: ApeTreeItem[] = [];
    
    // 시스템 컨텍스트
    const systemContexts = this.vaultService.getContextsByType(VaultContextType.System);
    if (systemContexts.length > 0) {
      contextTypeItems.push({
        id: 'vault-system',
        label: '시스템 컨텍스트',
        type: TreeNodeType.VAULT_CATEGORY,
        iconPath: this.getIconPath('brain-ai', 'server'),
        contextValue: 'vaultCategory',
        tooltip: '시스템 기본 컨텍스트입니다.',
        children: systemContexts.flatMap(context => this.createContextNode(context))
      });
    }
    
    // 프로젝트 컨텍스트
    const projectContexts = this.vaultService.getContextsByType(VaultContextType.Project);
    if (projectContexts.length > 0) {
      contextTypeItems.push({
        id: 'vault-project',
        label: '프로젝트 컨텍스트',
        type: TreeNodeType.VAULT_CATEGORY,
        iconPath: this.getIconPath('coding', 'git-merge'),
        contextValue: 'vaultCategory',
        tooltip: '프로젝트별 컨텍스트입니다.',
        children: projectContexts.flatMap(context => this.createContextNode(context))
      });
    }
    
    // 개인 컨텍스트
    const personalContexts = this.vaultService.getContextsByType(VaultContextType.Personal);
    if (personalContexts.length > 0) {
      contextTypeItems.push({
        id: 'vault-personal',
        label: '개인 컨텍스트',
        type: TreeNodeType.VAULT_CATEGORY,
        iconPath: this.getIconPath('message', 'account'),
        contextValue: 'vaultCategory',
        tooltip: '개인 사용자 컨텍스트입니다.',
        children: personalContexts.flatMap(context => this.createContextNode(context))
      });
    }
    
    // 공유 컨텍스트
    const sharedContexts = this.vaultService.getContextsByType(VaultContextType.Shared);
    if (sharedContexts.length > 0) {
      contextTypeItems.push({
        id: 'vault-shared',
        label: '공유 컨텍스트',
        type: TreeNodeType.VAULT_CATEGORY,
        iconPath: this.getIconPath('github', 'repo-forked'),
        contextValue: 'vaultCategory',
        tooltip: '팀원 간 공유되는 컨텍스트입니다.',
        children: sharedContexts.flatMap(context => this.createContextNode(context))
      });
    }
    
    // 템플릿 컨텍스트
    const templateContexts = this.vaultService.getContextsByType(VaultContextType.Template);
    if (templateContexts.length > 0) {
      contextTypeItems.push({
        id: 'vault-template',
        label: '템플릿 컨텍스트',
        type: TreeNodeType.VAULT_CATEGORY,
        iconPath: this.getIconPath('code-file', 'file-code'),
        contextValue: 'vaultCategory',
        tooltip: '재사용 가능한 템플릿 컨텍스트입니다.',
        children: templateContexts.flatMap(context => this.createContextNode(context))
      });
    }
    
    return contextTypeItems;
  }
  
  /**
   * VAULT 컨텍스트 노드 생성
   * @param context 컨텍스트
   */
  private createContextNode(context: any): ApeTreeItem[] {
    if (!context || !context.items) {
      return [];
    }
    
    const contextNode: ApeTreeItem = {
      id: `vault-context-${context.id}`,
      label: context.name,
      type: TreeNodeType.VAULT_CONTEXT,
      description: `${context.items.length}개 항목`,
      tooltip: context.description || context.name,
      iconPath: this.getIconPath('brain-ai', 'library'),
      contextValue: 'vaultContext',
      metadata: {
        contextId: context.id,
        contextType: context.type
      },
      children: context.items.map((item: any) => this.createItemNode(item, context))
    };
    
    return [contextNode];
  }
  
  /**
   * VAULT 아이템 노드 생성
   * @param item 아이템
   * @param context 컨텍스트
   */
  private createItemNode(item: any, context: any): ApeTreeItem {
    let iconName = 'file-text';
    let fallbackIcon = 'symbol-string';
    
    // 태그에 따른 아이콘 설정
    if (item.tags) {
      if (item.tags.includes('prompt')) {
        iconName = 'brain-ai';
        fallbackIcon = 'symbol-text';
      } else if (item.tags.includes('code')) {
        iconName = 'code-file';
        fallbackIcon = 'file-code';
      } else if (item.tags.includes('architecture')) {
        iconName = 'orchestration';
        fallbackIcon = 'type-hierarchy';
      } else if (item.tags.includes('meeting')) {
        iconName = 'event';
        fallbackIcon = 'group';
      } else if (item.tags.includes('documentation')) {
        iconName = 'markdown';
        fallbackIcon = 'markdown';
      }
    }
    
    // 업데이트 날짜 포맷
    const updatedAtStr = item.updatedAt instanceof Date 
      ? item.updatedAt.toLocaleDateString() 
      : new Date(item.updatedAt).toLocaleDateString();
    
    return {
      id: `vault-item-${item.id}`,
      label: item.name,
      type: TreeNodeType.VAULT_ITEM,
      description: updatedAtStr,
      tooltip: item.description || item.name,
      iconPath: this.getIconPath(iconName, fallbackIcon),
      contextValue: 'vaultItem',
      metadata: {
        itemId: item.id,
        contextId: context.id,
        content: item.content,
        tags: item.tags
      }
    };
  }
  
  /**
   * 지라 아이템 가져오기
   */
  private getJiraItems(): ApeTreeItem[] {
    // Jira 서비스가 없으면 Mock 데이터 반환
    if (!this.jiraService) {
      return [
        {
          id: 'jira-not-initialized',
          label: 'Jira 서비스 초기화 필요',
          type: TreeNodeType.JIRA_ROOT,
          iconPath: this.getIconPath('jira', 'error'),
          contextValue: 'jiraError',
          description: '서비스가 초기화되지 않음',
          tooltip: 'Jira 서비스가 초기화되지 않았습니다. 확장 설정을 확인하세요.'
        }
      ];
    }
    
    try {
      // 실제 Jira 데이터를 가져오려면 주석 해제하고 Mock 데이터 부분 주석 처리
      // 현재는 개발 환경에서 테스트를 위해 Mock 데이터 사용
      
      /*
      // 계정 정보 확인
      const configResult = this.jiraService.getConfig();
      if (!configResult.success || !configResult.data || !configResult.data.isConfigured) {
        return [
          {
            id: 'jira-not-configured',
            label: 'Jira 설정이 필요합니다',
            type: TreeNodeType.JIRA_ROOT,
            iconPath: this.getIconPath('jira', 'warning'),
            contextValue: 'jiraNotConfigured',
            description: '인증 정보 없음',
            tooltip: 'Jira 연결을 위한 설정이 필요합니다. 확장 설정에서 Jira 인증 정보를 입력해주세요.'
          }
        ];
      }
      
      // 지라 프로젝트 가져오기
      const projectsResult = await this.jiraService.getProjects();
      if (!projectsResult.success || !projectsResult.data) {
        throw new Error(projectsResult.error?.message || 'Jira 프로젝트를 가져오는 데 실패했습니다');
      }
      
      const projects = projectsResult.data;
      
      // 각 프로젝트별 이슈 가져오기
      return projects.map(project => {
        return {
          id: `jira-project-${project.key}`,
          label: `${project.name} (${project.key})`,
          type: TreeNodeType.JIRA_PROJECT,
          iconPath: this.getIconPath('jira', 'project'),
          contextValue: 'jiraProject',
          description: `${project.issueCount || 0}개 이슈`,
          tooltip: project.description || project.name,
          children: this.getJiraIssuesForProject(project.key)
        };
      });
      */
      
      // Mock 데이터 (개발 환경용)
      return [
        {
          id: 'jira-project-ape',
          label: 'APE 프로젝트',
          type: TreeNodeType.JIRA_PROJECT,
          iconPath: this.getIconPath('jira', 'project'),
          contextValue: 'jiraProject',
          description: 'APE-001 외 10개 이슈',
          tooltip: 'Agentic Pipeline Engine 프로젝트',
          children: [
            {
              id: 'jira-issue-ape-001',
              label: 'APE-001: 초기 설정 구현',
              type: TreeNodeType.JIRA_ISSUE,
              iconPath: this.getIconPath('jira', 'issue-closed'),
              contextValue: 'jiraIssue',
              description: '완료됨',
              tooltip: '프로젝트 초기 설정 및 기본 구조 구현',
              metadata: {
                id: 'APE-001',
                status: 'Done',
                assignee: '사용자',
                priority: 'High',
                command: {
                  name: 'jira',
                  args: ['show', 'APE-001']
                }
              }
            },
            {
              id: 'jira-issue-ape-002',
              label: 'APE-002: 채팅 UI 개선',
              type: TreeNodeType.JIRA_ISSUE,
              iconPath: this.getIconPath('jira', 'issue-open'),
              contextValue: 'jiraIssue',
              description: '진행 중',
              tooltip: '채팅 UI 개선 및 응답성 향상',
              metadata: {
                id: 'APE-002',
                status: 'In Progress',
                assignee: '사용자',
                priority: 'Medium',
                command: {
                  name: 'jira',
                  args: ['show', 'APE-002']
                }
              }
            },
            {
              id: 'jira-issue-ape-003',
              label: 'APE-003: 트리뷰 구현',
              type: TreeNodeType.JIRA_ISSUE,
              iconPath: this.getIconPath('jira', 'issues'),
              contextValue: 'jiraIssue',
              description: '진행 중',
              tooltip: '트리뷰 구현 및 서비스 연동',
              metadata: {
                id: 'APE-003',
                status: 'In Progress',
                assignee: '사용자',
                priority: 'High',
                command: {
                  name: 'jira',
                  args: ['show', 'APE-003']
                }
              }
            }
          ]
        },
        {
          id: 'jira-project-int',
          label: '통합 프로젝트',
          type: TreeNodeType.JIRA_PROJECT,
          iconPath: this.getIconPath('jira', 'project'),
          contextValue: 'jiraProject',
          description: 'INT-001 외 5개 이슈',
          tooltip: '시스템 통합 프로젝트',
          children: [
            {
              id: 'jira-issue-int-001',
              label: 'INT-001: Git 통합',
              type: TreeNodeType.JIRA_ISSUE,
              iconPath: this.getIconPath('jira', 'issue-open'),
              contextValue: 'jiraIssue',
              description: '진행 중',
              tooltip: 'Git 서비스 통합 및 자동 커밋 기능 구현',
              metadata: {
                id: 'INT-001',
                status: 'In Progress',
                assignee: '사용자',
                priority: 'High',
                command: {
                  name: 'jira',
                  args: ['show', 'INT-001']
                }
              }
            },
            {
              id: 'jira-issue-int-002',
              label: 'INT-002: Jira 통합',
              type: TreeNodeType.JIRA_ISSUE,
              iconPath: this.getIconPath('jira', 'issue-draft'),
              contextValue: 'jiraIssue',
              description: '계획됨',
              tooltip: 'Jira 서비스 통합 및 이슈 관리 기능 구현',
              metadata: {
                id: 'INT-002',
                status: 'Planned',
                assignee: '미할당',
                priority: 'Medium',
                command: {
                  name: 'jira',
                  args: ['show', 'INT-002']
                }
              }
            }
          ]
        },
        {
          id: 'jira-commands',
          label: 'Jira 명령어',
          type: TreeNodeType.JIRA_CATEGORY,
          iconPath: this.getIconPath('command-line', 'terminal'),
          contextValue: 'jiraCommands',
          tooltip: 'Jira 관련 명령어',
          children: [
            {
              id: 'jira-command-create',
              label: '/jira create',
              type: TreeNodeType.JIRA_COMMAND,
              iconPath: this.getIconPath('jira', 'add'),
              contextValue: 'jiraCommand',
              description: '새 이슈 생성',
              tooltip: '새 Jira 이슈를 생성합니다',
              metadata: {
                name: 'jira',
                args: ['create'],
                category: 'utility'
              }
            },
            {
              id: 'jira-command-search',
              label: '/jira search',
              type: TreeNodeType.JIRA_COMMAND,
              iconPath: this.getIconPath('jira', 'search'),
              contextValue: 'jiraCommand',
              description: '이슈 검색',
              tooltip: 'Jira 이슈를 검색합니다',
              metadata: {
                name: 'jira',
                args: ['search'],
                category: 'utility'
              }
            },
            {
              id: 'jira-command-summary',
              label: '/jira summary',
              type: TreeNodeType.JIRA_COMMAND,
              iconPath: this.getIconPath('jira', 'graph'),
              contextValue: 'jiraCommand',
              description: '프로젝트 요약',
              tooltip: 'Jira 프로젝트 요약 정보를 표시합니다',
              metadata: {
                name: 'jira',
                args: ['summary'],
                category: 'utility'
              }
            },
            {
              id: 'jira-command-status',
              label: '/jira status',
              type: TreeNodeType.JIRA_COMMAND,
              iconPath: this.getIconPath('jira', 'sync'),
              contextValue: 'jiraCommand',
              description: '이슈 상태 변경',
              tooltip: 'Jira 이슈의 상태를 변경합니다',
              metadata: {
                name: 'jira',
                args: ['status'],
                category: 'utility'
              }
            }
          ]
        }
      ];
    } catch (error) {
      console.error('Jira 아이템 가져오기 오류:', error);
      return [{
        id: 'jira-error',
        label: 'Jira 로딩 오류',
        type: TreeNodeType.JIRA_ROOT,
        iconPath: this.getIconPath('jira', 'error'),
        contextValue: 'jiraError',
        description: `오류: ${error instanceof Error ? error.message : String(error)}`,
        tooltip: '오류 내용: ' + (error instanceof Error ? error.message : String(error))
      }];
    }
  }
  
  /**
   * 특정 프로젝트의 Jira 이슈 가져오기
   * @param projectKey 프로젝트 키
   */
  private getJiraIssuesForProject(projectKey: string): ApeTreeItem[] {
    if (!this.jiraService) {
      return [];
    }
    
    try {
      /*
      // 실제 구현 (주석 처리)
      const searchCriteria = {
        projectKey: projectKey,
        maxResults: 10
      };
      
      const searchResult = await this.jiraService.searchIssues(searchCriteria);
      if (!searchResult.success || !searchResult.data) {
        throw new Error(searchResult.error?.message || '이슈 검색에 실패했습니다');
      }
      
      const issues = searchResult.data.issues;
      
      return issues.map(issue => {
        let iconName = 'jira';
        let fallbackIcon = 'issues';
        
        // 상태에 따른 아이콘 설정
        if (issue.status === JiraIssueStatus.Done || 
            issue.status === JiraIssueStatus.Closed || 
            issue.status === JiraIssueStatus.Resolved) {
          fallbackIcon = 'issue-closed';
        } else if (issue.status === JiraIssueStatus.InProgress) {
          fallbackIcon = 'issue-open';
        } else {
          fallbackIcon = 'issue-draft';
        }
        
        return {
          id: `jira-issue-${issue.key}`,
          label: `${issue.key}: ${issue.summary}`,
          type: TreeNodeType.JIRA_ISSUE,
          iconPath: this.getIconPath(iconName, fallbackIcon),
          contextValue: 'jiraIssue',
          description: issue.status,
          tooltip: issue.description || issue.summary,
          metadata: {
            id: issue.key,
            status: issue.status,
            assignee: issue.assignee || '미할당',
            priority: issue.priority || 'Medium',
            command: {
              name: 'jira',
              args: ['show', issue.key]
            }
          }
        };
      });
      */
      
      // Mock 데이터 (실제 구현 전까지 사용)
      return [];
    } catch (error) {
      console.error(`Jira 이슈 가져오기 오류 (${projectKey}):`, error);
      return [];
    }
  }
  
  /**
   * 포켓 아이템 가져오기 (Mock)
   */
  private getPocketItems(): ApeTreeItem[] {
    return [
      {
        id: 'pocket-category-code',
        label: '코드 샘플 [Mock]',
        type: TreeNodeType.POCKET_CATEGORY,
        iconPath: this.getIconPath('code-file', 'code'),
        contextValue: 'pocketCategory',
        description: '3개 항목',
        tooltip: '유용한 코드 샘플 모음',
        children: [
          {
            id: 'pocket-item-code-1',
            label: '타입스크립트 유틸리티 함수 [Mock]',
            type: TreeNodeType.POCKET_ITEM,
            iconPath: this.getIconPath('typescript', 'symbol-method'),
            contextValue: 'pocketItem',
            description: '2023-05-01 저장됨',
            tooltip: '자주 사용하는 타입스크립트 유틸리티 함수 모음',
            metadata: {
              id: 'code-1',
              createdAt: '2023-05-01',
              tags: ['typescript', 'utility']
            }
          },
          {
            id: 'pocket-item-code-2',
            label: 'VS Code API 샘플 [Mock]',
            type: TreeNodeType.POCKET_ITEM,
            iconPath: this.getIconPath('vscode', 'symbol-method'),
            contextValue: 'pocketItem',
            description: '2023-05-05 저장됨',
            tooltip: 'VS Code API 활용 예제 코드',
            metadata: {
              id: 'code-2',
              createdAt: '2023-05-05',
              tags: ['vscode', 'api', 'extension']
            }
          }
        ]
      },
      {
        id: 'pocket-category-notes',
        label: '프로젝트 노트 [Mock]',
        type: TreeNodeType.POCKET_CATEGORY,
        iconPath: this.getIconPath('markdown', 'notebook'),
        contextValue: 'pocketCategory',
        description: '2개 항목',
        tooltip: '프로젝트 관련 메모 및 노트',
        children: [
          {
            id: 'pocket-item-notes-1',
            label: '아키텍처 설계 메모 [Mock]',
            type: TreeNodeType.POCKET_ITEM,
            iconPath: this.getIconPath('markdown', 'file-text'),
            contextValue: 'pocketItem',
            description: '2023-04-28 저장됨',
            tooltip: '프로젝트 아키텍처 설계 관련 메모',
            metadata: {
              id: 'notes-1',
              createdAt: '2023-04-28',
              tags: ['architecture', 'design', 'memo']
            }
          }
        ]
      }
    ];
  }
  
  /**
   * SWDP 아이템 가져오기 (Mock)
   */
  private getSWDPItems(): ApeTreeItem[] {
    return [
      {
        id: 'swdp-release',
        label: 'Release Build',
        type: TreeNodeType.SWDP_BUILD_TYPE,
        iconPath: this.getIconPath('cicd', 'package'),
        contextValue: 'swdpBuildType',
        tooltip: 'SWDP Release Build 유형',
        children: [
          {
            id: 'swdp-release-info',
            label: 'BUILD, COVERITY, SAM, ONBOARD TESTE, DOBEE, BLACKDUCK, 등등 여기에 표기 예정입니다.',
            type: TreeNodeType.SWDP_ARTIFACT,
            iconPath: this.getIconPath('jenkins-ci-cd', 'info'),
            contextValue: 'swdpArtifact',
            tooltip: 'SWDP Release Build 정보'
          }
        ]
      },
      {
        id: 'swdp-layer',
        label: 'Layer Build',
        type: TreeNodeType.SWDP_BUILD_TYPE,
        iconPath: this.getIconPath('orchestration', 'layers'),
        contextValue: 'swdpBuildType',
        tooltip: 'SWDP Layer Build 유형',
        children: [
          {
            id: 'swdp-layer-info',
            label: 'BUILD, COVERITY, SAM, ONBOARD TESTE, DOBEE, BLACKDUCK, 등등 여기에 표기 예정입니다.',
            type: TreeNodeType.SWDP_ARTIFACT,
            iconPath: this.getIconPath('jenkins-ci-cd', 'info'),
            contextValue: 'swdpArtifact',
            tooltip: 'SWDP Layer Build 정보'
          }
        ]
      },
      {
        id: 'swdp-local',
        label: 'Local Build',
        type: TreeNodeType.SWDP_BUILD_TYPE,
        iconPath: this.getIconPath('docker', 'desktop-download'),
        contextValue: 'swdpBuildType',
        tooltip: 'SWDP Local Build 유형',
        children: [
          {
            id: 'swdp-local-info',
            label: 'BUILD, COVERITY, SAM, ONBOARD TESTE, DOBEE, BLACKDUCK, 등등 여기에 표기 예정입니다.',
            type: TreeNodeType.SWDP_ARTIFACT,
            iconPath: this.getIconPath('docker-container', 'info'),
            contextValue: 'swdpArtifact',
            tooltip: 'SWDP Local Build 정보'
          }
        ]
      }
    ];
  }
  
  /**
   * Rules 아이템 가져오기
   */
  private getRulesItems(): ApeTreeItem[] {
    // Rules 서비스가 없으면 스텁 반환
    if (!this.rulesService) {
      return [{
        id: 'rules-not-initialized',
        label: 'Rules 서비스 초기화 필요',
        type: TreeNodeType.RULES_ROOT,
        iconPath: this.getIconPath('notebook', 'error'),
        contextValue: 'rulesError',
        description: '서비스가 초기화되지 않음',
        tooltip: 'Rules 서비스가 초기화되지 않았습니다. 확장 설정을 확인하세요.'
      }];
    }
    
    try {
      const activeRules = this.rulesService.getActiveRules();
      const inactiveRules = this.rulesService.getAllRules().filter(rule => 
        !activeRules.some(activeRule => activeRule.id === rule.id)
      );
      
      const ruleItems: ApeTreeItem[] = [];
      
      // 활성화된 Rules 카테고리
      if (activeRules.length > 0) {
        ruleItems.push({
          id: 'rules-active',
          label: '활성화된 Rules',
          type: TreeNodeType.RULES_ACTIVE,
          iconPath: this.getIconPath('notebook', 'check'),
          contextValue: 'rulesActive',
          tooltip: '현재 LLM 시스템 프롬프트에 적용된 Rules',
          description: `${activeRules.length}개 항목`,
          children: activeRules.map(rule => this.createRuleNode(rule, true))
        });
      }
      
      // 비활성화된 Rules 카테고리
      if (inactiveRules.length > 0) {
        ruleItems.push({
          id: 'rules-inactive',
          label: '비활성화된 Rules',
          type: TreeNodeType.RULES_INACTIVE,
          iconPath: this.getIconPath('notebook', 'circle-outline'),
          contextValue: 'rulesInactive',
          tooltip: '현재 비활성화되어 있는 Rules',
          description: `${inactiveRules.length}개 항목`,
          children: inactiveRules.map(rule => this.createRuleNode(rule, false))
        });
      }
      
      // Rules가 없는 경우
      if (ruleItems.length === 0) {
        ruleItems.push({
          id: 'rules-empty',
          label: 'Rules 없음',
          type: TreeNodeType.RULES_ROOT,
          iconPath: this.getIconPath('notebook', 'info'),
          contextValue: 'rulesEmpty',
          description: '생성된 Rules 없음',
          tooltip: '우클릭 메뉴를 통해 새 Rule을 생성하세요.'
        });
      }
      
      return ruleItems;
    } catch (error) {
      console.error('Rules 목록 가져오기 오류:', error);
      return [{
        id: 'rules-error',
        label: 'Rules 로딩 오류',
        type: TreeNodeType.RULES_ROOT,
        iconPath: this.getIconPath('notebook', 'error'),
        contextValue: 'rulesError',
        description: `오류: ${error instanceof Error ? error.message : String(error)}`,
        tooltip: '오류 내용: ' + (error instanceof Error ? error.message : String(error))
      }];
    }
  }
  
  /**
   * Rule 노드 생성
   * @param rule Rule 객체
   * @param isActive 활성화 여부
   */
  private createRuleNode(rule: any, isActive: boolean): ApeTreeItem {
    const iconName = isActive ? 'notebook' : 'notebook';
    const fallbackIcon = isActive ? 'notebook-opened' : 'notebook';
    
    // 파일 이름만 추출
    const fileName = rule.filePath.split('/').pop();
    
    return {
      id: `rule-item-${rule.id}`,
      label: rule.name,
      type: TreeNodeType.RULE_ITEM,
      description: fileName, // 파일 이름을 설명으로 표시
      tooltip: `${rule.name} (${fileName})\n\n${rule.content.substring(0, 100)}${rule.content.length > 100 ? '...' : ''}`,
      iconPath: this.getIconPath(iconName, fallbackIcon),
      contextValue: isActive ? 'ruleActive' : 'ruleInactive',
      metadata: {
        id: rule.id,
        filePath: rule.filePath,
        isActive: isActive
      }
    };
  }
  
  /**
   * 채팅 내역 아이템 가져오기
   */
  private getChatHistoryItems(): ApeTreeItem[] {
    try {
      // 워크스페이스 루트 경로 가져오기
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        return [this.createChatHistoryErrorNode('워크스페이스 폴더를 찾을 수 없습니다')];
      }
      
      // 채팅 내역 폴더 경로
      const chatHistoryDir = path.join(workspaceFolder.uri.fsPath, 'vault', 'chat-history');
      
      // 폴더 존재 확인
      if (!existsSync(chatHistoryDir)) {
        return [this.createChatHistoryInfoNode('저장된 채팅 내역이 없습니다', '채팅 내역을 저장하려면 채팅 창에서 `/save-chat` 명령어를 사용하세요.')];
      }
      
      // 파일 시스템에서 메타데이터 파일 목록 가져오기
      const fs = require('fs');
      const metaFiles = fs.readdirSync(chatHistoryDir)
        .filter((name: string) => name.endsWith('.meta.json'));
      
      if (metaFiles.length === 0) {
        return [this.createChatHistoryInfoNode('저장된 채팅 내역이 없습니다', '채팅 내역을 저장하려면 채팅 창에서 `/save-chat` 명령어를 사용하세요.')];
      }
      
      // 채팅 내역 아이템 목록
      const chatItems: ApeTreeItem[] = [];
      
      // 메타데이터 파일 처리
      for (const fileName of metaFiles) {
        const filePath = path.join(chatHistoryDir, fileName);
        const chatId = fileName.replace('.meta.json', '');
        
        try {
          // 메타데이터 읽기
          const metadata = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          
          // 날짜 포맷팅
          const createdDate = new Date(metadata.createdAt);
          const dateStr = createdDate.toLocaleDateString();
          const timeStr = createdDate.toLocaleTimeString();
          
          // 채팅 내역 아이템 추가
          chatItems.push({
            id: `chat-history-${chatId}`,
            label: metadata.title,
            type: TreeNodeType.CHAT_HISTORY_ITEM,
            description: `${dateStr} ${timeStr}`,
            tooltip: `${metadata.title} (${dateStr} ${timeStr})\n${metadata.messageCount}개 메시지`,
            iconPath: this.getIconPath('chat', 'comment-discussion'),
            contextValue: 'chatHistoryItem',
            metadata: {
              id: chatId,
              title: metadata.title,
              createdAt: metadata.createdAt,
              updatedAt: metadata.updatedAt,
              messageCount: metadata.messageCount,
              command: {
                name: 'show',
                args: [chatId]
              }
            }
          });
        } catch (error) {
          console.error(`채팅 내역 메타데이터 읽기 오류 (${fileName}):`, error);
        }
      }
      
      // 최신순 정렬
      chatItems.sort((a, b) => {
        const dateA = new Date(a.metadata.createdAt);
        const dateB = new Date(b.metadata.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
      
      return chatItems;
    } catch (error) {
      console.error('채팅 내역 아이템 가져오기 오류:', error);
      return [this.createChatHistoryErrorNode(`오류: ${error instanceof Error ? error.message : String(error)}`)];
    }
  }
  
  /**
   * 채팅 내역 오류 노드 생성
   */
  private createChatHistoryErrorNode(message: string): ApeTreeItem {
    return {
      id: 'chat-history-error',
      label: '채팅 내역 로딩 오류',
      type: TreeNodeType.CHAT_HISTORY_ROOT,
      iconPath: this.getIconPath('chat', 'error'),
      contextValue: 'chatHistoryError',
      description: message,
      tooltip: message
    };
  }
  
  /**
   * 채팅 내역 정보 노드 생성
   */
  private createChatHistoryInfoNode(label: string, tooltip: string): ApeTreeItem {
    return {
      id: 'chat-history-info',
      label,
      type: TreeNodeType.CHAT_HISTORY_ROOT,
      iconPath: this.getIconPath('chat', 'info'),
      contextValue: 'chatHistoryInfo',
      tooltip
    };
  }

  /**
   * 플러그인 아이템 가져오기 - Stub 처리
   */
  private getPluginItems(): ApeTreeItem[] {
    return [
      {
        id: 'plugin-not-implemented',
        label: '플러그인 목록 로드 중...',
        type: TreeNodeType.PLUGIN_ROOT,
        iconPath: this.getIconPath('plugin', 'error'),
        contextValue: 'pluginStub',
        description: '구현되지 않은 기능입니다',
        tooltip: '이 기능은 아직 구현되지 않았습니다. TASK-W3-001의 다음 단계에서 구현될 예정입니다.'
      }
    ];
  }
  
  /**
   * 설정 값 가져오기
   */
  private getConfigValue(key: string): string {
    const config = vscode.workspace.getConfiguration();
    const value = config.get(key);
    
    return value !== undefined ? String(value) : '';
  }
  
  /**
   * 아이콘 경로 가져오기
   * @param iconName 아이콘 이름
   * @param fallbackIcon 대체 테마 아이콘
   * @returns 테마 아이콘
   */
  private getIconPath(iconName: string, fallbackIcon: string = 'symbol-event'): vscode.ThemeIcon {
    // ThemeIcon 사용
    return new vscode.ThemeIcon(fallbackIcon);
  }
  
  /**
   * TreeView 새로고침
   */
  public refresh(): void {
    this.initializeTreeData();
    this._onDidChangeTreeData.fire(undefined);
  }
  
  /**
   * 트리 아이템 가져오기
   */
  getTreeItem(element: ApeTreeItem): vscode.TreeItem {
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
    
    // 명령어 설정
    if (element.type === TreeNodeType.COMMAND || 
        element.type === TreeNodeType.GIT_COMMAND) {
      // 명령어 클릭 시 실행
      treeItem.command = {
        command: 'ape.executeCommand',
        title: '명령어 실행',
        arguments: [element.metadata]
      };
    } else if (element.type === TreeNodeType.SETTINGS_ITEM) {
      // 설정 클릭 시 설정 페이지 열기
      treeItem.command = {
        command: 'ape.openSettings',
        title: '설정 열기',
        arguments: [element.metadata?.settingKey]
      };
    } else if (element.type === TreeNodeType.VAULT_ITEM) {
      // VAULT 아이템 클릭 시 내용 보기
      treeItem.command = {
        command: 'ape.vaultShowItem',
        title: 'VAULT 아이템 보기',
        arguments: [element.metadata]
      };
    } else if (element.type === TreeNodeType.CHAT_HISTORY_ITEM) {
      // 채팅 내역 아이템 클릭 시 내용 보기
      treeItem.command = {
        command: 'ape.executeCommand',
        title: '채팅 내역 보기',
        arguments: [{
          name: 'show',
          args: [element.metadata.id]
        }]
      };
    }
    
    return treeItem;
  }
  
  /**
   * 자식 노드 가져오기
   */
  getChildren(element?: ApeTreeItem): ApeTreeItem[] | null {
    if (!element) {
      return this.treeData;
    }
    
    return element.children || [];
  }
  
  /**
   * 부모 노드 가져오기
   */
  getParent(): vscode.ProviderResult<ApeTreeItem> {
    // 현재 버전에서는 부모 노드 추적이 필요하지 않음
    return null;
  }
}