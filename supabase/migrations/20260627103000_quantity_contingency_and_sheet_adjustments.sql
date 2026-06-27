-- Quantity-mode row contingency and estimate-level sheet adjustment.
--
-- Additive only: existing rows keep quantity_base NULL, which preserves legacy
-- subtotal-based row contingency semantics. Quantity-mode rows set quantity to
-- quantity_base + quantity_contingency_amount and do not receive an additional
-- row contingency peso value.

begin;
alter table public.estimate_row_items
  add column if not exists quantity_base numeric(14, 4),
  add column if not exists quantity_contingency_amount numeric(14, 4);
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'estimate_row_items_quantity_contingency_nonnegative'
      and conrelid = 'public.estimate_row_items'::regclass
  ) then
    alter table public.estimate_row_items
      add constraint estimate_row_items_quantity_contingency_nonnegative
      check (
        (quantity_base is null and quantity_contingency_amount is null)
        or (
          quantity_base is not null
          and quantity_base >= 0
          and coalesce(quantity_contingency_amount, 0) >= 0
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'estimate_row_items_quantity_contingency_total'
      and conrelid = 'public.estimate_row_items'::regclass
  ) then
    alter table public.estimate_row_items
      add constraint estimate_row_items_quantity_contingency_total
      check (
        quantity_base is null
        or quantity = quantity_base + coalesce(quantity_contingency_amount, 0)
      );
  end if;
end $$;
create table if not exists public.estimate_sheet_adjustments (
  estimate_id uuid primary key references public.estimates(id) on delete cascade,
  mode text not null default 'contingency' check (mode in ('contingency', 'discount')),
  percentage numeric(8, 4) not null default 0 check (percentage >= 0 and percentage <= 100),
  row_revision integer not null default 1 check (row_revision >= 1),
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.estimate_sheet_adjustments enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'estimate_sheet_adjustments_set_updated_at'
      and tgrelid = 'public.estimate_sheet_adjustments'::regclass
  ) then
    create trigger estimate_sheet_adjustments_set_updated_at
      before update on public.estimate_sheet_adjustments
      for each row execute function public.set_updated_at();
  end if;
end $$;
drop policy if exists estimate_sheet_adjustments_select_authenticated on public.estimate_sheet_adjustments;
create policy estimate_sheet_adjustments_select_authenticated
  on public.estimate_sheet_adjustments
  for select
  to authenticated
  using (public.can_access_estimate(estimate_id));
drop policy if exists estimate_sheet_adjustments_insert_authenticated on public.estimate_sheet_adjustments;
create policy estimate_sheet_adjustments_insert_authenticated
  on public.estimate_sheet_adjustments
  for insert
  to authenticated
  with check (public.can_edit_estimate(estimate_id));
drop policy if exists estimate_sheet_adjustments_update_authenticated on public.estimate_sheet_adjustments;
create policy estimate_sheet_adjustments_update_authenticated
  on public.estimate_sheet_adjustments
  for update
  to authenticated
  using (public.can_edit_estimate(estimate_id))
  with check (public.can_edit_estimate(estimate_id));
drop policy if exists estimate_sheet_adjustments_delete_authenticated on public.estimate_sheet_adjustments;
create policy estimate_sheet_adjustments_delete_authenticated
  on public.estimate_sheet_adjustments
  for delete
  to authenticated
  using (public.can_edit_estimate(estimate_id));
grant select, insert, update, delete on table public.estimate_sheet_adjustments to authenticated;
create or replace function public.estimate_row_payload_quantity_base(payload jsonb, fallback numeric default null)
returns numeric
language sql
immutable
set search_path = public
as $$
  select case
    when payload ? 'quantityBase' then nullif(payload->>'quantityBase', '')::numeric
    else fallback
  end;
$$;
create or replace function public.estimate_row_payload_quantity_contingency_amount(
  payload jsonb,
  resolved_quantity_base numeric,
  fallback numeric default null
)
returns numeric
language sql
immutable
set search_path = public
as $$
  select case
    when resolved_quantity_base is null then null
    when payload ? 'quantityContingencyAmount' then coalesce(nullif(payload->>'quantityContingencyAmount', '')::numeric, 0)
    else coalesce(fallback, 0)
  end;
$$;
create or replace function public.estimate_row_payload_quantity(
  payload jsonb,
  resolved_quantity_base numeric,
  resolved_quantity_contingency_amount numeric,
  fallback numeric default 0
)
returns numeric
language sql
immutable
set search_path = public
as $$
  select case
    when resolved_quantity_base is not null then resolved_quantity_base + coalesce(resolved_quantity_contingency_amount, 0)
    when payload ? 'quantity' then coalesce(nullif(payload->>'quantity', '')::numeric, fallback)
    else fallback
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
  select case
    when row_item.quantity_base is not null then 0
    else public.estimate_row_subtotal(row_item) * coalesce(row_item.contingency_percentage, 0) / 100
  end;
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
    'quantityBase', row_item.quantity_base,
    'quantityContingencyAmount', row_item.quantity_contingency_amount,
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
    'quantity', row_item.quantity,
    'quantityBase', row_item.quantity_base,
    'quantityContingencyAmount', row_item.quantity_contingency_amount,
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
create or replace function public.estimate_sheet_adjustment_snapshot(target_estimate_id uuid)
returns jsonb
language sql
stable
set search_path = public
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'estimateId', adjustment.estimate_id,
        'mode', adjustment.mode,
        'percentage', adjustment.percentage,
        'rowRevision', adjustment.row_revision,
        'updatedAt', adjustment.updated_at,
        'updatedBy', adjustment.updated_by
      )
      from public.estimate_sheet_adjustments adjustment
      where adjustment.estimate_id = target_estimate_id
    ),
    jsonb_build_object(
      'estimateId', target_estimate_id,
      'mode', 'contingency',
      'percentage', 0,
      'rowRevision', 0,
      'updatedAt', null,
      'updatedBy', null
    )
  );
