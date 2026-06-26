-- ============================================================================
-- Tree/subtree delete undo.
--
-- Tree delete history previously recorded only ids/counts and a small sample of
-- deleted rows. Post-success Undo needs canonical node + row snapshots so the
-- subtree can be restored after the delete transaction commits.
-- ============================================================================

begin;

alter table public.estimate_sheet_events
  drop constraint if exists estimate_sheet_events_payload_size_check;

alter table public.estimate_sheet_events
  add constraint estimate_sheet_events_payload_size_check check (
    pg_column_size(row_context)
      + pg_column_size(coalesce(old_snapshot, '{}'::jsonb))
      + pg_column_size(coalesce(new_snapshot, '{}'::jsonb))
      + pg_column_size(payload)
      <= 5242880
  );

create or replace function public.estimate_node_snapshot(estimate_node public.estimate_nodes)
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', estimate_node.id,
    'estimateId', estimate_node.estimate_id,
    'estimateTabId', estimate_node.estimate_tab_id,
    'parentId', estimate_node.parent_id,
    'kind', estimate_node.kind,
    'name', estimate_node.name,
    'sortOrder', estimate_node.sort_order,
    'metadata', estimate_node.metadata,
    'createdAt', estimate_node.created_at,
    'updatedAt', estimate_node.updated_at
  );
$$;

revoke execute on function public.estimate_node_snapshot(public.estimate_nodes) from public, anon, authenticated;

