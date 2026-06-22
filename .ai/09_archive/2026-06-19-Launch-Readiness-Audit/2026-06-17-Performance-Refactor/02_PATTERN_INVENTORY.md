# 02 — Pattern Inventory

> **Scope:** Repeated patterns across the codebase that should converge into canonical
> abstractions / kernels. Sourced from research dossiers R1–R7 and the authoritative
> `_research/_SYNTHESIS.md`. Every occurrence cites `path:line — usage`. Priority labels
> P0/P1/P2/P3 and risk labels Low/Medium/High follow the cross-file vocabulary in
> SYNTHESIS §4. Phase numbers map to the pinned phase order in SYNTHESIS §2.
>
> Reading note: this is an *inventory of sameness*, not a plan. The "Proposed canonical
> kernel" lines describe the convergence target; the phase plans (08–14) own the actual
> sequencing. Where this file and a dossier disagree, the pinned SYNTHESIS value wins and
> the divergence is logged in `19_OPEN_QUESTIONS.md`.

---

## Pattern: Tree node index (id→node / id→parent Map builder)   (ID: PAT-01)

Current occurrences:
- `src/components/ui/tree.tsx:278-284` — `indexTree` builds the kernel's id→node Map.
- `src/components/workshop/component-library/tree/TemplatesTree.tsx:841-849` — own `nodeById` Map.
- `src/components/workshop/component-library-manager/LibraryFolderTree.tsx:437` — `indexUiNodes` Map builder.
- `src/lib/publication/snapshot.ts:135-163` — `buildSnapshotTreeNodes` parent-map nest.
- `src/components/workshop/component-library/tree/buildLibraryTree.ts:469-504` — implicit index during synthesis.

What differs locally:
- Node field names (`children` universal; `name`/`label`, `estimateRowItems`/`item`/`rows` vary).
- Some build only id→node; others also derive parent / depth inline.
- Some operate on `UiTreeNode`, others on domain `EstimateTreeNode` / `LibraryFolderRecord`.

What is structurally the same:
- Single DFS over `children` populating a `Map<string, Node>`, recomputed on each consumer's render/memo.

Proposed canonical kernel:
- `buildTreeIndex<T>(roots, adapter): TreeIndex<T>` with `byId`, `parentOf`, `depthOf`, `pathOf`, computed once per tree version and shared (R3 interface, R3-trees.md:208-230).

Refactor priority: P0
Risk: Medium
Validation: `bun run test:dom` tree suites; per-tree render-count budget (Phase 9); structural-equivalence golden test that index output matches each current finder.
Addressed in: Phase 2 (kernel), seeded by Phase 1 primitives.

---

## Pattern: Find-node-by-id DFS   (ID: PAT-02)

Current occurrences:
- `src/components/workshop/estimate-tree-data.ts:395-402` — `findEstimateNode`.
- `src/lib/estimates/estimate-tree-reorder.ts:63-71` — `findNodeLocation`.
- `src/lib/estimates/estimate-tree-edit.ts:78-99` — `findTreeNode` + `findNodePosition`.
- `src/lib/bulk-selection/tree-selection.ts:23` — `findNode`.
- `src/components/workshop/component-library/tree/buildLibraryTree.ts:90-97` — `findNodeById`.
- `src/components/workshop/component-library/tree/helpers.ts:39-46` — `findNode`.
- `src/lib/domain/estimate-tree.ts:54-67` — `getNodeById`.
- `src/components/workshop/EstimateSheetContent.tsx:190-200` — `findEstimateRowItem` (row-level variant).

What differs locally:
- Return shape: bare node vs node+location vs node+position.
- Some carry path/parent context; some just the node.

What is structurally the same:
- Recursive DFS scanning `children` until id match — **≥8 independent implementations** (R3 confirms ≥8, SYNTHESIS §1 trees), each O(n) and re-run fresh (`findEstimateNode` called ~15× per interaction, R3-trees.md:264).

Proposed canonical kernel:
- `TreeIndex.find(id): T` (O(1) Map lookup) plus `ancestorsOf`/`pathOf` for location-needing callers; eliminates per-call DFS.

Refactor priority: P0
Risk: Medium
Validation: replace one finder at a time behind the index; assert identical results vs legacy via existing `estimate-tree-*.test.ts`; render-count probe shows no per-keystroke DFS.
Addressed in: Phase 2.

---

## Pattern: Descendant-id collection DFS   (ID: PAT-03)

Current occurrences:
- `src/lib/estimates/estimate-tree-reorder.ts:156` — `getDescendantEstimateNodeIds`.
- `src/lib/estimates/estimate-tree-edit.ts:37` — `getEstimateTreeNodeAndDescendantIds`.
- `src/lib/bulk-selection/tree-selection.ts:40` — `selectableIdsForSubtree`.
- `src/components/workshop/component-library/tree/helpers.ts:52-55` — `collectComponentIds`.
- `src/components/workshop/component-library/tree/buildLibraryTree.ts:99-113` — `collectItemsFromNode`.

What differs locally:
- Collects node ids vs leaf/component ids vs row-item ids.
- Some include self; some exclude.

What is structurally the same:
- DFS accumulating descendant ids into a Set/array (R3 confirms ≥5, SYNTHESIS §1).

Proposed canonical kernel:
- `TreeIndex.descendantsOf(id): ReadonlySet<string>` (memoized) + a leaf-filter helper for the component-id variants.

Refactor priority: P1
Risk: Medium
Validation: golden-set equivalence per call site; `tree-selection.test.tsx`, `estimate-tree-edit.test.ts`.
Addressed in: Phase 2.

---

## Pattern: Ancestor walk / keep-ancestor filter   (ID: PAT-04)

Current occurrences:
- `src/lib/domain/estimate-tree.ts:58` — `isDescendantNode` (ancestor walk).
- `src/lib/bulk-selection/tree-selection.ts:32` — `findAncestorIds`.
- `src/components/workshop/component-library/tree/TemplatesTree.tsx:502-509` and `:540-547` — `hasCheckedNodeAncestor` (twice).
- `src/components/workshop/component-library/tree/TemplatesTree.tsx:700-713` — `includeAncestors` in indexed filter.
- Keep-matches-with-ancestors filters: `src/components/workshop/EstimateSheetTree.tsx:193-207` (`filterEstimateTreeNodes`) + `:216-236` (`filterEstimateTreeByStructure`); `src/components/workshop/component-library/tree/helpers.ts:28-37` (`filterTree`); `src/components/workshop/component-library/tree/TemplatesTree.tsx:659-730` (`filterProjectSourcesByQuery`, the one indexed/perf-built filter).

