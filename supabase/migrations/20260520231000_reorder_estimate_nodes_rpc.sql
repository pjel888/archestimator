-- Persist estimate-tree drag/drop reorder plans atomically with active group/area semantics.
-- This RPC replaces the removed move_estimate_nodes wrapper and keeps RLS in force.

create or replace function public.reorder_estimate_nodes(target_estimate_id uuid, move_updates jsonb)
returns integer
language plpgsql
set search_path = public
as $$
declare
  input_count integer;
  distinct_id_count integer;
  distinct_slot_count integer;
  updated_count integer;
begin
  if target_estimate_id is null then
    raise exception 'Estimate id is required.';
  end if;

  if move_updates is null or jsonb_typeof(move_updates) <> 'array' then
    raise exception 'Estimate node reorder updates must be a JSON array.';
  end if;

  select count(*), count(distinct input.id), count(distinct coalesce(input.parent_id::text, '__estimate_tree_root__') || ':' || input.sort_order::text)
    into input_count, distinct_id_count, distinct_slot_count
  from jsonb_to_recordset(move_updates) as input(id uuid, parent_id uuid, sort_order integer);

  if input_count = 0 then
    raise exception 'At least one estimate node reorder update is required.';
  end if;

  if input_count <> distinct_id_count then
    raise exception 'duplicate estimate node reorder ids';
  end if;

  if input_count <> distinct_slot_count then
    raise exception 'duplicate estimate node reorder slots';
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
        node.kind
      from public.estimate_nodes node
      left join input on input.id = node.id
      where node.estimate_id = target_estimate_id
    )
    select 1
    from final_nodes child
    left join final_nodes parent on parent.id = child.parent_id
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
    raise exception 'Estimate node reorder creates duplicate sibling sort orders.';
  end if;

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
    raise exception 'Estimate node reorder did not update every requested node.';
  end if;

  perform public.validate_estimate_node_tree(target_estimate_id);

  return updated_count;
end;
$$;

revoke execute on function public.reorder_estimate_nodes(uuid, jsonb) from public;
grant execute on function public.validate_estimate_node_tree(uuid) to authenticated;
grant execute on function public.reorder_estimate_nodes(uuid, jsonb) to authenticated;
