-- 1. Add missing 'role' column to allowed_members
ALTER TABLE public.allowed_members
ADD COLUMN IF NOT EXISTS role text; -- 구분 (예: 전문의, 방사선사)

-- 2. Ensure 'department' column exists as well
ALTER TABLE public.allowed_members
ADD COLUMN IF NOT EXISTS department text; -- 과 (예: 핵의학과)

-- 3. Update Kim Byung-il's data
-- Try to update if exists
UPDATE public.allowed_members
SET 
    role = '전문의',
    department = '핵의학과',
    society = 'nuclear_medicine',
    name = '김병일',
    affiliation = '한국원자력의학원'
WHERE email = 'kimbi.kirams@gmail.com';

-- 4. If the user doesn't exist, insert them
INSERT INTO public.allowed_members (name, email, affiliation, society, role, department)
SELECT '김병일', 'kimbi.kirams@gmail.com', '한국원자력의학원', 'nuclear_medicine', '전문의', '핵의학과'
WHERE NOT EXISTS (SELECT 1 FROM public.allowed_members WHERE email = 'kimbi.kirams@gmail.com');