create or replace function public.delete_estimate_node_with_history(
  target_project_id uuid,
  target_estimate_id uuid,
  target_node_id uuid,
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
  inserted_event_id uuid;
  deleted_node_count integer;
  deleted_row_count integer;
  deleted_total numeric := 0;
  deleted_node_snapshots jsonb := '[]'::jsonb;
  deleted_row_snapshots jsonb := '[]'::jsonb;
  target_node record;
  fallback_node_id uuid;
begin
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

  select node.*
    into target_node
  from public.estimate_nodes node
  where node.id = target_node_id
    and node.estimate_id = target_estimate_id;

  if target_node.id is null then
    raise exception 'Estimate tree node not found in the current project.';
  end if;

  create temporary table if not exists estimate_sheet_deleted_node_ids (
    id uuid primary key
  ) on commit drop;

  truncate table estimate_sheet_deleted_node_ids;

  with recursive deleted_nodes(id) as (
    select node.id
    from public.estimate_nodes node
    where node.id = target_node_id
      and node.estimate_id = target_estimate_id
    union all
    select child.id
    from public.estimate_nodes child
    join deleted_nodes parent on parent.id = child.parent_id
    where child.estimate_id = target_estimate_id
  )
  insert into estimate_sheet_deleted_node_ids(id)
  select distinct id from deleted_nodes;

  select node.id
    into fallback_node_id
  from public.estimate_nodes node
  where node.estimate_id = target_estimate_id
    and node.parent_id is not distinct from target_node.parent_id
    and (target_node.parent_id is not null or node.estimate_tab_id is not distinct from target_node.estimate_tab_id)
    and not exists (select 1 from estimate_sheet_deleted_node_ids deleted where deleted.id = node.id)
    and (node.sort_order, node.id) > (target_node.sort_order, target_node.id)
  order by node.sort_order asc, node.id asc
  limit 1;

  if fallback_node_id is null then
    select node.id
      into fallback_node_id
    from public.estimate_nodes node
    where node.estimate_id = target_estimate_id
      and node.parent_id is not distinct from target_node.parent_id
      and (target_node.parent_id is not null or node.estimate_tab_id is not distinct from target_node.estimate_tab_id)
      and not exists (select 1 from estimate_sheet_deleted_node_ids deleted where deleted.id = node.id)
      and (node.sort_order, node.id) < (target_node.sort_order, target_node.id)
    order by node.sort_order desc, node.id desc
    limit 1;
  end if;

  if fallback_node_id is null and target_node.parent_id is not null then
    select node.id
      into fallback_node_id
    from public.estimate_nodes node
    where node.id = target_node.parent_id
      and node.estimate_id = target_estimate_id
      and not exists (select 1 from estimate_sheet_deleted_node_ids deleted where deleted.id = node.id)
    limit 1;
  end if;

  if fallback_node_id is null then
    select node.id
      into fallback_node_id
    from public.estimate_nodes node
    where node.estimate_id = target_estimate_id
      and node.parent_id is null
      and node.estimate_tab_id is not distinct from target_node.estimate_tab_id
      and not exists (select 1 from estimate_sheet_deleted_node_ids deleted where deleted.id = node.id)
    order by node.sort_order asc, node.id asc
    limit 1;
  end if;

  select count(*),
         coalesce(jsonb_agg(public.estimate_node_snapshot(node) order by node.parent_id nulls first, node.sort_order, node.created_at, node.id), '[]'::jsonb)
    into deleted_node_count, deleted_node_snapshots
  from public.estimate_nodes node
  where node.estimate_id = target_estimate_id
    and node.id in (select id from estimate_sheet_deleted_node_ids);

  select count(*),
         coalesce(jsonb_agg(public.estimate_row_item_snapshot(row_item) order by row_item.node_id, row_item.sort_order, row_item.created_at, row_item.id), '[]'::jsonb),
         coalesce(sum(public.estimate_row_line_total(row_item)), 0)
    into deleted_row_count, deleted_row_snapshots, deleted_total
  from public.estimate_row_items row_item
  where row_item.estimate_id = target_estimate_id
    and row_item.node_id in (select id from estimate_sheet_deleted_node_ids);

  insert into public.estimate_sheet_events (
    estimate_id,
    workspace_id,
    estimate_node_id,
    estimate_tab_id,
    event_type,
    event_source,
    correlation_id,
    actor_user_id,
    changed_fields,
    total_delta,
    payload
  )
  values (
    target_estimate_id,
    resolved_workspace_id,
    target_node_id,
    target_node.estimate_tab_id,
    'node_deleted_with_children',
    'server_action',
    correlation_id,
    resolved_user_id,
    array['tree', 'rows'],
    -deleted_total,
    jsonb_build_object(
      'deletedNodeId', target_node_id,
      'deletedNodeCount', deleted_node_count,
      'deletedRowCount', deleted_row_count,
      'deletedNodeIds', (
        select coalesce(jsonb_agg(id order by id), '[]'::jsonb)
        from estimate_sheet_deleted_node_ids
      ),
      'fallbackNodeId', fallback_node_id,
      'deletedNodes', deleted_node_snapshots,
      'deletedRows', deleted_row_snapshots,
      'sampleRows', (
        select coalesce(jsonb_agg(public.estimate_row_context(row_item) order by row_item.node_id, row_item.sort_order, row_item.id), '[]'::jsonb)
        from (
          select *
          from public.estimate_row_items row_item
          where row_item.estimate_id = target_estimate_id
            and row_item.node_id in (select id from estimate_sheet_deleted_node_ids)
          order by row_item.node_id, row_item.sort_order, row_item.id
          limit 20
        ) row_item
      )
    )
  )
  returning id into inserted_event_id;

  delete from public.estimate_nodes node
  where node.id = target_node_id
    and node.estimate_id = target_estimate_id;

  return jsonb_build_object(
    'idempotent', false,
    'eventId', inserted_event_id,
    'deletedNodeId', target_node_id,
    'deletedNodeIds', (
      select coalesce(jsonb_agg(id order by id), '[]'::jsonb)
      from estimate_sheet_deleted_node_ids
    ),
    'fallbackNodeId', fallback_node_id,
    'deletedNodeCount', deleted_node_count,
    'deletedRowCount', deleted_row_count
  );
end;
$$;

revoke all on function public.delete_estimate_node_with_history(uuid, uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.delete_estimate_node_with_history(uuid, uuid, uuid, uuid, uuid) to authenticated;

create or replace function public.delete_estimate_nodes_bulk_with_history(
  target_project_id uuid,
  target_estimate_id uuid,
  target_node_ids uuid[],
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
  requested_count integer;
  missing_node_count integer;
  root_node_count integer;
  deleted_node_count integer;
  deleted_row_count integer;
  deleted_total numeric := 0;
  deleted_node_snapshots jsonb := '[]'::jsonb;
  deleted_row_snapshots jsonb := '[]'::jsonb;
  inserted_event_id uuid;
  first_root_node record;
  fallback_node_id uuid;
begin
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

  create temporary table if not exists estimate_sheet_bulk_requested_node_ids (
    id uuid primary key
  ) on commit drop;

  create temporary table if not exists estimate_sheet_bulk_root_node_ids (
    id uuid primary key
  ) on commit drop;

  create temporary table if not exists estimate_sheet_bulk_deleted_node_ids (
    id uuid primary key
  ) on commit drop;

  truncate table estimate_sheet_bulk_requested_node_ids;
  truncate table estimate_sheet_bulk_root_node_ids;
  truncate table estimate_sheet_bulk_deleted_node_ids;

  insert into estimate_sheet_bulk_requested_node_ids(id)
  select distinct node_id
  from unnest(coalesce(target_node_ids, array[]::uuid[])) as requested(node_id)
  where node_id is not null;

  select count(*) into requested_count from estimate_sheet_bulk_requested_node_ids;
  if requested_count = 0 then
    raise exception 'At least one estimate tree node is required for bulk delete.';
  end if;

  select count(*) into missing_node_count
  from estimate_sheet_bulk_requested_node_ids requested
  where not exists (
    select 1
    from public.estimate_nodes node
    where node.id = requested.id
      and node.estimate_id = target_estimate_id
  );

  if missing_node_count > 0 then
    raise exception 'One or more estimate tree nodes were not found in the current project.';
  end if;

  with recursive ancestors(root_id, ancestor_id) as (
    select requested.id, node.parent_id
    from estimate_sheet_bulk_requested_node_ids requested
    join public.estimate_nodes node on node.id = requested.id
    where node.estimate_id = target_estimate_id
    union all
    select ancestors.root_id, parent.parent_id
    from ancestors
    join public.estimate_nodes parent on parent.id = ancestors.ancestor_id
    where parent.estimate_id = target_estimate_id
      and ancestors.ancestor_id is not null
  )
  insert into estimate_sheet_bulk_root_node_ids(id)
  select requested.id
  from estimate_sheet_bulk_requested_node_ids requested
  where not exists (
    select 1
    from ancestors
    join estimate_sheet_bulk_requested_node_ids selected_ancestor on selected_ancestor.id = ancestors.ancestor_id
    where ancestors.root_id = requested.id
  );

  select count(*) into root_node_count from estimate_sheet_bulk_root_node_ids;
  if root_node_count = 0 then
    raise exception 'No selectable estimate tree nodes were found for bulk delete.';
  end if;

  select node.*
    into first_root_node
  from estimate_sheet_bulk_root_node_ids root
  join public.estimate_nodes node on node.id = root.id
  where node.estimate_id = target_estimate_id
  order by node.sort_order asc, node.id asc
  limit 1;

  with recursive deleted_nodes(id) as (
    select root.id
    from estimate_sheet_bulk_root_node_ids root
    union all
    select child.id
    from public.estimate_nodes child
    join deleted_nodes parent on parent.id = child.parent_id
    where child.estimate_id = target_estimate_id
  )
  insert into estimate_sheet_bulk_deleted_node_ids(id)
  select distinct id from deleted_nodes;

  select node.id
    into fallback_node_id
  from public.estimate_nodes node
  where node.estimate_id = target_estimate_id
    and node.parent_id is not distinct from first_root_node.parent_id
    and (first_root_node.parent_id is not null or node.estimate_tab_id is not distinct from first_root_node.estimate_tab_id)
    and not exists (select 1 from estimate_sheet_bulk_deleted_node_ids deleted where deleted.id = node.id)
    and (node.sort_order, node.id) > (first_root_node.sort_order, first_root_node.id)
  order by node.sort_order asc, node.id asc
  limit 1;

  if fallback_node_id is null then
    select node.id
      into fallback_node_id
    from public.estimate_nodes node
    where node.estimate_id = target_estimate_id
      and node.parent_id is not distinct from first_root_node.parent_id
      and (first_root_node.parent_id is not null or node.estimate_tab_id is not distinct from first_root_node.estimate_tab_id)
      and not exists (select 1 from estimate_sheet_bulk_deleted_node_ids deleted where deleted.id = node.id)
      and (node.sort_order, node.id) < (first_root_node.sort_order, first_root_node.id)
    order by node.sort_order desc, node.id desc
    limit 1;
  end if;

  if fallback_node_id is null and first_root_node.parent_id is not null then
    select node.id
      into fallback_node_id
    from public.estimate_nodes node
    where node.id = first_root_node.parent_id
      and node.estimate_id = target_estimate_id
      and not exists (select 1 from estimate_sheet_bulk_deleted_node_ids deleted where deleted.id = node.id)
    limit 1;
  end if;

  if fallback_node_id is null then
    select node.id
      into fallback_node_id
    from public.estimate_nodes node
    where node.estimate_id = target_estimate_id
      and node.parent_id is null
      and node.estimate_tab_id is not distinct from first_root_node.estimate_tab_id
      and not exists (select 1 from estimate_sheet_bulk_deleted_node_ids deleted where deleted.id = node.id)
    order by node.sort_order asc, node.id asc
    limit 1;
  end if;

  select count(*),
         coalesce(jsonb_agg(public.estimate_node_snapshot(node) order by node.parent_id nulls first, node.sort_order, node.created_at, node.id), '[]'::jsonb)
    into deleted_node_count, deleted_node_snapshots
  from public.estimate_nodes node
  where node.estimate_id = target_estimate_id
    and node.id in (select id from estimate_sheet_bulk_deleted_node_ids);

  select count(*),
         coalesce(jsonb_agg(public.estimate_row_item_snapshot(row_item) order by row_item.node_id, row_item.sort_order, row_item.created_at, row_item.id), '[]'::jsonb),
         coalesce(sum(public.estimate_row_line_total(row_item)), 0)
    into deleted_row_count, deleted_row_snapshots, deleted_total
  from public.estimate_row_items row_item
  where row_item.estimate_id = target_estimate_id
    and row_item.node_id in (select id from estimate_sheet_bulk_deleted_node_ids);

  insert into public.estimate_sheet_events (
    estimate_id,
    workspace_id,
    estimate_node_id,
    estimate_tab_id,
    event_type,
    event_source,
    correlation_id,
    actor_user_id,
    changed_fields,
    total_delta,
    payload
  )
  values (
    target_estimate_id,
    resolved_workspace_id,
    first_root_node.id,
    first_root_node.estimate_tab_id,
    'nodes_bulk_deleted_with_children',
    'server_action',
    correlation_id,
    resolved_user_id,
    array['tree', 'rows'],
    -deleted_total,
    jsonb_build_object(
      'deletedRootNodeIds', (
        select coalesce(jsonb_agg(id order by id), '[]'::jsonb)
        from estimate_sheet_bulk_root_node_ids
      ),
      'requestedNodeCount', requested_count,
      'deletedNodeCount', deleted_node_count,
      'deletedRowCount', deleted_row_count,
      'deletedNodeIds', (
        select coalesce(jsonb_agg(id order by id), '[]'::jsonb)
        from estimate_sheet_bulk_deleted_node_ids
      ),
      'fallbackNodeId', fallback_node_id,
      'deletedNodes', deleted_node_snapshots,
      'deletedRows', deleted_row_snapshots,
      'sampleRows', (
        select coalesce(jsonb_agg(public.estimate_row_context(row_item) order by row_item.node_id, row_item.sort_order, row_item.id), '[]'::jsonb)
        from (
          select *
          from public.estimate_row_items row_item
          where row_item.estimate_id = target_estimate_id
            and row_item.node_id in (select id from estimate_sheet_bulk_deleted_node_ids)
          order by row_item.node_id, row_item.sort_order, row_item.id
          limit 20
        ) row_item
      )
    )
  )
  returning id into inserted_event_id;

  delete from public.estimate_nodes node
  where node.estimate_id = target_estimate_id
    and node.id in (select id from estimate_sheet_bulk_root_node_ids);

  return jsonb_build_object(
    'idempotent', false,
    'eventId', inserted_event_id,
    'deletedRootNodeIds', (
      select coalesce(jsonb_agg(id order by id), '[]'::jsonb)
      from estimate_sheet_bulk_root_node_ids
    ),
    'deletedNodeIds', (
      select coalesce(jsonb_agg(id order by id), '[]'::jsonb)
      from estimate_sheet_bulk_deleted_node_ids
    ),
    'fallbackNodeId', fallback_node_id,
    'deletedNodeCount', deleted_node_count,
    'deletedRowCount', deleted_row_count
  );
end;
$$;

revoke all on function public.delete_estimate_nodes_bulk_with_history(uuid, uuid, uuid[], uuid, uuid) from public, anon;
grant execute on function public.delete_estimate_nodes_bulk_with_history(uuid, uuid, uuid[], uuid, uuid) to authenticated;

create or replace function public.restore_deleted_estimate_nodes_with_history(
  target_project_id uuid,
  target_estimate_id uuid,
  source_delete_event_id uuid,
  target_node_ids uuid[] default null,
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
  source_node_snapshots jsonb := '[]'::jsonb;
  source_row_snapshots jsonb := '[]'::jsonb;
  requested_node_count integer := 0;
  restored_node_ids uuid[] := array[]::uuid[];
  restored_root_node_ids uuid[] := array[]::uuid[];
  restored_row_ids uuid[] := array[]::uuid[];
  restored_node_count integer := 0;
  restored_row_count integer := 0;
  total_delta numeric := 0;
  inserted_event_id uuid;
  first_restored_node_id uuid;
  first_restored_tab_id uuid;
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
    and event.event_type in ('node_deleted_with_children', 'nodes_bulk_deleted_with_children')
  for share;

  if delete_event.id is null then
    raise exception 'Deleted node history event not found.';
  end if;

  select *
    into existing_restore_event
  from public.estimate_sheet_events event
  where event.estimate_id = target_estimate_id
    and event.event_type = 'nodes_restored_with_children'
    and event.payload->>'sourceEventId' = source_delete_event_id::text
  order by event.created_at desc, event.id desc
  limit 1;

  if existing_restore_event.id is not null then
    return jsonb_build_object(
      'idempotent', true,
      'eventId', existing_restore_event.id,
      'sourceEventId', source_delete_event_id,
      'restoredNodeIds', coalesce(existing_restore_event.payload->'restoredNodeIds', '[]'::jsonb),
      'restoredRootNodeIds', coalesce(existing_restore_event.payload->'restoredRootNodeIds', '[]'::jsonb),
      'restoredNodeCount', coalesce((existing_restore_event.payload->>'restoredNodeCount')::integer, 0),
      'restoredRowIds', coalesce(existing_restore_event.payload->'restoredRowIds', '[]'::jsonb),
      'restoredRowCount', coalesce((existing_restore_event.payload->>'restoredRowCount')::integer, 0)
    );
  end if;

  source_node_snapshots := coalesce(delete_event.payload->'deletedNodes', delete_event.old_snapshot->'deletedNodes', '[]'::jsonb);
  source_row_snapshots := coalesce(delete_event.payload->'deletedRows', delete_event.old_snapshot->'deletedRows', '[]'::jsonb);

  if jsonb_typeof(source_node_snapshots) <> 'array' or jsonb_array_length(source_node_snapshots) = 0 then
    raise exception 'Deleted node history event does not include a restorable node snapshot.';
  end if;

  drop table if exists estimate_sheet_restore_requested_node_ids;
  drop table if exists estimate_sheet_restore_source_nodes;
  drop table if exists estimate_sheet_restore_nodes;

  create temporary table estimate_sheet_restore_requested_node_ids (
    id uuid primary key
  ) on commit drop;

  create temporary table estimate_sheet_restore_source_nodes (
    id uuid primary key,
    estimate_id uuid not null,
    estimate_tab_id uuid not null,
    parent_id uuid,
    kind public.estimate_node_kind not null,
    name text not null,
    sort_order numeric(20,4) not null,
    metadata jsonb not null,
    created_at timestamptz
  ) on commit drop;

  create temporary table estimate_sheet_restore_nodes (
    id uuid primary key,
    estimate_id uuid not null,
    estimate_tab_id uuid not null,
    parent_id uuid,
    kind public.estimate_node_kind not null,
    name text not null,
    sort_order numeric(20,4) not null,
    restored_sort_order numeric(20,4),
    metadata jsonb not null,
    created_at timestamptz,
    depth integer
  ) on commit drop;

  insert into estimate_sheet_restore_requested_node_ids(id)
  select distinct node_id
  from unnest(coalesce(target_node_ids, array[]::uuid[])) as requested(node_id)
  where node_id is not null;

  select count(*) into requested_node_count from estimate_sheet_restore_requested_node_ids;

  insert into estimate_sheet_restore_source_nodes (
    id,
    estimate_id,
    estimate_tab_id,
    parent_id,
    kind,
    name,
    sort_order,
    metadata,
    created_at
  )
  select distinct on (snapshot."id")
    snapshot."id",
    snapshot."estimateId",
    snapshot."estimateTabId",
    snapshot."parentId",
    snapshot."kind"::public.estimate_node_kind,
    coalesce(nullif(snapshot."name", ''), 'Restored Area'),
    coalesce(snapshot."sortOrder", 0),
    coalesce(snapshot."metadata", '{}'::jsonb),
    snapshot."createdAt"
  from jsonb_to_recordset(source_node_snapshots) as snapshot(
    "id" uuid,
    "estimateId" uuid,
    "estimateTabId" uuid,
    "parentId" uuid,
    "kind" text,
    "name" text,
    "sortOrder" numeric,
    "metadata" jsonb,
    "createdAt" timestamptz
  )
  where snapshot."id" is not null
  order by snapshot."id";

  if exists (
    select 1
    from estimate_sheet_restore_source_nodes source_node
    where source_node.estimate_id <> target_estimate_id
  ) then
    raise exception 'Deleted node history event does not belong to this estimate.';
  end if;

  if requested_node_count > 0 and exists (
    select 1
    from estimate_sheet_restore_requested_node_ids requested
    where not exists (
      select 1
      from estimate_sheet_restore_source_nodes source_node
      where source_node.id = requested.id
    )
  ) then
    raise exception 'One or more deleted nodes were not found in the source delete event.';
  end if;

  with recursive selected_nodes as (
    select source_node.*
    from estimate_sheet_restore_source_nodes source_node
    where requested_node_count = 0
      or exists (
        select 1
        from estimate_sheet_restore_requested_node_ids requested
        where requested.id = source_node.id
      )
    union
    select child.*
    from estimate_sheet_restore_source_nodes child
    join selected_nodes parent on parent.id = child.parent_id
  )
  insert into estimate_sheet_restore_nodes (
    id,
    estimate_id,
    estimate_tab_id,
    parent_id,
    kind,
    name,
    sort_order,
    metadata,
    created_at
  )
  select distinct on (selected_nodes.id)
    selected_nodes.id,
    selected_nodes.estimate_id,
    selected_nodes.estimate_tab_id,
    selected_nodes.parent_id,
    selected_nodes.kind,
    selected_nodes.name,
    selected_nodes.sort_order,
    selected_nodes.metadata,
    selected_nodes.created_at
  from selected_nodes
  order by selected_nodes.id;

  if not exists (select 1 from estimate_sheet_restore_nodes) then
    raise exception 'No deleted nodes matched the restore request.';
  end if;

  if exists (
    select 1
    from estimate_sheet_restore_nodes restored
    where exists (
      select 1
      from public.estimate_nodes existing
      where existing.id = restored.id
    )
  ) then
    raise exception 'One or more deleted nodes have already been restored.';
  end if;

  if exists (
    select 1
    from estimate_sheet_restore_nodes restored
    where restored.parent_id is not null
      and not exists (
        select 1
        from estimate_sheet_restore_nodes restored_parent
        where restored_parent.id = restored.parent_id
      )
      and not exists (
        select 1
        from public.estimate_nodes existing_parent
        where existing_parent.id = restored.parent_id
          and existing_parent.estimate_id = target_estimate_id
      )
  ) then
    raise exception 'Deleted node parent is no longer available.';
  end if;

  if exists (
    select 1
    from estimate_sheet_restore_nodes restored
    where not exists (
      select 1
      from public.estimate_tabs tab
      where tab.id = restored.estimate_tab_id
        and tab.estimate_id = target_estimate_id
    )
  ) then
    raise exception 'Deleted node tab is no longer available.';
  end if;

  with recursive ordered_nodes as (
    select restored.id, 0 as depth
    from estimate_sheet_restore_nodes restored
    where restored.parent_id is null
      or not exists (
        select 1
        from estimate_sheet_restore_nodes parent
        where parent.id = restored.parent_id
      )
    union all
    select child.id, parent.depth + 1
    from estimate_sheet_restore_nodes child
    join ordered_nodes parent on parent.id = child.parent_id
  )
  update estimate_sheet_restore_nodes restored
  set depth = ordered_nodes.depth
  from ordered_nodes
  where ordered_nodes.id = restored.id;

  if exists (select 1 from estimate_sheet_restore_nodes where depth is null) then
    raise exception 'Deleted node history event contains an invalid subtree.';
  end if;

  with external_roots as (
    select
      restored.id,
      restored.estimate_tab_id,
      restored.parent_id,
      restored.sort_order,
      row_number() over (
        partition by restored.estimate_tab_id, restored.parent_id
        order by restored.sort_order, restored.id
      ) as sibling_rank
    from estimate_sheet_restore_nodes restored
    where restored.parent_id is null
      or not exists (
        select 1
        from estimate_sheet_restore_nodes parent
        where parent.id = restored.parent_id
      )
  ),
  conflict_groups as (
    select root.estimate_tab_id, root.parent_id
    from external_roots root
    where exists (
      select 1
      from public.estimate_nodes existing
      where existing.estimate_tab_id = root.estimate_tab_id
        and existing.parent_id is not distinct from root.parent_id
        and existing.sort_order = root.sort_order
    )
    group by root.estimate_tab_id, root.parent_id
  ),
  ranked_roots as (
    select
      root.id,
      case
        when conflict_groups.estimate_tab_id is not null then
          coalesce((
            select max(existing.sort_order)
            from public.estimate_nodes existing
            where existing.estimate_tab_id = root.estimate_tab_id
              and existing.parent_id is not distinct from root.parent_id
          ), 0) + (root.sibling_rank * 10)
        else root.sort_order
      end as restored_sort_order
    from external_roots root
    left join conflict_groups
      on conflict_groups.estimate_tab_id = root.estimate_tab_id
     and conflict_groups.parent_id is not distinct from root.parent_id
  )
  update estimate_sheet_restore_nodes restored
  set restored_sort_order = ranked_roots.restored_sort_order
  from ranked_roots
  where ranked_roots.id = restored.id;

  update estimate_sheet_restore_nodes
  set restored_sort_order = sort_order
  where restored_sort_order is null;

  select coalesce(array_agg(restored.id order by restored.depth, restored.restored_sort_order, restored.id), array[]::uuid[])
    into restored_root_node_ids
  from estimate_sheet_restore_nodes restored
  where restored.parent_id is null
    or not exists (
      select 1
      from estimate_sheet_restore_nodes parent
      where parent.id = restored.parent_id
    );

  select restored.id, restored.estimate_tab_id
    into first_restored_node_id, first_restored_tab_id
  from estimate_sheet_restore_nodes restored
  order by restored.depth, restored.restored_sort_order, restored.id
  limit 1;

  with inserted_nodes as (
    insert into public.estimate_nodes (
      id,
      estimate_id,
      estimate_tab_id,
      parent_id,
      kind,
      name,
      sort_order,
      metadata,
      created_at
    )
    select
      restored.id,
      target_estimate_id,
      restored.estimate_tab_id,
      restored.parent_id,
      restored.kind,
      restored.name,
      restored.restored_sort_order,
      restored.metadata,
      coalesce(restored.created_at, now())
    from estimate_sheet_restore_nodes restored
    order by restored.depth, restored.restored_sort_order, restored.id
    returning id
  )
  select coalesce(array_agg(id order by id), array[]::uuid[]), count(*)
    into restored_node_ids, restored_node_count
  from inserted_nodes;

  if exists (
    select 1
    from jsonb_to_recordset(source_row_snapshots) as row_snapshot("id" uuid, "nodeId" uuid)
    join estimate_sheet_restore_nodes restored on restored.id = row_snapshot."nodeId"
    join public.estimate_row_items existing on existing.id = row_snapshot."id"
  ) then
    raise exception 'One or more deleted rows have already been restored.';
  end if;

  with inserted_rows as (
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
    select
      row_snapshot."id",
      target_estimate_id,
      row_snapshot."nodeId",
      coalesce(row_snapshot."sortOrder", 0),
      row_snapshot."sourceLibraryItemId",
      row_snapshot."sourceSnapshot",
      nullif(row_snapshot."categoryNodeId", ''),
      row_snapshot."supplierId",
      coalesce(row_snapshot."material", ''),
      coalesce(row_snapshot."description", ''),
      coalesce(row_snapshot."supplier", ''),
      coalesce(nullif(row_snapshot."unit", ''), 'unit'),
      coalesce(row_snapshot."quantity", 0),
      coalesce(row_snapshot."unitCost", 0),
      coalesce(row_snapshot."contingencyPercentage", 0),
      coalesce(row_snapshot."miscCost", 0),
      coalesce(row_snapshot."discipline", ''),
      coalesce(row_snapshot."designation", ''),
      coalesce(row_snapshot."linkState", 'unlinked')::public.estimate_row_link_state,
      coalesce(row_snapshot."metadata", '{}'::jsonb),
      coalesce(row_snapshot."rowRevision", 1) + 1,
      coalesce(row_snapshot."createdAt", now())
    from jsonb_to_recordset(source_row_snapshots) as row_snapshot(
      "id" uuid,
      "nodeId" uuid,
      "sortOrder" integer,
      "sourceLibraryItemId" uuid,
      "sourceSnapshot" jsonb,
      "categoryNodeId" text,
      "supplierId" uuid,
      "material" text,
      "description" text,
      "supplier" text,
      "unit" text,
      "quantity" numeric,
      "unitCost" numeric,
      "contingencyPercentage" numeric,
      "miscCost" numeric,
      "discipline" text,
      "designation" text,
      "linkState" text,
      "metadata" jsonb,
      "rowRevision" integer,
      "createdAt" timestamptz
    )
    join estimate_sheet_restore_nodes restored on restored.id = row_snapshot."nodeId"
    order by row_snapshot."nodeId", row_snapshot."sortOrder", row_snapshot."id"
    returning *
  )
  select coalesce(array_agg(inserted_rows.id order by inserted_rows.node_id, inserted_rows.sort_order, inserted_rows.id), array[]::uuid[]),
         count(*),
         coalesce(sum(public.estimate_row_line_total(inserted_rows)), 0)
    into restored_row_ids, restored_row_count, total_delta
  from inserted_rows;

  insert into public.estimate_sheet_events (
    estimate_id,
    workspace_id,
    estimate_node_id,
    estimate_tab_id,
    event_type,
    event_source,
    correlation_id,
    actor_user_id,
    new_snapshot,
    changed_fields,
    total_delta,
    payload
  )
  values (
    target_estimate_id,
    resolved_workspace_id,
    first_restored_node_id,
    first_restored_tab_id,
    'nodes_restored_with_children',
    'server_action',
    correlation_id,
    resolved_user_id,
    jsonb_build_object('restoredNodeIds', to_jsonb(restored_node_ids), 'restoredRowIds', to_jsonb(restored_row_ids)),
    array['tree', 'rows'],
    total_delta,
    jsonb_build_object(
      'sourceEventId', source_delete_event_id,
      'restoredNodeIds', to_jsonb(restored_node_ids),
      'restoredRootNodeIds', to_jsonb(restored_root_node_ids),
      'restoredNodeCount', restored_node_count,
      'restoredRowIds', to_jsonb(restored_row_ids),
      'restoredRowCount', restored_row_count
    )
  )
  returning id into inserted_event_id;

  return jsonb_build_object(
    'idempotent', false,
    'eventId', inserted_event_id,
    'sourceEventId', source_delete_event_id,
    'restoredNodeIds', to_jsonb(restored_node_ids),
    'restoredRootNodeIds', to_jsonb(restored_root_node_ids),
    'restoredNodeCount', restored_node_count,
    'restoredRowIds', to_jsonb(restored_row_ids),
    'restoredRowCount', restored_row_count
  );
end;
$$;

revoke all on function public.restore_deleted_estimate_nodes_with_history(uuid, uuid, uuid, uuid[], uuid, uuid) from public, anon;
grant execute on function public.restore_deleted_estimate_nodes_with_history(uuid, uuid, uuid, uuid[], uuid, uuid) to authenticated;

commit;
