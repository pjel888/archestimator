# Plan: Production Workspace Proposal Mapping Slice

**Date:** 2026-05-17
**Status:** Implemented, pending final gates/review

## Goal

Move the estimate workspace closer to the validated space-first/proposal-consolidated model by making proposal-section assignment visible and editable in the production workspace, while resolving Codex/GitHub risks surfaced on the stacked grid PRs.

## Acceptance criteria

- New rows from blank-entry and library-entry flows receive a default proposal section.
- Existing rows expose a proposal-section selector in the workspace sheet.
- Unmapped billable rows are visible before proposal issuance and do not silently disappear.
- Proposal preview summarizes by client-facing proposal sections, not working space/area sections.
- Section header totals in the grid adapter exclude non-billable rows consistently with grand totals.
- Unit/DOM tests cover default proposal mapping, remapping, and non-billable section totals.
- Full gates run before commit/push.

## Scope implemented

- Shared `createLineItemFromLibraryItem()` now accepts optional `proposalSectionId`.
- Shared grid adapter now resolves the default proposal section and uses it when inserting library rows.
- Production workspace blank/library row creation maps to the default proposal section.
- Production workspace sheet includes an editable proposal-section selector per row.
- Proposal panel warns on unmapped billable rows and previews totals by proposal sections.
- Adapter section-header totals now exclude non-billable rows.

## Deferred / next slice

- Full replacement of the HTML workspace sheet with the Glide/dnd-kit grid remains the next UI integration slice. The adapter and spike remain the migration path.
- Drag-and-drop library insertion in the production workspace should follow after the mapping selectors are stable.
