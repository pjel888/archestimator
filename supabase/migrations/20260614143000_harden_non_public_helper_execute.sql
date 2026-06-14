-- Tighten inherited PUBLIC execute on SECURITY DEFINER helpers that are not
-- referenced by any public-role RLS policy and are not anonymous app RPCs.
-- Keep authenticated execute so authenticated app code and authenticated-only
-- policies keep their current behavior.

revoke execute on function public.can_access_realtime_topic(text) from public;
revoke execute on function public.can_access_realtime_topic(text) from anon;
grant execute on function public.can_access_realtime_topic(text) to authenticated;

revoke execute on function public.can_access_workspace_account_scope(uuid) from public;
revoke execute on function public.can_access_workspace_account_scope(uuid) from anon;
grant execute on function public.can_access_workspace_account_scope(uuid) to authenticated;

revoke execute on function public.can_manage_project_access(uuid) from public;
revoke execute on function public.can_manage_project_access(uuid) from anon;
grant execute on function public.can_manage_project_access(uuid) to authenticated;

revoke execute on function public.can_send_realtime_topic(text) from public;
revoke execute on function public.can_send_realtime_topic(text) from anon;
grant execute on function public.can_send_realtime_topic(text) to authenticated;

revoke execute on function public.current_estimate_access_rank(uuid) from public;
revoke execute on function public.current_estimate_access_rank(uuid) from anon;
grant execute on function public.current_estimate_access_rank(uuid) to authenticated;

revoke execute on function public.current_project_access_rank(uuid) from public;
revoke execute on function public.current_project_access_rank(uuid) from anon;
grant execute on function public.current_project_access_rank(uuid) to authenticated;

revoke execute on function public.current_user_profile() from public;
revoke execute on function public.current_user_profile() from anon;
grant execute on function public.current_user_profile() to authenticated;

revoke execute on function public.estimate_inherits_project_access(uuid) from public;
revoke execute on function public.estimate_inherits_project_access(uuid) from anon;
grant execute on function public.estimate_inherits_project_access(uuid) to authenticated;

revoke execute on function public.has_other_estimate_access_manager(uuid, uuid) from public;
revoke execute on function public.has_other_estimate_access_manager(uuid, uuid) from anon;
grant execute on function public.has_other_estimate_access_manager(uuid, uuid) to authenticated;

revoke execute on function public.has_other_project_access_manager(uuid, uuid) from public;
revoke execute on function public.has_other_project_access_manager(uuid, uuid) from anon;
grant execute on function public.has_other_project_access_manager(uuid, uuid) to authenticated;
