"use strict";
/**
 * Todo 슬래시 커맨드 정의
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTodoCommands = createTodoCommands;
const vscode = __importStar(require("vscode"));
const todo_1 = require("../../types/todo");
/**
 * Todo 명령어 생성
 */
function createTodoCommands(todoService) {
    if (!todoService) {
        return [];
    }
    const commands = [];
    // todo 명령어: 할 일 관리 기능 제공
    commands.push({
        name: 'todo',
        aliases: ['todos', 'task', 'tasks', '할일', '투두', '태스크', '작업'],
        description: '할 일 항목을 관리합니다 (추가, 목록, 변경, 삭제)',
        examples: [
            '/todo list',
            '/todo add 새 작업 추가',
            '/todo update 작업ID 수정할내용',
            '/todo status 작업ID completed',
            '/todo priority 작업ID high',
            '/todo delete 작업ID'
        ],
        category: 'utility',
        priority: 6,
        execute: async (context) => {
            const subCommand = context.args[0]?.toLowerCase();
            if (!subCommand || subCommand === 'list' || subCommand === '목록') {
                // 할 일 목록 표시
                await listTodos(todoService);
            }
            else if (subCommand === 'add' || subCommand === '추가' || subCommand === '생성') {
                // 할 일 추가
                const title = context.args.slice(1).join(' ');
                if (title) {
                    await addTodo(todoService, title);
                }
                else {
                    vscode.window.showErrorMessage('추가할 할 일 제목을 입력해주세요');
                }
            }
            else if (subCommand === 'update' || subCommand === '수정' || subCommand === '변경') {
                // 할 일 수정
                const todoId = context.args[1];
                const updateContent = context.args.slice(2).join(' ');
                if (!todoId) {
                    vscode.window.showErrorMessage('수정할 할 일 ID를 지정해주세요');
                    return;
                }
                if (!updateContent) {
                    vscode.window.showErrorMessage('수정할 내용을 입력해주세요');
                    return;
                }
                await updateTodo(todoService, todoId, updateContent);
            }
            else if (subCommand === 'status' || subCommand === '상태') {
                // 할 일 상태 변경
                const todoId = context.args[1];
                const statusStr = context.args[2]?.toLowerCase();
                if (!todoId) {
                    vscode.window.showErrorMessage('상태를 변경할 할 일 ID를 지정해주세요');
                    return;
                }
                if (!statusStr) {
                    vscode.window.showErrorMessage('변경할 상태를 지정해주세요 (pending, in-progress, completed, cancelled)');
                    return;
                }
                await changeTodoStatus(todoService, todoId, statusStr);
            }
            else if (subCommand === 'priority' || subCommand === '우선순위') {
                // 할 일 우선순위 변경
                const todoId = context.args[1];
                const priorityStr = context.args[2]?.toLowerCase();
                if (!todoId) {
                    vscode.window.showErrorMessage('우선순위를 변경할 할 일 ID를 지정해주세요');
                    return;
                }
                if (!priorityStr) {
                    vscode.window.showErrorMessage('변경할 우선순위를 지정해주세요 (high, medium, low)');
                    return;
                }
                await changeTodoPriority(todoService, todoId, priorityStr);
            }
            else if (subCommand === 'delete' || subCommand === '삭제') {
                // 할 일 삭제
                const todoId = context.args[1];
                if (!todoId) {
                    vscode.window.showErrorMessage('삭제할 할 일 ID를 지정해주세요');
                    return;
                }
                await deleteTodo(todoService, todoId);
            }
            else if (subCommand === 'clear' || subCommand === '모두삭제' || subCommand === '초기화') {
                // 모든 할 일 항목 삭제
                await clearAllTodos(todoService);
            }
            else {
                vscode.window.showErrorMessage(`알 수 없는 할 일 하위 명령어입니다: ${subCommand}`);
            }
        },
        provideCompletions: (partialArgs) => {
            const subCommands = [
                'list', 'add', 'update', 'status', 'priority', 'delete', 'clear',
                '목록', '추가', '수정', '상태', '우선순위', '삭제', '초기화'
            ];
            const parts = partialArgs.split(' ');
            // 첫 번째 인자 자동완성 (하위 명령어)
            if (parts.length <= 1) {
                return subCommands.filter(cmd => cmd.toLowerCase().startsWith(parts[0]?.toLowerCase() || ''));
            }
            // 세 번째 인자 자동완성 (상태나 우선순위 값)
            if (parts.length === 3) {
                const subCommand = parts[0].toLowerCase();
                if (subCommand === 'status' || subCommand === '상태') {
                    const statusValues = ['pending', 'in-progress', 'completed', 'cancelled', '대기중', '진행중', '완료', '취소'];
                    return statusValues.filter(status => status.toLowerCase().startsWith(parts[2].toLowerCase() || ''));
                }
                else if (subCommand === 'priority' || subCommand === '우선순위') {
                    const priorityValues = ['high', 'medium', 'low', '높음', '중간', '낮음'];
                    return priorityValues.filter(priority => priority.toLowerCase().startsWith(parts[2].toLowerCase() || ''));
                }
            }
            return [];
        }
    });
    return commands;
}
/**
 * 할 일 목록 표시
 */
