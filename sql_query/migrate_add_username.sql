-- Stage 1-A (username/password login): add profiles.username.
-- See documents/privacy_redesign_plan.md 1단계.
--
-- Nullable during the transition period (Stage B) — existing email/Kakao users
-- keep working until they claim a username. Stage C (migrate_finalize_username.sql,
-- not yet written) will set NOT NULL once the transition window closes.
--
-- Idempotent — safe to re-run.

BEGIN;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS username text;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'profiles_username_key'
          AND conrelid = 'public.profiles'::regclass
    ) THEN
        ALTER TABLE public.profiles
            ADD CONSTRAINT profiles_username_key UNIQUE (username);
    END IF;
END $$;

-- Server code always lowercases before writing (see src/actions/index.ts
-- usernameSchema), so a plain (non-citext) UNIQUE constraint is enough —
-- no stored value should ever contain uppercase.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'profiles_username_format_check'
          AND conrelid = 'public.profiles'::regclass
    ) THEN
        ALTER TABLE public.profiles
            ADD CONSTRAINT profiles_username_format_check
            CHECK (username IS NULL OR username ~ '^[a-z0-9_-]{3,20}$');
    END IF;
END $$;

COMMIT;
