/**
 * Tab Completion Provider
 * 
 * 탭 자동 완성 기능을 제공하는 모듈
 */

import * as vscode from 'vscode';
import { LLMService } from '../llm/llmService';
import { Message, MessageRole } from '../../types/chat';

/**
 * 자동 완성 아이템
 */
export interface CompletionItem extends vscode.CompletionItem {
  sourceFile?: string;
  confidence?: number;
}

/**
 * 탭 자동 완성 제공자
 */
export class TabCompletionProvider implements vscode.CompletionItemProvider {
  private cachedCompletions: Map<string, CompletionItem[]> = new Map();
  private cacheTimeout = 30 * 60 * 1000; // 30분
  private suggestionCache: Map<string, {
    suggestions: vscode.CompletionItem[];
    timestamp: number;
  }> = new Map();
  private contextAwareCommands: Map<string, string[]> = new Map();
  
  /**
   * 생성자
   */
  constructor(
    private readonly llmService: LLMService
  ) {
    // 컨텍스트 인식 명령어 초기화
    this.initializeContextAwareCommands();
  }
  
  /**
   * 컨텍스트 인식 명령어 초기화
   */
  private initializeContextAwareCommands(): void {
    // Git 관련 컨텍스트
    this.contextAwareCommands.set('git', [
      'commit',
      'push',
      'pull',
      'status',
      'solve',
      'branch',
      'auto',
      'consolidate'
    ]);
    
    // Jira 관련 컨텍스트
    this.contextAwareCommands.set('jira', [
      'create',
      'list',
      'update',
      'comment',
      'assign'
    ]);
    
    // 코드 관련 컨텍스트
    this.contextAwareCommands.set('code', [
      'analyze',
      'review',
      'optimize',
      'refactor',
      'format'
    ]);
    
    // SWDP 관련 컨텍스트
    this.contextAwareCommands.set('swdp', [
      'build',
      'deploy',
      'status',
      'verify',
      'list'
    ]);
  }
  
