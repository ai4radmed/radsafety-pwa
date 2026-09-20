-- 3단계 제도 개선 제안 채널 (documents/privacy_redesign_plan.md 3단계, 확정 2026-09-08 · 구현 2026-09-20).
-- KINS 가 요청한 "익명으로 의견을 낼 수 있는 채널". 의견보내기(feedback, 앱 오류·사용성·항상 아이디)와 별도로
-- 방사선안전관리 *제도 개선 제안* 을 받는다. 제출 시 익명(기본)/아이디 선택.
--
-- 원칙: 문은 로그인으로 지키고, 글에는 문을 지나간 흔적을 남기지 않는다.
--   - anonymous 행: author_id·created_at 가 반드시 NULL(CHECK 로 강제), 시간 정보는 created_day(일 단위)뿐,
--     receipt_hash(접수증 코드의 sha256)로만 본인이 답변을 조회한다.
--   - signed 행: author_id·created_at 기록, 알림으로 답변.
--   - 없는 컬럼이 설계다: ip·user_agent·hospital_id 없음.
--   - 쓰기는 서비스 롤(서버 액션 submitProposal) 한 경로뿐 — 클라이언트가 mode 를 속여 author_id 를 넣거나 빼는 것을
--     막는다. anon/authenticated 에 INSERT/UPDATE/DELETE 정책 없음.
--   - proposal_quota: 1인 1일 3건. anonymous 키 = HMAC(user_id + day, 서버 비밀) — proposals 에는 키를 저장하지
--     않으므로 어느 제안이 어느 키였는지는 서버도 모른다. day 로 다음 날 정리.
--
-- 첨부: 비공개 버킷 proposal-attachments. 경로 <uuid>/<uuid>.<ext> — user_id 를 경로에 넣지 않고, 서비스 롤로
-- 올려 storage.objects.owner 도 비운다. 서버가 EXIF/PDF 메타를 지운 뒤 저장. 클라이언트 storage 정책 없음.
--
-- ⚠️ Dr. Ben 수동 실행 전용(Supabase SQL Editor). 배포 전 적용. 멱등.

BEGIN;

CREATE TABLE IF NOT EXISTS public.proposals (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    category      text        NOT NULL CHECK (category IN ('안전관리', '피폭', '규제', '기타')),
    body          text        NOT NULL,
    attachments   jsonb       NOT NULL DEFAULT '[]'::jsonb,   -- [{storage_path, size, kind}] 원본 파일명 없음
    status        text        NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'answered', 'closed')),
    admin_note    text,
    admin_reply   text,
    mode          text        NOT NULL CHECK (mode IN ('anonymous', 'signed')),
    author_id     uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at    timestamptz,                                 -- signed 만(초 단위)
    created_day   date        NOT NULL DEFAULT CURRENT_DATE,   -- 두 모드 공통. anonymous 의 유일한 시간 정보
    answered_at   timestamptz,
    receipt_hash  text        UNIQUE,                          -- anonymous 만. sha256(접수증 코드)
    CONSTRAINT proposals_anonymous_has_no_identity CHECK (
        (mode = 'anonymous' AND author_id IS NULL AND created_at IS NULL AND receipt_hash IS NOT NULL) OR
        (mode = 'signed'    AND author_id IS NOT NULL AND created_at IS NOT NULL AND receipt_hash IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS proposals_status_day_idx ON public.proposals (status, created_day DESC);
CREATE INDEX IF NOT EXISTS proposals_author_idx ON public.proposals (author_id) WHERE author_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.proposal_quota (
    key    text    PRIMARY KEY,   -- anonymous: HMAC(user_id|day) / signed: user_id|day
    day    date    NOT NULL,      -- 정리용(다음 날 삭제)
    count  integer NOT NULL DEFAULT 0
);

ALTER TABLE public.proposals      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_quota ENABLE ROW LEVEL SECURITY;

-- 읽기: 본인 signed 건 또는 관리자. anonymous 행은 author_id NULL 이라 본인 정책에 걸리지 않는다(관리자만).
DROP POLICY IF EXISTS "Authors and admins can read proposals" ON public.proposals;
CREATE POLICY "Authors and admins can read proposals"
    ON public.proposals FOR SELECT TO authenticated
    USING (author_id = auth.uid() OR public.is_current_user_admin() = true);

GRANT SELECT ON public.proposals TO authenticated;
-- proposal_quota: 정책 없음 → 서비스 롤만.

-- 비공개 첨부 버킷. 클라이언트 정책 없음(서비스 롤 업로드·서명 URL).
INSERT INTO storage.buckets (id, name, public)
VALUES ('proposal-attachments', 'proposal-attachments', false)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.proposals IS '3단계 제도 개선 제안 — 익명(신원 컬럼 NULL 강제)/아이디. 쓰기는 서비스 롤 전용.';
COMMENT ON TABLE public.proposal_quota IS '제안 1인 1일 쿼터. anonymous 키는 HMAC — proposals 와 연결 불가. 다음 날 정리.';

COMMIT;
