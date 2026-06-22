# Data Ownership Contract

Date: 2026-06-19
Status: required before implementation

## Purpose

Prevent duplicate dashboard/header reads, monolithic page-blocking fetches, and helper confusion while preserving `ProjectChromeAsync` streaming.

## Ownership Rules

| Surface | Owner | Data contract | Cache boundary | Notes |
|---|---|---|---|---|
| Project shell title and sample fallback | `layout.tsx` and `page.tsx` | `getCurrentWorkspaceProject(projectId)` | Existing React `cache()` | Keep shell paint limited to title/not-found needs. |
| Header publication/teamspace chrome | `ProjectChromeAsync` | `getProjectPublicationSummary`, `getProjectCollaborationSummary`, `listProjectEstimateSheetsForPublication` | Streamed Suspense boundary | Do not fold into page dashboard fetch. |
| Dashboard recent sheets | New recent-ledger helper | `listRecentProjectEstimateSheets(projectId, limit)` | Request-cached leaf helper | Different projection/order from publication picker. |
| Dashboard current publication panel | Dashboard status DTO | `getCurrentProjectPublicationStatus(projectId)` or adapter over existing summary | Request-cached leaf helper if shared with chrome | Aggregate status by default; no recipient identity unless approved. |
| Project estimate activity | Project activity repository | `listProjectEstimateActivity(projectId, cursor, limit)` | Repository/RPC boundary | Must enforce sheet-level access and redaction. |
| Project location | Project location repository | `getProjectLocation`, `saveProjectLocation`, `clearProjectLocation` | Server action/repository boundary | Coordinates never ride on broad `projects` projection. |

## Required Helper Contracts

### Publication Picker Helper

- Name: `listProjectEstimateSheetsForPublication(projectId)` or existing equivalent.
- Order: current publication/header order, not recency.
- Fields: only fields needed by the publication picker/modal.
- Consumer: `ProjectChromeAsync` and `ProjectPublicationHeader`.
- Must not be changed to satisfy recent-sheets recency if that breaks header behavior.

### Recent Sheets Helper

- Name: `listRecentProjectEstimateSheets(projectId, limit)`.
- Default limit: 5.
- Hard clamp: 10.
- Order: `updated_at desc`, with deterministic secondary sort.
- Fields: estimate id, project id, sheet code/name, updated time, and `firstNodeId | null`.
- Link rule: use `firstNodeId` when present; otherwise link to a stable estimate-level route.
- Expected tests: zero sheets, one sheet, more than limit, identical timestamps, missing first node, wrong project excluded.

### Current Publication Status DTO

Default fields:

- `status`
- `clientLinkPath`
- `selectedEstimateCount`
- `isPasswordProtected`
- `latestOpenedAt`
- `openCount`
- `isStale`
- `canCopy`
- `canOpen`
- `manageHref` or existing manage action target

Forbidden by default:

- recipient email
- recipient display name
- raw token/hash
- selected estimate ids unless the UI needs them for count derivation server-side only

## Query Budget

Phase 1 must not add a monolithic dashboard fetch. It may add:

- one recent-sheets query;
- one publication-status adapter call only if it reuses a cached leaf helper or proves the projection is intentionally different;
- no per-sheet fan-out;
- no map/provider network work.

Phase 2 may add:

- one project activity page query;
- one batched actor/profile hydration query per activity page;
- no O(number of estimate sheets) event reads.

Phase 3 may add:

- one project location read for the internal dashboard;
- one location write/clear mutation when the user acts;
- no public tile/geocoder calls during tests.

## Source Governance Tests

Implementation should add source or component tests that prove:

- `ProjectChromeAsync` remains under Suspense.
- `ProjectChromeAsync` still renders `ProjectPublicationHeader` and `ProjectTeamspaceHeader`.
- The project page does not import a monolithic `getProjectDashboardData` that owns chrome summaries.
- The recent-sheets helper is distinct from the publication picker helper unless a shared cached base helper explicitly supports both projections.
- `project_locations` is read through a dedicated repository/action, not from `Tables<"projects">`.
