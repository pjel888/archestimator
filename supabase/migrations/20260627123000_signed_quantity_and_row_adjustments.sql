-- Signed quantity contingency and row subtotal adjustments.
--
-- Row contingency is now quantity-side only: quantity_base plus a signed
-- quantity_contingency_amount. Subtotal money deltas live in adjustment_percentage.

begin;

alter table public.estimate_row_items
  add column if not exists adjustment_percentage numeric(8, 4) not null default 0;

alter table public.estimate_template_row_items
  add column if not exists adjustment_percentage numeric(8, 4) not null default 0;

update public.estimate_row_items
set adjustment_percentage = contingency_percentage,
    contingency_percentage = 0
where quantity_base is null
  and coalesce(adjustment_percentage, 0) = 0
  and coalesce(contingency_percentage, 0) <> 0;

update public.estimate_template_row_items
set adjustment_percentage = contingency_percentage,
    contingency_percentage = 0
where coalesce(adjustment_percentage, 0) = 0
  and coalesce(contingency_percentage, 0) <> 0;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'estimate_row_items_quantity_contingency_nonnegative'
      and conrelid = 'public.estimate_row_items'::regclass
  ) then
    alter table public.estimate_row_items
      drop constraint estimate_row_items_quantity_contingency_nonnegative;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'estimate_row_items_signed_quantity_contingency'
      and conrelid = 'public.estimate_row_items'::regclass
  ) then
    alter table public.estimate_row_items
      add constraint estimate_row_items_signed_quantity_contingency
      check (
        (quantity_base is null and quantity_contingency_amount is null)
        or (
          quantity_base is not null
          and quantity_base >= 0
          and quantity_base + coalesce(quantity_contingency_amount, 0) >= 0
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'estimate_row_items_adjustment_percentage_range'
      and conrelid = 'public.estimate_row_items'::regclass
  ) then
    alter table public.estimate_row_items
      add constraint estimate_row_items_adjustment_percentage_range
      check (adjustment_percentage >= -100 and adjustment_percentage <= 100);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'estimate_template_row_items_adjustment_percentage_range'
      and conrelid = 'public.estimate_template_row_items'::regclass
  ) then
    alter table public.estimate_template_row_items
      add constraint estimate_template_row_items_adjustment_percentage_range
      check (adjustment_percentage >= -100 and adjustment_percentage <= 100);
  end if;
end $$;

create or replace function public.estimate_row_adjustment_value(row_item public.estimate_row_items)
returns numeric
language sql
stable
set search_path = public
as $$
  select public.estimate_row_subtotal(row_item) * coalesce(row_item.adjustment_percentage, 0) / 100;
$$;

create or replace function public.estimate_row_payload_adjustment_percentage(row_payload jsonb, fallback_adjustment numeric default 0)
returns numeric
language sql
stable
set search_path = public
as $$
  select case
    when row_payload ? 'adjustmentPercentage' then coalesce(nullif(row_payload->>'adjustmentPercentage', '')::numeric, fallback_adjustment)
    when public.estimate_row_payload_quantity_base(row_payload, null) is null then coalesce(nullif(row_payload->>'contingencyPercentage', '')::numeric, fallback_adjustment)
    else fallback_adjustment
  end;
$$;

create or replace function public.estimate_row_contingency_value(row_item public.estimate_row_items)
returns numeric
language sql
stable
set search_path = public
as $$
  select 0;
$$;

