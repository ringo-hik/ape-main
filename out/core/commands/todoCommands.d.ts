/**
 * Todo 슬래시 커맨드 정의
 */
import { SlashCommand } from './slashCommand';
import { TodoService } from '../services/todoService';
/**
 * Todo 명령어 생성
 */
export declare function createTodoCommands(todoService?: TodoService): SlashCommand[];
