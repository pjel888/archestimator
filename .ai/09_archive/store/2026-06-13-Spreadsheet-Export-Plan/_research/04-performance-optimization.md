# Proposal XLSX Export — Performance, Optimization, Scalability & Reliability Audit

Lens: **performance / optimization / scalability / reliability / error handling**. READ-ONLY audit, 2026-06-13.

Scope: the `proposal.xlsx` route, the model builder, the ExcelJS workbook builder, the repository tree-load functions, and the client-side preview build. Benchmark harness was **run** (see "Benchmark results"). Numbers tagged `MEASURED` are from local runs on this machine (Bun + ExcelJS 4.4.0); numbers tagged `ESTIMATE` are reasoned from code; `ASSUMPTION` flags unverified premises.

---

## Executive summary

The export is **CPU-light and memory-light at its current hard caps** (1200 nodes / 3000 row items). At the worst legal size a single workbook builds in ~0.5–0.6 s and produces a ~0.5 MiB buffer with ~250–350 MiB process RSS — comfortably inside any reasonable serverless function. The dominant cost is **ExcelJS workbook generation (~90% of wall time)**, not the model build (~8%) or the DB read. Time/space complexity is effectively **linear** in row count across every stage; there is no quadratic blow-up at the audited sizes.

The real risks are **reliability and UX**, not raw throughput:

1. **CRITICAL — error responses are saved as a broken `.xlsx` file.** The download is a bare `<a href>` (`ProposalExportPreviewDialog.tsx:108-118`). On 413/404/500 the route returns a JSON body; the browser either navigates to raw JSON or saves the JSON bytes under a `.xlsx` name. The user gets a corrupt spreadsheet with no actionable message.
2. **HIGH — no try/catch anywhere in the route.** A DB error, an ExcelJS throw, or the deliberate `throw new Error("Estimate tab export mapping failed.")` (`route.ts:188`) becomes an unstyled Next.js 500 with a stack — again rendered/saved as the "file". No logging, no observability, no graceful 503.
3. **HIGH — all-tabs path is a DB fan-out with redundant queries.** `Promise.all` over tabs issues ~5 queries *per tab* (workspace/project + estimate + tab + nodes + rows), and the estimate row is re-fetched once per tab. A 10-tab estimate fires ~50 round-trips concurrently against the pooled Postgres connection.
4. **MEDIUM — preview work is thrown away.** The client builds the full model in `buildProposalPreview` (synchronous, main thread, `EstimateSheetContent.tsx:1064`), then the download rebuilds the identical model server-side from a fresh DB read. No reuse, no cache, double the consolidation work.
5. **MEDIUM — no caching despite deterministic output.** Identical estimate ⇒ byte-identical workbook (modulo `generatedAt`), yet `Cache-Control: private, no-store` and `force-dynamic` forbid any reuse.

None of these block a beta launch at the current caps, but #1 and #2 are cheap to fix and materially improve perceived reliability.

---

## Complexity analysis (per stage)

Let `R` = row items, `N` = tree nodes, `S` = sections (bounded, ~10), `T` = tabs. Field widths below reference `build-proposal-export-model.ts`.

| Stage | Function (file:line) | Time | Space | Notes |
|---|---|---|---|---|
| Tree flatten | `flattenEstimateTree` (`build-proposal-export-model.ts:257`) | O(N + R) | O(R) | Single DFS; spreads `[...path]`/`[...pathIds]` per node ⇒ O(depth) allocation per node, fine for shallow trees. |
| Normalize | `normalizeSourceRow` (`:85`) | O(R) | O(R) | Per-row string normalize + rounding; constant work. |
| Consolidate | `consolidateProposalRows` (`:288`) | O(R · K) | O(R) | K = cost of `consolidationKey`. |
| └ consolidationKey | `:125-138` | `JSON.stringify` of a **10-element array** per row, with `keyText()` (regex `\s+` + lowercase) on 6 string fields | The expensive-looking part. **MEASURED**: negligible — see below. |
| Summary build | `buildSummaryRows` (`:187`) | O(R) | O(S) | `Map` keyed by sectionKey; bounded sections. |
| Breakdown build | `buildSourceBreakdownRows` (`:164`) | O(R) | O(R) | `flatMap` over each proposal row's `sources` (1:1 unless rows merge). |
| Totals | `buildTotals` (`:216`) | O(R) | O(1) | Single reduce. |
| Validation scan | `collectNonAreaRows` (`:238`) | O(N) | O(issues) | Second full tree walk (separate from flatten). |
| **Workbook gen** | `createProposalWorkbook` + `eachCell` styling (`create-proposal-workbook.ts:179-545`) | O(R · C) | O(R · C) | C = columns (10 bid / 14 breakdown). **Dominant cost.** |
| `writeBuffer` | `:549` | O(cells) | O(buffer) | Serializes the whole in-memory workbook to a Buffer (zip+XML). |

