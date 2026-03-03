# 명세: src/pages/api/push/subscribe.ts

## 역할 요약

POST /api/push/subscribe. 로그인 사용자의 푸시 구독 정보(endpoint, p256dh, auth)를 push_subscriptions에 upsert.

## Public API

| Method | 경로                | Body                                   | 설명      |
| ------ | ------------------- | -------------------------------------- | --------- |
| POST   | /api/push/subscribe | { endpoint, p256dh, auth, userAgent? } | 구독 저장 |

## 사이드 이펙트

- push_subscriptions upsert (onConflict: endpoint).

## 핵심 규칙

1. prerender = false.
2. 인증 필요. 401 미인증.
3. supabaseAdmin 사용 (RLS 우회).
