# 02 - CRUD & Interaction Capability Matrix

> Part of the **Estimate Master Column (EMC) Improvement Plan** -- `.ai/03_plans/2026-06-14-Estimate-Tree-Column-Improvement-Plan/`
> Status: DRAFT (audit) - 2026-06-14 - Branch: feat/estimate-sheet-uxui
> Index: [00-README](00-README.md)

---

This document is the centerpiece deliverable for **Requirement 4** ("Examine and document and put in a matrix ALL the CRUD functionalities + more (drag, delete, etc). ALL."). It is an exhaustive census of every user-facing operation at every level of the EMC entity hierarchy, anchored to verified `path:line` and reconciled against the persistence layer.

Sibling docs: [01-CONTEXT-AND-ARCHITECTURE](01-CONTEXT-AND-ARCHITECTURE.md) for the data/render model, [04-FEATURE-READINESS-AND-BUG-AUDIT](04-FEATURE-READINESS-AND-BUG-AUDIT.md) for the Req 3 caret bug, [03-UXUI-AUDIT](03-UXUI-AUDIT.md) for the Req 1 "Own items" label and the Req 2 spacing, [06-DATABASE-AND-NETWORK-AUDIT](06-DATABASE-AND-NETWORK-AUDIT.md) for the DB/RPC detail, [07-BLAST-RADIUS-AND-RISK](07-BLAST-RADIUS-AND-RISK.md) for test coupling, [09-OPEN-DECISIONS](09-OPEN-DECISIONS.md) for the open questions surfaced here.

---

## How I verified this

Every row in the matrix was confirmed by reading the actual source on `feat/estimate-sheet-uxui`:

- **EMC host** -- `src/components/workshop/EstimateSheetContent.tsx` (the 2475-line host that owns ALL row/component/template mutation handlers + the scope-keyed collapse state).
- **Per-node renderer** -- `src/components/workshop/estimate-sheet/rows/branch.tsx` (327 lines), plus `row-table.tsx`, `cells.tsx`, `drop-zones.tsx`, `node-visuals.tsx`.
- **Left tree (node CRUD origin)** -- `src/components/workshop/EstimateSheetTree.tsx` (1591 lines).
- **Tab strip** -- `src/components/workshop/estimate-sheet/EstimateTabStrip.tsx`.
- **Row mutation hook** -- `src/hooks/use-estimate-row-mutations.ts`.
- **Server actions** -- `src/lib/estimates/actions.ts` (the `assertCanEditEstimate` call-site grep returned exactly lines 1496, 1799, 1849, 2243, 2284, 2352, 2631 -- this is the basis for the edit-gating column).
- **Workspace wiring** -- `src/components/workshop/EstimateWorkspaceClient.tsx`.
- **Charts coupling** -- `src/lib/project-charts/aggregate-project-charts.ts`.

Where a claim is behavioral (e.g. "silent no-op") the matrix states the line that produces it.

---

## The entity hierarchy (what the matrix groups by)

```
Estimate
 └─ Tab                  (EstimateTabStrip — top of EMC; CRUD = create/rename/delete/duplicate/reorder/switch)
     └─ Node / Area      (P6 single kind; can hold BOTH child sub-areas AND its own rows)
         ├─ child Node   (recursion — EstimateSheetBranch over a subtree)
         └─ Row item     (a line in the node's own-rows table)
             └─ Component (the library-linked material attached to ONE row; replace/move/clear/detach)
```

Two cross-cutting groups round out the census:

- **Selection / Bulk** — row checkboxes + node cascade checkboxes and their bulk toolbars.
- **Tree / View** — operations that act on the whole displayed subtree: expand/collapse, search, facet filter, within-area group/sort, and template / project-source insertion.

**Where affordances live (the load-bearing split):** NODE-level CRUD (create/rename/delete/move/bulk-delete area) lives in the **LEFT tree** (`EstimateSheetTree.tsx`), NOT the EMC. The EMC only *dispatches CustomEvents* for node-template-save and *receives* the selected node to drive the sheet. ROW + COMPONENT + TEMPLATE-INSERT CRUD lives in the **EMC** (`EstimateSheetContent.tsx` handlers, rendered through `branch.tsx`). TAB CRUD lives in the **strip**, except the New-tab button which was relocated into the EMC header (`EstimateSheetContent.tsx:2294-2302`) and fires the strip via an imperative ref (`EstimateTabStrip.tsx:402`).

---

## Status legend

| Status | Meaning |
|--------|---------|
| **works** | Affordance present, handler wired, persists correctly, no known defect. |
| **partial** | Works but with a real limitation (non-atomic, keyboard-only, N round-trips, no confirm, render-only/not persisted, etc.). |
| **broken** | Affordance is present/advertised but the operation silently fails, no-ops, or is non-functional. |
| **missing** | No affordance at all (an expected-but-absent operation). |

---

## MASTER MATRIX

Columns: **Entity | Operation | Affordance (where) | Handler | Server / Persistence path | Optimistic / Refetch | Edit-gating | Status | Anchors | Gaps**.

> Optimistic/Refetch note: row mutations invalidate with `refetchType:"none"` everywhere (`use-estimate-row-mutations.ts:144-150,205-206,216,254-255,266`) — the cache is marked stale but never refetched, so the optimistic `setQueryData`/`setEstimateTree` IS the persisted truth on success. See [06-DATABASE-AND-NETWORK-AUDIT](06-DATABASE-AND-NETWORK-AUDIT.md).

### Entity: Tab

