-- Replace the public restore-as-copy RPC with a fully corrected body.
-- The previous hardening migration wrapped the older function body; this keeps
-- the edit-authorization fix while avoiding the old ambiguous correlation-id
-- lookup and stale adjustment-mode enum cast.

begin;

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
  source_version public.estimate_sheet_versions;
  source_estimate public.estimates;
  resolved_workspace_id uuid;
  resolved_user_id uuid := coalesce(auth.uid(), acting_user_id);
  requested_correlation_id uuid := correlation_id;
  committed_result jsonb;
  restored_estimate_id uuid := gen_random_uuid();
  inserted_event_id uuid;
  first_node_id uuid;
  restored_sheet_code text;
begin
  if source_version_id is null then
    raise exception 'Source version id is required.';
  end if;

  select * into source_version
  from public.estimate_sheet_versions version
  where version.id = source_version_id;

  if source_version.id is null then
    raise exception 'Estimate sheet version not found.';
  end if;

  select * into source_estimate
  from public.estimates estimate
  where estimate.id = source_version.estimate_id;

  resolved_workspace_id := public.assert_can_edit_estimate_for_history(target_project_id, source_version.estimate_id, acting_user_id);
  perform 1 from public.estimates estimate where estimate.id = source_version.estimate_id for update;

  select jsonb_build_object(
    'idempotent', true,
    'eventId', event.id,
    'estimateId', event.payload->>'newEstimateId',
    'firstNodeId', nullif(event.payload->>'firstNodeId', ''),
    'sheetCode', event.payload->>'newSheetCode'
  )
  into committed_result
  from public.estimate_sheet_events event
  where event.event_type = 'sheet_restored_as_copy'
    and event.correlation_id = requested_correlation_id
    and event.payload->>'sourceEstimateId' = source_estimate.id::text
    and event.payload->>'sourceVersionId' = source_version.id::text
  order by event.created_at desc, event.id desc
  limit 1;

  if committed_result is not null then
    return committed_result;
  end if;

  restored_sheet_code := coalesce(nullif(trim(new_sheet_code), ''), 'RESTORED-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)));

  create temporary table if not exists estimate_sheet_restore_node_map (
    source_node_id uuid primary key,
    target_node_id uuid not null,
    source_parent_id uuid,
    depth integer not null default 0
  ) on commit drop;

  truncate table estimate_sheet_restore_node_map;

  insert into estimate_sheet_restore_node_map (source_node_id, target_node_id, source_parent_id)
  select node_row.id, gen_random_uuid(), node_row."parentId"
  from jsonb_to_recordset(source_version.snapshot->'nodes') as node_row(
    id uuid,
    "parentId" uuid
  );

  with recursive depth_walk(source_node_id, source_parent_id, depth) as (
    select map.source_node_id, map.source_parent_id, 0
    from estimate_sheet_restore_node_map map
    where map.source_parent_id is null
    union all
    select child.source_node_id, child.source_parent_id, depth_walk.depth + 1
    from estimate_sheet_restore_node_map child
    join depth_walk on depth_walk.source_node_id = child.source_parent_id
  )
  update estimate_sheet_restore_node_map map
  set depth = depth_walk.depth
  from depth_walk
  where depth_walk.source_node_id = map.source_node_id;

  insert into public.estimates (
    id,
    project_id,
    name,
    sheet_code,
    currency_code,
    metadata,
    created_by
  )
  values (
    restored_estimate_id,
    source_estimate.project_id,
    coalesce(nullif(trim(new_estimate_name), ''), source_estimate.name || ' - restored from ' || source_version.version_label),
    restored_sheet_code,
    source_estimate.currency_code,
    coalesce(source_estimate.metadata, '{}'::jsonb) || jsonb_build_object(
      'restoredFromEstimateId', source_estimate.id,
      'restoredFromVersionId', source_version.id,
      'restoredFromVersionLabel', source_version.version_label,
      'versionNumber', 1,
      'versionLabel', 'V1'
    ),
    resolved_user_id
  );

  insert into public.estimate_sheet_adjustments (
    estimate_id,
    mode,
    percentage,
    row_revision,
    updated_by
  )
  select
    restored_estimate_id,
    coalesce(nullif(adjustment.mode, ''), 'contingency'),
    coalesce(adjustment.percentage, 0),
    greatest(coalesce(adjustment."rowRevision", 1), 1),
    resolved_user_id
  from jsonb_to_record(source_version.snapshot->'adjustment') as adjustment(
    mode text,
    percentage numeric,
    "rowRevision" integer
  )
  where source_version.snapshot ? 'adjustment';

  insert into public.estimate_nodes (
    id,
    estimate_id,
    parent_id,
    kind,
    name,
    sort_order,
    metadata
  )
  select
    map.target_node_id,
    restored_estimate_id,
    parent_map.target_node_id,
    node_row.kind,
    node_row.name,
    node_row."sortOrder",
    coalesce(node_row.metadata, '{}'::jsonb)
  from jsonb_to_recordset(source_version.snapshot->'nodes') as node_row(
    id uuid,
    "parentId" uuid,
    kind public.estimate_node_kind,
    name text,
    "sortOrder" integer,
    metadata jsonb
  )
  join estimate_sheet_restore_node_map map on map.source_node_id = node_row.id
  left join estimate_sheet_restore_node_map parent_map on parent_map.source_node_id = node_row."parentId"
  order by map.depth, node_row."sortOrder", node_row.id;

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
    quantity_base,
    quantity_contingency_amount,
    unit_cost,
    contingency_percentage,
    misc_cost,
    discipline,
    designation,
    link_state,
    metadata,
    row_revision
  )
  select
    gen_random_uuid(),
    restored_estimate_id,
    map.target_node_id,
    row_row."sortOrder",
    row_row."sourceLibraryItemId",
    row_row."sourceSnapshot",
    row_row."categoryNodeId",
    row_row."supplierId",
    row_row.material,
    row_row.description,
    row_row.supplier,
    row_row.unit,
    public.estimate_row_payload_quantity(to_jsonb(row_row), row_row."quantityBase", row_row."quantityContingencyAmount", row_row.quantity),
    row_row."quantityBase",
    public.estimate_row_payload_quantity_contingency_amount(to_jsonb(row_row), row_row."quantityBase", row_row."quantityContingencyAmount"),
    row_row."unitCost",
    coalesce(row_row."contingencyPercentage", 0),
    row_row."miscCost",
    row_row.discipline,
    row_row.designation,
    row_row."linkState",
    coalesce(row_row.metadata, '{}'::jsonb),
    coalesce(row_row."rowRevision", 1)
  from jsonb_to_recordset(source_version.snapshot->'rows') as row_row(
    id uuid,
    "nodeId" uuid,
    "sortOrder" integer,
    "sourceLibraryItemId" uuid,
    "sourceSnapshot" jsonb,
    "categoryNodeId" text,
    "supplierId" uuid,
    material text,
    description text,
    supplier text,
    unit text,
    quantity numeric,
    "quantityBase" numeric,
    "quantityContingencyAmount" numeric,
    "unitCost" numeric,
    "contingencyPercentage" numeric,
    "miscCost" numeric,
    discipline text,
    designation text,
    "linkState" public.estimate_row_link_state,
    metadata jsonb,
    "rowRevision" integer
  )
  join estimate_sheet_restore_node_map map on map.source_node_id = row_row."nodeId";

  select node.id into first_node_id
  from public.estimate_nodes node
  where node.estimate_id = restored_estimate_id
  order by node.parent_id nulls first, node.sort_order, node.created_at, node.id
  limit 1;

  insert into public.estimate_sheet_events (
    estimate_id,
    workspace_id,
    event_type,
    event_source,
    correlation_id,
    actor_user_id,
    changed_fields,
    payload
  )
  values (
    restored_estimate_id,
    resolved_workspace_id,
    'sheet_restored_as_copy',
    'server_action',
    requested_correlation_id,
    resolved_user_id,
    array['estimate'],
    jsonb_build_object(
      'sourceEstimateId', source_estimate.id,
      'sourceVersionId', source_version.id,
      'sourceVersionLabel', source_version.version_label,
      'newEstimateId', restored_estimate_id,
      'newSheetCode', restored_sheet_code,
      'firstNodeId', first_node_id
    )
  )
  returning id into inserted_event_id;

  return jsonb_build_object(
    'idempotent', false,
    'eventId', inserted_event_id,
    'estimateId', restored_estimate_id,
    'firstNodeId', first_node_id,
    'sheetCode', restored_sheet_code
  );
end;
$$;

revoke all on function public.restore_estimate_sheet_version_as_copy(uuid, uuid, text, text, uuid, uuid) from public, anon;
grant execute on function public.restore_estimate_sheet_version_as_copy(uuid, uuid, text, text, uuid, uuid) to authenticated;

commit;
