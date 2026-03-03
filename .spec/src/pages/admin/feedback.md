# 명세: src/pages/admin/feedback.astro

## 역할 요약

관리자 의견 관리 페이지. feedback 테이블 전체 조회, 상태 탭(전체/대기/처리중/완료), 상세 모달, 상태 변경.

## Props

없음.

## 사이드 이펙트

- feedback select/update (status).

## 핵심 규칙

1. prerender = false.
2. 관리자 가드: astro:page-load 내부에서 처리. **비로그인(user.id 없음)은 가드에서 제외** — DashboardLayout의 auth guard가 /login으로 리다이렉트함.
3. 로그인된 사용자 중 is_admin !== 'true'인 경우에만 alert 후 `/`로 리다이렉트.
