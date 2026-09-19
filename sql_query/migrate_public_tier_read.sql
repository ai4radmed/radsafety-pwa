-- 2계층(공개/회원) 모델의 공개 계층 개방 (KSNM 방안위 교육팀 합의 2026-09-10 → Phase 1 스키마 2026-09-16,
-- 접근 제한 구현 2026-09-19 — Dr. Ben 확정 표):
--   비가입자(anon) = 지적권고사례 목록만(본문·조항·조치 불가) · 자료실 목록+다운로드(업로드 불가) ·
--                    나머지 공개 메뉴 이용 · 사용자 메뉴 없음.
--
-- 방법: 행 수준(RLS)은 published 만, 열 수준은 GRANT SELECT (열 목록) 으로 본문 열을 anon 에게서 아예 뺀다.
-- PostgREST 가 anon 요청에서 허용되지 않은 열을 요구하면 "permission denied for column" — 클라이언트가 우회해도
-- 서버가 안 준다. (Supabase 기본은 anon 에게 테이블 전체 SELECT 권한이 있으므로 REVOKE 후 열 단위로 다시 GRANT.)
--
-- 함께: 가입 승인 = 게시 권한(2-1 축소, Dr. Ben 2026-09-19) — 승인된 회원(status='active')은 can_publish=true.
-- 첫 제출 검토는 관리자가 권한을 회수한 회원에게만 작동하는 제재 도구로 남는다.
--
-- ⚠️ Dr. Ben 수동 실행(Supabase SQL Editor), 코드 배포 전. 멱등.

BEGIN;

-- 1. findings — anon: published 행의 제목·유형·태그·연도·일시만
REVOKE ALL ON public.findings FROM anon;
GRANT SELECT (id, title, finding_type, tags, year, created_at, status, user_id) ON public.findings TO anon;

DROP POLICY IF EXISTS "Public can list published findings" ON public.findings;
CREATE POLICY "Public can list published findings"
    ON public.findings FOR SELECT TO anon
    USING (status = 'published');

-- 2. archives — anon: published 행 전체 열(다운로드 경로 포함). 업로드는 INSERT 정책이 authenticated 전용.
REVOKE ALL ON public.archives FROM anon;
GRANT SELECT ON public.archives TO anon;

DROP POLICY IF EXISTS "Public can view published archives" ON public.archives;
CREATE POLICY "Public can view published archives"
    ON public.archives FOR SELECT TO anon
    USING (status = 'published');

-- 3. 조회수·다운로드 카운트 RPC 를 anon 도 호출 가능하게(실패해도 화면엔 영향 없지만 콘솔 오류 방지)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'increment_view_count') THEN
        GRANT EXECUTE ON FUNCTION public.increment_view_count(uuid) TO anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'increment_download_count') THEN
        GRANT EXECUTE ON FUNCTION public.increment_download_count(uuid) TO anon;
    END IF;
END $$;

-- 4. 가입 승인 = 게시 권한: 이미 승인된 회원 백필. (신규 승인은 approvePendingMember 가 can_publish=true 를 같이 쓴다.)
UPDATE public.profiles SET can_publish = true WHERE status = 'active' AND can_publish = false;

COMMIT;

-- 확인
-- select grantee, column_name from information_schema.column_privileges
-- where table_name = 'findings' and grantee = 'anon' order by column_name;
-- select policyname, roles, cmd from pg_policies where tablename in ('findings','archives') order by tablename, policyname;
