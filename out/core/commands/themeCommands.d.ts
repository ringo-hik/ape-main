import { SlashCommand } from './slashCommand';
import { SlashCommandManager } from './slashCommandManager';
import { ThemeManager } from '../services/themeManager';
/**
 * 테마 관련 슬래시 명령어 등록
 */
export declare function registerThemeCommands(commands: SlashCommand[] | SlashCommandManager, themeManager?: ThemeManager): void;
