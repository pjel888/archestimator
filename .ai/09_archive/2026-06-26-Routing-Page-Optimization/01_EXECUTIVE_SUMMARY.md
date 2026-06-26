# 01 - Executive Summary

## Diagnosis

The target route already has a dedicated leaf `loading.tsx` and a sheet-shaped `EstimateSheetRouteSkeleton`. The user-reported cascade is therefore probably not caused by a missing leaf skeleton. It is more likely caused by when Suspense boundaries become available during navigation.

Evidence:

- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/loading.tsx` imports `EstimateSheetRouteSkeleton`.
- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx` awaits route context and current user before returning its inner `<Suspense fallback={<EstimateSheetRouteSkeleton />}>`.
- `src/app/workshop/projects/[projectId]/layout.tsx` awaits `getCurrentWorkspaceProject(projectId)` before returning `WorkshopPageShell`.
- `src/app/workshop/projects/[projectId]/layout.tsx` wraps `children` with `ProjectRouteContentFallback`, which is dashboard-shaped.
- `src/components/ui/route-loading-overlay.tsx` adds a separate global overlay after 150 ms and keeps it visible for at least 250 ms.
- `src/app/workshop/layout.tsx` remains an intentional auth/terms gate and should not be moved later just to paint faster.
- `src/lib/repositories/workspace-repository.ts` has request-scoped caches for workspace/project lookup, so the first-order plan is boundary placement and measurement, not generic cache addition.

Inference:

If the leaf page suspends before its own leaf Suspense exists in the tree, the nearest available parent fallback can win. On this route, that parent fallback is project/dashboard shaped, so the user can see ancestor loading states before the estimate skeleton.

Separate inference: if the fallback sequence is corrected but the route still feels slow, the next likely bottlenecks are the project-layout `getCurrentWorkspaceProject` bootstrap, the route-context query path, and estimate workspace bundle/hydration cost.

## Recommended Strategy

1. Extend the benchmark harness as a harness-only change if needed.
2. Capture an enhanced same-harness baseline before app optimization code changes.
3. Refactor the leaf page so route-context work happens inside an async child wrapped by `EstimateSheetRouteSkeleton`.
4. Only if the baseline still shows parent fallbacks, evaluate a scoped project-layout fallback change.
5. Keep global overlay changes evidence-gated because they affect every internal link.
6. Verify with static tests, DOM tests, targeted E2E, route-transition benchmark, `PERF_TRACE`, type-check, React Doctor, and React best-practice review.
7. Do not claim "instant navigation" unless a separate Cache Components / `unstable_instant` validation path is approved and passes.

## Top Requirements

- `PERF-01`: enhanced baseline and after artifacts must use the same route IDs, auth mode, environment, network profile, run count, browser, and post-harness measurement schema.
- `UX-01`: estimate sheet navigation must show the leaf sheet skeleton or no fallback, never projects, dashboard, or estimates-list skeletons.
- `ARCH-01`: slow estimate route work must be caught by the closest leaf Suspense boundary.
- `SEC-01`: no route-boundary optimization may show project-specific or estimate-specific data before the existing authorization path validates access.
- `TEST-01`: E2E proof must record every relevant fallback and overlay attach/detach episode.

## Stop Condition

Future implementation stops only when:

- Parent fallback flash count is zero across required scenarios.
- The sheet fallback appears at most once before usable content.
- Warm/prefetched estimates-list to sheet transition has p50 <= 500 ms in production-like local/preview, with <= 250 ms treated as the stretch pass.
- No-hover/general estimates-list to sheet transition improves by at least 30 percent from baseline or is at or below 1000 ms.
- RSC request count and Supabase round trips do not increase unless explicitly justified.
- Invalid, missing, and unauthorized project/estimate behavior remains fail-closed.
- No protected route data is placed in static, cross-request, service-role, or user-agnostic caches.

## Readiness Posture

This plan is ready for a benchmark-first implementation. It deliberately does not approve broad PPR, database indexing, or global overlay rewrites without Phase 0 evidence.