| Entity | Operation | Affordance (where) | Handler | Server / Persistence | Optimistic / Refetch | Edit-gating | Status | Anchors | Gaps |
|---|---|---|---|---|---|---|---|---|---|
| Tab | Create | New-tab button in EMC header (relocated from strip) → imperative `createTab()` on strip | `createTab` → `createEstimateTab` | `create_estimate_tab` RPC; action returns canonical `tabs` → `onTabsChange` sets cache | Refetch-by-result (action returns full tab list) | `canEditEstimate` (`canCreate = lifecycleActionsReady && canCreateTabs`) | works | `EstimateSheetContent.tsx:2294-2302`, `EstimateTabStrip.tsx:381-398`, `EstimateTabStrip.tsx:402` | Button mirrors `createTabState` via effect; create auto-opens inline rename (`EstimateTabStrip.tsx:392`) |
| Tab | Rename | strip context-menu / double-click / F2 | `beginRename` + `commitRename` → `renameEstimateTab` | `renameEstimateTab`; returns `tabs` → `onTabsChange` | Refetch-by-result | `canEditEstimate` (`lifecycleActionsReady`, `EstimateTabStrip.tsx:338`) | works | `EstimateTabStrip.tsx:337-343`, `EstimateTabStrip.tsx:345-379` | Heavy focus-handoff to survive Radix close-auto-focus |
| Tab | Delete | strip context-menu | `deleteTab` → `deleteEstimateTab` | `deleteEstimateTab`; returns `tabs` + `replacementTabId` | Refetch-by-result | `canEditEstimate`; disabled when only 1 tab (`orderedTabs.length < 2`, `EstimateTabStrip.tsx:479`) | works | `EstimateTabStrip.tsx:478-515` | **No confirm dialog** (node delete has one) |
| Tab | Duplicate | strip context-menu | `duplicateTab` → `duplicateEstimateTab` | `duplicateEstimateTab`; returns `tabs` + new `estimateTabId` | Refetch-by-result | `canEditEstimate` (`lifecycleActionsReady`, `EstimateTabStrip.tsx:424`) | works | `EstimateTabStrip.tsx:423-448` | none observed |
| Tab | Reorder | **keyboard only** (Cmd/Ctrl+Shift+Arrow) | `moveActiveTab` → `reorderEstimateTabs` | `reorderEstimateTabs`; returns `tabs` (optimistic fallback array) | Refetch-by-result w/ array fallback | `canEditEstimate`; needs ≥2 tabs (`EstimateTabStrip.tsx:451`) | partial | `EstimateTabStrip.tsx:450-476` | **Keyboard-only**; tabs are not drag-reorderable |
| Tab | Switch / Select | EMC tab strip click; spring-load on hover during drag | `onTabChange` (`setActiveTabId`, Zustand) | local-only (URL `replaceState`) | local-state-only | none (read-only switcher; non-editors can switch) | works | `EstimateTabStrip.tsx:323-335` (drop path), `EstimateWorkspaceClient.tsx:90-94`, `EstimateWorkspaceClient.tsx:123` | none |
| Tab | Drag node onto tab (cross-tab move) | drag a tree node onto a tab | `handleTabDrop` → toast rejection | local-only | not-persisted | n/a | missing | `EstimateTabStrip.tsx:323-335` | **Explicitly unsupported** — `dropEffect="none"` + error toast (`CROSS_TAB_NODE_MOVE_MESSAGE`) |

### Entity: Node / Area  (CRUD origin = LEFT tree; expand/collapse + select = EMC)

| Entity | Operation | Affordance (where) | Handler | Server / Persistence | Optimistic / Refetch | Edit-gating | Status | Anchors | Gaps |
|---|---|---|---|---|---|---|---|---|---|
| Node | Create (root or child sub-area) | left tree header "Add Area" + context-menu "Add area inside" + empty-state event | `handleAddArea` / `handleAddTreeNode` → `createEstimateNode` | `create_estimate_node_with_history` RPC | Optimistic (local node + optimistic id, reconcile server id) | **NONE client-side** (tree has no `canEditEstimate`); server RLS only — `createEstimateNode` has **no `assertCanEditEstimate`** | works | `EstimateSheetTree.tsx:706-803`, `EstimateSheetTree.tsx:1187-1199`, `actions.ts:1989-2079` | New node always `kind:"area"` (`EstimateSheetTree.tsx:730`); affordance always visible to non-editors |
| Node | Rename | left tree context-menu / double-click inline | `beginRenameNode` + `commitRenameNode` → `renameEstimateNode` | `rename_estimate_node_with_history` RPC | Optimistic (local rename + reconcile) | NONE client-side; server RLS only (`renameEstimateNode` lacks `assertCanEditEstimate`, body at `actions.ts:2081`) | works | `EstimateSheetTree.tsx:1219-1225`, `actions.ts:2081` | No rename affordance from the EMC node header — left tree only |
| Node | Delete (single subtree) | left tree context-menu + confirm modal | `setDeleteTargetNode` → `handleConfirmDeleteNode` → `deleteEstimateNode` | `delete_estimate_node_with_history` RPC | Optimistic (`planEstimateTreeDelete` + reconcile) | NONE client-side; server RLS only | works | `EstimateSheetTree.tsx:1231-1238` (menu item), `EstimateSheetTree.tsx:1228-1241` (danger group) | **No delete affordance in the EMC**; `deleteEstimateNode` lacks `assertCanEditEstimate` |
| Node | Move / reparent (drag) | left tree drag (inside/before/after) | `handleTreeDrop` → `reorderEstimateTreeNodes` | `reorder_estimate_nodes_with_history` RPC | Optimistic (`evaluateEstimateTreeDrop` plan + reconcile) | NONE client-side (`canReorderNow = !saving`); server RLS only | works | `EstimateSheetTree.tsx:575-650` (per memory 5420) | **Single-node drag only**; cross-tab blocked; cannot move from the EMC; `reorderEstimateTreeNodes` lacks `assertCanEditEstimate` |
| Node | Reorder (among siblings) | left tree drag (before/after) | `handleTreeDrop` (same path) | `reorderEstimateTreeNodes` | Optimistic + reconcile | NONE client-side | works | `EstimateSheetTree.tsx:575-650` | **No keyboard reorder** for nodes (unlike tabs); no up/down buttons |
| Node | Indent / Outdent | none (only drag-reparent) | none | — | not-persisted | n/a | missing | `EstimateSheetTree.tsx:1183-1242` (only Add/rename/delete exist in menu) | No explicit indent/outdent affordance or shortcut |
| Node | Duplicate | none (only "Save as template") | none | — | not-persisted | n/a | missing | `EstimateSheetTree.tsx:1201-1217` (Save-as-template, not duplicate) | No node/area duplicate (tabs can be duplicated). Workaround: save-as-template then re-insert |
| Node | Save as template | left tree context-menu | dispatch `CREATE_ESTIMATE_TEMPLATE_FROM_NODE_EVENT` | local-only (event) → templates panel action | handled elsewhere (templates panel) | disabled while node pending-create (`nodeIsPendingCreate`); **no canEdit gate** | works | `EstimateSheetTree.tsx:1204-1217` | Receiver is the templates panel (out of EMC scope) |
| Node | Expand / Collapse (single) | **EMC node-header caret** | `setCollapsedNodeIds` toggle via `EstimateSheetExpansionContext` | local-only | local-state-only (`collapsedNodeIdsByScope` per `dataTabId`) | none | **broken** | `branch.tsx:182-205`, `branch.tsx:189-196`, `EstimateSheetContent.tsx:1155-1169` | **Req 3 BUG**: caret rendered only when `hasChildren` (`branch.tsx:182`); a node with own rows but no sub-areas has no caret and cannot collapse. Should key off `hasContents` (`branch.tsx:88`). See [04-FEATURE-READINESS-AND-BUG-AUDIT](04-FEATURE-READINESS-AND-BUG-AUDIT.md) |
| Node | Select (drive the EMC sheet) | left tree row click | `handlePrimaryAction` → `setSelectedNodeId` + URL sync | local-only | local-state-only (Zustand + `replaceState`) | none | works | `EstimateSheetTree.tsx:1149-1156`, `EstimateSheetContent.tsx:1118-1126` | Selecting a node swaps the EMC root; EMC renders the selected node's whole subtree |
| Node | Add blank row to node | EMC row "Add row" quiet button + empty-state | `onAddBlankRow` → `insertBlankRow` → `insertLibraryItem(blank)` | `insert_estimate_row_item_with_history` RPC | Optimistic insert (`insertRow` mutation) | NONE client-side | **broken** | `drop-zones.tsx:36-52`, `EstimateSheetContent.tsx:1907-1912`, `EstimateSheetContent.tsx:1647-1649` | **KIND-GATE BUG**: `insertLibraryItem` returns early when `targetNode?.kind !== "area"` (`EstimateSheetContent.tsx:1649`); a group-kind node silently rejects with **no feedback**. Server action explicitly allows ANY node (`actions.ts:2500-2513`) |

