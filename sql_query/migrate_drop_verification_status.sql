-- 2단계 마감 — verification_status 삭제 (documents/privacy_redesign_plan.md 2-1 완료 후).
-- migrate_add_publish_gate.sql 이 업로드 게이트를 can_publish 로 교체한 뒤, 그리고 그 코드가 배포된 뒤 실행.
--
-- ⚠️ 이 컬럼을 참조하는 정책·함수가 대시보드에만 남아 있으면 DROP 이 실패한다(의도 — CASCADE 안 씀).
--    실패하면 에러의 객체명을 보고 그 정책을 먼저 DROP 한다. 사전 점검:
--    select policyname, tablename from pg_policies
--    where schemaname='public' and (coalesce(qual,'')||coalesce(with_check,'')) like '%verification_status%';
--
-- 실행 기록(2026-09-19, 운영): 사전 점검에서 대시보드에만 존재하던 옛 정책
--   "Authenticated users can insert archives"(archives INSERT, verification_status 참조) 1건 발견 →
--   DROP POLICY 후 컬럼 삭제 성공. 저장소 SQL 에 없던 정책이라 rebuild_all_tables.sql 에는 흔적 없음.
--
-- 멱등.

BEGIN;

ALTER TABLE public.profiles
    DROP COLUMN IF EXISTS verification_status;

COMMIT;
