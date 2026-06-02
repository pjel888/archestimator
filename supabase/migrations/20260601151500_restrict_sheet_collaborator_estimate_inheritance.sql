-- Prevent sheet-only collaborators from inheriting project-wide estimate access.
-- `can_access_project()` intentionally includes estimate sheet members so they can
-- see the project container that holds their sheet, but inherited estimate access
-- must require workspace/project-level membership.
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
      and esm.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.estimates e
    where e.id = target_estimate_id
      and public.estimate_inherits_project_access(e.id)
      and public.current_project_access_rank(e.project_id) > 0
  );
$$;
