# 05 - UX, UI, And Accessibility Plan

## UX Principle

The sheet must feel like a stable workstation, not a page that periodically rebuilds itself. Optimization must preserve focus, scroll, selection, and spatial memory.

## Perceived Performance

Required behaviors:
- Keep route skeleton meaningful and immediate.
- Avoid parent fallback flashes during internal estimate transitions.
- Keep visible rows stable during background refresh.
- Show pending state for expensive non-urgent transitions without blocking typing.
- Preserve previous visible results during deferred search/filter recompute.

## Interaction-Specific Plan

### Typing In Row Cells

Target:
- Input echo is immediate.
- Only the edited row, owning table, and ancestor totals update.
- Remote cursor layer does not invalidate row/table render.

Future implementation:
- Use graph row patches and incremental total propagation.
- Keep row editor state local or row-scoped.
- Use stable row selectors so sibling rows do not receive changed prop references.

### Search And Facets

Current risk:
- `filterEstimateSheetNode`, `filterEstimateSheetNodeByFacets`, `collectSheetFacetOptions`, and `reorderEstimateSheetNodeRows` traverse and clone selected subtrees.

Plan:
- Defer search result rendering with `useDeferredValue`.
- Use `startTransition` for filter/group changes.
- Replace array `includes` facet checks with `Set`-backed selectors when active.
- Build facet option indexes incrementally from loaded rows.
- Define incomplete-subtree search behavior before server-assisted search:
  - Phase 1: loaded-tree-only, clearly scoped.
  - Later: optional server-assisted search if product requires global search across unloaded branches.

### Move Row Dialog

Current risk:
- `collectRowMoveNodeOptions` walks the full tree.
- Position select can create an option per row in the target node.

Plan:
- Target area picker becomes searchable and virtualized when option count exceeds threshold.
- Position picker becomes semantic:
  - top
  - bottom
  - before visible row
  - after visible row
  - type row number or search row label
- Do not render thousands of `<option>` elements.

### Expansion And Collapse

Plan:
- Keep expansion state separate from node data.
- Deduplicate in-flight subtree requests.
- On expansion, preserve scroll anchor and focused element.
- When data loads, insert measured virtual rows without blank gaps.

### Express Editor

Current behavior:
- Row virtualization disables for the table containing an active express editor.

Risk:
- A large single-area table can mount all rows while editor is open.

Plan:
- Keep focus-safe behavior initially.
- Add browser proof for active editor in a 5,000-row table.
- If the proof fails, isolate the express editor in a portal or pinned detail surface so virtualization can remain active.

## Component Editing UX (Add / Edit / Inline)

The estimate sheet has **three component editing surfaces** (see doc 22 for the full interop spec). Each has distinct UX requirements.

### AddComponentModal — Create Mode (Library Master)

- Triggered from `ComponentLibraryManager` (no `editingItem`). Creates a new library component via `createCostLibraryComponent`.
- Duplicate-name warning is **informational only** (debounced 300ms after Name blur); does not gate submission. Two components with identical names are valid (UUID-based identity).
- Variants: `variantSortOrder` derived from array position on create.
- Thumbnail uploads route to `/api/component-library/images`.

### AddComponentModal — Edit Mode (Row Projection)

- Triggered from the estimate sheet row (`editingItem` set, `imageUploadProjectId` set).
- Duplicate-name warning is **suppressed** (`isEditing` gate).
- Saves call `onComponentUpdated` → `updateRowItem` → `updateEstimateRowItem`. No direct Server Action from the modal.
- For library-linked rows: edits are row overrides; `linkState` flips to `linked-overridden`; library master is NOT mutated.
- For project-level rows: edits fan out to matching instances (server SQL join + client tree patch).
- Thumbnail uploads route to `/api/projects/images` (because `imageUploadProjectId` is passed by the estimate mount).
- Image URL normalization: existing raw storage paths are brokered through `/api/projects/images` first, then `/api/component-library/images` as fallback.

### EditComponentDrawer — Library Master Edit

- Triggered from the component library workspace (NOT the estimate sheet).
- Writes through `updateCostLibraryComponent` + `upsertCostLibraryComponentPriceOption` — mutates the library master.
- This is a **completely different code path** from AddComponentModal edit mode and must not be conflated.

### Inline Editing (Row Table Cells)

- **Library-linked rows**: render a read-only material card (`EstimateMaterialCardContent`); inline scalar edits (quantity, contingency, adjustment) are row overrides.
- **Project-level rows**: render the express inline editor (name/desc/brand/supplier/unit/unitCost fields); commits through `commitExpressFields` → `updateRowItem` with fan-out.
- **Inline variant pill**: library replacement (`replaceEstimateRowItemWithLibrary`) for linked rows; row update (`updateEstimateRowItem`) for project rows.
- **Inline blank-row insertion**: emits an express component template; legacy blank rows are upgraded to express on first inline edit.

### Component Editing Accessibility Requirements

- The AddComponentModal must trap focus while open and restore focus to the triggering element on close.
- Variant selection (pill, modal dropdown) must be keyboard-operable.
- Thumbnail upload must announce progress/success/failure to assistive tech.
- The duplicate-name warning must be announced as informational, not as a blocking error (it does not prevent save).
- Read-only material cards (library rows) must have correct `aria-label` / accessible name.
- Express inline editors must preserve focus across draft-then-commit (typing → blur commit).
- Fan-out must not move focus away from the actively edited row.

