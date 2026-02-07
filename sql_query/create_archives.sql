-- ==============================================================================
-- Table: public.archives (Refined)
-- Description: Resources and Documents (자료실)
-- Managed By: Master SQL Definition (sql_query/create_archives.sql)
-- ==============================================================================

-- 1. Drop Table
DROP TABLE IF EXISTS public.archives CASCADE;

-- 2. Create Table
CREATE TABLE public.archives (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    
    -- Authorship (Linked to User)
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- If user deleted, keep archive but nullify link
    author text, -- Display name (Snapshotted at creation, or manually entered)
    registrant_email text, -- Contact email (Snapshotted)
    
    -- Content
    title text NOT NULL,
    category text, -- '작성지침', '가이드북' 등
    file_url text, -- Storage path or full URL
    file_name text, -- Original filename
    content_html text, -- Description or body content
    
    -- Meta
    view_count integer DEFAULT 0
);

-- 3. Enable RLS
ALTER TABLE public.archives ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Read: Authenticated users
CREATE POLICY "Enable read for authenticated users" ON public.archives
    FOR SELECT TO authenticated USING (true);

-- Write: Admins Only
CREATE POLICY "Admins can insert/update/delete" ON public.archives
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- 5. Comments
COMMENT ON TABLE public.archives IS '자료실 (게시판/파일저장소)';
COMMENT ON COLUMN public.archives.user_id IS '등록자 ID (auth.users 연결)';
COMMENT ON COLUMN public.archives.author IS '등록자 표시 이름 (화면 표시용)';
