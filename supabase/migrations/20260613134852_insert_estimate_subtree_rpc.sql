begin;

-- U2 (DEF-2): the project-source -> estimate insert path. Mirrors the working
-- template-insert RPC pair (insert_estimate_template_into_estimate[_with_history],
-- 20260612094734_estimate_tabs_foundation.sql:771-1064) but sources from a LIVE
-- estimate subtree (estimate_nodes + estimate_row_items) instead of the
-- estimate_template_* tables.
--
-- ⚠ Sequencing: this RPC is tab-aware (it reads/writes estimate_tab_id and relies
-- on the tab-aware validate_estimate_node_tree), so it must be applied AFTER the
-- estimate_tabs foundation (D-A). Owner-gated apply against ebxxqidacheyapmmzavr only.
-- The prove script applies the foundation, so denials 4-7 are provable locally.
--
-- ⚠ Security (doc 16, U2-1, P0): the inner copy is NOT security definer, but it is
-- invoked from the SECURITY DEFINER wrapper, so it runs as `postgres` (RLS-exempt).
-- The source read MUST be guarded by an EXPLICIT can_access_estimate gate — never
-- rely on RLS inside the definer chain. (Same-workspace equality is NOT sufficient:
-- a same-workspace estimate can still be sheet-restricted from the caller.)

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
set search_path = public
as $$
declare
  target_workspace_id uuid;
  source_workspace_id uuid;
  source_project_id uuid;
  target_parent_tab_id uuid;
  max_sibling_sort_order integer;
  inserted_node_count integer := 0;
  inserted_row_item_count integer := 0;
  inserted_root_node_ids jsonb := '[]'::jsonb;
  source_node_total integer := 0;
