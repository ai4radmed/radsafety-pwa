-- Migration: Create auth_requests table
-- Date: 2026-02-04
-- Purpose: Store manual verification requests for society members and special users

CREATE TABLE IF NOT EXISTS auth_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    type TEXT NOT NULL, -- 'society' | 'special'
    status TEXT DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
    
    -- Applicant Information
    full_name TEXT NOT NULL,
    email TEXT NOT NULL, -- Contact Email
    society TEXT, -- 'nuclear_medicine', 'technology' (NULL for special)
    affiliation TEXT NOT NULL, -- Organization/Hospital
    department TEXT, -- Department (New field)
    role TEXT, -- Role/Position (New field)
    reason TEXT, -- Request Reason
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE auth_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can create their own requests
CREATE POLICY "Users can create their own requests" 
ON auth_requests FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can view their own requests
CREATE POLICY "Users can view their own requests" 
ON auth_requests FOR SELECT 
USING (auth.uid() = user_id);

-- (Optional) Policy: Admins can view all (Needs is_admin check function or role check)
-- For now, basic user access is sufficient for the request flow.
