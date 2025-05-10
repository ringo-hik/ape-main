"use strict";
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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const llmService_1 = require("./core/llm/llmService");
const memoryService_1 = require("./core/memory/memoryService");
const commandManager_1 = require("./core/commands/commandManager");
const autoCommitService_1 = require("./core/git/autoCommitService");
const bitbucketService_1 = require("./core/git/bitbucketService");
const conflictSolver_1 = require("./core/git/conflictSolver");
const tabCompletionProvider_1 = require("./core/completion/tabCompletionProvider");
const inlineCompletionProvider_1 = require("./core/completion/inlineCompletionProvider");
const apeTreeDataProvider_1 = require("./ui/tree/apeTreeDataProvider");
const versionManager_1 = require("./core/services/versionManager");
const modelManager_1 = require("./core/llm/modelManager");
const codeService_1 = require("./ui/chat/codeService");
const mainChatViewProvider_1 = require("./ui/mainChatViewProvider");
// 개발/테스트 환경에서만 로딩 (프로덕션에서는 조건부로 로딩)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let autoPermissionHandler = null;
if (process.env.NODE_ENV === 'development' || process.env.APE_TEST_MODE === 'true') {
    try {
        // 동적 임포트로 테스트 모드에서만 로드
        Promise.resolve().then(() => __importStar(require('./test/helpers/auto-permission'))).then(module => {
            autoPermissionHandler = module.autoPermissionHandler;
            console.log('자동 권한 핸들러 활성화됨 (테스트/개발 모드)');
        }).catch(error => {
            console.error('자동 권한 핸들러 로드 실패:', error);
        });
    }
    catch (error) {
        console.log('자동 권한 핸들러 초기화 중 오류 (무시됨):', error);
    }
}
// Plugin system imports
const core_1 = require("./plugins/core");
const rulesService_1 = require("./core/services/rulesService");
const vaultService_1 = require("./core/services/vaultService");
const serviceConfig_1 = require("./core/services/serviceConfig");
const jiraService_1 = require("./core/services/jiraService");
/**
 * Initialize all core services
 * @param context Extension context
 * @returns ServiceContainer with all initialized services
 */
async function initializeServices(context) {
    // Create service config manager first
    const configManager = new serviceConfig_1.ServiceConfigManager(context);
    // Create model manager (should be initialized before LLMService)
    const modelManager = new modelManager_1.ModelManager(context);
    // Create core services with modelManager
    const llmService = new llmService_1.LLMService(context, modelManager); // Updated constructor
    const memoryService = new memoryService_1.MemoryService(context);
    // Create objects in the correct initialization order
    // Create chatViewProvider
    const chatViewProvider = new mainChatViewProvider_1.MainChatViewProvider(context, llmService, memoryService, null, // Will be set after CommandManager is created
    modelManager);
    // Initialize Rules service
    const rulesService = new rulesService_1.RulesService(context, configManager);
    // Initialize VAULT service
    const vaultService = new vaultService_1.VaultService(context, configManager);
    // Initialize Jira service
    const jiraService = new jiraService_1.JiraService(context, configManager);
    // Apply Rules and VAULT services to LLM service
    llmService.setRulesService(rulesService);
    llmService.setVaultService(vaultService);
    // Then create CommandManager with chatViewProvider and services
    const commandManager = new commandManager_1.CommandManager(context, chatViewProvider, llmService, memoryService, modelManager, rulesService, vaultService, jiraService);
    // Now set the CommandManager reference in ChatViewProvider
    chatViewProvider._commandManager = commandManager;
    // Log debugging information
    console.log('ChatViewProvider 및 CommandManager 초기화 완료');
    // Initialize Git services
    const bitbucketService = new bitbucketService_1.BitbucketService(context);
    const autoCommitService = new autoCommitService_1.AutoCommitService(context, llmService, bitbucketService);
    const conflictSolver = new conflictSolver_1.ConflictSolver(llmService);
    // Initialize completion providers
    const tabCompletionProvider = new tabCompletionProvider_1.TabCompletionProvider(llmService);
    const inlineCompletionProvider = new inlineCompletionProvider_1.InlineCompletionProvider(llmService, context);
    // Initialize tree view data provider
    const treeDataProvider = new apeTreeDataProvider_1.ApeTreeDataProvider(context, llmService, memoryService, vaultService, rulesService, jiraService);
    // Initialize version manager
    const versionManager = new versionManager_1.VersionManager(context);
    // Initialize plugin system
    const pluginEventEmitter = new core_1.EventEmitterImpl();
    const pluginRegistry = new core_1.PluginRegistryImpl(pluginEventEmitter);
    const pluginAPI = new core_1.PluginAPIImpl(llmService, memoryService, pluginEventEmitter);
    const pluginLoader = new core_1.PluginLoader(context, pluginRegistry, pluginAPI);
    const pluginSettingsManager = new core_1.PluginSettingsManagerImpl(context);
    return {
        modelManager,
        llmService,
        memoryService,
        chatViewProvider,
        commandManager,
        bitbucketService,
        autoCommitService,
        conflictSolver,
        tabCompletionProvider,
        inlineCompletionProvider,
        treeDataProvider,
        versionManager,
        rulesService,
        vaultService,
        jiraService,
        configManager,
        pluginEventEmitter,
        pluginRegistry,
        pluginAPI,
        pluginLoader,
        pluginSettingsManager
    };
}
/**
 * Register VSCode components
 * @param context Extension context
 * @param services Service container
 */
