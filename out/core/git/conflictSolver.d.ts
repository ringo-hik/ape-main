/**
 * Git Conflict Solver
 *
 * Git 충돌을 자동으로 해결하는 고급 모듈
 */
import { LLMService } from '../llm/llmService';
/**
 * 충돌 해결 전략 유형
 */
export declare enum ConflictStrategy {
    AUTO = "auto",
    OURS = "ours",// 현재 브랜치 변경사항 선택
    THEIRS = "theirs",// 다른 브랜치 변경사항 선택
    MERGE = "merge",// 두 변경사항 병합
    LLM = "llm"
}
/**
 * 충돌 정보
 */
interface ConflictInfo {
    filePath: string;
    conflicts: {
        ours: string;
        theirs: string;
        marker: string;
        branch: string;
        startLine: number;
        endLine: number;
    }[];
}
/**
 * 병합 결과
 */
interface MergeResult {
    success: boolean;
    resolvedContent?: string;
    message?: string;
}
/**
 * Git 충돌 해결기
 */
export declare class ConflictSolver {
    private readonly llmService;
    private workspaceRoot;
    /**
     * 생성자
     */
    constructor(llmService: LLMService);
    /**
     * 현재 저장소의 충돌 파일 목록 가져오기
     */
    getConflictingFiles(): Promise<string[]>;
    /**
     * 지정된 전략으로 모든 충돌 해결
     */
    resolveAllConflicts(strategy?: ConflictStrategy): Promise<number>;
    /**
     * 단일 파일의 충돌 해결
     */
    resolveConflictsInFile(filePath: string, strategy?: ConflictStrategy): Promise<boolean>;
    /**
     * 충돌 정보 파싱
     */
    parseConflicts(filePath: string, content: string): ConflictInfo;
    /**
     * 충돌 내용 해결
     */
    private resolveContent;
    /**
     * 충돌에 가장 적합한 전략 결정
     */
    determineStrategy(conflict: ConflictInfo['conflicts'][0], fileType: string): ConflictStrategy;
    /**
     * 충돌 해결 전략 적용
     */
    applyStrategy(conflict: ConflictInfo['conflicts'][0], strategy: ConflictStrategy, fileType: string): Promise<MergeResult>;
    /**
     * 기본 병합 전략
     */
    private mergeChanges;
    /**
     * LLM 기반 지능형 병합
     */
    private llmBasedMerge;
}
export {};