What differs locally:
- Predicate (name match vs facet vs checked-state vs structural hide-empty).
- TemplatesTree's `filterProjectSourcesByQuery` is **indexed**; the others rebuild the full tree per keystroke.

What is structurally the same:
- Walk ancestors to the root and/or recursively keep a node if it or any descendant matches (R3 confirms ≥4 ancestor-filters, SYNTHESIS §1).

Proposed canonical kernel:
- `TreeIndex.ancestorsOf(id)` + `filterKeepingAncestors(idx, predicate)` (R3-trees.md:238). Adopt TemplatesTree's indexed approach as the model for the EstimateSheetTree/library filters.

Refactor priority: P0
Risk: Medium
Validation: `estimate-tree-filter.test.tsx` (250), `templates-tree-performance.test.ts:321` (asserts <1000ms indexed filter); per-keystroke filter budget (Phase 9).
Addressed in: Phase 2 (filter on index); per-keystroke recompute removal Phase 3.

---

## Pattern: Cascade selection + indeterminate state   (ID: PAT-05)

Current occurrences:
- `src/lib/bulk-selection/tree-selection.ts:61-112` — full cascade engine (toggle/state/dedupe).
- `src/components/ui/tree.tsx:628-642` — `indeterminateIds` computed in the kernel itself.
- `src/components/workshop/EstimateSheetTree.tsx:247` — `buildEstimateTreeSelectionNodes` wiring.
- `src/components/workshop/component-library-manager/LibraryFolderTree.tsx:451-483` — bespoke union of folder cascade + component selection into one `selectedIds`.
- Dedupe-to-roots: `src/lib/bulk-selection/tree-selection.ts:80-91` (`dedupeSelectedRoots`); `src/components/workshop/component-library/tree/TemplatesTree.tsx:479-596` (`getChecked*` dedupe-to-topmost).

What differs locally:
- LibraryFolderTree unions two selection domains; TemplatesTree dedupes checked units to roots; kernel computes indeterminate separately from the engine.

What is structurally the same:
- Three distinct cascade engines (R3 confirms ≥3, SYNTHESIS §1) computing select/deselect propagation + parent indeterminate + dedupe-to-roots over a tree.

Proposed canonical kernel:
- Generalize `tree-selection.ts` over `TreeAdapter`: `toggleCascade` / `getSelectionState` / `dedupeRoots`; have `tree.tsx` consume it for indeterminate (R3-trees.md:240-241).

Refactor priority: P1
Risk: Medium
Validation: `estimate-tree-bulk-selection.test.tsx` (180), `library-folder-tree-selection.test.tsx` (181).
Addressed in: Phase 2.

---

## Pattern: Immutable tree move/insert/remove (reorder & delete planners)   (ID: PAT-06)

Current occurrences:
- `src/components/ui/tree.tsx:328` — kernel `moveTreeNode`.
- `src/lib/estimates/estimate-tree-reorder.ts:253-346` — estimate reorder plan + `evaluateEstimateTreeDrop` (`:318-346`).
- `src/lib/component-library/library-folder-reorder.ts:217-247` — `planLibraryFolderDelete` (`:217`) + `buildLibraryFolderReorderPlan` (`:247`) — a parallel reorder/delete engine.
- `src/lib/estimates/estimate-tree-edit.ts:54-123` — delete + fallback-selection rebuild.
- Clone helpers feeding these: `src/lib/estimates/estimate-tree-reorder.ts:55` (`cloneNode`), `src/components/workshop/component-library/tree/buildLibraryTree.ts:115` (`cloneTree`), share `bumpDepth` `src/lib/share/reconstruct-share-tree.ts:407`.

What differs locally:
- `sortOrder` persistence rules differ (`ESTIMATE_TREE_SORT_ORDER_STEP` vs library folder sort) — flagged as an open question whether they can fully unify (R3 open questions).
- Drop legality (`allowInsideOnLeaves`, `position!=="inside"` blocked in library) varies.

What is structurally the same:
- Immutable recursive rebuild that moves/removes a subtree and recomputes sibling order; estimate and library planners are "the same shape, different types" (R3-trees.md:96).

Proposed canonical kernel:
- `moveNode<T>` / `removeNodes<T>` / `mapNode<T>` over `TreeAdapter` (R3-trees.md:232-235). Library + estimate reorder planners collapse onto the shared core with adapter-supplied sort rules.

Refactor priority: P1
Risk: High
Validation: `estimate-tree-reorder.test.ts` (385), `estimate-sheet-tree-dnd.test.tsx`, `tree-external-drop.test.tsx`, library reorder tests; revision-guarded rollback unchanged (PAT-09).
Addressed in: Phase 2.

---

## Pattern: Subtree rollup / totals DFS (non-render aggregation)   (ID: PAT-07)

Current occurrences:
- `src/lib/reusable-sources/source-collectors.ts:51-60` — `summarizeEstimateTreeNode(s)`.
- `src/lib/share/reconstruct-share-tree.ts:180-192` — `rollup`.
- `src/lib/project-charts/aggregate-project-charts.ts:200-346` — `buildSpaceTableRows` own/descendant rollup.
- `src/lib/component-library/estimate-templates.ts:367-387` — `summarizeEstimateTemplate`.
- `src/app/api/.../export/proposal.xlsx/route.ts:184-196` — `countTree`.
- `src/lib/proposal-export/build-proposal-export-model.ts:355-386` — `flattenEstimateTree` (core).

What differs locally:
- Accumulator type (cost, {rowCount,totalCost}, counts, flat rows w/ areaPath).

What is structurally the same:
- Bottom-up reduce over the same `EstimateTreeNode` shape; **no shared memoized subtree-totals cache — totals recomputed everywhere** (R3-trees.md:172-173).

Proposed canonical kernel:
- `rollup<T,A>(idx, seed, combine): Map<string, A>` with memoized subtree cache (R3-trees.md:243-244). Same index feeds render totals (PAT-15) and these non-render walks.

Refactor priority: P2
Risk: Medium
Validation: `share/reconstruct-share-tree.test.ts` (331), proposal-export tests, chart aggregation tests; equivalence vs current per-walk output.
Addressed in: Phase 2 (kernel) / Phase 1 (totals primitive). Hot-path payoff depends on R3 open question (do these run client-side often).

---

