-- ============================================================================
-- Estimate sheet row/tree write RPC hardening and atomic bulk tree delete.
--
-- The affected SECURITY DEFINER functions used resolve_estimate_workspace(...),
-- which proves workspace membership but not estimate edit permission. This patch
-- keeps their existing bodies and swaps the authorization line to the canonical
-- edit gate. It also adds a single transactional bulk tree-delete RPC so a
-- multi-node delete can no longer partially commit one root at a time.
-- ============================================================================

begin;

do $$
declare
  function_record record;
  function_oid oid;
  original_definition text;
  hardened_definition text;
begin
  for function_record in
    select *
    from (
      values
        (
          'update_estimate_row_item_with_history',
          'target_project_id uuid, target_estimate_id uuid, target_row_id uuid, expected_row_revision integer, row_patch jsonb, acting_user_id uuid, correlation_id uuid'
        ),
        (
          'replace_estimate_row_item_with_history',
          'target_project_id uuid, target_estimate_id uuid, target_row_id uuid, expected_row_revision integer, replacement_payload jsonb, acting_user_id uuid, correlation_id uuid'
        ),
        (
          'delete_estimate_row_item_with_history',
          'target_project_id uuid, target_estimate_id uuid, target_row_id uuid, expected_row_revision integer, acting_user_id uuid, correlation_id uuid'
        ),
        (
          'delete_estimate_node_with_history',
          'target_project_id uuid, target_estimate_id uuid, target_node_id uuid, acting_user_id uuid, correlation_id uuid'
        )
    ) as function_record(function_name, identity_arguments)
  loop
    select proc.oid
      into function_oid
    from pg_proc proc
    join pg_namespace namespace on namespace.oid = proc.pronamespace
    where namespace.nspname = 'public'
      and proc.proname = function_record.function_name
      and pg_get_function_identity_arguments(proc.oid) = function_record.identity_arguments;

    if function_oid is null then
      raise exception '%(%) not found.', function_record.function_name, function_record.identity_arguments;
    end if;

    original_definition := pg_get_functiondef(function_oid);
    hardened_definition := replace(
      original_definition,
      'resolved_workspace_id := public.resolve_estimate_workspace(target_project_id, target_estimate_id, acting_user_id);',
      'resolved_workspace_id := public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id);'
    );

    if hardened_definition = original_definition
       and original_definition not like '%resolved_workspace_id := public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id);%' then
      raise exception '% edit assertion patch did not match expected authorization line.', function_record.function_name;
    end if;

    if hardened_definition <> original_definition then
      execute hardened_definition;
    end if;
  end loop;
end $$;

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
  first_root_node_id uuid;
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

  select count(*) into deleted_node_count from estimate_sheet_bulk_deleted_node_ids;
  select count(*) into deleted_row_count
  from public.estimate_row_items row_item
  where row_item.estimate_id = target_estimate_id
    and row_item.node_id in (select id from estimate_sheet_bulk_deleted_node_ids);

  select id into first_root_node_id
  from estimate_sheet_bulk_root_node_ids
  order by id
  limit 1;

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
    first_root_node_id,
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
        from (
          select id
          from estimate_sheet_bulk_deleted_node_ids
          order by id
          limit 100
        ) limited_node_ids
      ),
      'deletedNodeIdsTruncated', deleted_node_count > 100,
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
    'deletedNodeCount', deleted_node_count,
    'deletedRowCount', deleted_row_count
  );
end;
$$;

revoke all on function public.delete_estimate_nodes_bulk_with_history(uuid, uuid, uuid[], uuid, uuid) from public, anon;
grant execute on function public.delete_estimate_nodes_bulk_with_history(uuid, uuid, uuid[], uuid, uuid) to authenticated;

