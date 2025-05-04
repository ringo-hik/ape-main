/**
 * Git 플러그인
 * 
 * Git 명령어 실행 및 관리 기능을 제공하는 내부 플러그인
 * 저장소 관리, 커밋, 푸시 등의 기능 지원
 * LLM을 활용한 커밋 메시지 자동 생성 등 고급 기능 포함
 */

import { PluginBaseService } from '../../../core/plugin-system/PluginBaseService';
import { PluginCommand } from '../../../types/PluginTypes';
import { IConfigLoader } from '../../../types/ConfigTypes';
import { CommandType, CommandPrefix } from '../../../types/CommandTypes';
import { GitClientService } from './GitClientService';

// VS Code API 접근 (LLM 서비스 사용 등을 위해)
import * as vscode from 'vscode';
import * as path from 'path';

// LLM 서비스 접근 (커밋 메시지 자동 생성)
import { LlmService } from '../../../core/llm/LlmService';

/**
 * Git 플러그인 설정 인터페이스
 */
interface GitPluginConfig {
  enabled: boolean;
  useLocalGit?: boolean;
  autoCommitMessage?: boolean;
  commitMessageModel?: string;
  defaultBranch?: string;
  commitMessageTemplate?: string;
  credentials?: {
    username?: string;
    token?: string;
  };
  remotes?: Record<string, string>;
}

/**
 * Git 커밋 타입 열거형
 */
enum GitCommitType {
  FEAT = 'feat',
  FIX = 'fix',
  DOCS = 'docs',
  STYLE = 'style',
  REFACTOR = 'refactor',
  TEST = 'test',
  CHORE = 'chore',
  PERF = 'perf'
}

/**
 * Git 플러그인 클래스
 * Git 작업 관련 기능 제공
 */
export class GitPluginService extends PluginBaseService {
  /**
   * 플러그인 ID
   */
  id = 'git';
  
  /**
   * 플러그인 이름
   */
  name = 'Git 저장소 관리';
  
  /**
   * Git 클라이언트
   */
  private client: GitClientService;
  
  /**
   * LLM 서비스
   */
  private llmService: LlmService | null = null;
  
  /**
   * GitPluginService 생성자
   * @param configLoader 설정 로더
   */
  constructor(configLoader: IConfigLoader) {
    super(configLoader);
    
    // 내부 플러그인 설정 로드
    const pluginConfig = this.loadGitConfig();
    this.config = pluginConfig;
    
    // Git 클라이언트 생성
    this.client = new GitClientService();
    
    // 명령어 등록
    this.registerCommands();
    
    // LLM 서비스 초기화 시도
    this.initLlmService();
  }
  
  /**
   * Git 플러그인 설정 로드
   * @returns Git 플러그인 설정
   */
  private loadGitConfig(): GitPluginConfig {
    // 기본 설정
    const defaultConfig: GitPluginConfig = {
      enabled: true,
      useLocalGit: true,
      autoCommitMessage: true,
      defaultBranch: 'master',
      commitMessageTemplate: '{{type}}: {{subject}}\n\n{{body}}'
    };
    
    try {
      // 설정 로더에서 Git 플러그인 설정 로드
      const config = this.configLoader.getConfig<any>() || {};
      const gitConfig = config.internalPlugins?.git || {};
      
      // 설정 병합
      return {
        ...defaultConfig,
        ...gitConfig
      };
    } catch (error) {
      console.error('Git 플러그인 설정 로드 중 오류 발생:', error);
      return defaultConfig;
    }
  }
  
  /**
   * LLM 서비스 초기화
   */
  private async initLlmService(): Promise<void> {
    try {
      // LLM 서비스 생성
      this.llmService = new LlmService();
      console.log('LLM 서비스 초기화 완료');
    } catch (error) {
      console.error('LLM 서비스 초기화 중 오류 발생:', error);
      this.llmService = null;
    }
  }
  
  /**
   * 플러그인 초기화
   */
  async initialize(): Promise<void> {
    try {
      // Git 저장소 검증
      const isRepo = await this.client.executeGitCommand(['rev-parse', '--is-inside-work-tree']);
      
      if (!isRepo.success || isRepo.stdout.trim() !== 'true') {
        console.warn('현재 디렉토리는 Git 저장소가 아닙니다.');
      }
      
      // LLM 서비스가 없는 경우 다시 초기화 시도
      if (!this.llmService) {
        await this.initLlmService();
      }
      
      console.log('Git 플러그인 초기화 완료');
    } catch (error) {
      console.error('Git 플러그인 초기화 중 오류 발생:', error);
      // 오류가 발생해도 초기화는 성공한 것으로 취급 (최소 기능 동작)
    }
  }
  
