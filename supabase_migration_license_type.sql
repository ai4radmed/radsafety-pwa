-- Add radiation_license_type column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS radiation_license_type text;

-- Reload schema cache
NOTIFY pgrst, 'reload config';
