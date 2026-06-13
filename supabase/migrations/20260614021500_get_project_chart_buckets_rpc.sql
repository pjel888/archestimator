-- Project charts: server-side bucket aggregation RPC (`02` DB-4 / `09` P2.1).
--
-- This is the Postgres push-down form of PERF-2. The application currently
-- aggregates with the equivalent server-side JS reduce in the repository (proven
-- byte-for-byte by the golden-master oracle); this function lets a future
-- iteration move the work fully into the database. It is additive and unused until
-- the repository opts in, so deploy can probe it and fail open on partial drift
-- (per the add-new-tab deploy lesson).
--
-- It reproduces the three ancestor-walk semantics of aggregate-project-charts.ts:
--   * SPACE    — climb estimate_nodes.parent_id to the HIGHEST kind='area' ancestor
--   * CATEGORY — climb component_category_nodes.parent_id to the HIGHEST 'category'
--   * SUPPLIER — source_snapshot supplierId → component_suppliers, else legacy text
-- and the exact row-total formula:
--   qty*unit_cost + misc_cost + qty*unit_cost*coalesce(contingency_percentage,0)/100
--
-- SECURITY INVOKER: runs under the caller's RLS on estimate_row_items /
-- estimate_nodes / component_suppliers; the global component_category_nodes
-- (using(true)) is read in-function exactly as today — no new exposure.

create or replace function public.get_project_chart_buckets(
  target_estimate_ids uuid[],
  grouping_mode text
)
returns table (
  estimate_id uuid,
  bucket_id text,
  bucket_label text,
  total numeric,
  row_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  -- `recursive` is required because node_climb (below) self-references; without it
  -- a clean apply fails with "relation node_climb does not exist". Non-recursive
  -- CTEs in the same WITH list are unaffected. (Cross-plan fix surfaced while
  -- landing the Estimates-List plan — this migration had not been applied to hosted.)
  with recursive row_totals as (
    select
      ri.estimate_id,
      ri.node_id,
      ri.source_snapshot,
      ri.supplier as legacy_supplier,
      (ri.quantity * ri.unit_cost)
        + ri.misc_cost
        + (ri.quantity * ri.unit_cost) * coalesce(ri.contingency_percentage, 0) / 100 as total
    from public.estimate_row_items ri
    where ri.estimate_id = any(target_estimate_ids)
  ),
  -- SPACE: highest 'area' ancestor (closest to root) for every node.
  node_climb as (
    select n.id as start_id, n.id, n.parent_id, n.kind, n.name, 0 as depth
    from public.estimate_nodes n
    where n.estimate_id = any(target_estimate_ids)
    union all
    select c.start_id, p.id, p.parent_id, p.kind, p.name, c.depth + 1
    from node_climb c
    join public.estimate_nodes p on p.id = c.parent_id
  ),
  node_area as (
    select distinct on (start_id) start_id, name as area_name
    from node_climb
    where kind = 'area'
    order by start_id, depth desc
  ),
  -- CATEGORY: highest 'category' ancestor for every category node.
  cat_climb as (
    select cn.id as start_id, cn.id, cn.parent_id, cn.node_type, cn.label, 0 as depth
    from public.component_category_nodes cn
    union all
    select c.start_id, p.id, p.parent_id, p.node_type, p.label, c.depth + 1
    from cat_climb c
    join public.component_category_nodes p on p.id = c.parent_id
  ),
  cat_top as (
    select distinct on (start_id) start_id, id as category_id, label as category_label
    from cat_climb
    where node_type = 'category'
    order by start_id, depth desc
  ),
  resolved as (
    select
      rt.estimate_id,
      rt.total,
      -- SPACE bucket
      case
        when na.area_name is null then 'unassigned-space'
        else 'space:' || coalesce(nullif(regexp_replace(lower(btrim(na.area_name)), '[^a-z0-9]+', '-', 'g'), ''), 'none')
      end as space_id,
      coalesce(na.area_name, 'Unassigned space') as space_label,
      -- CATEGORY bucket
      coalesce(ct.category_id, 'uncategorized') as category_id,
      coalesce(ct.category_label, 'Uncategorized') as category_label,
      -- SUPPLIER bucket
      cs.id::text as supplier_match_id,
      cs.name as supplier_match_name,
      rt.source_snapshot->>'supplierId' as snapshot_supplier_id,
      rt.legacy_supplier,
      rt.source_snapshot->>'supplier' as snapshot_supplier_name
    from row_totals rt
    left join node_area na on na.start_id = rt.node_id
    left join cat_top ct on ct.start_id = (rt.source_snapshot->>'categoryNodeId')
    left join public.component_suppliers cs
      on cs.id = nullif(rt.source_snapshot->>'supplierId', '')::uuid
  ),
  bucketed as (
    select
      estimate_id,
      total,
      case grouping_mode
        when 'space' then space_id
        when 'category' then category_id
        else coalesce(
          supplier_match_id,
          snapshot_supplier_id,
          'supplier:' || coalesce(
            nullif(regexp_replace(lower(btrim(coalesce(supplier_match_name, legacy_supplier, snapshot_supplier_name, 'No supplier'))), '[^a-z0-9]+', '-', 'g'), ''),
            'none'
          )
        )
      end as bucket_id,
      case grouping_mode
        when 'space' then space_label
        when 'category' then category_label
        else coalesce(supplier_match_name, legacy_supplier, snapshot_supplier_name, 'No supplier')
      end as bucket_label
    from resolved
  )
  select
    estimate_id,
    bucket_id,
    min(bucket_label) as bucket_label,
    sum(total) as total,
    count(*)::bigint as row_count
  from bucketed
  group by estimate_id, bucket_id
  order by estimate_id, sum(total) desc, min(bucket_label);
$$;

grant execute on function public.get_project_chart_buckets(uuid[], text) to authenticated;

comment on function public.get_project_chart_buckets(uuid[], text) is
  'Project charts bucket aggregation (space/category/supplier). Mirrors aggregate-project-charts.ts; proven equivalent by the golden-master oracle. SECURITY INVOKER.';
