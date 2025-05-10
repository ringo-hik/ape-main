/**
 * Git Conflict Solver
 * 
 * Git 충돌을 자동으로 해결하는 고급 모듈
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';
import { exec } from 'child_process';
import { LLMService } from '../llm/llmService';
import { Message, MessageRole } from '../../types/chat';

const execAsync = promisify(exec);

/**
 * 충돌 해결 전략 유형
 */
export enum ConflictStrategy {
  AUTO = 'auto',
  OURS = 'ours',    // 현재 브랜치 변경사항 선택
  THEIRS = 'theirs', // 다른 브랜치 변경사항 선택
  MERGE = 'merge',   // 두 변경사항 병합
  LLM = 'llm'        // LLM 기반 지능형 병합
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
export class ConflictSolver {
  private workspaceRoot: string | undefined;
  
  /**
   * 생성자
   */
  constructor(
    private readonly llmService: LLMService
  ) {
    // 워크스페이스 루트 설정
    this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  }
  
  /**
   * 현재 저장소의 충돌 파일 목록 가져오기
   */
  public async getConflictingFiles(): Promise<string[]> {
    if (!this.workspaceRoot) {
      return [];
    }
    
    try {
      // Git 충돌 파일 목록 가져오기
      const { stdout } = await execAsync('git diff --name-only --diff-filter=U', {
        cwd: this.workspaceRoot
      });
      
      return stdout.trim().split('\n').filter(file => file.trim() !== '');
    } catch (error) {
      console.error('충돌 파일 조회 오류:', error);
      return [];
    }
  }
  
  /**
   * 지정된 전략으로 모든 충돌 해결
   */
  public async resolveAllConflicts(strategy: ConflictStrategy = ConflictStrategy.AUTO): Promise<number> {
    const conflictFiles = await this.getConflictingFiles();
    
    if (conflictFiles.length === 0) {
      return 0;
    }
    
    let resolvedCount = 0;
    
    // 진행 상황 UI
    const progressOptions = {
      location: vscode.ProgressLocation.Notification,
      title: '충돌 해결 중...',
      cancellable: true
    };
    
    await vscode.window.withProgress(progressOptions, async (progress, token) => {
      let i = 0;
      
      for (const file of conflictFiles) {
        if (token.isCancellationRequested) {
          break;
        }
        
        progress.report({
          message: `${file} (${i + 1}/${conflictFiles.length})`,
          increment: 100 / conflictFiles.length
        });
        
        const resolveSuccess = await this.resolveConflictsInFile(
          path.join(this.workspaceRoot!, file),
          strategy
        );
        
        if (resolveSuccess) {
          resolvedCount++;
        }
        
        i++;
      }
      
      return resolvedCount;
    });
    
    return resolvedCount;
  }
  
  /**
   * 단일 파일의 충돌 해결
   */
  public async resolveConflictsInFile(
    filePath: string,
    strategy: ConflictStrategy = ConflictStrategy.AUTO
  ): Promise<boolean> {
    try {
      // 파일 내용 읽기
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // 충돌 정보 파싱
      const conflictInfo = this.parseConflicts(filePath, content);
      
      if (conflictInfo.conflicts.length === 0) {
        return false;
      }
      
      // 파일 확장자 확인
      const fileExt = path.extname(filePath).substring(1);
      
      // 충돌 해결
      const resolvedContent = await this.resolveContent(content, conflictInfo, strategy, fileExt);
      
      // 해결된 내용 저장
      fs.writeFileSync(filePath, resolvedContent, 'utf-8');
      
      // Git에 추가
      if (this.workspaceRoot) {
        await execAsync(`git add "${filePath}"`, { cwd: this.workspaceRoot });
      }
      
      return true;
    } catch (error) {
      console.error(`파일 충돌 해결 오류 (${filePath}):`, error);
      return false;
    }
  }
  
  /**
   * 충돌 정보 파싱
   */
  public parseConflicts(filePath: string, content: string): ConflictInfo {
    const result: ConflictInfo = {
      filePath,
      conflicts: []
    };
    
    // 충돌 패턴
    const conflictPattern = /<<<<<<< HEAD\r?\n([\s\S]*?)\r?\n=======\r?\n([\s\S]*?)\r?\n>>>>>>> (.*?)(\r?\n|$)/g;
    
    // 라인 수 계산은 별도로 필요할 때 구현
    
    let match;
    while ((match = conflictPattern.exec(content)) !== null) {
      const fullMatch = match[0];
      const ours = match[1];
      const theirs = match[2];
      const branch = match[3];
      
      // 시작 및 종료 라인 번호 계산
      const startPos = content.substring(0, match.index).split(/\r?\n/).length - 1;
      const endPos = startPos + fullMatch.split(/\r?\n/).length - 1;
      
      result.conflicts.push({
        ours,
        theirs,
        marker: fullMatch,
        branch,
        startLine: startPos,
        endLine: endPos
      });
    }
    
    return result;
  }
  
  /**
   * 충돌 내용 해결
   */
  private async resolveContent(
    content: string,
    conflictInfo: ConflictInfo,
    strategy: ConflictStrategy,
    fileType: string
  ): Promise<string> {
    let resolvedContent = content;
    
    // 각 충돌 부분에 대해 처리
    for (const conflict of conflictInfo.conflicts) {
      // 실제 전략이 AUTO인 경우 파일 유형과 충돌 내용에 따라 최적 전략 선택
      const actualStrategy = strategy === ConflictStrategy.AUTO
        ? this.determineStrategy(conflict, fileType)
        : strategy;
      
      // 전략에 따른 충돌 해결
      const mergeResult = await this.applyStrategy(conflict, actualStrategy, fileType);
      
      if (mergeResult.success && mergeResult.resolvedContent) {
        // 충돌 마커를 해결된 내용으로 교체
        resolvedContent = resolvedContent.replace(conflict.marker, mergeResult.resolvedContent);
      }
    }
    
    return resolvedContent;
  }
  