  /**
   * 자동 완성 제안
   */
  public async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): Promise<vscode.CompletionItem[] | vscode.CompletionList> {
    // 트리거 문자가 TAB인 경우에만 처리
    if (context.triggerKind !== vscode.CompletionTriggerKind.TriggerCharacter && 
        context.triggerKind !== vscode.CompletionTriggerKind.Invoke) {
      return [];
    }
    
    // 현재 줄 가져오기
    const lineText = document.lineAt(position.line).text;
    const linePrefix = lineText.substring(0, position.character);
    
    // 명령어 또는 코드 완성이 필요한지 확인
    if (this.isCommandCompletion(linePrefix)) {
      return this.provideCommandCompletions(linePrefix);
    } else {
      // 코드 자동 완성
      return this.provideCodeCompletions(document, position, linePrefix);
    }
  }
  
  /**
   * 명령어 자동 완성인지 확인
   */
  private isCommandCompletion(linePrefix: string): boolean {
    // 행이 '/'로 시작하는지 확인
    return linePrefix.trim().startsWith('/');
  }
  
  /**
   * 명령어 자동 완성 제공
   */
  private provideCommandCompletions(linePrefix: string): vscode.CompletionItem[] {
    const commands = [
      { name: 'git', description: 'Git 관련 명령어' },
      { name: 'commit', description: '변경 사항 커밋' },
      { name: 'push', description: '원격 저장소에 푸시' },
      { name: 'pull', description: '원격 저장소에서 풀' },
      { name: 'status', description: 'Git 상태 확인' },
      { name: 'jira', description: 'JIRA 관련 명령어' },
      { name: 'issue', description: 'JIRA 이슈 조회/생성' },
      { name: 'ticket', description: 'JIRA 티켓 관리' },
      { name: 'help', description: '도움말 표시' },
      { name: 'todo', description: '할 일 지정' },
      { name: 'code', description: '코드 분석 및 작업' },
      { name: 'analyze', description: '코드 분석' },
      { name: 'settings', description: '설정 열기' },
      { name: 'theme', description: '테마 변경' },
      { name: 'model', description: 'LLM 모델 설정' },
      { name: 'clear', description: '채팅 내역 지우기' },
      { name: 'swdp', description: 'SWDP 관련 명령어' }
    ];
    
    // 현재 입력된 명령어 파싱
    const commandParts = linePrefix.trim().substring(1).split(/\s+/);
    const currentCommand = commandParts[0];
    
    // 현재 작업 컨텍스트 파악
    const activeContext = this.getActiveContext();
    
    // 하위 명령어 필터링
    if (commandParts.length > 1 && !commandParts[1].startsWith('-')) {
      // 상위 명령어에 따른 하위 명령어 제공
      if (this.contextAwareCommands.has(currentCommand)) {
        const subCommands = this.contextAwareCommands.get(currentCommand) || [];
        return subCommands.map(subCmd => 
          this.createCompletionItem(subCmd, `${currentCommand} ${subCmd} 명령어`, `/${currentCommand} ${subCmd}`)
        );
      }
      
      // 기본 서브커맨드 제공
      switch (currentCommand) {
        case 'git':
          return [
            this.createCompletionItem('commit', '변경 사항 커밋', '/git commit'),
            this.createCompletionItem('push', '원격 저장소에 푸시', '/git push'),
            this.createCompletionItem('pull', '원격 저장소에서 풀', '/git pull'),
            this.createCompletionItem('status', '현재 Git 상태 확인', '/git status'),
            this.createCompletionItem('solve', '충돌 자동 해결', '/git solve'),
            this.createCompletionItem('branch', '브랜치 생성/목록/전환', '/git branch'),
            this.createCompletionItem('auto', '자동 커밋 토글', '/git auto'),
            this.createCompletionItem('consolidate', '임시 커밋 통합', '/git consolidate')
          ];
          
        case 'jira':
          return [
            this.createCompletionItem('create', '새 이슈 생성', '/jira create'),
            this.createCompletionItem('list', '이슈 목록 조회', '/jira list'),
            this.createCompletionItem('assign', '이슈 할당', '/jira assign'),
            this.createCompletionItem('update', '이슈 업데이트', '/jira update'),
            this.createCompletionItem('comment', '이슈에 코멘트 추가', '/jira comment')
          ];
          
        case 'code':
          return [
            this.createCompletionItem('analyze', '코드 분석', '/code analyze'),
            this.createCompletionItem('review', '코드 리뷰', '/code review'),
            this.createCompletionItem('optimize', '코드 최적화', '/code optimize'),
            this.createCompletionItem('refactor', '코드 리팩토링', '/code refactor'),
            this.createCompletionItem('format', '코드 서식 정리', '/code format')
          ];
          
        case 'swdp':
          return [
            this.createCompletionItem('build', '빌드 실행', '/swdp build'),
            this.createCompletionItem('deploy', '배포 실행', '/swdp deploy'),
            this.createCompletionItem('status', '상태 확인', '/swdp status'),
            this.createCompletionItem('verify', '검증 실행', '/swdp verify'),
            this.createCompletionItem('list', '목록 표시', '/swdp list')
          ];
          
        case 'todo':
          return [
            this.createCompletionItem('add', '할 일 추가', '/todo add'),
            this.createCompletionItem('list', '할 일 목록', '/todo list'),
            this.createCompletionItem('done', '할 일 완료', '/todo done'),
            this.createCompletionItem('delete', '할 일 삭제', '/todo delete'),
            this.createCompletionItem('prioritize', '우선순위 변경', '/todo prioritize')
          ];
      }
    }
    
    // 현재 컨텍스트에 따라 추천되는 명령어 필터링
    let filteredCommands = [...commands];
    
    if (activeContext) {
      // 에디터에서 텍스트 선택된 경우: code 관련 명령어 우선
      const codeRelatedCommands = ['code', 'analyze', 'review', 'optimize', 'refactor'];
      if (activeContext.hasTextSelection) {
        filteredCommands = [
          ...filteredCommands.filter(cmd => codeRelatedCommands.includes(cmd.name)),
          ...filteredCommands.filter(cmd => !codeRelatedCommands.includes(cmd.name))
        ];
      }
      
      // Git 관련 컨텍스트: git 관련 명령어 우선
      const gitRelatedCommands = ['git', 'commit', 'push', 'pull', 'status'];
      if (activeContext.isGitRepo) {
        filteredCommands = [
          ...filteredCommands.filter(cmd => gitRelatedCommands.includes(cmd.name)),
          ...filteredCommands.filter(cmd => !gitRelatedCommands.includes(cmd.name))
        ];
      }
    }
    
    // 기본 최상위 명령어 제공
    return filteredCommands.map(cmd => 
      this.createCompletionItem(cmd.name, cmd.description, '/' + cmd.name)
    );
  }
  
  /**
   * 현재 컨텍스트 파악
   */
  private getActiveContext(): { hasTextSelection: boolean; isGitRepo: boolean } | null {
    try {
      const editor = vscode.window.activeTextEditor;
      
      return {
        hasTextSelection: !!(editor && !editor.selection.isEmpty),
        isGitRepo: this.isGitRepository()
      };
    } catch (error) {
      console.error('컨텍스트 파악 오류:', error);
      return null;
    }
  }
  
  /**
   * Git 저장소인지 확인
   */
  private isGitRepository(): boolean {
    try {
      // 현재 작업 디렉토리
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        return false;
      }
      
      // 간단히 true 반환 (모의 구현)
      // 실제로는 .git 폴더 존재 여부를 확인해야 하지만, 여기서는 모의 구현만 제공
      return true;
    } catch (error) {
      console.error('Git 저장소 확인 오류:', error);
      return false;
    }
  }
  
  /**
   * 코드 자동 완성 제공
   */
  private async provideCodeCompletions(
    document: vscode.TextDocument,
    position: vscode.Position,
    linePrefix: string
  ): Promise<vscode.CompletionItem[]> {
    // 캐시 키 생성 (파일 경로 + 현재 위치)
    const cacheKey = `${document.fileName}:${position.line}:${position.character}`;
    
    // 캐시된 결과가 있는 경우 재사용
    const cachedResult = this.suggestionCache.get(cacheKey);
    if (cachedResult && Date.now() - cachedResult.timestamp < this.cacheTimeout) {
      return cachedResult.suggestions;
    }
    
    try {
      // 컨텍스트 수집
      // 전체 파일 내용과 커서 위치 계산(미사용)
      // // const fileContent = document.getText();
      // // const cursorOffset = document.offsetAt(position);
      
      // 이전 줄과 현재 줄 추출
      const precedingLines = document.getText(new vscode.Range(
        new vscode.Position(Math.max(0, position.line - 10), 0),
        position
      ));
      
      // 파일 유형 확인
      const fileType = document.fileName.split('.').pop() || '';
      
      // LLM에 코드 완성 요청
      const suggestions = await this.requestCodeCompletions(
        precedingLines,
        linePrefix,
        fileType
      );
      
      // 결과 캐싱
      this.suggestionCache.set(cacheKey, {
        suggestions,
        timestamp: Date.now()
      });
      
      return suggestions;
    } catch (error) {
      console.error('코드 완성 오류:', error);
      return [];
    }
  }
  
  /**
   * LLM을 통한 코드 완성 요청
   */
  private async requestCodeCompletions(
    context: string,
    currentLine: string,
    fileType: string
  ): Promise<vscode.CompletionItem[]> {
    try {
      // 프롬프트 생성
      const prompt = `
다음 코드의 다음 줄을 완성해주세요. 파일 타입은 ${fileType}입니다.
탭 자동 완성을 위한 여러 가지 가능한 코드 완성을 제안해주세요.
각 제안은 새로운 줄에 시작하며, 완전한 코드 조각이어야 합니다.
최대 5개의 다른 완성을 제안해주세요.

코드 컨텍스트:
\`\`\`${fileType}
${context}
\`\`\`

현재 줄 (커서 위치는 | 로 표시):
\`\`\`
${currentLine}|
\`\`\`

가능한 완성:`;
      
      // LLM 요청
      const messages: Message[] = [
        {
          id: `msg_completion_${Date.now()}`,
          role: MessageRole.User,
          content: prompt,
          timestamp: new Date()
        }
      ];
      
      const result = await this.llmService.sendRequest(messages);
      
      if (result.success && result.data) {
        // 응답 파싱하여 CompletionItem 배열로 변환
        return this.parseCompletionResponse(result.data.content || '', currentLine);
      } else {
        throw new Error('LLM 요청 실패');
      }
    } catch (error) {
      console.error('LLM 코드 완성 요청 오류:', error);
      return [];
    }
  }
  
  /**
   * LLM 응답을 CompletionItem으로 파싱
   */
  private parseCompletionResponse(
    responseContent: string, 
    currentLine: string
  ): vscode.CompletionItem[] {
    const completions: vscode.CompletionItem[] = [];
    
    try {
      // 코드 블록에서 제안 추출
      const codeBlockMatch = responseContent.match(/```(?:.*?)?\n([\s\S]*?)```/);
      const suggestions = codeBlockMatch 
        ? codeBlockMatch[1].split('\n').filter(line => line.trim() !== '')
        : responseContent.split('\n').filter(line => line.trim() !== '');
      
      // 각 제안에 대해 CompletionItem 생성
      suggestions.forEach((suggestion, index) => {
        // 번호 또는 불릿 포인트 제거
        suggestion = suggestion.replace(/^\d+\.\s+|^-\s+/, '').trim();
        
        if (suggestion) {
          // 현재 줄과 겹치는 부분 제거
          const overlap = this.findOverlap(currentLine, suggestion);
          const insertText = overlap > 0 ? suggestion.substring(overlap) : suggestion;
          
          if (insertText.trim()) {
            const item = new vscode.CompletionItem(
              suggestion,
              vscode.CompletionItemKind.Snippet
            );
            
            item.insertText = insertText;
            item.sortText = String(index).padStart(5, '0');
            item.detail = '탭 자동 완성';
            
            completions.push(item);
          }
        }
      });
    } catch (error) {
      console.error('응답 파싱 오류:', error);
    }
    
    return completions;
  }
  
  /**
   * 현재 줄과 제안 사이의 겹치는 부분 찾기
   */
  private findOverlap(currentLine: string, suggestion: string): number {
    let overlap = 0;
    
    // 현재 줄의 끝에서부터 제안의 시작과 일치하는지 확인
    for (let i = 1; i <= currentLine.length; i++) {
      const suffix = currentLine.substring(currentLine.length - i);
      if (suggestion.startsWith(suffix)) {
        overlap = suffix.length;
      }
    }
    
    return overlap;
  }
  
  /**
   * CompletionItem 생성 헬퍼 함수
   */
  private createCompletionItem(
    label: string,
    detail: string,
    insertText: string
  ): vscode.CompletionItem {
    const item = new vscode.CompletionItem(
      label,
      vscode.CompletionItemKind.Keyword
    );
    
    item.detail = detail;
    item.insertText = insertText;
    item.command = {
      command: 'editor.action.triggerSuggest',
      title: 'Re-trigger completions...'
    };
    
    return item;
  }
}