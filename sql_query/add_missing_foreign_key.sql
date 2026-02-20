-- archives.user_id → profiles.id 외래키 추가

-- 1. 기존 외래키 삭제 (있다면)
ALTER TABLE public.archives
DROP CONSTRAINT IF EXISTS archives_user_id_fkey;

-- 2. 올바른 외래키 생성
ALTER TABLE public.archives
ADD CONSTRAINT archives_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE SET NULL;

-- 3. 스키마 캐시 강제 갱신
NOTIFY pgrst, 'reload schema';

-- 4. 확인
SELECT constraint_name, column_name
FROM information_schema.key_column_usage
WHERE table_name = 'archives'
  AND constraint_name LIKE '%fkey%';