## Pattern: Two presentation tree kernels + dead dependency   (ID: PAT-08)

Current occurrences:
- `src/components/ui/tree.tsx` (~1328 LOC) — virtualized `Tree`, used by estimate sheet, library folders, templates, template-structure editor.
- `src/components/workshop/workshop-tree.tsx` — `WorkshopTree<TNode>`, no virtualization, used only by `src/components/share/ShareEstimateTreeView.tsx:298`.
- `react-complex-tree` dead imports: CSS at `src/app/workshop/layout.tsx:15`; `TreeItemIndex` type alias at `src/lib/component-library/library-folder-reorder.ts:1,86`.

What differs locally:
- `WorkshopTree` is read-only recursive `<ul role=tree>`; share view caps at 500 rows by design (`reconstruct-share-tree.ts:29-36`).

What is structurally the same:
- Both render an ARIA tree; `Tree` is a strict superset (adds virtualization, flatten, DnD).

Proposed canonical kernel:
- Move share's render onto `Tree` (read-only mode), delete `WorkshopTree`; remove `react-complex-tree` dep (replace CSS, drop the one type alias).

Refactor priority: P2
Risk: Medium
Validation: share-view DOM tests; bundle check (`ANALYZE=true bun run build`) confirms `react-complex-tree` gone; share-page visual/scroll-spy regression.
Addressed in: Phase 2 (consolidation) + Phase 7 (dep removal confirmed via bundle).

---

## Pattern: Optimistic mutation lifecycle (onMutate→patch→rollback→settle)   (ID: PAT-09)

Current occurrences (13 flows, 5 rollback mechanisms — SYNTHESIS §1):
- Row update — `src/hooks/use-estimate-row-mutations.ts:347-403` (patch-snapshot `context.previousPatch`).
- Row insert — `:224-262` (no onMutate; `input.rollback?.()`).
- Row replace — `:264-267`; Row delete — `:269-272` (shared `mutationOptions:206-222`, invalidate-none + `input.rollback`).
- Row detach — `:274-322` (its own `previousPatch` snapshot).
- Row promote — `:324-345` (4 cross-key invalidations).
- Move row item — `src/hooks/use-estimate-query.ts:167-184` (whole-tree `context.previous` restore).
- Tree reorder — `src/hooks/use-estimate-query.ts:59-79` (revision-guarded `restore`).
- Project favorite — `src/lib/favorites/use-toggle-project-favorite.ts:19-37` (`ctx.previousSidebar`).
- Estimate favorite — `src/lib/favorites/use-toggle-estimate-favorite.ts:22-51` (dual: sidebar + store patch).
- Project estimate list — `src/stores/project-estimates-store.ts:50-95` (closure-returning `removeOptimistic`).
- Collaborator role — `src/hooks/use-project-collaboration-query.ts:45-63` (**no rollback**).
- Notifications read/dismiss/ack — `src/features/notifications/hooks/useNotificationsQuery.ts:83-164` (**no rollback**).

What differs locally:
- 5 distinct rollback shapes: patch-snapshot, whole-tree snapshot, revision-guarded restore, cache snapshot, closure-restore. Two flows have none.
- Identity bookkeeping: `mutationId` (uuid), per-row `operationId` counter, per-row serialized promise queue (`use-estimate-row-mutations.ts:201-202,411-436`).

What is structurally the same:
- Every flow hand-rolls the same skeleton: snapshot → `setQueryData` patch → onError rollback → onSettled/onSuccess invalidate.

Proposed canonical kernel:
- `createOptimisticMutation({ key, patch, rollback })` adapter subsuming the 5 rollback mechanisms and the identity boilerplate (R2-state.md:85). Backfills rollback for notifications + collaborator role.

Refactor priority: P0
Risk: High
Validation: per-flow contract tests for onError rollback + onSettled invalidation; existing row-mutation DOM tests; serial `bun run test:dom`. Note correctness gap: notifications/collaborator have no rollback today (RISK candidate).
Addressed in: Phase 5.

---

## Pattern: Query-key conventions + tabTree/areaTree branch   (ID: PAT-10)

Current occurrences (5 conventions — SYNTHESIS §1):
- `src/hooks/use-estimate-query.ts:10-16` — `estimateQueryKeys` factory (`detail`/`tabs`/`tabTree`/`areaTree`; `areaTree` flagged legacy at `:14`).
- `src/lib/favorites/query-keys.ts:1-5` — `favoritesQueryKeys` (clean nested factory — the template).
- `src/features/notifications/hooks/useNotificationsQuery.ts:19-24` — `notificationQueryKeys` (clean).
- `src/lib/component-library/query-keys.ts:7-47` — bare `as const` arrays + standalone builder fns.
- `src/hooks/use-project-collaboration-query.ts:16-18` — inline standalone fn.
- Inline ad-hoc: `src/components/workshop/EstimateSheetContent.tsx:1181-1183` (`lazyLibraryQueryKey`).
- `estimateTabId ? tabTree : areaTree` ternary replicated ~14×: `src/hooks/use-estimate-row-mutations.ts:204,212,229,278,303,313,328,353,383,394`.

What differs locally:
- Factory style (nested factory vs bare const vs inline fn) and whether keys carry the tab/area branch.

What is structurally the same:
- All build a stable array key; the estimate path repeats the same tab/area resolution at every mutation site.

Proposed canonical kernel:
- One nested-factory module (favorites/notifications template); fold the branch into `estimateQueryKeys.tree(estimateId, tabId?)` resolver (R2-state.md:86).

Refactor priority: P1
Risk: Medium
Validation: type-check (key shapes); invalidation still hits the right cache in row-mutation tests; verify whether `areaTree` is retirable (Q in 19_OPEN_QUESTIONS).
Addressed in: Phase 1.

---

## Pattern: patchAndMarkStale (setQueryData + invalidate refetchType:"none")   (ID: PAT-11)

Current occurrences (22 `refetchType` sites — SYNTHESIS §1):
- `src/hooks/use-estimate-row-mutations.ts:212,213,253,254,308,309,388,389,401` — write cache then invalidate-none.
- `src/features/notifications/hooks/useNotificationsQuery.ts:93-105` — setQueryData feed + unread-count + release-modal, then invalidate-none.
- Spread across the 9 files using `setQueryData` (heaviest: `use-estimate-row-mutations.ts`, `use-estimate-query.ts`, `useNotificationsQuery.ts`, each 8–9 writes) plus the 31 `invalidateQueries` sites, 22 carrying `refetchType` (R2-state.md:30-31).

