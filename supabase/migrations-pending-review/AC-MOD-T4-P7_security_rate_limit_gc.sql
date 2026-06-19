-- =============================================================================
-- AC-MOD-T4-P7 — Scheduled GC for security_rate_limit_events
-- STATUS: READY FOR REVIEW — *** DO NOT AUTO-APPLY *** (no DB write channel for agents)
-- Plan: .ai/03_plans/2026-06-13-Shared-Link-Improvement-Plan/05_DATABASE_AUDIT.md §4-A P7
--
-- Replaces the lazy in-app delete with deterministic cleanup of expired rate-limit
-- windows. The table already has an index on expires_at (security_rate_limit_events_expiry_idx).
--
-- The pg_cron schedule is COMMENTED OUT by default. A human DBA must:
--   1. Ensure pg_cron is enabled on the target project.
--   2. Uncomment the schedule block after validating the DELETE once.
--
-- Target: project `ebxxqidacheyapmmzavr` only when explicitly authorized.
-- =============================================================================

-- PRE-FLIGHT: count rows that would be pruned.
--   SELECT count(*) AS rows_to_prune
--   FROM public.security_rate_limit_events
--   WHERE expires_at < now();

BEGIN;

DELETE FROM public.security_rate_limit_events WHERE expires_at < now();

COMMIT;

-- pg_cron schedule (uncomment only after pre-flight validation and target confirmation):
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule(
--   'security-rate-limit-gc',
--   '*/30 * * * *',
--   $$ DELETE FROM public.security_rate_limit_events WHERE expires_at < now(); $$
-- );

-- POST-CHECK: confirm no expired rows remain.
--   SELECT count(*) AS stale_rows
--   FROM public.security_rate_limit_events
--   WHERE expires_at < now();

-- ROLLBACK (data only; the DELETE cannot be undone without a backup):
--   Restore from logical/PITR backup taken before the prune window.
--   Schedule removal: SELECT cron.unschedule('security-rate-limit-gc');
