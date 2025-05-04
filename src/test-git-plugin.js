/**
 * Git 플러그인 테스트 스크립트 (파일 직접 수정 버전)
 * 
 * 이 스크립트는 Axiom의 플러그인 시스템을 사용하지 않고
 * Git 명령어를 직접 실행하여 테스트합니다.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * 명령어 파서 모듈
 * CommandParserService의 기능 간소화 버전
 */
class CommandParser {
  /**
   * 명령어 파싱
   * @param {string} input 입력 문자열
   */
  parse(input) {
    if (!input || !input.trim()) {
      return null;
    }
    
    const trimmed = input.trim();
    
    // @ 명령어 파싱
    if (trimmed.startsWith('@')) {
      // '@' 명령어는 반드시 ':' 형식을 가져야 함 (에이전트:명령)
      if (!trimmed.includes(':')) {
        // '@'로 시작하지만 ':' 없음 - 일반 텍스트로 처리
        return null;
      }
      
      const content = trimmed.substring(1);
      const parts = content.split(':');
      
      if (parts.length > 1) {
        const agentId = parts[0].trim();
        const commandName = parts.slice(1).join(':').trim();
        
        // 빈 에이전트 ID 또는 명령어 체크
        if (!agentId || !commandName) {
          return null;
        }
        
        // 명령어와 인자 분리
        const cmdParts = commandName.split(' ');
        const command = cmdParts[0];
        const args = cmdParts.slice(1);
        
        // 플래그 추출
        const flags = {};
        const cleanArgs = [];
        
        for (const arg of args) {
          if (arg.startsWith('--')) {
            const flagParts = arg.substring(2).split('=');
            const key = flagParts[0];
            
            if (flagParts.length > 1) {
              flags[key] = flagParts.slice(1).join('=');
            } else {
              flags[key] = true;
            }
          } else {
            cleanArgs.push(arg);
          }
        }
        
        return {
          prefix: '@',
          type: 'at',
          agentId,
          command,
          args: cleanArgs,
          flags,
          rawInput: trimmed
        };
      }
    } else if (trimmed.startsWith('/')) {
      // / 명령어 파싱
      const content = trimmed.substring(1);
      const parts = content.split(' ');
      const command = parts[0];
      const args = parts.slice(1);
      
      return {
        prefix: '/',
        type: 'slash',
        agentId: 'core',
        command,
        args,
        flags: {},
        rawInput: trimmed
      };
    }
    
    // 일반 텍스트는 명령어로 취급하지 않음
    return null;
  }
}

/**
 * Git 클라이언트 서비스 (간소화 버전)
 */
class GitClient {
  /**
   * Git 명령어 실행
   * @param {string[]} args 명령어 인자
   * @returns {Promise<{success: boolean, stdout: string, stderr: string}>} 실행 결과
   */
  async executeGitCommand(args) {
    return new Promise((resolve) => {
      console.log(`실행: git ${args.join(' ')}`);
      
      const gitProcess = spawn('git', args);
      let stdout = '';
      let stderr = '';
      
      gitProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      gitProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      gitProcess.on('close', (code) => {
        const success = code === 0;
        
        if (success) {
          console.log('명령어 성공');
        } else {
          console.error(`명령어 실패 (${code}): ${stderr}`);
        }
        
        resolve({
          success,
          stdout,
          stderr,
          code
        });
      });
      
      gitProcess.on('error', (error) => {
        console.error('프로세스 오류:', error.message);
        
        resolve({
          success: false,
          stdout: '',
          stderr: error.message,
          code: null
        });
      });
    });
  }
  
