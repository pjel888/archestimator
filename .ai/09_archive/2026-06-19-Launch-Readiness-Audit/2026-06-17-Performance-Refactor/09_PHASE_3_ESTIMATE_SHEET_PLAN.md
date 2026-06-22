# 09 — Phase 3: Estimate Sheet Decomposition & Render Isolation

> **Authoring agent:** W8. **Status:** Detailed phase plan. Authoritative inputs: `_research/_SYNTHESIS.md` (contract §1 Estimate sheet, §3 tracks 2 & 3), dossier `R4-sheet.md` (primary), `R2-state.md`, `R3-trees.md`; Wave-1 `04_TARGET_ARCHITECTURE.md` §7, `01_CODEBASE_AUDIT.md` (A-04..A-09, A-19..A-21), `02_PATTERN_INVENTORY.md` (PAT-13, PAT-15, PAT-27).
>
> **Conventions:** Priority `P0–P3`, Risk `Low/Med/High/Critical`, evidence `path:line — observation` (contract §4). Decision/Risk/Question IDs cross-ref `17_DECISION_LOG.md` (D-NN), `16_RISK_REGISTER.md` (RISK-NN), `19_OPEN_QUESTIONS.md` (Q-NN). **Planning only** — no `src/**`/`tests/**`/`scripts/**`/config changes (contract §4). New scripts/tests are *proposals* flagged "to be added in Phase N."
>
> **This is the HIGHEST-risk phase (RISK-01, Critical).** It depends on Phase 1 primitives (incremental-totals index, structural-hash signature, query-key factory, `patchAndMarkStale`) and Phase 2 kernel (`TreeIndex` + `rollup`). It must not start before those land and `bun run validate` is green at the Phase 2 boundary (RISK-14).

---

## 0. Path corrections (found during planning — log to 19_OPEN_QUESTIONS / fix-as-found)

Two source facts diverge from the dossier citations. Implementers use the **verified** paths/values below; the pinned *findings* are unchanged.

- **C-1 — `editable-row-model.ts` real path.** The contract/R4 cite `src/lib/estimates/editable-row-model.ts:162-183` for `computeNodeTotals`. The file actually lives at **`src/components/workshop/estimate-sheet/rows/editable-row-model.ts`** (`computeNodeTotals` `:162-183`, `computeNodeTotal` `:155-160`/`:155-` actual `153-160`, `collectEditableRows` `:131-143`, `updateEditableRowValue` `:29-52`, `EditableRowValue` shape `:54-66`). Every reference in this plan uses the real path. (Citation typo only; all line ranges match.)
- **C-2 — Virtualization flags default ON, not off.** Contract §1 / R4 finding-5 flag the virtualization flags as an open question ("if off in prod, no branch virtualization at all"). `src/lib/workshop/virtualization-flags.ts:11-15` reads them via `readPublicFlag(env, true)` — **all three default to `true`** (`tree`, `estimateMasterColumn`, `estimateRows`); only `estimateColumnResize` defaults `false`. Thresholds: branch `minSections 80` (`:25`), rows `minRows 75` (`:21`), tree `minRows 150` (`:20`). This *partially closes* Q-C (RISK-12): virtualization is ON by default but env-overridable, and the **thresholds**, not the flags, are the gap. Still confirm the prod env does not set `NEXT_PUBLIC_*_VIRTUALIZATION=0` (Q-C, measurement).

---

## 1. Scope, goals, and the one hard constraint

**Goal (contract §3 track 2 & 3):** decompose the 1881-LOC `EstimateSheetContent` exported function (`EstimateSheetContent.tsx:1042-2922`) along R4's responsibility map into per-responsibility hooks + a presentational center column, AND sever the `editableRows` map-identity fan-out so a single-cell keystroke no longer triggers full-tree compute. Resolves A-04 (Critical), A-07 (Critical), A-09/A-19/A-21 (High/Med), PAT-13, PAT-15, PAT-27.

**Non-goals (owned by other phases):**
- Tree kernel (`TreeIndex`, `rollup`, structural-hash) is **built** in Phase 2/1; Phase 3 *consumes* it. (RISK-14: serialize edits to shared seam files.)
- Optimistic-mutation adapter consolidation = Phase 5 (A-10, PAT-09). Phase 3 only *extracts* the 15 row-mutation callbacks (R-M) into a hook; their internal optimistic logic is left byte-identical until Phase 5.
- Selection-store merge = Phase 5 (A-13, PAT-26). `bulkSelectedRowIds` (local Set, `:1099`) stays local here (Q-08e).
- Left-tree (`EstimateSheetTree`) per-keystroke recompute = Phase 2 (A-15). The tree↔sheet double-compute seam is RISK-12 / Q-05 — Phase 3 shares one `TreeIndex`/`rollup` instance with the tree but does not refactor the tree's render.

### THE HARD CONSTRAINT (non-negotiable, cross-cuts every step) — A-08 / contract §1 / D (preserve-guards)

> **The load-bearing memo guards MUST be preserved byte-for-byte in behavior.** `areEstimateSheetBranchPropsEqual` (`branch.tsx:111-156`) and `areEstimateRowItemsTablePropsEqual` (`row-table.tsx:86-116`) compare **per-row `editableRows[item.id]` identity** + per-row `selectedRowIds.has(item.id)` + `nodeTotals?.get(node.id)` (verified: `branch.tsx:145-156`, `row-table.tsx:110-114`). A keystroke in row A skips rows B…N and sibling branches **today**. The problem this phase solves is **COMPUTE**, not row re-renders.

These guards depend on three invariants the refactor must keep:
1. **Stable callback identity** — every `on*` prop passed to branches/rows comes from `useStableCallback` (`EstimateSheetContent.tsx:1071, 1811+`). Extracting callbacks into `useEstimateRowOperations` (Step 6) must return the **same identity-stable** references, never fresh closures per render.
2. **Per-row `editableRows[id]` reference equality** — only the edited row's entry changes identity. The per-row subscription model (Step 4) must preserve this: row A's value object changes, rows B…N's value objects stay reference-equal.
3. **`nodeTotals` Map always present + per-node identity meaningful** — `branch.tsx:151-156` falls back to `computeNodeTotal` if `nodeTotals` is absent (latent O(n²), A-09). Incremental totals (Step 5) must keep `nodeTotals` always-present and only change the entries on the edited row's ancestor chain (so `Object.is(prevTotal, nextTotal)` stays true for untouched branches → guard short-circuits).

**Any step that would change a guard's comparator signature is rejected.** If a guard *must* change (e.g. a prop is removed), it is a separate, explicitly-reviewed sub-step with its own render-isolation test diff.

---

## 2. Current responsibility map (refined from R4 §"responsibility map", line-ranged)

`EstimateSheetContent.tsx` = **2950 LOC**; exported fn `EstimateSheetContent` = **1881 LOC** (`:1042-2922`); ~17 in-fn responsibilities + ~8 module-level helper concerns; ~40 state atoms; 109 hook calls (R2). This is the authoritative target map for extraction.

### 2A. Module-level helpers (above the component, `:178-1040`)

