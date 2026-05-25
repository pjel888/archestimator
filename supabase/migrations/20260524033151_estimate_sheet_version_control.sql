-- Estimate sheet version control foundation.
-- Adds compact append-only row/sheet events, named full-sheet versions, row
-- revision conflict protection, idempotent mutation correlation ids, and
-- history-aware RPC wrappers around existing atomic estimate operations.

create extension if not exists pgcrypto;

alter table public.estimate_row_items
  add column if not exists row_revision integer not null default 1 check (row_revision > 0);

create table if not exists public.estimate_sheet_events (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references public.estimates(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  estimate_node_id uuid references public.estimate_nodes(id) on delete set null,
  target_row_id uuid references public.estimate_row_items(id) on delete set null,
  event_type text not null check (char_length(trim(event_type)) > 0),
  event_source text not null default 'server_action' check (char_length(trim(event_source)) > 0),
  correlation_id uuid not null default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  row_context jsonb not null default '{}'::jsonb,
  old_snapshot jsonb,
  new_snapshot jsonb,
  changed_fields text[] not null default '{}'::text[],
  total_delta numeric(14, 2),
  payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint estimate_sheet_events_payload_size_check check (
    pg_column_size(row_context)
      + pg_column_size(coalesce(old_snapshot, '{}'::jsonb))
      + pg_column_size(coalesce(new_snapshot, '{}'::jsonb))
      + pg_column_size(payload)
      <= 32768
  )
);

create table if not exists public.estimate_sheet_versions (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references public.estimates(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  version_label text not null check (char_length(trim(version_label)) > 0),
  title text not null default '',
  note text not null default '',
  snapshot jsonb not null,
  summary jsonb not null default '{}'::jsonb,
  source_event_id uuid references public.estimate_sheet_events(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint estimate_sheet_versions_estimate_version_key unique (estimate_id, version_number),
  constraint estimate_sheet_versions_snapshot_size_check check (pg_column_size(snapshot) <= 5242880)
);

create index if not exists estimate_sheet_events_estimate_created_idx
  on public.estimate_sheet_events(estimate_id, created_at desc, id desc);
create index if not exists estimate_sheet_events_row_created_idx
  on public.estimate_sheet_events(target_row_id, created_at desc, id desc)
  where target_row_id is not null;
create index if not exists estimate_sheet_events_correlation_idx
  on public.estimate_sheet_events(estimate_id, correlation_id, created_at desc);
create index if not exists estimate_sheet_events_workspace_created_idx
  on public.estimate_sheet_events(workspace_id, created_at desc);
create index if not exists estimate_sheet_versions_workspace_estimate_idx
  on public.estimate_sheet_versions(workspace_id, estimate_id, version_number desc);

create or replace function public.estimate_sheet_can_bypass_auth()
returns boolean
language sql
stable
set search_path = public
as $$
  select current_user in ('postgres', 'service_role', 'supabase_admin');
$$;

create or replace function public.resolve_estimate_workspace(
  target_project_id uuid,
  target_estimate_id uuid,
  acting_user_id uuid default null
)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  resolved_workspace_id uuid;
  resolved_user_id uuid := coalesce(auth.uid(), acting_user_id);
begin
  if target_estimate_id is null then
    raise exception 'Estimate id is required.';
  end if;

  select project.workspace_id
    into resolved_workspace_id
  from public.estimates estimate
  join public.projects project on project.id = estimate.project_id
  where estimate.id = target_estimate_id
    and (target_project_id is null or project.id = target_project_id);

  if resolved_workspace_id is null then
    raise exception 'Estimate not found in the current project.';
  end if;

  if public.estimate_sheet_can_bypass_auth() then
    return resolved_workspace_id;
  end if;

  if resolved_user_id is null or not exists (
    select 1
    from public.workspace_members member
    where member.workspace_id = resolved_workspace_id
      and member.user_id = resolved_user_id
  ) then
    raise exception 'Workspace access denied.';
  end if;

  return resolved_workspace_id;
end;
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
    'miscCost', row_item.misc_cost,
    'discipline', row_item.discipline,
    'designation', row_item.designation,
    'linkState', row_item.link_state,
    'metadata', row_item.metadata,
    'rowRevision', row_item.row_revision,
    'createdAt', row_item.created_at,
    'updatedAt', row_item.updated_at,
    'lineTotal', ((row_item.quantity * row_item.unit_cost) + row_item.misc_cost)
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
    'lineTotal', ((row_item.quantity * row_item.unit_cost) + row_item.misc_cost)
  );
$$;

create or replace function public.estimate_sheet_total(target_estimate_id uuid)
returns numeric
language sql
stable
set search_path = public
as $$
  select coalesce(sum((row_item.quantity * row_item.unit_cost) + row_item.misc_cost), 0)
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
    'schemaVersion', '2026-05-24.v1',
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
      'rowCount', (select count(*) from public.estimate_row_items row_item where row_item.estimate_id = estimate.id),
      'nodeCount', (select count(*) from public.estimate_nodes node where node.estimate_id = estimate.id),
      'total', public.estimate_sheet_total(estimate.id)
    ),
    'capturedAt', now()
  )
  from public.estimates estimate
  where estimate.id = target_estimate_id;
