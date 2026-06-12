-- Estimate tabs database foundation.
-- Local-only migration until the linked Supabase apply is owner-authorized.
-- Compatibility guard: legacy estimate_sheet_* tables/RPC names remain by design;
-- the dormant estimate_sheet_snapshot/create_estimate_sheet_version/
-- restore_estimate_sheet_version_as_copy v2 stack must not be awakened until a
-- deliberate v3 snapshot schema carries tabs[] plus per-node estimateTabId.

begin;

create extension if not exists pgcrypto;

create table public.estimate_tabs (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references public.estimates(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  sort_order integer not null default 0,
  is_default boolean not null default false,
  archived_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint estimate_tabs_estimate_id_id_key unique (estimate_id, id),
  constraint estimate_tabs_archived_default_check check (archived_at is null or is_default = false),
  constraint estimate_tabs_estimate_sort_unique unique (estimate_id, sort_order) deferrable initially deferred
);

create unique index estimate_tabs_one_default_per_estimate
  on public.estimate_tabs (estimate_id)
  where is_default;

create index estimate_tabs_estimate_id_sort_idx
  on public.estimate_tabs (estimate_id, sort_order);

create trigger estimate_tabs_set_updated_at
before update on public.estimate_tabs
for each row execute function public.set_updated_at();

alter table public.estimate_tabs enable row level security;

create policy "estimate tab viewers can read tabs" on public.estimate_tabs
  for select to authenticated using (public.can_access_estimate(estimate_id));
create policy "estimate tab editors can manage tabs" on public.estimate_tabs
  for all to authenticated using (public.can_edit_estimate(estimate_id)) with check (public.can_edit_estimate(estimate_id));
create policy "platform admins can manage all estimate tabs" on public.estimate_tabs
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());

revoke all on public.estimate_tabs from public, anon, authenticated;
grant select, insert, update, delete on public.estimate_tabs to authenticated;

alter table public.estimate_nodes
  add column estimate_tab_id uuid;

insert into public.estimate_tabs (estimate_id, name, sort_order, is_default, created_by)
select estimate.id, 'Main', 0, true, estimate.created_by
from public.estimates estimate;

update public.estimate_nodes node
set estimate_tab_id = tab.id
from public.estimate_tabs tab
where tab.estimate_id = node.estimate_id
  and tab.is_default;

set constraints all immediate;

alter table public.estimate_nodes
  add constraint estimate_nodes_tab_same_estimate_fkey
  foreign key (estimate_id, estimate_tab_id)
  references public.estimate_tabs (estimate_id, id)
  on delete cascade;

create index estimate_nodes_tab_parent_sort_idx
  on public.estimate_nodes (estimate_tab_id, parent_id, sort_order);

alter table public.estimate_sheet_events
  add column estimate_tab_id uuid references public.estimate_tabs(id) on delete set null;

create index estimate_sheet_events_tab_created_idx
  on public.estimate_sheet_events (estimate_tab_id, created_at desc, id desc)
  where estimate_tab_id is not null;

-- P1-P5 backfill proofs from the Phase 1 plan. These run before the NOT NULL
-- flip so a bad backfill fails the migration before constraints harden.
do $$
declare
  failure_count integer;
begin
  select count(*)
    into failure_count
  from (
    select estimate.id
    from public.estimates estimate
    left join public.estimate_tabs tab on tab.estimate_id = estimate.id and tab.is_default
    group by estimate.id
    having count(tab.id) <> 1
  ) failures;
  if failure_count <> 0 then
    raise exception 'P1 failed: every estimate must have exactly one default tab.';
  end if;

  select count(*) into failure_count
  from public.estimate_nodes
  where estimate_tab_id is null;
  if failure_count <> 0 then
    raise exception 'P2 failed: every estimate node must be attached to a tab.';
  end if;

  select count(*) into failure_count
  from public.estimate_nodes node
  join public.estimate_tabs tab on tab.id = node.estimate_tab_id
  where tab.estimate_id <> node.estimate_id;
  if failure_count <> 0 then
    raise exception 'P3 failed: estimate node crosses estimate/tab boundaries.';
  end if;

  select count(*) into failure_count
  from public.estimate_nodes child
  join public.estimate_nodes parent on parent.id = child.parent_id
  where child.estimate_tab_id <> parent.estimate_tab_id;
  if failure_count <> 0 then
    raise exception 'P4 failed: parent/child estimate nodes must stay in the same tab.';
  end if;

  select count(*) into failure_count
  from public.estimate_row_items row_item
  join public.estimate_nodes node on node.id = row_item.node_id
  where node.estimate_id <> row_item.estimate_id;
  if failure_count <> 0 then
    raise exception 'P5 failed: estimate row item points at a node outside its estimate.';
  end if;
end;
$$;

alter table public.estimate_nodes
  alter column estimate_tab_id set not null;

alter table public.estimate_nodes
  drop constraint if exists estimate_nodes_unique_sort;
alter table public.estimate_nodes
  drop constraint if exists estimate_nodes_unique_sort_with_root;

alter table public.estimate_nodes
  add constraint estimate_nodes_tab_unique_sort
  unique (estimate_tab_id, parent_id, sort_order)
  deferrable initially deferred;
