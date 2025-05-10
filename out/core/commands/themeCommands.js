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
exports.registerThemeCommands = registerThemeCommands;
const vscode = __importStar(require("vscode"));
/**
 * 테마 관련 슬래시 명령어 등록
 */
function registerThemeCommands(commands, themeManager) {
    // 테마 명령어 생성
    const themeCommand = {
        name: 'theme',
        description: '채팅 인터페이스 색상 테마를 선택합니다',
        // usage 속성 제거
        examples: ['/theme'],
        category: 'utility',
        // icon 속성 제거
        execute: async (context) => {
            // 테마 선택 명령 실행
            await vscode.commands.executeCommand('ape.selectTheme');
            // 슬래시 커맨드 인터페이스는 void 반환을 요구함
        }
    };
    // SlashCommandManager에 등록하거나 명령어 배열에 추가
    if (Array.isArray(commands)) {
        commands.push(themeCommand);
    }
    else {
        commands.registerCommand(themeCommand);
    }
}
//# sourceMappingURL=themeCommands.js.map