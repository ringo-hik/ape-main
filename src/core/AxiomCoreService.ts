/**
 * Axiom 코어 서비스
 * 
 * 모든 핵심 서비스를 통합하고 관리하는 중앙 서비스
 * 싱글톤 패턴으로 구현되어 전역적인 접근 제공
 */

import * as vscode from 'vscode';
import { EventEmitter } from 'events';

// 명령어 시스템
import { 
  CommandParserService, 
  CommandRegistryService, 
  CommandExecutorService 
} from './command';

// 설정 시스템
import { 
  ConfigLoaderService,
  ConfigValidatorService
} from './config';

// 플러그인 시스템
import { 
  PluginRegistryService 
} from './plugin-system';

// LLM 서비스
import { LlmService } from './llm';

// VS Code 서비스
import { VSCodeService } from './vscode';

// HTTP 클라이언트
import { HttpClientService } from './http';

// 프롬프트 시스템
import { 
  PromptAssemblerService,
  RulesEngineService
} from './prompt';

// 유틸리티
import { LoggerService } from './utils';

// 타입 임포트
import { Command } from '../types/CommandTypes';

/**
 * Axiom 코어 서비스 클래스
 * 모든 핵심 서비스 통합 및 관리
 */
export class AxiomCoreService extends EventEmitter {
  // 싱글톤 인스턴스
  private static _instance: AxiomCoreService;
  
  // 서비스 활성화 상태
  private _isEnabled: boolean = false;
  
  // 서비스 인스턴스
  private _configLoader: ConfigLoaderService;
  private _configValidator: ConfigValidatorService;
  private _commandParser: CommandParserService;
  private _commandRegistry: CommandRegistryService;
  private _commandExecutor: CommandExecutorService;
  private _pluginRegistry: PluginRegistryService;
  private _llmService: LlmService;
  private _vsCodeService: VSCodeService;
  private _httpService: HttpClientService;
  private _promptAssembler: PromptAssemblerService;
  private _rulesEngine: RulesEngineService;
  private _logger: LoggerService;
  
  /**
   * AxiomCoreService 생성자
   * 모든 서비스 초기화
   * @param context VS Code 확장 컨텍스트
   */
  private constructor(private context: vscode.ExtensionContext) {
    super();
    
    // 필수 서비스 초기화
    this._logger = new LoggerService();
    this._configLoader = new ConfigLoaderService();
    this._configValidator = new ConfigValidatorService(this._configLoader);
    this._commandParser = new CommandParserService();
    this._httpService = new HttpClientService();
    this._vsCodeService = new VSCodeService(context);
    
    // 플러그인 시스템 초기화
    this._pluginRegistry = new PluginRegistryService(this._configLoader);
    
    // 명령어 시스템 초기화
    this._commandRegistry = new CommandRegistryService(this._pluginRegistry);
    this._commandExecutor = new CommandExecutorService(
      this._commandRegistry,
      this._pluginRegistry
    );
    
    // LLM 서비스 초기화
    this._llmService = new LlmService();
    
    // 프롬프트 시스템 초기화
    this._rulesEngine = new RulesEngineService();
    this._promptAssembler = new PromptAssemblerService(this._rulesEngine);
  }
  
  /**
   * 싱글톤 인스턴스 반환
   * @param context VS Code 확장 컨텍스트 (최초 호출 시에만 필요)
   * @returns AxiomCoreService 인스턴스
   */
  public static getInstance(context?: vscode.ExtensionContext): AxiomCoreService {
    if (!AxiomCoreService._instance) {
      if (!context) {
        throw new Error('AxiomCoreService 초기화에 context가 필요합니다.');
      }
      AxiomCoreService._instance = new AxiomCoreService(context);
    }
    return AxiomCoreService._instance;
  }
  
  /**
   * 내부 플러그인 등록
   * @returns 등록된 플러그인 수
   */
  private async registerInternalPlugins(): Promise<number> {
    try {
      // 필요한 모듈 동적 임포트
      const { 
        GitPluginService,
        JiraPluginService,
        SwdpPluginService 
      } = await import('../plugins/internal');
      
      // 내부 플러그인 인스턴스 생성 및 등록
      let count = 0;
      
      // Git 플러그인 등록
      const gitPlugin = new GitPluginService(this._configLoader);
      if (this._pluginRegistry.registerPlugin(gitPlugin, 'internal')) {
        count++;
        this._logger.info(`내부 플러그인 등록: ${gitPlugin.name} (${gitPlugin.id})`);
      }
      
      // Jira 플러그인 등록
      const jiraPlugin = new JiraPluginService(this._configLoader);
      if (this._pluginRegistry.registerPlugin(jiraPlugin, 'internal')) {
        count++;
        this._logger.info(`내부 플러그인 등록: ${jiraPlugin.name} (${jiraPlugin.id})`);
      }
      
      // SWDP 플러그인 등록
      const swdpPlugin = new SwdpPluginService(this._configLoader);
      if (this._pluginRegistry.registerPlugin(swdpPlugin, 'internal')) {
        count++;
        this._logger.info(`내부 플러그인 등록: ${swdpPlugin.name} (${swdpPlugin.id})`);
      }
      
      return count;
    } catch (error) {
      this._logger.error('내부 플러그인 등록 중 오류 발생:', error);
      return 0;
    }
  }
  
