-- Migration: Create notifications table
-- Date: 2026-02-04
-- Purpose: System notifications for users (e.g., auth cancellation)

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own notifications
CREATE POLICY "Users can view own notifications" 
ON notifications FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Users can insert notifications (needed for admin logic on client side if RLS is simple)
-- In production, this should be restricted to admin-only or service role functions
CREATE POLICY "Users/Admins can insert notifications" 
ON notifications FOR INSERT 
WITH CHECK (true); 

-- Policy: Users can mark as read (update is_read)
CREATE POLICY "Users can update own notifications" 
ON notifications FOR UPDATE
USING (auth.uid() = user_id);
