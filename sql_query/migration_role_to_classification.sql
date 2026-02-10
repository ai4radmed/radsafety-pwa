-- Migration: Consolidate role/society_role into classification

-- 1. verification_requests: Rename role to classification
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'verification_requests' 
        AND column_name = 'role'
    ) THEN
        ALTER TABLE public.verification_requests RENAME COLUMN role TO classification;
    END IF;
END $$;

-- 2. profiles: Drop society_role (optional, if you want to clean up)
-- Migrating existing society_role data to classification if needed:
-- UPDATE public.profiles SET classification = society_role WHERE classification IS NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'society_role'
    ) THEN
        ALTER TABLE public.profiles DROP COLUMN society_role;
    END IF;
END $$;

-- 3. Update comments
COMMENT ON COLUMN public.profiles.classification IS '직종/역할 구분 (예: 전문의, 방사선사)';
-- If 'classification' column doesn't exist on verification_requests (was renamed), this works.
-- If it was created, we comment on it.
COMMENT ON COLUMN public.verification_requests.classification IS '직종/역할 구분 (예: 전문의, 방사선사)';
