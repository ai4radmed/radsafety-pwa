-- Add missing columns for MyPage reorganization

-- 1. Add 'department' to allowed_members (if not exists)
ALTER TABLE public.allowed_members
ADD COLUMN IF NOT EXISTS department text;

-- 2. Add columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS society_name text, -- Real name from society list
ADD COLUMN IF NOT EXISTS department text, -- Department from society list
ADD COLUMN IF NOT EXISTS is_safety_manager_deputy boolean DEFAULT false, -- Deputy Safety Manager
ADD COLUMN IF NOT EXISTS has_radiation_license boolean DEFAULT false; -- Simple check for license possession
