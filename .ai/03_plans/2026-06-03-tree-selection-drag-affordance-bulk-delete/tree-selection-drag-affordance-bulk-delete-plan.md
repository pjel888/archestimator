# Tree Selection, Drag Affordance, and Bulk Delete Plan

**Plan date:** 2026-06-03
**Status:** Planning — implementation not started
**Author:** Sisyphus (AI Agent, through OhMyOpenCode)
**Supersedes:** `.ai/03_plans/2026-06-03-mass-deletion-projects-estimate-sheets-library-components.md` (server-side sections are incorporated; this plan adds the UX interaction layer that was missing)

---

## 1. Problem Statement

Archestimator currently supports right-click rename/delete and per-row drag-and-drop, but users cannot easily reorganize, rearrange, or mass-select items without discovering these capabilities by accident. Specifically:

1. **No visible drag handles**: Users must accidentally discover rows are draggable. React Aria's accessibility guide explicitly warns that "drag can conflict with selection" and recommends an explicit drag affordance.
2. **No checkbox multi-selection in trees**: Estimate tree and library folder tree have no bulk selection model. Single-row delete is wired but hidden behind right-click menus.
3. **No bulk action bars**: `ProjectEstimatesTable` tracks `selectedEstimateIds` but has no select-all header checkbox or bulk toolbar. The delete button shows "Delete action is not wired yet."
4. **No bulk server actions**: `deleteProject` is a redirecting form action (not suitable for bulk). No estimate sheet delete action exists. No library component delete/archive action exists.
5. **Inconsistent delete UX**: Single-node delete uses a modal with descendant impact summary; project delete uses redirect with no preview. These should be unified.

**Product goal**: A single, consistent tree/list interaction system where users can see what's draggable, check what to act on, and safely delete in bulk — across every Archestimator surface: estimate trees, library trees, estimate sheets tables, project cards, and component catalogs.

---

## 2. Existing Code Audit

### 2.1 WorkshopTreeRow — The Shared Visual Primitive

**File:** `src/components/workshop/workshop-tree.tsx` (233 lines)
**Tokens:** `src/components/workshop/tree-visual-style.ts` (12 lines)

**What exists:**
- `WorkshopTreeRow` accepts `as="button"` (default) or `as="div"`, renders with dynamic indentation (`workshopTreeIndentStyle(depth)`), and supports `selected`, `editing`, `intent` styling.
- `WorkshopTreeContextMenu` wraps rows with right-click context menus when `contextMenuGroups` are provided.
- Visual tokens: 20px indent step, `min-h-7` row height, 10px font size, 16px icon slot.

**What is MISSING (critical for this plan):**
1. **No checkbox slot/prop**: No `checkbox` ReactNode slot, no `showCheckbox` prop, no `checked`/`indeterminate` state. When `as="button"`, nesting interactive elements (checkbox) inside is invalid HTML.
2. **No drag handle slot**: No `dragHandle` slot or `dragHandleProps` to attach DnD listeners to a specific grip element.
3. **No `selectionMode` state**: No prop to distinguish single-select (navigation) from multi-select (checkbox toggle) modes.
4. **Indentation layout problem**: `paddingLeft` is applied to the outer row container. If a drag handle must stay at the far left (unindented), the indent must move to an inner content wrapper.

**Required extensions:**
```
WorkshopTreeRowProps additions:
- selectionSlot?: ReactNode           // rendered BEFORE indent (far left)
- dragHandleSlot?: ReactNode          // rendered BEFORE indent (far left)  
- leadingSlot?: ReactNode             // rendered AFTER indent (for checkbox)
- selectionMode?: boolean             // when true, checkboxes visible
- as: "div" | "button"                // must be "div" when checkboxes active
```

### 2.2 EstimateSheetTree — Primary Tree Component

**File:** `src/components/workshop/EstimateSheetTree.tsx` (~1400 lines)

**What exists:**
- `ControlledTreeEnvironment` with full DnD (single-item drag only), click-arrow-to-expand, drop-on-folder.
- Optimistic reorder persistence via `reorder_estimate_nodes_with_history` RPC.
- Right-click context menu (Rename, Delete) on `WorkshopTreeRow`.
- Single-node delete via `deleteEstimateNode` → `delete_estimate_node_with_history` RPC, with confirmation modal showing descendant impact.
- `planEstimateTreeDelete()` in `estimate-tree-edit.ts` calculates deleted node IDs + fallback selection.
- Root drop zones above and below tree for top-level reordering.
- Nest intent visual hint when dragging over folder middle.

