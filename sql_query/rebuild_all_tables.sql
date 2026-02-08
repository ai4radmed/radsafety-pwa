-- ==============================================================================
-- Master Rebuild Script: Recreate All Database Tables
-- Description: This script recreates all tables in the correct order.
--              Run this single file to apply all schema changes at once.
-- Usage: Execute in Supabase SQL Editor
-- ==============================================================================

-- Step 1: Drop all existing tables (optional, but recommended for clean rebuild)
-- You can comment this out if you prefer to use the CASCADE in individual files
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.allowed_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.findings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.archives DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.verification_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications DISABLE ROW LEVEL SECURITY;

DROP TABLE IF EXISTS public.findings CASCADE;
DROP TABLE IF EXISTS public.archives CASCADE;
DROP TABLE IF EXISTS public.verification_requests CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.auth_requests CASCADE;
DROP TABLE IF EXISTS public.license_types CASCADE;
DROP TABLE IF EXISTS public.allowed_members CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ==============================================================================
-- TABLE 1: profiles (Parent table - must be created first)
-- ==============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS delete_own_account();
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE public.profiles (
    id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    
    -- 1. Identity (Mypage Order)
    login_email text, -- Renamed from email
    nickname text, -- Display Nickname (from Kakao)
    joined_at timestamp with time zone, -- Copied from auth.users.created_at

    -- Data Management Rules
    is_admin boolean DEFAULT false, -- Admin status
    
    -- 2. Verification Info
    society_name text, -- Real Name (Verified by Society)
    society_email text, -- Email used for society/special user verification
    society text, -- 'nuclear_medicine', 'technology', etc.
    
    member_type text DEFAULT 'general'::text, -- 'general', 'society', 'special'
    classification text, -- '의사', '방사선사' 등 (Job Type)
    affiliation text, -- Institution
    department text, -- Department
    verification_status text DEFAULT 'none'::text, -- 'none', 'pending', 'verified', 'rejected'
    verification_request_date timestamp with time zone,
    
    -- 3. Safety Management Info
    license_type text, -- Single selection
    is_safety_manager boolean DEFAULT false,
    safety_manager_start_year text,
    safety_manager_end_year text,
    safety_manager_start_unknown boolean DEFAULT false,
    is_safety_manager_deputy boolean DEFAULT false,
    is_safety_manager_practical boolean DEFAULT false,

    -- System Limits / Metadata
    is_approved boolean DEFAULT false, -- For general access approval
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles" ON public.profiles
    FOR SELECT USING (
        (auth.jwt()->>'is_admin')::boolean = true
    );

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);
    
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, login_email, nickname, is_admin, joined_at)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', -- Kakao sends nickname in 'full_name' field
    false,
    new.created_at -- Copy auth.users.created_at to joined_at
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

CREATE OR REPLACE FUNCTION delete_own_account()
RETURNS void AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.profiles IS '사용자 프로필 통합 테이블';
COMMENT ON COLUMN public.profiles.member_type IS '회원 구분 (general:일반, society:학회원, special:특별회원)';
COMMENT ON COLUMN public.profiles.verification_status IS '인증 상태 (none, pending, verified, rejected)';
COMMENT ON COLUMN public.profiles.joined_at IS '앱 가입일 (auth.users.created_at 복사본)';

-- ==============================================================================
-- TABLE 2: findings
-- ==============================================================================

DROP TABLE IF EXISTS public.findings CASCADE;

CREATE TABLE public.findings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- Author (Preserved on delete)
    
    title text NOT NULL,
    finding_type text NOT NULL, -- '지적', '권고'
    tags text[], -- Array of strings
    year text, -- Classification Year (e.g., '2023')
    description text,
    violation_clause text,
    solution text
);

ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON public.findings
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.findings
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own findings" ON public.findings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own findings" ON public.findings
    FOR DELETE USING (auth.uid() = user_id);
    
CREATE POLICY "Admins have full control" ON public.findings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

COMMENT ON TABLE public.findings IS '지적 및 권고 사례';

-- ==============================================================================
-- TABLE 3: archives
-- ==============================================================================

DROP TABLE IF EXISTS public.archives CASCADE;

CREATE TABLE public.archives (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    
    -- Authorship (Linked to User)
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    author text,
    registrant_email text,
    
    -- Content
    title text NOT NULL,
    category text,
    file_url text,
    file_name text,
    content_html text,
    
    -- Meta
    view_count integer DEFAULT 0
);

ALTER TABLE public.archives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for authenticated users" ON public.archives
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert/update/delete" ON public.archives
    FOR ALL USING (
        (auth.jwt()->>'is_admin')::boolean = true
    );

COMMENT ON TABLE public.archives IS '자료실 (Resources)';

-- ==============================================================================
-- TABLE 4: verification_requests
-- ==============================================================================

DROP TABLE IF EXISTS public.verification_requests CASCADE;

CREATE TABLE public.verification_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    
    status text DEFAULT 'pending'::text,
    type text, -- 'society', 'special'
    full_name text,
    society text, -- 'nuclear_medicine', 'technology' key
    society_name text, -- Real Name (if verified)
    role text, -- '전공의', '방사선사' etc.
    affiliation text,
    department text,
    email text,
    reason text
);

ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own requests" ON public.verification_requests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own requests" ON public.verification_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all requests" ON public.verification_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

COMMENT ON TABLE public.verification_requests IS '인증 요청';

-- ==============================================================================
-- TABLE 5: notifications
-- ==============================================================================

DROP TABLE IF EXISTS public.notifications CASCADE;

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    
    type text NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    link text
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

COMMENT ON TABLE public.notifications IS '사용자 알림';

-- ==============================================================================
-- TABLE 6: allowed_members
-- ==============================================================================

DROP TABLE IF EXISTS public.allowed_members CASCADE;

CREATE TABLE public.allowed_members (
    email text PRIMARY KEY,
    department text,
    classification text,
    society text
);

ALTER TABLE public.allowed_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage allowed members" ON public.allowed_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

COMMENT ON TABLE public.allowed_members IS '허용 회원 명단 (Whitelist)';

-- ==============================================================================
-- COMPLETION MESSAGE
-- ==============================================================================

SELECT 'All tables have been successfully recreated!' as status;
