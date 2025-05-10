# 플러그인 시스템 제거 계획 (LLM 설정 유지)

## 제거 대상

1. **디렉토리 전체 제거**
   - `/src/plugins/` 디렉토리 및 하위 모든 파일

2. **파일에서 플러그인 관련 코드 제거**
   - extension.ts
   - apeTreeDataProvider.ts
   - defaultCommands.ts
   - treeNodeTypes.ts
   - 기타 플러그인 시스템 임포트하는 모든 파일

## 변경 순서

1. **ServiceContainer에서 플러그인 관련 속성 제거**
   - `pluginEventEmitter`, `pluginRegistry`, `pluginAPI`, `pluginLoader`, `pluginSettingsManager` 속성 제거

2. **플러그인 시스템 초기화 코드 제거**
   - `initializeServices` 함수에서 플러그인 관련 코드 제거
   - 플러그인 임포트 부분 제거

3. **플러그인 관련 명령어 제거**
   - registerComponents 함수에서 'ape.plugins.*' 명령어 등록 부분 제거

4. **플러그인 정리 로직 제거**
   - deactivate 함수에서 플러그인 정리 관련 코드 제거

5. **apeTreeDataProvider에서 플러그인 관련 트리 항목 제거**
   - 네비게이터에서 플러그인 관련 노드 제거

## 제거 후 검증

1. **빌드/컴파일 확인**
   - 타입스크립트 컴파일 오류 없는지 확인

2. **기본 기능 테스트**
   - 확장 프로그램 활성화 정상 작동 확인
   - 채팅 기능 정상 작동 확인
   - 도움말/슬래시 명령어 정상 작동 확인

## 주의 사항

1. **데이터 호환성**
   - 플러그인 설정 관련 데이터 저장 부분 삭제 시 기존 설정 마이그레이션 필요 없음 (모든 플러그인 기능 제거)

2. **설정 인터페이스**
   - package.json에서 플러그인 관련 설정 항목 제거 필요

3. **문서 업데이트**
   - 플러그인 관련 문서 업데이트 필요 없음 (외부에 공개된 문서 없음)