### Entity: Row item

| Entity | Operation | Affordance (where) | Handler | Server / Persistence | Optimistic / Refetch | Edit-gating | Status | Anchors | Gaps |
|---|---|---|---|---|---|---|---|---|---|
| Row | Insert library item (click / sidebar add-event / command palette) | EMC drop strip / right sidebar `archestimator:add-library-item` event / command palette | `insertLibraryItem` / `insertIntoSelectedNode` | `insertEstimateRowItemFromLibrary` → `insert_estimate_row_item_with_history` | Optimistic insert (no post-success reconcile for insert) | NONE client-side; server lacks `assertCanEditEstimate` (body `actions.ts:2494`) | **broken** | `EstimateSheetContent.tsx:1647-1678`, `EstimateSheetContent.tsx:1940-1947` (sidebar), `EstimateSheetContent.tsx:2110-2117` (palette), `EstimateSheetContent.tsx:1649` | Same `kind!=="area"` gate (`:1649`) silently drops the insert on a group node — affects palette, sidebar add-event, `insertIntoSelectedNode`. No toast |
| Row | Insert via drag library item into node | drag library item → node drop strip / row table | `ComponentDropTarget` `onDrop` / `row-table` `handleDrop` → `onInsertLibraryItem` | `insertEstimateRowItemFromLibrary` | Optimistic insert | NONE client-side | **broken** | `drop-zones.tsx:108-114`, `row-table.tsx:149-155`, `EstimateSheetContent.tsx:1649` | Reaches the same kind-gated `insertLibraryItem` → silent no-op on group nodes |
| Row | Insert blank via keyboard / command palette ("/") | keyboard (Cmd/Ctrl+K or "/") opens palette | command palette → `insertIntoSelectedNode` → `insertLibraryItem` | `insertEstimateRowItemFromLibrary` | Optimistic insert | `canInsertIntoSelectedNode` (just needs a selected node id, `EstimateSheetContent.tsx:1230`) | **broken** | `EstimateSheetContent.tsx:1914-1938`, `EstimateSheetContent.tsx:2110-2117`, `EstimateSheetContent.tsx:1680-1687`, `EstimateSheetContent.tsx:1649` | Palette says "can insert" for ANY node (`canInsertIntoSelectedNode` true) but routes through kind-gated `insertLibraryItem` → silent no-op on a group node |
| Row | Edit values (qty / adjustment% / mode / misc) | EMC row cells (inline inputs) | `setEditableRows` on change; `onUpdateRowItem` on blur → `updateRow` (queued) | `updateEstimateRowItem` → `update_estimate_row_item_with_history` | Optimistic cache patch + queued `mutateAsync` per row, `refetchType:"none"`; reconciles `rowRevision`/`itemCost` from result | NONE client-side; server lacks `assertCanEditEstimate` (`actions.ts:2562`) | works | `row-table.tsx:245-352`, `EstimateSheetContent.tsx:1623-1645`, `use-estimate-row-mutations.ts:291-301`, `actions.ts:2562-2585` | Per-row serialized queue (`enqueueRowUpdate`) prevents lost updates; optimistic-concurrency on `expected_row_revision`. Commits on blur/Enter, not per keystroke |
| Row | Delete (single) | EMC row trash button | `onDeleteRowItem` → `deleteRowItem` → `deleteRow` | `deleteEstimateRowItem` → `delete_estimate_row_item_with_history` | Optimistic remove (no post-success reconcile) | NONE client-side; server lacks `assertCanEditEstimate` (`actions.ts:2650`) | works | `row-table.tsx:378-387`, `EstimateSheetContent.tsx:2046-2069`, `actions.ts:2650-2659` | **No confirm dialog** for single-row delete |
| Row | Open row details / activity | EMC row dots / arrows-out buttons | `onOpenRowDetails` → `setRowDetails` (`RowDetailsModal`) | `fetchEstimateSheetVersionControl` (activity tab, on open) | local-state-only (modal); activity fetched on open | none (read) | works | `row-table.tsx:357-377`, `EstimateSheetContent.tsx:2354` (`openRowDetails` wired) | Two buttons (details vs activity) plus material-cell dots open the SAME modal on different tabs |
| Row | Reorder rows within a node | EMC row drag grip (`DotsSixVertical`) — **PHANTOM** | none | — | not-persisted | n/a | **broken** | `row-table.tsx:201-204` | Grip has `cursor-grab` + aria-label "Drag material" but is **NOT draggable**, has **no `onDragStart`**; no reorder-row server action exists. Misleading affordance |
| Row | Duplicate row | none | none | — | not-persisted | n/a | missing | `row-table.tsx:357-388` (only details/activity/delete exist) | No way to duplicate a row item |
| Row | Move a row between nodes | none (only component move exists) | none | — | not-persisted | n/a | missing | (see Component → Move) | Only the COMPONENT moves (replace+clear); the row item itself cannot move between nodes |

