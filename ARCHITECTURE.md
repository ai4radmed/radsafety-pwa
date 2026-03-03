# RadSafety-PWA 아키텍처 개요

이 문서는 개발자와 AI 에이전트 간의 효율적인 협업을 돕기 위한 아키텍처 설명서입니다.
본 프로젝트는 **AI-Native Spec-Driven Development (AI 네이티브 명세 주도 개발)** 방법론을 채택하여 복잡한 로직을 안정적으로 구축하고 유지보수합니다.

**진입점(Entry)**: AI 도구별로 하나의 진입점을 두고, 모두 이 아키텍처 문서를 참조합니다.

- **Antigravity Gemini**: [entry.gemini.md](entry.gemini.md)
- **Cursor(Claude)**: [entry.cursor.md](entry.cursor.md)

## 1. 개요 (Overview)

RadSafety-PWA는 Astro를 기반으로 하는 프로젝트입니다. SSR(Server-Side Rendering) 렌더링을 기본으로 하여 사용자 체감 속도를 극대화하고 있으며, Vercel과 Supabase를 활용하여 강력한 인프라를 구성하고 있습니다. 이 아키텍처 문서는 프로젝트의 컴포넌트와 API 로직을 체계적으로 명세화하여 AI(Gemini, Claude 등)가 환각 없이 예측 가능한 코드를 생산할 수 있게 돕는 '전체 시스템 지도' 역할을 합니다.

## 2. 기술 스택과 도구

- **프레임워크**: Astro 5.x (SSR 전용, PWA)
- **배포/호스팅**: Vercel (서울 리전)
- **데이터베이스/인증**: Supabase (PostgreSQL, 도쿄 리전), 카카오 로그인 + 이메일 폴백
- **상태 관리**: Nanostores (클라이언트 전역 상태)
- **코드 품질**: ESLint, Prettier (Husky pre-commit)
- **접근성/테스트**: Vitest (단위 테스트), Playwright (E2E 테스트)
- **패키지 관리**: npm (`package.json`, `package-lock.json`)

## 3. 코드 구조와 시스템 영역 (Level 3 구현 뼈대)

Astro 프로젝트 특성에 맞추어 디렉터리를 분리하며, 각 영역은 구체적인 파일 기반 명세서(`.spec`)의 관리를 받습니다.

### 3.1 주요 디렉터리 역할

- `src/pages/` ↔ `.spec/src/pages/*.md`
    - 라우팅 진입점 및 페이지 컴포넌트 (`.astro`). 모든 페이지는 `prerender = false` 로 SSR을 강제합니다.
- `src/layouts/` ↔ `.spec/src/layouts/*.md`
    - 공통 레이아웃 래퍼 (`DashboardLayout.astro` 등)를 담당합니다.
- `src/components/` ↔ `.spec/src/components/*.md`
    - 재사용 가능한 기본 UI 컴포넌트입니다.
- `src/actions/` ↔ `.spec/src/actions/*.md`
    - 서버 사이드 함수 처리 (DB 쓰기, 폼 핸들링 등) 및 API 역할을 수행합니다.
- `src/lib/` ↔ `.spec/src/lib/*.md`
    - 데이터베이스 연결, 서드파티 통합, 로깅, 비즈니스 유틸리티 로직을 포함합니다.
- `src/content/` ↔ `.spec/src/content/*.md`
    - MDX 콘텐츠 처리 로직 및 컬렉션 스키마 정의.
- `sql_query/` ↔ `.spec/sql_query/*.md`
    - `rebuild_all_tables.sql` 등의 SSOT 단일 마이그레이션 파일과 관련된 스키마 및 권한 로직.

## 4. AI-Native 명세의 계층 구조 (Specification Hierarchy)

AI 에이전트는 코드 컨텍스트의 파편화를 막기 위해 다음과 같은 **파일 기반 3단계 명세 구조**를 기준으로 작업합니다.

### Level 1: 프로젝트 맵 (`ARCHITECTURE.md` 등)

- (본 문서) 기술 스택, 디렉터리 정책, 인프라 등 전체 애플리케이션의 큰 구조와 워크플로우 규칙을 제시합니다.
- 상세 도메인 룰은 `documents/` 하위 마크다운(코드베이스 가이드, 데이터베이스 스키마, 테스트 전략)을 참고합니다.

### Level 2: 개별 파일 명세서 (`.spec/` 폴더)

- 파일 하나당 1:1로 매핑되는 **명세 전용 문서**입니다.
- 예: `.spec/src/pages/login.md`, `.spec/src/lib/supabase.md`
- **구성 요소**: 역할 요약, Public API/Props 요약, 사이드 이펙트, 핵심 규칙 3~5줄.
- AI가 코드를 구현하거나 리팩터링할 때 반드시 읽어야 하는 '설계도'입니다. 전체 프로젝트를 다 읽지 않고 이 파일만 참조하여 의도된 코드를 작성합니다.

### Level 3: 구현체 (`src/`, `tests/` 폴더)

- Level 2 명세서를 바탕으로 작성된 실제 `.astro`, `.ts` 소스 코드입니다.
- **[원칙]**: 명세서에 어긋난 코딩은 허용되지 않으며, 변경이 필요한 경우 항상 **명세서(`.spec/`)를 먼저 갱신한 후 코드를 수정(Sync)** 합니다.

## 5. 실행 로직: Spec-First Workflow

AI 기반 4단계 개발 플로우를 통해 앱 품질을 일정하게 유지합니다.

1. **Plan**: 특정 기능 작업 지시가 주어지면, AI는 타겟 파일 목록과 명세(Spec) 초안을 도출합니다.
2. **Manifest**: 출력된 명세를 `.spec` 구조 하위에 추가하여 버전 관리 영역에 귀속시킵니다.
3. **Execute**: 에이전트는 작성된 `.spec`을 기반으로 `src/`에 구현체를 생성합니다. 동시에 기능에 상응하는 E2E 또는 Unit 단위의 테스트 파일 생성을 병행합니다.
4. **Verify**: 터미널 명령(`npm run lint`, `npm run check`, `npm run test:unit`)을 통해 명세 규정에 따른 코드 정합성을 자동으로 검증합니다.

## 6. 개발 원칙 및 브랜치 전략

- **브랜치 흐름**: 항상 `dev` 환경에서 작업하고(`git checkout dev`) `dev`로 푸시합니다. 로컬에서 `main` 브랜치는 사용하지 않으며 Vercel 파이프라인(MR/PR)을 통해서만 `origin/main`으로 병합됩니다.
- **자료실 단일 소스 워크플로우**: 모든 자료는 Slug 시스템(예: `/resources/slug-name`)을 통해서만 참조되고 관리되어야 합니다. `.spec` 파일 작성 시 이 규칙을 강제 명시합니다.
- **PWA 오프라인 폴백 전략**: 오프라인 상태에서는 쓰기 작업을 차단하며, 지정된 페이지(홈/수검준비 등)만 Service Worker 캐시를 통해 읽기 전용으로 응답합니다.

## 7. 향후 발전 방향

- `.spec/features/`를 활용하여 사용자 시나리오(예: 카카오 로그인 플로우, 안전 점검 기록 생성) 기반의 **E2E 테스트 중심의 명세화**를 확대합니다.
- CI/CD 파이프라인 내 코드 레벨뿐 아니라, PR/MR 과정에서 명세(`.spec`)와 구현체(`src/`)간의 불일치를 판별하는 **AI 검증 프로세스(AI Agentic Reviewer)**를 도입합니다.
