"use strict";
/**
 * SWDP 명령어 정의
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
exports.createSwdpCommands = createSwdpCommands;
const vscode = __importStar(require("vscode"));
/**
 * SWDP 관련 명령어 생성
 */
function createSwdpCommands() {
    return [
        // SWDP 메인 명령어
        {
            name: 'swdp',
            description: 'SWDP 개발 파이프라인 관련 명령어',
            aliases: ['sw', 'pipeline', '파이프라인'],
            examples: ['/swdp', '/swdp status', '/swdp run'],
            category: 'swdp',
            priority: 30,
            execute: async (context) => {
                if (context.args.length === 0) {
                    vscode.window.showInformationMessage('SWDP 명령어를 사용할 수 있습니다. 도움말은 /help swdp를 입력하세요.');
                    return;
                }
                const subCommand = context.args[0].toLowerCase();
                switch (subCommand) {
                    case 'status':
                        vscode.window.showInformationMessage('SWDP 파이프라인 상태: 정상');
                        break;
                    case 'run':
                        vscode.window.showInformationMessage('SWDP 파이프라인 실행 중...');
                        break;
                    default:
                        vscode.window.showInformationMessage(`알 수 없는 SWDP 하위 명령어: ${subCommand}`);
                }
            },
            provideCompletions: (partialArgs) => {
                const parts = partialArgs.split(' ');
                if (parts.length <= 1) {
                    return ['status', 'run', 'config', 'logs'].filter(cmd => cmd.startsWith(parts[0] || ''));
                }
                return [];
            }
        },
        // SWDP status 명령어
        {
            name: 'swdp-status',
            description: 'SWDP 파이프라인 상태 확인',
            aliases: ['swstatus', 'pipeline-status'],
            examples: ['/swdp-status'],
            category: 'swdp',
            priority: 31,
            execute: async () => {
                vscode.window.showInformationMessage('SWDP 파이프라인 상태: 정상');
            }
        },
        // SWDP run 명령어
        {
            name: 'swdp-run',
            description: 'SWDP 파이프라인 실행',
            aliases: ['swrun', 'pipeline-run'],
            examples: ['/swdp-run dev', '/swdp-run prod'],
            category: 'swdp',
            priority: 32,
            execute: async (context) => {
                const environment = context.args[0] || 'dev';
                vscode.window.showInformationMessage(`SWDP 파이프라인 실행 중 (${environment})...`);
            },
            provideCompletions: (partialArgs) => {
                const parts = partialArgs.split(' ');
                if (parts.length <= 1) {
                    return ['dev', 'test', 'stage', 'prod'].filter(env => env.startsWith(parts[0] || ''));
                }
                return [];
            }
        }
    ];
}
//# sourceMappingURL=swdpCommands.js.map