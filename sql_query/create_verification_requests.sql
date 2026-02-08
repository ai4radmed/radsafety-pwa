-- ==============================================================================
-- Table: public.verification_requests
-- Description: User verification/upgrade requests (인증 요청)
-- Managed By: Master SQL Definition (sql_query/create_verification_requests.sql)
-- ==============================================================================

-- 1. Drop Table
DROP TABLE IF EXISTS public.verification_requests CASCADE;

-- 2. Create Table
CREATE TABLE public.verification_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    email text, -- For reference
    full_name text,
    
    request_type text, -- 'society', 'special'
    status text DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    
    admin_comment text -- Reason for rejection etc.
);

-- 3. Enable RLS
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Users can see their own requests
CREATE POLICY "Users can read own requests" ON public.verification_requests
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert requests (limit to 1 pending? currently relying on app logic)
CREATE POLICY "Users can create requests" ON public.verification_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can see/manage all
CREATE POLICY "Admins have full control" ON public.verification_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- 5. Comments
COMMENT ON TABLE public.verification_requests IS '회원 인증 및 등급 상향 요청 관리';
