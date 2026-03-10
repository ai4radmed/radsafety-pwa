# 명세: src/lib/supabase-browser.ts

## 역할 요약

브라우저용 Supabase 클라이언트. @supabase/ssr createBrowserClient, PKCE 플로우, 세션 유지·자동 갱신.
iOS standalone PWA에서 쿠키 소실에 대비하여 localStorage 백업/복원 커스텀 쿠키 핸들러 포함.

## Public API

| 이름       | 설명                                                                                                        |
| ---------- | ----------------------------------------------------------------------------------------------------------- |
| `supabase` | createBrowserClient. flowType: pkce, detectSessionInUrl: true, persistSession: true, autoRefreshToken: true |

## 내부 상수

| 이름                | 값                   | 설명                                       |
| ------------------- | -------------------- | ------------------------------------------ |
| `COOKIE_BACKUP_KEY` | `'sb-cookie-backup'` | localStorage에 Supabase 쿠키를 백업하는 키 |

## 사이드 이펙트

`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`. 쿠키 세션 저장 + localStorage 백업.

## 핵심 규칙

1. 모바일 딥링크 처리를 위해 detectSessionInUrl: true.
2. URL 기본값: mock.supabase.co, mock-key.
3. **커스텀 쿠키 핸들러**: createBrowserClient에 `cookies: { getAll, setAll }` 전달.
    - `getAll`: document.cookie에 `sb-` 접두사 쿠키가 없으면 localStorage 백업에서 복원 후 쿠키 재설정.
    - `setAll`: document.cookie에 쿠키 설정 후, `sb-` 접두사 쿠키를 localStorage에 백업. sb- 쿠키가 없으면(로그아웃) 백업 삭제.
4. SSR 환경(document 미정의) 안전 가드: getAll → 빈 배열, setAll → no-op.