  /**
   * 명령어 등록
   * 
   * @param customCommands 외부에서 추가할 명령어 (사용하지 않음)
   * @returns 등록 성공 여부
   */
  protected registerCommands(customCommands?: PluginCommand[]): boolean {
    this.commands = [
      // 상태 확인 명령어
      {
        id: 'status',
        name: 'status',
        type: CommandType.AT,
        prefix: CommandPrefix.AT,
        description: 'Git 저장소 상태 확인',
        syntax: '@git:status',
        examples: ['@git:status'],
        execute: async () => this.getStatus()
      },
      
      // 변경 내역 확인 명령어
      {
        id: 'diff',
        name: 'diff',
        type: CommandType.AT,
        prefix: CommandPrefix.AT,
        description: '변경 내역 확인',
        syntax: '@git:diff [file] [--staged]',
        examples: ['@git:diff', '@git:diff src/index.ts', '@git:diff --staged'],
        execute: async (args) => this.getDiff(args[0], this.extractOptions(args))
      },
      
      // 변경 파일 확인 명령어
      {
        id: 'changes',
        name: 'changes',
        type: CommandType.AT,
        prefix: CommandPrefix.AT,
        description: '변경된 파일 목록 확인',
        syntax: '@git:changes',
        examples: ['@git:changes'],
        execute: async () => this.getChanges()
      },
      
      // 스테이징 명령어
      {
        id: 'add',
        name: 'add',
        type: CommandType.AT,
        prefix: CommandPrefix.AT,
        description: '변경 파일 스테이징',
        syntax: '@git:add <files...>',
        examples: ['@git:add .', '@git:add src/index.ts', '@git:add src/core/*.ts'],
        execute: async (args) => this.stageFiles(args)
      },
      
      // 커밋 명령어
      {
        id: 'commit',
        name: 'commit',
        type: CommandType.AT,
        prefix: CommandPrefix.AT,
        description: '변경 내용 커밋',
        syntax: '@git:commit <message> [--all]',
        examples: [
          '@git:commit "기능 추가: 사용자 인증"',
          '@git:commit "버그 수정: 로그인 오류" --all'
        ],
        execute: async (args) => this.commit(args)
      },
      
      // 자동 커밋 메시지 생성 명령어
      {
        id: 'auto-commit',
        name: 'auto-commit',
        type: CommandType.AT,
        prefix: CommandPrefix.AT,
        description: 'LLM을 사용하여 자동으로 커밋 메시지 생성 및 커밋',
        syntax: '@git:auto-commit [--all] [--type=<commit-type>]',
        examples: [
          '@git:auto-commit',
          '@git:auto-commit --all',
          '@git:auto-commit --type=feat',
          '@git:auto-commit --all --type=fix'
        ],
        execute: async (args) => this.autoCommit(this.extractOptions(args))
      },
      
      // 푸시 명령어
      {
        id: 'push',
        name: 'push',
        type: CommandType.AT,
        prefix: CommandPrefix.AT,
        description: '커밋 푸시',
        syntax: '@git:push [remote] [branch]',
        examples: ['@git:push', '@git:push origin main'],
        execute: async (args) => this.push(args[0], args[1])
      },
      
      // 브랜치 생성 명령어
      {
        id: 'branch',
        name: 'branch',
        type: CommandType.AT,
        prefix: CommandPrefix.AT,
        description: '브랜치 목록 확인 및 관리',
        syntax: '@git:branch [name] [--create] [--delete]',
        examples: [
          '@git:branch',
          '@git:branch --create feature/user-auth',
          '@git:branch --delete feature/old-branch'
        ],
        execute: async (args) => this.manageBranch(args, this.extractOptions(args))
      },
      
      // 브랜치 전환 명령어
      {
        id: 'checkout',
        name: 'checkout',
        type: CommandType.AT,
        prefix: CommandPrefix.AT,
        description: '브랜치 전환',
        syntax: '@git:checkout <branch-name> [--create]',
        examples: [
          '@git:checkout main',
          '@git:checkout feature/user-auth',
          '@git:checkout --create feature/new-branch'
        ],
        execute: async (args) => this.checkout(args, this.extractOptions(args))
      },
      
      // 가져오기 명령어
      {
        id: 'pull',
        name: 'pull',
        type: CommandType.AT,
        prefix: CommandPrefix.AT,
        description: '원격 저장소에서 변경 사항 가져오기',
        syntax: '@git:pull [remote] [branch]',
        examples: ['@git:pull', '@git:pull origin main'],
        execute: async (args) => this.pull(args[0], args[1])
      },
      
      // 커밋 이력 확인 명령어
      {
        id: 'log',
        name: 'log',
        type: CommandType.AT,
        prefix: CommandPrefix.AT,
        description: '커밋 이력 확인',
        syntax: '@git:log [--count=<number>] [--author=<name>]',
        examples: ['@git:log', '@git:log --count=5', '@git:log --author="John"'],
        execute: async (args) => this.getLog(this.extractOptions(args))
      },
      
      // 커밋 설명 명령어
      {
        id: 'explain',
        name: 'explain',
        type: CommandType.AT,
        prefix: CommandPrefix.AT,
        description: 'LLM을 사용하여 특정 커밋의 변경 내용을 자세히 설명',
        syntax: '@git:explain [commit-hash]',
        examples: [
          '@git:explain',  // 가장 최근 커밋
          '@git:explain abc1234'
        ],
        execute: async (args) => this.explainCommit(args[0])
      },
      
      // 커밋 요약 명령어
      {
        id: 'summarize',
        name: 'summarize',
        type: CommandType.AT,
        prefix: CommandPrefix.AT,
        description: 'LLM을 사용하여 여러 커밋을 요약',
        syntax: '@git:summarize [--count=<number>] [--since=<date>]',
        examples: [
          '@git:summarize',
          '@git:summarize --count=10',
          '@git:summarize --since="1 week ago"'
        ],
        execute: async (args) => this.summarizeCommits(this.extractOptions(args))
      },
      
      // 변경 분석 명령어
      {
        id: 'analyze',
        name: 'analyze',
        type: CommandType.AT,
        prefix: CommandPrefix.AT,
        description: 'LLM을 사용하여 현재 변경 사항을 분석',
        syntax: '@git:analyze [--staged]',
        examples: [
          '@git:analyze',
          '@git:analyze --staged'
        ],
        execute: async (args) => this.analyzeChanges(this.extractOptions(args))
      }
    ];
    return true;
  }
  
