-- =============================================================================
-- AC-MOD-T4-P6 — Snapshot size guardrail for project_publications
-- STATUS: READY FOR REVIEW — *** DO NOT AUTO-APPLY *** (no DB write channel for agents)
-- Plan: .ai/03_plans/2026-06-13-Shared-Link-Improvement-Plan/05_DATABASE_AUDIT.md §4-A P6
--
-- Adds a generated column that tracks the byte size of snapshot_json so operators can
-- monitor/alert on proposal bloat. A hard CHECK is intentionally NOT included here
-- because a real ceiling must be agreed with the product owner (a hard cap could block
-- legitimate large proposals).
--
-- Alternative considered: enforce max estimates/rows at publish time in app code.
-- This DDL is additive and can coexist with an app-side soft cap later.
-- =============================================================================

-- PRE-FLIGHT: confirm column does not already exist.
--   SELECT column_name
--   FROM information_schema.columns
--   WHERE table_schema = 'public'
--     AND table_name = 'project_publications'
--     AND column_name = 'snapshot_size_bytes';

BEGIN;

ALTER TABLE public.project_publications
  ADD COLUMN IF NOT EXISTS snapshot_size_bytes integer
  GENERATED ALWAYS AS (octet_length(snapshot_json::text)) STORED;

COMMIT;

-- POST-CHECK: verify the generated column and that it tracks non-empty snapshots.
--   SELECT column_name, generation_expression
--   FROM information_schema.columns
--   WHERE table_schema = 'public'
--     AND table_name = 'project_publications'
--     AND column_name = 'snapshot_size_bytes';

-- ROLLBACK:
--   ALTER TABLE public.project_publications DROP COLUMN IF EXISTS snapshot_size_bytes;
