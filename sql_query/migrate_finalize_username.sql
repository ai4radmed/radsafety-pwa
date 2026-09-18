-- Stage 1-C (이메일 OTP 로그인 제거, documents/privacy_redesign_plan.md 1단계 "빼기").
-- 전환 기간(Stage B, 배포 후 첫 접속 시 즉시 강제 전환 — 2026-09-16 설계 개정)에도
-- 끝내 username 을 정하지 않은 계정(비활성·미접속)을 마감 처리하고 username 을
-- NOT NULL 로 조인다. migrate_add_username.sql 이 남겨둔 미완결을 마무리한다.
--
-- 처리 대상 = profiles.username IS NULL 인 행. 이들은 이메일 OTP 로만 로그인했고
-- 비밀번호를 설정한 적이 없다 — OTP UI 가 이 마이그레이션과 같은 배포에서 삭제되므로,
-- 플레이스홀더 아이디를 부여해 NOT NULL 제약을 만족시키되 실제 로그인 수단은
-- 남겨두지 않는다(재가입하려면 새 auth.users.id 로 새 계정을 만들어야 함 — 의도된
-- 잠금. 옛 글은 user_id 가 끊긴 채 남는다, privacy_redesign_plan.md "미전환 사용자
-- 처리" 참조).
--
-- ⚠️ 실행 전 DB 백업 1회 필수(개인정보 포함, 보관 기간·파기일 명시) —
-- privacy_redesign_plan.md 1단계 "C 가 유일한 비가역 지점". Supabase Dashboard >
-- Database > Backups, 또는 Dr. Ben 판단 경로.
--
-- ⚠️ Dr. Ben 수동 실행 전용 — 다른 sql_query/migrate_*.sql 과 같은 관례대로 이 저장소의
-- CI/CD 는 이 파일을 자동 실행하지 않는다. Supabase SQL Editor에서 직접 실행할 것.
--
-- 멱등 — 이미 처리된 행(username 이 아래 패턴으로 채워진 행)은 두 UPDATE 모두 재실행해도
-- 대상 0건이라 안전.

BEGIN;

-- 1. 미전환 계정에 잠금용 플레이스홀더 아이디 부여.
--    'u_' + id 앞 8자(hex, 소문자) — profiles_username_format_check([a-z0-9_-]{3,20})를
--    통과하고, uuid 앞 8자 충돌 확률은 무시 가능한 수준(uuid 128비트 중 32비트).
UPDATE public.profiles
SET username = 'u_' || substr(id::text, 1, 8)
WHERE username IS NULL;

-- 2. 같은 계정들의 auth.users.email 도 가짜 값으로 교체 — 혹시 남아있을 이메일
--    발송 경로(관리 콘솔 등)로도 실사용자에게 도달 불가능하게 한다.
UPDATE auth.users AS u
SET email = 'u_' || substr(u.id::text, 1, 8) || '@radsafety.invalid'
FROM public.profiles AS p
WHERE p.id = u.id
    AND p.username = 'u_' || substr(p.id::text, 1, 8)
    AND u.email NOT LIKE '%@radsafety.invalid';

-- 3. username 을 NOT NULL 로 조인다 — 1번 이후엔 NULL 행이 없어야 성공한다.
ALTER TABLE public.profiles
    ALTER COLUMN username SET NOT NULL;

COMMIT;
