# 29 - Accessibility Proof Matrix (WCAG 2.2 AA)

## Purpose

Improve-Plan-Prompt requires every user-facing plan to include:

- A state matrix limited to states already required by the estimate-sheet contract. This plan does not invent offline queues, partial fan-out, cancellable writes, or a new session modal.
- An action-level accessibility proof matrix (keyboard path, focus target/restoration, accessible name/live-region, proof type).
- WCAG 2.2 AA criteria-to-test mapping for the user-facing surface.

Without these, UX readiness is capped at 84. This document closes that cap for the estimate sheet surface.

This is a planning/reference document. It does not authorize code changes. WCAG references are based on the WCAG 2.2 Recommendation (11 October 2023); verify current text at https://www.w3.org/TR/WCAG22/ before implementation.

## Scope

In scope: the Project Estimate Sheet surface and its overlays — `EstimateWorkspaceClient`, `EstimateSheetTree`, `EstimateSheetContent`, virtualized branches, virtualized row tables, inline cell editors, AddComponentModal, EditComponentDrawer, CommandPalette, ActivityHistoryModal, RowDetailsModal, drag-and-drop interactions, collaboration cursor overlays.

Out of scope: landing pages, marketing routes, auth pages, public share routes (covered by their own plan packs).

## State Matrix

Every persistent sheet state must have a documented user experience. "Persistent" means the state is visible for more than one paint frame or requires user action to dismiss.

| State | Trigger | Visual | Screen reader announcement | Keyboard action available | Proof |
|---|---|---|---|---|---|
| Loading (initial route) | Cold direct navigation | `EstimateSheetRouteSkeleton` | "Loading estimate sheet." (polite) | None (focus in URL bar) | U0.3 browser spec: skeleton visible ≤ 1 episode per run |
| Loading (warm transition) | Hover-prefetch then click | Skeleton if hover prefetch incomplete | "Loading." (polite, single) | Tab navigation works | U0.3: parent fallback episodes = 0 |
| Loading (subtree expansion) | User expands a collapsed node | Inline placeholder rows; spinner in node header | "Loading children." (polite) | Focus stays on expand toggle | U0.3 + existing cursor-isolation test pattern |
| Loading (mutation in flight) | Optimistic mutation pending | Subtle pending indicator on touched row(s) | No announcement (too chatty) | Edit continues; Cancel available | U5.1 entity patch test |
| Empty (no estimates) | New project, no estimates | Empty state with "Create estimate" CTA | "No estimates yet. Press Create estimate." | CTA reachable by Tab + Enter | New vitest: empty-state-renders |
| Empty (no rows in node) | Area with 0 rows | "Add row" affordance | "No rows in this area." | Add row reachable | New vitest |
| Success (mutation) | Server confirms | Inline state refresh; no toast spam | Silent (state change is its own signal) | — | U5.1 |
| Error (mutation rollback) | Server rejects, optimistic rolled back | Inline error indicator on touched row | "Edit failed. Reverted." (assertive) | Retry / dismiss | U5.1 entity-scoped rollback test |
| Error (route load) | Route failed to load | Error boundary with retry | "Failed to load estimate. Press retry." | Retry reachable | Existing error boundary test |
| Conflict (row_revision mismatch) | Stale revision rejected | Conflict indicator | "Another user edited this row. Refresh to see their changes." (assertive) | Refresh / overwrite | U5.3 conflict test |
| Permission denied | canEditEstimate = false | Read-only mode; edit affordances hidden | Silent (mode is its own signal) | Read-only navigation | Existing authz tests (17) |
| Timeout | Long-running action | Inline timeout indicator | "Action taking longer than expected." (polite) | Cancel available | New: timeout test |
| Truncation (over-limit) | Route payload capped | Truncation banner with count | "Showing first 1,500 nodes and 5,000 rows. Some content not loaded." (assertive) | Acknowledge button | REQ-F11 + over-limit fixture test |

## Action-Level Accessibility Proof Matrix

Every primary user action must have an explicit keyboard path, focus behavior, accessible name, and proof method.

