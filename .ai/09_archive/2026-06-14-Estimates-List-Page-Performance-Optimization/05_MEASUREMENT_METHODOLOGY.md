# 05 — Performance Measurement Methodology

You cannot optimize what you don't measure, and you cannot prove a win without a baseline. This doc defines **exactly how to measure every dimension** of `/workshop/projects/[projectId]/estimates`, the **baseline capture procedure**, and the **acceptance thresholds** the implementation plan (`06`) must beat.

**Environment constraints (from project memory):**
- Dev-auth bypass is disabled; browser measurement runs through the user's existing Chrome session (Playwright MCP attaches to it) or a manually logged-in DevTools session. A second `next dev` will not start — use the running one.
- Workshop pages suspend when the tab is hidden — keep the tab focused during capture.
- Local Postgres for EXPLAIN: Docker is absent; use the hosted Supabase SQL editor / MCP `execute_sql` (owner-authorized) or the PG17 prove-harness pattern already used in this repo.
- Node for tooling: nvm v25.8.0 (PATH node is v14 — too old). Don't run heavy workflows alongside the full DOM test suite.

All measurements are captured **twice**: a **baseline** (current `main`) and an **after** (post-each-phase), into `metrics/` files committed alongside the plan so deltas are auditable.

---

## What we measure (the metric set)

| Dimension | Metric | Tool | Target (see thresholds) |
|-----------|--------|------|------|
| Server | TTFB (server think time before first byte) | Server-Timing header + Chrome | ≥ 50% reduction |
| Server | Supabase round-trips per page load | instrumentation log | ≤ 8 (from ~22–28) |
| Server | per-query / per-RPC wall time | instrumentation log | aggregation RPC < sum of 3 queries it replaces |
| DB | query plan + actual time | `EXPLAIN (ANALYZE, BUFFERS)` | index scans, no seq scan on big tables |
| Network | total requests, transferred bytes, RSC payload size | HAR / DevTools | RSC payload ↓ at realistic volume |
| Loading | FCP, LCP | Web Vitals | LCP < 2.5 s (good) |
| Interaction | INP, and **"create→row-visible" stopwatch** | Web Vitals + Playwright | create→visible < 400 ms (optimistic) |
| Layout | CLS | Web Vitals | < 0.1 |
| Perceived | # of full-screen overlay flashes per CRUD op | manual / Playwright DOM probe | 0 on in-place edits |
| Perceived | duplicate / auto-code / reset-widths stopwatch | Playwright DOM probe | no overlay; duplicate optimistic; reset purely local |
| State correctness | optimistic rollback/reconcile matrix | DOM tests + Playwright | action rejection restores/keeps correct rows |
| Large list | estimate-row count and search responsiveness | Playwright + browser profiling | no runaway render/prefetch setup cost at agreed list size |

---

## 1. Server-side instrumentation (round-trips + per-call timing)

Add a tiny, dev-only timing helper and wrap the Supabase calls in `listProjectEstimates` and the layout summary fns. This is **temporary measurement scaffolding** — gated behind an env flag, removed or left dormant after.

`src/lib/perf/server-timing.ts` (new, measurement-only):
```ts
const ENABLED = process.env.PERF_TRACE === "1";

export async function traced<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (!ENABLED) return fn();
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const ms = (performance.now() - start).toFixed(1);
    // one line per hop → grep-able; counts round-trips by counting lines
    console.log(`[perf] ${label} ${ms}ms`);
  }
}
```
Wrap each `.from()/.rpc()` await, e.g. in `workspace-repository.ts:1419`:
```ts
const { data: estimates, error } = await traced("listProjectEstimates.estimates", () =>
  supabase.from("estimates").select(ESTIMATE_LIST_COLUMNS).eq("project_id", project.id).order("updated_at", { ascending: false })
);
```
Run `PERF_TRACE=1 bun run dev`, load the page once, and capture the `[perf]` lines:
```bash
# count round-trips for one cold load:
grep -c "^\[perf\]" dev.log
# total server think time:
grep "^\[perf\]" dev.log | awk '{s+=$3} END {print s "ms"}'   # (strip "ms" first)
```
This directly produces the "~22–28 hops" baseline number from `01` §(b) and the per-call breakdown. **Capture once for the layout-only path (navigate to project root) and once for the estimates page** to separate layout cost from page cost.