### Entity: Component  (the library material attached to ONE row)

| Entity | Operation | Affordance (where) | Handler | Server / Persistence | Optimistic / Refetch | Edit-gating | Status | Anchors | Gaps |
|---|---|---|---|---|---|---|---|---|---|
| Component | Replace (drag library item onto material cell) | drag library item → material cell | `handleReplacementDrop` → `onReplace` → `replaceRowItem` | `replaceEstimateRowItemWithLibrary` → `replace_estimate_row_item_with_history` | Optimistic replace + reconcile | NONE client-side; server lacks `assertCanEditEstimate` (`actions.ts:2587`) | works | `cells.tsx:126-143`, `row-table.tsx:223-231`, `EstimateSheetContent.tsx:1982-2009`, `actions.ts:2587-2620` | Preserves prior qty/contingency/misc (`row-table.tsx:225-230`) |
| Component | Move between rows (drag grip → another row's cell) | drag (component grip → another row's cell) | `handleComponentDragStart` + target `handleReplacementDrop` → `onMoveComponent` → `moveRowComponent` | `replaceEstimateRowItemWithLibrary` (target) **+** `replaceRowItem(blank)` (source) — **two RPCs** | Optimistic (replace target + clear source = two mutations) | NONE client-side | partial | `cells.tsx:145-149`, `cells.tsx:126-134`, `EstimateSheetContent.tsx:2040-2044` | **Non-atomic**: `replace(target)+clear(source)`; partial failure leaves both rows mutated. Not a true "move row" |
| Component | Clear (back to blank slot) | EMC material-cell trash button + drag-out (drop nowhere) | `onClearComponent` → `clearRowComponent` → `replaceRowItem(blank)` | `replace_estimate_row_item_with_history` (blank payload) | Optimistic replace with blank template | NONE client-side | works | `cells.tsx:211-224` (trash), `cells.tsx:151-154` (`handleComponentDragEnd`), `EstimateSheetContent.tsx:2011-2013` | `handleComponentDragEnd` clears when the drop is not consumed (`dropEffect !== "move"`) — see narrative |
| Component | Mark project-specific (detach from library) | EMC material-cell cube button → confirm dialog | `onRequestProjectSpecific` → `requestProjectSpecific` → `confirmProjectSpecific` → `detachRow` | `detachEstimateRowItemFromLibrary` → `unlink_estimate_row_item_from_library_with_history` | Optimistic patch (`detachMutation` `onMutate` `setQueryData`) + reconcile | shown only when `canMakeProjectSpecific`; **server `assertCanEditEstimate` PRESENT** (`actions.ts:2631`) | works | `cells.tsx:195-210`, `EstimateSheetContent.tsx:2015-2038`, `cells.tsx:56-59`, `actions.ts:2622-2648` | One of the FEW row actions that calls `assertCanEditEstimate`. **No re-link affordance** after detaching |
| Component | Open component details | EMC material-cell dots button | `onOpenComponentDetails` → `onOpenRowDetails(tab="component")` | local-only | local-state-only (modal) | none | works | `cells.tsx:225-238`, `row-table.tsx:235` | none |
| Component | Drag component out (initiate move) | EMC material-cell grip (draggable) | `handleComponentDragStart` (`ESTIMATE_COMPONENT_DRAG_MIME_TYPE`) | local-only | n/a until dropped | none | works | `cells.tsx:239-252`, `cells.tsx:145-149` | The ONLY genuinely-draggable row affordance; the row-level grip is decorative |
| Component | Reorder components | none (one row holds one component) | none | — | not-persisted | n/a | missing | `cells.tsx:90-262` (a cell holds exactly one component) | A row holds exactly one component; there is no ordering concept |

### Entity: Selection / Bulk