| Action | Keyboard path | Focus target | Focus restoration | Accessible name | Live region | Proof |
|---|---|---|---|---|---|---|
| Open estimate route | Tab to link, Enter | First focusable in sheet | N/A | Link aria-label includes project + estimate name | None | U0.3 browser spec |
| Switch tab | Tab to tab control, Arrow keys, Enter | Selected tab button | Stays on tab control | `aria-label="Tab: <name>"` | Selected state announced | Existing tab tests |
| Select branch (left tree) | Tab to tree, Arrow Up/Down | Selected branch node | Stays in tree | Branch name + level + expanded state via aria-label | "Selected <branch name>." (polite) | Existing tree a11y |
| Expand/collapse branch | Tab to expand toggle, Enter | Toggle button | Stays on toggle | `aria-label="Expand <branch>"` / "Collapse …" | "Expanded." / "Collapsed." (polite) | U0.3 browser spec |
| Edit row cell (inline) | Tab into row, Tab to cell, Enter/F2 | Cell editor input | On blur: restores to cell | Input aria-label includes row + field | Value change silent | U0.3 + R29 stable order test |
| Save row edit | Blur (auto-commit) or Enter | Next focusable cell or row | On blur: stays in row | — | "Saved." (polite, debounced) | U5.1 |
| Insert blank row | Tab to "Add row" button, Enter | New row's first cell | New row's first cell | `aria-label="Add row to <node>"` | "Row added." (polite) | New: blank-row-insert a11y test |
| Insert from library (DnD) | Keyboard equivalent: menu → Enter on item | New row | New row | Drop zone aria-label includes target node | "Component inserted." (polite) | New: keyboard-equivalent insert test |
| Insert from template (DnD) | Keyboard equivalent: menu → Enter on template | First new row | First new row | Same as above | "Template inserted." (polite) | CI-QA-12 |
| Move row (DnD) | Keyboard: Cut (Ctrl+X) → navigate → Paste (Ctrl+V) | Moved row | Moved row | Row aria-label includes "moved" state | "Row moved." (polite) | New: keyboard-move test |
| Open AddComponentModal | Tab to trigger, Enter | First focusable in modal | On close: trigger button | Modal aria-label, role=dialog | "Open component editor." (polite) | Existing modal a11y tests |
| Close AddComponentModal | Escape | Trigger button | Trigger button | Close button aria-label | "Closed." (polite) | Existing |
| Submit AddComponentModal | Tab to Save, Enter | On success: previously focused row | Row | Save button aria-label="Save component" | On error: "Validation error." (assertive) | CI-QA-03 |
| Open CommandPalette | Cmd+K / Ctrl+K | Search input | On close: trigger | role="dialog", aria-label="Command palette" | "Command palette open." (polite) | Existing render-relief tests |
| Activate express editor | Tab to material cell, Enter/F2 | First express field | On commit/blur: cell | Cell aria-label | "Editing." (polite) | R06 browser proof |
| Promote row to library | Context menu → Enter | Confirmation dialog | Dialog | role="alertdialog" | "Promote to library?" (polite) | CI-QA-13 |
| Detach library-linked row | Context menu → Enter | Row | Row | Menu item aria-label | "Detached from library." (assertive) | CI-QA-05c |
| Delete row | Context menu → Enter, confirm | Next row | Next row | role="alertdialog" | "Delete this row? This cannot be undone." (assertive, since restore is unsupported on D1 — GAP-07) | CI-QA-17 |
| Bulk delete | Select rows, toolbar → confirm | First remaining row | First remaining row | role="alertdialog" with count | "Delete N rows? This cannot be undone." (assertive) | REQ-CRUD-05 |
| Trigger cursor broadcast | N/A (automatic) | — | — | — | Silent | Existing cursor-isolation tests |
| Receive cursor broadcast | N/A (automatic) | — | — | Overlay aria-hidden=true (decorative) | Silent | Existing cursor-isolation tests |

## WCAG 2.2 AA Criteria Mapping

WCAG 2.2 AA success criteria most relevant to the estimate sheet. Each row maps to a concrete observable pass condition and proof method. Verify current criteria text at https://www.w3.org/TR/WCAG22/ before implementation.

### Principle 1: Perceivable

| Criterion | Intent | Worksheet pass condition | Proof |
|---|---|---|---|
| 1.1.1 Non-text Content (A) | All images have text alternatives | Every image/icon has `alt` or `aria-label`; decorative icons have `alt=""` | Manual + axe audit on estimate sheet route |
| 1.3.1 Info and Relationships (A) | Programmatic relationships (table headers, list semantics) | Row tables use `<table>` + `<th scope>`; tree uses `role="tree"` + `role="treeitem"` + `aria-level` | DOM audit |
| 1.3.2 Meaningful Sequence (A) | DOM order matches visual order | Virtualized row DOM order matches logical sort order even when windows are off-screen | U0.3 browser spec: scroll + read DOM order |
| 1.4.3 Contrast Minimum (AA) | Text contrast ≥ 4.5:1 (normal) / 3:1 (large) | All in-app text meets 4.5:1 against background per DESIGN.md tokens | Automated contrast audit |
| 1.4.10 Reflow (AA) | Content reflows at 320 CSS px without incoherent overlap | View-only mobile state follows `DEC-AUTO-008`; any row-table horizontal overflow is explicit and contained | Mobile proof |
| 1.4.11 Non-text Contrast (AA) | UI component boundaries ≥ 3:1 | Drop zone borders, focus indicators, branch expand carets all meet 3:1 | Manual + automated |
| 1.4.13 Content on Hover or Focus (AA) | Hoverable, dismissible, persistent hover content | Tooltip on truncated cell names is hoverable + dismissible | Manual audit |

### Principle 2: Operable