alter table public.estimate_nodes
  add constraint estimate_nodes_tab_unique_sort_with_root
  unique nulls not distinct (estimate_tab_id, parent_id, sort_order)
  deferrable initially deferred;

create or replace function public.resolve_default_estimate_tab_id(target_estimate_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  resolved_tab_id uuid;
begin
  if target_estimate_id is null then
    raise exception 'Estimate id is required.';
  end if;

  select tab.id
    into resolved_tab_id
  from public.estimate_tabs tab
  where tab.estimate_id = target_estimate_id
    and tab.is_default
    and tab.archived_at is null;

  if resolved_tab_id is null then
    raise exception 'Default estimate tab not found.';
  end if;

  return resolved_tab_id;
end;
$$;

create or replace function public.assert_can_edit_estimate_for_history(
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
begin
  resolved_workspace_id := public.resolve_estimate_workspace(target_project_id, target_estimate_id, acting_user_id);

  if public.estimate_sheet_can_bypass_auth() then
    return resolved_workspace_id;
  end if;

  if not public.can_edit_estimate(target_estimate_id) then
    raise exception 'Estimate edit access denied.';
  end if;

  return resolved_workspace_id;
end;
$$;

create or replace function public.validate_estimate_node_tree(target_estimate_id uuid)
returns void
language plpgsql
set search_path = public
as $$
begin
  if target_estimate_id is null then
    raise exception 'Estimate id is required.';
  end if;

  if exists (
    select 1
    from public.estimate_nodes child
    left join public.estimate_nodes parent
      on parent.id = child.parent_id
      and parent.estimate_id = child.estimate_id
    where child.estimate_id = target_estimate_id
      and child.parent_id is not null
      and parent.id is null
  ) then
    raise exception 'Estimate node tree contains a missing parent reference.';
  end if;

  if exists (
    select 1
    from public.estimate_nodes child
    join public.estimate_nodes parent on parent.id = child.parent_id
    where child.estimate_id = target_estimate_id
      and child.estimate_tab_id <> parent.estimate_tab_id
  ) then
    raise exception 'Estimate node tree contains a parent from another tab.';
  end if;

  if exists (
    select 1
    from public.estimate_nodes child
    left join public.estimate_nodes parent
      on parent.id = child.parent_id
      and parent.estimate_id = child.estimate_id
      and parent.estimate_tab_id = child.estimate_tab_id
    where child.estimate_id = target_estimate_id
      and not (
        (child.parent_id is null and child.kind in ('group'))
        or (parent.kind in ('group') and child.kind in ('group', 'area'))
      )
  ) then
    raise exception 'Estimate node tree violates hierarchy rules.';
  end if;

  if exists (
    select 1
    from public.estimate_row_items row_item
    left join public.estimate_nodes node
      on node.id = row_item.node_id
      and node.estimate_id = row_item.estimate_id
    where row_item.estimate_id = target_estimate_id
      and (node.id is null or node.kind <> 'area')
  ) then
    raise exception 'Estimate row items must belong to area nodes.';
  end if;

  if exists (
    with recursive tree_nodes as (
      select node.id, node.parent_id
      from public.estimate_nodes node
      where node.estimate_id = target_estimate_id
    ),
    walk(origin_id, parent_id, path, has_cycle) as (
      select tree_nodes.id, tree_nodes.parent_id, array[tree_nodes.id], false
      from tree_nodes
      union all
      select
        walk.origin_id,
        parent.parent_id,
        walk.path || parent.id,
        parent.id = any(walk.path)
      from walk
      join tree_nodes parent on parent.id = walk.parent_id
      where not walk.has_cycle
    )
    select 1
    from walk
    where has_cycle
  ) then
    raise exception 'Estimate node tree creates a cycle.';
  end if;
end;
$$;

create or replace function public.enforce_estimate_node_tree()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.validate_estimate_node_tree(new.estimate_id);
  end if;

  if tg_op in ('UPDATE', 'DELETE') and (tg_op = 'DELETE' or old.estimate_id is distinct from new.estimate_id) then
    perform public.validate_estimate_node_tree(old.estimate_id);
  end if;

  return null;
end;
$$;

drop trigger if exists estimate_nodes_enforce_tree on public.estimate_nodes;
create constraint trigger estimate_nodes_enforce_tree
after insert or update or delete on public.estimate_nodes
deferrable initially deferred
for each row execute function public.enforce_estimate_node_tree();

create or replace function public.reorder_estimate_nodes(target_estimate_id uuid, move_updates jsonb)
returns integer
language plpgsql
set search_path = public
as $$
declare
  input_count integer;
  distinct_id_count integer;
  updated_count integer;
begin
  if target_estimate_id is null then
    raise exception 'Estimate id is required.';
  end if;

  if move_updates is null or jsonb_typeof(move_updates) <> 'array' then
    raise exception 'Estimate node reorder updates must be a JSON array.';
  end if;

  select count(*), count(distinct input.id)
    into input_count, distinct_id_count
  from jsonb_to_recordset(move_updates) as input(id uuid, parent_id uuid, sort_order integer);

  if input_count = 0 then
    raise exception 'At least one estimate node reorder update is required.';
  end if;

  if input_count <> distinct_id_count then
    raise exception 'duplicate estimate node reorder ids';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(move_updates) as input(id uuid, parent_id uuid, sort_order integer)
    where input.id is null
      or input.sort_order is null
      or input.sort_order < 0
  ) then
    raise exception 'Invalid estimate node reorder payload.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(move_updates) as input(id uuid, parent_id uuid, sort_order integer)
    left join public.estimate_nodes node
      on node.id = input.id
      and node.estimate_id = target_estimate_id
    where node.id is null
  ) then
    raise exception 'all estimate node reorder ids must belong to the target estimate';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(move_updates) as input(id uuid, parent_id uuid, sort_order integer)
    where input.parent_id is not null
      and not exists (
        select 1
        from public.estimate_nodes parent_node
        where parent_node.id = input.parent_id
          and parent_node.estimate_id = target_estimate_id
      )
  ) then
    raise exception 'all estimate node reorder parents must belong to the target estimate';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(move_updates) as input(id uuid, parent_id uuid, sort_order integer)
    join public.estimate_nodes node on node.id = input.id and node.estimate_id = target_estimate_id
    join public.estimate_nodes parent_node on parent_node.id = input.parent_id and parent_node.estimate_id = target_estimate_id
    where input.parent_id is not null
      and parent_node.estimate_tab_id <> node.estimate_tab_id
  ) then
    raise exception 'Estimate node reorder cannot move nodes across tabs.';
  end if;

  perform 1
  from public.estimate_nodes node
  where node.estimate_id = target_estimate_id
  for update;

  if exists (
    with input as (
      select *
      from jsonb_to_recordset(move_updates) as input(id uuid, parent_id uuid, sort_order integer)
    ),
    final_nodes as (
      select
        node.id,
        case when input.id is not null then input.parent_id else node.parent_id end as parent_id,
        node.kind,
        node.estimate_tab_id
      from public.estimate_nodes node
      left join input on input.id = node.id
      where node.estimate_id = target_estimate_id
    )
    select 1
    from final_nodes child
    left join final_nodes parent on parent.id = child.parent_id and parent.estimate_tab_id = child.estimate_tab_id
    where child.parent_id is not null
      and parent.id is null
  ) then
    raise exception 'Estimate node reorder creates a missing parent reference.';
  end if;

  if exists (
    with input as (
      select *
      from jsonb_to_recordset(move_updates) as input(id uuid, parent_id uuid, sort_order integer)
    ),
    final_nodes as (
      select
        node.id,
        case when input.id is not null then input.parent_id else node.parent_id end as parent_id,
        node.kind,
        node.estimate_tab_id
      from public.estimate_nodes node
      left join input on input.id = node.id
      where node.estimate_id = target_estimate_id
    )
    select 1
    from final_nodes child
    left join final_nodes parent on parent.id = child.parent_id and parent.estimate_tab_id = child.estimate_tab_id
    where not (
      (child.parent_id is null and child.kind in ('group'))
      or (parent.kind in ('group') and child.kind in ('group', 'area'))
    )
  ) then
    raise exception 'Estimate node reorder violates hierarchy rules.';
  end if;

  if exists (
    with recursive input as (
      select *
      from jsonb_to_recordset(move_updates) as input(id uuid, parent_id uuid, sort_order integer)
    ),
    final_nodes as (
      select
        node.id,
        case when input.id is not null then input.parent_id else node.parent_id end as parent_id
      from public.estimate_nodes node
      left join input on input.id = node.id
      where node.estimate_id = target_estimate_id
    ),
    walk(origin_id, parent_id, path, has_cycle) as (
      select final_nodes.id, final_nodes.parent_id, array[final_nodes.id], false
      from final_nodes
      union all
      select
        walk.origin_id,
        parent.parent_id,
        walk.path || parent.id,
        parent.id = any(walk.path)
      from walk
      join final_nodes parent on parent.id = walk.parent_id
      where not walk.has_cycle
    )
    select 1
    from walk
    where has_cycle
  ) then
    raise exception 'Estimate node reorder creates a cycle.';
  end if;

  if exists (
    with input as (
      select *
      from jsonb_to_recordset(move_updates) as input(id uuid, parent_id uuid, sort_order integer)
    ),
    final_nodes as (
      select
        node.id,
        node.estimate_tab_id,
        case when input.id is not null then input.parent_id else node.parent_id end as parent_id,
        case when input.id is not null then input.sort_order else node.sort_order end as sort_order
      from public.estimate_nodes node
      left join input on input.id = node.id
      where node.estimate_id = target_estimate_id
    )
    select 1
    from final_nodes
    group by estimate_tab_id, coalesce(parent_id::text, '__estimate_tree_root__'), sort_order
    having count(*) > 1
  ) then
    raise exception 'Estimate node reorder creates duplicate sibling sort orders.';
  end if;

  set constraints estimate_nodes_tab_unique_sort, estimate_nodes_tab_unique_sort_with_root deferred;

  with input as (
    select *
    from jsonb_to_recordset(move_updates) as input(id uuid, parent_id uuid, sort_order integer)
  )
  update public.estimate_nodes node
  set parent_id = input.parent_id,
      sort_order = input.sort_order
  from input
  where node.id = input.id
    and node.estimate_id = target_estimate_id;

  get diagnostics updated_count = row_count;

  if updated_count <> input_count then
    raise exception 'Estimate node reorder did not update every requested node.';
  end if;

  perform public.validate_estimate_node_tree(target_estimate_id);

  return updated_count;
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
  resolved_project_id uuid;
  resolved_user_id uuid := coalesce(auth.uid(), acting_user_id);
  committed_result jsonb;
  updated_count integer;
  inserted_event_id uuid;
  affected_tab_id uuid;
