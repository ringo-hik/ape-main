/**
 * 슬래시 커맨드 매니저
 * 
 * 채팅 인터페이스에서 슬래시(/)로 시작하는 명령어를 처리하는 시스템
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { SlashCommand, CommandSuggestion, BilingualCommand } from './slashCommand';
import { createDefaultCommands } from './defaultCommands';
import { 
  generateHelpHtml, 
  generateCommandDetailHtml, 
  generateFaqHtml, 
  generateGuideHtml, 
  generateGuidesListHtml,
  generateSmartHelpHtml,
  generateToolsHelpHtml,
  setExtensionContext
} from './helpRenderer';
import { LLMService } from '../llm/llmService';

/**
 * 슬래시 커맨드 매니저 클래스
 */
export class SlashCommandManager {
  // 등록된 명령어 목록
  private readonly commands: Map<string, SlashCommand> = new Map();

  // 명령어 별칭 맵
  private readonly aliasMap: Map<string, string> = new Map();

  // 한국어 명령어 맵 (한국어 명령어 -> 영어 명령어 이름)
  private readonly koreanCommandMap: Map<string, string> = new Map();

  // 의도 기반 매핑 (통합된 intentMap)
  private readonly intentMap: Record<string, string> = {};

  // 이벤트 이미터
  private readonly _onDidSuggestCommands = new vscode.EventEmitter<CommandSuggestion[]>();

  /**
   * 명령어 제안 이벤트
   */
  public readonly onDidSuggestCommands = this._onDidSuggestCommands.event;

