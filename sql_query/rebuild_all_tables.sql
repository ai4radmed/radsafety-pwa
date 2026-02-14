-- ==============================================================================
-- Master Database Schema: Safe Migration Script (데이터 보존)
-- Description: 기존 데이터를 유지하면서 스키마 변경 적용
-- Version: 2.1 (인증 상태 세분화)
-- Usage: Supabase SQL Editor에서 실행
--
-- 변경 이력:
-- - 2026-02-14: 인증 상태 세분화 (temp_verified 추가, admin → verified 마이그레이션)
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
-- 3. 인증 상태 세분화 마이그레이션
-- ============================================================
-- 목적:
--   - 기존 'admin' 상태를 'verified'로 변경
--   - 향후 'temp_verified' 상태로 임시 인증 관리
--
-- 인증 상태 정의:
--   - 'none': 미인증 (기본값)
--   - 'list': 회원명부 인증 (즉시 인증, 모든 권한)
--   - 'temp_verified': 임시 인증 (이메일 검증 완료, 관리자 승인 대기, 권한 부여)
--   - 'verified': 관리자 승인 완료 (최종 인증, 모든 권한)
-- ============================================================

DO $$
DECLARE
    admin_count int;
BEGIN
    -- 기존 'admin' 상태를 'verified'로 변경
    UPDATE public.profiles
    SET verification_status = 'verified'
    WHERE verification_status = 'admin';

    GET DIAGNOSTICS admin_count = ROW_COUNT;

    IF admin_count > 0 THEN
        RAISE NOTICE '✓ Migrated % profiles from admin to verified status', admin_count;
    ELSE
        RAISE NOTICE '✓ No admin status profiles found (already migrated or none exist)';
    END IF;
END $$;

-- ============================================================
-- 4. Update existing data (optional)
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
-- 5. Comments for documentation
-- ============================================================

COMMENT ON TABLE public.email_verification_codes IS 'Stores email verification codes (OTP) for society_email validation';
COMMENT ON COLUMN public.email_verification_codes.code IS '6-digit verification code sent to email';
COMMENT ON COLUMN public.email_verification_codes.expires_at IS 'Code expires 10 minutes after creation';

COMMENT ON COLUMN public.profiles.email_verified IS 'Whether society_email has been verified';
COMMENT ON COLUMN public.profiles.verification_method IS 'How society_email was verified: login_email, otp, or list';

-- ============================================================
-- 6. Verification Summary
-- ============================================================

DO $$
DECLARE
    total_profiles int;
    email_verified_count int;
    verification_codes_count int;
    status_none int;
    status_list int;
    status_temp int;
    status_verified int;
BEGIN
    SELECT COUNT(*) INTO total_profiles FROM public.profiles;
    SELECT COUNT(*) INTO email_verified_count FROM public.profiles WHERE email_verified = true;
    SELECT COUNT(*) INTO verification_codes_count FROM public.email_verification_codes;

    -- Count by verification_status
    SELECT COUNT(*) INTO status_none FROM public.profiles WHERE verification_status = 'none';
    SELECT COUNT(*) INTO status_list FROM public.profiles WHERE verification_status = 'list';
    SELECT COUNT(*) INTO status_temp FROM public.profiles WHERE verification_status = 'temp_verified';
    SELECT COUNT(*) INTO status_verified FROM public.profiles WHERE verification_status = 'verified';

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total profiles: %', total_profiles;
    RAISE NOTICE 'Email verified: %', email_verified_count;
    RAISE NOTICE 'Verification codes: %', verification_codes_count;
    RAISE NOTICE '----------------------------------------';
    RAISE NOTICE 'Verification Status Breakdown:';
    RAISE NOTICE '  - none: %', status_none;
    RAISE NOTICE '  - list: %', status_list;
    RAISE NOTICE '  - temp_verified: %', status_temp;
    RAISE NOTICE '  - verified: %', status_verified;
    RAISE NOTICE '========================================';
END $$;

-- ============================================================
-- 7. Add verification_requests history tracking columns
-- ============================================================

