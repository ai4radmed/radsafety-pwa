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
    
    -- 1. Identity
    nickname text, -- Display Nickname (from Kakao)
    login_email text, -- Renamed from email
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL, -- Joined Date
    is_admin boolean DEFAULT false, -- Admin status
    
    -- 2. Verification Info
    verification_status text DEFAULT 'none'::text, -- 'none', 'list', 'admin'
    verification_date timestamp with time zone,
    
    society text, -- 'nuclear_medicine', 'technology', etc.
    classification text, -- Role ('전공의', '방사선사', etc.)
    society_email text, -- Verified Email
    real_name text, -- Real Name
    affiliation text, -- Institution
    department text, -- Department
    
    -- 3. Safety Management Info
    license_type text, -- Single selection
    is_safety_manager boolean DEFAULT false,
    safety_manager_start_year text,
    safety_manager_end_year text
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.profiles TO postgres;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

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
  INSERT INTO public.profiles (id, login_email, nickname, is_admin, created_at)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', -- Kakao sends nickname in 'full_name' field
    false,
    new.created_at -- Copy auth.users.created_at to created_at
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
COMMENT ON COLUMN public.profiles.verification_status IS '인증 상태 (none, pending, verified, rejected)';

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
    
    -- Authorship (Linked to User)
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    author text,
    -- registrant_email removed
    
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

-- 1. 누구나 조회 가능
CREATE POLICY "Public archives are viewable by everyone" ON public.archives
    FOR SELECT USING (true);

-- 2. 인증된 사용자(관리자 또는 검증된 사용자)만 등록 가능
CREATE POLICY "Authenticated users can insert archives" ON public.archives
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND
        (
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND (
                    is_admin = true OR 
                    verification_status IN ('list', 'admin')
                )
            )
        )
    );

-- 3. 본인(user_id 일치) 또는 관리자만 수정 가능
CREATE POLICY "Users can update own archives" ON public.archives
    FOR UPDATE USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- 4. 본인(user_id 일치) 또는 관리자만 삭제 가능
CREATE POLICY "Users can delete own archives" ON public.archives
    FOR DELETE USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Function to increment view_count (Security Definer to bypass RLS)
CREATE OR REPLACE FUNCTION public.increment_archive_view_count(p_archive_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.archives
    SET view_count = view_count + 1
    WHERE id = p_archive_id;
END;
$$;

COMMENT ON TABLE public.archives IS '자료실 (Resources)';

-- ==============================================================================
-- TABLE 4: verification_requests
-- ==============================================================================

DROP TABLE IF EXISTS public.verification_requests CASCADE;

CREATE TABLE public.verification_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    verification_status text DEFAULT 'pending'::text,
    verification_date timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    society text, -- 'nuclear_medicine', 'technology' key
    classification text, -- '전공의', '방사선사' etc.
    society_email text,
    real_name text,
    affiliation text,
    department text,
    
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
    society_email text PRIMARY KEY,
    society text,
    classification text,
    real_name text,
    affiliation text,
    department text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
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

-- Sync existing users (Development Helper)
-- Since auth.users is not dropped, we need to ensure they have profiles
INSERT INTO public.profiles (id, login_email, nickname, created_at, is_admin)
SELECT 
    au.id, 
    au.email, 
    au.raw_user_meta_data->>'full_name',
    au.created_at,
    false
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = au.id
);

SELECT 'All tables have been successfully recreated and profiles synced!' as status;

-- ==============================================================================
-- SEED DATA (Optional)
-- ==============================================================================
INSERT INTO public.allowed_members (society_email, society, classification, real_name, affiliation, department)
VALUES 
('test_doctor@example.com', 'nuclear_medicine', '전공의', '김철수', '대한대병원', '핵의학과'),
('test_tech@example.com', 'technology', '방사선사', '이영희', '한국병원', '영상의학과')
ON CONFLICT (society_email) DO NOTHING;
