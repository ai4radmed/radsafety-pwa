-- ==============================================================================
-- Table: public.notifications
-- Description: System notifications for users
-- Managed By: Master SQL Definition (sql_query/create_notifications.sql)
-- ==============================================================================

-- 1. Drop Table
DROP TABLE IF EXISTS public.notifications CASCADE;

-- 2. Create Table
CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    
    title text NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    link text, -- Optional redirect URL
    type text -- 'system', 'alert', 'info'
);

-- 3. Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Admins can view/manage all? Or only their own? 
-- Assuming admins can manage system notifications
CREATE POLICY "Admins can manage all notifications" ON public.notifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- 5. Comments
COMMENT ON TABLE public.notifications IS '사용자 알림 테이블';
