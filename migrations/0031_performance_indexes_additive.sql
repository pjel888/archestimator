-- 0031_performance_indexes_additive.sql
-- Archestimator D1 performance index (WP-P1-02 of 2026-07-04 Performance Optimization plan).
-- Verified by EXPLAIN QUERY PLAN against ARCH_DB local preview on 2026-07-05
-- (see .ai/03_plans/2026-07-04-Performance-Optimization/_evidence/phase-1/explain-before-20260705.md).
--
-- Captured EXPLAIN-before showed FULL TABLE SCAN + TEMP B-TREE FOR ORDER BY on:
--   SELECT * FROM projects WHERE workspace_id = ? ORDER BY updated_at DESC
--
-- Source queries that benefit (verified against actual SQL in
-- src/lib/repositories/workspace-repository.ts on 2026-07-05;
-- line numbers confirmed by santa-loop round 2 review):
--   - line 1405-1406: WHERE workspace_id = ? ORDER BY updated_at DESC
--   - line 2044-2045: WHERE workspace_id = ? ORDER BY updated_at DESC LIMIT ?
--
-- The composite (workspace_id, updated_at DESC) eliminates both the SCAN and
-- the TEMP B-TREE FOR ORDER BY: the index is sorted by workspace_id (filter)
-- then updated_at DESC (order), so a single index walk produces the result.
--
-- ponytail: the originally-proposed (workspace_id, created_at DESC) shape was
-- wrong — actual queries ORDER BY updated_at, not created_at. The originally-
-- proposed idx_projects_created_by and idx_workspaces_created_by were disproven:
-- no SQL filter uses created_by; it is only read in JavaScript after the row
-- is fetched. They are intentionally omitted from this migration.
--
-- Additive only. No DROP, no RECREATE, no schema change. Safe to apply and
-- safe to leave in place if rolled back (DROP INDEX idx_projects_workspace_updated
-- would be the rollback).

CREATE INDEX IF NOT EXISTS idx_projects_workspace_updated
  ON projects(workspace_id, updated_at DESC);
