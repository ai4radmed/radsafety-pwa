-- 2단계 2-2 (documents/privacy_redesign_plan.md, 확정 2026-09-08, 실행 2026-09-19) —
-- 회원 인증(명부 대조) 체계 폐지 + profiles 개인정보 컬럼 삭제.
--
-- 삭제하는 것
--   테이블: allowed_members(회원명부), verification_requests(인증 요청), email_verification_codes(OTP)
--   profiles 컬럼 14개: login_email, nickname, society_email, real_name, affiliation, department,
--     verification_date, verification_method, email_verified, classification,
--     license_type, is_safety_manager, safety_manager_start_year, safety_manager_end_year
-- 남기는 것
--   verification_status — 자료실·지적사례 업로드 게이트(클라이언트 + archives RLS)가 아직 참조.
--     2-1(can_publish)에서 게이트를 교체한 뒤 그때 삭제한다.
--   id, username, created_at, is_admin, society, hospital_id, hospital_request, status, provider
--
-- ⚠️ 비가역 — 실행 전 전체 백업(pg_dump) 필수. 이 파일은 Dr. Ben 수동 실행 전용(Supabase SQL Editor).
-- ⚠️ 코드 배포와 순서: 이 마이그레이션은 컬럼을 읽거나 쓰는 코드가 모두 제거된 뒤(PR 머지·배포 후)
--    실행해도 되고 먼저 실행해도 된다 — 새 코드는 이 컬럼을 전혀 참조하지 않고, 옛 코드는 select('*')
--    라 컬럼이 없어도 읽기는 깨지지 않는다(쓰기만 깨짐). 안전한 순서: 배포 → 실행.
--
-- DROP COLUMN 은 의존 객체(정책·뷰·함수)가 있으면 실패한다 — CASCADE 를 쓰지 않는 게 의도다.
-- 실패하면 에러 메시지의 객체를 확인해 별도 처리한다(아래 사전 점검 쿼리 참조).
--
-- 멱등 — IF EXISTS 로 재실행 안전.

BEGIN;

DROP TABLE IF EXISTS public.email_verification_codes CASCADE;
DROP TABLE IF EXISTS public.verification_requests CASCADE;
DROP TABLE IF EXISTS public.allowed_members CASCADE;

ALTER TABLE public.profiles
    DROP COLUMN IF EXISTS login_email,
    DROP COLUMN IF EXISTS nickname,
    DROP COLUMN IF EXISTS society_email,
    DROP COLUMN IF EXISTS real_name,
    DROP COLUMN IF EXISTS affiliation,
    DROP COLUMN IF EXISTS department,
    DROP COLUMN IF EXISTS verification_date,
    DROP COLUMN IF EXISTS verification_method,
    DROP COLUMN IF EXISTS email_verified,
    DROP COLUMN IF EXISTS classification,
    DROP COLUMN IF EXISTS license_type,
    DROP COLUMN IF EXISTS is_safety_manager,
    DROP COLUMN IF EXISTS safety_manager_start_year,
    DROP COLUMN IF EXISTS safety_manager_end_year;

COMMIT;

-- 확인
-- select column_name from information_schema.columns
-- where table_schema = 'public' and table_name = 'profiles' order by ordinal_position;