What differs locally:
- The cache updater fn and which sibling keys also get marked stale.

What is structurally the same:
- Deliberate 2-step idiom: optimistic `setQueryData` then `invalidateQueries({ refetchType:"none" })` to mark stale without an immediate refetch.

Proposed canonical kernel:
- `patchAndMarkStale(client, key, updater)` helper (R2-state.md:87).

Refactor priority: P1
Risk: Low
Validation: unit test the helper; assert cache state + stale flag unchanged at migrated sites.
Addressed in: Phase 1.

---

## Pattern: Tree-patch reconciliation (optimistic-vs-server patch pair)   (ID: PAT-12)

Current occurrences:
- `src/lib/estimates/estimate-row-tree-patch.ts:65-91` — `patchEstimateRowItemInTree`.
- Per-flow server patch builders: `toServerRowPatch`, `toDetachedRowPatch` (`use-estimate-row-mutations.ts:302-306`), `toPromotedRowPatch`, `toServerRowPatch` (`:382`).
- `findEstimateRowItemInTree` + `src/components/workshop/EstimateSheetContent.tsx:190-200` (`findEstimateRowItem`).
- `src/lib/estimates/estimate-tree-reorder.ts:222-251` — `mergeEstimateTreeStructureWithCachedNodes` (rebuilds Map index + clones every node each call).

What differs locally:
- Optimistic patch (client values) vs server patch (post-RPC truth); each flow has its own `toXxxRowPatch`.

What is structurally the same:
- Locate row-item in tree → immutably patch it → return new tree; "a reusable patch kernel already half-formed" (R2-state.md:88).

Proposed canonical kernel:
- Centralize the optimistic-vs-server patch pair over the row-item finder; feed `mergeEstimateTreeStructureWithCachedNodes` off the shared `TreeIndex` to stop the per-call Map rebuild + clone.

Refactor priority: P1
Risk: Medium
Validation: `estimate-row-tree-patch.test.ts` (116); reconcile-after-server tests.
Addressed in: Phase 5 (patch pair) + Phase 2 (index-backed merge).

---

## Pattern: Editable-row model + per-row subscription   (ID: PAT-13)

Current occurrences:
- `src/components/workshop/EstimateSheetContent.tsx:1093` — `editableRows: Record<rowId, EditableRowValue>` `useState` (resync effect at `:1766-1783`; `:1401` is the totals memo, not the resync).
- `src/components/workshop/estimate-sheet/rows/editable-row-model.ts:29-52` — `updateEditableRowValue` returns a NEW top-level object → reference changes every keystroke.
- Keystroke setters: `src/components/workshop/estimate-sheet/rows/row-table.tsx:344-346,378-379,396-398,434-436`.
- Resync DFS: `src/components/workshop/estimate-sheet/rows/editable-row-model.ts:131-143` (`collectEditableRows`) run by effect `EstimateSheetContent.tsx:1766-1783`.
- Load-bearing render guards (must preserve): `branch.tsx:111-156` + `row-table.tsx:86-116` (per-row `editableRows[id]` identity check); `computedItem` `row-table.tsx:201-238`.
- Fan-out consumers reading the map: `EstimateSheetContent.tsx:1252,1258,1401,1405-1406,1413-1414,1423,1429,1590,1596` + ~10 mutation handlers (`:1817,1974,2034,2081,2192,2328,2372,2434,2487,2512`).

What differs locally:
- Each consumer derives different output (totals, signature, flatten, activity scope, proposal model).

What is structurally the same:
- A single flat map whose **identity changes per keystroke**, fanning out to 6+ whole-tree memos despite the edit being row-local (SYNTHESIS §1: "central fan-out coupling").

