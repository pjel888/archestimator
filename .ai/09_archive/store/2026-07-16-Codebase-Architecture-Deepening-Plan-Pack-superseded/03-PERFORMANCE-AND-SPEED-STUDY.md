# 03 — Performance & Speed Study

<!-- FRONTIER-PLAN-SUITE: 2026-07-12 · suite_version 2026-07-12 -->
**Pack:** Codebase Architecture Deepening · **Date:** 2026-07-16 · **Status:** PLANNING
**Scope:** Names the measurable signals and regression guards for the deepening units. **No benchmarks are run.** All claims are read from source; every number below was grepped or opened before writing (fingerprints in §7). Study-local IDs (`RISK-ARCH-PERF-*`, `DEC-ARCH-PERF-*`, `EV-ARCH-PERF-*`) are introduced here for doc `06` to fold into the canonical `RISK-ARCH-*` / `DEC-ARCH-*` registry.
**Gate:** GATE-PERF-01 (all render/query-touching units).

---

## 1. Summary table

| Unit | Perf dimension | Expected effect | Measurable signal (today, audited) | Regression guard |
|------|----------------|-----------------|------------------------------------|------------------|
| **01** Estimate-tree read module | query + bundle (server) | neutral-to-improve | 6 entry points, 27 call-sites total; `LIMIT+1` over-fetch guard at `workspace-repository.ts:4052` (nodes) & `:4063` (rows); private chain `3991-4088` | DB-time per tree read; row/node fetch parity (count rows fetched pre/post = identical for a fixed tab) |
| **02** Component write-repository | query (round-trips) + bundle (server) | neutral (atomicity preserved) | `runAtomicBatch` (`actions.ts:247`) hard-requires D1 `database.batch`; 8 call-sites; biggest plan `buildComponentPriceOptionWritePlan` `1796-2258` (462 lines) | statement-count parity per mutation (the batch array length is the contract); one D1 round-trip preserved |
| **03** RowMutationCoordinator | render (client) | improve | `UseEstimateRowHandlersInput` = **40 fields** at `use-estimate-row-handlers.ts:97-138`; the orchestrator object is rebuilt every render of `EstimateSheetContent.tsx` (3680 lines) | render-probe counts (`reportEstimateRowItemRender`) on a keystroke; expect ≤ baseline |
| **04** Row commit/dirty/routing | render + test-runtime | improve | `EstimateRowItemTableRow` spans `row-table.tsx:332`→~1339; 4 commit closures (`509/548/596/611`) re-created per row per render | render-probe per-row count; new interface test crosses the seam (test-runtime drops — pure rules leave the untested orchestrator) |
| **05** Collapse prop-drilling | render (client) | improve + risk | **~112 lines** of hand-written memo comparators: `areEstimateSheetBranchPropsEqual` `branch.tsx:157-224` (68) + `areEstimateRowItemsTablePropsEqual` `row-table.tsx:131-174` (44); 22-handler `Pick` at `branch.tsx:88` | render-probe branch+table+row counts on a targeted keystroke (the decisive signal); **context-placement guard** (RISK-ARCH-PERF-02) |
| **06** Delete pass-through reducers | render (client) | neutral-to-improve | 16+19+1 reducer cases that are one-line field assignments; each setter wrapper is a new closure identity per render | render-probe; `useStableCallback` identity is the existing invariant — keep it |
| **07** Hoist Component/Folder mutation | render + bundle (client) | improve | `index.tsx` 3634 lines + `ComponentLibraryManager.tsx` 3160 lines; 31 duplicated generation-rollback ref lines | render-probe on folder CRUD; statement-count parity for move/archive |
| **08** last-owner invariant | query (trivial) | neutral | 3 SQL `EXISTS` predicates (`:466/559/616`) + 1 TS helper (`:511`); one-shot admin path | existing auth/ownership tests; predicate-count drops 4→1 encoding, behaviour identical |
| **09** BetaOperatingSnapshot adapters | bundle (trivial) | neutral-to-improve | ~50 duplicated lines across 6 adapters; `buildBetaOperatingOverview` already deep | admin page render unchanged; bundle slice delta negligible |
| **A1** display-transform pipeline | render (client) | improve (memo hygiene) | `EstimateSheetContent.tsx` identity invariant ("same node when mode==='default'", `:890`); filter/facet/group helpers re-run per render today | render-probe `reportEstimateSheetContentRender`; identity-stability assertion (displayedSheetNode referential equality in default mode) |

