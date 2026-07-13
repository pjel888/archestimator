# 24 - Estimate Sheet Domain Model And Data Flow

## Purpose

This document is the comprehensive "understand everything" reference for the Project Estimate Sheet — the main MVP surface. It maps every moving part: the entity model, the rendering layer, the data layer, the component identity model, the CRUD surface, the drag-and-drop architecture, the collaboration model, and how a template is composed into rows. It is grounded in a full source audit.

This is a planning/reference document. It does not authorize code changes.

Source-anchor policy: paths and symbol names are the durable anchors in this document. Any numeric line locator that remains is an audit-time snapshot only and must be re-resolved against the worktree before implementation.

## Entity Model (D1)

The estimate sheet is built on these core D1 tables. Active schema authority is `migrations/`; files under `supabase/migrations/` are retained only as provider-exit archaeology and are not an implementation source.

| Entity | Table | Source migration | Role |
|---|---|---|---|
| Project | `projects` | core schema | Top-level owner of estimates |
| Estimate | `estimates` | core schema; `migrations/0029_estimate_actions_d1_support.sql` adds `notes`, `currency_code`, `metadata` | One estimate sheet (a priced document for a project) |
| Estimate Tab | `estimate_tabs` | `migrations/0015_publication_admin_sidecars.sql`; `migrations/0029_estimate_actions_d1_support.sql` adds `metadata`, `created_by` | A tab within an estimate (multi-tab support; default tab always exists) |
| Estimate Node (Area/Group) | `estimate_nodes` | `migrations/0015_publication_admin_sidecars.sql`; `migrations/0025_reusable_source_insert_support.sql` adds `metadata_json` | A branch in the tree. `kind` is `"group"` or `"area"`. P6 model: **any node may parent any node** (single-node model, no area/group gate). |
| Estimate Row Item | `estimate_row_items` | `migrations/0015_publication_admin_sidecars.sql`; `migrations/0021_estimate_row_projection_fields.sql` adds projection fields | A single priced line item under a node |
| Estimate Sheet Adjustment | `estimate_sheet_adjustments` | `migrations/0029_*:14` | Estimate-level adjustment mode (PK `estimate_id, mode`) |
| Estimate Sheet Event (history) | `estimate_sheet_events` | `migrations/0025_*:8` | Activity/version-control event log with `correlation_id` unique index |
| Cost Library Item | `cost_library_items` | component-library schema | A library master component (the "Library Level Component" source) |
| Cost Library Price Option (variant) | `cost_library_item_price_options` | `migrations/0026_component_promotion_support.sql` | A variant/price option of a library component |
| Component Category Node | `component_category_nodes` | `migrations/0026_component_promotion_support.sql:1` | Category taxonomy for components |
| Estimate Template | `estimate_templates` | `migrations/0024_estimate_templates.sql:1` | A reusable template tree |
| Estimate Template Node | `estimate_template_nodes` | `migrations/0024_*:18` (`kind group\|area`, self-parent CHECK) | A branch in a template |
| Estimate Template Row Item | `estimate_template_row_items` | `migrations/0024_*:37` | A line item in a template |

### Key typed columns on `estimate_row_items` (the load-bearing row projection)

From `migrations/0021_estimate_row_projection_fields.sql`:
- `supplier_id` — linked supplier
- `category_node_id` — linked category
- `source_library_item_id` — non-null ⇒ library-linked; null ⇒ project-level
- `link_state` — `CHECK link_state IN ('unlinked', 'linked-clean', 'linked-overridden', 'source-changed', 'detached')`
- `row_revision` — conflict guard (monotonic)
- `metadata_json` — JSON bucket for express/project-component projection metadata

Plus the base columns: `material`, `description`, `supplier`, `source`, `unit`, `item_cost`/`quantity`/`sub_total`/`contingency_*`/`adjustment_*`/`misc_cost`/`total_item_costs`, `image_url`, `category`, `sort_order`, `node_id`, `estimate_id`, `source_snapshot_json` (the JSON bucket carrying variant + identity data).

## Component Identity Model

There are **two component types**, distinguished by `sourceLibraryItemId` and resolved through the `linkState` lifecycle. See doc 22 for the full interoperability spec.