begin
  select estimate.project_id into resolved_project_id
  from public.estimates estimate
  where estimate.id = target_estimate_id;

  resolved_workspace_id := public.assert_can_edit_estimate_for_history(resolved_project_id, target_estimate_id, acting_user_id);
  perform 1 from public.estimates estimate where estimate.id = target_estimate_id for update;

  committed_result := public.estimate_sheet_event_result(target_estimate_id, correlation_id);
  if committed_result is not null then
    return committed_result;
  end if;

  updated_count := public.reorder_estimate_nodes(target_estimate_id, move_updates);

  select case when count(distinct node.estimate_tab_id) = 1 then (array_agg(distinct node.estimate_tab_id))[1] else null end
    into affected_tab_id
  from jsonb_to_recordset(move_updates) as input(id uuid, parent_id uuid, sort_order integer)
  join public.estimate_nodes node on node.id = input.id and node.estimate_id = target_estimate_id;

  insert into public.estimate_sheet_events (
    estimate_id,
    workspace_id,
    estimate_tab_id,
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
    affected_tab_id,
    'nodes_reordered',
    'server_action',
    correlation_id,
    resolved_user_id,
    array['tree'],
    jsonb_build_object('updatedCount', updated_count, 'moves', move_updates, 'estimateTabId', affected_tab_id)
  )
  returning id into inserted_event_id;

  return jsonb_build_object('idempotent', false, 'eventId', inserted_event_id, 'updatedCount', updated_count, 'estimateTabId', affected_tab_id);
