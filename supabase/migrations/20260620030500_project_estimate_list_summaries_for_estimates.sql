-- Dashboard hero-path performance: aggregate summaries only for the displayed
-- recent estimates instead of scanning every estimate in the project.
--
-- Keep the existing project_estimate_list_summaries(target_project_id) RPC for
-- the full estimates-list route, where current UX still displays all rows. This
-- additive helper is for bounded dashboard cards after the app has already
-- chosen the recent estimate ids.

create or replace function public.project_estimate_list_summaries_for_estimates(
  target_project_id uuid,
  target_estimate_ids uuid[]
)
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
  with requested as (
    select distinct unnest(coalesce(target_estimate_ids, '{}'::uuid[])) as id
  ),
  est as (
    select e.id
    from public.estimates e
    join requested r on r.id = e.id
    where e.project_id = target_project_id
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
  left join row_agg on row_agg.estimate_id = est.id;
$$;

revoke execute on function public.project_estimate_list_summaries_for_estimates(uuid, uuid[]) from public, anon;
grant execute on function public.project_estimate_list_summaries_for_estimates(uuid, uuid[]) to authenticated;