```
┌─────────────────────────────────────────────────────────────┐
│                    Estimate Row Item                         │
│                                                              │
│  sourceLibraryItemId ──► null  =  PROJECT LEVEL COMPONENT   │
│                       ──► set   =  LIBRARY LEVEL COMPONENT  │
│                                                              │
│  linkState lifecycle:                                        │
│    unlinked ──► linked-clean ──► linked-overridden           │
│                                     │                        │
│                                  detach                      │
│                                     ▼                        │
│                                 detached                     │
│                                                              │
│  Identity (project-level) resolved by getProjectComponentIdentity:
│    1. source_snapshot.sourceType (project) → sourceComponentId│
│    2. metadata.projectComponentProjection.componentId        │
│    3. metadata.expressComponent.componentId                  │
│    4. fallback row id                                       │
│                                                              │
│  Variant data lives in source_snapshot JSON:                 │
│    priceOptionId, priceOptionLabel, priceOptionUpdatedAt     │
│  Plus row-local priceOptions[] array for multi-variant UI    │
└─────────────────────────────────────────────────────────────┘
```

## Rendering Layer Architecture

```
Route (Server Component, Suspense)
  src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx
    └─ resolveEstimateTabRouteContext(projectId, nodeId, ESTIMATE_SHEET_TREE_LOAD_LIMITS)
       (note: readEstimateNodeRouteContextD1FastPath is a NULL STUB — GAP)
    └─ <EstimateSheetRouteSkeleton/> (Suspense fallback)
  │
  ▼
EstimateWorkspaceClient.tsx  [3-panel shell]
  ├─ useEstimateTabsQuery         (server tabs query)
  ├─ useEstimateEditCapabilityQuery (fail-closed edit gate)
  ├─ useEstimateActiveTab         (localStorage-backed tab store)
  └─ <EstimateSurfaceVariantProvider> ("glass" vs "paper")
       │
       ├─ <EstimateSheetTree>          [LEFT panel — area tree]
       │    src/components/workshop/EstimateSheetTree.tsx
       │    ├─ <Tree> (shared UI, virtualized, WORKSHOP_TREE_VIRTUALIZATION minRows:150)
       │    ├─ inline rename, context menu, drag reorder
       │    ├─ lazy subtree hydration
       │    └─ dispatches window events for cross-panel drops:
       │         REQUEST_ESTIMATE_ROW_ITEM_MOVE_EVENT
       │         ADD_LIBRARY_ITEM_EVENT
       │         INSERT_ESTIMATE_TEMPLATE_EVENT
       │         INSERT_PROJECT_SOURCE_EVENT
       │
       ├─ <EstimateSheetContent>       [MIDDLE panel — the sheet]
       │    src/components/workshop/EstimateSheetContent.tsx
       │    ├─ useReducer(estimateSheetContentReducer) — all sheet UI state
       │    │    State: editableRows, collapsedNodeIdsByScope, bulkSelectedRowIds,
       │    │          sheetSearchQuery, sheetFacets, sheetGroupMode, inspector,
       │    │          rowDetails, componentEditor, history state, ...
       │    ├─ activeTreeQuery (TanStack Query: tabTree or legacy areaTree)
       │    ├─ derived (all memoized):
       │    │    displayedSheetNode = search → facet → reorder
       │    │    estimateNodeTotals = computeNodeTotals(tree, editableRows)
       │    │    collectSheetFacetOptions, collectRowMoveNodeOptions, findNodePath, ...
       │    ├─ <EstimateSheetExpansionContext.Provider>
       │    ├─ <EstimateSheetVirtualBranchList>  [branch virtualizer]
       │    │    src/components/workshop/estimate-sheet/rows/virtual-branch-list.tsx
       │    │    ├─ flattenVisibleBranches (DFS, honors collapse + search)
       │    │    ├─ useVirtualizer (estimateSize 192px, overscan 5, minSections 80)
       │    │    └─ <EstimateSheetBranch renderChildBranches=false>  (one per visible branch)
       │    │         src/components/workshop/estimate-sheet/rows/branch.tsx
       │    │         ├─ memo(areEstimateSheetBranchPropsEqual) — the render-relief guard
       │    │         ├─ header (caret, name, total) + breadcrumb band
       │    │         ├─ <EstimateRowItemsTable>  (this node's rows)
       │    │         ├─ <ComponentDropTarget> / <TemplateDropZone> (DnD)
       │    │         └─ recursive children (only when NOT virtualized)
       │    │
       │    │         <EstimateRowItemsTable>  [row virtualizer]
       │    │          src/components/workshop/estimate-sheet/rows/row-table.tsx
       │    │          ├─ memo(areEstimateRowItemsTablePropsEqual) — per-item state check
       │    │          ├─ useVirtualizer (estimateSize 96px, overscan 6, minRows 75)
       │    │          ├─ DISABLED when express editor active (reason: variable height)
       │    │          ├─ scrollMargin compensation for nested scroll containers
       │    │          └─ <EstimateRowItemTableRow> (memo) → <EstimateMaterialCell>
       │    │               src/components/workshop/estimate-sheet/rows/cells.tsx
       │    │               ├─ read-only material card (library rows) OR express editor (project rows)
       │    │               ├─ inline fields: name/desc/brand/supplier/unit/unitCost
       │    │               ├─ image upload modal → /api/estimate-row-images
       │    │               └─ library-item drop = replace row's component
       │    │
       │    └─ overlays (all dynamic, ssr:false, state-gated):
       │         CommandPalette, AddComponentModal, ProposalExportPreviewDialog,
       │         ActivityHistoryModal, RowDetailsModal
       │
       └─ <EstimateRightSidebar>        [RIGHT panel — component library]
            (lazy; does not block first paint)
```

