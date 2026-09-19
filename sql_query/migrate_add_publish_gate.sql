-- 2단계 2-1 업로드 권한 (documents/privacy_redesign_plan.md, 확정 2026-09-08, 실행 2026-09-19).
-- "누가 올릴 수 있는가"를 신원(verification_status)이 아닌 실적(can_publish)으로 대체한다.
--
--   profiles.can_publish   boolean not null default false  ← 첫 제출이 승인되면 true, 관리자가 회수 가능
--   profiles.reject_count  int     not null default 0      ← 반려 누적, 3회면 제출 차단
--   archives.status / findings.status  text not null default 'pending'  check in (pending, published, rejected)
--   archives.file_bucket   text not null default 'resources'  ← 'resources-pending'(비공개) | 'resources'(공개)
--
-- 규칙
--   1. 로그인한 정상 회원(status='active', reject_count<3)은 누구나 제출할 수 있다. 제출 행의 status 는
--      트리거가 정한다: can_publish 또는 관리자면 'published', 아니면 'pending'(클라이언트가 보낸 값 무시).
--   2. pending 은 작성자 본인 + 관리자만 본다(RLS). published 는 로그인 전원.
--   3. 관리자 승인/반려는 서버 액션(reviewSubmission, 서비스 롤)이 한다 — auth.uid() 가 NULL 이면
--      트리거가 status 를 건드리지 않는다. 일반 사용자는 UPDATE 로 status 를 못 바꾼다(트리거가 되돌림).
--   4. pending 파일은 비공개 버킷 resources-pending 의 <uid>/ 아래. 승인 시 서버가 공개 버킷 resources 로 옮긴다.
--
-- 백필: 기존 verification_status in (list, temp_verified, verified) 였던 사용자와 관리자는 can_publish=true
--       (이미 검토를 거친 것으로 간주). 기존 archives·findings 는 전부 published.
--
-- verification_status 컬럼 삭제는 별도 파일(migrate_drop_verification_status.sql) — 이 파일이 옛 정책을
-- 교체한 뒤, 대시보드에만 있는 정책이 남아 있는지 확인하고 실행한다.
--
-- ⚠️ Dr. Ben 수동 실행(Supabase SQL Editor). 코드 배포 전에 실행해도 안전(옛 코드는 status 를 모름 →
--    트리거가 채움, 옛 게이트는 여전히 verification_status 를 봄). 권장 순서: 이 파일 → 코드 배포 → drop.
-- 멱등 — 재실행 안전.

BEGIN;

-- 1. profiles
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS can_publish boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS reject_count integer NOT NULL DEFAULT 0;

UPDATE public.profiles
SET can_publish = true
WHERE can_publish = false
  AND (is_admin = true OR verification_status IN ('list', 'temp_verified', 'verified'));

-- 2. archives / findings status
ALTER TABLE public.archives
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS file_bucket text NOT NULL DEFAULT 'resources';
ALTER TABLE public.findings
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

