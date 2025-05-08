/**
 * APE Todo 서비스
 * 
 * 할 일 항목 관리를 위한 서비스 클래스입니다.
 * 할 일 생성, 수정, 삭제 및 필터링/정렬 기능을 제공합니다.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { 
  TodoItem, 
  TodoList, 
  TodoPriority, 
  TodoStatus, 
  TodoFilterOptions,
  TodoSortBy,
  SortDirection,
  TodoSortOptions
} from '../../types/todo';

export class TodoService {
  private todoItems: TodoItem[] = [];
  private todoStoragePath: string;
  private _onDidChangeTodoList: vscode.EventEmitter<TodoList> = new vscode.EventEmitter<TodoList>();
  readonly onDidChangeTodoList: vscode.Event<TodoList> = this._onDidChangeTodoList.event;

  constructor(private context: vscode.ExtensionContext) {
    this.todoStoragePath = path.join(context.globalStorageUri.fsPath, 'todo-storage.json');
    this.loadTodoItems();
  }

  /**
   * 할 일 항목 로드
   */
  private loadTodoItems(): void {
    try {
      if (fs.existsSync(this.todoStoragePath)) {
        const data = fs.readFileSync(this.todoStoragePath, 'utf8');
        const todoData = JSON.parse(data);
        
        // 날짜 형식 복원
        this.todoItems = todoData.map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
          dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
          completedAt: item.completedAt ? new Date(item.completedAt) : undefined
        }));
      }
    } catch (error) {
      console.error('Failed to load todo items:', error);
      this.todoItems = [];
    }
  }

  /**
   * 할 일 항목 저장
   */
  private saveTodoItems(): void {
    try {
      const dirPath = path.dirname(this.todoStoragePath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      fs.writeFileSync(this.todoStoragePath, JSON.stringify(this.todoItems, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to save todo items:', error);
    }
  }

  /**
   * 할 일 목록 가져오기
   */
  getTodoList(filter?: TodoFilterOptions, sort?: TodoSortOptions): TodoList {
    let filteredItems = this.filterTodoItems(filter);
    
    if (sort) {
      filteredItems = this.sortTodoItems(filteredItems, sort);
    } else {
      // 기본 정렬: 우선순위 높은 순 -> 상태 순(대기중 -> 진행중 -> 완료 -> 취소)
      filteredItems = this.sortTodoItems(filteredItems, {
        by: TodoSortBy.PRIORITY,
        direction: SortDirection.DESC
      });
    }

    return {
      items: filteredItems,
      pendingCount: this.todoItems.filter(item => 
        item.status === TodoStatus.PENDING || item.status === TodoStatus.IN_PROGRESS
      ).length,
      completedCount: this.todoItems.filter(item => 
        item.status === TodoStatus.COMPLETED
      ).length
    };
  }

  /**
   * 할 일 항목 필터링
   */
  private filterTodoItems(filter?: TodoFilterOptions): TodoItem[] {
    if (!filter) {
      return [...this.todoItems];
    }

    return this.todoItems.filter(item => {
      // 상태 필터링
      if (filter.status && filter.status.length > 0 && !filter.status.includes(item.status)) {
        return false;
      }

      // 우선순위 필터링
      if (filter.priority && filter.priority.length > 0 && !filter.priority.includes(item.priority)) {
        return false;
      }

      // 태그 필터링
      if (filter.tags && filter.tags.length > 0) {
        if (!item.tags || !filter.tags.some(tag => item.tags?.includes(tag))) {
          return false;
        }
      }

      // 담당자 필터링
      if (filter.assignee && item.assignee !== filter.assignee) {
        return false;
      }

      // 텍스트 검색
      if (filter.text) {
        const searchText = filter.text.toLowerCase();
        const titleMatch = item.title.toLowerCase().includes(searchText);
        const descMatch = item.description ? item.description.toLowerCase().includes(searchText) : false;
        
        if (!titleMatch && !descMatch) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * 할 일 항목 정렬
   */
  private sortTodoItems(items: TodoItem[], options: TodoSortOptions): TodoItem[] {
    const { by, direction } = options;
    const directionMultiplier = direction === SortDirection.ASC ? 1 : -1;

    return [...items].sort((a, b) => {
      let comparison = 0;

      switch (by) {
        case TodoSortBy.PRIORITY: {
          // 우선순위 매핑: HIGH(3), MEDIUM(2), LOW(1)
          const priorityValues: Record<TodoPriority, number> = {
            [TodoPriority.HIGH]: 3,
            [TodoPriority.MEDIUM]: 2,
            [TodoPriority.LOW]: 1
          };
          comparison = (priorityValues[a.priority] - priorityValues[b.priority]) * directionMultiplier;
          break;
        }
          
        case TodoSortBy.DUE_DATE:
          if (a.dueDate && b.dueDate) {
            comparison = (a.dueDate.getTime() - b.dueDate.getTime()) * directionMultiplier;
          } else if (a.dueDate) {
            comparison = -1 * directionMultiplier;
          } else if (b.dueDate) {
            comparison = 1 * directionMultiplier;
          }
          break;
          
        case TodoSortBy.CREATED_AT:
          comparison = (a.createdAt.getTime() - b.createdAt.getTime()) * directionMultiplier;
          break;
          
        case TodoSortBy.UPDATED_AT:
          if (a.updatedAt && b.updatedAt) {
            comparison = (a.updatedAt.getTime() - b.updatedAt.getTime()) * directionMultiplier;
          } else if (a.updatedAt) {
            comparison = -1 * directionMultiplier;
          } else if (b.updatedAt) {
            comparison = 1 * directionMultiplier;
          }
          break;
          
        case TodoSortBy.STATUS: {
          // 상태 매핑: PENDING(3), IN_PROGRESS(2), COMPLETED(1), CANCELLED(0)
          const statusValues: Record<TodoStatus, number> = {
            [TodoStatus.PENDING]: 3,
            [TodoStatus.IN_PROGRESS]: 2,
            [TodoStatus.COMPLETED]: 1,
            [TodoStatus.CANCELLED]: 0
          };
          comparison = (statusValues[a.status] - statusValues[b.status]) * directionMultiplier;
          break;
        }
          
        case TodoSortBy.TITLE:
          comparison = a.title.localeCompare(b.title) * directionMultiplier;
          break;
      }

      // 동일한 우선순위나 다른 정렬 기준일 경우 부차적으로 상태로 정렬
      if (comparison === 0 && by !== TodoSortBy.STATUS) {
        const statusValues: Record<TodoStatus, number> = {
          [TodoStatus.PENDING]: 3,
          [TodoStatus.IN_PROGRESS]: 2,
          [TodoStatus.COMPLETED]: 1,
          [TodoStatus.CANCELLED]: 0
        };
        comparison = (statusValues[a.status] - statusValues[b.status]);
      }

      return comparison;
    });
  }

  /**
   * 할 일 항목 추가
   */
  addTodoItem(item: Omit<TodoItem, 'id' | 'createdAt' | 'status'>): TodoItem {
    const newItem: TodoItem = {
      ...item,
      id: uuidv4(),
      createdAt: new Date(),
      status: TodoStatus.PENDING
    };

    this.todoItems.push(newItem);
    this.saveTodoItems();
    this._onDidChangeTodoList.fire(this.getTodoList());
    
    return newItem;
  }

  /**
   * 할 일 항목 업데이트
   */
  updateTodoItem(id: string, updates: Partial<TodoItem>): TodoItem | undefined {
    const index = this.todoItems.findIndex(item => item.id === id);
    
    if (index === -1) {
      return undefined;
    }

    // 완료 상태로 변경 시 completedAt 설정
    if (updates.status === TodoStatus.COMPLETED && this.todoItems[index].status !== TodoStatus.COMPLETED) {
      updates.completedAt = new Date();
    }

    const updatedItem: TodoItem = {
      ...this.todoItems[index],
      ...updates,
      updatedAt: new Date()
    };

    this.todoItems[index] = updatedItem;
    this.saveTodoItems();
    this._onDidChangeTodoList.fire(this.getTodoList());
    
    return updatedItem;
  }

  /**
   * 할 일 항목 삭제
   */
  deleteTodoItem(id: string): boolean {
    const initialLength = this.todoItems.length;
    this.todoItems = this.todoItems.filter(item => item.id !== id);
    
    const deleted = initialLength !== this.todoItems.length;
    
    if (deleted) {
      this.saveTodoItems();
      this._onDidChangeTodoList.fire(this.getTodoList());
    }
    
    return deleted;
  }

  /**
   * 할 일 항목 상태 변경
   */
  changeTodoStatus(id: string, status: TodoStatus): TodoItem | undefined {
    return this.updateTodoItem(id, { status });
  }

  /**
   * 할 일 항목 우선순위 변경
   */
  changeTodoPriority(id: string, priority: TodoPriority): TodoItem | undefined {
    return this.updateTodoItem(id, { priority });
  }

  /**
   * 특정 ID의 할 일 항목 가져오기
   */
  getTodoItem(id: string): TodoItem | undefined {
    return this.todoItems.find(item => item.id === id);
  }

  /**
   * 우선순위별 할 일 목록 가져오기
   */
  getTodosByPriority(priority: TodoPriority): TodoItem[] {
    return this.todoItems.filter(item => item.priority === priority);
  }

  /**
   * 모든 할 일 항목 초기화 (주의: 모든 데이터 삭제)
   */
  clearAllTodos(): void {
    this.todoItems = [];
    this.saveTodoItems();
    this._onDidChangeTodoList.fire(this.getTodoList());
  }
}