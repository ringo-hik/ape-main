"use strict";
/**
 * APE Rules 서비스
 *
 * Rules 파일을 관리하고 LLM 시스템 프롬프트에 적용하는 서비스입니다.
 * Rules 생성, 삭제, 활성화/비활성화 기능을 제공합니다.
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
exports.RulesService = exports.RuleStatus = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const serviceError_1 = require("./serviceError");
/**
 * Rule 항목 상태
 */
var RuleStatus;
(function (RuleStatus) {
    RuleStatus["Active"] = "active";
    RuleStatus["Inactive"] = "inactive";
})(RuleStatus || (exports.RuleStatus = RuleStatus = {}));
/**
 * Rules 서비스 클래스
 */
class RulesService {
    context;
    configManager;
    _onDidChangeRules = new vscode.EventEmitter();
    onDidChangeRules = this._onDidChangeRules.event;
    rules = new Map();
    disposables = [];
    rulesDir;
    /**
     * 생성자
     * @param context VSCode 확장 컨텍스트
     * @param configManager 서비스 설정 관리자 (옵션)
     */
    constructor(context, configManager) {
        this.context = context;
        this.configManager = configManager;
        // Rules 디렉토리 설정
        this.rulesDir = path.join(this.context.globalStorageUri.fsPath, 'rules');
        // Rules 디렉토리 생성 (없는 경우)
        this.ensureRulesDir();
        // 설정 변경 이벤트 구독
        this.disposables.push(vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('ape.rules')) {
                this.loadAllRules();
            }
        }));
        // 파일 시스템 변경 감지
        const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(this.rulesDir, '**/*.md'));
        this.disposables.push(watcher, watcher.onDidCreate(() => this.loadAllRules()), watcher.onDidDelete(() => this.loadAllRules()), watcher.onDidChange(() => this.loadAllRules()));
        // 초기 Rules 로드
        this.loadAllRules();
    }
    /**
     * Rules 디렉토리 확인 및 생성
     */
    ensureRulesDir() {
        if (!fs.existsSync(this.rulesDir)) {
            fs.mkdirSync(this.rulesDir, { recursive: true });
        }
    }
    /**
     * 모든 Rules 로드
     */
    async loadAllRules() {
        try {
            this.ensureRulesDir();
            this.rules.clear();
            // Rules 디렉토리의 모든 .md 파일 읽기
            const files = fs.readdirSync(this.rulesDir).filter(file => file.endsWith('.md'));
            // 설정에서 활성화된 Rules 목록 가져오기
            const config = vscode.workspace.getConfiguration('ape.rules');
            const activeRules = config.get('activeRules', []);
            // 각 파일을 Rule 객체로 변환
            for (const file of files) {
                const filePath = path.join(this.rulesDir, file);
                const fileStats = fs.statSync(filePath);
                const content = fs.readFileSync(filePath, 'utf-8');
                // 파일명에서 확장자 제거하여 ID 생성
                const id = path.basename(file, '.md');
                // Rule 객체 생성
                const rule = {
                    id,
                    name: this.extractNameFromContent(content) || id,
                    filePath,
                    content,
                    status: activeRules.includes(id) ? RuleStatus.Active : RuleStatus.Inactive,
                    createdAt: fileStats.birthtime,
                    updatedAt: fileStats.mtime
                };
                // Rules 맵에 추가
                this.rules.set(id, rule);
            }
            // 변경 이벤트 발생
            this._onDidChangeRules.fire();
        }
        catch (error) {
            console.error('Rules 로드 오류:', error);
            vscode.window.showErrorMessage(`Rules 로드 중 오류가 발생했습니다: ${error}`);
        }
    }
    /**
     * 파일 내용에서 이름 추출 (첫 번째 제목 사용)
     * @param content 파일 내용
     */
    extractNameFromContent(content) {
        // 마크다운 제목 형식(#으로 시작하는 라인) 찾기
        const titleMatch = content.match(/^#\s+(.+)$/m);
        if (titleMatch && titleMatch[1]) {
            return titleMatch[1].trim();
        }
        return null;
    }
    /**
     * 모든 Rules 가져오기
     */
    getAllRules() {
        return Array.from(this.rules.values());
    }
    /**
     * 활성화된 Rules 가져오기
     */
    getActiveRules() {
        return this.getAllRules().filter(rule => rule.status === RuleStatus.Active);
    }
    /**
     * ID로 Rule 가져오기
     * @param id Rule ID
     */
    getRuleById(id) {
        return this.rules.get(id);
    }
    /**
     * Rule 생성
     * @param name Rule 이름
     * @param content Rule 내용
     * @param activate 생성 후 활성화 여부
     */
    async createRule(name, content, activate = false) {
        try {
            this.ensureRulesDir();
            // 파일명으로 사용할 ID 생성 (공백은 하이픈으로 변환)
            const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            // 이미 존재하는 ID인지 확인
            if (this.rules.has(id)) {
                throw new serviceError_1.ServiceError(`이미 존재하는 Rule 이름입니다: ${name}`, 'rule-already-exists');
            }
            // 마크다운 내용이 제목으로 시작하지 않으면 제목 추가
            let finalContent = content;
            if (!content.trim().startsWith('#')) {
                finalContent = `# ${name}\n\n${content}`;
            }
            // 파일 경로 생성
            const filePath = path.join(this.rulesDir, `${id}.md`);
            // 파일 작성
            fs.writeFileSync(filePath, finalContent, 'utf-8');
            // Rule 객체 생성
            const rule = {
                id,
                name,
                filePath,
                content: finalContent,
                status: RuleStatus.Inactive,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            // Rules 맵에 추가
            this.rules.set(id, rule);
            // 활성화 요청이 있으면 활성화
            if (activate) {
                await this.activateRule(id);
            }
            // 변경 이벤트 발생
            this._onDidChangeRules.fire();
            return rule;
        }
        catch (error) {
            console.error('Rule 생성 오류:', error);
            throw new serviceError_1.ServiceError(`Rule 생성 중 오류가 발생했습니다: ${error}`, 'rule-creation-failed');
        }
    }
    /**
     * Rule 업데이트
     * @param id Rule ID
     * @param updates 업데이트할 필드
     */
    async updateRule(id, updates) {
        try {
            const rule = this.rules.get(id);
            if (!rule) {
                throw new serviceError_1.ServiceError(`ID가 ${id}인 Rule을 찾을 수 없습니다.`, 'rule-not-found');
            }
            // 이름 또는 내용 업데이트
            let updatedContent = rule.content;
            let updatedName = rule.name;
            if (updates.name) {
                updatedName = updates.name;
                // 내용 업데이트 없이 이름만 변경하는 경우 마크다운 제목 업데이트
                if (!updates.content) {
                    const titleRegex = /^#\s+(.+)$/m;
                    if (titleRegex.test(updatedContent)) {
                        updatedContent = updatedContent.replace(titleRegex, `# ${updatedName}`);
                    }
                    else {
                        updatedContent = `# ${updatedName}\n\n${updatedContent}`;
                    }
                }
            }
            if (updates.content) {
                updatedContent = updates.content;
                // 내용에 제목이 없으면 추가
                if (!updatedContent.trim().startsWith('#')) {
                    updatedContent = `# ${updatedName}\n\n${updatedContent}`;
                }
            }
            // 파일 업데이트
            fs.writeFileSync(rule.filePath, updatedContent, 'utf-8');
            // Rule 객체 업데이트
            const updatedRule = {
                ...rule,
                name: updatedName,
                content: updatedContent,
                updatedAt: new Date()
            };
            // Rules 맵 업데이트
            this.rules.set(id, updatedRule);
            // 변경 이벤트 발생
            this._onDidChangeRules.fire();
            return updatedRule;
        }
        catch (error) {
            console.error('Rule 업데이트 오류:', error);
            throw new serviceError_1.ServiceError(`Rule 업데이트 중 오류가 발생했습니다: ${error}`, 'rule-update-failed');
        }
    }
    /**
     * Rule 삭제
     * @param id Rule ID
     */
    async deleteRule(id) {
        try {
            const rule = this.rules.get(id);
            if (!rule) {
                throw new serviceError_1.ServiceError(`ID가 ${id}인 Rule을 찾을 수 없습니다.`, 'rule-not-found');
            }
            // 활성화된 경우 비활성화
            if (rule.status === RuleStatus.Active) {
                await this.deactivateRule(id);
            }
            // 파일 삭제
            if (fs.existsSync(rule.filePath)) {
                fs.unlinkSync(rule.filePath);
            }
            // Rules 맵에서 제거
            this.rules.delete(id);
            // 변경 이벤트 발생
            this._onDidChangeRules.fire();
            return true;
        }
        catch (error) {
            console.error('Rule 삭제 오류:', error);
            throw new serviceError_1.ServiceError(`Rule 삭제 중 오류가 발생했습니다: ${error}`, 'rule-deletion-failed');
        }
    }
    /**
     * Rule 활성화
     * @param id Rule ID
     */
    async activateRule(id) {
        try {
            const rule = this.rules.get(id);
            if (!rule) {
                throw new serviceError_1.ServiceError(`ID가 ${id}인 Rule을 찾을 수 없습니다.`, 'rule-not-found');
            }
            // 이미 활성화된 경우 처리 생략
            if (rule.status === RuleStatus.Active) {
                return true;
            }
            // 설정에서 활성화된 Rules 목록 가져오기
            const config = vscode.workspace.getConfiguration('ape.rules');
            const activeRules = config.get('activeRules', []);
            // ID가 목록에 없으면 추가
            if (!activeRules.includes(id)) {
                activeRules.push(id);
                await config.update('activeRules', activeRules, vscode.ConfigurationTarget.Global);
            }
            // Rule 상태 업데이트
            const updatedRule = {
                ...rule,
                status: RuleStatus.Active,
                updatedAt: new Date()
            };
            // Rules 맵 업데이트
            this.rules.set(id, updatedRule);
            // 변경 이벤트 발생
            this._onDidChangeRules.fire();
            return true;
        }
        catch (error) {
            console.error('Rule 활성화 오류:', error);
            throw new serviceError_1.ServiceError(`Rule 활성화 중 오류가 발생했습니다: ${error}`, 'rule-activation-failed');
        }
    }
    /**
     * Rule 비활성화
     * @param id Rule ID
     */
    async deactivateRule(id) {
        try {
            const rule = this.rules.get(id);
            if (!rule) {
                throw new serviceError_1.ServiceError(`ID가 ${id}인 Rule을 찾을 수 없습니다.`, 'rule-not-found');
            }
            // 이미 비활성화된 경우 처리 생략
            if (rule.status === RuleStatus.Inactive) {
                return true;
            }
            // 설정에서 활성화된 Rules 목록 가져오기
            const config = vscode.workspace.getConfiguration('ape.rules');
            const activeRules = config.get('activeRules', []);
            // ID가 목록에 있으면 제거
            const updatedActiveRules = activeRules.filter(activeId => activeId !== id);
            await config.update('activeRules', updatedActiveRules, vscode.ConfigurationTarget.Global);
            // Rule 상태 업데이트
            const updatedRule = {
                ...rule,
                status: RuleStatus.Inactive,
                updatedAt: new Date()
            };
            // Rules 맵 업데이트
            this.rules.set(id, updatedRule);
            // 변경 이벤트 발생
            this._onDidChangeRules.fire();
            return true;
        }
        catch (error) {
            console.error('Rule 비활성화 오류:', error);
            throw new serviceError_1.ServiceError(`Rule 비활성화 중 오류가 발생했습니다: ${error}`, 'rule-deactivation-failed');
        }
    }
    /**
     * Rules 파일 열기
     * @param id Rule ID
     */
    async openRuleFile(id) {
        try {
            const rule = this.rules.get(id);
            if (!rule) {
                throw new serviceError_1.ServiceError(`ID가 ${id}인 Rule을 찾을 수 없습니다.`, 'rule-not-found');
            }
            // VS Code에서 파일 열기
            const document = await vscode.workspace.openTextDocument(rule.filePath);
            await vscode.window.showTextDocument(document);
            return true;
        }
        catch (error) {
            console.error('Rule 파일 열기 오류:', error);
            throw new serviceError_1.ServiceError(`Rule 파일 열기 중 오류가 발생했습니다: ${error}`, 'rule-open-failed');
        }
    }
    /**
     * Rules를 LLM 시스템 프롬프트로 변환
     */
    getRulesAsSystemPrompt() {
        const activeRules = this.getActiveRules();
        if (activeRules.length === 0) {
            return '';
        }
        // 헤더 추가
        let systemPrompt = '# APE Rules\n\n';
        systemPrompt += '다음 규칙을 항상 준수하세요:\n\n';
        // 각 활성화된 Rule 내용 추가
        for (const rule of activeRules) {
            // 제목이 있는 경우 제목 제외하고 내용만 추가
            let content = rule.content;
            const titleMatch = content.match(/^#\s+(.+)$/m);
            if (titleMatch) {
                content = content.replace(titleMatch[0], '').trim();
            }
            systemPrompt += `## ${rule.name}\n\n${content}\n\n`;
        }
        return systemPrompt;
    }
    /**
     * 리소스 해제
     */
    dispose() {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
}
exports.RulesService = RulesService;
//# sourceMappingURL=rulesService.js.map