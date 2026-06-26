begin;

do $$
declare
  rename_definition text;
begin
  select pg_get_functiondef(p.oid)
    into rename_definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'rename_estimate_node_with_history'
    and pg_get_function_identity_arguments(p.oid) =
      'target_project_id uuid, target_estimate_id uuid, target_node_id uuid, next_name text, acting_user_id uuid, correlation_id uuid';

  if rename_definition is null then
    raise exception 'rename_estimate_node_with_history function was not found.';
  end if;

  rename_definition := replace(
    rename_definition,
    'resolved_workspace_id := public.resolve_estimate_workspace(target_project_id, target_estimate_id, acting_user_id);',
    'resolved_workspace_id := public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id);'
  );

  if rename_definition not like '%resolved_workspace_id := public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id);%' then
    raise exception 'rename_estimate_node_with_history edit assertion patch did not match expected authorization line.';
  end if;

  execute rename_definition;
end $$;

revoke all on function public.rename_estimate_node_with_history(uuid, uuid, uuid, text, uuid, uuid) from public, anon;
grant execute on function public.rename_estimate_node_with_history(uuid, uuid, uuid, text, uuid, uuid) to authenticated;

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

  select count(*) into deleted_node_count from estimate_sheet_deleted_node_ids;
  select count(*) into deleted_row_count
  from public.estimate_row_items row_item
  where row_item.estimate_id = target_estimate_id
    and row_item.node_id in (select id from estimate_sheet_deleted_node_ids);

  insert into public.estimate_sheet_events (
    estimate_id,
    workspace_id,
    estimate_node_id,
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
    'node_deleted_with_children',
    'server_action',
    correlation_id,
    resolved_user_id,
    array['tree', 'rows'],
    -coalesce((
      select sum(public.estimate_row_line_total(row_item))
      from public.estimate_row_items row_item
      where row_item.estimate_id = target_estimate_id
        and row_item.node_id in (select id from estimate_sheet_deleted_node_ids)
    ), 0),
    jsonb_build_object(
      'deletedNodeId', target_node_id,
      'deletedNodeCount', deleted_node_count,
      'deletedRowCount', deleted_row_count,
      'deletedNodeIds', (
        select coalesce(jsonb_agg(id order by id), '[]'::jsonb)
        from estimate_sheet_deleted_node_ids
      ),
      'fallbackNodeId', fallback_node_id,
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

  select count(*) into deleted_node_count from estimate_sheet_bulk_deleted_node_ids;
  select count(*) into deleted_row_count
  from public.estimate_row_items row_item
  where row_item.estimate_id = target_estimate_id
    and row_item.node_id in (select id from estimate_sheet_bulk_deleted_node_ids);

  insert into public.estimate_sheet_events (
    estimate_id,
    workspace_id,
    estimate_node_id,
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
    'nodes_bulk_deleted_with_children',
    'server_action',
    correlation_id,
    resolved_user_id,
    array['tree', 'rows'],
    -coalesce((
      select sum(public.estimate_row_line_total(row_item))
      from public.estimate_row_items row_item
      where row_item.estimate_id = target_estimate_id
        and row_item.node_id in (select id from estimate_sheet_bulk_deleted_node_ids)
    ), 0),
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

commit;