  /**
   * 생성자
   */
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly llmService?: LLMService,
    private readonly services?: any
  ) {
    // 확장 컨텍스트 설정 (도움말 렌더러에 전달)
    setExtensionContext();
    
    // 기본 명령어 등록
    this.registerDefaultCommands();

    // 명령어 등록
    this.registerVSCodeCommands();
  }

  /**
   * 기본 명령어 등록
   */
  private registerDefaultCommands(): void {
    createDefaultCommands(this.services).forEach(command => {
      this.registerCommand(command);
    });
  }

  /**
   * VS Code 명령어 등록 - 중복 명령 체크 추가
   */
  private registerVSCodeCommands(): void {
    try {
      // 명령어가 이미 등록되어 있는지 확인하는 안전한 명령어 등록 함수
      const safeRegisterCommand = async (commandId: string, handler: (...args: any[]) => any): Promise<vscode.Disposable> => {
        try {
          // 먼저 기존 명령이 있는지 확인
          const commands = await vscode.commands.getCommands(true);

          if (!commands.includes(commandId)) {
            // 명령이 없으면 등록
            return vscode.commands.registerCommand(commandId, handler);
          } else {
            console.log(`명령 '${commandId}'는 이미 등록되어 있어 건너뜁니다.`);
            return { dispose: () => {} }; // 더미 disposable 반환
          }
        } catch (error: any) {
          console.error(`명령 조회 중 오류 발생: ${error}`);
          return { dispose: () => {} };
        }
      };

      // 비동기로 명령어 등록
      (async () => {
        try {
          // 도움말 명령어
          const helpCommandDisposable = await safeRegisterCommand('ape.showCommandHelp', () => {
            vscode.commands.executeCommand('workbench.action.quickOpen', '/help ');
          });

          this.context.subscriptions.push(helpCommandDisposable);
        } catch (error) {
          console.error('명령어 등록 중 오류 발생:', error);
        }
      })();
    } catch (error) {
      console.error('VS Code 명령어 등록 중 오류 발생:', error);
    }
  }

  /**
   * 명령어 등록
   */
  public registerCommand(command: SlashCommand): void {
    // 기본 명령어 등록
    this.commands.set(command.name, command);

    // 별칭 등록
    if (command.aliases) {
      command.aliases.forEach(alias => {
        this.aliasMap.set(alias, command.name);
      });
    }
    
    // BilingualCommand인 경우 한국어 지원 등록
    if (this.isBilingualCommand(command)) {
      this.registerBilingualCommand(command as BilingualCommand);
    }
  }
  
  /**
   * 이중 언어 명령어 등록
   * BilingualCommand 인터페이스로 정의된 명령어에 대한 한국어 지원을 등록합니다.
   */
  private registerBilingualCommand(command: BilingualCommand): void {
    // 한국어 기본 명령어 등록 (있는 경우)
    if (command.koreanName) {
      this.koreanCommandMap.set(command.koreanName, command.name);
      
      // 의도 맵에도 추가
      this.intentMap[command.koreanName] = command.name;
    }
    
    // 한국어 별칭 등록
    if (command.koreanAliases) {
      command.koreanAliases.forEach(alias => {
        this.koreanCommandMap.set(alias, command.name);
        
        // 의도 맵에도 추가
        this.intentMap[alias] = command.name;
      });
    }
    
    // 의도 매핑 등록 (있는 경우)
    if (command.intentMap) {
      // 명령어가 제공하는 의도 맵 병합
      Object.entries(command.intentMap).forEach(([intent, cmd]) => {
        this.intentMap[intent] = cmd;
      });
    }
  }
  
  /**
   * 명령어가 BilingualCommand 인터페이스를 구현하는지 확인
   */
  private isBilingualCommand(command: SlashCommand): boolean {
    return (
      'koreanName' in command || 
      'koreanAliases' in command || 
      'koreanDescription' in command ||
      'koreanExamples' in command ||
      'intentMap' in command
    );
  }

  /**
   * 모든 명령어 가져오기
   */
  public getAllCommands(): SlashCommand[] {
    return Array.from(this.commands.values());
  }

  /**
   * 특정 명령어 가져오기
   */
  public getCommand(name: string): SlashCommand | undefined {
    // 직접 명령어 이름으로 찾기
    if (this.commands.has(name)) {
      return this.commands.get(name);
    }

    // 별칭으로 찾기
    const originalName = this.aliasMap.get(name);
    if (originalName) {
      return this.commands.get(originalName);
    }

    return undefined;
  }
  
  /**
   * 유사 명령어 찾기
   * 
   * 레벤슈타인 거리 알고리즘을 사용하여 입력된 명령어와 가장 유사한 명령어를 찾습니다.
   * @param name 입력된 명령어 이름
   * @param maxDistance 최대 허용 거리 (기본값: 2)
   * @returns 가장 유사한 명령어 목록 (거리 오름차순)
   */
  public findSimilarCommands(name: string, maxDistance: number = 2): Array<{command: SlashCommand, distance: number}> {
    const result: Array<{command: SlashCommand, distance: number}> = [];
    
    // 모든 명령어 및 별칭과 비교
    for (const command of this.getAllCommands()) {
      // 메인 명령어 비교
      const distance = this.levenshteinDistance(name, command.name);
      if (distance <= maxDistance) {
        result.push({ command, distance });
      }
      
      // 별칭 비교
      if (command.aliases) {
        for (const alias of command.aliases) {
          const aliasDistance = this.levenshteinDistance(name, alias);
          if (aliasDistance <= maxDistance && aliasDistance < distance) {
            // 별칭이 더 유사하면 기존 항목 대체
            const existing = result.findIndex(r => r.command === command);
            if (existing >= 0) {
              result[existing].distance = aliasDistance;
            } else {
              result.push({ command, distance: aliasDistance });
            }
          }
        }
      }
    }
    
    // 거리 기준 정렬 (가장 유사한 것부터)
    return result.sort((a, b) => a.distance - b.distance);
  }
  
  /**
   * 레벤슈타인 거리 계산
   * 
   * 두 문자열 간의 편집 거리를 계산합니다. 값이 작을수록 문자열이 유사합니다.
   * @param a 첫 번째 문자열
   * @param b 두 번째 문자열
   * @returns 편집 거리
   */
  private levenshteinDistance(a: string, b: string): number {
    // 공백 제거 및 소문자 변환
    a = a.toLowerCase().trim();
    b = b.toLowerCase().trim();
    
    if (a === b) return 0;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    
    // 매트릭스 생성
    const matrix: number[][] = Array(a.length + 1).fill(null).map(() => 
      Array(b.length + 1).fill(null)
    );
    
    // 첫 행과 열 초기화
    for (let i = 0; i <= a.length; i++) {
      matrix[i][0] = i;
    }
    
    for (let j = 0; j <= b.length; j++) {
      matrix[0][j] = j;
    }
    
    // 행렬 채우기
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // 삭제
          matrix[i][j - 1] + 1,      // 삽입
          matrix[i - 1][j - 1] + cost // 대체
        );
      }
    }
    
    return matrix[a.length][b.length];
  }

  /**
   * 한글 의도 기반 명령어 매칭 (개선된 버전)
   * 
   * 한글로 된 자연어 입력을 의도에 맞는 명령어로 매핑합니다.
   * 자연어 이해 기능으로 사용자 의도에 맞는 명령어를 찾아냅니다.
   * @param input 사용자 입력 (슬래시 포함)
   * @returns 매칭된 명령어 또는 undefined
   */
  private matchCommandByIntent(input: string): SlashCommand | undefined {
    // 의도 문구와 명령어 이름 매핑
    const intentMap: Record<string, string> = {
      // 도움말 관련
      '뭐해야해': 'help',           // 뭐 해야 할지 모르겠음 → 도움말
      '뭐부터해야해': 'help',        // 무엇부터 해야할지 → 도움말 
      '도와줘': 'help',             // 도와줘 → 도움말
      '명령어': 'help',             // 명령어 확인 → 도움말
      '어떻게': 'help',             // 어떻게 사용하지 → 도움말
      '사용법': 'help',             // 사용법 → 도움말
      '기능': 'help',               // 기능 → 도움말
      '메뉴': 'help',               // 메뉴 → 도움말
      '도움': 'help',               // 도움 → 도움말
      '안내': 'help',               // 안내 → 도움말
      '사용방법': 'help',           // 사용 방법 → 도움말
      '기능목록': 'help',           // 기능 목록 → 도움말
      '설명서': 'help',             // 설명서 → 도움말
      '가이드': 'help',             // 가이드 → 도움말
      '튜토리얼': 'help',           // 튜토리얼 → 도움말
      '도움말': 'help',             // 도움말 → 도움말
      '어떻게사용': 'help',         // 어떻게 사용 → 도움말
      '사용방식': 'help',           // 사용 방식 → 도움말
      '시작하기': 'help',           // 시작하기 → 도움말
      '힌트': 'help',               // 힌트 → 도움말
      '도움주세요': 'help',         // 도움 주세요 → 도움말 (신규)
      '사용법알려줘': 'help',       // 사용법 알려줘 → 도움말 (신규)
      '어떻게쓰는거야': 'help',     // 어떻게 쓰는거야 → 도움말 (신규)
      '어떻게작동해': 'help',       // 어떻게 작동해 → 도움말 (신규)
      '사용설명': 'help',           // 사용 설명 → 도움말 (신규)
      
      // 메모리 관련
      '기억해': 'memory',           // 기억해 → 메모리 저장
      '저장해': 'memory',           // 저장해 → 메모리 저장
      '메모': 'memory',             // 메모 → 메모리 저장
      '노트': 'memory',             // 노트 → 메모리 저장
      '기록': 'memory',             // 기록 → 메모리 저장
      '메모리': 'memory',           // 메모리 → 메모리 저장
      '내용저장': 'memory',         // 내용 저장 → 메모리 저장
      '기록저장': 'memory',         // 기록 저장 → 메모리 저장
      '적어둬': 'memory',           // 적어둬 → 메모리 저장
      '메모장': 'memory',           // 메모장 → 메모리 저장
      '저장소': 'memory',           // 저장소 → 메모리 저장
      '북마크': 'memory',           // 북마크 → 메모리 저장
      '메모해줘': 'memory',         // 메모해줘 → 메모리 저장
      '기억': 'memory',             // 기억 → 메모리 저장
      '저장': 'memory',             // 저장 → 메모리 저장
      '메모저장': 'memory',         // 메모 저장 → 메모리 저장
      
      // VAULT 관련 (볼트 시스템)
      '볼트': 'vault',                  // 볼트 → vault
      '금고': 'vault',                  // 금고 → vault
      '컨텍스트': 'vault',              // 컨텍스트 → vault
      '문맥': 'vault',                  // 문맥 → vault
      '자료저장소': 'vault',            // 자료저장소 → vault
      '자료보관': 'vault',              // 자료보관 → vault
      '볼트저장': 'vault save',         // 볼트저장 → vault save
      '볼트목록': 'vault list',         // 볼트목록 → vault list
      '볼트조회': 'vault list',         // 볼트조회 → vault list
      '볼트내용': 'vault show',         // 볼트내용 → vault show
      '컨텍스트저장': 'vault save',     // 컨텍스트저장 → vault save
      '볼트검색': 'vault search',       // 볼트검색 → vault search
      '볼트찾기': 'vault search',       // 볼트찾기 → vault search
      '컨텍스트찾기': 'vault search',   // 컨텍스트찾기 → vault search
      '볼트생성': 'vault create',       // 볼트생성 → vault create
      '볼트만들기': 'vault create',     // 볼트만들기 → vault create
      '컨텍스트생성': 'vault create',   // 컨텍스트생성 → vault create
      '볼트삭제': 'vault delete',       // 볼트삭제 → vault delete
      '볼트지우기': 'vault delete',     // 볼트지우기 → vault delete
      '컨텍스트삭제': 'vault delete',   // 컨텍스트삭제 → vault delete
      '볼트사용': 'vault use',          // 볼트사용 → vault use
      '볼트가져오기': 'vault use',      // 볼트가져오기 → vault use
      '컨텍스트사용': 'vault use',      // 컨텍스트사용 → vault use
      
      // Git 관련
      '깃상태': 'git status',       // 깃 상태 → git status
      '깃': 'git status',           // 깃 → git status
      '깃커밋': 'git commit',       // 깃 커밋 → git commit
      '커밋': 'git commit',         // 커밋 → git commit
      '푸시': 'git push',           // 푸시 → git push
      '풀': 'git pull',             // 풀 → git pull
      '충돌': 'git solve',          // 충돌 → git solve
      '자동커밋': 'git auto',        // 자동커밋 → git auto
      '변경사항': 'git status',     // 변경사항 → git status
      '깃상황': 'git status',       // 깃 상황 → git status
      '깃저장': 'git commit',       // 깃 저장 → git commit
      '깃푸시': 'git push',         // 깃 푸시 → git push
      '깃풀': 'git pull',           // 깃 풀 → git pull
      '깃충돌': 'git solve',        // 깃 충돌 → git solve
      '깃원격': 'git push',         // 깃 원격 → git push
      '깃합치기': 'git merge',      // 깃 합치기 → git merge
      '깃브랜치': 'git branch',     // 깃 브랜치 → git branch
      '깃전환': 'git checkout',     // 깃 전환 → git checkout
      '깃이력': 'git log',          // 깃 이력 → git log
      '깃로그': 'git log',          // 깃 로그 → git log
      '깃버전': 'git log',          // 깃 버전 → git log
      '깃스테이지': 'git add',      // 깃 스테이지 → git add
      '깃추가': 'git add',          // 깃 추가 → git add
      '깃상태알려줘': 'git status', // 깃 상태 알려줘 → git status (신규)
      '깃상태확인': 'git status',   // 깃 상태 확인 → git status (신규)
      '변경확인': 'git status',     // 변경 확인 → git status (신규)
      '코드커밋': 'git commit',     // 코드 커밋 → git commit (신규)
      '변경저장': 'git commit',     // 변경 저장 → git commit (신규)
      '코드저장': 'git commit',     // 코드 저장 → git commit (신규)
      '브랜치확인': 'git branch',   // 브랜치 확인 → git branch (신규)
      '브랜치목록': 'git branch',   // 브랜치 목록 → git branch (신규)
      '머지충돌': 'git solve',      // 머지 충돌 → git solve (신규)
      '원격저장소업데이트': 'git push', // 원격 저장소 업데이트 → git push (신규)
      
      // 파일 관련
      '파일열어': 'open',           // 파일 열기 → open
      '열기': 'open',               // 열기 → open
      '파일': 'open',               // 파일 → open
      '코드열어': 'open',           // 코드 열기 → open
      '파일오픈': 'open',           // 파일 오픈 → open
      '파일보기': 'open',           // 파일 보기 → open
      '소스열기': 'open',           // 소스 열기 → open
      '문서열기': 'open',           // 문서 열기 → open
      '코드파일': 'open',           // 코드 파일 → open
      '열어줘': 'open',             // 열어줘 → open
      '파일내용': 'open',           // 파일 내용 → open
      '파일내용보기': 'open',       // 파일 내용 보기 → open
      '코드파일열기': 'open',       // 코드 파일 열기 → open
      '파일경로': 'open',           // 파일 경로 → open
      '경로열기': 'open',           // 경로 열기 → open
      '이파일열어줘': 'open',       // 이 파일 열어줘 → open (신규)
      '소스코드열기': 'open',       // 소스코드 열기 → open (신규)
      '코드내용보기': 'open',       // 코드 내용 보기 → open (신규)
      '파일열어볼래': 'open',       // 파일 열어볼래 → open (신규)
      '파일보여줘': 'open',         // 파일 보여줘 → open (신규)
      '문서보여줘': 'open',         // 문서 보여줘 → open (신규)
      '소스보여줘': 'open',         // 소스 보여줘 → open (신규)
      
      // 실행 관련
      '실행해': 'execute',          // 실행해 → execute
      '실행': 'execute',            // 실행 → execute
      '돌려': 'execute',            // 돌려 → execute
      '코드실행': 'execute',        // 코드 실행 → execute
      '구동': 'execute',            // 구동 → execute
      '실행시켜': 'execute',        // 실행시켜 → execute
      '돌려봐': 'execute',          // 돌려봐 → execute
      '실행해봐': 'execute',        // 실행해봐 → execute
      '실행해줘': 'execute',        // 실행해줘 → execute
      '코드돌려': 'execute',        // 코드 돌려 → execute
      '코드구동': 'execute',        // 코드 구동 → execute
      '스크립트실행': 'execute',    // 스크립트 실행 → execute
      '명령실행': 'execute',        // 명령 실행 → execute
      '명령어실행': 'execute',      // 명령어 실행 → execute
      
      // 분석 관련
      '분석해': 'analyze',          // 분석해 → analyze
      '분석': 'analyze',            // 분석 → analyze
      '코드분석': 'analyze',        // 코드분석 → analyze
      '검토': 'analyze',            // 검토 → analyze
      '리뷰': 'analyze',            // 리뷰 → analyze
      '코드리뷰': 'analyze',        // 코드리뷰 → analyze
      '코드검토': 'analyze',        // 코드 검토 → analyze
      '분석하기': 'analyze',        // 분석하기 → analyze
      '살펴봐': 'analyze',          // 살펴봐 → analyze
      '파악해': 'analyze',          // 파악해 → analyze
      '이해': 'analyze',            // 이해 → analyze
      '코드이해': 'analyze',        // 코드 이해 → analyze
      '코드파악': 'analyze',        // 코드 파악 → analyze
      '분석해봐': 'analyze',        // 분석해봐 → analyze
      '분석해줘': 'analyze',        // 분석해줘 → analyze
      '검토해줘': 'analyze',        // 검토해줘 → analyze
      '리뷰해줘': 'analyze',        // 리뷰해줘 → analyze
      '코드진단': 'analyze',        // 코드 진단 → analyze
      '진단': 'analyze',            // 진단 → analyze
      '코드리뷰해줘': 'analyze',    // 코드 리뷰해줘 → analyze (신규)
      '코드개선': 'analyze',        // 코드 개선 → analyze (신규)
      '코드품질': 'analyze',        // 코드 품질 → analyze (신규)
      '코드평가': 'analyze',        // 코드 평가 → analyze (신규)
      '코드분석해줘': 'analyze',    // 코드 분석해줘 → analyze (신규)
      '이코드어때': 'analyze',      // 이 코드 어때 → analyze (신규)
      '코드문제': 'analyze',        // 코드 문제 → analyze (신규)
      '버그분석': 'analyze',        // 버그 분석 → analyze (신규)
      '코드최적화': 'analyze',      // 코드 최적화 → analyze (신규)
      '성능분석': 'analyze',        // 성능 분석 → analyze (신규)
      
      // 설정 및 모델 관련
      '모델바꿔': 'model',          // 모델 변경 → model
      '모델': 'model',              // 모델 → model
      '설정해': 'settings',         // 설정 변경 → settings
      '설정': 'settings',           // 설정 → settings
      '환경설정': 'settings',       // 환경설정 → settings
      '옵션': 'settings',           // 옵션 → settings
      '모델변경': 'model',          // 모델 변경 → model
      '모델목록': 'model list',     // 모델 목록 → model list
      '설정변경': 'settings',       // 설정 변경 → settings
      '모델선택': 'model',          // 모델 선택 → model
      '에이아이변경': 'model',      // AI 변경 → model
      '모델교체': 'model',          // 모델 교체 → model
      '모델전환': 'model',          // 모델 전환 → model
      '설정보기': 'settings',       // 설정 보기 → settings
      '옵션변경': 'settings',       // 옵션 변경 → settings
      '옵션보기': 'settings',       // 옵션 보기 → settings
      '설정메뉴': 'settings',       // 설정 메뉴 → settings
      '환경': 'settings',           // 환경 → settings
      '모델종류': 'model list',     // 모델 종류 → model list
      '모델타입': 'model list',     // 모델 타입 → model list
      '모델확인': 'model',          // 모델 확인 → model
      
      // 검색 관련
      '검색해': 'search',           // 검색해 → search
      '검색': 'search',             // 검색 → search
      '찾아': 'search',             // 찾아 → search
      '찾기': 'search',             // 찾기 → search
      '찾아줘': 'search',           // 찾아줘 → search
      '코드검색': 'search',         // 코드 검색 → search
      '검색하기': 'search',         // 검색하기 → search
      '내용찾기': 'search',         // 내용 찾기 → search
      '검색해줘': 'search',         // 검색해줘 → search
      '코드찾기': 'search',         // 코드 찾기 → search
      '파일검색': 'search',         // 파일 검색 → search
      '파일찾기': 'search',         // 파일 찾기 → search
      '키워드검색': 'search',       // 키워드 검색 → search
      '텍스트검색': 'search',       // 텍스트 검색 → search
      '문자검색': 'search',         // 문자 검색 → search
      '검색어': 'search',           // 검색어 → search
      '문자열검색': 'search',       // 문자열 검색 → search
      '찾아보기': 'search',         // 찾아보기 → search
      
      // 상태 및 기타
      '지금뭐해': 'status',         // 지금 뭐해 → status
      '상태': 'status',             // 상태 → status
      '초기화': 'clear',            // 초기화 → clear
      '지워': 'clear',              // 지워 → clear
      '새로고침': 'clear',          // 새로고침 → clear
      '시스템상태': 'status',       // 시스템 상태 → status
      '현재상태': 'status',         // 현재 상태 → status
      '뭐하고있어': 'status',       // 뭐하고 있어 → status
      '채팅지우기': 'clear',        // 채팅 지우기 → clear
      '내용지우기': 'clear',        // 내용 지우기 → clear
      '다시시작': 'clear',          // 다시 시작 → clear
      '상태확인': 'status',         // 상태 확인 → status
      '시스템확인': 'status',       // 시스템 확인 → status
      '상태보기': 'status',         // 상태 보기 → status
      '작업현황': 'status',         // 작업 현황 → status
      '진행현황': 'status',         // 진행 현황 → status
      '지금상태': 'status',         // 지금 상태 → status
      '비우기': 'clear',            // 비우기 → clear
      '삭제': 'clear',              // 삭제 → clear
      '내용삭제': 'clear',          // 내용 삭제 → clear
      '전체삭제': 'clear',          // 전체 삭제 → clear
      '재시작': 'clear',            // 재시작 → clear
      '처음부터': 'clear',          // 처음부터 → clear
      
      // JIRA 관련
      '지라': 'jira',               // 지라 → jira
      '지라이슈': 'jira issue',     // 지라 이슈 → jira issue
      '이슈': 'jira issue',         // 이슈 → jira issue
      '지라검색': 'jira search',    // 지라 검색 → jira search
      '지라목록': 'jira list',      // 지라 목록 → jira list
      '지라상태': 'jira status',    // 지라 상태 → jira status
      '지라업데이트': 'jira update',// 지라 업데이트 → jira update
      '지라생성': 'jira create',    // 지라 생성 → jira create
      '이슈생성': 'jira create',    // 이슈 생성 → jira create
      '지라정보': 'jira info',      // 지라 정보 → jira info
      
      // Todo 관련
      '할일': 'todo',               // 할일 → todo
      '투두': 'todo',               // 투두 → todo
      '태스크': 'todo',             // 태스크 → todo
      '작업': 'todo',               // 작업 → todo
      '할일추가': 'todo add',       // 할일 추가 → todo add
      '할일목록': 'todo list',      // 할일 목록 → todo list
      '투두목록': 'todo list',      // 투두 목록 → todo list
      '태스크목록': 'todo list',    // 태스크 목록 → todo list
      '작업목록': 'todo list',      // 작업 목록 → todo list
      '할일관리': 'todo',           // 할일 관리 → todo
      '투두관리': 'todo',           // 투두 관리 → todo
      '태스크관리': 'todo',         // 태스크 관리 → todo
      '작업관리': 'todo',           // 작업 관리 → todo
      '할일추가하기': 'todo add',   // 할일 추가하기 → todo add (신규)
      '할일등록': 'todo add',       // 할일 등록 → todo add (신규)
      '태스크등록': 'todo add',     // 태스크 등록 → todo add (신규)
      '작업등록': 'todo add',       // 작업 등록 → todo add (신규)
      '할일삭제': 'todo delete',    // 할일 삭제 → todo delete (신규)
      '태스크삭제': 'todo delete',  // 태스크 삭제 → todo delete (신규)
      '작업삭제': 'todo delete',    // 작업 삭제 → todo delete (신규)
      '작업상태': 'todo status',    // 작업 상태 → todo status (신규)
      '할일상태': 'todo status',    // 할일 상태 → todo status (신규)
      '태스크상태': 'todo status',  // 태스크 상태 → todo status (신규)
      '할일완료': 'todo status',    // 할일 완료 → todo status (신규)
      '작업완료': 'todo status',    // 작업 완료 → todo status (신규)
      '태스크완료': 'todo status',  // 태스크 완료 → todo status (신규)
      '작업우선순위': 'todo priority', // 작업 우선순위 → todo priority (신규)
      '할일우선순위': 'todo priority', // 할일 우선순위 → todo priority (신규)
      '태스크우선순위': 'todo priority', // 태스크 우선순위 → todo priority (신규)
      
      // 채팅 저장/보기
      '대화저장': 'stack',          // 대화 저장 → stack
      '채팅저장': 'stack',          // 채팅 저장 → stack
      '대화기록': 'stack',          // 대화 기록 → stack
      '채팅기록': 'stack',          // 채팅 기록 → stack
      '대화내역': 'show',           // 대화 내역 → show
      '채팅내역': 'show',           // 채팅 내역 → show
      '대화목록': 'show',           // 대화 목록 → show
      '채팅목록': 'show',           // 채팅 목록 → show
      '대화보기': 'show',           // 대화 보기 → show
      '채팅보기': 'show',           // 채팅 보기 → show
      '기록보기': 'show',           // 기록 보기 → show
    };
    
    // 입력 정규화 (슬래시 제거 및 소문자 변환)
    const normalizedInput = input.substring(1).trim().toLowerCase();
    
    // 1. 정확한 의도 매칭 먼저 시도
    for (const [intent, commandName] of Object.entries(intentMap)) {
      if (normalizedInput === intent) {
        return this.getCommand(commandName.split(' ')[0]);
      }
    }
    
    // 2. 부분 매칭 시도 (입력에 특정 의도 단어가 포함된 경우)
    for (const [intent, commandName] of Object.entries(intentMap)) {
      if (normalizedInput.includes(intent)) {
        return this.getCommand(commandName.split(' ')[0]);
      }
    }
    
    // 3. 공백을 제거한 매칭 시도 (예: "뭐 해야 해" → "뭐해야해")
    const normalizedWithoutSpaces = normalizedInput.replace(/\s+/g, '');
    for (const [intent, commandName] of Object.entries(intentMap)) {
      if (normalizedWithoutSpaces === intent || normalizedWithoutSpaces.includes(intent)) {
        return this.getCommand(commandName.split(' ')[0]);
      }
    }
    
    // 4. 유사 매칭 - 자음/모음 기반 유사도 계산 (한글만 적용)
    if (/[\uAC00-\uD7AF]/.test(normalizedInput)) {
      // 향상된 유사도 계산 함수
      const calculateSimilarity = (a: string, b: string): number => {
        // 완전 일치하는 경우
        if (a === b) return 1.0;
        if (a.length === 0 || b.length === 0) return 0.0;
        
        // 음절 단위로 분리
        const charsA = Array.from(a);
        const charsB = Array.from(b);
        
        // 한글 초성 매칭 가중치 추가
        // 초성 추출 함수
        const getInitialConsonant = (char: string): string => {
          if (!/^[가-힣]$/.test(char)) return char;
          
          const code = char.charCodeAt(0) - 0xAC00;
          const consonantIndex = Math.floor(code / 28 / 21);
          const consonants = [
            'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 
            'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
          ];
          
          return consonants[consonantIndex];
        };
        
        // 초성 추출
        const initialA = charsA.map(getInitialConsonant).join('');
        const initialB = charsB.map(getInitialConsonant).join('');
        
        // 초성 일치 점수 (가중치: 0.3)
        const initialScore = initialA === initialB ? 0.3 : 0;
        
        // 각 문자열의 n-gram 생성 (1-gram, 2-gram)
        const generateNgrams = (str: string, n: number): string[] => {
          const ngrams: string[] = [];
          for (let i = 0; i <= str.length - n; i++) {
            ngrams.push(str.substring(i, i + n));
          }
          return ngrams;
        };
        
        // 1-gram (음절) 유사도 (가중치: 0.3)
        const chars1A = new Set(charsA);
        const chars1B = new Set(charsB);
        const charIntersection = new Set([...chars1A].filter(x => chars1B.has(x)));
        const charUnion = new Set([...chars1A, ...chars1B]);
        const charScore = charIntersection.size / charUnion.size * 0.3;
        
        // 2-gram (음절 쌍) 유사도 (가중치: 0.4)
        const bigrams2A = new Set(generateNgrams(a, 2));
        const bigrams2B = new Set(generateNgrams(b, 2));
        const bigramIntersection = new Set([...bigrams2A].filter(x => bigrams2B.has(x)));
        const bigramUnion = new Set([...bigrams2A, ...bigrams2B]);
        const bigramScore = bigrams2A.size > 0 && bigrams2B.size > 0 ? 
          bigramIntersection.size / bigramUnion.size * 0.4 : 0;
        
        // 길이 유사도 - 길이가 비슷할수록 높은 점수 (가중치: 0.2)
        const lengthScore = 1 - (Math.abs(a.length - b.length) / Math.max(a.length, b.length, 1)) * 0.2;
        
        // 접두사 가중치 - 시작 부분이 같으면 가중치 부여
        const prefixBonus = a.startsWith(b.charAt(0)) || b.startsWith(a.charAt(0)) ? 0.1 : 0;
        
        // 전체 유사도 점수
        return Math.min(1.0, initialScore + charScore + bigramScore + lengthScore + prefixBonus);
      };
      
      const similarityThreshold = 0.45; // 유사도 임계값 (약간 낮춤)
      let bestMatch: {intent: string; command: string; similarity: number} | null = null;
      
      for (const [intent, commandName] of Object.entries(intentMap)) {
        const similarity = calculateSimilarity(normalizedInput, intent);
        
        if (similarity >= similarityThreshold && (!bestMatch || similarity > bestMatch.similarity)) {
          bestMatch = {intent, command: commandName, similarity};
        }
      }
      
      if (bestMatch) {
        console.log(`한글 유사도 매칭 (개선): "${normalizedInput}" → "${bestMatch.intent}" (${bestMatch.similarity.toFixed(2)})`);
        return this.getCommand(bestMatch.command.split(' ')[0]);
      }
    }
    
    return undefined;
  }

  /**
   * 명령어 실행
   */
  public async executeCommand(input: string): Promise<boolean> {
    // 슬래시로 시작하는지 확인
    if (!input.startsWith('/') && !input.startsWith('@')) {
      return false;
    }

    // 명령어와 인자 분리
    const trimmedInput = input.trim();
    const parts = trimmedInput.split(' ');
    
    // @ 명령어 처리 (특수 접두사)
    if (trimmedInput.startsWith('@')) {
      const specialCommand = parts[0].substring(1); // @ 제거
      
      // 지원되지 않는 @ 명령어
      vscode.window.showInformationMessage(`'@${specialCommand}'는 현재 지원되지 않는 명령어입니다.`);
      return false;
    }
    
    // 일반 슬래시 명령어 처리
    const commandName = parts[0].substring(1); // 슬래시 제거
    const args = parts.slice(1);

    // 1. 직접 명령어 매칭 시도
    let command = this.getCommand(commandName);
    
    // 2. 한글 텍스트가 있는 경우 의도 기반 매칭 시도
    if (!command && /[\uAC00-\uD7AF]/.test(commandName)) {
      command = this.matchCommandByIntent(trimmedInput);
    }
    
    // 3. 명령어를 찾지 못한 경우
    if (!command) {
      // 유사 명령어 찾기
      const similarCommands = this.findSimilarCommands(commandName);
      
      if (similarCommands.length > 0 && similarCommands[0].distance <= 1) {
        // 매우 유사한 명령어가 있는 경우 (오타로 간주)
        const closestCommand = similarCommands[0].command;
        const result = await vscode.window.showInformationMessage(
          `명령어 '/${commandName}'를 찾을 수 없습니다. '/${closestCommand.name}'를 실행하시겠습니까?`,
          '실행',
          '취소'
        );
        
        if (result === '실행') {
          // 사용자가 수정된 명령어 실행에 동의함
          try {
            await closestCommand.execute({
              extensionContext: this.context,
              args,
              originalInput: `/${closestCommand.name} ${args.join(' ')}`.trim()
            });
            return true;
          } catch (error) {
            console.error(`Error executing command /${closestCommand.name}:`, error);
            vscode.window.showErrorMessage(`명령어 실행 오류: /${closestCommand.name}`);
            return true; // 명령어는 처리됨 (오류 발생)
          }
        } else {
          // 사용자가 취소함 - LLM 추천 또는 오류 메시지 표시
          if (this.llmService) {
            await this.handleUnknownCommandWithSuggestions(commandName, trimmedInput, similarCommands);
            return true; // 명령어는 처리됨 (대체 처리)
          } else {
            this.showSimilarCommandSuggestions(commandName, similarCommands);
            return false;
          }
        }
      } else {
        // 유사한 명령어가 없거나 충분히 유사하지 않은 경우
        if (this.llmService) {
          await this.handleUnknownCommandWithSuggestions(commandName, trimmedInput, similarCommands);
          return true; // 명령어는 처리됨 (대체 처리)
        } else {
          if (similarCommands.length > 0) {
            this.showSimilarCommandSuggestions(commandName, similarCommands);
          } else {
            vscode.window.showErrorMessage(`알 수 없는 명령어: /${commandName}`);
          }
          return false;
        }
      }
    }

    // 명령어 실행
    try {
      await command.execute({
        extensionContext: this.context,
        args,
        originalInput: trimmedInput
      });
      return true;
    } catch (error) {
      console.error(`Error executing command /${commandName}:`, error);
      vscode.window.showErrorMessage(`명령어 실행 오류: /${commandName}`);
      return true; // 명령어는 처리됨 (오류 발생)
    }
  }
  
  /**
   * 유사 명령어 추천 메시지 표시
   */
  private showSimilarCommandSuggestions(commandName: string, similarCommands: Array<{command: SlashCommand, distance: number}>): void {
    if (similarCommands.length === 0) {
      vscode.window.showErrorMessage(`알 수 없는 명령어: /${commandName}`);
      return;
    }
    
    // 최대 3개까지만 표시
    const suggestionsLimit = Math.min(3, similarCommands.length);
    const suggestions = similarCommands.slice(0, suggestionsLimit);
    
    // 메시지 구성
    const message = `명령어 '/${commandName}'를 찾을 수 없습니다. 이것을 의미했나요?`;
    
    // 버튼 생성
    const buttons = suggestions.map(s => `/${s.command.name}`);
    
    // 메시지 표시
    vscode.window.showErrorMessage(message, ...buttons)
      .then(selected => {
        if (selected) {
          // 선택한 명령어 실행
          this.executeCommand(selected);
        }
      });
  }
  
  /**
   * 알 수 없는 명령어 처리 - LLM을 통한 해석 및 추천
   * @param commandName 알 수 없는 명령어 이름
   * @param originalInput 원본 입력
   */
  private async handleUnknownCommand(commandName: string, originalInput: string): Promise<void> {
    try {
      // 1. 도움말 데이터 로드
      const helpData = await this.loadHelpData();
      
      // 2. 가이드 데이터 로드
      const guideData = await this.loadGuideData();
      
      // 3. LLM 프롬프트 생성
      const prompt = this.generateUnknownCommandPrompt(commandName, originalInput, helpData, guideData);
      
      // 4. LLM 응답 요청
      const result = await this.llmService!.getCompletion(prompt);
      
      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'LLM 응답을 받을 수 없습니다.');
      }
      
      // 5. LLM 응답 처리 및 UI에 표시 (WebView 패널 사용)
      await this.showLlmResponsePanel('명령어 도움말', result.data);
      
    } catch (error) {
      console.error('알 수 없는 명령어 처리 오류:', error);
      vscode.window.showErrorMessage(`'/${commandName}' 명령어 해석 중 오류가 발생했습니다. 기본 도움말을 참조하세요.`);
      
      // 오류 발생 시 기본 도움말 표시
      await vscode.commands.executeCommand('ape.showCommandHelp');
    }
  }
  
  /**
   * 알 수 없는 명령어 처리 - 유사 명령어 정보를 포함한 LLM 추천
   * @param commandName 알 수 없는 명령어 이름
   * @param originalInput 원본 입력
   * @param similarCommands 유사 명령어 목록
   */
  private async handleUnknownCommandWithSuggestions(
    commandName: string, 
    originalInput: string, 
    similarCommands: Array<{command: SlashCommand, distance: number}>
  ): Promise<void> {
    try {
      // 1. 도움말 데이터 로드
      const helpData = await this.loadHelpData();
      
      // 2. 가이드 데이터 로드
      const guideData = await this.loadGuideData();
      
      // 3. LLM 프롬프트 생성 (유사 명령어 정보 포함)
      const prompt = this.generateUnknownCommandPromptWithSuggestions(
        commandName, 
        originalInput, 
        helpData, 
        guideData,
        similarCommands
      );
      
      // 4. LLM 응답 요청
      const result = await this.llmService!.getCompletion(prompt);
      
      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'LLM 응답을 받을 수 없습니다.');
      }
      
      // 5. LLM 응답 처리 및 UI에 표시 (WebView 패널 사용)
      await this.showLlmResponsePanel('명령어 도움말', result.data);
      
    } catch (error) {
      console.error('알 수 없는 명령어 처리 오류:', error);
      
      // 오류 발생 시 기본 유사 명령어 추천 사용
      this.showSimilarCommandSuggestions(commandName, similarCommands);
      
      // 필요시 기본 도움말도 표시 가능
      // await vscode.commands.executeCommand('ape.showCommandHelp');
    }
  }
  
  /**
   * 도움말 데이터 로드
   */
  private async loadHelpData(): Promise<any> {
    try {
      const extensionPath = this.context.extensionPath;
      const helpFilePath = path.join(extensionPath, 'src', 'data', 'help.json');
      const helpDataStr = fs.readFileSync(helpFilePath, 'utf8');
      return JSON.parse(helpDataStr);
    } catch (error) {
      console.error('도움말 데이터 로드 오류:', error);
      return {};
    }
  }
  
  /**
   * 가이드 데이터 로드
   */
  private async loadGuideData(): Promise<any> {
    try {
      const extensionPath = this.context.extensionPath;
      const guideFilePath = path.join(extensionPath, 'src', 'data', 'guide.json');
      const guideDataStr = fs.readFileSync(guideFilePath, 'utf8');
      return JSON.parse(guideDataStr);
    } catch (error) {
      console.error('가이드 데이터 로드 오류:', error);
      return {};
    }
  }
  
  /**
   * 알 수 없는 명령어 처리를 위한 LLM 프롬프트 생성
   */
  private generateUnknownCommandPrompt(commandName: string, originalInput: string, helpData: any, guideData: any): string {
    return `
# APE 명령어 해석 및 추천 시스템

당신은 APE(Agentic Pipeline Extension)의 도움말 시스템입니다. 사용자가 입력한 알 수 없는 명령어를 해석하고 관련된 유효한 명령어나 질문을 추천해야 합니다.

## 사용자 입력

사용자가 입력한 알 수 없는 명령어: \`${originalInput}\`

## 도움말 데이터

${JSON.stringify(helpData, null, 2)}

## 가이드 데이터

${JSON.stringify(guideData, null, 2)}

## 응답 지침

1. 사용자 입력을 분석하여 의도를 파악하세요. 특히 한글로 입력된 자연어 질문이나 명령에 주의하세요.
2. 입력과 유사하거나 관련된 유효한 명령어를 추천하세요. 
3. 한글 입력의 경우 "뭐해야해", "뭐부터해야해" 같은 자연어 질문으로 이해하고 적절한 워크플로우를 제안하세요.
4. 현재 상황에 적합한 컨텍스트 질문도 추천하세요 (예: "Git 형상이 세팅됐나요?", "Jira 작업이 필요한가요?" 등).
5. 응답은 다음 형식으로 작성하세요:

---
### 명령어 해석

[입력한 명령어에 대한 해석 및 추측 - 한글 입력의 경우 사용자 의도를 자세히 분석]

### 추천 명령어

- **[명령어1]**: [설명]
- **[명령어2]**: [설명]
- **[명령어3]**: [설명]

### 추천 질문

- [질문1]
- [질문2]
- [질문3]

---

응답을 시작하세요.
`;
  }
  
  /**
   * 유사 명령어 정보를 포함한 알 수 없는 명령어 처리 프롬프트 생성
   */
  private generateUnknownCommandPromptWithSuggestions(
    commandName: string, 
    originalInput: string, 
    helpData: any, 
    guideData: any,
    similarCommands: Array<{command: SlashCommand, distance: number}>
  ): string {
    // 유사 명령어 정보 추출
    const similarCommandsInfo = similarCommands.map(sc => ({
      name: sc.command.name,
      description: sc.command.description,
      category: sc.command.category,
      aliases: sc.command.aliases || [],
      examples: sc.command.examples || [],
      distance: sc.distance
    }));
    
    return `
# APE 명령어 해석 및 추천 시스템 (향상된 버전)

당신은 APE(Agentic Pipeline Extension)의 도움말 시스템입니다. 사용자가 입력한 알 수 없는 명령어를 해석하고 관련된 유효한 명령어나 질문을 추천해야 합니다.

## 사용자 입력

사용자가 입력한 알 수 없는 명령어: \`${originalInput}\`

## 도움말 데이터

${JSON.stringify(helpData, null, 2)}

## 가이드 데이터

${JSON.stringify(guideData, null, 2)}

## 유사 명령어 (레벤슈타인 거리 기반)

${JSON.stringify(similarCommandsInfo, null, 2)}

## 응답 지침

1. 사용자 입력을 분석하여 의도를 파악하세요. 특히 한글로 입력된 자연어 질문이나 명령에 주의하세요.
2. 제공된 유사 명령어를 참고하여 사용자가 실제로 원했을 가능성이 높은 명령어를 추천하세요.
3. 사용자 입력과 유사한 명령어가 있다면 오타일 가능성을 언급하세요. (예: "/gti status"는 "/git status"의 오타로 보입니다)
4. 한글 입력의 경우 "뭐해야해", "뭐부터해야해" 같은 자연어 질문으로 이해하고 적절한 워크플로우를 제안하세요.
5. 특히 레벤슈타인 거리가 가장 작은 명령어를 우선적으로 추천하되, 맥락상 맞지 않는 경우는 제외하세요.
6. 현재 상황에 적합한 컨텍스트 질문도 추천하세요.
7. 응답은 친절하고 도움이 되는 톤으로 작성하세요.
8. 응답은 다음 형식으로 작성하세요:

---
### 명령어 해석

[입력한 명령어에 대한 해석 및 추측 - 한글 입력의 경우 사용자 의도를 자세히 분석]

### 추천 명령어

- **[명령어1]**: [설명] [오타 가능성 또는 추천 이유 언급]
- **[명령어2]**: [설명]
- **[명령어3]**: [설명]

### 추천 질문

- [질문1]
- [질문2]
- [질문3]

---

응답을 시작하세요.
`;
  }
  
  /**
   * LLM 응답을 WebView 패널로 표시
   */
  private async showLlmResponsePanel(title: string, content: string): Promise<void> {
    // WebView 패널 생성
    const panel = vscode.window.createWebviewPanel(
      'apeLlmResponse',
      title,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'media')]
      }
    );
    
    // LLM 응답에서 명령어 추출 (한글 명령어 포함)
    const commandRegex = /\*\*\/([\p{L}\p{N}-]+)(?:\s+[\p{L}\p{N}-]+)*\*\*/gu;
    const extractedCommands: string[] = [];
    
    let match: RegExpExecArray | null;
    while ((match = commandRegex.exec(content)) !== null) {
      extractedCommands.push(`/${match[1]}`);
    }
    
    // 질문 추출
    const questionRegex = /- ([^-\n]+)/g;
    const extractedQuestions: string[] = [];
    
    match = null;
    while ((match = questionRegex.exec(content)) !== null) {
      const question = match[1].trim();
      if (question && !question.startsWith('/')) {
        extractedQuestions.push(question);
      }
    }
    
    // 패널에 HTML 설정
    panel.webview.html = this.getLlmResponseHtml(content, extractedCommands, extractedQuestions);
    
    // 메시지 핸들러 설정
    panel.webview.onDidReceiveMessage(async message => {
      if (message.type === 'executeCommand') {
        // 명령어 실행
        await this.executeCommand(message.command);
      } else if (message.type === 'insertToChat') {
        // 채팅 입력창에 텍스트 삽입 (이벤트 발생)
        vscode.commands.executeCommand('ape.insertToChatInput', message.text);
      }
    });
  }
  
  /**
   * LLM 응답 HTML 생성
   */
  private getLlmResponseHtml(content: string, commands: string[], questions: string[]): string {
    // 마크다운을 HTML로 변환
    const markdownContent = content
      // 제목 변환
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      
      // 볼드 및 코드 변환
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      
      // 목록 변환
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n)+/g, '<ul>$&</ul>');
    
    // 명령어 및 질문 버튼 HTML 생성
    let commandsHtml = '';
    if (commands.length > 0) {
      commandsHtml = `
        <div class="command-buttons">
          <h3>명령어 바로 실행</h3>
          <div class="button-container">
            ${commands.map(cmd => `
              <button class="command-button" onclick="executeCommand('${cmd}')">${cmd}</button>
            `).join('')}
          </div>
        </div>
      `;
    }
    
    let questionsHtml = '';
    if (questions.length > 0) {
      questionsHtml = `
        <div class="question-buttons">
          <h3>질문 추천</h3>
          <div class="button-container">
            ${questions.map(q => `
              <button class="question-button" onclick="insertToChat('${q.replace(/'/g, "\\'")}')">${q}</button>
            `).join('')}
          </div>
        </div>
      `;
    }
    
    return `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>APE 명령어 도움말</title>
        <style>
          :root {
            --bg-color: var(--vscode-editor-background, #1e1e1e);
            --text-color: var(--vscode-editor-foreground, #d4d4d4);
            --link-color: var(--vscode-textLink-foreground, #3794ff);
            --button-bg: var(--vscode-button-background, #0e639c);
            --button-fg: var(--vscode-button-foreground, white);
            --button-hover-bg: var(--vscode-button-hoverBackground, #1177bb);
            --code-bg: var(--vscode-textBlockQuote-background, #2a2d2e);
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            line-height: 1.6;
            color: var(--text-color);
            background-color: var(--bg-color);
            margin: 0;
            padding: 20px;
            max-width: 900px;
            margin: 0 auto;
          }
          
          h1, h2, h3 {
            margin-top: 20px;
            margin-bottom: 10px;
          }
          
          ul {
            margin-bottom: 20px;
          }
          
          code {
            background-color: var(--code-bg);
            padding: 2px 4px;
            border-radius: 3px;
            font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
          }
          
          .content {
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid #444;
          }
          
          .button-container {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 20px;
          }
          
          .command-button, .question-button {
            background-color: var(--button-bg);
            color: var(--button-fg);
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.2s;
          }
          
          .command-button:hover, .question-button:hover {
            background-color: var(--button-hover-bg);
          }
          
          .question-button {
            background-color: var(--vscode-badge-background, #4d4d4d);
          }
          
          .question-button:hover {
            background-color: var(--vscode-list-hoverBackground, #2a2d2e);
          }
        </style>
      </head>
      <body>
        <div class="content">
          ${markdownContent}
        </div>
        
        ${commandsHtml}
        ${questionsHtml}
        
        <script>
          const vscode = acquireVsCodeApi();
          
          function executeCommand(command) {
            vscode.postMessage({
              type: 'executeCommand',
              command: command
            });
          }
          
          function insertToChat(text) {
            vscode.postMessage({
              type: 'insertToChat',
              text: text
            });
          }
        </script>
      </body>
      </html>
    `;
  }

  /**
   * 명령어 제안 항목 가져오기
   */
  public getCommandSuggestions(input: string = ''): CommandSuggestion[] {
    // 입력한 텍스트 처리
    const trimmedInput = input.trim();
    const isSlashCommand = trimmedInput.startsWith('/');

    // 슬래시가 없으면 빈 배열 반환
    if (!isSlashCommand && trimmedInput !== '') {
      return [];
    }

    // 슬래시 이후 텍스트 추출
    const searchText = isSlashCommand ? trimmedInput.substring(1).toLowerCase() : '';

    // 명령어와 하위 명령어 분리
    const parts = searchText.split(' ').filter(p => p.trim() !== '');
    const mainCommand = parts[0] || '';
    const subCommand = parts.length > 1 ? parts.slice(1).join(' ') : '';

    // 하위 명령어가 있는 경우
    if (parts.length > 1) {
      return this.getSubCommandSuggestions(mainCommand, subCommand);
    }

    // 기본 명령어 필터링
    return this.filterCommands(searchText);
  }

  /**
   * 하위 명령어 제안 항목 가져오기
   */
  private getSubCommandSuggestions(mainCommand: string, subCommand: string): CommandSuggestion[] {
    const suggestions: CommandSuggestion[] = [];

    // 메인 명령어 찾기
    const command = this.getCommand(mainCommand);
    if (!command) {
      return [];
    }

    // 지원되는 하위 명령어가 있는 명령어들
    const multiArgCommands = ['git', 'vault', 'jira', 'todo', 'model'];

    if (!multiArgCommands.includes(command.name)) {
      return [];
    }

    // 명령어별 하위 명령어 구성
    let subCommands: {name: string, description: string}[] = [];

    switch (command.name) {
      case 'git':
        subCommands = [
          { name: 'status', description: 'Git 저장소 상태 확인' },
          { name: 'commit', description: 'Git 변경사항 커밋' },
          { name: 'push', description: '원격 저장소로 변경사항 푸시' },
          { name: 'pull', description: '원격 저장소에서 변경사항 가져오기' },
          { name: 'branch', description: '브랜치 목록 확인' },
          { name: 'merge', description: '브랜치 병합' },
          { name: 'checkout', description: '브랜치 전환' },
          { name: 'log', description: '커밋 이력 확인' },
          { name: 'add', description: '변경 파일 스테이징' },
          { name: 'solve', description: '병합 충돌 해결' },
          { name: 'auto', description: '자동 커밋 토글' }
        ];
        break;

      case 'vault':
        subCommands = [
          { name: 'list', description: '컨텍스트 목록 표시' },
          { name: 'show', description: '컨텍스트 또는 아이템 상세 정보' },
          { name: 'use', description: '아이템 컨텍스트 사용' },
          { name: 'create', description: '새 컨텍스트 또는 아이템 생성' },
          { name: 'delete', description: '컨텍스트 또는 아이템 삭제' },
          { name: 'search', description: '아이템 검색' }
        ];
        break;

      case 'jira':
        subCommands = [
          { name: 'create', description: '새 Jira 이슈 생성' },
          { name: 'search', description: 'Jira 이슈 검색' },
          { name: 'status', description: 'Jira 이슈 상태 변경' },
          { name: 'summary', description: 'Jira 프로젝트 요약 보기' },
          { name: 'update', description: '이슈 업데이트' },
          { name: 'issue', description: '이슈 세부정보 보기' }
        ];
        break;

      case 'todo':
        subCommands = [
          { name: 'add', description: '할일 항목 추가' },
          { name: 'list', description: '할일 목록 보기' },
          { name: 'status', description: '할일 상태 변경' },
          { name: 'delete', description: '할일 항목 삭제' },
          { name: 'priority', description: '할일 우선순위 설정' }
        ];
        break;

      case 'model':
        subCommands = [
          { name: 'list', description: '사용 가능한 모델 목록' },
          { name: 'use', description: '특정 모델 선택' },
          { name: 'info', description: '현재 모델 정보' }
        ];
        break;

      default:
        return [];
    }

    // 하위 명령어 필터링 (검색어가 있는 경우)
    if (subCommand) {
      subCommands = subCommands.filter(sc =>
        sc.name.toLowerCase().includes(subCommand.toLowerCase())
      );
    }

    // 하위 명령어 제안 항목 생성
    for (const sc of subCommands) {
      suggestions.push({
        label: `/${command.name} ${sc.name}`,
        description: sc.description,
        category: command.category,
        insertText: `/${command.name} ${sc.name} `,
        iconPath: this.getIconForCategory(command.category)
      });
    }

    return suggestions;
  }

  /**
   * 명령어 필터링
   */
  private filterCommands(searchText: string): CommandSuggestion[] {
    const suggestions: CommandSuggestion[] = [];

    for (const command of this.getAllCommands()) {
      // 검색어 필터링
      if (searchText && !command.name.toLowerCase().includes(searchText)) {
        // 별칭 검색
        const hasMatchingAlias = command.aliases?.some(alias =>
          alias.toLowerCase().includes(searchText)
        );

        // 매칭되는 별칭이 없으면 건너뛰기
        if (!hasMatchingAlias) {
          continue;
        }
      }

      // 제안 항목 생성
      suggestions.push({
        label: `/${command.name}`,
        description: command.description,
        detail: command.examples ? `예시: ${command.examples.join(', ')}` : undefined,
        category: command.category,
        insertText: `/${command.name} `,
        iconPath: this.getIconForCategory(command.category)
      });
    }

    // 우선순위 및 이름으로 정렬
    return suggestions.sort((a, b) => {
      // 우선 카테고리로 정렬
      const commandA = this.getCommand(a.label.substring(1));
      const commandB = this.getCommand(b.label.substring(1));

      // 우선순위 비교
      const priorityA = commandA?.priority || 100;
      const priorityB = commandB?.priority || 100;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // 이름으로 정렬
      return a.label.localeCompare(b.label);
    });
  }

  /**
   * 카테고리별 아이콘 가져오기
   */
  private getIconForCategory(category: string): vscode.ThemeIcon {
    // 이모지 아이콘 대신 ThemeIcon 사용
    switch (category) {
      case 'general':
        return new vscode.ThemeIcon('info');
      case 'git':
        return new vscode.ThemeIcon('git-commit');
      case 'code':
        return new vscode.ThemeIcon('code');
      case 'utility':
        return new vscode.ThemeIcon('tools');
      case 'advanced':
        return new vscode.ThemeIcon('settings-gear');
      default:
        return new vscode.ThemeIcon('symbol-event');
    }
  }

  /**
   * 명령어 자동완성 제공
   */
  public provideCompletions(input: string): string[] {
    // 입력한 텍스트 처리
    const trimmedInput = input.trim();
    if (!trimmedInput.startsWith('/')) {
      return [];
    }

    const parts = trimmedInput.split(' ');
    const commandName = parts[0].substring(1); // 슬래시 제거
    const partialArg = parts.length > 1 ? parts[parts.length - 1] : '';

    // 명령어 찾기
    const command = this.getCommand(commandName);
    if (!command || !command.provideCompletions) {
      return [];
    }

    // 명령어별 자동완성 호출
    return command.provideCompletions(partialArg);
  }

  /**
   * 명령어 제안 업데이트
   * 
   * 채팅 입력 필드 값이 변경될 때 호출됩니다.
   */
  public updateSuggestions(input: string): void {
    const suggestions = this.getCommandSuggestions(input);
    this._onDidSuggestCommands.fire(suggestions);
  }

  /**
   * 명령어 도움말 표시
   * 
   * 새로운 JSON 기반 도움말 시스템 사용
   */
  private async showCommandHelp(arg?: string): Promise<void> {
    // 도움말 패널 생성
    const helpPanel = vscode.window.createWebviewPanel(
      'apeCommandHelp',
      'APE 도움말',
      vscode.ViewColumn.One,
      {
        enableScripts: true, // 스크립트 활성화 (도움말 내비게이션 위함)
        localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'media')]
      }
    );
    
    // 메시지 핸들러 설정
    helpPanel.webview.onDidReceiveMessage(async message => {
      if (message.type === 'command') {
        // 도움말 내에서 명령어 실행
        if (message.command.startsWith('help ')) {
          // 도움말 내부 링크 처리
          const helpArg = message.command.substring(5);
          await this.processHelpCommand(helpPanel, helpArg);
        } else {
          // 다른 명령어는 슬래시 명령어로 실행
          await this.executeCommand(`/${message.command}`);
        }
      } else if (message.type === 'expandTreeView') {
        // 트리 뷰 확장 요청
        await vscode.commands.executeCommand('ape.focusTreeView');
      }
    });
    
    // 초기 도움말 내용 표시
    if (!arg) {
      // 카테고리 또는 명령어 미지정 시 기본 도움말 표시
      helpPanel.webview.html = await generateHelpHtml();
    } else if (arg.startsWith('guide ')) {
      // 가이드 문서 표시
      const guideId = arg.substring(6);
      helpPanel.webview.html = await generateGuideHtml(guideId);
    } else if (arg === 'guides' || arg === 'guide') {
      // 가이드 목록 표시
      helpPanel.webview.html = await generateGuidesListHtml();
    } else if (arg === 'faq') {
      // FAQ 표시
      helpPanel.webview.html = await generateFaqHtml();
    } else if (arg === 'tools') {
      // Agent 도구 목록 표시
      helpPanel.webview.html = await generateToolsHelpHtml();
    } else if (this.getCommand(arg)) {
      // 명령어 상세 정보 표시
      helpPanel.webview.html = await generateCommandDetailHtml(arg);
    } else if (arg.startsWith('search ')) {
      // 도움말 검색 기능
      const query = arg.substring(7);
      
      if (this.llmService) {
        // LLM 서비스가 있는 경우 스마트 도움말 사용
        helpPanel.webview.html = await generateSmartHelpHtml(query, this.llmService);
      } else {
        // LLM 서비스가 없는 경우 기본 도움말 표시와 메시지
        helpPanel.webview.html = await generateHelpHtml();
        vscode.window.showWarningMessage('스마트 도움말 검색을 위한 LLM 서비스를 사용할 수 없습니다.');
      }
    } else {
      // 카테고리 지정 시 해당 카테고리 도움말 표시
      helpPanel.webview.html = await generateHelpHtml(arg);
    }
  }
  
  /**
   * 도움말 명령어 처리
   * 
   * 도움말 패널 내에서 명령어 실행 시 처리
   */
  private async processHelpCommand(helpPanel: vscode.WebviewPanel, arg: string): Promise<void> {
    // 도움말 내부 링크 클릭 처리
    if (!arg) {
      // 인자 없는 경우 기본 도움말 표시
      helpPanel.webview.html = await generateHelpHtml();
    } else if (arg.startsWith('guide ')) {
      // 가이드 문서 표시
      const guideId = arg.substring(6);
      helpPanel.webview.html = await generateGuideHtml(guideId);
    } else if (arg === 'guides' || arg === 'guide') {
      // 가이드 목록 표시
      helpPanel.webview.html = await generateGuidesListHtml();
    } else if (arg === 'faq') {
      // FAQ 표시
      helpPanel.webview.html = await generateFaqHtml();
    } else if (arg === 'tools') {
      // Agent 도구 목록 표시
      helpPanel.webview.html = await generateToolsHelpHtml();
    } else if (arg.startsWith('search ')) {
      // 도움말 검색 기능
      const query = arg.substring(7);
      
      if (this.llmService) {
        // LLM 서비스가 있는 경우 스마트 도움말 사용
        helpPanel.webview.html = await generateSmartHelpHtml(query, this.llmService);
      } else {
        // LLM 서비스가 없는 경우 기본 도움말 표시와 메시지
        helpPanel.webview.html = await generateHelpHtml();
        vscode.window.showWarningMessage('스마트 도움말 검색을 위한 LLM 서비스를 사용할 수 없습니다.');
      }
    } else {
      // 명령어 이름으로 처리
      const command = this.getCommand(arg);
      if (command) {
        // 명령어 상세 정보 표시
        helpPanel.webview.html = await generateCommandDetailHtml(arg);
      } else {
        // 카테고리로 처리
        helpPanel.webview.html = await generateHelpHtml(arg);
      }
    }
  }

  /**
   * 카테고리 제목 가져오기
   */
  private getCategoryTitle(category: string): string {
    switch (category) {
      case 'general':
        return '일반 명령어';
      case 'git':
        return 'Git 관련 명령어';
      case 'code':
        return '코드 관련 명령어';
      case 'utility':
        return '유틸리티 명령어';
      case 'advanced':
        return '고급 명령어';
      default:
        return category;
    }
  }

  /**
   * 도움말 패널 HTML 생성
   */
  private getHelpPanelHtml(content: string): string {
    return `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>슬래시 명령어 도움말</title>
        <style>
          body {
            font-family: var(--vscode-font-family, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif);
            padding: 0 20px;
            color: var(--vscode-foreground);
            font-size: var(--vscode-font-size);
            background-color: var(--vscode-editor-background);
          }
          h1 {
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 10px;
            color: var(--vscode-symbolIcon-classForeground);
          }
          h2 {
            margin-top: 20px;
            color: var(--vscode-symbolIcon-constantForeground);
            border-left: 3px solid var(--vscode-activityBarBadge-background);
            padding-left: 10px;
          }
          code {
            font-family: var(--vscode-editor-font-family, monospace);
            background-color: var(--vscode-textBlockQuote-background);
            padding: 2px 4px;
            border-radius: 3px;
          }
          .command-name {
            font-weight: bold;
            color: var(--vscode-symbolIcon-functionForeground);
          }
        </style>
      </head>
      <body>
        ${this.markdownToHtml(content)}
      </body>
      </html>
    `;
  }

  /**
   * 마크다운을 HTML로 변환 (간단 구현)
   */
  private markdownToHtml(markdown: string): string {
    return markdown
      // 헤더 변환
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')

      // 볼드 텍스트 변환
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

      // 명령어 강조 (한글, 영문 모두 지원)
      .replace(/\/([\p{L}\p{N}-]+)/gu, '<code>/$1</code>')

      // 목록 변환
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n)+/g, '<ul>$&</ul>')

      // 줄바꿈 변환
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')

      // 단락 감싸기
      .replace(/^(.+?)(?=<\/p>|<h[1-6]|<ul>|$)/s, '<p>$1</p>');
  }

  /**
   * Git 상태 표시
   */
  private async showGitStatus(): Promise<void> {
    try {
      // Git 확장 API 가져오기
      const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;

      if (!gitExtension) {
        vscode.window.showErrorMessage('Git 확장이 활성화되지 않았습니다.');
        return;
      }

      const git = gitExtension.getAPI(1);

      if (!git) {
        vscode.window.showErrorMessage('Git API를 가져올 수 없습니다.');
        return;
      }

      // 현재 저장소 가져오기
      const repositories = git.repositories;

      if (repositories.length === 0) {
        vscode.window.showInformationMessage('Git 저장소가 없습니다.');
        return;
      }

      // 현재 저장소 상태 표시
      const repo = repositories[0];
      const state = repo.state;

      // 상태 메시지 생성
      const changes = state.workingTreeChanges.length;
      const staged = state.indexChanges.length;
      const untracked = state.untrackedChanges.length;

      const statusMessage = `# Git 상태 요약\n\n` +
        `- 브랜치: **${state.HEAD?.name || 'detached HEAD'}**\n` +
        `- 변경: **${changes}**개 파일\n` +
        `- 스테이징: **${staged}**개 파일\n` +
        `- 추적되지 않음: **${untracked}**개 파일\n\n` +
        `## 변경된 파일\n\n` +
        state.workingTreeChanges.map((c: any) => `- ${c.uri.fsPath.split('/').pop()} (${this.getChangeTypeLabel(c.status)})`).join('\n');

      // 도움말 패널로 표시
      const statusPanel = vscode.window.createWebviewPanel(
        'apeGitStatus',
        'Git 상태',
        vscode.ViewColumn.One,
        {
          enableScripts: false,
          localResourceRoots: []
        }
      );

      statusPanel.webview.html = this.getHelpPanelHtml(statusMessage);

    } catch (error) {
      vscode.window.showErrorMessage(`Git 상태 확인 오류: ${error}`);
    }
  }

  /**
   * 변경 유형 라벨 가져오기
   */
  private getChangeTypeLabel(status: number): string {
    // Git 변경 타입 매핑
    switch (status) {
      case 0: return '추가됨'; // Added
      case 1: return '수정됨'; // Modified
      case 2: return '삭제됨'; // Deleted
      case 3: return '이름 변경됨'; // Renamed
      case 4: return '복사됨'; // Copied
      default: return '알 수 없음';
    }
  }
}