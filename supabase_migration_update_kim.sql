-- Update mock data for Kim Byung-il to include new fields
-- This ensures 'Department' and 'Role' are available for verification sync.

-- 1. Insert or Update Kim Byung-il in allowed_members
INSERT INTO public.allowed_members (name, email, affiliation, society, role, department)
VALUES (
    '김병일', 
    'kimbi.kirams@gmail.com', 
    '한국원자력의학원', 
    'nuclear_medicine', 
    '전문의', -- 구분 (Role)
    '핵의학과' -- 과 (Department)
)
ON CONFLICT (id) DO UPDATE -- Note: id isn't unique constraint usually, but let's assume we want to update by email if possible. 
-- Since we don't have a unique constraint on email in the create script effectively enforced for upsert without index, we'll try update first.
SET 
    role = '전문의',
    department = '핵의학과',
    society = 'nuclear_medicine',
    name = '김병일';

-- Better approach for safe update without unique constraint on email:
UPDATE public.allowed_members
SET 
    role = '전문의',
    department = '핵의학과'
WHERE email = 'kimbi.kirams@gmail.com';

-- Verify update
-- select * from public.allowed_members where email = 'kimbi.kirams@gmail.com';
