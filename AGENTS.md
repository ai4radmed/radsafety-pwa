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
3. **Execute** — 명세 기반으로 구현(`src/`) 작성. **구현체 추가/변경 시** 해당 구현체와 **1:1 테스트 명세**를 `.spec/tests/` 하위에 작성하고, 그 명세에 따라 **테스트 구현체**를 `tests/` 하위에 작성한 뒤 **테스트를 실행**한다. 상세 절차는 [테스트 명세·구현 절차](.spec/tests/README.md) 참조.
4. **Verify** — 로컬 검증(`npm run test`) 및 CI 자동 검증.

### 브랜치 전략

- 작업은 **`dev` 브랜치**에서 수행. PR을 통해서만 `origin/main`으로 병합.
- `main` 보호(strict): 필수 체크 `check` + `e2e` 통과 필요(리뷰 승인 불필요).
- **`main` 머지 = Vercel 프로덕션 자동 배포**(~30초–1분).

### 배포 전 검증 (Husky)

- `astro check` → `npm run test:unit` → `lint-staged`

---

## 5. 운영 · 검증 치트시트

```bash
# 검증 루틴
npm run test:unit        # vitest
npx astro check          # 타입
npm run test:e2e         # playwright (RLS 포함)

# 프로덕션 점검
npm run check:production           # 전체 + Doctor 헬스체크
curl -s https://radsafety.kr/api/health | jq   # 헬스만 빠르게
npm run check:monthly              # 월간 수동 점검 위저드(사람 동석·headed, 실발송·실수신 경로)
```

- **Doctor 헬스체크** `GET /api/health` — shallow(공개: 앱호스트·설정·DB핑·메타) / deep(`?deep=1`, admin 쿠키 또는 `x-health-token` 머신 인증: + Auth·Storage·스키마·resend·vapid·content).
  원칙: 엔드포인트는 얇게 · 점검 로직은 `src/lib/health-checks.ts` · **부작용 0**(발송·쓰기 없음) · 비밀값 원문 미반환 · 핵심 실패 503 / 부가 실패 200 degraded.
- **자동 모니터 + 아침 보고** `.github/workflows/health.yml` — **매일 06:30 KST**(cron `30 21 * * *` UTC) + 수동 실행. `--strict` 로 degraded 도 실패 처리.
    - 점검 두 겹: ① HTTP 점검(`check-production.mjs` — **TLS 인증서 만료 임박** ≤7일 실패/≤21일 경고 포함) ② **브라우저 스모크**(Playwright, `SMOKE_BASE_URL` 게이트 — HTTP 로 안 보이는 JS 크래시 백지 화면 감지, 홈·로그인 열람만·로그인 시도 없음). 스모크 결과는 `SMOKE_OUTCOME` 으로 보고에 합산.
    - 알림은 두 겹: ① **텔레그램 아침 보고**(`scripts/health-report.mjs`) — 정상이어도 매일 한 통 보내는 **하트비트**(침묵이 정상인지 죽음인지 구별하기 위함). ② 실패 시 job exit 1 → **GitHub 이메일**(텔레그램이 막혀도 남는 백업 경로).
    - 보고 채널을 앱의 Resend 가 아닌 텔레그램으로 둔 이유: **감시자가 감시 대상에 의존하면 대상이 죽을 때 보고도 침묵**한다.
    - **on/off** — 저장소 변수 `HEALTH_REPORT` (코드 변경·재배포 불필요):
        ```bash
        gh variable set HEALTH_REPORT --body all    # 기본 — 정상·이상 매일 보고
        gh variable set HEALTH_REPORT --body fail   # 이상일 때만 (정상은 침묵)
        gh variable set HEALTH_REPORT --body off    # 보고 끔 (헬스체크·GitHub 실패 알림은 유지)
        ```
    - 필요한 secret: `TELEGRAM_BOT_TOKEN` · `TELEGRAM_CHAT_ID` (미설정이면 발송 없이 문안만 로그에 남김) · `HEALTH_CHECK_TOKEN`(deep 점검).
    - **원할 때 재실행**: `gh workflow run health.yml` (또는 Actions 탭 "Run workflow"). 정시 실행과 **동일한 경로**로 돌고 보고도 동일하게 발송된다.
    - **시각 변경**: `health.yml` 의 cron 한 줄 수정(GitHub 은 cron 에 변수를 못 씀). `UTC = KST − 9h`. **크론은 기본 브랜치(main)에서만 발화** → main 머지 후 적용.
    - GitHub cron 은 **정시를 보장하지 않음** — 06:30~06:50 도착은 정상. 분 단위 정밀도가 필요하면 Vercel Cron 으로 옮겨야 하나, 그러면 앱이 자기 자신을 감시하게 되어 앱 사망 시 보고도 침묵한다.
- **월간 수동 점검 위저드** `npm run check:monthly` — 아침 헬스체크(부작용 0)가 원리적으로 못 덮는 **실발송·실수신 경로**(OTP 메일, 카카오 OAuth, 푸시 실수신, 파일 실다운로드, Resend 실발송)를 사람 동석 반자동으로 점검. 명세: `.spec/tests/e2e/monthly-check.spec.md`.
    - 사람 개입은 3회(코드 입력·카카오 클릭·휴대폰 확인)뿐, 판정은 자동. 부작용은 전부 **실행자 본인 계정 한정**(`[월간점검]` 접두어) → 반복 실행 안전. **CI·cron 에 올리지 말 것**(사람 필요 + 자격증명 비저장 원칙).
    - `MONTHLY_EMAIL=me@example.com npm run check:monthly` 로 이메일 입력까지 자동화 가능.
    - 테스트 의견 메일은 관리자 전원이 아닌 **개발자에게만** 간다 — `[월간점검]` 접두어 + 관리자 발신이면 `resolveFeedbackRecipients` 가 Vercel env `DEVELOPER_EMAILS`(서버 전용, 쉼표 구분)로 라우팅. 미설정 시 종전대로 관리자 전원.
    - **리마인더** `.github/workflows/monthly-reminder.yml` — 매월 1일 09:00 KST 텔레그램 한 통(점검 실행은 로컬에서). 수동 발화: `gh workflow run monthly-reminder.yml`. on/off: `gh variable set MONTHLY_REMINDER --body off`.
