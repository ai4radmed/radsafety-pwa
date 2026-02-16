# RadSafety PWA 테스트 전략

## 실행 명령어 요약

| 명령어              | 도구                          | 용도           | 실행 시점       |
| ------------------- | ----------------------------- | -------------- | --------------- |
| `npm run test:unit` | Vitest                        | 단위 테스트    | 수시, CI        |
| `npm run test:e2e`  | Playwright                    | E2E 테스트     | 수시, CI        |
| `npm run test`      | Vitest + ESLint + Astro Check | 전체 자동 검증 | PR, CI          |
| `npm run check`     | Astro Check                   | 타입 검사      | CI              |
| `npm run lint`      | ESLint                        | 코드 품질      | 커밋 시 (husky) |

---

## 1. 단위 테스트 (Vitest)

**설정**: `vitest.config.ts` | **위치**: `tests/unit/` | **명령어**: `npm run test:unit`

### 현재 커버리지

| 파일                          | 테스트 대상                                               | 상태 |
| ----------------------------- | --------------------------------------------------------- | ---- |
| `unit/config/auth.test.ts`    | `getRole()`, `isAdmin()`, `getCertification()`            | 완료 |
| `unit/store/user.test.ts`     | `setUser()`, `clearUser()`, 타입 변환                     | 완료 |
| `unit/lib/logger.test.ts`     | `createLogger()` 구조화 로그                              | 완료 |
| `unit/lib/email.test.ts`      | `sendVerificationEmail()`, `sendFeedbackEmail()` dev-mode | 완료 |
| `unit/data/glossary.test.ts`  | 용어 데이터 무결성                                        | 완료 |
| `unit/data/resources.test.ts` | 자료실 데이터 무결성                                      | 완료 |

### 추가 필요 (우선순위 순)

| 파일                               | 테스트 대상                                                  | 이유                                    |
| ---------------------------------- | ------------------------------------------------------------ | --------------------------------------- |
| `unit/pages/auth.test.ts`          | `/auth/callback`, `/auth/confirm`의 `prerender = false` 검증 | 프리렌더링 누락 → 로그인 장애 재발 방지 |
| `unit/lib/supabase-server.test.ts` | `createSupabaseServerClient()` 쿠키 파싱                     | 인증 핵심 경로                          |
| `unit/middleware.test.ts`          | 미들웨어 세션 주입                                           | 인증 핵심 경로                          |

---

## 2. E2E 테스트 (Playwright)

**설정**: `playwright.config.ts` | **위치**: `tests/e2e/` | **명령어**: `npm run test:e2e`

### 현재 커버리지

| 파일                     | 테스트 대상                      | 상태 |
| ------------------------ | -------------------------------- | ---- |
| `e2e/home.spec.ts`       | 홈페이지 렌더링, 네비게이션 링크 | 완료 |
| `e2e/navigation.spec.ts` | 주요 페이지 HTTP 200 응답        | 완료 |
| `e2e/pwa.spec.ts`        | PWA manifest 검증                | 완료 |

### 추가 필요 (우선순위 순)

| 파일                        | 테스트 대상                                                                     | 자동/수동 |
| --------------------------- | ------------------------------------------------------------------------------- | --------- |
| `e2e/auth-callback.spec.ts` | `/auth/confirm`, `/auth/callback` 엔드포인트 응답 검증 (redirect, content-type) | **자동**  |
| `e2e/login-page.spec.ts`    | 로그인 페이지 UI 요소 존재 여부, 모의 로그인 → 마이페이지 이동                  | **자동**  |
| `e2e/admin-guard.spec.ts`   | 비로그인 시 관리자 페이지 접근 차단                                             | **자동**  |

---

## 3. 수동 테스트 체크리스트

아래 항목은 외부 서비스 의존성으로 자동화가 어려워 **배포 후 수동 확인**이 필요합니다.

### 인증 흐름 (배포 후 필수)

- [ ] **카카오 로그인**: 카카오 로그인 → `/auth/callback` → 마이페이지 도착
- [ ] **이메일 매직링크**: 이메일 입력 → 수신된 링크 클릭 → `/auth/confirm` → 마이페이지 도착
- [ ] **로그아웃**: 사이드바 로그아웃 → 세션 초기화 → 로그인 페이지
- [ ] **회원 탈퇴**: 마이페이지 → 회원 탈퇴 → 계정 삭제 확인

