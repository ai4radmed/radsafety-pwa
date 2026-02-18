# RadSafety PWA 테스트 전략

## 실행 명령어 요약

| 명령어                          | 도구                          | 용도                   | 실행 시점        |
| ------------------------------- | ----------------------------- | ---------------------- | ---------------- |
| `npm run test:unit`             | Vitest                        | 단위 테스트            | 수시, CI         |
| `npm run test:e2e`              | Playwright                    | E2E 테스트 (비로그인)  | 수시, CI         |
| `npm run test:e2e:save-session` | Playwright (--headed)         | 세션 저장 (1회)        | 배포 후 최초 1회 |
| `npm run test:e2e:auth`         | Playwright (세션 주입)        | E2E 테스트 (로그인 후) | 배포 후 로컬     |
| `npm run check:production`      | Node.js HTTP 헬스체크         | 운영 서버 자동 점검    | 배포 후 즉시     |
| `npm run test`                  | Vitest + ESLint + Astro Check | 전체 자동 검증         | PR, CI           |
| `npm run check`                 | Astro Check                   | 타입 검사              | CI               |
| `npm run lint`                  | ESLint                        | 코드 품질              | 커밋 시 (husky)  |

---

## 배포 후 검증 흐름

```
[CI] 자동 실행 ─┬─ astro check
                 ├─ eslint
                 ├─ vitest run
                 └─ playwright test (비로그인 E2E)
                      ↓ CI 통과
[Vercel] 자동 배포
                      ↓ 배포 완료
[로컬] npm run check:production   ← 운영 서버 HTTP 헬스체크 (2분)
[로컬] npm run test:e2e:auth      ← 로그인 후 기능 자동 점검 (세션 필요)
                      ↓
[수동] 잔여 항목만 체크 (이메일 매직링크, 카카오 로그인 실제 확인)
```

### 세션 최초 저장 (배포마다 세션 만료 시)

```bash
# 1. dev 서버 실행
npm run dev

# 2. 세션 저장 (브라우저 창이 열립니다)
npm run test:e2e:save-session
# → 로컬/Preview (PUBLIC_DEV_MODE=true + DEV_TEST_*_EMAIL/PASSWORD 설정):
#     [개발자 모드] 버튼을 자동으로 클릭하여 로그인 → 완전 자동화
# → Production 또는 환경변수 미설정:
#     카카오 또는 이메일 매직링크로 직접 로그인 → /mypage 도달 시 자동 저장
# → 일반 사용자·관리자 순서로 2회 실행

# 3. 이후 반복 실행 (세션 유효한 동안)
npm run test:e2e:auth
```

> **세션 유효기간**: Supabase 기본값 1시간. 만료 시 `test:e2e:save-session` 재실행.
> 세션 파일(`tests/fixtures/session-*.json`)은 `.gitignore`에 포함 — 절대 커밋하지 않음.

### 개발용 테스트 계정 (빠른 로그인)

Preview 및 로컬 환경(`PUBLIC_DEV_MODE=true`)에서 `/login` 하단 [개발자 모드] 버튼으로 즉시 로그인할 수 있습니다.

| 버튼                 | 계정                      | 역할   |
| -------------------- | ------------------------- | ------ |
| 테스트 사용자 로그인 | `test-user@radsafety.kr`  | 일반   |
| 테스트 관리자 로그인 | `test-admin@radsafety.kr` | 관리자 |

- `signInWithPassword()`를 사용하므로 **실제 Supabase 세션**이 생성됩니다.
- 보호 페이지(`/mypage`, `/admin/*`) 접근이 정상 동작합니다.
- Production에는 `PUBLIC_DEV_MODE` 미설정 → 버튼 미표시.

> **⚠️ 보안 주의**: 비밀번호는 SSR에서 HTML `data-*` 속성으로 클라이언트에 전달됩니다.
> `isDevMode` 가드로 Production 노출은 차단되지만, **Preview 배포 URL을 외부에 공유하면
> 비밀번호가 HTML 소스에서 노출됩니다.** Preview URL은 팀 내부에서만 공유하세요.

