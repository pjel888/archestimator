-- Estimates List Page Performance Optimization — P2-3 (finding F10).
--
-- RLS initplan caching: wrap bare `auth.uid()` as `(select auth.uid())` so the
-- planner evaluates the current user once per query (an InitPlan) instead of once
-- per scanned row.
--
-- Scope note (concurrent-agent reconciliation): the Teamspace plan's migration
-- 20260614120100_teamspace_rls_authuid_perf.sql already applied this exact rewrite
-- to can_access_estimate and current_project_access_rank (and many sibling
-- collaboration helpers) — byte-identical to what this plan intended. The ONLY
-- estimate-access helper it did NOT cover is `is_workspace_member`, so this
-- migration completes F10 by rewriting just that one. Body is otherwise
-- BYTE-IDENTICAL to its definition in 20260518090000_archestimator_core_schema.sql;
-- only the auth.uid() call site is wrapped. Signature, `security definer`,
-- `set search_path`, and `stable` are unchanged. Access decisions are proven
-- identical for owner / sheet-collaborator / non-member by
-- scripts/prove-rls-initplan-postgres.mjs.

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = (select auth.uid())
  );
$$;