**Hot spot ranking (MEASURED, single-tab):**
- ExcelJS `createProposalWorkbook` + `writeBuffer`: ~470 ms of the ~513 ms total at 3000 rows ⇒ **~90%**.
- `buildProposalExportModel` (flatten+normalize+consolidate+summary+breakdown): **~43 ms at 3000 rows** ⇒ ~8%.
- The much-suspected `JSON.stringify` consolidationKey is **not** a hot spot: building 3000 rows with heavy duplication still completes the whole model in 43 ms. At 3000 keys × ~10 fields the stringify cost is sub-10 ms. `INFO`.

The per-row ExcelJS overhead is the styling: every body row calls `styleBodyRow` → `row.eachCell` (`create-proposal-workbook.ts:90-98`) setting a border object per cell, plus the bid form does an in-loop `model.proposalRows.filter(...)` per section (`:207`). That filter is **O(S · R) = O(R)** for bounded S, so acceptable, but it re-scans the full row array once per section. `INFO`.

---

## Serverless / runtime fit & memory–time budget

Route config: `runtime = "nodejs"`, `dynamic = "force-dynamic"` (`route.ts:12-13`). **No `maxDuration` export** on the route and **no `maxDuration`/`memory` in `vercel.json`** (only `git.deploymentEnabled: false`). So the function inherits the platform default.

### Worst-case size at current caps
Caps: `PROPOSAL_EXPORT_NODE_LIMIT = 1200`, `PROPOSAL_EXPORT_ROW_ITEM_LIMIT = 3000` (`route.ts:15-16`).

- **Rows**: ≤ 3000 consolidated bid rows (consolidation can only reduce count).
- **Cells `ESTIMATE`**: Bid Form ≈ (3000 rows + ~10 section headers + ~10 subtotals + ~17 preamble rows) × 10 cols ≈ **~30.4k cells**. Source Breakdown ≈ 3000 × 14 ≈ **~42k cells**. Summary + Commercial Terms negligible. Total **~73k cells** for a single-tab workbook.
- **Buffer**: **MEASURED 0.46 MiB at 3000 rows** (486,269 bytes). Linear: 0.09 MiB @ 500, 0.16 @ 1000, 0.39 @ 2500.
- **Process RSS**: **MEASURED 260–341 MiB** at the 3000-row build (heapUsed ~58 MiB). This is mostly Bun/Node baseline + ExcelJS object graph; the workbook is held fully in memory until `writeBuffer` completes, then copied into a `Buffer` (`create-proposal-workbook.ts:550`) and again into a `Uint8Array` for the `Response` (`route.ts:45`) — **two extra full copies of the buffer**, but at 0.5 MiB that's immaterial.

### Time budget
- **MEASURED**: 513–615 ms wall for the build at 3000 rows on warm local hardware. `ESTIMATE`: add cold-start (Node + ExcelJS module init, ~200–600 ms `ASSUMPTION`) + DB latency (2 round-trips, ~50–200 ms `ASSUMPTION`). End-to-end p50 ≈ **0.8–1.4 s warm**, ≈ **1.5–2.5 s cold** for a max single-tab export. Well under any timeout.
- **Vercel default timeout**: the prompt cites 300 s. Whatever the configured default, **300 s is far more than this workload needs** (it finishes in ~1 s) and far less than a problem. The exposure is the opposite: a hung DB connection or a much-larger future cap, not this build. `INFO`.

