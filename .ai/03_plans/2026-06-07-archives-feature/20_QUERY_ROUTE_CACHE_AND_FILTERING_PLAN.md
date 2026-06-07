# Query, Route, Cache, and Filtering Plan

**Date:** 2026-06-07
**Plan:** `.ai/03_plans/2026-06-07-archives-feature/`

## Repository Filter Changes (Per Entity)

| Entity | Repository Function | Filter Change | Phase |
|--------|-------------------|---------------|-------|
| Projects | `listCurrentWorkspaceProjects` | Add `includeArchived` param (default false); `WHERE archived_at IS NULL` when false | 1 |
| Projects | `getWorkshopHomebaseData` | `WHERE archived_at IS NULL` for recent/favorites | 1 |
| Estimates | `listProjectEstimates` | Add `includeArchived` param; `WHERE archived_at IS NULL` default | 2 |
| Components | Component library queries | Already filter `lifecycle_state != 'archived'`; add param for archived view | 3 |
| Templates | Template list queries | Add `WHERE archived_at IS NULL` default | 4 |

## Route Guards (Per Entity)

| Route | Guard Behavior | Phase |
|-------|---------------|-------|
| `/workshop/projects/[projectId]` | Redirect to `/workshop/projects` with notice if project archived | 1 |
| `/workshop/projects/[projectId]/estimates/[nodeId]` | Redirect if estimate archived | 2 |
| `/workshop/projects/[projectId]/charts` | Redirect if project archived | 1 |
| `/workshop/projects/[projectId]/estimates` | No redirect when parent project is active; renders filter. If parent project is archived, redirects via project layout guard (Phase 1). | 2 |
| API routes (export, AI, images) | Reject/redirect for archived entities | 1-2 |

## Next.js App Router Behavior

- Server actions use `router.refresh()` after archive/restore mutations
- RSC revalidation handled automatically by Next.js on `router.refresh()`
- No special `revalidatePath` needed for project/estimate routes (re-fetch on navigation)

## TanStack Query (Estimates Only)

- `use-estimate-query.ts`: After estimate archive/restore, call `queryClient.invalidateQueries({ queryKey: estimateQueryKeys.areaTree(estimateId) })`
- `use-estimate-row-mutations.ts`: Row mutations should fail gracefully if estimate becomes archived (check estimate state before mutation)

## Zustand Stores

- `estimate-ui-store.ts`: Clear selected node and expansion state if active estimate is archived
- `navigation-ui-store.ts`: No changes needed

## Cache Strategy

- No special cache invalidation — Next.js App Router handles RSC revalidation
- `localStorage` view-mode settings: unaffected (per-user, not per-project)
- TanStack Query caches: invalidated on archive/restore for estimate data

## Performance

- Partial indexes on `archived_at` columns for fast active/archived filtering
- No N+1 regressions — archive/restore is single UPDATE
- Bulk operations process all IDs in one RPC call

## Retained Recipient Queries (Phase 5 — Future)

- Separate query path for retained snapshots (not live workspace data)
- `recipient_entitlements` queried by `recipient_user_id` with `status = 'active'`
- Retained snapshots are read-only, immutable JSONB
