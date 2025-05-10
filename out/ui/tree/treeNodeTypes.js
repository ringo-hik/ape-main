"use strict";
/**
 * 트리 노드 타입 정의
 *
 * APE Navigator 트리뷰의 노드 타입과 인터페이스를 정의합니다.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreeNodeType = void 0;
/**
 * 트리 노드 타입 열거형
 */
var TreeNodeType;
(function (TreeNodeType) {
    // 카테고리 노드
    TreeNodeType["CATEGORY"] = "category";
    // 명령어 관련 노드
    TreeNodeType["COMMAND_ROOT"] = "command-root";
    TreeNodeType["COMMAND_CATEGORY"] = "command-category";
    TreeNodeType["COMMAND"] = "command";
    // Git 관련 노드
    TreeNodeType["GIT_ROOT"] = "git-root";
    TreeNodeType["GIT_CATEGORY"] = "git-category";
    TreeNodeType["GIT_COMMAND"] = "git-command";
    // 설정 관련 노드
    TreeNodeType["SETTINGS_ROOT"] = "settings-root";
    TreeNodeType["SETTINGS_CATEGORY"] = "settings-category";
    TreeNodeType["SETTINGS_ITEM"] = "settings-item";
    // 플러그인 관련 노드
    TreeNodeType["PLUGIN_ROOT"] = "plugin-root";
    TreeNodeType["PLUGIN_ACTIVE"] = "plugin-active";
    TreeNodeType["PLUGIN_INACTIVE"] = "plugin-inactive";
    TreeNodeType["PLUGIN"] = "plugin";
    // 지라 관련 노드
    TreeNodeType["JIRA_ROOT"] = "jira-root";
    TreeNodeType["JIRA_PROJECT"] = "jira-project";
    TreeNodeType["JIRA_ISSUE"] = "jira-issue";
    TreeNodeType["JIRA_CATEGORY"] = "jira-category";
    TreeNodeType["JIRA_COMMAND"] = "jira-command";
    // 포켓 관련 노드
    TreeNodeType["POCKET_ROOT"] = "pocket-root";
    TreeNodeType["POCKET_CATEGORY"] = "pocket-category";
    TreeNodeType["POCKET_ITEM"] = "pocket-item";
    // SWDP 관련 노드
    TreeNodeType["SWDP_ROOT"] = "swdp-root";
    TreeNodeType["SWDP_RELEASE"] = "swdp-release";
    TreeNodeType["SWDP_BUILD_TYPE"] = "swdp-build-type";
    TreeNodeType["SWDP_ARTIFACT"] = "swdp-artifact";
    // VAULT 관련 노드
    TreeNodeType["VAULT_ROOT"] = "vault-root";
    TreeNodeType["VAULT_CATEGORY"] = "vault-category";
    TreeNodeType["VAULT_CONTEXT"] = "vault-context";
    TreeNodeType["VAULT_ITEM"] = "vault-item";
    // Rules 관련 노드
    TreeNodeType["RULES_ROOT"] = "rules-root";
    TreeNodeType["RULES_ACTIVE"] = "rules-active";
    TreeNodeType["RULES_INACTIVE"] = "rules-inactive";
    TreeNodeType["RULE_ITEM"] = "rule-item";
    // 채팅 내역 관련 노드
    TreeNodeType["CHAT_HISTORY_ROOT"] = "chat-history-root";
    TreeNodeType["CHAT_HISTORY_ITEM"] = "chat-history-item";
})(TreeNodeType || (exports.TreeNodeType = TreeNodeType = {}));
//# sourceMappingURL=treeNodeTypes.js.map