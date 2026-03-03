# 명세: src/middleware.ts

## 역할 요약

Astro 미들웨어. 요청 시 createSupabaseServerClient로 supabase 생성, getSession 후 locals.supabase, locals.session 설정.

## Public API

| export      | 설명                                                                                               |
| ----------- | -------------------------------------------------------------------------------------------------- |
| `onRequest` | defineMiddleware. createSupabaseServerClient(request, cookies) → getSession → locals 할당 → next() |

## 사이드 이펙트

locals.supabase, locals.session 설정. env.d.ts의 App.Locals 타입과 일치.

## 핵심 규칙

1. 모든 SSR 요청에서 locals에 supabase, session 주입.
2. next() 호출로 다음 핸들러로 전달.
