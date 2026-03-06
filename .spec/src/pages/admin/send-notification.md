# 명세: src/pages/admin/send-notification.astro

## 역할 요약

알림 발송 페이지. targetType(전체/학회/인증상태/특정사용자) 선택, 제목·메시지·링크 입력. actions.sendNotification 호출.

## Props

없음.

## 사이드 이펙트

- notifications insert.
- sendPushToUsers (push_subscriptions 기반).

## 핵심 규칙

1. is_admin 체크.
2. sendNotification server action 사용.
