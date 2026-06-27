-- ============================================================================
-- Dedicated estimate row-item reorganization RPC.
--
-- This moves estimate row items by applying the final dense sibling order for
-- every affected row in one transaction. It is intentionally separate from
-- component move semantics, which swap row contents rather than moving rows.
-- ============================================================================

begin;
create or replace function public.move_estimate_row_item_with_history(
  target_project_id uuid,
  target_estimate_id uuid,
  target_active_tab_id uuid,
  move_updates jsonb,
  moved_row_id uuid,
  source_node_id uuid,
  target_node_id uuid,
  correlation_id uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_user_id uuid := auth.uid();
  resolved_workspace_id uuid;
  committed_result jsonb;
  requested_count integer;
  duplicate_row_count integer;
  duplicate_sort_count integer;
  missing_row_count integer;
  conflict_row record;
  moved_row public.estimate_row_items;
  updated_moved_row public.estimate_row_items;
  source_node_tab_id uuid;
  target_node_tab_id uuid;
  resolved_tab_id uuid;
  target_sort_order integer;
  dense_order_failure_count integer;
  updated_row_count integer;
  old_moved_snapshot jsonb;
  new_moved_snapshot jsonb;
  updated_rows jsonb;
  inserted_event_id uuid;
begin
  if actor_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if move_updates is null or jsonb_typeof(move_updates) <> 'array' then
    raise exception 'Row reorganization updates must be a JSON array.';
  end if;

  resolved_workspace_id := public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, actor_user_id);

  committed_result := public.estimate_sheet_event_result(target_estimate_id, correlation_id);
  if committed_result is not null then
    return committed_result || jsonb_build_object(
      'updatedRowCount', coalesce(nullif(committed_result #>> '{payload,updatedRowCount}', '')::integer, 0),
      'rows', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'rowId', row_item.id,
            'nodeId', row_item.node_id,
            'sortOrder', row_item.sort_order,
            'rowRevision', row_item.row_revision
          )
          order by row_item.node_id, row_item.sort_order, row_item.id
        )
        from public.estimate_row_items row_item
        where row_item.estimate_id = target_estimate_id
          and row_item.node_id in (source_node_id, target_node_id)
      ), '[]'::jsonb)
    );
  end if;

  perform 1
  from public.estimates estimate
  where estimate.id = target_estimate_id
    and estimate.project_id = target_project_id
  for update;

  if not found then
    raise exception 'Estimate not found in the current project.';
  end if;

  set constraints estimate_row_items_unique_sort deferred;

  create temporary table if not exists estimate_sheet_row_item_move_updates (
    row_id uuid,
    node_id uuid,
    sort_order integer,
    expected_row_revision integer
  ) on commit drop;

  truncate table estimate_sheet_row_item_move_updates;

  insert into estimate_sheet_row_item_move_updates(row_id, node_id, sort_order, expected_row_revision)
  select
    move_row."rowId",
    move_row."nodeId",
    move_row."sortOrder",
    move_row."expectedRowRevision"
  from jsonb_to_recordset(move_updates) as move_row(
    "rowId" uuid,
    "nodeId" uuid,
    "sortOrder" integer,
    "expectedRowRevision" integer
  );

  select count(*) into requested_count
  from estimate_sheet_row_item_move_updates;

  if requested_count = 0 then
    raise exception 'At least one row order update is required.';
  end if;

  if requested_count > 1000 then
    raise exception 'Row reorganization is limited to 1000 affected rows at a time.';
  end if;

  if requested_count <> jsonb_array_length(move_updates) then
    raise exception 'Row reorganization updates must be well-formed.';
  end if;

  if exists (
    select 1
    from estimate_sheet_row_item_move_updates requested
    where requested.row_id is null
      or requested.node_id is null
      or requested.sort_order is null
      or requested.sort_order < 0
      or requested.expected_row_revision is null
      or requested.expected_row_revision < 1
  ) then
    raise exception 'Row reorganization updates contain invalid row ids, node ids, sort orders, or row revisions.';
  end if;

  select count(*) - count(distinct requested.row_id)
    into duplicate_row_count
  from estimate_sheet_row_item_move_updates requested;

  if duplicate_row_count > 0 then
    raise exception 'Row reorganization updates must not contain duplicate row ids.';
  end if;

  select count(*)
    into duplicate_sort_count
  from (
    select requested.node_id, requested.sort_order
    from estimate_sheet_row_item_move_updates requested
    group by requested.node_id, requested.sort_order
    having count(*) > 1
  ) duplicate_positions;

  if duplicate_sort_count > 0 then
    raise exception 'Row reorganization updates contain duplicate final row positions.';
  end if;

  select node.estimate_tab_id
    into source_node_tab_id
  from public.estimate_nodes node
  where node.id = source_node_id
    and node.estimate_id = target_estimate_id
  for update;

  select node.estimate_tab_id
    into target_node_tab_id
  from public.estimate_nodes node
  where node.id = target_node_id
    and node.estimate_id = target_estimate_id
  for update;

  if source_node_tab_id is null or target_node_tab_id is null then
    raise exception 'Source and target estimate nodes must exist in the current estimate.';
  end if;

  if source_node_tab_id is distinct from target_node_tab_id then
    raise exception 'Cross-tab row reorganization is not supported.';
  end if;

  resolved_tab_id := coalesce(target_active_tab_id, source_node_tab_id);

  if resolved_tab_id is distinct from source_node_tab_id then
    raise exception 'Row reorganization target tab does not match the source and target nodes.';
  end if;

  if exists (
    select 1
    from estimate_sheet_row_item_move_updates requested
    where requested.node_id not in (source_node_id, target_node_id)
  ) then
    raise exception 'Row reorganization updates may only target the source and target nodes.';
  end if;

  if not exists (
    select 1
    from estimate_sheet_row_item_move_updates requested
    where requested.row_id = moved_row_id
      and requested.node_id = target_node_id
  ) then
    raise exception 'Moved estimate row must be included in the target row order updates.';
  end if;

  perform 1
  from public.estimate_row_items row_item
  join estimate_sheet_row_item_move_updates requested on requested.row_id = row_item.id
  where row_item.estimate_id = target_estimate_id
  order by row_item.id
  for update of row_item;

  select count(*)
    into missing_row_count
  from estimate_sheet_row_item_move_updates requested
  where not exists (
    select 1
    from public.estimate_row_items row_item
    where row_item.id = requested.row_id
      and row_item.estimate_id = target_estimate_id
  );

  if missing_row_count > 0 then
    raise exception 'One or more estimate row items were not found in the current project.';
  end if;

  select *
    into moved_row
  from public.estimate_row_items row_item
  where row_item.id = moved_row_id
    and row_item.estimate_id = target_estimate_id
  for update;

  if moved_row.id is null then
    raise exception 'Moved estimate row item was not found in the current project.';
  end if;

  if moved_row.node_id <> source_node_id then
    raise exception 'Moved estimate row is no longer in the expected source node.';
  end if;

  if exists (
    select 1
    from public.estimate_row_items row_item
    join estimate_sheet_row_item_move_updates requested on requested.row_id = row_item.id
    where row_item.estimate_id = target_estimate_id
      and row_item.id <> moved_row_id
      and row_item.node_id not in (source_node_id, target_node_id)
  ) then
    raise exception 'Row reorganization updates include rows outside the source and target nodes.';
  end if;

  select row_item.id, requested.expected_row_revision, row_item.row_revision
    into conflict_row
  from public.estimate_row_items row_item
  join estimate_sheet_row_item_move_updates requested on requested.row_id = row_item.id
  where row_item.estimate_id = target_estimate_id
    and row_item.row_revision <> requested.expected_row_revision
  order by row_item.id
  limit 1;

  if conflict_row.id is not null then
    raise exception 'estimate_sheet_row_revision_conflict'
      using errcode = 'P0001',
            detail = jsonb_build_object(
              'rowId', conflict_row.id,
              'expectedRowRevision', conflict_row.expected_row_revision,
              'currentRowRevision', conflict_row.row_revision
            )::text;
  end if;

  if exists (
    select 1
    from public.estimate_row_items row_item
    join estimate_sheet_row_item_move_updates requested on requested.row_id = row_item.id
    where row_item.estimate_id = target_estimate_id
      and row_item.node_id = requested.node_id
      and row_item.sort_order = requested.sort_order
  ) then
    raise exception 'Row reorganization updates must contain changed rows only.';
  end if;

  select requested.sort_order
    into target_sort_order
  from estimate_sheet_row_item_move_updates requested
  where requested.row_id = moved_row_id
    and requested.node_id = target_node_id
  limit 1;

  select count(*)
    into dense_order_failure_count
  from (
    with final_rows as (
      select
        row_item.id,
        coalesce(requested.node_id, row_item.node_id) as node_id,
        coalesce(requested.sort_order, row_item.sort_order) as sort_order
      from public.estimate_row_items row_item
      left join estimate_sheet_row_item_move_updates requested on requested.row_id = row_item.id
      where row_item.estimate_id = target_estimate_id
        and row_item.node_id in (source_node_id, target_node_id)
    )
    select
      final_rows.node_id,
      count(*) as row_count,
      count(distinct final_rows.sort_order) as distinct_sort_order_count,
      min(final_rows.sort_order) as min_sort_order,
      max(final_rows.sort_order) as max_sort_order
    from final_rows
    group by final_rows.node_id
  ) final_groups
  where final_groups.min_sort_order <> 0
    or final_groups.max_sort_order <> final_groups.row_count - 1
    or final_groups.distinct_sort_order_count <> final_groups.row_count;

  if dense_order_failure_count > 0 then
    raise exception 'Row reorganization updates must produce dense sibling order.';
  end if;

  old_moved_snapshot := public.estimate_row_item_snapshot(moved_row);

  update public.estimate_row_items row_item
  set node_id = requested.node_id,
      sort_order = requested.sort_order,
      row_revision = row_item.row_revision + 1
  from estimate_sheet_row_item_move_updates requested
  where row_item.id = requested.row_id
    and row_item.estimate_id = target_estimate_id;

  get diagnostics updated_row_count = row_count;

  if updated_row_count <> requested_count then
    raise exception 'Row reorganization did not update every requested row.';
  end if;

  select *
    into updated_moved_row
  from public.estimate_row_items row_item
  where row_item.id = moved_row_id
    and row_item.estimate_id = target_estimate_id;

  new_moved_snapshot := public.estimate_row_item_snapshot(updated_moved_row);

  -- Return the full source/target sibling rows so clients can reconcile dense
  -- order against unchanged rows whose revisions did not increment.
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'rowId', row_item.id,
      'nodeId', row_item.node_id,
      'sortOrder', row_item.sort_order,
      'rowRevision', row_item.row_revision
    )
    order by row_item.node_id, row_item.sort_order, row_item.id
  ), '[]'::jsonb)
    into updated_rows
  from public.estimate_row_items row_item
  where row_item.estimate_id = target_estimate_id
    and row_item.node_id in (source_node_id, target_node_id);

  insert into public.estimate_sheet_events (
    estimate_id,
    workspace_id,
    estimate_tab_id,
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
    payload
  )
  values (
    target_estimate_id,
    resolved_workspace_id,
    resolved_tab_id,
    target_node_id,
    moved_row_id,
    'row_reorganized',
    'server_action',
    correlation_id,
    actor_user_id,
    public.estimate_row_context(updated_moved_row),
    old_moved_snapshot,
    new_moved_snapshot,
    array['nodeId', 'sortOrder', 'rowRevision'],
    0,
    jsonb_build_object(
      'movedRowId', moved_row_id,
      'sourceNodeId', source_node_id,
      'targetNodeId', target_node_id,
      'targetSortOrder', target_sort_order,
      'updatedRowCount', updated_row_count,
      'sourceEstimateTabId', source_node_tab_id,
      'targetEstimateTabId', target_node_tab_id
    )
  )
  returning id into inserted_event_id;

  return jsonb_build_object(
    'idempotent', false,
    'eventId', inserted_event_id,
    'updatedRowCount', updated_row_count,
    'rows', updated_rows
  );
end;
$$;
revoke all on function public.move_estimate_row_item_with_history(uuid, uuid, uuid, jsonb, uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.move_estimate_row_item_with_history(uuid, uuid, uuid, jsonb, uuid, uuid, uuid, uuid) to authenticated;
commit;
