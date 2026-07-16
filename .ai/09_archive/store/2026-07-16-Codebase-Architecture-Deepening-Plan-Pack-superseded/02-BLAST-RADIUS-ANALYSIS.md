# 02 — Blast-Radius Analysis

<!-- FRONTIER-PLAN-SUITE: 2026-07-12 · suite_version 2026-07-12 -->
**Pack:** Codebase Architecture Deepening · **Date:** 2026-07-16 · **Status:** PLANNING
**Scope:** Evidence-supported blast radius for UNIT-ARCH-01..09 (+ AUX A1..A6 notes).
**Method:** Every symbol/line below was re-verified against live source on 2026-07-16 (grep is ground truth; `code-review-graph` MCP used for intra-file call edges and flow hints). The source review (HTML) is the starting reference; where it drifted, the verified number wins and the drift is logged in §5 Gaps.

**ID convention used here:** Evidence is `EV-ARCH-01..09` (core) and `EV-ARCH-A1..A6` (aux) — allocated per-unit, this doc's lane. Blast-radius risks use the **`RISK-ARCH-BR-NN`** sub-series and deletion-test verdicts use the **`DEC-ARCH-BR-NN`** sub-series, so they cannot collide with the canonical `RISK-ARCH-NN` / `DEC-ARCH-01..05` registers allocated in `06-RISKS-DECISIONS-AND-NON-GOALS.md`. `06` may promote any `BR` item into its canonical series; `07-TRACEABILITY-MATRIX.md` reconciles.

---

## 1. Summary table

