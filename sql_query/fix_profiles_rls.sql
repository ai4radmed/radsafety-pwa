-- ============================================================
-- profiles RLS 정책 무한 재귀 문제 수정
-- ============================================================

-- 기존 잘못된 정책 삭제
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- 올바른 정책 생성 (재귀 없이)
-- 방법: is_admin 체크를 WHERE 절에서 직접 수행
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
    -- 본인 프로필은 항상 볼 수 있음
    auth.uid() = id
    OR
    -- 또는 본인이 관리자인 경우 모든 프로필 조회 가능
    (
        SELECT is_admin
        FROM public.profiles
        WHERE id = auth.uid()
        LIMIT 1
    ) = true
);

-- archives 테이블의 스키마 캐시 새로고침을 위해 외래키 재생성
ALTER TABLE public.archives
DROP CONSTRAINT IF EXISTS archives_user_id_fkey;

ALTER TABLE public.archives
ADD CONSTRAINT archives_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE SET NULL;

-- Supabase 스키마 캐시 강제 갱신
NOTIFY pgrst, 'reload schema';