**What is MISSING:**
1. No visible drag handles — rows are draggable via `react-complex-tree`'s item-level drag handlers, but no grip icon.
2. No checkbox selection — no `selectionMode`, no `bulkSelectedNodeIds`, no select-visible/clear-selection.
3. No bulk delete flow — only single-node delete is wired.
4. `canDrag` restricts to `items.length === 1` — multi-item drag is unsupported.

### 2.3 Library Folder Tree

**Files:**
- `src/components/workshop/component-library-manager/LibraryFolderTree.tsx`
- `src/components/workshop/component-library/tree/LibraryFolderRow.tsx`
- `src/components/workshop/component-library/tree/LibraryItemRow.tsx`

**What exists:**
- `ControlledTreeEnvironment` with folder-only drag/drop, optimistic reorder via `reorder_library_folders`.
- `LibraryFolderRow` renders `WorkshopTreeRow` with folder icon + caret; no explicit drag handle.
- `LibraryItemRow` passes `draggable={Boolean(onDragStart)}` and `onDragStart` to `WorkshopTreeRow`.
- Component rows are `canMove: false` in `LibraryFolderTree.tsx` — they cannot be reordered.

**What is MISSING:**
1. No visible drag handles on folder rows or component rows.
2. No checkbox selection for folders or components within the tree.
3. No selection mode state.
4. Component rows are non-draggable (intentional for now — adding drag later is Phase 3+).

### 2.4 Generic LibraryTree

**File:** `src/components/workshop/component-library/tree/LibraryTree.tsx`

Custom `WorkshopTree` wrapper that maps `LibraryTreeNode` items. Renders `LibraryItemRow` for items and `LibraryFolderRow` for folders. Extends `WorkshopTreeRow` indirectly and benefits from any `WorkshopTreeRow` extensions.

### 2.5 ProjectEstimatesTable

**File:** `src/components/workshop/ProjectEstimatesTable.tsx` (888 lines)

**What exists:**
- Row-level checkboxes with `selectedEstimateIds: Set<string>` state (line 621).
- `toggleEstimateSelection` callback (line 653).
- TanStack React Table with sortable, resizable columns.
- Row actions: checkbox, disabled Trash ("Delete action is not wired yet"), Duplicate, Open, History.

**What is MISSING:**
1. Header select-all checkbox — `header: ""` for `row_actions` column (line 666).
2. Bulk toolbar — `selectedEstimateIds` drives nothing visible.
3. Delete action wiring — Trash button is `disabled` with tooltip.
4. No `deleteEstimateSheet` server action exists.

### 2.6 Projects Page

**Files:**
- `src/components/workshop/projects-page-client.tsx`
- `src/components/workshop/LiveProjectCard.tsx`

**What exists:**
- View modes (list/small/medium/large), search filtering, access-kind filtering, favorite toggling.
- `LiveProjectCard` renders project image, metadata, favorites star, expand action.
- `deleteProject` server action (redirecting form action with RLS-only scoping).

**What is MISSING:**
1. No selection model — no `selectedProjectIds` state.
2. No card checkbox overlay.
3. No bulk toolbar.
4. `deleteProject` is unsuitable for bulk (redirecting, no workspace scoping, no preview).

### 2.7 ComponentLibraryManager

**File:** `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`

**What exists:**
- Folder tree (left), component catalogue cards (center), detail panel (right).
- Folder CRUD, lifecycle state changes (`changeCostLibraryComponentLifecycleState`).
- No component hard delete action exists.

**What is MISSING:**
1. No selection state on component catalogue cards.
2. No bulk toolbar for archive/delete.
3. No preview/confirmation modal for bulk archive.
4. No bulk archive/hard-delete server actions.

### 2.8 Server Actions Gap Analysis

| Entity | Single Delete | Bulk Delete | Workspace Scoping | Audit Trail |
|--------|:---:|:---:|:---:|:---:|
| Projects | ✅ (redirecting) | ❌ | RLS-only | ❌ |
| Estimate Sheets | ❌ | ❌ | N/A | N/A |
| Estimate Nodes | ✅ (RPC) | ❌ | ✅ | ✅ (history RPC) |
| Estimate Rows | ✅ (RPC) | ❌ | ✅ | ✅ (history RPC) |
| Library Items | ❌ (archive via lifecycle only) | ❌ | ✅ | ❌ |
| Library Folders | ✅ (action) | ❌ | ✅ | ❌ |

### 2.9 Database Schema — FK Cascade Inventory

**Source:** `supabase/migrations/20260518090000_archestimator_core_schema.sql`