### 관리자 기능 (기능 변경 시)

- [ ] **관리자 메뉴 표시**: 관리자 이메일 로그인 → 사이드바 관리자 메뉴 노출
- [ ] **회원관리**: `/admin/members` 접근, 목록 표시
- [ ] **의견 관리**: `/admin/feedback` 접근, 목록/삭제
- [ ] **용어 관리**: `/admin/glossary` CRUD
- [ ] **알림 발송**: `/admin/send-notification` 발송 테스트
- [ ] **인증 요청**: `/admin/verification-requests` 승인/반려

### 크로스 환경 (릴리스 시)

- [ ] **모바일 브라우저**: 카카오 인앱 브라우저, Safari, Chrome
- [ ] **www vs non-www**: `www.radsafety.kr` 접속 시 정상 동작 확인
- [ ] **PWA 설치**: 홈 화면 추가 후 앱 실행

---

## 4. 빌드 타임 검증 (정적 분석)

`prerender` 누락 같은 구조적 문제를 빌드 시 자동으로 잡기 위한 검증입니다.

### 현재: `npm run check` (Astro Check)

- TypeScript 타입 검사
- Astro 컴포넌트 문법 검사

### 추가 필요: prerender 검증 테스트

서버 사이드 API(`request.headers`, `Astro.cookies` 등)를 사용하면서 `prerender = false`가 없는 페이지를 자동으로 탐지합니다.

**현재 `prerender = false` 필요 파일:**
| 파일 | 서버 API 사용 |
|------|---------------|
| `pages/auth/callback.ts` | `createSupabaseServerClient(request, cookies)` |
| `pages/auth/confirm.ts` | `createSupabaseServerClient(request, cookies)` |
| `pages/notifications.astro` | `createSupabaseServerClient(Astro.request, Astro.cookies)` |
| `pages/api/archives/[id].ts` | API route |
| `pages/admin/feedback.astro` | Supabase RLS 의존 |
| `pages/admin/glossary.astro` | Supabase RLS 의존 |
| `pages/feedback.astro` | Supabase RLS 의존 |
| `pages/my-feedback.astro` | Supabase RLS 의존 |

---

## 5. CI 파이프라인 (GitHub Actions)

**설정**: `.github/workflows/test.yml`

```
[push / PR]
    │
    ▼
┌─────────────────────────┐
│  Check (자동)            │
│  ├ astro check (타입)    │
│  ├ eslint (린트)         │
│  └ vitest run (단위)     │
└────────────┬────────────┘
             │ 성공 시
             ▼
┌─────────────────────────┐
│  E2E (자동)              │
│  └ playwright test       │
└─────────────────────────┘
```

### 현재 자동화 범위

| 단계                      | 자동     | 비고                  |
| ------------------------- | -------- | --------------------- |
| 커밋 시 lint-staged       | **자동** | husky pre-commit      |
| 타입 검사                 | **자동** | CI: `astro check`     |
| 린트                      | **자동** | CI: `eslint`          |
| 단위 테스트               | **자동** | CI: `vitest run`      |
| E2E 테스트                | **자동** | CI: `playwright test` |
| 인증 흐름 (카카오/이메일) | **수동** | 외부 서비스 의존      |
| 관리자 기능               | **수동** | 인증 필요             |
| 모바일/크로스 브라우저    | **수동** | 릴리스 시             |

---

## 6. 즉시 실행 가이드

### 개발 중 빠른 검증

```bash
# 단위 테스트만 실행
npm run test:unit

# 특정 테스트 파일만
npx vitest run tests/unit/config/auth.test.ts

# watch 모드 (파일 변경 시 자동 재실행)
npx vitest watch
```

### 배포 전 전체 검증

```bash
# 타입 + 린트 + 단위 테스트
npm run test

# E2E (로컬 dev 서버 자동 실행)
npm run test:e2e

# E2E 특정 파일만
npx playwright test tests/e2e/home.spec.ts

# E2E 디버그 모드 (브라우저 표시)
npx playwright test --headed
```

### 배포 후 수동 검증

위 **3. 수동 테스트 체크리스트** 참조
