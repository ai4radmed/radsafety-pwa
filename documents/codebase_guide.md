# 코드베이스 가이드

이 문서는 Astro 프레임워크와 이 프로젝트의 코드 구조를 이해하기 위해 작성되었습니다.
파이썬(Python) 경험이 있는 사용자를 위해 익숙한 개념과 비교하여 설명합니다.

---

## 1. 프로젝트 전체 파일 지도

### 1-1. 루트 디렉토리 (설정 파일들)

| 파일                   | 역할                                                  | 파이썬 비유                              |
| :--------------------- | :---------------------------------------------------- | :--------------------------------------- |
| `package.json`         | 프로젝트 이름, 실행 명령어, 라이브러리 목록 관리      | `pyproject.toml` 또는 `requirements.txt` |
| `astro.config.mjs`     | Astro 프레임워크 핵심 설정 (사이트 URL, PWA, 배포 등) | Django `settings.py`                     |
| `tsconfig.json`        | TypeScript 컴파일러 설정                              | `mypy.ini` 또는 `pyrightconfig.json`     |
| `eslint.config.mjs`    | 코드 스타일/품질 검사 규칙                            | `flake8`, `ruff` 설정                    |
| `.prettierrc`          | 코드 자동 정리(포맷팅) 규칙                           | `black` 설정                             |
| `vitest.config.ts`     | 단위 테스트 설정                                      | `pytest.ini`                             |
| `playwright.config.ts` | E2E(브라우저 자동화) 테스트 설정                      | Selenium/Playwright 설정                 |
| `.env`                 | 환경변수 (DB 접속 키 등 비밀 정보)                    | `.env` (동일)                            |
| `CLAUDE.md`            | AI 에이전트 행동 규칙                                 | -                                        |

---

### 1-2. `src/` — 소스 코드

#### `src/` 루트 파일들

| 파일                | 역할                                             |
| :------------------ | :----------------------------------------------- |
| `consts.ts`         | 프로젝트 전역 상수 (사이트 제목, 설명 등)        |
| `content.config.ts` | 콘텐츠 컬렉션(MDX 문서 등) 스키마 정의           |
| `env.d.ts`          | TypeScript 환경변수 타입 선언                    |
| `middleware.ts`     | 모든 요청 전에 실행되는 중간 처리 (인증 체크 등) |

---

#### `src/pages/` — 페이지 (URL과 파일 1:1 매핑)

> **Astro 핵심 개념**: `src/pages/` 안의 파일명이 곧 URL이 됩니다.
> 예: `login.astro` → `https://사이트.com/login`

| 파일                             | URL                         | 역할                              |
| :------------------------------- | :-------------------------- | :-------------------------------- |
| `index.astro`                    | `/`                         | 메인(홈) 페이지                   |
| `login.astro`                    | `/login`                    | 로그인 페이지                     |
| `mypage.astro`                   | `/mypage`                   | 마이페이지 (프로필, 면허 정보 등) |
| `resources.astro`                | `/resources`                | 자료실 (방사선안전 관련 자료)     |
| `findings-recommendations.astro` | `/findings-recommendations` | 지적사항 및 권고                  |
| `inspection-prep.astro`          | `/inspection-prep`          | 수검 준비 자료                    |
| `guide.astro`                    | `/guide`                    | 사용 가이드                       |
| `feedback.astro`                 | `/feedback`                 | 피드백/의견 제출                  |
| `my-feedback.astro`              | `/my-feedback`              | 내 피드백 조회                    |
| `notifications.astro`            | `/notifications`            | 알림 페이지                       |
| `settings.astro`                 | `/settings`                 | 설정 페이지                       |

##### `src/pages/admin/` — 관리자 전용 페이지

| 파일                          | URL                            | 역할                |
| :---------------------------- | :----------------------------- | :------------------ |
| `members.astro`               | `/admin/members`               | 회원 명부 관리      |
| `verification-requests.astro` | `/admin/verification-requests` | 인증 요청 승인/거절 |
| `feedback.astro`              | `/admin/feedback`              | 피드백 관리         |
| `send-notification.astro`     | `/admin/send-notification`     | 알림 발송           |
| `settings.astro`              | `/admin/settings`              | 관리자 설정         |

##### `src/pages/auth/` — 인증 처리

| 파일          | URL              | 역할                                 |
| :------------ | :--------------- | :----------------------------------- |
| `callback.ts` | `/auth/callback` | 로그인 후 돌아오는 콜백 처리 (OAuth) |
| `confirm.ts`  | `/auth/confirm`  | 이메일 매직링크 토큰 확인            |