| Parent | Child Table | FK Column | ON DELETE |
|--------|------------|-----------|:---------:|
| `workspaces` | `projects` | `workspace_id` | CASCADE |
| `projects` | `estimates` | `project_id` | CASCADE |
| `estimates` | `estimate_nodes` | `estimate_id` | CASCADE |
| `estimates` | `estimate_row_items` | `estimate_id` | CASCADE |
| `estimates` | `estimate_sheet_versions` | `estimate_id` | CASCADE |
| `estimates` | `estimate_sheet_events` | `estimate_id` | CASCADE |
| `projects` | `project_favorites` | `project_id` | NO CASCADE |
| `projects` | `project_members` | `project_id` | NO CASCADE |
| `projects` | `collaboration_invitations` | `project_id` | NO CASCADE |
| `projects` | `project_publications` | `project_id` | NO CASCADE |
| `projects` | `beta_feedback_submissions` | `project_id` | NO CASCADE |
| `estimates` | `estimate_favorites` | `estimate_id` | NO CASCADE |
| `estimates` | `estimate_sheet_members` | `estimate_id` | NO CASCADE |
| `estimates` | `estimate_sheet_access_settings` | `estimate_id` | NO CASCADE |

**Implication**: Deleting `projects` or `estimates` requires explicit cleanup of non-cascading dependent rows (favorites, members, invitations, publications, collaboration data) BEFORE the parent row delete, or RPCs that handle them transactionally.

---

## 3. UX Specification

### 3.1 Tree Row Layout

```
[drag handle] [checkbox] [disclosure arrow] [entity icon] [label/meta] [inline actions]
```

**Positioning rules:**
- Drag handle: Far left of row, **unindented** (requires restructuring `WorkshopTreeRow` indent — currently `paddingLeft` on outer container pushes everything right).
- Checkbox: After indent, before disclosure arrow.
- Disclosure arrow: Same as current (4px indent relative to content).
- Entity icon + label: Same as current.
- Inline actions: Same as current (right-aligned).

### 3.2 Interaction Rules

| Action | Click Target | Result | Propagation |
|--------|-------------|--------|-------------|
| Row click | Row body (not checkbox/handle) | Navigate to node / select / open | Normal |
| Checkbox click | Checkbox input | Toggle bulk selection | **Stop propagation** — must NOT navigate, expand, or start drag |
| Drag handle | Grip icon (DotsSixVertical) | Start drag/reorder | Must NOT trigger row click |
| Arrow click | Disclosure caret | Expand/collapse | Normal |
| Right-click | Row | Context menu (Rename, Delete) | Existing behavior |

### 3.3 Visual States

| State | Drag Handle | Checkbox | Row Styling |
|-------|:-----------:|:--------:|-------------|
| Default (hover) | Visible on hover/focus | Hidden | Existing hover |
| Selection mode active | Visible | Always visible | Subtle mode indicator |
| Row selected (bulk) | Visible | Checked | `bg-accentSoft` |
| Parent partially selected | Visible | Indeterminate | Normal + indeterminate checkbox |
| Row non-draggable | Hidden or disabled+tooltip | As configured | Normal |
| Row non-deletable | As configured | Disabled or hidden | Normal |

### 3.4 Selection Behavior by Surface

**Estimate Tree:**
- Checkbox selects estimate nodes for bulk operations.
- Parent checkbox cascade: checking a group node selects all descendants (applied at confirmation time, not eagerly).
- Indeterminate parent: shown when some but not all descendants are checked.
- Right-click rename/delete preserved.
- Existing drag/drop reorder preserved.

**Library Folder Tree:**
- Checkbox selects library folders (not components) where folder deletion/reorganization is legal.
- `ALL_COMPONENTS_FOLDER_ID` (synthetic root) is never selectable or deletable.
- Component rows in the folder tree do NOT get checkboxes in Phase 3 (handled in Phase 6 on catalogue cards).

**Project Estimates Table:**
- Header select-all checkbox with indeterminate state.
- Select-all selects all visible (currently rendered) rows.
- "Clear selection" button.
- Bulk toolbar appears when `selectedEstimateIds.size > 0`.

**Projects Page:**
- Card checkbox overlay (top-left corner), visible on hover or when selection mode is active.
- Bulk toolbar appears when any projects are selected.
- Shared/pending-invite cards: checkbox disabled with tooltip ("Cannot delete shared projects").

**Component Library:**
- Component catalogue cards get checkbox selection.
- Bulk archive (primary) or hard delete (admin-only) options.

### 3.5 Bulk Toolbar Specification

```html
<div class="bulk-toolbar" aria-label="Bulk actions">
  <span class="count">3 estimate sheets selected</span>
  <button type="button">Clear selection</button>
  <button type="button" class="danger">Delete selected</button>
  <span class="disabled-reason" hidden>(Mixed selection includes protected items)</span>
</div>
```

