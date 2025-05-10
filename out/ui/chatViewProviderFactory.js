"use strict";
/**
 * 채팅 뷰 프로바이더 팩토리
 * 설정에 따라 적절한 채팅 인터페이스를 선택하는 팩토리 모듈
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
exports.ChatViewProviderFactory = void 0;
const vscode = __importStar(require("vscode"));
const mainChatViewProvider_1 = require("./mainChatViewProvider");
/**
 * 채팅 뷰 인터페이스 프로바이더 팩토리
 * 다양한 UI 스타일을 선택할 수 있는 공장 패턴 구현
 */
class ChatViewProviderFactory {
    /**
     * 설정에 따라 적절한 채팅 뷰 프로바이더를 생성
     */
    static createProvider(context, llmService, memoryService, commandManager, modelManager) {
        // 현재 설정에서 UI 테마 가져오기
        const uiTheme = vscode.workspace.getConfiguration('ape').get('ui.theme', 'main');
        // 설정에 따라 적절한 프로바이더 생성
        switch (uiTheme) {
            case 'main':
            default:
                console.log('기본 채팅 인터페이스를 사용합니다.');
                return new mainChatViewProvider_1.MainChatViewProvider(context, llmService, memoryService, commandManager, // null일 수도 있지만 나중에 설정됨
                modelManager);
        }
    }
    /**
     * 현재 설정된 뷰 프로바이더 타입 가져오기
     */
    static getCurrentViewType() {
        const uiTheme = vscode.workspace.getConfiguration('ape').get('ui.theme', 'main');
        return uiTheme === 'default' ? 'default' : 'main';
    }
    /**
     * 사용자가 UI 스타일을 변경할 수 있는 퀵픽 대화상자 표시
     */
    static async showStyleSelector() {
        const currentStyle = ChatViewProviderFactory.getCurrentViewType();
        const styles = [
            {
                label: '메인 스타일',
                description: '기본 채팅 인터페이스',
                value: 'main',
                picked: currentStyle === 'main'
            },
            {
                label: '대체 스타일',
                description: '대체 VSCode 스타일 인터페이스',
                value: 'default',
                picked: currentStyle === 'default'
            }
        ];
        const selected = await vscode.window.showQuickPick(styles, {
            placeHolder: '채팅 인터페이스 스타일을 선택하세요',
            title: 'APE 채팅 스타일 선택'
        });
        if (selected && selected.value !== currentStyle) {
            // 설정 업데이트
            await vscode.workspace.getConfiguration('ape').update('ui.theme', selected.value, vscode.ConfigurationTarget.Global);
            // 재시작 제안
            const restart = await vscode.window.showInformationMessage(`채팅 인터페이스가 ${selected.label}로 변경되었습니다. 변경사항을 적용하려면 VS Code를 재시작해야 합니다.`, '재시작', '나중에');
            if (restart === '재시작') {
                vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
        }
    }
}
exports.ChatViewProviderFactory = ChatViewProviderFactory;
//# sourceMappingURL=chatViewProviderFactory.js.map