end;
$$;

drop function if exists public.create_estimate_node_with_history(uuid, uuid, uuid, public.estimate_node_kind, text, integer, uuid, uuid);

create or replace function public.create_estimate_node_with_history(
  target_project_id uuid,
  target_estimate_id uuid,
  parent_node_id uuid,
  node_kind public.estimate_node_kind,
  node_name text,
  initial_sort_order integer,
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
  resolved_tab_id uuid;
  committed_result jsonb;
  inserted_node public.estimate_nodes;
  inserted_event_id uuid;
  reordered_count integer;
begin
  resolved_workspace_id := public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id);
  perform 1 from public.estimates estimate where estimate.id = target_estimate_id for update;

  committed_result := public.estimate_sheet_event_result(target_estimate_id, correlation_id);
  if committed_result is not null then
    return committed_result;
  end if;

  if parent_node_id is null then
    resolved_tab_id := coalesce(target_tab_id, public.resolve_default_estimate_tab_id(target_estimate_id));

    if not exists (
      select 1
      from public.estimate_tabs tab
      where tab.id = resolved_tab_id
        and tab.estimate_id = target_estimate_id
        and tab.archived_at is null
    ) then
      raise exception 'Estimate tab not found in the current estimate.';
    end if;
  else
    select parent_node.estimate_tab_id
      into resolved_tab_id
    from public.estimate_nodes parent_node
    where parent_node.id = parent_node_id
      and parent_node.estimate_id = target_estimate_id;

    if resolved_tab_id is null then
      raise exception 'Parent estimate node not found in the current project.';
    end if;

    if target_tab_id is not null and target_tab_id <> resolved_tab_id then
      raise exception 'Parent estimate node belongs to a different tab.';
    end if;
  end if;

  set constraints estimate_nodes_tab_unique_sort, estimate_nodes_tab_unique_sort_with_root deferred;

  insert into public.estimate_nodes (
    estimate_id,
    estimate_tab_id,
    parent_id,
    kind,
    name,
    sort_order
  )
  values (
    target_estimate_id,
    resolved_tab_id,
    parent_node_id,
    node_kind,
    nullif(trim(node_name), ''),
    coalesce(initial_sort_order, 0)
  )
  returning * into inserted_node;

  if inserted_node.name is null then
    raise exception 'Estimate tree node name is required.';
  end if;

  with sibling_order as (
    select
      node.id,
      row_number() over (
        order by node.sort_order, node.created_at, node.id
      ) * 10 as next_sort_order
    from public.estimate_nodes node
    where node.estimate_id = target_estimate_id
      and node.estimate_tab_id = resolved_tab_id
      and node.parent_id is not distinct from parent_node_id
  ),
  updated_siblings as (
    update public.estimate_nodes node
    set sort_order = sibling_order.next_sort_order
    from sibling_order
    where node.id = sibling_order.id
    returning node.id
  )
  select count(*) into reordered_count from updated_siblings;

  select * into inserted_node
  from public.estimate_nodes node
  where node.id = inserted_node.id;

  perform public.validate_estimate_node_tree(target_estimate_id);

  insert into public.estimate_sheet_events (
    estimate_id,
    workspace_id,
    estimate_tab_id,
    estimate_node_id,
    event_type,
    event_source,
    correlation_id,
    actor_user_id,
    changed_fields,
    new_snapshot,
    payload
  )
  values (
    target_estimate_id,
    resolved_workspace_id,
    resolved_tab_id,
    inserted_node.id,
    'node_created',
    'server_action',
    correlation_id,
    resolved_user_id,
    array['tree'],
    jsonb_build_object(
      'nodeId', inserted_node.id,
      'estimateId', inserted_node.estimate_id,
      'estimateTabId', resolved_tab_id,
      'parentId', inserted_node.parent_id,
      'kind', inserted_node.kind,
      'name', inserted_node.name,
      'sortOrder', inserted_node.sort_order
    ),
    jsonb_build_object(
      'nodeId', inserted_node.id,
      'estimateTabId', resolved_tab_id,
      'parentId', inserted_node.parent_id,
      'kind', inserted_node.kind,
      'name', inserted_node.name,
      'sortOrder', inserted_node.sort_order,
      'reorderedSiblingCount', reordered_count
    )
  )
  returning id into inserted_event_id;

  return jsonb_build_object(
    'idempotent', false,
    'eventId', inserted_event_id,
    'nodeId', inserted_node.id,
    'estimateTabId', resolved_tab_id,
    'name', inserted_node.name,
    'kind', inserted_node.kind,
    'parentId', inserted_node.parent_id,
    'sortOrder', inserted_node.sort_order
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
    'inserted_row_item_count', inserted_row_item_count,
    'estimate_tab_id', target_parent_tab_id
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
  target_parent_tab_id uuid;
begin
  resolved_workspace_id := public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id);
  perform 1 from public.estimates estimate where estimate.id = target_estimate_id for update;

  committed_result := public.estimate_sheet_event_result(target_estimate_id, correlation_id);
  if committed_result is not null then
    return committed_result;
  end if;

  select node.estimate_tab_id
    into target_parent_tab_id
  from public.estimate_nodes node
  where node.id = target_parent_node_id
    and node.estimate_id = target_estimate_id;

  insert_result := public.insert_estimate_template_into_estimate(
    target_project_id,
    target_estimate_id,
    target_parent_node_id,
    source_template_id
  );

  insert into public.estimate_sheet_events (
    estimate_id,
    workspace_id,
    estimate_tab_id,
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
    target_parent_tab_id,
    target_parent_node_id,
    'template_inserted',
    'server_action',
    correlation_id,
    resolved_user_id,
    array['template'],
    insert_result || jsonb_build_object('sourceTemplateId', source_template_id, 'targetParentNodeId', target_parent_node_id, 'estimateTabId', target_parent_tab_id)
  )
  returning id into inserted_event_id;

  return insert_result || jsonb_build_object(
    'idempotent', false,
    'eventId', inserted_event_id,
    'estimateTabId', target_parent_tab_id
  );