### Component Editing UX Acceptance Tests

- Open AddComponentModal in create mode, fill required fields, submit → component appears in library.
- Open AddComponentModal in edit mode from an estimate row → modal shows existing data; save updates row only.
- Create two library components with identical names → second allowed after acknowledging duplicate warning.
- Edit a library-linked row → `linkState` becomes `linked-overridden`; library master unchanged.
- Edit a project-level row → matching instances fan out; focus stays on edited row.
- Select a variant from the inline pill on a library row → library replacement fires.
- Select a variant from the inline pill on a project row → row update fires with fan-out.
- Upload a thumbnail in edit mode → routes to `/api/projects/images`.
- Insert a blank row and inline-edit → express component created; legacy row upgraded.
- Promote a project row to library → library component created; source row linkage updated.
- Detach a library-linked row → `linkState` becomes `detached`; row becomes project-level.

## Accessibility Requirements

- All virtualized rows must retain correct accessible names and interactive controls.
- Focus restoration after virtualization scroll must be tested.
- Search/filter pending states must not be announced excessively.
- Row move controls must remain keyboard-operable after replacing huge selects.
- Loading/truncation states must be visible and programmatically discoverable.
- Virtualization must not cause screen-reader-only duplicate rows.

## Visual Stability Requirements

- No overlapping sticky headers.
- No blank virtual gaps during scroll.
- Column resize must keep header/body alignment.
- Long labels must truncate or wrap within constraints.
- Collaboration cursors must not obscure active text inputs.
- Bulk action toolbar must not cover focused rows without scroll padding.

## UX Acceptance Tests

- Type in first, middle, and last visible row at stress size.
- Open express editor at stress size and type without unmounting.
- Search with 2,500 rows and clear search without losing selected node.
- Toggle supplier/category facets with long option names.
- Move a row to a node with 1,000 existing rows.
- Expand/collapse deep branches while scrolled.
- Resize columns while rows are virtualized.
- Trigger remote cursor updates during typing.

## Accessibility Proof Matrix (Pass-3 addition)

Full WCAG 2.2 AA criteria mapping, action-level proof matrix, state matrix, mobile/responsive plan, and reduced-motion plan live in **doc 29 (`29_ACCESSIBILITY_PROOF_MATRIX.md`)**. Doc 05 captures the intent; doc 29 is the binding proof contract.

Key WCAG 2.2 AA criteria most relevant to the estimate sheet (full list in doc 29):

- **1.3.1 Info and Relationships** — virtualized row tables use `<table>` + `<th scope>`; tree uses `role="tree"` + `role="treeitem"` + `aria-level`.
- **1.4.3 Contrast Minimum** — all in-app text meets 4.5:1 per DESIGN.md tokens.
- **1.4.10 Reflow** — content reflows at 320 CSS px without 2D scroll.
- **1.4.11 Non-text Contrast** — drop zone borders, focus indicators, branch carets meet 3:1.
- **2.1.1 Keyboard** — every action in doc 29 Action Matrix has a documented keyboard path. DnD has cut/paste keyboard equivalents.
- **2.4.7 Focus Visible** — focus ring visible on every interactive element.
- **2.5.1 Pointer Gestures** — DnD has keyboard alternatives.
- **2.5.2 Pointer Cancellation** — drag can be cancelled with Escape before drop.
- **2.5.3 Label in Name** — visible labels match accessible names.
- **3.3.1 Error Identification** — validation errors include row + field + reason.
- **3.3.3 Error Suggestion** — errors suggest corrections.
- **4.1.2 Name, Role, Value** — modal `role=dialog`, treeitem `role=treeitem`, etc.
- **4.1.3 Status Messages** — live region announcements per doc 29 State Matrix use `aria-live="polite"` or `"assertive"` appropriately.

## Mobile / Responsive Plan (Pass-3 addition)

The estimate sheet is a three-panel desktop-first workspace. Mobile/tablet scope is declared by OPEN-07 in doc 17; the default until resolved is:

| Breakpoint | Behavior |
|---|---|
| Desktop (≥1280px CSS) | Three-panel layout: tree / sheet / sidebar. All actions available. |
| Tablet landscape (1024-1279px) | Three-panel, narrower sidebar (collapsible). All actions available. |
| Tablet portrait (768-1023px) | Two-panel: tree + sidebar collapse to drawers. All actions available. |
| Mobile (≤767px) | View-only. Single panel: sheet only. Read-only navigation, scroll, expand/collapse. Edit CTA hidden with "Open on desktop to edit" message. |

Full proof plan in doc 29. Phase 4 must run responsive proof at each breakpoint.

## Reduced Motion (Pass-3 addition)

Respect `prefers-reduced-motion: reduce`:

- Disable collaboration cursor animations.
- Disable drag edge auto-scroll ramp.
- Disable toast/skeleton transitions.

Test: render sheet with `prefers-reduced-motion: reduce` and assert no rAF animation loops run.

## UX Acceptance Tests (Pass-3 expanded)

Added to the existing list:

- Navigate the entire sheet using only keyboard (Tab/Arrow/Enter/Escape).
- Open every modal/overlay via keyboard and close via Escape without focus loss.
- Run screen reader (VoiceOver or NVDA) through primary user flow; capture transcript.
- Render at 320 CSS px width without 2D scroll (mobile reflow).
- Toggle `prefers-reduced-motion: reduce` and confirm animations stop.