async function registerComponents(context, services) {
    // Register WebView provider
    const chatViewProviderRegistration = vscode.window.registerWebviewViewProvider('apeChat', services.chatViewProvider, {
        webviewOptions: {
            retainContextWhenHidden: true
        }
    });
    // 디버깅을 위한 로그 추가
    console.log('APE Chat View Provider가 등록되었습니다.');
    context.subscriptions.push(chatViewProviderRegistration);
    // 모든 명령어는 CommandManager를 통해서만 등록
    // ModelManager에서 명령어 등록하는 부분 제거 (중복 등록 방지)
    services.commandManager.registerCommands();
    // Register code block insertion commands
    // 이미 명령이 있는지 확인하는 안전한 명령어 등록 함수
    const safeRegisterCommand = async (commandId, handler) => {
        // 먼저 기존 명령이 있는지 확인
        const commands = await vscode.commands.getCommands(true);
        if (!commands.includes(commandId)) {
            // 명령이 없으면 등록
            return vscode.commands.registerCommand(commandId, handler);
        }
        else {
            console.log(`명령 '${commandId}'는 이미 등록되어 있어 건너뜁니다.`);
            return { dispose: () => { } }; // 더미 disposable 반환
        }
    };
    // 중복 등록 방지를 위한 명령어 등록
    const codeEditorCommand = await safeRegisterCommand('ape.insertCodeToEditor', (options) => {
        return codeService_1.CodeService.insertCodeToEditor(options);
    });
    const newFileCommand = await safeRegisterCommand('ape.createNewFileWithCode', (options) => {
        return codeService_1.CodeService.insertCodeToEditor({
            ...options,
            createNewFile: true
        });
    });
    context.subscriptions.push(codeEditorCommand, newFileCommand);
    // Register Git commands - 안전하게 중복 방지
    const gitResolveCommand = await safeRegisterCommand('ape.git.resolveConflict', async () => {
        const resolvedCount = await services.conflictSolver.resolveAllConflicts();
        vscode.window.showInformationMessage(`${resolvedCount}개 파일의 충돌을 해결했습니다`);
    });
    context.subscriptions.push(gitResolveCommand);
    // Register tab completion for various languages
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider([
        { scheme: 'file', language: 'typescript' },
        { scheme: 'file', language: 'javascript' },
        { scheme: 'file', language: 'python' },
        { scheme: 'file', language: 'java' },
        { scheme: 'file', language: 'c' },
        { scheme: 'file', language: 'cpp' },
        { scheme: 'file', language: 'csharp' },
        { scheme: 'file', language: 'go' },
        { scheme: 'file', language: 'rust' },
        { scheme: 'file', language: 'php' },
        { scheme: 'file', language: 'ruby' },
        { scheme: 'file', language: 'html' },
        { scheme: 'file', language: 'css' },
        { scheme: 'file', language: 'json' },
        { scheme: 'file', language: 'markdown' }
    ], services.tabCompletionProvider, '\t' // Triggered by tab key
    ));
    // Register command completion
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider([{ scheme: 'file' }], services.tabCompletionProvider, '/' // Triggered by slash
    ));
    // Register inline completion provider
    context.subscriptions.push(vscode.languages.registerInlineCompletionItemProvider([{ scheme: 'file' }], services.inlineCompletionProvider));
    // Register tree data provider with custom configuration
    const treeView = vscode.window.createTreeView('apeNavigator', {
        treeDataProvider: services.treeDataProvider,
        showCollapseAll: true,
        canSelectMany: false // 다중 선택 방지로 UI 단순화
    });
    // Add command to set optimal view layout
    context.subscriptions.push(vscode.commands.registerCommand('ape.setOptimalLayout', async () => {
        try {
            // 사이드바 확인
            await vscode.commands.executeCommand('workbench.view.extension.ape-sidebar');
            await new Promise(r => setTimeout(r, 100));
            // 채팅 뷰 활성화
            await vscode.commands.executeCommand('apeChat.focus');
            await new Promise(r => setTimeout(r, 100));
            // 사이드바 크기 줄이기 (트리뷰에 맞게)
            for (let i = 0; i < 6; i++) {
                await vscode.commands.executeCommand('workbench.action.decreaseSideBarWidth');
                await new Promise(r => setTimeout(r, 30));
            }
            // 채팅뷰 크기 키우기
            for (let i = 0; i < 3; i++) {
                await vscode.commands.executeCommand('workbench.action.increaseViewSize');
                await new Promise(r => setTimeout(r, 30));
            }
            vscode.window.showInformationMessage('APE 최적 레이아웃이 설정되었습니다.');
        }
        catch (error) {
            console.error('최적 레이아웃 설정 실패:', error);
        }
    }));
    context.subscriptions.push(treeView);
    // Register version manager
    services.versionManager.registerCommands();
    // Help command is handled by SlashCommandManager in defaultCommands.ts
    // Register navigator commands
    context.subscriptions.push(vscode.commands.registerCommand('ape.refreshNavigator', () => {
        services.treeDataProvider.refresh();
    }), vscode.commands.registerCommand('ape.refreshTreeView', () => {
        services.treeDataProvider.refresh();
    }), vscode.commands.registerCommand('ape.vaultShowItem', async (metadata) => {
        if (!metadata) {
            vscode.window.showErrorMessage('VAULT 아이템 정보가 올바르지 않습니다.');
            return;
        }
        try {
            // 컨텍스트 및 아이템 가져오기
            const vaultContext = services.vaultService.getContextById(metadata.contextId);
            if (!vaultContext) {
                vscode.window.showErrorMessage('VAULT 컨텍스트를 찾을 수 없습니다.');
                return;
            }
            // 아이템 찾기
            const item = vaultContext.items.find((i) => i.id === metadata.itemId);
            if (!item) {
                vscode.window.showErrorMessage('VAULT 아이템을 찾을 수 없습니다.');
                return;
            }
            // 결과를 채팅창에 표시
            await vscode.commands.executeCommand('ape.sendLlmResponse', {
                role: 'assistant',
                content: `## ${item.name}\n\n${item.content}`
            });
        }
        catch (error) {
            console.error('VAULT 아이템 표시 오류:', error);
            vscode.window.showErrorMessage(`VAULT 아이템을 표시할 수 없습니다: ${error instanceof Error ? error.message : String(error)}`);
        }
    }), vscode.commands.registerCommand('ape.executeCommand', (commandInfo) => {
        if (!commandInfo || !commandInfo.name) {
            vscode.window.showErrorMessage('명령어 정보가 올바르지 않습니다');
            return;
        }
        const commandText = commandInfo.args
            ? `/${commandInfo.name} ${commandInfo.args.join(' ')}`
            : `/${commandInfo.name}`;
        // 직접 SlashCommandManager로 명령 실행
        services.commandManager.slashCommandManager.executeCommand(commandText);
    }), vscode.commands.registerCommand('ape.sendLlmResponse', (messageData) => {
        services.chatViewProvider.sendLlmResponse(messageData);
    }), vscode.commands.registerCommand('ape.openSettings', (settingKey) => {
        if (settingKey) {
            vscode.commands.executeCommand('workbench.action.openSettings', settingKey);
        }
        else {
            vscode.commands.executeCommand('workbench.action.openSettings', 'ape');
        }
    }), vscode.commands.registerCommand('ape.handleChatInput', (text) => {
        services.chatViewProvider.handleChatInput(text);
    }), vscode.commands.registerCommand('ape.sendChatMessage', () => {
        vscode.commands.executeCommand('ape.sendMessage');
    }));
    // Register Rules commands
    context.subscriptions.push(vscode.commands.registerCommand('ape.rules.activate', async (item) => {
        if (!item || !item.metadata || !item.metadata.id) {
            vscode.window.showErrorMessage('Rule 정보가 올바르지 않습니다');
            return;
        }
        try {
            const success = await services.rulesService.activateRule(item.metadata.id);
            if (success) {
                vscode.window.showInformationMessage(`Rule '${item.label}' 활성화 완료`);
                services.treeDataProvider.refresh();
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Rule 활성화 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`);
        }
    }), vscode.commands.registerCommand('ape.rules.deactivate', async (item) => {
        if (!item || !item.metadata || !item.metadata.id) {
            vscode.window.showErrorMessage('Rule 정보가 올바르지 않습니다');
            return;
        }
        try {
            const success = await services.rulesService.deactivateRule(item.metadata.id);
            if (success) {
                vscode.window.showInformationMessage(`Rule '${item.label}' 비활성화 완료`);
                services.treeDataProvider.refresh();
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Rule 비활성화 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`);
        }
    }), vscode.commands.registerCommand('ape.rules.openFile', async (item) => {
        if (!item || !item.metadata || !item.metadata.id) {
            vscode.window.showErrorMessage('Rule 정보가 올바르지 않습니다');
            return;
        }
        try {
            await services.rulesService.openRuleFile(item.metadata.id);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Rule 파일 열기 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`);
        }
    }), vscode.commands.registerCommand('ape.rules.refresh', () => {
        try {
            services.rulesService.loadAllRules();
            services.treeDataProvider.refresh();
        }
        catch (error) {
            vscode.window.showErrorMessage(`Rules 새로고침 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`);
        }
    }), vscode.commands.registerCommand('ape.rules.create', async () => {
        try {
            // 규칙 이름 입력 받기
            const ruleName = await vscode.window.showInputBox({
                prompt: '새로운 Rule 이름을 입력하세요',
                placeHolder: '예: 코드 작성 규칙, API 사용 지침 등',
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return '이름은 비워둘 수 없습니다';
                    }
                    return null;
                }
            });
            if (!ruleName) {
                return; // 사용자가 취소한 경우
            }
            // 새 문서 생성
            const rulePath = path.join(services.rulesService['rulesDir'], `${ruleName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}.md`);
            const ruleContent = `# ${ruleName}\n\n여기에 LLM에 적용할 규칙 내용을 작성하세요.\n\n규칙은 마크다운 형식으로 작성됩니다.\n\n## 예시\n\n1. 항상 코드에 주석을 추가해주세요.\n2. 응답은 간결하게 유지해주세요.\n3. 에러 처리를 항상 포함해주세요.`;
            // 규칙 생성
            const rule = await services.rulesService.createRule(ruleName, ruleContent, false);
            // 생성된 규칙 파일 열기
            await services.rulesService.openRuleFile(rule.id);
            // 트리뷰 새로고침
            services.treeDataProvider.refresh();
            vscode.window.showInformationMessage(`Rule '${ruleName}' 생성 완료. 파일을 수정한 후 저장하세요.`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Rule 생성 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`);
        }
    }), vscode.commands.registerCommand('ape.rules.delete', async (item) => {
        if (!item || !item.metadata || !item.metadata.id) {
            vscode.window.showErrorMessage('Rule 정보가 올바르지 않습니다');
            return;
        }
        try {
            // 삭제 확인
            const confirmation = await vscode.window.showWarningMessage(`Rule '${item.label}'을(를) 삭제하시겠습니까?`, { modal: true }, '삭제', '취소');
            if (confirmation !== '삭제') {
                return;
            }
            // 규칙 삭제
            const success = await services.rulesService.deleteRule(item.metadata.id);
            if (success) {
                vscode.window.showInformationMessage(`Rule '${item.label}' 삭제 완료`);
                services.treeDataProvider.refresh();
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Rule 삭제 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`);
        }
    }));
    // Register plugin system commands
    context.subscriptions.push(vscode.commands.registerCommand('ape.plugins.list', async () => {
        const plugins = services.pluginRegistry.getAllPlugins();
        const items = plugins.map(plugin => ({
            label: `${plugin.metadata.name} (${plugin.metadata.version})`,
            description: plugin.state,
            detail: plugin.metadata.description,
            plugin
        }));
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a plugin to see details'
        });
        if (selected) {
            const actions = [];
            if (selected.plugin.state === 'active') {
                actions.push('Deactivate');
            }
            else if (selected.plugin.state === 'registered' || selected.plugin.state === 'inactive') {
                actions.push('Activate');
            }
            actions.push('View Details', 'Open Settings');
            const action = await vscode.window.showQuickPick(actions, {
                placeHolder: 'Select an action'
            });
            if (action === 'Activate') {
                await services.pluginRegistry.activatePlugin(selected.plugin.id);
                vscode.window.showInformationMessage(`Plugin ${selected.plugin.metadata.name} activated`);
            }
            else if (action === 'Deactivate') {
                await services.pluginRegistry.deactivatePlugin(selected.plugin.id);
                vscode.window.showInformationMessage(`Plugin ${selected.plugin.metadata.name} deactivated`);
            }
            else if (action === 'View Details') {
                // Show details in output channel
                const outputChannel = vscode.window.createOutputChannel(`APE Plugin: ${selected.plugin.metadata.name}`);
                outputChannel.appendLine(`ID: ${selected.plugin.id}`);
                outputChannel.appendLine(`Name: ${selected.plugin.metadata.name}`);
                outputChannel.appendLine(`Version: ${selected.plugin.metadata.version}`);
                outputChannel.appendLine(`Description: ${selected.plugin.metadata.description || 'No description'}`);
                outputChannel.appendLine(`Author: ${selected.plugin.metadata.author || 'Unknown'}`);
                outputChannel.appendLine(`State: ${selected.plugin.state}`);
                if (selected.plugin.metadata.dependencies?.length) {
                    outputChannel.appendLine(`Dependencies: ${selected.plugin.metadata.dependencies.join(', ')}`);
                }
                if (selected.plugin.error) {
                    outputChannel.appendLine(`\nError: ${selected.plugin.error.message}`);
                }
                outputChannel.show();
            }
            else if (action === 'Open Settings') {
                vscode.commands.executeCommand('workbench.action.openSettings', `ape.plugins.${selected.plugin.id}`);
            }
        }
    }), vscode.commands.registerCommand('ape.plugins.activate', async () => {
        const plugins = services.pluginRegistry.getAllPlugins()
            .filter(p => p.state !== 'active');
        const items = plugins.map(plugin => ({
            label: plugin.metadata.name,
            description: plugin.state,
            detail: plugin.metadata.description,
            plugin
        }));
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a plugin to activate'
        });
        if (selected) {
            try {
                const success = await services.pluginRegistry.activatePlugin(selected.plugin.id);
                if (success) {
                    vscode.window.showInformationMessage(`Plugin ${selected.plugin.metadata.name} activated`);
                }
                else {
                    vscode.window.showErrorMessage(`Failed to activate plugin ${selected.plugin.metadata.name}`);
                }
            }
            catch (error) {
                vscode.window.showErrorMessage(`Failed to activate plugin: ${error.message}`);
            }
        }
    }), vscode.commands.registerCommand('ape.plugins.deactivate', async () => {
        const plugins = services.pluginRegistry.getActivePlugins();
        const items = plugins.map(plugin => ({
            label: plugin.metadata.name,
            description: 'active',
            detail: plugin.metadata.description,
            plugin
        }));
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a plugin to deactivate'
        });
        if (selected) {
            try {
                const success = await services.pluginRegistry.deactivatePlugin(selected.plugin.id);
                if (success) {
                    vscode.window.showInformationMessage(`Plugin ${selected.plugin.metadata.name} deactivated`);
                }
                else {
                    vscode.window.showErrorMessage(`Failed to deactivate plugin ${selected.plugin.metadata.name}`);
                }
            }
            catch (error) {
                vscode.window.showErrorMessage(`Failed to deactivate plugin: ${error.message}`);
            }
        }
    }), vscode.commands.registerCommand('ape.plugins.openSettings', async () => {
        const plugins = services.pluginRegistry.getAllPlugins();
        const items = plugins.map(plugin => ({
            label: plugin.metadata.name,
            description: plugin.state,
            detail: plugin.metadata.description,
            plugin
        }));
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a plugin to open settings'
        });
        if (selected) {
            vscode.commands.executeCommand('workbench.action.openSettings', `ape.plugins.${selected.plugin.id}`);
        }
    }));
    // Add all services to context subscriptions for proper disposal
    context.subscriptions.push(services.modelManager, services.llmService, services.memoryService, services.bitbucketService, services.autoCommitService, services.vaultService, services.rulesService, services.jiraService, services.configManager, {
        dispose: () => {
            // Dispose plugin system
            services.pluginLoader.deactivateAllPlugins().catch(error => {
                console.error('Error deactivating plugins during extension deactivation:', error);
            });
            services.pluginSettingsManager.dispose();
            // Event emitter doesn't need explicit disposal
        }
    });
}
/**
 * Extension activation point
 * @param context Extension context
 * @returns API object that can be used by other extensions
 */
