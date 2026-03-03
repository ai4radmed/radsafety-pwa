# 명세: src/pages/auth/callback.ts

## 역할 요약

GET /auth/callback. OAuth(code) 콜백. exchangeCodeForSession 후 next 파라미터 또는 /mypage로 리다이렉트.

## Public API

| Method | 경로           | Query       | 설명                        |
| ------ | -------------- | ----------- | --------------------------- |
| GET    | /auth/callback | code, next? | OAuth 세션 교환, 리다이렉트 |

## 사이드 이펙트

- Supabase 세션 쿠키 설정.

## 핵심 규칙

1. prerender = false.
2. code 없거나 실패 시 /login 리다이렉트.
