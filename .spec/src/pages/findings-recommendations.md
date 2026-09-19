# 명세: src/pages/findings-recommendations.astro

## 역할 요약

지적권고사례 페이지. Astro Content + Supabase findings 병합. 태그 필터, 검색, 정렬, 상세 모달, 관리자/인증자 사례 등록·수정·삭제.

## Props

없음.

## 사이드 이펙트

- findings 테이블 select/insert/update/delete.
- userProfile 기반 권한 체크 (is_admin, status, reject_count — 2-1).

## 핵심 규칙

1. getCollection('findings_recommendations') + Supabase findings 병합.
2. 사례 등록 버튼(2-1, 2026-09-19): `is_admin` 또는 `status==='active' && reject_count<3`. 제출 행의 `status`는 DB 트리거가 정한다(`can_publish`면 published, 아니면 pending) — insert 응답의 `status`로 "검토 후 게시" 안내. 본인 pending/rejected 카드에 `status-badge` + `.not-published`. 다른 회원에게는 RLS가 안 보여준다. insert 응답 `status==='pending'`이면 `actions.notifySubmission({kind:'finding', id})` fire-and-forget(관리자 in-app + 텔레그램).
3. 수정·삭제: 본인 소유 또는 관리자만.
4. AVAILABLE_TAGS 고정 목록 사용.

## 2계층 공개 계층 (2026-09-19)

- 비가입자도 페이지가 열린다(`auth-handler` publicPaths). **목록만**: DB 사례는 anon일 때 허용 열(`id, title, finding_type, tags, year, created_at, status, user_id`)만 `select`(`'*'`는 열 권한으로 거부됨, `sql_query/migrate_public_tier_read.sql`). 카드 클릭 시 `userProfile.get().id`가 없으면 `confirm('…회원 전용…')` → 확인 시 `/login?from=/findings-recommendations`, 상세 모달은 열지 않는다. 등록 버튼은 기존 게이트(`status==='active'`)로 이미 숨김. 정적(마크다운) 사례 본문은 페이지에 포함돼 있어 클라이언트 가림만 가능.
