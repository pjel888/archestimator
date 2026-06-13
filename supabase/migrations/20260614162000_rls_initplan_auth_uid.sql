-- Estimates List Page Performance Optimization — P2-3 (finding F10).
--
-- RLS initplan caching: wrap bare `auth.uid()` as `(select auth.uid())` inside the
-- estimate-access helper functions so the planner evaluates the current user once
-- per query (an InitPlan) instead of once per scanned row. On the list page these
-- helpers gate every estimate_node and estimate_row_item row, so the per-row tax
-- grows linearly with estimate size; the documented Supabase speedup is multi-x on
-- large RLS scans.
--
-- The bodies are otherwise BYTE-IDENTICAL to their current definitions
-- (can_access_estimate: 20260601151500; current_project_access_rank +
-- is_workspace_member: 20260526142913 / core 20260518090000). Signatures,
-- `security definer`, `set search_path`, `stable`, and the access logic are
-- unchanged — only the auth.uid() call sites are wrapped. Access decisions are
-- proven identical for owner / collaborator / non-member by
-- scripts/prove-rls-initplan-postgres.mjs before this is applied to the hosted DB.

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

create or replace function public.current_project_access_rank(target_project_id uuid)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select greatest(
    case when public.is_platform_admin() then 100 else 0 end,
    coalesce((
      select max(case wm.role
        when 'owner' then 40
        when 'admin' then 30
        when 'member' then 20
        when 'viewer' then 10
        else 0
      end)
      from public.projects p
      join public.workspace_members wm on wm.workspace_id = p.workspace_id
      where p.id = target_project_id
        and wm.user_id = (select auth.uid())
    ), 0),
    coalesce((
      select max(public.collaboration_role_rank(pm.role))
      from public.project_members pm
      where pm.project_id = target_project_id
        and pm.user_id = (select auth.uid())
    ), 0)
  );
$$;

create or replace function public.can_access_estimate(target_estimate_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_platform_admin()
  or exists (
    select 1
    from public.estimate_sheet_members esm
    where esm.estimate_id = target_estimate_id
      and esm.user_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.estimates e
    where e.id = target_estimate_id
      and public.estimate_inherits_project_access(e.id)
      and public.current_project_access_rank(e.project_id) > 0
  );
$$;
