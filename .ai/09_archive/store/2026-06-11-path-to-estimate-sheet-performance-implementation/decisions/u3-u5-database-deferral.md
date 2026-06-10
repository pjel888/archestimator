# U3 + U5 Deferral Receipt — 2026-06-11

**Status: DEFERRED with evidence (not rejected — the bottleneck is real; the proof channel is unavailable this run).**

## Why deferred

| Requirement (plan) | This run |
|---------------------|----------|
| U3: "Move aggregation to SQL/RPC/view **only if tests prove parity**" (13-implementation-readiness-plan.md) | No database available: Docker absent → `npx supabase start` impossible; hosted Supabase SQL access denied by the permission classifier (see environment-status.md). Parity cannot be proven. |
| U3: "Keep a rollback path until parity is proven" | Shipping an unproven RPC + fallback adds a dead code path with zero measured benefit — rejected for this run. |
| U5: "Run EXPLAIN before proposing indexes" (QA-DB-001) | EXPLAIN requires a database. Same blockage. |
| U5: provider apply | Requires explicit owner/provider authority — not granted (hard constraint). |

## Current-truth facts (verified in source this run)

- `listProjectEstimates()` (workspace-repository.ts) transfers `estimate_id, quantity, unit_cost, contingency_percentage, misc_cost` for **every row item of every estimate in the project**, then reduces in JavaScript (rowTotal = qty*unit_cost + misc + qty*unit_cost*contingency/100). The plan-doc-12 correction stands: no `source_snapshot` overfetch remains on this path; the cost is row transfer + JS reduction.
- `estimates.select("*")` (line ~1343) remains; estimate rows are few per project — not the dominant cost.

## Ready design for the next run (with DB authority)

1. RPC `list_project_estimate_summaries(project_uuid uuid)` returning `(estimate_id uuid, row_count bigint, total_cost numeric, node_count bigint, first_node_id uuid)`:
   - totals: `SUM(quantity*unit_cost + misc_cost + quantity*unit_cost*COALESCE(contingency_percentage,0)/100)` — matches JS arithmetic including the `?? 0` contingency null handling; quantity/unit_cost/misc_cost are NOT NULL per schema.
   - first node: `DISTINCT ON (estimate_id)` ordered by `(kind='area') DESC, sort_order ASC` to mirror the two-pass JS selection (first area node by sort order, else first node).
   - `SECURITY INVOKER` so RLS continues to scope rows to the caller.
2. Parity test plan: seed fixture project (50 estimates × 100 rows incl. discount rows, null contingency, empty estimates) → assert RPC row_count/total equals JS reduce output to within numeric formatting; RLS test with a second user.
3. EXPLAIN before/after on `estimate_row_items(estimate_id)` access path; only then consider U5 indexes (candidate: existing `.in("estimate_id", ids)` and `.eq("workspace_id").in("item_id", ids)` patterns from doc 05).
4. Keep the JS aggregation as the fallback until the parity suite is green in CI against a real database.

## What this run did instead

Nothing destructive: behavior unchanged; no migration files added (an unapplied, unproven migration in `supabase/migrations/` would be picked up by the next `db push` without its parity evidence — worse than deferring).
