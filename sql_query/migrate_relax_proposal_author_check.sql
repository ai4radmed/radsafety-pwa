-- 제안 작성자 제약 완화 (2026-09-20) — **회원 탈퇴가 막히던 버그 수리**.
--
-- 증상: 아이디(signed)로 제도 개선 제안을 낸 회원은 회원 탈퇴가 **영구히 불가능**했다.
-- 원인: `proposals.author_id` 는 `ON DELETE SET NULL` 인데, 같은 날 넣은 CHECK 가 signed 행에
--   `author_id IS NOT NULL` 을 요구한다 → 탈퇴(=profiles 삭제) 시 SET NULL 이 CHECK 를 위반해
--   삭제 자체가 실패한다. 처리방침 §5 "계정 정보는 회원 탈퇴 시 즉시 삭제됩니다" 와 정면 충돌.
-- 발견: 2026-09-20 테스트 계정 정리 중 test0919(아이디 제안 2건) 삭제 시도로 드러남.
--
-- 수정: signed 행의 `author_id` 를 nullable 로 허용한다(= 탈퇴한 작성자).
--   `archives`·`findings` 가 이미 탈퇴 시 작성자 연결만 끊고 '알 수 없음'으로 남는 방식과 같다.
-- ⚠️ **익명성 보장은 그대로** — anonymous 행은 여전히 `author_id`·`created_at` NULL + `receipt_hash`
--   NOT NULL 을 강제한다. 완화되는 쪽은 signed 분기뿐이다.
--
-- ⚠️ Dr. Ben 수동 실행 전용(Supabase SQL Editor). 멱등 — 재실행 안전.

BEGIN;

ALTER TABLE public.proposals DROP CONSTRAINT IF EXISTS proposals_anonymous_has_no_identity;

ALTER TABLE public.proposals ADD CONSTRAINT proposals_anonymous_has_no_identity CHECK (
    (mode = 'anonymous' AND author_id IS NULL AND created_at IS NULL AND receipt_hash IS NOT NULL) OR
    (mode = 'signed'    AND created_at IS NOT NULL AND receipt_hash IS NULL)
);

COMMIT;
