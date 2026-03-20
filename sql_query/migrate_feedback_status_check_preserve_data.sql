-- Preserve-data migration: expand feedback.status CHECK constraint only.
-- Use this when the existing environment must keep data and you cannot run:
--   sql_query/rebuild_all_tables.sql
--
-- Expected existing constraint name:
--   feedback_status_check
--
-- Target allowed values (compatible with the app UI):
--   reviewing, on_hold, completed
-- plus legacy values that may already exist in production data:
--   pending, processing, resolved, reflected

BEGIN;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'feedback_status_check'
          AND conrelid = 'public.feedback'::regclass
    ) THEN
        ALTER TABLE public.feedback DROP CONSTRAINT feedback_status_check;
    END IF;
END $$;

ALTER TABLE public.feedback
    ADD CONSTRAINT feedback_status_check
    CHECK (
        status IN (
            'reviewing',
            'on_hold',
            'completed',
            'pending',
            'processing',
            'resolved',
            'reflected'
        )
    );

-- Optional (safe): keep/align the default with the app's expectation.
-- Does not change existing rows.
ALTER TABLE public.feedback
    ALTER COLUMN status SET DEFAULT 'reviewing';

COMMIT;