Net: the program is **not** a latency optimization. It is a locality/leverage refactor whose perf effects are dominated by **render-path hygiene** (03/04/05/06/07/A1, client) and **bundle/tree-shake clarity** (01/02, server). The query path (01/02) is **behaviour-preserving by contract** — the signal is parity, not improvement.

---

## 2. Render-path units (03, 04, 05, 06, 07)

### 2.1 What the render path pays today

The sheet is a four-layer `memo` chain: `EstimateSheetContent` → `EstimateSheetBranch` (memo, `branch.tsx:621`) → `EstimateRowItemsTable` (memo, `row-table.tsx:1396`) → `EstimateRowItemTableRow` (memo, `row-table.tsx:332`). Each layer carries a **hand-written comparator** that re-implements React's equality by hand because the props are too wide for `React.memo`'s default shallow check:

- `areEstimateSheetBranchPropsEqual` — `branch.tsx:157-224`, **68 lines**, ~33 field comparisons plus a per-node totals lookup (`Object.is` on a `Map.get`, `:203`) and two helper predicates (`branchNodePendingStateChanged`, `branchRowStateChanged`).
- `areEstimateRowItemsTablePropsEqual` — `row-table.tsx:131-174`, **44 lines**, including a **per-item loop** (`:166-172`) that slices shared sheet state (selection / mutation-status / sync-pending / promoting / express-draft) down to only the rows in that table.

The comment at `row-table.tsx:127-130` states the invariant verbatim: *"a keystroke in one area's table must not re-render every other table. Callback props must be identity-stable (`useStableCallback` in `EstimateSheetContent`) — a changed callback identity forces a re-render."* That is the whole performance contract — and it is enforced only by **two things**: (a) the comparators, and (b) every callback being wrapped in `useStableCallback`. There is no test asserting render counts; the only contract test (`tests/vitest/estimate-sheet-unit-003-contracts.test.ts:37-42`) asserts the comparator **anchor strings exist** via `indexOf` — it does not exercise them.

The 38→**40**-field row-handler hook (`use-estimate-row-handlers.ts:97-138`) is consumed by `EstimateSheetContent.tsx` and **rebuilt on every render** of that 3680-line module. The 40 fields are 9 row-mutation functions + 3 mutation-status helpers + 6 setters + 22 state slices. Every downstream `useStableCallback`/closure that closes over it pays the allocation; the orchestrator itself is untested (the pure rules in `editable-row-model.ts` are tested — `estimate-sheet-extracted-models.test.ts`, 8 cases — but the wiring beside them is not).

### 2.2 What deepening changes

Per-row render is **already** correctly driven by a zustand selector — `row-table.tsx:378`: `useStore(editableRowStore, (state) => state.rows[item.id])`. That is the right shape. The deepening units lean on it rather than fighting it:

- **05** replaces the ~112 lines of comparator logic + the 22-handler `Pick` (`branch.tsx:88`) with a narrower interface behind a context/selector. The comparator machinery is deleted, not widened.
- **03** collapses the 40-field hook into a `RowMutationCoordinator` with ~5 inputs, so the per-render allocation drops from one 40-field object + N closures to one coordinator reference (stable via `useStableCallback`/ref).
- **04** lifts the 4 commit closures (`commitExpressFields:509`, `commitQuantityFields:548`, `commitRowAdjustmentPercentage:596`, `commitContingencyPercentage:611`) and the `onUpdateLinkedLibraryComponent` vs `onUpdateRowItem` routing rule into the coordinator — these stop being re-created per row per render.
- **06** deletes the ~36 setter wrappers whose closure identity churn is a latent re-render source (today suppressed only by `useStableCallback`).

### 2.3 The render-storm risk and its guard — RISK-ARCH-PERF-02

`RISK-ARCH-PERF-02 (HIGH):` **A context provider placed at the wrong level re-renders the whole sheet on every keystroke.** The current prop-drilling, for all its ugliness, gives each `memo` layer its own comparator gate. A naive "just use Context" replacement that puts the sheet-wide state on a single provider above the branch layer **deletes that gate** — every consumer of the context re-renders when any slice changes. The correct deepening uses either (a) split contexts per concern (selection / mutation-status / drafts), or (b) a zustand store (the pattern already proven at `editableRowStore`, `row-table.tsx:378`) consumed via narrow selectors.

