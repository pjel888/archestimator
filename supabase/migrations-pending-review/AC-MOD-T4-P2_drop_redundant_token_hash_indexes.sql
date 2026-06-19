-- =============================================================================
-- AC-MOD-T4-P2 — Drop redundant token-hash indexes
-- STATUS: READY FOR REVIEW — *** DO NOT AUTO-APPLY *** (no DB write channel for agents)
-- Plan: .ai/03_plans/2026-06-13-Shared-Link-Improvement-Plan/05_DATABASE_AUDIT.md §4-A P2
--
-- token_hash and recipient_token_hash already have UNIQUE indexes that serve every
-- lookup, so the plain duplicate indexes are write-amplification only. This unit MUST
-- be applied LAST, after EXPLAIN and pg_stat_user_indexes confirm idx_scan = 0 for BOTH.
--
-- CONCURRENTLY statements must run outside an explicit transaction block.
-- =============================================================================

-- PRE-FLIGHT (mandatory — verify zero scans before dropping):
--   SELECT relname AS table, indexrelname AS index, idx_scan
--   FROM pg_stat_user_indexes
--   WHERE indexrelname IN ('project_publications_token_hash_idx', 'shared_link_recipients_token_hash_idx');
-- Both rows must show idx_scan = 0.

-- Also confirm the unique indexes still exist and will continue to enforce/token lookups.
--   SELECT indexname
--   FROM pg_indexes
--   WHERE schemaname = 'public'
--     AND tablename IN ('project_publications', 'shared_link_recipients')
--     AND indexdef LIKE '%UNIQUE%token_hash%';

DROP INDEX CONCURRENTLY IF EXISTS public.project_publications_token_hash_idx;
DROP INDEX CONCURRENTLY IF EXISTS public.shared_link_recipients_token_hash_idx;

-- POST-CHECK: verify the redundant indexes are gone and the unique indexes remain.
--   SELECT indexrelname, idx_scan
--   FROM pg_stat_user_indexes
--   WHERE indexrelname IN ('project_publications_token_hash_idx', 'shared_link_recipients_token_hash_idx');
-- Should return zero rows.

-- ROLLBACK (run CONCURRENTLY outside a transaction):
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS project_publications_token_hash_idx
--     ON public.project_publications (token_hash);
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS shared_link_recipients_token_hash_idx
--     ON public.shared_link_recipients (recipient_token_hash);
