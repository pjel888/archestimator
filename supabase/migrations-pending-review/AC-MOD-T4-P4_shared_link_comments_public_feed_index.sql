-- =============================================================================
-- AC-MOD-T4-P4 — Covering index for the public shared-link comment feed
-- STATUS: READY FOR REVIEW — *** DO NOT AUTO-APPLY *** (no DB write channel for agents)
-- Plan: .ai/03_plans/2026-06-13-Shared-Link-Improvement-Plan/05_DATABASE_AUDIT.md §4-A P4
--
-- Query shape served: publication_id = ? AND is_internal = false ORDER BY created_at.
-- The partial index keeps writes/space bounded because internal owner notes are excluded.
--
-- CONCURRENTLY note: safe to run outside a maintenance window; kept unconditional for
-- a simple create because the table is small. For a large table, prefer CONCURRENTLY.
-- =============================================================================

-- PRE-FLIGHT: confirm the index does not already exist.
--   SELECT indexrelname FROM pg_stat_user_indexes
--   WHERE indexrelname = 'shared_link_comments_public_feed_idx';

CREATE INDEX IF NOT EXISTS shared_link_comments_public_feed_idx
  ON public.shared_link_comments (publication_id, created_at)
  WHERE is_internal = false;

-- POST-CHECK: verify the partial index exists with the expected predicate.
--   SELECT indexdef
--   FROM pg_indexes
--   WHERE schemaname = 'public'
--     AND tablename = 'shared_link_comments'
--     AND indexname = 'shared_link_comments_public_feed_idx';

-- ROLLBACK:
--   DROP INDEX IF EXISTS public.shared_link_comments_public_feed_idx;