- **`supabase-keepalive.yml`**(월·목 핑)은 free-tier pause 방지용 — **끄지 말 것.**

---

## 6. 알려진 함정 (삽질 방지)

- **husky pre-commit 플레이크**: `tests/unit/actions/index.test.ts` 가 콜드·부하 시 5초 타임아웃으로 커밋을 막음(격리 실행은 통과). → 재커밋하거나, 변경이 그 테스트와 무관하면 `--no-verify`.
- **PR 머지 후 `dev` 가 BEHIND**(strict 보호): 다음 머지 전에 `git merge origin/main --no-edit` 후 push. 충돌은 없지만 매 PR 마다 반복됨.
- **prettier 가 md 표의 밑줄을 강조로 오파싱**: 표 셀의 `RESEND_API_KEY` 같은 식별자는 반드시 백틱(코드스팬)으로 감쌀 것.
- **`VERCEL_REGION` 은 런타임 `process.env` 에만** 존재(`import.meta.env` 엔 없음).
- **e2e 의 "N skipped" 오해 주의**: `authenticated-*` 테스트는 `TEST_AUTH` 없으면 skip. skip 개수로 특정 테스트를 단정하지 말고 로그(hasCreds 등)로 직접 확인할 것.
- **메일 발신주소는 `src/lib/email.ts` 에 하드코딩**(`noreply@radsafety.kr`). 앱은 `RESEND_FROM_EMAIL` 을 쓰지 않음 — `RESEND_API_KEY` 만 필요.

---

## 7. 핵심 정책

- **DB 관리**: 스키마 변경은 `sql_query/rebuild_all_tables.sql`에 통합 (멱등성 보장).
- **로깅**: JSON 구조화 로그, 민감 정보 노출 금지, `PUBLIC_LOG_LEVEL`로 제어.
- **Slug**: `documents/resource_slugs.md`에 등록 후 사용, 한 번 설정된 Slug는 변경 금지.
- **PWA 및 인증**: 주요 페이지는 캐시를 통한 읽기 전용 오프라인 지원. iOS PWA(Safari 샌드박스)의 세션 단절 한계를 피하기 위해 **인증 시 화면 전환(Redirect)이 발생하는 매직링크 URL 클릭이나 OAuth Redirect를 지양하고, 6자리 숫자(OTP) 입력 등 PWA 내부에서 세션을 유지하는 방식을 우선 구현**합니다.

---

## 8. 상세 참조 문서

### 헬스체크 · 모니터링 (코드 ↔ 명세)

| 영역       | 코드                                                                         | 명세                                       |
| ---------- | ---------------------------------------------------------------------------- | ------------------------------------------ |
| 엔드포인트 | `src/pages/api/health.ts`                                                    | `.spec/src/pages/api/health.md`            |
| 점검 로직  | `src/lib/health-checks.ts`                                                   | `.spec/src/lib/health-checks.md`           |
| 모니터     | `scripts/check-production.mjs` · `.github/workflows/health.yml`              | —                                          |
| 스모크     | `tests/e2e/production-smoke.spec.ts`                                         | `.spec/tests/e2e/production-smoke.spec.md` |
| RLS 테스트 | `tests/e2e/rls-policies.spec.ts`                                             | `.spec/tests/e2e/rls-policies.spec.md`     |
| 월간 점검  | `tests/e2e/monthly-check.spec.ts` · `.github/workflows/monthly-reminder.yml` | `.spec/tests/e2e/monthly-check.spec.md`    |

RLS 검증을 Doctor 가 아닌 e2e 로 둔 이유: 실제 로그인은 **부작용**이고 프로덕션 금지 자격증명이 필요하기 때문. CI 는 GitHub secret `DEV_TEST_USER_EMAIL` · `DEV_TEST_USER_PASSWORD` 로 실행.

### 가이드 문서

| 문서                                                               | 용도                                                              |
| ------------------------------------------------------------------ | ----------------------------------------------------------------- |
| [.spec/tests/README.md](.spec/tests/README.md)                     | **구현체당 테스트 명세 1:1 작성 절차** 및 테스트 구현체 생성 규칙 |
| [codebase_guide.md](documents/codebase_guide.md)                   | 파일별 기술 역할 및 설계 가이드                                   |
| [database_schema.md](documents/database_schema.md)                 | ERD, 테이블/필드 정의                                             |
| [external_services_guide.md](documents/external_services_guide.md) | 외부 서비스 설정 및 장애 복구                                     |
| [health_monitoring_guide.md](documents/health_monitoring_guide.md) | 아침 헬스체크·텔레그램 보고의 설계 개념 (도식 포함)               |
| [test_strategy.md](documents/test_strategy.md)                     | 자동화 시나리오 및 수동 점검                                      |
| [logging_guide.md](documents/logging_guide.md)                     | 모듈별 로그 위치 및 보안 가이드                                   |
