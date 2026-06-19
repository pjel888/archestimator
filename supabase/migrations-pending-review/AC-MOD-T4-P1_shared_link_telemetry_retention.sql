-- =============================================================================
-- AC-MOD-T4-P1 — Telemetry retention for shared-link event tables
-- STATUS: READY FOR REVIEW — *** DO NOT AUTO-APPLY *** (no DB write channel for agents)
-- Plan: .ai/03_plans/2026-06-13-Shared-Link-Improvement-Plan/05_DATABASE_AUDIT.md §4-A P1
--
-- Prunes append-only raw telemetry rows. The durable manager metrics (open_count,
-- latest_opened_at) live on project_publications, and decisions/comments are in their
-- own tables, so pruning raw events is safe.
--
-- The pg_cron schedule is COMMENTED OUT by default. A human DBA must:
--   1. Size the retention window from measured event growth (AC-DB-06).
--   2. Ensure pg_cron is enabled on the target project.
--   3. Uncomment the schedule block and run it once after validating the DELETE.
--
-- Target: project `ebxxqidacheyapmmzavr` only when explicitly authorized.
-- =============================================================================

-- PRE-FLIGHT: count rows that would be pruned at the chosen window.
--   SELECT count(*) AS rows_to_prune
--   FROM public.project_publication_events
--   WHERE created_at < now() - interval '180 days';
--   SELECT count(*) AS rows_to_prune
--   FROM public.shared_link_events
--   WHERE created_at < now() - interval '180 days';

BEGIN;

DELETE FROM public.project_publication_events WHERE created_at < now() - interval '180 days';
DELETE FROM public.shared_link_events        WHERE created_at < now() - interval '180 days';

COMMIT;

-- pg_cron schedule (uncomment only after pre-flight validation and target confirmation):
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule(
--   'shared-link-telemetry-retention',
--   '15 3 * * *',
--   $$
--     DELETE FROM public.project_publication_events WHERE created_at < now() - interval '180 days';
--     DELETE FROM public.shared_link_events        WHERE created_at < now() - interval '180 days';
--   $$
-- );

-- POST-CHECK: confirm no rows older than the retention window remain.
--   SELECT count(*) AS stale_rows
--   FROM public.project_publication_events
--   WHERE created_at < now() - interval '180 days';
--   SELECT count(*) AS stale_rows
--   FROM public.shared_link_events
--   WHERE created_at < now() - interval '180 days';

-- ROLLBACK (data only; the DELETE cannot be undone without a backup):
--   Restore from logical/PITR backup taken before the prune window.
--   Schedule removal: SELECT cron.unschedule('shared-link-telemetry-retention');