create or replace function public.estimate_row_line_total(row_item public.estimate_row_items)
returns numeric
language sql
stable
set search_path = public
as $$
  select public.estimate_row_subtotal(row_item)
    + coalesce(row_item.misc_cost, 0)
    + public.estimate_row_adjustment_value(row_item);
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
    'quantityBase', row_item.quantity_base,
    'quantityContingencyAmount', row_item.quantity_contingency_amount,
    'unitCost', row_item.unit_cost,
    'subTotal', public.estimate_row_subtotal(row_item),
    'contingencyPercentage', row_item.contingency_percentage,
    'contingencyValue', public.estimate_row_contingency_value(row_item),
    'adjustmentPercentage', row_item.adjustment_percentage,
    'adjustmentValue', public.estimate_row_adjustment_value(row_item),
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
    'quantity', row_item.quantity,
    'quantityBase', row_item.quantity_base,
    'quantityContingencyAmount', row_item.quantity_contingency_amount,
    'rowRevision', row_item.row_revision,
    'subTotal', public.estimate_row_subtotal(row_item),
    'contingencyPercentage', row_item.contingency_percentage,
    'contingencyValue', public.estimate_row_contingency_value(row_item),
    'adjustmentPercentage', row_item.adjustment_percentage,
    'adjustmentValue', public.estimate_row_adjustment_value(row_item),
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
  requested_sort_order integer;
  requested_quantity_base numeric;
  requested_quantity_contingency_amount numeric;
  requested_quantity numeric;
  is_legacy_blank boolean;
