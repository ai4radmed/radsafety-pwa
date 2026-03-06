# 명세: src/lib/supabase-browser.ts

## 역할 요약

브라우저용 Supabase 클라이언트. @supabase/ssr createBrowserClient, PKCE 플로우, 세션 유지·자동 갱신.

## Public API

| 이름       | 설명                                                                                                        |
| ---------- | ----------------------------------------------------------------------------------------------------------- |
| `supabase` | createBrowserClient. flowType: pkce, detectSessionInUrl: true, persistSession: true, autoRefreshToken: true |

## 사이드 이펙트

`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`. localStorage/쿠키 세션 저장.

## 핵심 규칙

1. 모바일 딥링크 처리를 위해 detectSessionInUrl: true.
2. URL 기본값: mock.supabase.co, mock-key.