**Server-Timing header (browser-visible TTFB attribution):** in the page or a small wrapper, emit `Server-Timing` so it shows in the DevTools Network → Timing tab:
```ts
// in an instrumented build only
headers().set?.("Server-Timing", `db;dur=${totalDbMs};desc="supabase"`);
```
(If header mutation isn't ergonomic in the RSC, rely on the console log + Chrome's TTFB.)

---

## 2. Database — EXPLAIN ANALYZE (before/after the aggregation RPC)

Run via Supabase SQL editor / MCP `execute_sql` against the owner-authorized project, or the PG17 prove-harness. Use a **realistic-volume** estimate (see §6), not the 5-row seed.

Baseline — the three queries `listProjectEstimates` runs today:
```sql
explain (analyze, buffers, verbose)
select id, estimate_id, kind, parent_id, sort_order
from estimate_nodes where estimate_id in (:ids) order by sort_order;

explain (analyze, buffers, verbose)
select estimate_id, quantity, unit_cost, contingency_percentage, misc_cost
from estimate_row_items where estimate_id in (:ids);
```
After — the proposed RPC (`02` §C):
```sql
explain (analyze, buffers, verbose)
select * from public.project_estimate_list_summaries(:project_id);
```
Capture: plan node types (expect `Index Scan` / `Index Only Scan`, **flag any `Seq Scan`** on `estimate_row_items`/`estimate_nodes`), `actual time`, rows, and `Buffers: shared hit/read`. The RPC should read fewer buffers and return O(estimates) rows instead of O(all rows).

**RLS initplan check (F10):** before/after wrapping `auth.uid()` → `(select auth.uid())`, compare `actual time` on a `select * from estimate_row_items where estimate_id in (:ids)` executed **as an authenticated role** (set `request.jwt.claims`), since the per-row function tax only appears under RLS. Document the multiplier.

Optionally enable `pg_stat_statements` and read `mean_exec_time` / `calls` for the RPC vs the raw selects across a capture window.

---

## 3. Web Vitals (FCP, LCP, INP, CLS, TTFB) — real RUM

Add `useReportWebVitals` (Next built-in) in a client component mounted in the workshop tree, dev-gated:
```tsx
"use client";
import { useReportWebVitals } from "next/web-vitals";
export function WebVitalsProbe() {
  useReportWebVitals((m) => {
    if (process.env.NEXT_PUBLIC_PERF_TRACE !== "1") return;
    console.log(`[vitals] ${m.name} ${Math.round(m.value)} (${m.id})`);
  });
  return null;
}
```
Capture for: (a) cold navigation into the estimates page, (b) a create, (c) an inline rename. INP specifically captures the interaction latency the user complains about. Record the worst-case INP during a CRUD session.

---

## 4. Network / HAR / RSC payload

In the user's Chrome (logged in), DevTools → Network:
1. Disable cache, hard-reload the estimates page. Record: **# requests**, **total transferred**, **TTFB** (from the document request Timing tab), and the **size of the RSC/document response**.
2. Filter to the `?_rsc=` / document request to read the React payload size — this is what shrinks when `select("*")` → explicit columns and when the aggregation RPC removes all-rows transfer.
3. Save as HAR (`estimates-baseline.har`) into `metrics/`.
4. Repeat after each phase; diff request count and bytes.

