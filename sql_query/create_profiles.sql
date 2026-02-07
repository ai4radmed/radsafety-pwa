-- ==============================================================================
-- Table: public.profiles
-- Description: User profile data, 1:1 linked with auth.users
-- Managed By: Master SQL Definition (sql_query/create_profiles.sql)
-- ==============================================================================

-- 1. Clean up (Drop Table and Trigger)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. Create Table
CREATE TABLE public.profiles (
    id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    
    -- Basic Account Info
    email text, -- Copied from auth.users (ReadOnly)
    society_email text, -- Email used for society/special user verification
    full_name text, -- Real Name (Verified)
    nickname text, -- Display Nickname (from Kakao)
    avatar_url text,
    
    -- System Roles (Authorization)
    role text DEFAULT 'user'::text, -- 'admin', 'user'
    
    -- Membership Status (Business Logic)
    member_type text DEFAULT 'general'::text, -- 'general'(일반), 'society'(학회원), 'special'(특별회원)
    is_approved boolean DEFAULT false, -- For general access approval
    
    -- Verification Status
    verification_status text DEFAULT 'none'::text, -- 'none', 'pending', 'verified', 'rejected'
    verification_request_date timestamp with time zone,
    
    -- Detailed Info (Input by User / Verified)
    society_name text, -- 'nuclear_medicine', 'technology', etc.
    classification text, -- '의사', '방사선사' 등 (Job Type)
    affiliation text, -- Institution
    department text,
    
    -- License Info
    license_type text, -- Single selection
    
    -- Safety Manager Info
    is_safety_manager boolean DEFAULT false,
    safety_manager_start_year text,
    safety_manager_end_year text,
    safety_manager_start_unknown boolean DEFAULT false,
    is_safety_manager_deputy boolean DEFAULT false,
    is_safety_manager_practical boolean DEFAULT false,
    
    -- Timestamps
    joined_at timestamp with time zone, -- Copied from auth.users.created_at (Explicit App Registration Date)
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 3. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Readable by everyone (or just authenticated? typically users can read their own, admins read all)
CREATE POLICY "Users can read own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles" ON public.profiles
    FOR SELECT USING (
        exists ( select 1 from public.profiles where id = auth.uid() and role = 'admin' )
    );

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);
    
-- (Note: Insert is handled by Trigger usually, or user allowed to insert own row)
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 5. Trigger to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nickname, role, joined_at)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', -- Kakao sends nickname in 'full_name' field
    'user',
    new.created_at -- Copy auth.users.created_at to joined_at
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. RPC: Delete Own Account
CREATE OR REPLACE FUNCTION delete_own_account()
RETURNS void AS $$
BEGIN
  -- Validate: Ensure the user is deleting themselves (Implicit in auth.uid())
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Comments
COMMENT ON TABLE public.profiles IS '사용자 프로필 통합 테이블';
COMMENT ON COLUMN public.profiles.member_type IS '회원 구분 (general:일반, society:학회원, special:특별회원)';
COMMENT ON COLUMN public.profiles.verification_status IS '인증 상태 (none, pending, verified, rejected)';
COMMENT ON COLUMN public.profiles.joined_at IS '앱 가입일 (auth.users.created_at 복사본)';
