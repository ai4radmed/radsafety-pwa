# 명세: src/middleware.ts

## 역할 요약

Astro 미들웨어. 요청 시 createSupabaseServerClient로 supabase 생성, getSession 후 locals.supabase, locals.session 설정. 이어서 **페이지 조회를 사용성 집계에 기록**한다(U 트랙, 2026-09-20).

## Public API

| export      | 설명                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------- |
| `onRequest` | defineMiddleware. createSupabaseServerClient(request, cookies) → getSession → locals 할당 → page_view 기록 → next() |

## 사이드 이펙트

locals.supabase, locals.session 설정. env.d.ts의 App.Locals 타입과 일치. `usage_events` 에 `page_view` 행 1건 삽입(조건 충족 시).

## 핵심 규칙

1. 모든 SSR 요청에서 locals에 supabase, session 주입.
2. next() 호출로 다음 핸들러로 전달.
3. **페이지 조회 기록** — GET 요청이고 `isTrackablePath` 를 통과할 때만. 서버 렌더라 이 한 곳이면 모든 화면 이동이 잡힌다. 광고 차단기에 지워지지 않고 클라이언트 번들도 늘지 않는다.
4. 제외 판정은 `src/lib/usage/events.ts` 가 권위 — 제도 개선 제안 계열·관리자·API·자산은 기록하지 않는다. 미들웨어가 제외 목록을 따로 들고 있지 않다(두 벌이 되면 어긋난다).
5. **집계 실패가 화면을 막지 않는다** — `recordUsage` 는 던지지 않고 `false` 만 돌려준다.
6. 로그인 여부는 이미 해석한 세션에서 가져온다. 집계를 위해 추가 조회를 하지 않는다.
