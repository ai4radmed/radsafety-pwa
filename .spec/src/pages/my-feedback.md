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
3. feedback.status는 legacy(`pending`/`processing`/`resolved`) 및 신규(`reviewing`/`on_hold`/`reflected`/`completed`)를 모두 정규화하여 화면에는 `검토중/보류/완료` 3가지 라벨로 표시한다.
