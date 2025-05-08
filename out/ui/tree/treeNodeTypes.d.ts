/**
 * 트리 노드 타입 정의
 *
 * APE Navigator 트리뷰의 노드 타입과 인터페이스를 정의합니다.
 */
import * as vscode from 'vscode';
/**
 * 트리 노드 타입 열거형
 */
export declare enum TreeNodeType {
    CATEGORY = "category",
    COMMAND_ROOT = "command-root",
    COMMAND_CATEGORY = "command-category",
    COMMAND = "command",
    GIT_ROOT = "git-root",
    GIT_CATEGORY = "git-category",
    GIT_COMMAND = "git-command",
    SETTINGS_ROOT = "settings-root",
    SETTINGS_CATEGORY = "settings-category",
    SETTINGS_ITEM = "settings-item",
    PLUGIN_ROOT = "plugin-root",
    PLUGIN_ACTIVE = "plugin-active",
    PLUGIN_INACTIVE = "plugin-inactive",
    PLUGIN = "plugin",
    JIRA_ROOT = "jira-root",
    JIRA_PROJECT = "jira-project",
    JIRA_ISSUE = "jira-issue",
    JIRA_CATEGORY = "jira-category",
    JIRA_COMMAND = "jira-command",
    POCKET_ROOT = "pocket-root",
    POCKET_CATEGORY = "pocket-category",
    POCKET_ITEM = "pocket-item",
    SWDP_ROOT = "swdp-root",
    SWDP_RELEASE = "swdp-release",
    SWDP_BUILD_TYPE = "swdp-build-type",
    SWDP_ARTIFACT = "swdp-artifact",
    VAULT_ROOT = "vault-root",
    VAULT_CATEGORY = "vault-category",
    VAULT_CONTEXT = "vault-context",
    VAULT_ITEM = "vault-item",
    RULES_ROOT = "rules-root",
    RULES_ACTIVE = "rules-active",
    RULES_INACTIVE = "rules-inactive",
    RULE_ITEM = "rule-item",
    CHAT_HISTORY_ROOT = "chat-history-root",
    CHAT_HISTORY_ITEM = "chat-history-item"
}
/**
 * 트리 아이템 인터페이스
 */
export interface ApeTreeItem {
    id: string;
    label: string;
    type: TreeNodeType;
    description?: string;
    iconPath?: string | vscode.ThemeIcon | vscode.Uri | {
        light: vscode.Uri;
        dark: vscode.Uri;
    };
    tooltip?: string;
    contextValue?: string;
    metadata?: any;
    children?: ApeTreeItem[];
}
