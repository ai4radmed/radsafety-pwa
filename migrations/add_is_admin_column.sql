-- Migration: Add is_admin column to profiles table
-- Date: 2026-02-04
-- Purpose: Separate admin rights from user_tier to allow admins to also be society members

-- 1. Add is_admin column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 2. Migrate existing admin users (if any had user_tier='admin')
UPDATE profiles
SET is_admin = true
WHERE user_tier = 'admin';

-- 3. (Optional) Reset user_tier for admins to 'general'
-- Uncomment if you want to clean up old 'admin' values in user_tier
-- UPDATE profiles
-- SET user_tier = 'general'
-- WHERE user_tier = 'admin';

-- 4. Set is_admin=true for known admin emails
UPDATE profiles
SET is_admin = true
WHERE email IN (
    'kimbi@kirams.re.kr',
    'dev@example.com',
    'admin@radsafety.com',
    'ben@example.com'
);

-- Verify the changes
SELECT email, is_admin, user_tier, society
FROM profiles
WHERE is_admin = true OR user_tier = 'admin';
