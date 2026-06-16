-- ============================================================================
-- Harden direct row insert history RPC after mixed-node write enablement.
--
-- P6 intentionally removed the target-node kind guard so rows can be inserted
-- under every row-owning estimate node kind. That made the directly callable
-- SECURITY DEFINER row insert RPC rely only on resolve_estimate_workspace(...),
-- which proves workspace membership but not edit permission. Require the same
-- estimate edit assertion used by the other history write wrappers.
-- ============================================================================

begin;

do $$
declare
  function_oid oid;
  original_definition text;
  hardened_definition text;
begin
  select proc.oid
    into function_oid
  from pg_proc proc
  join pg_namespace namespace on namespace.oid = proc.pronamespace
  where namespace.nspname = 'public'
    and proc.proname = 'insert_estimate_row_item_with_history'
    and pg_get_function_identity_arguments(proc.oid) = 'target_project_id uuid, target_estimate_id uuid, target_node_id uuid, row_payload jsonb, acting_user_id uuid, correlation_id uuid';

  if function_oid is null then
    raise exception 'insert_estimate_row_item_with_history(uuid, uuid, uuid, jsonb, uuid, uuid) not found.';
  end if;

  original_definition := pg_get_functiondef(function_oid);
  hardened_definition := replace(
    original_definition,
    'resolved_workspace_id := public.resolve_estimate_workspace(target_project_id, target_estimate_id, acting_user_id);',
    'resolved_workspace_id := public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id);'
  );

  if hardened_definition = original_definition
     and original_definition not like '%resolved_workspace_id := public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id);%' then
    raise exception 'insert_estimate_row_item_with_history edit assertion patch did not match expected authorization line.';
  end if;

  if hardened_definition <> original_definition then
    execute hardened_definition;
  end if;
end $$;

do $$
declare
  hardened boolean;
begin
  select pg_get_functiondef(proc.oid) like '%resolved_workspace_id := public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id);%'
    into hardened
  from pg_proc proc
  join pg_namespace namespace on namespace.oid = proc.pronamespace
  where namespace.nspname = 'public'
    and proc.proname = 'insert_estimate_row_item_with_history'
    and pg_get_function_identity_arguments(proc.oid) = 'target_project_id uuid, target_estimate_id uuid, target_node_id uuid, row_payload jsonb, acting_user_id uuid, correlation_id uuid';

  if hardened is distinct from true then
    raise exception 'insert_estimate_row_item_with_history hardening verify failed.';
  end if;
end $$;

commit;
