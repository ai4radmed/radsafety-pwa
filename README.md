# RadSafety PWA

방사선안전관리 통합 웹 서비스

---

## 빠른 시작

```bash
# 의존성 설치
npm install --legacy-peer-deps

# 개발 서버 실행
npm run dev
# → http://localhost:4321
```

### 필요한 환경 변수 (`.env`)

```env
PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
RESEND_API_KEY=re_xxxxxxxx
RESEND_FROM_EMAIL=noreply@radsafety.kr
PUBLIC_ADMIN_EMAILS=admin@example.com
```

> Supabase 키는 Dashboard > Settings > API에서 확인할 수 있습니다.

---

## 프로젝트 구조

```
radsafety-pwa/
├── src/
│   ├── pages/          ← 파일명 = URL (예: login.astro → /login)
│   ├── layouts/        ← 공통 레이아웃 (DashboardLayout.astro)
│   ├── components/     ← 재사용 UI 조각
│   ├── lib/            ← 유틸리티 (DB 연결, 이메일, 로깅)
│   ├── store/          ← 전역 상태 관리 (사용자 정보)
│   ├── actions/        ← 서버 사이드 함수 (DB 쓰기 등)
│   ├── content/        ← MDX 콘텐츠 (수검 준비, 지적사항)
│   └── styles/         ← 전역 CSS
├── sql_query/          ← DB 스키마 (rebuild_all_tables.sql)
├── tests/              ← 단위 테스트(unit/) + E2E(e2e/)
├── public/             ← 정적 파일 (아이콘, 폰트)
└── documents/          ← 유지보수 문서 (아래 참조)
```

> 코드를 처음 읽을 때는 [코드베이스 가이드](./documents/codebase_guide.md)를 먼저 보세요.
> 파이썬 경험자를 위한 비유와 파일별 설명이 있습니다.

---

## 자주 쓰는 명령어

| 명령어              | 용도                               |
| ------------------- | ---------------------------------- |
| `npm run dev`       | 개발 서버 실행 (localhost:4321)    |
| `npm run build`     | 프로덕션 빌드                      |
| `npm run preview`   | 빌드 결과물 로컬 미리보기          |
| `npm run test:unit` | 단위 테스트 (Vitest)               |
| `npm run test:e2e`  | E2E 테스트 (Playwright)            |
| `npm run test`      | 타입검사 + 린트 + 단위 테스트 전체 |
| `npm run lint`      | ESLint 코드 검사                   |
| `npm run check`     | Astro 타입 검사                    |

---

## DB 초기화 및 재구축

데이터베이스를 처음부터 다시 세팅해야 할 때의 절차입니다.

### 1단계: 기존 데이터 삭제

1. Supabase Dashboard > Authentication > Users에서 모든 회원 삭제
2. Supabase Dashboard > Table Editor에서 테이블들을 수동 삭제 (또는 SQL Editor에서 `DROP TABLE` 실행)

### 2단계: 테이블 재생성

- SQL Editor에서 `sql_query/rebuild_all_tables.sql` 실행 (모든 테이블 자동 생성)

### 3단계: 관리자 등록

1. 웹사이트에서 카카오 로그인으로 가입
2. SQL Editor에서 관리자 승격:
    ```sql
    UPDATE public.profiles SET role = 'admin' WHERE email = '본인_이메일';
    ```
3. 재로그인 후 관리자 페이지(`/admin/members`)에서 회원 명단 엑셀 업로드

---

## 유지보수 문서

| 문서                                                              | 내용                                                                  | 언제 읽나?                                    |
| ----------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------- |
| [코드베이스 가이드](./documents/codebase_guide.md)                | 프로젝트 구조, 파일 역할, 데이터 흐름, 유지보수 How-to                | 코드를 처음 읽을 때, 새 페이지/기능 추가할 때 |
| [데이터베이스 스키마](./documents/database_schema.md)             | 모든 테이블 컬럼, RPC 함수, RLS 정책 설명                             | DB 관련 작업할 때                             |
| [외부 서비스 설정 절차서](./documents/external_services_guide.md) | Supabase, Vercel, Cloudflare, 카카오, Resend 설정값과 검증 체크리스트 | 배포/설정 변경 후 검증할 때                   |
| [테스트 전략](./documents/test_strategy.md)                       | 자동/수동 테스트 범위, CI 파이프라인, 실행 방법                       | 테스트 작성/실행할 때                         |

---

## 기술 스택

| 분류         | 기술                            | 비고                          |
| ------------ | ------------------------------- | ----------------------------- |
| 프레임워크   | Astro 5.x (SSR)                 | Vercel 서울 리전 배포         |
| 데이터베이스 | Supabase (PostgreSQL)           | 도쿄 리전, 인증/스토리지 포함 |
| 상태 관리    | Nanostores                      | 클라이언트 전역 상태          |
| 이메일       | Resend                          | 인증 코드 발송                |
| DNS          | Cloudflare                      | DNS only (프록시 OFF)         |
| 인증         | 카카오 로그인 + 이메일 매직링크 | Supabase Auth 기반            |
| 테스트       | Vitest + Playwright             | CI: GitHub Actions            |
| 린트/포맷    | ESLint + Prettier               | Husky pre-commit hook         |
