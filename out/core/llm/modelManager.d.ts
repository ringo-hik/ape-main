import * as vscode from 'vscode';
import { LLMModel } from '../../types/chat';
/**
 * 모델 변경 이벤트 인터페이스
 */
export interface ModelChangeEvent {
    oldModel: string;
    newModel: string;
}
/**
 * 모델 관리 서비스
 * LLM 모델 설정, 검색 및 이벤트 관리를 담당합니다.
 */
export declare class ModelManager implements vscode.Disposable {
    private readonly _context;
    private _activeModel;
    private _isUpdatingConfig;
    private _onDidChangeModel;
    readonly onDidChangeModel: vscode.Event<ModelChangeEvent>;
    private _configListener;
    /**
     * 생성자
     * @param _context VSCode 확장 컨텍스트
     */
    constructor(_context: vscode.ExtensionContext);
    /**
     * 설정에서 모델 정보 로드
     */
    private _loadConfiguration;
    /**
     * 모델 ID가 유효한지 확인
     * @param modelId 확인할 모델 ID
     * @returns 유효한 모델인지 여부
     */
    private _isValidModel;
    /**
     * 현재 활성 모델 가져오기
     * @returns 현재 활성 모델
     */
    getActiveModel(): LLMModel;
    /**
     * 활성 모델 변경
     * @param model 사용할 새 모델
     * @returns 성공 여부를 나타내는 Promise
     */
    setActiveModel(model: LLMModel): Promise<boolean>;
    /**
     * 모든 사용 가능한 모델 가져오기
     * @returns 사용 가능한 모델 배열
     */
    getAvailableModels(): LLMModel[];
    /**
     * 모델 선택 명령어 등록 - 명령어는 CommandManager를 사용합니다
     * @deprecated 이 메서드는 더 이상 사용되지 않으며, 명령어 등록은 CommandManager에서 담당합니다.
     *
     * 참고: 이 메서드를 호출하면 아무 동작도 하지 않습니다.
     * extension.ts에서는 commandManager.registerCommands()만 호출합니다.
     */
    registerCommands(): void;
    /**
     * 모델 ID를 표시 이름으로 변환
     * @param modelId 모델 ID
     * @returns 사용자 친화적인 모델 표시 이름
     */
    getModelDisplayName(modelId: string): string;
    /**
     * 모델에 대한 설명 가져오기
     * @param model 모델 이름
     * @returns 모델 설명
     */
    getModelDescription(model: string): string;
    /**
     * 리소스 해제
     */
    dispose(): void;
}