  /**
   * 코어 서비스 초기화
   * 모든 하위 서비스 및 플러그인 초기화
   * @returns 초기화 성공 여부
   */
  public async initialize(): Promise<boolean> {
    try {
      // 설정 로드 및 검증
      const configValid = await this._configValidator.validateConfig();
      if (!configValid) {
        this._logger.error('설정 검증 실패');
        return false;
      }
      
      // SSL 우회 설정 확인 및 적용
      const sslBypassEnabled = this._configLoader.getCoreSetting('sslBypass') || false;
      this._httpService.setSSLBypass(sslBypassEnabled);
      
      // 내부 플러그인 등록
      const pluginCount = await this.registerInternalPlugins();
      this._logger.info(`${pluginCount}개의 내부 플러그인 등록 완료`);
      
      // 플러그인 초기화
      await this._pluginRegistry.initialize();
      
      // 서비스 활성화
      this._isEnabled = true;
      this.emit('core-initialized');
      this._logger.info('Axiom 코어 서비스 초기화 완료');
      
      return true;
    } catch (error) {
      this._logger.error('Axiom 코어 서비스 초기화 실패:', error);
      return false;
    }
  }
  
  /**
   * 사용자 메시지 처리
   * 명령어 파싱 및 실행
   * @param text 사용자 입력 텍스트
   * @returns 처리 결과
   */
  public async processMessage(text: string): Promise<any> {
    try {
      // 명령어 파싱
      const command = this._commandParser.parse(text);
      
      // 명령어인 경우 실행
      if (command) {
        return await this.executeCommand(command);
      }
      
      // 일반 텍스트는 LLM 응답 생성
      return await this.generateResponse(text);
    } catch (error) {
      this._logger.error('메시지 처리 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 명령어 실행
   * @param command 실행할 명령어
   * @returns 실행 결과
   */
  public async executeCommand(command: Command): Promise<any> {
    try {
      return await this._commandExecutor.execute(command);
    } catch (error) {
      this._logger.error(`명령어 실행 중 오류 발생 (${command.prefix}${command.agentId}:${command.command}):`, error);
      throw error;
    }
  }
  
  /**
   * LLM 응답 생성
   * @param text 사용자 입력 텍스트
   * @returns 생성된 응답
   */
  private async generateResponse(text: string): Promise<any> {
    try {
      // 프롬프트 어셈블러로 컨텍스트 주입
      const promptData = await this._promptAssembler.assemblePrompt(text);
      
      // LLM 서비스로 응답 생성
      const response = await this._llmService.sendRequest({
        model: this._llmService.getDefaultModelId(),
        messages: promptData.messages,
        temperature: promptData.temperature
      });
      
      return response;
    } catch (error) {
      this._logger.error('응답 생성 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 컨텍스트 정보 수집
   * @returns 컨텍스트 정보
   */
  public async collectContext(): Promise<any> {
    try {
      // VS Code 정보 수집
      const editorContext = await this._vsCodeService.getEditorContext();
      
      // 활성 플러그인 정보
      const pluginInfo = this._pluginRegistry.getEnabledPlugins().map(p => p.id);
      
      return {
        editor: editorContext,
        plugins: pluginInfo
      };
    } catch (error) {
      this._logger.error('컨텍스트 수집 중 오류 발생:', error);
      return {};
    }
  }
  
  // 서비스 인스턴스 접근자
  
  get configLoader(): ConfigLoaderService {
    return this._configLoader;
  }
  
  get commandRegistry(): CommandRegistryService {
    return this._commandRegistry;
  }
  
  get pluginRegistry(): PluginRegistryService {
    return this._pluginRegistry;
  }
  
  get llmService(): LlmService {
    return this._llmService;
  }
  
  get vsCodeService(): VSCodeService {
    return this._vsCodeService;
  }
  
  get httpService(): HttpClientService {
    return this._httpService;
  }
  
  get promptAssembler(): PromptAssemblerService {
    return this._promptAssembler;
  }
  
  get logger(): LoggerService {
    return this._logger;
  }
  
  /**
   * 서비스 활성화 여부
   * @returns 활성화 상태
   */
  public isEnabled(): boolean {
    return this._isEnabled;
  }
}