$$;

create or replace function public.estimate_sheet_event_result(
  target_estimate_id uuid,
  target_correlation_id uuid
)
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'idempotent', true,
    'eventId', event.id,
    'eventType', event.event_type,
    'rowId', event.target_row_id,
    'row', event.new_snapshot,
    'payload', event.payload,
    'createdAt', event.created_at
  )
  from public.estimate_sheet_events event
  where event.estimate_id = target_estimate_id
    and event.correlation_id = target_correlation_id
  order by event.created_at desc, event.id desc
  limit 1;
$$;

create or replace function public.estimate_sheet_changed_fields(
  old_snapshot jsonb,
  new_snapshot jsonb,
  candidate_fields text[]
)
returns text[]
language sql
stable
set search_path = public
as $$
  select coalesce(array_agg(field_name order by field_name), '{}'::text[])
  from unnest(candidate_fields) field_name
  where old_snapshot -> field_name is distinct from new_snapshot -> field_name;
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
    ((inserted_row.quantity * inserted_row.unit_cost) + inserted_row.misc_cost),
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
  old_total := (old_row.quantity * old_row.unit_cost) + old_row.misc_cost;

  update public.estimate_row_items row_item
  set quantity = case when row_patch ? 'quantity' then coalesce(nullif(row_patch->>'quantity', '')::numeric, row_item.quantity) else row_item.quantity end,
      unit_cost = case when row_patch ? 'unitCost' then coalesce(nullif(row_patch->>'unitCost', '')::numeric, row_item.unit_cost) else row_item.unit_cost end,
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
  new_total := (updated_row.quantity * updated_row.unit_cost) + updated_row.misc_cost;
  changed_fields := public.estimate_sheet_changed_fields(
    old_snapshot,
    new_snapshot,
    array[
      'quantity',
      'unitCost',
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
  old_total := (old_row.quantity * old_row.unit_cost) + old_row.misc_cost;

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
  new_total := (replaced_row.quantity * replaced_row.unit_cost) + replaced_row.misc_cost;
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
      'lineTotal', old_snapshot->'lineTotal'
    ),
    jsonb_build_object(
      'sourceLibraryItemId', new_snapshot->'sourceLibraryItemId',
      'sourceSnapshot', new_snapshot->'sourceSnapshot',
      'material', new_snapshot->'material',
      'supplier', new_snapshot->'supplier',
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
  old_total := (old_row.quantity * old_row.unit_cost) + old_row.misc_cost;

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

create or replace function public.reorder_estimate_nodes_with_history(
  target_estimate_id uuid,
  move_updates jsonb,
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
  updated_count integer;
  inserted_event_id uuid;
begin
  resolved_workspace_id := public.resolve_estimate_workspace(null, target_estimate_id, acting_user_id);
  perform 1 from public.estimates estimate where estimate.id = target_estimate_id for update;

  committed_result := public.estimate_sheet_event_result(target_estimate_id, correlation_id);
  if committed_result is not null then
    return committed_result;
  end if;

  updated_count := public.reorder_estimate_nodes(target_estimate_id, move_updates);

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
    'tree_reordered',
    'server_action',
    correlation_id,
    resolved_user_id,
    array['tree'],
    jsonb_build_object('updatedCount', updated_count, 'moveUpdates', move_updates)
  )
  returning id into inserted_event_id;

  return jsonb_build_object(
    'idempotent', false,
    'eventId', inserted_event_id,
    'updatedCount', updated_count
  );
end;
$$;

create or replace function public.insert_estimate_template_into_estimate_with_history(
  target_project_id uuid,
  target_estimate_id uuid,
  target_parent_node_id uuid,
  source_template_id uuid,
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
  insert_result jsonb;
  inserted_event_id uuid;
begin
  resolved_workspace_id := public.resolve_estimate_workspace(target_project_id, target_estimate_id, acting_user_id);
  perform 1 from public.estimates estimate where estimate.id = target_estimate_id for update;

  committed_result := public.estimate_sheet_event_result(target_estimate_id, correlation_id);
  if committed_result is not null then
    return committed_result;
  end if;

  insert_result := public.insert_estimate_template_into_estimate(
    target_project_id,
    target_estimate_id,
    target_parent_node_id,
    source_template_id
  );

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
    target_parent_node_id,
    'template_inserted',
    'server_action',
    correlation_id,
    resolved_user_id,
    array['template'],
    insert_result || jsonb_build_object('sourceTemplateId', source_template_id, 'targetParentNodeId', target_parent_node_id)
  )
  returning id into inserted_event_id;

  return insert_result || jsonb_build_object(
    'idempotent', false,
    'eventId', inserted_event_id
  );
end;
$$;

create or replace function public.update_estimate_details_with_history(
  target_project_id uuid,
  target_estimate_id uuid,
  estimate_patch jsonb,
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
  old_estimate public.estimates;
  updated_estimate public.estimates;
  old_snapshot jsonb;
  new_snapshot jsonb;
  changed_fields text[];
  inserted_event_id uuid;
begin
  resolved_workspace_id := public.resolve_estimate_workspace(target_project_id, target_estimate_id, acting_user_id);
  perform 1 from public.estimates estimate where estimate.id = target_estimate_id for update;

  committed_result := public.estimate_sheet_event_result(target_estimate_id, correlation_id);
  if committed_result is not null then
    return committed_result;
  end if;

  select * into old_estimate
  from public.estimates estimate
  where estimate.id = target_estimate_id
    and estimate.project_id = target_project_id
  for update;

  if old_estimate.id is null then
    raise exception 'Estimate not found in the current project.';
  end if;

  old_snapshot := jsonb_build_object(
    'name', old_estimate.name,
    'sheetCode', old_estimate.sheet_code,
    'metadata', old_estimate.metadata
  );

  update public.estimates estimate
  set name = case
        when estimate_patch ? 'name' then coalesce(nullif(trim(estimate_patch->>'name'), ''), estimate.name)
        else estimate.name
      end,
      sheet_code = case
        when estimate_patch ? 'sheetCode' then coalesce(nullif(trim(estimate_patch->>'sheetCode'), ''), estimate.sheet_code)
        else estimate.sheet_code
      end,
      metadata = case
        when estimate_patch ? 'metadata' then coalesce(estimate_patch->'metadata', '{}'::jsonb)
        else estimate.metadata
      end,
      updated_at = now()
  where estimate.id = target_estimate_id
    and estimate.project_id = target_project_id
  returning * into updated_estimate;

  new_snapshot := jsonb_build_object(
    'name', updated_estimate.name,
    'sheetCode', updated_estimate.sheet_code,
    'metadata', updated_estimate.metadata
  );
  changed_fields := public.estimate_sheet_changed_fields(old_snapshot, new_snapshot, array['name', 'sheetCode', 'metadata']);

  insert into public.estimate_sheet_events (
    estimate_id,
    workspace_id,
    event_type,
    event_source,
    correlation_id,
    actor_user_id,
    old_snapshot,
    new_snapshot,
    changed_fields,
    payload
  )
  values (
    target_estimate_id,
    resolved_workspace_id,
    case
      when changed_fields = array['sheetCode']::text[] then 'sheet_code_updated'
      else 'sheet_metadata_updated'
    end,
    'server_action',
    correlation_id,
    resolved_user_id,
    old_snapshot,
    new_snapshot,
    changed_fields,
    jsonb_build_object(
      'estimateId', target_estimate_id,
      'old', old_snapshot,
      'new', new_snapshot
    )
  )
  returning id into inserted_event_id;

  return jsonb_build_object(
    'idempotent', false,
    'eventId', inserted_event_id,
    'estimateId', updated_estimate.id,
    'estimate', new_snapshot
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
      select sum((row_item.quantity * row_item.unit_cost) + row_item.misc_cost)
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

  committed_result := public.estimate_sheet_event_result(source_version.estimate_id, correlation_id);
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
      'newSheetCode', restored_sheet_code
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

create or replace function public.get_estimate_sheet_version_control_preflight()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'estimateCount', (select count(*) from public.estimates),
    'rowCount', (select count(*) from public.estimate_row_items),
    'averageSourceSnapshotBytes', coalesce((select round(avg(pg_column_size(source_snapshot))) from public.estimate_row_items where source_snapshot is not null), 0),
    'projectedBaselineSnapshotBytes', coalesce((
      select sum(pg_column_size(public.estimate_sheet_snapshot(estimate.id)))
      from public.estimates estimate
    ), 0),
    'requiresBatchedBackfill', (
      (select count(*) from public.estimates) > 100
      or (select count(*) from public.estimate_row_items) > 20000
      or coalesce((
        select sum(pg_column_size(public.estimate_sheet_snapshot(estimate.id)))
        from public.estimates estimate
      ), 0) > 209715200
    )
  );
$$;

create or replace function public.backfill_estimate_sheet_baseline_versions(
  batch_limit integer default 50,
  acting_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  estimate_record record;
  processed_count integer := 0;
  inserted_count integer := 0;
  snapshot jsonb;
  summary jsonb;
  new_version_id uuid;
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('statement_timeout', '120s', true);

  for estimate_record in
    select estimate.id, project.workspace_id
    from public.estimates estimate
    join public.projects project on project.id = estimate.project_id
    where not exists (
      select 1
      from public.estimate_sheet_versions version
      where version.estimate_id = estimate.id
    )
    order by estimate.created_at, estimate.id
    limit greatest(coalesce(batch_limit, 50), 1)
  loop
    perform 1 from public.estimates estimate where estimate.id = estimate_record.id for update;
    snapshot := public.estimate_sheet_snapshot(estimate_record.id);
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
      created_by,
      metadata
    )
    values (
      estimate_record.id,
      estimate_record.workspace_id,
      1,
      'V1',
      'Baseline',
      'Initial baseline backfill',
      snapshot,
      summary,
      acting_user_id,
      jsonb_build_object('backfill', true)
    )
    returning id into new_version_id;

    update public.estimates estimate
    set metadata = coalesce(estimate.metadata, '{}'::jsonb) || jsonb_build_object(
          'versionNumber', 1,
          'versionLabel', 'V1',
          'latestEstimateSheetVersionId', new_version_id
        )
    where estimate.id = estimate_record.id;

    processed_count := processed_count + 1;
    inserted_count := inserted_count + 1;
  end loop;

  return jsonb_build_object(
    'processedCount', processed_count,
    'insertedCount', inserted_count,
    'preflight', public.get_estimate_sheet_version_control_preflight()
  );
end;
$$;

set constraints all immediate;

alter table public.estimate_sheet_events enable row level security;
alter table public.estimate_sheet_versions enable row level security;

drop policy if exists estimate_sheet_events_select_authenticated on public.estimate_sheet_events;
drop policy if exists estimate_sheet_versions_select_authenticated on public.estimate_sheet_versions;

create policy estimate_sheet_events_select_authenticated on public.estimate_sheet_events
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy estimate_sheet_versions_select_authenticated on public.estimate_sheet_versions
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

revoke all on public.estimate_sheet_events from public;
revoke all on public.estimate_sheet_versions from public;

grant select on public.estimate_sheet_events to authenticated;
grant select on public.estimate_sheet_versions to authenticated;

revoke execute on function public.resolve_estimate_workspace(uuid, uuid, uuid) from public;
revoke execute on function public.estimate_row_item_snapshot(public.estimate_row_items) from public;
revoke execute on function public.estimate_row_context(public.estimate_row_items) from public;
revoke execute on function public.estimate_sheet_total(uuid) from public;
revoke execute on function public.estimate_sheet_snapshot(uuid) from public;
revoke execute on function public.estimate_sheet_event_result(uuid, uuid) from public;
revoke execute on function public.estimate_sheet_changed_fields(jsonb, jsonb, text[]) from public;
revoke execute on function public.insert_estimate_row_item_with_history(uuid, uuid, uuid, jsonb, uuid, uuid) from public;
revoke execute on function public.update_estimate_row_item_with_history(uuid, uuid, uuid, integer, jsonb, uuid, uuid) from public;
revoke execute on function public.replace_estimate_row_item_with_history(uuid, uuid, uuid, integer, jsonb, uuid, uuid) from public;
revoke execute on function public.delete_estimate_row_item_with_history(uuid, uuid, uuid, integer, uuid, uuid) from public;
revoke execute on function public.create_estimate_sheet_version(uuid, uuid, text, text, uuid, uuid) from public;
revoke execute on function public.restore_estimate_sheet_version_as_copy(uuid, uuid, text, text, uuid, uuid) from public;
revoke execute on function public.reorder_estimate_nodes_with_history(uuid, jsonb, uuid, uuid) from public;
revoke execute on function public.insert_estimate_template_into_estimate_with_history(uuid, uuid, uuid, uuid, uuid, uuid) from public;
revoke execute on function public.update_estimate_details_with_history(uuid, uuid, jsonb, uuid, uuid) from public;
revoke execute on function public.delete_estimate_node_with_history(uuid, uuid, uuid, uuid, uuid) from public;
revoke execute on function public.get_estimate_sheet_version_control_preflight() from public;
revoke execute on function public.backfill_estimate_sheet_baseline_versions(integer, uuid) from public;

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