| # | Concern | Lines | Extraction target |
|---|---|---|---|
| H-1 | Tree DFS path/code utils (`findNodePath`, `findEstimateRowItem`, `computeNodeCode`) | `:178-213` | Replaced by `TreeIndex.find`/`pathOf` (Phase 2); thin shims kept until call sites migrate |
| H-2 | Row/template clone + mutate-tree helpers (`createBlank/ExpressEstimateRowTemplate`, `cloneLibraryItemForEstimate`, `cloneTemplateNodesForEstimate`, `appendTemplateNodesToParent`, `removeEstimateRowItem`, `applyEditableValuesToLibraryItem`, `replaceRowItemWithLibraryItem`) | `:221-505` | Move into `useEstimateRowOperations` module (Step 6) |
| H-3 | **Proposal preview signature** `createProposalPreviewSignature` (full-tree 15-field string DFS) | `:287-318` | Move into `useProposalExport`; recompute off hot path / via `structuralHash` (Step 7) |
| H-4 | Proposal export URL/blob plumbing | `:322-369` | Move into `useProposalExport` (Step 7) |
| H-5 | Activity scope tree builder `buildActivityScopeTreeItems` (full-tree DFS, gated) | `:507-585` | Move into `useEstimateActivityHistory`; use `TreeIndex.descendantsOf` (Step 8) |
| H-6 | `EstimateSheetHeader` sub-component | `:594-677` | Move under `<EstimateSheetCenterColumn>` (Step 9) |
| H-7 | Search/facet/group transforms (7 DFS) | `:682-826` | Move into `useSheetDisplayTransforms`; index-back (Step 10) |
| H-8 | Realtime cursor layer (already isolated sub-components) | `:828-1040` | **Already extracted — the extraction template.** Leave as-is. |

### 2B. In-function responsibilities (`:1042-2922`)

| ID | Responsibility | Key lines | Owns state | Extraction target (Step) |
|---|---|---|---|---|
| R-A | Query loading / tree-source switch (legacy vs tab tree) | `:1066-1090` | `tabInitialNodes`, `estimateTree`, `setEstimateTreeData`, `restore`, `getTreeRevision` | `useEstimateTreeSource` (Step 11, low-risk) |
| R-B | Lazy component-library load | `:1179-1218` | `libraryQuery`, `resolvedLibraryItems`, `availableTemplates` | `useLazyEstimateLibrary` (Step 11) |
| **R-C** | **Editable-row state (keystroke hot path)** | `:1093`, `:1766-1783` | `editableRows`, `skipEditableRowsSyncRef`, resync effect | **`useEstimateEditableRows` (Step 4 — FIRST)** |
| R-D | Express-component insert drafts | `:1094-1145`, `:1893-1967` | `expressInsertDraftsRef`, `expressInsertDrafts(States)` | `useExpressInsertDrafts` (Step 6 sibling) |
| R-E | Column-width store wiring | `:1107-1131` | `committed/hydrate/commit/reset` widths, `estimateColumnStyle/ResizeConfig` | `useEstimateColumnWidths` (Step 11) |
| R-F | Selection resolution + node presentation | `:1274-1290` | `resolvedSelectedNodeId`, `selectedNode`, `selectedNodePresentation` (2 DFS) | Index-backed (Step 5/10); selection stays local |
| R-G | Search/facet/group display state | `:1291-1318` | `sheetSearchQuery`, `sheetFacets`, `sheetGroupMode`, `displayedSheetNode`, `sheetFacetOptions` | `useSheetDisplayTransforms` (Step 10) |
| R-H | Collapse/expansion state | `:1098`, `:1319-1344`, `:1442-1444` | `collapsedNodeIdsByScope`, `collapsedNodeIds`, `allNodeIds`, `expandAll/collapseAll` | `useSheetExpansion` (Step 10 sibling) |
| R-I | Bulk row selection | `:1099`, `:1345-1392`, `:2541-2544` | `bulkSelectedRowIds` (Set), `visibleSheetRowIds`, prune effect, `deleteSelectedRows` | `useBulkRowSelection` (Step 10 sibling); index-backed `visibleSheetRowIds` |
| **R-J** | **Totals computation** | `:1401-1410` | `estimateNodeTotals`, `displayedNodeTotals`, `projectTotal` | **`useEstimateTotals` (Step 5 — SECOND)** |
| R-K | Activity history (well-gated) | `:1146-1175`, `:1411-1582`, `:1670-1712` | `inspector`, `rowDetails`, `historyData`, `activityFilters`, etc. | `useEstimateActivityHistory` (Step 8) |
| R-L | Proposal preview/export | `:1100-1106`, `:1219-1272`, `:1583-1669`, `:2588-2601` | `isProposalPreviewOpen`, `proposalPreviewModel`, `proposalPreviewSignature`, etc. | `useProposalExport` + `<ProposalExportController>` (Step 7) |
| R-M | Row mutation orchestration (15 stable callbacks + inline tree mutators) | `:1811-2539` | `commitRowItemUpdate`, `updateRowItem`, `insertLibraryItem`, `insertTemplate*` ×5, `replaceRowItem`, `deleteRowItem`, `moveRowComponent`, etc. | `useEstimateRowOperations` (Step 6 — LARGEST LOC) |
| R-N | Command palette + global shortcuts + window-event bridges | `:1097`, `:2253-2319` | `showCommandPalette`, Cmd-K/"/" effect, `INSERT_*_EVENT` listeners | `useSheetCommandsAndEvents` (Step 11) |
| R-O | Tab strip orchestration | `:1160-1166`, `:2774-2787` | `tabStripRef`, `createTabState` | Stays in center column (Step 9) |
| R-P | Cross-tree header-action registration | `:2548-2576` | registers `openActivity`/`openProposalPreview` into header store | Stays; documented as event bridge (Step 9) |
| R-Q | The render tree | `:2578-2922` | (JSX) | Split: dialogs stay; center column → `<EstimateSheetCenterColumn>` (`:2662-2892`) (Step 9) |

### 2C. The fan-out (the thing to sever — A-07, PAT-13)

`editableRows` is one `useState<Record<id, EditableRowValue>>` (`:1093`). `updateEditableRowValue` (`editable-row-model.ts:29-52`) returns `{...current, [id]:{...}}` — **the map reference changes on every keystroke** (verified `:35-52`). That identity change fans out to 6+ whole-tree memos/effects (verified deps lists):
- `estimateNodeTotals = computeNodeTotals(...)` (`:1401`) — full-tree totals DFS (`editable-row-model.ts:162-183`).
- `displayedNodeTotals` (`:1402-1406`) — SECOND `computeNodeTotals` when a filter/group is active.
- `getProposalPreviewSignature`/`currentProposalPreviewSignature` (`:1250-1263`) — full-tree 15-field string DFS once the dialog has opened.
- `currentRows = flattenEstimateRows` (`:1413-1414`, gated), `activityScopeItems` (`:1423-1429`, gated) — full-tree DFS, but correctly modal-gated (cost ~0 when no modal open — good).
- proposal model `materializeEditableEstimateTree` (`:1590,1596`).
- the resync effect `collectEditableRows` (`:1766-1783`).
- ~10 mutation handlers read it as `previousRows` (`:1817,1974,2034,2081,2192,2328,2372,2434,2487,2512`).

---

## 3. Proposed module boundaries (refined from R4 §"Proposed module boundaries" + 04 §7.1)

Seven hooks + one presentational component + the editable-rows external store. Files land under `src/components/workshop/estimate-sheet/` (co-located with existing `rows/`, `columns/`). All hooks return **identity-stable** callbacks (Constraint inv. 1).

