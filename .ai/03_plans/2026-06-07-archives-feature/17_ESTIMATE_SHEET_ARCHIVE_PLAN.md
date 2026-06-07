# Estimate Sheet Archive Plan

**Date:** 2026-06-07 | Phase 2 | Plan: `.ai/03_plans/2026-06-07-archives-feature/`

## Data Model

- `archived_at TIMESTAMPTZ NULL`, `archived_by UUID NULL` on `estimates` table
- NOT lifecycle state (estimates are simpler than components; boolean archive is sufficient)

## UI: Status Filter

In `/workshop/projects/[projectId]/estimates`:
- Add status filter: "Active Sheets" (default, WHERE archived_at IS NULL) / "Archived Sheets" (WHERE archived_at IS NOT NULL)
- Reuse existing `WorkshopCollectionLayout` `toolbarPanel` for filter placement

## Actions

| Action | Location | Behavior |
|--------|----------|----------|
| Archive | Row menu in estimate table | Preview → simple confirm → execute |
| Bulk Archive | Selection toolbar | Same flow, bulk |
| Restore | Row menu in Archived view | Preview → simple confirm → execute |
| Bulk Restore | Selection toolbar in Archived view | Same flow, bulk |

RPCs follow preview→execute pattern (same as project archive).

## Cross-Cutting Effects

| Surface | Behavior When Sheet Archived |
|---------|------------------------------|
| **Estimate editor** (`[nodeId]` route) | Redirect to estimate list with "Sheet Archived" notice |
| **Project charts** | Exclude archived sheets from aggregation |
| **Proposal export** | Exclude archived sheets from workbook |
| **Publication snapshots** | Do not include archived sheets in new snapshots; existing snapshots preserved |
| **AI Ask/read context** | Exclude archived sheet data (similar to existing component lifecycle exclusion) |
| **AI package builder** | Reject operations on archived sheets |
| **Estimate favorites** | Hide archived sheets from favorites; re-appear on restore |
| **Project totals** | Exclude archived sheets from project budget/summary calculations |
| **Template insertion** | Blocked for archived sheets |
| **Activity history** | Preserved but viewable only when sheet is restored (or via project Archived view) |
| **Shared sheet members** | Cannot access archived sheets; access restored on unarchive |
| **TanStack Query** | Invalidate `estimateQueryKeys.areaTree(estimateId)` after archive/restore via `queryClient.invalidateQueries` |

## Route Guards

- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`: if estimate is archived, redirect to `/workshop/projects/[projectId]/estimates` with notice
- `src/app/workshop/projects/[projectId]/estimates/page.tsx`: renders archived filter, no redirect needed

## Auth

- `can_edit_estimate` for archive/restore
- Sheet viewers cannot archive (same as existing delete pattern)

## Tests

- Migration contract: archived_at, archived_by columns exist
- RPC contract: preview returns correct shape, execute validates hash
- Repository filter: `listProjectEstimates` excludes archived by default
- DOM: status filter renders, archive/restore actions work
- Route: archived sheet URL redirects
- Charts: aggregation excludes archived sheets
- Export: workbook excludes archived sheets
- E2E: archive → verify hidden → restore → verify visible flow
