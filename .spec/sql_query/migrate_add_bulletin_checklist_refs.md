# 명세: sql_query/migrate_add_bulletin_checklist_refs.sql

## 역할 요약

`bulletins.checklist_refs text[] NOT NULL DEFAULT '{}'` 추가(K-1 후속, 2026-09-20). 사건을 정기검사 체크리스트 항목(`src/content/inspection_prep` slug)에 연결한다 — 관리자가 `admin/bulletins.astro` 에서 고르고, 회원 `bulletins.astro` 가 `/inspection-prep#checklist-<slug>` 딥링크로 보여 준다.

## Props

없음. Dr. Ben 수동 실행. **배포 전 적용**(액션이 이 컬럼을 update 한다 — 없으면 게시/저장이 실패).

## 사이드 이펙트

컬럼 1개 추가 + COMMENT. 기존 행은 `{}`.

## 핵심 규칙

1. 값은 콘텐츠 slug(파일명에서 `.md` 뺀 것). 콘텐츠가 이름을 바꾸면 링크가 끊긴다 — 회원 화면은 카탈로그에 없는 slug 를 조용히 건너뛴다(오류 ✗).
2. 멱등(`ADD COLUMN IF NOT EXISTS`).

## 실행 가이드

```sql
select column_name, data_type, column_default from information_schema.columns where table_name='bulletins' and column_name='checklist_refs';
```
