import * as vscode from 'vscode';
import { ModelId, ModelDisplayNames, ModelDescriptions } from '../../types/models';

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
export class ModelManager implements vscode.Disposable {
  // 현재 활성 모델
  private _activeModel: ModelId = ModelId.GPT_4_1_MINI;

  // 설정 업데이트 중인지 여부를 추적하는 플래그
  private _isUpdatingConfig: boolean = false;

  // 모델 변경 이벤트
  private _onDidChangeModel = new vscode.EventEmitter<ModelChangeEvent>();
  public readonly onDidChangeModel = this._onDidChangeModel.event;

  // 설정 변경 감지를 위한 구독
  private _configListener: vscode.Disposable;

  /**
   * 생성자
   * @param _context VSCode 확장 컨텍스트
   */
  constructor(private readonly _context: vscode.ExtensionContext) {
    // 초기 설정 로드
    this._loadConfiguration();

    // 설정 변경 이벤트 처리
    this._configListener = vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('ape.llm.defaultModel') && !this._isUpdatingConfig) {
        this._loadConfiguration();
      }
    });
  }

  /**
   * 설정에서 모델 정보 로드
   */
  private _loadConfiguration(): void {
    try {
      const config = vscode.workspace.getConfiguration('ape.llm');
      const configModel = config.get<string>('defaultModel', ModelId.GPT_4_1_MINI);

      // 유효한 모델인지 확인
      if (this._isValidModel(configModel)) {
        // 모델이 변경된 경우에만 이벤트 발생
        if (this._activeModel !== configModel) {
          const oldModel = this._activeModel;
          this._activeModel = configModel as ModelId;

          // 모델 변경 이벤트 발생
          this._onDidChangeModel.fire({
            oldModel,
            newModel: this._activeModel
          });
        }
      } else {
        console.warn(`유효하지 않은 모델: ${configModel}, 기본 모델 사용: ${ModelId.GPT_4_1_MINI}`);

        // 활성 모델이 이미 기본 모델이 아닌 경우에만 업데이트
        if (this._activeModel !== ModelId.GPT_4_1_MINI) {
          const oldModel = this._activeModel;
          this._activeModel = ModelId.GPT_4_1_MINI;

          // 설정 업데이트 플래그 설정
          this._isUpdatingConfig = true;

          // 설정 업데이트
          Promise.resolve(config.update('defaultModel', ModelId.GPT_4_1_MINI, vscode.ConfigurationTarget.Global))
            .then(() => {
              // 모델 변경 이벤트 발생
              this._onDidChangeModel.fire({
                oldModel,
                newModel: ModelId.GPT_4_1_MINI
              });
              console.log(`기본 모델로 설정 업데이트됨: ${ModelId.GPT_4_1_MINI}`);
            })
            .then(undefined, (err: Error) => {
              console.error('모델 설정 업데이트 실패:', err);
            })
            .finally(() => {
              // 설정 업데이트 플래그 해제 (지연 설정)
              setTimeout(() => {
                this._isUpdatingConfig = false;
              }, 100);
            });
        }
      }
    } catch (error) {
      console.error('모델 설정 로드 중 오류:', error);
    }
  }

  /**
   * 모델 ID가 유효한지 확인
   * @param modelId 확인할 모델 ID
   * @returns 유효한 모델인지 여부
   */
  private _isValidModel(modelId: string): boolean {
    // 표준 모델 확인
    const isStandardModel = Object.values(ModelId).includes(modelId as ModelId);
    return isStandardModel;
  }

  /**
   * 현재 활성 모델 가져오기
   * @returns 현재 활성 모델
   */
  public getActiveModel(): ModelId {
    return this._activeModel;
  }

  /**
   * 활성 모델 변경
   * @param model 사용할 새 모델
   * @returns 성공 여부를 나타내는 Promise
   */
  public async setActiveModel(model: ModelId): Promise<boolean> {
    // 현재 모델과 동일하거나 이미 설정 업데이트 중이면 무시
    if (this._activeModel === model || this._isUpdatingConfig) {
      return false;
    }

    // 유효한 모델인지 확인
    if (!this._isValidModel(model)) {
      console.warn(`유효하지 않은 모델: ${model}, 현재 모델 유지: ${this._activeModel}`);
      return false;
    }

    try {
      // 설정 업데이트 플래그 설정
      this._isUpdatingConfig = true;

      // 이전 모델 저장
      const oldModel = this._activeModel;

      // 활성 모델 업데이트
      this._activeModel = model;

      // 설정에 변경 사항 저장
      const config = vscode.workspace.getConfiguration('ape.llm');
      await config.update('defaultModel', model, vscode.ConfigurationTarget.Global);

      // 모델 변경 이벤트 발생
      this._onDidChangeModel.fire({
        oldModel,
        newModel: model
      });

      console.log(`모델이 변경됨: ${oldModel} -> ${model}`);
      return true;
    } catch (error) {
      console.error('모델 설정 업데이트 실패:', error);
      return false;
    } finally {
      // 설정 업데이트 플래그 해제 (지연 설정)
      setTimeout(() => {
        this._isUpdatingConfig = false;
      }, 100);
    }
  }

  /**
   * 모든 사용 가능한 모델 가져오기
   * @returns 사용 가능한 모델 배열
   */
  public getAvailableModels(): ModelId[] {
    try {
      // 설정에 정의된 모델 목록 확인
      const config = vscode.workspace.getConfiguration('ape.llm');
      // inspect 결과가 다양한 형태일 수 있으므로 안전하게 처리
      const inspection = config.inspect('defaultModel');
      const configModels = inspection && typeof inspection === 'object' ?
        (inspection as any).properties?.enum : undefined;

      // 설정에 정의된 모델 배열이 있으면 사용
      if (configModels && Array.isArray(configModels)) {
        // 내부망 모델 참조 제거
        return configModels.filter(model =>
          model !== 'NARRNAS' &&
          model !== 'LLAMA4-SCOUT' &&
          model !== 'LLAMA4-MAVERICK') as ModelId[];
      }

      // 표준 모델 반환 (내부망 모델 제외)
      return Object.values(ModelId);
    } catch (error) {
      // 오류 발생 시 기본 모델 목록만 반환
      console.error('사용 가능한 모델 가져오기 오류:', error);
      return Object.values(ModelId);
    }
  }

  /**
   * 모델 선택 명령어 등록 - 명령어는 CommandManager를 사용합니다
   * @deprecated 이 메서드는 더 이상 사용되지 않으며, 명령어 등록은 CommandManager에서 담당합니다.
   *
   * 참고: 이 메서드를 호출하면 아무 동작도 하지 않습니다.
   * extension.ts에서는 commandManager.registerCommands()만 호출합니다.
   */
  public registerCommands(): void {
    console.log('경고: ModelManager.registerCommands()는 비활성화되었습니다. CommandManager를 사용하세요.');
    // 아무 동작도 하지 않음
  }

  /**
   * 모델 ID를 표시 이름으로 변환
   * @param modelId 모델 ID
   * @returns 사용자 친화적인 모델 표시 이름
   */
  public getModelDisplayName(modelId: string): string {
    // ModelDisplayNames에서 모델 표시 이름 가져오기 시도
    if (Object.values(ModelId).includes(modelId as ModelId)) {
      return ModelDisplayNames[modelId as ModelId];
    }

    // 기존 하드코딩된 매핑 방식 사용 (이전 버전과의 호환성 유지)
    switch(modelId) {
      case 'openai/gpt-4.1-mini':
        return 'GPT-4.1 Mini';
      case 'anthropic/claude-3-haiku-20240307':
        return 'Claude 3 Haiku';
      case 'anthropic/claude-3-sonnet-20240229':
        return 'Claude 3 Sonnet';
      case 'perplexity/sonar-small-online':
        return 'Perplexity Sonar';
      case 'mistralai/mistral-large-latest':
        return 'Mistral Large';
      case 'google/gemma-7b-it':
        return 'Gemma 7B';
      default: {
        // 'provider/model-name' 형식에서 이름 추출
        const parts = modelId.split('/');
        if (parts.length > 1) {
          // 더 읽기 쉬운 형식으로 모델 이름 변환
          const modelName = parts[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          return modelName;
        }
        return modelId;
      }
    }
  }

  /**
   * 모델에 대한 설명 가져오기
   * @param model 모델 이름
   * @returns 모델 설명
   */
  public getModelDescription(model: string): string {
    // ModelDescriptions에서 모델 설명 가져오기 시도
    if (Object.values(ModelId).includes(model as ModelId)) {
      return ModelDescriptions[model as ModelId];
    }

    // 기존 하드코딩된 매핑 방식 사용 (이전 버전과의 호환성 유지)
    switch (model) {
      case 'openai/gpt-4.1-mini':
        return '균형 잡힌 성능과 속도 (기본 모델)';
      case 'anthropic/claude-3-haiku-20240307':
        return '빠른 응답이 필요한 작업에 최적화';
      case 'anthropic/claude-3-sonnet-20240229':
        return '높은 품질과 효율적인 성능의 균형';
      case 'anthropic/claude-3-opus-20240229':
        return '최고 수준의 추론 및 복잡한 작업 처리';
      case 'google/gemini-pro':
        return 'Google의 고급 멀티모달 모델';
      case 'google/gemma-7b-it':
        return '경량 오픈소스 모델, 낮은 지연 시간';
      default:
        return '';
    }
  }

  /**
   * 리소스 해제
   */
  public dispose(): void {
    // 이벤트 핸들러 해제
    this._onDidChangeModel.dispose();

    // 설정 변경 리스너 해제
    this._configListener.dispose();
  }
}