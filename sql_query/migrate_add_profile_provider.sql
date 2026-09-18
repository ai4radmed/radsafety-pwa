-- Phase 3(가입 승인 화면, documents/privacy_redesign_plan.md 2단계 개정)이 참조하는
-- profiles.provider 컬럼을 추가한다.
--
-- 경위: admin/member-approval.astro 가 신규가입 대기 계정의 로그인 방식(카카오/아이디)을
-- 보여주려고 `provider` 컬럼을 select 했으나, 애초에 이 컬럼이 DB에 존재한 적이 없었다
-- (documents/database_schema.md 가 이미 "실제 DB에 존재하지 않음 (문서 오류)"로 기록해둔
-- 그 컬럼 — 2026-09-18 PR #52 프리뷰 실측으로 "column profiles.provider does not exist"
-- 에러 발견). 세션의 `app_metadata.provider`(auth-handler.ts 의 `baseUser.provider`)는
-- 로그인한 본인에게만 보이는 값이라, 관리자가 *다른 사용자*의 로그인 방식을 보려면
-- DB에 영속된 값이 필요하다.
--
-- 값은 가입/자가치유 시점에 애플리케이션 코드가 채운다
-- (signUpWithUsername → 'email', auth-handler.ts performSelfHealing → 카카오면 'kakao'
-- 아니면 'email'). 이 마이그레이션 시점에 `status='pending'` 행이 0건이라 백필 불필요 —
-- 기존 active 행은 provider가 NULL로 남고, 화면은 `status='pending'` 행만 보여주므로
-- 영향 없다.
--
-- 멱등 — 재실행 안전.

BEGIN;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS provider text;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'profiles_provider_check'
          AND conrelid = 'public.profiles'::regclass
    ) THEN
        ALTER TABLE public.profiles
            ADD CONSTRAINT profiles_provider_check
            CHECK (provider IS NULL OR provider IN ('kakao', 'email'));
    END IF;
END $$;

COMMIT;
