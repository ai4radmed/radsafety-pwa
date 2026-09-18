-- 2계층(공개/회원) + 가입 대기승인 + 회원 제재 모델, Phase 1(스키마).
-- 근거: documents/privacy_redesign_plan.md 2단계(개정) — KSNM 방안위 교육팀
-- 합의(2026-09-10, 천인국·최병욱)를 승계한 안. 전체 위원회 승인은 2026-09-16
-- 제5차 방안위 회의.
--
-- profiles.status: 회원 상태.
--   - 'pending'   : 가입만 하고 관리자 승인 전(회원 계층 기능 접근 불가 — 지적사례
--                   상세·자료실 업로드·제도개선 제안·푸시 알림 등). 봇 가입은 여기서 멈춘다.
--   - 'active'    : 승인된 정상 회원.
--   - 'suspended' : 관리자가 일시 정지.
--   - 'banned'    : 관리자가 영구 탈퇴 처리.
--   기존 행은 전부 'active'로 시작한다 — 이미 활동 중인 사용자(알파테스터 등)가
--   이 마이그레이션 때문에 갑자기 잠기면 안 되기 때문. 앞으로 새로 생성되는 계정만
--   애플리케이션 코드(signUpWithUsername 등)가 명시적으로 'pending'을 넣는다(Phase 2).
--
-- profiles.hospital_id: src/data/hospitals.ts 의 id 값을 저장. DB 외래키가 아니다 —
-- 목록 자체가 정적 코드 파일로 관리되기 때문(documents/privacy_redesign_plan.md §2-3).
--
-- 멱등 — 재실행 안전.

BEGIN;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'profiles_status_check'
          AND conrelid = 'public.profiles'::regclass
    ) THEN
        ALTER TABLE public.profiles
            ADD CONSTRAINT profiles_status_check
            CHECK (status IN ('pending', 'active', 'suspended', 'banned'));
    END IF;
END $$;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS hospital_id text;

COMMIT;
