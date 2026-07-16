# 03 — Performance and Optimization Study

Consolidated analysis of every performance finding, with complexity (before/after), why it matters at archestimator's scale, and the optimization. All complexity claims are derived from the code read during vetting, not estimated.

## P-1 — `resolveComponentCategory` Map rebuild (UNIT-002 / F-05) — **highest leverage**

**Code:** `category-folders.ts:34` builds `new Map(folders.map((f) => [f.id, f]))` inside `resolveComponentCategory`, called once per library item during normalization (`component-library-repository.ts:626` → mapped over every row at `:1037`).

**Complexity:**
- Today: `O(items × folders)` Map constructions + `O(items × depth)` path walks. For a workspace with I items, F folders, average depth D: ~`I·F` map entries allocated and discarded per render/request, plus `I·D` lookups.
- After: build the `folderById` Map **once** (`O(F)`), resolve all items against it (`O(I·D)`). Allocations drop from `I·F` to `F`.

**Why it matters:** library normalization runs on every browse/manager render and every AI package-builder read (`apply.ts:339,1840`, `read-tools.ts:907`). At I=2,000 components / F=80 folders that's ~160k throwaway map entries per load today → `F=80` after.

**Optimization:** `resolveComponentCategories(folders, items)` builds the Map once and returns resolved categories; callers pass a stable resolver. **In-repo precedent:** `aggregate-project-charts.ts:19-20` documents the identical fix ("built ONCE per series instead of once per row"). Effort S, risk LOW.

**Measurement:** `bun run perf:library-baseline` (exists) before/after on a seeded fixture (`perf:seed-fixture`).

## P-2 — D1 batch statement/parameter guard (UNIT-005 / F-08)

**Code:** `d1-batch.ts:13` runs `db.batch(statements)` with no limit check; `action-inbox-repository.ts:142` calls `db.batch([...upserts, resolveStmt])` directly (unbounded by incident count). The safe constant already exists: `assertD1MutationStatementLimit` (`mutation-receipts.ts:52`), used by `template-mutations.ts:128`.

**Complexity/risk:** not a hot-path cost today (callers build small fixed batches), but a latent ceiling. D1's per-batch bound-parameter ceiling is ~32,766; an `IN (?, ?, …)` built from an unbounded list (e.g. all workspace items) hits a runtime rejection with no early, clear error. The action-inbox reconcile is the one current path that scales with data (one statement per open incident) and is wrapped in a swallow-on-error `try/catch` — a ceiling hit silently stops reconciliation.

**Optimization:** route through `assertD1MutationStatementLimit` in `runRequiredD1Batch` (protects all callers) and in the action-inbox direct batch; chunk over-limit batches. Effort S, risk LOW (reuse the existing constant). This is the **root guard** that UNIT-007/013/016 sit on top of.

## P-3 — Upload-removal matching index (UNIT-007 / F-12)

**Code:** `removal-claims.ts:189-199` matches `upload_assets` by `(workspace_id IN (…), surface, storage_bucket, storage_path IN (…) OR thumbnail_path IN (…))`. Current indexes (`0010:115,121,124`, `0084:95,104`) lead with `workspace_id,created` / `purge_state,…` — none with `(workspace_id, surface, storage_bucket, storage_path)`.

**Complexity:**
- Today: each removal claim does a workspace-wide scan of `upload_assets` (filtered to `workspace_id` via `idx_upload_assets_workspace_created`) then in-memory matches surface/bucket/path. `O(workspace_assets)` per request; the cleanup job repeats it per purge candidate.
- After: a composite `(workspace_id, surface, storage_bucket, storage_path)` index → `O(log + matches)`.

**Optimization:** additive `CREATE INDEX IF NOT EXISTS idx_upload_assets_lookup_path ON upload_assets(workspace_id, surface, storage_bucket, storage_path);` (and/or a `thumbnail_path` variant). Effort S, risk LOW. Write-cost is the only trade-off (one more index to maintain on upload write) — acceptable.

## P-4 — Component-library "load all" unbounded scan (UNIT-013 / F-19)