The tree is client-only dynamic; the center content uses its existing dynamic boundary with default SSR behavior, and the right sidebar is dynamically loaded from the content surface. The same active tree enters the left and center panes. Both panes subscribe to the active TanStack query and build their own projections, so pane-level work must be measured separately in `UNIT-001` and constrained through `UNIT-006`–`UNIT-008`. The memoized right sidebar still receives the full mutable tree; a tree identity change therefore wakes that boundary even when the component-library view itself did not change.

### The critical render-relief invariant

`displayedSheetNode` in `EstimateSheetContent` composes search → facet → reorder. **Each step returns the same node reference when inactive.** When nothing is filtered, `displayedSheetNode === selectedNode`, so the virtualized branch list and recursive branch tree receive referentially-stable props → the `EstimateSheetBranch` and `EstimateRowItemsTable` memo guards hold → a keystroke in one area does not re-render sibling areas. This invariant is load-bearing for performance.

## Data Layer Architecture

```
Server Actions ("use server")
  src/lib/estimates/actions.ts
    ├─ auth gate: assertCanEditEstimate / assertCanEditProject + rate limiting
    ├─ dataStore.call(<compatibility_action_name>, args)
    └─ reads: fetchEstimateTree, fetchEstimateTabs, fetchEstimateEditCapability,
              fetchEstimateTabTree, fetchEstimateSheetVersionControl, ...
       writes: create/update/delete for estimate, tab, node, row;
               insertEstimateTemplate*, move*, replace*, detach*, promote*
  │
  ▼
D1 Action Client ("server only")
  src/lib/estimates/d1-action-client.ts
    ├─ callEstimateAction (D1 compatibility-action dispatcher, name→handler map)
    ├─ EstimateActionD1Query (D1 compatibility query wrapper over raw SQL)
    ├─ patchRowItem → propagateProjectComponentRowPatch (SERVER fan-out)
    │    └─ one JSON-identity-filter SELECT, then one revisioned UPDATE statement
    │       per matching sibling, executed through a D1 batch
    └─ restoreDeletedEstimateNodes: implemented; restoreDeletedEstimateRows: still throws on D1 (GAP-07)
  │
  ▼
Workspace Repository (D1 reads)
  src/lib/repositories/workspace-repository.ts
    ├─ readEstimateNodes (filter estimate_id + tab + ids + parents; ORDER BY sort_order, id)
    ├─ readEstimateRows (filter estimate_id + node_id IS NOT NULL; ORDER BY sort_order, id)
    │    └─ when node ids are supplied, emits one placeholder per id in one IN clause;
    │       the 1,500-node load ceiling therefore needs bind-ceiling proof or chunking
    ├─ getEstimateTabTree → getEstimateTabTreeForResolvedEstimate (nodes then rows, LIMIT+1 guards)
    ├─ getEstimateNodeSubtree (BFS frontier expansion)
    ├─ getEstimateTreesForTabs (batched all-tab load)
    ├─ resolveEstimateTabRouteContext (calls null-stub fast path)
    └─ readEstimateNodeRouteContextD1FastPath: RETURNS NULL (GAP)
  │
  ▼
React Query Hooks (transport cache)
  src/hooks/use-estimate-query.ts
    Query keys:
      ["estimate", estimateId]                              (detail)
      ["estimate", estimateId, "tabs"]                      (tabs)
      ["estimate", estimateId, "edit-capability"]           (edit gate)
      ["estimate", estimateId, "tab", tabId, "area-tree"]   (tab tree)
      ["estimate", estimateId, "area-tree"]                 (legacy/whole)
      + sibling ["...", "revision"] keys bumped only through the query-hook tree helpers;
        direct mutation-layer setQueryData writes currently bypass that increment
    Config: initialData seeded, refetchOnMount:false, staleTime 5min
  │
  ▼
Row Mutations (optimistic + server)
  src/hooks/use-estimate-row-mutations.ts
    ├─ updateMutation.onMutate: cancelQueries → snapshot → patchProjectComponentInstanceRowsInTree (CLIENT fan-out)
    ├─ onSuccess: setQueryData(server patch) → invalidateQueries (active only if fan-out touched others)
    ├─ onError: restoreEstimateRowPatchesInTree (unless offline)
    └─ insert/replace/delete/move/detach/promote mutations
```

