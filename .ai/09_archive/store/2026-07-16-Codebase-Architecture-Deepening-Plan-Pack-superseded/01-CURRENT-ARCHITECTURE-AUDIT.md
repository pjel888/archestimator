# 01 — Current Architecture Audit

<!-- FRONTIER-PLAN-SUITE: 2026-07-12 · suite_version 2026-07-12 -->
**Pack:** Codebase Architecture Deepening · **Date:** 2026-07-16 · **Status:** PLANNING
**Role:** Baseline the CURRENT architecture of the 9 core modules + quantify the 3 systemic habits.
**Method:** every number below was re-grounded against live source on 2026-07-16 (grep + read). Where the source-review HTML drifted, the verified line is authoritative.

---

## 0. Summary table

| Unit | Module (file) | Lines | One-line finding | Habit | Interface-width verdict |
|------|---------------|------|------------------|-------|--------------------------|
| UNIT-ARCH-01 | `workspace-repository.ts` | 4441 | Estimate-tree read slice (~6 entries, ~1500 lines) co-located with 35+ unrelated exports; 2 false seams attached | god-module + dead seam | **shallow** (read surface smeared across 6 entry points sharing one private chain) |
| UNIT-ARCH-02 | `component-library/actions.ts` | 5545 | ~2000 lines of inline write SQL bypass the read-repository; 5 tables leak only through writes | god-module | **shallow** (writes have no interface; SQL is the interface) |
| UNIT-ARCH-03 | `use-estimate-row-handlers.ts` | 1503 | 40-field input hook = the whole sheet brain as one parameter list; orchestrator untested | no-locality | **shallow** (interface ≈ implementation width) |
| UNIT-ARCH-04 | `rows/row-table.tsx` | 1396 | Commit/dirty/routing rules live inside a render function beside a tested pure model | no-locality | **shallow** (the rule has no home; pure model beside it is tested, the rule is not) |
| UNIT-ARCH-05 | `rows/branch.tsx` + `row-table.tsx` + `cells.tsx` | 622+1396+1486 | 4-layer 46/36/30-prop drilling held together by 2 hand-written memo comparators | god-module (prop-bag) | **shallow** (comparator is the real interface; contract test only asserts its anchor strings) |
| UNIT-ARCH-06 | `EstimateSheetTree.tsx` + `ComponentLibraryManager.tsx` + `EstimateSheetContent.tsx` | 1306+3160+3680 | Reducer + N setter wrappers whose body is one field assignment (16+19+~24 = ~59 wrappers) | pass-through reducer | **shallow** (deletion test fails outright — wrapper ≡ `useState` setter) |
| UNIT-ARCH-07 | `component-library/index.tsx` + `ComponentLibraryManager.tsx` | 3634+3160 | Folder CRUD/move/archive re-implemented twice; 3 move-queue refs duplicated; Row shape leaks into both UIs | god-module + duplicated | **shallow** (two interfaces for one concern) |
| UNIT-ARCH-08 | `corporate-account-repository.ts` | 1100 | One last-owner rule encoded 4× (3 SQL `EXISTS` + 1 TS `isLastOwner`) | duplicated invariant | **reasonable module, shallow invariant** (rule has no single home) |
| UNIT-ARCH-09 | `app/admin/page.tsx` + `lib/admin/*-overview.ts` + `*-aggregate.ts` | — | Six `BetaOperatingSourceSnapshot` adapters, ~50 duplicated lines; the deep `buildBetaOperatingOverview` already exists | duplicated adapter | **shallow adapters** (the deep module exists; adapters are the leak) |

Verdicts use the `/codebase-design` glossary: **deep** = small interface hiding more behaviour; **shallow** = interface nearly as wide as implementation; the **deletion test** asks "if I delete this module and inline it, does anything actually change?"

---

## 1. Per-module current-state profiles

### UNIT-ARCH-01 — Estimate-tree read module (carve out of workspace god-file)

**Interface surface.** `src/lib/repositories/workspace-repository.ts` (4441 lines, 31 exported functions/consts, 44 `^export` decls incl. types). The Estimate-tree slice exposes **6 entry points** verified at:

| Entry point | Def line | External occurrences (incl. imports) |
|---|---|---|
| `getEstimateTabTree` | 3852 | 12 |
| `getProjectEstimateTreeByEstimate` | 4221 | 8 |
| `resolveEstimateTabRouteContext` | 4245 | 3 |
| `getEstimateNodeSubtree` | 3883 | 2 |
| `getEstimateTreesForTabs` | 4153 | 2 |
| `getProjectEstimateTreeByNode` | 4396 | **0 external** (one internal caller at 4316) |

**Implementation mass.** The 6 entries funnel through one private chain: `getEstimateTabTreeForResolvedEstimate` (L3991) → `getEstimateTabTreeForResolvedEstimateTab` (L4015) plus `readEstimateNodeRouteContextD1FastPath` (L4093). This is ~150–200 lines of the real load/resolve behaviour, shared but unexposed.

**Where the behaviour lives.** In the private chain — *below* the interface. The 6 entries are thin route wrappers over one brain; callers cannot reach the brain except by picking an entry. That is the shallowness: 6 ways in, 1 thing happening.

**Shallow signal + deletion test.** `getProjectEstimateTreeByNode` has **zero external callers** (dead-ish public export). The two legacy wrappers (`getProjectEstimateTreeByEstimateLegacy` L3722, `getProjectEstimateTreeByNodeLegacy` L4362) further thicken the file without adding reach. **Verdict: carve succeeds with locality gain** — one `estimate-tree-read` module behind ~2–3 entries would absorb the private chain and retire the dead entry.

### UNIT-ARCH-02 — Component write-repository (extract from actions.ts)

**Interface surface.** `src/lib/component-library/actions.ts` (5545 lines, 68 `^export` decls, ~25 exported server actions). The read side already has a home: `src/lib/repositories/component-library-repository.ts` (2361 lines). The write side has **no module** — writes are inlined in actions.

**Implementation mass — table leakage (actions.ts vs read-repo, verified):**

| Table | actions.ts | read-repo |
|---|---|---|
| `upload_assets` | 10 | **0** |
| `component_variant_attachments` | 7 | 2 |
| `cost_library_item_variant_cost_entries` | 6 | 2 |
| `estimate_sheet_events` | 2 | **0** |
| `activity_event_outbox` | 1 | **0** |

Five tables touched **only** on the write path; three of them are invisible to the read-repository. The write-repository's absence is the leak.

**Where the behaviour lives.** In five inline builders:
- `buildLinkedEstimateRowsSyncStatement` (L615)
- `buildComponentPriceOptionWritePlan` (L1796)
- inline `INSERT INTO cost_library_items` / `cost_library_item_versions` inside `createCostLibraryComponent` (L2539, INSERT at ~L2637)
- `buildUpdateCostLibraryComponentFanOutStatements` (L2895)
- `UPDATE cost_library_items` / `upload_assets` / `component_variant_attachments` / `cost_library_item_price_options` fan inside `updateCostLibraryComponentWithPriceOptions` (L3007, UPDATEs L3141–3298)

**Shallow signal + deletion test.** SQL strings are the interface; the action signature just collects inputs. The fan-out ordering (versions → variants → price options → assets → outbox) is real behaviour with no test surface. **Verdict: extract succeeds** — a write-repository gives the fan-out an interface and a test seam ( feeds the `TEST_PROPOSAL` for SQL relocation in §10 of `00-EXECUTIVE-DIRECTION.md`).

### UNIT-ARCH-03 — Collapse the 40-field row-handler hook

**Interface surface.** `useEstimateRowHandlers.ts` (1503 lines). The input type `UseEstimateRowHandlersInput` (L97–138) has **40 fields** verified:
- 12 mutation fns (`insertRow`, `replaceRow`, `moveRows`, `moveRowItem`, `promoteRow`, `deleteRow`, `deleteRows`, `restoreDeletedRows`, `updateRow`, `markRowDirtyNow`, `markRowCleanNow`, `hasPendingRowMutation`)
- 6 setters (`setEstimateTree`, `setEditableRows`, `setExpressInsertDrafts`, `setBulkSelectedRowIds`, `setProjectSpecificRowId`, `setPromotingRowId`)
- 22 state slices + refs (`estimateTree`, `editableRows`, `saveState`, `rowMutationStatuses`, `insertTargetNodeId`, `expressInsertDrafts`, `bulkSelectedRowIds`, `rowComponentPicker`, `toast`, …)