### `force-dynamic` + `no-store` — correct but leaves caching on the table
- `force-dynamic` is **correct**: the export depends on per-user auth/RLS and live estimate data; it must not be statically cached. `Cache-Control: private, no-store` (`route.ts:51`) is also correct for a per-tenant financial document.
- **Missed opportunity** `MEDIUM`: output is deterministic for a given estimate revision (the only nondeterminism is `generatedAt`, `route.ts:179` / `build-proposal-export-model.ts:377`). A revision-keyed cache (e.g. ETag from estimate `row_revision`/`updated_at`, or a short-lived object-store cache keyed by `estimateId+revision`) would let repeat downloads skip the rebuild entirely. Not needed at current scale but the cheapest future win once exports get larger.

### Streaming
- **No streaming.** The route builds the entire buffer, then sends it in one `Response` with a fixed `Content-Length` (`route.ts:44-53`). For 0.5 MiB this is fine. If caps rise (see recommendations), ExcelJS's `stream.xlsx.WorkbookWriter` (present in installed exceljs 4.4.0: `node_modules/exceljs/lib/stream/xlsx/workbook-writer.js`) would cap memory at one worksheet's worth of rows instead of the whole workbook.

---

## DB / repository performance

### Single-tab path
`getEstimateTabTree` (`workspace-repository.ts:1731`) does, sequentially:
1. `getCurrentWorkspaceProject(projectId)` — workspace + project lookup.
2. `estimates` select (`*`) by id+project.
3. `estimate_tabs` select by id.
4. `estimate_nodes` select scoped to `estimate_tab_id` (single bulk query, `LIMIT maxNodeCount+1`).
5. **If** nodes exist: `estimate_row_items` select with `.in("node_id", nodeIds)` (single bulk query, `LIMIT maxRowItemCount+1`).

**No N+1.** Rows are fetched in **one bulk `IN` query**, not per node (`:1779-1788`). Tree assembly (`buildEstimateTree`, `:1593`) is O(N+R) with `Map` lookups. `GOOD`.

The legacy path `getProjectEstimateTreeByEstimateLegacy` (`:1639`) is even better: it fetches nodes and rows **in parallel** via `Promise.all` (`:1663-1666`) scoped by `estimate_id` only. The tab path is **sequential** (nodes, then rows) because rows are scoped by the fetched `node_id` list — one extra serial round-trip vs. legacy. `LOW`.

### Limit enforcement
- `.limit(max + 1)` + `limitTreeRows` slice (`:1565-1571`) is the standard "fetch one extra to detect overflow" pattern. Correct.
- **Subtle gap** `LOW`: in the tab path, the row `LIMIT` is applied **after** node truncation. `fetchedNodeCount`/`fetchedRowItemCount` (`:1795-1796`) reflect raw fetched counts, and the route's `didExceedExportLimit` re-counts the *built* tree as a fallback (`route.ts:83-89`). The two counters can disagree if nodes were truncated (rows for dropped nodes were never fetched), but the route errs toward the limit response, so it fails safe.

### Indexes implied
Queries filter/sort on: `estimates(id, project_id)`, `estimate_tabs(estimate_id, is_default, archived_at, sort_order)`, `estimate_nodes(estimate_id, estimate_tab_id, sort_order)`, `estimate_row_items(node_id, sort_order)` and `(estimate_id, sort_order)` for legacy. The hot ones for export are **`estimate_nodes(estimate_tab_id)`** and **`estimate_row_items(node_id)`** — both must be indexed or the `IN`/eq scans degrade at scale. `ASSUMPTION`: not verified against the live schema in this audit (DB channel unavailable per project memory). Flag for the DB lens to confirm.

### Same tree fetched twice?
- Within a single request: **no**. Each path fetches once.
- Across preview→download: **yes, effectively** — the client already materialized and consolidated the tree for the preview; the download re-reads it from Postgres and re-consolidates. Wasted DB + CPU. `MEDIUM` (see "Redundant work").
- `getProjectEstimateTreeByEstimate` (`:1806`) calls `getDefaultEstimateTab` **and then** `getEstimateTabTree` (which itself re-queries the estimate). So the no-tab single export does `estimates` lookups in both `getDefaultEstimateTab`'s caller chain and `getEstimateTabTree`. Minor redundant estimate reads. `LOW`.

