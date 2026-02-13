# RadSafety-PWA 시스템 설계

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
- **프레임워크 선정**: 인터랙티브 비중이 낮으므로 Astro가 가장 적합함

## 검토 사항
- PWA 오프라인 전략: @vite-pwa/astro 또는 직접 서비스워커 구현
- Cloudflare 프록시 + Vercel 충돌 주의 (캐시 규칙, _vercel 경로)
- 카카오 로그인: Supabase 커스텀 OAuth 프로바이더 설정

### 프로젝트 구조 및 주요 문서
- `CLAUDE.md`: 본 문서 (프로젝트 개요 및 규칙)
- `GEMINI.md`: AI 협업 및 커뮤니케이션 정책
- [데이터베이스 스키마](documents/database_schema.md): DB 테이블 및 관계 정의
- [인수인계 가이드](documents/handover_guide.md): 핵심 로직 및 유지보수 가이드

```text
radsafety-pwa/
├── CLAUDE.md              ← Claude Code가 자동 인식
├── documents/
│   ├── database_schema.md ← 상세 DB 설계 문서
│   └── handover_guide.md   ← 핵심 로직 및 유지보수 가이드
├── src/
└── ...
```