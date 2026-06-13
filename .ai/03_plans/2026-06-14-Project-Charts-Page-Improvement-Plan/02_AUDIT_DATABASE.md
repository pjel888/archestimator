# 02 — Database & Data-Model Audit

**Scope:** the 5 queries in `src/lib/repositories/project-charts-repository.ts`
and the JS aggregation in `src/lib/project-charts/aggregate-project-charts.ts`,
against Supabase project `ebxxqidacheyapmmzavr`.

**Live-DB access note:** live reads required an interactive Supabase OAuth
handshake not completed in the planning session. All findings below are grounded
in verbatim migration SQL (file:line) and application source; the four
live-verification queries that remain are listed at the end. Seed-file inspection
establishes current volume (§E). This does not block planning — it adds a
verify-on-implementation step, captured in `11`.

---

## DB-4 — THE opportunity: all bucket aggregation runs in JS over raw rows. Push it into a Postgres RPC — **High**

**Current behavior:** the repository ships **raw rows** — up to 5001
`estimate_row_items` + 1501 `estimate_nodes` + 1001 `component_category_nodes` +
1001 `component_suppliers` ≈ **~8,500 rows** per page view — and
`aggregate-project-charts.ts` does *all* the work in JS: per-row ancestor walks
(`resolveSpaceBucket:169`, `resolveCategoryBucket:323`), supplier joins
(`resolveSupplierBucket:346`), grouping, top-8 collapse. The UI needs **~dozens of
buckets**.

The three ancestor-walk semantics the RPC must reproduce exactly:

- **Space:** from `row.node_id`, walk `estimate_nodes.parent_id` to the **highest
  `kind='area'` ancestor** (`resolveSpaceBucket:174-184` keeps overwriting
  `highestArea` as it climbs — "highest", not nearest).
- **Category:** from `source_snapshot.categoryNodeId`, walk
  `component_category_nodes.parent_id` to the **highest `node_type='category'`**
  node, bucket by its **`id`** (`:328-341`).
- **Supplier:** prefer `source_snapshot.supplierId` → fall back to legacy
  `row.supplier` text (`:346-355`).
- **Row total** (`calculateProjectChartRowTotal:98-101`):
  `qty*unit_cost + misc_cost + (qty*unit_cost)*contingency_percentage/100`.

### RPC sketch — `get_project_chart_buckets`

```sql
create or replace function public.get_project_chart_buckets(
  target_estimate_ids uuid[],
  grouping_mode text  -- 'space' | 'category' | 'supplier'
)
returns table (estimate_id uuid, bucket_id text, bucket_label text, total numeric, row_count bigint)
language sql stable security invoker   -- runs under caller RLS; no escalation
set search_path = public
as $$
with row_totals as (
  select ri.estimate_id, ri.node_id, ri.source_snapshot,
         (ri.quantity*ri.unit_cost)
           + ri.misc_cost
           + (ri.quantity*ri.unit_cost)*coalesce(ri.contingency_percentage,0)/100 as total
  from public.estimate_row_items ri
  where ri.estimate_id = any(target_estimate_ids)
),
-- SPACE: recursive climb to the HIGHEST kind='area' ancestor (anchor at root areas,
-- propagate the area marker down once → O(nodes), not O(rows×depth)).
node_area as ( /* with recursive ... */ ),
-- CATEGORY: recursive climb of component_category_nodes to highest node_type='category'.
cat_top as ( /* with recursive ... */ )
select estimate_id,
       case grouping_mode
         when 'space'    then space_bucket_id
         when 'category' then category_id
         else coalesce(supplier_id::text, lower(supplier_text))
       end as bucket_id,
       /* label */,
       sum(total) as total, count(*) as row_count
from row_totals
left join node_area using (node_id)
left join cat_top   on cat_top.node_id = (source_snapshot->>'categoryNodeId')
/* supplier join on component_suppliers within workspace */
group by 1, 2, 3;
$$;
grant execute on function public.get_project_chart_buckets to authenticated;
```

Implementation notes for `09`:
- **Recursive CTEs are required** for both space and category ancestor walks
  (Postgres `WITH RECURSIVE`). Precompute per-node "highest area ancestor" once
  (single tree pass) rather than re-walking per row.
- **`SECURITY INVOKER`** so existing RLS on `estimate_row_items` / `estimate_nodes`
  / `component_suppliers` still applies. The global `component_category_nodes`
  (`using(true)`, DB-1) is read in-function and bucketed by id — identical
  semantics to today, no new exposure.
