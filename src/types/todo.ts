/**
 * TODO 시스템 타입 정의
 * 
 * APE 확장의 할 일 관리 기능에 필요한 타입과 인터페이스를 정의합니다.
 */

/**
 * 할 일 우선순위 열거형
 */
export enum TodoPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

/**
 * 할 일 상태 열거형
 */
export enum TodoStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

/**
 * 할 일 항목 인터페이스
 */
export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  priority: TodoPriority;
  status: TodoStatus;
  createdAt: Date;
  dueDate?: Date;
  updatedAt?: Date;
  completedAt?: Date;
  tags?: string[];
  assignee?: string;
  relatedFiles?: string[];
}

/**
 * 할 일 목록 인터페이스
 */
export interface TodoList {
  items: TodoItem[];
  pendingCount: number;
  completedCount: number;
}

/**
 * 할 일 필터 옵션 인터페이스
 */
export interface TodoFilterOptions {
  status?: TodoStatus[];
  priority?: TodoPriority[];
  tags?: string[];
  assignee?: string;
  text?: string;
}

/**
 * 할 일 정렬 기준 열거형
 */
export enum TodoSortBy {
  PRIORITY = 'priority',
  DUE_DATE = 'dueDate',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  STATUS = 'status',
  TITLE = 'title'
}

/**
 * 정렬 방향 열거형
 */
export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc'
}

/**
 * 할 일 정렬 옵션 인터페이스
 */
export interface TodoSortOptions {
  by: TodoSortBy;
  direction: SortDirection;
}