## How A Template Is Composed Into Rows

A **template** is a reusable, persisted tree (`estimate_templates` + `estimate_template_nodes` + `estimate_template_row_items`). It is composed into a live estimate through three insertion entry points, all in `src/components/workshop/estimate-sheet/use-estimate-template-insertion.ts`:

```
1. insertTemplateIntoParent
     └─ insertEstimateTemplateIntoEstimate (whole template)
          └─ D1 compatibility action insert_estimate_template_into_estimate_with_history

2. insertTemplatesIntoParent  [N>1 templates, single round-trip]
     └─ insertEstimateTemplatesIntoEstimate (SEQUENTIAL — INS-1: avoids concurrent-insert tree-read race)
          └─ D1 compatibility action insert_estimate_template_into_estimate_with_history (per template)

3. insertTemplateNodeIntoParent  [one node + its subtree]
     └─ insertEstimateTemplateNodeIntoEstimate
          └─ D1 compatibility action insert_estimate_template_node_into_estimate_with_history
```

**Optimistic flow** (all three): snapshot previousTree/previousRows + rollbackRevision → `cloneTemplateNodesForEstimate` (deep clone with new UUIDs, totals reset to "PHP 0.00") → `setEstimateTree(appendTemplateNodesToParent(...))` → fire server action → on success reconcile **only if** `getEstimateTreeRevision() === nextRevision` (stale-snapshot guard) → on error `restoreEstimateState`.

**Server-side** (`copyTemplateNodes` in `d1-action-client.ts`): reads template nodes + row items, optionally scoped to a subtree (`collectTemplateDescendantNodeIds`), maps old→new node ids, inserts `estimate_nodes` (resolving `estimate_tab_id` from parent) + `estimate_row_items`, writes a history event (`template_inserted` / `template_node_subtree_inserted`), returns `inserted_root_node_ids`.

**Template drops arrive** via the `INSERT_ESTIMATE_TEMPLATE_EVENT` window event, bridging the left-panel tree DnD to the middle sheet without direct component coupling.

The **optimistic model** lives at `src/components/workshop/estimate-sheet/template-insertion-model.ts`: `cloneLibraryItemForEstimate`, `cloneTemplateNodesForEstimate`, `appendTemplateNodesToParent`.

