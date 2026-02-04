-- Add is_safety_practice_staff column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_safety_practice_staff boolean DEFAULT false; -- 방사선안전관리 실무 담당 여부
