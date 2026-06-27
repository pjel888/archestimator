# UX UI Accessibility Plan

## Design Posture

The estimate sheet is a dense work surface, not a marketing page. Interactions should feel like a resilient spreadsheet: local first, quiet on success, explicit on failure, and fast enough that users do not think about saving.

Design authority for this planning pass:

- Follow `DESIGN.md` dense operational-tool guidance: restrained work-focused layout, predictable navigation, scanning/comparison first.
- Reuse existing primitives from `src/components/ui/` where practical before adding custom controls.
- Preserve estimate-cell behavior rules from `DESIGN.md`: spreadsheet-like editing, clear focus, bounded truncation, and stable row/table dimensions.
- Avoid decorative redesign, card-heavy sheet sections, oversized hero-like text, or layout changes that make the grid secondary.

## State Matrix

Every state below needs visible UI behavior, planned proof, and an owner before implementation can claim UX readiness.

| State | User-Facing Contract | Proof |
|---|---|---|
| Loading | Sheet-level skeleton is bounded to the sheet surface; route parent should not show extra overlay for normal transitions. | Route loading/transition proof and skeleton count. |
| Empty | No selected node or empty node shows Select Area/Add Area/Insert Row paths instead of a blank pane. | Empty-state DOM test. |
| Success | Routine save success does not interrupt editing with global toasts. | No-toast DOM test for row/tree success. |
| Partial success | Bulk delete/restore and multi-row moves show which rows succeeded, which failed, and available retry/revert actions. | Partial-failure DOM/server-action test. |
| Error | Error names the row/node/action, keeps the draft when possible, and offers Retry/Revert/Delete as appropriate. | Failure-state DOM/a11y tests. |
| Conflict | Stale revision refreshes authoritative row/tree data and blocks overwrite until the user reviews/retries. | Stale-conflict test. |
| Permission denied | Unauthorized mutation/read attempts fail closed without exposing private row/source/image/history data. | Security route/RPC tests plus UI denial state. |
| Offline/degraded | Local editing remains available where safe; queue/degraded state appears within 500ms. | Offline/degraded e2e. |
| Retry | Retry reuses original mutation ID unless a typed conflict requires a new user decision. | Idempotency/retry test. |
| Timeout | Slow save escalates to degraded local status without freezing unrelated rows/nodes. | Fake-timer queue-age test. |
| Cancellation | Cancel, Escape, failed drop, pointer cancel, and window drop clear drag/dialog pending state. | DnD cancellation DOM/browser proof. |

## Feedback Model

| State | Current Issue | Target |
|---|---|---|
| Routine saving | Global `Saving row changes...` toast from `EstimateSheetContent.tsx:953-960` interrupts normal editing. | No global toast. Use local row/node pending state, subtle gutter/status, or a single polite live region. |
| Routine saved | Global `Saved.` toast from `EstimateSheetContent.tsx:962-967` creates noise during repeated edits. | No visible interruption. Saved state may update an unobtrusive status timestamp or disappear. |
| Failure | Current row failures use global toast and rollback callbacks. | Local actionable alert with affected row/node, reason, Retry, Revert/Delete, and stale-data refresh when applicable. |
| Tree saving | `EstimateSheetTree.tsx:601-630` reports reorder/add/rename saves through global toast. | In-tree status near the action; failure only interrupts if recovery is needed. |
| Destructive undo | Row/tree delete Undo is toast-bound for 8000ms. | Durable "recently deleted" or activity-history restore entry; toast may be a convenience, not the only recovery path. |

## Interaction Plan

| Interaction | Required UX |
|---|---|
| Row add | Created row focuses first editable field, appears instantly, and shows inline failed-draft state if persistence fails. |
| Row edit | Cell remains editable while persistence queues; unrelated rows/actions remain available. |
| Row move | Drag, table drop-to-end, tree drop, and Move dialog all use the same coordinator and local pending state. |
| Component replace/move | Picker/dialog path must state the current row and target row; failures restore both source and target rows. |
| Tree drop | Row-item drops into tree show a local target indicator and clear drag state after success/cancel/failure. |
| Empty selected node | Center sheet shows a concise empty state with Select Area and Add Area paths. |
| Load-limited sheet | Movement controls are disabled with inline reason; scalar edits and safe actions remain available. |

## Dense Sheet Ergonomics

