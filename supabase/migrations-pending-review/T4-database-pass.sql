-- =============================================================================
-- Track T4 — Shared-Link Database Pass (index hygiene, RLS, retention, GC, guardrail)
-- STATUS: READY FOR REVIEW — *** DO NOT AUTO-APPLY *** (no DB write channel for agents)
-- Plan: .ai/03_plans/2026-06-13-Shared-Link-Improvement-Plan/05_DATABASE_AUDIT.md §4-A
--
-- All items are ADDITIVE + backward-compatible (except the P2 drops, which are gated on a
-- verified-zero-scan pre-flight). A human DBA reviews each section, runs its pre-flight, applies
-- it in a maintenance window, then moves the applied section into supabase/migrations/ with a
-- fresh timestamp. Sections are independent; apply in the order P3 → P4 → P5 → P1 → P7 → P6 → P2
-- (additive first; the index drops last, only after EXPLAIN confirms they are unused).
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- P3 — RLS-as-defense-in-depth on project_publication_events  (DB-03 / symmetry)
-- The owner activity feed reads telemetry only via the service role today; mirror the
-- shared_link_events manager-read policy so a non-service-role read is also gated.
-- ─────────────────────────────────────────────────────────────────────────────
-- Pre-flight: confirm RLS is enabled and no permissive anon/authenticated policy exists.
--   SELECT relrowsecurity FROM pg_class WHERE oid = 'public.project_publication_events'::regclass;
CREATE POLICY "project publication managers can read publication events"
  ON public.project_publication_events
  FOR SELECT
  TO authenticated
  USING (
    publication_id IN (
      SELECT id FROM public.project_publications
      WHERE public.can_manage_project_publication(project_id)
    )
  );
GRANT SELECT ON TABLE public.project_publication_events TO authenticated;
-- ROLLBACK:
--   REVOKE SELECT ON TABLE public.project_publication_events FROM authenticated;
--   DROP POLICY "project publication managers can read publication events" ON public.project_publication_events;


-- ─────────────────────────────────────────────────────────────────────────────
-- P4 — Covering index for the public comment read  (DB-04)
-- Public feed reads `publication_id = ? AND is_internal = false ORDER BY created_at`.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS shared_link_comments_public_feed_idx
  ON public.shared_link_comments (publication_id, created_at)
  WHERE is_internal = false;
-- ROLLBACK: DROP INDEX IF EXISTS public.shared_link_comments_public_feed_idx;