  /**
   * Git 상태 확인
   * @returns 상태 정보
   */
  private async getStatus(): Promise<any> {
    try {
      const status = await this.client.getStatus();
      
      return {
        content: `# Git 저장소 상태\n\n` +
                `**브랜치**: ${status.branch}\n` +
                `**추적 중**: ${status.tracking || '없음'}\n\n` +
                `## 변경 사항\n` +
                (status.changes.length > 0 ? 
                  status.changes.map((change: any) => `- ${change.type} ${change.path}`).join('\n') : 
                  '변경 사항 없음'),
        data: status,
        type: 'git-status'
      };
    } catch (error) {
      console.error('Git 상태 확인 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 변경된 파일 목록 확인
   * @returns 변경 파일 목록
   */
  private async getChanges(): Promise<any> {
    try {
      // 변경된 파일 목록 가져오기
      const result = await this.client.executeGitCommand(['status', '--porcelain']);
      
      if (!result.success) {
        throw new Error(`Git status 명령어 실패: ${result.stderr}`);
      }
      
      const lines = result.stdout.split('\n').filter(line => line.trim() !== '');
      
      if (lines.length === 0) {
        return {
          content: '# 변경된 파일 없음\n\n현재 브랜치에 변경된 파일이 없습니다.',
          type: 'git-changes'
        };
      }
      
      // 파일 상태별로 분류
      const modified: string[] = [];
      const added: string[] = [];
      const deleted: string[] = [];
      const renamed: string[] = [];
      const untracked: string[] = [];
      
      lines.forEach(line => {
        const status = line.substring(0, 2);
        const file = line.substring(3);
        
        if (status.includes('M')) {
          modified.push(file);
        } else if (status.includes('A')) {
          added.push(file);
        } else if (status.includes('D')) {
          deleted.push(file);
        } else if (status.includes('R')) {
          renamed.push(file);
        } else if (status.includes('??')) {
          untracked.push(file);
        }
      });
      
      // 결과 포맷팅
      let content = '# 변경된 파일 목록\n\n';
      
      if (modified.length > 0) {
        content += '## 수정됨\n';
        content += modified.map(file => `- ${file}`).join('\n');
        content += '\n\n';
      }
      
      if (added.length > 0) {
        content += '## 추가됨\n';
        content += added.map(file => `- ${file}`).join('\n');
        content += '\n\n';
      }
      
      if (deleted.length > 0) {
        content += '## 삭제됨\n';
        content += deleted.map(file => `- ${file}`).join('\n');
        content += '\n\n';
      }
      
      if (renamed.length > 0) {
        content += '## 이름 변경됨\n';
        content += renamed.map(file => `- ${file}`).join('\n');
        content += '\n\n';
      }
      
      if (untracked.length > 0) {
        content += '## 추적되지 않음\n';
        content += untracked.map(file => `- ${file}`).join('\n');
      }
      
      return {
        content,
        data: {
          modified,
          added,
          deleted,
          renamed,
          untracked
        },
        type: 'git-changes'
      };
    } catch (error) {
      console.error('변경 파일 목록 확인 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 변경 내역 확인
   * @param file 특정 파일 (선택적)
   * @param options 추가 옵션
   * @returns 변경 내역
   */
  private async getDiff(file?: string, options: Record<string, any> = {}): Promise<any> {
    try {
      const args = ['diff'];
      
      // 스테이징된 변경 사항 확인
      if (options.staged) {
        args.push('--staged');
      }
      
      // 특정 파일만 확인
      if (file && file !== '--staged') {
        args.push(file);
      }
      
      const result = await this.client.executeGitCommand(args);
      
      if (!result.success) {
        throw new Error(`Git diff 명령어 실패: ${result.stderr}`);
      }
      
      // 변경 사항이 없는 경우
      if (!result.stdout.trim()) {
        return {
          content: '# 변경 사항 없음\n\n' + 
                  `${options.staged ? '스테이징된' : '스테이징되지 않은'} 변경 사항이 없습니다.` +
                  (file ? ` (파일: ${file})` : ''),
          type: 'git-diff'
        };
      }
      
      return {
        content: `# 변경 내역${options.staged ? ' (스테이징됨)' : ''}${file ? ` (${file})` : ''}\n\n` +
                `\`\`\`diff\n${result.stdout}\n\`\`\``,
        type: 'git-diff'
      };
    } catch (error) {
      console.error('Git 변경 내역 확인 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 파일 스테이징
   * @param files 파일 목록
   * @returns 스테이징 결과
   */
  private async stageFiles(files: string[]): Promise<any> {
    try {
      if (!files || files.length === 0) {
        files = ['.'];  // 기본값: 모든 파일
      }
      
      const result = await this.client.stageFiles(files);
      
      return {
        content: `# 파일 스테이징 완료\n\n` +
                `다음 파일들이 스테이징되었습니다:\n` +
                `${files.map(file => `- ${file}`).join('\n')}\n\n` +
                `현재 브랜치: **${result.branch}**\n` +
                `변경 파일 수: **${result.changes.length}**`,
        data: result,
        type: 'git-add'
      };
    } catch (error) {
      console.error('Git 파일 스테이징 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 변경 내용 커밋
   * @param args 명령어 인자
   * @returns 커밋 결과
   */
  private async commit(args: any[]): Promise<any> {
    try {
      const options = this.extractOptions(args);
      const message = args[0];
      
      if (!message) {
        throw new Error('커밋 메시지는 필수입니다');
      }
      
      // 커밋 옵션 구성
      const commitOptions = {
        message: message,
        all: options.all === true
      };
      
      const result = await this.client.commit(commitOptions);
      
      return {
        content: `# 커밋 완료\n\n` +
                `**해시**: ${result.hash}\n` +
                `**작성자**: ${result.authorName} <${result.authorEmail}>\n` +
                `**메시지**: ${result.subject}\n` +
                `**시간**: ${new Date(result.timestamp * 1000).toLocaleString()}`,
        data: result,
        type: 'git-commit'
      };
    } catch (error) {
      console.error('Git 커밋 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * LLM을 사용한 자동 커밋 메시지 생성 및 커밋
   * @param options 커밋 옵션
   * @returns 커밋 결과
   */
  private async autoCommit(options: Record<string, any> = {}): Promise<any> {
    try {
      // LLM 서비스 확인
      if (!this.llmService) {
        throw new Error('LLM 서비스가 초기화되지 않았습니다. 수동 커밋을 사용해 주세요.');
      }
      
      // 현재 변경 사항 확인 (staged)
      const stagedDiff = await this.client.getDiff(true);
      // 스테이징되지 않은 변경 사항 확인
      const unstagedDiff = await this.client.getDiff(false);
      
      // 스테이징된 변경 사항이 없고, --all 옵션이 없는 경우
      if (!stagedDiff.trim() && !options.all) {
        // 스테이징되지 않은 변경 사항이 있는 경우
        if (unstagedDiff.trim()) {
          return {
            content: `# 스테이징된 변경 사항 없음\n\n` +
                    `스테이징된 변경 사항이 없습니다. 다음 중 하나를 수행하세요:\n` +
                    `1. \`@git:add .\` 명령어로 모든 변경 사항을 스테이징하거나\n` +
                    `2. \`@git:auto-commit --all\` 명령어로 모든 변경 사항을 스테이징 및 커밋하세요.`,
            type: 'git-auto-commit-error'
          };
        } else {
          // 변경 사항이 전혀 없는 경우
          return {
            content: `# 변경 사항 없음\n\n` +
                    `커밋할 변경 사항이 없습니다. 먼저 파일을 수정한 후 다시 시도하세요.`,
            type: 'git-auto-commit-error'
          };
        }
      }
      
      // 변경 사항 확인 (--all 옵션이 있는 경우 스테이징되지 않은 변경 사항도 포함)
      const diffContent = options.all ? 
        (stagedDiff + (stagedDiff && unstagedDiff ? '\n\n' : '') + unstagedDiff) : stagedDiff;
      
      // 변경된 파일 목록 가져오기
      const statusResult = await this.client.executeGitCommand([
        'status', '--porcelain', options.all ? '' : '--staged'
      ]);
      
      const changedFiles = statusResult.stdout
        .split('\n')
        .filter(line => line.trim() !== '')
        .map(line => {
          const status = line.substring(0, 2).trim();
          const file = line.substring(3);
          return { status, file };
        });
      
      // 커밋 타입 (기본값: feat)
      const commitType = (options.type && 
        Object.values(GitCommitType).includes(options.type as GitCommitType)) ? 
        options.type : GitCommitType.FEAT;
      
      // LLM에 전송할 프롬프트 생성
      const prompt = `
당신은 Git 커밋 메시지 작성 전문가입니다. 현재 변경 사항을 분석하여 좋은 커밋 메시지를 작성해주세요.
작성 규칙:
1. 간결하고 명확하게 작성
2. 현재형 시제 사용 ("Add feature" 형식)
3. 50자 이내의 제목줄과 빈 줄을 두고 본문으로 구성
4. 제목은 "${commitType}: " 접두어로 시작
5. 무엇을 변경했는지가 아니라 왜 변경했는지 설명
6. 여러 변경 사항이 있을 경우 가장 중요한 변경에 집중

변경된 파일:
${changedFiles.map(item => `${item.status} ${item.file}`).join('\n')}

변경 내용(diff):
\`\`\`diff
${diffContent.substring(0, 4000)}${diffContent.length > 4000 ? '\n...(일부 생략)' : ''}
\`\`\`

응답 포맷:
{
  "subject": "한 줄 요약 (50자 이내)",
  "body": "상세 설명 (선택 사항)"
}

JSON 형식으로만 응답해주세요.
`;
      
      // LLM으로 커밋 메시지 생성
      console.log('LLM을 사용하여 커밋 메시지 생성 중...');
      
      // LLM 요청
      const messageModel = (this.config as GitPluginConfig).commitMessageModel || '';
      const llmResult = await this.llmService.sendRequest({
        model: messageModel || this.llmService.getDefaultModelId(),
        messages: [
          {
            role: 'system',
            content: '당신은 개발자를 돕는 Git 커밋 메시지 작성 전문가입니다. JSON 형식으로만 응답하세요.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3 // 낮은 temperature로 일관성 있는 응답 유도
      });
      
      // LLM 응답에서 커밋 메시지 추출
      let commitMessage = '';
      
      try {
        // JSON 응답 파싱 시도
        const contentStr = llmResult.content || '';
        const jsonMatch = contentStr.match(/```json\s*([\s\S]*?)\s*```/) || 
                        contentStr.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          const jsonContent = jsonMatch[0].replace(/```json|```/g, '').trim();
          const parsed = JSON.parse(jsonContent);
          
          // 커밋 메시지 템플릿 적용
          const template = (this.config as GitPluginConfig).commitMessageTemplate || 
                          '{{type}}: {{subject}}\n\n{{body}}';
          
          commitMessage = template
            .replace('{{type}}', commitType)
            .replace('{{subject}}', parsed.subject || '')
            .replace('{{body}}', parsed.body || '');
        } else {
          // JSON 파싱 실패 시 기본 메시지 사용
          commitMessage = `${commitType}: 자동 생성된 커밋 메시지\n\n${contentStr.substring(0, 200)}`;
        }
      } catch (parseError) {
        console.error('커밋 메시지 JSON 파싱 오류:', parseError);
        commitMessage = `${commitType}: ${llmResult.content?.substring(0, 50) || '자동 생성된 커밋 메시지'}`;
      }
      
      // 커밋 실행
      const commitOptions = {
        message: commitMessage,
        all: options.all === true
      };
      
      const result = await this.client.commit(commitOptions);
      
      return {
        content: `# 자동 커밋 완료\n\n` +
                `**해시**: ${result.hash}\n` +
                `**작성자**: ${result.authorName} <${result.authorEmail}>\n` +
                `**메시지**:\n\`\`\`\n${commitMessage}\n\`\`\`\n` +
                `**시간**: ${new Date(result.timestamp * 1000).toLocaleString()}`,
        data: {
          ...result,
          generatedMessage: commitMessage
        },
        type: 'git-auto-commit'
      };
    } catch (error) {
      console.error('자동 커밋 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 브랜치 관리
   * @param args 명령어 인자
   * @param options 추가 옵션
   * @returns 브랜치 관리 결과
   */
  private async manageBranch(args: string[], options: Record<string, any>): Promise<any> {
    try {
      // 브랜치 생성
      if (options.create) {
        const branchName = args[0];
        if (!branchName) {
          throw new Error('브랜치 이름을 지정해야 합니다');
        }
        
        const result = await this.client.createBranch(branchName, undefined, false);
        
        return {
          content: `# 브랜치 생성 완료\n\n` +
                  `**브랜치**: ${result.branch}\n\n` +
                  `현재 브랜치에서 새 브랜치를 생성했습니다. ` +
                  `브랜치를 전환하려면 \`@git:checkout ${branchName}\` 명령어를 사용하세요.`,
          data: result,
          type: 'git-branch-create'
        };
      }
      
      // 브랜치 삭제
      if (options.delete) {
        const branchName = args[0];
        if (!branchName) {
          throw new Error('삭제할 브랜치 이름을 지정해야 합니다');
        }
        
        const result = await this.client.executeGitCommand(['branch', '-d', branchName]);
        
        if (!result.success) {
          if (result.stderr.includes('not fully merged')) {
            throw new Error(`병합되지 않은 브랜치입니다. 강제 삭제하려면 --force 옵션을 사용하세요.`);
          }
          throw new Error(`브랜치 삭제 실패: ${result.stderr}`);
        }
        
        return {
          content: `# 브랜치 삭제 완료\n\n` +
                  `브랜치 '${branchName}'이(가) 삭제되었습니다.`,
          type: 'git-branch-delete'
        };
      }
      
      // 브랜치 목록 조회
      const branches = await this.client.getBranches(true);
      
      // 현재 브랜치 찾기
      const currentBranch = branches.find(b => b.isCurrent);
      
      // 로컬 브랜치와 원격 브랜치 분리
      const localBranches = branches.filter(b => !b.name.includes('remotes/'));
      const remoteBranches = branches.filter(b => b.name.includes('remotes/'));
      
      return {
        content: `# Git 브랜치 목록\n\n` +
                `## 현재 브랜치\n` +
                `- **${currentBranch?.name || '알 수 없음'}**\n\n` +
                `## 로컬 브랜치\n` +
                (localBranches.length > 0 ? 
                  localBranches.map(b => `- ${b.isCurrent ? '**' : ''}${b.name}${b.isCurrent ? '**' : ''}`).join('\n') : 
                  '로컬 브랜치가 없습니다.') +
                `\n\n## 원격 브랜치\n` +
                (remoteBranches.length > 0 ? 
                  remoteBranches.map(b => `- ${b.name.replace('remotes/', '')}`).join('\n') : 
                  '원격 브랜치가 없습니다.'),
        data: branches,
        type: 'git-branches'
      };
    } catch (error) {
      console.error('브랜치 관리 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 브랜치 전환 (체크아웃)
   * @param args 명령어 인자
   * @param options 추가 옵션
   * @returns 체크아웃 결과
   */
  private async checkout(args: string[], options: Record<string, any>): Promise<any> {
    try {
      const branchName = args[0];
      
      if (!branchName && !options.create) {
        throw new Error('브랜치 이름을 지정해야 합니다');
      }
      
      // 새 브랜치 생성 및 전환
      if (options.create) {
        const newBranchName = branchName || options.create;
        
        if (typeof newBranchName !== 'string' || !newBranchName) {
          throw new Error('새 브랜치 이름을 지정해야 합니다');
        }
        
        const result = await this.client.createBranch(newBranchName, undefined, true);
        
        return {
          content: `# 새 브랜치 생성 및 전환 완료\n\n` +
                  `**브랜치**: ${result.branch}\n\n` +
                  `새 브랜치를 생성하고 전환했습니다.`,
          data: result,
          type: 'git-checkout-new'
        };
      }
      
      // 기존 브랜치로 전환
      const result = await this.client.executeGitCommand(['checkout', branchName]);
      
      if (!result.success) {
        throw new Error(`브랜치 전환 실패: ${result.stderr}`);
      }
      
      return {
        content: `# 브랜치 전환 완료\n\n` +
                `브랜치 '${branchName}'으로 전환했습니다.`,
        type: 'git-checkout'
      };
    } catch (error) {
      console.error('브랜치 전환 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 원격 저장소에서 변경 사항 가져오기
   * @param remote 원격 저장소 (기본값: origin)
   * @param branch 브랜치 (기본값: 현재 브랜치)
   * @returns 가져오기 결과
   */
  private async pull(remote?: string, branch?: string): Promise<any> {
    try {
      const result = await this.client.pull(remote, branch);
      
      return {
        content: `# 변경 사항 가져오기 완료\n\n` +
                `**원격 저장소**: ${result.remote}\n` +
                `**브랜치**: ${result.branch}\n\n` +
                `원격 저장소에서 변경 사항을 성공적으로 가져왔습니다.`,
        data: result,
        type: 'git-pull'
      };
    } catch (error) {
      console.error('변경 사항 가져오기 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 커밋 푸시
   * @param remote 원격 저장소 (기본값: origin)
   * @param branch 브랜치 (기본값: 현재 브랜치)
   * @returns 푸시 결과
   */
  private async push(remote?: string, branch?: string): Promise<any> {
    try {
      const result = await this.client.push({
        remote,
        branch,
        setUpstream: true  // 추적 브랜치 설정
      });
      
      return {
        content: `# 푸시 완료\n\n` +
                `**원격 저장소**: ${result.remote}\n` +
                `**브랜치**: ${result.branch}\n\n` +
                `변경 사항이 원격 저장소로 성공적으로 푸시되었습니다.`,
        data: result,
        type: 'git-push'
      };
    } catch (error) {
      console.error('Git 푸시 중 오류 발생:', error);
      
      // 인증 오류인 경우 안내 메시지 제공
      if (error instanceof Error && 
          (error.message.includes('Authentication failed') ||
           error.message.includes('could not read Username'))) {
        throw new Error('GitHub 인증 실패. 인증 정보를 확인하고 다시 시도하세요. ' +
                       'GitHub 개인 액세스 토큰(PAT)을 설정하는 것이 좋습니다.');
      }
      
      throw error;
    }
  }
  
  /**
   * 커밋 이력 확인
   * @param options 옵션
   * @returns 커밋 이력
   */
  private async getLog(options: Record<string, any>): Promise<any> {
    try {
      const count = options.count ? parseInt(options.count) : 5;
      const args = ['log', `--max-count=${count}`, '--pretty=format:%H|%an|%ae|%at|%s'];
      
      // 특정 작성자 필터링
      if (options.author) {
        args.push(`--author=${options.author}`);
      }
      
      const result = await this.client.executeGitCommand(args);
      
      if (!result.success) {
        throw new Error(`Git log 명령어 실패: ${result.stderr}`);
      }
      
      // 로그 파싱
      const logs = result.stdout
        .split('\n')
        .filter(line => line.trim() !== '')
        .map(line => {
          const [hash, authorName, authorEmail, timestamp, subject] = line.split('|');
          return {
            hash,
            authorName,
            authorEmail,
            timestamp: parseInt(timestamp),
            subject,
            date: new Date(parseInt(timestamp) * 1000).toLocaleString()
          };
        });
      
      if (logs.length === 0) {
        return {
          content: '# 커밋 이력 없음\n\n이 저장소에 커밋 이력이 없습니다.',
          type: 'git-log'
        };
      }
      
      return {
        content: `# 커밋 이력 (최근 ${logs.length}개)\n\n` +
                logs.map(log => 
                  `## ${log.subject}\n` +
                  `**해시**: ${log.hash.substring(0, 7)}\n` +
                  `**작성자**: ${log.authorName} <${log.authorEmail}>\n` +
                  `**날짜**: ${log.date}\n`
                ).join('\n'),
        data: logs,
        type: 'git-log'
      };
    } catch (error) {
      console.error('Git 로그 확인 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * LLM을 사용하여 커밋 변경 내용 설명
   * @param commitHash 커밋 해시 (기본값: HEAD)
   * @returns 커밋 설명
   */
  private async explainCommit(commitHash: string = 'HEAD'): Promise<any> {
    try {
      // LLM 서비스 확인
      if (!this.llmService) {
        throw new Error('LLM 서비스가 초기화되지 않았습니다.');
      }
      
      // 커밋 정보 가져오기
      const commitInfoResult = await this.client.executeGitCommand([
        'show', 
        '--format=%H|%an|%ae|%at|%s|%b', 
        commitHash
      ]);
      
      if (!commitInfoResult.success) {
        throw new Error(`커밋 정보 가져오기 실패: ${commitInfoResult.stderr}`);
      }
      
      // 커밋 정보 파싱
      const infoLines = commitInfoResult.stdout.split('\n');
      const [hash, authorName, authorEmail, timestamp, subject, ...bodyLines] = infoLines[0].split('|');
      const body = bodyLines.join('|'); // body 부분에 | 문자가 포함될 수 있으므로
      
      // 커밋 diff 부분 추출 (정보 행 이후부터)
      const diffContent = infoLines.slice(1).join('\n');
      
      // LLM에 전송할 프롬프트 생성
      const prompt = `
다음 Git 커밋 변경 내용을 분석하고 자세히 설명해주세요:

## 커밋 정보
- 해시: ${hash}
- 작성자: ${authorName} <${authorEmail}>
- 날짜: ${new Date(parseInt(timestamp) * 1000).toLocaleString()}
- 제목: ${subject}
- 본문: ${body || '(없음)'}

## 변경 내용
\`\`\`diff
${diffContent.substring(0, 4000)}${diffContent.length > 4000 ? '\n...(일부 생략)' : ''}
\`\`\`

다음 내용을 포함해서 설명해주세요:
1. 이 커밋에서 변경된 주요 내용
2. 왜 이러한 변경이 필요했는지 (제목과 본문에서 유추)
3. 변경이 미치는 영향
4. 어떤 파일들이 수정되었는지

마크다운 형식으로 응답해주세요.
`;
      
      // LLM 요청
      console.log('LLM을 사용하여 커밋 설명 생성 중...');
      
      const llmResult = await this.llmService.sendRequest({
        model: this.llmService.getDefaultModelId(),
        messages: [
          {
            role: 'system',
            content: '당신은 개발자를 돕는 Git 커밋 분석 전문가입니다. 커밋의 변경 내용을 분석하고 명확하게 설명해주세요.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3
      });
      
      // 결과 반환
      return {
        content: `# 커밋 분석: ${subject}\n\n` +
                `**커밋 해시**: ${hash.substring(0, 7)}\n` +
                `**작성자**: ${authorName}\n` +
                `**날짜**: ${new Date(parseInt(timestamp) * 1000).toLocaleString()}\n\n` +
                `${llmResult.content}`,
        data: {
          hash,
          authorName,
          authorEmail,
          timestamp: parseInt(timestamp),
          subject,
          body
        },
        type: 'git-explain-commit'
      };
    } catch (error) {
      console.error('커밋 설명 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * LLM을 사용하여 여러 커밋 요약
   * @param options 요약 옵션
   * @returns 커밋 요약
   */
  private async summarizeCommits(options: Record<string, any>): Promise<any> {
    try {
      // LLM 서비스 확인
      if (!this.llmService) {
        throw new Error('LLM 서비스가 초기화되지 않았습니다.');
      }
      
      // 커밋 로그 가져오기
      const args = ['log', '--pretty=format:%H|%an|%at|%s'];
      
      // 커밋 수 제한
      const count = options.count ? parseInt(options.count) : 10;
      args.push(`--max-count=${count}`);
      
      // 특정 날짜 이후
      if (options.since) {
        args.push(`--since=${options.since}`);
      }
      
      const result = await this.client.executeGitCommand(args);
      
      if (!result.success) {
        throw new Error(`Git log 명령어 실패: ${result.stderr}`);
      }
      
      // 로그 파싱
      const logs = result.stdout
        .split('\n')
        .filter(line => line.trim() !== '')
        .map(line => {
          const [hash, author, timestamp, subject] = line.split('|');
          const date = new Date(parseInt(timestamp) * 1000);
          return { hash, author, date, subject };
        });
      
      if (logs.length === 0) {
        return {
          content: '# 요약할 커밋 없음\n\n지정한 조건에 맞는 커밋이 없습니다.',
          type: 'git-summarize'
        };
      }
      
      // 최근 변경 파일 확인
      const filesResult = await this.client.executeGitCommand([
        'diff', '--name-only', `HEAD~${Math.min(logs.length, count)}`
      ]);
      
      const changedFiles = filesResult.success ? 
        filesResult.stdout.split('\n').filter(f => f.trim() !== '') : 
        [];
      
      // LLM에 전송할 프롬프트 생성
      const prompt = `
최근 ${logs.length}개 Git 커밋을 분석하고 요약해주세요:

## 커밋 목록
${logs.map(log => `- ${log.date.toLocaleString()}: ${log.subject} (${log.author})`).join('\n')}

## 변경된 파일 목록
${changedFiles.length > 0 ? changedFiles.map(file => `- ${file}`).join('\n') : '(파일 정보 없음)'}

다음 내용을 포함해서 요약해주세요:
1. 이 기간 동안의 주요 작업 방향 (신기능 개발, 버그 수정, 리팩토링 등)
2. 가장 중요해 보이는 변경 사항 3-5개
3. 작업한 주요 영역이나 컴포넌트
4. 전체 변경 사항의 영향도 예측

마크다운 형식으로 응답해주세요.
`;
      
      // LLM 요청
      console.log('LLM을 사용하여 커밋 요약 생성 중...');
      
      const llmResult = await this.llmService.sendRequest({
        model: this.llmService.getDefaultModelId(),
        messages: [
          {
            role: 'system',
            content: '당신은 개발자를 돕는 Git 커밋 분석 전문가입니다. 여러 커밋을 분석하고 전체 작업 방향을 명확하게 요약해주세요.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3
      });
      
      // 결과 반환
      return {
        content: `# 최근 ${logs.length}개 커밋 요약\n\n` +
                `**기간**: ${logs[logs.length - 1].date.toLocaleString()} - ${logs[0].date.toLocaleString()}\n` +
                `**총 커밋 수**: ${logs.length}\n` +
                `**변경된 파일 수**: ${changedFiles.length}\n\n` +
                `${llmResult.content}`,
        data: {
          commits: logs,
          changedFiles
        },
        type: 'git-summarize'
      };
    } catch (error) {
      console.error('커밋 요약 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * LLM을 사용하여 현재 변경 사항 분석
   * @param options 분석 옵션
   * @returns 변경 사항 분석
   */
  private async analyzeChanges(options: Record<string, any>): Promise<any> {
    try {
      // LLM 서비스 확인
      if (!this.llmService) {
        throw new Error('LLM 서비스가 초기화되지 않았습니다.');
      }
      
      // 변경 사항 확인
      const isStaged = !!options.staged;
      const diff = await this.client.getDiff(isStaged);
      
      // 변경 사항이 없는 경우
      if (!diff.trim()) {
        return {
          content: `# 분석할 변경 사항 없음\n\n${isStaged ? '스테이징된' : '스테이징되지 않은'} 변경 사항이 없습니다.`,
          type: 'git-analyze'
        };
      }
      
      // 변경된 파일 목록 가져오기
      const statusResult = await this.client.executeGitCommand([
        'status', '--porcelain', isStaged ? '--staged' : ''
      ]);
      
      const changedFiles = statusResult.stdout
        .split('\n')
        .filter(line => line.trim() !== '')
        .map(line => {
          const status = line.substring(0, 2).trim();
          const file = line.substring(3);
          return { status, file };
        });
      
      // LLM에 전송할 프롬프트 생성
      const prompt = `
현재 Git ${isStaged ? '스테이징된' : '스테이징되지 않은'} 변경 사항을 분석해주세요:

## 변경된 파일 목록
${changedFiles.map(item => `${item.status} ${item.file}`).join('\n')}

## 변경 내용(diff)
\`\`\`diff
${diff.substring(0, 4000)}${diff.length > 4000 ? '\n...(일부 생략)' : ''}
\`\`\`

다음 내용을 포함해서 분석해주세요:
1. 이 변경 사항의 주요 목적 (기능 추가, 버그 수정, 리팩토링 등)
2. 어떤 부분이 변경되었는지 상세한 설명
3. 잠재적인 문제점이나 개선할 점
4. 코드 품질 관점에서의 피드백

마크다운 형식으로 응답해주세요.
`;
      
      // LLM 요청
      console.log('LLM을 사용하여 변경 사항 분석 중...');
      
      const llmResult = await this.llmService.sendRequest({
        model: this.llmService.getDefaultModelId(),
        messages: [
          {
            role: 'system',
            content: '당신은 개발자를 돕는 코드 리뷰 전문가입니다. Git 변경 사항을 분석하고 상세한 피드백과 제안을 제공해주세요.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3
      });
      
      // 결과 반환
      return {
        content: `# ${isStaged ? '스테이징된' : '스테이징되지 않은'} 변경 사항 분석\n\n` +
                `**변경된 파일 수**: ${changedFiles.length}\n\n` +
                `${llmResult.content}`,
        data: {
          changedFiles
        },
        type: 'git-analyze'
      };
    } catch (error) {
      console.error('변경 사항 분석 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 명령어 옵션 추출
   * @param args 명령어 인자
   * @returns 옵션 객체
   */
  private extractOptions(args: any[]): Record<string, any> {
    const options: Record<string, any> = {};
    
    // 플래그 형식 옵션 추출 (--key=value 또는 --flag)
    for (const arg of args) {
      if (typeof arg === 'string' && arg.startsWith('--')) {
        const [key, value] = arg.substring(2).split('=');
        if (key && value !== undefined) {
          options[key] = value;
        } else if (key) {
          options[key] = true;
        }
      }
    }
    
    return options;
  }
}