-- Preserve-data migration: allow authenticated users to view only reviewed feedback
-- without running rebuild_all_tables.sql.
--
-- Rule:
-- - Show to authenticated users only rows where admin_note is present (non-null and non-empty).
-- - Existing "Users can view own feedback" policy remains; this adds an additional visibility condition.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'feedback'
          AND policyname = 'Users can view reviewed feedback'
    ) THEN
        CREATE POLICY "Users can view reviewed feedback"
            ON public.feedback
            FOR SELECT
            TO authenticated
            USING (admin_note IS NOT NULL AND admin_note <> '');
    END IF;
END $$;

