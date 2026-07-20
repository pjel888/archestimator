# 009 — XLSX Export Discoverability

> Closes **Medium** `UX-EXPORT-001`. Cross-references MVP Startup Readiness `010-contractor-profile-and-branded-export`.

## unit_id
`UNIT-009`

## title
Surface an 'Export XLSX' action on the project/estimate row overflow menu.

## status
`READY`

## priority
`P2` — before user #5.

## severity_of_findings
Medium (`UX-EXPORT-001`)

## effort
Small (~1 hour). Add one overflow-menu entry that opens the existing `ProposalExportPreviewDialog`.

## implementation_risk
`LOW`.

## local_implementation_status
`NOT_STARTED`

## external_lifecycle_status
`NOT_REQUIRED`

## requirements
`UX-009`

## findings
`UX-EXPORT-001`

## existing_plan_links
MVP Startup Readiness `010-contractor-profile-and-branded-export.md` owns the export feature; this unit owns only the *entry-point discoverability* surface.

## goal
A user with export permission can reach XLSX export from the projects list or dashboard without drilling into an open estimate sheet.

## current_source_evidence
- `src/components/workshop/EstimateHeaderActions.tsx:29,44` — `openProposalPreview` opens `ProposalExportPreviewDialog` from inside an estimate sheet only.
- `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts:1-466` — fully robust export route (rate-limit, audience-gating, PHP default).

## owned_paths
- `src/components/workshop/ProjectEstimatesTable.tsx` (or wherever the estimate row overflow menu lives)

## dependencies
None.

## non_goals
- Changes to the export route or proposal-export library.
- Adding export to the public share view.

## implementation_sequence
1. Locate the estimate row overflow menu (likely `ProjectEstimatesTable.tsx`).
2. Add an "Export XLSX" entry that opens `ProposalExportPreviewDialog` (reuse the existing dialog component).
3. Gate the entry behind the same export-permission check used by `EstimateHeaderActions`.
4. Run `bun run build` (after UNIT-001).

## acceptance_criteria
1. Estimate row overflow menu includes "Export XLSX" for users with export permission.
2. Clicking opens `ProposalExportPreviewDialog` for that estimate.
3. Users without export permission do not see the entry.
4. `bun run build` exits 0.

## acceptance_evidence
- Diff inspection.
- Manual projects-list load (after UNIT-001).

## test_decision
`NOT_REQUIRED`.

## completion_signal
`DONE` when all four criteria evidenced.

## next_unit_on_success
UNIT-010..UNIT-013.
