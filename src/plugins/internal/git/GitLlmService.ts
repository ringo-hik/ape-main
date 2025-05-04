/**
 * Git LLM 서비스
 * 
 * LLM을 활용하여 Git 작업을 강화하는 서비스
 * - 자동 커밋 메시지 생성
 * - 코드 변경사항 분석
 * - PR 요약 생성
 */

import { LlmService } from '../../../core/llm/LlmService';
import { GitClientService } from './GitClientService';

interface CommitSuggestion {
  type: string;       // commit type: feat, fix, docs, refactor 등
  subject: string;    // commit 제목
  body?: string;      // commit 본문 (옵션)
}

interface ChangeAnalysis {
  summary: string;          // 변경사항 전체 요약
  impactLevel: 'high' | 'medium' | 'low'; // 영향도 수준
  modifiedFiles: string[];  // 변경된 파일 목록
  suggestedReviewers?: string[]; // 추천 리뷰어 (옵션)
}

/**
 * Git LLM 서비스 클래스
 */
export class GitLlmService {
  private llmService: LlmService;
  private gitClient: GitClientService;
  
  /**
   * GitLlmService 생성자
   * @param llmService LLM 서비스
   * @param gitClient Git 클라이언트 서비스
   */
  constructor(llmService: LlmService, gitClient: GitClientService) {
    this.llmService = llmService;
    this.gitClient = gitClient;
  }
  
