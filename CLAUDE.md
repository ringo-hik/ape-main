# APE Extension 컴포넌트 지침 (CLAUDE.md)

## 문서 메타데이터
- **최종 업데이트**: 2023-05-07
- **버전**: 1.0
- **상위 문서**: [/ape/ape-supervisor/CLAUDE.md](/ape/ape-supervisor/CLAUDE.md)
- **관련 문서**: [/ape/ape-supervisor/CONTEXT_VAULT.md](/ape/ape-supervisor/CONTEXT_VAULT.md)

## 중요: 항상 상위 문서 먼저 참조

이 문서는 APE Extension 컴포넌트에 대한 지침을 제공합니다. 이 문서를 읽기 전에 반드시 루트 디렉토리의 CLAUDE.md를 먼저 읽어 전체 프로젝트 맥락을 이해하세요.

## Extension 컴포넌트 소개

APE Extension 컴포넌트는 전체 APE 프로젝트의 코드 마이그레이션을 담당하는 영역입니다. 주로 워커-3(코드 마이그레이션 담당)이 이 컴포넌트에서 작업하며, 레거시 코드를 새 아키텍처에 맞게 변환하고 구현하는 작업을 수행합니다.

## 주요 책임 영역

1. **코드 마이그레이션**
   - 레거시 코드의 새 구조로 변환
   - 기능 재구현 및 최적화
   - 코드 현대화 및 개선
   - 변환된 코드의 단위 테스트

2. **최적화 및 리팩토링**
   - 성능 병목 식별 및 해결
   - 코드 중복 제거
   - 디자인 패턴 적용
   - 코드 품질 및 가독성 향상

3. **기능 구현**
   - 새 아키텍처에 맞는 기능 구현
   - API 및 인터페이스 구현
   - 결측 기능 추가
   - 기존 기능 향상

## 작업 지침

### 마이그레이션 프로세스

1. **마이그레이션 준비**
   - 워커-1의 레거시 코드 분석 결과 검토
   - 워커-2의 새 아키텍처 설계 이해
   - 마이그레이션 전략 및 접근 방식 결정
   - 우선순위 및 의존성 식별

2. **코드 변환**
   - 모듈별 코드 변환 계획 수립
   - 새 아키텍처에 맞는 코드 구조 구현
   - 인터페이스 및 API 구현
   - 단위 테스트 작성 및 실행

3. **검증 및 최적화**
   - 변환된 코드 기능 검증
   - 성능 테스트 및 최적화
   - 코드 품질 검토 및 개선
   - 리팩토링 및 패턴 적용

### 산출물 형식

모든 마이그레이션 결과는 다음 형식으로 제공해야 합니다:

1. **마이그레이션 보고서**: 변환된 코드 모듈 및 기능 목록
2. **코드베이스**: 새 아키텍처에 맞게 구현된 코드
3. **테스트 결과**: 단위 테스트 및 기능 검증 결과
4. **이슈 목록**: 식별된 문제 및 해결 방법
5. **최적화 보고서**: 성능 개선 및 리팩토링 결과

## 작업 흐름

워커-3은 다음 작업 흐름을 따라 코드 마이그레이션을 진행합니다:

1. 슈퍼바이저로부터 마이그레이션 작업 할당 받음
2. 워커-1의 레거시 코드 분석 및 워커-2의 아키텍처 설계 검토
3. 마이그레이션 계획 및 우선순위 수립
4. 모듈별 코드 변환 및 구현
5. 단위 테스트 작성 및 실행
6. 코드 품질 검토 및 최적화
7. 결과물 워커-4(통합 검증)에게 전달
8. 통합 이슈 해결 및 개선

## 도구 및 기술

마이그레이션 작업에 다음 도구와 기술을 활용할 수 있습니다:

1. **개발 환경**: VSCode, TypeScript, Node.js
2. **테스트 도구**: Jest, Mocha, 단위 테스트 프레임워크
3. **코드 품질 도구**: ESLint, SonarQube, TypeScript 컴파일러
4. **버전 관리**: Git, 분기 전략, 코드 리뷰

## 워커 간 협업

워커-3은 다음과 같이 다른 워커와 협업합니다:

1. **워커-1(구조 분석)**: 레거시 코드 이해 및 구조 파악
2. **워커-2(아키텍처 설계)**: 새 아키텍처 이해 및 구현 방향 확인
3. **워커-4(통합 검증)**: 변환된 코드의 통합 및 검증 협력
4. **워커-5(QA 및 문서화)**: 코드 품질 및 기능 검증 협력

## 맥락 복구 정보

워커-3(코드 마이그레이션)의 현재 맥락을 복구하려면 다음 정보를 참조하세요:

- 현재 작업: 대기 중 (워커-1 및 워커-2 작업 완료 후 시작)
- 작업 상태: 워커-1과 워커-2의 작업 의존성으로 인해 아직 시작되지 않음
- 담당 문서: extension/WORKER3_CONTEXT.md
- 복구 명령: "너는 APE 프로젝트의 코드 마이그레이션 워커야. 하던 일을 해."

## 테스트 시스템 정보

테스트를 실행하려면 다음 명령을 사용합니다:

1. **모든 테스트 실행**: `npm test` 또는 `npm run test:all`
   - 기본 빌드 검증, LLM 자체 테스트, 단위 테스트 모두 실행

2. **빌드 검증만 실행**: `npm run test:basic`
   - LLM 테스트를 건너뛰고 기본 빌드 검증만 실행

3. **LLM 자체 테스트만 실행**:
   - 간단한 테스트: `npm run test:llm-self`
   - 전체 테스트: `npm run test:llm-full`

4. **레거시 테스트 실행** (지원 중단 예정):
   - `npm run test:llm:legacy`