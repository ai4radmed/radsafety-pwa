-- check_profile_access.sql
-- Run this in Supabase SQL Editor to verify data existence

-- 1. Check if the profile row exists for the user ID (b483...)
--    (Note: This relies on you running it as a dashboard admin/superuser who bypasses RLS in the SQL Editor)
SELECT * 
FROM public.profiles 
WHERE id = 'b483a4e2-1e1e-4edd-836f-a09dc6726697';

-- 2. Check if the Auth User exists
SELECT id, email, created_at, raw_user_meta_data 
FROM auth.users 
WHERE id = 'b483a4e2-1e1e-4edd-836f-a09dc6726697';

-- 3. If Profile is missing, insert it manually (Safety Net)
INSERT INTO public.profiles (id, login_email, nickname, created_at, is_admin)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'nickname', email),
    created_at,
    -- Check if this user is a service_role (rare) or just default false
    false
FROM auth.users
WHERE id = 'b483a4e2-1e1e-4edd-836f-a09dc6726697'
ON CONFLICT (id) DO UPDATE
SET 
    created_at = EXCLUDED.created_at,
    login_email = EXCLUDED.login_email;
