-- Enforce closed-beta authorization at the database/RLS boundary.
--
-- The app already redirects non-allowlisted users, but direct Supabase Data API
-- calls use the authenticated JWT and bypass the Next.js proxy/session helpers.
-- Keep the beta decision server-side by folding it into the central RLS helper
-- functions and the workspace bootstrap policy.

create or replace function public.has_closed_beta_access()
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1
    from public.closed_beta_allowed_emails beta
    where beta.normalized_email = lower(btrim(coalesce((select auth.jwt()) ->> 'email', '')))
      and beta.status in ('invited', 'active')
  );
$$;

revoke all on function public.has_closed_beta_access() from public, anon, authenticated;
grant execute on function public.has_closed_beta_access() to authenticated;

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.has_closed_beta_access()
  and exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_workspace_admin(target_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.has_closed_beta_access()
  and exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = (select auth.uid())
      and wm.role in ('owner', 'admin')
  );
$$;

create or replace function public.is_workspace_editor(target_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.has_closed_beta_access()
  and (
    public.is_platform_admin()
    or exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = target_workspace_id
        and wm.user_id = (select auth.uid())
        and wm.role in ('owner', 'admin', 'member')
    )
  );
$$;

create or replace function public.current_project_access_rank(target_project_id uuid)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select case
    when not public.has_closed_beta_access() then 0
    else greatest(
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
    )
  end;
$$;

create or replace function public.can_access_project(target_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.has_closed_beta_access()
  and (
    public.is_platform_admin()
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
    )
  );
$$;

create or replace function public.can_edit_project(target_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.has_closed_beta_access()
  and (
    public.is_platform_admin()
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
    )
  );
$$;

create or replace function public.can_access_estimate(target_estimate_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.has_closed_beta_access()
  and (
    public.is_platform_admin()
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
    )
  );
$$;

create or replace function public.can_edit_estimate(target_estimate_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.has_closed_beta_access()
  and (
    public.is_platform_admin()
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
    )
  );
$$;

create or replace function public.current_estimate_access_rank(target_estimate_id uuid)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select case
    when not public.has_closed_beta_access() then 0
    else greatest(
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
    )
  end;
$$;

alter policy "authenticated users can create owned workspaces"
on public.workspaces
with check (created_by = (select auth.uid()) and public.has_closed_beta_access());
