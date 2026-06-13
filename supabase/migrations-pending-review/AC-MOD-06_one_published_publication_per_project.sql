-- =============================================================================
-- AC-MOD-06 — At most one live (status='published') publication per project
-- STATUS: READY FOR REVIEW — *** DO NOT AUTO-APPLY *** (no DB write channel for agents)
-- Plan: .ai/03_plans/2026-06-13-Shared-Link-Improvement-Plan/13_OWNER_MODAL_FUNCTIONAL_AUDIT.md §3.4
-- -----------------------------------------------------------------------------
-- PROBLEM (MOD-RACE-04, window B)
--   Only a NON-unique index exists today:
--     project_publications_project_status_idx ON (project_id, status, published_at desc)
--     (migration 20260527120000_project_client_publication.sql:40).
--   There is no partial unique index `(project_id) WHERE status='published'`, so two
--   concurrent create/rotate calls can both INSERT a 'published' row, leaving an
--   invisible-but-live orphan publication the owner cannot turn off from the modal
--   (readers pick the newest by published_at desc limit 1).
--
-- APP-SIDE MITIGATION ALREADY SHIPPED
--   Rotate now updates the token IN PLACE on the existing row (AC-MOD-02), which
--   removes the most common duplicate-producing path. This index is the durable
--   DB-level guarantee that closes the remaining concurrent-create race.
--
-- !!! PRE-FLIGHT IS MANDATORY !!!
--   A partial UNIQUE index creation FAILS if duplicates already exist. Run step 0,
--   reconcile any duplicates (step 0b), confirm zero, THEN create the index (step 1).
-- =============================================================================

-- STEP 0 — detect existing duplicates (must return ZERO rows before step 1):
--   SELECT project_id, count(*) AS live_rows
--   FROM public.project_publications
--   WHERE status = 'published'
--   GROUP BY project_id
--   HAVING count(*) > 1;

-- STEP 0b — reconcile duplicates (ONLY if step 0 returned rows). Keep the newest
--   published row per project, revoke the older duplicates. REVIEW the affected rows
--   before running. Wrap in its own transaction:
--
--   BEGIN;
--   WITH ranked AS (
--     SELECT id,
--            row_number() OVER (PARTITION BY project_id ORDER BY published_at DESC, id DESC) AS rn
--     FROM public.project_publications
--     WHERE status = 'published'
--   )
--   UPDATE public.project_publications p
--   SET status = 'revoked',
--       revoked_at = now(),
--       updated_at = now()
--   FROM ranked
--   WHERE p.id = ranked.id AND ranked.rn > 1;
--   COMMIT;
--   -- Re-run STEP 0; it must now return zero rows.

-- STEP 1 — create the partial unique index.
--   CONCURRENTLY avoids locking writes on a busy table, BUT it cannot run inside a
--   transaction block. If your migration runner wraps statements in a transaction,
--   either run this statement outside that wrapper or drop CONCURRENTLY (accepting a
--   brief lock — the table is small).
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS
  project_publications_one_published_per_project_idx
  ON public.project_publications (project_id)
  WHERE status = 'published';

-- POST-CHECK:
--   SELECT indexname FROM pg_indexes
--   WHERE schemaname = 'public' AND tablename = 'project_publications'
--     AND indexname = 'project_publications_one_published_per_project_idx';

-- FOLLOW-UP (optional, app-side, not in this file): with this index in place, the
--   non-atomic revoke+insert in createProjectPublication can be hardened to an atomic
--   replacement RPC/transaction so a thrown INSERT after the revoke can never leave
--   a project with zero live rows (window A). See 13_OWNER_MODAL_FUNCTIONAL_AUDIT.md §3.4.

-- ROLLBACK:
--   DROP INDEX CONCURRENTLY IF EXISTS public.project_publications_one_published_per_project_idx;
