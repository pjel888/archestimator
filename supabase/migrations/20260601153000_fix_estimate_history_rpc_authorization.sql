-- Harden estimate history RPC authorization after the initial version-control rollout.
-- SECURITY DEFINER functions run with the function owner's current_user, so the
-- privileged bypass must key off the verified Supabase JWT role instead.
create or replace function public.estimate_sheet_can_bypass_auth()
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(auth.role(), '') = 'service_role';
$$;

revoke execute on function public.estimate_sheet_can_bypass_auth() from public, anon, authenticated;
revoke execute on function public.resolve_estimate_workspace(uuid, uuid, uuid) from public, anon, authenticated;

revoke execute on function public.get_estimate_sheet_version_control_preflight() from public, anon, authenticated;
revoke execute on function public.backfill_estimate_sheet_baseline_versions(integer, uuid) from public, anon, authenticated;

grant execute on function public.get_estimate_sheet_version_control_preflight() to service_role;
grant execute on function public.backfill_estimate_sheet_baseline_versions(integer, uuid) to service_role;
