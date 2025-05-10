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
exports.VersionManager = exports.VersionType = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const serviceError_1 = require("./serviceError");
/**
 * 시맨틱 버전 규칙에 따른 버전 종류
 */
var VersionType;
(function (VersionType) {
    /**
     * 패치 버전: 버그 수정 및 마이너 변경 (0.0.1)
     */
    VersionType["PATCH"] = "patch";
    /**
     * 마이너 버전: 하위 호환성 있는 새 기능 추가 (0.1.0)
     */
    VersionType["MINOR"] = "minor";
    /**
     * 메이저 버전: 주요 기능 또는 하위 호환성이 없는 변경 (1.0.0)
     */
    VersionType["MAJOR"] = "major";
})(VersionType || (exports.VersionType = VersionType = {}));
/**
 * 버전 관리 서비스
 * - 프로젝트 버전 관리
 * - 버전 업데이트 (patch, minor, major)
 * - Git 태그 생성
 */
class VersionManager {
    _extensionContext;
    constructor(context) {
        this._extensionContext = context;
    }
    /**
     * 현재 프로젝트 버전 정보 조회
     * @returns 버전 정보
     */
    async getCurrentVersion() {
        try {
            const packageJsonPath = this.getPackageJsonPath();
            const packageJson = await this.readPackageJson(packageJsonPath);
            const version = packageJson.version || '0.0.0';
            const versionParts = this.parseVersion(version);
            return {
                version,
                packageJsonPath,
                versionParts
            };
        }
        catch (error) {
            throw new serviceError_1.ServiceError('버전 정보를 읽어오는 중 오류가 발생했습니다.', error);
        }
    }
    /**
     * 버전 업데이트
     * @param type 버전 업데이트 유형 (patch, minor, major)
     * @param message 버전 업데이트 이유/메시지
     * @param createGitTag Git 태그 생성 여부
     * @returns 업데이트된 버전 정보
     */
    async updateVersion(type, message, createGitTag = false) {
        try {
            // 현재 버전 정보 조회
            const currentVersionInfo = await this.getCurrentVersion();
            const { versionParts, packageJsonPath } = currentVersionInfo;
            // 새 버전 계산
            const newVersionParts = [...versionParts];
            switch (type) {
                case VersionType.PATCH:
                    newVersionParts[2] += 1;
                    break;
                case VersionType.MINOR:
                    newVersionParts[1] += 1;
                    newVersionParts[2] = 0;
                    break;
                case VersionType.MAJOR:
                    newVersionParts[0] += 1;
                    newVersionParts[1] = 0;
                    newVersionParts[2] = 0;
                    break;
            }
            const newVersion = newVersionParts.join('.');
            // package.json 업데이트
            await this.updatePackageJsonVersion(packageJsonPath, newVersion);
            // Git 태그 생성 (옵션)
            if (createGitTag) {
                await this.createGitTag(newVersion, message);
            }
            // 상태바 업데이트
            this.updateStatusBar(newVersion);
            // 결과 반환
            return {
                version: newVersion,
                packageJsonPath,
                versionParts: newVersionParts
            };
        }
        catch (error) {
            throw new serviceError_1.ServiceError('버전 업데이트 중 오류가 발생했습니다.', error);
        }
    }
    /**
     * Git 태그 생성
     * @param version 버전 문자열
     * @param message 태그 메시지
     */
    async createGitTag(version, message) {
        try {
            const tagName = `v${version}`;
            const tagMessage = message || `Version ${version}`;
            // Git 태그 명령 실행
            const terminal = vscode.window.createTerminal('APE Version Manager');
            terminal.sendText(`git tag -a "${tagName}" -m "${tagMessage}"`);
            terminal.sendText('git push --tags');
            terminal.show();
            vscode.window.showInformationMessage(`Created Git tag: ${tagName}`);
        }
        catch (error) {
            throw new serviceError_1.ServiceError('Git 태그 생성 중 오류가 발생했습니다.', error);
        }
    }
    /**
     * 버전 관리 명령어 등록
     */
    registerCommands() {
        // 내부 개발용 명령어만 등록
        this._extensionContext.subscriptions.push(vscode.commands.registerCommand('ape.internal.version.bump.patch', async () => {
            await this.bumpVersion(VersionType.PATCH);
        }), vscode.commands.registerCommand('ape.internal.version.bump.minor', async () => {
            await this.bumpVersion(VersionType.MINOR);
        }), vscode.commands.registerCommand('ape.internal.version.bump.major', async () => {
            await this.bumpVersion(VersionType.MAJOR);
        }));
    }
    /**
     * VS Code 상태 표시줄에 버전 표시
     * @param version 버전 문자열
     */
    updateStatusBar(version) {
        // 상태 표시줄 아이템이 이미 있는지 확인
        const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        statusBarItem.text = `$(tag) APE v${version}`;
        statusBarItem.tooltip = 'APE Extension Version';
        statusBarItem.show();
        // Extension Context에 상태 표시줄 아이템 등록
        this._extensionContext.subscriptions.push(statusBarItem);
    }
    /**
     * 버전 증가 작업 수행
     * @param type 버전 증가 유형
     */
    async bumpVersion(type) {
        try {
            // 메시지 입력 받기
            const message = await vscode.window.showInputBox({
                prompt: '버전 업데이트 메시지를 입력하세요',
                placeHolder: '예: 스트리밍 채팅 UI 개선'
            });
            if (message === undefined) {
                return; // 취소됨
            }
            // Git 태그 생성 여부 확인
            const createTag = await vscode.window.showQuickPick(['Yes', 'No'], {
                placeHolder: 'Git 태그를 생성하시겠습니까?'
            });
            if (createTag === undefined) {
                return; // 취소됨
            }
            // 버전 업데이트
            const newVersionInfo = await this.updateVersion(type, message, createTag === 'Yes');
            vscode.window.showInformationMessage(`버전이 ${newVersionInfo.version}(으)로 업데이트되었습니다.`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`버전 업데이트 실패: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * package.json 경로 조회
     */
    getPackageJsonPath() {
        return path.join(this._extensionContext.extensionPath, 'package.json');
    }
    /**
     * package.json 파일 읽기
     * @param filePath package.json 파일 경로
     */
    async readPackageJson(filePath) {
        return new Promise((resolve, reject) => {
            fs.readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    reject(err);
                    return;
                }
                try {
                    const packageJson = JSON.parse(data);
                    resolve(packageJson);
                }
                catch (error) {
                    reject(error);
                }
            });
        });
    }
    /**
     * package.json 버전 업데이트
     * @param filePath package.json 파일 경로
     * @param newVersion 새 버전 문자열
     */
    async updatePackageJsonVersion(filePath, newVersion) {
        return new Promise((resolve, reject) => {
            fs.readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    reject(err);
                    return;
                }
                try {
                    const packageJson = JSON.parse(data);
                    packageJson.version = newVersion;
                    const updatedContent = JSON.stringify(packageJson, null, 2);
                    fs.writeFile(filePath, updatedContent, 'utf8', (writeErr) => {
                        if (writeErr) {
                            reject(writeErr);
                            return;
                        }
                        resolve();
                    });
                }
                catch (error) {
                    reject(error);
                }
            });
        });
    }
    /**
     * 버전 문자열 파싱
     * @param version 버전 문자열 (x.y.z 형식)
     * @returns [major, minor, patch] 숫자 배열
     */
    parseVersion(version) {
        const parts = version.split('.').map(part => parseInt(part, 10));
        // 배열이 3개 요소를 갖도록 보장
        while (parts.length < 3) {
            parts.push(0);
        }
        return parts;
    }
}
exports.VersionManager = VersionManager;
//# sourceMappingURL=versionManager.js.map