/**
 * Rules 슬래시 커맨드 정의
 */
import { SlashCommand } from './slashCommand';
import { RulesService } from '../services/rulesService';
/**
 * Rules 슬래시 커맨드 목록 생성
 */
export declare function createRulesCommands(rulesService: RulesService): SlashCommand[];
