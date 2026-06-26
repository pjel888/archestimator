-- Estimate tree sparse ordering (F-04 / M-02).
--
-- This is a forward-only compatibility migration:
-- - convert estimate_nodes.sort_order from integer to numeric(20,4)
-- - preserve the current tab-aware unique-sort constraints and indexes
-- - update active RPCs that parse/write estimate_nodes.sort_order
-- - explicitly remove the old integer create-node overload so PostgREST only
--   exposes the numeric signature.

do $$
declare
  duplicate_slot_count integer;
begin
  select count(*)
    into duplicate_slot_count
  from (
    select estimate_tab_id, parent_id, sort_order
    from public.estimate_nodes
    group by estimate_tab_id, parent_id, sort_order
    having count(*) > 1
  ) duplicate_slots;

  if duplicate_slot_count <> 0 then
    raise exception 'Cannot migrate estimate_nodes.sort_order to numeric while duplicate sibling sort slots exist.';
  end if;
end;
$$;

do $$
declare
  function_def text;
begin
  select pg_get_functiondef(to_regprocedure('public.reorder_estimate_nodes(uuid,jsonb)'))
    into function_def;
  if function_def is null or position('sort_order integer' in function_def) = 0 then
    raise exception 'Expected reorder_estimate_nodes(uuid,jsonb) integer sort_order definition was not found.';
  end if;
  execute replace(function_def, 'sort_order integer', 'sort_order numeric');

  select pg_get_functiondef(to_regprocedure('public.reorder_estimate_nodes_with_history(uuid,jsonb,uuid,uuid)'))
    into function_def;
  if function_def is null or position('sort_order integer' in function_def) = 0 then
    raise exception 'Expected reorder_estimate_nodes_with_history(uuid,jsonb,uuid,uuid) integer sort_order definition was not found.';
  end if;
  execute replace(function_def, 'sort_order integer', 'sort_order numeric');

  select pg_get_functiondef(to_regprocedure('public.create_estimate_node_with_history(uuid,uuid,uuid,public.estimate_node_kind,text,integer,uuid,uuid,uuid)'))
    into function_def;
  if function_def is null or position('initial_sort_order integer' in function_def) = 0 then
    raise exception 'Expected create_estimate_node_with_history integer initial_sort_order definition was not found.';
  end if;
  function_def := replace(function_def, 'initial_sort_order integer', 'initial_sort_order numeric');
  execute 'drop function if exists public.create_estimate_node_with_history(uuid, uuid, uuid, public.estimate_node_kind, text, integer, uuid, uuid, uuid)';
  execute 'drop function if exists public.create_estimate_node_with_history(uuid, uuid, uuid, public.estimate_node_kind, text, integer, uuid, uuid)';
  execute function_def;

  select pg_get_functiondef(to_regprocedure('public.insert_estimate_template_into_estimate(uuid,uuid,uuid,uuid)'))
    into function_def;
  if function_def is null or position('max_sibling_sort_order integer' in function_def) = 0 or position('source_sort_order integer' in function_def) = 0 then
    raise exception 'Expected insert_estimate_template_into_estimate integer sort-order locals were not found.';
  end if;
  function_def := replace(function_def, 'max_sibling_sort_order integer', 'max_sibling_sort_order numeric');
  function_def := replace(function_def, 'source_sort_order integer', 'source_sort_order numeric');
  execute function_def;

  select pg_get_functiondef(to_regprocedure('public.insert_estimate_subtree_into_estimate(uuid,uuid,uuid,uuid,uuid,uuid)'))
    into function_def;
  if function_def is null or position('max_sibling_sort_order integer' in function_def) = 0 then
    raise exception 'Expected insert_estimate_subtree_into_estimate integer sort-order local was not found.';
  end if;
  execute replace(function_def, 'max_sibling_sort_order integer', 'max_sibling_sort_order numeric');

  select pg_get_functiondef(to_regprocedure('public.insert_estimate_template_node_into_estimate_with_history(uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid)'))
    into function_def;
  if function_def is not null then
    if position('root_sort_order integer' in function_def) = 0 or position('sort_order integer' in function_def) = 0 then
      raise exception 'Expected insert_estimate_template_node_into_estimate_with_history integer sort-order locals were not found.';
    end if;
    function_def := replace(function_def, 'root_sort_order integer', 'root_sort_order numeric');
    function_def := replace(function_def, 'sort_order integer', 'sort_order numeric');
    execute function_def;
  end if;

  select pg_get_functiondef(to_regprocedure('public.create_project_estimate_package_with_history(uuid,jsonb,text,text,uuid)'))
    into function_def;
  if function_def is not null then
    if position('(node_payload->>''sortOrder'')::integer' in function_def) = 0 then
      raise exception 'Expected create_project_estimate_package_with_history integer sortOrder cast was not found.';
    end if;
    execute replace(function_def, '(node_payload->>''sortOrder'')::integer', '(node_payload->>''sortOrder'')::numeric');
  end if;
end;
$$;

update public.estimate_nodes
set sort_order = sort_order * 10
where sort_order < 10;

alter table public.estimate_nodes
  drop constraint if exists estimate_nodes_unique_sort;
alter table public.estimate_nodes
  drop constraint if exists estimate_nodes_unique_sort_with_root;
alter table public.estimate_nodes
  drop constraint if exists estimate_nodes_tab_unique_sort;
alter table public.estimate_nodes
  drop constraint if exists estimate_nodes_tab_unique_sort_with_root;

drop index if exists public.estimate_nodes_estimate_parent_sort_idx;
drop index if exists public.estimate_nodes_tab_parent_sort_idx;

alter table public.estimate_nodes
  alter column sort_order type numeric(20,4)
  using sort_order::numeric(20,4);

alter table public.estimate_nodes
  alter column sort_order set default 0;

alter table public.estimate_nodes
  add constraint estimate_nodes_tab_unique_sort
  unique (estimate_tab_id, parent_id, sort_order)
  deferrable initially deferred;

alter table public.estimate_nodes
  add constraint estimate_nodes_tab_unique_sort_with_root
  unique nulls not distinct (estimate_tab_id, parent_id, sort_order)
  deferrable initially deferred;

create index if not exists estimate_nodes_estimate_parent_sort_idx
  on public.estimate_nodes (estimate_id, parent_id, sort_order);

create index if not exists estimate_nodes_tab_parent_sort_idx
  on public.estimate_nodes (estimate_tab_id, parent_id, sort_order);

revoke execute on function public.create_estimate_node_with_history(
  uuid, uuid, uuid, public.estimate_node_kind, text, numeric, uuid, uuid, uuid
) from public, anon;

grant execute on function public.create_estimate_node_with_history(
  uuid, uuid, uuid, public.estimate_node_kind, text, numeric, uuid, uuid, uuid
) to authenticated;
