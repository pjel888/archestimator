# Estimate System Knowledge Graph — Source Research

Status: Final current-source synthesis  
Verified: 2026-07-15

## Core Mental Model

The estimate system has three different kinds of state that must never be merged:

1. **Shared definitions** — Library components and variants, or a project-bounded component identity.
2. **Placed instances** — estimate rows, each with a selected variant and row-local quantity, pricing inputs, adjustments, placement, and revision.
3. **Issued snapshots** — client-visible copies created at publication time and preserved independently of later source edits.

Templates are blueprints that materialize fresh estimate identities. Project component identity is project-bounded. Cross-project reuse localizes rather than extending shared fan-out across projects.

## Motivating Scenario: Delete Estimate Row

Deleting a live estimate row has a deliberately bounded effect.

| Surface | Current behavior | Evidence |
| --- | --- | --- |
| Current editor | The row disappears optimistically. Failure restores it. Success offers Undo. | `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts` (`deleteRowItem`) |
| Canonical estimate data | A row-revision guard runs, the row is deleted from `estimate_row_items`, attachment-retention facts are preserved where needed, and a `row_deleted` history event stores the old row. | `src/lib/estimates/actions.ts` (`deleteEstimateRowItem`); `src/lib/estimates/d1-action-client.ts` (`deleteRowItem`) |
| Live totals | The deleted row no longer contributes to derived row/sheet/proposal totals. The history event records the negative total delta. | `src/lib/estimates/d1-action-client.ts` (`deleteRowItem`); `src/lib/estimates/estimate-row-total.ts` |
| Project component projection | That instance disappears. The logical projected component disappears only when no remaining row carries the same project component identity. | `src/hooks/use-estimate-row-mutations.ts`; `src/lib/component-library/project-component-projection.ts` |
| Existing legacy shared link | The row remains in the stored `project_publications.snapshot_json`. Republish rebuilds from current source and omits the row in the replacement snapshot. | `src/lib/publication/actions.ts` (`republishProjectPublication`); `src/lib/publication/public-repository.ts` (stored snapshot read) |
| Already-issued Client Portal issue | The row remains in that immutable issue. Publishing again builds a new issue, supersedes the prior issue, and advances the current issue pointer. | `src/lib/client-portal/publish-service.ts` (`publishClientPortalDraft`); `src/lib/client-portal/issue-builder.ts` (`createIssuedClientPortalIssue`) |
| Another already-open editor | Current realtime row updates do not carry a delete semantic, so the other session may retain the row until query refresh/refetch. This is a labeled partial refresh edge, not guaranteed synchronization. | `src/hooks/use-estimate-row-update-broadcast.ts` |

Undo restores the canonical row from its history snapshot. Undo does not retroactively rewrite either published snapshot family.

## Change Scope Ladder

| Scope | Example | What fans out |
| --- | --- | --- |
| Row only | Select a variant or edit row-local quantity | Only the selected row and its derived totals |
| Project-wide | Edit a Project component definition | Eligible rows sharing that project component identity inside the project |
| Workspace-wide | Edit a Library component or variant | Still-linked rows across workspace projects; local overrides preserve visible local fields while source receipt/version metadata advances |
| Materialized copy | Insert a template or localize across projects | Fresh destination identities; later source edits do not form a new live link |
| Issue-local | Publish client content | A public-safe immutable copy scoped to one publication/issue |

## Operation Findings

### Estimate and structure

- Creating an estimate also creates its initial tab/node and revalidates the estimate routes: `src/lib/estimates/actions.ts` (`createEstimate`).
- Duplicating an estimate deep-copies metadata, tabs, hierarchy, rows, and row source receipts/snapshots under new IDs: `src/lib/estimates/actions.ts` (`duplicateEstimateSheet`).
- Estimate deletion uses preview-hash guarded cascade behavior across related live records. Existing public snapshots remain historical: `src/lib/estimates/actions.ts` (`deleteEstimateSheet`); `src/lib/estimates/d1-action-client.ts` (bulk estimate deletion).
- Creating, renaming, and reordering hierarchy writes estimate tree records and guards invalid parent/cycle shapes: `src/lib/estimates/actions.ts`; `src/lib/estimates/d1-action-client.ts`.
- Deleting a structure node removes its descendant subtree and contained rows while storing restorable history: `src/lib/estimates/d1-action-client.ts` (node deletion with history).

### Rows, components, and variants

