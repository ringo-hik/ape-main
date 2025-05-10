"use strict";
/**
 * Bitbucket 서비스
 *
 * Bitbucket API와 통신하여 PR 생성, 코멘트 추가 등의 기능을 제공합니다.
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
exports.BitbucketService = void 0;
const vscode = __importStar(require("vscode"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
/**
 * Bitbucket 서비스 클래스
 */
class BitbucketService {
    _context;
    _disposables = [];
    constructor(_context) {
        this._context = _context;
        // 명령어 등록
        this._registerCommands();
    }
    /**
     * 명령어 등록
     */
    _registerCommands() {
        // PR 생성 명령어
        this._disposables.push(vscode.commands.registerCommand('ape.createPullRequest', () => this.createPullRequest()));
    }
    /**
     * PR 생성
     */
    async createPullRequest() {
        try {
            // 현재는 미구현 상태
            vscode.window.showInformationMessage('Bitbucket PR 생성 기능이 아직 구현되지 않았습니다.');
        }
        catch (error) {
            vscode.window.showErrorMessage(`PR 생성 중 오류가 발생했습니다: ${error}`);
        }
    }
    /**
     * Git 사용자 이름 가져오기
     */
    async getGitUsername() {
        try {
            const { stdout } = await execAsync('git config user.name');
            return stdout.trim();
        }
        catch (error) {
            console.error('Git 사용자 이름을 가져오는 중 오류 발생:', error);
            return null;
        }
    }
    /**
     * 커밋 이력 가져오기
     */
    async getCommitHistory(username, limit = 10) {
        try {
            // 실제 Bitbucket API 통합 전 로컬 Git으로 대체
            const { stdout } = await execAsync(`git log --author="${username}" --pretty=format:"%h%x09%s" -${limit}`);
            // 결과 파싱
            return stdout.split('\n')
                .filter(line => line.trim())
                .map(line => {
                const [displayId, message] = line.split('\t');
                return {
                    displayId: displayId.trim(),
                    message: message.trim()
                };
            });
        }
        catch (error) {
            console.error('커밋 이력을 가져오는 중 오류 발생:', error);
            return [];
        }
    }
    /**
     * Bitbucket 저장소 정보 조회
     */
    async getRepositoryInfo() {
        // 미구현 상태 - 향후 구현 예정
        return null;
    }
    /**
     * Dispose resources
     */
    dispose() {
        this._disposables.forEach(d => d.dispose());
    }
}
exports.BitbucketService = BitbucketService;
//# sourceMappingURL=bitbucketService.js.map