  /**
   * 충돌에 가장 적합한 전략 결정
   */
  public determineStrategy(
    conflict: ConflictInfo['conflicts'][0],
    fileType: string
  ): ConflictStrategy {
    // 두 변경 사항이 동일한 경우
    if (conflict.ours.trim() === conflict.theirs.trim()) {
      return ConflictStrategy.OURS;
    }
    
    // 한쪽이 다른 쪽을 포함하는 경우
    if (conflict.ours.includes(conflict.theirs)) {
      return ConflictStrategy.OURS;
    }
    if (conflict.theirs.includes(conflict.ours)) {
      return ConflictStrategy.THEIRS;
    }
    
    // 양쪽 변경사항의 규모 비교
    const oursLines = conflict.ours.split(/\r?\n/).length;
    const theirsLines = conflict.theirs.split(/\r?\n/).length;
    
    // 크기 차이가 크면 큰 쪽 선택
    if (oursLines > theirsLines * 2) {
      return ConflictStrategy.OURS;
    }
    if (theirsLines > oursLines * 2) {
      return ConflictStrategy.THEIRS;
    }
    
    // 코드 파일인 경우 지능형 병합 시도
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'cs', 'go', 'rb', 'php'].includes(fileType)) {
      return ConflictStrategy.LLM;
    }
    
    // 기타 파일의 경우 단순 병합
    return ConflictStrategy.MERGE;
  }
  
  /**
   * 충돌 해결 전략 적용
   */
  public async applyStrategy(
    conflict: ConflictInfo['conflicts'][0],
    strategy: ConflictStrategy,
    fileType: string
  ): Promise<MergeResult> {
    switch (strategy) {
      case ConflictStrategy.OURS:
        return {
          success: true,
          resolvedContent: conflict.ours
        };
        
      case ConflictStrategy.THEIRS:
        return {
          success: true,
          resolvedContent: conflict.theirs
        };
        
      case ConflictStrategy.MERGE:
        return this.mergeChanges(conflict);
        
      case ConflictStrategy.LLM:
        return await this.llmBasedMerge(conflict, fileType);
        
      default:
        return {
          success: false,
          message: '지원되지 않는 전략'
        };
    }
  }
  
  /**
   * 기본 병합 전략
   */
  private mergeChanges(conflict: ConflictInfo['conflicts'][0]): MergeResult {
    // 줄 단위 병합 수행
    const oursLines = conflict.ours.split(/\r?\n/);
    const theirsLines = conflict.theirs.split(/\r?\n/);
    
    // 공통 줄 찾기
    const commonLines = oursLines.filter(line => theirsLines.includes(line));
    
    // 두 변경사항의 고유 줄 추출
    const uniqueOurs = oursLines.filter(line => !theirsLines.includes(line));
    const uniqueTheirs = theirsLines.filter(line => !oursLines.includes(line));
    
    // 중복 없이 모든 줄 결합
    const combinedLines = [...commonLines, ...uniqueOurs, ...uniqueTheirs];
    
    return {
      success: true,
      resolvedContent: combinedLines.join('\n')
    };
  }
  
  /**
   * LLM 기반 지능형 병합
   */
  private async llmBasedMerge(
    conflict: ConflictInfo['conflicts'][0],
    fileType: string
  ): Promise<MergeResult> {
    try {
      // LLM 서비스에 프롬프트 생성
      const prompt = `
두 코드 변경사항을 병합해야 합니다. 파일 타입은 ${fileType}입니다.
충돌이 발생한 코드 부분에 대해 최선의 병합 결과를 생성해주세요.
코드의 의미와 기능을 유지하면서 두 변경사항을 통합해야 합니다.

현재 브랜치 코드:
\`\`\`${fileType}
${conflict.ours}
\`\`\`

다른 브랜치 (${conflict.branch}) 코드:
\`\`\`${fileType}
${conflict.theirs}
\`\`\`

병합 결과를 직접 제공해주세요. 병합 마커나 설명 없이 코드만 결과로 반환해주세요.`;

      // LLM에 요청
      const messages: Message[] = [
        {
          id: `msg_conflict_${Date.now()}`,
          role: MessageRole.User,
          content: prompt,
          timestamp: new Date()
        }
      ];
      
      const response = await this.llmService.sendRequest(messages);
      
      if (response.success && response.data) {
        // 코드 블록에서 코드 추출
        const codeBlockRegex = /```(?:[a-z]*\n)?([\s\S]*?)```/;
        const content = response.data.content || '';
        const contentMatch = content.match(codeBlockRegex);
        
        const resolvedContent = contentMatch 
          ? contentMatch[1].trim() 
          : content.trim();
        
        return {
          success: true,
          resolvedContent
        };
      } else {
        throw new Error('LLM 서비스 응답 실패');
      }
    } catch (error) {
      console.error('LLM 기반 병합 오류:', error);
      
      // LLM 오류 시 기본 병합 전략으로 대체
      return this.mergeChanges(conflict);
    }
  }
}