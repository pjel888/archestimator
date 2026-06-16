begin;

do $$
declare
  function_oid oid;
  original_definition text;
  hardened_definition text;
begin
  select p.oid into function_oid
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'update_estimate_details_with_history'
    and pg_get_function_identity_arguments(p.oid) = 'target_project_id uuid, target_estimate_id uuid, estimate_patch jsonb, acting_user_id uuid, correlation_id uuid';

  if function_oid is null then
    raise exception 'Function public.update_estimate_details_with_history(uuid, uuid, jsonb, uuid, uuid) not found.';
  end if;

  original_definition := pg_get_functiondef(function_oid);

  if original_definition like '%public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id)%' then
    return;
  end if;

  hardened_definition := replace(
    original_definition,
    'resolved_workspace_id := public.resolve_estimate_workspace(target_project_id, target_estimate_id, acting_user_id);',
    'resolved_workspace_id := public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id);'
  );

  if hardened_definition = original_definition then
    raise exception 'Could not patch public.update_estimate_details_with_history edit authorization.';
  end if;

  execute hardened_definition;
end $$;

do $$
declare
  hardened_definition text;
begin
  select pg_get_functiondef(p.oid) into hardened_definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'update_estimate_details_with_history'
    and pg_get_function_identity_arguments(p.oid) = 'target_project_id uuid, target_estimate_id uuid, estimate_patch jsonb, acting_user_id uuid, correlation_id uuid';

  if hardened_definition not like '%public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id)%' then
    raise exception 'public.update_estimate_details_with_history is missing estimate edit authorization.';
  end if;
end $$;

revoke execute on function public.update_estimate_details_with_history(uuid, uuid, jsonb, uuid, uuid) from public, anon;
grant execute on function public.update_estimate_details_with_history(uuid, uuid, jsonb, uuid, uuid) to authenticated;

commit;
