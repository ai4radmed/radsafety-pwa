-- 외부 자원 갱신 감시 상태 테이블 (documents/privacy_redesign_plan.md KINS 연계 트랙 K-3,
-- 2026-09-20 Dr. Ben). RASIS 규제해석 SOS·이용자지원간행물 등 회원에게 알려야 할 외부 게시판을
-- 하루 1회(Vercel Cron → /api/cron/watch) 읽어 신규·수정·삭제를 잡아낸다.
--
-- 왜 필요한가: RASIS 세부 메뉴는 직접 주소가 없어(부모 프레임 의존, 2026-09-20 실측) 사람이
-- 북마크로 새 글을 확인할 수 없다. 대신 목록 API 는 로그인 없이 JSON 을 돌려주므로 프로그램이
-- 집합 비교로 변화를 감지해 알림으로 전달한다. 목록은 날짜순이 아니라 분류순이라 "건수 증가"
-- 로는 못 잡고 건별 지문(fingerprint) 비교가 필요하다 — 그래서 건 단위 상태 테이블이 있다.
--
-- watch_items   : 소스별 게시물 1건 = 1행. 본문은 저장하지 않는다(제목·분류·지문·안내용 소량 메타만).
-- watch_sources : 소스별 실행 상태(연속 실패·직전 건수). 급감·연속 실패 판정에 쓴다.
--
-- 읽기·쓰기 모두 서비스 롤(서버 cron 엔드포인트)만 — anon/authenticated 정책 없음. 개인정보 0.
--
-- ⚠️ Dr. Ben 수동 실행 전용(Supabase SQL Editor). 배포 전에 적용할 것 — cron 첫 실행이 이 테이블에
-- baseline 을 쓴다(테이블이 없으면 실행이 실패로 기록되고 텔레그램 경고가 온다).
--
-- 멱등 — 재실행 안전.

BEGIN;

CREATE TABLE IF NOT EXISTS public.watch_items (
    source          text        NOT NULL,           -- 'kins-sos' | 'kins-pub' | …
    external_id     text        NOT NULL,           -- 소스의 고유키(SOS: writNo, 간행물: pblcClNo-pblcClSn)
    title           text        NOT NULL,
    category        text,
    fingerprint     text        NOT NULL,           -- sha256(제목+본문 등 변화 감지 필드)
    detail          jsonb,                          -- 안내용 소량 메타(관리번호·분류·게시일). 본문 ✗
    first_seen_at   timestamptz NOT NULL DEFAULT now(),
    last_seen_at    timestamptz NOT NULL DEFAULT now(),
    changed_at      timestamptz,                    -- 마지막으로 지문이 바뀐 시각
    missing_count   integer     NOT NULL DEFAULT 0, -- 목록에서 연속으로 안 보인 횟수(2회면 삭제 확정)
    removed_at      timestamptz,                    -- 삭제 확정 시각(행은 남긴다 — 재등장 감지용)
    PRIMARY KEY (source, external_id)
);

CREATE TABLE IF NOT EXISTS public.watch_sources (
    source               text        PRIMARY KEY,
    last_run_at          timestamptz,
    last_ok_at           timestamptz,
    last_count           integer,                   -- 직전 정상 실행의 건수(급감 판정 기준)
    consecutive_failures integer     NOT NULL DEFAULT 0,
    last_error           text,
    baseline_at          timestamptz                -- 최초 실행(알림 없이 저장만) 시각
);

ALTER TABLE public.watch_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_sources ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.watch_items   IS '외부 게시판(RASIS 등) 감시 — 건별 지문. 본문 미저장. 서비스 롤 전용.';
COMMENT ON TABLE public.watch_sources IS '외부 게시판 감시 — 소스별 실행 상태(연속 실패·직전 건수). 서비스 롤 전용.';

COMMIT;