**Guard (cheapest decisive):** the existing render-probe harness (`estimate-sheet-render-probe.ts`). It is **null in production** (one null-check per render site — `reportEstimateRowItemRender`/`reportEstimateSheetBranchRender`/`reportEstimateRowItemsTableRender` no-op when no probe is installed) and **installed by tests** to count renders by id. The regression guard for 03/04/05/06/07 is: install the three probes, fire one keystroke in one table, assert the other tables' row-render counts are **zero** (or unchanged from baseline). This is the same signal the comparators exist to protect, finally asserted instead of inferred.

`EV-ARCH-PERF-01`: probe call-sites — `reportEstimateRowItemRender` at `row-table.tsx:376`, `reportEstimateRowItemsTableRender` at `row-table.tsx:1108`, `reportEstimateSheetBranchRender` at `branch.tsx:228`, plus `reportEstimateSheetContentRender` and node-total/proposal-signature probes in `estimate-sheet-render-probe.ts`.

`DEC-ARCH-PERF-01:` prefer the **zustand-store + narrow-selector** seam (proven at `editableRowStore`) over React Context for any sheet-wide slice that changes per keystroke. Context is acceptable only for read-only/near-static values (brand/supplier options, projectId).

---

## 3. Query-path units (01, 02)

### 3.1 UNIT-ARCH-01 — the estimate-tree read chain

Six entry points descend a **single private chain** at `workspace-repository.ts:3991-4088`:

```
getEstimateTabTreeForResolvedEstimate (3991)
  → …ForResolvedEstimateTab (4015) → …ForResolvedTabId (4025)
    → readEstimateTabTreePayloadForResolvedTabId (4040)   ← the real work
```

`readEstimateTabTreePayloadForResolvedTabId` is the spine. It runs **two queries in parallel** (`Promise.all`, `:4048`): `readEstimateNodes` and `readEstimateSheetAdjustment`, then a third `readEstimateRows` (`:4060`, conditional on node ids). Both node and row reads carry the **`LIMIT+1` over-fetch guard** (`:4052` nodes, `:4063` rows) that powers `didExceedNodeLimit`/`didExceedRowItemLimit` in `loadLimitState` (`:4068-4077`). Call-site distribution (grep-verified, excluding the defining file):

| Entry point | Call-sites |
|---|---|
| `getEstimateTabTree` | **12** |
| `getProjectEstimateTreeByEstimate` | **8** |
| `resolveEstimateTabRouteContext` | **3** |
| `getEstimateNodeSubtree` | **2** |
| `getEstimateTreesForTabs` | **2** |
| `getProjectEstimateTreeByNode` | **0** |

`RISK-ARCH-PERF-01 (MED):` **N+1 / over-fetch drift when the 6 entry points are collapsed.** Five of the six are live; one (`getProjectEstimateTreeByNode`) has zero callers and is a deletion candidate. Deepening must preserve (a) the single `Promise.all` (do not fan the two parallel reads into serial), and (b) the `LIMIT+1` guard and the `loadLimitState` shape — the UI consumes `didExceed*Limit` to render truncation affordances.

**Signal (cheapest):** statement-count and rows-returned parity for a fixed tab id, pre vs post. The read module must issue the **same number of SQL statements** and return **byte-identical** `tree`/`loadLimitState` for the same inputs. DB wall-time is a secondary signal (dominated by network RTT to hosted D1 — see §6).

**What deepening UNLOCKS (not hypothetical):** one read module behind one interface is the precondition for a **shared tree-read cache** keyed by `(estimateId, tabId, revision)`. Today each of the 27 call-sites may re-enter the chain; the no-op `clearEstimateRouteContextProcessCache` (`workspace-repository.ts:4090`, body `void projectId;`) is a fossil of a cache that was removed while its invalidation call-sites stayed (`estimates/actions.ts:2291,3807,4070` + `express-promotion-actions.ts:927`). A real cache now has one seam to live behind. This is a **future** option, not part of the behaviour-preserving unit — but only 01 makes it possible.

### 3.2 UNIT-ARCH-02 — the write-repository and atomicity

All Component writes funnel through **`runAtomicBatch`** (`actions.ts:247`), which **hard-requires** D1 atomic batch support:

```ts
// actions.ts:251
if (!database.batch) throw new Error("Cloudflare D1 atomic batch support is required for component updates.");
```

It has **8 call-sites** (`1717, 2717, 3667, 3785, 3806, 3877, 3985`, plus the def). Each call is **one D1 round-trip** executing N prepared statements atomically — the entire fan-out for a mutation lands in a single batch. The largest plan-builder, `buildComponentPriceOptionWritePlan` (`1796-2258`, 462 lines), produces the statement array for `createCostLibraryComponent`'s `runAtomicBatch(database, statements)` at `:2717`.

`RISK-ARCH-PERF-03 (HIGH):` **deepening the write-repo must not split one batch into many.** Moving SQL out of `actions.ts` into a write-repository is a relocation, not a re-plan. The contract is: **the `statements` array handed to `runAtomicBatch` is identical, statement-for-statement, before and after.** If a "deepening" accidentally serializes the fan-out (await each statement), atomicity AND latency both regress — one round-trip becomes N.

**Signal (decisive):** `statements.length` parity per mutation (the batch array length is the contract surface), plus assertion that every write path still routes through the single `runAtomicBatch`. No new `database.batch` call-sites appear; none disappear.

**Table-leakage today** (grep-verified counts, `actions.ts` vs `component-library-repository.ts`): `upload_assets` 10/0, `component_variant_attachments` 7/2, `cost_library_item_variant_cost_entries` 6/2, `estimate_sheet_events` 2/0. The write-repo consolidation moves all 10+7+6+2 write-table references behind one interface — locality, not latency. The read-repository already exists (`component-library-repository.ts`, 2361 lines); writes bypass it today.

---

## 4. Bundle / cold-start

This is where the god-file splits pay the most defensible dividend, and it splits cleanly by server/client boundary:

**Server-only (tree-shakeable once split, never shipped to client):**
- `workspace-repository.ts` — **4441 lines** (UNIT-01). Already server-side; the win is **navigability + test-load cost**, not client bytes. Vitest must currently parse a 4441-line module to reach any one read function.
- `component-library/actions.ts` — **5545 lines** (UNIT-02). `"use server"`; same: parse cost on import, and a `next build` surface (memory: a non-async `"use server"` export is only caught by `next build`).
- `estimates/actions.ts` — **4197 lines** (auxiliary A3 surface).

**Client (shipped):**
- `EstimateSheetContent.tsx` — **3680 lines** (UNIT-03/06, aux A1). Single client module; the 40-field hook + reducer + display-transform all live here.
- `component-library/index.tsx` — **3634** + `ComponentLibraryManager.tsx` — **3160** (UNIT-07). Two near-duplicate client modules.
- `rows/cells.tsx` — **1486 lines** (aux A4 image-upload excise target).
- `row-table.tsx` — **1396** (UNIT-04/05).

`RISK-ARCH-PERF-04 (LOW):` **client bundle regression from a mis-placed seam.** Splitting a client god-file is only bundle-neutral-or-better if the new modules are consumed via the existing import graph and do not pull server-only code (`D1DatabaseLike`, server actions) across the `"use client"` boundary. `next build`'s client chunk size is the guard. The risk is low because 01/02 are server-side and 03/04/05/07 are already client-side — the boundary does not move, the code just relocates within its own side.

**Signal:** `next build` client reference manifest chunk size for the workshop route (the build is already a verification surface for 02/03/07 per §9 of the executive direction). No new harness needed.

`DEC-ARCH-PERF-02:` the bundle win for this program is **server-side parse/test-load cost and navigability**, not client bytes. Do not claim a client bundle reduction for 01/02 — they are already server-only. Claim client hygiene (smaller per-render allocations, deleted comparators) only for 03/04/05/06/07.

---

## 5. Optimization opportunities deepening UNLOCKS

Stated as cause→effect, each gated on its unit landing first (no speculation):

