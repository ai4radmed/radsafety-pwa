-- K-1 후속(2026-09-20): 사건 ↔ 정기검사 체크리스트 항목 연결.
-- 관리자가 사건에 "이 사고는 우리 체크리스트 어디에 해당하는가"를 붙인다 — KINS 가 원한 "정기검사 준비에 도움"의
-- 핵심. 값은 src/content/inspection_prep 의 항목 slug 배열(예: {'31-patient-consent','30-medical-exposure-protection'}).
-- 회원 화면은 /inspection-prep#checklist-<slug> 로 딥링크한다(항목이 펼쳐진 채 스크롤).
--
-- ⚠️ Dr. Ben 수동 실행 전용(Supabase SQL Editor). 배포 전 적용 — 액션·화면이 이 컬럼을 읽고 쓴다. 멱등.

BEGIN;

ALTER TABLE public.bulletins
    ADD COLUMN IF NOT EXISTS checklist_refs text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.bulletins.checklist_refs IS '관련 정기검사 체크리스트 항목 slug 배열(src/content/inspection_prep). 관리자가 지정.';

COMMIT;
