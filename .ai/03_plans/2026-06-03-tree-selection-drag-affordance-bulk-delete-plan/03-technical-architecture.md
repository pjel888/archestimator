# Technical Architecture

Related but separate workstream. This plan does not supersede, replace, or modify `.ai/03_plans/2026-06-03-mass-deletion-projects-estimate-sheets-library-components.md`.

## Architecture Decision

The shared visual system already exists. Future implementation must harden and extend the current `WorkshopTreeRow` slot model and `tree-row-affordances.tsx` primitives before touching individual surfaces.

## Shared Primitives

### Existing File To Harden

`src/components/workshop/tree-row-affordances.tsx`

This file already contains:

- `TreeDragHandle`
- `TreeSelectionCheckbox`
- `TreeSelectionCountLabel`
- `TreeBulkActionBar`

### Required Future Component/API Work

| Component | Current State | Future Contract |
|---|---|---|
| `TreeDragHandle` | Exists as a visual grip and currently stops pointer/click propagation. | Make decorative under current RCT row-level drag (`aria-hidden`, no tab stop, no fake draggable label), or move RCT drag props to it only if handle-only drag is proven. |
| `TreeSelectionCheckbox` | Exists with checked/indeterminate/disabled props and partial propagation stops. | Add click/key propagation isolation tests and implementation; preserve native checkbox Space behavior. |
| `TreeBulkActionBar` | Exists with count, clear, delete action. | Add `role="toolbar"`, accessible label, archive/delete variants, pending state, disabled reasons, and responsive placement. |
| `TreeSelectionCountLabel` | Exists. | Either keep this name or export an alias `SelectionCountLabel`; do not create duplicate count label components. |
| `BulkDestructiveConfirmationModal` | Missing. | Add reusable modal wrapper or local per-surface modal using `Modal`, `Button`, and `Toast` with focus return and typed-confirm support. |

## Required Utilities

Recommended future file:

`src/lib/bulk-selection/tree-selection.ts`

Required utilities:

- `getVisibleTreeItemIds(treeState, expandedIds, filterState): string[]`
- `getDescendantIds(rootId, treeById): string[]`
- `getSelectableDescendantIds(rootId, treeById, rules): string[]`
- `toggleTreeSelection(selectedIds, id, options): Set<string>`
- `toggleCascadeSelection(selectedIds, id, treeById, rules): Set<string>`
- `getTriStateForNode(id, selectedIds, treeById, rules): "checked" | "unchecked" | "indeterminate"`
- `filterSelectableIds(ids, rules): string[]`
- `formatBulkSelectionCount(input): string`
- `buildBulkDeletePreview(input): BulkDeletePreview`
- `clearInvalidSelectionsAfterRefresh(selectedIds, currentVisibleOrKnownIds): Set<string>`

Rules:

- Utilities are pure and unit-tested.
- Utilities do not know about routes, RCT selected items, or server actions.
- `select visible` uses rendered/filtered IDs only.
- Disabled/protected IDs are always filtered out.

## Shared Row Architecture

### Current Source Evidence

`WorkshopTreeRow` in `src/components/workshop/workshop-tree.tsx` already accepts `dragHandleSlot`, `selectionSlot`, `leadingSlot`, and `selectionMode`. It computes `hasSlots` and forces `effectiveAs = hasSlots ? "div" : as` to avoid invalid interactive children inside a native `button`.

### Recommended Strategy

Use the existing non-button row variant whenever interactive children are present.

Implementation detail:

1. Keep `WorkshopTreeRow` as the single shared row shell.
2. When `selectionSlot`, `dragHandleSlot`, or another interactive slot is present, render the outer shell as `div`.
3. Preserve route/open behavior by putting explicit `role`, `tabIndex`, click, key, and RCT interactive props on the non-button shell.
4. Strip or avoid button-only props such as `type` when the shell is forced to `div`.
5. Keep arrow, checkbox, inline action, and context-menu controls as separate interactive children that stop propagation only for their own activation events.

Why this is safe:

- It matches current code direction.
- It avoids nested interactive HTML.
- It keeps one visual primitive.
- It lets RCT props stay attached to the row shell.
- It can preserve context-menu behavior because the row shell remains the context target.

Affected consumers:

- `EstimateSheetTree` row render.
- `LibraryFolderTree` row render.
- `LibraryFolderRow` and `LibraryItemRow` if generic library tree enters bulk mode.
- Any future card/table selection primitives should follow the same event isolation rules, even when they do not use `WorkshopTreeRow`.

