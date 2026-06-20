# Active Plan

## Success Criteria

- Exact authenticated route-transition benchmark scenarios exist for every hero hop.
- Readiness validation fails when those hero scenarios are missing or skipped.
- Server trace scopes cover `/workshop`, `/workshop/projects/[projectId]`, `/workshop/projects/[projectId]/estimates`, and `/workshop/projects/[projectId]/estimates/[nodeId]`.
- Hot path data reads avoid obvious over-fetching and duplicated validation while preserving project-scoped authorization.
- Benchmark and test evidence is logged under this folder.

## Current Constraints

- Existing dirty files are unrelated and must remain untouched:
  - `src/components/workshop/WorkshopSettingsModalContentView.tsx`
  - `src/stories/domain/workshop/modal-patterns.stories.tsx`
- The current `localhost:3000` server redirects unauthenticated curl requests to `/login`; browser benchmarks need either dev-auth bypass or a Playwright storage state.
- Redis-like caching is not first-line for this path because project/estimate visibility is user-scoped. Consider it only after read-shaping evidence and with user/workspace/version-aware keys plus mutation invalidation.

## Implementation Loop

1. Discover current route, query, prefetch, and benchmark coverage.
2. Add exact benchmark scenarios and fail-closed readiness checks.
3. Reduce high-confidence query payloads and duplicate validation.
4. Add trace scopes for the hero route loaders.
5. Run targeted unit/source tests.
6. Run route-transition benchmarks when auth evidence is available.
7. Record evidence and decide the next loop.

## First Optimization Targets

- Replace project-dashboard all-estimate list fetch used only for `estimateCount` with a counted `head` query.
- Keep recent-estimate display query unchanged except for any proven scope-safe refinements.
- Avoid an extra `getEstimateTabs` estimate validation query in `resolveEstimateTabRouteContext` once the route has already validated project ownership.
- Add exact hero scenarios to `scripts/measure-route-transitions.ts`.
