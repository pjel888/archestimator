-- Library Optimization Plan P2 T9 (F12)
-- Adds the missing (workspace_id, updated_at desc) index that the Library Overview
-- recents / last-update query needs. Without it the Overview sort is a filter + sort
-- on the full workspace slice; with it the planner can use an index scan.
--
-- Relax-only / additive (CREATE INDEX IF NOT EXISTS) → zero data loss, fully reversible
-- (DROP INDEX). On the live 154-row table the build is effectively instant; at scale
-- prefer CONCURRENTLY (cannot run inside a migration transaction — run standalone).
--
-- GATED (08 Q4 / 06 §G): apply only after the owner approves the P2 program and the
-- before/after EXPLAIN is captured on the PG17 prove-harness.
--
-- Proof to capture before/after apply:
--   explain (analyze, buffers)
--   select * from public.cost_library_items
--   where workspace_id = '<ws>' order by updated_at desc limit 12;
--   -- expect: Seq/Bitmap scan + Sort  ->  Index Scan using cost_library_items_workspace_updated_idx
--
-- Rollback: drop index if exists public.cost_library_items_workspace_updated_idx;

create index if not exists cost_library_items_workspace_updated_idx
  on public.cost_library_items (workspace_id, updated_at desc);
