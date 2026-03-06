# 명세: src/pages/resources.astro

## 역할 요약

자료실 페이지. archives 테이블 조회, 카테고리 필터, 검색, 정렬, 상세 모달, 관리자/인증자 자료 등록·수정·삭제. PDF 미리보기.

## Props

없음. URL 쿼리 ?slug=로 상세 모달 초기 열기.

## 사이드 이펙트

- archives select/insert/update/delete.
- /api/archives/[id], /api/archives/view/[slug] 호출.

## 핵심 규칙

1. Slug 시스템. documents/resource_slugs.md 참조.
2. 카테고리: 작성지침, 작성예시, 가이드북, 발표자료, 기타.
3. PDF만 미리보기 지원.
