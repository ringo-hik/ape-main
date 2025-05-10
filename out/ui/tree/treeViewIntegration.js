"use strict";
/**
 * ┌────────────────────────────────────────────────────────────────────────────┐
 * │ APE EXTENSION - ABSOLUTE RULES (MUST FOLLOW)                               │
 * ├────────────────────────────────────────────────────────────────────────────┤
 * │ 1. User Response Priority: Always respond to user immediately and get      │
 * │    explicit approval ("yes", "ok", etc.) before proceeding with any work.  │
 * │                                                                            │
 * │ 2. Tests Required: Run 'npm run test' after code modifications to verify   │
 * │    changes. Check for circular references, memory leaks, and CSP issues.   │
 * │                                                                            │
 * │ 3. Todo Management: Use only APE_TODO_LIST.md for tracking. Complete       │
 * │    items only after implementation, build, test, and checklist verification│
 * │                                                                            │
 * │ 4. Network Settings: Never modify established API environment variables.     │
 * │    Maintain default API settings for consistent service operation.          │
 * │                                                                            │
 * │ 5. Context Line Limit: If performed context lines exceed 3000, pause work  │
 * │    and provide a briefing of progress requesting further instructions.     │
 * │                                                                            │
 * │ 6. No Unauthorized Changes: Never modify or delete without explicit user   │
 * │    instructions.                                                           │
 * │                                                                            │
 * │ 7. Work Tracking: Use [TAG:sessionID:start] and [TAG:sessionID:complete]   │
 * │    tags for all tasks.                                                     │
 * │                                                                            │
 * │ 8. Self-Verification: Perform self-debugging after completion with code    │
 * │    completion → build → log verification → report to user.                 │
 * └────────────────────────────────────────────────────────────────────────────┘
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreeViewIntegration = void 0;
exports.getTreeViewIntegration = getTreeViewIntegration;
const vscode = __importStar(require("vscode"));
/**
 * TreeViewIntegration - A dedicated class to manage and maintain VS Code tree view integration
 * This class provides more robust and direct control over the tree view lifecycle
 */