begin
  if target_project_id is null or target_estimate_id is null or target_parent_node_id is null
     or source_estimate_id is null or source_tab_id is null then
    raise exception 'Project, estimate, target parent, source estimate, and source tab are required.';
  end if;

  -- (2) Target estimate belongs to the target project -> resolve target workspace.
  select project.workspace_id
    into target_workspace_id
  from public.estimates estimate
  join public.projects project on project.id = estimate.project_id
  where estimate.id = target_estimate_id
    and project.id = target_project_id;

  if target_workspace_id is null then
    raise exception 'Estimate not found in the current project.';
  end if;

  -- (3) U2-1 (P0): EXPLICIT source-readability gate. Do NOT rely on RLS here.
  if not public.can_access_estimate(source_estimate_id) then
    raise exception 'Source estimate access denied.';
  end if;

  select project.workspace_id, project.id
    into source_workspace_id, source_project_id
  from public.estimates estimate
  join public.projects project on project.id = estimate.project_id
  where estimate.id = source_estimate_id;

  if source_workspace_id is null then
    raise exception 'Source estimate not found.';
  end if;

  -- (4) Same workspace (mirror the template RPC's source/target equality).
  if source_workspace_id <> target_workspace_id then
    raise exception 'Source does not belong to the target estimate workspace.';
  end if;

  -- (5) Target parent is a group IN the target estimate -> capture its tab
  -- (rejects forged cross-estimate/area parents; mirror template RPC).
  select node.estimate_tab_id
    into target_parent_tab_id
  from public.estimate_nodes node
  where node.id = target_parent_node_id
    and node.estimate_id = target_estimate_id
    and node.kind = 'group';

  if target_parent_tab_id is null then
    raise exception 'Target Group Node not found in the current project.';
  end if;

  -- The source tab must belong to the source estimate (forged-id guard).
  if not exists (
    select 1 from public.estimate_tabs tab
    where tab.id = source_tab_id and tab.estimate_id = source_estimate_id
  ) then
    raise exception 'Source tab not found in the source estimate.';
  end if;

  -- Lock the target tab's nodes + defer the per-tab unique-sort constraints, then
  -- compute the max sibling sort INSIDE the lock so concurrent inserts don't race
  -- the sort base (doc 16, U2-3; mirror template RPC :840-846).
  perform 1
  from public.estimate_nodes node
  where node.estimate_id = target_estimate_id
    and node.estimate_tab_id = target_parent_tab_id
  for update;

  set constraints estimate_nodes_tab_unique_sort, estimate_nodes_tab_unique_sort_with_root deferred;

  -- Build the source -> target id map over the selected subtree (rooted at
  -- source_root_node_id, or every root of the tab when null), scoped to the source
  -- estimate + tab. is_root marks the subtree roots, which attach under the target.
  create temporary table if not exists estimate_subtree_copy_map (
    source_node_id uuid primary key,
    target_node_id uuid not null,
    is_root boolean not null,
    root_rank integer
  ) on commit drop;

  truncate table estimate_subtree_copy_map;

  insert into estimate_subtree_copy_map (source_node_id, target_node_id, is_root, root_rank)
  with recursive subtree as (
    select node.id, node.sort_order, true as is_root
    from public.estimate_nodes node
    where node.estimate_id = source_estimate_id
      and node.estimate_tab_id = source_tab_id
      and (
        (source_root_node_id is null and node.parent_id is null)
        or (source_root_node_id is not null and node.id = source_root_node_id)
      )
    union all
    select child.id, child.sort_order, false as is_root
    from public.estimate_nodes child
    join subtree parent on child.parent_id = parent.id
    where child.estimate_id = source_estimate_id
      and child.estimate_tab_id = source_tab_id
  )
  select
    subtree.id,
    gen_random_uuid(),
    subtree.is_root,
    case when subtree.is_root then row_number() over (partition by subtree.is_root order by subtree.sort_order, subtree.id) else null end
  from subtree;

  select count(*) into source_node_total from estimate_subtree_copy_map;
  if source_node_total = 0 then
    raise exception 'Source has no nodes to insert.';
  end if;

  select coalesce(max(node.sort_order), 0)
    into max_sibling_sort_order
  from public.estimate_nodes node
  where node.estimate_id = target_estimate_id
    and node.estimate_tab_id = target_parent_tab_id
    and node.parent_id = target_parent_node_id;

  -- Copy nodes: subtree roots attach under target_parent_node_id (spaced after the
  -- existing siblings); inner nodes keep their relative parent + sort. Every copy
  -- inherits the target parent's tab and carries project provenance.
  insert into public.estimate_nodes (id, estimate_id, estimate_tab_id, parent_id, kind, name, sort_order, metadata)
  select
    node_map.target_node_id,
    target_estimate_id,
    target_parent_tab_id,
    case when node_map.is_root then target_parent_node_id else parent_map.target_node_id end,
    src_node.kind,
    src_node.name,
    case when node_map.is_root then max_sibling_sort_order + (node_map.root_rank * 10) else src_node.sort_order end,
    coalesce(src_node.metadata, '{}'::jsonb) || jsonb_build_object(
      'sourceProjectId', source_project_id,
      'sourceEstimateId', source_estimate_id,
      'sourceTabId', source_tab_id,
      'sourceNodeId', src_node.id,
      'sourceKind', 'project'
    )
  from public.estimate_nodes src_node
  join estimate_subtree_copy_map node_map on node_map.source_node_id = src_node.id
  left join estimate_subtree_copy_map parent_map on parent_map.source_node_id = src_node.parent_id;

  get diagnostics inserted_node_count = row_count;

  if inserted_node_count <> source_node_total then
    raise exception 'Estimate subtree copy did not insert every source node.';
  end if;

  insert into public.estimate_row_items (
    id, estimate_id, node_id, sort_order, source_library_item_id, source_snapshot,
    category_node_id, supplier_id, material, description, supplier, unit, quantity,
    unit_cost, contingency_percentage, misc_cost, discipline, designation, link_state, metadata
  )
  select
    gen_random_uuid(),
    target_estimate_id,
    node_map.target_node_id,
    row_item.sort_order,
    row_item.source_library_item_id,
    coalesce(row_item.source_snapshot, '{}'::jsonb) || jsonb_build_object(
      'sourceProjectId', source_project_id,
      'sourceEstimateId', source_estimate_id,
      'sourceRowId', row_item.id,
      'sourceKind', 'project'
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
    coalesce(row_item.metadata, '{}'::jsonb) || jsonb_build_object(
      'sourceProjectId', source_project_id,
      'sourceEstimateId', source_estimate_id,
      'sourceRowId', row_item.id,
      'sourceKind', 'project'
    )
  from public.estimate_row_items row_item
  join estimate_subtree_copy_map node_map on node_map.source_node_id = row_item.node_id
  where row_item.estimate_id = source_estimate_id;

  get diagnostics inserted_row_item_count = row_count;

  select coalesce(jsonb_agg(node_map.target_node_id order by node_map.root_rank), '[]'::jsonb)
    into inserted_root_node_ids
  from estimate_subtree_copy_map node_map
  where node_map.is_root;

  -- Post-copy whole-estimate integrity check (tab-aware; mirror template RPC :970).
  perform public.validate_estimate_node_tree(target_estimate_id);

  return jsonb_build_object(
    'inserted_root_node_ids', inserted_root_node_ids,
    'inserted_node_count', inserted_node_count,
    'inserted_row_item_count', inserted_row_item_count,
    'estimate_tab_id', target_parent_tab_id
  );
end;
$$;

create or replace function public.insert_estimate_subtree_into_estimate_with_history(
  target_project_id uuid,
  target_estimate_id uuid,
  target_parent_node_id uuid,
  source_estimate_id uuid,
  source_root_node_id uuid,
  source_tab_id uuid,
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
  -- U4 gate: target edit access (membership + can_edit). Same hardened gate the
  -- template insert uses; never regress to bare resolve_estimate_workspace.
  resolved_workspace_id := public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id);
  perform 1 from public.estimates estimate where estimate.id = target_estimate_id for update;

  -- Idempotency on (estimate_id, correlation_id): the caller mints a STABLE
  -- per-source-unit correlation_id (doc 16, U2-2) so bulk retries don't double-insert
  -- and distinct units don't collide.
  committed_result := public.estimate_sheet_event_result(target_estimate_id, correlation_id);
  if committed_result is not null then
    return committed_result;
  end if;

  insert_result := public.insert_estimate_subtree_into_estimate(
    target_project_id,
    target_estimate_id,
    target_parent_node_id,
    source_estimate_id,
    source_root_node_id,
    source_tab_id
  );

  target_parent_tab_id := nullif(insert_result->>'estimate_tab_id', '')::uuid;

  insert into public.estimate_sheet_events (
    estimate_id,
    workspace_id,
    estimate_node_id,
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
    target_parent_node_id,
    target_parent_tab_id,
    'project_source_inserted',
    'server_action',
    correlation_id,
    resolved_user_id,
    array['project_source'],
    insert_result || jsonb_build_object(
      'sourceProjectId', (select project.id from public.estimates estimate join public.projects project on project.id = estimate.project_id where estimate.id = source_estimate_id),
      'sourceEstimateId', source_estimate_id,
      'sourceTabId', source_tab_id,
      'sourceRootNodeId', source_root_node_id,
      'targetParentNodeId', target_parent_node_id
    )
  )
  returning id into inserted_event_id;

  return insert_result || jsonb_build_object(
    'idempotent', false,
    'eventId', inserted_event_id
  );
end;
$$;

-- Grants mirror the foundation's template-insert RPC pair
-- (20260612094734_estimate_tabs_foundation.sql): the inner copy is only RLS-exempt
-- when reached through the SECURITY DEFINER wrapper, so it is revoked from every app
-- role (no direct call path that skips the can_edit gate); the wrapper is the single
-- `authenticated` entry point and is revoked from anon/public. Without this, both
-- functions inherit the default PUBLIC execute grant.
revoke execute on function public.insert_estimate_subtree_into_estimate(uuid, uuid, uuid, uuid, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.insert_estimate_subtree_into_estimate_with_history(uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.insert_estimate_subtree_into_estimate_with_history(uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid) to authenticated;

commit;
