# Audit 02 — Database: Schema, Indexes, Aggregation, RLS, Volume

Read-only audit from migration DDL + repository source. Live `EXPLAIN`/`pg_indexes` introspection was not run in this session (Supabase MCP needs interactive OAuth; Docker absent locally per memory) — `05_MEASUREMENT_METHODOLOGY.md` §3 specifies the exact EXPLAIN steps to run during implementation. Index facts below come from canonical migration DDL.

---

## (A) Schema summary

Hierarchy: `workspace → project → estimates → estimate_nodes → estimate_row_items`, plus `estimate_tabs` (added 2026-06-12). Base DDL: `supabase/migrations/20260518090000_archestimator_core_schema.sql`.

**`estimates`** (core:44-56, later-mutated):
`id uuid PK`, `project_id uuid NOT NULL → projects(id) ON DELETE CASCADE` (:46), `name text`, `revision_label` → **renamed `sheet_code`** (`20260519103000_..._sheet_code.sql:3`), `currency_code text(3)`, `metadata jsonb` (:52), `created_by`, `created_at`, `updated_at`. Dropped: `status`, `assumptions` (`20260519100903_remove_estimate_status_assumptions.sql:3-4`). JS still reads via `normalizeEstimateRecord(... as EstimateRecordWithLegacy)` (`workspace-repository.ts:1427`), tolerating legacy columns.

**`estimate_nodes`** (:82-94): `id PK`, `estimate_id NOT NULL → estimates CASCADE` (:84), `parent_id → estimate_nodes CASCADE` self-ref (:85), `kind public.estimate_node_kind NOT NULL` enum (:9), `name`, `sort_order int`, `metadata jsonb`, timestamps. Added `estimate_tab_id uuid NOT NULL` + composite FK `(estimate_id, estimate_tab_id) → estimate_tabs(estimate_id, id)` (`20260612094734:51-70`). A **deferred constraint trigger** `estimate_nodes_enforce_tree` runs recursive `validate_estimate_node_tree()` on every write (`20260612094734:316-320`) — write-path cost, not read.

**`estimate_row_items`** (:96-118): `id PK`, `estimate_id NOT NULL → estimates CASCADE` (:98), `node_id NOT NULL → estimate_nodes CASCADE` (:99), `sort_order`, `source_library_item_id`, `source_snapshot jsonb` (:102), text fields, `quantity numeric(14,4)` (:107), `unit_cost numeric(14,2)` (:108), `link_state` enum, `metadata jsonb` (:114), timestamps. Mutated: dropped `supplementary_cost`+`labor_cost`, added `misc_cost numeric(14,2)` (`20260522025929:1-15`); added `category_node_id text`, `supplier_id uuid` (`20260522064018:32-33`); added `contingency_percentage numeric(7,4)` 0–100 CHECK (`20260524050746:1-2,15-17`); added `row_revision int default 1` (`20260524033151:9`).

**`estimate_tabs`** (`20260612094734:12-26`): not touched by `listProjectEstimates`.

---

## (B) Index inventory + missing-index verdict

Every index on the four tables (grepped across all 88 migrations):

| Table | Index | Columns | Source |
|---|---|---|---|
| estimates | `estimates_project_id_idx` | `(project_id)` | core:123 |
| estimates | `estimates_project_updated_at_idx` | `(project_id, updated_at DESC)` | `20260519190958:5` |
| estimate_nodes | `estimate_nodes_estimate_parent_sort_idx` | `(estimate_id, parent_id, sort_order)` | core:125 |
| estimate_nodes | `estimate_nodes_tab_parent_sort_idx` | `(estimate_tab_id, parent_id, sort_order)` | `20260612094734:72` |
| estimate_row_items | `estimate_row_items_estimate_node_sort_idx` | `(estimate_id, node_id, sort_order)` | core:126 |
| estimate_row_items | `estimate_row_items_category_node_id_idx` | `(category_node_id)` | `20260522064018:43` |
| estimate_row_items | `estimate_row_items_supplier_id_idx` | `(supplier_id)` | `20260522064018:44` |
| estimate_row_items | `estimate_row_items_source_library_item_id_idx` | `(source_library_item_id)` | `20260603160000:26` |
| estimate_tabs | `estimate_tabs_one_default_per_estimate` (partial unique) | `(estimate_id) WHERE is_default` | `20260612094734:28` |
| estimate_tabs | `estimate_tabs_estimate_id_sort_idx` | `(estimate_id, sort_order)` | `20260612094734:32` |