end;
$$;

create or replace function public.create_estimate_tab_with_history(
  target_project_id uuid,
  target_estimate_id uuid,
  tab_name text,
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
  inserted_tab public.estimate_tabs;
  inserted_event_id uuid;
  next_sort_order integer;
begin
  resolved_workspace_id := public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id);
  perform 1 from public.estimates estimate where estimate.id = target_estimate_id for update;

  committed_result := public.estimate_sheet_event_result(target_estimate_id, correlation_id);
  if committed_result is not null then
    return committed_result;
  end if;

  if nullif(trim(tab_name), '') is null then
    raise exception 'Estimate tab name is required.';
  end if;

  select coalesce(max(tab.sort_order), -10) + 10
    into next_sort_order
  from public.estimate_tabs tab
  where tab.estimate_id = target_estimate_id;

  insert into public.estimate_tabs (estimate_id, name, sort_order, is_default, created_by)
  values (target_estimate_id, trim(tab_name), next_sort_order, false, resolved_user_id)
  returning * into inserted_tab;

  insert into public.estimate_sheet_events (
    estimate_id, workspace_id, estimate_tab_id, event_type, event_source, correlation_id, actor_user_id, changed_fields, payload
  ) values (
    target_estimate_id,
    resolved_workspace_id,
    inserted_tab.id,
    'tab_created',
    'server_action',
    correlation_id,
    resolved_user_id,
    array['tabs'],
    jsonb_build_object('estimateTabId', inserted_tab.id, 'name', inserted_tab.name, 'sortOrder', inserted_tab.sort_order)
  ) returning id into inserted_event_id;

  return jsonb_build_object('idempotent', false, 'eventId', inserted_event_id, 'estimateTabId', inserted_tab.id, 'name', inserted_tab.name, 'sortOrder', inserted_tab.sort_order, 'isDefault', inserted_tab.is_default);
end;
$$;