  /**
   * Git 상태 확인
   */
  async getStatus() {
    const result = await this.executeGitCommand(['status', '--porcelain=v2', '--branch']);
    
    if (!result.success) {
      throw new Error(`Git status 명령어 실패: ${result.stderr}`);
    }
    
    // 상태 파싱
    const statusLines = result.stdout.split('\n').filter(line => line.trim() !== '');
    const status = {
      branch: '',
      tracking: '',
      changes: []
    };
    
    // 브랜치 정보
    const branchLine = statusLines.find(line => line.startsWith('# branch.head'));
    if (branchLine) {
      status.branch = branchLine.split(' ')[2];
    }
    
    // 트래킹 브랜치 정보
    const trackingLine = statusLines.find(line => line.startsWith('# branch.upstream'));
    if (trackingLine) {
      status.tracking = trackingLine.split(' ')[2];
    }
    
    // 변경 사항
    const changeLines = statusLines.filter(line => !line.startsWith('#'));
    status.changes = changeLines.map(line => {
      const parts = line.split(' ');
      let type = '';
      let path = '';
      
      if (line.startsWith('1 ')) {
        type = parts[1];
        path = parts.slice(8).join(' ');
      } else if (line.startsWith('2 ')) {
        type = parts[1];
        path = `${parts[9]} -> ${parts[10]}`;
      } else if (line.startsWith('? ')) {
        type = '?';
        path = parts.slice(1).join(' ');
      } else if (line.startsWith('u ')) {
        type = 'u';
        path = parts.slice(10).join(' ');
      }
      
      return { type, path };
    });
    
    return status;
  }
  
  /**
   * 변경 내역 조회
   */
  async getDiff(staged = false) {
    const args = ['diff'];
    
    if (staged) {
      args.push('--staged');
    }
    
    const result = await this.executeGitCommand(args);
    
    if (!result.success) {
      throw new Error(`Git diff 명령어 실패: ${result.stderr}`);
    }
    
    return result.stdout;
  }
  
  /**
   * 커밋 생성
   */
  async commit(options) {
    const args = ['commit', '-m', options.message];
    
    if (options.all) {
      args.push('-a');
    }
    
    const result = await this.executeGitCommand(args);
    
    if (!result.success) {
      throw new Error(`Git commit 명령어 실패: ${result.stderr}`);
    }
    
    // 커밋 정보 조회
    const commitInfo = await this.executeGitCommand(['log', '-1', '--format=%H%n%an%n%ae%n%at%n%s']);
    
    if (!commitInfo.success) {
      throw new Error(`Git log 명령어 실패: ${commitInfo.stderr}`);
    }
    
    const [hash, authorName, authorEmail, timestamp, subject] = commitInfo.stdout.split('\n');
    
    return {
      hash,
      authorName,
      authorEmail,
      timestamp: parseInt(timestamp),
      subject
    };
  }
  
  /**
   * 원격 저장소로 푸시
   */
  async push(options = {}) {
    const args = ['push'];
    
    const remote = options.remote || 'origin';
    args.push(remote);
    
    if (options.branch) {
      args.push(options.branch);
    }
    
    if (options.force) {
      args.push('--force');
    }
    
    if (options.setUpstream) {
      args.push('--set-upstream');
    }
    
    const result = await this.executeGitCommand(args);
    
    if (!result.success) {
      throw new Error(`Git push 명령어 실패: ${result.stderr}`);
    }
    
    return {
      success: true,
      remote,
      branch: options.branch || 'current branch'
    };
  }
  
  /**
   * 브랜치 목록 조회
   */
  async getBranches(all = false) {
    const args = ['branch'];
    
    if (all) {
      args.push('-a');
    }
    
    const result = await this.executeGitCommand(args);
    
    if (!result.success) {
      throw new Error(`Git branch 명령어 실패: ${result.stderr}`);
    }
    
    // 브랜치 목록 파싱
    const branches = result.stdout.split('\n')
      .filter(branch => branch.trim() !== '')
      .map(branch => {
        const isCurrent = branch.startsWith('*');
        const name = branch.replace('*', '').trim();
        
        return {
          name,
          isCurrent
        };
      });
    
    return branches;
  }
}

/**
 * Git 플러그인 서비스 (간소화 버전)
 */
