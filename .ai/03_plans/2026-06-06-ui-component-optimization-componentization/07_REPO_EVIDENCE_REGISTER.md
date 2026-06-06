# Repo Evidence Register

Date: 2026-06-06

## 2026-06-06 Live Evidence Update

Additional verification performed during refinement:

- `npx gitnexus analyze` refreshed the index successfully: 13,416 nodes, 24,237 edges, 593 clusters, 300 flows; indexed commit `7c20850`.
- `npx gitnexus status` after refresh reported the index up to date.
- GitNexus impact risks: `EstimateSheetContent` `MEDIUM` with partial traversal warning, `EstimateSheetTree` `MEDIUM`, `LibraryFolderTree` `LOW`, `WorkshopTree` `HIGH`, `ShareEstimateTreePanel` `LOW`, `ShareEstimateTreeView` `LOW`.
- code-review graph file-level impact for the six target files reported `high` risk, 238 directly changed nodes, 500 impacted nodes shown within two hops, and 124 additional files affected.
- Test inventory corrected: 8 referenced tests exist and 12 are aspirational.
- Proposed future source folders are absent today.
- `data/local/seed.json` is too small for performance conclusions.

See `BLAST_RADIUS_ANALYSIS.md`, `MEASUREMENT_BASELINE.md`, and `IMPLEMENTATION_MATRIX.md` for the structured records.

## Graph Evidence

The snapshot below is preserved from the original pack, but the current
refinement authority is the live evidence update above and
`BLAST_RADIUS_ANALYSIS.md`.

Graph snapshot:

- Nodes: 5,042
- Edges: 74,559
- Files: 560
- Languages: JavaScript, TSX, TypeScript, SQL
- Last updated: 2026-06-06T21:35:04
- Branch: `main`
- Commit: `7c20850754a7`

Largest UI files under `src/components`:

| Rank | File | Lines | Planning meaning |
| --- | --- | ---: | --- |
| 1 | `src/components/workshop/EstimateSheetContent.tsx` | 4,071 | Primary bridge/chokepoint; split with tests first. |
| 2 | `src/components/workshop/component-library-manager/AddComponentModal.tsx` | 2,362 | Modal/form/cost-manager extraction target. |
| 3 | `src/components/workshop/EstimateSheetTree.tsx` | 1,576 | Editable tree bridge; keep RCT while extracting state/mutations. |
| 4 | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx` | 1,257 | Catalogue, tree panel, and sheet composition split target. |
| 5 | `src/components/workshop/component-library-manager/LibraryFolderTree.tsx` | 1,249 | Editable library tree; extract model/filter/drop hooks. |
| 6 | `src/components/workshop/ProjectEstimatesTable.tsx` | 1,003 | Dense table/editable cell extraction target. |

Bridge nodes:

| Node | Evidence | Meaning |
| --- | --- | --- |
| `EstimateSheetContent` | Top bridge node by betweenness. | Changing it can affect row edit, activity, proposal export, sidebar, and selected-node rendering. |
| `EstimateSheetTree` | Second bridge node and top runtime hub among component functions. | Changing it can affect selection, route focus, RCT drag/drop, reorder, rename, delete, and bulk delete. |
| `EstimateRightSidebar` | Third bridge node. | Estimate sheet and component library insertion must stay aligned. |

Suggested graph questions:

- Is `EstimateSheetContent` adequately tested and documented?
- Is `EstimateSheetTree` adequately tested and documented?
- Is `EstimateRightSidebar` adequately tested and documented?
- Is `AddComponentModal` direct coverage sufficient for its hub risk?

## Source Evidence

### `EstimateSheetContent.tsx`

| Lines | Evidence | Planning implication |
| --- | --- | --- |
| 3-32 | Imports React state/effects, UI controls, estimate hooks, collaboration, activity, proposal export, component library, tree data, and tree row primitives. | The file owns many domains and should be split by responsibility. |
| 35-60 | Re-exports component library helpers and sidebar for compatibility. | Compatibility exports should move to a barrel or explicit module to reduce hidden ownership. |
| 97-105 | `collectAllNodeIds` is local tree utility logic. | Move into tree core and reuse in share tree expansion. |
| 1020 | `EstimateRowItemsTable` starts inside the same file. | Extract row table as a self-contained sheet module. |
| 1049-1078 | `EstimateRowItemsTable` computes editable row totals with `useMemo`. | Keep as pure derived row model and test it separately. |
| 1120-1196 | Row table maps all computed rows and embeds inline editable cells. | Candidate for stable row component and render-scope tests. |
| 1409 | `EstimateSheetBranch` starts inside the same file. | Extract recursive sheet branch renderer. |
| 2300 | `EventList` starts inside the same file. | Move activity event list to activity module. |
| 2465 | `RowDetailsModal` starts inside the same file. | Move dialog out of main sheet component. |
| 2725 | `buildActivityScopeTreeItems` starts inside the same file. | Move pure activity tree utility. |
| 2838 | `ActivityScopeTree` starts inside the same file. | Pilot flat tree extraction here. |
| 2983 | `ActivityHistoryModal` starts inside the same file. | Move activity modal into route-local module. |
| 3240 | `EstimateSheetContent` starts. | Keep as orchestrator after extraction. |
| 3347-3351 | `currentRows` and `activityScopeItems` derive from `estimateTree` and `editableRows`. | These are render-scope pressure points and need memo/test boundaries. |
| 3684-3904 | Insert, replace, detach, move, delete row mutation handlers live inline. | Extract `useEstimateRowCommandHandlers` after tests lock behavior. |
| 3906-4071 | Main render includes command palette, proposal dialog, activity modal, row details, project-specific dialog, sheet branch, and sidebar. | Hidden modal code and sidebar code are dynamic-import and split candidates. |

### `EstimateSheetTree.tsx`

| Lines | Evidence | Planning implication |
| --- | --- | --- |
| 7-14 | Imports `ControlledTreeEnvironment`, `InteractionMode`, and `Tree` from `react-complex-tree`. | Editable tree should keep RCT initially. |
| 162 | `buildTreeModel` starts. | Move to pure estimate tree model utility. |
| 193 | `buildEstimateTreeSelectionNodes` starts. | Share selection utility shape with library folder tree. |
| 220-268 | Component initializes query state, refs, mutation status, editing state, bulk selection, selected route state, model, selection nodes, folder IDs, and expansion. | Extract model/view-state/bulk-selection hooks before renderer changes. |
| 271-284 | Selection pruning runs in a microtask. | Tests must cover stale selection after tree/filter changes. |
| 327-367 | Prop synchronization guards pending reorder and stale signatures. | High-risk behavior; do not refactor without reorder regression tests. |
| 424-430 | Builds RCT `viewState`. | Extract `useEstimateTreeViewState`. |
| 514 | `handleDrop` starts. | Extract drop controller only after RCT DnD tests fail/pass. |
| 699 | `commitRenameNode` starts. | Extract mutation handlers with rollback tests. |
| 773 | `handleConfirmDeleteNode` starts. | Preserve delete confirmation and rollback behavior. |
| 866 | `handleConfirmBulkDeleteNodes` starts. | Preserve dedupe-root behavior. |
| 990 | `SearchInput` appears in sidebar shell. | Search behavior should be audited before extraction. |
| 1036-1495 | RCT render environment and custom `renderItem`. | Renderer split should preserve RCT props and DOM tests. |

### `AddComponentModal.tsx`

| Lines | Evidence | Planning implication |
| --- | --- | --- |
| 47-124 | Draft types cover variants, images, attachments, cost entries, and lifecycle. | Split form state by data domain. |
| 175-185 | Upload size/type constants. | Move upload constants and validation helpers together. |
| 244-280 | Image resize/upload logic. | Extract upload service hook or utility, test safe fallbacks. |
| 378-425 | `makeCostEntryDraft` and `makeVariantDraft`. | Pure factories can move and gain tests. |
| 680 | `AddComponentModal` starts. | Main modal should become composition shell. |
| 767 | Validation `useMemo` starts. | Extract validation as pure function with tests. |
| 847 | `updateDraft` starts. | Move draft reducer/hook to reduce inline state mutations. |
| 894 | `addVariant` starts. | Extract variant actions and test default variant behavior. |
| 1378 | `submit` starts. | Keep submission contract but move payload creation to pure adapter. |
| 2089-2123 | `LibraryFolderTreePicker` embedded in modal. | Keep picker composition but isolate modal form state. |
| 2215-2359 | Cost Manager modal is embedded in the same file. | Extract `CostManagerModal` as a separate module. |

### `LibraryFolderTree.tsx`

| Lines | Evidence | Planning implication |
| --- | --- | --- |
| 85-116 | Local label normalization and option key helpers. | Consolidate with tree/search core where possible. |
| 150 | `filterFolderTree` starts. | Extract filter utility and test ancestor retention. |
| 174 | `buildComponentItemsByFolderId` starts. | Build indexed placement once per data revision. |
| 235-280 | `buildFolderTreeModel` creates RCT items and component leaf rows. | Move RCT model builder into hook/utility. |
| 367-376 | Multiple `useMemo` stages build folder maps, filter maps, filtered nodes, and tree model. | Good seam for `useLibraryFolderTreeModel`. |
| 402-414 | Microtask prunes bulk selection after tree changes. | Test stale selection cleanup. |
| 446-469 | `handleDrop` performs optimistic reorder and rollback. | Extract drop controller after pure reorder plan tests. |
| 556-756 | Controlled RCT environment and render item logic. | Keep rendering stable; split only after model/drop tests. |

### `workshop-tree.tsx`

| Lines | Evidence | Planning implication |
| --- | --- | --- |
| 23-37 | Context menu wrapper is already shared. | Keep; do not duplicate in tree consumers. |
| 70-173 | `WorkshopTreeRow` handles slot-aware row layout and avoids nested interactive button invalidity. | Preserve this as shared row chrome. |
| 184-191 | Recursive `WorkshopTree` props accept `expandedNodeIds` array. | Normalize to `Set` internally or add flat renderer later. |
| 224-261 | `WorkshopTreeNode` recurses and checks `expandedNodeIds.includes`. | Recursive rendering is fine for small trees; flat rows required for virtualization. |

### Share Tree Surfaces

| File/lines | Evidence | Planning implication |
| --- | --- | --- |
| `ShareEstimateTreePanel.tsx:51-68` | Local money formatting and collect-all IDs. | Move to shared share-tree utilities. |
| `ShareEstimateTreePanel.tsx:70-101` | Recursive search filtering clones matched trees. | Extract and test search utility. |
| `ShareEstimateTreePanel.tsx:112-297` | Local row renderer with inline row items. | Share with `ShareEstimateTreeView`. |
| `ShareEstimateTreePanel.tsx:321-359` | Search/default expansion/expand-collapse logic. | Move to hooks. |
| `ShareEstimateTreeView.tsx:47-52` | Duplicate money formatting. | Share formatter. |
| `ShareEstimateTreeView.tsx:61-231` | Similar row renderer. | Unify renderer. |
| `ShareEstimateTreeView.tsx:234-280` | Mobile and expansion logic repeated. | Share hook. |

### Component Library Tree Builders

| File/lines | Evidence | Planning implication |
| --- | --- | --- |
| `buildLibraryTree.ts:75-98` | Recursive `findNodeById` and `collectItemsFromNode`. | Replace tree rebuild collection with index-based lookup. |
| `buildLibraryTree.ts:119-158` | `attachComponentsToTree` scans/fuzzy matches per component. | Keep behavior but test exact and fuzzy placement. |
| `buildLibraryTree.ts:223-269` | Brand tree filters all items for each brand. | Pre-group by brand ID/key. |
| `buildLibraryTree.ts:271-317` | Supplier tree filters all items for each supplier. | Pre-group by supplier ID/key. |
| `buildLibraryTree.ts:425-443` | `getLibraryItemsForTreeNode` rebuilds the whole tree to collect items. | Use a tree item index. |
| `library-folder-reorder.ts:140-176` | Location and descendant lookup rebuild maps and repeatedly filters/sorts. | Build one folder index per operation. |
| `library-folder-reorder.ts:250-337` | Drop plan and evaluation are pure enough to optimize safely with tests. | Add index tests before changing implementation. |

## Existing Test Anchors

Use these before writing new code:

- `tests/vitest/workshop-tree-row-affordances.test.tsx`
- `tests/vitest/library-folder-reorder.test.ts`
- `tests/vitest/library-folder-tree-selection.test.tsx`
- `tests/vitest/estimate-tree-bulk-selection.test.tsx`
- `tests/vitest/estimate-tree-modal.test.tsx`
- `tests/vitest/estimate-tree-context-menu.test.tsx`
- `tests/vitest/estimate-sheet-tree-dnd.test.tsx`
- `tests/vitest/estimate-sheet-tree-rct-dom.test.tsx`
- `tests/vitest/route-transition-peak-load-profile.test.tsx`
- `tests/vitest/component-library-manager-ui.test.tsx`
- `tests/vitest/workshop-library-consolidation-ui.test.tsx`
- `tests/vitest/component-library-ui.test.tsx`
- `tests/vitest/estimate-sheet-version-control-ui.test.tsx`

## Official Research Evidence

| Source | Evidence | Planning implication |
| --- | --- | --- |
| React `memo` docs | Memoization is an optimization, not a guarantee. | Do not broad-memoize rows without stable props and measurement. |
| React `useMemo` docs | `useMemo` is appropriate for genuinely slow calculations and may be discarded. | Memoize tree indexes and visible rows, not semantic state. |
| React `useCallback` docs | Callback identity matters when passing functions to memoized children. | Use stable callbacks only after extracting memoized row components. |
| React `Profiler` docs | `actualDuration` measures subtree render work for an update. | Use Profiler to prove render-scope improvement. |
| Next.js lazy loading docs | Client components and libraries can be loaded on demand. | Defer hidden modals and expensive client-only panels. |
| TanStack Virtual docs | Virtualization uses count, scroll element, size estimates, and virtual row positioning. | Flatten tree rows before virtualizing. |
| TanStack Table virtualization guide | TanStack Table does not ship virtualization, but works with virtualizers. | Do not expect table virtualization from current table dependency alone. |
| React Complex Tree docs | Controlled environments require app-managed state; shared tree environments matter for multi-tree drag/drop. | Keep RCT for editable trees and extract controlled state carefully. |
| WAI-ARIA Tree View Pattern | Dynamic/virtual trees need explicit level, set size, and position metadata. | Add aria metadata tests before any virtual tree renderer. |
