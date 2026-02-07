-- ==============================================================================
-- DANGER ZONE: Reset Public Schema
-- Description: Drops ALL tables in the public schema to start fresh.
--              Use this when you want to rebuild the entire database structure.
-- usage: Run this in Supabase SQL Editor.
-- ==============================================================================

-- 1. Disable RLS temporarily (to avoid permission issues during drop)
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.allowed_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.findings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.archives DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.verification_requests DISABLE ROW LEVEL SECURITY;

-- 2. Drop Tables (Order matters: Child -> Parent)
-- 'profiles' is usually the parent of many tables, so we drop children first.
DROP TABLE IF EXISTS public.findings CASCADE;
DROP TABLE IF EXISTS public.archives CASCADE;
DROP TABLE IF EXISTS public.verification_requests CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.auth_requests CASCADE;
DROP TABLE IF EXISTS public.license_types CASCADE;
DROP TABLE IF EXISTS public.allowed_members CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 3. Confirmation
SELECT 'All tables in public schema have been dropped.' as status;
