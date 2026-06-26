# 07 - Data, Database, API, and Network Plan

## Data Ownership

No new data model is proposed. Existing repositories continue to own project, workspace, estimate, node, tab, and edit-capability reads.

## Database Scope

No migration is required for the first implementation slice.

Database work enters scope only if Phase 0 `PERF_TRACE` and Supabase timing show the server-data path dominates after fallback sequencing is corrected.

No protected route data should move into `unstable_cache`, static caching, service-role route reads, or shared module caches as part of this plan.

## Current Server Data Flow

For the target route:

1. `WorkshopLayout` validates auth and terms.
2. `ProjectLayout` calls `getCurrentWorkspaceProject(projectId)`.
3. `ProjectEstimateNodePage` calls:
   - `resolveEstimateTabRouteContext(projectId, nodeId, ESTIMATE_SHEET_TREE_LOAD_LIMITS)`
   - `requireCurrentUserContext()`
4. `EstimateWorkspaceResolved` calls:
   - `getEstimateTabs(...)` if route context did not already include tabs
   - `resolveEstimateEditCapability(...)`

## Data Hotspots to Measure

| Hotspot | Why It Matters | Allowed First Action |
|---|---|---|
| Auth and terms | Parent workshop gate blocks all children | Add/inspect trace labels only |
| `getCurrentWorkspaceProject` | Project layout blocks before shell | Measure and, if necessary, split title/header streaming |
| Selected node lookup | First estimate route-context query | Trace timing |
| Tab/tree/tabs path | Multi-hop route context | Trace selected tab, tabs list, nodes, rows separately |
| Tree build | Bounded by load limits but can be CPU/hydration relevant | Benchmark small/medium/worst fixtures |
| Estimate workspace bundle | May dominate after server waits improve | Analyzer and browser long-task trace |

## Existing Cache Contracts

| Function | Cache State | Plan Impact |
|---|---|---|
| `getCurrentUserContext` | `React.cache` | Do not duplicate |
| `createSupabaseServerClient` | `React.cache` | Do not duplicate |
| `ensureDefaultWorkspace` | `React.cache` | Do not duplicate |
| `getCurrentWorkspaceProject` | `React.cache` | Do not duplicate |
| `listCurrentWorkspaceProjects` | `React.cache` | Not target path |

## RSC and Network Requirements

- Record every `_rsc=` request for the benchmarked transition.
- Record request start/end order.
- Report total RSC request count per run.
- Fail if after count exceeds before by more than 1 without explanation.
- Keep warm and cold scenarios separate.

## Prefetch Measurement

Measure:

- No-hover click from estimates list to target estimate.
- Hover/focus prefetch with delay long enough to trigger `usePrefetchOnHover`.
- Default browser/cold direct load in a fresh context.
- Warm client navigation after route has already been visited.

Required fields:

- `prefetchMode`: `none`, `hover`, `warm`, `cold-direct`
- `rscRequestCount`
- `routeDataRequestStartedAt`
- `routeDataRequestFinishedAt`
- `skeletonTimeline`
- `overlayTimeline`

## API Surface

No public API changes are expected.

Internal behavior changes may affect:

- Server Component route rendering order.
- App Router RSC payload composition.
- Route prefetch request timing.
- Browser resource waterfall.

## Network Failure Cases

Future E2E should simulate:

- Delayed sheet RSC request.
- Delayed tail request/span.
- Failed or missing estimate route context.
- Back/forward navigation after sheet route.

Expected behavior:

- No parent skeleton flash.
- No stuck overlay.
- Error boundary or notFound/redirect behavior remains unchanged.

## Logging Safety

Allowed in benchmark artifacts:

- Route labels.
- Sanitized path names and synthetic or explicitly approved route fixture IDs.
- Durations.
- RSC request counts.
- Selector names.
- Browser timing metrics.

Not allowed:

- Auth cookies.
- Supabase tokens.
- Email addresses.
- Estimate row contents.
- Raw proposal/client data.
- Full request headers.
- Raw screenshots or browser traces containing protected project or estimate content in committed evidence folders.
