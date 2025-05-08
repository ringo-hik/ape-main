import { SlashCommand } from './slashCommand';
import { JiraService } from '../services/jiraService';
/**
 * Jira 명령어 생성
 */
export declare function createJiraCommands(jiraService?: JiraService): SlashCommand[];
