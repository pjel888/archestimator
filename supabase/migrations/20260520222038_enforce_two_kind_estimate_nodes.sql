-- Enforce the active two-kind estimate tree contract before drag/drop reorganization.
-- PostgreSQL enum values are intentionally left in place for now; this migration
-- normalizes active rows and blocks future estimate_nodes values outside group/area.

update public.estimate_nodes
set kind = 'group'
where kind::text in ('lot', 'general', 'structure', 'level', 'assembly');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'estimate_nodes_active_kind_check'
      and conrelid = 'public.estimate_nodes'::regclass
  ) then
    alter table public.estimate_nodes
      add constraint estimate_nodes_active_kind_check
      check (kind in ('group', 'area'))
      not valid;
  end if;
end;
$$;

alter table public.estimate_nodes
  validate constraint estimate_nodes_active_kind_check;

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
