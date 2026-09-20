-- 사건·사고 전파 (documents/privacy_redesign_plan.md KINS 연계 트랙 K-1, 2026-09-20 Dr. Ben).
-- 원안위 보도자료(속보) 와 NSIC 방사선사고 사례집(원인·등급 확정본) 을 "사건" 단위로 모아 회원에게 전한다.
--
-- 왜 게시물이 아니라 사건인가 (Dr. Ben 2026-09-20): 같은 사고가 원안위 속보(즉시) → NSIC 사례집(수개월 뒤)
-- 으로 두 번 나온다. 회원이 같은 사고를 두 번 "신규"로 받지 않도록 속보가 스레드를 열고(parent_id NULL)
-- 확정본은 그 스레드에 후속으로 붙는다(parent_id = 속보 id). 두 기관 사이에 공통 ID 가 없으므로 후보는
-- 자동 제안(suggested_parent_id) 만 하고 확정(parent_id) 은 관리자가 한다 — 오판 = 회원 오알림.
--
-- 저장 원칙: 본문 전문은 재게시하지 않고 링크한다. NSIC 는 정보공개 목적 데이터라 개요·원인 요약을 담되
-- 실명·상세주소 필드는 어댑터에서 버린다(org_masked 는 'OO대학교병원' 그대로). 개인정보 0.
--
-- 읽기: 회원(authenticated) 은 published 만, 관리자는 전부. anon 없음(회원 계층). 쓰기: 서비스 롤(cron·액션).
--
-- ⚠️ Dr. Ben 수동 실행 전용(Supabase SQL Editor). 배포 전에 적용할 것 — cron 첫 실행이 NSIC 를 백필한다.
-- 멱등 — 재실행 안전.

BEGIN;

CREATE TABLE IF NOT EXISTS public.bulletins (
    id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    source               text        NOT NULL CHECK (source IN ('nsic', 'nssc')),
    external_id          text        NOT NULL,                 -- NSIC: EXMN… / NSSC: BBS_SEQ
    title                text        NOT NULL,
    occurred_at          date,                                 -- NSIC 사고일자 / NSSC 게시일
    incident_type        text,                                 -- 분실·피폭·화재·기기고장·오염·방출·기타 (NSIC)
    incident_grade       text,                                 -- (0등급)·1등급·미대상 … (NSIC)
    region               text,                                 -- [서울] 등 (NSIC)
    org_masked           text,                                 -- 'OO대학교병원' 그대로 (NSIC)
    source_url           text        NOT NULL,                 -- 원문 링크(전문 재게시 ✗)
    summary              text,                                 -- NSIC: 개요(inciMainCntn) / NSSC: 관리자 작성
    cause                text,                                 -- NSIC: 사고원인(inciCausCntn)
    prep_note            text,                                 -- 관리자 "정기검사 준비 포인트"
    relevant             boolean     NOT NULL DEFAULT false,   -- 의료·RI 관련 판정(어댑터)
    status               text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'ignored')),
    parent_id            uuid        REFERENCES public.bulletins(id) ON DELETE SET NULL,  -- 확정된 스레드 루트
    suggested_parent_id  uuid        REFERENCES public.bulletins(id) ON DELETE SET NULL,  -- 자동 제안(관리자 확인용)
    published_at         timestamptz,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now(),
    UNIQUE (source, external_id)
);

CREATE INDEX IF NOT EXISTS bulletins_status_occurred_idx ON public.bulletins (status, occurred_at DESC);
CREATE INDEX IF NOT EXISTS bulletins_parent_idx ON public.bulletins (parent_id);

ALTER TABLE public.bulletins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published bulletins are visible to members" ON public.bulletins;
CREATE POLICY "Published bulletins are visible to members"
    ON public.bulletins FOR SELECT TO authenticated
    USING (status = 'published' OR public.is_current_user_admin() = true);

GRANT SELECT ON public.bulletins TO authenticated;

COMMENT ON TABLE public.bulletins IS '사건·사고 전파(K-1) — 원안위 속보 + NSIC 사례집을 사건 스레드로. 본문 미재게시·개인정보 0. 쓰기는 서비스 롤.';

COMMIT;
