"use strict";
/**
 * TODO 시스템 타입 정의
 *
 * APE 확장의 할 일 관리 기능에 필요한 타입과 인터페이스를 정의합니다.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SortDirection = exports.TodoSortBy = exports.TodoStatus = exports.TodoPriority = void 0;
/**
 * 할 일 우선순위 열거형
 */
var TodoPriority;
(function (TodoPriority) {
    TodoPriority["HIGH"] = "high";
    TodoPriority["MEDIUM"] = "medium";
    TodoPriority["LOW"] = "low";
})(TodoPriority || (exports.TodoPriority = TodoPriority = {}));
/**
 * 할 일 상태 열거형
 */
var TodoStatus;
(function (TodoStatus) {
    TodoStatus["PENDING"] = "pending";
    TodoStatus["IN_PROGRESS"] = "in-progress";
    TodoStatus["COMPLETED"] = "completed";
    TodoStatus["CANCELLED"] = "cancelled";
})(TodoStatus || (exports.TodoStatus = TodoStatus = {}));
/**
 * 할 일 정렬 기준 열거형
 */
var TodoSortBy;
(function (TodoSortBy) {
    TodoSortBy["PRIORITY"] = "priority";
    TodoSortBy["DUE_DATE"] = "dueDate";
    TodoSortBy["CREATED_AT"] = "createdAt";
    TodoSortBy["UPDATED_AT"] = "updatedAt";
    TodoSortBy["STATUS"] = "status";
    TodoSortBy["TITLE"] = "title";
})(TodoSortBy || (exports.TodoSortBy = TodoSortBy = {}));
/**
 * 정렬 방향 열거형
 */
var SortDirection;
(function (SortDirection) {
    SortDirection["ASC"] = "asc";
    SortDirection["DESC"] = "desc";
})(SortDirection || (exports.SortDirection = SortDirection = {}));
//# sourceMappingURL=todo.js.map