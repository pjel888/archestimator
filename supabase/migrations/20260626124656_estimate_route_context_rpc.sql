-- Estimate-sheet route context batching.
--
-- The authenticated node route needs selected node metadata, active tabs, and
-- the selected tab tree before first paint. This read-only RPC returns that
-- route context in one Data API round trip while preserving the same RLS posture
-- as the direct PostgREST selects it replaces.

create or replace function public.estimate_node_route_context(
  target_project_id uuid,
  target_node_id uuid,
  max_node_count integer default null,
  max_row_item_count integer default null
)
returns jsonb
language sql
stable
security invoker
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
    where node.id = target_node_id
      and estimate.project_id = target_project_id
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
grant execute on function public.estimate_node_route_context(uuid, uuid, integer, integer) to authenticated;;
