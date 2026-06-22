# Project Activity Contract

Date: 2026-06-19
Status: required before Phase 2

## Scope

The Phase 2 activity module is estimate activity only. Share-link opens remain in the current published-link panel. Teamspace/collaboration activity is deferred until a separate information architecture decision.

## Module Boundaries

| Module | Responsibility |
|---|---|
| `src/lib/activity/estimate-event-read-model.ts` or equivalent | Shared normalization, cursor parsing, filter validation, actor-label input shape. |
| `src/lib/repositories/project-activity-repository.ts` | Project-scoped query/RPC adapter, authorization, pagination, actor hydration, DTO construction. |
| `src/lib/estimates/actions.ts` | Existing sheet Activity action remains a consumer of shared helpers, not the owner of project dashboard behavior. |
| `src/components/workshop/project-dashboard/ProjectActivityTimeline.tsx` | Renders DTO only. Never receives raw event rows. |

## Authorization

Project activity cannot rely on current workspace-member `estimate_sheet_events` RLS as the dashboard boundary.

The query must enforce both:

- project/workspace access for the dashboard route;
- current estimate/sheet access for every event row returned.

Preferred implementation:

- use an RPC or repository query that joins through `estimates` and calls the canonical estimate access predicate such as `can_access_estimate`;
- return only dashboard DTO fields from that boundary;
- keep raw event table access internal to the server/database.

Required deny cases:

- anonymous/public user;
- wrong workspace;
- revoked member;
- sheet-only collaborator without access to another sheet;
- project viewer if the product does not grant viewer access to activity details.

## DTO Shape

`ProjectActivityItemDto` includes only:

- `id` or stable opaque item key when needed for React rendering;
- `createdAt`;
- `eventLabel`;
- `actorLabel`;
- `targetLabel`;
- `estimateId` only if needed for navigation;
- `estimateName`;
- `sheetCode`;
- `summary`;
- `totalDelta` only if product-approved and non-sensitive;
- `href` when navigation is safe.

Forbidden client fields:

- `old_snapshot`
- `new_snapshot`
- `payload`
- `metadata`
- `raw`
- `correlation_id`
- actor user id/email unless separately approved
- row ids, node ids, estimate ids not needed for navigation

## Cursor And Pagination

- Sort: `(created_at desc, id desc)`.
- Cursor payload: `createdAt` and `id`, encoded as an opaque object or string.
- Default page size: 20.
- Hard clamp: 50.
- New inserts during pagination must not duplicate or skip already-loaded rows.
- Actor labels hydrate once per page.

## Content Grammar

Each rendered row uses:

1. relative or formatted time;
2. event label in domain language;
3. actor label;
4. sheet/estimate context;
5. compact summary;
6. optional safe link.

Group by day only when multiple days are visible. Use a flat list when all rows are from the same day.

## Migration Dependency

If `estimate_sheet_events.project_id` is added, Phase 2 must follow `10-MIGRATION-RLS-QA-RUNBOOK.md`.

No Phase 2 completion claim is allowed until new event writes carry `project_id` after the migration, not only historical backfill rows.

## Tests

- Restricted sheet events are omitted.
- Raw/snapshot/payload/metadata/raw/correlation fields fail if present in DTOs.
- Cursor pagination remains stable under concurrent insert fixtures.
- Query-count/source proof shows no per-estimate event fan-out.
- Existing sheet Activity modal remains green after helper extraction.
