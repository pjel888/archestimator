alter table public.estimate_row_items
  add column if not exists contingency_percentage numeric(7,4) not null default 0;

alter table public.estimate_template_row_items
  add column if not exists contingency_percentage numeric(7,4) not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'estimate_row_items_contingency_percentage_check'
      and conrelid = 'public.estimate_row_items'::regclass
  ) then
    alter table public.estimate_row_items
      add constraint estimate_row_items_contingency_percentage_check
      check (contingency_percentage >= 0 and contingency_percentage <= 100);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'estimate_template_row_items_contingency_percentage_check'
      and conrelid = 'public.estimate_template_row_items'::regclass
  ) then
    alter table public.estimate_template_row_items
      add constraint estimate_template_row_items_contingency_percentage_check
      check (contingency_percentage >= 0 and contingency_percentage <= 100);
  end if;
end;
$$;

create or replace function public.estimate_row_subtotal(row_item public.estimate_row_items)
returns numeric
language sql
stable
set search_path = public
as $$
  select coalesce(row_item.quantity, 0) * coalesce(row_item.unit_cost, 0);
$$;

create or replace function public.estimate_row_contingency_value(row_item public.estimate_row_items)
returns numeric
language sql
stable
set search_path = public
as $$
  select public.estimate_row_subtotal(row_item) * coalesce(row_item.contingency_percentage, 0) / 100;
$$;

create or replace function public.estimate_row_line_total(row_item public.estimate_row_items)
returns numeric
language sql
stable
set search_path = public
as $$
  select public.estimate_row_subtotal(row_item)
    + coalesce(row_item.misc_cost, 0)
    + public.estimate_row_contingency_value(row_item);
$$;

create or replace function public.estimate_row_item_snapshot(row_item public.estimate_row_items)
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', row_item.id,
    'estimateId', row_item.estimate_id,
    'nodeId', row_item.node_id,
    'sortOrder', row_item.sort_order,
    'sourceLibraryItemId', row_item.source_library_item_id,
    'sourceSnapshot', row_item.source_snapshot,
    'categoryNodeId', row_item.category_node_id,
    'supplierId', row_item.supplier_id,
    'material', row_item.material,
    'description', row_item.description,
    'supplier', row_item.supplier,
    'unit', row_item.unit,
    'quantity', row_item.quantity,
    'unitCost', row_item.unit_cost,
    'subTotal', public.estimate_row_subtotal(row_item),
    'contingencyPercentage', row_item.contingency_percentage,
    'contingencyValue', public.estimate_row_contingency_value(row_item),
    'miscCost', row_item.misc_cost,
    'discipline', row_item.discipline,
    'designation', row_item.designation,
    'linkState', row_item.link_state,
    'metadata', row_item.metadata,
    'rowRevision', row_item.row_revision,
    'createdAt', row_item.created_at,
    'updatedAt', row_item.updated_at,
    'lineTotal', public.estimate_row_line_total(row_item)
  );
$$;

create or replace function public.estimate_row_context(row_item public.estimate_row_items)
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'rowId', row_item.id,
    'nodeId', row_item.node_id,
    'material', row_item.material,
    'description', row_item.description,
    'supplier', row_item.supplier,
    'unit', row_item.unit,
    'rowRevision', row_item.row_revision,
    'subTotal', public.estimate_row_subtotal(row_item),
    'contingencyPercentage', row_item.contingency_percentage,
    'contingencyValue', public.estimate_row_contingency_value(row_item),
    'miscCost', row_item.misc_cost,
    'lineTotal', public.estimate_row_line_total(row_item)
  );
$$;

create or replace function public.estimate_sheet_total(target_estimate_id uuid)
returns numeric
language sql
stable
set search_path = public
as $$
  select coalesce(sum(public.estimate_row_line_total(row_item)), 0)
  from public.estimate_row_items row_item
  where row_item.estimate_id = target_estimate_id;
$$;