Programmatic alternative (Playwright MCP against the user's session): collect `response` events, sum `headers["content-length"]`, count requests to the app origin.

---

## 5. The "create → visible" stopwatch (the headline UX metric)

This is the number that captures "basic CRUD is slow." Measure wall-clock from the click that starts a mutation to the moment the result is visible in the DOM.

Playwright (run against the running dev server through the user's session):
```ts
// e2e/perf/estimates-crud-latency.spec.ts (measurement spec, not a gate initially)
const t0 = performance.now();
await page.getByRole("button", { name: /create estimate/i }).click();
await page.getByText(/EST-\d+/).last().waitFor({ state: "visible" });
const created = performance.now() - t0;

// inline rename: click cell → type → blur → wait for "Saved"
// delete: open modal → confirm → wait for row removed
console.log(JSON.stringify({ createMs: created /* , renameMs, autoCodeMs, duplicateMs, deleteMs, resetWidthsMs */ }));
```
Also probe the overlay: assert whether `[data-route-loading-overlay]` (or the overlay's root) appears during an in-place edit. Baseline = overlay appears for ≥250 ms on every op; target = overlay does **not** appear on inline edits, and create/delete reflect optimistically before the server resolves.

Mandatory mutation paths in the stopwatch:

1. Create first estimate from the empty state.
2. Create another estimate from the toolbar while search is empty.
3. Create while a search filter is active; expected behavior must be explicit
   (row appears if it matches, otherwise count/state updates without confusing
   the no-match empty state).
4. Rename estimate name.
5. Update notes.
6. Update project budget.
7. Auto-generate sheet code.
8. Duplicate estimate, including double-click guard.
9. Delete single estimate and bulk delete.
10. Reset column widths.

Every path must assert `data-route-overlay` does not appear unless it is a real
route navigation. Existing tests that assert `router.refresh()` after create,
inline edit, duplicate, delete, or reset widths must be inverted before they can
count as proof.

---

## 6. Seed a realistic-volume estimate (so DB wins are visible)

The audited project has 5 row-items (`02` §E) — too small to show aggregation gains. Create a throwaway "load test" estimate with thousands of rows in a **non-committed** DB session (or a disposable branch DB), measure, then discard:
```sql
-- attach to a scratch estimate id; DO NOT run against production data you keep
insert into estimate_row_items (id, estimate_id, node_id, quantity, unit_cost, contingency_percentage, misc_cost, sort_order)
select gen_random_uuid(), :estimate_id, :node_id, 1, 100, 5, 10, g
from generate_series(1, 5000) g;
```
Run §2 EXPLAIN and §4 payload capture at 5 / 500 / 5000 rows to chart the **linear blow-up** of the current JS-fold path vs the **flat** RPC path. This chart is the justification for F8 and the proof of the fix.

Important correction from the 2026-06-14 QA audit: the existing
`scripts/seed-performance-test-data.ts` is manifest-only and does **not** write
to Supabase. It is not enough for DB benchmarks. Implementation must add a
real disposable DB fixture/prove harness, or use hosted Supabase SQL against a
throwaway project/estimate and record teardown evidence.

---

## Acceptance thresholds (the bar `06` must clear)

| Metric | Baseline (expected) | Pass threshold |
|--------|--------------------|----------------|
| Supabase round-trips / cold load | ~22–28 | ≤ 8 |
| Server think time (sum of `[perf]` lines) | capture | ≥ 50% reduction |
| TTFB (cold) | capture | ≥ 40% reduction |
| LCP (cold) | capture | < 2.5 s |
| INP during CRUD | capture (likely poor) | < 200 ms |
| CLS on first paint | capture (skeleton-mismatch likely >0.1) | < 0.1 |
| create → row visible | full round-trip (capture) | < 400 ms (optimistic) |
| inline rename/notes/budget/auto-code → "Saved", overlay shown? | overlay ≥250 ms, full re-render | **no overlay**, no full re-render |
| duplicate → row visible | full round-trip (capture) | placeholder < 100 ms, canonical row on resolve, no overlay |
| reset column widths | overlay + full refresh today | no network refresh, no overlay, localStorage state reset only |
| read-only collaborator mutation | raw RLS/PG error possible | clean edit-denied error, no raw SQL text |
| RSC payload @ 5000 rows | linear with rows | flat in row count (O(estimates)) |
| EXPLAIN on row-item read | seq/index scan, all rows | aggregate, fewer buffers, O(estimates) out |
| prefetch setup at high estimate count | every row builds 3 prefetch query configs | bounded/visible-row strategy or measured proof that current setup is acceptable |

**Rule:** no optimization task in `06` is "done" until its specific row in this table is captured before-and-after and meets the threshold. Store captures in `metrics/<phase>-<metric>.{txt,har,json}`.
