/**
 * APE Todo 서비스
 *
 * 할 일 항목 관리를 위한 서비스 클래스입니다.
 * 할 일 생성, 수정, 삭제 및 필터링/정렬 기능을 제공합니다.
 */
import * as vscode from 'vscode';
import { TodoItem, TodoList, TodoPriority, TodoStatus, TodoFilterOptions, TodoSortOptions } from '../../types/todo';
export declare class TodoService {
    private context;
    private todoItems;
    private todoStoragePath;
    private _onDidChangeTodoList;
    readonly onDidChangeTodoList: vscode.Event<TodoList>;
    constructor(context: vscode.ExtensionContext);
    /**
     * 할 일 항목 로드
     */
    private loadTodoItems;
    /**
     * 할 일 항목 저장
     */
    private saveTodoItems;
    /**
     * 할 일 목록 가져오기
     */
    getTodoList(filter?: TodoFilterOptions, sort?: TodoSortOptions): TodoList;
    /**
     * 할 일 항목 필터링
     */
    private filterTodoItems;
    /**
     * 할 일 항목 정렬
     */
    private sortTodoItems;
    /**
     * 할 일 항목 추가
     */
    addTodoItem(item: Omit<TodoItem, 'id' | 'createdAt' | 'status'>): TodoItem;
    /**
     * 할 일 항목 업데이트
     */
    updateTodoItem(id: string, updates: Partial<TodoItem>): TodoItem | undefined;
    /**
     * 할 일 항목 삭제
     */
    deleteTodoItem(id: string): boolean;
    /**
     * 할 일 항목 상태 변경
     */
    changeTodoStatus(id: string, status: TodoStatus): TodoItem | undefined;
    /**
     * 할 일 항목 우선순위 변경
     */
    changeTodoPriority(id: string, priority: TodoPriority): TodoItem | undefined;
    /**
     * 특정 ID의 할 일 항목 가져오기
     */
    getTodoItem(id: string): TodoItem | undefined;
    /**
     * 우선순위별 할 일 목록 가져오기
     */
    getTodosByPriority(priority: TodoPriority): TodoItem[];
    /**
     * 모든 할 일 항목 초기화 (주의: 모든 데이터 삭제)
     */
    clearAllTodos(): void;
}
