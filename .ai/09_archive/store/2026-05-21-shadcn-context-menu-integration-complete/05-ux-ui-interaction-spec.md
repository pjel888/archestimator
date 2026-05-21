# UX/UI Interaction Spec and Pressure Test

**Date:** 2026-05-21
**Scope:** Estimate tree context menu, inline rename, and instant delete behavior.

## Confidence Statement

I am not 100% certain in the absolute sense; that would be overclaiming for a high-risk UI/data mutation slice. I am confident in the revised strategy because it matches:

- the user's required interaction: inline rename and no-reload delete;
- the current code shape: `EstimateSheetTree` owns row rendering, local tree state, query cache, selection, and route navigation;
- Radix/shadcn strengths: accessible right-click menu, item selection, focus management, and portal positioning;
- Archestimator's compact design-system rules.

The remaining uncertainty belongs in implementation verification: RCT event interplay, focus restoration, and optimistic rollback must be proven by tests and browser smoke checks.

## Design Direction

1. Product goal and audience: contractors editing an estimate hierarchy during focused costing work.
2. Tone: precise, compact, operational.
3. Layout strategy: keep actions at the row/pointer; do not move users to a separate panel for small tree edits.
4. Typography approach: 10px app text, stable 28px tree row height, no oversized generated shadcn defaults.
5. Color/surface strategy: white menu, hairline border, surface-muted hover, danger text only for delete.
6. Motion strategy: minimal Radix open/close motion only; no decorative animation.
7. Signature differentiator: spreadsheet-fast inline row editing with optimistic persistence and rollback instead of modal-heavy tree management.

## Multiple Perspectives Reviewed

| Perspective | What it optimizes for | Plan decision |
| --- | --- | --- |
| Estimator/operator UX | Fast rename/delete while building the estimate tree. | Right-click menu near pointer; inline row rename; instant delete after confirmation. |
| UI/design system | Compact, consistent app surface. | shadcn primitive customized to `DESIGN.md`, 10px menu/input text, no new visual language. |
| Accessibility | Keyboard and screen reader behavior. | Radix Context Menu for menu semantics; inline input gets label, focus, Enter/Escape behavior, and error messaging. |
| Data integrity | Avoid accidental destructive loss. | Delete opens confirmation and states cascade effects for Group Nodes. |
| Performance/perceived speed | No visible reload or blocked UI. | Client optimistic transforms and query-cache updates; server returns data; no redirect/refresh. |
| Architecture | Avoid tree component bloat. | Put pure tree edit/fallback helpers in `src/lib/estimates/estimate-tree-edit.ts`. |
| Future shadcn rollout | Reuse the menu model for filter/icon menus later. | Split action model/content from trigger adapter; Context Menu now, Dropdown/Popover later. |

## Rename Interaction

### Entry

User opens context menu on a Group Node or Area Node and selects `Rename`.

### Immediate UI

- Context menu closes.
- The same tree row remains in place.
- The row title text becomes an inline input.
- The folder/cube icon, indentation, row height, and selected row background do not move.
- The current node name is selected in the input.

### Keyboard and Pointer Rules

- `Enter`: commit.
- `Escape`: cancel and restore label.
- `Blur`: commit if value is valid and changed.
- Empty trimmed value: keep edit mode open and show compact error.
- Clicks and key events inside the input must not trigger RCT primary action, expand/collapse, drag, or route navigation.
- Dragging is disabled for the editing row.

### Persistence

- Commit is optimistic: update `localNodes` and `estimateQueryKeys.areaTree(estimateId)` first.
- Call `renameEstimateNode`.
- On success, reconcile with returned tree.
- On failure, rollback previous tree/query cache, restore edit mode with attempted value, and show compact error/status.

### Visual Details

- Input height fits inside current `h-7` row button.
- Text: `text-[10px]`.
- Border/focus: `border-hairline`, `focus:border-accent`, `focus-visible:ring-focus`.
- Error: 9px or 10px max, terse text such as `Name is required.`

## Delete Interaction

### Entry

User opens context menu on a Group Node or Area Node and selects `Delete`.

### Confirmation

Delete does not happen from the menu item itself. It opens a compact confirmation using existing modal/overlay patterns.

Copy should distinguish:

- Area Node: deleting removes that area and its estimate rows.
- Group Node: deleting removes that group, all child groups/areas, and descendant estimate rows.

### Confirmed Delete

After the user confirms:

1. Snapshot previous `localNodes`, selected node id, focused item, and query cache value.
2. Compute `nextNodes`, `deletedNodeIds`, and `fallbackNodeId` locally.
3. Update visible tree and query cache immediately.
4. If active selected node is deleted or inside the deleted subtree, update Zustand selected node to fallback immediately.
5. If the current URL points at a deleted node or descendant, use `router.replace()` to the fallback route inside `startTransition`.
6. Call `deleteEstimateNode`.
7. Reconcile with returned tree or rollback on failure.

### Explicit No-Reload Contract

Do not:

- call `router.refresh()`;
- call `redirect()` from `deleteEstimateNode`;
- wait for server response before removing the node visually;
- perform full document reload;
- navigate if deleting an unselected node outside the current route path.

Allowed:

- `router.replace()` only to repair the URL when the current route points at a deleted node or deleted descendant.
- Server `revalidatePath()` for later consistency, as long as it does not drive the immediate UI.

## Fallback Selection

When deleting the selected node or a selected descendant, fallback should be deterministic:

1. next sibling after deleted node;
2. previous sibling before deleted node;
3. parent node;
4. first remaining visible node in depth-first order;
5. `null` when tree is empty.

When fallback is `null`, route to `/workshop/projects/${projectId}/estimates/${estimateId}` and render the existing empty estimate state.

## Rejected Alternatives

| Alternative | Rejected because |
| --- | --- |
| Rename in modal | Slower, less direct, and conflicts with the required row-input behavior. |
| Delete through server redirect | Causes visible navigation/reload behavior and gives server too much control over local UI state. |
| Wait for delete server response before hiding node | Feels laggy and contradicts instant behavior. |
| Use Context Menu for filter icon left-click menus | Context Menu is for right-click/long-press; future icon menus need Dropdown Menu or Popover trigger adapters. |
| Hand-rolled context menu | Recreates accessibility, focus, collision, and portal work Radix already solves. |

## Acceptance Criteria

- Right-clicking Group/Area rows opens the menu.
- `Rename` turns the target row into an inline input.
- `Enter`, `Escape`, blur, empty input, success, and failure states are tested.
- `Delete` opens confirmation.
- Confirmed delete removes the node instantly.
- Confirmed delete does not call `router.refresh()`.
- `deleteEstimateNode` does not call `redirect()`.
- Deleting selected node updates selection and URL fallback without full reload.
- Deleting unselected node does not navigate.
- Drag/drop still works after the menu wrapper is added.
- All visible app text remains at or below 12px.
