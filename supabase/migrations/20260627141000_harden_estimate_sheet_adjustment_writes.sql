-- Move estimate sheet adjustment writes behind a history-aware edit-authorized RPC.

begin;

drop policy if exists estimate_sheet_adjustments_insert_authenticated on public.estimate_sheet_adjustments;
drop policy if exists estimate_sheet_adjustments_update_authenticated on public.estimate_sheet_adjustments;
drop policy if exists estimate_sheet_adjustments_delete_authenticated on public.estimate_sheet_adjustments;

revoke all on table public.estimate_sheet_adjustments from public, anon;
revoke insert, update, delete on table public.estimate_sheet_adjustments from authenticated;
grant select on table public.estimate_sheet_adjustments to authenticated;

create or replace function public.update_estimate_sheet_adjustment_with_history(
  target_project_id uuid,
  target_estimate_id uuid,
  adjustment_mode text,
  adjustment_percentage numeric,
  expected_row_revision integer default null,
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
  resolved_user_id uuid := coalesce(auth.uid(), acting_user_id);
  committed_result jsonb;
  current_adjustment public.estimate_sheet_adjustments;
  has_current_adjustment boolean;
  old_snapshot jsonb;
  new_snapshot jsonb;
  adjustment_event_id uuid;
begin
  resolved_workspace_id := public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id);

  if adjustment_mode not in ('contingency', 'discount') then
    raise exception 'Estimate adjustment mode is invalid.';
  end if;

  if adjustment_percentage is null or adjustment_percentage < 0 or adjustment_percentage > 100 then
    raise exception 'Estimate adjustment percentage must be between 0 and 100.';
  end if;

  perform 1
  from public.estimates estimate
  where estimate.id = target_estimate_id
    and estimate.project_id = target_project_id
  for update;

  if not found then
    raise exception 'Estimate not found in the current project.';
  end if;

  committed_result := public.estimate_sheet_event_result(target_estimate_id, correlation_id);
  if committed_result is not null then
    return committed_result;
  end if;

  select *
    into current_adjustment
  from public.estimate_sheet_adjustments adjustment
  where adjustment.estimate_id = target_estimate_id
  for update;
  has_current_adjustment := found;

  old_snapshot := public.estimate_sheet_adjustment_snapshot(target_estimate_id);

  if has_current_adjustment then
    if expected_row_revision is not null and current_adjustment.row_revision <> expected_row_revision then
      raise exception 'estimate_sheet_row_revision_conflict'
        using errcode = 'P0001',
              hint = 'Reload the estimate and retry with the latest sheet adjustment revision.';
    end if;

    update public.estimate_sheet_adjustments adjustment
    set
      mode = adjustment_mode,
      percentage = adjustment_percentage,
      row_revision = current_adjustment.row_revision + 1,
      updated_by = resolved_user_id
    where adjustment.estimate_id = target_estimate_id
      and adjustment.row_revision = current_adjustment.row_revision;

    if not found then
      raise exception 'estimate_sheet_row_revision_conflict'
        using errcode = 'P0001',
              hint = 'Reload the estimate and retry with the latest sheet adjustment revision.';
    end if;
  else
    if expected_row_revision is not null and expected_row_revision > 0 then
      raise exception 'estimate_sheet_row_revision_conflict'
        using errcode = 'P0001',
              hint = 'Reload the estimate and retry with the latest sheet adjustment revision.';
    end if;

    insert into public.estimate_sheet_adjustments (
      estimate_id,
      mode,
      percentage,
      row_revision,
      updated_by
    )
    values (
      target_estimate_id,
      adjustment_mode,
      adjustment_percentage,
      1,
      resolved_user_id
    );
  end if;

  new_snapshot := public.estimate_sheet_adjustment_snapshot(target_estimate_id);

  insert into public.estimate_sheet_events (
    estimate_id,
    workspace_id,
    event_type,
    event_source,
    correlation_id,
    actor_user_id,
    old_snapshot,
    new_snapshot,
    changed_fields,
    payload
  )
  values (
    target_estimate_id,
    resolved_workspace_id,
    'sheet_adjustment_updated',
    'server_action',
    correlation_id,
    resolved_user_id,
    old_snapshot,
    new_snapshot,
    array['sheetAdjustment'],
    jsonb_build_object(
      'eventType', 'sheet_adjustment_updated',
      'adjustment', new_snapshot,
      'oldAdjustment', old_snapshot
    )
  )
  returning id into adjustment_event_id;

  return jsonb_build_object(
    'eventId', adjustment_event_id,
    'eventType', 'sheet_adjustment_updated',
    'adjustment', new_snapshot,
    'row', new_snapshot,
    'payload', jsonb_build_object(
      'eventId', adjustment_event_id,
      'eventType', 'sheet_adjustment_updated',
      'adjustment', new_snapshot,
      'oldAdjustment', old_snapshot
    )
  );
end;
$$;

revoke all on function public.update_estimate_sheet_adjustment_with_history(uuid, uuid, text, numeric, integer, uuid, uuid) from public, anon;
grant execute on function public.update_estimate_sheet_adjustment_with_history(uuid, uuid, text, numeric, integer, uuid, uuid) to authenticated;

commit;