Proposed canonical kernel:
- Per-row subscription store (`useSyncExternalStore`/Zustand row store, or ref + version map) so row N's edit notifies only row N's subscribers; keep the existing memo guards intact (R4 module boundary #1, R4-sheet.md:268-272).

Refactor priority: P0
Risk: High
Validation: `estimate-sheet-render-probe.ts` render-count assertions (`reportEstimateSheetContentRender`, `reportEstimateNodeTotalsCompute`); keystroke render-count budget proving row B…N + sibling branches do not recompute (Phase 9).
Addressed in: Phase 3.

---

## Pattern: Filter / search / facet / group transforms (per-keystroke DFS)   (ID: PAT-14)

Current occurrences:
- Sheet transforms (each its own DFS): `src/components/workshop/EstimateSheetContent.tsx:682-685` (`estimateSheetRowMatchesQuery`), `:691-710` (`filterEstimateSheetNode`), `:733-735` (`sheetFacetsActive`), `:745-750` (`estimateRowMatchesFacets`), `:753-768` (`collectSheetFacetOptions`), `:776-791` (`filterEstimateSheetNodeByFacets`), `:803-826` (`reorderEstimateSheetNodeRows`); composed in `displayedSheetNode` (`:1291-1318`).
- Tree filters: `EstimateSheetTree.tsx:193-207,216-236` (2 full-tree rebuilds per query char, `:328-339`).
- Library: `component-library/tree/helpers.ts:28-37` (`filterTree`) + `:3-26` (`matchesQuery`); `buildLibraryTree.ts:478-504` re-synthesizes + re-sorts + prunes whole taxonomy per query.
- Indexed exemplar: `TemplatesTree.tsx:659-730` (`filterProjectSourcesByQuery`).

What differs locally:
- Predicate (name vs facet vs structural hide-empty vs group-by-discipline) and output (filtered tree vs facet option list vs reordered rows).

What is structurally the same:
- Full-tree DFS rebuilt on every keystroke; only TemplatesTree's is indexed (the model the others should adopt) (R3-trees.md:108,115).

Proposed canonical kernel:
- `filterKeepingAncestors(idx, predicate)` + a faceting/grouping pass over the shared index, computed once per (tree-version, query) instead of per keystroke; debounce search input.

Refactor priority: P1
Risk: Medium
Validation: `estimate-tree-filter.test.tsx` (250), `templates-tree-performance.test.ts` (<1000ms), sheet search DOM tests; per-keystroke filter budget (Phase 9).
Addressed in: Phase 2 (filter-on-index) + Phase 3 (move off keystroke path).

---

## Pattern: Full-tree recompute per keystroke (totals + signatures)   (ID: PAT-15)

Current occurrences:
- `src/components/workshop/estimate-sheet/rows/editable-row-model.ts:162-183` — `computeNodeTotals` full-tree totals DFS, memo'd on `[editableRows, estimateTree]` (`EstimateSheetContent.tsx:1401`) → reruns every cost-cell keystroke.
- `EstimateSheetContent.tsx:1402-1406` — `displayedNodeTotals` runs a SECOND `computeNodeTotals` when a filter is active (totals computed twice).
- Branch fallback `branch.tsx:177` — `computeNodeTotal(node, editableRows)` if `nodeTotals` absent (latent O(n²)).
- `EstimateSheetContent.tsx:287-318` — `createProposalPreviewSignature` full-tree 15-field string DFS; rides `editableRows` via `:1260-1263` once the preview dialog has been opened.
- `src/lib/estimates/estimate-tree-reorder.ts:181-220` — `getEstimateTreeContentSignature` JSON.stringifies ~19 fields × every row; called 5× in `EstimateSheetTree.tsx:300,301,411,418,440` incl. initial render.

What differs locally:
- Output: totals Map vs proposal signature string vs content-signature string for cache reconciliation.

What is structurally the same:
- Whole-tree DFS over every row's fields recomputed on every keystroke/reorder, driven by `editableRows` identity churn (PAT-13) — SYNTHESIS top-track #3.

Proposed canonical kernel:
- Structural-hash signature (version counters / per-row dirty bits) replacing JSON.stringify; incremental totals (recompute only the edited row's ancestor chain) over the shared parent-index. Phase 1 primitives feed this.

Refactor priority: P0
Risk: High
Validation: `reportEstimateNodeTotalsCompute` probe asserts no full-tree DFS per keystroke; structural-hash equivalence test vs old signature; reorder reconcile tests; render budget (Phase 9).
Addressed in: Phase 1 (structural-hash signature primitive) → Phase 3 (incremental totals).

---

## Pattern: Modal / dialog state (hand-rolled role="dialog")   (ID: PAT-16)

Current occurrences (8 hand-rolled `role="dialog"` — SYNTHESIS §1, R6-ui-primitives.md:112-121):
- `src/components/workshop/EstimateSheetContent.tsx`, `ProposalExportPreviewDialog.tsx`, `NewProjectModal.tsx`, `ProjectDetailsModal.tsx`, `component-library/CommandPalette.tsx`, `component-library/index.tsx`, `estimate-sheet/activity-history.tsx`, `ManageGroupsPopover.tsx`.
- Available primitives bypassed: `src/components/ui/overlays/dialog.tsx`, `modal.tsx`, `confirm-dialog.tsx`, `resizable-modal.tsx`, `popover.tsx`, `command-dialog.tsx` (11 files DO use `AppModal`/`Modal`).

What differs locally:
- Some are legitimately bespoke (command palette, resizable inspector); others duplicate the overlay primitive's focus-trap/aria/scroll-lock.

What is structurally the same:
- Hand-rolled `role="dialog"` + focus/escape/scrim handling that overlays/* already provides.

Proposed canonical kernel:
- Migrate the non-special dialogs onto `overlays/dialog.tsx` / `command-dialog.tsx`; bless the genuinely-bespoke ones explicitly. Add a DS lint flagging raw `role="dialog"` outside the primitive.

Refactor priority: P2
Risk: Medium
Validation: modal DOM/accessibility tests; `bun run lint:design-system`; focus-trap regression.
Addressed in: Phase 6.

---

## Pattern: Toolbar / header action primitives (icon-button + bulk toolbar)   (ID: PAT-17)

Current occurrences:
- 3 forked icon-button modules: `src/components/ui/icon-button.tsx` (`IconButton` 0 non-story uses — dead), `toolbar-icon-button.tsx` (3 workshop files), `header-icon-toolbar.tsx`.
- 19 raw icon-button class strings across ~12 files: `ProjectEstimatesTable.tsx:302,312,344`, `ProjectTeamspaceHeader.tsx:494`, `component-library-manager/ComponentLibraryManager.tsx:451,581`, `estimate-sheet/columns/EstimateColumnRuler.tsx:90`, `EstimateSheetContent.tsx:2753`, `AddComponentModal.tsx` (×4), `LiveProjectCard.tsx` (×2) (R6-ui-primitives.md:73-86).
- `BulkActionToolbar` twice: `src/components/ui/bulk-action-toolbar.tsx:1-219` vs `src/components/workshop/BulkActionToolbar.tsx:1-135` (latter does not import former).
- Violates `DESIGN.md:421` ("Do not create one-off icon-button patterns").

What differs locally:
- Sizes/affordances; the workshop BulkActionToolbar is a separate 135-line impl.

What is structurally the same:
- Square icon button (`size-N place-items-center rounded-xs hover:bg-surface-muted`) and a bulk-selection action bar, each re-implemented.

Proposed canonical kernel:
- Collapse icon-buttons into one `Button variant="icon"`; migrate the 19 raw sites; delete the workshop `BulkActionToolbar` and consume the ui primitive.

Refactor priority: P2
Risk: Low
Validation: visual/DOM tests for migrated buttons + bulk toolbar; `bun run lint:design-system`; new reuse-lint rule catches future raw icon-buttons (PAT-21).
Addressed in: Phase 6.

---

## Pattern: Loading / skeleton states   (ID: PAT-18)

Current occurrences:
- Canonical primitive `src/components/ui/skeleton.tsx:1-18` (`animate-pulse rounded-xs bg-muted/40` + `motion-reduce:animate-none`).
- 6 bespoke `animate-pulse` blocks bypassing it: `src/components/ui/data-table.tsx` (×2), `component-library/tree/TemplatesTree.tsx`, `component-library/index.tsx`, plus 2 `stories/` files — the product ones skip `motion-reduce` (R6-ui-primitives.md:134-141).
- Divergent route shells: `app/workshop/loading.tsx:1-2` + `app/workshop/projects/loading.tsx:1-2` use `StaticWorkshopLoadingShell`+`Skeleton`; `app/workshop/library/loading.tsx:1` uses bare `Skeleton` with no shared shell. 18 `loading.tsx`/`error.tsx` all under `/workshop/**` (R1-rsc-and-bundle.md:14).
- Bespoke list skeleton `ProjectEstimatesListSkeleton.tsx` (46 lines).

What differs locally:
- Inline pulse markup vs primitive; per-route shell composition.

What is structurally the same:
- Pulse placeholder + (sometimes) a route layout shell; reassembled per site, risking layout-shift mismatch with the real route.

Proposed canonical kernel:
- Mandate `Skeleton`; add `<Skeleton.List rows>` and a shared route-skeleton contract (`StaticWorkshopLoadingShell` everywhere); add a lint banning bare `animate-pulse`.

Refactor priority: P3
Risk: Low
Validation: `bun run lint:design-system` (new rule); visual regression for `loading.tsx` vs route; `motion-reduce` honored.
Addressed in: Phase 6.

---

## Pattern: Card surfaces (Card primitive bypassed)   (ID: PAT-19)

Current occurrences:
- `Card` (ui) imported **0×** in workshop (`rg -l "\bCard\b" src/components/workshop` → 0).
- `src/components/workshop/LiveProjectCard.tsx:1-722` — 722-LOC bespoke, **un-memoized** card (type at `:30`).
- `src/components/workshop/ProjectCard.tsx:1-4` — raw markup card.
- `src/components/workshop/EstimateListCard.tsx` (45 lines) — third bespoke card.

What differs locally:
- Each card has domain-specific body content + actions.

What is structurally the same:
- All re-implement the card shell (surface + radius + header/body/footer) instead of composing `ui/card.tsx`; un-memoized LiveProjectCard is a re-render-churn + bundle-bloat target (R6-ui-primitives.md:218-220).

Proposed canonical kernel:
- Make `Card` the structural base (header/media/body/footer slots); feature cards compose it; memoize `LiveProjectCard`.

Refactor priority: P2
Risk: Medium
Validation: card DOM/visual tests; memoization render-count check; `bun run lint:design-system`.
Addressed in: Phase 6.

---

## Pattern: Tab strip primitives   (ID: PAT-20)

Current occurrences:
- 3 ui primitives: `src/components/ui/tabs.tsx` (221), `tab-strip.tsx` (177), `segmented-control.tsx` (113).
- `src/components/workshop/estimate-sheet/EstimateTabStrip.tsx:1-655` — 654-LOC bespoke strip importing neither `TabStrip` nor `Tabs`; raw `<div className="… border-b border-hairline …">` at `:654-655`.

What differs locally:
- `EstimateTabStrip` adds DnD reorder, horizontal scroll, and the orange add-affordance.

What is structurally the same:
- Horizontal tab list with active state + overflow; the behavior layer is feature-specific but the visual strip is the primitive.

Proposed canonical kernel:
- Decide the canonical strip; `EstimateTabStrip` keeps DnD/scroll behavior but composes the primitive for visuals. (Open question: intentional divergence vs accidental — R6 open questions.)

Refactor priority: P3
Risk: Medium
Validation: tab DnD + scroll DOM tests; `bun run lint:design-system`.
Addressed in: Phase 6.

---

## Pattern: Design-system reuse/duplication lint gap   (ID: PAT-21)

Current occurrences:
- `scripts/enforce-app-design-system.mjs:148-237` — enforces tokens (font-size ≤12px, `rounded-xs`, weights, tracking, globals) but has **zero** reuse/duplication/dead-primitive/skeleton rules.
- `DESIGN.md:426` — calls a visible duplicate "a blocking design-system defect", unenforced.
- `.agents/skills/impeccable/scripts/detect.mjs:1-22` — loader only; anti-pattern engine not in-tree, so `lint:design` may be a no-op (Q in 19_OPEN_QUESTIONS).

What differs locally:
- n/a — this is the meta-pattern: the absence of enforcement is *why* PAT-16..PAT-20 duplicates pass CI (each raw string is individually token-compliant).

What is structurally the same:
- Token compliance ≠ reuse compliance; every duplicate passes CI silently (R6-ui-primitives.md:177-188, root-cause finding).

Proposed canonical kernel:
- Add reuse/adoption rules to `enforce-app-design-system.mjs` (or net-new lint): ban raw icon-button class strings, raw `role="dialog"`, bare `animate-pulse`, and flag dead primitives.

Refactor priority: P2
Risk: Low
Validation: new lint flags the known duplicates pre-migration, passes post-migration; runs in `bun run validate`.
Addressed in: Phase 6 (rule) + Phase 10 (enforcement/docs). First confirm whether `lint:design` is live (Q).

---

## Pattern: Route navigation / perceived-latency (router.refresh)   (ID: PAT-22)

Current occurrences (12 files — verified enumerated set):
- Real call sites incl. `src/stores/project-estimates-store.ts`, `hooks/use-navigation-router.ts`, `LibraryPageClient.tsx`, `src/components/workshop/ProjectEstimatesClient.tsx:215`, `ComponentLibraryManager.tsx`, `ProjectEstimatesTable.tsx`, `projects-page-client.tsx`, `NewProjectForm.tsx`, `ProjectEstimateMetadataStrip.tsx`, `library/template-editor/use-template-editor.ts`, `templates-browse/TemplatesBrowseManager.tsx`, `templates-browse/TemplatesBrowsePageClient.tsx`.
- Navigation UI: `src/stores/navigation-ui-store.ts:35-84` (`isNavigating` overlay); `experimental.staleTimes` `next.config.ts:64-67`.

What differs locally:
- Each refresh follows a different mutation; some genuinely need a fresh RSC payload, others could be scoped cache invalidation.

What is structurally the same:
- `router.refresh()` re-runs the whole server segment + RSC payload after a mutation, where a targeted TanStack invalidation would suffice (R1 finding #5).

Proposed canonical kernel:
- Per-call-site audit: replace "data changed" refreshes with scoped query invalidation (pairs with PAT-09/PAT-11); keep refreshes that truly need new RSC.

Refactor priority: P2
Risk: Medium
Validation: per-feature behavioral tests post-replacement; route-transition perf spec (`bun run test:e2e:perf`, currently non-gating); requires per-feature knowledge (Q owner).
Addressed in: Phase 4 (cache/data standardization) + Phase 7 (runtime).

---

## Pattern: Server projections / DTO column discipline   (ID: PAT-23)

Current occurrences:
- `.select("*")` hot paths: `src/lib/repositories/component-library-repository.ts:530-746` (8 tables, **unbounded**, no `.limit()` on `cost_library_items` `:562-566` or audit tables `:630-656`) [HIGH]; `workspace-repository.ts:837,908` (`projects` in sidebar/list) [MED]; `:1356,1367` (`getCurrentWorkspaceProject`, cached); `loadCurrentWorkspaceEstimateTemplates:757,771,776` [MED].
- Strong patterns to generalize (don't rebuild): `src/lib/publication/public-repository.ts:85-111` (`cache()` + split `ACCESS_LOOKUP_COLUMNS`/`SNAPSHOT_LOOKUP_COLUMNS`); `workspace-repository.ts:1620-1683` `listProjectEstimates` (explicit `ESTIMATE_LIST_COLUMNS` + `project_estimate_list_summaries` RPC); `project-charts-repository.ts` limit-with-overflow (`:15-20`).
- Estimate-tree loads cross `source_snapshot`+`metadata` JSON per row (`ESTIMATE_TREE_ROW_ITEM_COLUMNS` `workspace-repository.ts:1734`) — verify sheet consumes all of it (Q, R4/R5 seam).

What differs locally:
- Some `*` are cached per-request (lower severity); others are unbounded list loads.

What is structurally the same:
- Repository reads either select explicit columns + bound rows (the good pattern) or `.select("*")` unbounded (the anti-pattern). No shared column-set discipline.

Proposed canonical kernel:
- Named column-set constants + split heavy-blob column sets (public-repository as the reference); add `.limit()` to unbounded loads; collapse JS aggregation into RPCs where shipped.

Refactor priority: P1
Risk: Medium
Validation: query-count / payload-size budget (Phase 9, to be added); explicit-column equivalence tests; advisor re-scan. Severity of #1 depends on whether prod calls Lite variant (Q).
Addressed in: Phase 4 (select discipline) + Phase 8 (DB/RPC).

---

## Pattern: Permission / edit-capability gates   (ID: PAT-24)

Current occurrences:
- Prop threaded through the estimate tree: `src/components/workshop/EstimateWorkspaceClient.tsx:42,62,121` (`canEditEstimate`), into `EstimateSheetContent` / `EstimateSheetTree`.
- `src/components/workshop/ProjectEstimatesTable.tsx:43` (`canEditEstimateById: Record<string,boolean>`), `:206,223,359,370,518,524,665,671` (per-row `canEditEstimate`), gating disabled/title/handlers at `:245,288,304-316,391,486,541,630,683,717`.
- `src/components/workshop/library/ComponentInspectorDock.tsx:75,86,294` (`canEdit` default true) gated by `ComponentLibraryManager.tsx:1638` (`!isProjectProjectionItem`).
- Server source of truth via RPC: `can_edit_estimate` / `can_edit_project` / `is_workspace_editor` (`src/lib/estimates/actions.ts:368`, R5 RPC inventory).

What differs locally:
- Granularity (per-estimate boolean vs per-row Record vs inspector item-kind check); each surface re-derives the disabled/title/guard logic inline.

What is structurally the same:
- A capability boolean flows server→client and each interactive control re-implements the `disabled + tooltip + early-return-in-handler` triad.

Proposed canonical kernel:
- A small `useEditCapability`/`<EditGate>` (or a `canEdit`-aware action-button variant) centralizing disabled+tooltip+guard; keep the server RPC as the authority.

Refactor priority: P3
Risk: Low
Validation: existing view-only DOM tests on `ProjectEstimatesTable`; ensure no handler executes when `canEdit=false`.
Addressed in: Phase 6 (with toolbar/button consolidation, PAT-17).

---

## Pattern: Activity / audit / history scope   (ID: PAT-25)

Current occurrences:
- Scope flag in Zustand: `src/stores/estimate-ui-store.ts:11,39,47` (`activityScopeDirectOnly: Record<nodeId,boolean>`).
- Scope tree builder DFS: `src/components/workshop/EstimateSheetContent.tsx:507-585` (`buildActivityScopeTreeItems`), consumed at `:1418-1429` (gated behind modal-open — good).
- Server scope resolution: `src/lib/estimates/actions.ts:670-719` (`resolveEstimateActivityNodeScope` fetches EVERY estimate node `:698-701` no limit, JS BFS `collectDescendantNodeIds:640-662`) [MED — belongs in `WITH RECURSIVE` RPC]; actor-label N+1 `:600-622`; event payload SELECT pulls `old_snapshot,new_snapshot,payload` `:1277` (`.limit(boundedEventLimit+1)` ≤101 caps it).
- Fetch wiring: `fetchEstimateSheetVersionControl` (`actions.ts:1237-1379`); `historyData`/`loadMoreVersionControl` in EstimateSheetContent (R-K, `:1411-1582`).

What differs locally:
- Client builds a scope *tree*; server resolves a descendant *id set* via BFS.

What is structurally the same:
- Both walk the estimate hierarchy to scope activity to a node + its descendants — the same descendant-collection (PAT-03) re-solved client-side (DFS) and server-side (JS BFS instead of SQL).

Proposed canonical kernel:
- Client scope builder uses the shared `TreeIndex.descendantsOf`; server replaces JS BFS with an `estimate_activity_node_scope` recursive-CTE RPC; fold actor labels into the event read (R5 candidate RPCs).

Refactor priority: P2
Risk: Medium
Validation: activity-history DOM tests; RPC golden-master vs JS BFS output; query-count budget (Phase 9).
Addressed in: Phase 4 (client scope on index) + Phase 8 (recursive RPC).

---

## Pattern: Selection / expansion store overlap (state shape)   (ID: PAT-26)

Current occurrences:
- `src/hooks/use-estimate-workspace-state.ts:30-93` — selection/expansion/active-tab by id maps; `expandedNodeIds` stored as `string[]` with O(n) `areNodeIdsEqual` (`:105-108`).
- `src/stores/estimate-ui-store.ts:34-51` — overlapping `selectedNodeId`/`expandedNodeIds: string[]`/`selectedRowIds: string[]` + high-frequency `dragState` (mutates every drag-over `:49`).
- `src/stores/project-estimates-store.ts:35-102` — **server state in Zustand** (estimate rows) with its own optimistic engine (PAT-09).
- Correct counter-example: `bulkSelectedRowIds` is a `Set` (`EstimateSheetContent.tsx:1099`).

What differs locally:
- Two stores model the same selection/expansion concept; arrays used where Sets/Maps fit.

What is structurally the same:
- Selection/expansion state duplicated across stores; `dragState` (high-frequency) shares a store so whole-store subscribers re-render per pointer move (R2-state.md:46).

Proposed canonical kernel:
- Merge `estimate-ui-store` + `use-estimate-workspace-state` into one workspace store; `Set`/`Map` for selection/expansion; split `dragState` into its own atom/store; move server state out of Zustand into the query cache (R2-state.md:89).

Refactor priority: P2
Risk: Medium
Validation: selection/expansion DOM tests; drag-render-count budget; verify `bulkSelectedRowIds` merge has no regression (Q, SYNTHESIS §5).
Addressed in: Phase 5 (mutations) coordinated with Phase 3 (sheet decomposition).

---

## Pattern: God-component decomposition (EstimateSheetContent)   (ID: PAT-27)

Current occurrences:
- `src/components/workshop/EstimateSheetContent.tsx` — 2950 LOC file; exported fn 1881 LOC (`:1042-2922`); ~17 responsibilities; ~40 state atoms; 109 `useState/useMemo/useRef/useCallback` (R2-state.md:74). Highest blast radius (SYNTHESIS §1).
- Sibling oversized islands: `component-library/index.tsx` 2540 (`EstimateRightSidebarBase` 1748 LOC `:786`), `AddComponentModal.tsx` 2359, `ComponentLibraryManager.tsx` 1695, `estimate-sheet/activity-history.tsx` 1688, `EstimateSheetTree.tsx` 1587 (R1-rsc-and-bundle.md:19-32).
- Already-extracted precedent (use as template): cursor layer `EstimateSheetContent.tsx:866-1040`.

What differs locally:
- Each responsibility (R-A…R-Q, R4-sheet.md:80-140) owns distinct state/props.

What is structurally the same:
- Many independent concerns packed into one function body, so any single state change re-runs the entire 1881-LOC render and re-derives every dependent memo.

Proposed canonical kernel:
- Extract per-responsibility hooks (`useEstimateEditableRows`, `useEstimateTotals`, `useProposalExport`, `useEstimateActivityHistory`, `useEstimateRowOperations`, `useSheetDisplayTransforms`) + presentational `<EstimateSheetCenterColumn>`, preserving the memo guards (R4-sheet.md:263-296).

Refactor priority: P0
Risk: High
Validation: `reportEstimateSheetContentRender` render-count probe; full `bun run test:dom` (361 serial); incremental extraction behind unchanged public behavior.
Addressed in: Phase 3.

---

## Pattern: Eager-loaded charts / provider topology / redundant deps (bundle)   (ID: PAT-28)

Current occurrences:
- Authed providers on public routes: `src/app/providers.tsx:30-46` mounts `RealtimeAuthBridge`/`NotificationProvider`/`PerformanceMonitor`/`NavigationListener` via root `layout.tsx:25`; `realtime-auth-bridge.tsx:22-66` drags `@supabase/ssr`+supabase-js into the landing bundle + fires auth roundtrip [HIGH].
- d3 charts shipped eagerly: `CostBreakdownSection.tsx:5` (Data route) + `SharePageTabs.tsx:23` (public `/share/[token]`) statically import `CostDonutChart`; only `ProjectChartsClient.tsx:26-29` lazy-loads.
- Redundant dep: full `d3` (868K) installed, only `d3-shape` (440K) used; `react-complex-tree` (2.7M) effectively dead (PAT-08).
- `next.config.ts:55` `optimizePackageImports` covers only phosphor.

What differs locally:
- Each is a distinct bundle/runtime leak; the unifying theme is "authed/heavy code reaching shared/public bundles."

What is structurally the same:
- Heavy or authed-only modules entering bundles that don't need them, via root providers / static imports / redundant deps.

Proposed canonical kernel:
- Move authed providers to `src/app/workshop/layout.tsx`; make `CostDonutChart` dynamic at all 3 consumers; drop `d3` (keep `d3-shape`); extend `optimizePackageImports`. (Several are quick-wins pullable post-Phase 0, SYNTHESIS §2 note.)

Refactor priority: P1
Risk: Low
Validation: `ANALYZE=true bun run build` confirms supabase/realtime out of landing chunk + `react-complex-tree`/`d3` gone (Phase 0 baseline Q); route-transition perf spec; `bun run validate`.
Addressed in: Phase 7 (quick-wins flagged post-Phase 0).

---

## Pattern index (ID | name | priority | phase)

| ID | Name | Priority | Phase |
|---|---|---|---|
| PAT-01 | Tree node index (id→node / id→parent Map builder) | P0 | 2 |
| PAT-02 | Find-node-by-id DFS | P0 | 2 |
| PAT-03 | Descendant-id collection DFS | P1 | 2 |
| PAT-04 | Ancestor walk / keep-ancestor filter | P0 | 2 |
| PAT-05 | Cascade selection + indeterminate state | P1 | 2 |
| PAT-06 | Immutable tree move/insert/remove (reorder & delete planners) | P1 | 2 |
| PAT-07 | Subtree rollup / totals DFS (non-render aggregation) | P2 | 2 / 1 |
| PAT-08 | Two presentation tree kernels + dead dependency | P2 | 2 / 7 |
| PAT-09 | Optimistic mutation lifecycle | P0 | 5 |
| PAT-10 | Query-key conventions + tabTree/areaTree branch | P1 | 1 |
| PAT-11 | patchAndMarkStale idiom | P1 | 1 |
| PAT-12 | Tree-patch reconciliation (optimistic-vs-server) | P1 | 5 / 2 |
| PAT-13 | Editable-row model + per-row subscription | P0 | 3 |
| PAT-14 | Filter / search / facet / group transforms | P1 | 2 / 3 |
| PAT-15 | Full-tree recompute per keystroke (totals + signatures) | P0 | 1 / 3 |
| PAT-16 | Modal / dialog state (hand-rolled role="dialog") | P2 | 6 |
| PAT-17 | Toolbar / header action primitives (icon-button + bulk toolbar) | P2 | 6 |
| PAT-18 | Loading / skeleton states | P3 | 6 |
| PAT-19 | Card surfaces (Card primitive bypassed) | P2 | 6 |
| PAT-20 | Tab strip primitives | P3 | 6 |
| PAT-21 | Design-system reuse/duplication lint gap | P2 | 6 / 10 |
| PAT-22 | Route navigation / perceived-latency (router.refresh) | P2 | 4 / 7 |
| PAT-23 | Server projections / DTO column discipline | P1 | 4 / 8 |
| PAT-24 | Permission / edit-capability gates | P3 | 6 |
| PAT-25 | Activity / audit / history scope | P2 | 4 / 8 |
| PAT-26 | Selection / expansion store overlap (state shape) | P2 | 5 / 3 |
| PAT-27 | God-component decomposition (EstimateSheetContent) | P0 | 3 |
| PAT-28 | Eager charts / provider topology / redundant deps (bundle) | P1 | 7 |