---

## All-tabs scaling

Path: `buildAllTabsResponse` (`route.ts:154`). Triggered when `getEstimateTabs` returns > 1 tab (`route.ts:213-215`).

### Combined limit — **correctly summed across tabs** (not per-tab)
Each tab is fetched with the **same** per-tab caps (1200/3000, `route.ts:157-158`), but the route then **sums** `fetchedNodeCount`/`fetchedRowItemCount` across all tabs and rejects with 413 if the **total** exceeds 1200 nodes / 3000 rows (`route.ts:166-176`). So a 5-tab estimate does **not** get 240 nodes/tab — it gets a shared 1200/3000 budget across all tabs combined. **The combined cap is implemented correctly.** `GOOD`.

Caveat `LOW`: the per-tab fetch still pulls up to 1200/3000 *per tab* from the DB before the sum is checked. A pathological 10-tab estimate with 3000 rows each would fetch 30,000 rows from Postgres only to then 413. The cap protects the *workbook build*, not the *DB read*. Cheap to fix by checking the running sum and short-circuiting after each tab resolves (currently all fetch concurrently, so no short-circuit possible with `Promise.all`).

### DB connection pressure
`Promise.all(tabs.map(getEstimateTabTree))` (`route.ts:155-160`) fires **all tab trees concurrently**. Each `getEstimateTabTree` makes ~4–5 sequential queries, **and re-runs `getCurrentWorkspaceProject` + the `estimates` `*` select per tab** (`:1737-1749`). For T tabs:
- **~5T concurrent-ish queries** (e.g. 10 tabs ⇒ ~50 queries), many of them **redundant** (same workspace, project, estimate fetched T times).
- Burst concurrency against the Supabase/pooled connection. On Vercel Fluid Compute the pooler (pgbouncer transaction mode `ASSUMPTION`) can absorb this, but it's wasteful and can spike pool usage under concurrent users. `MEDIUM`.

**Fix**: fetch workspace/project/estimate **once**, then fetch each tab's nodes+rows. Or fetch all tabs' nodes+rows in two bulk queries scoped by `estimate_id` (then group by `estimate_tab_id` in memory) — turning ~5T queries into ~3 total.

### Memory / time (MEASURED)
At the combined 3000-row cap distributed across tabs:
- 5 tabs × 600 rows: **584 ms, 0.47 MiB buffer, RSS 347 MiB, heap 99 MiB**.
- 10 tabs × 300 rows: **554 ms, 0.48 MiB buffer, RSS 410 MiB, heap 99 MiB**.

