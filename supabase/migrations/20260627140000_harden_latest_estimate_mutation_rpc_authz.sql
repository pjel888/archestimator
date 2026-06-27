-- Harden latest estimate mutation/version restore SECURITY DEFINER entrypoints.
--
-- The signed-quantity follow-up recreated row update/replace and restore-copy
-- functions from older bodies that used resolve_estimate_workspace(), which is
-- workspace-membership scoped. Preserve the current behavior behind private
-- renamed implementations, then expose the original RPC names only through
-- edit-gated wrappers.

do $$
begin
  if to_regprocedure('public.update_estimate_row_item_with_history(uuid, uuid, uuid, integer, jsonb, uuid, uuid)') is not null
     and to_regprocedure('public.update_estimate_row_item_with_history_unsafe_workspace_gate_20260627(uuid, uuid, uuid, integer, jsonb, uuid, uuid)') is null then
    alter function public.update_estimate_row_item_with_history(uuid, uuid, uuid, integer, jsonb, uuid, uuid)
      rename to update_estimate_row_item_with_history_unsafe_workspace_gate_20260627;
  end if;

  if to_regprocedure('public.replace_estimate_row_item_with_history(uuid, uuid, uuid, integer, jsonb, uuid, uuid)') is not null
     and to_regprocedure('public.replace_estimate_row_item_with_history_unsafe_workspace_gate_20260627(uuid, uuid, uuid, integer, jsonb, uuid, uuid)') is null then
    alter function public.replace_estimate_row_item_with_history(uuid, uuid, uuid, integer, jsonb, uuid, uuid)
      rename to replace_estimate_row_item_with_history_unsafe_workspace_gate_20260627;
  end if;

  if to_regprocedure('public.restore_estimate_sheet_version_as_copy(uuid, uuid, text, text, uuid, uuid)') is not null
     and to_regprocedure('public.restore_estimate_sheet_version_as_copy_unsafe_workspace_gate_20260627(uuid, uuid, text, text, uuid, uuid)') is null then
    alter function public.restore_estimate_sheet_version_as_copy(uuid, uuid, text, text, uuid, uuid)
      rename to restore_estimate_sheet_version_as_copy_unsafe_workspace_gate_20260627;
  end if;
end $$;

revoke all on function public.update_estimate_row_item_with_history_unsafe_workspace_gate_20260627(uuid, uuid, uuid, integer, jsonb, uuid, uuid) from public, anon, authenticated;
revoke all on function public.replace_estimate_row_item_with_history_unsafe_workspace_gate_20260627(uuid, uuid, uuid, integer, jsonb, uuid, uuid) from public, anon, authenticated;
revoke all on function public.restore_estimate_sheet_version_as_copy_unsafe_workspace_gate_20260627(uuid, uuid, text, text, uuid, uuid) from public, anon, authenticated;

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
declare
  resolved_workspace_id uuid;
begin
  resolved_workspace_id := public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id);

  return public.update_estimate_row_item_with_history_unsafe_workspace_gate_20260627(
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
declare
  resolved_workspace_id uuid;
begin
  resolved_workspace_id := public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id);

  return public.replace_estimate_row_item_with_history_unsafe_workspace_gate_20260627(
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

create or replace function public.restore_estimate_sheet_version_as_copy(
  target_project_id uuid,
  source_version_id uuid,
  new_estimate_name text default null,
  new_sheet_code text default null,
  acting_user_id uuid default null,
  correlation_id uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  source_estimate_id uuid;
  resolved_workspace_id uuid;
begin
  if source_version_id is null then
    raise exception 'Source version id is required.';
  end if;

  select version.estimate_id into source_estimate_id
  from public.estimate_sheet_versions version
  where version.id = source_version_id;

  if source_estimate_id is null then
    raise exception 'Estimate sheet version not found.';
  end if;

  resolved_workspace_id := public.assert_can_edit_estimate_for_history(target_project_id, source_estimate_id, acting_user_id);

  return public.restore_estimate_sheet_version_as_copy_unsafe_workspace_gate_20260627(
    target_project_id,
    source_version_id,
    new_estimate_name,
    new_sheet_code,
    acting_user_id,
    correlation_id
  );
end;
$$;

revoke all on function public.update_estimate_row_item_with_history(uuid, uuid, uuid, integer, jsonb, uuid, uuid) from public, anon;
grant execute on function public.update_estimate_row_item_with_history(uuid, uuid, uuid, integer, jsonb, uuid, uuid) to authenticated;

revoke all on function public.replace_estimate_row_item_with_history(uuid, uuid, uuid, integer, jsonb, uuid, uuid) from public, anon;
grant execute on function public.replace_estimate_row_item_with_history(uuid, uuid, uuid, integer, jsonb, uuid, uuid) to authenticated;

revoke all on function public.restore_estimate_sheet_version_as_copy(uuid, uuid, text, text, uuid, uuid) from public, anon;
grant execute on function public.restore_estimate_sheet_version_as_copy(uuid, uuid, text, text, uuid, uuid) to authenticated;
