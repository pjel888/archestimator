create or replace function public.unlink_estimate_row_item_from_library_with_history(
  target_project_id uuid,
  target_estimate_id uuid,
  target_row_id uuid,
  expected_row_revision integer,
  acting_user_id uuid default null,
  correlation_id uuid default gen_random_uuid(),
  reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_workspace_id uuid;
  resolved_user_id uuid := coalesce(auth.uid(), acting_user_id);
  committed_result jsonb;
  old_row public.estimate_row_items;
  detached_row public.estimate_row_items;
  old_snapshot jsonb;
  new_snapshot jsonb;
  changed_fields text[];
  inserted_event_id uuid;
  detach_metadata jsonb;
begin
  resolved_workspace_id := public.resolve_estimate_workspace(target_project_id, target_estimate_id, acting_user_id);

  if not public.estimate_sheet_can_bypass_auth() and not public.can_edit_estimate(target_estimate_id) then
    raise exception 'Estimate edit access denied.' using errcode = '42501';
  end if;

  perform 1 from public.estimates estimate where estimate.id = target_estimate_id for update;

  committed_result := public.estimate_sheet_event_result(target_estimate_id, correlation_id);
  if committed_result is not null then
    return committed_result;
  end if;

  select * into old_row
  from public.estimate_row_items row_item
  where row_item.id = target_row_id
    and row_item.estimate_id = target_estimate_id
  for update;

  if old_row.id is null then
    raise exception 'Estimate row item not found.';
  end if;

  if expected_row_revision is null or old_row.row_revision <> expected_row_revision then
    raise exception 'estimate_sheet_row_revision_conflict'
      using errcode = 'P0001',
            detail = jsonb_build_object(
              'rowId', target_row_id,
              'expectedRowRevision', expected_row_revision,
              'currentRowRevision', old_row.row_revision
            )::text;
  end if;

  if old_row.source_library_item_id is null then
    raise exception 'Estimate row item is not linked to a library item.';
  end if;

  old_snapshot := public.estimate_row_item_snapshot(old_row);
  detach_metadata := jsonb_strip_nulls(jsonb_build_object(
    'detachedAt', timezone('utc', now()),
    'detachedFromSourceLibraryItemId', old_row.source_library_item_id,
    'detachedReason', nullif(trim(reason), '')
  ));

  update public.estimate_row_items row_item
  set source_library_item_id = null,
      source_snapshot = row_item.source_snapshot,
      link_state = 'detached'::public.estimate_row_link_state,
      metadata = coalesce(row_item.metadata, '{}'::jsonb) || detach_metadata,
      row_revision = row_item.row_revision + 1
  where row_item.id = target_row_id
    and row_item.estimate_id = target_estimate_id
  returning * into detached_row;

  new_snapshot := public.estimate_row_item_snapshot(detached_row);
  changed_fields := public.estimate_sheet_changed_fields(
    old_snapshot,
    new_snapshot,
    array['sourceLibraryItemId', 'linkState', 'metadata']
  );

  insert into public.estimate_sheet_events (
    estimate_id,
    workspace_id,
    estimate_node_id,
    target_row_id,
    event_type,
    event_source,
    correlation_id,
    actor_user_id,
    row_context,
    old_snapshot,
    new_snapshot,
    changed_fields,
    total_delta,
    payload,
    metadata
  )
  values (
    target_estimate_id,
    resolved_workspace_id,
    detached_row.node_id,
    detached_row.id,
    'row_unlinked',
    'server_action',
    correlation_id,
    resolved_user_id,
    public.estimate_row_context(detached_row),
    jsonb_build_object(
      'sourceLibraryItemId', old_row.source_library_item_id,
      'sourceSnapshot', old_row.source_snapshot,
      'linkState', old_row.link_state
    ),
    jsonb_build_object(
      'sourceLibraryItemId', detached_row.source_library_item_id,
      'sourceSnapshot', detached_row.source_snapshot,
      'linkState', detached_row.link_state
    ),
    changed_fields,
    0,
    jsonb_build_object(
      'rowId', detached_row.id,
      'reason', nullif(trim(reason), ''),
      'changedFields', changed_fields
    ),
    detach_metadata
  )
  returning id into inserted_event_id;

  return jsonb_build_object(
    'idempotent', false,
    'eventId', inserted_event_id,
    'rowId', detached_row.id,
    'row', new_snapshot,
    'changedFields', changed_fields
  );
end;
$$;

revoke execute on function public.unlink_estimate_row_item_from_library_with_history(uuid, uuid, uuid, integer, uuid, uuid, text) from public, anon;
grant execute on function public.unlink_estimate_row_item_from_library_with_history(uuid, uuid, uuid, integer, uuid, uuid, text) to authenticated;