Keyboard preservation:

- `Enter` on row preserves navigation/open.
- Arrow keys preserve RCT behavior.
- Space on checkbox toggles checkbox only.
- Space on row does not secretly toggle bulk selection.

Context menu preservation:

- Keep existing `ContextMenu` wrappers and row context target.
- Checkbox/handle/menu buttons must not clear or overwrite the right-click target.

RCT prop preservation:

- Continue spreading RCT row props onto the non-button row shell.
- Do not move RCT drag props to the handle unless a dedicated proof phase shows it works.

Focus styling:

- Use existing row focus styles for row shell.
- Use native focus for checkbox.
- Checked row treatment is separate from active-route styling.

## React Complex Tree Integration

Handle-only drag is not proven with current usage. Current `EstimateSheetTree` and `LibraryFolderTree` attach RCT drag/drop behavior to rows through `ControlledTreeEnvironment`, `renderItem`, `canDrag`, `canDropAt`, and `onDrop`.

Recommended compromise:

- Keep row-level RCT drag handlers.
- Add visible grip as affordance.
- Treat grip as decorative unless handle-only drag is implemented in a later proof.
- Isolate checkbox, arrow, menu, and inline action events so they do not start drag.
- Test that checkbox pointer/key actions do not start drag, navigate, expand, or open context menus.

## State Ownership

| Surface | State Name | Owner | Reset Rules | Dependencies |
|---|---|---|---|---|
| Estimate tree | `bulkSelectedNodeIds: Set<string>` | `src/components/workshop/EstimateSheetTree.tsx` | Clear after successful bulk delete; prune after query refresh; preserve after modal cancel/failure if IDs still exist. | RCT view state, route selected node, estimate query cache, pending reorder/delete state. |
| Estimate tree modal | `bulkDeleteModalState` | `EstimateSheetTree` | Close on cancel/success; keep on validation error. | Bulk preview, server action pending state. |
| Library folder tree | `bulkSelectedFolderIds: Set<string>` | `src/components/workshop/component-library-manager/LibraryFolderTree.tsx` | Clear after successful delete; prune after library refresh; never include `ALL_COMPONENTS_FOLDER_ID`. | Active folder, RCT view state, folder tree data. |
| Estimate sheets table | `selectedEstimateIds: Set<string>` | Existing `ProjectEstimatesTable` state | Extend existing state; header select-visible only uses visible rows; clear after delete or project switch. | TanStack visible rows, filters, pending inline edits. |
| Projects page | `selectedProjectIds: Set<string>` | `src/components/workshop/projects-page-client.tsx` | Clear after delete, filter refresh, or workspace/project list refresh. | Access badges, owned/shared state, current route. |
| Component catalogue | `selectedComponentIds: Set<string>` | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx` | Clear after archive/delete; prune after catalogue refresh/filter change. | Lifecycle filters, current folder/category, reference counts. |
| Shared modal | `pendingBulkAction` | Surface owner | Disable toolbar/modal actions while pending; restore focus after close. | Server action result, toast status. |
| Route fallback | `fallbackRouteTarget` | Surface owner/action result | Use only after successful delete of active route object. | Server action result and router. |

## Server Action and RPC Planning

All destructive bulk operations must run server-side. Client loops over single-delete actions are prohibited.

### `deleteProjectsBulk`

Future file: `src/lib/projects/actions.ts`

Signature:

```ts
type DeleteProjectsBulkInput = {
  workspaceId: string
  projectIds: string[]
  confirmationText: "DELETE PROJECTS"
}

type DeleteProjectsBulkResult = {
  ok: true
  deletedProjectIds: string[]
  removedStoragePaths: string[]
  fallbackHref: "/workshop/projects"
} | {
  ok: false
  code: "VALIDATION" | "UNAUTHORIZED" | "PARTIAL_NOT_ALLOWED" | "STORAGE_CLEANUP_FAILED" | "UNKNOWN"
  message: string
  invalidProjectIds?: string[]
}
```

Validation:

- Non-empty unique IDs.
- Workspace scope.
- Edit/manage permission for every project.
- Reject shared/sheet-only/pending projects.
- Typed confirmation.

Revalidation:

- `/workshop/projects`
- project-specific workshop paths for deleted IDs if the app caches them.

Transaction/RPC:

- Prefer one transaction/RPC or a server-side transaction-like sequence. Project deletion has many dependents and storage cleanup; do not run independent client calls.

### `deleteEstimateSheetsBulk`

Future file: `src/lib/estimates/actions.ts`

Signature:

```ts
type DeleteEstimateSheetsBulkInput = {
  projectId: string
  estimateIds: string[]
  confirmationText: "DELETE ESTIMATES"
}