**Behavior:**
- Appears when `selectedCount > 0`.
- Shows count and entity type.
- Shows disabled reasons when mixed selection includes protected/non-editable items.
- Position: sticky/fixed above the table/tree content.

### 3.6 Confirmation Dialogs

| Entity | Confirmation Type | Content |
|--------|:-----------------:|---------|
| Projects | Strong (typed) | "DELETE PROJECTS" — count, name preview, estimate sheet count, image/storage cleanup note. |
| Estimate Sheets | Strong (typed) | "DELETE ESTIMATE SHEETS" — sheet codes/names, estimate tree/row count. |
| Estimate Tree Nodes | Standard | Descendant group/area/row count, fallback selected node note. |
| Library Components | Standard | "ARCHIVE COMPONENTS" — count, lifecycle state change note. "DELETE COMPONENTS" — gated behind admin check, zero-reference proof. |

**Typed confirmation rule**: For top-level destructive objects (projects, estimate sheets), user must type the action phrase ("DELETE PROJECTS") before the confirm button enables.

---

## 4. Technical Architecture

### 4.1 Shared UI Primitives

**New file:** `src/components/workshop/tree-row-affordances.tsx`

```typescript
// Components:
TreeDragHandle         // DotsSixVertical grip icon, 16px, hover/focus visible
TreeSelectionCheckbox  // Checkbox input with indeterminate support, stop propagation wrapper
TreeBulkActionBar      // Sticky toolbar: count + clear + delete/archive
TreeSelectionCountLabel // "X selected" with entity type

// Utilities:
getVisibleTreeItemIds(treeItems, filterFn?)
getDescendantIds(node, allNodes)
toggleTreeSelection(selectedIds, id, selectableIds?)
getTriStateForNode(nodeId, selectedIds, childrenMap)
filterSelectableIds(ids, canSelectFn)
```

### 4.2 WorkshopTreeRow Extension

```typescript
// Extension WITHOUT breaking existing API
interface WorkshopTreeRowProps {
  // EXISTING (unchanged):
  as?: "button" | "div";
  depth?: number;
  selected?: boolean;
  editing?: boolean;
  intent?: boolean;
  className?: string;
  contextMenuGroups?: ActionMenuGroup[];
  contextMenuContentProps?: ...;
  children: ReactNode;
  style?: CSSProperties;

  // NEW:
  /** Rendered at far left, before indent. For drag handle. */
  dragHandleSlot?: ReactNode;
  /** Rendered at far left, before indent. For selection affordance (rare — usually use leadingSlot). */
  selectionSlot?: ReactNode;
  /** Rendered after indent, before children. For checkbox. */
  leadingSlot?: ReactNode;
  /** When true, row renders as div and applies selection mode styling. */
  selectionMode?: boolean;
}
```

**Layout restructuring:**
```
Current:  <button style={paddingLeft: depth * 20}> {children} </button>
New:      <div class="flex items-center">
            <span class="unindented">{dragHandleSlot}{selectionSlot}</span>
            <div style={paddingLeft: depth * 20} class="flex-1 flex items-center">
              {leadingSlot}
              {children}
            </div>
          </div>
```

**When `as="div"` IS REQUIRED**: Whenever `leadingSlot`, `selectionSlot`, or `dragHandleSlot` is provided, the row MUST render as `div` to avoid invalid HTML (button nesting interactive elements). The `as` prop is ignored when slots are present.

### 4.3 React Complex Tree Integration

1. **Drag handle strategy**: Keep `react-complex-tree`'s row-level drag handlers on the row wrapper, but add the visible grip icon as the visual affordance. The grip icon itself does nothing programmatically — it's a visual indicator that the row is draggable. This avoids fighting RCT's drag model.

2. **Bulk selection state**: Maintain `bulkSelectedNodeIds: Set<string>` OUTSIDE `react-complex-tree`'s `selectedItems` state. RCT's selected items control tree navigation/focus; bulk selection checkboxes are independent. This avoids conflicts with route selection.

3. **Prevent drag on checkbox/handle**: Ensure `pointer-events` and event propagation on checkbox and drag handle areas do not trigger RCT's drag handlers.

### 4.4 Server Action Architecture

#### Projects Bulk Delete
```typescript
// src/lib/projects/actions.ts

export async function deleteProjectsBulk(projectIds: string[]): Promise<{
  deleted: string[];
  failed: Array<{ id: string; reason: string }>;
  storagePaths: string[];
}> {
  // 1. ensureDefaultWorkspace() — explicit workspace scoping
  // 2. requireCurrentUserContext() — actor identity
  // 3. Validate all IDs belong to current workspace
  // 4. Validate user has permission (workspace admin or project owner)
  // 5. Collect project metadata for image path extraction
  // 6. Call RPC: delete_projects_bulk(project_ids, actor_id)
  //    - Deletes project_members, project_favorites, collaboration_invitations first
  //    - Deletes publications (cascades to recipients, comments, responses)
  //    - Null-references: beta_feedback, ai_data_access, collaboration_audit
  //    - Deletes projects (cascades to estimates → nodes → rows via FK)
  // 7. Best-effort storage cleanup for collected image paths
  // 8. Revalidate /workshop/projects
  // 9. Return result object (NOT redirect)
}
```

