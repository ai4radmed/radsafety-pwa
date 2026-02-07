-- ==============================================================================
-- Table: public.findings
-- Description: Safety check findings and recommendations (지적/권고 사항)
-- Managed By: Master SQL Definition (sql_query/create_findings.sql)
-- ==============================================================================

-- 1. Drop Table
DROP TABLE IF EXISTS public.findings CASCADE;

-- 2. Create Table
CREATE TABLE public.findings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, -- Author
    
    title text NOT NULL,
    finding_type text NOT NULL, -- '지적', '권고'
    tags text[], -- Array of strings
    year text, -- Classification Year (e.g., '2023')
    description text,
    violation_clause text,
    solution text
);

-- 3. Enable RLS
ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Everyone can read? Or only authenticated? Assuming authenticated for now.
CREATE POLICY "Enable read access for authenticated users" ON public.findings
    FOR SELECT TO authenticated USING (true);

-- Only Admins or Owners can insert/update/delete?
-- For now, allowing authenticated users to insert (e.g.safety managers)
CREATE POLICY "Enable insert for authenticated users" ON public.findings
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Users can update their own findings
CREATE POLICY "Users can update own findings" ON public.findings
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own findings
CREATE POLICY "Users can delete own findings" ON public.findings
    FOR DELETE USING (auth.uid() = user_id);
    
-- Admins can do anything
CREATE POLICY "Admins have full control" ON public.findings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- 5. Comments
COMMENT ON TABLE public.findings IS '지적 및 권고 사항 관리 테이블';