create or replace function public.estimate_sheet_snapshot(target_estimate_id uuid)
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'schemaVersion', '2026-05-24.v2',
    'estimate', jsonb_build_object(
      'id', estimate.id,
      'projectId', estimate.project_id,
      'name', estimate.name,
      'sheetCode', estimate.sheet_code,
      'currencyCode', estimate.currency_code,
      'metadata', estimate.metadata,
      'createdAt', estimate.created_at,
      'updatedAt', estimate.updated_at
    ),
    'nodes', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', node.id,
          'estimateId', node.estimate_id,
          'parentId', node.parent_id,
          'kind', node.kind,
          'name', node.name,
          'sortOrder', node.sort_order,
          'metadata', node.metadata,
          'createdAt', node.created_at,
          'updatedAt', node.updated_at
        )
        order by node.parent_id nulls first, node.sort_order, node.created_at, node.id
      )
      from public.estimate_nodes node
      where node.estimate_id = estimate.id
    ), '[]'::jsonb),
    'rows', coalesce((
      select jsonb_agg(public.estimate_row_item_snapshot(row_item) order by row_item.node_id, row_item.sort_order, row_item.created_at, row_item.id)
      from public.estimate_row_items row_item
      where row_item.estimate_id = estimate.id
    ), '[]'::jsonb),
    'summary', jsonb_build_object(
      'nodeCount', (select count(*) from public.estimate_nodes node where node.estimate_id = estimate.id),
      'rowCount', (select count(*) from public.estimate_row_items row_item where row_item.estimate_id = estimate.id),
      'total', public.estimate_sheet_total(estimate.id)
    )
  )
  from public.estimates estimate
  where estimate.id = target_estimate_id;
$$;

create or replace function public.create_estimate_sheet_version(
  target_project_id uuid,
  target_estimate_id uuid,
  version_title text default null,
  version_note text default '',
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
  next_version_number integer;
  next_version_label text;
  snapshot jsonb;
  summary jsonb;
  inserted_version_id uuid;
  inserted_event_id uuid;
  requested_correlation_id uuid := correlation_id;
begin
  resolved_workspace_id := public.resolve_estimate_workspace(target_project_id, target_estimate_id, acting_user_id);
  perform 1 from public.estimates estimate where estimate.id = target_estimate_id for update;

  select jsonb_build_object(
    'idempotent', true,
    'eventId', event.id,
    'versionId', event.payload->>'versionId',
    'versionNumber', coalesce((event.payload->>'versionNumber')::integer, 1),
    'versionLabel', coalesce(event.payload->>'versionLabel', 'V1'),
    'summary', coalesce(event.payload->'summary', '{}'::jsonb)
  )
  into committed_result
  from public.estimate_sheet_events event
  where event.estimate_id = target_estimate_id
    and event.event_type = 'sheet_version_created'
    and event.correlation_id = requested_correlation_id
  order by event.created_at desc, event.id desc
  limit 1;

  if committed_result is not null then
    return committed_result;
  end if;

  select coalesce(max(version.version_number), 0) + 1
    into next_version_number
  from public.estimate_sheet_versions version
  where version.estimate_id = target_estimate_id;

  next_version_label := 'V' || next_version_number::text;
  snapshot := public.estimate_sheet_snapshot(target_estimate_id);
  summary := snapshot->'summary';

  insert into public.estimate_sheet_versions (
    estimate_id,
    workspace_id,
    version_number,
    version_label,
    title,
    note,
    snapshot,
    summary,
    created_by
  )
  values (
    target_estimate_id,
    resolved_workspace_id,
    next_version_number,
    next_version_label,
    coalesce(nullif(trim(version_title), ''), next_version_label),
    coalesce(version_note, ''),
    snapshot,
    summary,
    resolved_user_id
  )
  returning id into inserted_version_id;

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
    target_estimate_id,
    resolved_workspace_id,
    'sheet_version_created',
    'server_action',
    requested_correlation_id,
    resolved_user_id,
    array['version'],
    jsonb_build_object(
      'versionId', inserted_version_id,
      'versionNumber', next_version_number,
      'versionLabel', next_version_label,
      'title', coalesce(nullif(trim(version_title), ''), next_version_label),
      'summary', summary
    )
  )
  returning id into inserted_event_id;

  update public.estimate_sheet_versions
  set source_event_id = inserted_event_id
  where id = inserted_version_id;

  update public.estimates estimate
  set metadata = coalesce(estimate.metadata, '{}'::jsonb) || jsonb_build_object(
        'versionNumber', next_version_number,
        'versionLabel', next_version_label,
        'latestEstimateSheetVersionId', inserted_version_id
      )
  where estimate.id = target_estimate_id;

  return jsonb_build_object(
    'idempotent', false,
    'eventId', inserted_event_id,
    'versionId', inserted_version_id,
    'versionNumber', next_version_number,
    'versionLabel', next_version_label,
    'summary', summary
  );
