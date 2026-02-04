-- Standardize columns in allowed_members
-- Goal: Ensure data from Korean columns ("과", "구분") is moved to English columns (department, role).

DO $$
BEGIN
    -- 1. Check if "과" column exists and move data to 'department'
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'allowed_members' AND column_name = '과') THEN
        -- Add department if missing (it should exist from previous scripts, but safe measure)
        ALTER TABLE public.allowed_members ADD COLUMN IF NOT EXISTS department text;
        
        -- Copy data: Update department where it is null but "과" has value
        UPDATE public.allowed_members
        SET department = "과"
        WHERE department IS NULL AND "과" IS NOT NULL;
    END IF;

    -- 2. Check if "구분" column exists and move data to 'role'
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'allowed_members' AND column_name = '구분') THEN
        -- Add role if missing
        ALTER TABLE public.allowed_members ADD COLUMN IF NOT EXISTS role text;
        
        -- Copy data
        UPDATE public.allowed_members
        SET role = "구분"
        WHERE role IS NULL AND "구분" IS NOT NULL;
    END IF;
END $$;

-- 3. Verify specific user update (Safety Net for Kim Byung-il)
UPDATE public.allowed_members
SET 
    department = '핵의학과', 
    role = '전문의',
    society = 'nuclear_medicine'
WHERE email = 'kimbi.kirams@gmail.com';
