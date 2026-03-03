# 명세: src/pages/api/push/unsubscribe.ts

## 역할 요약

DELETE /api/push/unsubscribe. 로그인 사용자의 푸시 구독(endpoint) 삭제.

## Public API

| Method | 경로                  | Body         | 설명      |
| ------ | --------------------- | ------------ | --------- |
| DELETE | /api/push/unsubscribe | { endpoint } | 구독 해제 |

## 사이드 이펙트

- push_subscriptions delete (user_id + endpoint).

## 핵심 규칙

1. prerender = false.
2. 인증 필요.
3. 본인 구독만 삭제 가능.
