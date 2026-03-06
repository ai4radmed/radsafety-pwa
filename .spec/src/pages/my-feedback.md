# 명세: src/pages/my-feedback.astro

## 역할 요약

내 의견함 페이지. 본인 feedback 목록 조회, 상세 모달, 상태 필터.

## Props

없음.

## 사이드 이펙트

- feedback 테이블 select (user_id 필터).

## 핵심 규칙

1. prerender = false. 인증 필요.
2. user_id로 본인 의견만 조회.
