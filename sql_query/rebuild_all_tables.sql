-- ==============================================================================
-- Master Database Schema: Safe Migration Script (데이터 보존)
-- Description: 기존 데이터를 유지하면서 스키마 변경 적용
-- Version: 2.0 (Email Verification 추가)
-- Usage: Supabase SQL Editor에서 실행
--
-- 변경 이력:
-- - 2026-02-14: 이메일 검증 시스템 추가 (email_verification_codes 테이블)
-- - 기존: rebuild_all_tables.sql.backup 참조
--
-- 주의: 이 스크립트는 기존 데이터를 보존합니다.
--       전체 재구축이 필요한 경우 rebuild_all_tables.sql.backup 사용
-- ==============================================================================

-- ============================================================
-- 1. Add new columns to profiles table (if not exists)
-- ============================================================

DO $$
BEGIN
    -- Add email_verified column
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'email_verified'
    ) THEN
        ALTER TABLE public.profiles
        ADD COLUMN email_verified boolean DEFAULT false;

        RAISE NOTICE 'Added email_verified column to profiles';
    ELSE
        RAISE NOTICE 'email_verified column already exists';
    END IF;

    -- Add verification_method column
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'verification_method'
    ) THEN
        ALTER TABLE public.profiles
        ADD COLUMN verification_method text; -- 'login_email', 'otp', 'list'

        RAISE NOTICE 'Added verification_method column to profiles';
    ELSE
        RAISE NOTICE 'verification_method column already exists';
    END IF;
END $$;

-- ============================================================
-- 2. Create email_verification_codes table
-- ============================================================

-- Drop if exists (safe to drop as this is new table with no data)
DROP TABLE IF EXISTS public.email_verification_codes CASCADE;

CREATE TABLE public.email_verification_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL,
    code text NOT NULL, -- 6-digit code
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at timestamp with time zone DEFAULT timezone('utc'::text, now()) + interval '10 minutes' NOT NULL,
    verified boolean DEFAULT false,
    verified_at timestamp with time zone
);

-- Add indexes for performance
CREATE INDEX idx_email_verification_user_id ON public.email_verification_codes(user_id);
CREATE INDEX idx_email_verification_code ON public.email_verification_codes(code);
CREATE INDEX idx_email_verification_expires ON public.email_verification_codes(expires_at);

-- Enable RLS
ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own verification codes"
    ON public.email_verification_codes
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own verification codes"
    ON public.email_verification_codes
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own verification codes"
    ON public.email_verification_codes
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.email_verification_codes TO postgres;
GRANT ALL ON public.email_verification_codes TO authenticated;
GRANT ALL ON public.email_verification_codes TO service_role;

-- ============================================================
-- 3. Update existing data (optional)
-- ============================================================

-- Mark users who logged in with email as verified
UPDATE public.profiles
SET
    email_verified = true,
    verification_method = 'login_email'
WHERE
    login_email IS NOT NULL
    AND login_email != ''
    AND login_email LIKE '%@%'
    AND email_verified IS NULL;

-- Mark users with list verification
UPDATE public.profiles
SET
    verification_method = 'list'
WHERE
    verification_status = 'list'
    AND verification_method IS NULL;

-- ============================================================
-- 4. Comments for documentation
-- ============================================================

COMMENT ON TABLE public.email_verification_codes IS 'Stores email verification codes (OTP) for society_email validation';
COMMENT ON COLUMN public.email_verification_codes.code IS '6-digit verification code sent to email';
COMMENT ON COLUMN public.email_verification_codes.expires_at IS 'Code expires 10 minutes after creation';

COMMENT ON COLUMN public.profiles.email_verified IS 'Whether society_email has been verified';
COMMENT ON COLUMN public.profiles.verification_method IS 'How society_email was verified: login_email, otp, or list';

-- ============================================================
-- 5. Verification Summary
-- ============================================================

DO $$
DECLARE
    total_profiles int;
    verified_profiles int;
    verification_codes_count int;
BEGIN
    SELECT COUNT(*) INTO total_profiles FROM public.profiles;
    SELECT COUNT(*) INTO verified_profiles FROM public.profiles WHERE email_verified = true;
    SELECT COUNT(*) INTO verification_codes_count FROM public.email_verification_codes;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total profiles: %', total_profiles;
    RAISE NOTICE 'Verified profiles: %', verified_profiles;
    RAISE NOTICE 'Verification codes: %', verification_codes_count;
    RAISE NOTICE '========================================';
END $$;
