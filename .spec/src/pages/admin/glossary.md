# 명세: src/pages/admin/glossary.astro

## 역할 요약

관리자 용어 관리 페이지. glossary_terms CRUD. 추가·수정·삭제.

## Props

없음.

## 사이드 이펙트

- glossary_terms select/insert/update/delete.

## 핵심 규칙

1. prerender = false.
2. 관리자 가드: astro:page-load 내부에서 처리. **비로그인(user.id 없음)은 가드에서 제외** — DashboardLayout의 auth guard가 /login으로 리다이렉트함.
3. 로그인된 사용자 중 is_admin !== 'true'인 경우에만 alert 후 `/`로 리다이렉트.
