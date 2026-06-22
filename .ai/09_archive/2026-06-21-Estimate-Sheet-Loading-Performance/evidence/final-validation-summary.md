# Final Validation Summary

Date: 2026-06-22
Branch: `codex/estimate-sheet-loading-performance`

## Implemented Scope

- Phase 0 baseline evidence and static query inventory.
- Phase 1 dedicated sheet-node route loading boundary.
- Phase 2 source guard for server critical-path trace labels.
- Phase 3 Option 3A server tail streaming split.
- Phase 4 dynamic right-sidebar boundary and lazy library behavior guard.
- Phase 5 query-cache hydration guard.
- Phase 6 no-go: no shared layout/auth/cache edit was attempted because no evidence proved the remaining bottleneck required a high-blast shared-shell change.

## Focused Test Matrix

Command:

```bash
bunx vitest run tests/vitest/estimate-sheet-route-loading.test.ts tests/vitest/project-dashboard-route-shell-ui.test.ts tests/vitest/estimate-route-server-concurrency.test.ts tests/vitest/live-estimate-node-route.test.ts tests/vitest/estimate-tabs-domain.test.ts tests/vitest/estimate-workspace-client-cache.test.tsx tests/vitest/estimate-query-cache-hydration.test.tsx tests/vitest/estimate-sheet-tree-query-error.test.tsx tests/vitest/estimate-sheet-large-data-budgets.test.ts tests/vitest/component-library-ui.test.tsx tests/vitest/estimate-component-library-lazy-load.test.tsx tests/vitest/estimate-sheet-library-lazy-load.test.tsx --maxWorkers=1
```

Result:

```text
Test Files  12 passed (12)
Tests       114 passed (114)
```

## Static Checks

```bash
bun run type-check
```

Result: passed.

```bash
bun run build
```

Result: passed.

```bash
bunx eslint e2e/estimate-sheet-loading-performance.spec.ts 'src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx' src/components/workshop/EstimateSheetContent.tsx src/components/workshop/EstimateSheetRouteSkeleton.tsx tests/vitest/estimate-component-library-lazy-load.test.tsx tests/vitest/estimate-query-cache-hydration.test.tsx tests/vitest/estimate-route-server-concurrency.test.ts tests/vitest/estimate-sheet-route-loading.test.ts tests/vitest/project-dashboard-route-shell-ui.test.ts tests/vitest/project-dashboard-ui-fixtures.ts
```

Result: passed.

```bash
git diff --check
```

Result: passed.

## Browser Proof

Added:

- `e2e/estimate-sheet-loading-performance.spec.ts`

Command:

```bash
bunx playwright test e2e/estimate-sheet-loading-performance.spec.ts --project=chromium
```

Result:

```text
1 passed
```

The test created an authenticated Supabase owner session from the configured local test env and injected the Supabase SSR auth cookie before navigation. Evidence is recorded in `browser-smoke.md`.

Claim proven: authenticated Chromium client navigation from the estimates list observed the route-local `estimate-sheet-route-skeleton`, reached the sheet workspace, and did not observe the parent `project-estimates-list-skeleton` after the route-transition observer started.

Boundary: no provider/Vercel/Supabase latency claim is made from this pass because no live `[perf-json]` route trace, hosted preview timing, or provider timing was captured.

## Lint Boundary

Repo-wide `bun run lint` was executed and failed on unrelated baseline issues, not on touched files. Examples include:

- `.gitnexus/run.cjs` `no-require-imports`
- `scripts/prove-project-dashboard-route-browser.mjs` `no-assign-module-variable`
- React Compiler/manual memoization issues in share components
- set-state-in-effect issues in sidebar/project dashboard/location components
- existing `no-var` test files

Touched-file ESLint passed.

## Phase 6 No-Go

No shared layout/auth/cache follow-up was implemented. The route-local changes have source, DOM, browser, type, and build proof; there is no fresh evidence that the remaining bottleneck is in `WorkshopPageShell`, project layout, auth/session, or Cache Components/PPR. Those files remain out of scope for this branch.
