-- ============================================================
-- 단순 디버깅 쿼리 (auth.uid() 없이)
-- ============================================================

-- 1. test-admin 프로필 존재 확인
SELECT
    '1. Admin Profile Check' as step,
    id,
    login_email,
    is_admin,
    verification_status
FROM public.profiles
WHERE login_email = 'test-admin@radsafety.kr';

-- 2. archives 테이블 구조 확인
SELECT
    '2. Archives Table Structure' as step,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'archives'
ORDER BY ordinal_position;

-- 3. archives 외래키 확인 ⭐ 가장 중요!
SELECT
    '3. Archives Foreign Keys' as step,
    tc.constraint_name,
    kcu.column_name as archive_column,
    ccu.table_name AS references_table,
    ccu.column_name AS references_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name = 'archives';

-- 4. profiles RLS 정책 확인
SELECT
    '4. Profiles RLS Policies' as step,
    policyname,
    cmd,
    SUBSTRING(qual FROM 1 FOR 100) as condition_preview
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
ORDER BY policyname;

-- 5. archives RLS 정책 확인
SELECT
    '5. Archives RLS Policies' as step,
    policyname,
    cmd,
    SUBSTRING(qual FROM 1 FOR 100) as condition_preview
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'archives'
ORDER BY policyname;

-- 6. archives 데이터 확인 (있다면)
SELECT
    '6. Archives Data Count' as step,
    count(*) as total_archives
FROM public.archives;

-- 7. RLS 활성화 상태 확인
SELECT
    '7. RLS Status' as step,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'archives')
ORDER BY tablename;
