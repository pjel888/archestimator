# UX/UI Behavior Specification

Related but separate workstream. This plan does not supersede, replace, or modify `.ai/03_plans/2026-06-03-mass-deletion-projects-estimate-sheets-library-components.md`.

## UX Objective

Create one coherent interaction system across trees, tables, cards, and catalogues:

- Users can see what can be dragged.
- Users can check exactly what will be acted on.
- Bulk selection is never confused with route/current/focused state.
- Destructive actions require previews, confirmation, permissions, and safe fallbacks.
- Existing right-click rename/delete and row drag/drop behavior remain intact.

## State Vocabulary

| State | Meaning | Visual / ARIA Rule | Must Not Be Confused With |
|---|---|---|---|
| Focused item | Keyboard/RCT focus target. | Focus ring; RCT `focusedItem` where used. | Checked bulk selection. |
| Active route item | Item represented by current route or active filter. | Existing selected/current row/card treatment; may use `aria-current` when semantically correct. | Checkbox checked state. |
| Row selected for navigation | Row click target for navigating/opening. | Existing row selected styling. | Bulk selection. |
| Checkbox checked | Item included in bulk action. | Native checkbox `checked`; separate selected styling via `selectionMode`. | RCT `selectedItems`. |
| Indeterminate parent | Some selectable descendants checked. | Native checkbox `indeterminate`; `aria-checked="mixed"` if custom control is used. | Full selection. |
| Dragged item | RCT/browser drag operation in progress. | Existing drag overlay/drop styling; handle is affordance only unless proven otherwise. | Checkbox selection. |
| Disabled item | Item cannot be selected/dragged/deleted. | Disabled checkbox, muted text, tooltip/title when helpful. | Filter-hidden item. |
| Editing item | Inline rename/edit state. | Existing editing UI; drag and destructive bulk controls disabled for that row. | Focused item. |
| Right-click context target | Item whose context menu opened. | Context menu state only. | Checkbox selected set. |

## Surface Behavior

### 1. Estimate Tree Rows

- Row click navigates/selects the route node exactly as today.
- Right-click opens the existing context menu; rename/delete entries stay available.
- A visible grip appears for draggable rows on hover, focus-within, or bulk-selection mode.
- Checkbox appears in bulk mode and may also be visible on hover/focus when selection is enabled.
- Checking a parent cascades to selectable descendants. Protected/disabled descendants are skipped.
- Parent checkbox states:
  - unchecked: no selectable descendants checked;
  - checked: node and all selectable descendants checked;
  - indeterminate: at least one but not all selectable descendants checked.
- Deleting checked nodes builds a preview with selected root count, descendant count, affected row count, and active-route fallback.
- If the active route node is deleted, route moves to the server/action-provided fallback node or the estimate sheet root/list fallback.

### 2. Library Folder Tree Rows

- Active folder selection remains route/filter state.
- `ALL_COMPONENTS_FOLDER_ID` is never selectable, draggable, or deletable.
- Folder checkbox cascade includes selectable child folders. Component item selection is separate unless a later phase explicitly includes item rows.
- Bulk folder delete preserves existing single-delete semantics: lift child folders when required and unassign items rather than deleting components.
- Existing add/rename/delete context menu behavior remains available.

### 3. Generic Library Component Rows

- Folder rows and item rows follow the same `WorkshopTreeRow` spacing and icon rhythm.
- Item row double-click/add behavior must remain isolated from checkbox state.
- Drag affordance may be shown only where item drag already exists.
- Bulk selection controls must not be nested inside a native button row.

### 4. Estimate Sheet Table Rows

- Row checkbox selects only that estimate sheet for bulk actions.
- Header checkbox selects currently visible/filtered rows, not all database rows.
- Header checkbox is:
  - unchecked when no visible selectable rows are checked;
  - checked when all visible selectable rows are checked;
  - indeterminate when some visible selectable rows are checked.
- Row click/open/edit behavior must not fire from checkbox clicks.
- Bulk delete requires typed confirmation for top-level sheet destruction.

### 5. Project Cards

- Owned/editable project cards can be selected.
- Shared, sheet-only, pending, or otherwise non-editable cards show disabled selection with an access reason.
- The selection checkbox must not be placed inside `ProjectCard` while it renders as a full-card `Link`; use `LiveProjectCard` or split the link/card shell first.
- Deleting active/current project redirects to `/workshop/projects`.
- Typed confirmation is required: `DELETE PROJECTS`.