  /**
   * 변경사항을 분석하여 자동으로 커밋 메시지 생성
   * @param staged 스테이징된 변경사항만 분석할지 여부
   * @param options 추가 옵션
   * @returns 생성된 커밋 제안
   */
  async generateCommitMessage(staged: boolean = true, options: any = {}): Promise<CommitSuggestion> {
    try {
      // 변경된 파일 목록 가져오기
      const statusResult = await this.gitClient.executeGitCommand([
        'status', '--porcelain', staged ? '--staged' : ''
      ]);
      
      const changedFiles = statusResult.stdout
        .split('\n')
        .filter(line => line.trim() !== '')
        .map(line => {
          const status = line.substring(0, 2).trim();
          const file = line.substring(3);
          return { status, file };
        });
      
      if (changedFiles.length === 0) {
        throw new Error('변경된 파일이 없습니다.');
      }
      
      // diff 내용 가져오기
      const diffContent = await this.gitClient.getDiff(staged);
      
      // diff 내용이 없는 경우
      if (!diffContent.trim()) {
        throw new Error('변경 내용이 없습니다.');
      }
      
      // 이전 커밋 메시지 스타일 확인 (일관성 유지를 위해)
      const logResult = await this.gitClient.executeGitCommand([
        'log', '-n', '5', '--pretty=format:%s'
      ]);
      
      const previousCommits = logResult.stdout.split('\n');
      
      // LLM에 전송할 프롬프트 생성
      const prompt = `
당신은 Git 커밋 메시지 전문가입니다. 제공된 변경 내용을 분석하여 의미 있는 커밋 메시지를 생성해주세요.

## 커밋 메시지 형식
1. 제목은 50자 이내로 작성하며, 현재형 시제를 사용합니다 ("Add" / "Fix" / "Update" 등)
2. 제목은 명령형으로 시작합니다 (예: "Add feature" - "Added feature"가 아님)
3. 제목 맨 앞에는 변경 유형을 나타내는 접두사를 사용합니다:
   - feat: 새로운 기능 추가
   - fix: 버그 수정
   - docs: 문서 수정
   - style: 코드 스타일 변경 (기능에 영향을 주지 않는 변경)
   - refactor: 코드 리팩토링
   - test: 테스트 관련 변경
   - chore: 빌드 프로세스, 도구 등의 변경

## 변경된 파일 목록
${changedFiles.map(item => `${item.status} ${item.file}`).join('\n')}

## 변경 내용 (diff)
\`\`\`diff
${diffContent.substring(0, 3000)}${diffContent.length > 3000 ? '\n...(생략됨)' : ''}
\`\`\`

## 이전 커밋 메시지 스타일 (참고용)
${previousCommits.join('\n')}

변경 내용을 분석하여 다음 JSON 형식으로 응답해주세요:
{
  "type": "변경 유형 (feat, fix, refactor 등)",
  "subject": "커밋 제목 (50자 이내)",
  "body": "커밋 본문 (선택 사항)"
}

타입과 제목만으로 충분한 경우 body는 생략해도 됩니다.
`;

      // LLM 요청
      const result = await this.llmService.sendRequest({
        model: options.model || this.llmService.getDefaultModelId(),
        messages: [
          {
            role: 'system',
            content: '당신은 Git 커밋 메시지 작성 전문가입니다. 변경 사항을 분석하여 표준 형식의 커밋 메시지를 작성합니다.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3
      });
      
      // JSON 응답 파싱
      try {
        // 응답에서 JSON 부분 추출
        const jsonStr = result.content.match(/\{[\s\S]*\}/)?.[0];
        
        if (!jsonStr) {
          throw new Error('LLM 응답에서 JSON을 찾을 수 없습니다.');
        }
        
        return JSON.parse(jsonStr) as CommitSuggestion;
      } catch (parseError) {
        console.error('JSON 파싱 오류:', parseError);
        
        // 파싱 실패 시 기본 포맷으로 반환
        return {
          type: 'chore',
          subject: '변경 사항 커밋',
          body: result.content
        };
      }
    } catch (error) {
      console.error('커밋 메시지 생성 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * PR을 위한 변경사항 분석
   * @param branch 비교할 브랜치 (기본: main)
   * @returns 변경사항 분석 결과
   */
  async analyzePullRequest(branch: string = 'main'): Promise<ChangeAnalysis> {
    try {
      // 현재 브랜치 확인
      const currentBranchResult = await this.gitClient.executeGitCommand([
        'rev-parse', '--abbrev-ref', 'HEAD'
      ]);
      
      const currentBranch = currentBranchResult.stdout.trim();
      
      // 브랜치 간 차이 확인
      const diffResult = await this.gitClient.executeGitCommand([
        'diff', `${branch}...${currentBranch}`, '--name-status'
      ]);
      
      const modifiedFiles = diffResult.stdout
        .split('\n')
        .filter(line => line.trim() !== '')
        .map(line => {
          const parts = line.split('\t');
          return {
            status: parts[0].trim(),
            file: parts[1]
          };
        });
      
      if (modifiedFiles.length === 0) {
        throw new Error('변경된 파일이 없습니다.');
      }
      
      // 커밋 로그 가져오기
      const logResult = await this.gitClient.executeGitCommand([
        'log', `${branch}..${currentBranch}`, '--pretty=format:%h %s'
      ]);
      
      const commits = logResult.stdout.split('\n').filter(line => line.trim() !== '');
      
      // diff 상세 내용 가져오기 (일부만)
      const diffContentResult = await this.gitClient.executeGitCommand([
        'diff', `${branch}...${currentBranch}`
      ]);
      
      const diffContent = diffContentResult.stdout;
      
      // LLM에 전송할 프롬프트 생성
      const prompt = `
현재 브랜치(${currentBranch})와 대상 브랜치(${branch}) 간의 변경 사항을 분석하여 PR(Pull Request) 요약을 작성해주세요.

## 변경된 파일 목록 (${modifiedFiles.length}개)
${modifiedFiles.map(item => `${item.status} ${item.file}`).join('\n')}

## 커밋 목록 (${commits.length}개)
${commits.join('\n')}

## 변경 내용 샘플 (일부)
\`\`\`diff
${diffContent.substring(0, 3000)}${diffContent.length > 3000 ? '\n...(생략됨)' : ''}
\`\`\`

다음 사항을 포함하여 변경 사항을 분석해주세요:
1. 변경 사항의 전체적인 요약
2. 변경의 영향도 (high/medium/low)
3. 변경된 파일 목록 (주요 파일 위주)
4. (선택 사항) 코드 리뷰시 집중해야 할 부분

JSON 형식으로 응답해주세요:
{
  "summary": "변경 사항 요약",
  "impactLevel": "영향도 (high/medium/low)",
  "modifiedFiles": ["주요 변경 파일 목록"],
  "suggestedReviewers": ["추천 리뷰어 (알고 있는 경우)"]
}`;

      // LLM 요청
      const result = await this.llmService.sendRequest({
        model: this.llmService.getDefaultModelId(),
        messages: [
          {
            role: 'system',
            content: '당신은 코드 변경 분석 전문가입니다. 제공된 변경 사항을 분석하여 명확하고 유용한 PR 요약을 제공합니다.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3
      });
      
      // JSON 응답 파싱
      try {
        // 응답에서 JSON 부분 추출
        const jsonStr = result.content.match(/\{[\s\S]*\}/)?.[0];
        
        if (!jsonStr) {
          throw new Error('LLM 응답에서 JSON을 찾을 수 없습니다.');
        }
        
        return JSON.parse(jsonStr) as ChangeAnalysis;
      } catch (parseError) {
        console.error('JSON 파싱 오류:', parseError);
        
        // 파싱 실패 시 기본 포맷으로 반환
        return {
          summary: result.content,
          impactLevel: 'medium',
          modifiedFiles: modifiedFiles.map(item => item.file)
        };
      }
    } catch (error) {
      console.error('PR 분석 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * Git 로그 기록 요약
   * @param count 요약할 커밋 수
   * @returns 요약 내용
   */
  async summarizeGitHistory(count: number = 10): Promise<string> {
    try {
      // 커밋 로그 가져오기
      const logResult = await this.gitClient.executeGitCommand([
        'log', '-n', count.toString(), '--pretty=format:%h|%an|%ad|%s', '--date=short'
      ]);
      
      const commits = logResult.stdout
        .split('\n')
        .filter(line => line.trim() !== '')
        .map(line => {
          const parts = line.split('|');
          return {
            hash: parts[0],
            author: parts[1],
            date: parts[2],
            message: parts[3]
          };
        });
      
      if (commits.length === 0) {
        return '커밋 기록이 없습니다.';
      }
      
      // LLM에 전송할 프롬프트 생성
      const prompt = `
최근 ${commits.length}개의 Git 커밋 내역을 분석하여 현재 프로젝트 개발 상태를 요약해주세요.

## 커밋 내역
${commits.map(commit => `${commit.date} [${commit.hash}] ${commit.message} (${commit.author})`).join('\n')}

다음 항목을 포함하여 요약해주세요:
1. 전체적인 개발 방향
2. 주요 작업 내용
3. 작업 중인 주요 기능
4. 해결된 문제점

최대 300자 내외로 간결하게 요약해주세요.`;

      // LLM 요청
      const result = await this.llmService.sendRequest({
        model: this.llmService.getDefaultModelId(),
        messages: [
          {
            role: 'system',
            content: '당신은 Git 기록 분석 전문가입니다. 커밋 이력을 바탕으로 프로젝트 개발 상태를 명확하고 간결하게 요약합니다.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3
      });
      
      return result.content;
    } catch (error) {
      console.error('Git 이력 요약 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 현재 변경 내용에 대한 리뷰 제안
   * @param staged 스테이징된 변경사항만 검토할지 여부
   * @returns 코드 리뷰 내용
   */
  async reviewChanges(staged: boolean = true): Promise<string> {
    try {
      // 변경된 파일 목록 가져오기
      const statusResult = await this.gitClient.executeGitCommand([
        'status', '--porcelain', staged ? '--staged' : ''
      ]);
      
      const changedFiles = statusResult.stdout
        .split('\n')
        .filter(line => line.trim() !== '')
        .map(line => {
          const status = line.substring(0, 2).trim();
          const file = line.substring(3);
          return { status, file };
        });
      
      if (changedFiles.length === 0) {
        return '변경된 파일이 없습니다.';
      }
      
      // diff 내용 가져오기
      const diffContent = await this.gitClient.getDiff(staged);
      
      // diff 내용이 없는 경우
      if (!diffContent.trim()) {
        return '변경 내용이 없습니다.';
      }
      
      // LLM에 전송할 프롬프트 생성
      const prompt = `
현재 변경 사항에 대한 코드 리뷰를 제공해주세요.

## 변경된 파일 목록
${changedFiles.map(item => `${item.status} ${item.file}`).join('\n')}

## 변경 내용 (diff)
\`\`\`diff
${diffContent.substring(0, 3000)}${diffContent.length > 3000 ? '\n...(생략됨)' : ''}
\`\`\`

다음 항목을 중점적으로 검토해주세요:
1. 코드 품질 및 가독성
2. 잠재적인 버그 또는 에러
3. 성능 이슈
4. 보안 문제
5. 개선 가능한 점

코드 리뷰 결과를 마크다운 형식으로 제공해주세요. 각 파일별로 섹션을 나누어 주세요.`;

      // LLM 요청
      const result = await this.llmService.sendRequest({
        model: this.llmService.getDefaultModelId(),
        messages: [
          {
            role: 'system',
            content: '당신은 수석 소프트웨어 엔지니어입니다. 코드 변경사항을 검토하고 건설적인 피드백을 제공합니다.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3
      });
      
      return result.content;
    } catch (error) {
      console.error('코드 리뷰 중 오류 발생:', error);
      throw error;
    }
  }
}