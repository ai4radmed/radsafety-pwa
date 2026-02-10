-- fix_rls.sql
-- Force Reset RLS Policies for Profiles Table
-- Run this in Supabase SQL Editor

-- 1. Ensure Table Permissions
GRANT ALL ON public.profiles TO postgres;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- 2. Reset RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop verify existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;

-- 3. Re-create Simple Policies
-- Read: User matches ID
CREATE POLICY "Users can read own profile" ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Update: User matches ID
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id);

-- Insert: User matches ID
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Admin Read (Optional but good for fallback)
CREATE POLICY "Admins can read all profiles" ON public.profiles
    FOR SELECT
    USING ( (auth.jwt()->>'is_admin')::boolean = true );

-- 4. Verification Query (Mock Test)
-- This won't show real results unless you assume a user identity, 
-- but ensuring no syntax error is the first step.
SELECT count(*) as policies_active FROM pg_policies WHERE tablename = 'profiles';
