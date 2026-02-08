-- ==============================================================================
-- Migration: Convert role (text) to is_admin (boolean)
-- Date: 2026-02-08
-- Description: Simplifies admin authorization from text-based role field
--              to boolean is_admin field for clarity and performance
-- ==============================================================================

-- IMPORTANT: RUN THIS MIGRATION BEFORE DEPLOYING CODE CHANGES
-- Estimated time: < 1 minute for small databases

BEGIN;

-- Step 1: Add new is_admin column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Step 2: Migrate existing data (role = 'admin' → is_admin = true)
UPDATE public.profiles 
SET is_admin = (role = 'admin')
WHERE role IS NOT NULL;

-- Step 3: Verify migration (optional check)
-- SELECT email, role, is_admin FROM public.profiles WHERE role = 'admin';
-- Expected: All admin users should have is_admin = true

-- Step 4: Drop old RLS policies that use 'role'
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins have full control" ON public.findings;
DROP POLICY IF EXISTS "Admins can insert/update/delete" ON public.archives;
DROP POLICY IF EXISTS "Admins have full control" ON public.verification_requests;
DROP POLICY IF EXISTS "Admins can manage all notifications" ON public.notifications;
DROP POLICY IF EXISTS "Enable all access for admins" ON public.allowed_members;

-- Step 5: Create new RLS policies using 'is_admin'
CREATE POLICY "Admins can read all profiles" ON public.profiles
    FOR SELECT USING (
        (auth.jwt()->>'is_admin')::boolean = true
    );

CREATE POLICY "Admins have full control" ON public.findings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

CREATE POLICY "Admins can insert/update/delete" ON public.archives
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

CREATE POLICY "Admins have full control" ON public.verification_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

CREATE POLICY "Admins can manage all notifications" ON public.notifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

CREATE POLICY "Enable all access for admins" ON public.allowed_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Step 6: Update trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nickname, is_admin, joined_at)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    false,
    new.created_at
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Drop old role column (OPTIONAL - only after verifying everything works)
-- UNCOMMENT AFTER TESTING:
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

COMMIT;

-- ==============================================================================
-- Post-Migration Verification
-- ==============================================================================

-- Check admin users migrated correctly
SELECT 
    email, 
    COALESCE(role, 'N/A') as old_role,
    is_admin as new_is_admin
FROM public.profiles 
WHERE is_admin = true OR role = 'admin'
ORDER BY email;

SELECT '✅ Migration completed successfully!' as status;
