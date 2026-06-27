-- Remove unused wrapper variables from latest row update/replace history RPCs.
--
-- Migration 20260627140000 added edit-gated wrappers around the preserved
-- unsafe-workspace-gated implementations. The wrapper authorization check is
-- side-effectful and should be performed directly; assigning its return value
-- only creates provider-lint noise.

create or replace function public.update_estimate_row_item_with_history(
  target_project_id uuid,
  target_estimate_id uuid,
  target_row_id uuid,
  expected_row_revision integer,
  row_patch jsonb,
  acting_user_id uuid default null,
  correlation_id uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id);

  return public.update_estimate_row_item_with_history_unsafe_workspace_gate_202(
    target_project_id,
    target_estimate_id,
    target_row_id,
    expected_row_revision,
    row_patch,
    acting_user_id,
    correlation_id
  );
end;
$$;

create or replace function public.replace_estimate_row_item_with_history(
  target_project_id uuid,
  target_estimate_id uuid,
  target_row_id uuid,
  expected_row_revision integer,
  replacement_payload jsonb,
  acting_user_id uuid default null,
  correlation_id uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id);

  return public.replace_estimate_row_item_with_history_unsafe_workspace_gate_20(
    target_project_id,
    target_estimate_id,
    target_row_id,
    expected_row_revision,
    replacement_payload,
    acting_user_id,
    correlation_id
  );
end;
$$;

revoke all on function public.update_estimate_row_item_with_history(uuid, uuid, uuid, integer, jsonb, uuid, uuid) from public, anon;
grant execute on function public.update_estimate_row_item_with_history(uuid, uuid, uuid, integer, jsonb, uuid, uuid) to authenticated;

revoke all on function public.replace_estimate_row_item_with_history(uuid, uuid, uuid, integer, jsonb, uuid, uuid) from public, anon;
grant execute on function public.replace_estimate_row_item_with_history(uuid, uuid, uuid, integer, jsonb, uuid, uuid) to authenticated;