### 6. Component Catalogue Cards

- Catalogue selection state is owned by `ComponentLibraryManager`.
- Archive is the default bulk destructive action.
- Hard delete is hidden or disabled unless zero-reference proof and permission allow it.
- Referenced components show a disabled hard-delete state and can still be archived if permission allows.
- Component image/thumbnail/attachment cleanup occurs only after server-side path validation.

### 7. Bulk Action Bars

- Bulk bars appear when one or more selectable visible items are checked.
- Bulk bars use `role="toolbar"`, concise count text, clear button, and destructive/archive primary action.
- Count labels include both selected count and descendant/item impact where useful.
- Bars must not cover row text or fixed table controls on mobile or desktop.
- Pending state disables clear/delete/archive buttons and keeps count visible.

### 8. Confirmation Modals

- Projects and estimate sheets require typed confirmation.
- Estimate nodes, library folders, and component archive/delete require explicit confirmation with impact preview.
- Modal opens with focus on the least destructive useful control unless typed confirmation is required; typed confirmation focuses the input.
- Escape and Cancel close without mutation.
- After close, focus returns to the invoking checkbox, toolbar button, or nearest still-mounted safe target.

### 9. Checkbox States

- Use native checkboxes when possible.
- For indeterminate, set the DOM `indeterminate` property and expose mixed semantics.
- Disabled checkboxes remain visible when they explain protected rows.
- Hidden rows are not selected by select-visible.
- Existing checked IDs that disappear after refresh/filter changes are cleared by stale-selection cleanup.

### 10. Drag Handles

- With current React Complex Tree wiring, handles are visual affordances unless true handle-only drag is proven during implementation.
- Decorative handle rule: not tabbable, `aria-hidden`, no fake drag label, no pointer interception that blocks RCT row drag.
- If implementation proves true handle-only drag, move RCT drag props to the handle in a dedicated phase and update tests first.
- Checkbox and inline actions must never start drag.

### 11. Hover and Focus States

- Hover reveals handle and selection affordance without layout shift.
- Keyboard focus reveals the same affordances as hover.
- Focus ring remains on the row or native control that actually has focus.
- Checked rows have a subtle distinct treatment from active-route rows.

### 12. Keyboard Behavior

- Arrow keys preserve existing RCT tree navigation.
- Enter on a row preserves existing navigation/open behavior.
- Space on a native checkbox toggles checkbox only.
- Space on a row preserves current RCT behavior and must not bulk-select unless the row itself is intentionally a checkbox target.
- Escape closes context menus/modals or clears transient drag/selection UI according to current focus.
- Shift-click is optional; if supported, it selects a contiguous visible range only. If not implemented, no partial hidden behavior may be implied.

### 13. Accessibility Semantics

- `aria-selected` remains route/RCT selection, not bulk selection.
- Native checkbox checked state communicates bulk selection.
- Indeterminate parents expose mixed state.
- Bulk toolbar has accessible label such as `Bulk actions for selected estimate nodes`.
- Destructive modals use `role="dialog"`, `aria-modal`, labelled heading, described impact summary, and keyboard close path.
- Disabled/protected controls expose a concise reason via visible helper, tooltip/title, or `aria-describedby`.

### 14. Disabled / Protected Rows

- Synthetic roots, locked/shared-only projects, pending shared cards, and rows blocked by permission cannot be selected for destructive actions.
- Disabled rows are excluded from select-visible and cascade selection.
- Disabled child rows do not prevent parent indeterminate state from being computed over selectable descendants.

### 15. Filtered Select-Visible Behavior

- Select-visible selects currently rendered/filtered rows only.
- It must not select hidden descendants or server-side pages not loaded in the client.
- If global select-all is ever needed, it requires a separate server-side preview design and is out of scope for this plan.

### 16. Route Fallback After Deletion

- Estimate node: use server/action fallback node if available; otherwise route to estimate sheet root/list fallback.
- Estimate sheet: route to the project estimate list or next accessible estimate if explicitly returned by the action.
- Project: route to `/workshop/projects`.
- Library folder: route/filter to parent folder or all-components fallback.
- Component: keep catalogue route; remove archived/deleted cards from current view or refresh filters.

### 17. Empty States After Deletion

- Empty tree branch: show existing empty branch state or parent row without children.
- Empty estimate sheets table: show table empty state and clear selected IDs.
- Empty projects list: show existing no-projects state.
- Empty catalogue view: show current catalogue empty state, not a modal.

### 18. Toast / Status Behavior

- Success toast/status includes count and entity type.
- Failure toast uses alert semantics and keeps or safely refreshes selection according to mutation outcome.
- Partial failure is allowed only if server contract explicitly returns per-ID results; otherwise transaction failure means no deletion occurred.

### 19. Error Behavior

- Validation errors are shown in modal or toolbar without losing selection.
- Permission errors disable or clear invalid selections after refresh and show a precise message.
- Network/server failures preserve selected IDs if the underlying rows still exist, then offer retry.
- Optimistic UI must rollback or force a safe refresh after failure.

### 20. Focus Return

- Cancel returns focus to the invoking control.
- Successful delete returns focus to fallback row, header checkbox, bulk toolbar clear button, or page heading if no row remains.
- If the invoking element was deleted, focus goes to the nearest still-mounted safe target.

## Event Rules

| User action | Target | Expected result | Must not happen | Event handling |
|---|---|---|---|---|
| Row click | Estimate/library row text shell | Navigate/select active row or folder as today. | Toggle checkbox, start drag, open context menu. | Existing row click handler only; ignore if event came from interactive child. |
| Row double-click | Component/library item row where applicable | Existing add/open behavior. | Toggle bulk selection unless double-click target is checkbox. | Child controls stop propagation; row double-click stays scoped. |
| Checkbox click | Native checkbox | Toggle only that item/cascade set. | Navigate, expand/collapse, open context menu, start drag. | Stop click/change propagation; do not prevent native checkbox default. |
| Checkbox keyboard toggle | Focused checkbox + Space | Toggle checkbox, update count/indeterminate state. | Trigger row Enter/Space behavior. | Stop key propagation on checkbox; preserve native Space default. |
| Drag handle pointer down | Decorative handle | Reveal affordance; row-level drag may still start from row where RCT owns it. | Fake keyboard drag promise; block row RCT drag unintentionally. | Decorative handle should not intercept pointer unless true handle drag is implemented. |
| Drag start | RCT-enabled row | Existing drag/reorder starts if guards pass. | Start drag from checkbox/action/menu. | Interactive children stop pointer/click/key propagation. |
| Drag end | RCT-enabled row | Existing drop/reorder/rollback status. | Clear unrelated bulk selection unless deleted/invalid. | Existing `onDrop` path; selection cleanup only after refresh. |
| Arrow click | Tree disclosure arrow | Expand/collapse branch. | Navigate row or toggle checkbox. | Existing arrow stop propagation. |
| Right-click/context menu | Row shell | Open existing context menu for that row. | Toggle checkbox or clear selection. | Preserve Radix context menu target state. |
| Enter | Focused row | Existing route/open behavior. | Bulk toggle. | Row keyboard handler remains route-oriented. |
| Escape | Modal/menu/selection context | Close modal/menu; optional clear transient toolbar focus. | Confirm destructive action. | Modal/menu Escape handlers; toolbar clear only explicit. |
| Space | Focused checkbox | Toggle checkbox. | Activate row navigation. | Native checkbox default plus propagation stop. |
| Space | Focused row | Existing tree/table behavior. | Toggle hidden checkbox state. | Do not overload row Space for bulk selection. |
| Shift-click | Visible selectable row checkbox, if supported | Select contiguous visible range. | Select hidden/server-side rows. | Range derived from current visible IDs only. |
| Select visible | Header checkbox / toolbar command | Select currently rendered selectable IDs. | Select whole database or disabled rows. | Use visible row/tree utility and filter selectable IDs. |
| Clear selection | Bulk toolbar clear | Empty checked set and reset indeterminate parents. | Change route/current row. | Set bulk state to empty only. |
| Confirm delete/archive | Modal primary action | Run server-side bulk action; show success/failure; route fallback. | Client-loop single deletes. | Disable controls while pending; handle transaction result. |
| Cancel modal | Modal cancel/backdrop/Escape | Close modal, preserve selection, return focus. | Mutate data. | No server call; restore focus to invoker. |

## Acceptance Summary

The future implementation is UX-complete only when users can distinguish current/focused/checked/dragged/disabled/editing/context-target states on every surface and when every event above has a test or manual QA row in `06-test-and-validation-plan.md`.