end;
$$;

create or replace function public.insert_estimate_row_item_with_history(
  target_project_id uuid,
  target_estimate_id uuid,
  target_node_id uuid,
  row_payload jsonb,
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
  inserted_row public.estimate_row_items;
  inserted_event_id uuid;
  requested_row_id uuid := coalesce(nullif(row_payload->>'id', '')::uuid, gen_random_uuid());
begin
  resolved_workspace_id := public.resolve_estimate_workspace(target_project_id, target_estimate_id, acting_user_id);

  perform 1 from public.estimates estimate where estimate.id = target_estimate_id for update;

  committed_result := public.estimate_sheet_event_result(target_estimate_id, correlation_id);
  if committed_result is not null then
    return committed_result;
  end if;

  if target_node_id is null or not exists (
    select 1
    from public.estimate_nodes node
    where node.id = target_node_id
      and node.estimate_id = target_estimate_id
      and node.kind = 'area'
  ) then
    raise exception 'Target area node not found in the current estimate.';
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
    row_revision
  )
  values (
    requested_row_id,
    target_estimate_id,
    target_node_id,
    coalesce(nullif(row_payload->>'sortOrder', '')::integer, 0),
    nullif(row_payload->>'sourceLibraryItemId', '')::uuid,
    row_payload->'sourceSnapshot',
    nullif(row_payload->>'categoryNodeId', ''),
    nullif(row_payload->>'supplierId', '')::uuid,
    coalesce(row_payload->>'material', ''),
    coalesce(row_payload->>'description', ''),
    coalesce(row_payload->>'supplier', ''),
    coalesce(nullif(row_payload->>'unit', ''), 'unit'),
    coalesce(nullif(row_payload->>'quantity', '')::numeric, 0),
    coalesce(nullif(row_payload->>'unitCost', '')::numeric, 0),
    coalesce(nullif(row_payload->>'contingencyPercentage', '')::numeric, 0),
    coalesce(nullif(row_payload->>'miscCost', '')::numeric, 0),
    coalesce(row_payload->>'discipline', ''),
    coalesce(row_payload->>'designation', ''),
    coalesce(nullif(row_payload->>'linkState', '')::public.estimate_row_link_state, 'unlinked'),
    coalesce(row_payload->'metadata', '{}'::jsonb),
    1
  )
  returning * into inserted_row;

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
    target_node_id,
    inserted_row.id,
    case when inserted_row.source_library_item_id is null then 'row_blank_added' else 'row_added' end,
    'server_action',
    correlation_id,
    resolved_user_id,
    public.estimate_row_context(inserted_row),
    public.estimate_row_item_snapshot(inserted_row),
    array['row'],
    public.estimate_row_line_total(inserted_row),
    jsonb_build_object('rowId', inserted_row.id, 'nodeId', target_node_id)
  )
  returning id into inserted_event_id;

  return jsonb_build_object(
    'idempotent', false,
    'eventId', inserted_event_id,
    'rowId', inserted_row.id,
    'row', public.estimate_row_item_snapshot(inserted_row)
  );
end;
$$;

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
  resolved_user_id uuid := coalesce(auth.uid(), acting_user_id);
  committed_result jsonb;
  old_row public.estimate_row_items;
  updated_row public.estimate_row_items;
  old_snapshot jsonb;
  new_snapshot jsonb;
  changed_fields text[];
  inserted_event_id uuid;
  old_total numeric;
  new_total numeric;
