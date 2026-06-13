-- Estimates List Page Performance Optimization — P2-1 (finding F8).
--
-- Aggregate node count, row count, and total cost per estimate for a project in a
-- single round-trip, replacing the all-nodes + all-rows JS fold in
-- listProjectEstimates (workspace-repository.ts). At realistic estimate sizes the
-- old path shipped O(all nodes + all rows) to the server; this returns
-- O(estimates) rows that stay flat as any estimate grows.
--
-- security invoker keeps RLS exactly as privileged as the direct selects it
-- replaces — no new attack surface. The arithmetic inlines the byte-for-byte
-- equivalent of estimate_row_line_total (20260524050746) rather than calling the
-- per-row function (which is revoked from anon/public).
--
-- first_node_id intentionally stays NULL (Path A): the route keeps the
-- depth-first / area-first selectFirstEstimateNodeIds JS oracle. A flat SQL pick
-- would silently retarget "Open estimate" links, so the nullable column is a
-- deliberate signal that first-node selection remains in JS.

create or replace function public.project_estimate_list_summaries(target_project_id uuid)
returns table (
  estimate_id uuid,
  node_count integer,
  row_count integer,
  total_cost numeric,
  first_node_id uuid
)
language sql
stable
security invoker
set search_path = public
as $$
  with est as (
    select e.id from public.estimates e where e.project_id = target_project_id
  ),
  node_agg as (
    select n.estimate_id,
           count(*) as node_count,
           null::uuid as first_node_id
    from public.estimate_nodes n
    join est on est.id = n.estimate_id
    group by n.estimate_id
  ),
  row_agg as (
    select r.estimate_id,
           count(*) as row_count,
           coalesce(sum(
             r.quantity * r.unit_cost
             + r.misc_cost
             + (r.quantity * r.unit_cost * coalesce(r.contingency_percentage, 0) / 100)
           ), 0) as total_cost
    from public.estimate_row_items r
    join est on est.id = r.estimate_id
    group by r.estimate_id
  )
  select est.id,
         coalesce(node_agg.node_count, 0)::int,
         coalesce(row_agg.row_count, 0)::int,
         coalesce(row_agg.total_cost, 0),
         node_agg.first_node_id
  from est
  left join node_agg on node_agg.estimate_id = est.id
  left join row_agg  on row_agg.estimate_id = est.id;
$$;

-- App entry point: callable by the authenticated role (RLS still gates the data);
-- revoked from anon/public.
revoke execute on function public.project_estimate_list_summaries(uuid) from public, anon;
grant execute on function public.project_estimate_list_summaries(uuid) to authenticated;
