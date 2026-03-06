# 명세: src/env.d.ts

## 역할 요약

Astro 전역 타입 선언 파일. `App.Locals`에 SSR 시 사용되는 Supabase 클라이언트와 세션 타입을 정의한다.

## Public API (타입 선언)

| 이름                  | 타입              | 설명                                 |
| --------------------- | ----------------- | ------------------------------------ |
| `App.Locals.supabase` | `SupabaseClient`  | 서버 측 Supabase 클라이언트 인스턴스 |
| `App.Locals.session`  | `Session \| null` | 현재 사용자 세션 또는 null           |

## 사이드 이펙트

없음. 타입 선언만 포함한다.

## 핵심 규칙

1. `/// <reference types="astro/client" />`를 최상단에 둔다.
2. `import('@supabase/supabase-js')` 인라인 import로 의존성을 명시한다.
3. `Astro.locals`에서 `supabase`, `session` 접근 시 이 타입이 적용된다.
