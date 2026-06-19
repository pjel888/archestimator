-- =============================================================================
-- AC-MOD-T4-P3 — Manager-read RLS policy for project_publication_events
-- STATUS: READY FOR REVIEW — *** DO NOT AUTO-APPLY *** (no DB write channel for agents)
-- Plan: .ai/03_plans/2026-06-13-Shared-Link-Improvement-Plan/05_DATABASE_AUDIT.md §4-A P3
--
-- Why: the owner activity feed currently reads telemetry via the service role.
-- This policy adds defense-in-depth so a non-service-role authenticated read is
-- also gated to managers of the owning project (mirrors shared_link_events policy).
--
-- Target: project `ebxxqidacheyapmmzavr` only when explicitly authorized.
-- =============================================================================

-- PRE-FLIGHT: confirm RLS is enabled and no conflicting permissive policy exists.
--   SELECT relrowsecurity FROM pg_class WHERE oid = 'public.project_publication_events'::regclass;
--   SELECT polname FROM pg_policy WHERE polrelid = 'public.project_publication_events'::regclass AND polcmd = 'r' AND polpermissive;
--   SELECT has_table_privilege('authenticated', 'public.project_publication_events', 'SELECT');

BEGIN;

DROP POLICY IF EXISTS "project publication managers can read publication events" ON public.project_publication_events;

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

COMMIT;

-- POST-CHECK: verify the policy and table grant exist.
--   SELECT polname, polcmd, polpermissive
--   FROM pg_policy
--   WHERE polrelid = 'public.project_publication_events'::regclass
--     AND polname = 'project publication managers can read publication events';
--   SELECT has_table_privilege('authenticated', 'public.project_publication_events', 'SELECT');

-- ROLLBACK:
--   REVOKE SELECT ON TABLE public.project_publication_events FROM authenticated;
--   DROP POLICY IF EXISTS "project publication managers can read publication events" ON public.project_publication_events;
