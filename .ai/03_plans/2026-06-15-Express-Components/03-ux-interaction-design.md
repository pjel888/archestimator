---
title: Express Components UX Interaction Design
type: docs
date: 2026-06-15
---

# Express Components UX Interaction Design

## Experience Principle

`Add row` should create a usable row immediately. The preferred material-cell experience is editable in place without forcing the user to pick a library component first, but inline editing is gated by the one-day spike in `00-scope-and-premise-decision.md`. If that spike fails, U4 pivots to a compact quick-add modal/popover before implementation begins.

The row should still feel like the existing estimate sheet: compact, spreadsheet-like, quiet, keyboard-friendly, and compatible with drag/drop replacement.

## Inline Material Cell

Replace the blank dashed slot with an express material editor when the row is an express placeholder or express row.

Fields:

- Name/material, one-line editable text.
- Description, compact multi-line or expanding text area within the material cell.
- Unit, small inline select/input.
- Unit cost, compact money input.
- Optional image URL/source, icon button for set/clear using existing image primitives only. File upload is out of the first pass unless storage policy work is added to scope.
- Supplier, optional inline text in the first pass; an existing supplier picker can replace it later if that does not widen row height or focus behavior.

Commit model:

- The row may focus immediately after `Add row`, but non-initial field commits are buffered until the insert mutation returns the persisted row and row revision.
- If insert fails, keep a visible draft row with Retry and Delete actions. Retry must reuse the same client row id or mutation correlation so duplicate draft rows are not created.
- Blur and Enter commit the focused field.
- Escape reverts the focused field to the last saved value.
- Tab follows normal browser focus order through express fields, then numeric cells.
- Express text fields must not use `handleEstimateCellKeyDown`. ArrowLeft, ArrowRight, Home, and End pass through to the caret. ArrowUp/ArrowDown never move rows from express text fields; grid movement resumes only after focus leaves the editor. Numeric cells keep the existing grid handler.
- Dirty/saving/saved/failed may use existing save primitives where appropriate, but insert-pending and promotion states are separate from the five-value global `saveState`; see doc 09 for per-row flags and aria-live behavior.

Visual states are fully specified in `09-virtualization-keyboard-focus-and-state-spec.md`. Minimum states:

- New/empty, creating, draft-insert-failed, clean, dirty-focused, saving, saved, failed, detached, linked-clean, linked-overridden, source-changed, promoting, and promote-failed.
- New express row focuses the name field through `data-express-field="name"`; the existing quantity-cell `pendingFocusRowId` path must branch for express rows.
- Failed field: inline error, Retry/Revert actions, `aria-invalid`, `aria-describedby`, and no silent rollback.

## Project Folder In Components

This is a fast-follow U6 surface, not day-0. U1-U4 must still preserve metadata and project-source copy semantics so this projection can be added without changing express row identity later.

The Components tab should gain a Project folder/view that contains project-local component rows.

Recommended IA:

- Keep Library top-level tabs unchanged: Overview, Components, Templates.
- In Components default folder mode, add a virtual `Project` root only when explicit `projectId` plumbing is present. This is net-new route/query/context work for the workspace Components route, not an existing guard.
- The workspace-only Components route continues to show workspace library folders and must not fetch project rows until a project is selected or supplied.
- The `Project` root contains `Express` and `Project-specific` child groups for the first implementation.
- Express leaves are rows with express metadata. Project-specific leaves are detached rows. Linked-overridden rows are excluded until product explicitly treats them as project-local components.
- Component leaves should use the same tree row density and `Package`/component icon treatment as library component leaves.
- Promotion to library-wide is an action on each project component row/card.

Required visible states before U6 implementation:

- no explicit project context: Project root absent and no project-row fetch
- loading project projection: virtual Project root or host surface shows existing compact loading treatment without blocking workspace library folders
- empty selected project: Project root exists with empty-state copy `No project components yet`
- unauthorized or mismatched project id: no Project rows, no leaked labels, and a neutral unavailable state
- projection disabled by flag: Project root absent while persisted express rows remain readable in estimates
- promotion in progress or just succeeded: affected Project leaf shows busy/reconciled state until cache invalidation removes stale Express-only state
- projection query failure: compact inline failure with Retry; workspace library folders remain usable