async function listTodos(todoService) {
    try {
        const todoList = todoService.getTodoList();
        if (todoList.items.length === 0) {
            await vscode.commands.executeCommand('ape.sendLlmResponse', {
                role: 'assistant',
                content: '등록된 할 일 항목이 없습니다. `/todo add 제목`으로 새 할 일을 추가하세요.'
            });
            return;
        }
        let content = `## 할 일 목록\n\n`;
        content += `- **진행 중**: ${todoList.pendingCount}개\n`;
        content += `- **완료**: ${todoList.completedCount}개\n\n`;
        // 상태별로 그룹화
        const pending = todoList.items.filter(item => item.status === todo_1.TodoStatus.PENDING);
        const inProgress = todoList.items.filter(item => item.status === todo_1.TodoStatus.IN_PROGRESS);
        const completed = todoList.items.filter(item => item.status === todo_1.TodoStatus.COMPLETED);
        const cancelled = todoList.items.filter(item => item.status === todo_1.TodoStatus.CANCELLED);
        // 우선순위 표시 함수
        const getPriorityIcon = (priority) => {
            switch (priority) {
                case todo_1.TodoPriority.HIGH: return '🔴';
                case todo_1.TodoPriority.MEDIUM: return '🟡';
                case todo_1.TodoPriority.LOW: return '🟢';
                default: return '';
            }
        };
        // 대기 중인 항목
        if (pending.length > 0) {
            content += `### ⏳ 대기 중\n\n`;
            pending.forEach(item => {
                content += `- ${getPriorityIcon(item.priority)} **${item.title}** (ID: \`${item.id}\`)`;
                if (item.description) {
                    content += ` - ${item.description}`;
                }
                content += '\n';
            });
            content += '\n';
        }
        // 진행 중인 항목
        if (inProgress.length > 0) {
            content += `### ▶️ 진행 중\n\n`;
            inProgress.forEach(item => {
                content += `- ${getPriorityIcon(item.priority)} **${item.title}** (ID: \`${item.id}\`)`;
                if (item.description) {
                    content += ` - ${item.description}`;
                }
                content += '\n';
            });
            content += '\n';
        }
        // 완료된 항목
        if (completed.length > 0) {
            content += `### ✅ 완료됨\n\n`;
            completed.forEach(item => {
                content += `- ${getPriorityIcon(item.priority)} **${item.title}** (ID: \`${item.id}\`)`;
                if (item.description) {
                    content += ` - ${item.description}`;
                }
                if (item.completedAt) {
                    content += ` (완료: ${formatDate(item.completedAt)})`;
                }
                content += '\n';
            });
            content += '\n';
        }
        // 취소된 항목
        if (cancelled.length > 0) {
            content += `### ❌ 취소됨\n\n`;
            cancelled.forEach(item => {
                content += `- ${getPriorityIcon(item.priority)} **${item.title}** (ID: \`${item.id}\`)`;
                if (item.description) {
                    content += ` - ${item.description}`;
                }
                content += '\n';
            });
            content += '\n';
        }
        content += '\n**할 일 관리 명령어**:\n';
        content += '- `/todo add 제목` - 새 할 일 추가\n';
        content += '- `/todo status ID 상태` - 상태 변경 (pending, in-progress, completed, cancelled)\n';
        content += '- `/todo priority ID 우선순위` - 우선순위 변경 (high, medium, low)\n';
        content += '- `/todo update ID 새내용` - 할 일 내용 수정\n';
        content += '- `/todo delete ID` - 할 일 삭제\n';
        await vscode.commands.executeCommand('ape.sendLlmResponse', {
            role: 'assistant',
            content
        });
    }
    catch (error) {
        console.error('할 일 목록 조회 중 오류 발생:', error);
        vscode.window.showErrorMessage(`할 일 목록 조회 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
    }
}
/**
 * 할 일 추가
 */
async function addTodo(todoService, title) {
    try {
        // 설명 입력 받기 (선택사항)
        const description = await vscode.window.showInputBox({
            prompt: '할 일 설명을 입력하세요 (선택사항)',
            placeHolder: '세부 내용 또는 설명'
        });
        // 우선순위 선택 (기본값: 중간)
        const priorities = [
            { label: '높음', value: todo_1.TodoPriority.HIGH },
            { label: '중간', value: todo_1.TodoPriority.MEDIUM, picked: true },
            { label: '낮음', value: todo_1.TodoPriority.LOW }
        ];
        const selectedPriority = await vscode.window.showQuickPick(priorities.map(p => p.label), { placeHolder: '우선순위를 선택하세요', canPickMany: false });
        if (!selectedPriority) {
            return; // 취소됨
        }
        const priority = priorities.find(p => p.label === selectedPriority)?.value || todo_1.TodoPriority.MEDIUM;
        // 할 일 추가
        const newTodo = todoService.addTodoItem({
            title,
            description,
            priority
        });
        // 성공 메시지 표시
        await vscode.commands.executeCommand('ape.sendLlmResponse', {
            role: 'assistant',
            content: `새 할 일 "${title}"이(가) 성공적으로 추가되었습니다. (ID: \`${newTodo.id}\`, 우선순위: ${getPriorityLabel(priority)})`
        });
    }
    catch (error) {
        console.error('할 일 추가 중 오류 발생:', error);
        vscode.window.showErrorMessage(`할 일 추가 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
    }
}
/**
 * 할 일 수정
 */
async function updateTodo(todoService, todoId, newTitle) {
    try {
        // 할 일 확인
        const todo = todoService.getTodoItem(todoId);
        if (!todo) {
            await vscode.commands.executeCommand('ape.sendLlmResponse', {
                role: 'assistant',
                content: `ID가 \`${todoId}\`인 할 일 항목을 찾을 수 없습니다.`
            });
            return;
        }
        // 할 일 제목 수정
        todoService.updateTodoItem(todoId, { title: newTitle });
        // 성공 메시지 표시
        await vscode.commands.executeCommand('ape.sendLlmResponse', {
            role: 'assistant',
            content: `할 일 내용이 변경되었습니다.\n- 이전: "${todo.title}"\n- 변경: "${newTitle}"`
        });
    }
    catch (error) {
        console.error('할 일 수정 중 오류 발생:', error);
        vscode.window.showErrorMessage(`할 일 수정 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
    }
}
/**
 * 할 일 상태 변경
 */
async function changeTodoStatus(todoService, todoId, statusStr) {
    try {
        // 할 일 확인
        const todo = todoService.getTodoItem(todoId);
        if (!todo) {
            await vscode.commands.executeCommand('ape.sendLlmResponse', {
                role: 'assistant',
                content: `ID가 \`${todoId}\`인 할 일 항목을 찾을 수 없습니다.`
            });
            return;
        }
        // 상태 문자열을 열거형으로 변환
        let status;
        switch (statusStr.toLowerCase()) {
            case 'pending':
            case 'wait':
            case '대기':
            case '대기중':
                status = todo_1.TodoStatus.PENDING;
                break;
            case 'in-progress':
            case 'progress':
            case 'doing':
            case '진행':
            case '진행중':
                status = todo_1.TodoStatus.IN_PROGRESS;
                break;
            case 'completed':
            case 'complete':
            case 'done':
            case '완료':
            case '완료됨':
                status = todo_1.TodoStatus.COMPLETED;
                break;
            case 'cancelled':
            case 'cancel':
            case '취소':
            case '취소됨':
                status = todo_1.TodoStatus.CANCELLED;
                break;
            default:
                await vscode.commands.executeCommand('ape.sendLlmResponse', {
                    role: 'assistant',
                    content: `지원하지 않는 상태입니다: ${statusStr}. 지원되는 상태: pending, in-progress, completed, cancelled`
                });
                return;
        }
        // 이미 동일한 상태인 경우
        if (todo.status === status) {
            await vscode.commands.executeCommand('ape.sendLlmResponse', {
                role: 'assistant',
                content: `할 일 "${todo.title}"은(는) 이미 ${getStatusLabel(status)} 상태입니다.`
            });
            return;
        }
        // 할 일 상태 변경
        todoService.changeTodoStatus(todoId, status);
        // 성공 메시지 표시
        await vscode.commands.executeCommand('ape.sendLlmResponse', {
            role: 'assistant',
            content: `할 일 "${todo.title}"의 상태가 ${getStatusLabel(todo.status)}에서 ${getStatusLabel(status)}(으)로 변경되었습니다.`
        });
    }
    catch (error) {
        console.error('할 일 상태 변경 중 오류 발생:', error);
        vscode.window.showErrorMessage(`할 일 상태 변경 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
    }
}
/**
 * 할 일 우선순위 변경
 */
async function changeTodoPriority(todoService, todoId, priorityStr) {
    try {
        // 할 일 확인
        const todo = todoService.getTodoItem(todoId);
        if (!todo) {
            await vscode.commands.executeCommand('ape.sendLlmResponse', {
                role: 'assistant',
                content: `ID가 \`${todoId}\`인 할 일 항목을 찾을 수 없습니다.`
            });
            return;
        }
        // 우선순위 문자열을 열거형으로 변환
        let priority;
        switch (priorityStr.toLowerCase()) {
            case 'high':
            case '높음':
            case '높은':
            case 'urgent':
            case '긴급':
                priority = todo_1.TodoPriority.HIGH;
                break;
            case 'medium':
            case 'mid':
            case 'normal':
            case '중간':
            case '보통':
                priority = todo_1.TodoPriority.MEDIUM;
                break;
            case 'low':
            case '낮음':
            case '낮은':
                priority = todo_1.TodoPriority.LOW;
                break;
            default:
                await vscode.commands.executeCommand('ape.sendLlmResponse', {
                    role: 'assistant',
                    content: `지원하지 않는 우선순위입니다: ${priorityStr}. 지원되는 우선순위: high, medium, low`
                });
                return;
        }
        // 이미 동일한 우선순위인 경우
        if (todo.priority === priority) {
            await vscode.commands.executeCommand('ape.sendLlmResponse', {
                role: 'assistant',
                content: `할 일 "${todo.title}"은(는) 이미 ${getPriorityLabel(priority)} 우선순위입니다.`
            });
            return;
        }
        // 할 일 우선순위 변경
        todoService.changeTodoPriority(todoId, priority);
        // 성공 메시지 표시
        await vscode.commands.executeCommand('ape.sendLlmResponse', {
            role: 'assistant',
            content: `할 일 "${todo.title}"의 우선순위가 ${getPriorityLabel(todo.priority)}에서 ${getPriorityLabel(priority)}(으)로 변경되었습니다.`
        });
    }
    catch (error) {
        console.error('할 일 우선순위 변경 중 오류 발생:', error);
        vscode.window.showErrorMessage(`할 일 우선순위 변경 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
    }
}
/**
 * 할 일 삭제
 */
async function deleteTodo(todoService, todoId) {
    try {
        // 할 일 확인
        const todo = todoService.getTodoItem(todoId);
        if (!todo) {
            await vscode.commands.executeCommand('ape.sendLlmResponse', {
                role: 'assistant',
                content: `ID가 \`${todoId}\`인 할 일 항목을 찾을 수 없습니다.`
            });
            return;
        }
        // 삭제 확인
        const confirmation = await vscode.window.showWarningMessage(`할 일 "${todo.title}"을(를) 삭제하시겠습니까?`, { modal: true }, '삭제', '취소');
        if (confirmation !== '삭제') {
            await vscode.commands.executeCommand('ape.sendLlmResponse', {
                role: 'assistant',
                content: `할 일 삭제가 취소되었습니다.`
            });
            return;
        }
        // 할 일 삭제
        const deleted = todoService.deleteTodoItem(todoId);
        // 성공 메시지 표시
        if (deleted) {
            await vscode.commands.executeCommand('ape.sendLlmResponse', {
                role: 'assistant',
                content: `할 일 "${todo.title}"이(가) 삭제되었습니다.`
            });
        }
        else {
            await vscode.commands.executeCommand('ape.sendLlmResponse', {
                role: 'assistant',
                content: `할 일 삭제 중 오류가 발생했습니다.`
            });
        }
    }
    catch (error) {
        console.error('할 일 삭제 중 오류 발생:', error);
        vscode.window.showErrorMessage(`할 일 삭제 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
    }
}
/**
 * 모든 할 일 삭제
 */
async function clearAllTodos(todoService) {
    try {
        // 삭제 확인
        const confirmation = await vscode.window.showWarningMessage('모든 할 일 항목을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.', { modal: true }, '삭제', '취소');
        if (confirmation !== '삭제') {
            await vscode.commands.executeCommand('ape.sendLlmResponse', {
                role: 'assistant',
                content: `할 일 초기화가 취소되었습니다.`
            });
            return;
        }
        // 모든 할 일 삭제
        todoService.clearAllTodos();
        // 성공 메시지 표시
        await vscode.commands.executeCommand('ape.sendLlmResponse', {
            role: 'assistant',
            content: `모든 할 일 항목이 삭제되었습니다.`
        });
    }
    catch (error) {
        console.error('할 일 초기화 중 오류 발생:', error);
        vscode.window.showErrorMessage(`할 일 초기화 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
    }
}
/**
 * 우선순위 라벨 가져오기
 */
function getPriorityLabel(priority) {
    switch (priority) {
        case todo_1.TodoPriority.HIGH: return '높음';
        case todo_1.TodoPriority.MEDIUM: return '중간';
        case todo_1.TodoPriority.LOW: return '낮음';
        default: return String(priority);
    }
}
/**
 * 상태 라벨 가져오기
 */
function getStatusLabel(status) {
    switch (status) {
        case todo_1.TodoStatus.PENDING: return '대기중';
        case todo_1.TodoStatus.IN_PROGRESS: return '진행중';
        case todo_1.TodoStatus.COMPLETED: return '완료됨';
        case todo_1.TodoStatus.CANCELLED: return '취소됨';
        default: return String(status);
    }
}
/**
 * 날짜 포맷팅
 */
function formatDate(date) {
    if (!date)
        return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString();
}
//# sourceMappingURL=todoCommands.js.map