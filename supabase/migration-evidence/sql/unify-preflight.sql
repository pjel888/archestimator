-- unify-preflight.sql — BLOCKING pre-flight for the estimate-node single-node unification.
-- Plan: .ai/03_plans/2026-06-13-Estimate-Tree-Single-Node-Unification/12_MIGRATION_RUNBOOK_WRITE_FREEZE_ROLLBACK.md §1
--
-- Every count MUST be 0 before applying 08_unify_estimate_node_kinds.P5.sql.
-- PITR is OFF on this project; a non-zero count voids the "reversible-until-first-write"
-- guarantee (a mixed node would already violate the constraints we relax) → ABORT.
-- This is the same predicate as the migration's in-transaction integrity block, run as a
-- fast fail BEFORE the maintenance window. Re-run under the write-freeze at apply time.

select 'mixed_estimate_nodes' as check_name, count(*)::int as cnt
from public.estimate_nodes n
where exists (select 1 from public.estimate_nodes c where c.parent_id = n.id)
  and exists (select 1 from public.estimate_row_items r where r.node_id = n.id)

union all
select 'mixed_template_nodes', count(*)::int
from public.estimate_template_nodes n
where exists (select 1 from public.estimate_template_nodes c where c.parent_id = n.id)
  and exists (select 1 from public.estimate_template_row_items r where r.template_node_id = n.id)

union all
select 'orphan_estimate_rows', count(*)::int
from public.estimate_row_items r
where not exists (select 1 from public.estimate_nodes n where n.id = r.node_id)

union all
select 'orphan_template_rows', count(*)::int
from public.estimate_template_row_items r
where not exists (select 1 from public.estimate_template_nodes n where n.id = r.template_node_id)

order by check_name;