Do not write the virtual Project folder into `library_folders`. That table is workspace library organization, and mixing project row projections into it would blur permissions and drag/drop semantics.

## Project-Specific Icon Behavior

The make-project-specific control should be available on every linked library-backed row, including multiple instances of the same component.

Expected behavior:

- Linked clean row shows Cube action.
- Linked overridden row still shows Cube action.
- Source changed row shows Cube action.
- Detached row shows `Project-specific` badge instead of Cube action.
- Express row shows an `Express` or `Project` badge and a promote action, not the make-project-specific action.
- Blank placeholder state should disappear once express row creation is active.

The bug fix should not depend on hover order, row index, or duplicate count. It should derive from row source/link fields.

## Accessibility

The implementation must preserve the existing tree and row contracts:

- Material editor fields need explicit labels such as `Component name`, `Component description`, `Unit`, and `Unit cost` qualified by row name when possible.
- Focusable controls need visible focus rings matching existing accent treatment.
- Insert, save, retry, delete-draft, promotion, and failed-save states need the live-region politeness levels and copy defined in doc 09. Failed fields need `aria-invalid` and `aria-describedby` pointing at `express-row-{rowId}-{field}-error`.
- The Components project folder must reuse `src/components/ui/tree.tsx` row wiring: `role="treeitem"`, `aria-expanded`, `aria-selected`, `aria-current`, `aria-grabbed`, and drop effects where relevant.
- Icon-only actions need accessible names and titles.

## Layout Constraints

The material column currently uses `minmax(160px,1fr)` in `src/components/workshop/estimate-sheet/rows/row-table.tsx:88`. Express editing will increase content pressure.

Implementation constraints:

- Day-0 disables row virtualization while exactly one express editor is active. This avoids relying on unproven dynamic measurement while the current table uses `content-visibility:auto`, `contain-intrinsic-size:96px`, and manual `translateY(start - scrollMargin)` positioning. Dynamic `measureElement` work is a follow-up only after those constraints are reconciled.
- Use truncation in clean state and scrollable field interiors only after the measured active-row path is verified.
- Avoid text overlap at narrow workshop widths.
- Keep cards at `rounded-xs`, hairline borders, neutral surfaces, and regular Phosphor icons per `DESIGN.md`.
- Express labels, placeholders, helper text, errors, badges, and field values meet WCAG AA. Load-bearing express text uses `#5D5D5D` or stronger; active values use `#3D3D3D`; `#7F7F7F` and opacity-muted text are non-text decoration only for this feature.
- Product UI type stays on the app scale: 12px max for titles, 10px controls/table/body, 8-9px labels, zero letter spacing.
- Clean-state row height should remain close to the current sheet density; active editor layout may expand but must keep field order name, description, unit, unit cost, supplier/image actions, then recovery/actions. Descriptions wrap or scroll within the active editor without covering numeric cells or row controls.
- Keystrokes in one express editor must not rebuild the full row tree. Editor state is row-scoped, row props/callbacks stay stable where practical, Project projection data is indexed/memoized by row id plus express id, and promotion invalidates only the named cache families in docs 07 and 12.

## Mobile / Touch

Day-0 is optimized for full-browser desktop/laptop estimate editing, but it must not be impossible on narrow/touch workshop viewports. Touch editing may use native text inputs and on-screen keyboard behavior, but no express action may be hover-only. Narrow/touch QA must prove name/description/unit/cost are reachable, recovery actions are tappable with at least the existing toolbar-icon hit target, the active row does not overlap neighbors while virtualization is disabled, and viewport resize during the on-screen keyboard does not trap focus. If implementation detects `window.visualViewport`, use it for recovery-action visibility checks; otherwise rely on focused-field scroll-into-view and browser default input behavior.

## Non-Goals

- No marketing page or onboarding explainer.
- No modal for ordinary express field editing after the inline spike passes; a compact quick-add modal/popover is the approved fallback if it fails.
- No new top-level Library tab.
- No full component-library editor embedded inside the estimate row.
