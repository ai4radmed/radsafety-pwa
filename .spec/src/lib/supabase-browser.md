# 명세: src/lib/supabase-browser.ts

## 역할 요약

브라우저용 Supabase 클라이언트. @supabase/ssr createBrowserClient, PKCE 플로우, 세션 유지·자동 갱신.
iOS standalone PWA에서 쿠키 소실에 대비하여 localStorage 백업/복원 커스텀 쿠키 핸들러 포함.

## Public API

| 이름       | 설명                                                                                                        |
| ---------- | ----------------------------------------------------------------------------------------------------------- |
| `supabase` | createBrowserClient. flowType: pkce, detectSessionInUrl: true, persistSession: true, autoRefreshToken: true |

## 내부 상수

| 이름                | 값                   | 설명                                                             |
| ------------------- | -------------------- | ---------------------------------------------------------------- |
| `COOKIE_BACKUP_KEY` | `'sb-cookie-backup'` | localStorage에 Supabase 쿠키를 백업하는 키                       |
| `SIGNED_OUT_KEY`    | `'sb-signed-out'`    | 로그아웃 직후 백업 복원을 막는 마커 (2026-09-16, 아래 버그 수정) |

## 사이드 이펙트

`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`. 쿠키 세션 저장 + localStorage 백업.

## 핵심 규칙

1. 모바일 딥링크 처리를 위해 detectSessionInUrl: true.
2. URL 기본값: mock.supabase.co, mock-key.
3. **커스텀 쿠키 핸들러**: createBrowserClient에 `cookies: { getAll, setAll }` 전달.
    - `getAll`: document.cookie에 `sb-` 접두사 쿠키가 없으면 localStorage 백업에서 복원 후 쿠키 재설정. **단, `SIGNED_OUT_KEY` 마커가 있으면 복원을 건너뛴다**(규칙 5 참조).
    - `setAll`: document.cookie에 쿠키 설정 후, `sb-` 접두사 쿠키를 localStorage에 백업. sb- 쿠키가 없으면(로그아웃) 백업 삭제 + `SIGNED_OUT_KEY` 마커 설정. sb- 쿠키가 있으면(로그인) 백업 갱신 + `SIGNED_OUT_KEY` 마커 해제.
4. SSR 환경(document 미정의) 안전 가드: getAll → 빈 배열, setAll → no-op.
5. **버그 수정(2026-09-16)**: `getAll`이 "쿠키 없음"이라는 사실만으로 iOS의 쿠키 소실과 방금 로그아웃한 상태를 구분하지 못해, 로그아웃 직후 `/login` 재방문 시 localStorage 백업에서 옛 세션을 되살려 자동 재로그인시키는 버그가 있었다(PR #43 프리뷰 실측). `SIGNED_OUT_KEY` 마커로 두 상황을 구분해 해결 — 로그아웃(`setAll`이 빈 쿠키를 쓸 때) 마커를 세우고, `getAll`은 마커가 있으면 복원하지 않는다. 마커는 다음 로그인이 성공해 `setAll`이 유효한 세션 쿠키를 쓸 때만 해제된다.