All 40 are passed inline at `EstimateSheetContent.tsx:2244` (L2245–2285).

**Where the behaviour lives.** The orchestrator (`useEstimateRowHandlers`, body from L445) sequences optimistic mutation, dirty/clean reconciliation, library-data refresh, and read-only-attempt telemetry. It is the sheet's brain.

**Shallow signal + deletion test.** Interface ≈ implementation: the hook's input is "the entire surrounding state + every mutation". Pure helpers in `editable-row-model.ts` ARE behaviour-tested (`estimate-sheet-extracted-models.test.ts`, `estimate-sheet-quantity-contingency-model.test.ts`, 8 test files import it). The orchestrator beside them appears only in **contract/anchor** tests (`estimate-sheet-unit-003-contracts.test.ts`, `security-findings-implementation-contracts.test.ts`) — no behaviour test crosses the hook. **Verdict: deepen to a `RowMutationCoordinator` with ~5 inputs** — put the orchestration behind an interface so the interface becomes the test surface (habits #3 "no-locality").

### UNIT-ARCH-04 — Row commit/dirty/routing rules need a tested home

**Interface surface.** `rows/row-table.tsx` (**1396 lines** — note: the source-review HTML's "~1050" has drifted; verified count is 1396). The row render component `EstimateRowItemTableRow` is a `memo` at L332 with a 36-field `EstimateRowItemsTableProps` (L74). Per-row state already flows through a zustand selector at **L380** (`useStore(editableRowStore, (state) => state.rows[item.id])`) — per-row re-render is solved; the remaining width is the commit layer.

**Where the behaviour lives.** Four commit handlers, each a hand-diff + a route decision (library-linked vs plain row), inline in the render scope:
- `commitExpressFields` (L509)
- `commitQuantityFields` (L548)
- `commitRowAdjustmentPercentage` (L596)
- `commitContingencyPercentage` (L611)

They branch on `onUpdateLinkedLibraryComponent` vs `onUpdateRowItem` — a routing rule with no home.

**Shallow signal + deletion test.** `editable-row-model.ts` (pure parse/format/build helpers: `calculateContingencyValue`, `updateEditableRowValue`, `buildEditableRowValue`, `parseEditableQuantityExpression`, …) is the tested half. The commit/routing rule beside it is the untested half. **Verdict: lift the rule into a tested module** (the model already shows the pattern works).

### UNIT-ARCH-05 — Collapse four-layer prop-drilling + delete two memo comparators

**Interface surface (all verified).**
- `rows/branch.tsx` (622 lines): `EstimateSheetBranchProps` = **46 props** (L35–81); a `SheetMutationHandlers = Pick<…, 22 handlers>` (L88–112); hand-written `areEstimateSheetBranchPropsEqual` (L157, body ~68 lines through ~L225).
- `rows/row-table.tsx`: `EstimateRowItemsTableProps` = **36 props** (L74); `areEstimateRowItemsTablePropsEqual` (L131–174, ~44 lines).
- `rows/cells.tsx` (1486 lines): `EstimateMaterialCell` = **30 props** (L1142, signature L1142–1171).

**Where the behaviour lives.** The two comparators ARE the real interface — they decide what re-renders. The props are a bag; the comparator is the filter.

**Shallow signal + deletion test.** The contract test `tests/vitest/estimate-sheet-unit-003-contracts.test.ts` reads the source **as text** and asserts anchor strings (`expect(branchSource).not.toContain("prev.rowMutationStatuses !== next.rowMutationStatuses")`, plus `slice(...)` on the comparator body). It does not exercise behaviour; it pins spelling. **Verdict: the comparators are load-bearing but spelling-pinned** — deepen by routing per-row state through the store (already started at row-table L380) so the comparators delete.

### UNIT-ARCH-06 — Delete the pass-through field-setter reducer pattern

Three files repeat one shape: a reducer whose every case is `return { ...state, field: resolveStateUpdater(state.field, action.field) }`, plus N setter wrappers, where `resolveStateUpdater` re-implements the `useState` functional-update convention.

**Verified counts:**

| File | Action variants | Reducer cases | Setter wrappers | `resolveStateUpdater` uses |
|---|---|---|---|---|
| `EstimateSheetTree.tsx` | 16 (L201–217) | 16 (L244–287) | 16 (`setReorderStatus`…`setTreeFilter`, ~L400–447) | def L219 + per-case |
| `ComponentLibraryManager.tsx` | 19 | 19 (L425+) | 19 | **19** |
| `EstimateSheetContent.tsx` | 1 generic `fieldChanged` (L770/864) | 1 case (L869) | ~24 setters among 42 `useStableCallback` | — |

Representative case body (`EstimateSheetTree.tsx:283`):
```ts
return { ...state, treeFilter: resolveStateUpdater(state.treeFilter, action.treeFilter) };
```
Representative wrapper (same file, `setTreeSearchQuery`): a `useCallback`/`useStableCallback` whose body is `dispatch({ type: "treeSearchQueryChanged", treeSearchQuery })`.

**Deletion test.** Delete the reducer + wrappers; replace with `useState` per field. Behaviour is identical because every case is a one-line field assignment and `resolveStateUpdater` (L219) is exactly the `updater instanceof Function ? updater(prev) : updater` convention `useState` already honours. **Verdict: fails the deletion test outright.** This is Phase 0 (disjoint files, zero behaviour change).

**Exception — keep.** The sibling `componentLibrarySheetReducer` (`ComponentLibraryManager.tsx:247`) **does encode logic**: `catalogueBranchToggled` mutates a `Set`, `denseSortChanged` calls `getNextDenseSortState`. It passes the deletion test. It is not a target.

### UNIT-ARCH-07 — Hoist the duplicated Component/Folder mutation layer

**Interface surface.** Two large UIs each re-implement folder CRUD/move/archive:
- `component-library/index.tsx` (**3634 lines**): `commitInlineFolderEdit` L1798, `createFolder` L1893, `confirmDeleteFolder` L1973, `archiveLibraryItems` L2131, `handleLibraryItemMove` L2671.
- `component-library-manager/ComponentLibraryManager.tsx` (**3160 lines**): `commitCreateFolder` L2788, `commitRenameFolder` L2822, `confirmDeleteFolder` L2862, `moveComponentToFolder` L2905.

**Where the behaviour lives — duplicated.** The generation-tracking move queue is the clearest copy: three refs appear in both files verbatim:
- index.tsx: `componentFolderMoveQueueRef` (L1043), `componentFolderMoveGenerationRef` (L1044), `confirmedComponentFolderRef` (L1045)
- Manager.tsx: same three (L2151, L2152, L2153), with the generation-increment + rollback at Manager.tsx:2915–2916.

**Row-shape leakage (verified).** The domain `EstimateRowItem` shape is referenced **22× in index.tsx** and **39× in Manager.tsx** — the raw Row leaks into both UIs across what should be a Component/Folder seam.

**Deletion test.** Inlining one into the other is impossible (two consumers); the duplication is the cost of having no module. **Verdict: hoist one mutation module**; both UIs call it and stop holding the Row shape ( feeds UNIT-ARCH-02's write-repository; sequencing puts this after 02).

### UNIT-ARCH-08 — last-owner invariant, one home

**Interface surface.** `src/lib/admin/corporate-account-repository.ts` (1100 lines). The module itself is reasonable; the invariant is not.

**Four encodings of one rule (verified):**
1. `addCorporateAccountMember` — `INSERT … ON CONFLICT … WHERE … OR EXISTS (…other_owner…)` at **L475**
2. `removeCorporateAccountMember` — `DELETE … WHERE role != 'owner' OR EXISTS (…)` at **L566**
3. `updateCorporateAccountMemberRole` — `UPDATE … WHERE role != 'owner' OR ? = 'owner' OR EXISTS (…)` at **L625**
4. `isLastOwner` — a TypeScript helper that re-encodes the rule as `COUNT(*) … WHERE role='owner'` + a role check (L511–536); called by `updateCorporateAccountMemberRole`'s pre-flight guard.

(Three other `EXISTS` at L324/L350 belong to unrelated query functions, not this invariant.)

**Deletion test.** The three SQL predicates cannot be deleted (they are the authority at the row). The TS helper **can** be deleted if the rule lives in one SQL expression the caller trusts, or kept as the single source if SQL is collapsed. **Verdict: one home, not four** — either a single tested `assertNotLastOwner` SQL predicate or a sole TS authority.

### UNIT-ARCH-09 — Collapse six BetaOperatingSourceSnapshot adapters

**Interface surface.** The deep module already exists: `buildBetaOperatingOverview` in `src/lib/admin/beta-operating-overview.ts` (defines `BetaOperatingSourceSnapshot` at L23, the deep overview builder, plus `sourceAvailability`/`unavailableMetric` logic). The leak is the six adapters that hand-build the snapshot upstream.

**Six adapter encodings (verified):**
1–4. `app/admin/page.tsx` L58–92: **four inline** adapters — `activation` (L63), `feedback` (L74), `support` (L83), `incidents` (L84) — each a 6–8-line `availability`/`asOf`/`errorCategory`/`fields` object literal.
5. `lib/admin/recovery-overview.ts:10` `unavailableRecoverySource` and `release-overview.ts:12` `unavailableReleaseSource` — **byte-identical bodies** (the `diff` differs only in the function name token).
6. `lib/admin/feedback-aggregate.ts:17` `unavailableFields` and `support-aggregate.ts:17` `unavailableFields` — **byte-identical** (the `diff` differs only in the surrounding exported caller name `getFeedbackAggregate…` vs `getSupportAggregate…`).
7. `lib/admin/activation-cohort-repository.ts:100` `unavailableAggregateFields` — its own field-level adapter.

~50 duplicated lines across the six.

**Deletion test.** Each adapter exists because callers hold aggregate-shaped data and must mould it into `BetaOperatingSourceSnapshot`. A single `toSourceSnapshot(aggregate)` ( + an `unavailableSource(category)` helper) absorbs all six. **Verdict: the deep module already exists; delete the adapters.**

---

## 2. The three systemic habits, quantified

### 2a. God-modules

| File | Lines | `^export` decls | Concerns mixed |
|---|---|---|---|
| `src/lib/repositories/workspace-repository.ts` | 4441 | 44 (31 fn/const) | Estimate-tree read × project × workspace × tab × route-context × cache |
| `src/lib/component-library/actions.ts` | 5545 | 68 | Component/Variant/Folder write SQL × upload assets × price-option fan-out × outbox × event emission |
| `src/lib/estimates/actions.ts` | 4197 | 63 | Estimate CRUD × source-snapshot sanitization × promotion × image upload |
| `src/components/workshop/estimate-sheet/rows/cells.tsx` | 1486 | — | Material cell render × express editor × image upload × variant picker × replace/move |

Three of the four are server-action/repository files whose "interface" is the export list — i.e. width ≈ implementation width.

### 2b. Pass-through reducers (count the wrappers)

Total across the three target files: **16 + 19 + ~24 ≈ 59 setter wrappers** + **36 reducer cases** (16 + 19 + 1), every case a one-line field assignment routed through `resolveStateUpdater` (the `useState` convention re-implemented). Representative wrapper, `EstimateSheetTree.tsx` (paraphrased from L400–447):
```ts
const setTreeSearchQuery = (treeSearchQuery: string) =>
  dispatch({ type: "treeSearchQueryChanged", treeSearchQuery });
```
Representative case body at L283:
```ts
return { ...state, treeFilter: resolveStateUpdater(state.treeFilter, action.treeFilter) };
```
Both deleted under Phase 0 with zero behaviour change ( see UNIT-ARCH-06 exception: `componentLibrarySheetReducer` L247 stays).

### 2c. No-locality extractions (tested pure helper beside untested orchestrator)

| Concern | Tested pure helper (locality) | Untested orchestrator beside it |
|---|---|---|
| Row editing math | `rows/editable-row-model.ts` (8 test files, incl. `estimate-sheet-extracted-models.test.ts`, `estimate-sheet-quantity-contingency-model.test.ts`) | `use-estimate-row-handlers.ts` (orchestrator, only anchor/contract tests) — UNIT-ARCH-03 |
| Row commit/dirty/routing | `rows/editable-row-model.ts` parse/format/build helpers | `row-table.tsx` `commitExpressFields`/`commitQuantityFields`/`commitRowAdjustmentPercentage`/`commitContingencyPercentage` (L509/548/596/611) — UNIT-ARCH-04 |
| Component fan-out plan | (would be) write-repository builder | `actions.ts` inline `buildComponentPriceOptionWritePlan`/`buildUpdateCostLibraryComponentFanOutStatements` (L1796/2895) — UNIT-ARCH-02 |

Pattern: a pure helper is extracted *for testability*, the orchestrator that decides **when** and **in what order** stays in the render/action scope and stays untested. The deepening move puts the orchestration itself behind the interface so the module becomes the test surface.

---

## 3. False / dead seams inventory

| Symbol | Location | Importers (prod) | Verdict |
|---|---|---|---|
| `estimateRepository` (whole file) | `src/lib/repositories/estimate-repository.ts:108` (file 108 lines, in-memory only) | **0** | **Dead.** `estimateRepository` appears only at its own definition; no importer in `src/`. Safe to delete with UNIT-ARCH-01. |
| `clearEstimateRouteContextProcessCache` | `workspace-repository.ts:4090` | **4 call sites** | **False seam.** Body is `void projectId;` (no-op). Callers: `estimates/actions.ts:2291, 3807, 4070` + `estimates/express-promotion-actions.ts:927`. Delete the symbol + the 4 call sites. |
| `getProjectEstimateTreeByNode` (public export) | `workspace-repository.ts:4396` | **0 external** (1 internal at L4316) | Dead public surface; collapse with the carve. |
| `helpers.ts` dead half | `component-library/helpers.ts` (683 lines) | **0 prod** (only `tests/vitest/component-library-helpers.test.ts`) | `filterComponents`, `sortComponents`, `groupComponents`, `parseLibraryCsv`, `exportLibraryItemsToCsv`, `createDefaultLibraryBundles` each have **0 production importers** — auxiliary UNIT-ARCH-A5. |

---

## 4. Evidence fingerprints

All anchors re-verified against live source on 2026-07-16.

- **EV-ARCH-01** (UNIT-01): `workspace-repository.ts` 4441 lines / 44 `^export`; entries at L3852/4221/4245/3883/4153/4396; private chain L3991/L4015/L4093; caller counts 12/8/3/2/2/0; no-op cache L4090 body `void projectId;`; dead file `estimate-repository.ts:108` with 0 importers.
- **EV-ARCH-02** (UNIT-02): `actions.ts` 5545 lines; table leakage upload_assets 10/0, component_variant_attachments 7/2, cost_library_item_variant_cost_entries 6/2, estimate_sheet_events 2/0, activity_event_outbox 1/0; builders L615/1796/2539/2895/3007; INSERT L2637; UPDATEs L3141–3298; read-repo `component-library-repository.ts` 2361 lines.
- **EV-ARCH-03** (UNIT-03): `use-estimate-row-handlers.ts` 1503 lines; input type L97–138 = **40 fields**; consumed `EstimateSheetContent.tsx:2244`; `editable-row-model.ts` tested by 8 test files; orchestrator only in anchor/contract tests.
- **EV-ARCH-04** (UNIT-04): `row-table.tsx` **1396 lines** (HTML said ~1050 — drift); commit fns L509/548/596/611; `EstimateRowItemTableRow` memo L332; zustand selector L380; `editable-row-model.ts` pure+tested.
- **EV-ARCH-05** (UNIT-05): `branch.tsx` 622 lines, 46 props L35–81, 22-handler Pick L88–112, comparator L157 (~68 lines); `row-table.tsx` 36 props L74, comparator L131–174; `cells.tsx` `EstimateMaterialCell` 30 props L1142; contract test asserts `toContain`/`slice` strings only.
- **EV-ARCH-06** (UNIT-06): variants L201–217, reducer L244–287 (16 cases), `resolveStateUpdater` L219, setters ~L400–447 (16); Manager 19/19/19 (reducer L425, state L343); Content `fieldChanged` L770/864/869 + 42 `useStableCallback`; keep-exception `componentLibrarySheetReducer` L247 (toggles Set, calls `getNextDenseSortState`).
- **EV-ARCH-07** (UNIT-07): `index.tsx` 3634 lines, folder fns L1798/1893/1973/2131/2671; `Manager.tsx` 3160 lines, folder fns L2788/2822/2862/2905; duplicated refs index 1043–1045 / Manager 2151–2153 + L2915–2916; `EstimateRowItem` refs 22 / 39.
- **EV-ARCH-08** (UNIT-08): SQL `EXISTS` at L475/566/625; `isLastOwner` TS helper L511–536; non-invariant `EXISTS` at L324/350.
- **EV-ARCH-09** (UNIT-09): inline adapters `app/admin/page.tsx` L58–92 (4: activation/feedback/support/incidents); `recovery-overview.ts:10` + `release-overview.ts:12` identical bodies; `feedback-aggregate.ts:17` + `support-aggregate.ts:17` identical `unavailableFields`; `activation-cohort-repository.ts:100` `unavailableAggregateFields`; deep `buildBetaOperatingOverview` in `beta-operating-overview.ts` (snapshot type L23).
- **EV-ARCH-AUX**: A1 `EstimateSheetContent.tsx` `displayedSheetNode` memo L1777 (identity invariant comment L1774); A2 `project-activity-repository.ts:156` hardcodes `philipjonlewis@gmail.com → "Philip Lewis"` (309 lines) + `project-activity-feed-repository.ts` 1515 lines; A3 `SOURCE_SNAPSHOT_ALLOWED_KEYS` `estimates/actions.ts:1543`, `sanitizeSourceSnapshot*` L1606–1623; A5 six dead `helpers.ts` exports each 0 prod importers (only `component-library-helpers.test.ts`).

---

## 5. Gaps / open questions

1. **Caller-count convention.** Counts above include import lines (e.g. `getEstimateTabTree` = 12 incl. its import; 11 excluding). The blast-radius doc (`02-BLAST-RADIUS-ANALYSIS.md`) should fix one convention (recommend: import + call site = "reach") so UNIT-01's "12 callers" is unambiguous.
2. **`row-table.tsx` line drift.** Verified 1396 lines vs the source-review HTML's "~1050". The file grew ~350 lines since the review; the commit anchors (L509/548/596/611) still hold. Blast-radius / perf docs should cite 1396.
3. **`helpers.ts` "Json" helper.** The source-review listed a `Json` export as dead; not re-verified here (only the 6 named exports were confirmed 0-importer). UNIT-ARCH-A5 should grep `Json`/`toJSON` explicitly before claiming it.
4. **`isLastOwner` caller surface.** Confirmed it is called from `updateCorporateAccountMemberRole`'s pre-flight; UNIT-ARCH-08 should confirm whether `add`/`remove` also reach it (they currently rely on SQL alone) before choosing "SQL-authoritative" vs "TS-authoritative" — a real decision for `06-RISKS-DECISIONS-AND-NON-GOALS.md` (likely DEC-ARCH slot).
5. **Pass-through setter exact count in `EstimateSheetContent.tsx`.** 42 `useStableCallback` total; ~24 are pure field setters, the rest are real handlers. UNIT-ARCH-06 should classify each before deletion (a few may encode one-liner side effects worth keeping).
