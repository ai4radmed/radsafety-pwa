-- Add society_role column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS society_role text; -- Store '구분' from Excel (e.g. '전문의', '방사선사')