type DeleteEstimateSheetsBulkResult = {
  ok: true
  deletedEstimateIds: string[]
  fallbackHref: string
} | {
  ok: false
  code: "VALIDATION" | "UNAUTHORIZED" | "ACTIVE_ROUTE_CONFLICT" | "UNKNOWN"
  message: string
  invalidEstimateIds?: string[]
}
```

Validation:

- IDs belong to project.
- User can edit project/estimate.
- No cross-project IDs.
- Typed confirmation.

Revalidation:

- `/workshop/projects/${projectId}/estimates`
- active estimate routes affected by deletion.

Transaction/RPC:

- Use server-side delete with transaction or RPC if history/audit rows must be written.

### `deleteEstimateNodesBulk`

Future file: `src/lib/estimates/actions.ts`

Signature:

```ts
type DeleteEstimateNodesBulkInput = {
  projectId: string
  estimateId: string
  nodeIds: string[]
}

type DeleteEstimateNodesBulkResult = {
  ok: true
  deletedNodeIds: string[]
  deletedRowItemCount: number
  fallbackNodeId: string | null
  tree: unknown
} | {
  ok: false
  code: "VALIDATION" | "UNAUTHORIZED" | "PROTECTED_NODE" | "UNKNOWN"
  message: string
}
```

Validation:

- User can edit estimate.
- Node IDs belong to estimate.
- Deduplicate descendants when a selected parent already covers a child.
- Reject protected/synthetic roots.

RPC:

- Prefer a new `delete_estimate_nodes_bulk_with_history` RPC or extend existing history strategy so audit/version events remain coherent.

### `deleteLibraryFoldersBulk`

Future file: `src/lib/component-library/actions.ts`

Signature:

```ts
type DeleteLibraryFoldersBulkInput = {
  workspaceId: string
  folderIds: string[]
}
```

Validation:

- Workspace scope.
- Workspace member/editor permission.
- Exclude `ALL_COMPONENTS_FOLDER_ID`.
- Deduplicate descendant folders.

Semantics:

- Preserve single-delete behavior: lift child folders and unassign items unless a future data decision says otherwise.

### `archiveCostLibraryComponentsBulk`

Future file: `src/lib/component-library/actions.ts`

Signature:

```ts
type ArchiveCostLibraryComponentsBulkInput = {
  workspaceId: string
  componentIds: string[]
  targetLifecycleState: "archived"
}
```

Validation:

- Workspace scope.
- Component IDs belong to workspace.
- User can manage component library.

Semantics:

- Archive is default.
- Revalidate library route.

### `deleteCostLibraryComponentsBulk`

Future file: `src/lib/component-library/actions.ts`

Signature:

```ts
type DeleteCostLibraryComponentsBulkInput = {
  workspaceId: string
  componentIds: string[]
  confirmationText: "DELETE COMPONENTS"
}
```

Validation:

- Workspace scope and permission.
- Zero active estimate row references.
- Zero protected version/attachment states not covered by cascade.
- Storage paths are owned by the selected components and pass safe-path checks.

Failure:

- If any selected component is referenced, reject hard delete and return IDs/reason. Do not partially hard-delete unless explicitly designed.

## Revalidation Rules

| Surface | Paths |
|---|---|
| Projects | `/workshop/projects`, project detail/estimate paths for deleted IDs where cached. |
| Estimate sheets | `/workshop/projects/{projectId}/estimates`, active estimate paths. |
| Estimate nodes | `/workshop/projects/{projectId}/estimates/{estimateId}` and tree/row query cache. |
| Library folders/components | `/workshop/library`, component catalogue routes, estimate insertion library query if shared. |

## Rollback Rules

- UI optimistic updates are allowed only when the current single-action pattern already supports rollback or safe refresh.
- Server contracts should prefer transaction semantics: all selected IDs succeed or none mutate.
- If storage cleanup fails after DB deletion, report exact status and require a repair path; do not hide partial cleanup.

## Implementation Boundary

This document defines future contracts. It does not create server actions, RPCs, migrations, tests, or runtime code.