> 계정 생성·환경변수 설정·profiles SQL은 [AGENTS.md 개발용 테스트 계정](../AGENTS.md#개발용-테스트-계정) 참조.

---

## 1. 단위 테스트 (Vitest)

**설정**: `vitest.config.ts` | **위치**: `tests/unit/` | **명령어**: `npm run test:unit`

### 현재 커버리지

| 파일                                 | 테스트 대상                                                           | 상태 |
| ------------------------------------ | --------------------------------------------------------------------- | ---- |
| `unit/config/auth.test.ts`           | `getRole()`, `isAdmin()`, `getCertification()`                        | 완료 |
| `unit/store/user.test.ts`            | `setUser()`, `clearUser()`, 타입 변환                                 | 완료 |
| `unit/lib/logger.test.ts`            | `createLogger()` 구조화 로그                                          | 완료 |
| `unit/lib/email.test.ts`             | `sendVerificationEmail()`, `sendFeedbackEmail()` dev-mode             | 완료 |
| `unit/data/glossary.test.ts`         | 용어 데이터 무결성                                                    | 완료 |
| `unit/data/resources.test.ts`        | 자료실 데이터 무결성                                                  | 완료 |
| `unit/lib/push.test.ts`              | `sendPushToUser()`, `sendPushToUsers()`, VAPID 키 미설정 시 조기 반환 | 완료 |
| `unit/pages/prerender-check.test.ts` | 모든 페이지 `prerender = false` 검증 (`/api/push/unsubscribe` 포함)   | 완료 |

### 추가 필요 (우선순위 순)

| 파일                                  | 테스트 대상                                                  | 이유                                    |
| ------------------------------------- | ------------------------------------------------------------ | --------------------------------------- |
| `unit/pages/auth.test.ts`             | `/auth/callback`, `/auth/confirm`의 `prerender = false` 검증 | 프리렌더링 누락 → 로그인 장애 재발 방지 |
| `unit/lib/supabase-server.test.ts`    | `createSupabaseServerClient()` 쿠키 파싱                     | 인증 핵심 경로                          |
| `unit/middleware.test.ts`             | 미들웨어 세션 주입                                           | 인증 핵심 경로                          |
| `unit/lib/runtime-separation.test.ts` | 브라우저/서버 클라이언트 분리 검증                           | 클라이언트 중복 생성 방지               |
| `unit/pages/page-load-event.test.ts`  | 동적 데이터 로딩 페이지의 `astro:page-load` 리스너 존재 여부 | View Transitions 재방문 버그 재발 방지  |

---

## 2. E2E 테스트 (Playwright)

**설정**: `playwright.config.ts` | **위치**: `tests/e2e/` | **명령어**: `npm run test:e2e`

### 2-1. 기본 E2E — CI 포함 (비로그인, 세션 불필요)

| 파일                           | 테스트 대상                                                                                                    | 상태 |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------- | ---- |
| `e2e/home.spec.ts`             | 홈페이지 렌더링, 네비게이션 링크                                                                               | 완료 |
| `e2e/navigation.spec.ts`       | 주요 페이지 HTTP 200 응답                                                                                      | 완료 |
| `e2e/pwa.spec.ts`              | PWA manifest 검증, `sw-push.js` 서빙, `/api/push/subscribe·unsubscribe` 비로그인 401 및 빈 body 인증 우선 검사 | 완료 |
| `e2e/auth-guard.spec.ts`       | 비로그인 시 보호 페이지 15개 → /login 리다이렉트 자동 검증                                                     | 완료 |
| `e2e/public-pages.spec.ts`     | 홈/로그인 페이지 렌더링, 이메일 폼 UI 요소, 비로그인 리다이렉트                                                | 완료 |
| `e2e/view-transitions.spec.ts` | View Transitions 재방문 시 콘텐츠 렌더링 유지 (비인증 페이지)                                                  | 완료 |
| `e2e/sidebar-flash.spec.ts`    | 사이드바 초기 상태 깜빡임 없음, 스테일 데이터 초기화 확인                                                      | 완료 |
| `e2e/auth-callback.spec.ts`    | `/auth/confirm`, `/auth/callback` SSR 동작, CDN 308 캐시 감지                                                  | 완료 |
| `e2e/offline.spec.ts`          | `/offline` 페이지 렌더링, 링크, 오프라인 시뮬레이션 SW fallback                                                | 완료 |

### 2-2. 인증 후 E2E — 로컬 전용 (`npm run test:e2e:auth`)

> 세션 파일(`tests/fixtures/session-*.json`) 필요. CI에서는 실행되지 않음.

| 파일                              | 테스트 대상                                                                                                                                         | 상태 |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| `e2e/authenticated-user.spec.ts`  | 3-3 일반 사용자 기능: 마이페이지, 네비게이션, 자료실, 알림, 의견, 설정 페이지 푸시 토글 UI/상태 동기화, `/api/push/subscribe·unsubscribe` 인증 검사 | 완료 |
| `e2e/authenticated-admin.spec.ts` | 3-4 관리자 기능: 회원관리, 인증요청, 의견/용어 관리, 알림발송, View Transitions 재방문                                                              | 완료 |

### 2-3. 세션 저장 (`npm run test:e2e:save-session`)

| 파일                       | 용도                                  |
| -------------------------- | ------------------------------------- |
| `e2e/save-session.spec.ts` | 실제 로그인 후 세션을 fixtures에 저장 |

---

## 3. 운영 서버 헬스체크 (`npm run check:production`)

**파일**: `scripts/check-production.mjs` | **대상**: `https://radsafety.kr`

배포 직후 브라우저 없이 HTTP 수준에서 자동 점검합니다.

| 검증 항목            | 내용                                                   |
| -------------------- | ------------------------------------------------------ |
| HTTPS                | 도메인 접속, HSTS 헤더 존재 여부                       |
| www 리다이렉트       | `www.radsafety.kr` → `radsafety.kr` (302/303, not 308) |
| 공개 페이지          | `/`, `/login`, `/manifest.webmanifest` → 200           |
| 보호 페이지          | `/notifications` → 302 서버사이드 리다이렉트           |
| `/auth/confirm` SSR  | 308 CDN 캐시 버그 감지, 응답시간 측정                  |
| `/auth/callback` SSR | SSR 동작 확인, Content-Type 검증                       |
| API 엔드포인트       | `/api/archives/[id]` → 404 (서버 정상 응답)            |
| 응답시간             | 홈/로그인 1초 이하 목표                                |

```bash
# 운영 서버 대상
npm run check:production

# 다른 URL 지정 시
node scripts/check-production.mjs https://staging.radsafety.kr
```

---

## 4. 수동 테스트 체크리스트

아래 항목은 자동화가 불가능하거나 실제 사용자 흐름 확인이 필요하여 **배포 후 수동으로** 수행합니다.

> 자동화된 항목은 `[자동화됨]`으로 표기. 수동으로 확인할 항목만 체크하면 됩니다.

### 4-1. 비로그인 상태 (배포마다)

- [x] ~~`/` 홈페이지 정상 렌더링~~ → **자동화됨** (`e2e/public-pages.spec.ts`)
- [x] ~~`/login` 로그인 페이지 표시, 카카오 버튼/이메일 폼 존재~~ → **자동화됨** (`e2e/public-pages.spec.ts`)
- [x] ~~**인증 가드**: `/mypage`, `/admin/*` 등 접근 시 `/login`으로 리다이렉트~~ → **자동화됨** (`e2e/auth-guard.spec.ts`, 15개 페이지)
- [x] ~~**사이드바 초기 상태**: 스테일 localStorage 데이터가 있어도 비로그인 상태로 초기화~~ → **자동화됨** (`e2e/sidebar-flash.spec.ts`)

### 4-2. 로그인/로그아웃 (배포마다)

> **⚠️ 이메일 매직링크는 로컬에서 테스트 불가** — Supabase Site URL이 `https://radsafety.kr`로
> 고정되어 있어 매직링크는 항상 운영 서버로 옵니다. 반드시 `git push` 후 배포 완료 시점에 테스트하세요.

- [ ] **카카오 로그인**: 카카오 로그인 → `/auth/callback` → `/mypage` 도착
- [ ] **이메일 매직링크** _(배포 후 운영에서만 테스트)_: 이메일 입력 → 링크 수신 → 클릭 → `/mypage` 도착 (다운로드 아님)
- [x] ~~**로그아웃**: 사이드바 로그아웃 → 세션 초기화 → `/login` 이동~~ → **반자동화됨** (`e2e/authenticated-user.spec.ts`)

### 4-3. 일반 사용자 기능 (배포마다)

> `npm run test:e2e:auth` 로 대부분 자동 검증. 아래는 자동화가 어려운 항목만.

- [x] ~~마이페이지 프로필 표시~~ → **반자동화됨** (`authenticated-user.spec.ts`)
- [x] ~~자료실 목록 표시~~ → **반자동화됨** (`authenticated-user.spec.ts`)
- [x] ~~알림 목록 표시, 읽음 처리~~ → **반자동화됨** (`authenticated-user.spec.ts`)
- [x] ~~View Transitions 재방문: 자료실, 관리자 페이지~~ → **반자동화됨** (`authenticated-*.spec.ts`)
- [x] ~~웹 푸시 구독 API 인증 검사~~ → **반자동화됨** (`authenticated-user.spec.ts`)
- [ ] **이메일 인증 코드**: 마이페이지 → 코드 발송 → 수신 → 코드 입력 → 인증 상태 변경 _(이메일 수신 필요)_
- [ ] **파일 다운로드**: 자료실 → 파일 다운로드 정상 (`/api/archives/[id]`) _(실제 파일 확인 필요)_
- [ ] **지적권고사례 CRUD**: 사례 등록 → 목록 반영, 수정, 삭제 _(DB 쓰기 작업)_
- [ ] **의견 보내기**: 제목/내용 작성 → 전송 → 성공 메시지 _(실제 이메일 발송 확인)_
- [x] ~~**설정 페이지 푸시 토글 UI**: 토글 스위치 표시, 상태 텍스트 초기화, 토글-상태 동기화~~ → **반자동화됨** (`authenticated-user.spec.ts`)
- [ ] **웹 푸시 토글 ON**: 설정 페이지 → 푸시 알림 토글 켜기 → 브라우저 권한 팝업 → 허용 → "활성화됨" 표시 + Supabase `push_subscriptions` 레코드 확인 _(HTTPS 배포 환경에서만 가능)_
- [ ] **웹 푸시 토글 OFF**: 푸시 알림 토글 끄기 → "알림을 받으려면 켜세요" 표시 + Supabase 레코드 삭제 확인
- [ ] **웹 푸시 새로고침 후 상태 유지**: 토글 ON 후 페이지 새로고침 → 토글 checked 유지
- [ ] **웹 푸시 권한 거부 시**: 토글 켜기 → 브라우저 팝업 거부 → 토글 자동 해제 + disabled + "차단됨" 표시
- [ ] **웹 푸시 알림 수신**: 관리자 알림 발송 또는 인증 처리 후 기기 상단에 알림 팝업 표시 확인 _(실제 기기 확인 필요)_
- [ ] **모바일**: 하단 네비게이션 바 표시 및 동작

### 4-4. 관리자 기능 (기능 변경 시)

- [x] ~~사이드바에 관리자 메뉴 노출~~ → **반자동화됨** (`authenticated-admin.spec.ts`)
- [x] ~~회원관리 목록 표시~~ → **반자동화됨** (`authenticated-admin.spec.ts`)
- [x] ~~의견 관리 View Transitions 재방문~~ → **반자동화됨** (`authenticated-admin.spec.ts`)
- [x] ~~용어 관리 View Transitions 재방문~~ → **반자동화됨** (`authenticated-admin.spec.ts`)
- [ ] **회원관리 엑셀 업로드**: 실제 파일 업로드 → DB 반영 확인
- [ ] **인증 요청 승인/반려**: 처리 → 사용자에게 알림 생성 확인 + **웹 푸시 수신 확인** _(실제 기기 필요)_
- [ ] **알림 발송**: 발송 → 대상 사용자 알림함에 표시 확인 + **웹 푸시 수신 확인** _(실제 기기 필요)_

### 4-5. 회원 탈퇴 (기능 변경 시)

- [ ] 마이페이지 → 회원 탈퇴 클릭 → 확인 대화상자
- [ ] 확인 → 로그아웃 → 홈으로 이동
- [ ] 같은 계정으로 재로그인 → 새 계정으로 처리됨

### 4-6. 크로스 환경 (릴리스 시)

- [x] ~~**도메인**: `https://radsafety.kr` 정상 접속, HTTPS 자물쇠~~ → **자동화됨** (`check:production`)
- [x] ~~**www 리다이렉트**: `https://www.radsafety.kr` → `radsafety.kr`~~ → **자동화됨** (`check:production`)
- [ ] **모바일 Chrome**: 주요 페이지 렌더링 + 카카오 로그인
- [ ] **모바일 Safari**: 주요 페이지 렌더링
- [ ] **카카오 인앱 브라우저**: 카카오 로그인 → 마이페이지 도착
- [ ] **PWA 설치**: 홈 화면 추가 → 앱 실행 → 정상 동작
- [ ] **iOS 웹 푸시**: Safari에서 홈 화면 추가(PWA 설치) → 로그인 → 설정 페이지 → 토글 ON → 배너 허용 → 알림 수신 확인 _(iOS 16.4+ 필요)_

---

## 5. 자동 검증 (로컬 + CI)

```
[로컬] 코드 수정
  ↓
[로컬] npm run test        ← 푸시 전에 로컬에서 먼저 확인 (선택)
[로컬] npm run test:e2e    ← 푸시 전에 로컬에서 먼저 확인 (선택)
  ↓
[로컬] git push
  ↓
[CI]   자동 실행 ─┬─ astro check (타입 검사)
                   ├─ eslint (린트)
                   ├─ vitest run (단위 테스트)
                   └─ playwright test (E2E 테스트 — 비로그인)
  ↓
[CI 통과] → Vercel 자동 배포
  ↓
[로컬] npm run check:production   ← 운영 서버 HTTP 헬스체크
[로컬] npm run test:e2e:auth      ← 인증 후 기능 검증 (세션 있는 경우)
  ↓
[수동] 체크리스트 4-2 (카카오/매직링크), 4-3 일부, 4-4 일부
```

### 로컬 실행 명령어

```bash
# 전체 자동 검증 (타입 + 린트 + 단위 테스트) — CI와 동일
npm run test

# E2E 테스트 (로컬 dev 서버 자동 실행) — CI와 동일
npm run test:e2e

# 운영 서버 헬스체크 (배포 후 즉시)
npm run check:production

# 세션 저장 (최초 1회 또는 만료 시)
npm run test:e2e:save-session

# 인증 후 기능 E2E (세션 저장 후)
npm run test:e2e:auth
```

개발 중 부분 실행이 필요할 때:

```bash
# 단위 테스트만
npm run test:unit

# 특정 테스트 파일만
npx vitest run tests/unit/config/auth.test.ts

# watch 모드 (파일 변경 시 자동 재실행)
npx vitest watch

# E2E 특정 파일만
npx playwright test tests/e2e/auth-callback.spec.ts

# E2E 디버그 모드 (브라우저 표시)
npx playwright test --headed
```

### CI 설정

**파일**: `.github/workflows/test.yml`

| 단계        | 시점            | 명령어            |
| ----------- | --------------- | ----------------- |
| lint-staged | 커밋 시 (husky) | 자동              |
| 타입 검사   | push / PR       | `astro check`     |
| 린트        | push / PR       | `eslint`          |
| 단위 테스트 | push / PR       | `vitest run`      |
| E2E 테스트  | 위 통과 후      | `playwright test` |

> **인증 후 E2E는 CI에서 실행되지 않습니다.** 세션 파일이 로컬에만 존재하기 때문입니다.

### prerender 검증 (SSR 전체 적용)

**프로젝트 방침**: 모든 페이지는 SSR로 동작해야 합니다 (`prerender = false`).
프리렌더링이 적용되면 인증 쿠키 처리, RLS 기반 데이터 조회, 서버 API가 정상 동작하지 않습니다.

이 검증은 단위 테스트(`tests/unit/pages/prerender-check.test.ts`)로 **모든 페이지**에 대해 자동 확인됩니다.
새 페이지를 추가할 때 반드시 해당 테스트에도 등록해야 합니다.

---

## 6. 로그 기반 검증 가이드

수동 체크리스트(4-1~4-6)를 진행하면서, 아래 로그를 **병행 확인**하면 화면에서 보이지 않는 문제를 조기에 잡을 수 있습니다.

### 브라우저 개발자 도구 (Console 탭)

수동 테스트 중 **항상 Console 탭을 열어두고** 아래를 확인합니다.

**정상 시퀀스 (로그인 상태, 홈 접속 기준)**

```
✅ 1. Initializing Mobile Menu...
✅ 2. Page Load Event: Checking Auth...
Auth State Change: SIGNED_IN user@email.com
Auth State Change: INITIAL_SESSION user@email.com
✅ 3. Checking Notifications for user: <uuid>
✅ 4. Notification Check Complete. Unread count: 0
```

**비로그인 상태 기준**

```
✅ 1. Initializing Mobile Menu...
✅ 2. Page Load Event: Checking Auth...
Auth State Change: INITIAL_SESSION undefined
```

**주의할 로그 패턴**

| 로그                               | 의미                                  | 조치                                                                                                                                          |
| ---------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `Multiple GoTrueClient instances`  | Supabase 클라이언트 중복 생성 경고    | 브라우저/서버 클라이언트 분리 확인 ([환경 분리 원칙](codebase_guide.md#5-환경-분리-원칙-브라우저-vs-서버))                                    |
| `❌ Notification Check Error`      | 알림 조회 실패                        | Supabase RLS 정책 확인                                                                                                                        |
| `Supabase Profile Fetch Error`     | 프로필 조회 실패                      | profiles 테이블/RLS 확인                                                                                                                      |
| `Self-healing successful`          | 프로필 행 누락 후 자동 복구됨         | DB 트리거 확인 필요                                                                                                                           |
| `Self-healing failed`              | 프로필 자동 복구 실패                 | profiles 테이블 구조 확인                                                                                                                     |
| `Unauthorized access. Redirecting` | 비로그인 사용자 보호 페이지 접근      | 정상 동작 (인증 가드)                                                                                                                         |
| 재방문 시 "로딩 중..." 고정        | View Transitions 후 스크립트 미재실행 | 해당 페이지 `<script>`에 `astro:page-load` 래퍼 누락 ([codebase_guide.md 3-4](codebase_guide.md#3-4-script-작성-규칙--view-transitions-대응)) |
| 빨간색 `console.error`             | 예상치 못한 오류                      | 메시지 확인 후 디버깅                                                                                                                         |

**콘솔에 에러가 없어야 하는 페이지들**

- 홈(`/`), 로그인(`/login`), 마이페이지(`/mypage`), 자료실(`/resources`)
- `console.warn`은 허용, `console.error`는 0건이어야 정상

### 브라우저 개발자 도구 (Network 탭)

| 확인 항목     | 방법                           | 정상                | 이상 징후                                  |
| ------------- | ------------------------------ | ------------------- | ------------------------------------------ |
| API 응답 코드 | Network 탭에서 `supabase` 필터 | `200`               | `401`, `403`, `500` 응답                   |
| 파일 다운로드 | `/api/archives/` 요청          | `200` + 파일        | `404` 또는 `0 bytes` 응답                  |
| 인증 콜백     | `/auth/callback` 요청          | `302` → `/mypage`   | `200` + JSON (prerender 문제)              |
| 매직링크      | `/auth/confirm` 요청           | `302` → `/mypage`   | 파일 다운로드 (prerender 문제)             |
| 매직링크 CDN  | `/auth/confirm` 요청           | 응답시간 100ms 이상 | `308` + 응답시간 12ms 이하 → CDN 캐시 문제 |

> `check:production` 스크립트가 위 항목들을 HTTP 수준에서 자동 확인합니다.

**HTTP 상태 코드 빠른 참조**

| 코드  | 의미            | 브라우저 캐시 | 이 프로젝트에서의 의미                      |
| ----- | --------------- | ------------- | ------------------------------------------- |
| `200` | 성공            | 안 함         | 서버 코드 정상 실행                         |
| `302` | 임시 리다이렉트 | 안 함         | www → apex, 또는 로그인 후 이동 (정상)      |
| `308` | 영구 리다이렉트 | **캐시함**    | `/auth/confirm` CDN 캐시 장애 패턴 (비정상) |
| `401` | 인증 필요       | 안 함         | Supabase 세션 없음                          |
| `403` | 권한 없음       | 안 함         | Supabase RLS 정책 차단                      |
| `500` | 서버 오류       | 안 함         | 서버 코드 오류                              |

> **308이 보이면**: Vercel Dashboard → Logs에서 해당 경로의 `Cache` 항목 확인 →
> `308 Permanent Redirect`이면 CDN 캐시 문제 → 빈 커밋 push로 해결
> ([장애 사례 참조](external_services_guide.md#cdn-308-캐시-장애-패턴))

### Vercel 서버 로그

> Vercel Dashboard > Project > Logs (또는 Functions 탭)

서버 사이드 로그는 `createLogger`로 JSON 구조화되어 출력됩니다.

**로그가 기록되는 서버 모듈**

| 모듈               | 파일                                | 기록 내용                              |
| ------------------ | ----------------------------------- | -------------------------------------- |
| `actions`          | `src/actions/index.ts`              | 사례 저장/수정/삭제, 인증 코드 검증    |
| `archives-api`     | `src/pages/api/archives/[id].ts`    | 자료 다운로드 요청                     |
| `email`            | `src/lib/email.ts`                  | 이메일 발송 성공/실패                  |
| `notification`     | `src/lib/notification-helper.ts`    | 알림 생성                              |
| `push`             | `src/lib/push.ts`                   | 웹 푸시 발송 성공/실패, 만료 구독 삭제 |
| `push-subscribe`   | `src/pages/api/push/subscribe.ts`   | 구독 정보 저장 성공/실패               |
| `push-unsubscribe` | `src/pages/api/push/unsubscribe.ts` | 구독 해제 성공/실패                    |

**확인 시점**: 이메일 발송 실패, 사례 저장 오류, 파일 다운로드 오류 등 **서버 측 기능이 실패했을 때** Vercel Logs에서 해당 모듈의 error 레벨 로그를 확인합니다.

```
# Vercel 로그 예시 (정상)
{"level":"info","module":"email","message":"Verification email sent","timestamp":"..."}

# Vercel 로그 예시 (오류)
{"level":"error","module":"email","message":"Failed to send email","data":{...},"timestamp":"..."}
```
