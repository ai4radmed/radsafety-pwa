# 테스트 명세: src/lib/supabase-browser.ts

## 대상 구현체

- 경로: src/lib/supabase-browser.ts
- 명세: .spec/src/lib/supabase-browser.md

## 테스트 도구

Vitest (단위)

## 검증 항목

| describe                  | it                                                                        | 검증 내용                                                                              |
| ------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| supabase export           | supabase 객체가 export됨                                                  | import { supabase } 시 truthy                                                          |
| createBrowserClient       | createBrowserClient가 올바른 옵션으로 호출됨                              | flowType: pkce, detectSessionInUrl: true, persistSession: true, autoRefreshToken: true |
| createBrowserClient       | url과 key가 문자열로 전달됨                                               | typeof url/key === 'string', length > 0                                                |
| createBrowserClient       | cookies 핸들러가 전달됨                                                   | options.cookies.getAll, options.cookies.setAll이 함수                                  |
| cookie backup             | getAll: sb- 쿠키가 있으면 document.cookie 그대로 반환                     | localStorage 접근 없이 cookies 반환                                                    |
| cookie backup             | getAll: sb- 쿠키 없으면 localStorage 백업에서 복원                        | localStorage에서 읽고 document.cookie에 재설정                                         |
| cookie backup             | setAll: 쿠키 설정 후 sb- 쿠키를 localStorage에 백업                       | document.cookie 설정 + localStorage.setItem 호출                                       |
| cookie backup             | setAll: sb- 쿠키 없으면 localStorage 백업 삭제                            | localStorage.removeItem(COOKIE_BACKUP_KEY) 호출                                        |
| cookie backup             | setAll: sb- 쿠키 없으면(로그아웃) sb-signed-out 마커를 세운다             | localStorage.setItem('sb-signed-out', '1') 호출                                        |
| cookie backup             | setAll: sb- 쿠키 있으면(로그인 성공) sb-signed-out 마커를 해제한다        | localStorage.removeItem('sb-signed-out') 호출                                          |
| cookie backup             | getAll: sb-signed-out 마커가 있으면 백업이 있어도 복원하지 않는다         | document.cookie 재설정 없음, 원래 쿠키만 반환                                          |
| forceClearSupabaseCookies | document.cookie 의 sb- 접두사 쿠키를 전부 지운다(그 외는 건드리지 않는다) | sb- 쿠키 개수만큼 document.cookie setter 호출                                          |
| forceClearSupabaseCookies | localStorage 백업을 지우고 sb-signed-out 마커를 세운다                    | COOKIE_BACKUP_KEY 삭제, SIGNED_OUT_KEY='1'                                             |

## Mock/Setup

- vi.mock('@supabase/ssr') - createBrowserClient, parseCookieHeader, serializeCookieHeader 반환 mock
- import.meta.env 모킹 (PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY)
- document.cookie는 `Object.defineProperty`로 모킹
- `cookie backup` describe의 `beforeEach`에서 `localStorage.clear()` — 테스트 간 실제 localStorage 상태 격리
- createBrowserClient mock에서 cookies 옵션을 캡처하여 getAll/setAll 직접 테스트
- **localStorage 값 검증은 `Storage.prototype` 스파이가 아니라 실제 `localStorage.setItem`/`getItem` 읽기·쓰기로 한다** (2026-09-16) — 이 describe 안에서 여러 테스트가 `Storage.prototype.getItem`/`setItem`/`removeItem`을 번갈아 스파이하면 `vi.restoreAllMocks()`가 되돌리지 못해 앞 테스트의 스파이 반환값이 뒤 테스트로 새는 상호작용이 실측됨(vitest/jsdom). 첫 번째 `getAll` 테스트만 예외 — "호출되지 않음"을 확인하는 negative assertion이라 안전.

## 유지보수 목적

- 브라우저 클라이언트 초기화 옵션 변경 시 회귀 방지
- PKCE, 세션 유지 설정 검증
- iOS standalone PWA 쿠키 소실 대비 localStorage 백업/복원 검증