-- 기존 행은 전부 게시된 것으로 간주(컬럼 신설 직후 1회).
UPDATE public.archives SET status = 'published'
WHERE status = 'pending' AND created_at < now() - interval '1 minute';
UPDATE public.findings SET status = 'published'
WHERE status = 'pending' AND created_at < now() - interval '1 minute';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'archives_status_check') THEN
        ALTER TABLE public.archives ADD CONSTRAINT archives_status_check
            CHECK (status IN ('pending', 'published', 'rejected'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'archives_file_bucket_check') THEN
        ALTER TABLE public.archives ADD CONSTRAINT archives_file_bucket_check
            CHECK (file_bucket IN ('resources', 'resources-pending'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'findings_status_check') THEN
        ALTER TABLE public.findings ADD CONSTRAINT findings_status_check
            CHECK (status IN ('pending', 'published', 'rejected'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_archives_status ON public.archives(status);
CREATE INDEX IF NOT EXISTS idx_findings_status ON public.findings(status);

-- 3. 트리거: status 는 서버(DB)가 정한다
CREATE OR REPLACE FUNCTION public.enforce_submission_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    allowed boolean;
BEGIN
    -- 서비스 롤(서버 액션)은 auth.uid() 가 NULL — 승인/반려가 status 를 직접 정한다.
    IF auth.uid() IS NULL THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        SELECT (p.is_admin OR p.can_publish) INTO allowed
        FROM public.profiles p WHERE p.id = auth.uid();
        NEW.status := CASE WHEN coalesce(allowed, false) THEN 'published' ELSE 'pending' END;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NOT public.is_current_user_admin() THEN
            NEW.status := OLD.status;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS archives_enforce_status ON public.archives;
CREATE TRIGGER archives_enforce_status
    BEFORE INSERT OR UPDATE ON public.archives
    FOR EACH ROW EXECUTE FUNCTION public.enforce_submission_status();

DROP TRIGGER IF EXISTS findings_enforce_status ON public.findings;
CREATE TRIGGER findings_enforce_status
    BEFORE INSERT OR UPDATE ON public.findings
    FOR EACH ROW EXECUTE FUNCTION public.enforce_submission_status();

-- 4. RLS — archives
DROP POLICY IF EXISTS "Anyone can view archives" ON public.archives;
DROP POLICY IF EXISTS "Verified users can create archives" ON public.archives;
DROP POLICY IF EXISTS "Published archives are visible to members" ON public.archives;
DROP POLICY IF EXISTS "Active members can submit archives" ON public.archives;

CREATE POLICY "Published archives are visible to members"
    ON public.archives FOR SELECT TO authenticated
    USING (status = 'published' OR user_id = auth.uid() OR public.is_current_user_admin() = true);

CREATE POLICY "Active members can submit archives"
    ON public.archives FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = user_id AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND (p.is_admin = true OR (p.status = 'active' AND p.reject_count < 3))
        )
    );

-- 5. RLS — findings (기존: 로그인 전원 SELECT + 관리자 ALL 뿐이라 일반 회원 등록 정책이 없었다)
DROP POLICY IF EXISTS "Anyone can view findings" ON public.findings;
DROP POLICY IF EXISTS "Published findings are visible to members" ON public.findings;
DROP POLICY IF EXISTS "Active members can submit findings" ON public.findings;
DROP POLICY IF EXISTS "Authors can update own findings" ON public.findings;
DROP POLICY IF EXISTS "Authors can delete own findings" ON public.findings;

CREATE POLICY "Published findings are visible to members"
    ON public.findings FOR SELECT TO authenticated
    USING (status = 'published' OR user_id = auth.uid() OR public.is_current_user_admin() = true);

CREATE POLICY "Active members can submit findings"
    ON public.findings FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = user_id AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND (p.is_admin = true OR (p.status = 'active' AND p.reject_count < 3))
        )
    );

CREATE POLICY "Authors can update own findings"
    ON public.findings FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Authors can delete own findings"
    ON public.findings FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- 6. 비공개 버킷 resources-pending — pending 파일은 URL 을 알아도 못 받는다
INSERT INTO storage.buckets (id, name, public)
VALUES ('resources-pending', 'resources-pending', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Members upload pending resources to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Owners and admins read pending resources" ON storage.objects;
DROP POLICY IF EXISTS "Owners and admins delete pending resources" ON storage.objects;

CREATE POLICY "Members upload pending resources to own folder"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'resources-pending' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners and admins read pending resources"
    ON storage.objects FOR SELECT TO authenticated
    USING (
        bucket_id = 'resources-pending' AND
        (auth.uid()::text = (storage.foldername(name))[1] OR public.is_current_user_admin() = true)
    );

CREATE POLICY "Owners and admins delete pending resources"
    ON storage.objects FOR DELETE TO authenticated
    USING (
        bucket_id = 'resources-pending' AND
        (auth.uid()::text = (storage.foldername(name))[1] OR public.is_current_user_admin() = true)
    );

COMMIT;

-- 확인
-- select policyname, cmd from pg_policies where tablename in ('archives','findings') order by tablename, policyname;
-- select count(*) filter (where can_publish) as publishers, count(*) as total from public.profiles;
