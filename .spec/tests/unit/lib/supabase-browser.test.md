# 테스트 명세: src/lib/supabase-browser.ts

## 대상 구현체

- 경로: src/lib/supabase-browser.ts
- 명세: .spec/src/lib/supabase-browser.md

## 테스트 도구

Vitest (단위)

## 검증 항목

| describe            | it                                                    | 검증 내용                                                                              |
| ------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------- |
| supabase export     | supabase 객체가 export됨                              | import { supabase } 시 truthy                                                          |
| createBrowserClient | createBrowserClient가 올바른 옵션으로 호출됨          | flowType: pkce, detectSessionInUrl: true, persistSession: true, autoRefreshToken: true |
| createBrowserClient | url과 key가 문자열로 전달됨                           | typeof url/key === 'string', length > 0                                                |
| createBrowserClient | cookies 핸들러가 전달됨                               | options.cookies.getAll, options.cookies.setAll이 함수                                  |
| cookie backup       | getAll: sb- 쿠키가 있으면 document.cookie 그대로 반환 | localStorage 접근 없이 cookies 반환                                                    |
| cookie backup       | getAll: sb- 쿠키 없으면 localStorage 백업에서 복원    | localStorage에서 읽고 document.cookie에 재설정                                         |
| cookie backup       | setAll: 쿠키 설정 후 sb- 쿠키를 localStorage에 백업   | document.cookie 설정 + localStorage.setItem 호출                                       |
| cookie backup       | setAll: sb- 쿠키 없으면 localStorage 백업 삭제        | localStorage.removeItem(COOKIE_BACKUP_KEY) 호출                                        |

## Mock/Setup

- vi.mock('@supabase/ssr') - createBrowserClient, parseCookieHeader, serializeCookieHeader 반환 mock
- import.meta.env 모킹 (PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY)
- document.cookie, localStorage mock (getItem, setItem, removeItem)
- createBrowserClient mock에서 cookies 옵션을 캡처하여 getAll/setAll 직접 테스트

## 유지보수 목적

- 브라우저 클라이언트 초기화 옵션 변경 시 회귀 방지
- PKCE, 세션 유지 설정 검증
- iOS standalone PWA 쿠키 소실 대비 localStorage 백업/복원 검증