-- ─────────────────────────────────────────────────────────────────────────────
-- P5 — FK covering indexes (advisor-flagged unindexed FKs)  (DB-03)
-- Speeds cascade-delete + reverse lookups. CONCURRENTLY (run outside a txn block).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS project_publications_published_by_idx
  ON public.project_publications (published_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS project_publications_workspace_idx
  ON public.project_publications (workspace_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS shared_link_events_recipient_idx
  ON public.shared_link_events (recipient_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS shared_link_recipients_invited_by_idx
  ON public.shared_link_recipients (invited_by);
-- ROLLBACK: DROP INDEX CONCURRENTLY IF EXISTS public.<each>_idx;


-- ─────────────────────────────────────────────────────────────────────────────
-- P1 — Event retention for the append-only telemetry tables  (DB-01)
-- The durable manager metrics (open_count, latest_opened_at) live on project_publications,
-- and decisions/comments are in their OWN tables — so pruning RAW telemetry rows is safe.
-- Size the window (N days) from the measured event-growth rate (AC-DB-06) before enabling.
-- Requires pg_cron.
-- ─────────────────────────────────────────────────────────────────────────────
-- CREATE EXTENSION IF NOT EXISTS pg_cron;  -- if not already enabled
-- Manual prune (run once to validate, then schedule):
--   DELETE FROM public.project_publication_events WHERE created_at < now() - interval '180 days';
--   DELETE FROM public.shared_link_events        WHERE created_at < now() - interval '180 days';
-- Schedule daily at 03:15 UTC:
-- SELECT cron.schedule(
--   'shared-link-telemetry-retention',
--   '15 3 * * *',
--   $$
--     DELETE FROM public.project_publication_events WHERE created_at < now() - interval '180 days';
--     DELETE FROM public.shared_link_events        WHERE created_at < now() - interval '180 days';
--   $$
-- );
-- ROLLBACK: SELECT cron.unschedule('shared-link-telemetry-retention');
-- (Option B — native RANGE partitioning by month + detach/drop — is a heavier table rewrite;
--  defer until event volume justifies it. See 05_DATABASE_AUDIT.md §4-A Option B.)


-- ─────────────────────────────────────────────────────────────────────────────
-- P7 — Scheduled GC for security_rate_limit_events (replace lazy delete)  (DB-10)
-- Deterministic cleanup of expired rate-limit windows. Requires pg_cron.
-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT cron.schedule(
--   'security-rate-limit-gc',
--   '*/30 * * * *',
--   $$ DELETE FROM public.security_rate_limit_events WHERE expires_at < now(); $$
-- );
-- ROLLBACK: SELECT cron.unschedule('security-rate-limit-gc');


-- ─────────────────────────────────────────────────────────────────────────────
-- P6 — Snapshot size guardrail  (DB-02)
-- Bound the worst case of the whole-document snapshot_json read/rebuild. Two options:
--   (a) add a generated/маintained snapshot_size_bytes column + a CHECK or an app-side warn;
--   (b) enforce a max estimates/rows-per-snapshot at publish time (app-side; no DDL).
-- DDL sketch for (a):
-- ALTER TABLE public.project_publications
--   ADD COLUMN IF NOT EXISTS snapshot_size_bytes integer
--   GENERATED ALWAYS AS (octet_length(snapshot_json::text)) STORED;
-- -- Then alert/monitor on snapshot_size_bytes; a hard CHECK risks blocking legitimate large
-- -- proposals, so prefer a monitored soft cap unless a real ceiling is agreed.
-- ROLLBACK: ALTER TABLE public.project_publications DROP COLUMN IF EXISTS snapshot_size_bytes;


-- ─────────────────────────────────────────────────────────────────────────────
-- P2 — Drop redundant indexes  (DB-07/08) — APPLY LAST, GATED ON ZERO SCANS
-- token_hash and recipient_token_hash already have UNIQUE indexes that serve every lookup,
-- so the plain duplicates are write-amplification only. *** Pre-flight is mandatory. ***
-- ─────────────────────────────────────────────────────────────────────────────
-- PRE-FLIGHT (must show idx_scan = 0 for BOTH before dropping):
--   SELECT relname AS table, indexrelname AS index, idx_scan
--   FROM pg_stat_user_indexes
--   WHERE indexrelname IN ('project_publications_token_hash_idx', 'shared_link_recipients_token_hash_idx');
-- Then:
-- DROP INDEX CONCURRENTLY IF EXISTS public.project_publications_token_hash_idx;     -- token_hash is already UNIQUE
-- DROP INDEX CONCURRENTLY IF EXISTS public.shared_link_recipients_token_hash_idx;   -- recipient_token_hash is already UNIQUE
-- ROLLBACK: recreate the dropped index (CREATE INDEX CONCURRENTLY ... ) if a regression appears.


-- ─────────────────────────────────────────────────────────────────────────────
-- OPT-7 / OPT-10 (from 04_PERFORMANCE_AUDIT.md) — heavier DB units, design only
-- - OPT-7: snapshot row de-dup + a `snapshot_hash` column so unchanged republishes reuse bytes
--   (versioned; needs an app-side hash-on-publish + a read path that joins on hash). Larger.
-- - OPT-10: a unified activity RPC / UNION ALL view so the owner feed sorts/limits DB-side
--   instead of merging 4 result sets in app code (loadSharedLinkActivity). Larger.
-- Both are deferred beyond this hygiene pass; design them when the DB pass is genuinely opened.
-- =============================================================================
