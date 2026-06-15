---
title: Express Components Subagent Summaries
type: docs
date: 2026-06-15
---

# Express Components Subagent Summaries

## Repo Flow Explorer

The Add row flow is:

- `QuietAddRowButton` calls `onAddBlankRow`.
- `EstimateSheetContent.insertBlankRow` calls `insertLibraryItem` with `createBlankEstimateRowTemplate()`.
- `insertLibraryItem` clones a row for optimistic local state and calls `insertRow`.
- `useEstimateRowMutations.insertRow` calls `insertEstimateRowItemFromLibrary`.
- The server action writes through `insert_estimate_row_item_with_history`.

Key finding: blank rows are currently manual project rows rendered as placeholders. Express components should become a first-class authored row state and not remain just a prettier placeholder.

## UX Designer

The estimate sheet already behaves like a spreadsheet. Express editing should follow that contract: blur/Enter commit, Escape revert, grid focus remains predictable, and errors stay inline.

Key finding: the material cell/card is the right location for inline editing. The Components tab Project folder should be a view/folder inside Components, not a new Library tab.

Bug focus: duplicate row ids, query key mismatch, or missing source/link fields can make the project-specific action appear only on later instances.

## Architecture Reviewer

The codebase has two persistence shapes:

- Workspace reusable component aggregate: `cost_library_items` plus price options, cost entries, attachments, and history.
- Project estimate row aggregate: `estimate_row_items` plus source snapshot, link state, revision, and history.

Key finding: do not add a third express table for the requested scope. Use `estimate_row_items` for project-specific inline rows and promote through existing library RPCs when a row becomes workspace-wide.

Open fork: a new database shape is justified only if the product needs project-scoped reusable components that are neither a library component nor a single estimate row.

## Independent Reviewers

Design and data-integrity review found no P0 blockers and flagged the same P1 implementation gates:

- Initial Add row lifecycle must distinguish focused draft UI from persisted-row readiness. Fast blur/edit before insert success needs buffering, retry, and delete recovery.
- Components Project folder needs an explicit project route/query/context decision; the workspace-only Components route must not silently aggregate project rows.
- Promotion must be atomic or idempotent before implementation; retry after partial create cannot duplicate library components.
- Express inserts must not be recorded as blank-row activity by the existing source-less insert branch.
- Row JSON updates must preserve unrelated `metadata` and `source_snapshot` keys. The corrected live-provider finding is that omitted JSON keys are preserved and only sent top-level JSON keys replace values, so routine field edits omit JSON while JSON-changing operations send complete server-merged objects.

Feasibility review agreed the no-new-table decision is defensible for this scope because current row and RPC surfaces already cover editable row facts, metadata, link state, revisions, source snapshots, and RLS. The decision changes only if Project folder entries become reusable canonical project components rather than row projections.
