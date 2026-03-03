# 테스트 명세: src/lib/supabase-browser.ts

## 대상 구현체

- 경로: src/lib/supabase-browser.ts
- 명세: .spec/src/lib/supabase-browser.md

## 테스트 도구

Vitest (단위)

## 검증 항목

| describe            | it                                           | 검증 내용                                                                              |
| ------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------- |
| supabase export     | supabase 객체가 export됨                     | import { supabase } 시 truthy                                                          |
| createBrowserClient | createBrowserClient가 올바른 옵션으로 호출됨 | flowType: pkce, detectSessionInUrl: true, persistSession: true, autoRefreshToken: true |
| createBrowserClient | url과 key가 문자열로 전달됨                  | typeof url/key === 'string', length > 0                                                |

## Mock/Setup

- vi.mock('@supabase/ssr') - createBrowserClient 반환 mock
- import.meta.env 모킹 (PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY)

## 유지보수 목적

- 브라우저 클라이언트 초기화 옵션 변경 시 회귀 방지
- PKCE, 세션 유지 설정 검증
