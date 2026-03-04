# RadSafety-PWA 아키텍처 및 협업 지침

이 문서는 개발자와 AI 에이전트 간의 효율적인 협업을 돕기 위한 **시스템 지도(System Map)**입니다.
본 프로젝트는 **AI-Native Spec-Driven Development (AI 네이티브 명세 주도 개발)** 방법론을 채택하여 복잡한 로직을 안정적으로 구축하고 유지보수합니다.

**진입점(Entry)**: 이 문서는 모든 AI 에이전트의 통합 진입점입니다. 모든 작업은 이 문서와 여기서 연결되는 명세서(`.spec/`)를 기준으로 수행됩니다.

---

## 1. 개요 및 기술 스택

### 1.1 개요 (Overview)

RadSafety-PWA는 Astro를 기반으로 하는 SSR(Server-Side Rendering) 전용 PWA입니다. Vercel(서울)과 Supabase(도쿄)를 활용하여 강력한 인프라를 구성하고 있으며, 모든 로직은 파일 기반 명세서(`.spec`)를 통해 관리됩니다.

### 1.2 기술 스택

- **프레임워크**: Astro 5.x (SSR 전용, `prerender = false` 강제)
- **인프라**: Vercel (Hosting), Supabase (Auth/DB/RLS), Cloudflare (DNS)
- **상태 관리**: Nanostores (Client-side)
- **품질 관리**: ESLint, Prettier, Husky (pre-commit), Vitest (Unit), Playwright (E2E)
- **패키지 매니저**: npm

---

## 2. AI 협업 및 언어 규칙 (AI Principles)

- **언어 정책**: 모든 커뮤니케이션, 문서화, 커밋 메시지, 코드 주석은 **한국어**를 원칙으로 합니다. (기술 용어 제외)
- **아티팩트**: `task.md`, `implementation_plan.md` 등 모든 아티팩트는 한국어로 작성하고 최신 상태를 유지합니다.
- **워크플로우**: 반드시 **[Section 5. Spec-First Workflow]**를 준수합니다.

---

## 3. 코드 구조와 시스템 영역

Astro 디렉터리 구조를 따르며, 각 파일은 `.spec/` 디렉터리에 1:1 대응하는 명세서를 가집니다.

- `src/pages/` ↔ `.spec/src/pages/*.md` (라우팅 및 페이지)
- `src/actions/` ↔ `.spec/src/actions/*.md` (서버 사이드 비즈니스 로직)
- `src/lib/` ↔ `.spec/src/lib/*.md` (DB 클라이언트, 유틸리티)
- `src/components/` ↔ `.spec/src/components/*.md` (UI 컴포넌트)
- `sql_query/` ↔ `.spec/sql_query/*.md` (DB 스키마 - `rebuild_all_tables.sql` 통합 관리)

---

## 4. 명세 계층 구조 (Specification Hierarchy)

1. **Level 1 (System Map)**: 본 문서 (`ARCHITECTURE.md`). 전체 구조와 정책.
2. **Level 2 (File Spec)**: `.spec/` 폴더 내 개별 파일 명세서. 역할, API, 핵심 규칙 정의.
3. **Level 3 (Implementation)**: `src/` 내 실제 소스 코드 및 테스트.

---

## 5. 핵심 정책 및 개발 워크플로우

### 5.1 Spec-First Workflow

1. **Plan**: 작업 지시 수령 후 타겟 파일 및 명세 초안 도출.
2. **Manifest**: `.spec/` 하위에 명세 작성/갱신 (버전 관리 귀속).
3. **Execute**: 명세를 기반으로 구현체(`src/`) 및 테스트(`tests/`) 작성.
4. **Verify**: 로컬 및 CI 검증 (`npm run test`, AI Agentic Reviewer).

### 5.2 브랜치 전략

- 작업은 항상 **`dev` 브랜치**에서 수행합니다.
- 로컬 `main` 브랜치는 사용하지 않으며, PR을 통해서만 `origin/main`으로 병합됩니다.

### 5.3 데이터베이스 관리

- 모든 스키마 변경은 **`sql_query/rebuild_all_tables.sql`** 파일에 통합 관리합니다. (멱등성 보장)

### 5.4 로깅 정책 (Logging Policy)

- **로그 레벨**: `.env`의 `PUBLIC_LOG_LEVEL`로 제어 (`info`, `warn`, `error`).
- **운영 원칙**: 운영 환경에서는 `error` 레벨을 권장하며, 개인정보나 인증 코드 등 민감 정보가 로그에 노출되지 않도록 엄격히 관리합니다.
- **구조화 로그**: 모든 로그는 JSON 형식으로 모듈명과 타임스탬프를 포함하여 출력합니다.

### 5.5 자료실(Resources) Slug 시스템

- **원칙**: 모든 자료는 Slug(고유 식별자)를 통해 관리하며, **한 번 설정된 Slug는 절대 변경하지 않습니다.**
- **레지스트리**: `documents/resource_slugs.md`에 모든 Slug와 참조 위치를 등록 후 사용합니다.

---

## 6. 품질 및 유지보수

### 6.1 배포 전 검증 (Local)

커밋 전 자동으로 실행되는 Husky 훅을 통해 다음을 통과해야 합니다:

- `astro check` (타입 체크)
- `npm run test:unit` (단위 테스트)
- `lint-staged` (린트 및 포맷팅)

### 6.2 배포 후 검증 (Production)

- `npm run check:production`: 운영 서버 헬스체크.
- `npm run test:e2e:auth`: 중요 기능 브라우저 테스트.

### 6.3 PWA 및 오프라인

- **읽기 전용 오프라인 지원**: 주요 페이지(`홈`, `수검준비` 등)는 캐시를 통해 오프라인 조회가 가능하게 처리합니다.

---

## 7. 상세 가이드 및 유지보수 문서

프로젝트의 세부 운영 및 유지보수를 위해 다음 문서들을 참조하십시오.

- **[개발자 가이드](documents/codebase_guide.md)**: 상세 파일별 기술적 역할 및 시스템 설계 가이드.
- **[데이터베이스 설계](documents/database_schema.md)**: ERD 및 테이블/필드 상세 정의.
- **[외부 서비스 설정 가이드](documents/external_services_guide.md)**: **(중요)** Supabase, Vercel, Cloudflare, 카카오, Resend 초기 설정 및 장애 복구 절차.
- **[테스트 전략](documents/test_strategy.md)**: 상세 자동화 시나리오 및 수동 점검 체크리스트.
- **[로그 시스템 상세](documents/logging_guide.md)**: 모듈별 로그 위치 및 보안 가이드라인.
