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

| 파일                                  | 테스트 대상                                                  | 이유                                    |
| ------------------------------------- | ------------------------------------------------------------ | --------------------------------------- |
| `unit/pages/auth.test.ts`             | `/auth/callback`, `/auth/confirm`의 `prerender = false` 검증 | 프리렌더링 누락 → 로그인 장애 재발 방지 |
| `unit/lib/supabase-server.test.ts`    | `createSupabaseServerClient()` 쿠키 파싱                     | 인증 핵심 경로                          |
| `unit/middleware.test.ts`             | 미들웨어 세션 주입                                           | 인증 핵심 경로                          |
| `unit/lib/runtime-separation.test.ts` | 브라우저/서버 클라이언트 분리 검증                           | 클라이언트 중복 생성 방지               |

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

아래 항목은 외부 서비스 의존성 또는 실제 사용자 흐름 확인이 필요하여 **배포 후 수동으로** 수행합니다.
실패 시 상세 진단은 [외부 서비스 설정 절차서](external_services_guide.md) Part 2를 참조하세요.

> 테스트 순서: 비로그인 → 로그인 → 일반 기능 → 관리자 → 크로스 환경

### 3-1. 비로그인 상태 (배포마다)

- [ ] `/` 홈페이지 정상 렌더링
- [ ] `/login` 로그인 페이지 표시, 카카오 버튼/이메일 폼 존재
- [ ] `/guide` 사용 가이드 콘텐츠 표시
- [ ] `/inspection-prep` 수검 준비 콘텐츠 표시
- [ ] **인증 가드**: `/mypage` 접근 시 `/login`으로 리다이렉트
- [ ] **인증 가드**: `/admin/members` 접근 시 `/login`으로 리다이렉트
- [ ] **사이드바 초기 상태**: 사이트 데이터 전체 삭제 후 `/` 방문 → 사이드바가 로그아웃 상태 (깜빡임 없음)

### 3-2. 로그인/로그아웃 (배포마다)

> **⚠️ 이메일 매직링크는 로컬에서 테스트 불가** — Supabase Site URL이 `https://radsafety.kr`로
> 고정되어 있어 매직링크는 항상 운영 서버로 옵니다. 반드시 `git push` 후 배포 완료 시점에 테스트하세요.

- [ ] **카카오 로그인**: 카카오 로그인 → `/auth/callback` → `/mypage` 도착
- [ ] **이메일 매직링크** _(배포 후 운영에서만 테스트)_: 이메일 입력 → 링크 수신 → 클릭 → `/mypage` 도착 (다운로드 아님)
- [ ] **로그아웃**: 사이드바 로그아웃 → 세션 초기화 → `/login` 이동

### 3-3. 일반 사용자 기능 (배포마다)

> 로그인한 상태에서 진행

**마이페이지 (`/mypage`)**

- [ ] 프로필 정보 표시 (닉네임, 이메일, 로그인 방식)
- [ ] 학회/특별사용자 인증 탭 전환
- [ ] 이메일 인증 코드 발송 → 수신 → 코드 입력 → 인증 상태 변경

**네비게이션**

- [ ] 사이드바 메뉴 클릭 → 각 페이지 이동 정상
- [ ] 모바일: 하단 네비게이션 바 표시 및 동작

**자료실 (`/resources`)**

- [ ] 자료 목록 표시
- [ ] 파일 다운로드 정상 (`/api/archives/[id]`)

**지적권고사례 (`/findings-recommendations`)**

- [ ] 목록 표시
- [ ] 태그/연도/검색어 필터링 동작
- [ ] 사례 등록 → 목록에 반영
- [ ] 사례 수정 → 변경 사항 반영
- [ ] 사례 삭제 → 목록에서 제거

**알림 (`/notifications`)**

- [ ] 알림 목록 표시
- [ ] 읽음 처리 동작

**의견 보내기 (`/feedback`)**

- [ ] 제목/내용 작성 → 전송 → 성공 메시지
- [ ] (선택) 파일 첨부 → 전송
- [ ] 내 피드백 조회 (`/my-feedback`) → 목록에 표시

**설정 (`/settings`)**

- [ ] 설정 페이지 표시

### 3-4. 관리자 기능 (기능 변경 시)

> 관리자 이메일로 로그인한 상태에서 진행

- [ ] 사이드바에 관리자 메뉴 노출
- [ ] **회원관리** (`/admin/members`): 목록 표시, 엑셀 업로드
- [ ] **인증 요청** (`/admin/verification-requests`): 승인/반려 동작 → 사용자에게 알림 생성
- [ ] **의견 관리** (`/admin/feedback`): 목록 표시, 상태 변경, 삭제
- [ ] **용어 관리** (`/admin/glossary`): 추가/수정/삭제
- [ ] **알림 발송** (`/admin/send-notification`): 발송 → 대상 사용자 알림함에 표시
- [ ] **관리자 설정** (`/admin/settings`): 페이지 표시

### 3-5. 회원 탈퇴 (기능 변경 시)

- [ ] 마이페이지 → 회원 탈퇴 클릭 → 확인 대화상자
- [ ] 확인 → 로그아웃 → 홈으로 이동
- [ ] 같은 계정으로 재로그인 → 새 계정으로 처리됨

### 3-6. 크로스 환경 (릴리스 시)