class GitPlugin {
  constructor() {
    this.id = 'git';
    this.name = 'Git 저장소 관리';
    this.client = new GitClient();
    this.initialized = false;
  }
  
  /**
   * 플러그인 초기화
   */
  async initialize() {
    this.initialized = true;
    console.log('Git 플러그인 초기화 완료');
  }
  
  /**
   * 초기화 상태 확인
   */
  isInitialized() {
    return this.initialized;
  }
  
  /**
   * 활성화 상태 확인
   */
  isEnabled() {
    return true;
  }
  
  /**
   * 명령어 실행
   * @param {string} command 명령어 이름
   * @param {any[]} args 명령어 인자
   */
  async executeCommand(command, args) {
    // 실제 명령어 핸들러로 라우팅
    switch (command) {
      case 'status':
        return await this.getStatus();
      case 'diff':
        return await this.getDiff(args[0]);
      case 'commit':
        return await this.commit(args);
      case 'push':
        return await this.push(args[0], args[1]);
      case 'log':
        return await this.getLog(this.extractOptions(args));
      case 'branch':
        return await this.getBranches(args[0] === 'all');
      default:
        throw new Error(`알 수 없는 Git 명령어: ${command}`);
    }
  }
  
  /**
   * Git 상태 확인
   */
  async getStatus() {
    try {
      const status = await this.client.getStatus();
      
      return {
        content: `# Git 저장소 상태\n\n` +
                `**브랜치**: ${status.branch}\n` +
                `**추적 중**: ${status.tracking || '없음'}\n\n` +
                `## 변경 사항\n` +
                (status.changes.length > 0 ? 
                  status.changes.map(change => `- ${change.type} ${change.path}`).join('\n') : 
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
   * 변경 내역 확인
   */
  async getDiff(file) {
    try {
      const diff = await this.client.getDiff(false);
      
      if (!diff.trim()) {
        return {
          content: '# 변경 사항 없음\n\n현재 저장소에 변경 사항이 없습니다.',
          type: 'git-diff'
        };
      }
      
      return {
        content: `# 변경 내역\n\n` +
                `\`\`\`diff\n${diff}\n\`\`\``,
        type: 'git-diff'
      };
    } catch (error) {
      console.error('Git 변경 내역 확인 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 변경 내용 커밋
   */
  async commit(args) {
    try {
      const options = this.extractOptions(args);
      const message = args[0];
      
      if (!message) {
        throw new Error('커밋 메시지는 필수입니다');
      }
      
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
   * 원격 저장소로 푸시
   */
  async push(remote, branch) {
    try {
      const result = await this.client.push({
        remote,
        branch
      });
      
      return {
        content: `# 푸시 완료\n\n` +
                `**원격 저장소**: ${result.remote}\n` +
                `**브랜치**: ${result.branch}`,
        data: result,
        type: 'git-push'
      };
    } catch (error) {
      console.error('Git 푸시 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 브랜치 목록 조회
   */
  async getBranches(all = false) {
    try {
      const branches = await this.client.getBranches(all);
      
      return {
        content: `# Git 브랜치 목록\n\n` +
                branches.map(b => `${b.isCurrent ? '**' : ''}${b.name}${b.isCurrent ? '** (현재)' : ''}`).join('\n'),
        data: branches,
        type: 'git-branches'
      };
    } catch (error) {
      console.error('Git 브랜치 목록 조회 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 커밋 이력 확인
   */
  async getLog(options) {
    try {
      return {
        content: `# 커밋 이력\n\n` +
                `아직 구현 중인 기능입니다.`,
        type: 'git-log'
      };
    } catch (error) {
      console.error('Git 로그 확인 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 명령어 옵션 추출
   */
  extractOptions(args) {
    const options = {};
    
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

/**
 * 명령어 실행기
 */
class CommandExecutor {
  /**
   * 플러그인 레지스트리
   */
  constructor() {
    this.plugins = new Map();
  }
  
  /**
   * 플러그인 등록
   */
  registerPlugin(plugin) {
    if (!plugin || !plugin.id) {
      console.error('잘못된 플러그인:', plugin);
      return false;
    }
    
    console.log(`플러그인 등록: ${plugin.id} (${plugin.name})`);
    this.plugins.set(plugin.id, plugin);
    return true;
  }
  
  /**
   * 명령어 실행
   */
  async execute(command) {
    try {
      if (!command) {
        return "명령어가 없습니다.";
      }
      
      // @ 명령어 처리
      if (command.prefix === '@') {
        const plugin = this.plugins.get(command.agentId);
        
        if (!plugin) {
          return `플러그인을 찾을 수 없음: ${command.agentId}`;
        }
        
        if (!plugin.isEnabled()) {
          return `플러그인이 비활성화됨: ${command.agentId}`;
        }
        
        return await plugin.executeCommand(command.command, command.args);
      }
      
      // / 명령어 처리 (간단하게 구현)
      if (command.prefix === '/') {
        switch (command.command) {
          case 'help':
            return {
              content: `# 도움말\n\n` +
                      `## Git 명령어\n` +
                      `- @git:status - 저장소 상태 확인\n` +
                      `- @git:diff - 변경 내역 확인\n` +
                      `- @git:commit <메시지> - 변경 사항 커밋\n` +
                      `- @git:push - 변경 사항 푸시\n` +
                      `- @git:branch - 브랜치 목록 확인\n\n` +
                      `## 내부 명령어\n` +
                      `- /help - 도움말 표시\n` +
                      `- /clear - 콘솔 지우기`
            };
          case 'clear':
            console.clear();
            return {
              content: "콘솔이 지워졌습니다."
            };
          default:
            return `알 수 없는 명령어: ${command.command}`;
        }
      }
      
      return "지원하지 않는 명령어 형식입니다.";
    } catch (error) {
      console.error(`명령어 실행 중 오류 발생:`, error);
      return `오류: ${error.message}`;
    }
  }
}

/**
 * CLI 인터페이스
 */
async function startCLI() {
  // 설정
  const parser = new CommandParser();
  const executor = new CommandExecutor();
  
  // Git 플러그인 초기화 및 등록
  const gitPlugin = new GitPlugin();
  await gitPlugin.initialize();
  executor.registerPlugin(gitPlugin);
  
  console.log('\n='.repeat(60));
  console.log('Axiom Git 플러그인 테스트');
  console.log('='.repeat(60));
  console.log('\n사용 가능한 명령어:');
  console.log('@git:status - Git 저장소 상태 확인');
  console.log('@git:diff - 변경 내역 확인');
  console.log('@git:commit <message> - 변경 사항 커밋');
  console.log('@git:push - 변경 사항 푸시');
  console.log('@git:branch - 브랜치 목록 확인');
  console.log('/help - 도움말 표시');
  console.log('/clear - 콘솔 지우기');
  console.log('/exit - 종료');
  console.log('\n명령어를 입력하세요 (또는 /exit로 종료):');
  
  // 사용자 입력 처리
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const processInput = async (input) => {
    if (input.trim() === '/exit') {
      console.log('종료합니다...');
      readline.close();
      return;
    }
    
    try {
      const command = parser.parse(input);
      
      if (command) {
        console.log(`\n명령어 실행: ${command.prefix}${command.agentId}:${command.command}`);
        const result = await executor.execute(command);
        
        if (typeof result === 'string') {
          console.log(result);
        } else if (result && result.content) {
          console.log('\n' + result.content);
        }
      } else {
        console.log('명령어가 아닌 일반 텍스트입니다.');
      }
    } catch (error) {
      console.error('오류:', error.message);
    }
    
    console.log('\n명령어를 입력하세요 (또는 /exit로 종료):');
  };
  
  readline.on('line', processInput);
}

// CLI 시작
startCLI().catch(console.error);