1. **(gated on 01)** A real estimate-tree read cache behind one interface, with the fossilized invalidation call-sites (`clearEstimateRouteContextProcessCache` no-op, 4 callers) either revived or deleted for honesty. Today impossible — 27 call-sites enter the chain through 6 shapes.
2. **(gated on 02)** Batched fan-out as a first-class write-repository operation: the 8 `runAtomicBatch` call-sites become 8 method calls on one module, and the statement arrays become inspectable/testable without executing the action. Atomicity is unchanged; **testability** of the write plan is the unlock.
3. **(gated on 05)** Selector-level memoization: once the 22-handler `Pick` and the two comparators are gone, per-row render is driven **only** by the zustand selector at `row-table.tsx:378`. Render cost becomes a function of which slices a row subscribes to — the documented target architecture.
4. **(gated on 03)** A testable `RowMutationCoordinator`: the orchestrator (today untested) becomes the test surface, so optimistic-update/rollback correctness stops relying on the pure-helper tests in `editable-row-model.ts` which deliberately do not cover wiring.
5. **(gated on 06)** Closure-identity stability stops being a `useStableCallback` chore spread across ~50 wrappers and becomes a property of ~5 coordinator methods.
6. **(gated on 07)** One generation-rollback ref discipline instead of 31 duplicated lines across two client modules — a correctness/perf double win (no double rollback-bookkeeping allocations).

---

## 6. Regression signals & cheapest decisive measurements (GATE-PERF-01)

Ordered cheapest-first. **None are run in this pack** (planning only; `TEST_PROPOSAL` at most). Execution needs a future `TEST_TASK` authorization.