#### Estimate Sheets Bulk Delete
```typescript
// src/lib/estimates/actions.ts

export async function deleteEstimateSheetsBulk({
  projectId,
  estimateIds,
}: {
  projectId: string;
  estimateIds: string[];
}): Promise<{
  deleted: string[];
  failed: Array<{ id: string; reason: string }>;
}> {
  // 1. getCurrentWorkspaceProject(projectId) — explicit scoping
  // 2. Validate each estimate_id belongs to project_id
  // 3. Call RPC: delete_estimate_sheets_bulk(estimate_ids, actor_id)
  //    - Deletes estimate_favorites, estimate_sheet_members, access_settings first
  //    - Deletes collaboration_invitations with estimate references
  //    - Null-references collaboration_audit_events
  //    - Deletes estimates (cascades to nodes/rows/versions/events via FK)
  // 4. Revalidate project estimate paths
  // 5. Return result
}

export async function deleteEstimateSheet({
  projectId,
  estimateId,
}: {
  projectId: string;
  estimateId: string;
}): Promise<void> {
  // Single-sheet convenience wrapper
  return deleteEstimateSheetsBulk({ projectId, estimateIds: [estimateId] });
}
```

#### Estimate Tree Nodes Bulk Delete
```typescript
// src/lib/estimates/actions.ts

export async function deleteEstimateNodesBulk({
  projectId,
  estimateId,
  nodeIds,
}: {
  projectId: string;
  estimateId: string;
  nodeIds: string[];
}): Promise<{
  tree: EstimateTreeNode[];
  deletedNodeIds: string[];
  fallbackNodeId: string | null;
}> {
  // 1. Validate project/estimate scope
  // 2. For each nodeId, call planEstimateTreeDelete — collect all descendant IDs
  // 3. Deduplicate and flatten deleted set
  // 4. Call RPC: delete_estimate_nodes_bulk(estimate_id, node_ids, actor_id)
  //    - Delete nodes + descendants + rows in one transaction
  //    - Log history events
  // 5. Compute fallback selection
  // 6. Return refreshed tree
}
```

#### Library Components Bulk Archive/Delete
```typescript
// src/lib/component-library/actions.ts

export async function archiveCostLibraryComponentsBulk({
  itemIds,
  changeReason,
}: {
  itemIds: string[];
  changeReason: string;
}): Promise<{
  archived: string[];
  failed: Array<{ id: string; reason: string }>;
}> {
  // 1. ensureDefaultWorkspace()
  // 2. Validate all itemIds belong to workspace
  // 3. Call RPC: archive_cost_library_components_bulk(item_ids, workspace_id, actor_id, reason)
  //    - Sets lifecycle_state = 'archived' for all matching items
  //    - Skips items already archived
  //    - Returns list of affected item IDs
  // 4. Revalidate /workshop/library, /workshop/components
}

export async function deleteCostLibraryComponentsBulk({
  itemIds,
}: {
  itemIds: string[];
}): Promise<{
  deleted: string[];
  failed: Array<{ id: string; reason: string }>;
}> {
  // ADMIN-ONLY (or gated behind zero-reference check)
  // 1. ensureDefaultWorkspace() + requireCurrentUserContext()
  // 2. Check is_workspace_admin()
  // 3. Verify zero estimate row references (via RPC)
  // 4. Call RPC: delete_cost_library_components_bulk(item_ids, workspace_id)
  //    - Deletes variant_cost_entries, variant_attachments, component_variants
  //    - Best-effort storage cleanup
  //    - Deletes cost_library_items
  // 5. Revalidate library routes
}
```

---

## 5. Implementation Phases

### Phase 1 — Shared UX Contract (WorkshopTreeRow Extension)

**Dependencies:** None
**Files:**
- `src/components/workshop/workshop-tree.tsx`
- `src/components/workshop/tree-visual-style.ts`
- `src/components/workshop/tree-row-affordances.tsx` (new)

