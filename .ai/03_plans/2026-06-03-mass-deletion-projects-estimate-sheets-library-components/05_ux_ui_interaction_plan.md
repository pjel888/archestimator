# 05 UX UI Interaction Plan

## Purpose

This document defines the user-facing implementation plan for preview-first destructive interactions. It maps current entry points to future UI changes and keeps the interaction model consistent with `DESIGN.md`.

## Design-System Constraints

- Reuse `src/components/ui/button.tsx`; destructive buttons use `variant="danger"`.
- Reuse `src/components/ui/modal.tsx` for new confirmation flows.
- Use `src/components/ui/search-input.tsx`, `HeaderIconToolbar`, `Badge`, and `Toast` where relevant.
- App text remains `8px` to `12px`, SF/system regular or medium, zero tracking, `rounded-xs`.
- Icons use regular Phosphor or existing approved icon style.
- Do not add `window.confirm()` to new flows. Replace existing `window.confirm` project/folder paths when touched.

## Shared Bulk Action Pattern

States:

1. idle
2. selecting
3. preview loading
4. preview ready
5. confirmation input valid/invalid
6. executing
7. success
8. failed with retryable or blocking issues

Shared UI pieces:

- target-specific selection state;
- compact bulk toolbar;
- `BulkDestructivePreviewModal` shared shell with target-specific body;
- typed confirmation input;
- issue list for `notFoundIds`, `forbiddenIds`, and blockers;
- success/failure toast.

Modal requirements:

- `role="dialog"` from shared `Modal`;
- title includes target and count;
- preview sections use concise count rows;
- blockers are visually distinct;
- confirm button disabled until typed phrase matches and no blockers exist;
- Escape and overlay close are disabled while executing or must show a non-destructive close only after aborting local UI state, not DB state.

## Existing UI Entry Points

| Surface | Current entry | New behavior |
|---|---|---|
| Projects | `ProjectsPageClient` list/cards; details modal delete button. | Add card checkboxes and toolbar. Replace details delete with single-project preview modal. |
| Estimate sheets | `ProjectEstimatesTable` has checkbox state and disabled trash. | Enable single delete after backend exists; add selected-count toolbar for bulk delete. |
| Library components | `ComponentLibraryManager` card grid and details panel. | Add card checkbox selection and archive toolbar. Optional hard delete remains hidden until Phase 6. |

## Projects Bulk Delete Flow

### Selection

- Add checkbox hit target to each `LiveProjectCard`.
- Checkbox is disabled for `accessKind` values `sheet-member` and `pending-invite`.
- Checkbox is disabled if preview/access metadata shows actor cannot manage/delete the project.
- Card click still opens/navigates as today; checkbox click does not navigate.
- `Select visible` selects currently filtered visible projects only.
- `Select all matching search` is out of scope.

### Toolbar

Placement: above grid/list content, not floating over cards on small screens.

Controls:

- selected count;
- clear selection;
- preview/delete button.

Disabled state:

- delete disabled if selected count is zero;
- if mixed eligible/ineligible selection is possible, modal preview must show ineligible ids and execute only when user deselects or target set is eligible.

### Modal

Title examples:

- `Delete project?`
- `Delete 4 projects?`

Confirmation phrase:

- single: project name or project code if code exists;
- multiple: `DELETE PROJECTS`.

Preview content:

- project names/codes, first 5 plus count remainder;
- estimate/node/row counts;
- Activity/version counts;
- favorites/collaboration/invitation counts;
- active publication blockers;
- project image storage count;
- irreversible warning.

Post-success:

- clear selection;
- `router.refresh()`;
- navigate to `/workshop/projects` if user was inside a deleted project context;
- show warning toast if storage cleanup failed.

## Estimate Sheets Single Delete Flow

Current button: disabled Trash in `ProjectEstimateRowActions`.

Implementation:

- enable only after `previewBulkDeleteEstimateSheets` and `executeBulkDeleteEstimateSheets` exist;
- clicking trash opens preview modal for one estimate;
- do not execute from the row action directly;
- keep duplicate/open/history buttons unchanged.

Confirmation phrase:

- single: sheet code, for example `ES-001`;
- fallback to estimate name if no sheet code exists.

Post-success:

- table refresh via route refresh and query invalidation;
- if the user is on `/workshop/projects/{projectId}/estimates/{nodeId}` for a deleted sheet, redirect to `/workshop/projects/{projectId}/estimates`;
- charts route revalidated by server action.

## Estimate Sheets Bulk Delete Flow

Leverage current `selectedEstimateIds` state in `ProjectEstimatesTable`.

Toolbar placement:

- above the table body, below page header/search.

Controls:

- selected count;
- clear;
- select visible;
- delete selected.

Keyboard:

- row checkbox is keyboard focusable;
- Space toggles checkbox;
- Escape clears selection when focus is in table selection mode and no modal is open;
- Enter on Delete Selected opens preview.

Modal preview:

- selected sheet codes/names;
- node and row item count;
- Activity/version count;
- favorites/members/invitations;
- active publication blockers;
- warning that deleting sheets removes Activity history for those sheets.

Error states:

- `forbiddenIds`: show generic count plus "Some selected sheets are no longer editable."
- `notFoundIds`: show "Some selected sheets were already deleted or moved."
- active publication blocker: show publication count and tell user to revoke/update shared link first.

## Library Component Bulk Archive Flow

### Selection

- Add checkbox to `ComponentCard` in `ComponentLibraryManager`.
- Checkbox toggles card selection without changing active details panel unless the user clicks the card body.
- Selected ids persist only while user remains in the library page.
- Folder tree selection remains navigation/filter state, not bulk selection.

### Toolbar

Controls:

- selected count;
- clear;
- archive components;
- optional hard delete control hidden until Phase 6.

Archive button tone:

- neutral/secondary by default, because archive is reversible lifecycle state;
- modal warning still explains that components disappear from default insert/search.

### Archive Modal

Confirmation phrase: `ARCHIVE`.

Preview content:

- component names, first 5 plus remainder;
- already-archived count;
- linked estimate row count;
- linked template row count;
- variant/attachment/history counts retained;
- explanation that existing estimate rows keep snapshots.

Post-success:

- clear selection;
- refresh library data;
- archived components disappear only after implementation adds lifecycle filters;
- show "Archived N components" toast.

## Optional Component Hard Delete Flow

Phase 6 only.

Visibility:

- hidden unless actor is owner/admin/platform admin;
- hidden until preview says selected components have zero references.

Confirmation phrase: `DELETE COMPONENTS`.

Preview content:

- component count;
- variants, price options, histories to delete;
- image and attachment storage paths/counts;
- explicit "cannot be undone" copy.

Blocked state:

- if any references exist, the hard-delete button stays disabled and modal offers "Archive instead."

## Permission-Based Visibility

| Actor/surface | UI rule |
|---|---|
| Pending invite project | no selection, no delete. |
| Sheet-only project card | no project delete; estimate sheet delete only if `can_edit_estimate` for that sheet. |
| Project viewer | no destructive toolbar. |
| Project editor | estimate delete allowed when `can_edit_estimate`; project delete hidden unless manager threshold is met. |
| Project owner/admin or workspace owner/admin | project delete visible after preview. |
| Workspace member/editor | component archive visible if workspace editor policy allows. |
| Workspace viewer | archive/hard delete hidden. |

UI hiding is only convenience. Server authorization remains mandatory.

## Loading, Empty, And Disabled States

- Preview loading: skeleton count rows inside modal.
- Execution loading: button shows `Deleting...` or `Archiving...`; all close/destructive controls disabled.
- Empty selection: toolbar hidden.
- Empty list after success: use existing empty states.
- Partial stale selection: preview explains already-deleted ids and requires user to refresh/clear.
- Storage warning: success toast with warning severity and exact failed count.

## Accessibility Requirements

- Every checkbox has an `aria-label` with target name.
- Toolbar uses `role="region"` and an accessible label like `Bulk project actions`.
- Modal title/description must be linked through shared `Modal`.
- Count summaries are text, not color-only.
- Danger/warning meaning must include text labels.
- Focus moves to modal title on open and returns to triggering button on close when possible.
- Escape closes preview modal only before execution.

## Query Refresh Behavior

Projects:

- `router.refresh()` after success.
- Revalidate `/workshop/projects`, affected project routes, and homebase favorites.

Estimate sheets:

- `router.refresh()` after success.
- invalidate relevant `estimateQueryKeys.areaTree(estimateId)` caches.
- route redirect if current deleted sheet is open.

Library:

- `router.refresh()` or library query invalidation.
- after archive, both library and estimate-sidebar datasets must exclude archived by default.

## Component Candidates

Shared:

- `BulkDestructivePreviewModal`
- `BulkActionToolbar`
- `TypedConfirmationInput`
- `DependencyImpactList`
- `BulkActionIssueList`

Target-specific:

- `ProjectBulkDeleteToolbar`
- `EstimateSheetBulkDeleteToolbar`
- `LibraryComponentBulkArchiveToolbar`
- `ProjectDeletePreviewBody`
- `EstimateSheetDeletePreviewBody`
- `LibraryComponentArchivePreviewBody`

Keep shared components minimal; avoid overbuilding until the first two surfaces prove the abstraction.