| Concern | Requirement |
|---|---|
| Row height and columns | Keep rows compact and stable; hover, pending, and error states must not change row height. |
| Sticky context | Header, selected node context, and bulk toolbar must stay readable without covering editable cells. |
| Column resize/preferences | Resize handles remain icon/affordance-driven; save failures do not block cell editing. |
| Text overflow | Descriptions, supplier names, and source metadata truncate/wrap predictably without overlapping controls. |
| Selection and virtualization | Selection state survives virtual scrolling; active editor exception to virtualization must be measured and bounded. |
| Status placement | Pending/failure chips or gutter states must not occlude the current cell, drag handles, or totals. |
| Grid dominance | Dialogs, side panels, and recovery affordances support the grid; they do not replace the sheet with card layouts. |

## Accessibility Requirements

| ID | Requirement | Evidence/Plan |
|---|---|---|
| A11Y-DND-001 | Every drag action has keyboard equivalent. | Row move dialog exists at `EstimateSheetContent.tsx:2196-2267`; keep/extend it for all row move targets. |
| A11Y-DND-002 | Touch users can move rows/components. | Move dialog and component picker must be reachable without HTML5 drag. |
| A11Y-LIVE-001 | Background persistence avoids noisy announcements. | Use one polite live region for queue/degraded state; failures use `role="alert"`. |
| A11Y-FOCUS-001 | Dialog focus is managed. | Modal/dialog opener focus is restored; first meaningful control receives focus; Escape closes unless unsafe. |
| A11Y-TABLE-001 | Table semantics stay intact. | Keep `<th scope="col">`, real buttons, labels, and row/cell aria labels in `row-table.tsx`. |
| A11Y-DESTRUCTIVE-001 | Undo/confirmation is discoverable. | Destructive row/tree/tab/component actions expose confirmation or durable restore beyond transient toast. |
| A11Y-TOUCH-001 | Dense controls remain practical. | Keep compact visuals but ensure hit areas for move/delete/details and picker controls are usable on touch. |
| A11Y-VIRTUAL-001 | Virtualized focus restoration is tested. | Create/move/delete undo and route/tree selection changes must scroll/focus correctly. |

## Per-Action Accessibility Proof

| Action Class | Keyboard Path | Focus Contract | Screen Reader Contract | Extra Proof |
|---|---|---|---|---|
| Row create/edit/delete | Tab/arrow/editor controls and toolbar buttons | Created row focuses first useful editable cell; failed draft keeps focus or restores to row. | Routine saves are polite or silent; failures use actionable alert text. | DOM + a11y assertions. |
| Row move/reorder | Move row dialog plus keyboard reorder where available | Dialog restores opener; moved row focuses when visible or after scroll. | Target node and move result are announced without repeated global toasts. | Keyboard DOM plus browser proof for DnD-only behavior. |
| Tree/tab reorder | Menu/buttons/keyboard alternative to drag | Reordered item remains focused; invalid target returns focus to source. | Position or failure reason is announced. | DOM + selected-node reload proof. |
| Component/library/template insert | Picker/search/dialog path | Picker first field focuses; selected row context remains visible. | Source/trust/failure state has accessible label. | DOM + trust/security tests. |
| Destructive recovery | Confirmation or durable recovery panel | Focus moves into confirmation/recovery, then restores to logical next row/node. | Deletion and restore status are announced once. | Delete/restore a11y tests. |

## Copy Guidelines

| Situation | Copy |
|---|---|
| Routine pending | "Saving changes" only in local status or live region; not a toast. |
| Failed row edit | "Couldn't save this row. Retry or revert." |
| Stale revision | "This row changed elsewhere. Review the refreshed row before retrying." |
| Load-limited row move | "Load the full estimate before moving rows." |
| Offline/degraded | "Working locally. Changes will retry when the connection returns." |
| Destructive restore | "Recently deleted rows" / "Restore" entry in activity or recovery panel. |

## Tests

- DOM tests for no routine save toast.
- DOM tests for row-local failure alert with Retry/Revert.
- Keyboard tests for Move row dialog and tab/tree reorder alternatives.
- A11Y tests for dialog focus restoration and `role="alert"` failures.
- Browser test for content-to-tree drop clearing drag state and keeping move handles active.
- Visual QA only where browser-only layout risk exists: dense-table readability, text/control collision, status occlusion, zoom/reflow, reduced motion, and grid dominance.