- Return one row per (estimate, bucket). The client only does the cheap top-8 /
  "Other" collapse + stable color assignment (`03` C3).
- **Prove harness:** a golden-master test must assert the RPC's per-bucket totals
  equal the current JS oracle (`buildProjectChartSeries`) for the seed project,
  for all three grouping modes, before the read path is swapped (`09` P2, `11`).

**Payload reduction:** today up to ~8,500 wide rows (carrying `source_snapshot`
jsonb); the RPC returns `#estimates × #buckets` ≈ **20–60 scalar rows** — a
**~100–400× row reduction**, and `source_snapshot` never crosses the wire (`05`
SEC-1). This is the highest-ROI change on the page and the server-side half of
PERF-2.

---

## DB-1 — `component_category_nodes` is global by design; `using(true)` read policy — NOT a leak, but a documented footgun — Medium (correctness) / Low (security)

**Evidence:** table has **no `workspace_id` column**
(`20260522064018_component_library_taxonomy_source.sql:5-16`; comment `:2` "Categories
are global taxonomy nodes"). Read RLS `:59-60`:
`... for select to authenticated using (true);`. The repository query
(`project-charts-repository.ts:223-227`) has **no filter** at all.

**Analysis:** this is **not** a cross-workspace leak — the taxonomy is
intentionally a single global tree shared by all workspaces; there is no "other
workspace's categories" to leak. The JS resolver buckets by the global category
**`id`** (`aggregate:341`), not label, so two workspaces using the same category
id correctly share a bucket — intended, no pollution today.

**Real problems:** (1) the no-filter query loads the entire global taxonomy
(≤ 1001 rows) on every chart view regardless of how few the project references;
(2) it is a footgun — if categories ever become workspace-scoped, the unfiltered
load + `using(true)` becomes an instant BOLA. **Fix:** fold the category walk into
the RPC (DB-4) so raw taxonomy rows never ship, and add a comment documenting the
global-taxonomy invariant so no reviewer "fixes" it into a bug or panics about a
leak.

---

## DB-3 — All chart-path RLS helpers use bare `auth.uid()` (per-row re-evaluation) — Medium

**Evidence:** the four estimate/supplier queries resolve through
`is_workspace_member()` (core schema `:165-178`), whose body uses **bare
`auth.uid()`** (`:176`), not `(select auth.uid())`. Same in `is_workspace_admin`
(`:191`), `is_platform_admin` (`:91`), `can_access_estimate` (`:17`),
`can_edit_estimate` (`:400`), and `current_project_access_rank` (`20260526142913:207,213`).

**Cost:** Postgres treats bare `auth.uid()` as `STABLE`, re-evaluated **per
candidate row** during policy filtering, vs once per query when wrapped as
`(select auth.uid())` (an InitPlan). Softened here because the helpers are `STABLE
SECURITY DEFINER` (planner can cache the result per argument) and the dominant
`estimate_id IN (...)` filter is index-served (DB-2), so the policy `EXISTS` runs
against a small post-filtered set. Realistic blast radius on the hot row-items
query: up to ~5,000 `auth.uid()` resolutions per page load.

**Fix (low-risk, high-leverage):**
```sql
-- inside is_workspace_member:
where wm.workspace_id = target_workspace_id
  and wm.user_id = (select auth.uid())   -- was: auth.uid()
```
This one-line change benefits **every** policy routing through the helper
(estimate_nodes, estimate_row_items, component_suppliers, projects, estimates,
cost_library_items, …). Apply the same `(select auth.uid())` wrap to the other
five helpers. **Verify with `EXPLAIN (ANALYZE)` before/after** (needs live DB) and
cross-check against Supabase's `auth_rls_initplan` advisor lint. This is the same
finding the estimates/library plans raised — coordinate so it's applied once
repo-wide, not three times.

---

## DB-2 — All `.in()/.eq()` filters are index-covered (left-prefix). Two ORDER BYs incur a sort node — INFO / Low

| Query (repo line) | Filter / order | Covering index | Verdict |
|---|---|---|---|
| `estimate_row_items` `.in(estimate_id)` (`:160`) | `estimate_id IN` | `(estimate_id, node_id, sort_order)` core `:126` | ✅ left-prefix |
| `estimate_nodes` `.in(estimate_id).order(sort_order)` (`:198`) | filter + `ORDER BY sort_order` | `(estimate_id, parent_id, sort_order)` core `:125` | ⚠️ filter served; **sort not** (parent_id between) → Sort node |
| `component_category_nodes` `.order(sort_order)` (`:226`) | full + `ORDER BY sort_order` | only `(parent_id, sort_order)` `:39` | ⚠️ seq scan + sort |
| `component_suppliers` `.eq(workspace_id).order(sort_order)` (`:253`) | filter + sort | `(workspace_id, sort_order, name)` `:40` | ✅ fully index-ordered |

Both sort nodes are trivial at present volumes and **fully obviated by DB-4** (the
client stops issuing these queries). No new index is warranted — adding one would
be premature.

---

## DB-6 — `loadRowFacts` has no `.order()` before `.limit(5001)` → arbitrary, silent under-count on large estimates — Medium

**Evidence:** each loader fetches `LIMIT + 1` and sets `didHitLimit` on overflow
(`limitLoadedRows:278-283`); `didHitLimit` forces `requiresSelectedPair`
(`:121-127`). But `loadRowFacts` (`:157-161`) has **no `.order()`** — which 5,000
of N rows survive is arbitrary (physical/index order). If one estimate legitimately
exceeds 5,000 line items, the charts show an arbitrary subset and **totals are
wrong while still rendering as authoritative**. `loadNodeFacts` at least orders by
`sort_order`, but truncating nodes mid-tree breaks ancestor walks (rows fall into
"Unassigned space", `:186`).

**Severity rationale:** latent today (volumes far below caps, §E); becomes a
data-integrity bug the moment a real estimate crosses ~5,000 rows.

**Fix:** DB-4's RPC eliminates this (aggregation over the full table server-side;
no row cap needed — you only ever return dozens of buckets). Interim: add a
deterministic `.order('id')` to `loadRowFacts` so truncation is at least stable,
and render an explicit "results truncated — totals incomplete" banner on
`didHitLimit` rather than the soft mode-switch + cryptic copy (`03` L1).

