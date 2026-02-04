-- Comprehensive Schema Fix
-- Goal: Ensure all columns required for MyPage & Verification exist in 'profiles' and 'allowed_members'.

-- 1. Ensure columns in 'profiles' table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS society_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS society_role text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_safety_manager_deputy boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_radiation_license boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_safety_practice_staff boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_tier text DEFAULT 'general';

-- 2. Ensure columns in 'allowed_members' table (Verified Member List)
ALTER TABLE public.allowed_members ADD COLUMN IF NOT EXISTS department text;
ALTER TABLE public.allowed_members ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE public.allowed_members ADD COLUMN IF NOT EXISTS society text;

-- 3. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload config';

-- 4. Verify/Re-apply Kim's Mock Data (Just in case)
UPDATE public.allowed_members
SET 
    department = '핵의학과', 
    role = '전문의',
    society = 'nuclear_medicine'
WHERE email = 'kimbi.kirams@gmail.com';