So at the legal cap, all-tabs costs roughly the same wall time as single-tab but **~1.5–2× the RSS/heap** (it holds T full models simultaneously, since each tab's model is built up front in `tabWorkbookModel.tabs[].model`, `route.ts:185-200`, before the workbook is created). Still well within budget.

**What it looks like if the combined cap were absent (proof the cap matters)** — MEASURED 5 tabs × 3000 rows = 15,000 rows: **2462 ms, 2.21 MiB buffer, RSS 746 MiB, heap 244 MiB**. So the combined cap is the thing keeping all-tabs RSS sane; raising it linearly raises memory.

---

## Reliability & error-handling gaps

| Scenario | Current behavior | Severity |
|---|---|---|
| **Error body saved as `.xlsx`** | Download is a plain `<a href={downloadHref}>` with **no `download` attr and no fetch wrapper** (`ProposalExportPreviewDialog.tsx:108-118`). On non-200 the browser navigates to / saves the JSON error body. User gets a corrupt "spreadsheet" or a raw-JSON page. | **CRITICAL** |
| **Oversize (413)** | `createLimitResponse()` returns `NextResponse.json({error, limits}, {status:413})` (`route.ts:56-67`). Correct status, but the body is JSON delivered to an `<a>` ⇒ same broken-file problem. No user-facing "estimate too large" UI. | **HIGH** |
| **Missing project/estimate (404)** | `NextResponse.json({error:"Estimate not found."},{status:404})` (`route.ts:112,136,163`). Same delivery problem. | **MEDIUM** |
| **DB error** | Repos `throw` raw Supabase errors (`:1655,1668,1759,1773,1786`). **No try/catch in the route** ⇒ unhandled ⇒ Next.js 500 with stack, no logging. | **HIGH** |
| **ExcelJS throw** | `createProposalWorkbookBuffer` (`create-proposal-workbook.ts:547`) is **not** wrapped in try/catch at any call site (`route.ts:121,145,202`). Any ExcelJS internal error ⇒ 500. | **HIGH** |
| **Tab mapping race** | `throw new Error("Estimate tab export mapping failed.")` (`route.ts:188`) if `worksheetNames` length ≠ tabs length. Throws inside the model `.map`, uncaught ⇒ 500. Can occur if a tab is archived/deleted between `getEstimateTabs` and the `Promise.all` fetch (TOCTOU). | **MEDIUM** |
| **Partial tab failure** | If **any** tab fetch in `Promise.all` rejects, the whole export fails (no `allSettled`, no partial workbook). One bad tab kills a 10-tab export. | **MEDIUM** |
| **Empty estimate** | Builds a valid (mostly empty) workbook with an `empty_estimate` validation issue (`build-proposal-export-model.ts:352`). Graceful. | `GOOD` |
| **Logging / observability** | **None** in the route or repos for export. No structured log, no metric (duration, row count, 413 rate), no Sentry-style capture. Failures are invisible. | **HIGH** |
| **Timeouts / retries** | No explicit timeout on DB calls, no retry. Relies on platform defaults. | `LOW` |

The single highest-leverage reliability fix is to **stop using a bare `<a href>`**: fetch the URL, check `response.ok` / content-type, and only then trigger a blob download; otherwise surface the JSON `error`/`limits` in the existing preview dialog. Pair with a route-level try/catch that logs and returns a consistent JSON error.

---

## Benchmark results (MEASURED)

Harness: `scripts/benchmark-proposal-workbook.ts` (run via `bun run`; not wired into `package.json`, but the script is directly runnable and a vitest fixture covers it: `tests/vitest/proposal-workbook-benchmark.test.ts`). Synthetic models, real `createProposalWorkbookBuffer`. Local machine, warm. These prove **builder** cost only — **not** Vercel runtime limits or spreadsheet-app open/recalc time (the harness `note` says so explicitly).

**Single-tab** (`PROPOSAL_WORKBOOK_BENCHMARK_ROWS="500,1000,2500,3000"`):

| Rows | Duration | Buffer | RSS |
|---|---|---|---|
| 500 | 162 ms | 0.09 MiB (94,420 B) | 155 MiB |
| 1000 | 251 ms | 0.16 MiB (172,680 B) | 206 MiB |
| 2500 | 452 ms | 0.39 MiB (408,692 B) | 269 MiB |
| 3000 (cap) | 513–615 ms | 0.46 MiB (486,269 B) | 260–341 MiB |

Roughly **linear**: ~0.17 ms/row and ~160 B/row of XLSX. Confirms no quadratic behavior.

**Model build only** (custom harness, `buildProposalExportModel`, 20-iter avg):

| Nodes | Rows | Build time | Consolidated rows |
|---|---|---|---|
| 200 | 3000 | 43.7 ms | 3000 |
| 1200 | 3000 | 43.3 ms | 3000 |
| 1200 | 1200 | 16.1 ms | 1200 |

Model build is ~8% of total; `consolidationKey` `JSON.stringify` is **not** a bottleneck.

**All-tabs / tabbed** (custom harness, `runTabbedBenchmark`):

| Tabs × rows | Total rows | Duration | Buffer | RSS | Heap |
|---|---|---|---|---|---|
| 5 × 600 | 3000 (at cap) | 584 ms | 0.47 MiB | 347 MiB | 99 MiB |
| 10 × 300 | 3000 (at cap) | 554 ms | 0.48 MiB | 410 MiB | 99 MiB |
| 5 × 3000 | 15000 (cap off) | 2462 ms | 2.21 MiB | 746 MiB | 244 MiB |

All-tabs at the legal cap ≈ single-tab wall time, ~1.5–2× RSS. Removing the cap scales memory and time linearly with total rows.

---

## Prioritized optimization recommendations (impact × effort)

| # | Recommendation | Impact | Effort | Severity addressed | Where |
|---|---|---|---|---|---|
| 1 | **Fetch-then-blob download with error handling.** Replace `<a href>` with a fetch that checks `response.ok`/content-type, downloads via blob URL on success, and renders the 413/404/500 `error`/`limits` in the preview dialog. Kills the "JSON saved as .xlsx" bug. | **Very high** | Low | CRITICAL #1, HIGH #2 (413), MED 404 | `ProposalExportPreviewDialog.tsx:108`, `EstimateSheetContent.tsx:781` |
| 2 | **Route-level try/catch + structured logging.** Wrap each `build*Response` body; log `{estimateId, tabCount, rowCount, durationMs, outcome}`; return a consistent JSON error (and surface it via #1). Add `Promise.allSettled` so one bad tab doesn't kill all-tabs. | **High** | Low | HIGH (DB/ExcelJS/log), MED (partial/TOCTOU) | `route.ts:105-205` |
| 3 | **De-duplicate all-tabs DB reads.** Fetch workspace/project/estimate **once**, then per-tab nodes+rows — or two bulk `estimate_id`-scoped queries grouped in memory. Cuts ~5T queries to ~3. | **High** | Medium | HIGH #3 (fan-out) | `route.ts:154-160`, `workspace-repository.ts:1731-1804` |
| 4 | **Confirm/add indexes** on `estimate_nodes(estimate_tab_id, sort_order)` and `estimate_row_items(node_id, sort_order)`. | Med–High | Low | DB scaling | (DB schema) |
| 5 | **Short-circuit oversize before full fetch in all-tabs.** Accumulate node/row counts as tabs resolve and 413 early, or cap the running total, so a giant estimate doesn't read 30k rows just to reject. | Medium | Low–Med | LOW (DB waste on 413) | `route.ts:166-176` |
| 6 | **Reuse the preview model for download** (or at least cache the server build by estimate revision). Preview already consolidates the tree client-side; sending that model (or a revision ETag) avoids the duplicate DB read + rebuild. | Medium | Med–High | MED #4/#5 (redundant work, caching) | `EstimateSheetContent.tsx:1064`, `route.ts` |
| 7 | **Web Worker for the preview build.** `buildProposalPreview` runs synchronously on the main thread; at 3000 rows it's ~43 ms (one dropped frame) but blocks input during build. Offload to a worker if preview latency becomes user-visible. | Low–Med | Medium | Preview jank | `EstimateSheetContent.tsx:1064-1074` |
| 8 | **Set an explicit `maxDuration`** on the route (e.g. 30–60 s) instead of inheriting the platform default, so a hung DB call fails fast rather than holding a function for the full default window. | Low | Low | Timeout exposure | `route.ts` |
| 9 | **Adopt `stream.xlsx.WorkbookWriter`** *only if caps rise.* Not worth it at 0.5 MiB; becomes valuable past ~10–20k rows to cap memory at one sheet. Pair with a streamed `Response`. | Low (now) / High (if scaled) | High | Memory ceiling on growth | `create-proposal-workbook.ts:547` |
| 10 | **Right-size the caps with intent.** 1200/3000 are conservative given the measured 0.5 MiB / 0.5 s headroom. If product needs larger estimates, the build can handle ~3–4× before memory (not time) becomes a concern — but raise caps **with** #2/#9 in place, not before. | Low | Low | Scalability headroom | `route.ts:15-16` |

### Quick wins (do first)
#1 and #2 are both **low effort** and remove the two most user-visible failure modes (corrupt files, silent 500s). #4 is a one-line DB check. Everything else is optimization for scale that the current caps don't yet demand.

---

## Coverage & caveats

- **Coverage of the requested scope: ~95%.** All named files read; complexity analyzed per stage; benchmark **run** with single-tab, model-only, and all-tabs scenarios; reliability paths traced end-to-end including the client download trigger.
- **Not verified** (`ASSUMPTION`): live DB index presence (DB channel unavailable per project memory); exact Vercel `maxDuration`/memory defaults for this deployment; cold-start timing on Vercel (benchmarks are warm-local only); pooler mode. These are flagged inline for the DB/infra lenses.