##### `src/pages/api/` — API 엔드포인트

| 폴더        | URL                     | 역할                          |
| :---------- | :---------------------- | :---------------------------- |
| `archives/` | `/api/archives/...`     | 자료 아카이브 관련 API        |
| `push/`     | `/api/push/subscribe`   | 웹 푸시 구독 정보 저장 (POST) |
| `push/`     | `/api/push/unsubscribe` | 웹 푸시 구독 해제 (DELETE)    |

---

#### `src/components/` — 재사용 가능한 UI 조각

| 파일                     | 역할                               |
| :----------------------- | :--------------------------------- |
| `BaseHead.astro`         | HTML `<head>` 태그 (메타정보, SEO) |
| `Sidebar.astro`          | 왼쪽 사이드바 네비게이션           |
| `MobileBottomNav.astro`  | 모바일 하단 네비게이션 바          |
| `ChecklistItem.astro`    | 체크리스트 항목 컴포넌트           |
| `Icon.astro`             | 아이콘 표시 컴포넌트               |
| `Lightbox.astro`         | 이미지 확대 보기(라이트박스)       |
| `GlossaryModal.astro`    | 용어 사전 팝업                     |
| `PWAInstall.astro`       | PWA 설치 안내                      |
| `LoginGuide.astro`       | 로그인 안내 UI                     |
| `FormattedDate.astro`    | 날짜 포맷팅                        |
| `auth/LoginButton.astro` | 로그인 버튼                        |

---

#### `src/lib/` — 공통 유틸리티 (도구 모음)