| Target unit | New file (proposal) | Owns | Win | Risk |
|---|---|---|---|---|
| **`editable-rows-store.ts`** (external store) | `src/components/workshop/estimate-sheet/rows/editable-rows-store.ts` | per-row `EditableRowValue` map + per-row subscription | severs fan-out — single biggest lever | High |
| **`useEstimateEditableRows`** | `estimate-sheet/hooks/use-estimate-editable-rows.ts` | R-C: store wiring + resync effect (`:1766-1783`) + `collectEditableRows` | per-row subscription | High |
| **`useEstimateTotals`** | `estimate-sheet/hooks/use-estimate-totals.ts` | R-J: `estimateNodeTotals`, `displayedNodeTotals`, `projectTotal` | incremental ancestor-chain rollup | High |
| `useProposalExport` + `<ProposalExportController>` | `estimate-sheet/proposal/use-proposal-export.ts` + `.tsx` | R-L + H-3/H-4 signature | signature off hot path | High (RISK-03) |
| `useEstimateActivityHistory` | `estimate-sheet/activity/use-estimate-activity-history.ts` | R-K + H-5 | clean extraction (already gated) | Med |
| `useEstimateRowOperations` | `estimate-sheet/hooks/use-estimate-row-operations.ts` | R-M + H-2 tree mutators | largest LOC win; feeds Phase 5 adapter | High |
| `useSheetDisplayTransforms` (+ `useSheetExpansion`, `useBulkRowSelection` siblings) | `estimate-sheet/hooks/use-sheet-display-transforms.ts` | R-G/H-7 (+ R-H, R-I) | isolates filter recompute | Med |
| `<EstimateSheetCenterColumn>` | `estimate-sheet/EstimateSheetCenterColumn.tsx` | R-Q center JSX (`:2662-2892`) + H-6 header + R-O tab strip | pre-derived props only | Med |
| low-risk hooks | `use-estimate-tree-source.ts`, `use-lazy-estimate-library.ts`, `use-estimate-column-widths.ts`, `use-sheet-commands-and-events.ts` | R-A, R-B, R-E, R-N | LOC reduction, low blast radius | Low |

**Constraint reminder:** the cursor layer (`:828-1040`, H-8) is the **proven extraction template** — already a set of sub-components consuming derived props. Every new unit mirrors that shape: take already-derived props/values, return identity-stable handlers, never re-derive whole-tree state internally.

---

## 4. Editable-state strategy — sever the `editableRows` fan-out (the highest-value work; do FIRST behind tests)

**Resolves A-07 (Critical), PAT-13, contract §1, 04 §7.2. Q-08b/Q-08c open.**

### LAW — Official sheet-model pipeline (Bible §4.1)

> **The sheet data flow is a single named, ordered pipeline. No stage may be skipped, fused, or reordered:**
>
> `server DTO / query cache → normalized tree index → editable row model → totals map → visible branch projection → virtual branch/row rendering`

Stage map onto this plan's units:

| Stage | Owner (verified path) |
|---|---|
| server DTO / query cache | `estimateQueryKeys.tabTree` cache (R-A, `EstimateSheetContent.tsx:1066-1090`) |
| normalized tree index | `TreeIndex` (Phase 2; consumed here) |
| editable row model | `editable-row-model.ts` (`src/components/workshop/estimate-sheet/rows/editable-row-model.ts`) |
| totals map | `useEstimateTotals` rollup over `TreeIndex` (Step 5, `:1401-1410`) |
| visible branch projection | `useSheetDisplayTransforms`/`flattenVisibleBranches` (Step 8/10, `virtual-branch-list.tsx:44-72`) |
| virtual branch/row rendering | `<EstimateSheetCenterColumn>` + `row-table.tsx` (Step 9) |

**`editable-row-model.ts` (`src/components/workshop/estimate-sheet/rows/editable-row-model.ts`) is the ONLY place permitted to do sheet math / projection.** `computeNodeTotals` (`:162-183`), `computeNodeTotal` (`:153-160`), `collectEditableRows` (`:131-143`), `updateEditableRowValue` (`:29-52`) live there and nowhere else. No hook, component, or center-column JSX may recompute totals or re-project rows inline — they consume the row model's output. Any new sheet-math helper lands in this file or is rejected (Bible §4.1; cross-ref Constraint inv. 3, Step 5).

### 4.1 Design decision (Q-08b / Q-A in 04, D-009)

Two candidates (04 §7.2 picks the external store; **must measure before committing** — Q-A/Q-08b):
- **(picked) Per-row external store** (`useSyncExternalStore` or a tiny Zustand store) — `editableRows-store.ts` — components subscribe **per row id**; a keystroke in row A notifies only row A's subscriber + the totals selector for A's ancestor chain.
- (alt) `editableRows` in the TanStack tree cache — rejected for now: interacts with the tree-as-mutable-cache + revision model (A-12) and the resync effect; risks coupling the keystroke path to cache invalidation.

> **Q-A / Q-08b measurement gate (Phase 0 → Phase 3 entry):** before writing the store, run the Phase-0 keystroke-compute baseline (`reportEstimateSheetContentRender`, `reportEstimateNodeTotalsCompute`) and prototype both approaches against the large-tree fixture (A-39). Pick the one that keeps `nodeTotalsComputes===1` AND `rendersOutside===0` with the simplest reconcile path. Record in D-009.

### 4.2 Target store contract (04 §7.2)

```ts
// editable-rows-store.ts
interface EditableRowsStore {
  get: (rowId: string) => EditableRowValue | undefined;
  set: (rowId: string, value: EditableRowValue) => void;      // notifies ONLY rowId subscribers
  subscribeRow: (rowId: string, cb: () => void) => () => void;
  snapshot: () => ReadonlyMap<string, EditableRowValue>;       // COLD path only (export / reconcile)
}
```

- **`useSyncExternalStore` getSnapshot caching (SG-1 — implementation note):** the store's `getSnapshot`/`subscribeRow` for a given `rowId` MUST return a **cached, stable per-row reference** (never a freshly-allocated object per call) — otherwise `useSyncExternalStore` detects a "changed" snapshot every render and **infinite-loops**. Concretely: the listener registry is `Map<rowId, Set<cb>>`, and each row's snapshot is a stable cached `EditableRowValue` reference that is invalidated (re-allocated) **only** on that row's `set`. Reads between sets return the identical reference.
- Row component reads its own value via `subscribeRow(item.id)` — the per-row memo guard (`row-table.tsx:86-116`, `branch.tsx:111-156`) is **kept**, now reinforced by per-row subscription. **Critical:** the guards currently read `prev.editableRows[item.id] !== next.editableRows[item.id]`. Under the store, the prop becomes a per-row value (or the store ref + a per-row version), so the comparator still compares per-row identity — **the comparator signature must not change** (Constraint). If the store can't preserve the `editableRows[id]` prop shape, keep `editableRows` as a **derived stable Map prop** whose per-row entries change identity exactly as today (so the existing comparator is untouched).
- Whole-map `snapshot()` is called **only** on cold paths: export model build (R-L) and server reconcile (R-C resync). Never on the keystroke path.
- The setters at `row-table.tsx:344-346,378-379,396-398,434-436` (today `setEditableRows((cur)=>updateEditableRowValue(...))`) call `store.set(item.id, next)` instead. `updateEditableRowValue` (`editable-row-model.ts:29-52`) is reused to build the per-row value but no longer rebuilds the top-level map.

### LAW — Keystroke-local editing (Bible §4.3)

> **A cell keystroke MUST NOT update the whole sheet tree.** The edit stays local until commit.

