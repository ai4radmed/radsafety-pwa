-- Migration: Create archives table
-- Date: 2026-02-04
-- Purpose: Store resources (PDF/Markdown) for the Resources page

CREATE TABLE IF NOT EXISTS archives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL, -- '작성지침', '작성예시', '서식', '교육자료', '법령정보', '안내문', '아카이브', '기타'
    file_url TEXT,          -- Path to the file in Storage (e.g. 'resources/sample.pdf')
    file_name TEXT,         -- Original file name
    content_html TEXT,      -- Rendered HTML from Markdown (for fast viewing)
    author TEXT DEFAULT '관리자',
    registrant_email TEXT,  -- Email of the uploader (for permission checks)
    view_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE archives ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view
CREATE POLICY "Public can view archives" 
ON archives FOR SELECT 
USING (true);

-- Policy: Authenticated users can insert/update/delete (We will filter by role in UI/Logic)
-- Ideally this should be restricted to admins only via claim checks, but for now we trust the app logic + simple RLS
CREATE POLICY "Authenticated users can manage archives" 
ON archives FOR ALL 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Storage Bucket: resources (if not exists)
-- Note: Bucket creation is usually done via Dashboard or Storage API, SQL for storage buckets is tricky in Supabase dependent on extensions.
-- Assuming bucket 'resources' exists or will be created manually.
