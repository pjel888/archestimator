-- ============================================================================
-- P5 ROLLBACK ARTIFACT — estimate-node single-node unification
-- ============================================================================
-- Captured LIVE from prod (ebxxqidacheyapmmzavr) via pg_get_functiondef immediately
-- BEFORE applying 08_unify_estimate_node_kinds.P5.sql (2026-06-14).
--
-- These are the ORIGINAL (strict two-kind) function bodies. To ROLL BACK P5 *before*
-- P6 (no mixed node exists yet), re-apply this file: it restores the strict validators
-- and row/template triggers. Re-adding the strict rules SUCCEEDS because no data
-- violates them (pre-flight confirmed 0 mixed/orphan nodes). This is the runbook §6
-- "last clean abort point". AFTER P6 (a real mixed node exists), this revert would FAIL
-- on the mixed data and rollback becomes forward-fix only.
--
-- P5 is function-bodies-only: no ALTER TABLE / data movement. Row counts at capture:
-- (recorded separately in the run log).
-- ============================================================================

-- enforce_estimate_row_item_area_node()
CREATE OR REPLACE FUNCTION public.enforce_estimate_row_item_area_node()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

-- enforce_estimate_template_row_item_area_node()
CREATE OR REPLACE FUNCTION public.enforce_estimate_template_row_item_area_node()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not exists (
    select 1
    from public.estimate_template_nodes node
    where node.id = new.template_node_id
      and node.template_id = new.template_id
      and node.kind = 'area'
  ) then
    raise exception 'Template row items must belong to area nodes.';
  end if;

  return null;
end;
$function$
;

-- reorder_estimate_nodes(target_estimate_id uuid, move_updates jsonb)
CREATE OR REPLACE FUNCTION public.reorder_estimate_nodes(target_estimate_id uuid, move_updates jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$
;

-- validate_estimate_node_tree(target_estimate_id uuid)
CREATE OR REPLACE FUNCTION public.validate_estimate_node_tree(target_estimate_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$
;

-- validate_estimate_template_tree(target_template_id uuid)
CREATE OR REPLACE FUNCTION public.validate_estimate_template_tree(target_template_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if target_template_id is null then
    raise exception 'Template id is required.';
  end if;

  if exists (
    select 1
    from public.estimate_template_nodes child
    left join public.estimate_template_nodes parent
      on parent.id = child.parent_id
      and parent.template_id = child.template_id
    where child.template_id = target_template_id
      and child.parent_id is not null
      and parent.id is null
  ) then
    raise exception 'Template node tree contains a missing parent reference.';
  end if;

  if exists (
    select 1
    from public.estimate_template_nodes child
    left join public.estimate_template_nodes parent
      on parent.id = child.parent_id
      and parent.template_id = child.template_id
    where child.template_id = target_template_id
      and not (
        (child.parent_id is null and child.kind in ('group'))
        or (parent.kind in ('group') and child.kind in ('group', 'area'))
      )
  ) then
    raise exception 'Template node tree violates hierarchy rules.';
  end if;

  if exists (
    select 1
    from public.estimate_template_row_items row_item
    left join public.estimate_template_nodes node
      on node.id = row_item.template_node_id
      and node.template_id = row_item.template_id
    where row_item.template_id = target_template_id
      and (node.id is null or node.kind <> 'area')
  ) then
    raise exception 'Template row items must belong to area nodes.';
  end if;

  if exists (
    with recursive tree_nodes as (
      select node.id, node.parent_id
      from public.estimate_template_nodes node
      where node.template_id = target_template_id
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
    raise exception 'Template node tree creates a cycle.';
  end if;
end;
$function$
;
