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
    extensionContext: vscode.ExtensionContext;
    args: string[];
    originalInput: string;
}
/**
 * 슬래시 커맨드 정의 인터페이스
 */
export interface SlashCommand {
    name: string;
    aliases?: string[];
    description: string;
    examples?: string[];
    category: 'general' | 'git' | 'code' | 'utility' | 'advanced' | 'jira' | 'swdp' | 'pocket';
    priority?: number;
    args?: CommandArgument[];
    uiMode?: 'text' | 'form' | 'auto';
    execute: (context: CommandContext) => Promise<void>;
    provideCompletions?: (partialArgs: string) => string[];
    hasDefaultBehavior?: boolean;
    defaultBehavior?: (context: CommandContext) => Promise<void>;
    defaultDescription?: string;
    iconName?: string;
}
/**
 * 이중 언어(한국어/영어) 지원 슬래시 커맨드 정의 인터페이스
 *
 * 한국어와 영어로 명령어, 설명, 예시를 지정할 수 있습니다.
 */
export interface BilingualCommand extends SlashCommand {
    koreanName?: string;
    koreanAliases?: string[];
    koreanDescription?: string;
    koreanExamples?: string[];
    intentMap?: Record<string, string>;
    languageCode?: "ko" | "en";
}
/**
 * 슬래시 커맨드 제안 항목
 */
export interface CommandSuggestion {
    label: string;
    description: string;
    detail?: string;
    category: string;
    insertText: string;
    iconPath?: {
        light: string | vscode.Uri;
        dark: string | vscode.Uri;
    } | vscode.ThemeIcon | vscode.Uri;
}
/**
 * 명령어 인자 정의 (CLI와 GUI 모두 지원)
 */
export interface CommandArgument {
    name: string;
    description: string;
    required: boolean;
    type: 'text' | 'file' | 'folder' | 'select' | 'checkbox' | 'number' | 'date';
    defaultValue?: string | number | boolean;
    options?: Array<{
        label: string;
        value: string;
    }>;
    validation?: {
        pattern?: string;
        min?: number;
        max?: number;
        errorMessage?: string;
    };
    cliPattern?: string;
}
