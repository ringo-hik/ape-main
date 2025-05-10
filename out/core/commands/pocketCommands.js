"use strict";
/**
 * POCKET 명령어 정의
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
exports.createPocketCommands = createPocketCommands;
const vscode = __importStar(require("vscode"));
/**
 * POCKET 관련 명령어 생성
 */
function createPocketCommands() {
    return [
        // POCKET 메인 명령어
        {
            name: 'pocket',
            description: 'POCKET 지식 관리 시스템 명령어',
            aliases: ['pk', '포켓', '지식관리'],
            examples: ['/pocket', '/pocket save', '/pocket search 키워드'],
            category: 'pocket',
            priority: 40,
            execute: async (context) => {
                if (context.args.length === 0) {
                    vscode.window.showInformationMessage('POCKET 명령어를 사용할 수 있습니다. 도움말은 /help pocket을 입력하세요.');
                    return;
                }
                const subCommand = context.args[0].toLowerCase();
                switch (subCommand) {
                    case 'save':
                        vscode.window.showInformationMessage('현재 내용을 POCKET에 저장했습니다.');
                        break;
                    case 'search':
                        const keyword = context.args.slice(1).join(' ');
                        if (keyword) {
                            vscode.window.showInformationMessage(`'${keyword}' 검색 결과: 0건`);
                        }
                        else {
                            vscode.window.showInformationMessage('검색어를 입력하세요.');
                        }
                        break;
                    case 'list':
                        vscode.window.showInformationMessage('POCKET 항목 목록');
                        break;
                    default:
                        vscode.window.showInformationMessage(`알 수 없는 POCKET 하위 명령어: ${subCommand}`);
                }
            },
            provideCompletions: (partialArgs) => {
                const parts = partialArgs.split(' ');
                if (parts.length <= 1) {
                    return ['save', 'search', 'list', 'tag', 'sync'].filter(cmd => cmd.startsWith(parts[0] || ''));
                }
                if (parts[0] === 'tag' && parts.length === 2) {
                    return ['project', 'idea', 'code', 'important', 'docs'].filter(tag => tag.startsWith(parts[1] || ''));
                }
                return [];
            }
        },
        // POCKET save 명령어
        {
            name: 'pocket-save',
            description: '현재 정보를 POCKET에 저장',
            aliases: ['pksave', '포켓저장'],
            examples: ['/pocket-save', '/pocket-save 제목'],
            category: 'pocket',
            priority: 41,
            execute: async (context) => {
                const title = context.args.join(' ') || '제목 없음';
                vscode.window.showInformationMessage(`'${title}'을(를) POCKET에 저장했습니다.`);
            }
        },
        // POCKET search 명령어
        {
            name: 'pocket-search',
            description: 'POCKET에서 정보 검색',
            aliases: ['pksearch', '포켓검색'],
            examples: ['/pocket-search 키워드', '/pocket-search tag:project'],
            category: 'pocket',
            priority: 42,
            execute: async (context) => {
                const query = context.args.join(' ');
                if (query) {
                    vscode.window.showInformationMessage(`'${query}' 검색 결과: 0건`);
                }
                else {
                    vscode.window.showInformationMessage('검색어를 입력하세요.');
                }
            },
            provideCompletions: (partialArgs) => {
                const parts = partialArgs.split(' ');
                if (parts.length <= 1 && parts[0].startsWith('tag:')) {
                    const tagPrefix = parts[0].substring(4);
                    return ['tag:project', 'tag:idea', 'tag:code', 'tag:important', 'tag:docs'].filter(tag => tag.startsWith('tag:' + tagPrefix));
                }
                return [];
            }
        }
    ];
}
//# sourceMappingURL=pocketCommands.js.map