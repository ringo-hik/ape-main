/**
 * APE Rules 서비스
 *
 * Rules 파일을 관리하고 LLM 시스템 프롬프트에 적용하는 서비스입니다.
 * Rules 생성, 삭제, 활성화/비활성화 기능을 제공합니다.
 */
import * as vscode from 'vscode';
import { ServiceConfigManager } from './serviceConfig';
/**
 * Rule 항목 상태
 */
export declare enum RuleStatus {
    Active = "active",
    Inactive = "inactive"
}
/**
 * Rule 항목 인터페이스
 */
export interface Rule {
    id: string;
    name: string;
    filePath: string;
    content: string;
    status: RuleStatus;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Rules 서비스 클래스
 */
export declare class RulesService implements vscode.Disposable {
    private readonly context;
    private readonly configManager?;
    private _onDidChangeRules;
    readonly onDidChangeRules: vscode.Event<void>;
    private rules;
    private disposables;
    private rulesDir;
    /**
     * 생성자
     * @param context VSCode 확장 컨텍스트
     * @param configManager 서비스 설정 관리자 (옵션)
     */
    constructor(context: vscode.ExtensionContext, configManager?: ServiceConfigManager | undefined);
    /**
     * Rules 디렉토리 확인 및 생성
     */
    private ensureRulesDir;
    /**
     * 모든 Rules 로드
     */
    loadAllRules(): Promise<void>;
    /**
     * 파일 내용에서 이름 추출 (첫 번째 제목 사용)
     * @param content 파일 내용
     */
    private extractNameFromContent;
    /**
     * 모든 Rules 가져오기
     */
    getAllRules(): Rule[];
    /**
     * 활성화된 Rules 가져오기
     */
    getActiveRules(): Rule[];
    /**
     * ID로 Rule 가져오기
     * @param id Rule ID
     */
    getRuleById(id: string): Rule | undefined;
    /**
     * Rule 생성
     * @param name Rule 이름
     * @param content Rule 내용
     * @param activate 생성 후 활성화 여부
     */
    createRule(name: string, content: string, activate?: boolean): Promise<Rule>;
    /**
     * Rule 업데이트
     * @param id Rule ID
     * @param updates 업데이트할 필드
     */
    updateRule(id: string, updates: Partial<Pick<Rule, 'name' | 'content'>>): Promise<Rule>;
    /**
     * Rule 삭제
     * @param id Rule ID
     */
    deleteRule(id: string): Promise<boolean>;
    /**
     * Rule 활성화
     * @param id Rule ID
     */
    activateRule(id: string): Promise<boolean>;
    /**
     * Rule 비활성화
     * @param id Rule ID
     */
    deactivateRule(id: string): Promise<boolean>;
    /**
     * Rules 파일 열기
     * @param id Rule ID
     */
    openRuleFile(id: string): Promise<boolean>;
    /**
     * Rules를 LLM 시스템 프롬프트로 변환
     */
    getRulesAsSystemPrompt(): string;
    /**
     * 리소스 해제
     */
    dispose(): void;
}
