# 명세: src/pages/auth/confirm.ts

## 역할 요약

GET /auth/confirm. 이메일 매직링크/OTP 검증. token_hash, type(magiclink|email|signup)로 verifyOtp 후 next 또는 /mypage로 리다이렉트.

## Public API

| Method | 경로          | Query                   | 설명                 |
| ------ | ------------- | ----------------------- | -------------------- |
| GET    | /auth/confirm | token_hash, type, next? | OTP 검증, 리다이렉트 |

## 사이드 이펙트

- Supabase 세션 쿠키 설정.

## 핵심 규칙

1. prerender = false.
2. token_hash, type 없거나 실패 시 /login 리다이렉트.
3. CDN 308 캐시 버그 검증 대상 (test_strategy.md).