| Entity | Operation | Affordance (where) | Handler | Server / Persistence | Optimistic / Refetch | Edit-gating | Status | Anchors | Gaps |
|---|---|---|---|---|---|---|---|---|---|
| Selection/Bulk | Select single row (checkbox) | EMC row checkbox | `onToggleRowSelection` → `toggleRowSelection` (`bulkSelectedRowIds` set) | local-only | local-state-only | none | works | `row-table.tsx:206-212`, `EstimateSheetContent.tsx:1206-1213` | Selections auto-pruned to on-screen rows via `visibleSheetRowIds` effect (`EstimateSheetContent.tsx:1191-1204`) |
| Selection/Bulk | Select-all rows (per table) | EMC thead checkbox (indeterminate-aware) | `onToggleRowsSelection` → `toggleRowsSelection` | local-only | local-state-only | none | works | `row-table.tsx:163-173`, `row-table.tsx:106-108`, `EstimateSheetContent.tsx:1214-1223` | Select-all is **per-node-table**, not sheet-wide |
| Selection/Bulk | Bulk delete rows | EMC bulk-action toolbar (appears when count>0) | `deleteSelectedRows` → loop `deleteRowItem` | `deleteEstimateRowItem` (×N) | Optimistic per-row (N mutations) | NONE client-side | partial | `EstimateSheetContent.tsx:2071-2074`, bulk toolbar `EstimateSheetContent.tsx:2369` | Iterates `deleteRowItem` per id (**N round-trips**), not a batched RPC; **no confirm dialog** |
| Selection/Bulk | Select nodes (cascade checkboxes) | left tree row checkboxes | `handleCheckboxToggle` → `toggleCascadeSelection` | local-only | local-state-only | blocked while tree saving (`isTreeMutationSaving`) | works | `EstimateSheetTree.tsx:1158-1161` | Lives in the LEFT tree, not the EMC |
| Selection/Bulk | Bulk delete nodes | left tree bulk-action toolbar + confirm modal | `handleConfirmBulkDeleteNodes` → `deleteEstimateNodesBulk` | `delete_estimate_node` bulk RPC (`deleteEstimateNodesBulk`) | Optimistic (sequential `planEstimateTreeDelete`) + reconcile | NONE client-side; server lacks `assertCanEditEstimate` | works | `EstimateSheetTree.tsx:1047-1145` (per memory) | One batched RPC (unlike row bulk delete which loops) |
| Selection/Bulk | Bulk-edit row values | none | none | — | not-persisted | n/a | missing | `EstimateSheetContent.tsx:2369` (bulk toolbar offers delete only) | No bulk-edit of qty/contingency/misc across selected rows |

### Entity: Tree / View

| Entity | Operation | Affordance (where) | Handler | Server / Persistence | Optimistic / Refetch | Edit-gating | Status | Anchors | Gaps |
|---|---|---|---|---|---|---|---|---|---|
| Tree/View | Insert template (whole / batch) into selected node | EMC selected-node insert + drag template into EMC node + left tree drop + sidebar | `insertTemplateIntoParent` / `insertTemplatesIntoParent` / `insertTemplateIntoSelectedGroup` | `insertEstimateTemplateIntoEstimate` / `insertEstimateTemplatesIntoEstimate` → `*_with_history` | Optimistic clone + reconcile (revision-guarded, `getEstimateTreeRevision()===nextRevision`) | **server `assertCanEditEstimate` present** (`actions.ts:2243,2284`) | partial | `EstimateSheetContent.tsx:1689-1791`, `branch.tsx:139-155`, `actions.ts:2243,2284` | Single-template + drag accept ANY node (P6, `:1692-1693`). **BUT the multi-template BATCH path still gates `kind!=="group"`** (`EstimateSheetContent.tsx:1740`) → multi-select insert into an area silently returns false. Inconsistent with single path |
| Tree/View | Insert template NODE (one subtree) into selected node | drag template node into EMC node + left tree drop | `insertTemplateNodeIntoParent(ById)` | `insertEstimateTemplateNodeIntoEstimate` → `*_with_history` | Optimistic clone + reconcile | server `assertCanEditEstimate` (`actions.ts:2352`) | works | `EstimateSheetContent.tsx:1848-1905`, `branch.tsx:140-143`, `actions.ts:2352` | **No kind gate** (uses `findEstimateNode`, `:1850-1851`), so works on any node |
| Tree/View | Insert project source (tab / node subtree) | drag project-source into EMC / left-tree node | `insertProjectSourceIntoParentById` | `insertProjectSourceIntoEstimate` → `insert_estimate_subtree_into_estimate_with_history` | **Non-optimistic** (server copies subtree, applies returned tree) | server `assertCanEditEstimate` (`actions.ts:1849`) | works | `EstimateSheetContent.tsx:1797-1842`, `actions.ts:1849` | Non-optimistic by design (`:1811-1820`); concurrent BULK source inserts can clobber (RS-6 in code comments) |
| Tree/View | Expand all / Collapse all | EMC header buttons (`TreePanelHeader`) | `expandAll` / `collapseAll` → `setCollapsedNodeIds` | local-only | local-state-only (per-scope) | none | partial | `EstimateSheetContent.tsx:1264-1266`, header wiring `EstimateSheetContent.tsx:2199-2200` | `collapseAll` uses `collectAllNodeIds([selectedNode])` (every node id); but per Req 3 a leaf-with-rows gets marked collapsed yet has **no caret to re-expand individually** |
| Tree/View | Sheet search (filter rows / nodes) | EMC header search input | `setSheetSearchQuery` → `filterEstimateSheetNode`; collapse paused | local-only | local-state-only (render-only filtered copy `displayedSheetNode`) | none | works | `EstimateSheetContent.tsx:1127-1128`, `EstimateSheetContent.tsx:1143-1151`, `EstimateSheetContent.tsx:1171-1177` | While active, `collapsedNodeIds` forced EMPTY (`:1173`); identity preserved when inactive (perf guard) |
| Tree/View | Faceted filter (supplier / category / has-value) | EMC header filter popover | `setSheetFacets` → `filterEstimateSheetNodeByFacets` | local-only | local-state-only | none | works | `EstimateSheetContent.tsx:1131-1133`, `EstimateSheetContent.tsx:1148`, `EstimateSheetContent.tsx:1152-1154` | Render-only; never mutates the tree. Options derive from the unfiltered node (`:1154`) |
| Tree/View | Within-area group / sort (category / supplier / cost) | EMC header Group menu | `setSheetGroupMode` → `reorderEstimateSheetNodeRows` | local-only | local-state-only (within-area reorder, no group-header rows) | none | partial | `EstimateSheetContent.tsx:1132-1134`, `EstimateSheetContent.tsx:1149` | Reorders rows within each area only; does **NOT** add group-header rows and **does not persist** |

### Entity: Other (EMC-only surfaces)