- Inserting from Library creates an estimate row with a bounded source receipt and `linked-clean` state: `src/lib/estimates/actions.ts` (`insertEstimateRowItemFromLibrary`).
- Editing an ordinary linked row uses a row revision guard and changes it to `linked-overridden`: `src/lib/estimates/actions.ts` (`updateEstimateRowItem`).
- Variant selection is row-owned state. It must not be represented as a shared component edit.
- A Project component edit fans shared fields out to every eligible row carrying that project component identity inside the project: `src/lib/estimates/d1-action-client.ts` (project-component propagation plan).
- A Library component/variant update creates a new source version and synchronizes still-linked workspace rows. `linked-clean` rows accept visible shared values; `linked-overridden` rows preserve local visible values while receiving refreshed source/version facts: `src/lib/component-library/actions.ts` (`buildLinkedEstimateRowSyncPlans` and versioned update flow).
- Permanent Library deletion is the highest-blast-radius CRUD edge. Preview reports linked estimate/template usage; execution removes linked live rows/templates before deleting the Library definition: `src/lib/component-library/actions.ts` (`previewBulkDeleteLibraryComponents`; `executeBulkDeleteLibraryComponents`).

### Charges and totals

- Quantity, unit cost, miscellaneous cost, contingency, and row adjustment are row inputs.
- Sheet contingency/discount is persisted sheet adjustment state.
- Proposal contingency and VAT belong to proposal/export calculation context rather than the row itself.
- Canonical calculations live in `src/lib/estimates/estimate-row-total.ts`; sheet adjustment mutation is in `src/lib/estimates/d1-action-client.ts:3528`.

### Publication and review

- Legacy publish/republish writes one serialized project snapshot; public reads sanitize and serve that stored snapshot. Revocation changes access, not historical source data.
- Client Portal publication reads the source repeatedly until a stable fingerprint is observed, then creates immutable issue sections and row projections: `src/lib/client-portal/publish-service.ts` (`loadConsistentPublicationSource`; `publishClientPortalDraft`); `src/lib/client-portal/issue-builder.ts` (`createIssuedClientPortalIssue`).
- A later portal publication creates a new issue, marks the former current issue `superseded`, and advances `client_portals.current_issue_id`. It does not mutate the old issued content: `src/lib/client-portal/issue-builder.ts` (`createIssuedClientPortalIssue`).
- Discussion, decision, activity, access, and notification state are issue/portal lifecycle records, not edits to the source estimate.

## Proposed Nodes

- Workspace, Project, Estimate, Tab, Area/Group, Estimate row
- Library component, Library variant, Project component identity, Selected variant, Template, Attachment
- Row total, Sheet adjustment, Estimate/proposal total
- History event, Query/projection cache
- Legacy publication snapshot, Legacy public token
- Portal draft, Portal issue, Issued section, Issued row projection, Stable portal token
- Public review page, Discussion, Decision, Activity/notification

## Proposed High-Value Edges

- Estimate `contains` tab/area/group/row.
- Library component `defines` variants.
- Library insert `materializes` an estimate row and source receipt.
- Estimate row `selects` one stable variant.
- Project component edit `synchronizes` project-bounded instances.
- Library edit `synchronizes` still-linked workspace rows.
- Local override `keeps-unchanged` local visible fields during later source updates.
- Row mutation `recalculates` live totals and `records` history.
- Row deletion `deletes` live source but `keeps-unchanged` issued snapshots.
- Legacy republish `snapshots` current source into a replacement legacy publication.
- Portal publish `snapshots` current source into an immutable issue.
- New portal issue `supersedes` the prior issue.
- History snapshot `restores` deleted row state.
- Revision/fingerprint guard `guards` stale mutations or unstable issue creation.
- Query invalidation `refreshes` projections; cross-session delete remains a partial refresh boundary.

## UI Research Decision

The previous technical map became difficult to read when it exposed dozens of nodes and transitions at once. The successor must keep Product as the default, open Knowledge on one familiar operation, reveal only the selected operation and first-degree effects, and make the complete facts available in a linear wiki panel. The canvas is for orientation and relationship tracing; the inspector is the authoritative reading surface.

Use deterministic fixed coordinates and D3 only for pan/zoom/fit. Do not use force layout, runtime code parsing, live D1 reads, or GitNexus at runtime.

## Evidence Confidence

Persistence and publication boundaries are high confidence because they are grounded in current source. GitNexus was two commits behind during this pass and was used only for discovery and mandatory impact analysis. Concurrent untracked source-revision and mutation-receipt files were not treated as shipped behavior.
