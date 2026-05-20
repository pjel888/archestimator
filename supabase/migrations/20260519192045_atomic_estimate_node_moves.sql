-- Persist estimate-node reorder plans atomically.
-- The function remains security invoker so estimate_nodes RLS still controls access.
-- Existing root nodes were previously allowed to share sort_order because parent_id is null.
-- Normalize those roots before adding the nulls-not-distinct uniqueness constraint.
with duplicate_root_estimates as (
  select distinct estimate_id
  from public.estimate_nodes
  where parent_id is null
  group by estimate_id, sort_order
  having count(*) > 1
),
ranked_root_nodes as (
  select
    node.id,
    (((row_number() over (partition by node.estimate_id order by node.sort_order, node.id)) - 1) * 10)::integer as next_sort_order
  from public.estimate_nodes node
  where node.parent_id is null
    and node.estimate_id in (select estimate_id from duplicate_root_estimates)
)
update public.estimate_nodes node
set sort_order = ranked_root_nodes.next_sort_order
from ranked_root_nodes
where node.id = ranked_root_nodes.id
  and node.sort_order is distinct from ranked_root_nodes.next_sort_order;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'estimate_nodes_unique_sort_with_root'
      and conrelid = 'public.estimate_nodes'::regclass
  ) then
    alter table public.estimate_nodes
      add constraint estimate_nodes_unique_sort_with_root
      unique nulls not distinct (estimate_id, parent_id, sort_order)
      deferrable initially deferred;
  end if;
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
    left join public.estimate_nodes parent
      on parent.id = child.parent_id
      and parent.estimate_id = child.estimate_id
    where child.estimate_id = target_estimate_id
      and not (
        (child.parent_id is null and child.kind in ('group', 'lot', 'general', 'structure', 'level'))
        or (parent.kind in ('group', 'lot', 'general', 'structure', 'level') and child.kind in ('group', 'lot', 'general', 'structure', 'level', 'area'))
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
    raise exception 'Estimate node tree contains a cycle.';
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

create or replace function public.enforce_estimate_row_item_area_node()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.estimate_nodes node
    where node.id = new.node_id
      and node.estimate_id = new.estimate_id
      and node.kind = 'area'
  ) then
    raise exception 'Estimate row items must belong to area nodes.';
  end if;

  return null;
end;
$$;

drop trigger if exists estimate_row_items_enforce_area_node on public.estimate_row_items;
create constraint trigger estimate_row_items_enforce_area_node
after insert or update of estimate_id, node_id on public.estimate_row_items
deferrable initially deferred
for each row execute function public.enforce_estimate_row_item_area_node();

revoke execute on function public.validate_estimate_node_tree(uuid) from public;
revoke execute on function public.enforce_estimate_node_tree() from public;
revoke execute on function public.enforce_estimate_row_item_area_node() from public;

create or replace function public.move_estimate_nodes(target_estimate_id uuid, move_updates jsonb)
returns integer
language plpgsql
set search_path = public
as $$
declare
  input_count integer;
  distinct_count integer;
  updated_count integer;
begin
  if target_estimate_id is null then
    raise exception 'Estimate id is required.';
  end if;

  if move_updates is null or jsonb_typeof(move_updates) <> 'array' then
    raise exception 'Estimate node move updates must be a JSON array.';
  end if;

  select count(*), count(distinct input.id)
    into input_count, distinct_count
  from jsonb_to_recordset(move_updates) as input(id uuid, parent_id uuid, sort_order integer);

  if input_count = 0 then
    raise exception 'At least one estimate node move update is required.';
  end if;

  if input_count <> distinct_count then
    raise exception 'Estimate node move updates cannot contain duplicate nodes.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(move_updates) as input(id uuid, parent_id uuid, sort_order integer)
    where input.id is null
      or input.sort_order is null
      or input.sort_order < 0
  ) then
    raise exception 'Invalid estimate node move update payload.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(move_updates) as input(id uuid, parent_id uuid, sort_order integer)
    left join public.estimate_nodes node
      on node.id = input.id
      and node.estimate_id = target_estimate_id
    where node.id is null
  ) then
    raise exception 'Estimate node move update references a node outside the estimate.';
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
    raise exception 'Estimate node move update references a parent outside the estimate.';
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
        node.kind
      from public.estimate_nodes node
      left join input on input.id = node.id
      where node.estimate_id = target_estimate_id
    )
    select 1
    from final_nodes child
    left join final_nodes parent on parent.id = child.parent_id
    where child.parent_id is not null
      and parent.id is null
  ) then
    raise exception 'Estimate node move update creates a missing parent reference.';
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
        node.kind
      from public.estimate_nodes node
      left join input on input.id = node.id
      where node.estimate_id = target_estimate_id
    )
    select 1
    from final_nodes child
    left join final_nodes parent on parent.id = child.parent_id
    where not (
      (child.parent_id is null and child.kind in ('group', 'lot', 'general', 'structure', 'level'))
      or (parent.kind in ('group', 'lot', 'general', 'structure', 'level') and child.kind in ('group', 'lot', 'general', 'structure', 'level', 'area'))
    )
  ) then
    raise exception 'Estimate node move update violates hierarchy rules.';
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
    raise exception 'Estimate node move update creates a cycle.';
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
        case when input.id is not null then input.sort_order else node.sort_order end as sort_order
      from public.estimate_nodes node
      left join input on input.id = node.id
      where node.estimate_id = target_estimate_id
    )
    select 1
    from final_nodes
    group by coalesce(parent_id::text, '__estimate_tree_root__'), sort_order
    having count(*) > 1
  ) then
    raise exception 'Estimate node move update creates duplicate sibling sort orders.';
  end if;

  perform 1
  from public.estimate_nodes node
  where node.estimate_id = target_estimate_id
    and (
      node.id in (
        select input.id
        from jsonb_to_recordset(move_updates) as input(id uuid, parent_id uuid, sort_order integer)
      )
      or node.id in (
        select input.parent_id
        from jsonb_to_recordset(move_updates) as input(id uuid, parent_id uuid, sort_order integer)
        where input.parent_id is not null
      )
    )
  for update;

  set constraints estimate_nodes_unique_sort, estimate_nodes_unique_sort_with_root deferred;

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
    raise exception 'Estimate node move update did not update every requested node.';
  end if;

  return updated_count;
end;
$$;

revoke execute on function public.move_estimate_nodes(uuid, jsonb) from public;
grant execute on function public.move_estimate_nodes(uuid, jsonb) to authenticated;
