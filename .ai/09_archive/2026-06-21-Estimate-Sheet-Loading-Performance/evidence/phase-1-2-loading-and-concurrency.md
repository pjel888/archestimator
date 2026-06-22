# Phase 1-2 Evidence: Sheet Route Loading And Concurrency Guard

Date: 2026-06-22

## Implemented

- Added `src/app/workshop/projects/[projectId]/estimates/[nodeId]/loading.tsx`.
- Added `src/components/workshop/EstimateSheetRouteSkeleton.tsx`.
- Added `tests/vitest/estimate-sheet-route-loading.test.ts`.
- Added `tests/vitest/estimate-route-server-concurrency.test.ts`.
- Updated `tests/vitest/project-dashboard-ui-fixtures.ts` to expose the new route loading source.
- Updated a stale neighboring route-shell assertion to the current `ProjectTotalFooterOverlay` contract.

## Behavior Locked

- The sheet node route has its own leaf loading boundary.
- The fallback is sheet-shaped and uses the same glass shell slots as `EstimateWorkspaceClient`.
- The fallback does not import or render `ProjectEstimatesListSkeleton`, `ProjectRouteContentFallback`, or `WorkshopPageShell`.
- The first traced server block keeps route context and current user loading parallel.
- The route has a source guard for the `Suspense` split and the named tail trace.

## Verification

```bash
bunx vitest run tests/vitest/project-dashboard-route-shell-ui.test.ts tests/vitest/estimate-sheet-route-loading.test.ts --maxWorkers=1
```

Result:

```text
Test Files  2 passed (2)
Tests       8 passed (8)
```

```bash
bunx vitest run tests/vitest/estimate-route-server-concurrency.test.ts tests/vitest/project-dashboard-route-shell-ui.test.ts tests/vitest/estimate-sheet-route-loading.test.ts --maxWorkers=1
```

Result:

```text
Test Files  3 passed (3)
Tests       10 passed (10)
```

```bash
git diff --check
```

Result: passed.

## Rollback

Remove:

- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/loading.tsx`
- `src/components/workshop/EstimateSheetRouteSkeleton.tsx`
- `tests/vitest/estimate-sheet-route-loading.test.ts`
- `tests/vitest/estimate-route-server-concurrency.test.ts`

Revert the fixture and stale route-shell assertion updates.
