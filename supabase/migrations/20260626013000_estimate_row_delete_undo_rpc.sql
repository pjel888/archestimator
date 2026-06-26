-- ============================================================================
-- Center row delete undo.
--
-- Row delete history already stores canonical deleted row snapshots. This RPC
-- restores rows from that persisted event payload and records a new history
-- event, keeping tree/node deletion undo out of scope because those events do
-- not yet contain a complete subtree snapshot.
-- ============================================================================

begin;

create or replace function public.restore_deleted_estimate_rows_with_history(
  target_project_id uuid,
  target_estimate_id uuid,
  source_delete_event_id uuid,
  target_row_ids uuid[] default null,
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
  delete_event public.estimate_sheet_events;
  existing_restore_event public.estimate_sheet_events;
  source_snapshots jsonb := '[]'::jsonb;
  restored_snapshots jsonb := '[]'::jsonb;
  restored_row_ids uuid[] := array[]::uuid[];
  row_snapshot jsonb;
  snapshot_row_id uuid;
  snapshot_node_id uuid;
  requested_row_count integer := coalesce(array_length(target_row_ids, 1), 0);
  restored_row_count integer := 0;
  requested_sort_order integer;
  restored_sort_order integer;
  restored_row public.estimate_row_items;
  first_restored_row public.estimate_row_items;
  inserted_event_id uuid;
  total_delta numeric := 0;
begin
  if source_delete_event_id is null then
    raise exception 'Source delete event id is required.';
  end if;

  resolved_workspace_id := public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id);

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
    into delete_event
  from public.estimate_sheet_events event
  where event.id = source_delete_event_id
    and event.estimate_id = target_estimate_id
    and event.event_type in ('row_deleted', 'rows_bulk_deleted')
  for share;

  if delete_event.id is null then
    raise exception 'Deleted row history event not found.';
  end if;

  select *
    into existing_restore_event
  from public.estimate_sheet_events event
  where event.estimate_id = target_estimate_id
    and event.event_type = 'row_restored'
    and event.payload->>'sourceEventId' = source_delete_event_id::text
  order by event.created_at desc, event.id desc
  limit 1;

  if existing_restore_event.id is not null then
    return jsonb_build_object(
      'idempotent', true,
      'eventId', existing_restore_event.id,
      'sourceEventId', source_delete_event_id,
      'restoredRowIds', coalesce(existing_restore_event.payload->'restoredRowIds', '[]'::jsonb),
      'restoredRowCount', coalesce((existing_restore_event.payload->>'restoredRowCount')::integer, 0),
      'restoredRows', coalesce(existing_restore_event.payload->'restoredRows', '[]'::jsonb)
    );
  end if;

  if delete_event.event_type = 'row_deleted' then
    source_snapshots := jsonb_build_array(coalesce(delete_event.payload->'deletedSnapshot', delete_event.old_snapshot));
  else
    source_snapshots := coalesce(delete_event.payload->'deletedRows', delete_event.old_snapshot->'deletedRows', '[]'::jsonb);
  end if;

  for row_snapshot in
    select value
    from jsonb_array_elements(source_snapshots) as snapshots(value)
  loop
    snapshot_row_id := nullif(row_snapshot->>'id', '')::uuid;
    if snapshot_row_id is null then
      raise exception 'Deleted row history event contains an invalid row snapshot.';
    end if;

    if requested_row_count > 0 and snapshot_row_id <> all(target_row_ids) then
      continue;
    end if;

    if exists (
      select 1
      from public.estimate_row_items row_item
      where row_item.id = snapshot_row_id
    ) then
      raise exception 'One or more deleted rows have already been restored.';
    end if;

    snapshot_node_id := nullif(row_snapshot->>'nodeId', '')::uuid;
    if snapshot_node_id is null or not exists (
      select 1
      from public.estimate_nodes node
      where node.id = snapshot_node_id
        and node.estimate_id = target_estimate_id
    ) then
      raise exception 'Deleted row parent node is no longer available.';
    end if;

    requested_sort_order := coalesce(nullif(row_snapshot->>'sortOrder', '')::integer, 0);
    restored_sort_order := requested_sort_order;

    if exists (
      select 1
      from public.estimate_row_items row_item
      where row_item.node_id = snapshot_node_id
        and row_item.sort_order = restored_sort_order
    ) then
      select coalesce(max(row_item.sort_order), -1) + 1
        into restored_sort_order
      from public.estimate_row_items row_item
      where row_item.node_id = snapshot_node_id;
    end if;

    insert into public.estimate_row_items (
      id,
      estimate_id,
      node_id,
      sort_order,
      source_library_item_id,
      source_snapshot,
      category_node_id,
      supplier_id,
      material,
      description,
      supplier,
      unit,
      quantity,
      unit_cost,
      contingency_percentage,
      misc_cost,
      discipline,
      designation,
      link_state,
      metadata,
      row_revision,
      created_at
    )
    values (
      snapshot_row_id,
      target_estimate_id,
      snapshot_node_id,
      restored_sort_order,
      nullif(row_snapshot->>'sourceLibraryItemId', '')::uuid,
      row_snapshot->'sourceSnapshot',
      nullif(row_snapshot->>'categoryNodeId', ''),
      nullif(row_snapshot->>'supplierId', '')::uuid,
      coalesce(row_snapshot->>'material', ''),
      coalesce(row_snapshot->>'description', ''),
      coalesce(row_snapshot->>'supplier', ''),
      coalesce(nullif(row_snapshot->>'unit', ''), 'unit'),
      coalesce(nullif(row_snapshot->>'quantity', '')::numeric, 0),
      coalesce(nullif(row_snapshot->>'unitCost', '')::numeric, 0),
      coalesce(nullif(row_snapshot->>'contingencyPercentage', '')::numeric, 0),
      coalesce(nullif(row_snapshot->>'miscCost', '')::numeric, 0),
      coalesce(row_snapshot->>'discipline', ''),
      coalesce(row_snapshot->>'designation', ''),
      coalesce(nullif(row_snapshot->>'linkState', '')::public.estimate_row_link_state, 'unlinked'),
      coalesce(row_snapshot->'metadata', '{}'::jsonb),
      coalesce(nullif(row_snapshot->>'rowRevision', '')::integer, 1) + 1,
      coalesce(nullif(row_snapshot->>'createdAt', '')::timestamptz, now())
    )
    returning * into restored_row;

    if restored_row_count = 0 then
      first_restored_row := restored_row;
    end if;

    restored_row_count := restored_row_count + 1;
    restored_row_ids := restored_row_ids || restored_row.id;
    restored_snapshots := restored_snapshots || jsonb_build_array(public.estimate_row_item_snapshot(restored_row));
    total_delta := total_delta + public.estimate_row_line_total(restored_row);
  end loop;

  if restored_row_count = 0 then
    raise exception 'No deleted rows matched the restore request.';
  end if;

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
    new_snapshot,
    changed_fields,
    total_delta,
    payload
  )
  values (
    target_estimate_id,
    resolved_workspace_id,
    first_restored_row.node_id,
    first_restored_row.id,
    'row_restored',
    'server_action',
    correlation_id,
    resolved_user_id,
    public.estimate_row_context(first_restored_row),
    jsonb_build_object('restoredRows', restored_snapshots),
    array['rows'],
    total_delta,
    jsonb_build_object(
      'sourceEventId', source_delete_event_id,
      'restoredRowIds', to_jsonb(restored_row_ids),
      'restoredRowCount', restored_row_count,
      'restoredRows', restored_snapshots
    )
  )
  returning id into inserted_event_id;

  return jsonb_build_object(
    'idempotent', false,
    'eventId', inserted_event_id,
    'sourceEventId', source_delete_event_id,
    'restoredRowIds', to_jsonb(restored_row_ids),
    'restoredRowCount', restored_row_count,
    'restoredRows', restored_snapshots
  );
end;
$$;

revoke all on function public.restore_deleted_estimate_rows_with_history(uuid, uuid, uuid, uuid[], uuid, uuid) from public, anon;
grant execute on function public.restore_deleted_estimate_rows_with_history(uuid, uuid, uuid, uuid[], uuid, uuid) to authenticated;

commit;
