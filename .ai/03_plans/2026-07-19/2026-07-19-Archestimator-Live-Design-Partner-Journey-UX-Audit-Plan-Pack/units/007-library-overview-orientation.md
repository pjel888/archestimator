# 007 — Library Overview Orientation

> Closes **Medium** `UX-EMPTY-001` (severity downgraded from High after second-pass challenge; library shell still owns search/tabs).

## unit_id
`UNIT-007`

## title
Render orientation copy and a recent-components spotlight in the library overview body.

## status
`READY`

## priority
`P2` — before user #5.

## severity_of_findings
Medium (`UX-EMPTY-001`)

## effort
Small (~1 hour).

## implementation_risk
`LOW` — additive content. Confirm with the codeowner that the previous "intentionally cleared" decision is superseded.

## local_implementation_status
`NOT_STARTED`

## external_lifecycle_status
`NOT_REQUIRED`

## requirements
`UX-007`

## findings
`UX-EMPTY-001`

## existing_plan_links
None.

## goal
A user clicking "Library" in the sidebar sees at minimum a one-line orientation pointing to the components/templates tabs and ideally a recent-components spotlight. No longer a blank body.

## current_source_evidence
- `src/components/workshop/library/overview/LibraryOverview.tsx:6-8` — returns `<div data-library-overview="empty" />`.
- Code comment: "intentionally cleared at the owner's request."
- `src/app/workshop/library/page.tsx:11` — renders `<LibraryOverview />`.
- Library shell still owns search/tabs (per the comment: "The persistent Library header now owns search and creation actions").

## owned_paths
- `src/components/workshop/library/overview/LibraryOverview.tsx`

## dependencies
None.

## non_goals
- Restoring the original ~300-line overview.
- A full library landing redesign.

## implementation_sequence
1. Replace the empty div with a minimal orientation block: heading, one-line description, two tab links (Components, Templates).
2. Optionally add a recent-components spotlight if `loadCurrentWorkspaceComponentLibraryLite` is cheap (reuse existing fetcher).
3. Run `bun run build` (after UNIT-001).

## acceptance_criteria
1. `/workshop/library` renders at least a one-line orientation and a link to a sub-tab.
2. `bun run build` exits 0.

## acceptance_evidence
- Diff inspection.
- Manual `/workshop/library` load (after UNIT-001).

## test_decision
`NOT_REQUIRED`.

## completion_signal
`DONE` when both criteria evidenced.

## next_unit_on_success
UNIT-008..UNIT-013.
