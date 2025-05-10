import * as vscode from 'vscode';
/**
 * Extension activation point
 * @param context Extension context
 * @returns API object that can be used by other extensions
 */
export declare function activate(context: vscode.ExtensionContext): Promise<any>;
/**
 * Extension deactivation point
 *
 * 확장 프로그램 비활성화 시 호출되며, 리소스 정리 및 메모리 해제를 수행합니다.
 * - 열려있는 연결 종료 (LLM 스트리밍 등)
 * - 이벤트 리스너 제거
 * - 캐시된 데이터 정리
 * - 불필요한 메모리 해제
 */
export declare function deactivate(): void;
