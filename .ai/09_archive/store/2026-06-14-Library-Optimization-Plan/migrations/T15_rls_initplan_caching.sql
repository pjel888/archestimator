-- Library Optimization Plan P2 T15 (F15) — HIGHEST BLAST RADIUS
-- Initplan-caches the workspace RLS helper functions: auth.uid() -> (select auth.uid()).
-- Postgres evaluates `(select auth.uid())` once per query (InitPlan) instead of once per
-- candidate row, so multi-row library scans under these policies stop re-calling auth.uid()
-- per row. Behaviorally identical: same principal sees the same rows.
--
-- These helpers are used by RLS across MANY tables, so this is the highest-blast-radius
-- change in the plan. Bodies below are reproduced verbatim from the live functions
-- (read 2026-06-14) with ONLY the auth.uid() -> (select auth.uid()) substitution.
--
-- GATED (08 Q4/D6, 06 §G): apply to hosted ONLY after:
--   1) The owner approves the RLS rewrite specifically.
--   2) An access-decision proof on the PG17 prove-harness: for viewer/editor/admin
--      principals, the SAME rows are visible before and after (no visibility change).
--   3) advisors `auth_rls_initplan` count drops; EXPLAIN a multi-row library scan
--      before/after shows the per-row auth.uid() call removed.
--
-- Rollback: re-apply the original bodies (auth.uid() without the select wrapper).
-- Additive/relax-only: replaces function bodies, no data touched → zero data loss.

create or replace function public.is_workspace_member(target_workspace_id uuid)
  returns boolean
  language sql
  stable security definer
  set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = (select auth.uid())
  );
$function$;

create or replace function public.is_workspace_admin(target_workspace_id uuid)
  returns boolean
  language sql
  stable security definer
  set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = (select auth.uid())
      and wm.role in ('owner', 'admin')
  );
$function$;

create or replace function public.is_workspace_editor(target_workspace_id uuid)
  returns boolean
  language sql
  stable security definer
  set search_path to 'public'
as $function$
  select public.is_platform_admin()
  or exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = (select auth.uid())
      and wm.role in ('owner', 'admin', 'member')
  );
$function$;