create or replace function public.rename_estimate_tab_with_history(
  target_project_id uuid,
  target_estimate_id uuid,
  target_tab_id uuid,
  next_name text,
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
  updated_tab public.estimate_tabs;
  inserted_event_id uuid;
begin
  resolved_workspace_id := public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id);
  committed_result := public.estimate_sheet_event_result(target_estimate_id, correlation_id);
  if committed_result is not null then
    return committed_result;
  end if;

  if nullif(trim(next_name), '') is null then
    raise exception 'Estimate tab name is required.';
  end if;

  update public.estimate_tabs tab
  set name = trim(next_name)
  where tab.id = target_tab_id
    and tab.estimate_id = target_estimate_id
    and tab.archived_at is null
  returning * into updated_tab;

  if updated_tab.id is null then
    raise exception 'Estimate tab not found.';
  end if;

  insert into public.estimate_sheet_events (
    estimate_id, workspace_id, estimate_tab_id, event_type, event_source, correlation_id, actor_user_id, changed_fields, payload
  ) values (
    target_estimate_id,
    resolved_workspace_id,
    updated_tab.id,
    'tab_renamed',
    'server_action',
    correlation_id,
    resolved_user_id,
    array['tabs'],
    jsonb_build_object('estimateTabId', updated_tab.id, 'name', updated_tab.name)
  ) returning id into inserted_event_id;

  return jsonb_build_object('idempotent', false, 'eventId', inserted_event_id, 'estimateTabId', updated_tab.id, 'name', updated_tab.name);
end;
$$;

create or replace function public.reorder_estimate_tabs_with_history(
  target_project_id uuid,
  target_estimate_id uuid,
  sort_updates jsonb,
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
  input_count integer;
  updated_count integer;
  inserted_event_id uuid;
begin
  resolved_workspace_id := public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id);
  perform 1 from public.estimate_tabs tab where tab.estimate_id = target_estimate_id for update;

  committed_result := public.estimate_sheet_event_result(target_estimate_id, correlation_id);
  if committed_result is not null then
    return committed_result;
  end if;

  if sort_updates is null or jsonb_typeof(sort_updates) <> 'array' then
    raise exception 'Estimate tab reorder updates must be a JSON array.';
  end if;

  select count(*) into input_count
  from jsonb_to_recordset(sort_updates) as input(id uuid, sort_order integer);

  if input_count = 0 then
    raise exception 'At least one estimate tab reorder update is required.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(sort_updates) as input(id uuid, sort_order integer)
    where input.id is null or input.sort_order is null or input.sort_order < 0
  ) then
    raise exception 'Invalid estimate tab reorder payload.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(sort_updates) as input(id uuid, sort_order integer)
    left join public.estimate_tabs tab on tab.id = input.id and tab.estimate_id = target_estimate_id and tab.archived_at is null
    where tab.id is null
  ) then
    raise exception 'all estimate tab reorder ids must belong to the target estimate';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(sort_updates) as input(id uuid, sort_order integer)
    group by input.sort_order
    having count(*) > 1
  ) then
    raise exception 'duplicate estimate tab reorder slots';
  end if;

  set constraints estimate_tabs_estimate_sort_unique deferred;

  with input as (
    select * from jsonb_to_recordset(sort_updates) as input(id uuid, sort_order integer)
  )
  update public.estimate_tabs tab
  set sort_order = input.sort_order
  from input
  where tab.id = input.id
    and tab.estimate_id = target_estimate_id;

  get diagnostics updated_count = row_count;
  if updated_count <> input_count then
    raise exception 'Estimate tab reorder did not update every requested tab.';
  end if;

  insert into public.estimate_sheet_events (
    estimate_id, workspace_id, event_type, event_source, correlation_id, actor_user_id, changed_fields, payload
  ) values (
    target_estimate_id,
    resolved_workspace_id,
    'tabs_reordered',
    'server_action',
    correlation_id,
    resolved_user_id,
    array['tabs'],
    jsonb_build_object('updatedCount', updated_count, 'tabs', sort_updates)
  ) returning id into inserted_event_id;

  return jsonb_build_object('idempotent', false, 'eventId', inserted_event_id, 'updatedCount', updated_count);
end;
$$;

