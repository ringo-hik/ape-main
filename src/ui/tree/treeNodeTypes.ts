/**
 * 트리 노드 타입 정의
 * 
 * APE Navigator 트리뷰의 노드 타입과 인터페이스를 정의합니다.
 */

import * as vscode from 'vscode';

/**
 * 트리 노드 타입 열거형
 */
export enum TreeNodeType {
  // 카테고리 노드
  CATEGORY = 'category',
  
  // 명령어 관련 노드
  COMMAND_ROOT = 'command-root',
  COMMAND_CATEGORY = 'command-category',
  COMMAND = 'command',
  
  // Git 관련 노드
  GIT_ROOT = 'git-root',
  GIT_CATEGORY = 'git-category',
  GIT_COMMAND = 'git-command',
  
  // 설정 관련 노드
  SETTINGS_ROOT = 'settings-root',
  SETTINGS_CATEGORY = 'settings-category',
  SETTINGS_ITEM = 'settings-item',
  
  // 플러그인 관련 노드
  PLUGIN_ROOT = 'plugin-root',
  PLUGIN_ACTIVE = 'plugin-active',
  PLUGIN_INACTIVE = 'plugin-inactive',
  PLUGIN = 'plugin',
  
  // 지라 관련 노드
  JIRA_ROOT = 'jira-root',
  JIRA_PROJECT = 'jira-project',
  JIRA_ISSUE = 'jira-issue',
  JIRA_CATEGORY = 'jira-category',
  JIRA_COMMAND = 'jira-command',
  
  // 포켓 관련 노드
  POCKET_ROOT = 'pocket-root',
  POCKET_CATEGORY = 'pocket-category',
  POCKET_ITEM = 'pocket-item',
  
  // SWDP 관련 노드
  SWDP_ROOT = 'swdp-root',
  SWDP_RELEASE = 'swdp-release',
  SWDP_BUILD_TYPE = 'swdp-build-type',
  SWDP_ARTIFACT = 'swdp-artifact',
  
  // VAULT 관련 노드
  VAULT_ROOT = 'vault-root',
  VAULT_CATEGORY = 'vault-category',
  VAULT_CONTEXT = 'vault-context',
  VAULT_ITEM = 'vault-item',
  
  // Rules 관련 노드
  RULES_ROOT = 'rules-root',
  RULES_ACTIVE = 'rules-active',
  RULES_INACTIVE = 'rules-inactive',
  RULE_ITEM = 'rule-item',
  
  // 채팅 내역 관련 노드
  CHAT_HISTORY_ROOT = 'chat-history-root',
  CHAT_HISTORY_ITEM = 'chat-history-item'
}

/**
 * 트리 아이템 인터페이스
 */
export interface ApeTreeItem {
  // 기본 정보
  id: string;
  label: string;
  type: TreeNodeType;
  
  // 부가 정보
  description?: string;
  iconPath?: string | vscode.ThemeIcon | vscode.Uri | { light: vscode.Uri; dark: vscode.Uri };
  tooltip?: string;
  contextValue?: string;
  
  // 메타데이터 (명령어, 설정 등의 부가 정보)
  metadata?: any;
  
  // 자식 노드
  children?: ApeTreeItem[];
}