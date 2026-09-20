-- 사용성 집계 테이블 (documents/privacy_redesign_plan.md U 트랙, 2026-09-20 Dr. Ben).
-- 어떤 기능이 실제로 쓰이는지 · 어디에서 이탈하는지를 개인을 추적하지 않고 잰다.
--
-- 왜 필요한가: v1.0.0 으로 기능은 다 들어갔는데 무엇이 쓰이는지 알 방법이 없다. 다음에 무엇을
-- 만들지 정하려면 근거가 필요하다. 제3자 분석 도구(GA4·PostHog 등)는 쿠키·IP·해외 전송이
-- 따라와 처리방침과 충돌하므로 쓰지 않고, 필요한 최소치만 직접 센다.
--
-- 익명화 구조: 회원 식별자를 그대로 저장하지 않고 USAGE_HMAC_SECRET 으로 날짜·주·월과 섞은
-- 되돌릴 수 없는 값(actor_key·week_key·month_key)만 남긴다. 날이 바뀌면 같은 사람을 이을 수
-- 없다 — 일간 활성자 수는 정확하되 개인의 시계열은 원리적으로 만들 수 없다. 주·월 단위만
-- 각각 week_key·month_key 로 잇고 그 이상은 잇지 않는다.
--
-- usage_events : 원시. USAGE_RETENTION_DAYS(기본 35일) 지나면 야간 작업이 삭제한다.
-- usage_daily  : 일자·이벤트별 집계. 영구 보존.
-- usage_active : 일·주·월 활성 사용자 수. 영구 보존.
--
-- 왜 35일인가: 월간 활성자 수는 그 달이 끝난 뒤 계산하는데, 31일 달을 마지막 날에 집계하려면
-- 원시 행이 31일치 남아 있어야 한다. 여기에 야간 작업 지연 하루를 더해 35일로 잡았다.
--
-- 제외 대상: 제도 개선 제안 관련 경로(/proposals · /proposal-lookup · /my-proposals)는 아예
-- 기록하지 않는다. 익명 제출 직전의 페이지 조회가 남으면 3단계에서 끊어 놓은 연결이 여기서
-- 다시 생긴다. 판정은 서버(src/lib/usage/events.ts)에서 하며 클라이언트를 믿지 않는다.
--
-- 읽기·쓰기 모두 서비스 롤(서버)만 — anon/authenticated 정책 없음.
--
-- ⚠️ Dr. Ben 수동 실행 전용(Supabase SQL Editor). U-1 배포 전에 적용할 것.
--
-- 멱등 — 재실행 안전.

BEGIN;

CREATE TABLE IF NOT EXISTS public.usage_events (
    id          bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event       text        NOT NULL,           -- 서버 허용목록에 있는 이름만
    page        text,                           -- 경로만. 질의문자열·해시 제거, 120자 제한
    props       jsonb,                          -- 허용된 키만. 자유 텍스트·검색어 원문 ✗
    hour        timestamptz NOT NULL,           -- 시 단위로 뭉갠 발생 시각
    actor_key   text,                           -- HMAC(회원식별자+그날, 서버 비밀키). 비로그인은 NULL
    week_key    text,                           -- HMAC(회원식별자+ISO주)  → 주간 활성자
    month_key   text                            -- HMAC(회원식별자+년월)   → 월간 활성자
);

CREATE INDEX IF NOT EXISTS usage_events_hour_idx  ON public.usage_events (hour);
CREATE INDEX IF NOT EXISTS usage_events_event_idx ON public.usage_events (event, hour);

CREATE TABLE IF NOT EXISTS public.usage_daily (
    day           date    NOT NULL,
    event         text    NOT NULL,
    count         integer NOT NULL DEFAULT 0,
    unique_actors integer NOT NULL DEFAULT 0,
    PRIMARY KEY (day, event)
);

CREATE TABLE IF NOT EXISTS public.usage_active (
    period        text    NOT NULL,             -- 'day' | 'week' | 'month'
    period_key    text    NOT NULL,             -- '2026-09-20' | '2026-W38' | '2026-09'
    unique_actors integer NOT NULL DEFAULT 0,
    PRIMARY KEY (period, period_key)
);

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_daily  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_active ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.usage_events IS '사용성 원시 이벤트 — 개인 식별자·IP·쿠키 미저장, 날짜별 HMAC 만. 보존 기간 경과분은 야간 삭제. 서비스 롤 전용.';
COMMENT ON TABLE public.usage_daily  IS '사용성 일자·이벤트별 집계. 영구. 서비스 롤 전용.';
COMMENT ON TABLE public.usage_active IS '사용성 일·주·월 활성 사용자 수. 영구. 서비스 롤 전용.';

COMMIT;
