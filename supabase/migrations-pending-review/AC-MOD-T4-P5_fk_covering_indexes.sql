-- =============================================================================
-- AC-MOD-T4-P5 — Covering indexes for advisor-flagged unindexed foreign keys
-- STATUS: READY FOR REVIEW — *** DO NOT AUTO-APPLY *** (no DB write channel for agents)
-- Plan: .ai/03_plans/2026-06-13-Shared-Link-Improvement-Plan/05_DATABASE_AUDIT.md §4-A P5
--
-- Speeds cascade-delete + reverse lookups on FK columns that lacked dedicated indexes.
-- Each statement uses CONCURRENTLY so it does not block reads/writes on the table.
-- Run this unit after additive index units; the FK drop unit P2 runs last.
--
-- CONCURRENTLY statements must run outside an explicit transaction block.
-- =============================================================================

-- PRE-FLIGHT: list existing indexes on the target columns to avoid duplicates.
--   SELECT tablename, indexname
--   FROM pg_indexes
--   WHERE schemaname = 'public'
--     AND tablename IN ('project_publications', 'shared_link_events', 'shared_link_recipients')
--     AND indexname IN (
--       'project_publications_published_by_idx',
--       'project_publications_workspace_idx',
--       'shared_link_events_recipient_idx',
--       'shared_link_recipients_invited_by_idx'
--     );

CREATE INDEX CONCURRENTLY IF NOT EXISTS project_publications_published_by_idx
  ON public.project_publications (published_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS project_publications_workspace_idx
  ON public.project_publications (workspace_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS shared_link_events_recipient_idx
  ON public.shared_link_events (recipient_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS shared_link_recipients_invited_by_idx
  ON public.shared_link_recipients (invited_by);

-- POST-CHECK: confirm all four indexes exist and are valid.
--   SELECT indexname, indexdef
--   FROM pg_indexes
--   WHERE schemaname = 'public'
--     AND indexname IN (
--       'project_publications_published_by_idx',
--       'project_publications_workspace_idx',
--       'shared_link_events_recipient_idx',
--       'shared_link_recipients_invited_by_idx'
--     );

-- ROLLBACK (run each CONCURRENTLY outside a transaction):
--   DROP INDEX CONCURRENTLY IF EXISTS public.project_publications_published_by_idx;
--   DROP INDEX CONCURRENTLY IF EXISTS public.project_publications_workspace_idx;
--   DROP INDEX CONCURRENTLY IF EXISTS public.shared_link_events_recipient_idx;
--   DROP INDEX CONCURRENTLY IF EXISTS public.shared_link_recipients_invited_by_idx;
