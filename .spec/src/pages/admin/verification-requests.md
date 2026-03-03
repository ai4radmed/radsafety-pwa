# 명세: src/pages/admin/verification-requests.astro

## 역할 요약

회원 인증 관리 페이지. verification_requests 조회, 탭(대기/승인/거절), 검색, 승인·거절 처리.

## Props

없음.

## 사이드 이펙트

- verification_requests / profiles (Astro Actions 호출을 통해 서버 측에서 업데이트).

## 핵심 규칙

1. is_admin 체크.
2. prerender = false.