| Criterion | Intent | Worksheet pass condition | Proof |
|---|---|---|---|
| 2.1.1 Keyboard (A) | All functionality available via keyboard | Every action in Action Matrix has a documented keyboard path | Manual + automated keyboard walkthrough |
| 2.1.2 No Keyboard Trap (A) | Focus can leave any component via keyboard | Modal close + tab cycles correctly; CommandPalette Escape works | Manual audit |
| 2.4.3 Focus Order (A) | Focusable elements receive focus in meaningful order | Tab order matches visual order in sheet, tree, modal | Manual keyboard walkthrough |
| 2.4.7 Focus Visible (AA) | Visible focus indicator on all focusable elements | Focus ring visible on every interactive element; never removed via `outline: none` without replacement | Manual + automated |
| 2.5.1 Pointer Gestures (A) | Pointer move has a keyboard alternative | The semantic move command from `DEC-AUTO-003` supports top/bottom/before/after selection without drag gestures | Browser keyboard test + manual review |
| 2.5.2 Pointer Cancellation (A) | Down-event trigger; up-event cancellation | Drag can be cancelled with Escape before drop | Manual |
| 2.5.3 Label in Name (A) | Visible label matches accessible name | "Save" button has accessible name "Save"; no icon-only buttons without aria-label | Manual + automated |

### Principle 3: Understandable

| Criterion | Intent | Worksheet pass condition | Proof |
|---|---|---|---|
| 3.2.1 On Focus (A) | Focus alone does not trigger context change | Focusing a row does not navigate or open a modal | Manual |
| 3.2.2 On Input (A) | Changing a setting does not auto-navigate unless warned | Editing a cell does not navigate; tab switch does not lose changes without warning | Manual |
| 3.3.1 Error Identification (A) | Errors identified and described in text | Validation errors include row + field + reason | Existing modal a11y tests |
| 3.3.3 Error Suggestion (AA) | Errors suggest correction | "Unit cost must be a number" not just "Invalid" | Manual |

### Principle 4: Robust

| Criterion | Intent | Worksheet pass condition | Proof |
|---|---|---|---|
| 4.1.2 Name, Role, Value (A) | All UI components have name/role/value | Modal role=dialog, treeitem role=treeitem, etc. (see Action Matrix) | DOM audit + axe |
| 4.1.3 Status Messages (AA) | Status messages announced without grabbing focus | Live region announcements per State Matrix use `aria-live="polite"` or `"assertive"` appropriately | Manual + screen reader walkthrough |

## Mobile / Responsive Plan

`DEC-AUTO-008` declares the MVP scope: tablet editable at >=1024 px, smaller mobile layouts view-only with explicit truncation/read-only state.

| Breakpoint | Behavior |
|---|---|
| Desktop (≥1280px CSS) | Three-panel layout: tree / sheet / sidebar. All actions available. |
| Tablet landscape (1024-1279px) | Three-panel layout, narrower sidebar (collapsible). All actions available. |
| Tablet portrait (768-1023px) | Two-panel: tree collapses to drawer; sheet full-width; sidebar collapses to drawer. All actions available via drawer toggles. |
| Mobile (≤767px) | View-only. Single panel: sheet only, no inline editing. Truncation banner prominent. Read-only navigation, branch expand/collapse, scroll. Edit CTA hidden with "Open on desktop to edit" message. |

Test: Phase 4 responsive proof at each breakpoint. Assert no 2D scroll at 320px (WCAG 1.4.10).

If future first-user evidence reverses `DEC-AUTO-008`, create a new decision and update the linked proof scenarios.

## Reduced Motion

Per WCAG 2.2 (and user expectation), respect `prefers-reduced-motion: reduce`:

- Disable collaboration cursor animations (overlay still shows positions as static badges).
- Disable drag edge auto-scroll ramp (instant scroll instead of linear ramp).
- Disable toast/skeleton transitions.

Test: render sheet with `prefers-reduced-motion: reduce` and assert no rAF animation loops run.

## Validation Plan

- **Automated**: installed Playwright role/name/state, focus-order, keyboard-operation, `aria-rowindex`/`aria-setsize`/`aria-posinset`, live-region, and reduced-motion assertions in `e2e/estimate-sheet-performance.spec.ts` and `e2e/estimate-sheet-component-interop.spec.ts`. No unapproved dependency is added.
- **Manual keyboard walkthrough**: documented script covering every action in Action Matrix. Captured as video/transcript artifact in Phase 0.5 evidence.
- **Screen reader walkthrough**: VoiceOver (macOS) + NVDA (Windows) pass over primary user flow. Captured as transcript artifact.
- **WCAG criteria audit**: each criterion in this matrix checked off with proof artifact path.

## Verification

- Planning provenance: source audit; canonical readiness uses independent architect and critic receipts.
- WCAG 2.2 references: verify against https://www.w3.org/TR/WCAG22/ before implementation; criteria IDs and levels are stable but advisory techniques update.
- This document must be validated against Phase 4 render boundary implementation BEFORE Phase 4 exits (R30).