**Changes:**
1. Add `dragHandleSlot`, `selectionSlot`, `leadingSlot`, `selectionMode` props to `WorkshopTreeRow`.
2. Restructure row layout: outer flex container with unindented left zone + indented content zone.
3. When slots are present, force `as="div"` (document this constraint).
4. Create `TreeDragHandle` component (DotsSixVertical icon, hover/focus visible, 16px).
5. Create `TreeSelectionCheckbox` component (input[type=checkbox], indeterminate via ref, stop propagation wrapper).
6. Preserve existing `selected`, `editing`, `intent` styling.
7. Preserve existing context menu wrapping.
8. Preserve compact styling (rounded-xs, 10px text).

**Tests:**
- `tests/vitest/workshop-tree-row-affordances.test.tsx` — Render with dragHandleSlot, leadingSlot; verify layout; verify event propagation stops on checkbox; verify hover visibility; verify disabled states; verify existing props still work; verify context menu still wraps correctly.

### Phase 2 — Estimate Tree: Drag Handles + Checkbox Selection + Bulk Delete

**Dependencies:** Phase 1
**Files:**
- `src/components/workshop/EstimateSheetTree.tsx`
- `src/components/workshop/tree-row-affordances.tsx`
- `src/lib/estimates/actions.ts`
- `src/lib/estimates/estimate-tree-edit.ts`

**Changes:**
1. Add drag handle to every draggable node row using `TreeDragHandle`.
2. Add checkbox selection mode: `bulkSelectedNodeIds: Set<string>` state outside RCT.
3. Add `TreeSelectionCheckbox` to each node row, wired to `toggleBulkSelection`.
4. Add "Select visible" / "Clear selection" controls above tree.
5. Add `BulkTreeToolbar` component (count + clear + delete selected button).
6. Implement descendant cascade: checking a group node auto-selects all descendants.
7. Implement indeterminate parent state for partial child selection.
8. Add bulk delete confirmation modal showing descendant impact counts.
9. Implement `deleteEstimateNodesBulk` server action.
10. Handle route selection fallback after bulk delete.
11. Preserve right-click rename/delete.
12. Preserve existing drag/drop reorder and nest intent.

**Tests:**
- `tests/vitest/estimate-tree-bulk-selection.test.tsx` — Checkbox select/deselect, cascade descendants, indeterminate parent, select visible, clear selection, bulk delete confirmation modal, server action validation, route fallback after delete.

### Phase 3 — Library Folder/Component Trees: Drag Handles + Checkbox Selection

**Dependencies:** Phase 1
**Files:**
- `src/components/workshop/component-library-manager/LibraryFolderTree.tsx`
- `src/components/workshop/component-library/tree/LibraryFolderRow.tsx`
- `src/components/workshop/component-library/tree/LibraryItemRow.tsx`

**Changes:**
1. Add `TreeDragHandle` to folder rows (DotsSixVertical icon).
2. Add checkbox selection for folders where deletion is legal.
3. Ensure `ALL_COMPONENTS_FOLDER_ID` (synthetic root) is not selectable/draggable/deletable.
4. Component rows: add `TreeDragHandle` where `onDragStart` is available.
5. Keep `canMove: false` for components (as currently intended — component reordering via folder tree stays disabled).
6. Add bulk folder delete confirmation.

**Tests:**
- `tests/vitest/library-folder-tree-selection.test.tsx` — Drag handle visibility, folder checkbox selection, synthetic root protection, bulk folder delete.

### Phase 4 — Estimate Sheets Table: Select-All + Bulk Delete

**Dependencies:** None (uses existing `selectedEstimateIds` state)
**Files:**
- `src/components/workshop/ProjectEstimatesTable.tsx`
- `src/components/workshop/ProjectEstimatesClient.tsx`
- `src/lib/estimates/actions.ts`

**Changes:**
1. Add header select-all checkbox with indeterminate state to `row_actions` column header.
2. Add bulk toolbar above table when `selectedEstimateIds.size > 0`.
3. Wire the disabled Trash button to single-row delete.
4. Implement `deleteEstimateSheet` and `deleteEstimateSheetsBulk` server actions.
5. Add confirmation modal (typed "DELETE ESTIMATE SHEETS").
6. Add "Clear selection" button to toolbar.
7. Post-deletion: route refresh, query invalidation, clear selection.
8. Keep duplicate/open/history controls intact.

**Tests:**
- `tests/vitest/project-estimates-table-bulk-delete.test.tsx` — Select-all header, indeterminate, bulk toolbar visibility, confirmation modal, single-row delete, bulk delete, post-delete refresh, selection clear.

### Phase 5 — Projects Page: Card Selection + Bulk Delete

**Dependencies:** None
**Files:**
- `src/components/workshop/projects-page-client.tsx`
- `src/components/workshop/LiveProjectCard.tsx`
- `src/lib/projects/actions.ts`

