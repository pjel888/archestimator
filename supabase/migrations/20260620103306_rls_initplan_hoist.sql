-- RLS initplan hoist for hero-path access helpers.
--
-- Purpose (query-plan-only optimization): wrap the bare `auth.uid()` / `auth.jwt()`
-- calls inside the remaining hero-path RLS helper functions as `(select auth.uid())`
-- / `(select auth.jwt())` so the planner evaluates the current user/JWT ONCE per
-- statement (an InitPlan) instead of once per scanned row.
--
-- This is SEMANTICS-PRESERVING. `auth.uid()` and `auth.jwt()` are row-INDEPENDENT
-- (they read the session JWT, not any table row), so `(select auth.uid())` returns
-- the exact same value as `auth.uid()` for every row. Only the EVALUATION TIMING
-- changes; the boolean each helper returns, and therefore the set of rows every
-- policy admits, is identical before and after.
--
-- Scope: hero tables estimate_nodes / estimate_row_items / estimates / estimate_tabs
-- / projects / workspaces / workspace_members / profiles. Their POLICIES already
-- evaluate `auth.uid()` as `(select auth.uid())` (applied by earlier migrations
-- 20260614140923 / command-split / project-groups), and the per-row, row-DEPENDENT
-- predicates `can_access_estimate(estimate_id)` / `can_edit_estimate(estimate_id)` /
-- `current_project_access_rank(project_id)` / `is_workspace_member(workspace_id)`
-- are inherently per-row and are NOT changed here. The only remaining unwrapped
-- call sites in the hero access path are the bare `auth.uid()` / `auth.jwt()` INSIDE
-- the three helpers below; this migration wraps exactly those.
--
-- Each function body below is BYTE-IDENTICAL to its current live definition except
-- that `auth.uid()` -> `(select auth.uid())` and `auth.jwt()` -> `(select auth.jwt())`.
-- Signatures, return types, LANGUAGE, STABLE, SECURITY DEFINER, and
-- `set search_path = public` are all unchanged. `create or replace function`
-- preserves ownership and existing EXECUTE grants (authenticated/postgres/
-- service_role), so no grants are touched. No DROP is performed, so dependent
-- policies and functions (estimate_nodes/estimate_row_items/estimates/projects/
-- workspaces RLS, can_access_estimate, can_edit_estimate, etc.) are left intact.

-- 1) is_platform_admin(): wraps BOTH the bare auth.uid() (profile-role lookup) and
--    the bare auth.jwt() (CEO email fallback). Highest-value target: called in the
--    USING/WITH CHECK of every hero-table policy, so its internal auth.* calls are
--    re-evaluated for each row's filter without this hoist.
create or replace function public.is_platform_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('ceo', 'admin')
  )
  or lower(coalesce((select auth.jwt())->>'email', '')) = 'philipjonlewis@gmail.com';
$$;

-- 2) is_workspace_admin(target_workspace_id): only the row-independent auth.uid()
--    is hoisted; the target_workspace_id argument stays per-row (it is supplied by
--    the policy from the scanned row, e.g. workspace_members.workspace_id).
create or replace function public.is_workspace_admin(target_workspace_id uuid)
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
      and wm.role in ('owner', 'admin')
  );
$$;

-- 3) current_user_profile(): wraps the bare auth.uid() profile lookup.
create or replace function public.current_user_profile()
returns public.profiles
language sql
security definer
set search_path = public
stable
as $$
  select p
  from public.profiles p
  where p.id = (select auth.uid());
$$;
