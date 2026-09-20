-- 사용성 집계 — 화면별 일자 집계 (U-4, 2026-09-20).
--
-- 왜 필요한가: `usage_daily` 는 (날짜, 이벤트)로만 말아 넣어 **경로를 버린다.** 그러면
-- "어느 화면이 많이 쓰이는가"가 원시 보존 기간(기본 35일)이 지나는 순간 영구히 사라진다.
-- 그런데 다음에 무엇을 만들지 정하는 데 가장 직접적인 신호가 바로 그 순위다.
--
-- `usage_daily` 를 고치지 않고 표를 따로 두는 이유: 이미 운영에 적용된 표라 기본키를 바꾸면
-- 기존 행을 옮겨야 한다. 성격도 다르다 — 이쪽은 경로 수만큼 행이 늘어난다.
--
-- 담는 것: 경로가 있는 이벤트만(`page_view`·`gate_blocked`·오프라인 접속 등). 경로가 없는
-- 이벤트(가입·로그인·푸시 허용)는 `usage_daily` 에만 남는다.
--
-- 개인정보: `usage_events` 와 같다 — 경로는 질의문자열·해시를 떼고 120자로 자른 것이고,
-- 활성자 수는 되돌릴 수 없는 날짜별 키의 개수다. 제도 개선 제안 계열 경로는 애초에 기록되지
-- 않으므로 여기에도 없다.
--
-- 읽기·쓰기 모두 서비스 롤(서버)만 — anon/authenticated 정책 없음.
--
-- ⚠️ Dr. Ben 수동 실행 전용(Supabase SQL Editor). U-4 배포 전에 적용할 것.
--
-- 멱등 — 재실행 안전.

BEGIN;

CREATE TABLE IF NOT EXISTS public.usage_page_daily (
    day           date    NOT NULL,
    page          text    NOT NULL,           -- 경로만. 질의문자열·해시 없음, 120자 제한
    event         text    NOT NULL,           -- 'page_view' | 'gate_blocked' | …
    count         integer NOT NULL DEFAULT 0,
    unique_actors integer NOT NULL DEFAULT 0, -- 로그인 회원만. 비로그인은 셀 수단이 없다
    PRIMARY KEY (day, page, event)
);

CREATE INDEX IF NOT EXISTS usage_page_daily_day_idx ON public.usage_page_daily (day);

ALTER TABLE public.usage_page_daily ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.usage_page_daily IS '사용성 화면별 일자 집계 — 어느 화면이 쓰이는가. 영구. 서비스 롤 전용.';

COMMIT;
