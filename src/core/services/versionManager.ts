import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ServiceError } from './serviceError';

/**
 * 시맨틱 버전 규칙에 따른 버전 종류
 */
export enum VersionType {
  /**
   * 패치 버전: 버그 수정 및 마이너 변경 (0.0.1)
   */
  PATCH = 'patch',
  
  /**
   * 마이너 버전: 하위 호환성 있는 새 기능 추가 (0.1.0)
   */
  MINOR = 'minor',
  
  /**
   * 메이저 버전: 주요 기능 또는 하위 호환성이 없는 변경 (1.0.0)
   */
  MAJOR = 'major'
}

/**
 * 버전 정보와 관련 데이터
 */
export interface VersionInfo {
  /** 현재 버전 (x.y.z 형식) */
  version: string;
  
  /** package.json 파일 경로 */
  packageJsonPath: string;
  
  /** version 문자열 파싱한 숫자 배열 [major, minor, patch] */
  versionParts: number[];
}

/**
 * 버전 관리 서비스
 * - 프로젝트 버전 관리
 * - 버전 업데이트 (patch, minor, major)
 * - Git 태그 생성
 */
export class VersionManager {
  private _extensionContext: vscode.ExtensionContext;
  
  constructor(context: vscode.ExtensionContext) {
    this._extensionContext = context;
  }
  
  /**
   * 현재 프로젝트 버전 정보 조회
   * @returns 버전 정보
   */
  public async getCurrentVersion(): Promise<VersionInfo> {
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
    } catch (error) {
      throw new ServiceError('버전 정보를 읽어오는 중 오류가 발생했습니다.', error);
    }
  }
  
  /**
   * 버전 업데이트
   * @param type 버전 업데이트 유형 (patch, minor, major)
   * @param message 버전 업데이트 이유/메시지
   * @param createGitTag Git 태그 생성 여부
   * @returns 업데이트된 버전 정보
   */
  public async updateVersion(
    type: VersionType, 
    message?: string, 
    createGitTag: boolean = false
  ): Promise<VersionInfo> {
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
    } catch (error) {
      throw new ServiceError('버전 업데이트 중 오류가 발생했습니다.', error);
    }
  }
  
  /**
   * Git 태그 생성
   * @param version 버전 문자열
   * @param message 태그 메시지
   */
  public async createGitTag(version: string, message?: string): Promise<void> {
    try {
      const tagName = `v${version}`;
      const tagMessage = message || `Version ${version}`;
      
      // Git 태그 명령 실행
      const terminal = vscode.window.createTerminal('APE Version Manager');
      terminal.sendText(`git tag -a "${tagName}" -m "${tagMessage}"`);
      terminal.sendText('git push --tags');
      terminal.show();
      
      vscode.window.showInformationMessage(`Created Git tag: ${tagName}`);
    } catch (error) {
      throw new ServiceError('Git 태그 생성 중 오류가 발생했습니다.', error);
    }
  }
  
  /**
   * 버전 관리 명령어 등록
   */
  public registerCommands(): void {
    // 내부 개발용 명령어만 등록
    this._extensionContext.subscriptions.push(
      vscode.commands.registerCommand('ape.internal.version.bump.patch', async () => {
        await this.bumpVersion(VersionType.PATCH);
      }),
      
      vscode.commands.registerCommand('ape.internal.version.bump.minor', async () => {
        await this.bumpVersion(VersionType.MINOR);
      }),
      
      vscode.commands.registerCommand('ape.internal.version.bump.major', async () => {
        await this.bumpVersion(VersionType.MAJOR);
      })
    );
  }
  
  /**
   * VS Code 상태 표시줄에 버전 표시
   * @param version 버전 문자열
   */
  private updateStatusBar(version: string): void {
    // 상태 표시줄 아이템이 이미 있는지 확인
    const statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right, 
      100
    );
    
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
  private async bumpVersion(type: VersionType): Promise<void> {
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
      const newVersionInfo = await this.updateVersion(
        type, 
        message, 
        createTag === 'Yes'
      );
      
      vscode.window.showInformationMessage(
        `버전이 ${newVersionInfo.version}(으)로 업데이트되었습니다.`
      );
    } catch (error) {
      vscode.window.showErrorMessage(`버전 업데이트 실패: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * package.json 경로 조회
   */
  private getPackageJsonPath(): string {
    return path.join(this._extensionContext.extensionPath, 'package.json');
  }
  
  /**
   * package.json 파일 읽기
   * @param filePath package.json 파일 경로
   */
  private async readPackageJson(filePath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          reject(err);
          return;
        }
        
        try {
          const packageJson = JSON.parse(data);
          resolve(packageJson);
        } catch (error) {
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
  private async updatePackageJsonVersion(filePath: string, newVersion: string): Promise<void> {
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
        } catch (error) {
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
  private parseVersion(version: string): number[] {
    const parts = version.split('.').map(part => parseInt(part, 10));
    
    // 배열이 3개 요소를 갖도록 보장
    while (parts.length < 3) {
      parts.push(0);
    }
    
    return parts;
  }
}