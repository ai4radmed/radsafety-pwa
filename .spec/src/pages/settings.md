# 명세: src/pages/settings.astro

## 역할 요약

설정 페이지. 글자 크기(small/medium/large/xlarge), 푸시 알림 토글. localStorage, /api/push/subscribe, /api/push/unsubscribe 호출.

## Props

없음.

## 사이드 이펙트

- localStorage: font-size 저장.
- push_subscriptions upsert/delete.

## 핵심 규칙

1. 인증 필요.
2. 푸시: VAPID, Service Worker 등록 후 subscribe/unsubscribe API 호출.
