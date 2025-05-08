/**
 * 슬래시 커맨드 시스템 인터페이스
 * 
 * 채팅 인터페이스에서 "/" 접두사로 시작하는 명령어를 처리하는 시스템
 */

import * as vscode from 'vscode';

/**
 * 슬래시 커맨드 실행 컨텍스트
 */
export interface CommandContext {
  // 명령 실행에 필요한 서비스와 컨텍스트
  extensionContext: vscode.ExtensionContext;
  // 명령에 전달된 인자들
  args: string[];
  // 원본 입력 텍스트
  originalInput: string;
}

/**
 * 슬래시 커맨드 정의 인터페이스
 */
export interface SlashCommand {
  // 명령어 이름 (슬래시 제외, 예: "help")
  name: string;
  
  // 명령어 별칭들
  aliases?: string[];
  
  // 명령어 설명
  description: string;
  
  // 명령어 사용법 예시
  examples?: string[];
  
  // 명령어 카테고리
  category: 'general' | 'git' | 'code' | 'utility' | 'advanced';
  
  // 명령어 실행 우선순위 (낮을수록 먼저 표시)
  priority?: number;
  
  // 명령어 실행 함수
  execute: (context: CommandContext) => Promise<void>;
  
  // 자동완성 제공자
  provideCompletions?: (partialArgs: string) => string[];
}

/**
 * 이중 언어(한국어/영어) 지원 슬래시 커맨드 정의 인터페이스
 * 
 * 한국어와 영어로 명령어, 설명, 예시를 지정할 수 있습니다.
 */
export interface BilingualCommand extends SlashCommand {
  // 한국어 명령어 이름 (슬래시 제외, 예: "도움말")
  koreanName?: string;
  
  // 한국어 명령어 별칭들
  koreanAliases?: string[];
  
  // 한국어 명령어 설명
  koreanDescription?: string;
  
  // 한국어 명령어 사용법 예시
  koreanExamples?: string[];
  
  // 한국어 명령어와 영어 명령어 매핑 (의도 기반 매칭에 사용)
  // 예: { "도움말": "help", "도와줘": "help" }
  intentMap?: Record<string, string>;

  // 언어 코드 ("ko" | "en")
  // 기본값: "en"
  languageCode?: "ko" | "en";
}

/**
 * 슬래시 커맨드 제안 항목
 */
export interface CommandSuggestion {
  // 명령어 이름 (표시용)
  label: string;
  
  // 명령어 설명
  description: string;
  
  // 명령어 상세 설명
  detail?: string;
  
  // 카테고리
  category: string;
  
  // 삽입할 텍스트
  insertText: string;
  
  // 명령어 아이콘
  iconPath?: { light: string | vscode.Uri; dark: string | vscode.Uri } | vscode.ThemeIcon | vscode.Uri;
}