See doc 26 for the full template composition spec.

## Drag-And-Drop Architecture

DnD uses **native HTML5 drag** plus a **Zustand side-channel store** (`estimate-workshop-drag.ts`) because HTML5 drag payloads are unreadable until drop.

```
Drag MIME types (estimate-sheet/rows/constants.ts, drag-types.ts):
  application/x-archestimator-estimate-tree-item  — internal tree reorder
  ESTIMATE_ROW_ITEM_DRAG_MIME_TYPE                — row reorder between areas
  LIBRARY_ITEM_DRAG_MIME_TYPE                     — insert from component library
  ESTIMATE_COMPONENT_DRAG_MIME_TYPE               — move component between rows (replace)
  ESTIMATE_TEMPLATE_DRAG_MIME_TYPE                — insert template/subtree
  PROJECT_SOURCE_DRAG_MIME_TYPE                   — insert reusable project source

Side-channel: useEstimateWorkshopDragState (Zustand)
  Originators: beginEstimateWorkshopDrag({kind, ...}) on dragstart
  Consumers:   useEstimateWorkshopDrag() to conditionally render drop zones
  Clear:       document dragend/drop + window keydown(Escape) + blur

Cross-panel bridge (EstimateSheetTree → EstimateSheetContent):
  Left-tree external drops dispatch window events (no direct coupling):
    REQUEST_ESTIMATE_ROW_ITEM_MOVE_EVENT
    ADD_LIBRARY_ITEM_EVENT
    INSERT_ESTIMATE_TEMPLATE_EVENT
    INSERT_PROJECT_SOURCE_EVENT
  EstimateSheetContent listens (lines 2152-2181) and routes to the right handler.

Drop zones (estimate-sheet/rows/drop-zones.tsx):
  ComponentDropTarget — per-node library-item/row-item target; quiet "Add row" at rest
  TemplateDropZone    — per-node template target; rendered only during template drag
  EstimateDropZone    — the dashed visual surface

Edge auto-scroll (use-drag-edge-autoscroll.ts):
  useDragEdgeAutoScroll(anchorRef, enabled) — only ROOT branch enables it (branch.tsx:200)
  rAF loop, max 18px/frame, 72px edge zones, computeEdgeScrollSpeed (pure/testable)
```

See doc 27 for the full DnD + cross-panel architecture.

## Collaboration Model

- **Cursors**: `useEstimateCursorCollaboration` (mocked in tests via `useSyncExternalStore`). Cursor updates render overlays **without re-rendering the sheet or row tables** — tested in `estimate-sheet-cursor-isolation.test.tsx`.
- **Realtime broadcasts**: `estimate-row-update-broadcast` — accepts current payloads scoped to active estimate/tab, rejects stale/future/wrong-scope, applies only newer revisions.
- **Durable Objects**: `COLLAB_ROOMS` DO (class `CollaborationRoom`, SQLite-backed) is the collaboration substrate per `wrangler.jsonc`.

## Hot Path Cost Map (current)

These are the O(N) / recursive operations that scale with loaded tree size. The normalized graph target (doc 06) addresses them.

| Operation | Location | Cost | When it runs |
|---|---|---|---|
| `collectEditableRows` | `editable-row-model.ts:357` | O(N) full tree | init, tree sync, restore |
| `computeNodeTotals` | `editable-row-model.ts:383` | O(N) full tree | `editableRows` or tree changes (memoized, but re-runs per keystroke) |
| `flattenEstimateRows` | `editable-row-model.ts:442` | O(N) full tree | guarded: only when inspector/rowDetails/componentEditor/move-picker open |
| `filterEstimateSheetNode` (search) | `EstimateSheetContent.tsx:382` | O(N) recursive | search query change (returns same ref when empty) |
| `filterEstimateSheetNodeByFacets` | `EstimateSheetContent.tsx:484` | O(N) recursive | facet change (returns same ref when none) |
| `collectSheetFacetOptions` | `EstimateSheetContent.tsx:445` | O(N) subtree | memoized |
| `collectRowMoveNodeOptions` | `EstimateSheetContent.tsx` | O(N) full tree | memoized by tree identity, but currently derived even while the Move dialog is closed |
| `patchProjectComponentInstanceRowsInTree` | `estimate-row-tree-patch.ts:275` | O(N) tree-walk | every project-component row update (client fan-out) |
| `findEstimateRowItem` | `use-estimate-row-handlers.ts:202` | O(N) | many handlers |
| `collectEditableRows` in mutations | `use-estimate-row-handlers.ts` | O(N) | per-mutation snapshot |
| Left/center active-tree projections | `EstimateWorkspaceClient.tsx`, `EstimateSheetTree.tsx`, `EstimateSheetContent.tsx` | duplicated pane-level derivation | both panes observe the active query and build projections from the same tree |
| Component-library sidebar boundary | `EstimateSheetContent.tsx`, `EstimateRightSidebar` | full-tree identity dependency | the memoized sidebar wakes whenever the tree object changes |