create or replace function public.duplicate_estimate_tab_with_history(
  target_project_id uuid,
  target_estimate_id uuid,
  source_tab_id uuid,
  next_name text default null,
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
  source_tab public.estimate_tabs;
  inserted_tab public.estimate_tabs;
  inserted_event_id uuid;
  inserted_node_count integer := 0;
  inserted_row_item_count integer := 0;
  next_sort_order integer;
begin
  resolved_workspace_id := public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id);
  perform 1 from public.estimates estimate where estimate.id = target_estimate_id for update;

  committed_result := public.estimate_sheet_event_result(target_estimate_id, correlation_id);
  if committed_result is not null then
    return committed_result;
  end if;

  select * into source_tab
  from public.estimate_tabs tab
  where tab.id = source_tab_id
    and tab.estimate_id = target_estimate_id
    and tab.archived_at is null;

  if source_tab.id is null then
    raise exception 'Source estimate tab not found.';
  end if;

  select coalesce(max(tab.sort_order), -10) + 10 into next_sort_order
  from public.estimate_tabs tab
  where tab.estimate_id = target_estimate_id;

  insert into public.estimate_tabs (estimate_id, name, sort_order, is_default, metadata, created_by)
  values (
    target_estimate_id,
    coalesce(nullif(trim(next_name), ''), source_tab.name || ' copy'),
    next_sort_order,
    false,
    source_tab.metadata || jsonb_build_object('duplicatedFromTabId', source_tab.id),
    resolved_user_id
  ) returning * into inserted_tab;

  create temporary table if not exists estimate_tab_copy_map (
    source_node_id uuid primary key,
    target_node_id uuid not null,
    source_parent_id uuid
  ) on commit drop;
  truncate table estimate_tab_copy_map;

  insert into estimate_tab_copy_map (source_node_id, target_node_id, source_parent_id)
  select node.id, gen_random_uuid(), node.parent_id
  from public.estimate_nodes node
  where node.estimate_id = target_estimate_id
    and node.estimate_tab_id = source_tab.id;

  set constraints estimate_nodes_tab_unique_sort, estimate_nodes_tab_unique_sort_with_root deferred;

  insert into public.estimate_nodes (id, estimate_id, estimate_tab_id, parent_id, kind, name, sort_order, metadata)
  select
    node_map.target_node_id,
    target_estimate_id,
    inserted_tab.id,
    parent_map.target_node_id,
    source_node.kind,
    source_node.name,
    source_node.sort_order,
    source_node.metadata || jsonb_build_object('duplicatedFromNodeId', source_node.id, 'duplicatedFromTabId', source_tab.id)
  from public.estimate_nodes source_node
  join estimate_tab_copy_map node_map on node_map.source_node_id = source_node.id
  left join estimate_tab_copy_map parent_map on parent_map.source_node_id = source_node.parent_id
  where source_node.estimate_id = target_estimate_id
    and source_node.estimate_tab_id = source_tab.id;

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
    metadata,
    row_revision
  )
  select
    gen_random_uuid(),
    target_estimate_id,
    node_map.target_node_id,
    row_item.sort_order,
    row_item.source_library_item_id,
    row_item.source_snapshot,
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
    row_item.metadata || jsonb_build_object('duplicatedFromRowId', row_item.id, 'duplicatedFromTabId', source_tab.id),
    1
  from public.estimate_row_items row_item
  join estimate_tab_copy_map node_map on node_map.source_node_id = row_item.node_id
  where row_item.estimate_id = target_estimate_id;

  get diagnostics inserted_row_item_count = row_count;

  perform public.validate_estimate_node_tree(target_estimate_id);

  insert into public.estimate_sheet_events (
    estimate_id, workspace_id, estimate_tab_id, event_type, event_source, correlation_id, actor_user_id, changed_fields, payload
  ) values (
    target_estimate_id,
    resolved_workspace_id,
    inserted_tab.id,
    'tab_duplicated',
    'server_action',
    correlation_id,
    resolved_user_id,
    array['tabs', 'tree'],
    jsonb_build_object('sourceTabId', source_tab.id, 'estimateTabId', inserted_tab.id, 'insertedNodeCount', inserted_node_count, 'insertedRowItemCount', inserted_row_item_count)
  ) returning id into inserted_event_id;

  return jsonb_build_object('idempotent', false, 'eventId', inserted_event_id, 'sourceTabId', source_tab.id, 'estimateTabId', inserted_tab.id, 'name', inserted_tab.name, 'insertedNodeCount', inserted_node_count, 'insertedRowItemCount', inserted_row_item_count);
end;
$$;

create or replace function public.archive_estimate_tab_with_history(
  target_project_id uuid,
  target_estimate_id uuid,
  target_tab_id uuid,
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
  archived_tab public.estimate_tabs;
  replacement_tab_id uuid;
  inserted_event_id uuid;
begin
  resolved_workspace_id := public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id);
  perform 1 from public.estimate_tabs tab where tab.estimate_id = target_estimate_id for update;

  committed_result := public.estimate_sheet_event_result(target_estimate_id, correlation_id);
  if committed_result is not null then
    return committed_result;
  end if;

  if (select count(*) from public.estimate_tabs tab where tab.estimate_id = target_estimate_id and tab.archived_at is null) <= 1 then
    raise exception 'Cannot archive the last estimate tab.';
  end if;

  select tab.id into replacement_tab_id
  from public.estimate_tabs tab
  where tab.estimate_id = target_estimate_id
    and tab.id <> target_tab_id
    and tab.archived_at is null
  order by tab.sort_order, tab.created_at, tab.id
  limit 1;

  update public.estimate_tabs tab
  set archived_at = now(), is_default = false
  where tab.id = target_tab_id
    and tab.estimate_id = target_estimate_id
    and tab.archived_at is null
  returning * into archived_tab;

  if archived_tab.id is null then
    raise exception 'Estimate tab not found.';
  end if;

  if archived_tab.is_default = false and not exists (select 1 from public.estimate_tabs tab where tab.estimate_id = target_estimate_id and tab.is_default) then
    update public.estimate_tabs set is_default = true where id = replacement_tab_id;
  end if;

  insert into public.estimate_sheet_events (
    estimate_id, workspace_id, estimate_tab_id, event_type, event_source, correlation_id, actor_user_id, changed_fields, payload
  ) values (
    target_estimate_id,
    resolved_workspace_id,
    archived_tab.id,
    'tab_archived',
    'server_action',
    correlation_id,
    resolved_user_id,
    array['tabs'],
    jsonb_build_object('estimateTabId', archived_tab.id, 'replacementTabId', replacement_tab_id)
  ) returning id into inserted_event_id;

  return jsonb_build_object('idempotent', false, 'eventId', inserted_event_id, 'estimateTabId', archived_tab.id, 'replacementTabId', replacement_tab_id);
end;
$$;

