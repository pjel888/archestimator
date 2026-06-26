# 10 - Blast Radius and Dependencies

## Direct Impact

| Area | Classification | Reason |
|---|---|---|
| `estimates/[nodeId]/page.tsx` | Required change | Leaf route boundary sequencing |
| `EstimateSheetRouteSkeleton` | Verification only | Correct skeleton already exists |
| `estimate-sheet-route-loading.test.ts` | Required change | Add static guard for leaf async child |
| `e2e/estimate-sheet-loading-performance.spec.ts` | Required change | Record full cascade timeline |
| `scripts/measure-route-transitions.ts` | Required change | Add skeleton/overlay metrics |
| `scripts/check-route-transition-readiness.ts` | Required change | Enforce route-specific fallback budgets |

## Evidence-Gated Impact

| Area | Classification | Gate |
|---|---|---|
| `projects/[projectId]/layout.tsx` | Possible change | Only if parent fallback still appears after leaf-page refactor |
| `ProjectRouteContentFallback` | Possible change | Only if layout fallback shape is proven visible on non-dashboard leaves |
| `WorkshopPageShell` | Possible change | Only if shell fallback appears in timeline and blocks leaf fallback |
| `RouteLoadingOverlay` | Possible change | Only if overlay masks correct skeleton or outlives it |
| `navigation-ui-store` | Possible change | Only if overlay timing is the bottleneck |
| `use-prefetch-on-hover.ts` | Possible change | Only if hover prefetch fails or creates churn |
| `workspace-repository.ts` route-context helpers | Possible change | Only if `estimate-sheet.route-context` remains over budget after boundary fix |
| `EstimateWorkspaceClient` import graph | Possible change | Only if server/RSC metrics pass but JS/hydration dominates |

## Explicitly Unaffected in First Slice

| Area | Reason |
|---|---|
| Supabase migrations | No schema requirement |
| RLS policies | Existing auth path preserved |
| Static/protected data caches | Rejected for first slice |
| Public share routes | Not in route chain |
| Marketing pages | Not in route chain |
| Estimate CRUD mutation logic | User complaint is navigation/loading |
| Component library data loader | Already lazy relative to first sheet paint |
| `cacheComponents` / PPR | Separate high-blast-radius migration |

## Transitive Route Impact if Project Layout Changes

Changing `src/app/workshop/projects/[projectId]/layout.tsx` can affect:

- Project dashboard: `/workshop/projects/[projectId]`
- Estimates list: `/workshop/projects/[projectId]/estimates`
- Estimate sheet: `/workshop/projects/[projectId]/estimates/[nodeId]`
- Project data/charts: `/workshop/projects/[projectId]/data`
- Redirected charts route: `/workshop/projects/[projectId]/charts`
- Breadcrumbs, project mini-sidebar, header chrome, collaboration/publication summaries

Validation must expand if this file is touched.

## Dependency Map

| Dependency | Current Use | Plan Constraint |
|---|---|---|
| Next.js App Router | Segment loading, RSC, prefetch | Follow official loading/streaming guidance |
| React 19 Suspense | Server and client fallback sequencing | Put slow work under closest boundary |
| Supabase | Auth and data reads | No bypass, no extra round trips without evidence |
| Zustand navigation store | Global overlay state | Avoid stuck/racy overlay |
| Playwright | Route timing and DOM timeline proof | Required for final user-visible claim |
| Vitest | Static/DOM regression guards | Required before E2E |
| GitNexus/code-review-graph | Broad impact awareness | Use for risky shared refactors |