class TreeViewIntegration {
    context;
    treeDataProvider;
    viewId;
    static instance;
    treeView;
    _isVisible = false;
    _isInitialized = false;
    _refreshPending = false;
    _troubleshooting = false;
    _refreshAttempts = 0;
    MAX_REFRESH_ATTEMPTS = 5;
    _onDidChangeVisibility = new vscode.EventEmitter();
    onDidChangeVisibility = this._onDidChangeVisibility.event;
    constructor(context, treeDataProvider, viewId = 'apeNavigator') {
        this.context = context;
        this.treeDataProvider = treeDataProvider;
        this.viewId = viewId;
        console.log(`[TreeViewIntegration] 생성됨 (viewId: ${this.viewId})`);
    }
    /**
     * Get singleton instance of TreeViewIntegration
     */
    static getInstance(context, treeDataProvider, viewId = 'apeNavigator') {
        if (!TreeViewIntegration.instance) {
            TreeViewIntegration.instance = new TreeViewIntegration(context, treeDataProvider, viewId);
        }
        return TreeViewIntegration.instance;
    }
    /**
     * Initialize the tree view integration
     * This is a critical method that ensures the tree view is properly registered and ready to display
     */
    initialize() {
        if (this._isInitialized) {
            console.log('[TreeViewIntegration] 이미 초기화되어 있습니다');
            return true;
        }
        console.log('[TreeViewIntegration] 초기화 시작');
        try {
            // First clean up any existing tree view that might conflict
            this.cleanupExistingTreeViews();
            // Then register our tree data provider using both methods for maximum compatibility
            this.registerTreeDataProvider();
            // Create the tree view with this provider
            this.createTreeView();
            // Add direct commands for tree view control
            this.registerCommands();
            // Set up visibility monitoring
            this.setupVisibilityTracking();
            // Mark initialization as successful
            this._isInitialized = true;
            console.log('[TreeViewIntegration] 초기화 완료');
            // Immediately refresh to show tree view data (no delay)
            this.refreshTreeView();
            return true;
        }
        catch (error) {
            console.error('[TreeViewIntegration] 초기화 실패:', error);
            this._isInitialized = false;
            // Try emergency fallback approach
            this.troubleshootTreeView();
            return false;
        }
    }
    /**
     * Clean up any existing tree views to avoid conflicts
     */
    cleanupExistingTreeViews() {
        console.log('[TreeViewIntegration] 기존 트리뷰 정리');
        // Search for existing tree view and tree data provider registrations
        for (let i = this.context.subscriptions.length - 1; i >= 0; i--) {
            const sub = this.context.subscriptions[i];
            // Check if this subscription is a tree view or provider for our viewId
            if (typeof sub === 'object' && sub !== null) {
                if ((sub.viewId === this.viewId || sub._id === this.viewId) ||
                    (sub._treeDataProvider && sub._viewId === this.viewId)) {
                    try {
                        console.log(`[TreeViewIntegration] 기존 트리뷰/프로바이더 제거: ${sub.viewId || sub._id}`);
                        // Remove from subscriptions
                        this.context.subscriptions.splice(i, 1);
                        // Dispose if possible
                        if (typeof sub.dispose === 'function') {
                            sub.dispose();
                        }
                    }
                    catch (e) {
                        console.error('[TreeViewIntegration] 기존 트리뷰 정리 오류 (무시됨):', e);
                    }
                }
            }
        }
    }
    /**
     * Register tree data provider with VS Code
     */
    registerTreeDataProvider() {
        console.log('[TreeViewIntegration] 트리 데이터 프로바이더 등록');
        // Register using the VS Code API - this is the most reliable method
        const disposable = vscode.window.registerTreeDataProvider(this.viewId, this.treeDataProvider);
        // Mark this subscription so we can find it later if needed
        disposable._id = 'treeViewProvider';
        disposable._viewId = this.viewId;
        // Add to context subscriptions for proper disposal
        this.context.subscriptions.push(disposable);
    }
    /**
     * Create the tree view with our tree data provider
     */
    createTreeView() {
        console.log('[TreeViewIntegration] 트리뷰 생성');
        // Create tree view with our provider
        this.treeView = vscode.window.createTreeView(this.viewId, {
            treeDataProvider: this.treeDataProvider,
            showCollapseAll: true,
            canSelectMany: false
        });
        // Set tree view ID for tracking
        this.treeView._id = this.viewId;
        // Add to context subscriptions for proper disposal
        this.context.subscriptions.push(this.treeView);
        // Set up visibility monitoring
        this.treeView.onDidChangeVisibility(e => {
            this._isVisible = e.visible;
            console.log(`[TreeViewIntegration] 트리뷰 가시성 변경: ${e.visible ? '보임' : '숨김'}`);
            // Emit an event so others can react to visibility changes
            this._onDidChangeVisibility.fire(e.visible);
            // If becoming visible, make sure data is fresh
            if (e.visible) {
                this.refreshTreeView();
            }
        });
        // Initial visibility check
        this._isVisible = this.treeView.visible;
        console.log(`[TreeViewIntegration] 초기 트리뷰 가시성: ${this._isVisible ? '보임' : '숨김'}`);
    }
    /**
     * Register additional commands for direct tree view control
     */
    registerCommands() {
        console.log('[TreeViewIntegration] 명령어 등록');
        // Direct tree view refresh command
        this.context.subscriptions.push(vscode.commands.registerCommand('ape.tree.refresh', () => {
            console.log('[TreeViewIntegration] 명령어로 새로고침 실행');
            this.refreshTreeView();
        }));
        // Advanced tree view diagnostic command
        this.context.subscriptions.push(vscode.commands.registerCommand('ape.tree.diagnose', () => {
            console.log('[TreeViewIntegration] 트리뷰 진단 실행');
            this.diagnoseTreeView();
        }));
        // Command to force tree view visibility
        this.context.subscriptions.push(vscode.commands.registerCommand('ape.tree.show', () => {
            console.log('[TreeViewIntegration] 트리뷰 표시 명령 실행');
            this.showTreeView();
        }));
    }
    /**
     * Set up tracking of tree view visibility (optimized)
     */
    setupVisibilityTracking() {
        console.log('[TreeViewIntegration] 가시성 추적 설정 (최적화됨)');
        // Initial setup of visibility state
        if (this.treeView) {
            this._isVisible = this.treeView.visible;
            console.log(`[TreeViewIntegration] 초기 가시성 상태: ${this._isVisible ? '보임' : '숨김'}`);
        }
        // Directly listen for VSCode's visibility change event instead of polling
        if (this.treeView && this.treeView.onDidChangeVisibility) {
            this.treeView.onDidChangeVisibility((e) => {
                console.log(`[TreeViewIntegration] 가시성 변경 감지: ${e.visible ? '보임' : '숨김'}`);
                this._isVisible = e.visible;
                this._onDidChangeVisibility.fire(e.visible);
            });
        }
    }
    /**
     * Refresh the tree view with updated data
     */
    refreshTreeView() {
        try {
            console.log('[TreeViewIntegration] 트리뷰 새로고침 시작 (로깅 강화됨)');
            // 트리뷰 상태 로깅
            const isTreeViewVisible = this.isVisible();
            const isTreeViewInitialized = this.isInitialized();
            const treeViewExists = !!this.treeView;
            console.log(`[TreeViewIntegration] 트리뷰 상태: 초기화=${isTreeViewInitialized}, 가시성=${isTreeViewVisible}, 객체존재=${treeViewExists}`);
            // If we've attempted too many refreshes without resetting the counter,
            // we might be in a problematic state
            if (this._refreshAttempts > this.MAX_REFRESH_ATTEMPTS) {
                console.log('[TreeViewIntegration] 과도한 새로고침 시도 감지, 트리뷰 복구 시도');
                this.troubleshootTreeView();
                return;
            }
            this._refreshAttempts++;
            // First refresh the data provider to make sure it has fresh data
            console.log('[TreeViewIntegration] 트리 데이터 제공자 새로고침 시작');
            this.treeDataProvider.refresh();
            console.log('[TreeViewIntegration] 트리 데이터 제공자 새로고침 완료');
            // 트리 데이터 루트 항목 로깅
            try {
                const rootItems = this.treeDataProvider.getChildren();
                console.log(`[TreeViewIntegration] 트리 데이터 루트 항목 수: ${rootItems ? rootItems.length : 0}`);
                if (rootItems && rootItems.length > 0) {
                    console.log(`[TreeViewIntegration] 첫 번째 루트 항목: ${rootItems[0].label || '(라벨 없음)'}`);
                }
            }
            catch (e) {
                console.error('[TreeViewIntegration] 루트 항목 확인 중 오류:', e);
            }
            // If tree view exists, log its status but don't try to reveal items (can cause errors)
            if (this.treeView) {
                console.log('[TreeViewIntegration] 트리뷰 UI 존재함, 새로고침은 자동으로 처리됨');
                // 데이터만 확인하고 reveal 시도는 하지 않음 (에러 발생 가능성 제거)
                try {
                    const rootItems = this.treeDataProvider.getChildren();
                    if (rootItems && rootItems.length > 0) {
                        console.log(`[TreeViewIntegration] 트리에 ${rootItems.length}개 루트 항목 존재, 표시 준비완료`);
                    }
                }
                catch (e) {
                    console.log('[TreeViewIntegration] 트리 데이터 확인 중 오류 (무시됨):', e);
                }
            }
            else {
                console.log('[TreeViewIntegration] 트리뷰 객체가 존재하지 않음, UI 새로고침 불가');
            }
            // Reset refresh attempts counter immediately
            this._refreshAttempts = 0;
            console.log('[TreeViewIntegration] 새로고침 시도 카운터 즉시 리셋');
            // Check final visibility state
            const finalVisibility = this.isVisible();
            console.log(`[TreeViewIntegration] 새로고침 후 최종 가시성: ${finalVisibility ? '보임' : '숨김'}`);
            console.log('[TreeViewIntegration] 트리뷰 새로고침 완료');
        }
        catch (error) {
            console.error('[TreeViewIntegration] 트리뷰 새로고침 실패:', error);
            // If refresh is failing, try troubleshooting
            if (!this._troubleshooting) {
                this.troubleshootTreeView();
            }
        }
    }
    /**
     * Schedule a refresh - now happens immediately without delay
     * (maintained for API compatibility)
     */
    scheduleDelayedRefresh(delay = 0) {
        if (this._refreshPending) {
            return;
        }
        console.log(`[TreeViewIntegration] 즉시 새로고침 실행 (지연 없음)`);
        this._refreshPending = true;
        // Execute immediately without delay
        this._refreshPending = false;
        this.refreshTreeView();
    }
    /**
     * Attempt to troubleshoot tree view issues
     */
    troubleshootTreeView() {
        if (this._troubleshooting) {
            console.log('[TreeViewIntegration] 이미 문제해결 중입니다');
            return;
        }
        console.log('[TreeViewIntegration] 트리뷰 문제해결 시작');
        this._troubleshooting = true;
        // Simple plan:
        // 1. Recreate the tree data provider registration
        // 2. Force activity bar visibility
        // 3. Ensure explorer is visible
        // 4. Try creating a new tree view
        try {
            // First clean up existing views
            this.cleanupExistingTreeViews();
            // Register the tree data provider again
            this.registerTreeDataProvider();
            // Try to ensure explorer view is visible (may help with view container activation)
            vscode.commands.executeCommand('workbench.view.explorer').then(undefined, (e) => {
                // Ignore errors, this is just a helper step
            });
            // Attempt to activate the sidebar view immediately
            vscode.commands.executeCommand('workbench.view.extension.ape-sidebar').then(undefined, (e) => {
                // Ignore errors, we'll try alternative approaches
            });
            // Create tree view again immediately
            this.createTreeView();
            // Immediate refresh without delay
            this.treeDataProvider.refresh();
            this._troubleshooting = false;
            this._refreshAttempts = 0;
            console.log('[TreeViewIntegration] 트리뷰 문제해결 완료 (지연 없음)');
        }
        catch (error) {
            console.error('[TreeViewIntegration] 트리뷰 문제해결 실패:', error);
            this._troubleshooting = false;
        }
    }
    /**
     * Force diagnosis of the tree view for troubleshooting
     */
    diagnoseTreeView() {
        console.log('[TreeViewIntegration] 트리뷰 진단 시작');
        try {
            // Check tree view existence
            const treeViewExists = !!this.treeView;
            console.log(`[TreeViewIntegration] 트리뷰 객체 존재: ${treeViewExists}`);
            if (treeViewExists && this.treeView) {
                // Check visibility
                console.log(`[TreeViewIntegration] 트리뷰 가시성: ${this.treeView.visible}`);
                // Check view ID
                console.log(`[TreeViewIntegration] 트리뷰 ID: ${this.treeView.viewId || 'unknown'}`);
            }
            // Check tree data provider
            const rootItems = this.treeDataProvider.getChildren();
            console.log(`[TreeViewIntegration] 트리 데이터 루트 아이템 수: ${rootItems ? rootItems.length : 0}`);
            // Check if view is registered in VS Code
            vscode.window.createTreeView('nonExistentView', {
                treeDataProvider: {
                    getChildren: () => [],
                    getTreeItem: (element) => new vscode.TreeItem('test')
                }
            }).dispose(); // This should throw an error if views are working correctly
            console.log('[TreeViewIntegration] VS Code 트리뷰 API 정상 작동');
        }
        catch (error) {
            console.log('[TreeViewIntegration] 진단 중 오류 발생:', error);
            // If the error is about the nonExistentView, that's expected and good
            if (error instanceof Error && error.message.includes('view already registered')) {
                console.log('[TreeViewIntegration] VS Code 트리뷰 API 정상 작동 확인됨');
            }
            else {
                console.error('[TreeViewIntegration] 예상치 못한 진단 오류:', error);
            }
        }
        finally {
            console.log('[TreeViewIntegration] 진단 완료');
        }
    }
    /**
     * Force tree view to show if possible - immediate version without delays
     */
    showTreeView() {
        console.log('[TreeViewIntegration] 트리뷰 표시 시도 (지연 없음)');
        // Use a series of commands to ensure the view is visible
        const showSequence = async () => {
            try {
                // First activate the sidebar
                await vscode.commands.executeCommand('workbench.view.extension.ape-sidebar');
                // Then focus the treeview specifically
                if (this.viewId) {
                    await vscode.commands.executeCommand(`${this.viewId}.focus`);
                }
                console.log('[TreeViewIntegration] 트리뷰 표시 성공');
                // Immediately refresh the view to ensure content is up to date
                this.refreshTreeView();
            }
            catch (error) {
                console.error('[TreeViewIntegration] 트리뷰 표시 실패:', error);
            }
        };
        showSequence();
    }
    /**
     * Check if the tree view is currently visible
     */
    isVisible() {
        if (!this.treeView) {
            return false;
        }
        return this.treeView.visible;
    }
    /**
     * Check if the tree view is properly initialized
     */
    isInitialized() {
        return this._isInitialized;
    }
}
exports.TreeViewIntegration = TreeViewIntegration;
/**
 * This function creates or returns the singleton tree view integration instance
 */
function getTreeViewIntegration(context, treeDataProvider, viewId = 'apeNavigator') {
    return TreeViewIntegration.getInstance(context, treeDataProvider, viewId);
}
//# sourceMappingURL=treeViewIntegration.js.map