begin
  resolved_workspace_id := public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id);

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
    raise exception 'Target estimate node not found in the current estimate.';
  end if;

  if row_payload ? 'sortOrder' then
    requested_sort_order := coalesce(nullif(row_payload->>'sortOrder', '')::integer, 0);
  else
    select coalesce(max(row_item.sort_order) + 1, 0)
      into requested_sort_order
    from public.estimate_row_items row_item
    where row_item.estimate_id = target_estimate_id
      and row_item.node_id = target_node_id;
  end if;

  requested_quantity_base := public.estimate_row_payload_quantity_base(row_payload, null);
  requested_quantity_contingency_amount := public.estimate_row_payload_quantity_contingency_amount(row_payload, requested_quantity_base, null);
  requested_quantity := public.estimate_row_payload_quantity(row_payload, requested_quantity_base, requested_quantity_contingency_amount, 0);

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
    adjustment_percentage,
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
    requested_sort_order,
    nullif(row_payload->>'sourceLibraryItemId', '')::uuid,
    row_payload->'sourceSnapshot',
    nullif(row_payload->>'categoryNodeId', ''),
    nullif(row_payload->>'supplierId', '')::uuid,
    coalesce(row_payload->>'material', ''),
    coalesce(row_payload->>'description', ''),
    coalesce(row_payload->>'supplier', ''),
    coalesce(nullif(row_payload->>'unit', ''), 'unit'),
    requested_quantity,
    requested_quantity_base,
    requested_quantity_contingency_amount,
    coalesce(nullif(row_payload->>'unitCost', '')::numeric, 0),
    coalesce(nullif(row_payload->>'contingencyPercentage', '')::numeric, 0),
    public.estimate_row_payload_adjustment_percentage(row_payload, 0),
    coalesce(nullif(row_payload->>'miscCost', '')::numeric, 0),
    coalesce(row_payload->>'discipline', ''),
    coalesce(row_payload->>'designation', ''),
    coalesce(nullif(row_payload->>'linkState', '')::public.estimate_row_link_state, 'unlinked'),
    coalesce(row_payload->'metadata', '{}'::jsonb),
    1
  )
  returning * into inserted_row;

  is_legacy_blank :=
    inserted_row.material = 'Drag or add a component here'
    or coalesce(inserted_row.metadata->'tags', '[]'::jsonb) ? 'manual-row-placeholder';

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
    case when is_legacy_blank then 'row_blank_added' else 'row_added' end,
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
  next_quantity_base numeric;
  next_quantity_contingency_amount numeric;
  next_quantity numeric;
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

  next_quantity_base := public.estimate_row_payload_quantity_base(row_patch, old_row.quantity_base);
  next_quantity_contingency_amount := public.estimate_row_payload_quantity_contingency_amount(row_patch, next_quantity_base, old_row.quantity_contingency_amount);
  next_quantity := public.estimate_row_payload_quantity(row_patch, next_quantity_base, next_quantity_contingency_amount, old_row.quantity);

  old_snapshot := public.estimate_row_item_snapshot(old_row);
  old_total := public.estimate_row_line_total(old_row);

  update public.estimate_row_items row_item
  set quantity = next_quantity,
      quantity_base = next_quantity_base,
      quantity_contingency_amount = next_quantity_contingency_amount,
      unit_cost = case when row_patch ? 'unitCost' then coalesce(nullif(row_patch->>'unitCost', '')::numeric, row_item.unit_cost) else row_item.unit_cost end,
      contingency_percentage = case when row_patch ? 'contingencyPercentage' then coalesce(nullif(row_patch->>'contingencyPercentage', '')::numeric, row_item.contingency_percentage) else row_item.contingency_percentage end,
      adjustment_percentage = case when row_patch ? 'adjustmentPercentage' then coalesce(nullif(row_patch->>'adjustmentPercentage', '')::numeric, row_item.adjustment_percentage) else row_item.adjustment_percentage end,
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
      'quantityBase',
      'quantityContingencyAmount',
      'unitCost',
      'contingencyPercentage',
      'adjustmentPercentage',
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
  next_quantity_base numeric;
  next_quantity_contingency_amount numeric;
  next_quantity numeric;
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

  next_quantity_base := public.estimate_row_payload_quantity_base(replacement_payload, null);
  next_quantity_contingency_amount := public.estimate_row_payload_quantity_contingency_amount(replacement_payload, next_quantity_base, null);
  next_quantity := public.estimate_row_payload_quantity(replacement_payload, next_quantity_base, next_quantity_contingency_amount, old_row.quantity);

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
      quantity = next_quantity,
      quantity_base = next_quantity_base,
      quantity_contingency_amount = next_quantity_contingency_amount,
      unit_cost = coalesce(nullif(replacement_payload->>'unitCost', '')::numeric, 0),
      contingency_percentage = coalesce(nullif(replacement_payload->>'contingencyPercentage', '')::numeric, row_item.contingency_percentage),
      adjustment_percentage = public.estimate_row_payload_adjustment_percentage(replacement_payload, row_item.adjustment_percentage),
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
      'quantityBase',
      'quantityContingencyAmount',
      'unitCost',
      'contingencyPercentage',
      'adjustmentPercentage',
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
      'quantityBase', old_snapshot->'quantityBase',
      'quantityContingencyAmount', old_snapshot->'quantityContingencyAmount',
      'contingencyPercentage', old_snapshot->'contingencyPercentage',
      'contingencyValue', old_snapshot->'contingencyValue',
      'adjustmentPercentage', old_snapshot->'adjustmentPercentage',
      'adjustmentValue', old_snapshot->'adjustmentValue',
      'lineTotal', old_snapshot->'lineTotal'
    ),
    jsonb_build_object(
      'sourceLibraryItemId', new_snapshot->'sourceLibraryItemId',
      'sourceSnapshot', new_snapshot->'sourceSnapshot',
      'material', new_snapshot->'material',
      'supplier', new_snapshot->'supplier',
      'quantityBase', new_snapshot->'quantityBase',
      'quantityContingencyAmount', new_snapshot->'quantityContingencyAmount',
      'contingencyPercentage', new_snapshot->'contingencyPercentage',
      'contingencyValue', new_snapshot->'contingencyValue',
      'adjustmentPercentage', new_snapshot->'adjustmentPercentage',
      'adjustmentValue', new_snapshot->'adjustmentValue',
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

create or replace function public.project_estimate_list_summaries(target_project_id uuid)
returns table (
  estimate_id uuid,
  node_count integer,
  row_count integer,
  total_cost numeric,
  first_node_id uuid
)
language sql
stable
security invoker
set search_path = public
as $$
  with est as (
    select e.id from public.estimates e where e.project_id = target_project_id
  ),
  node_agg as (
    select n.estimate_id,
           count(*) as node_count,
           null::uuid as first_node_id
    from public.estimate_nodes n
    join est on est.id = n.estimate_id
    group by n.estimate_id
  ),
  row_agg as (
    select r.estimate_id,
           count(*) as row_count,
           coalesce(sum(
             r.quantity * r.unit_cost
             + r.misc_cost
             + (r.quantity * r.unit_cost * coalesce(r.adjustment_percentage, 0) / 100)
           ), 0) as total_cost
    from public.estimate_row_items r
    join est on est.id = r.estimate_id
    group by r.estimate_id
  )
  select est.id,
         coalesce(node_agg.node_count, 0)::int,
         coalesce(row_agg.row_count, 0)::int,
         coalesce(row_agg.total_cost, 0),
         node_agg.first_node_id
  from est
  left join node_agg on node_agg.estimate_id = est.id
  left join row_agg on row_agg.estimate_id = est.id;
$$;

create or replace function public.project_estimate_list_summaries_for_estimates(
  target_project_id uuid,
  target_estimate_ids uuid[]
)
returns table (
  estimate_id uuid,
  node_count integer,
  row_count integer,
  total_cost numeric,
  first_node_id uuid
)
language sql
stable
security invoker
set search_path = public
as $$
  with requested as (
    select distinct unnest(coalesce(target_estimate_ids, '{}'::uuid[])) as id
  ),
  est as (
    select e.id
    from public.estimates e
    join requested r on r.id = e.id
    where e.project_id = target_project_id
  ),
  node_agg as (
    select n.estimate_id,
           count(*) as node_count,
           null::uuid as first_node_id
    from public.estimate_nodes n
    join est on est.id = n.estimate_id
    group by n.estimate_id
  ),
  row_agg as (
    select r.estimate_id,
           count(*) as row_count,
           coalesce(sum(
             r.quantity * r.unit_cost
             + r.misc_cost
             + (r.quantity * r.unit_cost * coalesce(r.adjustment_percentage, 0) / 100)
           ), 0) as total_cost
    from public.estimate_row_items r
    join est on est.id = r.estimate_id
    group by r.estimate_id
  )
  select est.id,
         coalesce(node_agg.node_count, 0)::int,
         coalesce(row_agg.row_count, 0)::int,
         coalesce(row_agg.total_cost, 0),
         node_agg.first_node_id
  from est
  left join node_agg on node_agg.estimate_id = est.id
  left join row_agg on row_agg.estimate_id = est.id;
$$;

create or replace function public.estimate_node_route_context(
  target_project_id uuid,
  target_node_id uuid,
  max_node_count integer default null,
  max_row_item_count integer default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with limits as (
    select
      case when max_node_count is not null and max_node_count > 0 then max_node_count else null end as max_node_count,
      case when max_row_item_count is not null and max_row_item_count > 0 then max_row_item_count else null end as max_row_item_count
  ),
  selected as (
    select
      node.id as selected_node_id,
      node.estimate_id,
      node.estimate_tab_id
    from public.estimate_nodes node
    join public.estimates estimate
      on estimate.id = node.estimate_id
    where (select auth.uid()) is not null
      and node.id = target_node_id
      and estimate.project_id = target_project_id
      and public.can_access_estimate(node.estimate_id)
    limit 1
  ),
  resolved as (
    select
      selected.selected_node_id,
      selected.estimate_id,
      selected.estimate_tab_id,
      estimate as estimate_row,
      project as project_row,
      workspace as workspace_row
    from selected
    join public.estimates estimate
      on estimate.id = selected.estimate_id
    join public.projects project
      on project.id = estimate.project_id
    join public.workspaces workspace
      on workspace.id = project.workspace_id
    where estimate.project_id = target_project_id
      and selected.estimate_tab_id is not null
  ),
  active_tabs as (
    select
      tab.id,
      tab.estimate_id,
      tab.name,
      tab.sort_order,
      tab.is_default,
      tab.archived_at,
      tab.metadata,
      tab.created_at,
      tab.updated_at
    from public.estimate_tabs tab
    join resolved
      on resolved.estimate_id = tab.estimate_id
    where tab.archived_at is null
  ),
  tab_nodes as (
    select
      node.id,
      node.kind,
      node.name,
      node.parent_id,
      node.sort_order,
      row_number() over (order by node.sort_order asc, node.id asc) as route_ordinal
    from public.estimate_nodes node
    join resolved
      on resolved.estimate_id = node.estimate_id
     and resolved.estimate_tab_id = node.estimate_tab_id
  ),
  raw_nodes as (
    select tab_nodes.*
    from tab_nodes
    cross join limits
    where limits.max_node_count is null
       or tab_nodes.route_ordinal <= limits.max_node_count + 1
  ),
  limited_nodes as (
    select raw_nodes.*
    from raw_nodes
    cross join limits
    where limits.max_node_count is null
       or raw_nodes.route_ordinal <= limits.max_node_count
  ),
  tab_rows as (
    select
      row_item.id,
      row_item.node_id,
      row_item.material,
      row_item.description,
      row_item.supplier,
      row_item.supplier_id,
      row_item.unit,
      row_item.unit_cost,
      row_item.quantity,
      row_item.quantity_base,
      row_item.quantity_contingency_amount,
      row_item.contingency_percentage,
      row_item.adjustment_percentage,
      row_item.misc_cost,
      row_item.row_revision,
      row_item.category_node_id,
      row_item.discipline,
      row_item.designation,
      row_item.source_library_item_id,
      row_item.link_state,
      row_item.source_snapshot,
      row_item.metadata,
      row_item.created_at,
      row_number() over (
        order by limited_nodes.route_ordinal asc, row_item.sort_order asc, row_item.id asc
      ) as route_ordinal
    from public.estimate_row_items row_item
    join limited_nodes
      on limited_nodes.id = row_item.node_id
    join resolved
      on resolved.estimate_id = row_item.estimate_id
  ),
  raw_rows as (
    select tab_rows.*
    from tab_rows
    cross join limits
    where limits.max_row_item_count is null
       or tab_rows.route_ordinal <= limits.max_row_item_count + 1
  ),
  limited_rows as (
    select raw_rows.*
    from raw_rows
    cross join limits
    where limits.max_row_item_count is null
       or raw_rows.route_ordinal <= limits.max_row_item_count
  ),
  counts as (
    select
      (select count(*) from raw_nodes)::integer as fetched_node_count,
      (select count(*) from raw_rows)::integer as fetched_row_item_count
  )
  select jsonb_build_object(
    'workspace', to_jsonb(resolved.workspace_row),
    'project', to_jsonb(resolved.project_row),
    'estimate', to_jsonb(resolved.estimate_row),
    'sheetAdjustment', public.estimate_sheet_adjustment_snapshot(resolved.estimate_id),
    'selectedNodeId', resolved.selected_node_id,
    'selectedTabId', resolved.estimate_tab_id,
    'tabs', coalesce((
      select jsonb_agg(to_jsonb(active_tabs) order by active_tabs.sort_order asc, active_tabs.id asc)
      from active_tabs
    ), '[]'::jsonb),
    'nodes', coalesce((
      select jsonb_agg(
        to_jsonb(limited_nodes) - 'route_ordinal'
        order by limited_nodes.route_ordinal asc
      )
      from limited_nodes
    ), '[]'::jsonb),
    'rows', coalesce((
      select jsonb_agg(
        to_jsonb(limited_rows) - 'route_ordinal'
        order by limited_rows.route_ordinal asc
      )
      from limited_rows
    ), '[]'::jsonb),
    'loadLimitState',
      case
        when limits.max_node_count is null and limits.max_row_item_count is null then null
        else jsonb_build_object(
          'maxNodeCount', limits.max_node_count,
          'maxRowItemCount', limits.max_row_item_count,
          'fetchedNodeCount', counts.fetched_node_count,
          'fetchedRowItemCount', counts.fetched_row_item_count,
          'didExceedNodeLimit', limits.max_node_count is not null and counts.fetched_node_count > limits.max_node_count,
          'didExceedRowItemLimit', limits.max_row_item_count is not null and counts.fetched_row_item_count > limits.max_row_item_count
        )
      end
  )
  from resolved
  cross join limits
  cross join counts;
$$;

revoke all on function public.estimate_node_route_context(uuid, uuid, integer, integer) from public, anon;
grant execute on function public.estimate_node_route_context(uuid, uuid, integer, integer) to authenticated;

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
  target_parent_tab_id uuid;
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

  select node.estimate_tab_id
    into target_parent_tab_id
  from public.estimate_nodes node
  where node.id = target_parent_node_id
    and node.estimate_id = target_estimate_id
    and node.kind = 'group';

  if target_parent_tab_id is null then
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
    and node.estimate_tab_id = target_parent_tab_id
  for update;

  set constraints estimate_nodes_tab_unique_sort, estimate_nodes_tab_unique_sort_with_root deferred;

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
    and node.estimate_tab_id = target_parent_tab_id
    and node.parent_id = target_parent_node_id;

  insert into public.estimate_nodes (id, estimate_id, estimate_tab_id, parent_id, kind, name, sort_order, metadata)
  select
    node_map.target_node_id,
    target_estimate_id,
    target_parent_tab_id,
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
    adjustment_percentage,
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
    row_item.adjustment_percentage,
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
    'inserted_row_item_count', inserted_row_item_count,
    'estimate_tab_id', target_parent_tab_id
  );
end;
$$;

revoke execute on function public.insert_estimate_template_into_estimate(uuid, uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.insert_estimate_template_into_estimate(uuid, uuid, uuid, uuid) to authenticated;

alter function public.restore_deleted_estimate_rows_with_history(uuid, uuid, uuid, uuid[], uuid, uuid)
  rename to restore_deleted_estimate_rows_with_history_quantity_legacy;

alter function public.restore_deleted_estimate_nodes_with_history(uuid, uuid, uuid, uuid[], uuid, uuid)
  rename to restore_deleted_estimate_nodes_with_history_quantity_legacy;

create or replace function public.estimate_restore_snapshot_adjustment_percentage(row_snapshot jsonb)
returns numeric
language sql
stable
set search_path = public
as $$
  select case
    when row_snapshot ? 'adjustmentPercentage' then coalesce(nullif(row_snapshot->>'adjustmentPercentage', '')::numeric, 0)
    when public.estimate_row_payload_quantity_base(row_snapshot, null) is null then coalesce(nullif(row_snapshot->>'contingencyPercentage', '')::numeric, 0)
    else 0
  end;
$$;

create or replace function public.apply_restored_estimate_row_adjustments(
  target_estimate_id uuid,
  source_row_snapshots jsonb,
  restored_row_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row_snapshot jsonb;
  snapshot_row_id uuid;
  snapshot_quantity_base numeric;
  restored_snapshots jsonb := '[]'::jsonb;
  total_delta numeric := 0;
begin
  if coalesce(array_length(restored_row_ids, 1), 0) = 0 then
    return jsonb_build_object('restoredRows', restored_snapshots, 'totalDelta', total_delta);
  end if;

  for row_snapshot in
    select value
    from jsonb_array_elements(coalesce(source_row_snapshots, '[]'::jsonb)) as snapshots(value)
  loop
    snapshot_row_id := nullif(row_snapshot->>'id', '')::uuid;
    if snapshot_row_id is null or snapshot_row_id <> all(restored_row_ids) then
      continue;
    end if;

    snapshot_quantity_base := public.estimate_row_payload_quantity_base(row_snapshot, null);

    update public.estimate_row_items row_item
    set adjustment_percentage = public.estimate_restore_snapshot_adjustment_percentage(row_snapshot),
        contingency_percentage = case
          when snapshot_quantity_base is null and not (row_snapshot ? 'adjustmentPercentage') then 0
          else coalesce(nullif(row_snapshot->>'contingencyPercentage', '')::numeric, row_item.contingency_percentage)
        end
    where row_item.estimate_id = target_estimate_id
      and row_item.id = snapshot_row_id;
  end loop;

  select coalesce(jsonb_agg(public.estimate_row_item_snapshot(row_item) order by row_item.node_id, row_item.sort_order, row_item.id), '[]'::jsonb),
         coalesce(sum(public.estimate_row_line_total(row_item)), 0)
    into restored_snapshots, total_delta
  from public.estimate_row_items row_item
  where row_item.estimate_id = target_estimate_id
    and row_item.id = any(restored_row_ids);

  return jsonb_build_object('restoredRows', restored_snapshots, 'totalDelta', total_delta);
end;
$$;

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
  result jsonb;
  delete_event public.estimate_sheet_events;
  source_snapshots jsonb := '[]'::jsonb;
  restored_row_ids uuid[] := array[]::uuid[];
  adjustment_result jsonb;
  restored_event_id uuid;
begin
  result := public.restore_deleted_estimate_rows_with_history_quantity_legacy(
    target_project_id,
    target_estimate_id,
    source_delete_event_id,
    target_row_ids,
    acting_user_id,
    correlation_id
  );

  select coalesce(array_agg(value::uuid), array[]::uuid[])
    into restored_row_ids
  from jsonb_array_elements_text(coalesce(result->'restoredRowIds', '[]'::jsonb)) as ids(value);

  if coalesce(array_length(restored_row_ids, 1), 0) = 0 then
    return result;
  end if;

  select *
    into delete_event
  from public.estimate_sheet_events event
  where event.id = source_delete_event_id
    and event.estimate_id = target_estimate_id
    and event.event_type in ('row_deleted', 'rows_bulk_deleted')
  for share;

  if delete_event.event_type = 'row_deleted' then
    source_snapshots := jsonb_build_array(coalesce(delete_event.payload->'deletedSnapshot', delete_event.old_snapshot));
  else
    source_snapshots := coalesce(delete_event.payload->'deletedRows', delete_event.old_snapshot->'deletedRows', '[]'::jsonb);
  end if;

  adjustment_result := public.apply_restored_estimate_row_adjustments(target_estimate_id, source_snapshots, restored_row_ids);
  restored_event_id := nullif(result->>'eventId', '')::uuid;

  if restored_event_id is not null then
    update public.estimate_sheet_events event
    set new_snapshot = jsonb_build_object('restoredRows', adjustment_result->'restoredRows'),
        total_delta = coalesce(nullif(adjustment_result->>'totalDelta', '')::numeric, event.total_delta),
        payload = jsonb_set(
          jsonb_set(event.payload, '{restoredRows}', adjustment_result->'restoredRows', true),
          '{restoredRowIds}',
          to_jsonb(restored_row_ids),
          true
        )
    where event.id = restored_event_id
      and event.estimate_id = target_estimate_id;
  end if;

  return result || jsonb_build_object(
    'restoredRows', adjustment_result->'restoredRows',
    'restoredRowIds', to_jsonb(restored_row_ids)
  );
end;
$$;

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
  result jsonb;
  delete_event public.estimate_sheet_events;
  source_row_snapshots jsonb := '[]'::jsonb;
  restored_row_ids uuid[] := array[]::uuid[];
  adjustment_result jsonb;
  restored_event_id uuid;
begin
  result := public.restore_deleted_estimate_nodes_with_history_quantity_legacy(
    target_project_id,
    target_estimate_id,
    source_delete_event_id,
    target_node_ids,
    acting_user_id,
    correlation_id
  );

  select coalesce(array_agg(value::uuid), array[]::uuid[])
    into restored_row_ids
  from jsonb_array_elements_text(coalesce(result->'restoredRowIds', '[]'::jsonb)) as ids(value);

  if coalesce(array_length(restored_row_ids, 1), 0) = 0 then
    return result;
  end if;

  select *
    into delete_event
  from public.estimate_sheet_events event
  where event.id = source_delete_event_id
    and event.estimate_id = target_estimate_id
    and event.event_type in ('node_deleted_with_children', 'nodes_bulk_deleted_with_children')
  for share;

  source_row_snapshots := coalesce(delete_event.payload->'deletedRows', delete_event.old_snapshot->'deletedRows', '[]'::jsonb);
  adjustment_result := public.apply_restored_estimate_row_adjustments(target_estimate_id, source_row_snapshots, restored_row_ids);
  restored_event_id := nullif(result->>'eventId', '')::uuid;

  if restored_event_id is not null then
    update public.estimate_sheet_events event
    set total_delta = coalesce(nullif(adjustment_result->>'totalDelta', '')::numeric, event.total_delta),
        payload = jsonb_set(event.payload, '{restoredRowIds}', to_jsonb(restored_row_ids), true)
    where event.id = restored_event_id
      and event.estimate_id = target_estimate_id;
  end if;

  return result || jsonb_build_object('restoredRowIds', to_jsonb(restored_row_ids));
end;
$$;

revoke all on function public.restore_deleted_estimate_rows_with_history_quantity_legacy(uuid, uuid, uuid, uuid[], uuid, uuid) from public, anon, authenticated;
revoke all on function public.restore_deleted_estimate_nodes_with_history_quantity_legacy(uuid, uuid, uuid, uuid[], uuid, uuid) from public, anon, authenticated;
revoke execute on function public.estimate_restore_snapshot_adjustment_percentage(jsonb) from public, anon;
revoke all on function public.apply_restored_estimate_row_adjustments(uuid, jsonb, uuid[]) from public, anon, authenticated;
revoke all on function public.restore_deleted_estimate_rows_with_history(uuid, uuid, uuid, uuid[], uuid, uuid) from public, anon;
grant execute on function public.restore_deleted_estimate_rows_with_history(uuid, uuid, uuid, uuid[], uuid, uuid) to authenticated;
revoke all on function public.restore_deleted_estimate_nodes_with_history(uuid, uuid, uuid, uuid[], uuid, uuid) from public, anon;
grant execute on function public.restore_deleted_estimate_nodes_with_history(uuid, uuid, uuid, uuid[], uuid, uuid) to authenticated;

alter function public.insert_estimate_subtree_into_estimate(uuid, uuid, uuid, uuid, uuid, uuid)
  rename to insert_estimate_subtree_into_estimate_quantity_legacy;

create or replace function public.insert_estimate_subtree_into_estimate(
  target_project_id uuid,
  target_estimate_id uuid,
  target_parent_node_id uuid,
  source_estimate_id uuid,
  source_root_node_id uuid,
  source_tab_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  insert_result jsonb;
begin
  create temporary table if not exists estimate_subtree_existing_copied_rows (
    id uuid primary key
  ) on commit drop;

  truncate table estimate_subtree_existing_copied_rows;

  insert into estimate_subtree_existing_copied_rows(id)
  select row_item.id
  from public.estimate_row_items row_item
  where row_item.estimate_id = target_estimate_id
    and row_item.source_snapshot->>'sourceEstimateId' = source_estimate_id::text
    and (source_root_node_id is null or row_item.source_snapshot ? 'sourceRowId');

  insert_result := public.insert_estimate_subtree_into_estimate_quantity_legacy(
    target_project_id,
    target_estimate_id,
    target_parent_node_id,
    source_estimate_id,
    source_root_node_id,
    source_tab_id
  );

  update public.estimate_row_items copied
  set adjustment_percentage = coalesce(source_row.adjustment_percentage, 0),
      contingency_percentage = source_row.contingency_percentage
  from public.estimate_row_items source_row
  where copied.estimate_id = target_estimate_id
    and copied.source_snapshot->>'sourceEstimateId' = source_estimate_id::text
    and nullif(copied.source_snapshot->>'sourceRowId', '')::uuid = source_row.id
    and source_row.estimate_id = source_estimate_id
    and not exists (
      select 1
      from estimate_subtree_existing_copied_rows existing
      where existing.id = copied.id
    );

  return insert_result;
end;
$$;

revoke all on function public.insert_estimate_subtree_into_estimate_quantity_legacy(uuid, uuid, uuid, uuid, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.insert_estimate_subtree_into_estimate(uuid, uuid, uuid, uuid, uuid, uuid) from public, anon, authenticated;

revoke execute on function public.estimate_row_adjustment_value(public.estimate_row_items) from public, anon;
revoke execute on function public.estimate_row_payload_adjustment_percentage(jsonb, numeric) from public, anon;
revoke execute on function public.project_estimate_list_summaries(uuid) from public, anon;
grant execute on function public.project_estimate_list_summaries(uuid) to authenticated;
revoke execute on function public.project_estimate_list_summaries_for_estimates(uuid, uuid[]) from public, anon;
grant execute on function public.project_estimate_list_summaries_for_estimates(uuid, uuid[]) to authenticated;

commit;
