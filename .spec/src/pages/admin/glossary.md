# 명세: src/pages/admin/glossary.astro

## 역할 요약

관리자 용어 관리 페이지. glossary_terms CRUD. 추가·수정·삭제.

## Props

없음.

## 사이드 이펙트

- glossary_terms select/insert/update/delete.

## 핵심 규칙

1. is_admin 체크.
2. prerender = false.
