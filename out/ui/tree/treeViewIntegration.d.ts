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
import * as vscode from 'vscode';
import { ApeTreeDataProvider } from './apeTreeDataProvider';
/**
 * TreeViewIntegration - A dedicated class to manage and maintain VS Code tree view integration
 * This class provides more robust and direct control over the tree view lifecycle
 */
export declare class TreeViewIntegration {
    private readonly context;
    private readonly treeDataProvider;
    private readonly viewId;
    private static instance;
    private treeView;
    private _isVisible;
    private _isInitialized;
    private _refreshPending;
    private _troubleshooting;
    private _refreshAttempts;
    private readonly MAX_REFRESH_ATTEMPTS;
    private _onDidChangeVisibility;
    readonly onDidChangeVisibility: vscode.Event<boolean>;
    constructor(context: vscode.ExtensionContext, treeDataProvider: ApeTreeDataProvider, viewId?: string);
    /**
     * Get singleton instance of TreeViewIntegration
     */
    static getInstance(context: vscode.ExtensionContext, treeDataProvider: ApeTreeDataProvider, viewId?: string): TreeViewIntegration;
    /**
     * Initialize the tree view integration
     * This is a critical method that ensures the tree view is properly registered and ready to display
     */
    initialize(): boolean;
    /**
     * Clean up any existing tree views to avoid conflicts
     */
    private cleanupExistingTreeViews;
    /**
     * Register tree data provider with VS Code
     */
    private registerTreeDataProvider;
    /**
     * Create the tree view with our tree data provider
     */
    private createTreeView;
    /**
     * Register additional commands for direct tree view control
     */
    private registerCommands;
    /**
     * Set up tracking of tree view visibility (optimized)
     */
    private setupVisibilityTracking;
    /**
     * Refresh the tree view with updated data
     */
    refreshTreeView(): void;
    /**
     * Schedule a refresh - now happens immediately without delay
     * (maintained for API compatibility)
     */
    scheduleDelayedRefresh(delay?: number): void;
    /**
     * Attempt to troubleshoot tree view issues
     */
    private troubleshootTreeView;
    /**
     * Force diagnosis of the tree view for troubleshooting
     */
    diagnoseTreeView(): void;
    /**
     * Force tree view to show if possible - immediate version without delays
     */
    showTreeView(): void;
    /**
     * Check if the tree view is currently visible
     */
    isVisible(): boolean;
    /**
     * Check if the tree view is properly initialized
     */
    isInitialized(): boolean;
}
/**
 * This function creates or returns the singleton tree view integration instance
 */
export declare function getTreeViewIntegration(context: vscode.ExtensionContext, treeDataProvider: ApeTreeDataProvider, viewId?: string): TreeViewIntegration;
