# 명세: src/pages/findings-recommendations.astro

## 역할 요약

지적권고사례 페이지. Astro Content + Supabase findings 병합. 태그 필터, 검색, 정렬, 상세 모달, 관리자/인증자 사례 등록·수정·삭제.

## Props

없음.

## 사이드 이펙트

- findings 테이블 select/insert/update/delete.
- userProfile 기반 권한 체크 (is_admin, verification_status).

## 핵심 규칙

1. getCollection('findings_recommendations') + Supabase findings 병합.
2. 사례 등록 버튼: is_admin 또는 list/temp_verified/verified 사용자에게만 표시.
3. 수정·삭제: 본인 소유 또는 관리자만.
4. AVAILABLE_TAGS 고정 목록 사용.
