-- ============================================================
-- RLS 및 스키마 캐시 디버깅 쿼리
-- ============================================================

-- 1. 현재 로그인한 사용자 확인
SELECT
    'Current User' as info,
    auth.uid() as user_id,
    current_user as postgres_role;

-- 2. test-admin 프로필 확인
SELECT
    'Admin Profile' as info,
    id,
    login_email,
    is_admin,
    verification_status,
    created_at
FROM public.profiles
WHERE login_email = 'test-admin@radsafety.kr';

-- 3. profiles 테이블의 모든 RLS 정책 확인
SELECT
    'Profiles Policies' as info,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
ORDER BY policyname;

-- 4. archives 테이블 존재 및 구조 확인
SELECT
    'Archives Table Structure' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'archives'
ORDER BY ordinal_position;

-- 5. archives 외래키 확인
SELECT
    'Archives Foreign Keys' as info,
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'archives';

-- 6. archives RLS 정책 확인
SELECT
    'Archives Policies' as info,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'archives'
ORDER BY policyname;

-- 7. PostgREST 스키마 캐시 상태 확인 (임베딩 테이블 확인)
-- archives와 profiles 간 관계가 캐시되었는지 확인
SELECT
    'Schema Cache Check' as info,
    count(*) as total_policies
FROM pg_policies
WHERE schemaname = 'public';

-- 8. 직접 테스트: profiles 조회 (RLS 적용)
-- 현재 사용자로 profiles 조회 시도
SELECT
    'Direct Profile Query Test' as info,
    id,
    login_email,
    is_admin
FROM public.profiles
WHERE id = auth.uid();

-- 9. 직접 테스트: archives 조회 (관계 없이)
SELECT
    'Direct Archives Query Test (no join)' as info,
    id,
    title,
    user_id,
    created_at
FROM public.archives
LIMIT 5;

-- 10. RLS 비활성화 상태 확인
SELECT
    'RLS Status' as info,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'archives');