| Entity | Operation | Affordance (where) | Handler | Server / Persistence | Optimistic / Refetch | Edit-gating | Status | Anchors | Gaps |
|---|---|---|---|---|---|---|---|---|---|
| Other | "Own items" eyebrow label | EMC node header (auto) | render condition `hasOwnRows && hasChildren` | local-only | not-persisted (visual) | none | works | `branch.tsx:241-248`, charts leaf (distinct) `aggregate-project-charts.ts:296-309` | **Req 1**: user wants it removed for the both-case (the ONLY case it renders) → removes the EMC label entirely. DISTINCT from the charts "Own items" leaf (money-attribution) which must stay untouched (`aggregate-project-charts.ts:296-309`). See [03-UXUI-AUDIT](03-UXUI-AUDIT.md) |
| Other | Vertical spacing / rhythm | EMC layout (auto) | `groupGap(depth)` + `space-y-4` + `mt-1` + `leftIndent` + sticky stacking | local-only | not-persisted | none | partial | `node-visuals.tsx:12-19`, `branch.tsx:237`, `branch.tsx:89`, `branch.tsx:95-96` | **Req 2**: `groupGap`'s depth1/depth>1 branches are dead for nested nodes (recursion never passes `usesSiblingGroupRhythm`, `branch.tsx:285-309`), so every nested node collapses to `mt-0`. See [03-UXUI-AUDIT](03-UXUI-AUDIT.md) |

---

## Missing / Expected-but-Absent operations

These are operations a user could reasonably expect that have **no affordance at all** (or a non-functional one). Each is anchored to the place it would live.

1. **Duplicate node / area** — only tabs can be duplicated; nodes have only "Save as template". (`EstimateSheetTree.tsx:1201-1217`)
2. **Duplicate row item** — no affordance in the row action cluster. (`row-table.tsx:357-388`)
3. **Reorder rows within a node** — the `DotsSixVertical` grip at `row-table.tsx:201-204` is **decorative**: not draggable, no `onDragStart`, no server action. (status = broken, listed in the matrix; also missing as a *working* op)
4. **Move a row between nodes** — only the *component* moves (non-atomic replace+clear at `EstimateSheetContent.tsx:2040-2044`); the row item itself cannot move.
5. **Move a node across tabs** — explicitly blocked with a toast. (`EstimateTabStrip.tsx:323-335`)
6. **Explicit indent / outdent node controls or keyboard shortcuts** — reparenting is drag-only. (`EstimateSheetTree.tsx:1183-1242`)
7. **Multi-node drag** — `handleTreeCanDrag/Drop` pass a single-id array only (per memory 5420, "Multi-Drag Hardcoded to Fail").
8. **Re-link / re-attach a project-specific (detached) row** back to its library source — detach is one-way. (`cells.tsx:195-210`, `actions.ts:2622-2648`)
9. **Reorder components** — a row holds exactly one component; no ordering. (`cells.tsx:90-262`)
10. **Undo / redo for any EMC mutation** — none. All mutations are immediate; only optimistic rollback on error exists (`restoreEstimateState`).
11. **Bulk-edit row values** (qty / contingency / misc across selected rows) — bulk toolbar offers delete only. (`EstimateSheetContent.tsx:2369`)
12. **Rename a node from the EMC node header** — must use the left tree. (`branch.tsx:172-216` has no rename affordance)
13. **Confirm dialog for single-row delete and for tab delete** — node delete has one; rows/tabs do not. (`row-table.tsx:378-387`, `EstimateTabStrip.tsx:478-515`)
14. **Drag tabs to reorder** — tabs reorder by keyboard only. (`EstimateTabStrip.tsx:450-476`)
15. **Keyboard reorder of nodes** — tabs have Cmd/Ctrl+Shift+Arrow; nodes have none. (`EstimateSheetTree.tsx:575-650`)

### Considered & Not Present (N/A)

To make Req 4's "ALL" mandate demonstrably exhaustive rather than silently scoped, these are operations a user coming from a spreadsheet or document tool might reasonably expect but that **do not exist in the EMC model at all**. They are listed separately from "Missing / Expected-but-Absent" above because there is no row for them in the matrix — they are out of the entity model's scope today. Each notes where it would live if added.

- **Clipboard copy/paste of rows or cells** — no `copy`/`paste`/`navigator.clipboard` handling exists anywhere in the EMC (verified: no match in `EstimateSheetContent.tsx` or `rows/*.tsx`). There is no internal row/cell clipboard buffer either. If added it would live as keyboard handlers on the row table / cell inputs (`row-table.tsx`, `cells.tsx`) feeding the same `insertLibraryItem` / `updateRow` mutations the matrix already covers.
- **In-grid keyboard cell navigation (range/Tab traversal)** — *partial precedent exists*: `handleEstimateCellKeyDown` (`cells.tsx:33-50`, wired at `row-table.tsx:259,315,349`) already moves focus with Arrow Up/Down/Left/Right and blurs on Enter across the three editable cells per row. What is **N/A**: spreadsheet-style Tab/Shift+Tab wrap-around traversal of the whole grid and range/multi-cell selection — neither is modeled; Tab falls back to native DOM order. Extending it would build on `focusEstimateCell`/`handleEstimateCellKeyDown` in `cells.tsx`.
- **Column show/hide/resize** — the row table renders a fixed column set with no resize handles, no `colgroup` width model, and no per-column visibility toggle (verified: no `resize`/`colgroup`/`hideColumn` in `row-table.tsx`). If added it would live as a column-config layer over `row-table.tsx` (and the shared header in `node-visuals.tsx`).
- **Single-node / subtree export or print** — export is whole-scope only: `ProposalExportPreviewScope = "all-tabs" | "active-tab"` (`ProposalExportPreviewDialog.tsx:34`), driven from `EstimateSheetContent.tsx:995,1405-1419`. There is no "export this area" / "print this subtree" affordance. If added it would extend the export scope union and the `buildProposalPreview` scope filter (`EstimateSheetContent.tsx:1405-1419`), reusing the selected-node id the EMC already tracks for the sheet root.

---

## Per-entity narrative: the deep complexities

The flat matrix hides the nesting semantics. This section explains exactly how the entities relate and where the subtle bugs/semantics live.

### A row item contains a component (the move / replace / clear semantics)