---

## §E — Live data volume (current reality)

Live counts unobtainable in-session (see access note); seed migrations show the
demo project `22222222…` and peers are **small**:

- `20260518110000_attach_philip_seed_data.sql`: ~14 `estimate_row_items`, ~31
  `estimate_nodes` (project 2222 at `:48,:71`).
- `20260519173857_populate_lewis_residence_estimate_tree.sql`: ~47 node tuples.
- `20260605131500_restore_lewis_residence_seed_rows.sql`: ~5 row-item tuples.

**Conclusion:** current real volume is **tens of rows per estimate**, nowhere near
the 5000/1500/1000 caps. The payload/perf problem (DB-4, `01` PERF-2) and the
truncation bug (DB-6) are **latent, not yet biting** — but the architecture ships
raw rows, so they will bite the first real large project. This is exactly why the
plan sequences the design/correctness spine (P0/P1) ahead of the DB work (P2):
the felt problem today is the *design*, not the *milliseconds*.

---

## Summary table

| ID | Title | Severity | Fix |
|----|-------|----------|-----|
| DB-4 | All aggregation in JS over raw rows | **High** | `get_project_chart_buckets` RPC (recursive-CTE walks); ~100–400× payload cut; golden-master prove |
| DB-3 | Bare `auth.uid()` in chart-path RLS helpers | Medium | `(select auth.uid())` wrap; EXPLAIN before/after; apply repo-wide once |
| DB-6 | Unordered LIMIT truncation → arbitrary under-count | Medium | RPC removes caps; interim deterministic order + truncation banner |
| DB-1 | `component_category_nodes` `using(true)`, no filter | Med (correctness) / Low (sec) | Document global-taxonomy invariant; fold walk into RPC. **Not a live leak.** |
| DB-2 | `.in()/.eq()` index-covered; 2 sort nodes | INFO / Low | None now; obviated by DB-4 |
| §E | Live counts unverifiable | INFO (gap) | Run the four verification queries on implementation |

---

## Live-DB verification queries (run on implementation, capture output in `11`)

1. `select count(*) from estimate_row_items where estimate_id in (<project 2222 estimates>);` and overall counts — confirms DB-4/DB-6 latency is latent.
2. `EXPLAIN (ANALYZE, BUFFERS)` on the four loader queries — confirms DB-2 plans (index use + sort nodes).
3. `EXPLAIN` the row-items query before/after the `(select auth.uid())` helper rewrite — quantifies DB-3.
4. Supabase advisors (performance + security lint) — cross-check `auth_rls_initplan`.

---

## Quality posture

The headline DB opportunity is specified with an RPC shape, recursive-CTE strategy,
security model, and golden-master gate. Live DB proof remains an implementation
artifact, not something this planning pass can claim ahead of time.
