# 명세: sql_query/migrate_relax_proposal_author_check.sql

## 역할 요약

`proposals_anonymous_has_no_identity` CHECK 의 **signed 분기에서 `author_id IS NOT NULL` 요구를 제거**한다. 2026-09-20 같은 날 도입한 제약이 `ON DELETE SET NULL` 과 충돌해 **아이디로 제안한 회원의 탈퇴가 영구 불가**였던 버그 수리.

## Props

없음. Dr. Ben 수동 실행(SQL Editor). 멱등(`DROP CONSTRAINT IF EXISTS` 후 재생성).

## 사이드 이펙트

CHECK 제약 1개 교체. 데이터 변경 없음.

## 핵심 규칙

1. **익명성 보장 불변** — anonymous 분기는 그대로(`author_id`·`created_at` NULL + `receipt_hash` NOT NULL). 완화되는 쪽은 signed 뿐이다.
2. signed 행의 `author_id` 가 NULL = **탈퇴한 작성자**. `archives`·`findings` 가 탈퇴 시 '알 수 없음'으로 남는 방식과 같고, 처리방침 §5 와 정합.
3. 관리자 화면은 그 행을 `(탈퇴한 회원)` 으로 표기해 **익명 제안(`작성자 기록 없음`)과 구별**한다 — 익명 채널의 의미가 흐려지지 않게.
4. 회원 화면 `/my-proposals` 는 RLS(`author_id = auth.uid()`)라 NULL 행이 누구에게도 보이지 않는다.

## 실행 가이드

```sql
-- 적용 후: 아이디 제안이 있는 계정도 탈퇴(=profiles 삭제)가 성공해야 한다
select conname, pg_get_constraintdef(oid) from pg_constraint
 where conrelid = 'public.proposals'::regclass and conname = 'proposals_anonymous_has_no_identity';
```

## 성공 기준

제약 정의에 `author_id IS NOT NULL` 이 signed 분기에서 사라졌고, 아이디 제안 작성자의 회원 탈퇴가 성공한다.
