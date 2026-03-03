# 명세: src/lib/push.ts

## 역할 요약

web-push 기반 웹 푸시 발송. VAPID 설정 후 `sendPushToUser`, `sendPushToUsers`로 push_subscriptions 테이블 기반 발송. 410/404 시 만료 구독 삭제.

## Public API

| 함수                                | 설명                                                                               |
| ----------------------------------- | ---------------------------------------------------------------------------------- |
| `sendPushToUser(userId, payload)`   | push_subscriptions 조회 후 webpush.sendNotification. TTL 86400. 410/404 시 DB 삭제 |
| `sendPushToUsers(userIds, payload)` | Promise.allSettled로 각 사용자에게 발송                                            |

## PushPayload

title, body, url?, tag?

## 사이드 이펙트

PUBLIC_VAPID_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL. push_subscriptions CRUD. web-push API.

## 핵심 규칙

1. VAPID 키 없으면 logger.error 후 return.
2. 만료된 구독은 delete().in('endpoint', expiredEndpoints).
3. keys: p256dh, auth.
