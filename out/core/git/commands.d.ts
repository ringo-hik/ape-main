/**
 * Git 명령어 모듈
 *
 * Git 관련 명령어들을 정의합니다.
 */
import { SlashCommand } from '../commands/slashCommand';
/**
 * Git 명령어 목록 생성
 */
export declare function createGitCommands(): SlashCommand[];
