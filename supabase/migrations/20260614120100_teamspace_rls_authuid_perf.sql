-- T2.4 — Teamspace Improvement Plan / findings F-P4, F-P5.
-- Query-plan-only optimization: wrap every bare `auth.uid()` as `(select auth.uid())`
-- inside the collaboration RLS helper functions (and the inline `profiles` SELECT policy)
-- so Postgres caches the value as a one-time initplan instead of re-evaluating it per row.
-- This is the documented Supabase RLS performance anti-pattern fix.
--
-- These are CREATE OR REPLACE reproductions of the function bodies originally defined in
-- 20260526142913_project_sheet_collaboration_access.sql. The LOGIC is byte-for-byte identical
-- to the originals except that each `auth.uid()` now reads `(select auth.uid())`. Column lists,
-- joins, role lists, return types, volatility, and `set search_path` are all preserved exactly.
--
-- Rollback: re-apply the original function/policy bodies from
-- 20260526142913_project_sheet_collaboration_access.sql (they are CREATE OR REPLACE / drop+create,
-- so re-running the original migration restores the prior definitions verbatim).

create or replace function public.is_workspace_editor(target_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_platform_admin()
  or exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = (select auth.uid())
      and wm.role in ('owner', 'admin', 'member')
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

create or replace function public.can_access_project(target_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_platform_admin()
  or exists (
    select 1
    from public.projects p
    join public.workspace_members wm on wm.workspace_id = p.workspace_id
    where p.id = target_project_id
      and wm.user_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.project_members pm
    where pm.project_id = target_project_id
      and pm.user_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.estimate_sheet_members esm
    where esm.project_id = target_project_id
      and esm.user_id = (select auth.uid())
  );
$$;

create or replace function public.can_edit_project(target_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_platform_admin()
  or exists (
    select 1
    from public.projects p
    join public.workspace_members wm on wm.workspace_id = p.workspace_id
    where p.id = target_project_id
      and wm.user_id = (select auth.uid())
      and wm.role in ('owner', 'admin', 'member')
  )
  or exists (
    select 1
    from public.project_members pm
    where pm.project_id = target_project_id
      and pm.user_id = (select auth.uid())
      and pm.role in ('owner', 'admin', 'editor')
  );
$$;

create or replace function public.can_assign_project_role(
  target_project_id uuid,
  target_user_id uuid,
  target_role public.collaboration_role
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.can_manage_project_access(target_project_id)
    and public.collaboration_role_rank(target_role) <= public.current_project_access_rank(target_project_id)
    and (
      target_user_id <> (select auth.uid())
      or public.collaboration_role_rank(target_role) <= coalesce((
        select public.collaboration_role_rank(pm.role)
        from public.project_members pm
        where pm.project_id = target_project_id
          and pm.user_id = (select auth.uid())
      ), public.current_project_access_rank(target_project_id))
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

create or replace function public.can_edit_estimate(target_estimate_id uuid)
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
      and esm.role in ('owner', 'admin', 'editor')
  )
  or exists (
    select 1
    from public.estimates e
    where e.id = target_estimate_id
      and public.estimate_inherits_project_access(e.id)
      and public.can_edit_project(e.project_id)
  );
$$;

create or replace function public.current_estimate_access_rank(target_estimate_id uuid)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select greatest(
    case when public.is_platform_admin() then 100 else 0 end,
    coalesce((
      select max(public.collaboration_role_rank(esm.role))
      from public.estimate_sheet_members esm
      where esm.estimate_id = target_estimate_id
        and esm.user_id = (select auth.uid())
    ), 0),
    coalesce((
      select case
        when public.estimate_inherits_project_access(e.id) then public.current_project_access_rank(e.project_id)
        else 0
      end
      from public.estimates e
      where e.id = target_estimate_id
    ), 0)
  );
$$;

create or replace function public.can_assign_estimate_role(
  target_estimate_id uuid,
  target_user_id uuid,
  target_role public.collaboration_role
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.can_manage_estimate_access(target_estimate_id)
    and public.collaboration_role_rank(target_role) <= public.current_estimate_access_rank(target_estimate_id)
    and (
      target_user_id <> (select auth.uid())
      or public.collaboration_role_rank(target_role) <= coalesce((
        select public.collaboration_role_rank(esm.role)
        from public.estimate_sheet_members esm
        where esm.estimate_id = target_estimate_id
          and esm.user_id = (select auth.uid())
      ), public.current_estimate_access_rank(target_estimate_id))
    );
$$;

create or replace function public.can_change_estimate_access_settings(target_estimate_id uuid, next_inherit_project_access boolean)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select case
    when next_inherit_project_access then public.can_manage_estimate_access(target_estimate_id)
    else public.is_platform_admin()
      or (
        exists (
          select 1
          from public.estimate_sheet_members esm
          where esm.estimate_id = target_estimate_id
            and esm.user_id = (select auth.uid())
            and esm.role in ('owner', 'admin')
        )
        and exists (
          select 1
          from public.estimate_sheet_members esm
          where esm.estimate_id = target_estimate_id
            and esm.role in ('owner', 'admin')
        )
      )
  end;
$$;

-- `auth.uid()` on lines 829/836/844/852 of the original migration lives inside this inline
-- policy USING expression (not a helper function), so the policy is reproduced via drop+create
-- with each `auth.uid()` wrapped. Everything else is verbatim from the original.
drop policy if exists "collaborators can view collaborator profiles" on public.profiles;
create policy "collaborators can view collaborator profiles" on public.profiles
  for select using (
    id = (select auth.uid())
    or public.is_platform_admin()
    or exists (
      select 1
      from public.workspace_members viewer_membership
      join public.workspace_members target_membership
        on target_membership.workspace_id = viewer_membership.workspace_id
      where viewer_membership.user_id = (select auth.uid())
        and target_membership.user_id = profiles.id
    )
    or exists (
      select 1
      from public.project_members viewer_project_membership
      join public.project_members target_project_membership
        on target_project_membership.project_id = viewer_project_membership.project_id
      where viewer_project_membership.user_id = (select auth.uid())
        and target_project_membership.user_id = profiles.id
    )
    or exists (
      select 1
      from public.estimate_sheet_members viewer_sheet_membership
      join public.estimate_sheet_members target_sheet_membership
        on target_sheet_membership.estimate_id = viewer_sheet_membership.estimate_id
      where viewer_sheet_membership.user_id = (select auth.uid())
        and target_sheet_membership.user_id = profiles.id
    )
  );