Per-query analysis for the list page:
1. `estimates.eq(project_id).order(updated_at desc)` (`workspace-repository.ts:1419-1423`) — **well-served** by `estimates_project_updated_at_idx`.
2. `estimate_nodes.in("estimate_id", […])` (1440-1443) — **served** as leading-column prefix of `estimate_nodes_estimate_parent_sort_idx`. The trailing `.order("sort_order")` can't be index-satisfied across the `IN` set (sort_order is col 3) → in-memory sort; low severity.
3. `estimate_row_items.in("estimate_id", […])` (1444-1447) — **served** as leading-column prefix of `estimate_row_items_estimate_node_sort_idx`. No standalone `(estimate_id)` index needed.

**Verdict: NO missing indexes block this page.** Do NOT lead the plan with "add indexes." The bottleneck is **row-volume over-fetch + JS aggregation + per-row RLS function cost**, not seq scans. (Re-confirm with EXPLAIN ANALYZE during implementation — `05` §3 — but expect index scans.)

---

## (C) SQL aggregation / RPC design (F8)

**JS formula** (`workspace-repository.ts:1461-1470`):
```
subTotal = quantity * unit_cost
rowTotal = subTotal + misc_cost + (subTotal * contingency_percentage / 100)
```

This is **already replicated in SQL** as `STABLE` functions in `20260524050746_add_estimate_row_contingency_percentage.sql`:
- `estimate_row_subtotal` = `quantity * unit_cost` (:33-40)
- `estimate_row_contingency_value` = `subtotal * contingency_percentage / 100` (:42-49)
- `estimate_row_line_total` = `subtotal + misc_cost + contingency_value` (:51-60) ← **byte-for-byte the JS formula**
- `estimate_sheet_total(estimate_id)` = `sum(line_total)` for one estimate (:120-129)