DO $$
BEGIN
    -- Add reject_reason column
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'verification_requests'
        AND column_name = 'reject_reason'
    ) THEN
        ALTER TABLE public.verification_requests
        ADD COLUMN reject_reason text;

        RAISE NOTICE 'Added reject_reason column to verification_requests';
    ELSE
        RAISE NOTICE 'reject_reason column already exists';
    END IF;

    -- Add approved_at column
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'verification_requests'
        AND column_name = 'approved_at'
    ) THEN
        ALTER TABLE public.verification_requests
        ADD COLUMN approved_at timestamp with time zone;

        RAISE NOTICE 'Added approved_at column to verification_requests';
    ELSE
        RAISE NOTICE 'approved_at column already exists';
    END IF;

    -- Add rejected_at column
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'verification_requests'
        AND column_name = 'rejected_at'
    ) THEN
        ALTER TABLE public.verification_requests
        ADD COLUMN rejected_at timestamp with time zone;

        RAISE NOTICE 'Added rejected_at column to verification_requests';
    ELSE
        RAISE NOTICE 'rejected_at column already exists';
    END IF;
END $$;

COMMENT ON COLUMN public.verification_requests.reject_reason IS '인증 취소 사유 (관리자가 입력)';
COMMENT ON COLUMN public.verification_requests.approved_at IS '인증 승인 일시';
COMMENT ON COLUMN public.verification_requests.rejected_at IS '인증 취소 일시';

-- ============================================================
-- 8. Add title column to notifications table
-- ============================================================

DO $$
BEGIN
    -- Add title column for notification headers
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'notifications'
        AND column_name = 'title'
    ) THEN
        ALTER TABLE public.notifications
        ADD COLUMN title text;

        RAISE NOTICE 'Added title column to notifications';
    ELSE
        RAISE NOTICE 'title column already exists';
    END IF;
END $$;

COMMENT ON COLUMN public.notifications.title IS '알림 제목 (짧은 요약)';

-- ============================================================
-- 9. Extend notifications table with additional fields
-- ============================================================

DO $$
BEGIN
    -- Add sender_id column
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'notifications'
        AND column_name = 'sender_id'
    ) THEN
        ALTER TABLE public.notifications
        ADD COLUMN sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

        RAISE NOTICE 'Added sender_id column to notifications';
    ELSE
        RAISE NOTICE 'sender_id column already exists';
    END IF;

    -- Add type column
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'notifications'
        AND column_name = 'type'
    ) THEN
        ALTER TABLE public.notifications
        ADD COLUMN type varchar(50) DEFAULT 'admin_message';

        RAISE NOTICE 'Added type column to notifications';
    ELSE
        RAISE NOTICE 'type column already exists';
    END IF;

    -- Add priority column
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'notifications'
        AND column_name = 'priority'
    ) THEN
        ALTER TABLE public.notifications
        ADD COLUMN priority varchar(20) DEFAULT 'normal';

        RAISE NOTICE 'Added priority column to notifications';
    ELSE
        RAISE NOTICE 'priority column already exists';
    END IF;

    -- Add action_label column
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'notifications'
        AND column_name = 'action_label'
    ) THEN
        ALTER TABLE public.notifications
        ADD COLUMN action_label text;

        RAISE NOTICE 'Added action_label column to notifications';
    ELSE
        RAISE NOTICE 'action_label column already exists';
    END IF;

    -- Add action_url column
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'notifications'
        AND column_name = 'action_url'
    ) THEN
        ALTER TABLE public.notifications
        ADD COLUMN action_url text;

        RAISE NOTICE 'Added action_url column to notifications';
    ELSE
        RAISE NOTICE 'action_url column already exists';
    END IF;

    -- Add read_at column
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'notifications'
        AND column_name = 'read_at'
    ) THEN
        ALTER TABLE public.notifications
        ADD COLUMN read_at timestamp with time zone;

        RAISE NOTICE 'Added read_at column to notifications';
    ELSE
        RAISE NOTICE 'read_at column already exists';
    END IF;

    -- Add expires_at column
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'notifications'
        AND column_name = 'expires_at'
    ) THEN
        ALTER TABLE public.notifications
        ADD COLUMN expires_at timestamp with time zone;

        RAISE NOTICE 'Added expires_at column to notifications';
    ELSE
        RAISE NOTICE 'expires_at column already exists';
    END IF;

    -- Add metadata column
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'notifications'
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE public.notifications
        ADD COLUMN metadata jsonb;

        RAISE NOTICE 'Added metadata column to notifications';
    ELSE
        RAISE NOTICE 'metadata column already exists';
    END IF;

    RAISE NOTICE '✓ Notifications table columns added successfully';
