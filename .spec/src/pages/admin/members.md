# 명세: src/pages/admin/members.astro

## 역할 요약

회원명부 등록 페이지. 학회(nuclear_medicine/technology) 선택, 엑셀 업로드, allowed_members 테이블 upsert, 명단 전체 초기화.

## Props

없음.

## 사이드 이펙트

- allowed_members insert/delete.
- 엑셀 파싱 (xlsx, xls).

## 핵심 규칙

1. is_admin 체크.
2. 학회 구분: 대한핵의학회, 대한핵의학기술학회.
