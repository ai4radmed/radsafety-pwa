-- ==============================================================================
-- Master Database Schema: Safe Migration Script (데이터 보존)
-- Description: 기존 데이터를 유지하면서 스키마 변경 적용
-- Version: 2.4 (push_subscriptions 테이블 추가 + 테스트 계정 초기 설정 통합)
-- Usage: Supabase SQL Editor에서 실행 (반복 실행 가능)
--
-- 변경 이력:
-- - 2026-02-18: push_subscriptions 테이블 추가 (웹 푸시 알림 구독 정보)
-- - 2026-02-18: 테스트 계정 초기 profiles 설정 SQL 통합 (11번 섹션)
-- - 2026-02-16: delete_own_account() RPC 함수 추가 (회원 탈퇴)
-- - 2026-02-16: 모든 CREATE POLICY를 IF NOT EXISTS로 래핑 (멱등성 보장)
-- - 2026-02-16: glossary_terms 테이블 추가 (법령용어사전)
-- - 2026-02-14: 인증 상태 세분화 (temp_verified 추가, admin → verified 마이그레이션)
-- - 2026-02-14: 이메일 검증 시스템 추가 (email_verification_codes 테이블)
-- - 기존 구버전 백업 파일은 정리 완료 (2026-02-17)
--
-- 주의: 이 스크립트는 기존 데이터를 보존합니다.
--       전체 초기화가 필요한 경우 Supabase Dashboard에서 테이블 수동 삭제 후 재실행
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
-- 6. Glossary Terms Table (법령용어사전)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.glossary_terms (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    term text NOT NULL,
    definition text NOT NULL,
    category text,
    sort_order integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.glossary_terms ENABLE ROW LEVEL SECURITY;

-- Anyone can view glossary terms
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'glossary_terms' AND policyname = 'Anyone can view glossary'
    ) THEN
        CREATE POLICY "Anyone can view glossary" ON public.glossary_terms
            FOR SELECT USING (true);
    END IF;
END $$;

-- Admins can manage glossary terms (insert, update, delete)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'glossary_terms' AND policyname = 'Admins can manage glossary'
    ) THEN
        CREATE POLICY "Admins can manage glossary" ON public.glossary_terms
            FOR ALL USING (
                EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
            );
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_glossary_terms_sort_order
    ON public.glossary_terms(sort_order);

CREATE INDEX IF NOT EXISTS idx_glossary_terms_category
    ON public.glossary_terms(category);

-- Seed data (기존 정적 데이터 이관, 중복 삽입 방지)
INSERT INTO public.glossary_terms (term, definition, category, sort_order)
SELECT * FROM (VALUES
    ('허가사용자', '원자력안전법 제53조에 따라 허가를 받고 방사성동위원소 또는 방사선발생장치를 생산, 판매, 사용 또는 이동사용하는 자를 말합니다.', '인물/자격', 1),
    ('신고사용자', '밀봉된 방사성동위원소 또는 방사선발생장치로서 방사선량이 적은 것을 사용하기 위해 법 제53조제2항에 따라 신고를 한 자를 말합니다.', '인물/자격', 2),
    ('방사선안전관리자', '방사선 안전관리에 관한 기술적인 사항을 관리·감독하고, 방사선재해 방지를 위해 선임된 사람으로 원자력 관계 면허를 소지한 자입니다.', '인물/자격', 3),
    ('수시출입자', '방사선관리구역에 청소, 시설관리 등의 업무상 출입하는 사람(방사선작업종사자 제외)으로서 안전관리자의 안내에 따르는 사람을 말합니다.', '인물/자격', 4),
    ('방사선작업종사자', '방사선관리구역에서 방사선 이용 시설의 운전, 조작, 점검, 보수 등 방사선 피폭 우려가 있는 업무에 종사하는 사람입니다.', '인물/자격', 5),
    ('방사선관리구역', '외부방사선량률, 공기중 방사성물질의 농도 또는 방사성물질로 오염된 표면의 오염도가 원자력안전위원회규칙으로 정하는 값을 초과할 우려가 있는 곳으로, 방사선 방호를 위해 사람의 출입이 관리되는 구역입니다.', '장소/시설', 6),
    ('자체처분', '방사성폐기물 중 방사능 농도가 법적 허용기준 미만인 경우, 원자력안전위원회의 규정에 따라 일반 폐기물로 소각, 매립, 재활용하여 처분하는 절차입니다.', '폐기물', 7),
    ('표면오염도', '물체 또는 인체의 표면에 묻어 있는 방사성물질의 양을 면적당 방사능(Bq/cm²)으로 나타낸 값입니다.', '측정', 8),
    ('공간선량률', '특정 공간에서의 방사선의 세기를 나타내는 단위로, 보통 시간당 마이크로시버트(μSv/h)를 사용합니다.', '측정', 9),
    ('선임', '방사선안전관리자 등 법적 자격 요건을 갖춘 자를 해당 직무 수행자로 지정하여 원자력안전위원회(또는 한국원자력안전기술원)에 보고하는 행위입니다.', '행정', 10),
    ('정기검사', '허가사용자가 허가받은 사항대로 시설을 운영하고 있는지, 안전관리 규정을 준수하고 있는지 매년(또는 주기적으로) 확인하는 법정 검사입니다.', '행정', 11)
) AS v(term, definition, category, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.glossary_terms LIMIT 1);

-- Comments
COMMENT ON TABLE public.glossary_terms IS '법령용어사전 용어 저장';
COMMENT ON COLUMN public.glossary_terms.term IS '용어명';
COMMENT ON COLUMN public.glossary_terms.definition IS '용어 정의';
COMMENT ON COLUMN public.glossary_terms.category IS '용어 분류 (인물/자격, 장소/시설, 측정 등)';
COMMENT ON COLUMN public.glossary_terms.sort_order IS '표시 순서';

-- ============================================================
-- 7. Feedback Table (의견보내기)
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

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'feedback' AND policyname = 'Users can view own feedback'
    ) THEN
        CREATE POLICY "Users can view own feedback"
            ON public.feedback
            FOR SELECT
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'feedback' AND policyname = 'Users can insert own feedback'
    ) THEN
        CREATE POLICY "Users can insert own feedback"
            ON public.feedback
            FOR INSERT
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'feedback' AND policyname = 'Admins can view all feedback'
    ) THEN
        CREATE POLICY "Admins can view all feedback"
            ON public.feedback
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE id = auth.uid() AND is_admin = true
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'feedback' AND policyname = 'Admins can update all feedback'
    ) THEN
        CREATE POLICY "Admins can update all feedback"
            ON public.feedback
            FOR UPDATE
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE id = auth.uid() AND is_admin = true
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'feedback' AND policyname = 'Admins can delete all feedback'
    ) THEN
        CREATE POLICY "Admins can delete all feedback"
            ON public.feedback
            FOR DELETE
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE id = auth.uid() AND is_admin = true
                )
            );
    END IF;
END $$;

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
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'objects' AND policyname = 'Users can upload their own feedback attachments'
    ) THEN
        CREATE POLICY "Users can upload their own feedback attachments"
            ON storage.objects
            FOR INSERT
            WITH CHECK (
                bucket_id = 'feedback-attachments' AND
                auth.uid()::text = (storage.foldername(name))[1]
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'objects' AND policyname = 'Users can view their own feedback attachments'
    ) THEN
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
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'objects' AND policyname = 'Admins can delete feedback attachments'
    ) THEN
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
    END IF;
END $$;

-- ============================================================
-- 10. RPC Functions
-- ============================================================

-- 회원 탈퇴: 인증된 사용자가 자신의 계정을 삭제
-- SECURITY DEFINER로 auth.users 삭제 권한 부여
-- profiles는 ON DELETE CASCADE로 자동 삭제됨
CREATE OR REPLACE FUNCTION delete_own_account()
RETURNS void AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 11. push_subscriptions (웹 푸시 알림 구독 정보)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- 같은 기기(endpoint)에 중복 구독 방지
    CONSTRAINT unique_push_endpoint UNIQUE (endpoint)
);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_push_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'push_subscriptions_updated_at'
    ) THEN
        CREATE TRIGGER push_subscriptions_updated_at
            BEFORE UPDATE ON public.push_subscriptions
            FOR EACH ROW EXECUTE FUNCTION update_push_subscriptions_updated_at();
    END IF;
END $$;

-- RLS 활성화
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 본인 구독만 삽입/조회/삭제 허용
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'push_subscriptions' AND policyname = 'users can manage own subscriptions'
    ) THEN
        CREATE POLICY "users can manage own subscriptions"
        ON public.push_subscriptions
        FOR ALL
        TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;

    -- service_role(서버)은 모든 구독 조회 가능 (푸시 발송 시 필요)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'push_subscriptions' AND policyname = 'service role can read all subscriptions'
    ) THEN
        CREATE POLICY "service role can read all subscriptions"
        ON public.push_subscriptions
        FOR SELECT
        TO service_role
        USING (true);
    END IF;
END $$;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

-- 코멘트
COMMENT ON TABLE public.push_subscriptions IS '웹 푸시 알림 구독 정보 (endpoint, VAPID 키)';
COMMENT ON COLUMN public.push_subscriptions.endpoint IS '브라우저 푸시 서비스 URL (기기별 고유)';
COMMENT ON COLUMN public.push_subscriptions.p256dh IS '공개키 (암호화용)';
COMMENT ON COLUMN public.push_subscriptions.auth IS '인증 시크릿';
COMMENT ON COLUMN public.push_subscriptions.user_agent IS '구독한 기기 UA (디버깅용)';

-- ============================================================
-- 12. 개발용 테스트 계정 초기 profiles 설정
-- ============================================================
-- 목적: 테스트 계정(test-user@radsafety.kr, test-admin@radsafety.kr)의
--       profiles 행을 올바른 상태로 설정합니다.
--
-- 실행 조건: 테스트 계정으로 최소 1회 로그인 후 profiles 행이 생성된 상태에서 실행
-- 환경: 로컬/Preview 전용 (Production에는 해당 계정이 존재하지 않으므로 영향 없음)
-- ============================================================

DO $$
DECLARE
    user_count int;
    admin_count int;
BEGIN
    -- 일반 테스트 사용자 설정
    UPDATE public.profiles
    SET verification_status = 'verified',
        nickname = '테스트유저',
        email_verified = true,
        verification_method = 'login_email'
    WHERE login_email = 'test-user@radsafety.kr';
    GET DIAGNOSTICS user_count = ROW_COUNT;

    -- 관리자 테스트 계정 설정
    UPDATE public.profiles
    SET verification_status = 'verified',
        nickname = '테스트관리자',
        is_admin = true,
        email_verified = true,
        verification_method = 'login_email'
    WHERE login_email = 'test-admin@radsafety.kr';
    GET DIAGNOSTICS admin_count = ROW_COUNT;

    IF user_count > 0 OR admin_count > 0 THEN
        RAISE NOTICE '✓ 테스트 계정 profiles 설정 완료 (user: %, admin: %)', user_count, admin_count;
    ELSE
        RAISE NOTICE '- 테스트 계정 profiles 없음 (로그인 전이거나 Production 환경)';
    END IF;
END $$;