END $$;

-- Add indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON public.notifications(user_id, is_read)
    WHERE is_read = FALSE;

CREATE INDEX IF NOT EXISTS idx_notifications_type
    ON public.notifications(type);

CREATE INDEX IF NOT EXISTS idx_notifications_priority
    ON public.notifications(priority)
    WHERE priority IN ('high', 'urgent');

CREATE INDEX IF NOT EXISTS idx_notifications_created
    ON public.notifications(user_id, created_at DESC);

-- Add comments
COMMENT ON COLUMN public.notifications.sender_id IS '발신자 ID (관리자 등, NULL이면 시스템 알림)';
COMMENT ON COLUMN public.notifications.type IS '알림 타입 (verification_approved, admin_message 등)';
COMMENT ON COLUMN public.notifications.priority IS '우선순위 (low, normal, high, urgent)';
COMMENT ON COLUMN public.notifications.action_label IS '액션 버튼 라벨';
COMMENT ON COLUMN public.notifications.action_url IS '액션 버튼 클릭 시 이동할 URL';
COMMENT ON COLUMN public.notifications.read_at IS '읽은 일시';
COMMENT ON COLUMN public.notifications.expires_at IS '만료 일시 (자동 삭제 시점)';
COMMENT ON COLUMN public.notifications.metadata IS '추가 메타데이터 (JSON)';

-- ============================================================
-- 6. Feedback Table (의견보내기)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name text NOT NULL,
    user_email text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    attachments jsonb DEFAULT '[]'::jsonb,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'resolved')),
    admin_note text,
    created_at timestamptz DEFAULT now(),
    resolved_at timestamptz,
    resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- RLS for feedback
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback"
    ON public.feedback
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
    ON public.feedback
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
    ON public.feedback
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Admins can update all feedback
CREATE POLICY "Admins can update all feedback"
    ON public.feedback
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Admins can delete all feedback
CREATE POLICY "Admins can delete all feedback"
    ON public.feedback
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Indexes for feedback
CREATE INDEX IF NOT EXISTS idx_feedback_user_id
    ON public.feedback(user_id);

CREATE INDEX IF NOT EXISTS idx_feedback_status
    ON public.feedback(status);

CREATE INDEX IF NOT EXISTS idx_feedback_created
    ON public.feedback(created_at DESC);

-- Comments
COMMENT ON TABLE public.feedback IS '사용자 의견/문의 저장';
COMMENT ON COLUMN public.feedback.user_id IS '작성자 ID (NULL 가능 - 탈퇴한 사용자)';
COMMENT ON COLUMN public.feedback.attachments IS '첨부파일 정보 배열 [{filename, url, size}]';
COMMENT ON COLUMN public.feedback.status IS '처리 상태 (pending: 미처리, processing: 처리중, resolved: 완료)';
COMMENT ON COLUMN public.feedback.admin_note IS '관리자 메모';
COMMENT ON COLUMN public.feedback.resolved_by IS '처리한 관리자 ID';

-- ============================================================
-- 7. Storage Bucket for Feedback Attachments
-- ============================================================

-- Create feedback-attachments bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback-attachments', 'feedback-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for feedback-attachments
CREATE POLICY "Users can upload their own feedback attachments"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'feedback-attachments' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their own feedback attachments"
    ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'feedback-attachments' AND
        (
            auth.uid()::text = (storage.foldername(name))[1] OR
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND is_admin = true
            )
        )
    );

CREATE POLICY "Admins can delete feedback attachments"
    ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'feedback-attachments' AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );
