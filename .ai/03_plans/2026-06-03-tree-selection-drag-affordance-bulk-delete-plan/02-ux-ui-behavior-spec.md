# UX/UI Behavior Specification

This document defines the exact UX behavior, visual states, and accessibility rules for tree rows, drag handles, checkbox selection, bulk toolbars, and confirmation modals across all surfaces.

## 1. Estimate Tree Row Behavior

- **Layout:** `[drag handle] [checkbox] [disclosure arrow] [entity icon] [label/meta] [inline actions]`
- **Drag Handle:** `DotsSixVertical` icon (16px). Visible on row hover or focus. Unindented (placed outside the `paddingLeft` wrapper).
- **Checkbox:** Placed after indent, before disclosure arrow. Indeterminate state supported for parent nodes with partial child selection.
- **Row Click:** Navigates to node / selects route. Does NOT toggle checkbox.
- **Checkbox Click:** Toggles bulk selection. **Stops propagation** to prevent row click, expand/collapse, or drag initiation.
- **Arrow Click:** Expands/collapses folder.
- **Right-Click:** Opens context menu (Rename, Delete). Preserved.
- **Drag Start:** Initiated by dragging the row. Drag handle is a visual affordance; RCT handles the actual drag. Checkbox click must not trigger drag.

## 2. Library Folder Tree Behavior

- **Drag Handle:** Visible on folder rows (excluding synthetic root `ALL_COMPONENTS_FOLDER_ID`).
- **Checkbox:** Selects library folders. Synthetic root is never selectable, draggable, or deletable.
- **Component Rows:** No checkboxes in the folder tree (handled in Phase 6 on catalogue cards). `canMove: false` preserved.

## 3. Generic Library Component Row Behavior

- **Drag Handle:** Visible where `onDragStart` is available.
- **Checkbox:** Not applicable in tree view. Selection occurs on catalogue cards.

## 4. Estimate Sheet Table Behavior

- **Header Checkbox:** Select-all checkbox in the `row_actions` column header. Indeterminate state when a subset of visible rows is selected.
- **Row Checkbox:** Toggles selection for that specific estimate sheet.
- **Row Click:** Navigates to estimate sheet. Checkbox click stops propagation.

## 5. Project Card Behavior

- **Checkbox Overlay:** Top-left corner of the card. Visible on card hover or when bulk selection mode is globally active.
- **Shared/Pending Cards:** Checkbox is disabled with a tooltip: "Cannot delete shared projects."
- **Card Click:** Navigates to project details. Checkbox click stops propagation.

## 6. Component Catalogue Card Behavior

- **Checkbox Overlay:** Top-left corner. Visible on hover or when selection mode is active.
- **Card Click:** Opens component detail panel. Checkbox click stops propagation.

## 7. Bulk Toolbar Behavior

- **Visibility:** Appears sticky/fixed above the table/tree content when `selectedCount > 0`.
- **Content:** 
  - `SelectionCountLabel`: "X [entity type] selected"
  - "Clear selection" button (resets selection state).
  - Primary action button: "Delete selected" (danger) or "Archive selected" (primary).
- **Disabled State:** If mixed selection includes protected/non-editable items, the destructive button is disabled, and a `disabledReason` span is shown (e.g., "Includes shared projects").

## 8. Confirmation Modal Behavior

- **Projects:** Strong (typed) confirmation. User must type "DELETE PROJECTS". Shows count, name preview, estimate sheet count, and storage cleanup note.
- **Estimate Sheets:** Strong (typed) confirmation. User must type "DELETE ESTIMATE SHEETS". Shows sheet codes/names and estimate tree/row count.
- **Estimate Tree Nodes:** Standard confirmation. Shows descendant group/area/row count and fallback selected node note.
- **Library Components:** 
  - Archive: Standard confirmation. Shows count and lifecycle state change note.
  - Hard Delete: Strong (typed) confirmation, admin-gated. Shows zero-reference proof requirement.

## 9. Keyboard Behavior

- **Tab:** Navigates focus through interactive elements (drag handle, checkbox, row, inline actions).
- **Space/Enter on Checkbox:** Toggles checkbox state.
- **Enter on Row:** Triggers primary action (navigation).
- **Escape:** Cancels inline editing, closes modals, clears bulk selection if modal is closed.
- **Arrow Keys:** Navigates tree focus (handled by RCT).

## 10. Accessibility Semantics

- **Row:** `role="treeitem"`, `aria-selected` reflects route selection (not bulk selection).
- **Checkbox:** `<input type="checkbox">` with `aria-label="Select [entity name]"`. Parent checkboxes use `indeterminate` property (not an ARIA attribute, set via JS ref).
- **Drag Handle:** `aria-label="Drag to reorder [entity name]"`, `tabIndex={0}`.
- **Bulk Toolbar:** `role="toolbar"`, `aria-label="Bulk actions for [entity type]"`.
- **Modal:** `role="dialog"`, `aria-modal="true"`, focus trapped, focus returned to trigger element on close.

## 11. Event Propagation Rules

- **Checkbox `onClick` / `onKeyDown`:** `event.stopPropagation()` and `event.preventDefault()` to isolate from row click and RCT drag handlers.
- **Drag Handle `onPointerDown`:** `event.stopPropagation()` to prevent row click, but allow RCT drag to initiate if configured, or rely on row-level drag with handle as visual only.
- **Inline Actions:** `event.stopPropagation()` to prevent row click.

## 12. Disabled/Non-Editable States

- **Checkbox:** `disabled` attribute applied. Visually grayed out. Tooltip explains why (e.g., "Cannot delete shared projects").
- **Drag Handle:** Hidden or `opacity-50` with `cursor-not-allowed` and tooltip.
- **Bulk Action Button:** `disabled` attribute applied when selection contains protected items.

## 13. Filtered Select-Visible Behavior

- **"Select Visible" Button:** Selects all currently rendered rows that match the active search filter and are not disabled.
- **"Clear Selection" Button:** Clears all selected IDs.

## 14. Route Fallback Behavior After Deletion

- **Estimate Node:** If the active route node is deleted, redirect to `fallbackNodeId` (computed via `planEstimateTreeDelete`).
- **Estimate Sheet:** Redirect to `/workshop/projects/[projectId]/estimates`.
- **Project:** Redirect to `/workshop/projects`.

## 15. Empty States After Deletion

- **Estimate Tree:** "This estimate has no tree nodes yet. Add a Group Node or Area Node to begin."
- **Estimate Sheets Table:** "No estimate sheets yet. Create one to get started."
- **Projects Page:** "No projects match your search" or "Create the first live project".
- **Component Library:** "No components in this folder."