$$;
create or replace function public.estimate_sheet_adjustment_value(target_estimate_id uuid)
returns numeric
language sql
stable
set search_path = public
as $$
  select case
    when coalesce(adjustment.mode, 'contingency') = 'discount'
      then -public.estimate_sheet_total(target_estimate_id) * coalesce(adjustment.percentage, 0) / 100
    else public.estimate_sheet_total(target_estimate_id) * coalesce(adjustment.percentage, 0) / 100
  end
  from (select public.estimate_sheet_adjustment_snapshot(target_estimate_id) as snapshot) snapshot_row
  left join lateral (
    select
      snapshot_row.snapshot->>'mode' as mode,
      nullif(snapshot_row.snapshot->>'percentage', '')::numeric as percentage
  ) adjustment on true;
$$;
create or replace function public.estimate_sheet_snapshot(target_estimate_id uuid)
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'schemaVersion', '2026-06-27.quantity-contingency.v1',
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
    'adjustment', public.estimate_sheet_adjustment_snapshot(estimate.id),
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
      'subtotal', public.estimate_sheet_total(estimate.id),
      'adjustmentValue', public.estimate_sheet_adjustment_value(estimate.id),
      'total', public.estimate_sheet_total(estimate.id) + public.estimate_sheet_adjustment_value(estimate.id)
    )
  )
  from public.estimates estimate
  where estimate.id = target_estimate_id;
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
create or replace function public.move_estimate_row_component_with_history(
  target_project_id uuid,
  target_estimate_id uuid,
  source_row_id uuid,
  target_row_id uuid,
  expected_source_row_revision integer,
  expected_target_row_revision integer,
  source_replacement_payload jsonb,
  target_replacement_payload jsonb,
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
  locked_row public.estimate_row_items;
  old_source_row public.estimate_row_items;
  old_target_row public.estimate_row_items;
  updated_source_row public.estimate_row_items;
  updated_target_row public.estimate_row_items;
  old_source_snapshot jsonb;
  old_target_snapshot jsonb;
  new_source_snapshot jsonb;
  new_target_snapshot jsonb;
  inserted_event_id uuid;
  old_total numeric;
  new_total numeric;
  source_quantity_base numeric;
  source_quantity_contingency_amount numeric;
  source_quantity numeric;
  target_quantity_base numeric;
  target_quantity_contingency_amount numeric;
  target_quantity numeric;
begin
  if source_row_id = target_row_id then
    raise exception 'Source and target estimate rows must be different.';
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

  for locked_row in
    select row_item.*
    from public.estimate_row_items row_item
    where row_item.estimate_id = target_estimate_id
      and row_item.id in (source_row_id, target_row_id)
    order by row_item.id
    for update
  loop
    if locked_row.id = source_row_id then
      old_source_row := locked_row;
    elsif locked_row.id = target_row_id then
      old_target_row := locked_row;
    end if;
  end loop;

  if old_source_row.id is null or old_target_row.id is null then
    raise exception 'One or more estimate row items were not found in the current project.';
  end if;

  if expected_source_row_revision is null or old_source_row.row_revision <> expected_source_row_revision then
    raise exception 'estimate_sheet_row_revision_conflict'
      using errcode = 'P0001',
            detail = jsonb_build_object(
              'rowId', source_row_id,
              'expectedRowRevision', expected_source_row_revision,
              'currentRowRevision', old_source_row.row_revision
            )::text;
  end if;

  if expected_target_row_revision is null or old_target_row.row_revision <> expected_target_row_revision then
    raise exception 'estimate_sheet_row_revision_conflict'
      using errcode = 'P0001',
            detail = jsonb_build_object(
              'rowId', target_row_id,
              'expectedRowRevision', expected_target_row_revision,
              'currentRowRevision', old_target_row.row_revision
            )::text;
  end if;

  old_source_snapshot := public.estimate_row_item_snapshot(old_source_row);
  old_target_snapshot := public.estimate_row_item_snapshot(old_target_row);
  old_total := public.estimate_row_line_total(old_source_row) + public.estimate_row_line_total(old_target_row);

  source_quantity_base := public.estimate_row_payload_quantity_base(source_replacement_payload, old_source_row.quantity_base);
  source_quantity_contingency_amount := public.estimate_row_payload_quantity_contingency_amount(
    source_replacement_payload,
    source_quantity_base,
    old_source_row.quantity_contingency_amount
  );
  source_quantity := public.estimate_row_payload_quantity(source_replacement_payload, source_quantity_base, source_quantity_contingency_amount, old_source_row.quantity);

  target_quantity_base := public.estimate_row_payload_quantity_base(target_replacement_payload, old_target_row.quantity_base);
  target_quantity_contingency_amount := public.estimate_row_payload_quantity_contingency_amount(
    target_replacement_payload,
    target_quantity_base,
    old_target_row.quantity_contingency_amount
  );
  target_quantity := public.estimate_row_payload_quantity(target_replacement_payload, target_quantity_base, target_quantity_contingency_amount, old_target_row.quantity);

  update public.estimate_row_items row_item
  set source_library_item_id = nullif(source_replacement_payload->>'sourceLibraryItemId', '')::uuid,
      source_snapshot = source_replacement_payload->'sourceSnapshot',
      category_node_id = nullif(source_replacement_payload->>'categoryNodeId', ''),
      supplier_id = nullif(source_replacement_payload->>'supplierId', '')::uuid,
      material = coalesce(source_replacement_payload->>'material', ''),
      description = coalesce(source_replacement_payload->>'description', ''),
      supplier = coalesce(source_replacement_payload->>'supplier', ''),
      unit = coalesce(nullif(source_replacement_payload->>'unit', ''), 'unit'),
      quantity = source_quantity,
      quantity_base = source_quantity_base,
      quantity_contingency_amount = source_quantity_contingency_amount,
      unit_cost = coalesce(nullif(source_replacement_payload->>'unitCost', '')::numeric, 0),
      contingency_percentage = coalesce(nullif(source_replacement_payload->>'contingencyPercentage', '')::numeric, row_item.contingency_percentage),
      misc_cost = coalesce(nullif(source_replacement_payload->>'miscCost', '')::numeric, 0),
      discipline = coalesce(source_replacement_payload->>'discipline', ''),
      designation = coalesce(source_replacement_payload->>'designation', ''),
      link_state = coalesce(nullif(source_replacement_payload->>'linkState', '')::public.estimate_row_link_state, 'unlinked'),
      metadata = coalesce(source_replacement_payload->'metadata', '{}'::jsonb),
      row_revision = row_revision + 1
  where row_item.id = source_row_id
    and row_item.estimate_id = target_estimate_id
  returning * into updated_source_row;

  update public.estimate_row_items row_item
  set source_library_item_id = nullif(target_replacement_payload->>'sourceLibraryItemId', '')::uuid,
      source_snapshot = target_replacement_payload->'sourceSnapshot',
      category_node_id = nullif(target_replacement_payload->>'categoryNodeId', ''),
      supplier_id = nullif(target_replacement_payload->>'supplierId', '')::uuid,
      material = coalesce(target_replacement_payload->>'material', ''),
      description = coalesce(target_replacement_payload->>'description', ''),
      supplier = coalesce(target_replacement_payload->>'supplier', ''),
      unit = coalesce(nullif(target_replacement_payload->>'unit', ''), 'unit'),
      quantity = target_quantity,
      quantity_base = target_quantity_base,
      quantity_contingency_amount = target_quantity_contingency_amount,
      unit_cost = coalesce(nullif(target_replacement_payload->>'unitCost', '')::numeric, 0),
      contingency_percentage = coalesce(nullif(target_replacement_payload->>'contingencyPercentage', '')::numeric, row_item.contingency_percentage),
      misc_cost = coalesce(nullif(target_replacement_payload->>'miscCost', '')::numeric, 0),
      discipline = coalesce(target_replacement_payload->>'discipline', ''),
      designation = coalesce(target_replacement_payload->>'designation', ''),
      link_state = coalesce(nullif(target_replacement_payload->>'linkState', '')::public.estimate_row_link_state, 'linked-clean'),
      metadata = coalesce(target_replacement_payload->'metadata', '{}'::jsonb),
      row_revision = row_revision + 1
  where row_item.id = target_row_id
    and row_item.estimate_id = target_estimate_id
  returning * into updated_target_row;

  new_source_snapshot := public.estimate_row_item_snapshot(updated_source_row);
  new_target_snapshot := public.estimate_row_item_snapshot(updated_target_row);
  new_total := public.estimate_row_line_total(updated_source_row) + public.estimate_row_line_total(updated_target_row);

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
    updated_target_row.node_id,
    updated_target_row.id,
    'row_moved',
    'server_action',
    correlation_id,
    resolved_user_id,
    public.estimate_row_context(updated_target_row),
    jsonb_build_object(
      'sourceRow', old_source_snapshot,
      'targetRow', old_target_snapshot
    ),
    jsonb_build_object(
      'sourceRow', new_source_snapshot,
      'targetRow', new_target_snapshot
    ),
    array['sourceRow', 'targetRow'],
    new_total - old_total,
    jsonb_build_object(
      'sourceRowId', updated_source_row.id,
      'targetRowId', updated_target_row.id,
      'sourceRow', new_source_snapshot,
      'targetRow', new_target_snapshot
    )
  )
  returning id into inserted_event_id;

  return jsonb_build_object(
    'idempotent', false,
    'eventId', inserted_event_id,
    'sourceRowId', updated_source_row.id,
    'targetRowId', updated_target_row.id,
    'sourceRow', new_source_snapshot,
    'targetRow', new_target_snapshot
  );
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
  restored_quantity_base numeric;
  restored_quantity_contingency_amount numeric;
  restored_quantity numeric;
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

    restored_quantity_base := public.estimate_row_payload_quantity_base(row_snapshot, null);
    restored_quantity_contingency_amount := public.estimate_row_payload_quantity_contingency_amount(row_snapshot, restored_quantity_base, null);
    restored_quantity := public.estimate_row_payload_quantity(row_snapshot, restored_quantity_base, restored_quantity_contingency_amount, 0);

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
      restored_quantity,
      restored_quantity_base,
      restored_quantity_contingency_amount,
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
      quantity_base,
      quantity_contingency_amount,
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
      public.estimate_row_payload_quantity(to_jsonb(row_snapshot), row_snapshot."quantityBase", row_snapshot."quantityContingencyAmount", coalesce(row_snapshot."quantity", 0)),
      row_snapshot."quantityBase",
      public.estimate_row_payload_quantity_contingency_amount(to_jsonb(row_snapshot), row_snapshot."quantityBase", row_snapshot."quantityContingencyAmount"),
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
      "quantityBase" numeric,
      "quantityContingencyAmount" numeric,
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

  insert into public.estimate_sheet_adjustments (
    estimate_id,
    mode,
    percentage,
    row_revision,
    updated_by
  )
  select
    restored_estimate_id,
    coalesce(nullif(adjustment.mode, ''), 'contingency')::public.estimate_sheet_adjustment_mode,
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
revoke all on function public.insert_estimate_row_item_with_history(uuid, uuid, uuid, jsonb, uuid, uuid) from public, anon;
grant execute on function public.insert_estimate_row_item_with_history(uuid, uuid, uuid, jsonb, uuid, uuid) to authenticated;
revoke all on function public.update_estimate_row_item_with_history(uuid, uuid, uuid, integer, jsonb, uuid, uuid) from public, anon;
grant execute on function public.update_estimate_row_item_with_history(uuid, uuid, uuid, integer, jsonb, uuid, uuid) to authenticated;
revoke all on function public.replace_estimate_row_item_with_history(uuid, uuid, uuid, integer, jsonb, uuid, uuid) from public, anon;
grant execute on function public.replace_estimate_row_item_with_history(uuid, uuid, uuid, integer, jsonb, uuid, uuid) to authenticated;
revoke all on function public.estimate_node_route_context(uuid, uuid, integer, integer) from public, anon;
grant execute on function public.estimate_node_route_context(uuid, uuid, integer, integer) to authenticated;
revoke all on function public.move_estimate_row_component_with_history(uuid, uuid, uuid, uuid, integer, integer, jsonb, jsonb, uuid, uuid) from public, anon;
grant execute on function public.move_estimate_row_component_with_history(uuid, uuid, uuid, uuid, integer, integer, jsonb, jsonb, uuid, uuid) to authenticated;
revoke all on function public.restore_deleted_estimate_rows_with_history(uuid, uuid, uuid, uuid[], uuid, uuid) from public, anon;
grant execute on function public.restore_deleted_estimate_rows_with_history(uuid, uuid, uuid, uuid[], uuid, uuid) to authenticated;
revoke all on function public.restore_deleted_estimate_nodes_with_history(uuid, uuid, uuid, uuid[], uuid, uuid) from public, anon;
grant execute on function public.restore_deleted_estimate_nodes_with_history(uuid, uuid, uuid, uuid[], uuid, uuid) to authenticated;
revoke all on function public.restore_estimate_sheet_version_as_copy(uuid, uuid, text, text, uuid, uuid) from public, anon;
grant execute on function public.restore_estimate_sheet_version_as_copy(uuid, uuid, text, text, uuid, uuid) to authenticated;
commit;