- [ ] **도메인**: `https://radsafety.kr` 정상 접속, HTTPS 자물쇠
- [ ] **www 리다이렉트**: `https://www.radsafety.kr` → `radsafety.kr`
- [ ] **모바일 Chrome**: 주요 페이지 렌더링 + 카카오 로그인
- [ ] **모바일 Safari**: 주요 페이지 렌더링
- [ ] **카카오 인앱 브라우저**: 카카오 로그인 → 마이페이지 도착
- [ ] **PWA 설치**: 홈 화면 추가 → 앱 실행 → 정상 동작

---

## 3-7. 로그 기반 검증 가이드

수동 체크리스트(3-1~3-6)를 진행하면서, 아래 로그를 **병행 확인**하면 화면에서 보이지 않는 문제를 조기에 잡을 수 있습니다.

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

| 로그                               | 의미                               | 조치                                                                                                       |
| ---------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `Multiple GoTrueClient instances`  | Supabase 클라이언트 중복 생성 경고 | 브라우저/서버 클라이언트 분리 확인 ([환경 분리 원칙](codebase_guide.md#5-환경-분리-원칙-브라우저-vs-서버)) |
| `❌ Notification Check Error`      | 알림 조회 실패                     | Supabase RLS 정책 확인                                                                                     |
| `Supabase Profile Fetch Error`     | 프로필 조회 실패                   | profiles 테이블/RLS 확인                                                                                   |
| `Self-healing successful`          | 프로필 행 누락 후 자동 복구됨      | DB 트리거 확인 필요                                                                                        |
| `Self-healing failed`              | 프로필 자동 복구 실패              | profiles 테이블 구조 확인                                                                                  |
| `Unauthorized access. Redirecting` | 비로그인 사용자 보호 페이지 접근   | 정상 동작 (인증 가드)                                                                                      |
| 빨간색 `console.error`             | 예상치 못한 오류                   | 메시지 확인 후 디버깅                                                                                      |

**콘솔에 에러가 없어야 하는 페이지들**

- 홈(`/`), 로그인(`/login`), 마이페이지(`/mypage`), 자료실(`/resources`)
- `console.warn`은 허용, `console.error`는 0건이어야 정상

### 브라우저 개발자 도구 (Network 탭)

| 확인 항목     | 방법                           | 이상 징후                                  |
| ------------- | ------------------------------ | ------------------------------------------ |
| API 응답 코드 | Network 탭에서 `supabase` 필터 | `401`, `403`, `500` 응답                   |
| 파일 다운로드 | `/api/archives/` 요청          | `404` 또는 `0 bytes` 응답                  |
| 인증 콜백     | `/auth/callback` 요청          | `302`가 아닌 `200` + JSON (prerender 문제) |
| 매직링크      | `/auth/confirm` 요청           | 파일 다운로드 발생 (prerender 문제)        |

### Vercel 서버 로그

> Vercel Dashboard > Project > Logs (또는 Functions 탭)

서버 사이드 로그는 `createLogger`로 JSON 구조화되어 출력됩니다.

**로그가 기록되는 서버 모듈**

| 모듈           | 파일                             | 기록 내용                           |
| -------------- | -------------------------------- | ----------------------------------- |
| `actions`      | `src/actions/index.ts`           | 사례 저장/수정/삭제, 인증 코드 검증 |
| `archives-api` | `src/pages/api/archives/[id].ts` | 자료 다운로드 요청                  |
| `email`        | `src/lib/email.ts`               | 이메일 발송 성공/실패               |
| `notification` | `src/lib/notification-helper.ts` | 알림 생성                           |

**확인 시점**: 이메일 발송 실패, 사례 저장 오류, 파일 다운로드 오류 등 **서버 측 기능이 실패했을 때** Vercel Logs에서 해당 모듈의 error 레벨 로그를 확인합니다.

```
# Vercel 로그 예시 (정상)
{"level":"info","module":"email","message":"Verification email sent","timestamp":"..."}

# Vercel 로그 예시 (오류)
{"level":"error","module":"email","message":"Failed to send email","data":{...},"timestamp":"..."}
```

---

## 4. 자동 검증 (로컬 + CI)

로컬에서 실행하는 명령어와 CI(GitHub Actions)에서 실행하는 명령어는 동일합니다.

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
                  └─ playwright test (E2E 테스트)
  ↓
[CI 통과] → Vercel 자동 배포
  ↓
[수동] 체크리스트 3-1 ~ 3-7 진행
```

### 로컬 실행 명령어

```bash
# 전체 자동 검증 (타입 + 린트 + 단위 테스트) — CI와 동일
npm run test

# E2E 테스트 (로컬 dev 서버 자동 실행) — CI와 동일
npm run test:e2e
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
npx playwright test tests/e2e/home.spec.ts

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

### prerender 검증 (SSR 전체 적용)

**프로젝트 방침**: 모든 페이지는 SSR로 동작해야 합니다 (`prerender = false`).
프리렌더링이 적용되면 인증 쿠키 처리, RLS 기반 데이터 조회, 서버 API가 정상 동작하지 않습니다.

이 검증은 단위 테스트(`tests/unit/pages/prerender-check.test.ts`)로 **모든 페이지**에 대해 자동 확인됩니다.
새 페이지를 추가할 때 반드시 해당 테스트에도 등록해야 합니다.
