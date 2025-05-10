"use strict";
/**
 * Git 명령어 모듈
 *
 * Git 관련 명령어들을 정의합니다.
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
exports.createGitCommands = createGitCommands;
const vscode = __importStar(require("vscode"));
/**
 * Git 명령어 목록 생성
 */
function createGitCommands() {
    const commands = [];
    // Git 명령어 정의
    commands.push({
        name: 'git',
        aliases: ['g', '깃', '깃작업'],
        description: 'Git 작업을 수행합니다',
        examples: ['/git status', '/git commit', '/git auto', '/git consolidate', '/깃 상태', '/깃 통합'],
        category: 'git',
        priority: 3,
        execute: async (context) => {
            const subCommand = context.args[0]?.toLowerCase();
            if (!subCommand || subCommand === 'status' || subCommand === '상태') {
                // Git 상태 확인
                await vscode.commands.executeCommand('ape.git.showStatus');
            }
            else if (subCommand === 'commit' || subCommand === '커밋' || subCommand === '저장') {
                // Git 커밋
                await vscode.commands.executeCommand('ape.git.commit');
            }
            else if (subCommand === 'auto' || subCommand === '자동' || subCommand === '자동커밋') {
                // 자동 커밋 토글 또는 명시적 상태 설정
                const secondArg = context.args[1]?.toLowerCase();
                if (secondArg === 'on' || secondArg === '켜기' || secondArg === 'true') {
                    // 자동 커밋 켜기
                    await vscode.workspace.getConfiguration('ape.git')
                        .update('autoCommit', true, vscode.ConfigurationTarget.Workspace);
                    vscode.window.showInformationMessage('자동 커밋이 켜졌습니다');
                }
                else if (secondArg === 'off' || secondArg === '끄기' || secondArg === 'false') {
                    // 자동 커밋 끄기
                    await vscode.workspace.getConfiguration('ape.git')
                        .update('autoCommit', false, vscode.ConfigurationTarget.Workspace);
                    vscode.window.showInformationMessage('자동 커밋이 꺼졌습니다');
                }
                else {
                    // 토글 (인자 없는 경우)
                    await vscode.commands.executeCommand('ape.git.toggleAutoCommit');
                }
            }
            else if (subCommand === 'consolidate' || subCommand === 'squash' || subCommand === '통합' || subCommand === '임시통합' || subCommand === '통합커밋') {
                // 임시 커밋 통합
                await vscode.commands.executeCommand('ape.git.consolidateTemporaryCommits');
            }
            else {
                vscode.window.showErrorMessage('알 수 없는 Git 하위 명령어입니다');
            }
        },
        provideCompletions: (partialArgs) => {
            const subCommands = ['status', 'commit', 'auto', 'consolidate', 'squash',
                '상태', '커밋', '저장', '자동', '자동커밋', '통합', '임시통합', '통합커밋'];
            // 첫 번째 인자 자동완성
            if (!partialArgs.includes(' ')) {
                return subCommands.filter(cmd => cmd.startsWith(partialArgs.toLowerCase()));
            }
            return [];
        }
    });
    return commands;
}
//# sourceMappingURL=commands.js.map