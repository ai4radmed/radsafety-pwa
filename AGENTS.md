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

## 검토 사항

- PWA 오프라인 전략: @vite-pwa/astro 또는 직접 서비스워커 구현
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
