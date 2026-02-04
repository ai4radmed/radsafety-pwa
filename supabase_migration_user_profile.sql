-- =====================================================
-- RadSafety User Profile & Manual Verification System
-- =====================================================

-- 1. Extend profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS user_tier text DEFAULT 'general',
-- 'admin' | 'society' | 'special' | 'general'

ADD COLUMN IF NOT EXISTS joined_at timestamp with time zone DEFAULT now(),

-- License information (JSON array)
ADD COLUMN IF NOT EXISTS licenses jsonb DEFAULT '[]'::jsonb,
-- Example: [{"type": "nuclear_medicine_specialist", "number": "12345", "issued_date": "2020-01-01"}]

-- Radiation Safety Manager information
ADD COLUMN IF NOT EXISTS is_safety_manager boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS safety_manager_start_date date,
ADD COLUMN IF NOT EXISTS safety_manager_end_date date;

-- 2. Create license_types reference table
CREATE TABLE IF NOT EXISTS public.license_types (
    id text PRIMARY KEY,
    name_ko text NOT NULL,
    name_en text,
    category text -- 'medical' | 'technical' | 'safety'
);

-- Insert common license types
INSERT INTO public.license_types (id, name_ko, category) VALUES
('nuclear_medicine_specialist', '핵의학 전문의', 'medical'),
('radiology_specialist', '영상의학 전문의', 'medical'),
('radiation_oncology_specialist', '방사선종양학 전문의', 'medical'),
('radiation_technologist', '방사선사', 'technical'),
('nuclear_medicine_technologist', '핵의학기사', 'technical'),
('radiation_safety_manager', '방사선안전관리자', 'safety'),
('radiation_safety_supervisor', '방사선관계종사자', 'safety')
ON CONFLICT (id) DO NOTHING;

-- 3. Create verification_requests table
CREATE TABLE IF NOT EXISTS public.verification_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Request type
    request_type text NOT NULL, -- 'society' | 'special'
    
    -- For society member requests
    society text, -- 'nuclear_medicine' | 'technology'
    society_email text,
    
    -- Common information
    full_name text NOT NULL,
    affiliation text NOT NULL,
    contact_email text NOT NULL,
    reason text NOT NULL,
    
    -- License information (submitted with request)
    licenses jsonb DEFAULT '[]'::jsonb,
    
    -- Radiation Safety Manager information
    is_safety_manager boolean DEFAULT false,
    safety_manager_start_date date,
    safety_manager_end_date date,
    
    -- Approval workflow
    status text DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
    admin_note text,
    created_at timestamp with time zone DEFAULT now(),
    reviewed_at timestamp with time zone,
    reviewed_by uuid REFERENCES auth.users(id),
    
    -- Ensure only one pending request per user
    UNIQUE(user_id, status)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON public.verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_verification_requests_user_id ON public.verification_requests(user_id);

-- 4. Enable RLS on verification_requests
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own requests" ON public.verification_requests;
DROP POLICY IF EXISTS "Users can create own requests" ON public.verification_requests;
DROP POLICY IF EXISTS "Admins can view all requests" ON public.verification_requests;
DROP POLICY IF EXISTS "Admins can update requests" ON public.verification_requests;

-- Users can view their own requests
CREATE POLICY "Users can view own requests"
ON public.verification_requests FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own requests
CREATE POLICY "Users can create own requests"
ON public.verification_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all requests"
ON public.verification_requests FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND user_tier = 'admin'
    )
);

-- Admins can update requests (approve/reject)
CREATE POLICY "Admins can update requests"
ON public.verification_requests FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND user_tier = 'admin'
    )
);

-- 5. Update existing users to set user_tier based on current verification status
-- (This is a one-time migration, safe to run multiple times)
UPDATE public.profiles
SET user_tier = CASE
    WHEN role = 'admin' THEN 'admin'
    WHEN is_verified = true AND society IS NOT NULL THEN 'society'
    ELSE 'general'
END
WHERE user_tier = 'general';

-- 6. Create helper function for approval workflow
CREATE OR REPLACE FUNCTION approve_verification_request(
    request_id uuid,
    admin_user_id uuid,
    note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    req verification_requests;
BEGIN
    -- Check if admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles WHERE id = admin_user_id AND user_tier = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only admins can approve requests';
    END IF;
    
    -- Get request
    SELECT * INTO req FROM verification_requests WHERE id = request_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found';
    END IF;
    
    -- Update verification_requests
    UPDATE verification_requests
    SET 
        status = 'approved',
        reviewed_at = now(),
        reviewed_by = admin_user_id,
        admin_note = note
    WHERE id = request_id;
    
    -- Update user profile
    UPDATE profiles
    SET
        user_tier = CASE 
            WHEN req.request_type = 'society' THEN 'society'
            WHEN req.request_type = 'special' THEN 'special'
            ELSE user_tier
        END,
        society = COALESCE(req.society, society),
        affiliation = req.affiliation,
        full_name = req.full_name,
        licenses = req.licenses,
        is_safety_manager = req.is_safety_manager,
        safety_manager_start_date = req.safety_manager_start_date,
        safety_manager_end_date = req.safety_manager_end_date,
        is_verified = true,
        verified_at = now(),
        society_email = COALESCE(req.society_email, society_email)
    WHERE id = req.user_id;
END;
$$;

-- 7. Create helper function for rejection workflow
CREATE OR REPLACE FUNCTION reject_verification_request(
    request_id uuid,
    admin_user_id uuid,
    note text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles WHERE id = admin_user_id AND user_tier = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only admins can reject requests';
    END IF;
    
    -- Update verification_requests
    UPDATE verification_requests
    SET 
        status = 'rejected',
        reviewed_at = now(),
        reviewed_by = admin_user_id,
        admin_note = note
    WHERE id = request_id;
END;
$$;
