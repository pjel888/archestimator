# 04 — Performance, Optimization & Reliability Audit

> **What this is:** the canonical performance/reliability assessment, including **measured benchmark numbers**. Full per-stage analysis in [`_research/04-performance-optimization.md`](_research/04-performance-optimization.md).
> **Method:** read-only static analysis + the benchmark harness **run** (`bun run scripts/benchmark-proposal-workbook.ts` + two custom harnesses). `MEASURED` = local warm runs (Bun + ExcelJS 4.4.0); `ESTIMATE`/`ASSUMPTION` flagged inline.

---

## Headline

At its current hard caps (1200 nodes / 3000 row items) the export is **CPU-light and memory-light** — a worst-case single-tab workbook builds in **~0.5–0.6 s** and produces a **~0.5 MiB** buffer with **~260–350 MiB** process RSS. Cost is **linear** in row count at every stage; no quadratic blow-up. **The real risks are reliability and UX, not throughput.** Nothing here blocks a beta launch, but the top two reliability fixes are cheap and remove the most user-visible failures.

---

## Measured benchmark results

**Single-tab** (real `createProposalWorkbookBuffer`):

| Rows | Duration | Buffer | RSS |
|---|---|---|---|
| 500 | 162 ms | 0.09 MiB | 155 MiB |
| 1000 | 251 ms | 0.16 MiB | 206 MiB |
| 2500 | 452 ms | 0.39 MiB | 269 MiB |
| **3000 (cap)** | **513–615 ms** | **0.46 MiB** | **260–341 MiB** |

≈ 0.17 ms/row, ≈ 160 B/row — linear.

**Where the time goes:** ExcelJS workbook gen + `writeBuffer` ≈ **90%** (~470 ms of ~513 ms); `buildProposalExportModel` (flatten+normalize+consolidate+summary+breakdown) ≈ **8%** (~43 ms); DB read the rest. The suspected `JSON.stringify` consolidation key is **not** a hot spot (<10 ms at 3000 rows).

**All-tabs** at the combined cap:

| Tabs × rows | Total | Duration | Buffer | RSS |
|---|---|---|---|---|
| 5 × 600 | 3000 | 584 ms | 0.47 MiB | 347 MiB |
| 10 × 300 | 3000 | 554 ms | 0.48 MiB | 410 MiB |
| 5 × 3000 (cap off) | 15000 | 2462 ms | 2.21 MiB | 746 MiB |

All-tabs at the legal cap ≈ single-tab wall time at ~1.5–2× RSS (it holds all tab models in memory before building). The last row proves **the combined cap is what keeps memory sane** — raising it scales memory linearly.

---

## Reliability & error-handling gaps (the real risks)

| ID | Sev | Scenario | Current behavior |
|---|---|---|---|
| PR-1 | **CRITICAL** | Error body saved as broken `.xlsx` | Download is a bare `<a href>` (`ProposalExportPreviewDialog.tsx:108`); on 413/404/500 the JSON error body is saved/navigated under the `.xlsx` name |
| PR-2 | **HIGH** | No try/catch in the route | DB error, ExcelJS throw, or the deliberate `throw` at `route.ts:188` → unlogged Next.js 500 (stack rendered/saved as the "file"). **No logging/observability anywhere.** |
| PR-3 | **HIGH** | All-tabs DB fan-out | `Promise.all` over tabs runs ~5 queries **per tab** and re-fetches workspace/project/estimate once per tab (~50 round-trips for 10 tabs). No `allSettled` → one bad tab kills the whole export |
| PR-4 | MEDIUM | Preview work thrown away | Client builds the full model for preview, then download rebuilds it server-side from a fresh DB read — double work, no reuse |
| PR-5 | MEDIUM | No caching | Output is deterministic per estimate revision (only `generatedAt` varies), yet `force-dynamic` + `no-store` forbid any reuse (correct for privacy, but an ETag/revision cache is left on the table) |
| PR-6 | MEDIUM | All-tabs over-fetch on 413 | Per-tab fetch pulls up to 1200/3000 *per tab* before the summed cap is checked; a giant 10-tab estimate reads ~30k rows only to 413 |
| PR-7 | LOW | No explicit `maxDuration` | Route inherits the platform default; a hung DB call holds a function for the full default window |

**What's already good:** no N+1 (rows fetched in one bulk `IN`); the combined 1200/3000 limit **is summed correctly across tabs** (not per-tab); `force-dynamic` + `private, no-store` are correct for per-tenant financial data; empty estimates build a valid workbook gracefully.

---

## Prioritized recommendations (impact × effort)

| # | Recommendation | Impact | Effort | Addresses |
|---|---|---|---|---|
| 1 | **Fetch-then-blob download with error handling** — check `response.ok`/content-type, blob-download on success, render `{error,limits}` in the dialog | **Very high** | Low | PR-1, UX-4, 413/404 delivery |
| 2 | **Route-level try/catch + structured logging** (`{estimateId, tabCount, rowCount, durationMs, outcome}`) + `Promise.allSettled` for tabs | High | Low | PR-2, partial-tab/TOCTOU |
| 3 | **De-duplicate all-tabs DB reads** — fetch workspace/project/estimate once, then per-tab nodes+rows (or 2 bulk `estimate_id`-scoped queries grouped in memory). ~5T queries → ~3 | High | Medium | PR-3 |
| 4 | **Confirm/add indexes** on `estimate_nodes(estimate_tab_id, sort_order)` and `estimate_row_items(node_id, sort_order)` | Med–High | Low | DB scaling (unverified — DB channel unavailable) |
| 5 | **Short-circuit oversize before full fetch** in all-tabs | Medium | Low–Med | PR-6 |
| 6 | **Reuse preview model / revision-keyed cache** for download | Medium | Med–High | PR-4, PR-5 |
| 7 | **Web Worker for preview build** if latency becomes user-visible | Low–Med | Medium | UX-7 jank |
| 8 | **Set explicit `maxDuration`** (e.g. 30–60 s) | Low | Low | PR-7 |
| 9 | **Adopt `stream.xlsx.WorkbookWriter`** — *only if caps rise* (present in exceljs 4.4.0); caps memory at one sheet | Low now / High if scaled | High | memory ceiling on growth |
| 10 | **Right-size caps with intent** — 1200/3000 are conservative given 0.5 MiB / 0.5 s headroom; raise only **with** #2/#9 in place | Low | Low | scalability headroom |
| 11 | **Wire the benchmark into `package.json`** (`bench:proposal-workbook`) as a regression gate — harness exists but isn't a script | Low | Low | perf regression safety |

**Quick wins:** #1 and #2 are both low-effort and remove the two most user-visible failure modes. #4 is a one-line DB check.

**Coverage: ~95%.** Not verified: live DB indexes (DB channel unavailable per project constraints); exact Vercel `maxDuration`/memory defaults; cold-start timing (benchmarks are warm-local only).
