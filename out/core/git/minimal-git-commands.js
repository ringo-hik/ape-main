"use strict";
/**
 * 미니멀 UI가 적용된 Git 명령어 구현 예시
 *
 * 기본 동작이 포함된 Git 명령어 정의를 보여줍니다.
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
exports.createMinimalGitCommands = createMinimalGitCommands;
const vscode = __importStar(require("vscode"));
/**
 * Git 명령어 목록 생성 (미니멀 UI 적용)
 */
function createMinimalGitCommands() {
    const commands = [];
    // Git 명령어 정의 (기본 동작 포함)
    commands.push({
        name: 'git',
        aliases: ['g', '깃', '깃작업'],
        description: 'Git 작업을 수행합니다',
        examples: [
            '/git status', '/git commit', '/git push', '/git pull', '/git branch'
        ],
        category: 'git',
        priority: 3,
        // 인라인 아이콘 지정
        iconName: 'github',
        // 기본 동작 지정
        hasDefaultBehavior: true,
        defaultDescription: 'Git 저장소 상태 확인',
        // 기본 동작 구현 (인자 없이 실행 시 호출됨)
        defaultBehavior: async (context) => {
            // Git 상태 확인 실행 (인자 없이 /git만 입력했을 때)
            console.log('Git 기본 동작 실행: 저장소 상태 확인');
            await vscode.commands.executeCommand('ape.git.showStatus');
        },
        // 일반 실행 구현 (서브커맨드가 제공된 경우)
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
            else if (subCommand === 'push' || subCommand === '푸시') {
                // Git 푸시
                await gitPush(context.args.slice(1));
            }
            else if (subCommand === 'pull' || subCommand === '풀') {
                // Git 풀
                await gitPull(context.args.slice(1));
            }
            else if (subCommand === 'branch' || subCommand === '브랜치') {
                // Git 브랜치
                await gitBranch(context.args.slice(1));
            }
            else {
                // 알 수 없는 서브커맨드
                await vscode.commands.executeCommand('ape.sendLlmResponse', {
                    role: 'assistant',
                    content: `알 수 없는 Git 명령어: ${subCommand}. 사용 가능한 Git 명령어: status, commit, push, pull, branch`
                });
            }
        },
        // 자동 완성 제공
        provideCompletions: (partialArgs) => {
            const subCommands = ['status', 'commit', 'push', 'pull', 'branch'];
            const koreanSubCommands = ['상태', '커밋', '푸시', '풀', '브랜치'];
            // 첫 번째 인자 자동 완성 (서브커맨드)
            if (!partialArgs || partialArgs.trim() === '') {
                return [...subCommands, ...koreanSubCommands];
            }
            const normalizedInput = partialArgs.toLowerCase().trim();
            // 부분 일치 항목 필터링
            return [...subCommands, ...koreanSubCommands].filter(cmd => cmd.toLowerCase().startsWith(normalizedInput));
        }
    });
    return commands;
}
/**
 * Git 푸시 명령 실행
 */
async function gitPush(args) {
    // 실제 구현 시에는 Git 확장과 연동하여 푸시 기능 구현
    await vscode.commands.executeCommand('ape.sendLlmResponse', {
        role: 'assistant',
        content: '원격 저장소에 푸시하는 중...'
    });
    // 예시: 실제 Git 푸시 명령을 실행하는 코드
    // await vscode.commands.executeCommand('git.push');
}
/**
 * Git 풀 명령 실행
 */
async function gitPull(args) {
    // 실제 구현 시에는 Git 확장과 연동하여 풀 기능 구현
    await vscode.commands.executeCommand('ape.sendLlmResponse', {
        role: 'assistant',
        content: '원격 저장소에서 변경사항을 가져오는 중...'
    });
    // 예시: 실제 Git 풀 명령을 실행하는 코드
    // await vscode.commands.executeCommand('git.pull');
}
/**
 * Git 브랜치 명령 실행
 */
async function gitBranch(args) {
    // 실제 구현 시에는 Git 확장과 연동하여 브랜치 관련 기능 구현
    await vscode.commands.executeCommand('ape.sendLlmResponse', {
        role: 'assistant',
        content: '브랜치 목록을 조회하는 중...'
    });
    // 예시: 실제 Git 브랜치 조회 명령을 실행하는 코드
    // await vscode.commands.executeCommand('git.branch');
}
//# sourceMappingURL=minimal-git-commands.js.map