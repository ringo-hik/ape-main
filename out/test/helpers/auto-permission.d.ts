/**
 * VSCode 확장에서 권한 요청을 자동으로 처리하는 헬퍼 클래스
 * 권한 요청 다이얼로그를 자동으로 수락하거나 무시합니다.
 */
export declare class AutoPermissionHandler {
    private static instance;
    private disposables;
    private permissionConfig;
    private constructor();
    /**
     * 싱글톤 인스턴스 가져오기
     */
    static getInstance(): AutoPermissionHandler;
    /**
     * 자동 권한 처리 설정
     */
    private setupAutoPermissions;
    /**
     * 웹뷰 HTML에 자동 권한 수락 스크립트 주입
     */
    private injectAutoPermissionScript;
    /**
     * 리소스 해제
     */
    dispose(): void;
}
export declare const autoPermissionHandler: AutoPermissionHandler;