| 파일                     | 역할                                 | 상세                                         |
| :----------------------- | :----------------------------------- | :------------------------------------------- |
| `logger.ts`              | 구조화된 로깅                        | [상세 설명](#파일-상세-srclibloggerts)       |
| `supabase.ts`            | DB 클라이언트 (브라우저 + 서버 공용) | [상세 설명](#파일-상세-srclibsupabasets)     |
| `supabase-server.ts`     | DB 클라이언트 (서버 전용)            | 서버 측에서만 사용하는 Supabase 클라이언트   |
| `email.ts`               | 이메일 발송 기능                     | Resend API를 통한 이메일 발송                |
| `notification-helper.ts` | 알림 도우미                          | 알림 생성/관리 헬퍼 함수 + 자동 웹 푸시 연동 |
| `push.ts`                | 웹 푸시 발송 유틸리티                | web-push 라이브러리, VAPID 기반 서버 발송    |

---

#### `src/store/` — 상태 관리 (전역 데이터 저장소)

| 파일      | 역할                                                   |
| :-------- | :----------------------------------------------------- |
| `user.ts` | 로그인한 사용자 정보를 전역으로 관리 (nanostores 사용) |

> 파이썬 비유: Flask의 `g` 객체나 전역 변수처럼, 어디서든 접근 가능한 공유 데이터

---

#### `src/layouts/` — 페이지 레이아웃 (공통 골격)

| 파일                    | 역할                                        |
| :---------------------- | :------------------------------------------ |
| `DashboardLayout.astro` | 사이드바 + 메인 콘텐츠 영역의 공통 레이아웃 |

> 파이썬 비유: Django의 `base.html` 템플릿 (모든 페이지가 상속하는 기본 틀)

---

#### 기타 `src/` 폴더들

| 폴더                               | 역할                                     |
| :--------------------------------- | :--------------------------------------- |
| `styles/global.css`                | 사이트 전체에 적용되는 CSS 스타일        |
| `config/auth.ts`                   | 인증 관련 설정 값                        |
| `data/glossary.ts`                 | 용어 사전 데이터                         |
| `data/resources.ts`                | 자료실 데이터                            |
| `content/`                         | MDX 문서 콘텐츠 (수검 준비, 지적사항 등) |
| `actions/index.ts`                 | Astro Actions (서버 사이드 함수 호출)    |
| `scripts/update_findings_data.cjs` | 지적사항 데이터 업데이트 스크립트        |

---

### 1-3. 소스 코드 외 폴더들

| 폴더         | 역할                                           | 비고                                                                                     |
| :----------- | :--------------------------------------------- | :--------------------------------------------------------------------------------------- |
| `public/`    | 정적 파일 (아이콘, 폰트, 이미지, `sw-push.js`) | 빌드 없이 그대로 서비스됨. `sw-push.js`는 Service Worker의 push/notificationclick 핸들러 |
| `scripts/`   | 빌드/유틸리티 스크립트                         | 아이콘 생성, 문서 렌더링                                                                 |
| `sql_query/` | DB 테이블 생성/수정 SQL 쿼리                   | `rebuild_all_tables.sql`이 핵심                                                          |
| `documents/` | 프로젝트 참고 문서                             | DB 스키마, 외부 서비스, 테스트 전략                                                      |
| `tests/`     | 테스트 코드                                    | `unit/` (단위 테스트), `e2e/` (브라우저 테스트)                                          |

---

### 1-4. 데이터 흐름 요약

```
[사용자 브라우저]
    │
    ▼
[src/pages/*.astro]  ← URL에 해당하는 페이지 로드
    │
    ├── [src/layouts/DashboardLayout.astro]  ← 공통 레이아웃 적용
    ├── [src/components/*.astro]  ← UI 조각들 조립
    │
    ├── [src/lib/supabase.ts]  ← DB에서 데이터 읽기/쓰기
    ├── [src/store/user.ts]  ← 로그인 상태 관리
    └── [src/lib/logger.ts]  ← 실행 로그 기록
```

---

## 2. 핵심 로직 분석

### 2-1. 사용자 인증 및 프로필 (`DashboardLayout.astro`)

- 모든 페이지의 기본 레이아웃에서 Supabase 세션을 체크합니다.
- 로그인된 사용자는 `profiles` 테이블에서 정보를 가져와 `userProfile` 스토어에 저장합니다.
- 이 정보는 `mypage` 등 다른 페이지에서 `subscribe`하여 실시간으로 화면을 갱신합니다.

### 2-2. 비즈니스 로직 (`actions/index.ts`)

- `astro:actions`를 사용하여 서버 사이드 로직을 정의합니다.
- 예: 사례 저장(`saveFinding`) — 클라이언트에서 폼 데이터 전송 → 서버에서 DB Insert/Update → 결과 반환

### 2-3. 지적권고사례 (`findings-recommendations.astro`)

- `src/content/findings_recommendations/`의 정적 Markdown과 Supabase DB의 동적 데이터를 합쳐서 표시합니다.
- 클라이언트에서 태그, 연도, 검색어로 필터링/정렬합니다.
- CRUD 기능은 `actions/index.ts`의 Action들과 연동됩니다.

### 2-4. 마이페이지 (`mypage.astro`)

- 학회원 인증은 세 가지 방식으로 처리됩니다: 자동 명부 대조, 관리자 수동 요청, 특별사용자 요청
- `userProfile.subscribe`를 통해 새로고침 없이 프로필 정보가 반영됩니다.

---

## 3. 유지보수 How-to

### 3-1. 새로운 페이지 추가하기

1. `src/pages/` 밑에 `.astro` (또는 `.ts`) 파일을 생성합니다.
2. **파일 상단에 `export const prerender = false;`를 반드시 추가합니다.** (프로젝트 방침: 모든 페이지 SSR)
3. `DashboardLayout`을 import하여 기본 구조를 잡습니다.
4. 스타일과 스크립트는 해당 파일 내 `<style>` 및 `<script>` 태그에 작성합니다.
5. **`<script>` 내 초기화 코드는 반드시 `astro:page-load` 이벤트로 감싸야 합니다.** (아래 3-4 참조)
6. `tests/unit/pages/prerender-check.test.ts`에 새 페이지를 추가하여 SSR 설정을 자동 검증합니다.

### 3-2. 새로운 DB 테이블 연동하기

1. `sql_query/rebuild_all_tables.sql`에 테이블 정의를 추가합니다.
2. Supabase SQL Editor에서 실행합니다.
3. `src/lib/supabase-server.ts` 또는 `src/lib/supabase-browser.ts`의 클라이언트를 사용하여 접근합니다.
4. 복잡한 쓰기 로직은 `src/actions/index.ts`에 새 Action을 정의합니다.

### 3-4. `<script>` 작성 규칙 — View Transitions 대응

이 프로젝트는 Astro의 **View Transitions**가 적용되어 있습니다. 페이지 전환 시 전체 페이지를 새로 로드하지 않고 DOM만 교체하기 때문에, **스크립트 최상위에서 초기화하면 재방문 시 실행되지 않습니다.**

#### 잘못된 패턴 (재발 원인)

```typescript
// ❌ 최상위 실행 — 첫 방문에만 동작, 재방문 시 "로딩 중..." 상태로 멈춤
<script>
  import { supabase } from '../lib/supabase-browser';

  const tableBody = document.getElementById('tableBody');
  loadData();  // ← 재방문 시 실행 안 됨

  async function loadData() { ... }
</script>
```

#### 올바른 패턴

```typescript
// ✅ astro:page-load로 감싸기 — 첫 방문 및 재방문 모두 동작
<script>
  import { supabase } from '../lib/supabase-browser';

  document.addEventListener('astro:page-load', () => {
    const tableBody = document.getElementById('tableBody');
    loadData();  // ← 매번 실행됨

    async function loadData() { ... }
  });
</script>
```

#### 왜 이렇게 동작하는가?

```
일반 페이지 전환 (View Transitions 없음)
  페이지 이동 → 전체 HTML 새로 로드 → <script> 재실행 ✅

View Transitions 적용 시
  페이지 이동 → DOM만 교체 → <script> 재실행 안 됨 ❌
  astro:page-load 이벤트 → DOM 교체 완료 시 매번 발생 ✅
```

#### 실패 사례 (2026-02-17)

`/admin/feedback`, `/admin/glossary` 페이지에서 다른 페이지 방문 후 재방문 시 데이터가 "로딩 중..." 상태로 멈추는 문제 발생. `astro:page-load` 누락이 원인.

### 3-3. 배포 후 검증 절차

배포 완료 후 아래 순서로 검증합니다. 전체 소요시간 약 5~10분.

#### 1단계: 운영 서버 HTTP 헬스체크 (2분, 자동)

```bash
npm run check:production
```

HTTPS, www 리다이렉트, 공개 페이지, `/auth/confirm` CDN 캐시 버그, API 응답 등을 자동 점검합니다.
실패 항목이 있으면 빨간색으로 출력됩니다.

#### 2단계: 인증 후 기능 E2E 테스트 (3~5분, 반자동)

세션이 있는 경우 (Supabase 세션 유효 시간 내):

```bash
npm run test:e2e:auth
```

세션이 없거나 만료된 경우:

```bash
# dev 서버가 실행 중이어야 함
npm run dev  # (별도 터미널)

# 브라우저 창이 열립니다 — 실제 로그인 후 /mypage 도달 시 자동 저장
npm run test:e2e:save-session
```

이후 `npm run test:e2e:auth` 실행.

#### 3단계: 수동 잔여 항목 확인 (이메일 매직링크, 카카오 로그인, 모바일)

상세 체크리스트는 [test_strategy.md](test_strategy.md)의 섹션 4-2, 4-3 일부, 4-6 참조.

---

### 3-5. PWA 설정 변경하기

- `astro.config.mjs`의 `vite-pwa` 설정을 수정합니다.
- 아이콘이나 앱 이름은 `public/` 폴더의 매니페스트 관련 파일을 확인하세요.

---

## 4. 파일별 상세 설명

### 파일 상세: `src/lib/logger.ts`

프로그램 실행 중 발생하는 상황(정보, 경보, 에러)을 기록하는 로거입니다.

```typescript
// 타입 정의
type LogLevel = 'info' | 'warn' | 'error';
// 파이썬: Literal['info', 'warn', 'error']

// 로거 팩토리 함수 — createLogger('Auth')를 호출하면 module='Auth'를 기억하는 로거 반환
export function createLogger(module: string) {
    return {
        info: (message, data) => {
            console.log(JSON.stringify(entry));
        },
        warn: (message, data) => {
            console.warn(JSON.stringify(entry));
        },
        error: (message, data) => {
            console.error(JSON.stringify(entry));
        },
    };
}
```

파이썬 비유:

```python
import logging
logger = logging.getLogger('Auth')
logger.info('로그인 성공')
```

---

### 파일 상세: `src/lib/supabase.ts`

Supabase(서버리스 데이터베이스/인증 서비스)에 접속하기 위한 클라이언트를 생성합니다.
서버(`supabase-server.ts`)와 브라우저가 동일한 chunked 쿠키 형식을 사용하도록 `@supabase/ssr` 패키지를 활용합니다.

**환경변수**

- `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`: 브라우저에서도 접근 가능한 공개 변수
- `SUPABASE_SERVICE_ROLE_KEY`: 서버에서만 접근 가능한 비밀 키

**클라이언트 3종**

| Export          | 생성 방식                                | 용도                                 | 사용 위치                                             |
| :-------------- | :--------------------------------------- | :----------------------------------- | :---------------------------------------------------- |
| `supabase`      | `createBrowserClient` (`@supabase/ssr`)  | 브라우저 인증, UI 상호작용           | `.astro` 인라인 `<script>`, 컴포넌트                  |
| `supabaseAnon`  | `createClient` (`persistSession: false`) | 서버사이드 데이터 쿼리 (세션 불필요) | `actions/index.ts`, `data/glossary.ts`, `api/` 라우트 |
| `supabaseAdmin` | `createClient` + service role key        | RLS 우회 관리자 작업                 | `actions/index.ts` (인증코드, 알림, 피드백)           |

> **주의**: `supabase` (브라우저 클라이언트)를 서버사이드 파일(`actions/`, `pages/api/`, `data/`)에서 import하면 안 됩니다. 서버에서는 `supabaseAnon` 또는 `supabaseAdmin`을 사용하세요.

---

## 5. 환경 분리 원칙 (브라우저 vs 서버)

### 5-1. 왜 중요한가?

Astro는 **하나의 파일이 브라우저와 서버 양쪽에서 실행될 수 있습니다**. 이로 인해:

- 서버 전용 코드가 브라우저에 노출될 위험 (보안)
- 브라우저 전용 API가 서버에서 실행되어 오류 발생 (런타임 에러)
- 불필요한 클라이언트 인스턴스 중복 생성 (메모리/성능)

### 5-2. 환경별 파일 분리 규칙

#### 브라우저 전용 파일

- **위치**: `src/lib/*-browser.ts`, `.astro` 파일의 `<script>` 태그
- **사용 가능**: `window`, `document`, `localStorage`, `createBrowserClient`
- **금지**: 환경변수 중 `PUBLIC_` 접두사 없는 것, 서버 API

#### 서버 전용 파일

- **위치**: `src/lib/*-server.ts`, `src/actions/`, `src/pages/api/`
- **사용 가능**: `process.env`, `createClient` (서버 전용), 파일 시스템
- **금지**: `window`, `document`, `localStorage`

#### 양쪽 모두 (신중히 사용)

- **위치**: `src/lib/*.ts` (특별한 접미사 없음)
- **조건**: 환경에 따라 다르게 동작하거나, 부수효과(side effect)가 없는 순수 함수만
- **예시**: `logger.ts` (console API는 양쪽 모두 사용 가능)

### 5-3. 리뷰 체크리스트

새로운 파일을 추가하거나 기존 파일을 수정할 때 아래를 확인하세요:

- [ ] 이 파일이 브라우저에서 실행될 수 있는가?
    - Yes → `window`, `localStorage` 등 브라우저 API만 사용했는가?
    - Yes → 서버 전용 환경변수를 참조하지 않는가?

- [ ] 이 파일이 서버에서 실행될 수 있는가?
    - Yes → 브라우저 전용 API를 사용하지 않는가?
    - Yes → `import.meta.env` 대신 서버용 클라이언트를 사용하는가?

- [ ] 파일 import 시 즉시 실행되는 코드(top-level side effect)가 있는가?
    - Yes → 양쪽 환경에서 안전한가?
    - No → 함수로 감싸서 필요할 때만 실행하도록 변경

### 5-4. 실패 사례: Supabase 클라이언트 중복 생성

**문제 코드** (`supabase.ts`):

```typescript
// ❌ 파일 import 시 3개 클라이언트 모두 즉시 생성됨
export const supabase = createBrowserClient(...);       // 브라우저 전용
export const supabaseAnon = createClient(...);         // 서버 전용
export const supabaseAdmin = createClient(...);        // 서버 전용
```

**결과**: 브라우저에서 이 파일을 import하면 서버 전용 클라이언트까지 생성되어 `Multiple GoTrueClient instances` 경고 발생

**해결 방안**:

1. 브라우저/서버 클라이언트를 별도 파일로 분리
2. 또는 Lazy Initialization으로 필요할 때만 생성

**예시 코드** (권장):

```typescript
// src/lib/supabase-browser.ts
export const supabase = createBrowserClient(...); // 브라우저만 import

// src/lib/supabase-server.ts
export const supabaseAnon = createClient(...);    // 서버만 import
export const supabaseAdmin = createClient(...);
```

파이썬 비유:

```python
from supabase import create_client
import os
url = os.environ.get('SUPABASE_URL', 'https://mock.supabase.co')
key = os.environ.get('SUPABASE_ANON_KEY', 'mock-key')
supabase = create_client(url, key)  # supabaseAnon에 해당
```
