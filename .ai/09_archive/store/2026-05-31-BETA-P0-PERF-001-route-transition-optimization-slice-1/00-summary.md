# Route Transition Optimization Slice 1 Summary

Date: 2026-05-31
Branch: `feat/route-transition-perf`
Scope: Phase 0 baseline/evidence setup, Phase 1 route-transition infrastructure fixes, Phase 2 safe proxy/auth correction.

## Scope Executed

- Captured baseline `bun run build` and `bun run validate` output before edits.
- Replaced async workshop route loading shells with a synchronous static workshop loading shell.
- Repaired `usePrefetchOnHover` to run `router.prefetch(href)` and only run React Query prefetch with real `queryFn`s.
- Wired hover/focus prefetch into sidebar links, project card open links, and estimate row open links.
- Added route error boundaries for estimate workspace, library, and charts routes.
- Raised React Query stale time from 30 seconds to 5 minutes at the provider default and estimate area-tree query override.
- Added a public-route early return in `src/proxy.ts` before Supabase client creation while keeping `supabase.auth.getUser()` for protected/auth route decisions.

## Files Changed

- `.ai/10_state/current-state.md`
- `.ai/03_plans/route-transition-performance-optimization/CURRENT_CANONICAL_PLAN.md`
- `.ai/03_plans/route-transition-performance-optimization/IMPLEMENTATION_MATRIX.md`
- `e2e/auth.spec.ts`
- `src/app/providers.tsx`
- `src/app/workshop/loading.tsx`
- `src/app/workshop/projects/loading.tsx`
- `src/app/workshop/library/loading.tsx`
- `src/app/workshop/templates/loading.tsx`
- `src/app/workshop/settings/loading.tsx`
- `src/app/workshop/onboarding/loading.tsx`
- `src/app/workshop/library/error.tsx`
- `src/app/workshop/projects/[projectId]/charts/error.tsx`
- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/error.tsx`
- `src/components/sidebar/MainSidebar.tsx`
- `src/components/sidebar/SidebarNavItemRow.tsx`
- `src/components/workshop/LiveProjectCard.tsx`
- `src/components/workshop/ProjectEstimatesTable.tsx`
- `src/components/workshop/StaticWorkshopLoadingShell.tsx`
- `src/components/workshop/WorkshopRouteErrorState.tsx`
- `src/hooks/use-estimate-query.ts`
- `src/hooks/use-prefetch-on-hover.ts`
- `src/proxy.ts`
- `tests/vitest/auth-proxy.test.ts`
- `tests/vitest/estimate-sheet-cost-inputs.test.tsx`
- `tests/vitest/project-estimates-table-inline-edit.test.tsx`

## Evidence Files

- Baseline build: `baseline-build.txt`
- Baseline validate: `baseline-validate.txt`
- Final validation outputs: `type-check.txt`, `lint.txt`, `design-system.txt`, `unit-tests.txt`, `dom-tests.txt`, `targeted-route-tests.txt`, `touched-files-eslint.txt`, `build.txt`, `e2e-auth-existing-server-rerun.txt`

## Status

Implemented and validated for the bounded slice. Not beta-ready or production-ready: full benchmark medians, browser hover Network proof, bfcache proof, and screenshots remain pending.