create or replace function public.delete_estimate_tab_with_history(
  target_project_id uuid,
  target_estimate_id uuid,
  target_tab_id uuid,
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
  deleted_tab public.estimate_tabs;
  replacement_tab_id uuid;
  inserted_event_id uuid;
begin
  resolved_workspace_id := public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id);
  perform 1 from public.estimate_tabs tab where tab.estimate_id = target_estimate_id for update;

  committed_result := public.estimate_sheet_event_result(target_estimate_id, correlation_id);
  if committed_result is not null then
    return committed_result;
  end if;

  if (select count(*) from public.estimate_tabs tab where tab.estimate_id = target_estimate_id and tab.archived_at is null) <= 1 then
    raise exception 'Cannot delete the last estimate tab.';
  end if;

  select tab.id into replacement_tab_id
  from public.estimate_tabs tab
  where tab.estimate_id = target_estimate_id
    and tab.id <> target_tab_id
    and tab.archived_at is null
  order by tab.sort_order, tab.created_at, tab.id
  limit 1;

  update public.estimate_tabs tab
  set is_default = false
  where tab.id = target_tab_id
    and tab.estimate_id = target_estimate_id;

  update public.estimate_tabs tab
  set is_default = true
  where tab.id = replacement_tab_id
    and not exists (select 1 from public.estimate_tabs current_default where current_default.estimate_id = target_estimate_id and current_default.is_default);

  delete from public.estimate_tabs tab
  where tab.id = target_tab_id
    and tab.estimate_id = target_estimate_id
  returning * into deleted_tab;

  if deleted_tab.id is null then
    raise exception 'Estimate tab not found.';
  end if;

  insert into public.estimate_sheet_events (
    estimate_id, workspace_id, event_type, event_source, correlation_id, actor_user_id, changed_fields, payload
  ) values (
    target_estimate_id,
    resolved_workspace_id,
    'tab_deleted',
    'server_action',
    correlation_id,
    resolved_user_id,
    array['tabs', 'tree'],
    jsonb_build_object('estimateTabId', deleted_tab.id, 'replacementTabId', replacement_tab_id)
  ) returning id into inserted_event_id;

  return jsonb_build_object('idempotent', false, 'eventId', inserted_event_id, 'estimateTabId', deleted_tab.id, 'replacementTabId', replacement_tab_id);
end;
$$;

revoke execute on function public.resolve_default_estimate_tab_id(uuid) from public, anon, authenticated;
revoke execute on function public.assert_can_edit_estimate_for_history(uuid, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.validate_estimate_node_tree(uuid) from public, anon;
revoke execute on function public.enforce_estimate_node_tree() from public, anon, authenticated;
revoke execute on function public.reorder_estimate_nodes(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.reorder_estimate_nodes_with_history(uuid, jsonb, uuid, uuid) from public, anon;
revoke execute on function public.create_estimate_node_with_history(uuid, uuid, uuid, public.estimate_node_kind, text, integer, uuid, uuid, uuid) from public, anon;
revoke execute on function public.insert_estimate_template_into_estimate(uuid, uuid, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.insert_estimate_template_into_estimate_with_history(uuid, uuid, uuid, uuid, uuid, uuid) from public, anon;
revoke execute on function public.create_estimate_tab_with_history(uuid, uuid, text, uuid, uuid) from public, anon;
revoke execute on function public.rename_estimate_tab_with_history(uuid, uuid, uuid, text, uuid, uuid) from public, anon;
revoke execute on function public.reorder_estimate_tabs_with_history(uuid, uuid, jsonb, uuid, uuid) from public, anon;
revoke execute on function public.duplicate_estimate_tab_with_history(uuid, uuid, uuid, text, uuid, uuid) from public, anon;
revoke execute on function public.archive_estimate_tab_with_history(uuid, uuid, uuid, uuid, uuid) from public, anon;
revoke execute on function public.delete_estimate_tab_with_history(uuid, uuid, uuid, uuid, uuid) from public, anon;

grant execute on function public.validate_estimate_node_tree(uuid) to authenticated;
grant execute on function public.reorder_estimate_nodes_with_history(uuid, jsonb, uuid, uuid) to authenticated;
grant execute on function public.create_estimate_node_with_history(uuid, uuid, uuid, public.estimate_node_kind, text, integer, uuid, uuid, uuid) to authenticated;
grant execute on function public.insert_estimate_template_into_estimate_with_history(uuid, uuid, uuid, uuid, uuid, uuid) to authenticated;
grant execute on function public.create_estimate_tab_with_history(uuid, uuid, text, uuid, uuid) to authenticated;
grant execute on function public.rename_estimate_tab_with_history(uuid, uuid, uuid, text, uuid, uuid) to authenticated;
grant execute on function public.reorder_estimate_tabs_with_history(uuid, uuid, jsonb, uuid, uuid) to authenticated;
grant execute on function public.duplicate_estimate_tab_with_history(uuid, uuid, uuid, text, uuid, uuid) to authenticated;
grant execute on function public.archive_estimate_tab_with_history(uuid, uuid, uuid, uuid, uuid) to authenticated;
grant execute on function public.delete_estimate_tab_with_history(uuid, uuid, uuid, uuid, uuid) to authenticated;

commit;
