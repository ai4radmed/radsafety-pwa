# RadSafety-PWA 아키텍처

이 문서는 AI 에이전트의 **통합 진입점(System Map)**입니다.
모든 작업은 이 문서 → `.spec/` 명세 → `src/` 구현 순서로 수행합니다.

---

## 1. 기술 스택

| 영역       | 기술                                                       |
| ---------- | ---------------------------------------------------------- |
| 프레임워크 | Astro 5.x (SSR 전용, `prerender = false` 강제)             |
| 인프라     | Vercel 서울 (Hosting), Supabase 도쿄 (Auth/DB/RLS/Storage) |
| DNS/CDN    | Cloudflare (DNS only, Full Strict SSL)                     |
| 상태 관리  | Nanostores (Client-side)                                   |
| 품질       | ESLint, Prettier, Husky, Vitest (Unit), Playwright (E2E)   |
| 패키지     | npm (`--legacy-peer-deps`)                                 |

---

## 2. 코드 구조 및 명세 매핑

각 소스 파일은 `.spec/` 디렉터리에 1:1 대응하는 명세를 가집니다.

| 소스 경로         | 명세 경로                   | 역할                      |
| ----------------- | --------------------------- | ------------------------- |
| `src/pages/`      | `.spec/src/pages/*.md`      | 라우팅 및 페이지          |
| `src/actions/`    | `.spec/src/actions/*.md`    | 서버 사이드 비즈니스 로직 |
| `src/lib/`        | `.spec/src/lib/*.md`        | DB 클라이언트, 유틸리티   |
| `src/components/` | `.spec/src/components/*.md` | UI 컴포넌트               |
| `sql_query/`      | `.spec/sql_query/*.md`      | DB 스키마 (통합 SQL 관리) |

---

## 3. 명세 계층 (Specification Hierarchy)

1. **Level 1 — System Map**: 본 문서. 전체 구조와 정책.
2. **Level 2 — File Spec**: `.spec/` 내 개별 명세. 역할, API, 핵심 규칙.
3. **Level 3 — Implementation**: `src/` 소스 코드 및 `tests/` 테스트.

---

## 4. 개발 워크플로우 (Spec-First)

1. **Plan** — 작업 지시 수령 → 타겟 파일 및 명세 초안 도출.
2. **Manifest** — `.spec/` 하위에 명세 작성/갱신.
3. **Execute** — 명세 기반으로 구현(`src/`) 및 테스트(`tests/`) 작성.
4. **Verify** — 로컬 검증(`npm run test`) 및 CI 자동 검증.

### 브랜치 전략

- 작업은 **`dev` 브랜치**에서 수행. PR을 통해서만 `origin/main`으로 병합.

### 배포 전 검증 (Husky)

- `astro check` → `npm run test:unit` → `lint-staged`

---

## 5. 핵심 정책

- **DB 관리**: 스키마 변경은 `sql_query/rebuild_all_tables.sql`에 통합 (멱등성 보장).
- **로깅**: JSON 구조화 로그, 민감 정보 노출 금지, `PUBLIC_LOG_LEVEL`로 제어.
- **Slug**: `documents/resource_slugs.md`에 등록 후 사용, 한 번 설정된 Slug는 변경 금지.
- **PWA 및 인증**: 주요 페이지는 캐시를 통한 읽기 전용 오프라인 지원. iOS PWA(Safari 샌드박스)의 세션 단절 한계를 피하기 위해 **인증 시 화면 전환(Redirect)이 발생하는 매직링크 URL 클릭이나 OAuth Redirect를 지양하고, 6자리 숫자(OTP) 입력 등 PWA 내부에서 세션을 유지하는 방식을 우선 구현**합니다.

---

## 6. 상세 참조 문서

| 문서                                                               | 용도                            |
| ------------------------------------------------------------------ | ------------------------------- |
| [codebase_guide.md](documents/codebase_guide.md)                   | 파일별 기술 역할 및 설계 가이드 |
| [database_schema.md](documents/database_schema.md)                 | ERD, 테이블/필드 정의           |
| [external_services_guide.md](documents/external_services_guide.md) | 외부 서비스 설정 및 장애 복구   |
| [test_strategy.md](documents/test_strategy.md)                     | 자동화 시나리오 및 수동 점검    |
| [logging_guide.md](documents/logging_guide.md)                     | 모듈별 로그 위치 및 보안 가이드 |
