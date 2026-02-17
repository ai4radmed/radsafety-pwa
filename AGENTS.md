# RadSafety-PWA 프로젝트 규칙

이 문서는 모든 AI 에이전트(Claude, Gemini 등)가 따라야 하는 공통 규칙입니다.

## 언어 정책

- **모든 커뮤니케이션 및 문서화는 한국어를 기본으로 합니다.**
- 커밋 메시지: 한국어 (예: "기능 추가: 사용자 로그인 로직 구현")
- 코드 주석: 한국어 (필요시 영문 기술 용어 병기)

## 기술 스택

- **프레임워크**: Astro (PWA)
- **배포**: Vercel (서울 리전)
- **인증/DB**: Supabase (도쿄 리전: ap-northeast-1)
- **DNS**: Cloudflare (네임서버 전용)
- **인증 방식**: 카카오 로그인 + 이메일 폴백

## 설계 원칙

- 한국 사용자 대상, 체감 속도 최우선
- Vercel 서울 리전으로 SSR 레이턴시 최소화
- Cloudflare는 DNS/CDN만 담당, SSL은 Full (Strict)
- 인터랙티브 비중이 낮으므로 Astro가 가장 적합함

## 개발 규칙

### 브랜치 전략

- **작업 브랜치**: `dev` — 모든 개발은 `dev`에서 시작
- **배포 브랜치**: `origin/main` — Vercel이 이 브랜치를 자동 배포
- **머지 방법**: `dev` → PR → `origin/main` (로컬 `main` 브랜치는 사용하지 않음)
- **로컬 `main` 브랜치는 만들지 않는다** — 실수로 `main`에 직접 커밋하는 것을 방지하기 위함
    - 새 환경에서 클론 시: `git checkout dev` 후 `git branch -d main`으로 로컬 main 삭제
- AI 에이전트는 **항상 `dev` 브랜치에서 작업**하고 `dev`로 푸시할 것
- `main`으로의 직접 푸시 금지

### 렌더링 방식 (SSR 전체 적용)

- **모든 페이지는 서버 사이드 렌더링(SSR)으로 동작해야 합니다.**
- 새 페이지 추가 시 `export const prerender = false;`를 반드시 선언할 것
- 정적 프리렌더링(`prerender = true`)은 사용하지 않음 — 인증 쿠키, RLS, 서버 API 의존성 때문
- 이 규칙의 자동 검증: `tests/unit/pages/prerender-check.test.ts`

### 데이터베이스 마이그레이션

- **IMPORTANT**: 모든 DB 스키마 변경은 `sql_query/rebuild_all_tables.sql` 파일에 **통합**하여 관리
- 별도의 마이그레이션 SQL 파일을 생성하지 말 것
- 변경 이력은 파일 상단 주석에 버전과 함께 기록
- 기존 데이터를 보존하는 Safe Migration 방식 사용

## 배포 후 검증 절차

`dev → PR → main` 머지 후 Vercel 자동 배포가 완료되면 아래 순서로 검증합니다.

### 1단계: 운영 서버 헬스체크 (자동, 2분)

```bash
npm run check:production
```

HTTPS, www 리다이렉트, `/auth/confirm` CDN 308 캐시 버그, API 응답 등을 자동 점검합니다.

### 2단계: 인증 후 기능 E2E (반자동, 3~5분)

```bash
# 세션이 유효한 경우
npm run test:e2e:auth

# 세션이 없거나 만료된 경우 — 브라우저에서 직접 로그인 필요
npm run dev                      # 별도 터미널
npm run test:e2e:save-session    # 브라우저 창에서 로그인 → /mypage 도달 시 자동 저장
npm run test:e2e:auth
```

### 3단계: 수동 잔여 항목

자동화가 불가능한 항목만 수동 확인합니다.

- **카카오 로그인** → `/mypage` 도착 확인
- **이메일 매직링크** → 수신 → 클릭 → `/mypage` 도착 (다운로드 아님)
- **모바일** (릴리스 시): Chrome, Safari, 카카오 인앱 브라우저

> 상세 체크리스트: [test_strategy.md](documents/test_strategy.md) 섹션 4 참조

## PWA 오프라인 전략

**정책: 읽기 전용 오프라인 지원 (B안)**

오프라인 상태에서는 마지막으로 캐시된 콘텐츠를 읽기 전용으로 표시합니다.
쓰기 작업(로그인, 데이터 변경)은 오프라인에서 시도하지 않습니다.

### 오프라인 지원 범위

| 페이지                                    | 오프라인 동작                 | 이유                               |
| ----------------------------------------- | ----------------------------- | ---------------------------------- |
| 홈(`/`)                                   | 정상 표시                     | 정적 UI, precache                  |
| 수검준비(`/inspection-prep`)              | 정상 표시                     | Astro Content Collection, precache |
| 지적권고사례(`/findings-recommendations`) | 정상 표시                     | Astro Content Collection, precache |
| 그 외 모든 페이지                         | `/offline` 안내 페이지로 이동 | 네트워크 필요                      |

### Service Worker 캐싱 전략

- **정적 에셋** (JS/CSS/이미지): `precacheAndRoute` — 빌드 시 전체 캐시
- **오프라인 fallback**: `/offline` — 네트워크 실패 시 표시
- **Workbox 설정**: `astro.config.mjs`의 `vitePwa.workbox` 섹션

### 오프라인 fallback 페이지

`src/pages/offline.astro` — 오프라인 안내 및 캐시된 페이지(수검준비, 지적권고사례) 링크 제공

> 구현 제약: Supabase API 응답, SSR 페이지는 오프라인 캐싱 불가.
> 온라인 복귀 시 자동 동기화는 별도 구현 없이 페이지 재접속으로 해결.

## 검토 사항

- Cloudflare 프록시 + Vercel 충돌 주의 (캐시 규칙, \_vercel 경로)
- 카카오 로그인: Supabase 커스텀 OAuth 프로바이더 설정

## 프로젝트 구조 및 주요 문서

```text
radsafety-pwa/
├── AGENTS.md              ← 공통 규칙 (본 문서)
├── CLAUDE.md              ← Claude Code 전용 설정
├── GEMINI.md              ← Gemini 전용 설정
├── documents/
│   ├── codebase_guide.md          ← 코드베이스 가이드
│   ├── database_schema.md         ← 상세 DB 설계 문서
│   ├── external_services_guide.md ← 외부 서비스 설정 절차서
│   └── test_strategy.md           ← 테스트 전략
├── src/
└── ...
```

- [코드베이스 가이드](documents/codebase_guide.md): 프로젝트 구조, 파일 역할, 유지보수 How-to
- [데이터베이스 스키마](documents/database_schema.md): DB 테이블 및 관계 정의
- [외부 서비스 설정](documents/external_services_guide.md): Supabase, Vercel, Cloudflare, 카카오, Resend 설정 및 검증
- [테스트 전략](documents/test_strategy.md): 자동/수동 테스트 범위 및 실행 방법