create or replace function public.insert_estimate_template_node_into_estimate_with_history(
  target_project_id uuid,
  target_estimate_id uuid,
  target_parent_node_id uuid,
  source_template_id uuid,
  source_template_node_id uuid,
  acting_user_id uuid default null,
  correlation_id uuid default gen_random_uuid(),
  target_tab_id uuid default null
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
  source_node record;
  template_row record;
  create_result jsonb;
  inserted_node_id uuid;
  target_node_id uuid;
  root_sort_order integer;
  inserted_root_node_id uuid;
  inserted_node_count integer := 0;
  inserted_row_item_count integer := 0;
  inserted_event_id uuid;
  copy_provenance jsonb;
  metadata_payload jsonb;
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

  if not exists (
    select 1
    from public.estimate_nodes node
    where node.id = target_parent_node_id
      and node.estimate_id = target_estimate_id
      and (target_tab_id is null or node.estimate_tab_id = target_tab_id)
  ) then
    raise exception 'Target node not found in the current project.';
  end if;

  if not exists (
    select 1
    from public.estimate_templates template
    where template.id = source_template_id
      and template.workspace_id = resolved_workspace_id
  ) then
    raise exception 'Estimate template not found in the current workspace.';
  end if;

  if not exists (
    select 1
    from public.estimate_template_nodes node
    where node.id = source_template_node_id
      and node.template_id = source_template_id
  ) then
    raise exception 'Template node not found in the current workspace.';
  end if;

  create temporary table if not exists estimate_sheet_template_node_copy_map (
    source_node_id uuid primary key,
    created_node_id uuid,
    source_parent_id uuid,
    depth integer,
    sort_order integer
  ) on commit drop;

  truncate table estimate_sheet_template_node_copy_map;

  with recursive subtree as (
    select
      node.id,
      node.parent_id,
      node.sort_order,
      0 as depth
    from public.estimate_template_nodes node
    where node.id = source_template_node_id
      and node.template_id = source_template_id
    union all
    select
      child.id,
      child.parent_id,
      child.sort_order,
      subtree.depth + 1
    from public.estimate_template_nodes child
    join subtree on subtree.id = child.parent_id
    where child.template_id = source_template_id
  )
  insert into estimate_sheet_template_node_copy_map(source_node_id, source_parent_id, depth, sort_order)
  select id, parent_id, depth, sort_order
  from subtree;

  select coalesce(max(node.sort_order), -1) + 1
    into root_sort_order
  from public.estimate_nodes node
  where node.estimate_id = target_estimate_id
    and node.parent_id = target_parent_node_id;

  for source_node in
    select
      template_node.id,
      template_node.parent_id,
      template_node.kind,
      template_node.name,
      template_node.sort_order,
      copy_map.depth
    from estimate_sheet_template_node_copy_map copy_map
    join public.estimate_template_nodes template_node on template_node.id = copy_map.source_node_id
    order by copy_map.depth, template_node.sort_order, template_node.id
  loop
    if source_node.depth = 0 then
      target_node_id := target_parent_node_id;
    else
      select created_node_id
        into target_node_id
      from estimate_sheet_template_node_copy_map
      where source_node_id = source_node.parent_id;
    end if;

    if target_node_id is null then
      raise exception 'Template node structure is inconsistent.';
    end if;

    create_result := public.create_estimate_node_with_history(
      target_project_id,
      target_estimate_id,
      target_node_id,
      source_node.kind::public.estimate_node_kind,
      source_node.name,
      case when source_node.depth = 0 then root_sort_order else source_node.sort_order end,
      resolved_user_id,
      gen_random_uuid(),
      target_tab_id
    );
    inserted_node_id := nullif(create_result->>'nodeId', '')::uuid;
    if inserted_node_id is null then
      raise exception 'Estimate node history RPC did not return the created node id.';
    end if;

    update estimate_sheet_template_node_copy_map
    set created_node_id = inserted_node_id
    where source_node_id = source_node.id;

    if source_node.depth = 0 then
      inserted_root_node_id := inserted_node_id;
    end if;
    inserted_node_count := inserted_node_count + 1;
  end loop;

  for template_row in
    select row_item.*
    from public.estimate_template_row_items row_item
    join estimate_sheet_template_node_copy_map copy_map on copy_map.source_node_id = row_item.template_node_id
    order by copy_map.depth, row_item.sort_order, row_item.id
  loop
    select created_node_id
      into target_node_id
    from estimate_sheet_template_node_copy_map
    where source_node_id = template_row.template_node_id;

    if target_node_id is null then
      raise exception 'Template row target node was not copied.';
    end if;

    copy_provenance := jsonb_build_object(
      'sourceTemplateId', source_template_id,
      'sourceTemplateNodeId', template_row.template_node_id,
      'sourceTemplateRowId', template_row.id,
      'sourceKind', 'template'
    );
    metadata_payload := coalesce(template_row.metadata, '{}'::jsonb) || copy_provenance;
    if jsonb_typeof(metadata_payload->'expressComponent') = 'object' then
      metadata_payload := jsonb_set(metadata_payload, '{expressComponent,id}', to_jsonb(gen_random_uuid()::text), true);
    end if;

    perform public.insert_estimate_row_item_with_history(
      target_project_id,
      target_estimate_id,
      target_node_id,
      jsonb_build_object(
        'id', gen_random_uuid(),
        'sortOrder', template_row.sort_order,
        'sourceLibraryItemId', template_row.source_library_item_id,
        'sourceSnapshot', coalesce(template_row.source_snapshot, '{}'::jsonb) || copy_provenance,
        'categoryNodeId', template_row.category_node_id,
        'supplierId', template_row.supplier_id,
        'material', template_row.material,
        'description', template_row.description,
        'supplier', template_row.supplier,
        'unit', template_row.unit,
        'quantity', template_row.quantity,
        'unitCost', template_row.unit_cost,
        'contingencyPercentage', coalesce(template_row.contingency_percentage, 0),
        'miscCost', template_row.misc_cost,
        'discipline', template_row.discipline,
        'designation', template_row.designation,
        'metadata', metadata_payload,
        'linkState', coalesce(template_row.link_state, case when template_row.source_library_item_id is not null then 'linked-clean' else 'unlinked' end)
      ),
      resolved_user_id,
      gen_random_uuid()
    );
    inserted_row_item_count := inserted_row_item_count + 1;
  end loop;

  if inserted_root_node_id is null then
    raise exception 'Template node insertion did not produce a root node.';
  end if;

  insert into public.estimate_sheet_events (
    estimate_id,
    workspace_id,
    estimate_node_id,
    event_type,
    event_source,
    correlation_id,
    actor_user_id,
    changed_fields,
    payload
  )
  values (
    target_estimate_id,
    resolved_workspace_id,
    inserted_root_node_id,
    'template_node_subtree_inserted',
    'server_action',
    correlation_id,
    resolved_user_id,
    array['tree', 'rows'],
    jsonb_build_object(
      'sourceTemplateId', source_template_id,
      'sourceTemplateNodeId', source_template_node_id,
      'targetParentNodeId', target_parent_node_id,
      'insertedRootNodeId', inserted_root_node_id,
      'insertedNodeCount', inserted_node_count,
      'insertedRowItemCount', inserted_row_item_count
    )
  )
  returning id into inserted_event_id;

  return jsonb_build_object(
    'idempotent', false,
    'eventId', inserted_event_id,
    'insertedRootNodeId', inserted_root_node_id,
    'inserted_root_node_id', inserted_root_node_id,
    'insertedNodeCount', inserted_node_count,
    'insertedRowItemCount', inserted_row_item_count
  );
end;
$$;

revoke all on function public.insert_estimate_template_node_into_estimate_with_history(uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.insert_estimate_template_node_into_estimate_with_history(uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid) to authenticated;

do $$
declare
  function_record record;
  function_oid oid;
  function_definition text;
begin
  for function_record in
    select *
    from (
      values
        (
          'update_estimate_row_item_with_history',
          'target_project_id uuid, target_estimate_id uuid, target_row_id uuid, expected_row_revision integer, row_patch jsonb, acting_user_id uuid, correlation_id uuid'
        ),
        (
          'replace_estimate_row_item_with_history',
          'target_project_id uuid, target_estimate_id uuid, target_row_id uuid, expected_row_revision integer, replacement_payload jsonb, acting_user_id uuid, correlation_id uuid'
        ),
        (
          'delete_estimate_row_item_with_history',
          'target_project_id uuid, target_estimate_id uuid, target_row_id uuid, expected_row_revision integer, acting_user_id uuid, correlation_id uuid'
        ),
        (
          'delete_estimate_node_with_history',
          'target_project_id uuid, target_estimate_id uuid, target_node_id uuid, acting_user_id uuid, correlation_id uuid'
        ),
        (
          'delete_estimate_nodes_bulk_with_history',
          'target_project_id uuid, target_estimate_id uuid, target_node_ids uuid[], acting_user_id uuid, correlation_id uuid'
        ),
        (
          'insert_estimate_template_node_into_estimate_with_history',
          'target_project_id uuid, target_estimate_id uuid, target_parent_node_id uuid, source_template_id uuid, source_template_node_id uuid, acting_user_id uuid, correlation_id uuid, target_tab_id uuid'
        )
    ) as function_record(function_name, identity_arguments)
  loop
    select proc.oid
      into function_oid
    from pg_proc proc
    join pg_namespace namespace on namespace.oid = proc.pronamespace
    where namespace.nspname = 'public'
      and proc.proname = function_record.function_name
      and pg_get_function_identity_arguments(proc.oid) = function_record.identity_arguments;

    if function_oid is null then
      raise exception '% verify target not found.', function_record.function_name;
    end if;

    function_definition := pg_get_functiondef(function_oid);
    if function_definition not like '%resolved_workspace_id := public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id);%' then
      raise exception '% is missing estimate edit authorization.', function_record.function_name;
    end if;
  end loop;
end $$;

commit;
