-- 회원기관 등록 요청 (documents/privacy_redesign_plan.md §2-3, 2026-09-19 개정 — Dr. Ben).
--
-- 가입(또는 아이디 전환) 시 소속기관이 src/data/hospitals.ts 목록에 없으면, 가입자는
-- 입력한 기관명을 그대로 두고 그냥 진행한다: hospital_id = 'other' 로 가입되고 입력값은
-- profiles.hospital_request 에 남는다. 관리자는 admin/member-approval.astro 의 "기관 등록
-- 요청" 목록에서 중복·적절성을 검토해 hospitals.ts 에 추가·배포한 뒤 실제 id 로 확정
-- (resolveHospitalRequest 액션 — hospital_id 갱신 + hospital_request 비움 + 가입자 알림).
-- 거절하면 hospital_request 만 비우고 소속은 '기타' 유지.
--
-- hospital_request 가 NULL 이 아닌 행 = 검토 대기 중인 요청. 별도 테이블을 두지 않는
-- 이유: 요청은 계정당 최대 1건이고 처리되면 사라지는 상태값이라 profiles 컬럼 하나로 족하다.
--
-- ⚠️ Dr. Ben 수동 실행 전용 — 다른 sql_query/migrate_*.sql 과 같은 관례대로 CI/CD 는
-- 이 파일을 자동 실행하지 않는다. psql(Session pooler) 또는 Supabase SQL Editor 에서 실행.
--
-- 멱등 — 재실행 안전.

BEGIN;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS hospital_request text;

COMMIT;