Required keystroke lifecycle (this is the rationale for the per-row store, Step 4):
1. **Draft text lives in the input / row-local state** — not in any shared tree or global map.
2. **Row preview computes locally** — only the edited row's own derived display (`computedItem`, `row-table.tsx:201-238`).
3. **Commit on blur / Enter / controlled-debounce** — only on commit does anything leave the row.
4. **On commit:** optimistic query patch → reconcile against server → bump totals **once** via a single shared revision (one `nodeTotals` change on the edited row's ancestor chain, Step 5).

**Bad (the current fan-out, A-07/PAT-13):** an `onChange` that updates the global tree → recalcs every branch and re-renders the sidebar, totals, command palette, and dock on every keystroke. This is exactly what `editable-rows-store.ts` + the per-row subscription (§4.2) exist to prevent. Cross-ref GATE-EDIT-INIT / GATE-EDIT-RECONCILE / GATE-EDIT-IDENTITY (§4.5), test gate §13 #1/#1b.

### 4.3 Resync (A-21)

The resync effect (`:1766-1783`) runs `collectEditableRows` (full-tree DFS, `editable-row-model.ts:131-143`) on every `estimateTree`/`saveState` change, rebuilding the **entire** map (compounds the fan-out). Target: on reconcile, **diff against the `TreeIndex`** and `store.set` only changed rows, rather than rebuilding the whole map (A-21). Keep `skipEditableRowsSyncRef` semantics intact.

### 4.5 Required UX gates (cross-ref `20_UX_UI_AND_INTERACTION_PLAN.md`)

The per-row store (Step 4) and synchronous totals (Step 5) carry the
transient-state-preservation contract from `20_UX_UI_AND_INTERACTION_PLAN.md`
(scroll/focus/expansion/in-progress edit/active tab/selection survive across
re-render and reconcile). The following **named UX gates are REQUIRED** for the
relevant Phase-3 steps and must pass alongside the perf gates:

- **GATE-EDIT-INIT / GATE-EDIT-RECONCILE / GATE-EDIT-IDENTITY** — per-row store (Step 4):
  an in-progress edit initializes correctly, a server reconcile does **not** overwrite
  an in-progress edit (A-21 resync), and per-row value identity is stable for
  untouched rows.
- **GATE-NO-TOTAL-FLASH** — synchronous totals (Step 5): totals update synchronously
  on keystroke with no skeleton/flash.
- **GATE-CELL-KEYBOARD** — keyboard cell editing preserved through decomposition.
- **GATE-FOCUS-AFTER-MUTATION** — focus is returned/preserved after a row mutation
  (Step 6).
- **GATE-TRANSIENT-SURVIVAL** — scroll/focus/expansion/active-tab/selection survive
  the extraction and reconcile.

Cross-ref **D-017** (totals value-equality / `editableRows` object-identity scope),
**RISK-16** (structural sharing for the object surface), **Q-25** and **Q-33**.

### LAW — Virtual-branch interaction targets (Bible §4.4)

> **Each interaction in a virtualized sheet has a bounded, named work budget. Nothing triggers a full-tree recompute or a full-route overlay.**

| # | Interaction | Required behavior | Tie-in gate |
|---|---|---|---|
| 1 | Typing in a visible row cell | Input stays responsive; the committed update lands in <1 frame where possible (local preview, §4.3) | GATE-CELL-KEYBOARD; §13 #1/#1b |
| 2 | Expand / collapse a branch | Recompute the visible branch list **once** (index-backed `flattenVisibleBranches`, Step 10), not the tree | GATE-TRANSIENT-SURVIVAL; §11 |
| 3 | Add row | Optimistic row is visible **immediately**; no full-route overlay / suspense reset | GATE-FOCUS-AFTER-MUTATION; Step 6 |
| 4 | Move row | Update **only** source + target branches and their totals; no full refetch unless the server rejects | Step 6; §13 #1 (ancestor-chain) |
| 5 | Bulk insertion | Batch cache changes into **one render transaction**; no per-row render storm | Step 6/§10; §13 #5 (extraction-neutral) |

These bound the Step-4 fan-out severance and the Step-5 incremental totals: every row interaction's cost is proportional to the touched rows/branches, never the tree size (Bible §4.4; cross-ref the GATE-* set in §4.5 and the render-isolation gates in §13).

### 4.4 Validation (Step 4)

- `tests/vitest/perf/estimate-sheet-render-relief.test.tsx:162` (`rendersOutside === 0`) green.
- `estimate-sheet-memoization.test.tsx` (`nodeTotalsComputes === 1`, `proposalSignatureComputes === 0` on keystroke) green.
- `estimate-sheet-cursor-isolation.test.tsx` (`contentRenders()===0` while typing) green.
- **NEW gate (to be added in Phase 3, gated in Phase 9):** keystroke-in-row-A asserts rows B…N + sibling branches do **not** re-render (extends the relief gate per the task's test-strategy ask).
- Full `bun run test:dom` (361 serial) green.

---

## 5. Totals / signature strategy — incremental ancestor-chain totals (do SECOND)

**Resolves A-09 (High), PAT-15, contract §1, 04 §7.3. Depends on Phase 1 totals primitive + Phase 2 `rollup`/`TreeIndex`.**

`computeNodeTotals` (`editable-row-model.ts:162-183`) is a full-tree DFS rerunning on every cost-cell keystroke (because `editableRows` identity changed — fixed in Step 4, but the totals memo still recomputes on the changed-row signal). Target:

0. **Rollup invalidation contract (SG-4 — implementation note).** On a cost-cell keystroke the `TreeIndex` **structural revision is unchanged** (the tree shape did not change — only `editableRows` changed). So the incremental `rollup` memo is keyed on **`(structuralRevision, changedLeafId)`**: an unchanged `structuralRevision` means the index/ancestor topology is reused as-is, and `changedLeafId` (the edited row) is the cache-invalidation signal that triggers recompute of **only** `ancestorsOf(changedLeafId)`. The implementer does not have to infer the invalidation signal — it is explicitly this key. (Structural ops like add/move/delete bump `structuralRevision` and rebuild the index.)
1. Build a parent index **once per tree version** = `TreeIndex.parentOf`/`ancestorsOf` (Phase 2). Totals = a memoized `rollup` (04 §6.1 item 6) over that index.
2. On a keystroke in row A: (a) row A's leaf total recomputes (already cheap in the memoized `computedItem`, `row-table.tsx:201-238`); (b) **only A's ancestor chain** subtree totals recompute via `TreeIndex.ancestorsOf(A)` — not the whole tree.
3. **Untouched branches keep value-equal `nodeTotals.get(id)`** so the guard's `Object.is(prevTotal, nextTotal)` short-circuits — preserving Constraint inv. 3. The totals Map is **number-valued**, so this is satisfied by value-equality; no structural sharing is required for it.
   - **CORRECTED per D-017 / §V2-FACTS (OVERRIDES the earlier "HARD REQUIREMENT" framing):** the totals Map is `ReadonlyMap<string, number>` (`EstimateSheetContent.tsx:521`) and the branch guard does `Object.is(prevTotal, nextTotal)` over **NUMBERS** (`branch.tsx:147`) → **value-equality**. Re-emitting an equal number for an untouched node short-circuits the guard regardless of Map identity, so a plain recompute of the totals Map is **safe** — there is **NO reference-identity requirement on the number totals**, and the Phase-1 structural-sharing helper (`withUpdatedEntry`) is **not** needed here. The reference-identity concern applies instead to **`editableRows[id]`** (OBJECT-valued; the real object-identity check is `prev.editableRows[item.id] !== next.editableRows[item.id]`, `branch.tsx:101`), which the **per-row store (Step 4)** owns and where the structural-sharing helper does apply. Cross-ref **D-017, RISK-16, Q-33**. *(Earlier drafts asserted a number-totals reference-identity "HARD REQUIREMENT"; that was a mis-target — a naive number-totals rebuild does NOT reintroduce re-renders because the guard compares values, not object identity.)*
4. **Filter/group second pass** `displayedNodeTotals` (`:1402-1406`): reuse the same incremental rollup keyed on the displayed subtree, not a second full DFS (Q-08c — verify both paths reconcile; today they can diverge under filter).
5. Keep `computeNodeTotal` (`editable-row-model.ts:153-160`) as the latent branch fallback (`branch.tsx:151-156`) but the kernel guarantees `nodeTotals` always present (no O(n²), A-09).
6. **`projectTotal`** (`:1407-1410`) reduces over the totals Map; rides the incremental path. The `dispatchProjectTotalChange` DOM CustomEvent (`:1740-1742`) fires only on actual `projectTotal` change — confirm it's not a measurable cost and `ProjectTotalHeader` is the only listener (Q-13c, measurement; do not change semantics here).

**Tree↔sheet seam (RISK-12 / Q-05):** the incremental-totals target assumes a **single shared `TreeIndex`/rollup** serves both the sheet and the left `EstimateSheetTree`. Before touching `estimate-tree-data.ts`/`editable-row-model.ts`, measure whether the tree runs its own totals DFS over the same `estimateQueryKeys.tabTree` cache (Q-05). If it does, coordinate the fix across both panels (Phase 2 + Phase 3) so the headline per-keystroke metric actually moves. Serialize edits to these shared seam files (RISK-14).

**Validation:** `estimate-sheet-memoization.test.tsx` (`nodeTotalsComputes===1`); **diff `computeNodeTotals` output vs the incremental output on a fixture tree before/after** (RISK-01 mitigation — byte-equal totals Map for the same edit); filter-active path test.

---

## 6. Row-level rendering strategy (PRESERVE the guards — restated as a step gate)

This is not a code step; it is a **gate applied to every extraction**. After each of Steps 4–11:
- `branch.tsx:111-156` and `row-table.tsx:86-116` comparator source is **unchanged** (diff = 0 lines), OR any change is a separately-reviewed sub-step with a render-isolation test diff.
- Callbacks extracted into hooks (Step 6) return `useStableCallback`-wrapped identities; a render-count probe confirms branch/row props' identity is stable across an unrelated state change (e.g. opening the proposal dialog must not re-render rows — this is the cursor-isolation invariant generalized).
- `nodeTotals` is always a present Map; for untouched nodes its per-node **value** is stable (number value-equality via `Object.is`, `branch.tsx:147`; D-017) — no reference-identity requirement on the number totals (Step 5). The reference-identity requirement is on `editableRows[id]` (Step 4 / gate #6).

---

## 7. Proposal preview / signature strategy — off the hot path

**Resolves A-19 (High), PAT-15, contract §1, 04 §7.4. RISK-03.**

`createProposalPreviewSignature` (`:287-318`, H-3) is a full-tree 15-field string DFS, wrapped in `getProposalPreviewSignature` (`:1250-1259`) and `currentProposalPreviewSignature` (`:1260-1263`), which recomputes whenever a preview model exists → once the dialog has been opened, every keystroke rebuilds the entire signature to drive the stale badge `isProposalPreviewStale` (`:1663`).

**Target:**
- Move H-3/H-4 + R-L into `useProposalExport` + `<ProposalExportController>`.
- **FIRST (before the `structuralHash` replacement) — DERIVE the export input set from `build-proposal-export-model.ts` ITSELF, not from the legacy `createProposalPreviewSignature` field list.** Enumerate **every** `row.*`/`sourceRow.*` access the export model + workbook builder read AND every `settings.*` (`ProposalExportSettings`) field they consume, then make the new `structuralHash` cover **exactly that derived set**. Deriving from the legacy signature is forbidden because the legacy signature is itself **incomplete** (see A-41 below) — anchoring the hash to it would re-encode the same blind spot. The derived set as read today:
>
>   - **Row inputs** (`build-proposal-export-model.ts`): `quantity` (`:121`), `itemCost` (`:122`), `laborUnitCost` (`:124`), `contingencyPercentage` (`:127`), `miscCost` (`:128`), `category` (`:130`), **`discipline` (`:130,144` — the `sectionLabel`/`tag` fallback; OMITTED by the legacy signature)**, `designation` (`:144`), `material`/`description` (`buildParticulars`, `:78-79`), `unit` (`:147`), `scopeStatus` (`:132`), and the remarks inputs `supplier`/`pricingSource`/`pricingDate`/`confidence`/`notes` (`buildRemarks`, `:88-103`) — the last two (`confidence`, `notes`) are ALSO omitted by the legacy signature.
>   - **Settings inputs** (`ProposalExportSettings`, all read by the model/workbook and ALL OMITTED by the legacy signature): `contingencyMode`, `contingencyRate`, `vatMode`, `vatRate` (`resolveProjectCharges`, `:323-329`), `includeZeroRows`/`includeExcludedRows` (`consolidateProposalRows`, `:396-397`), `showSupplierInRemarks` (`:97`), `audience` (`applyAudiencePolicy`, `:43-49`), and the structural toggles `mode`/`consolidationMode`/`includeSourceBreakdownSheet`/`includeFormulas`.
>
>   The new `structuralHash` MUST explicitly include `discipline` and the `ProposalExportSettings` fields. (`getInitialEditableRow`-sourced fields `quantity`/`contingencyMode`/`contingencyPercentage`/`miscCost` stay covered as today.)
- Compute the signature **lazily on dialog open** and **debounced** thereafter (no semantic change to the stale-badge UX). Derive it from the Phase-1 `structuralHash` (04 §6.1 item 7) over the **derived export input set above** (RISK-03: the hash must cover exactly the fields `build-proposal-export-model` consumes, else stale/mismatched exports ship wrong numbers/structure to a customer deliverable).
- Keep the export model builder unchanged until the signature is proven equivalent on the **derived (corrected) field set** — NOT merely equivalent to the legacy signature, which would preserve the bug (RISK-03 mitigation).

**Validation:** `estimate-sheet-memoization.test.tsx` (`proposalSignatureComputes===0` on keystroke); `proposal-export-preview.test.tsx`; wire orphan `benchmark-proposal-workbook` with a parity check (Q-20, deferrable).

**FOUND BUG — A-41 (SEV-1, fix-as-found in Phase 3; cross-ref RISK-03):** the legacy `createProposalPreviewSignature` (`EstimateSheetContent.tsx:296-313`) does **NOT** cover the full set of inputs the export actually reads. It omits `row.discipline` (the `sectionLabel`/`tag` fallback at `build-proposal-export-model.ts:130,144`), the remarks inputs `confidence`/`notes` (`:90-91,103`), and **every** `ProposalExportSettings` input (`contingencyMode`, `contingencyRate`, `vatMode`, `vatRate`, `includeZeroRows`, `includeExcludedRows`, `showSupplierInRemarks`, `audience`, `mode`, `consolidationMode`, `includeSourceBreakdownSheet`, `includeFormulas`). Consequence: an edit to any omitted input changes the exported workbook while the stale badge says "unchanged" — shipping wrong numbers/structure to a customer deliverable. The refactor **closes** this gap (the derived `structuralHash` covers the full set) rather than preserving it; **do not** reproduce the legacy field list. Logged as new audit finding **A-41** under **RISK-03**.

**Proposal-export parity = FIELD-DIFFERENTIAL over the DERIVED export input set, not a single snapshot (AR3 finding 3 + A-41 — strengthens gate #4 / RISK-03):** a single before/after workbook snapshot is **INSUFFICIENT** — it proves builder stability for **one** state, not change-detection **equivalence**. The real failure mode is a **false-negative staleness miss** that ships **wrong numbers** (A-41). Replace the lone snapshot with a **field-differential test parametrized over the DERIVED export input set** (every `row.*`/`sourceRow.*`/`settings.*` field `build-proposal-export-model.ts` reads — see §7 target): for **each derived input field** (POSITIVE set — explicitly including `discipline`, `confidence`, `notes`, and all `ProposalExportSettings` fields), mutate it and assert **old-behavior-changed ⟺ new-`structuralHash`-changed** (i.e. the corrected behavior — the exported workbook actually changes — ⟺ the hash changes), bidirectional. **Negative control = fields the export model does NOT read** (e.g. `node.kind`, UI-only/transient row state); mutate one and assert **neither** the workbook nor the hash changes. **Do NOT use the legacy `createProposalPreviewSignature` as the oracle** — it is buggy (A-41); the oracle is the workbook/export-model output itself. Cross-ref RISK-03, A-41.

---

## 8. Activity-history strategy (clean extraction — low risk, good template)

**Resolves R-K + H-5; A-04 sub-concern; PAT-25 (client side).**

R-K is **already well-gated** behind `inspector || rowDetails || projectSpecificRowId` (R4 — `currentRows`/`activityScopeItems` cost ~0 when no modal is open). Extraction is mechanical:
- Move R-K state + fetch effects + `loadMoreVersionControl` into `useEstimateActivityHistory`.
- Move H-5 `buildActivityScopeTreeItems` (`:507-585`, full-tree DFS) into the hook and back it with `TreeIndex.descendantsOf` (PAT-25, 04 §6) instead of a fresh DFS — but **keep the modal-open gate** so it stays off the keystroke path.
- The activity modal already lives in `estimate-sheet/activity-history.tsx` (1688 LOC, A-05) — the hook feeds it; no change to the modal here.
- Server-side activity scope (recursive-CTE RPC, actor-label N+1) = Phase 4/8 (A-25, PAT-25) — **not this phase**.

**Validation:** activity-history DOM tests; assert `currentRows`/`activityScopeItems` are NOT computed while no modal is open (extends the gating guarantee).

---

## 9. Right-sidebar boundary + center-column extraction

**Resolves R-Q; A-04; A-05.**

- The **right sidebar** is `EstimateRightSidebarBase` (1748 LOC, `component-library/index.tsx:786`, A-05) — a **separate monolith owned by W10/Phase 6 + future decomposition**, not Phase 3. Phase 3's only job at the boundary: the sheet passes the sidebar **already-derived props** (selected node, library data from `useLazyEstimateLibrary`), and the sidebar must not subscribe to `editableRows` directly. Confirm the sidebar reads only derived/selected state, not the whole editable map (prevents re-introducing the fan-out across the boundary).
- **Center column:** extract R-Q's center JSX (`:2662-2892`) into `<EstimateSheetCenterColumn>` taking pre-derived props: header (H-6), tab strip (R-O), virtual branch list, bulk toolbar. The dialogs (command palette, proposal, activity, row-details, project-specific) stay mounted in `EstimateSheetContent` (they're conditionally rendered and gate-controlled).
- **R-P cross-tree header-action registration** (`:2548-2576`) stays and is documented as an intentional event bridge into `useEstimateHeaderActionsStore` (04 §5.2 keeps `use-estimate-header-actions-store` as a blessed bridge).

**Validation:** sheet + sidebar DOM tests; render-count probe confirms a keystroke does not re-render the sidebar.

---

## 10. Display transforms, expansion, bulk selection (index-backed)

**Resolves R-G/R-H/R-I + H-7; A-20 supporting hotspots; PAT-14.**

- `useSheetDisplayTransforms` owns R-G + H-7 (7 DFS transforms `:682-826`). Back the filter with `TreeIndex` + `filterKeepingAncestors` (Phase 2, 04 §6.1 item 4); adopt TemplatesTree's indexed filter as the model (PAT-14). **Debounce** the search input. Preserve the `displayedSheetNode === selectedNode` identity short-circuit (`:1307-1315`, used by `:1404`) — this is load-bearing for totals reuse.
- `useSheetExpansion` (R-H): `collectAllNodeIds([selectedNode])` (`:1442`) and `allNodeIds` become `TreeIndex.allIds()` (O(1) reuse, no per-`selectedNode` DFS).
- `useBulkRowSelection` (R-I): `visibleSheetRowIds` (`:1345-1354`, full-subtree DFS per `displayedSheetNode` change) becomes an index-backed selector; keep the `queueMicrotask` prune effect (`:1358-1371`) behavior. `bulkSelectedRowIds` stays a **local Set** (`:1099`) — merge with Zustand stores is Phase 5 / Q-08e.

**Validation:** `estimate-tree-filter.test.tsx` (250), sheet search DOM tests; per-keystroke filter budget (Phase 9).

---

## 11. Virtualization risks

**Resolves A-20 (Med), contract §1, 04 §7.5. RISK-12.**

- Flags **default ON** (C-2: `virtualization-flags.ts:11-15`, env-overridable). The real gap is **thresholds**: branch `minSections 80` (`:25`), rows `minRows 75` (`:21`) per-table. A sheet with many small tables (many areas, few rows each) virtualizes nothing.
- Supporting hotspots to fix while extracting (do NOT change rendering semantics):
  - `flattenVisibleBranches` (`virtual-branch-list.tsx:44-72`, memo'd `:80-92`) re-flattens on every collapse/expand → back with `TreeIndex.flattenVisible(expanded)` (Phase 2).
  - `findScrollParent` walks the DOM with `getComputedStyle` per call (`virtual-branch-list.tsx:34-42`, `row-table.tsx:130-138`) inside `getScrollElement` → **cache per scroll container** (04 §7.5).
- **Threshold lowering / virtualization-by-default is deferred to after the large-tree fixture exists (A-39) and the render-isolation gates prove no regression** (RISK-12 unsafe-move). Phase 3 only does the index-backed flatten + scroll-parent cache; threshold tuning is a measured follow-up.
- **Whole-tree-aware threshold fallback (perf review #9 — ships regardless of fixture fidelity):** if the large real-DB fixture proves infeasible (RISK-15), Phase 3 still ships a **whole-tree-aware virtualization threshold** — virtualize when the **total visible rows across ALL sections ≥ N**, *not* only when a single section clears the per-section gates (`minSections 80` / `minRows 75` / `treeMinRows 150`, `virtualization-flags.ts`). The per-section thresholds are what let the "many small areas" pathology (many sections, few rows each, large aggregate) render fully un-virtualized; a whole-tree row-count gate fixes that pathology independent of the real-DB fixture. Prove it against the **synthetic many-small-areas fixture** (many sections × few rows, aggregate ≥ N). Cite `virtual-branch-list.tsx:93` (the `flattenVisibleBranches` memo) and `virtualization-flags.ts` (threshold source). This is additive to the per-section gates, not a replacement, and does not change per-table rendering semantics.
- Confirm prod env doesn't disable flags (Q-C, measurement).

**Validation:** `estimate-row-table-virtualization.test.tsx`; `route-transition-peak-load-profile.test.tsx` (asserts windowing) — but note it's synthetic ≤200 rows today (A-39).

### 11A. LAW — Estimate-row images (Bible §13.3) — currently a GAP

> **GAP:** Bible §13.3 governs component/material images rendered inside estimate rows, but this image-loading discipline is **not yet enforced anywhere in the sheet path**. This subsection transcribes it as a Phase-3 law and adds a validation gate.

Rules for any image rendered in an estimate row (component/material thumbnail, library item preview):
1. **Use Next `Image` where dimensions are known** — get automatic responsive sizing + lazy-loading.
2. **Preserve explicit width/height** to reserve layout space and **avoid CLS** when the image loads or swaps.
3. **Lazy-load offscreen images** — only the visible window fetches.
4. **Use placeholders for missing images** (no broken-image flash, no layout jump on a null source).
5. **CRITICAL — do NOT load large source images into virtualized OFFSCREEN rows.** Only the visible virtual window may request full-res images; rows outside the window (above/below the viewport in `virtual-branch-list.tsx`/`row-table.tsx`) must NOT issue a full-res fetch. This is the row-image analogue of the offscreen-render budget the virtualization law (§11) protects — an un-windowed image fetch reintroduces the cost virtualization removes.

**Validation gate (to be added in Phase 3 / gated in Phase 9):**
- **No CLS from row images** — assert reserved dimensions; layout-shift score contribution from row images is 0.
- **Offscreen rows don't fetch full-res images** — probe that rows outside the virtual window issue no full-res image request (only the visible window does).

Cross-ref **doc 13 §5** (image strategy) and the **virtualization work in §11** (the visible-window contract these images must ride on); Bible §13.3.

---

## 12. Step sequencing (decoupling-first, then incremental extraction — each independently shippable + reversible)

> **AUTHORITATIVE STEP NUMBERING (crosswalk — HB-2).** This §12 table (Steps **0–11**) is the **authoritative** Phase-3 step numbering for the whole pack. Where `05_PHASED_REFACTOR_PLAN.md` (Phase-3 implementation sequence) and `24_EXECUTION_GOVERNANCE_AND_ROLLOUT.md §4` (safe-pause table) / §1.3 (PR ordering) reference Phase-3 steps, they **defer to this 0–11 numbering** for per-step detail. Key anchors: **Step 4** = per-row editable-rows store; **Step 5** = incremental ancestor-chain totals; **Step 6** = row-operations extraction; **Step 7** = proposal signature off keystroke; **Step 9** = `<EstimateSheetCenterColumn>`. Any doc-05/24 step label maps to this table.

Ordered so the **highest-perf-value decoupling lands first behind tests**, then responsibilities extract incrementally. **One responsibility per PR** (RISK-01 mitigation). Each step: green `bun run test:dom` (361) + the relevant render-isolation gate + `detect_changes({scope:"compare", base_ref:"main"})` before commit (CLAUDE.md gate).

| Step | Work | Resolves | Risk | Depends on | Rollback |
|---|---|---|---|---|---|
| **0** | **Entry gate.** Confirm Phase 1 primitives (incremental-totals index, `structuralHash`, key factory, `patchAndMarkStale`) + Phase 2 `TreeIndex`/`rollup` merged & green. Capture Phase-0 keystroke-compute baseline. Resolve Q-A/Q-08b (store-vs-cache) by prototype+measure → D-009. | RISK-14 | Phases 0/1/2 | n/a (gate) |
| **1** | **Add the new render-isolation gate** (keystroke-in-row-A: rows B…N + siblings + sidebar don't re-render; `nodeTotalsComputes===1`, `proposalSignatureComputes===0`). To be added in Phase 3, hardened in Phase 9. Land BEFORE any refactor so it locks current behavior. | A-38, RISK-11 | Step 0 | revert test file |
| **2** | Extract **low-risk hooks** with zero hot-path interaction: `useEstimateColumnWidths` (R-E), `useLazyEstimateLibrary` (R-B), `useEstimateTreeSource` (R-A), `useSheetCommandsAndEvents` (R-N). Pure move; props unchanged. | A-04 (LOC) | Step 1 | revert per-hook PR |
| **3** | Extract **`useEstimateActivityHistory`** (R-K + H-5) — already gated, clean. Index-back `buildActivityScopeTreeItems`. | A-04, PAT-25 | Step 2 | revert PR |
| **4** | **★ Sever the fan-out: `editable-rows-store.ts` + `useEstimateEditableRows`** (R-C). Per-row subscription; resync diffs against index. **Guards unchanged.** Highest perf value. | **A-07, A-21, PAT-13** | Steps 0–1 | revert to `useState` map (store is additive behind the same prop shape) |
| **5** | **★ `useEstimateTotals`** (R-J): incremental ancestor-chain rollup over `TreeIndex`; filter second-pass reuse; byte-equal totals diff vs old. | **A-09, PAT-15** | Step 4 + Phase 1/2 | keep `computeNodeTotals` as fallback; feature-flag incremental path, revert to full DFS |
| **6** | **`useEstimateRowOperations`** (R-M + H-2) — 15 callbacks + tree mutators moved, **byte-identical optimistic logic** (Phase 5 consolidates later). Identity-stable returns. Largest LOC win. | A-04, PAT-27 | Step 4 | revert PR; callbacks were pure-moved |
| **6b** | `useExpressInsertDrafts` (R-D) sibling extraction. | A-04 | Step 6 | revert PR |
| **7** | **`useProposalExport` + `<ProposalExportController>`** (R-L + H-3/H-4): signature lazy/debounced/`structuralHash`; export model builder unchanged; workbook parity snapshot. | A-19, PAT-15, RISK-03 | Step 5 | revert to per-keystroke signature memo |
| **8** | **`useSheetDisplayTransforms`** (R-G/H-7) + `useSheetExpansion` (R-H) + `useBulkRowSelection` (R-I): index-backed filter/flatten/visible-ids; debounce search; preserve `displayedSheetNode===selectedNode` short-circuit. | A-04, A-20, PAT-14 | Step 5 | revert per-hook PR |
| **9** | **`<EstimateSheetCenterColumn>`** (R-Q `:2662-2892` + H-6 + R-O) presentational extraction; dialogs + R-P stay. Sidebar boundary check (no `editableRows` subscription). | A-04, PAT-27 | Steps 4–8 | revert PR |
| **10** | Virtualization hotspots: index-backed `flattenVisibleBranches`; cache `getScrollElement`/`findScrollParent`. **No threshold change.** | A-20 | Step 8 | revert PR |
| **11** | Cleanup: remove now-dead module-level helpers (H-1 shims once call sites migrated to `TreeIndex`); confirm `EstimateSheetContent` is now a thin orchestrator (**objective target: orchestrator component ≤ ~400 LOC, down from 1881; each extracted hook single-responsibility**). Final full `validate`. | A-04 | Steps 2–10 | revert PR |

**Rollback discipline (every step):** each step is one PR behind unchanged public props of `EstimateSheetContent`/`EstimateWorkspaceClient`; reverting the PR restores prior behavior with no schema/cache shape change. Steps 4 and 5 additionally keep the old path (map-`useState` / full-DFS `computeNodeTotals`) reachable behind a flag until parity is proven, so rollback is a flag flip, not a revert.

---

## 13. Test strategy (extend the 4 jsdom render-isolation gates to keystroke compute budgets)

**Resolves A-38, RISK-11, contract §1 test ask, 04 §11/§12.**

The 4 existing gates in `tests/vitest/perf/` are the template:
- `estimate-sheet-render-relief.test.tsx:162` — `rendersOutside === 0`.
- `estimate-sheet-memoization.test.tsx:166-201` — `nodeTotalsComputes === 1`, `proposalSignatureComputes === 0` on keystroke.
- `estimate-sheet-cursor-isolation.test.tsx` — `contentRenders() === 0` while typing.
- `estimate-sheet-render-baseline.test.tsx:204-214` — records (asserts only `>0`) → **convert to a bounded gate** (Phase 9).

**New gates to add (Phase 3 authors them; Phase 9 makes them CI-gating — all "to be added"):**
1. **Single-row-edit isolation (the core ask):** typing in row A asserts (a) rows B…N do **not** re-render, (b) sibling branches do **not** re-render, (c) the right sidebar does **not** re-render, (d) `nodeTotalsComputes === 1` (only A's ancestor chain), (e) `proposalSignatureComputes === 0`. This is the contract for the fan-out severance (Step 4) + incremental totals (Step 5).
1b. **Effect-fire isolation on a cost-cell keystroke (perf review #7, new):** on a cost-cell edit, assert the effect-FIRE counts, not just render counts: (a) `dispatchProjectTotalChange` (`EstimateSheetContent.tsx:1740-1742`) fires **only when `projectTotal` actually changes numerically** — a keystroke that does not change the numeric total fires it **0** times; an edit that does change it fires it **exactly 1**; (b) the visible-ids prune effect (`:1358-1371`) does **NOT** run on a cost-cell edit (it is keyed on `displayedSheetNode`/visible-row changes, not cell values); (c) **no effect re-fires from an identity-unstable dependency** — i.e. no effect whose deps include `editableRows`/`nodeTotals`/a callback runs on an unrelated keystroke because a dep object's identity churned. This is the effect-side complement to gate #1's render-side isolation; it directly guards the fan-out severance (Step 4) and the incremental-totals path (Step 5).
2. **No whole-tree recompute on single-row edit:** assert `computeNodeTotals` is NOT called over the full root set on a keystroke (probe `reportEstimateNodeTotalsCompute` node-id breadth — it should be the ancestor chain, not all roots). Directly asserts A-09 is fixed.
3. **Totals VALUE equivalence (RISK-01):** golden-diff the totals Map produced by old full-DFS vs new incremental rollup for a fixture tree across a sequence of edits — must be byte-equal. **This is the correct and sufficient gate for the number-valued totals Map** (the guard compares VALUES via `Object.is` over numbers, `branch.tsx:147`; D-017) — it does NOT need, and gate #6 does NOT apply to, totals-entry reference identity.
4. **Proposal-export field-differential parity (RISK-03, A-41):** parametrize over the **DERIVED export input set** — every `row.*`/`sourceRow.*`/`settings.*` field `build-proposal-export-model.ts` reads (derive from the model itself, §7; do NOT enumerate from the legacy `createProposalPreviewSignature`, which is buggy — A-41). For **each derived input field** (POSITIVE set — explicitly including `row.discipline`, `confidence`, `notes`, and the `ProposalExportSettings` fields `contingencyMode`/`contingencyRate`/`vatMode`/`vatRate`/`includeZeroRows`/`includeExcludedRows`/`showSupplierInRemarks`/`audience`/`mode`/`consolidationMode`/`includeSourceBreakdownSheet`/`includeFormulas`): mutate it and assert **old-behavior-changed ⟺ new-`structuralHash`-changed** (the oracle for "old behavior" is the **workbook/export-model output**, NOT the legacy signature — the legacy signature would falsely pass because it omits these fields). **Negative control = fields the export model does NOT read** (e.g. `node.kind`, UI-only/transient state — `discipline`/settings are in the POSITIVE set, never the control set): mutate one, assert neither the workbook nor the hash changes. A lone before/after snapshot is insufficient (proves stability for one state, not change-detection equivalence). This gate **closes** A-41 rather than preserving it. Cross-ref RISK-03, A-41; the SEV-3 scoped-delta totals-correctness gate (Phase 4 / doc 10, RISK-25) and the SEV-5 automated memo-guard comparator-snapshot test (doc 28 invariant register) guard adjacent correctness invariants.
5. **Extraction-neutrality:** after each Step 2–11 PR, the full 361 `bun run test:dom` is green and the render-relief/memoization gates are unchanged (no new renders introduced by decomposition).
6. **`editableRows` per-row reference-identity isolation (AR3 finding 2; retargeted per D-017):** after a single-row edit, assert `Object.is(prev.editableRows[id], next.editableRows[id])` holds for **every untouched row** `id` (only the edited row's value object may change identity). This is the OBJECT-valued surface the branch guard's real object check reads (`prev.editableRows[item.id] !== next.editableRows[item.id]`, `branch.tsx:101`); it is the direct contract for the per-row store (Step 4) and the structural-sharing helper (§B.4 of file 07). **Explicitly NOT a totals gate:** the number-valued totals Map needs no reference-identity gate — its guard compares VALUES (`Object.is` over numbers, `branch.tsx:147`), so gate #3's byte-equal VALUE check is correct and sufficient for totals. Cross-ref D-017, RISK-16, Q-33.

**Fixture dependency:** gates 1–3 are strongest against the **real large-tree fixture (A-39, Phase 0)** — synthetic ≤200 rows under-exercises the ancestor-chain win. Flag that Phase 3's perf claims are only fully provable once that fixture exists.

**Validation vocabulary (only what exists today, contract §4):** `bun run test:dom`, `bun run test`, `bun run type-check`, `bun run validate`, `bun run perf:profile-peak-load`. New per-keystroke render-count gates are **proposals to be added in Phase 3 / gated in Phase 9**.

---

## 14. Cross-references

- **Risks:** RISK-01 (sheet regression — primary), RISK-03 (proposal signature — now covers A-41: the derived `structuralHash` must include `discipline` + all `ProposalExportSettings`), RISK-25 (SEV-3 scoped-delta totals-correctness gate — Phase 4 / doc 10), RISK-11 (test brittleness), RISK-12 (tree↔sheet double-compute seam), RISK-14 (phase coordination), RISK-15 (large-DB fixture infeasible → whole-tree-aware threshold fallback, §11), RISK-16 (structural sharing for the OBJECT-valued `editableRows` surface — D-017).
- **Decisions:** D-009 (editableRows store-vs-cache — resolve in Step 0); **D-017** (reference-stability scope: totals Map is number-valued → value-equality suffices; the structural-sharing primitive targets OBJECT-valued surfaces = `editableRows`, not the totals Map).
- **UX contract:** `20_UX_UI_AND_INTERACTION_PLAN.md` — transient-state preservation + the required named UX gates GATE-EDIT-INIT / GATE-EDIT-RECONCILE / GATE-EDIT-IDENTITY (Step 4), GATE-NO-TOTAL-FLASH (Step 5), GATE-CELL-KEYBOARD, GATE-FOCUS-AFTER-MUTATION (Step 6), GATE-TRANSIENT-SURVIVAL (§4.5).
- **Open questions to resolve before/within this phase:** Q-A/Q-08b (store-vs-cache, Step 0), Q-08c (incremental totals + filter path, Step 5), Q-05 (tree double-compute, Step 5), Q-C (virtualization flags in prod, Step 11), Q-13c (`dispatchProjectTotalChange` cost, Step 5), **Q-25** (UX transient-state contract), **Q-33** (does any object-valued derived map beyond `editableRows` need the structural-sharing helper — measure; file 07 §B.5).
- **Patterns:** PAT-13 (editable-row subscription), PAT-15 (full-tree recompute), PAT-27 (god-component), PAT-14 (filter transforms), PAT-25 (activity scope).
- **Audit findings:** A-04, A-07, A-08 (constraint), A-09, A-19, A-20, A-21, A-38, A-39, **A-41 (SEV-1, fix-as-found — legacy `createProposalPreviewSignature` omits `discipline`/`confidence`/`notes` + all `ProposalExportSettings`; the derived `structuralHash` closes it; §7 / gate #4 / RISK-03)**.
- **Adjacent correctness gates (cross-ref):** SEV-3 scoped-delta totals-correctness gate (Phase 4 / doc 10, RISK-25); SEV-5 automated memo-guard comparator-snapshot test (doc 28 invariant register).
- **Target architecture:** 04 §7 (canonical sheet/grid), §6 (`TreeIndex`/`rollup` consumed here), §11/§12 (gates).