async function activate(context) {
    console.log('APE Extension is now active!');
    // 테스트 모드 여부 확인 및 환경 변수 설정
    const isTestMode = vscode.workspace.getConfiguration('ape').get('testing.enabled') ||
        process.env.APE_TEST_MODE === 'true';
    if (isTestMode) {
        process.env.APE_TEST_MODE = 'true';
        console.log('APE 테스트 모드 활성화됨: 자동 권한 허용이 활성화됩니다.');
        // 권한 요청 자동 수락 명령 등록
        context.subscriptions.push(vscode.commands.registerCommand('ape.acceptAllPermissions', () => {
            vscode.window.showInformationMessage('모든 권한 요청이 자동으로 수락됩니다.');
            return true;
        }));
    }
    // 현재 버전 정보를 상태 표시줄에 표시
    try {
        const versionInfo = await context.extension.packageJSON.version;
        const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        statusBarItem.text = `$(tag) APE v${versionInfo}`;
        statusBarItem.tooltip = 'APE Extension Version';
        statusBarItem.show();
        context.subscriptions.push(statusBarItem);
    }
    catch (error) {
        console.error('Failed to display version in status bar:', error);
    }
    try {
        // Initialize all services
        const services = await initializeServices(context);
        // Register VSCode components
        await registerComponents(context, services);
        // Load internal plugins
        try {
            const internalPluginCount = await services.pluginLoader.loadInternalPlugins();
            console.log(`Loaded ${internalPluginCount} internal plugins`);
            // Load external plugins
            const externalPluginCount = await services.pluginLoader.loadExternalPlugins();
            console.log(`Loaded ${externalPluginCount} external plugins`);
            // Auto-activate plugins based on extension activation event
            services.pluginLoader.activatePluginsByEvent('onExtensionActivate').catch(error => {
                console.error('Error activating plugins on extension activation:', error);
            });
        }
        catch (error) {
            console.error('Failed to initialize plugin system:', error);
            vscode.window.showErrorMessage('Failed to initialize APE plugin system. Some features may not work properly.');
        }
        // Show welcome message on first activation
        const hasShownWelcome = context.globalState.get('ape.hasShownWelcome');
        // 앱 시작 시 채팅 화면과 트리뷰 비율(3:1)로 설정
        setTimeout(async () => {
            try {
                // VSCode 레이아웃 초기화
                await vscode.commands.executeCommand('workbench.action.resetLayout');
                await sleep(300);
                // 사이드바 열기 (트리뷰 표시)
                await vscode.commands.executeCommand('workbench.view.extension.ape-sidebar');
                console.log('APE Sidebar opened');
                await sleep(100);
                // 먼저 채팅 뷰에 직접 접근
                await vscode.commands.executeCommand('apeChat.focus');
                console.log('APE Chat view activated');
                await sleep(100);
                // 채팅뷰와 트리뷰의 비율 조정 (3:1)을 위한 작업
                // 먼저 사이드바 크기 줄이기 (VSCode API는 상대적인 크기 조정만 제공)
                const decreaseCount = 6; // 사이드바를 충분히 좁게
                for (let i = 0; i < decreaseCount; i++) {
                    await vscode.commands.executeCommand('workbench.action.decreaseSideBarWidth');
                    await sleep(30); // 각 명령 사이에 약간의 지연
                }
                // 에디터 영역 크기 증가 (채팅뷰를 위해)
                const increaseCount = 3; // 채팅뷰 영역 확장
                for (let i = 0; i < increaseCount; i++) {
                    await vscode.commands.executeCommand('workbench.action.increaseViewSize');
                    await sleep(30);
                }
                // 채팅 뷰 포커싱 다시 한번 확인
                await sleep(100);
                await vscode.commands.executeCommand('apeChat.focus');
            }
            catch (error) {
                console.error('채팅 뷰 및 트리뷰 초기화 중 오류:', error);
                // 에러 발생시 기본 액션
                try {
                    await vscode.commands.executeCommand('workbench.view.extension.ape-sidebar');
                    console.log('APE Sidebar opened as fallback');
                }
                catch (sidebarError) {
                    console.error('사이드바 열기 실패:', sidebarError);
                }
            }
        }, 1500); // 충분한 지연 시간으로 확실히 초기화 후 실행
        // 짧은 지연을 위한 헬퍼 함수
        // eslint-disable-next-line no-inner-declarations
        function sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
        if (!hasShownWelcome) {
            vscode.window.showInformationMessage('APE Extension is now active! Open the APE sidebar to start using it.', 'Open APE Sidebar').then(selection => {
                if (selection === 'Open APE Sidebar') {
                    vscode.commands.executeCommand('workbench.view.extension.ape-sidebar');
                }
            });
            context.globalState.update('ape.hasShownWelcome', true);
        }
        // Return API for other extensions to consume
        return {
            // Expose Jira service API for external extensions
            jiraService: services.jiraService,
            // Dedicated API for creating Jira issues
            createJiraIssue: async (options) => {
                return services.jiraService.createIssueExternal(options);
            }
        };
    }
    catch (error) {
        console.error('Failed to activate APE extension:', error);
        vscode.window.showErrorMessage(`Failed to activate APE extension: ${error instanceof Error ? error.message : String(error)}`);
        // Return empty API if error occurred
        return {};
    }
}
/**
 * Extension deactivation point
 *
 * 확장 프로그램 비활성화 시 호출되며, 리소스 정리 및 메모리 해제를 수행합니다.
 * - 열려있는 연결 종료 (LLM 스트리밍 등)
 * - 이벤트 리스너 제거
 * - 캐시된 데이터 정리
 * - 불필요한 메모리 해제
 */
function deactivate() {
    console.log('APE Extension is deactivated');
}
//# sourceMappingURL=extension.js.map