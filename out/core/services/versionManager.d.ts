import * as vscode from 'vscode';
/**
 * 시맨틱 버전 규칙에 따른 버전 종류
 */
export declare enum VersionType {
    /**
     * 패치 버전: 버그 수정 및 마이너 변경 (0.0.1)
     */
    PATCH = "patch",
    /**
     * 마이너 버전: 하위 호환성 있는 새 기능 추가 (0.1.0)
     */
    MINOR = "minor",
    /**
     * 메이저 버전: 주요 기능 또는 하위 호환성이 없는 변경 (1.0.0)
     */
    MAJOR = "major"
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
export declare class VersionManager {
    private _extensionContext;
    constructor(context: vscode.ExtensionContext);
    /**
     * 현재 프로젝트 버전 정보 조회
     * @returns 버전 정보
     */
    getCurrentVersion(): Promise<VersionInfo>;
    /**
     * 버전 업데이트
     * @param type 버전 업데이트 유형 (patch, minor, major)
     * @param message 버전 업데이트 이유/메시지
     * @param createGitTag Git 태그 생성 여부
     * @returns 업데이트된 버전 정보
     */
    updateVersion(type: VersionType, message?: string, createGitTag?: boolean): Promise<VersionInfo>;
    /**
     * Git 태그 생성
     * @param version 버전 문자열
     * @param message 태그 메시지
     */
    createGitTag(version: string, message?: string): Promise<void>;
    /**
     * 버전 관리 명령어 등록
     */
    registerCommands(): void;
    /**
     * VS Code 상태 표시줄에 버전 표시
     * @param version 버전 문자열
     */
    private updateStatusBar;
    /**
     * 버전 증가 작업 수행
     * @param type 버전 증가 유형
     */
    private bumpVersion;
    /**
     * package.json 경로 조회
     */
    private getPackageJsonPath;
    /**
     * package.json 파일 읽기
     * @param filePath package.json 파일 경로
     */
    private readPackageJson;
    /**
     * package.json 버전 업데이트
     * @param filePath package.json 파일 경로
     * @param newVersion 새 버전 문자열
     */
    private updatePackageJsonVersion;
    /**
     * 버전 문자열 파싱
     * @param version 버전 문자열 (x.y.z 형식)
     * @returns [major, minor, patch] 숫자 배열
     */
    private parseVersion;
}
