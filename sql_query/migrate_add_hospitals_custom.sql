-- 관리자가 화면에서 바로 등록하는 회원기관 (documents/privacy_redesign_plan.md §2-3,
-- 2026-09-19 개정 2 — Dr. Ben). 정적 목록 src/data/hospitals.ts 는 배포에 박혀 있어
-- "관리자가 승인하면 그 자리에서 등록" 이 불가능했다(hospitals.ts 수정 → 배포 → 선택).
-- 이 테이블이 그 간극을 메운다: 가입자의 기관 등록 요청(profiles.hospital_request)을
-- 관리자가 admin/member-approval.astro 에서 "이 이름으로 등록" 하면 여기에 한 행이 생기고
-- 가입자의 profiles.hospital_id 가 그 id 로 바뀐다 — 배포 없음.
--
-- id: slug 규칙('c-' + 정규화한 이름의 sha256 앞 10자, src/lib/hospitals.ts customHospitalId).
--     같은 이름은 항상 같은 id 라 중복 등록이 자연히 막히고, 나중에 hospitals.ts 로 옮겨도
--     id 를 그대로 가져가면 회원의 hospital_id 참조가 안 끊긴다.
-- 읽기: 누구나(anon 포함 — 로그인 전 가입 폼의 자동완성이 읽는다).
-- 쓰기: 서비스 롤(서버 액션)만. anon/authenticated 에 insert/update/delete 정책 없음.
--
-- ⚠️ Dr. Ben 수동 실행 전용(Supabase SQL Editor). 배포 전에 적용할 것 — 자동완성·가입 액션이
-- 이 테이블을 읽는다.
--
-- 멱등 — 재실행 안전.

BEGIN;

CREATE TABLE IF NOT EXISTS public.hospitals_custom (
    id          text PRIMARY KEY,
    name        text NOT NULL,
    created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    retired     boolean NOT NULL DEFAULT false
);

ALTER TABLE public.hospitals_custom ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hospitals_custom: anyone can read" ON public.hospitals_custom;
CREATE POLICY "hospitals_custom: anyone can read"
    ON public.hospitals_custom FOR SELECT
    USING (true);

GRANT SELECT ON public.hospitals_custom TO anon, authenticated;

COMMIT;
