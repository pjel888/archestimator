# Route Transition Performance Optimization - Subsequent Phases

Date: 2026-05-31

Evidence directory:

`.ai/09_archive/store/2026-05-31-BETA-P0-PERF-001-route-transition-optimization-subsequent-phases/`

## Scope Executed

This run continued the route-transition plan after Slice 1 and implemented the safe remaining local slices that do not require production deployment, provider setup, secrets, or unrelated collaboration/share rewrites.

Implemented:

- Phase 3 route-shell work: `WorkshopPageShell` now parallelizes user context and side-panel cookie reads and wraps route content in a Suspense fallback; project workspace child routes also have a local `ProjectRouteContentFallback`; nested project estimates loading fallback now exists.
- Phase 4 bundle work: estimate workspace tree/content are behind a tiny client dynamic wrapper; component library manager, add-component modal, and library folder tree surface are dynamically imported; D3 imports use submodules; bubble chart is dynamically loaded; landing wireframe background remains deferred with `ssr: false`.
- Phase 5 coverage and audit: hover/focus prefetch has direct regression tests; estimate row prefetch is covered with real `estimateQueryKeys` query functions; repository duplicate-call audit found no additional safe cache candidate with profiling proof beyond request-local `cache()` on `getCurrentWorkspaceProject`.
- Phase 6 peak-load hardening setup: added a non-destructive seed manifest script that generates a 50 project / 1,500 estimate / 300,000 row-item performance fixture manifest without writing to Supabase, plus a local jsdom peak-load render profile for 50 project estimate rows and 200 estimate sheet rows.
- Phase 7 monitoring setup: added route-transition budget config, expanded Playwright perf smoke coverage, refreshed `perf:measure-routes` with JSON output, scenario filtering, overlay visibility rate, RSC request counts, and safe authenticated-scenario skipping, added `perf:seed-fixture`, wired `test:e2e:perf` into CI, and refined authenticated RSC evidence so hover-before-click requests are separated from click-transition requests.

Not done:

- No virtualization or broad `React.memo` was added because the local peak-load render profile did not prove either is needed; production Chrome React Profiler proof remains pending.
- No `unstable_cache`, `cacheTag`, or `"use cache"` was added.
- Authenticated RSC transition proof was refreshed in an isolated temp app on port 3034 with `ARCHESTIMATOR_DEV_AUTH_BYPASS=1` and the local-only `ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1` server DB bypass. The refreshed test separates hover-before-click requests from click-transition requests; this environment did not observe hover `_rsc` requests before click. Local Next.js source/docs inspection now explains this as a development-mode limitation: App Router prefetch URL creation returns `null` when `NODE_ENV === "development"`. Browser Network proof for hover prefetch therefore remains a production-authenticated evidence gap rather than a completed claim.
- Full plan folder was not archived because full validation still has unrelated share/publication/landing blockers, manual benchmark screenshots are still missing, and full bundle-analyzer/Lighthouse tooling is still not installed by design.

## Files Changed

Route-transition implementation:

- `src/components/workshop/WorkshopPageShell.tsx`
- `src/app/workshop/projects/[projectId]/layout.tsx`
- `src/app/workshop/projects/[projectId]/estimates/loading.tsx`
- `src/components/workshop/EstimateWorkspaceClient.tsx`
- `src/components/workshop/ProjectRouteContentFallback.tsx`
- `src/components/charts/CostDonutChart.tsx`
- `src/components/workshop/project-charts/ProjectChartsClient.tsx`
- `src/components/workshop/project-charts/ProjectCostBubbleChart.tsx`
- `src/components/workshop/ProjectEstimatesTable.tsx`
- `src/hooks/use-prefetch-on-hover.ts`

Perf gates and fixtures:

- `.github/workflows/ci.yml`
- `e2e/route-transition-performance.spec.ts`
- `e2e/route-transition-performance-budgets.json`
- `scripts/measure-route-transitions.ts`
- `scripts/seed-performance-test-data.ts`
- `package.json`

Tests and evidence:

- `tests/vitest/use-prefetch-on-hover.test.tsx`
- `tests/vitest/project-estimates-table-inline-edit.test.tsx`
- `tests/vitest/estimate-sheet-cost-inputs.test.tsx`
- `tests/vitest/estimate-tree-context-menu.test.tsx`
- `tests/vitest/live-estimate-node-route.test.ts`
- `tests/vitest/project-dashboard-ui.test.ts`
- `tests/vitest/project-charts-ui.test.tsx`
- `tests/vitest/route-transition-measure-script.test.ts`
- `tests/vitest/route-transition-peak-load-profile.test.tsx`
- `tests/vitest/route-transition-performance-spec.test.ts`
- `tests/vitest/workshop-library-consolidation-ui.test.tsx`

Docs/state:

- `.ai/03_plans/route-transition-performance-optimization/CURRENT_CANONICAL_PLAN.md`
- `.ai/03_plans/route-transition-performance-optimization/IMPLEMENTATION_MATRIX.md`
- `.ai/10_state/current-state.md`

Unrelated dirty pitch-deck files remain in the worktree and were not touched for this route-transition scope.

## Current Status

Route-transition implementation is locally evidenced through targeted tests, build, design-system lint, public/protected Playwright perf smoke, production-like `next start` perf smoke, public Link-transition medians, authenticated transition RSC evidence, and explicit hover-prefetch limitation evidence.

Fresh verification after the route-adjacent test cleanup:

- Expanded route/workshop Vitest suite passed: 10 files, 122 tests (`fresh-expanded-route-transition-workshop-vitest-after-route-adjacent-fixes.txt`).
- Expanded route/workshop Vitest suite passed after the bfcache capture correction: 10 files, 124 tests (`fresh-expanded-route-transition-workshop-vitest-after-bfcache-capture.txt`).
- Expanded route/workshop/library Vitest suite passed after the component-library cleanup: 12 files, 162 tests (`fresh-expanded-route-workshop-vitest-with-component-library-cleanup.txt`).
- TypeScript, design-system lint, unit tests, production build, and whitespace check passed.
- Full `bun run lint` still reports 91 errors and 32 warnings in unrelated share/publication/pitch-deck scopes; route-transition targeted lint is clean.
- Full `bun run test:dom` now completes with 12 failures, all in unrelated landing/project-publication/project-creation scopes. The route/library-adjacent `component-library-ui.test.tsx` timeouts from the fresh continuation were fixed with explicit Testing Library cleanup.
- Fresh production-like route perf smoke now includes Slow 3G Link-transition medians: latest `/features` to `/pricing` median 1389 ms across 3 runs, overlay visibility rate 0.0.
- The refreshed standalone `perf:measure-routes` script now writes JSON artifacts and captured focused production-like Contact route medians on port 3042: no-throttle About to Contact 779 ms / Pricing to Contact 737 ms, and Slow 3G About to Contact 1893 ms / Pricing to Contact 3177 ms.
- The same standalone script captured local dev-auth workshop route medians on `next dev` port 3043: no-throttle Workshop to Projects 1940 ms, Library 4496 ms, Templates 2405 ms, Settings/Profile 2716 ms, and Slow 3G Workshop to Projects 6158 ms. These are local authenticated evidence, not production-mode authenticated browser-session proof.
- Local Phase 6 peak-load render profile evidence now exists: 50 project-estimate rows rendered in 720.61 ms and 200 estimate-sheet rows rendered in 1390.33 ms in jsdom. This supports deferring virtualization/broad memoization for this slice, but it is not a production Chrome React Profiler trace.
- Automated production-like bfcache/back-forward evidence now captures `back_forward` navigation, no stuck route overlay, `notRestoredReasons:[null]`, and `pageshow.persisted=false` in headless Chromium. Manual Chrome DevTools persisted-state proof remains missing.
- Lighthouse public-route samples were captured on the production-like server: `/` score 0.38, `/features` score 0.71, `/pricing` score 0.92. This is partial benchmark evidence, not a full pass.

This is not beta-ready or production-ready because full clean lint/DOM/E2E still have unrelated blockers, the manual benchmark protocol is not fully complete, production-mode authenticated hover Network screenshots remain missing, and GitNexus classifies the accumulated branch diff as critical blast radius across shared route/shell/repository flows.