**Main scaling concern**: a single keystroke re-runs `computeNodeTotals` (whole tree) and re-creates the totals map, even though memoization contains the downstream re-render. The parent re-render + total recompute is O(N) per keystroke.

## Known Limitations & Deferred Work

| Limitation | Evidence | Impact |
|---|---|---|
| Route fast path is a null stub | `workspace-repository.ts:3985` returns null | Route always misses intended D1 fast path |
| Row restore still throws on D1 while node restore is implemented | `d1-action-client.ts:1458, 2322-2325` | Current row Undo can only fail; mandatory `UNIT-002` repair implements D1 row restore and preserves node restore before browser collection; `UNIT-009` later stress-proves both under revision/concurrency paths |
| Group/sort doesn't add group-header rows | `EstimateSheetContent.tsx:677` comment | Category/supplier group modes flatten buckets; no visual group headers |
| No 1000+ row rendered stress test | tests max at 500 rows; 1500/5000 only as constants | Scale claims unproven |
| No browser proof for sheet interactions | no Playwright spec for the sheet route | All deep behaviors jsdom-only |
| Client fan-out is O(N) tree-walk | `patchProjectComponentInstanceRowsInTree` | Stress-scale risk (GAP-06) |
| Direct mutation cache writes bypass the query-hook tree revision increment | `use-estimate-row-mutations.ts` calls `queryClient.setQueryData`; revision increments live in `use-estimate-query.ts` helpers | Characterize in `UNIT-001`; preserve/reconcile revision ownership in `UNIT-006` and mutation/restore work in `UNIT-009` |
| The 1,500-node load path can emit one `node_id IN (...)` statement with one bind per node | `readEstimateRows` receives all limited node ids | Characterize the shape in `UNIT-001`, prove the D1 bind ceiling without product edits in `UNIT-003`, and let `UNIT-005` chunk or otherwise bound the query if activated |
| Move-target options derive while the dialog is closed | `collectRowMoveNodeOptions(estimateTree)` depends only on tree identity | Characterize in `UNIT-001`; gate or index the work in `UNIT-007` |
| Right-sidebar memo wakes on tree identity | `EstimateRightSidebar` receives the full tree | Measure in `UNIT-001`; narrow the dependency in `UNIT-007` if activated |
| Left and center panes each build active-tree projections | both panes observe the active query | Establish per-pane cost in `UNIT-001`; normalize and split selectors in `UNIT-006`–`UNIT-008` |
| Large workshop surfaces remain | `EstimateSheetContent`, `EstimateSheetTree`, cells, and row-table | Structural splitting remains evidence-driven; the concurrent tree plan owns the active tree extraction |

The server fan-out path is a separate scale boundary: it selects matching project-component rows through JSON identity expressions, materializes the matches, then constructs one revisioned update statement per sibling for `runBatch`. `UNIT-001` characterizes the current shape; `UNIT-003` measures match-count and batch cost; `UNIT-006`–`UNIT-009` must preserve fan-out, cache, and restore behavior while changing client structure.

## Verification

- Planning provenance: source-grounded audit; reviewer identity does not cap readiness.
- Paths and symbols were revalidated for this refresh; numeric line locators are non-authoritative snapshots and are not claimed current.
- This document should be re-validated when the rendering or data layer is refactored.
