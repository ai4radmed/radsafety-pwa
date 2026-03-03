# 명세: src/lib/supabase-server.ts

## 역할 요약

서버 측 Supabase 클라이언트. `createSupabaseServerClient`(쿠키 기반 세션), `supabaseAnon`(익명, RLS 적용), `supabaseAdmin`(서비스 롤, RLS 우회) export.

## Public API

| 이름                                           | 설명                                                                    |
| ---------------------------------------------- | ----------------------------------------------------------------------- |
| `createSupabaseServerClient(request, cookies)` | @supabase/ssr createServerClient. parseCookieHeader, cookies.set 사용   |
| `supabaseAnon`                                 | createClient(anonKey), autoRefreshToken: false, persistSession: false   |
| `supabaseAdmin`                                | serviceRoleKey 있으면 createClient(serviceRoleKey), 없으면 supabaseAnon |

## 사이드 이펙트

`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` 환경변수. 기본 URL: mock.supabase.co.

## 핵심 규칙

1. createSupabaseServerClient: getAll → parseCookieHeader, setAll → cookies.set.
2. supabaseAdmin fallback: 서비스 롤 키 없을 때 anon 클라이언트 사용.