begin
  resolved_workspace_id := public.resolve_estimate_workspace(target_project_id, target_estimate_id, acting_user_id);

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

  old_snapshot := public.estimate_row_item_snapshot(old_row);
  old_total := public.estimate_row_line_total(old_row);

  update public.estimate_row_items row_item
  set quantity = case when row_patch ? 'quantity' then coalesce(nullif(row_patch->>'quantity', '')::numeric, row_item.quantity) else row_item.quantity end,
      unit_cost = case when row_patch ? 'unitCost' then coalesce(nullif(row_patch->>'unitCost', '')::numeric, row_item.unit_cost) else row_item.unit_cost end,
      contingency_percentage = case when row_patch ? 'contingencyPercentage' then coalesce(nullif(row_patch->>'contingencyPercentage', '')::numeric, row_item.contingency_percentage) else row_item.contingency_percentage end,
      misc_cost = case when row_patch ? 'miscCost' then coalesce(nullif(row_patch->>'miscCost', '')::numeric, row_item.misc_cost) else row_item.misc_cost end,
      material = case when row_patch ? 'material' then coalesce(row_patch->>'material', '') else row_item.material end,
      description = case when row_patch ? 'description' then coalesce(row_patch->>'description', '') else row_item.description end,
      supplier = case when row_patch ? 'supplier' then coalesce(row_patch->>'supplier', '') else row_item.supplier end,
      unit = case when row_patch ? 'unit' then coalesce(nullif(row_patch->>'unit', ''), 'unit') else row_item.unit end,
      discipline = case when row_patch ? 'discipline' then coalesce(row_patch->>'discipline', '') else row_item.discipline end,
      designation = case when row_patch ? 'designation' then coalesce(row_patch->>'designation', '') else row_item.designation end,
      link_state = case when row_patch ? 'linkState' then coalesce(nullif(row_patch->>'linkState', '')::public.estimate_row_link_state, row_item.link_state) else row_item.link_state end,
      category_node_id = case when row_patch ? 'categoryNodeId' then nullif(row_patch->>'categoryNodeId', '') else row_item.category_node_id end,
      supplier_id = case when row_patch ? 'supplierId' then nullif(row_patch->>'supplierId', '')::uuid else row_item.supplier_id end,
      source_library_item_id = case when row_patch ? 'sourceLibraryItemId' then nullif(row_patch->>'sourceLibraryItemId', '')::uuid else row_item.source_library_item_id end,
      source_snapshot = case when row_patch ? 'sourceSnapshot' then row_patch->'sourceSnapshot' else row_item.source_snapshot end,
      metadata = case when row_patch ? 'metadata' then coalesce(row_patch->'metadata', '{}'::jsonb) else row_item.metadata end,
      row_revision = row_revision + 1
  where row_item.id = target_row_id
    and row_item.estimate_id = target_estimate_id
  returning * into updated_row;

  new_snapshot := public.estimate_row_item_snapshot(updated_row);
  new_total := public.estimate_row_line_total(updated_row);
  changed_fields := public.estimate_sheet_changed_fields(
    old_snapshot,
    new_snapshot,
    array[
      'quantity',
      'unitCost',
      'contingencyPercentage',
      'miscCost',
      'material',
      'description',
      'supplier',
      'unit',
      'discipline',
      'designation',
      'linkState',
      'categoryNodeId',
      'supplierId',
      'sourceLibraryItemId',
      'sourceSnapshot',
      'metadata'
    ]
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
    payload
  )
  values (
    target_estimate_id,
    resolved_workspace_id,
    updated_row.node_id,
    updated_row.id,
    'row_updated',
    'server_action',
    correlation_id,
    resolved_user_id,
    public.estimate_row_context(updated_row),
    jsonb_build_object('changed', old_snapshot),
    jsonb_build_object('changed', new_snapshot),
    changed_fields,
    new_total - old_total,
    jsonb_build_object('rowId', updated_row.id, 'changedFields', changed_fields)
  )
  returning id into inserted_event_id;

  return jsonb_build_object(
    'idempotent', false,
    'eventId', inserted_event_id,
    'rowId', updated_row.id,
    'row', new_snapshot,
    'changedFields', changed_fields
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
  resolved_user_id uuid := coalesce(auth.uid(), acting_user_id);
  committed_result jsonb;
  old_row public.estimate_row_items;
  replaced_row public.estimate_row_items;
  old_snapshot jsonb;
  new_snapshot jsonb;
  changed_fields text[];
  inserted_event_id uuid;
  old_total numeric;
  new_total numeric;
begin
  resolved_workspace_id := public.resolve_estimate_workspace(target_project_id, target_estimate_id, acting_user_id);
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

  old_snapshot := public.estimate_row_item_snapshot(old_row);
  old_total := public.estimate_row_line_total(old_row);

  update public.estimate_row_items row_item
  set source_library_item_id = nullif(replacement_payload->>'sourceLibraryItemId', '')::uuid,
      source_snapshot = replacement_payload->'sourceSnapshot',
      category_node_id = nullif(replacement_payload->>'categoryNodeId', ''),
      supplier_id = nullif(replacement_payload->>'supplierId', '')::uuid,
      material = coalesce(replacement_payload->>'material', ''),
      description = coalesce(replacement_payload->>'description', ''),
      supplier = coalesce(replacement_payload->>'supplier', ''),
      unit = coalesce(nullif(replacement_payload->>'unit', ''), 'unit'),
      quantity = coalesce(nullif(replacement_payload->>'quantity', '')::numeric, row_item.quantity),
      unit_cost = coalesce(nullif(replacement_payload->>'unitCost', '')::numeric, 0),
      contingency_percentage = coalesce(nullif(replacement_payload->>'contingencyPercentage', '')::numeric, row_item.contingency_percentage),
      misc_cost = coalesce(nullif(replacement_payload->>'miscCost', '')::numeric, 0),
      discipline = coalesce(replacement_payload->>'discipline', ''),
      designation = coalesce(replacement_payload->>'designation', ''),
      link_state = coalesce(nullif(replacement_payload->>'linkState', '')::public.estimate_row_link_state, 'linked-clean'),
      metadata = coalesce(replacement_payload->'metadata', '{}'::jsonb),
      row_revision = row_revision + 1
  where row_item.id = target_row_id
    and row_item.estimate_id = target_estimate_id
  returning * into replaced_row;

  new_snapshot := public.estimate_row_item_snapshot(replaced_row);
  new_total := public.estimate_row_line_total(replaced_row);
  changed_fields := public.estimate_sheet_changed_fields(
    old_snapshot,
    new_snapshot,
    array[
      'sourceLibraryItemId',
      'sourceSnapshot',
      'categoryNodeId',
      'supplierId',
      'material',
      'description',
      'supplier',
      'unit',
      'quantity',
      'unitCost',
      'contingencyPercentage',
      'miscCost',
      'discipline',
      'designation',
      'linkState',
      'metadata'
    ]
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
    payload
  )
  values (
    target_estimate_id,
    resolved_workspace_id,
    replaced_row.node_id,
    replaced_row.id,
    'row_replaced',
    'server_action',
    correlation_id,
    resolved_user_id,
    public.estimate_row_context(replaced_row),
    jsonb_build_object(
      'sourceLibraryItemId', old_snapshot->'sourceLibraryItemId',
      'sourceSnapshot', old_snapshot->'sourceSnapshot',
      'material', old_snapshot->'material',
      'supplier', old_snapshot->'supplier',
      'contingencyPercentage', old_snapshot->'contingencyPercentage',
      'contingencyValue', old_snapshot->'contingencyValue',
      'lineTotal', old_snapshot->'lineTotal'
    ),
    jsonb_build_object(
      'sourceLibraryItemId', new_snapshot->'sourceLibraryItemId',
      'sourceSnapshot', new_snapshot->'sourceSnapshot',
      'material', new_snapshot->'material',
      'supplier', new_snapshot->'supplier',
      'contingencyPercentage', new_snapshot->'contingencyPercentage',
      'contingencyValue', new_snapshot->'contingencyValue',
      'lineTotal', new_snapshot->'lineTotal'
    ),
    changed_fields,
    new_total - old_total,
    jsonb_build_object('rowId', replaced_row.id, 'changedFields', changed_fields)
  )
  returning id into inserted_event_id;

  return jsonb_build_object(
    'idempotent', false,
    'eventId', inserted_event_id,
    'rowId', replaced_row.id,
    'row', new_snapshot,
    'changedFields', changed_fields
  );
end;
$$;

create or replace function public.delete_estimate_row_item_with_history(
  target_project_id uuid,
  target_estimate_id uuid,
  target_row_id uuid,
  expected_row_revision integer,
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
  old_row public.estimate_row_items;
  old_snapshot jsonb;
  inserted_event_id uuid;
  old_total numeric;
begin
  resolved_workspace_id := public.resolve_estimate_workspace(target_project_id, target_estimate_id, acting_user_id);
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

  old_snapshot := public.estimate_row_item_snapshot(old_row);
  old_total := public.estimate_row_line_total(old_row);

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
    changed_fields,
    total_delta,
    payload
  )
  values (
    target_estimate_id,
    resolved_workspace_id,
    old_row.node_id,
    old_row.id,
    'row_deleted',
    'server_action',
    correlation_id,
    resolved_user_id,
    public.estimate_row_context(old_row),
    old_snapshot,
    array['row'],
    -old_total,
    jsonb_build_object('rowId', old_row.id, 'deletedSnapshot', old_snapshot)
  )
  returning id into inserted_event_id;

  delete from public.estimate_row_items row_item
  where row_item.id = target_row_id
    and row_item.estimate_id = target_estimate_id;

  return jsonb_build_object(
    'idempotent', false,
    'eventId', inserted_event_id,
    'rowId', old_row.id,
    'deletedRow', old_snapshot
  );
end;
$$;

create or replace function public.insert_estimate_template_into_estimate(
  target_project_id uuid,
  target_estimate_id uuid,
  target_parent_node_id uuid,
  source_template_id uuid
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  target_workspace_id uuid;
  source_workspace_id uuid;
  source_template_name text;
  max_sibling_sort_order integer;
  inserted_node_count integer := 0;
  inserted_row_item_count integer := 0;
  inserted_root_node_ids jsonb := '[]'::jsonb;
begin
  if target_project_id is null or target_estimate_id is null or target_parent_node_id is null or source_template_id is null then
    raise exception 'Project, estimate, target parent, and source template are required.';
  end if;

  select project.workspace_id
    into target_workspace_id
  from public.estimates estimate
  join public.projects project on project.id = estimate.project_id
  where estimate.id = target_estimate_id
    and project.id = target_project_id;

  if target_workspace_id is null then
    raise exception 'Estimate not found in the current project.';
  end if;

  select template.workspace_id, template.name
    into source_workspace_id, source_template_name
  from public.estimate_templates template
  where template.id = source_template_id;

  if source_workspace_id is null then
    raise exception 'Estimate template not found in the current workspace.';
  end if;

  if source_workspace_id <> target_workspace_id then
    raise exception 'Estimate template does not belong to the target estimate workspace.';
  end if;

  if not exists (
    select 1
    from public.estimate_nodes node
    where node.id = target_parent_node_id
      and node.estimate_id = target_estimate_id
      and node.kind = 'group'
  ) then
    raise exception 'Target Group Node not found in the current project.';
  end if;

  perform public.validate_estimate_template_tree(source_template_id);

  if not exists (
    select 1
    from public.estimate_template_nodes node
    where node.template_id = source_template_id
  ) then
    raise exception 'Estimate template must include at least one node.';
  end if;

  perform 1
  from public.estimate_nodes node
  where node.estimate_id = target_estimate_id
  for update;

  set constraints estimate_nodes_unique_sort, estimate_nodes_unique_sort_with_root deferred;

  create temporary table if not exists estimate_template_copy_map (
    source_node_id uuid primary key,
    target_node_id uuid not null,
    source_parent_id uuid,
    kind public.estimate_node_kind not null,
    source_sort_order integer not null,
    root_rank integer
  ) on commit drop;

  truncate table estimate_template_copy_map;

  insert into estimate_template_copy_map (source_node_id, target_node_id, source_parent_id, kind, source_sort_order, root_rank)
  select
    node.id,
    gen_random_uuid(),
    node.parent_id,
    node.kind,
    node.sort_order,
    case
      when node.parent_id is null then row_number() over (partition by node.parent_id order by node.sort_order, node.id)
      else null
    end
  from public.estimate_template_nodes node
  where node.template_id = source_template_id;

  select coalesce(max(node.sort_order), 0)
    into max_sibling_sort_order
  from public.estimate_nodes node
  where node.estimate_id = target_estimate_id
    and node.parent_id = target_parent_node_id;

  insert into public.estimate_nodes (id, estimate_id, parent_id, kind, name, sort_order, metadata)
  select
    node_map.target_node_id,
    target_estimate_id,
    coalesce(parent_map.target_node_id, target_parent_node_id),
    template_node.kind,
    template_node.name,
    case
      when template_node.parent_id is null then max_sibling_sort_order + (node_map.root_rank * 10)
      else template_node.sort_order
    end,
    template_node.metadata || jsonb_build_object(
      'sourceTemplateId', source_template_id,
      'sourceTemplateName', source_template_name,
      'sourceTemplateNodeId', template_node.id
    )
  from public.estimate_template_nodes template_node
  join estimate_template_copy_map node_map on node_map.source_node_id = template_node.id
  left join estimate_template_copy_map parent_map on parent_map.source_node_id = template_node.parent_id
  where template_node.template_id = source_template_id;

  get diagnostics inserted_node_count = row_count;

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
    metadata
  )
  select
    gen_random_uuid(),
    target_estimate_id,
    node_map.target_node_id,
    row_item.sort_order,
    row_item.source_library_item_id,
    coalesce(row_item.source_snapshot, '{}'::jsonb) || jsonb_build_object(
      'sourceTemplateId', source_template_id,
      'sourceTemplateName', source_template_name,
      'sourceTemplateRowId', row_item.id
    ),
    row_item.category_node_id,
    row_item.supplier_id,
    row_item.material,
    row_item.description,
    row_item.supplier,
    row_item.unit,
    row_item.quantity,
    row_item.unit_cost,
    row_item.contingency_percentage,
    row_item.misc_cost,
    row_item.discipline,
    row_item.designation,
    row_item.link_state,
    row_item.metadata || jsonb_build_object(
      'sourceTemplateId', source_template_id,
      'sourceTemplateName', source_template_name,
      'sourceTemplateRowId', row_item.id
    )
  from public.estimate_template_row_items row_item
  join estimate_template_copy_map node_map on node_map.source_node_id = row_item.template_node_id
  where row_item.template_id = source_template_id;

  get diagnostics inserted_row_item_count = row_count;

  if inserted_node_count <> (select count(*) from estimate_template_copy_map) then
    raise exception 'Estimate template copy did not insert every template node.';
  end if;

  select coalesce(jsonb_agg(node_map.target_node_id order by node_map.root_rank), '[]'::jsonb)
    into inserted_root_node_ids
  from estimate_template_copy_map node_map
  where node_map.source_parent_id is null;

  perform public.validate_estimate_node_tree(target_estimate_id);

  return jsonb_build_object(
    'inserted_root_node_ids', inserted_root_node_ids,
    'inserted_node_count', inserted_node_count,
    'inserted_row_item_count', inserted_row_item_count
  );
end;
$$;

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
begin
  resolved_workspace_id := public.resolve_estimate_workspace(target_project_id, target_estimate_id, acting_user_id);
  perform 1 from public.estimates estimate where estimate.id = target_estimate_id for update;

  committed_result := public.estimate_sheet_event_result(target_estimate_id, correlation_id);
  if committed_result is not null then
    return committed_result;
  end if;

  if target_node_id is null or not exists (
    select 1
    from public.estimate_nodes node
    where node.id = target_node_id
      and node.estimate_id = target_estimate_id
  ) then
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
  select id from deleted_nodes;

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
        from (
          select id
          from estimate_sheet_deleted_node_ids
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
    'deletedNodeCount', deleted_node_count,
    'deletedRowCount', deleted_row_count
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
  source_version public.estimate_sheet_versions;
  source_estimate public.estimates;
  resolved_workspace_id uuid;
  resolved_user_id uuid := coalesce(auth.uid(), acting_user_id);
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

  resolved_workspace_id := public.resolve_estimate_workspace(target_project_id, source_version.estimate_id, acting_user_id);
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
    and event.correlation_id = correlation_id
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
    row_row.quantity,
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
    correlation_id,
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

revoke execute on function public.estimate_row_subtotal(public.estimate_row_items) from public, anon;
revoke execute on function public.estimate_row_contingency_value(public.estimate_row_items) from public, anon;
revoke execute on function public.estimate_row_line_total(public.estimate_row_items) from public, anon;
revoke execute on function public.estimate_row_item_snapshot(public.estimate_row_items) from public, anon;
revoke execute on function public.estimate_row_context(public.estimate_row_items) from public, anon;
revoke execute on function public.estimate_sheet_total(uuid) from public, anon;
revoke execute on function public.estimate_sheet_snapshot(uuid) from public, anon;
revoke execute on function public.insert_estimate_row_item_with_history(uuid, uuid, uuid, jsonb, uuid, uuid) from public, anon;
revoke execute on function public.update_estimate_row_item_with_history(uuid, uuid, uuid, integer, jsonb, uuid, uuid) from public, anon;
revoke execute on function public.replace_estimate_row_item_with_history(uuid, uuid, uuid, integer, jsonb, uuid, uuid) from public, anon;
revoke execute on function public.delete_estimate_row_item_with_history(uuid, uuid, uuid, integer, uuid, uuid) from public, anon;
revoke execute on function public.create_estimate_sheet_version(uuid, uuid, text, text, uuid, uuid) from public, anon;
revoke execute on function public.restore_estimate_sheet_version_as_copy(uuid, uuid, text, text, uuid, uuid) from public, anon;
revoke execute on function public.reorder_estimate_nodes_with_history(uuid, jsonb, uuid, uuid) from public, anon;
revoke execute on function public.insert_estimate_template_into_estimate_with_history(uuid, uuid, uuid, uuid, uuid, uuid) from public, anon;
revoke execute on function public.update_estimate_details_with_history(uuid, uuid, jsonb, uuid, uuid) from public, anon;
revoke execute on function public.delete_estimate_node_with_history(uuid, uuid, uuid, uuid, uuid) from public, anon;
revoke execute on function public.get_estimate_sheet_version_control_preflight() from public, anon;
revoke execute on function public.backfill_estimate_sheet_baseline_versions(integer, uuid) from public, anon;
revoke execute on function public.reorder_estimate_nodes(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.insert_estimate_template_into_estimate(uuid, uuid, uuid, uuid) from public, anon, authenticated;

drop function if exists public.move_estimate_nodes(uuid, jsonb);

grant execute on function public.insert_estimate_row_item_with_history(uuid, uuid, uuid, jsonb, uuid, uuid) to authenticated;
grant execute on function public.update_estimate_row_item_with_history(uuid, uuid, uuid, integer, jsonb, uuid, uuid) to authenticated;
grant execute on function public.replace_estimate_row_item_with_history(uuid, uuid, uuid, integer, jsonb, uuid, uuid) to authenticated;
grant execute on function public.delete_estimate_row_item_with_history(uuid, uuid, uuid, integer, uuid, uuid) to authenticated;
grant execute on function public.create_estimate_sheet_version(uuid, uuid, text, text, uuid, uuid) to authenticated;
grant execute on function public.restore_estimate_sheet_version_as_copy(uuid, uuid, text, text, uuid, uuid) to authenticated;
grant execute on function public.reorder_estimate_nodes_with_history(uuid, jsonb, uuid, uuid) to authenticated;
grant execute on function public.insert_estimate_template_into_estimate_with_history(uuid, uuid, uuid, uuid, uuid, uuid) to authenticated;
grant execute on function public.update_estimate_details_with_history(uuid, uuid, jsonb, uuid, uuid) to authenticated;
grant execute on function public.delete_estimate_node_with_history(uuid, uuid, uuid, uuid, uuid) to authenticated;
grant execute on function public.get_estimate_sheet_version_control_preflight() to authenticated;
grant execute on function public.backfill_estimate_sheet_baseline_versions(integer, uuid) to authenticated;

set constraints all immediate;