"Direct callers" = distinct **call sites** verified by grep (the review's higher figures counted `import` lines too; call-site counts are the load-bearing number for blast radius).

| Unit | Primary symbol(s) · file:line | Direct callers (call sites) · top 3 | Affected flows | Risk | Deletion-test verdict |
|------|-------------------------------|--------------------------------------|----------------|------|-----------------------|
| **UNIT-ARCH-01** | `getEstimateTabTree` ws-repo:3832; `getProjectEstimateTreeByEstimate`; `resolveEstimateTabRouteContext`; `getEstimateNodeSubtree`; `getEstimateTreesForTabs`; `getProjectEstimateTreeByNode` (0 callers) — `workspace-repository.ts` (4441 ln) | `getEstimateTabTree` 6 sites / 3 modules; `getProjectEstimateTreeByEstimate` 4 / 3; `resolve…RouteContext` 1; `Subtree` 1; `ForTabs` 1 — top: `estimates/actions.ts`, `reusable-sources/actions.ts`, `export/proposal.xlsx/route.ts` | Estimate-sheet load, proposal export, reusable-source copy/promote, subtree fetch | **MED** | earns-keep (real behaviour) + 2 false seams to delete (`estimate-repository.ts`, `clearEstimateRouteContextProcessCache`) |
| **UNIT-ARCH-02** | `createCostLibraryComponent` actions:2539; `updateCostLibraryComponentWithPriceOptions`:3007; `buildComponentPriceOptionWritePlan`:1796; `buildLinkedEstimateRowsSyncStatement`:615; `buildUpdateCostLibraryComponentFanOutStatements`:2895 — `component-library/actions.ts` (5545 ln) | `createCostLibraryComponent` 2 prod (AddComponentModal `submit`, `duplicateCostLibraryComponent`) + 4 tests; `update…WithPriceOptions` similar — top: `AddComponentModal.tsx`, internal `duplicateCostLibraryComponent` | Component create/update, duplication, variant fan-out, linked-Row sync, reference-image upload | **HIGH** | earns-keep-misplaced (write SQL belongs in a write-repository, not an actions file) |
| **UNIT-ARCH-03** | `useEstimateRowHandlers` hook (1503 ln); `UseEstimateRowHandlersInput` (~38 fields) use-estimate-row-handlers.ts:97 | **1 caller:** `EstimateSheetContent.tsx:2244` | Every Row mutation in the sheet (insert/move/promote/delete/restore/express-insert) | **HIGH** | earns-keep-misplaced (orchestrator untested; pure helpers beside it ARE tested → locality missing) |
| **UNIT-ARCH-04** | `commitExpressFields` row-table:509; `commitQuantityFields`:548; `commitRowAdjustmentPercentage`:596; `commitContingencyPercentage`:611; `EstimateRowItemTableRow` — `rows/row-table.tsx` (1396 ln) | Rendered per-row (zustand selector row-table.tsx:378); commit fns invoked from cell blur/change | Row commit, dirty reconciliation, linked-Component vs RowItem routing | **MED** | earns-keep (commit/dirty/routing rules are real); pure model in `editable-row-model.ts` already tested |
| **UNIT-ARCH-05** | `areEstimateSheetBranchPropsEqual` branch:157; `areEstimateRowItemsTablePropsEqual` row-table:131; `EstimateMaterialCell` cells:1142 | Per-row/per-branch memo guards; `branch.tsx` `SheetMutationHandlers` Pick of 22 handlers branch:88-112 | Sheet render perf (every keystroke re-render path) | **MED** | earns-keep-misplaced (the comparators earn their keep only because the prop-drilling forces them; delete the cause, not the guard — but the contract test pins the guard anchors) |
| **UNIT-ARCH-06** | `estimateSheetTreeReducer` EstimateSheetTree.tsx:244 (16 cases); `componentLibraryManagerReducer`; `estimateSheetContentReducer` EstimateSheetContent.tsx:864 (1 `fieldChanged` case + 42 `useStableCallback` setters) | Internal to each owning module; reducers consumed by `useReducer` in-module | Tree/library/content UI state | **LOW** | **pass-through** (deletion-test fails outright: `resolveStateUpdater` re-implements `useState`'s functional update) |
| **UNIT-ARCH-07** | `commitInlineFolderEdit` index.tsx:1798, `createFolder`:1893, `confirmDeleteFolder`:1973, `handleLibraryItemMove`:2671, `archiveLibraryItems`:2131; Manager `commitCreateFolder`:2788, `commitRenameFolder`:2822, `confirmDeleteFolder`:2862, `moveComponentToFolder`:2905 | Each UI calls its own copy; `index.tsx` (3634 ln) + `ComponentLibraryManager.tsx` (3160 ln) | Folder create/rename/delete/move/archive, generation-tracking rollback (31 dup ref lines) | **HIGH** | earns-keep-misplaced (one rule, two implementations; raw Row shape leaks into both UIs) |
| **UNIT-ARCH-08** | `addCorporateAccountMember` corp-acct-repo:450; `removeCorporateAccountMember`:542; `updateCorporateAccountMemberRole`:592; `isLastOwner`:511 (3 SQL EXISTS + 1 TS helper) | **1 caller each**, all `corporate-account-actions.ts` (:67 / :93 / :124) | Team-member add/remove/role-change; last-owner safety invariant | **HIGH** (safety, not breadth) | earns-keep (invariant is real) — the deepening is one home for the rule, not deletion |
| **UNIT-ARCH-09** | 6 adapters: `feedback-aggregate.ts:17` + `support-aggregate.ts:17` (byte-identical `unavailableFields`); `recovery-overview.ts:10` + `release-overview.ts:12` (`unavailableRecovery/ReleaseSource`); `activation-cohort-repository.ts:100` (`unavailableAggregateFields`); 4 inline in `app/admin/page.tsx:60-92` | Each consumed once by `buildBetaOperatingOverview` (beta-operating-overview.ts, already deep) | Admin/operator overview render | **LOW** | pass-through / earns-keep-misplaced (~50 dup lines; one `toSourceSnapshot` adapter replaces all six) |

**AUX (Phase 4, optional) one-liners:** A1 display-transform in `EstimateSheetContent.tsx` (`displayedSheetNode` identity memo ~:1777) — MED, disjoint from 03/05/06 except shared file; A2 merge `project-activity-repository.ts` (309 ln, hardcodes `philipjonlewis@gmail.com`→`'Philip Lewis'` :156) + `project-activity-feed-repository.ts` (1515 ln) — LOW/MED; A3 `SOURCE_SNAPSHOT_ALLOWED_KEYS` + `sanitize*` (`estimates/actions.ts`:1543-1721) out of the 4197-line god-file — LOW; A4 image-upload (`estimateImageModalReducer` cells:87, `uploadEstimateReferenceImage`:162, `ExpressMaterialImageEditor`:506) out of `cells.tsx` (1486 ln) — MED; A5 `helpers.ts` (683 ln) dead half (`filterComponents`/`sortComponents`/`groupComponents`/`parseLibraryCsv`/`Json`/`exportLibraryItemsToCsv`/`createDefaultLibraryBundles` — 0 prod importers, only `component-library-helpers.test.ts`) — LOW; A6 `corporate-account-actions.ts` dup validation + `audit.ts` pure re-export + UI `*Row` leakage — LOW.

---

## 2. Per-unit blast radius

### UNIT-ARCH-01 — Estimate-tree read module carved out of the workspace god-file

**Direct callers (verified call sites):**
- `getEstimateTabTree` — 6 sites in 3 modules: `estimates/actions.ts:2331,3449`; `reusable-sources/actions.ts:402,462,1016`; `api/.../proposal.xlsx/route.ts:261`. Graph also reports 2 intra-file callers (`getProjectEstimateTreeByEstimate`, `getProjectEstimateTreeByNode` both delegate to it inside the god-file) — these collapse into the new module, so they are not external blast.
- `getProjectEstimateTreeByEstimate` — 4 sites in 3 modules: `estimates/actions.ts:2299,3452`; `reusable-sources/actions.ts:1017`; `proposal.xlsx/route.ts:295`.
- `resolveEstimateTabRouteContext` — 1 site: `app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx:83` (server component, drives the sheet's route + capability context).
- `getEstimateNodeSubtree` — 1 site: `estimates/subtree-actions.ts:24`.
- `getEstimateTreesForTabs` — 1 site: `proposal.xlsx/route.ts:331` (multi-tab export fan-out).
- `getProjectEstimateTreeByNode` — **0 external callers** (graph confirms only the intra-file def). Dead entry point — collapse, do not preserve.

**Indirect dependents:** every consumer of the return shape (`{ project, estimate, tab?, tree, loadLimitState? }`) — the Estimate-sheet server page, the proposal exporter, the reusable-source copy/promote actions. The private chain (`getEstimateTabTreeForResolvedEstimate` @ ~3991, `…ForResolvedEstimateTab`, `…ForResolvedTabId`, `readEstimateTabTreePayloadForResolvedTabId`, `readEstimateNodeRouteContextD1FastPath` @ ~4094) is self-contained and moves as a block.

**Affected execution flows:** (1) Estimate-sheet first paint / tab switch (the hot path); (2) proposal.xlsx export (per-tab fan-out + whole-estimate fallback); (3) reusable-source search/outline/copy/promote; (4) subtree partial-load.

**Failure scenario if done wrong:** moving the cache layer (the process cache `clearEstimateRouteContextProcessCache` keys on, plus the `traced("estimate-sheet.route-context", …)` fast-path) without preserving key identity → after a Row mutation the stale tree is served and the sheet shows the pre-edit Node set until a hard reload. Concretely: user deletes a Row, `estimates/actions.ts:2291/3807/4070` call `clearEstimateRouteContextProcessCache(project.id)`, but if the cache now lives behind a different module instance the invalidation misses → `getEstimateTabTree` returns the cached pre-delete tree.

**Risk: MED.** Breadth is moderate (5 live entry points, 3 calling modules) but the module sits on the single hottest read path and owns the cache-invalidation contract. No SQL moves; risk is purely in cache-key + return-shape fidelity.

**Deletion-test verdict: `DEC-ARCH-BR-01` earns-keep** (real read behaviour + cache) **+ two false seams to delete.** (a) `src/lib/repositories/estimate-repository.ts` (108 ln): `estimateRepository` symbol has **0 importers** — verified `grep "estimateRepository\b"` returns only its own `def:108`. Its `getEstimateTabTree(estimateId, tabId)` signature doesn't even match the live 3-arg one; it is a dead false seam. (b) `clearEstimateRouteContextProcessCache` @ workspace-repository.ts:4090 is a no-op (`void projectId;` body) yet is called from 4 sites (`estimates/actions.ts:2291,3807,4070`, `express-promotion-actions.ts:927`) — a cache that was emptied but never removed. Delete the symbol + the 4 call sites; the invariant preserved is "no behaviour" so the verification surface is "callers still compile, no new cache served."

**Safe execution envelope:** behavior-preserving module move (re-export from the old path during transition is allowed but not required — alpha bias). Guard: keep the 6 public signatures byte-identical; keep the private chain's cache key construction untouched. Verification surface: `tsc` (the 5 external call sites type-check the new location) + the existing contract test `estimate-sheet-unit-003-contracts.test.ts` (asserts `tabLoadLimit`/`loadLimitState` propagation through `use-estimate-query.ts`, which consumes the shape). Run `next build` once to confirm the server-component import in `[nodeId]/page.tsx` resolves. `EV-ARCH-01`.

---

### UNIT-ARCH-02 — Component write-repository extracted from `component-library/actions.ts`

**Direct callers (verified):**
- `createCostLibraryComponent` (actions:2539) — graph reports 6 callers: prod `AddComponentModal.tsx::submit`, internal `duplicateCostLibraryComponent`, plus 4 tests (`library-viewer-authz.test.tsx` ×2, `component-library-actions-revalidation.test.ts`, …). The inline INSERT it wraps sits ~L2636 inside the body.
- `updateCostLibraryComponentWithPriceOptions` (actions:3007) — parallel caller set (Component editor save path); UPDATE fan-out lives ~L3137-3316.
- Pure builders `buildComponentPriceOptionWritePlan` (1796), `buildLinkedEstimateRowsSyncStatement` (615), `buildUpdateCostLibraryComponentFanOutStatements` (2895) are intra-file helpers — they move with the actions.

**Indirect dependents:** the read-repository `component-library-repository.ts` (2361 ln / 88 KB) already exists for reads; writes bypass it. Every table the write SQL touches becomes a coupling point: verified leakage `actions.ts`/read-repo — `upload_assets` **10/0**, `component_variant_attachments` **7/2**, `cost_library_item_variant_cost_entries` **6/2**, `estimate_sheet_events` **2/0**, `activity_event_outbox` **1/0**. The write-repository's job is to become the one home for these five tables.

**Affected execution flows:** Component create/update/duplicate; Variant cost-entry fan-out; linked-Row sync (`buildLinkedEstimateRowsSyncStatement` rewrites Estimate Sheet Rows when a shared Component changes — this is a cross-module write: Component-library write path mutates Estimate-sheet state); reference-image upload (`upload_assets`).

**Failure scenario if done wrong:** `buildLinkedEstimateRowsSyncStatement` (615-698) must stay inside the same transaction as the Component update or a partial commit leaves a Component's new price persisted while its linked Estimate Rows still show the old price — a silent money mismatch on a printed proposal. Concretely: if the extraction splits the `statements.push(...)` fan-out (actions:3319,3334) across two repository calls without a shared transaction boundary, a thrown error after the first `push` commits the Component but not the Row sync.

**Risk: HIGH.** This unit moves D1 write SQL and touches a cross-module invariant (Component write → Estimate Row sync). It is also the unit that triggers `GATE-NEXT-01`: `actions.ts` is a `"use server"` file; moving fns out requires every extracted export that stays server-side to remain async-only (memory: `tsc`/vitest miss a non-async `"use server"` export; only `next build` catches it). Table-leakage reduction is the measurable win (5 tables → 1 write-repository home).

**Deletion-test verdict: `DEC-ARCH-BR-02` earns-keep-misplaced.** The SQL earns its keep; its placement (inline in a 5545-line actions file, beside the read-repository that already exists) does not. The deepening is a seam move, not a deletion.

**Safe execution envelope:** behavior-preserving SQL relocation, schema-preserving (no migration). Guard: keep each statement's SQL text byte-identical during the move; keep the transaction boundary (the `statements` array pattern) intact so the fan-out stays atomic. Verification surface: the 4 existing action tests (`component-library-actions-revalidation.test.ts`, `library-viewer-authz.test.tsx`) + **`next build` mandatory** to catch the `"use server"` async-export restriction (this is the one unit where build is a hard verification surface, not optional). `TEST_PROPOSAL`: a golden diff of generated SQL strings before/after the move. `EV-ARCH-02`.

---

### UNIT-ARCH-03 — Collapse the 38-field `useEstimateRowHandlers` hook

**Direct callers:** exactly **1** — `EstimateSheetContent.tsx:2244` (graph-confirmed: `useEstimateRowHandlers` → `EstimateSheetContent` only). The hook's input is the 38-field `UseEstimateRowHandlersInput` (use-estimate-row-handlers.ts:97-138): 9 mutation fns (`insertRow`/`replaceRow`/`moveRows`/`moveRowItem`/`promoteRow`/`deleteRow`/`deleteRows`/`restoreDeletedRows`/`updateRow`) + 6 setters (`setEstimateTree`/`setEditableRows`/`setExpressInsertDrafts`/`setBulkSelectedRowIds`/`setProjectSpecificRowId`/`setPromotingRowId`) + ~23 state slices.

**Indirect dependents:** every handler the hook returns is threaded back down through `EstimateSheetContent` → `branch.tsx` (the 22-handler `SheetMutationHandlers` Pick at branch:88-112) → `row-table.tsx` → cells. So UNIT-ARCH-03's output shape is UNIT-ARCH-05's input prop-drill.

**Affected execution flows:** every Row mutation surface — insert (express + library + template), move (component + row-item), promote-to-library, delete/restore, optimistic update + rollback. This is the sheet's "brain."

**Failure scenario if done wrong:** collapsing the 38 fields to a `RowMutationCoordinator` with ~5 inputs means the coordinator must re-derive the other 33 from its store. If `markRowDirtyNow`/`markRowCleanNow` (the dirty-reconciliation pair) are mis-wired, a user edits a quantity, the coordinator fails to mark the Row dirty, `commitQuantityFields` (row-table:548) never fires, and the edit is silently lost on tab switch (the `skipEditableRowsSyncRef` guard drops it). The contract test at `estimate-sheet-unit-003-contracts.test.ts` pins `reconcileRowDirty` + `editableRowsEqual(currentRows[rowId], baselineRows[rowId])` — those anchors must survive.

**Risk: HIGH.** Single caller, but that caller is the entire mutation surface and the orchestrator is currently **untested** as a unit (only source-string contract assertions exist: `live-estimate-node-route.test.ts`, `security-findings-implementation-contracts.test.ts`, `estimate-sheet-unit-003-contracts.test.ts`, `estimate-sheet-center-atomic-contracts.test.ts` all reference it by source string, not by exercising it). The pure helpers in `editable-row-model.ts` ARE tested (8 test files) — the classic "helpers extracted for testability while the orchestrator beside them stays untested" anti-pattern (habit #3).

**Deletion-test verdict: `DEC-ARCH-BR-03` earns-keep-misplaced.** The orchestration earns its keep; its placement (a 1503-line hook with a 38-field signature) does not. Deepening target: `RowMutationCoordinator` with ~5 inputs, the other 33 derived from a store, so the coordinator becomes the test surface.

**Safe execution envelope:** behavior-preserving collapse. Guard: the coordinator's external behaviour (which handlers it exposes to `EstimateSheetContent`) is unchanged — this is a signature-narrowing, the call sites at `EstimateSheetContent.tsx:2244` and the 22-handler Pick must still resolve. Verification surface: the 4 contract tests above (source-string anchors) + a proposed `RowMutationCoordinator` unit test that crosses the new seam (`TEST_PROPOSAL`, not executed this pack). `EV-ARCH-03`.

---

### UNIT-ARCH-04 — Row commit/dirty/routing rules lifted from `row-table.tsx`

**Direct callers:** the four commit fns are invoked from cell blur/change handlers within `EstimateRowItemTableRow` (row-table.tsx). `commitExpressFields` (509-533) routes between `onUpdateLinkedLibraryComponent` (linked shared Component) and `onUpdateRowItem` (plain Row) — verified at row-table:528-532. `commitQuantityFields` (548), `commitRowAdjustmentPercentage` (596), `commitContingencyPercentage` (611) all terminate in `onUpdateRowItem(computedItem.id, …)`. Per-row render is already driven by a zustand selector (row-table.tsx:378), so the commit path is where the remaining imperative logic lives.

**Indirect dependents:** `EstimateMaterialCell` and siblings (cells.tsx) call these commits; `editable-row-model.ts` (pure, tested) and `editable-row-store.ts` hold the model the commits mutate.

**Affected execution flows:** Row field commit on blur; adjustment/contingency percentage application; the linked-Component-vs-RowItem routing decision (a Component change can either update a library Component or just the local Row).

**Failure scenario if done wrong:** the routing predicate at row-table:384 (`isLinkedSharedComponent && canManageLibrary && Boolean(onUpdateLinkedLibraryComponent)`) decides whether a user's edit mutates the shared library Component (visible to every Estimate that uses it) or only the local Row. If the lift inverts or drops the `canManageLibrary` term, a viewer who lacks library-manage permission silently edits the shared Component — a privilege-boundary break.

**Risk: MED.** The logic is real but contained (one component, four fns, ~120 lines). The model layer is already pure+tested; the lift is "move the remaining imperative commit/dirty/routing rules down to meet the model."

**Deletion-test verdict: `DEC-ARCH-BR-04` earns-keep.** Real rules. Deepening = give them a tested home beside `editable-row-model.ts` so the routing predicate and dirty reconciliation become the test surface.

**Safe execution envelope:** behavior-preserving lift. Guard: the routing predicate stays byte-identical; the four commit signatures exposed to cells.tsx are unchanged. Verification surface: `estimate-sheet-quantity-contingency-model.test.ts` + `estimate-sheet-extracted-models.test.ts` (existing model tests) + `estimate-sheet-unit-003-contracts.test.ts` (pins `onReconcileRowDirty(computedItem.id)` count ≥5). `EV-ARCH-04`.

---

### UNIT-ARCH-05 — Collapse the four-layer handler prop-drilling (+ delete the two memo comparators)

**Direct callers / consumers:**
- `branch.tsx` (622 ln): `EstimateSheetBranchProps` (branch:35), the 22-handler `SheetMutationHandlers` Pick (branch:88-112), `EstimateSheetBranchBase` takes ~46 props inline (branch:227), memo guard `areEstimateSheetBranchPropsEqual` (branch:157-~224, ~68 ln).
- `row-table.tsx`: `areEstimateRowItemsTablePropsEqual` (row-table:131-~174, ~44 ln), ~32 props.
- `cells.tsx`: ~25-prop `EstimateMaterialCell` (cells:1142).

**Indirect dependents:** the contract test `estimate-sheet-unit-003-contracts.test.ts:37-42` **slices the source string** between `"function areEstimateSheetBranchPropsEqual"` and `"const prevTotal ="` and asserts the slice excludes `prev.rowMutationStatuses !== next.rowMutationStatuses` and `prev.expressInsertDraftStates !== next.expressInsertDraftStates` (and the parallel table assertions). This test is an anchor-string contract — renaming/deleting the comparators breaks it.

**Affected execution flows:** the sheet's per-keystroke render path. The comparators exist solely to compensate for the prop-drill: because 46 fresh handler closures flow down every render, the memo must deep-compare to avoid re-rendering every Branch/Row.

**Failure scenario if done wrong:** two symmetric ones. (a) Delete the comparator before the prop-drill is collapsed → every parent render re-renders every visible Row/Branch → sheet becomes unusable on large Estimates (regression of the exact perf the comparators were built to fix). (b) Collapse the prop-drill but leave a stale closure identity → a handler captures stale state and a Row edit mutates the wrong Node. Sequencing is load-bearing: the drill must be collapsed (handlers stabilized via the UNIT-ARCH-03 coordinator output) **before** the comparator is deleted.

**Risk: MED.** Pure render-perf surface, but the contract test pins the comparator anchors and the ordering trap (delete-guard-before-cause) is real. This is the canonical "compensating complexity" — the comparators earn their keep only because the drill forces them to.

**Deletion-test verdict: `DEC-ARCH-BR-05` earns-keep-misplaced.** The comparators are load-bearing today, but their reason-for-being is the drill. Delete the cause → the guard becomes deletable. Order: (1) stabilize handler identity (depends on 03's coordinator), (2) then delete `areEstimateSheetBranchPropsEqual` + `areEstimateRowItemsTablePropsEqual`, (3) update the contract test's anchor expectations in the same change.

**Safe execution envelope:** behavior-+perf-preserving. Guard: before deleting a comparator, prove render count is unchanged on a ≥200-Row fixture (regression guard lives in `03-PERFORMANCE-AND-SPEED-STUDY.md`). Verification surface: the contract test (must be edited in-lockstep — it is `TEST_PROPOSAL` to update, not silently) + the virtualization test `estimate-branch-virtualization.test.tsx`. `EV-ARCH-05`.

---

### UNIT-ARCH-06 — Delete the pass-through field-setter reducer pattern

**Direct callers:** the reducers are consumed by `useReducer` in-module — `estimateSheetTreeReducer` (EstimateSheetTree.tsx:244, 16 one-line cases :244-287) + 16 setter wrappers (:406-447) + `resolveStateUpdater` (:219-221); `componentLibraryManagerReducer` (19 cases, 19 `resolveStateUpdater` uses, 19 state fields); `estimateSheetContentReducer` (EstimateSheetContent.tsx:864, single `fieldChanged` case) + **42** `useStableCallback` setters (verified count).

**Indirect dependents:** none external — these are module-private state shapers.

**Affected execution flows:** tree/library/content UI interaction state (editing-node id, selection, filter, etc.). No data invariant, no cross-module effect.

**Failure scenario if done wrong:** the only realistic failure is behavioural drift: `resolveStateUpdater(current, updater)` accepts both a value and a functional updater (re-implementing `useState`'s functional update). A naive swap to plain `useState` must preserve the functional-updater call sites (wherever a setter is called as `setX(prev => …)`). If a functional-updater call site is missed and the new `useState` receives a function-as-value, state silently becomes a function reference.

**Risk: LOW.** Disjoint files, no invariant, the pattern is the textbook deletion-test failure (`resolveStateUpdater` adds nothing over `useState`). This is why UNIT-ARCH-06 is the Phase-0 quick win and the DAG's exact next-ready unit.

**Deletion-test verdict: `DEC-ARCH-BR-06` pass-through.** The whole pattern fails the deletion test: replace `useReducer` + reducer + setter wrappers with `useState` (or a small zustand slice where the field count warrants). Keep the sibling `componentLibrarySheetReducer` — **but note the location drift:** the review said it lives in `index.tsx:247-303`; it actually lives in **`ComponentLibraryManager.tsx:247`** (verified `grep -rln componentLibrarySheetReducer` → only ComponentLibraryManager.tsx). That reducer encodes real open/close/sheet-mode logic, so it stays.

**Safe execution envelope:** behavior-preserving deletion. Guard: each setter's call sites still receive the same value-or-functional-updater semantics. Verification surface: `tsc` (setter call-site types) + the existing UI tests that render these modules. No `next build` needed (client-only). `EV-ARCH-06`.

---

### UNIT-ARCH-07 — Hoist the duplicated Component/Folder mutation layer

**Direct callers:** each UI calls its own copy. `component-library/index.tsx` (3634 ln): `commitInlineFolderEdit` (1798), `createFolder` (1893), `confirmDeleteFolder` (1973), `handleLibraryItemMove` (2671), `archiveLibraryItems` (2131). `ComponentLibraryManager.tsx` (3160 ln): `commitCreateFolder` (2788), `commitRenameFolder` (2822), `confirmDeleteFolder` (2862), `moveComponentToFolder` (2905). The 31 duplicated ref lines are the generation-tracking rollback pattern (optimistic mutation + revision-gated rollback).

**Indirect dependents:** the write-repository that UNIT-ARCH-02 creates — `index.tsx` and `Manager.tsx` both ultimately push through `actions.ts` for the D1 writes. So UNIT-ARCH-07's hoisted module becomes the consumer of UNIT-ARCH-02's repository (hence 07 depends on 02).

**Affected execution flows:** Folder create/rename/delete; Component move-to-folder; bulk archive; generation-tracking rollback on conflict.

**Failure scenario if done wrong:** the generation-tracking rollback is a concurrency invariant — if a Folder rename and a Component move race, the rollback restores the pre-mutation tree by matching the generation/revision. Two implementations mean two chances for the rollback predicate to diverge; collapsing them wrongly (e.g., dropping one branch's `createFolderPending` guard, index.tsx:1894) can leave a Folder half-created on rollback.

**Risk: HIGH.** Two UIs, one shared mutation semantics, raw Row shape leaking into both (the review's leakage finding). Plus the dependency on UNIT-ARCH-02's repository contract.

**Deletion-test verdict: `DEC-ARCH-BR-07` earns-keep-misplaced.** One rule, two implementations. The hoist creates one Folder/Component mutation module consumed by both UIs and closes the Row-shape leak across the UI seam.

**Safe execution envelope:** behavior-preserving consolidation, post-02. Guard: the rollback predicate (generation match) is identical across both originals — diff the 31 dup ref lines and assert the hoisted version matches both. Verification surface: the library action tests + `next build` (these are client modules calling server actions; the `"use server"` boundary must stay clean). `TEST_PROPOSAL`: a golden log of mutation/rollback sequences. `EV-ARCH-07`.

---

### UNIT-ARCH-08 — last-owner invariant, one home

**Direct callers:** exactly **1 each**, all in `corporate-account-actions.ts` — `addCorporateAccountMember` (repo:450) ← actions:67; `removeCorporateAccountMember` (repo:542) ← actions:93; `updateCorporateAccountMemberRole` (repo:592) ← actions:124. `isLastOwner` (repo:511) is called internally by the latter two (repo:552, repo:608).

**Indirect dependents:** the admin team-management UI (`AdminAccountsList.tsx`, etc.) via the actions tier. The invariant itself is an ownership-safety rule: removing/demoting the last owner of a corporate account must be prevented.

**Affected execution flows:** team-member remove; team-member role-change (owner→member); the add path also carries an EXISTS predicate (repo:466-481 region).

**Failure scenario if done wrong:** there are **four encodings of one rule** — 3 SQL EXISTS predicates (one per mutation fn) + 1 TS helper (`isLastOwner`). If the consolidation keeps the SQL in place but the TS helper's predicate diverges from the SQL (e.g., different scoping of "owner" role, or a race between the check and the mutation), the last owner can be removed, orphaning the account (no one can administer it). This is a data-safety invariant, not a breadth risk.

**Risk: HIGH (safety), LOW (breadth).** The blast is narrow (3 callers, 1 actions file) but the consequence of getting the invariant wrong is account orphaning. Mitigating: there is **existing test coverage** — `corporate-account-repository.test.ts`, `corporate-account-actions.test.ts`, `corporate-account-admin-recovery.test.ts`, `corporate-account-local-d1-integration.test.ts`, `corporate-account-workspace-link-state.test.ts`, `cloudflare-d1-recovery-integrity.test.ts` (verified present). So this is the rare high-safety unit that already has a real test surface.

**Deletion-test verdict: `DEC-ARCH-BR-08` earns-keep.** The invariant is real and must stay; the deepening is "one home" — collapse the 4 encodings into a single predicate (one SQL function or one TS helper the SQL mirrors) so the rule can be tested in one place.

**Safe execution envelope:** behavior-preserving predicate consolidation. Guard: the surviving predicate returns the same boolean for every (account, user) pair the originals did — diff the 3 EXISTS clauses and assert equivalence. Verification surface: the 6 corporate-account tests above are the decisive evidence; run them green. `EV-ARCH-08`.

---

### UNIT-ARCH-09 — Collapse six `BetaOperatingSourceSnapshot` adapters

**Direct callers / consumers:** all six adapters feed `buildBetaOperatingOverview` (beta-operating-overview.ts), which is already deep and is the single consumer. The six: `feedback-aggregate.ts:17` + `support-aggregate.ts:17` (byte-identical `unavailableFields` — verified same name, same line, same body); `recovery-overview.ts:10` (`unavailableRecoverySource`) + `release-overview.ts:12` (`unavailableReleaseSource`) — identical shape, different name; `activation-cohort-repository.ts:100` (`unavailableAggregateFields`); 4 inline adapters in `app/admin/page.tsx:60-92`.

**Indirect dependents:** the admin/operator overview page render.

**Affected execution flows:** admin overview (Founder Homebase / operator dashboard) render — non-critical, low-frequency.

**Failure scenario if done wrong:** cosmetic — a `BetaOperatingSourceSnapshot` field (`availability`/`asOf`/`errorCategory`/`aggregates`/`fields`) is dropped or its `errorCategory` value mis-mapped (`"source_denied"` vs `"source_failed"` vs `"source_unavailable"`), and the overview shows "available" for a dead source or vice versa. No data writes; worst case a wrong availability badge.

**Risk: LOW.** Pure read-side adapter dedup (~50 duplicated lines), one consumer already deep, no invariant.

**Deletion-test verdict: `DEC-ARCH-BR-09` pass-through / earns-keep-misplaced.** One `toSourceSnapshot(aggregate)` adapter replaces all six; the inline page.tsx adapters become single calls. This is the cleanest unit in the pack.

**Safe execution envelope:** behavior-preserving adapter dedup. Guard: the surviving `toSourceSnapshot` produces a byte-identical `BetaOperatingSourceSnapshot` for each input status. Verification surface: snapshot-diff the overview output before/after; `tsc` on the 5 touched modules. `EV-ARCH-09`.

---

## 3. Cross-unit coupling · shared-file contention

The lead needs this to sequence and to lease files across parallel workers. Files touched by more than one unit:

| Shared file | Touching units | Nature of contention | Lease rule |
|-------------|----------------|----------------------|------------|
| `src/components/workshop/EstimateSheetContent.tsx` (3680 ln) | **03** (call site :2244), **05** (prop-drill source), **06** (`estimateSheetContentReducer`:864 + 42 setters), **A1** (display-transform + `displayedSheetNode` ~:1777) | Highest-contention file in the pack. 133 grep hits for the multi-unit pattern. | Phase 2 first-writer-wins via `LOOP_LEDGER.md`; 03 should land before 05 (05's guard deletion depends on 03's stabilized handler identity). 06's setter deletion is Phase 0 and can precede all of them on this file if scoped to the reducer block only. |
| `src/components/workshop/estimate-sheet/rows/row-table.tsx` (1396 ln) | **04** (commit fns 509-625), **05** (comparator :131, props) | Same file, disjoint line ranges (commit fns vs memo guard) but 05's deletion is gated on 03. | 04 first, then 05. |
| `src/components/workshop/estimate-sheet/rows/cells.tsx` (1486 ln) | **05** (`EstimateMaterialCell`:1142 prop profile), **A4** (image-upload subsystem :87/162/506) | Disjoint subsystems in one file. | Phase 2 (05) and Phase 4 (A4) never collide in time. |
| `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx` (3160 ln) | **06** (`componentLibraryManagerReducer` + 19 setters; AND the sibling `componentLibrarySheetReducer`:247 that STAYS), **07** (`commitCreateFolder`/`commitRenameFolder`/`confirmDeleteFolder`/`moveComponentToFolder`) | 06 is Phase 0, 07 is Phase 3 (post-02). | 06 must not touch the `componentLibrarySheetReducer` block (lines ~247-303); 07 lands much later. |
| `src/lib/component-library/actions.ts` (5545 ln) | **02** (write-repo extraction), indirect **07** (07 consumes 02's output) | 02 is the only direct editor; 07 depends on the result. | 02 before 07 (already in DAG). |
| `src/lib/repositories/workspace-repository.ts` (4441 ln) | **01** only | Single-unit, but the file is huge — the move is out of it, not within. | No contention. |
| `src/app/admin/page.tsx` + `src/lib/admin/*-overview.ts` / `*-aggregate.ts` | **09** only | Single-unit cluster. | No contention. |

**Sequencing consequences (feed into `05-IMPLEMENTATION-ROADMAP.md`):**
1. **UNIT-ARCH-06 first** (Phase 0) — disjoint files, no invariant, but on the EstimateSheetContent.tsx + ComponentLibraryManager.tsx files it must scope strictly to the reducer/setter blocks and leave `componentLibrarySheetReducer` (ComponentLibraryManager.tsx:247) and the `fieldChanged` semantics untouched where 03/05 will later work.
2. **UNIT-ARCH-01** (Phase 1) — no file contention; lands independently.
3. **UNIT-ARCH-02** (Phase 1, after 01) — sole editor of `actions.ts`; unblocks 07.
4. **UNIT-ARCH-03 → UNIT-ARCH-05** (Phase 2, ordered) — 03 stabilizes handler identity on `EstimateSheetContent.tsx`, which is the precondition for 05 deleting the comparators on `branch.tsx`/`row-table.tsx`. 04 can parallelize with 03 (disjoint file region in `row-table.tsx`).
5. **UNIT-ARCH-07** (Phase 3, after 02), **UNIT-ARCH-08**, **UNIT-ARCH-09** — independent.

---

## 4. Evidence fingerprints

All anchors re-verified against live source on 2026-07-16. Graph query noted where used.

- **EV-ARCH-01** (UNIT-01): `workspace-repository.ts` = 4441 ln (`wc -l`). Live entry points: `getEstimateTabTree` call sites 6/3-modules (grep: `estimates/actions.ts:2331,3449`; `reusable-sources/actions.ts:402,462,1016`; `proposal.xlsx/route.ts:261`); `getProjectEstimateTreeByEstimate` 4 sites (:2299,:3452; reusable :1017; xlsx :295); `resolveEstimateTabRouteContext` 1 (`[nodeId]/page.tsx:83`); `getEstimateNodeSubtree` 1 (`subtree-actions.ts:24`); `getEstimateTreesForTabs` 1 (`xlsx:331`); `getProjectEstimateTreeByNode` 0. Private chain `getEstimateTabTreeForResolvedEstimate`~:3991 … `readEstimateNodeRouteContextD1FastPath`~:4094. Dead seam `estimate-repository.ts` 108 ln, `estimateRepository` 0 importers (grep). No-op `clearEstimateRouteContextProcessCache`:4090 called from `estimates/actions.ts:2291,3807,4070` + `express-promotion-actions.ts:927`. Graph `callers_of workspace-repository::getEstimateTabTree` = 8 (incl. 2 intra-file).
- **EV-ARCH-02** (UNIT-02): `actions.ts` = 5545 ln; read-repo 2361 ln / 88 117 B. Builders: `buildLinkedEstimateRowsSyncStatement`:615, `buildComponentPriceOptionWritePlan`:1796, `createCostLibraryComponent`:2539, `buildUpdateCostLibraryComponentFanOutStatements`:2895, `updateCostLibraryComponentWithPriceOptions`:3007. Table leakage (grep -c actions/read-repo): `upload_assets` 10/0, `component_variant_attachments` 7/2, `cost_library_item_variant_cost_entries` 6/2, `estimate_sheet_events` 2/0, `activity_event_outbox` 1/0. Graph `callers_of createCostLibraryComponent` = 6 (AddComponentModal::submit, duplicateCostLibraryComponent, 4 tests).
- **EV-ARCH-03** (UNIT-03): `use-estimate-row-handlers.ts` = 1503 ln; `UseEstimateRowHandlersInput`:97-138 (9 mutation fns + 6 setters + 23 slices). Sole caller `EstimateSheetContent.tsx:2244` (graph `callers_of useEstimateRowHandlers` = 1). Hook referenced only by source-string in 4 test files (no unit test exercises it); `editable-row-model.ts` referenced by 8 test files.
- **EV-ARCH-04** (UNIT-04): `row-table.tsx` = 1396 ln; commits `commitExpressFields`:509, `commitQuantityFields`:548, `commitRowAdjustmentPercentage`:596, `commitContingencyPercentage`:611; routing predicate row-table:384; `onUpdateLinkedLibraryComponent` branch row-table:528-532; zustand selector row-table:378.
- **EV-ARCH-05** (UNIT-05): `branch.tsx` = 622 ln; `EstimateSheetBranchProps`:35; `SheetMutationHandlers` Pick 22 handlers branch:88-112; `EstimateSheetBranchBase` ~46 props :227; `areEstimateSheetBranchPropsEqual`:157; memo `EstimateSheetBranch` branch:621. `areEstimateRowItemsTablePropsEqual` row-table:131. Contract test `tests/vitest/estimate-sheet-unit-003-contracts.test.ts:37-42` slices source strings. `EstimateMaterialCell` cells:1142; cells.tsx 1486 ln.
- **EV-ARCH-06** (UNIT-06): `estimateSheetTreeReducer` EstimateSheetTree.tsx:244, 16 cases; `resolveStateUpdater`:219; setters :406-447. `estimateSheetContentReducer` EstimateSheetContent.tsx:864 (1 `fieldChanged` case :869); `useStableCallback` count = 42 (grep -c). Sibling `componentLibrarySheetReducer` is in **`ComponentLibraryManager.tsx:247`** (not `index.tsx` as the review stated) — graph + grep confirm only that file defines it.
- **EV-ARCH-07** (UNIT-07): `index.tsx` = 3634 ln; `ComponentLibraryManager.tsx` = 3160 ln. Anchors: index `commitInlineFolderEdit`:1798, `createFolder`:1893, `confirmDeleteFolder`:1973, `archiveLibraryItems`:2131, `handleLibraryItemMove`:2671; Manager `commitCreateFolder`:2788, `commitRenameFolder`:2822, `confirmDeleteFolder`:2862, `moveComponentToFolder`:2905.
- **EV-ARCH-08** (UNIT-08): `corporate-account-repository.ts` = 1100 ln; `addCorporateAccountMember`:450, `isLastOwner`:511, `removeCorporateAccountMember`:542, `updateCorporateAccountMemberRole`:592; 3 SQL EXISTS + 1 TS helper. Single caller each in `corporate-account-actions.ts:67/93/124`. 6 test files cover the repository/actions (listed in §2).
- **EV-ARCH-09** (UNIT-09): `feedback-aggregate.ts:17` + `support-aggregate.ts:17` byte-identical `unavailableFields`; `recovery-overview.ts:10` + `release-overview.ts:12`; `activation-cohort-repository.ts:100` `unavailableAggregateFields`; 4 inline in `app/admin/page.tsx:60-92`; `buildBetaOperatingOverview` imported `admin/page.tsx:7`, called :58.
- **EV-ARCH-A1..A6** (AUX): A1 `EstimateSheetContent.tsx` display memo ~:1777; A2 `project-activity-repository.ts` 309 ln + `project-activity-feed-repository.ts` 1515 ln, hardcoded email→name :156; A3 `SOURCE_SNAPSHOT_ALLOWED_KEYS` estimates/actions.ts:1543-1600, `sanitize*`:1606-1721, file 4197 ln; A4 `estimateImageModalReducer` cells:87, `uploadEstimateReferenceImage`:162, `ExpressMaterialImageEditor`:506; A5 `helpers.ts` 683 ln (dead-half symbols — 0 prod importers, only `component-library-helpers.test.ts`); A6 `corporate-account-actions.ts` + `audit.ts` re-export + UI `*Row`.

---

## 5. Gaps / open questions

1. **Caller-count discrepancy with the source review (reconciled, not blocking).** The review reported `getEstimateTabTree` "12 callers" / `getProjectEstimateTreeByEstimate` "8". Those figures count `import` lines + call sites. Verified **distinct call-site** counts are 6 and 4 (graph `callers_of` returns 8 for `getEstimateTabTree` because it includes 2 intra-file delegators). This doc uses call-site counts as the blast metric; `05`/`06` should adopt the same convention to avoid confusion.
2. **`componentLibrarySheetReducer` location drift.** The review's UNIT-06 note places the "keep" reducer in `component-library/index.tsx:247-303`. It is actually in **`ComponentLibraryManager.tsx:247`** (grep + graph agree). UNIT-06's Phase-0 scope on ComponentLibraryManager.tsx must explicitly spare lines ~247-303. Flagged for the roadmap.
3. **UNIT-08 line anchors drifted from the review.** Review cited `addCorporateAccountMember`:466-481 / `remove…`:559-573 / `updateRole`:616-632. Verified: **450 / 542 / 592** (the SQL EXISTS predicates live inside those bodies). `isLastOwner`:511 is exact. The consolidation target is unchanged; only the anchors moved.
4. **`index.tsx` line count off-by-one.** Review said 3635 ln; verified 3634. Immaterial.
5. **UNIT-03/04 test surface is source-string contracts, not behavioural tests.** The 4 test files that reference `use-estimate-row-handlers` assert on source substrings, not runtime behaviour. This is why the unit is HIGH-risk despite a single caller: the orchestrator is genuinely untested. The deepening's `TEST_PROPOSAL` (a `RowMutationCoordinator` unit test crossing the new seam) is the first real execution coverage — but executing it needs a future `TEST_TASK` authorization, out of scope for this planning pack.
6. **Render-perf regression guard for UNIT-05 is not yet quantified here** — deferred to `03-PERFORMANCE-AND-SPEED-STUDY.md` (the ≥200-Row fixture and the render-count baseline live there). This doc asserts only the sequencing constraint (stabilize handlers before deleting comparators).
7. **Graph "flows" do not model the client-side estimate-sheet render path** (the graph's top-criticality flows are server entry points: auth/onboarding/admin). Blast-radius flow descriptions in §2 are therefore grounded in verified call sites + the UI module graph, not in a graph-traced flow ID. No flow-ID citation is claimed for units 03/04/05.
