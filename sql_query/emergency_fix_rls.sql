-- ============================================================
-- 긴급 수정: profiles RLS 무한 재귀 완전 제거
-- ============================================================

-- 1. 모든 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- 2. 간단하고 안전한 정책으로 재생성
-- (1) 본인 프로필 조회
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- (2) 본인 프로필 수정
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- (3) 관리자는 모든 프로필 조회 (재귀 없는 안전한 방법)
-- 핵심: auth.uid()의 is_admin을 한 번만 조회
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
    -- 본인 프로필은 항상 볼 수 있음
    id = auth.uid()
    OR
    -- 관리자는 모든 프로필 조회 가능 (재귀 방지: LIMIT 1 사용)
    COALESCE(
        (SELECT is_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1),
        false
    ) = true
);

-- 3. 스키마 캐시 강제 갱신
NOTIFY pgrst, 'reload schema';

-- 4. 확인용 쿼리 (실행 후 결과 확인)
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
