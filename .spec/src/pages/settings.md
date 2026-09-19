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

## 2계층 공개 계층 (2026-09-19)

- 설정 페이지는 비가입자에게도 열린다(글자 크기 등 로컬 설정). 푸시 알림 구독은 계정에 묶이므로 `userProfile.get().id`가 없으면 토글 비활성 + "로그인 후 사용할 수 있습니다".