A **Row item** is one line in a node's own-rows table. A **Component** is the *library material* bound to that row. They are NOT the same object: the row carries the editable values (`quantity`, `contingencyPercentage`, `contingencyMode`, `miscCost`) and the component carries the catalogue payload (`material`, `supplier`, `unit`, `itemCost`, image, link state). Every row holds exactly **one** component slot — which may be **blank** (`isBlankEstimateRowItem`, `cells.tsx:156`).

This separation is why the component operations are not row operations:

- **Replace** (`cells.tsx:126-143` → `replaceRowItem` at `EstimateSheetContent.tsx:1982-2009`): dropping a library item onto a populated cell calls `onReplace`, which **preserves the row's editable values** (`row-table.tsx:225-230` spreads `quantity/contingencyPercentage/contingencyValue/miscCost` from the existing item onto the incoming `libraryItem`). The row identity (`rowItemId`) is unchanged; only the component payload is swapped via `replace_estimate_row_item_with_history`.

- **Clear** (`cells.tsx:151-154` and `cells.tsx:211-224` → `clearRowComponent` at `EstimateSheetContent.tsx:2011-2013`): `clearRowComponent` is literally `replaceRowItem(rowItemId, createBlankEstimateRowTemplate())` — it keeps the row but blanks the component. There are **two ways to trigger it**: the explicit trash button (`cells.tsx:211-224`) and, dangerously, `handleComponentDragEnd` (`cells.tsx:151-154`) which clears the component **whenever a drag ends without a `dropEffect === "move"`**. So a cancelled or missed component-drag *silently deletes the component* — a destructive outcome with no confirm and no surfaced undo. (Flagged in the UX perspective as UX-7; cross-ref [07-BLAST-RADIUS-AND-RISK](07-BLAST-RADIUS-AND-RISK.md).)

- **Move** (`cells.tsx:145-149` start, `cells.tsx:126-134` drop → `moveRowComponent` at `EstimateSheetContent.tsx:2040-2044`): "moving" a component from row A to row B is implemented as **two non-atomic RPCs** — `replaceRowItem(targetRowItemId, movedItem)` then `clearRowComponent(sourceRowItemId)`. There is no transaction spanning both. A failure between them leaves one row mutated and the other not (target populated but source not cleared, or vice-versa). It is *not* a true "move the row" — the row ids do not change; the component payload is copied to the target and blanked at the source. (This is the only "move" in the EMC; moving a *row* between nodes does not exist.)

- **Detach / mark project-specific** (`cells.tsx:195-210` → `confirmProjectSpecific` at `EstimateSheetContent.tsx:2021-2038`): this severs the row's link to its library source (`linkState: "detached"`, `sourceLibraryItemId: null`) so future library edits no longer propagate. It is the **only** row/component action whose server action calls `assertCanEditEstimate` (`actions.ts:2631`). It is one-way — there is no re-link affordance.

### Node ≠ Row: where each CRUD verb lives, and why insertion is double-gated

Under the **P6 single-node model**, every node can hold *both* child sub-areas *and* its own rows (`types.ts` `EstimateTreeNode` carries `children` AND `estimateRowItems`; see [01-CONTEXT-AND-ARCHITECTURE](01-CONTEXT-AND-ARCHITECTURE.md)). The renderer (`branch.tsx`) is kind-agnostic, the DB validators were relaxed by migration `20260614003639`, and most insert paths were updated for P6 (`insertTemplateIntoParent` comment + check at `EstimateSheetContent.tsx:1692-1693`; the server row-insert action explicitly allows ANY node at `actions.ts:2500-2513`).

**But three client gates were left behind**, and they are the headline correctness defects of this audit:

| Gate | Line | Effect | Inconsistent with |
|---|---|---|---|
| Row insert: `if (targetNode?.kind !== "area") return;` | `EstimateSheetContent.tsx:1649` | Adding a blank row, inserting a library item, dropping a component, the sidebar add-event, AND the command palette all **silently no-op** on a `kind:"group"` node — no toast | `actions.ts:2500-2513` (server allows ANY node); single-template path (`:1692-1693`); template-node path (`:1850-1851`) |
| Batch template insert: `if (targetParentNode?.kind !== "group") return false;` | `EstimateSheetContent.tsx:1740` | Multi-select template insert into an `area` node silently returns false | the single-template path (`:1737` delegates to ungated `insertTemplateIntoParent`) and the drag path |

Because the add-row strip (`drop-zones.tsx`) and the template drop targets (`branch.tsx:316-322`) render on **every** node regardless of kind, the affordance is *present and clickable* on nodes where the insert is *silently dropped*. This is the row-write analogue of the Req 3 caret bug: the UI advertises a capability the handler refuses. There is a corresponding DB-layer risk — the committed `insert_estimate_row_item_with_history` migration still hard-codes `node.kind = 'area'`; `.ai/10_state/current-state.md` records hosted P6 relax work, but a fresh-environment apply would still reject the insert server-side until D2 lands committed parity SQL (see [06-DATABASE-AND-NETWORK-AUDIT](06-DATABASE-AND-NETWORK-AUDIT.md), finding DBNET-1).

### Edit-gating is inconsistent across the server actions

The `assertCanEditEstimate` grep over `actions.ts` returns exactly **7** call sites: `1496`, `1799` (project source), `1849` (project source insert), `2243` + `2284` (template inserts), `2352` (template node insert), `2631` (detach). It is therefore **PRESENT** on: duplicate-sheet, project-source insert, all three template inserts, and detach. It is **ABSENT** on: `insertEstimateRowItemFromLibrary` (`2494`), `updateEstimateRowItem` (`2562`), `replaceEstimateRowItemWithLibrary` (`2587`), `deleteEstimateRowItem` (`2650`), `createEstimateNode` (`1989`, verified — the function body ends at `2079` with no such call), `renameEstimateNode` (`2081`), and the node delete/reorder/bulk-delete actions. Those rely solely on the RPC's internal RLS. This is a **defense-in-depth gap**, not (necessarily) an exploit, but it is an inconsistency worth an explicit owner decision.