**Code:** `component-library-repository.ts:557-570` — `for (let offset = 0;; offset += PAGE_SIZE) { … LIMIT ? OFFSET ? … }` until exhausted, accumulating all rows. `isPartial` (`:1067`) is already plumbed but unused by this path.

**Complexity:**
- Today: `O(N²/PAGE)` row-reads — each `OFFSET` page re-reads all prior rows. For N items in pages of P: total rows scanned ≈ `N²/(2P)`. Plus the whole library loaded into memory. Analogous to the documented BLK-02 unbounded-projects query, but on `cost_library_items`.
- After: enforce a maximum page count / row ceiling and return `isPartial:true` past it; prefer keyset pagination (`WHERE id > last_id ORDER BY id LIMIT ?`) → `O(N)` with no re-reads.

**Optimization:** cap + `isPartial` signal (smallest change) or keyset (better). Effort M, risk LOW.

## P-5 — `json_tree` reference scan (UNIT-016 / F-22) — **largest**

**Code:** `removal-claims.ts:47-169` `uploadAssetAcceptedReferencePredicate` runs `json_tree(...)` over JSON columns of ~10 tables (projects, cost_library_items + price_options + versions + price_history, estimate_row_items, estimate_template_row_items, estimate_sheet_events (5 JSON cols), project_publications). Invoked in the removal UPDATE (`:257`) **and** again in the diagnostic (`:287`); re-run per purge candidate in `cleanup-job.ts:477`.

**Complexity:**
- Today: `json_tree` is a table-valued function that materializes every node of every row's JSON — **no B-tree index can help**. Per asset evaluated: `O(Σ rows × payload_size)` across the workspace-bounded scans. Bulk purge of N assets = N full workspace JSON scans across ~10 tables; the no-claim path runs it twice.
- After: a denormalized `upload_asset_references(upload_asset_id, …)` table maintained by triggers on the consuming tables; the predicate becomes an indexed `EXISTS` → `O(log refs)`.

**Why it matters:** this is the dominant cost of the upload-purge subsystem and scales with both asset count and workspace JSON volume. Today it is acceptable at alpha scale; it is the first thing to break at a few hundred components × multiple estimates.

**Optimization:** the reference-tracking table (UNIT-016). Effort L, risk MED (must keep the table consistent on every write). **Depends on UNIT-007** (which refactors the predicate this table replaces).

**Trade-off note:** until scale demands it, the `json_tree` heuristic is *correct* (it caught a would-be data-loss blind spot during vetting — see `01` §C) and the cleanup job's final re-check is the storage backstop. UNIT-016 is "do when upload volume grows," not "do now."

## P-6 — Estimate mutation god-module (UNIT-014 / F-20) — structural, perf-adjacent

Not a hot-path cost, but `d1-action-client.ts` (6,261 LOC) mixes a from-scratch query builder, the action client, history-event insertion, and receipt helpers. Every estimate mutation, history, or receipt change lands here; regressions radiate into pricing/export/publication. Splitting it is a maintainability + testability win (characterization tests become possible) more than a runtime win. Effort L, risk HIGH → characterization-first.

## Aggregate optimization order (by ROI at alpha scale)

1. **P-1** (Map rebuild) — S effort, removes a per-render `O(I·F)` allocation, has in-repo precedent. Do first.
2. **P-2** (batch guard) — S effort, prevents a silent ceiling failure on the only data-scaling path (action-inbox). Do early; it's the root guard.
3. **P-3** (removal index) — S effort, additive, turns a workspace scan into a lookup.
4. **P-4** (load-all cap/keyset) — M effort, removes `O(N²)` row reads.
5. **P-5** (reference table) — L effort, the real upload-purge scaling fix; defer until volume grows (depends on P-3's host UNIT-007).
6. **P-6** (god-module split) — L effort, structural; characterize first.

## What is NOT a perf finding (recorded)

- Hero-path local latency is **network-bound** (dev→hosted-Supabase RTT), not code. Measure in-region on Vercel. Do not "fix" locally.
- The workshop dashboard query-batching plan (`.ai/03_plans/2026-06-19-Workshop-Dashboard-Query-Batching/`) is a separate, already-planned surface; not re-planned here.
- The serial auth waterfall is an **invariant** (fail-fast denial), not a perf bug.
