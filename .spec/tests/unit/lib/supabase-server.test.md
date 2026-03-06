# 테스트 명세: src/lib/supabase-server.ts

## 대상 구현체

- 경로: src/lib/supabase-server.ts
- 명세: .spec/src/lib/supabase-server.md

## 테스트 도구

Vitest (단위)

## 검증 항목

| describe                   | it                                               | 검증 내용               |
| -------------------------- | ------------------------------------------------ | ----------------------- |
| createSupabaseServerClient | Request와 cookies를 받아 createServerClient 호출 | mock으로 호출 여부 검증 |
| createSupabaseServerClient | Cookie 헤더가 있으면 parseCookieHeader로 파싱    | getAll 콜백 동작        |
| createSupabaseServerClient | setAll 시 cookies.set 호출                       | setAll 콜백 동작        |
| supabaseAnon               | createClient로 생성됨                            | export 존재, auth 옵션  |
| supabaseAdmin              | 서비스 롤 키 없으면 supabaseAnon과 동일 참조     | fallback 검증           |

## Mock/Setup

- vi.mock('@supabase/ssr') - createServerClient, parseCookieHeader
- vi.mock('@supabase/supabase-js') - createClient
- Request, AstroCookies mock 객체

## 유지보수 목적

- 인증 핵심 경로. 쿠키 파싱/세션 주입 로직 변경 시 회귀 방지