**Changes:**
1. Add `selectedProjectIds: Set<string>` state in `ProjectsPageClient`.
2. Add checkbox overlay to `LiveProjectCard` (top-left corner, visible on hover / when `selectionMode` active).
3. Add bulk toolbar with "Clear selection" and "Delete projects" (danger).
4. Filter selection availability: shared/pending-invite cards get disabled checkbox with tooltip.
5. Implement `deleteProjectsBulk` server action with workspace scoping + permission checks.
6. Add typed confirmation modal ("DELETE PROJECTS").
7. Post-deletion: clear selection, invalidate query cache.

**Tests:**
- `tests/vitest/projects-page-bulk-delete.test.tsx` — Checkbox overlay, selection state, bulk toolbar, confirmation modal, server action validation, disabled states for shared projects, post-delete refresh.

### Phase 6 — Component Library: Bulk Archive/Delete

**Dependencies:** None (can proceed in parallel with Phases 2-5)
**Files:**
- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`
- `src/lib/component-library/actions.ts`

**Changes:**
1. Add checkbox selection to component catalogue cards.
2. Add bulk toolbar with "Archive selected" (primary) and "Delete selected" (admin-only, gated).
3. Implement `archiveCostLibraryComponentsBulk` server action.
4. Implement `deleteCostLibraryComponentsBulk` server action (admin-only + zero-reference check).
5. Add archive confirmation modal (standard — no typed confirmation needed).
6. Add hard delete confirmation modal (typed "DELETE COMPONENTS", admin-gated).
7. Archive preserves estimate row references (components become read-only "archived item" in estimates).
8. Hard delete requires zero active references (proven by RPC before allowing).

**Tests:**
- `tests/vitest/component-library-bulk-archive.test.tsx` — Card selection, archive toolbar, archive confirmation, server action, post-archive state.

### Phase 7 — Polish and Governance

**Dependencies:** Phases 1-6
**Files:** Various

**Changes:**
1. Empty states after deletion ("No estimate sheets yet. Create one to get started.").
2. Status toast messages for success/failure.
3. Error rollback on failed deletions.
4. Loading/disabled states on bulk toolbar buttons during server action execution.
5. Focus return after modal close/delete.
6. Update `.ai/10_state/current-state.md` with new feature status.

---

## 6. Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| AC1 | Users can see which rows can be dragged via visible DotsSixVertical grip icon on hover/focus | Visual inspection of EstimateSheetTree, LibraryFolderTree, LibraryItemRow |
| AC2 | Users can select multiple estimate tree nodes with checkboxes | Click checkboxes on 3+ nodes; verify all checked; verify indeterminate parent |
| AC3 | Users can select multiple estimate sheets and delete them | Select 3 estimate sheets → bulk toolbar appears → delete → confirmation → refresh → sheets gone |
| AC4 | Users can select multiple projects and delete them when permitted | Select 2 owned projects → bulk toolbar → delete → typed confirmation → projects gone |
| AC5 | Users can select multiple library components and archive them | Select 3 components → archive toolbar → archive → confirmation → components archived |
| AC6 | Existing right-click rename/delete still works | Right-click on estimate tree node → Rename → rename works; Delete → confirmation → node deleted |
| AC7 | Existing drag/drop reorder behavior still works | Drag estimate tree node to new position → reorder persists on refresh |
| AC8 | Checkbox click never opens/navigates/expands/starts drag | Click checkbox on any row → verify no navigation, no expand, no drag |
| AC9 | Drag handle interaction never toggles checkbox | Click grip icon → start drag → verify checkbox state unchanged |
| AC10 | Bulk toolbar appears only when there is a selection | Verify toolbar hidden at 0 selected; visible at 1+ selected; hidden after clear |
| AC11 | Confirmation dialog accurately reports selected count and affected descendants | Delete group node with 5 descendants → confirmation shows "1 group, 3 areas, 12 rows" |
| AC12 | Bulk server actions validate ownership/permissions | Attempt to delete project in another workspace → server rejects with error |
| AC13 | Tests cover UI behavior, server action validation, and rollback/error handling | All test files pass in `bun run test:dom` |

---

## 7. Test Plan

### 7.1 Commands

```bash
bun run type-check
bun run lint
bun run lint:design-system
bun run validate
bunx vitest run tests/vitest/workshop-tree-row-affordances.test.tsx --maxWorkers=1
bunx vitest run tests/vitest/estimate-tree-bulk-selection.test.tsx --maxWorkers=1
bunx vitest run tests/vitest/library-folder-tree-selection.test.tsx --maxWorkers=1
bunx vitest run tests/vitest/project-estimates-table-bulk-delete.test.tsx --maxWorkers=1
bunx vitest run tests/vitest/projects-page-bulk-delete.test.tsx --maxWorkers=1
bunx vitest run tests/vitest/component-library-bulk-archive.test.tsx --maxWorkers=1
```

### 7.2 New Test Files

| Test File | Covers |
|-----------|--------|
| `tests/vitest/workshop-tree-row-affordances.test.tsx` | Phase 1 — drag handle + checkbox rendering, event propagation, layout, existing prop backward compatibility |
| `tests/vitest/estimate-tree-bulk-selection.test.tsx` | Phase 2 — checkbox select/deselect, cascade, indeterminate, select visible, clear, bulk delete modal, server action, route fallback |
| `tests/vitest/library-folder-tree-selection.test.tsx` | Phase 3 — folder drag handle visibility, folder checkbox, synthetic root protection, bulk folder delete |
| `tests/vitest/project-estimates-table-bulk-delete.test.tsx` | Phase 4 — header select-all, indeterminate, bulk toolbar, single-row delete, bulk delete, post-delete state |
| `tests/vitest/projects-page-bulk-delete.test.tsx` | Phase 5 — card checkbox, selection state, bulk toolbar, typed confirmation, server action validation, disabled states |
| `tests/vitest/component-library-bulk-archive.test.tsx` | Phase 6 — card selection, archive toolbar, archive confirmation, server action, post-archive state |
| `tests/vitest/bulk-delete-server-actions.test.ts` | Phases 2-6 — ownership/permission validation, workspace scoping, FK cascade verification, storage cleanup, error rollback |

### 7.3 Existing Tests That Must Still Pass

```bash
bunx vitest run tests/vitest/workspace-repository-estimate-tree.test.ts --maxWorkers=1
bunx vitest run tests/vitest/component-library-manager-ui.test.tsx --maxWorkers=1
bunx vitest run tests/vitest/project-estimates-table.test.tsx --maxWorkers=1
```

---

## 8. Risks and Open Questions

| # | Question | Status | Recommended Answer |
|---|----------|--------|-------------------|
| Q1 | Is hard delete acceptable for cost library components that have estimate row references? | **DECIDED** | No. Bulk action defaults to **archive**. Hard delete is admin-only and gated behind zero-reference RPC check. |
| Q2 | Which FKs cascade when deleting estimates and projects? | **ANSWERED** | `projects → estimates → nodes/rows/versions/events` cascade. `project_favorites`, `project_members`, `collaboration_invitations`, `project_publications` do NOT cascade and must be handled explicitly. |
| Q3 | Are project members/shared estimate users allowed to delete? | **OPEN** | Plan assumes workspace admins and project owners only. Implementation should check `is_workspace_admin()` or project ownership via RPC. |
| Q4 | Should tree parent checkbox selection cascade to descendants by default? | **DECIDED** | Yes, for destructive delete preview. Checking a group node selects all descendants. Indeterminate parent shown for partial selection. |
| Q5 | Should Select All mean all visible filtered items or all items in the dataset? | **DECIDED** | "Select visible" selects currently rendered rows. "Select all" (matching search) is deferred — requires server-side resolution. |
| Q6 | Can react-complex-tree support true handle-only drag? | **DECIDED** | Keep RCT's row-level drag handlers. Add visible grip icon as visual affordance. Ensure checkbox/inline actions don't trigger drag via event handling. |
| Q7 | What happens to current route selection after deleting the active estimate node/sheet/project? | **ANSWERED** | For nodes: compute `fallbackNodeId` via existing `getDeleteFallbackNodeId` logic. For sheets: redirect to project estimates list. For projects: redirect to `/workshop/projects`. |
| Q8 | Should we create a dedicated RPC migration for bulk operations, or handle in server actions? | **OPEN** | Server actions for simple cases (estimates with FK cascade), RPCs for complex cases (projects with 10+ dependent tables, library with reference checks). |

---

## 9. Deliverable

This plan document at `.ai/03_plans/tree-selection-drag-affordance-bulk-delete-plan.md`.

**Reference plans:**
- `.ai/03_plans/2026-06-03-mass-deletion-projects-estimate-sheets-library-components.md` — detailed server-side architecture for mass deletion (incorporates Sections 2.4-2.9, 4.4 of this plan with deeper database-level detail).

**Implementation order:** Phase 1 (WorkshopTreeRow) → Phase 2 (Estimate Tree) → Phase 3 (Library Trees) → Phase 4 (Estimate Sheets Table) → Phase 5 (Projects Page) → Phase 6 (Component Library) → Phase 7 (Polish).

**Key principle:** Phase 1 is the leverage point. Extending `WorkshopTreeRow` with slots for drag handles, checkboxes, and selection mode eliminates the need for three separate implementations. Fix the shared primitive, and all tree surfaces benefit.
