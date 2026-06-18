# Project Estimates Toolbar Functionality

## Evidence Anchors

Refreshed 2026-06-18 from repo-local evidence.

| Proof dimension | Status | Evidence |
|---|---|---|
| Repo source | Implemented | `src/components/workshop/ProjectEstimatesClient.tsx` defines toolbar filter/sort options, computes filtered/sorted rows, and passes the projected rows to table state. |
| Tests/checks | Implemented | `tests/vitest/project-estimates-client-create.test.tsx` covers favorites/search filtering, recent filtering, sort field, and sort direction behavior. |
| Migrations/provider | Not applicable | This is a client/UI projection fix and does not require database or provider mutations. |
| Hosted/browser proof | Not freshly verified | No hosted or manual browser proof was run during the 2026-06-18 refresh. |
| Owner/manual proof | Not required for status | No separate owner/manual acceptance pass is recorded for this narrow toolbar behavior. |

## User Job

Make the project estimates toolbar controls in `/workshop/projects/[projectId]/estimates` actually affect the estimate list. The selected browser target is the compact toolbar row containing search, filter, sort field, sort direction, and add estimate actions.

## Scope

- Keep add estimate and search behavior intact.
- Wire the existing `Filter estimates`, `Sort field`, and `Sort direction` icon dropdowns to the rows passed into the estimates table.
- Preserve the icon-only toolbar style and accessible combobox labels/titles.
- Add focused regression coverage for the toolbar row projection.

## Non-Goals

- Do not implement the disabled row-level version history action.
- Do not redesign the table, add new toolbar controls, or change persistence/database behavior.
- Do not touch unrelated dirty files in the shared checkout.

## Expected Files

- `src/components/workshop/ProjectEstimatesClient.tsx`
- `tests/vitest/project-estimates-client-create.test.tsx`

## Validation Gate

- Focused Vitest coverage for filter, recent, sort, and search composition passes.
- Type-check and eslint pass for the touched source/test files.
- Any broader lint/design failures are reported as pre-existing if they remain outside this change.