On the **client**, the left tree (`EstimateSheetTree`) receives **no `canEditEstimate` prop at all** — `EstimateWorkspaceClient.tsx:104-112` mounts it without one, while it passes `canEditEstimate={canEditEstimate}` to `EstimateSheetContent` (`EstimateWorkspaceClient.tsx:121`). So ALL node CRUD affordances (Add area / Rename / Delete / Move) are always visible and clickable regardless of edit capability; row CRUD in the EMC is likewise client-ungated. Only TAB CRUD and the New-tab button are client-gated (`EstimateSheetContent.tsx:2311-2312,2294`). Read-only is enforced server-side only.

### Tabs are the outermost container; nodes cannot cross them

Tab CRUD is a separate seam (`EstimateTabStrip.tsx`) with its own persistence pattern: every tab op returns the **canonical tab list** which the parent writes into the cache via `onTabsChange` (no optimistic tree edit). Cross-tab node movement is **explicitly rejected** (`handleTabDrop`, `EstimateTabStrip.tsx:323-335`, `dropEffect="none"` + error toast). Tab reorder is keyboard-only. The New-tab button is the one tab affordance that lives in the EMC header, triggering the strip imperatively (`EstimateSheetContent.tsx:2298` → `EstimateTabStrip.tsx:402`).

---

## Roll-up count

Counting each distinct operation row across all entity tables (Tab 7, Node 11, Row 9, Component 7, Selection/Bulk 6, Tree/View 7, Other 2 = **49 operations**):

| Status | Count | Operations |
|---|---|---|
| **works** | 29 | Tab create/rename/delete/duplicate/switch; Node create/rename/delete/move/reorder/save-as-template/select; Row edit/delete/open-details; Component replace/clear/detach/open-details/drag-out; Selection select-row/select-all/select-nodes/bulk-delete-nodes; Tree/View template-node insert/project-source insert/search/facet filter; Other own-items label |
| **partial** | 7 | Tab reorder; Component move; Selection bulk-delete-rows; Tree/View whole-template insert (batch gate)/expand-collapse-all/within-area group; Other spacing rhythm |
| **broken** | 6 | Node expand/collapse (caret bug, `branch.tsx:182`); Node add-blank-row (kind gate); Row insert-library-item (kind gate); Row insert-drag (kind gate); Row insert-keyboard/palette (kind gate); Row reorder grip (phantom, `row-table.tsx:201-204`) — the **4 kind-gated insert paths share one root cause** (`EstimateSheetContent.tsx:1649`), so the 6 broken rows reduce to **3 distinct defects** |
| **missing** | 7 | Tab drag-node-onto-tab (cross-tab move); Node indent-outdent/duplicate; Row duplicate/move-between-nodes; Component reorder; Selection bulk-edit. (These are the `missing`-status matrix rows; the broader 15-item "Missing / Expected-but-Absent" list above additionally enumerates absences such as re-link detached row, undo/redo, node multi-drag, EMC rename, keyboard node reorder, tab drag-reorder, and single-row/tab confirm dialogs — several of which overlap a `partial`/`broken` matrix row rather than adding a new operation, so that list is cross-referenced, not additive.) |

> Reconciliation: the four status counts re-sum to the total — works 29 + partial 7 + broken 6 + missing 7 = **49**, matching the per-entity tally (Tab 7 + Node 11 + Row 9 + Component 7 + Selection/Bulk 6 + Tree/View 7 + Other 2 = 49). All **6** broken rows are present in both the count cell and its enumeration. The separate 15-item "Missing / Expected-but-Absent" list above is broader than the 7 `missing`-status matrix rows because it also names absences that overlap a `partial`/`broken` matrix row (e.g. "reorder rows within a node" = the phantom grip), so the two are cross-referenced rather than additive.

**Headline:** of the 49 censused operations, the **6 broken** rows reduce to **3 distinct defects** dominated by **two root causes** — the **caret gate** (`branch.tsx:182`, Req 3) and the **insert kind-gate** (`EstimateSheetContent.tsx:1649` + the batch variant at `:1740`). Both are single-line client gates that contradict the already-relaxed P6 model in the renderer, the DB validators, and the server row-insert action. Fixing those two gates plus wiring/removing the phantom row-reorder grip would move all 6 broken operations toward working. The canonical fix order is **R3 -> R1 -> R2 -> R4** (see [08-IMPLEMENTATION-PLAN](08-IMPLEMENTATION-PLAN.md) Phases A-D); the kind-gate fixes land in R4.

---

## Open decisions surfaced by this matrix

(Folded into [09-OPEN-DECISIONS](09-OPEN-DECISIONS.md).)

1. **Is the `insertLibraryItem` kind-gate (`EstimateSheetContent.tsx:1649`) intentional or a P6 leftover?** It contradicts the server action (`actions.ts:2500-2513`). Do real estimates have `kind:"group"` nodes that should accept rows, or is there an upstream invariant that all row-holding nodes are `area`-kind? Lifting it also depends on landing the relaxed DB migration ([06-DATABASE-AND-NETWORK-AUDIT](06-DATABASE-AND-NETWORK-AUDIT.md) DBNET-1).
2. **Should the multi-template BATCH insert path (`EstimateSheetContent.tsx:1740` `kind!=="group"` gate) be relaxed** to match the single-template/drag paths under P6?
3. **Should `EstimateSheetTree` receive `canEditEstimate`** to disable node CRUD affordances for non-editors, or is server/RLS-only enforcement acceptable for beta?
4. **Should the row + node mutation server actions** (insert/update/replace/delete row; create/rename/delete/reorder node) call `assertCanEditEstimate` like the template/source/detach actions do, or is RPC-internal RLS sufficient (defense-in-depth)?
5. **Is the phantom row-reorder grip (`row-table.tsx:201-204`) meant to become functional** (needs a new reorder-row RPC) or be removed?
6. **Should the destructive clear-on-failed-drag (`cells.tsx:151-154`) be made non-destructive** (snap back / require explicit delete) rather than silently clearing the component?