| Signal | What it proves | Harness (read-only reference) | Applies to |
|---|---|---|---|
| **Render-probe counts** (primary) | A keystroke in one table re-renders only that table's rows; comparators/context placement did not regress | `estimate-sheet-render-probe.ts` — install `setEstimateRowItemRenderProbe` / `setEstimateSheetBranchRenderProbe` / `setEstimateRowItemsTableRenderProbe`, count by id | 03, 04, 05, 06, 07, A1 |
| **Statement-count parity** | Tree reads & write batches issue the same SQL count, same array length, pre/post | A vitest that snapshots `statements.length` and the read call count | 01, 02, 07, 08 |
| **Tree-row byte parity** | Same `tree` + `loadLimitState` for a fixed `(estimateId, tabId)` | Vitest fixture diff | 01 |
| `next build` clean + client chunk size | Server/client boundary intact; no `"use server"` non-async export; client bytes did not regress | `next build` (already a verification surface for 02/03/07) | 01, 02, 03, 07 |
| Hero-path route transition time | Sheet open / navigation did not regress end-to-end | `scripts/bench-hero-browser.mjs` (real browser, `[data-route-overlay]` signal, **production `next start` build only — `next dev` numbers are compilation-dominated and meaningless**, per the harness header) | end-to-end smoke (01's read path feeds the sheet) |

`DEC-ARCH-PERF-03:` **the render-probe is the decisive guard for the render-path units, not wall-clock.** Wall-clock render time is noisy and dominated by the dev-server; the probe gives exact per-id counts. For 01/02 the decisive guard is **statement-count + byte parity**, not DB wall-time — DB time is network-bound to hosted D1 (RTT 0.3–5s/call locally; see memory `hero-path-perf-network-bound`) and only meaningful measured in-region on Vercel.

Existing related harnesses (read-only options, do not invoke in this pack): `scripts/bench-hero-server.mjs`, `scripts/collect-live-db-performance-evidence.ts`, `scripts/check-performance-budgets.mjs`, `scripts/measure-library-performance-baseline.ts`. These measure product paths, not the refactor's contract surface — use the probe + parity signals above as primary.

---

## 7. Evidence fingerprints + Gaps

### Evidence fingerprints (all grepped/opened 2026-07-16)

- `EV-ARCH-PERF-01` — render-probe call-sites: `row-table.tsx:376` (`reportEstimateRowItemRender`), `row-table.tsx:1108` (`reportEstimateRowItemsTableRender`), `branch.tsx:228` (`reportEstimateSheetBranchRender`); module `src/components/workshop/estimate-sheet-render-probe.ts` (null-in-prod, 8 probe types incl. content/node-total/proposal-signature).
- `EV-ARCH-PERF-02` — comparators: `branch.tsx:157-224` (68 lines), `row-table.tsx:131-174` (44 lines, per-item loop `166-172`); invariant comment `row-table.tsx:127-130`; contract test asserts anchor strings only at `tests/vitest/estimate-sheet-unit-003-contracts.test.ts:37-42`.
- `EV-ARCH-PERF-03` — zustand per-row selector: `row-table.tsx:378` `useStore(editableRowStore, (state) => state.rows[item.id])`.
- `EV-ARCH-PERF-04` — 40-field hook: `use-estimate-row-handlers.ts:97-138` (9 mutation fns + 3 status helpers + 6 setters + 22 state slices); pure+tested sibling `editable-row-model.ts` (tested by `estimate-sheet-extracted-models.test.ts`, 8 cases).
- `EV-ARCH-PERF-05` — Row commit closures: `row-table.tsx:509/548/596/611`; `EstimateRowItemTableRow` span `332`→`1339` in a 1396-line file.
- `EV-ARCH-PERF-06` — 22-handler `Pick`: `branch.tsx:88` (22 handlers confirmed by count).
- `EV-ARCH-PERF-07` — read chain: private spine `workspace-repository.ts:3991-4088`; `LIMIT+1` guards `:4052` (nodes) & `:4063` (rows); `Promise.all` at `:4048`; `loadLimitState` `:4068-4077`; entry-point callers 12/8/3/2/2/0.
- `EV-ARCH-PERF-08` — dead/no-op seams: `clearEstimateRouteContextProcessCache` `workspace-repository.ts:4090-4092` (`void projectId;`), 4 callers (`estimates/actions.ts:2291,3807,4070`, `express-promotion-actions.ts:927`); `estimateRepository` only at `estimate-repository.ts:108`, 0 importers.
- `EV-ARCH-PERF-09` — write atomicity: `runAtomicBatch` `actions.ts:247-251` (hard-requires `database.batch`), 8 call-sites (`1717,2717,3667,3785,3806,3877,3985`); `buildComponentPriceOptionWritePlan` `1796-2258`; `buildLinkedEstimateRowsSyncStatement` `615`; `buildUpdateCostLibraryComponentFanOutStatements` `2895`.
- `EV-ARCH-PERF-10` — table leakage (actions.ts / read-repo): `upload_assets` 10/0, `component_variant_attachments` 7/2, `cost_library_item_variant_cost_entries` 6/2, `estimate_sheet_events` 2/0.
- `EV-ARCH-PERF-11` — god-file sizes: `workspace-repository.ts` 4441, `component-library/actions.ts` 5545, `estimates/actions.ts` 4197, `EstimateSheetContent.tsx` 3680 (at `src/components/workshop/`), `component-library/index.tsx` 3634, `ComponentLibraryManager.tsx` 3160, `cells.tsx` 1486, `row-table.tsx` 1396.
- `EV-ARCH-PERF-12` — hero-path harness: `scripts/bench-hero-browser.mjs` header — real browser via Kimi WebBridge, `[data-route-overlay]` signal, production `next start` only.

### Gaps / open questions

1. **`displayedSheetNode` memo exact line.** The auxiliary A1 claim anchors the identity-invariant memo at `EstimateSheetContent.tsx:1777-1786`; the verified identity invariant comment ("Returns the SAME node when mode === 'default' (identity preserved)") sits at `:890`, and the memo is referenced throughout. The exact memo block drifted from the review's anchor — the invariant *exists* (confirmed), but the line number needs re-pinning by whoever executes A1. Not blocking; A1 is optional Phase-4.
2. **No baseline render counts captured today.** The probe exists but no checked-in test installs it to record a baseline. The first execution task for any of 03/04/05 should **capture the baseline** before refactoring, or the "≤ baseline" guard has no number. (This is a `TEST_PROPOSAL`, not executed here.)
3. **`getProjectEstimateTreeByNode` (0 callers) — confirm dead before deletion.** Zero grep call-sites outside the defining file is strong, but the unit should re-confirm via the graph (`query_graph_tool` pattern `callers_of`) at execution time before deleting, in case of an indirect/dynamic reference the grep misses.
4. **Whether a shared tree-read cache (§5.1) is wanted at all** is a product decision (memory tradeoff vs freshness), not a perf finding. Flagged for `06` / the lead; the perf study only notes 01 *enables* it.
5. **D1 round-trip count for the parallel read** (`Promise.all` of 2, then a conditional 3rd) — deepening should preserve the parallelism but the *measured* RTT is only meaningful in-region on Vercel; locally it is network-bound and misleading (per memory `hero-path-perf-network-bound`). No local number should be treated as a regression signal for 01.
