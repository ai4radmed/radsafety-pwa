# 명세: sql_query/migrate_add_proposals.sql

## 역할 요약

3단계 제안 채널의 `proposals`·`proposal_quota` 테이블과 비공개 버킷 `proposal-attachments`. 설계 = `documents/privacy_redesign_plan.md` 3단계.

## Props

없음. Dr. Ben 수동 실행(SQL Editor). **배포 전 적용**. 멱등.

## 사이드 이펙트

- `proposals`(id, category CHECK, body, attachments jsonb, status CHECK, admin_note, admin_reply, mode CHECK, author_id FK NULL, created_at NULL, created_day, answered_at, receipt_hash UNIQUE) + **CHECK `proposals_anonymous_has_no_identity`**: anonymous ⇒ author_id·created_at NULL & receipt_hash NOT NULL / signed ⇒ created_at NOT NULL & receipt_hash NULL. ⚠️ signed 의 `author_id` 는 **nullable**(2026-09-20 `migrate_relax_proposal_author_check.sql` — 탈퇴 시 `ON DELETE SET NULL` 이 CHECK 를 위반해 회원 탈퇴가 막히던 버그 수리).
- `proposal_quota(key PK, day, count)`.
- RLS: `proposals` SELECT authenticated — `author_id = auth.uid() OR is_current_user_admin()`; INSERT/UPDATE/DELETE 정책 없음(서비스 롤). `proposal_quota` 정책 없음.
- 버킷 `proposal-attachments`(private), storage 정책 없음.

## 핵심 규칙

1. **없는 컬럼이 설계** — ip·user_agent·hospital_id 없음. 테스트가 SQL 텍스트로 검사.
2. 익명 행의 신원 NULL 은 코드 + DB CHECK 이중 강제. signed 행의 작성자는 탈퇴로 비워질 수 있다(자료·사례와 동일하게 '연결만 끊김').
3. 쿼터 키는 `proposals` 에 없다 — 어느 제안이 어느 키였는지 서버도 모른다.
4. 클라이언트 쓰기 정책을 만들지 말 것 — 만드는 순간 `mode` 위조가 가능해진다.

## 실행 가이드

```sql
select mode, status, count(*) from public.proposals group by 1,2;
select conname from pg_constraint where conrelid = 'public.proposals'::regclass;   -- proposals_anonymous_has_no_identity
select id, public from storage.buckets where id = 'proposal-attachments';         -- false
```
