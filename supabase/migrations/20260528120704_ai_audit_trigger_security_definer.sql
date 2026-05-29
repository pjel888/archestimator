-- AI audit constraint triggers read sibling audit rows while enforcing
-- cross-table workspace/actor consistency. Browser roles intentionally do not
-- have direct audit-table grants, so the internal trigger functions must run
-- with owner privileges instead of the triggering authenticated role.

alter function public.enforce_ai_tool_call_workspace_refs() owner to postgres;
alter function public.enforce_ai_tool_call_workspace_refs() security definer;
alter function public.enforce_ai_tool_call_workspace_refs() set search_path = public;

alter function public.enforce_ai_data_access_workspace_refs() owner to postgres;
alter function public.enforce_ai_data_access_workspace_refs() security definer;
alter function public.enforce_ai_data_access_workspace_refs() set search_path = public;

revoke execute on function public.enforce_ai_tool_call_workspace_refs() from public;
revoke execute on function public.enforce_ai_data_access_workspace_refs() from public;
revoke execute on function public.enforce_ai_tool_call_workspace_refs() from anon, authenticated;
revoke execute on function public.enforce_ai_data_access_workspace_refs() from anon, authenticated;