What does **not** exist is a **multi-estimate list aggregation RPC**. `listProjectEstimates` uses no RPC; it pulls every node + every row and folds in JS. (The repo's only `.rpc()` calls: `list_pending_collaboration_invitations` :342, `can_edit_estimate` :1879.)

**Recommended RPC** — replaces the row-item JS fold with one aggregate round-trip
returning node count, row count, and total cost per estimate. The SQL below keeps
`first_node_id` nullable as a deliberate signal: unless implementation chooses a
recursive SQL equivalent, `listProjectEstimates` must keep using the existing
narrow nodes query plus `selectFirstEstimateNodeIds` for first-node selection.

```sql
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
security invoker            -- keep RLS in force; caller already authorized
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
```

Design notes:
- **Inline the arithmetic** rather than calling `estimate_row_line_total(r)` per row (the row-type fn is `revoke`d from `anon`/`public`; inlining avoids per-row call + grant complexity).
- `security invoker` keeps RLS exactly as privileged as today's direct selects.
- Collapses the row-item full transfer and JS folding into **1 aggregate RPC**.
  With the default Path A, the route still performs a narrow node-id query for
  first-node parity, but payload drops from O(all nodes + all rows) to
  O(nodes-for-first-node + estimates). With Path B, a proven recursive SQL
  `first_node_id` implementation can eliminate that node query too.
- **`first_node_id` parity:** direct source inspection found the JS
  `selectFirstEstimateNodeIds` (`src/lib/estimates/tree-hierarchy.ts:66-112`)
  is **depth-first and area-first**, falling back to the first root. It depends
  on input query order (`sort_order ASC`) but does not choose the first node by
  a flat `array_agg(... order by sort_order)` expression. A flat SQL pick can
  silently retarget "Open estimate" links. Implementation must either:
  1. **Path A, default:** keep first-node selection in JS while moving
     counts/totals to the RPC, or
  2. **Path B:** implement a recursive SQL equivalent and prove it against the
     JS oracle in `scripts/prove-estimate-list-summaries-postgres.mjs`.

  Do not swap the read path until the prove harness covers roots, nested groups,
  first area below a group, unknown legacy kinds, no-area fallback, and
  multi-estimate fixtures.

---

## (D) RLS findings (F10)

RLS is ON for all four tables (core:196-202; tabs `20260612094734:39`). Policies rewritten in `20260526142913_project_sheet_collaboration_access.sql`:
- `estimates` SELECT: `using (public.can_access_estimate(id))` (:731-732)
- `estimate_nodes` SELECT: `using (public.can_access_estimate(estimate_id))` (:743-744)
- `estimate_row_items` SELECT: `using (public.can_access_estimate(estimate_id))` (:751-752)
- platform-admin all-access layered on top (`20260518100000:145-151`)
- `estimates` INSERT: `with check (can_edit_project(project_id))` (:733-734) — this is what fails-closed on viewer writes (see `04` F15).

**Per-row cost.** `can_access_estimate` (`20260601151500:5-26`, `STABLE security definer`) evaluates per row: `is_platform_admin()` → `EXISTS` on `estimate_sheet_members` → `EXISTS` on `estimates` calling `estimate_inherits_project_access(e.id)` AND `current_project_access_rank(e.project_id) > 0`. `current_project_access_rank` (`20260526142913:187-216`) itself runs two correlated subqueries (projects⋈workspace_members max-role + project_members) plus `is_platform_admin()`. So **every node row and every row-item returned can trigger this nested membership chain** — cheap at 47+5 rows, linear tax as estimates grow.

**`(select auth.uid())` initplan caching NOT applied.** All helpers call bare `auth.uid()` (`can_access_estimate:17`, `current_project_access_rank:207,213`, `is_workspace_member` core:176). The `(select auth.uid())` pattern appears only in 3 unrelated migrations (`20260522070956`, `20260526013617`, `20260606095935`), **not** in the estimate-access helpers. Wrapping `auth.uid()` as `(select auth.uid())` inside these `security definer` functions lets the planner evaluate it once per query instead of once per row — documented Supabase multi-x speedup on RLS scans. Low-risk, high-value. (F10)

---

## (E) Data volume for the audited project `22222222`

Test project = **Lewis Residence** (`20260519173857_populate_lewis_residence_estimate_tree.sql:9`), owner `philipjonlewis@gmail.com`.
- **Estimates: exactly 1** (`33333333-3333-4333-8333-333333333333`).
- **estimate_nodes: 47** (47 node tuples in the populate migration).
- **estimate_row_items: 5** (`20260605131500_restore_lewis_residence_seed_rows.sql`, ids `…6661`–`…6665`).

**→ The audited page today renders 1 estimate / 47 nodes / 5 rows.** Current 3-query + JS-fold approach is trivially fast at this volume. The architecture is the concern: it loads **all rows of all estimates** just to display count + total badges, and degrades linearly as any estimate grows (a real residential estimate is hundreds–thousands of rows). **This is why the plan must measure at realistic volume** — see `05` §6 (seed a fat estimate before benchmarking the aggregation change).

---

## (F) Over-fetch findings (F9 — also a security finding, see `04`)

1. **`estimates.select("*")`** (`workspace-repository.ts:1421`) pulls all columns incl. `metadata` (jsonb), `created_by`, `currency_code`, plus legacy-tolerated `notes`/`project_budget`. The list UI needs only `id, name, sheet_code, updated_at, currency_code` (and `notes`/`project_budget` for inline edit). **Replace with an explicit column list** (mirror the existing `ESTIMATE_TREE_*_COLUMNS` pattern at :1523). `metadata` can grow unbounded (version-control writes into it, `20260524050746:296-301`).
2. **node over-fetch** (1441): selects `kind, parent_id` never used by the count/first-node logic. RPC (§C) eliminates.
3. **row over-fetch** (1446): transfers every line item of every estimate just to count + sum. Largest payload contributor at scale. RPC eliminates.

`source_snapshot`/`notes`/large jsonb are NOT in the node/row selects (good) — jsonb over-fetch risk is confined to `estimates.metadata` via `select("*")`.

---

## Bottom line

- **No index work** for this page.
- **Primary DB win:** `project_estimate_list_summaries` RPC (formula proven by `estimate_row_line_total`) collapsing 3 queries + JS fold into 1.
- **Secondary:** `select("*")` → explicit columns (also closes infosec F9).
- **RLS win:** `(select auth.uid())` initplan caching in `can_access_estimate` / `current_project_access_rank` / `is_workspace_member`.
- Measure at **realistic estimate size**, not the 5-row seed, or the win is invisible.
