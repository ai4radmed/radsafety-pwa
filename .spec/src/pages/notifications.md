# 명세: src/pages/notifications.astro

## 역할 요약

알림함 페이지. notifications 테이블 조회, 읽음 처리, 모두 읽음 표시.

## Props

없음.

## 사이드 이펙트

- notifications select (user_id).
- read_at 업데이트.

## 핵심 규칙

1. prerender = false. 미인증 시 /login 리다이렉트.
2. user_id로 본인 알림만 조회.
