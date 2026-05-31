# Regression Notes

## Changed Behavior To Watch

- `WorkshopPageShell` now awaits user context and side-panel cookie width in parallel, then wraps children in Suspense.
- Project child routes now have a second route-content Suspense fallback below the project header.
- `getCurrentWorkspaceProject()` uses request-local React `cache()`. GitNexus previously reported high/critical blast radius for the shared project shell path, so project dashboard, charts, estimates list, estimate workspace, and project settings deserve smoke coverage before release.
- Estimate workspace sheet/tree and bubble chart lazy loading should be watched for first-open fallback ordering.
- `/workshop/library` now lazy-loads `LibraryFolderTreeSurface` from `ComponentLibraryManager`; watch first-open tree fallback ordering and folder-tree interaction timing.
- `tests/vitest/component-library-ui.test.tsx` now performs explicit Testing Library cleanup after each test. This resolved order-dependent full-DOM timeouts from accumulated sidebar/modal DOM without changing runtime component behavior.
- CI now includes `bun run test:e2e:perf`; it is expected to skip the authenticated route-transition evidence checks unless dev auth bypass is enabled.
- The authenticated perf smoke targets the visible collapsed sidebar rail icon position. Default center hover/click lands in the clipped label region and is not a valid interaction target for the collapsed sidebar.
- Refreshed authenticated evidence now separates hover-before-click RSC requests from click-transition RSC requests. Local dev-auth browser runs observed transition RSC requests on click, but did not observe hover-before-click `_rsc` requests for sidebar, project-card, or estimate-row surfaces. Local Next.js source/docs inspection shows this is expected in `next dev` because App Router prefetch URL creation is disabled in development.
- Refreshed bfcache evidence now records `pageshow.persisted`, `notRestoredReasons`, JSON metrics, and a screenshot attachment. The production-like headless Chromium run observed `navigationTypes:["back_forward"]` and no stuck overlay, but `pageshow.persisted` was `false`; do not claim manual DevTools bfcache persisted proof.
- `perf:measure-routes` now supports focused production-like benchmark collection with `OUTPUT_FILE`, `SCENARIO_FILTER`, authenticated-scenario gating, overlay visibility rate, and RSC request counts. Watch future changes to public route link labels/selectors because the script measures real clickable links, not synthetic `page.goto()` transitions.
- Local dev-auth `perf:measure-routes` runs now target the visible collapsed-sidebar icon position for authenticated workshop links and expect the settings profile subroute. Keep these details aligned with sidebar and settings navigation changes.
- `perf:profile-peak-load` now writes a local jsdom render-profile JSON artifact for the 50-project / 200-row Phase 6 decision. Treat its numbers as local harness evidence only; use Chrome React Profiler before adding virtualization or broad memoization.

## Validation Coverage

Covered:

- TypeScript.
- Design-system lint.
- Targeted ESLint for touched chart/perf files.
- Unit tests.
- Targeted route-transition/proxy/prefetch/chart/library Vitest coverage.
- Next.js production build.
- Dev-server Playwright route-transition perf smoke.
- Production-like `next start` Playwright route-transition perf smoke.
- Isolated local dev-auth authenticated workshop transition smoke, plus explicit hover-before-click RSC evidence recording for sidebar, project-card, and estimate-row surfaces.
- Full E2E attempt showing route-transition tests pass.
- Code review graph change scan: 43 changed files, 78 changed functions/classes, 0 affected flows, risk score 0.60, 31 graph-reported test gaps.
- Fresh code-review graph review context after the final matrix refresh: 44 changed files, 191 impacted nodes across 92 files, high risk, and 191 graph-reported test gaps.
- GitNexus detect-changes after the hover-evidence contract update: 44 changed files, 91 changed symbols, 58 affected execution flows, and critical risk. This reflects broad shared route/shell/repository touch points and blocks any production-readiness claim.
- Library folder tree dynamic split: source-level regression, two-file component/library Vitest suite, targeted ESLint, type-check, design-system lint, build, and `/workshop/library` manifest byte comparison.
- Fresh expanded route/workshop suite after route-adjacent test cleanup: 10 files, 122 tests passed.
- Fresh expanded route/workshop suite after the bfcache capture correction: 10 files, 124 tests passed.
- Fresh expanded route/workshop/library suite after component-library cleanup: 12 files, 162 tests passed.
- Fresh full DOM rerun completed without route/workshop failures after fixing route-adjacent test debt in `live-estimate-node-route.test.ts`, `estimate-tree-context-menu.test.tsx`, `estimate-sheet-cost-inputs.test.tsx`, and `workshop-library-consolidation-ui.test.tsx`.
- Fresh full DOM rerun after the component-library cleanup completed without component-library failures. Latest full DOM result: 6 failed files, 12 failed tests, 109 passed files, 896 passed tests, 2 skipped; remaining failures are landing/project-publication/project-creation validation debt.
- Standalone `perf:measure-routes` no-throttle focused run on production-like `next start` port 3042: About to Contact median 779 ms, Pricing to Contact median 737 ms, both 0 failures.
- Standalone `perf:measure-routes` Slow 3G focused run on production-like `next start` port 3042: About to Contact median 1893 ms, Pricing to Contact median 3177 ms, both 0 failures.
- Standalone `perf:measure-routes` local dev-auth no-throttle run on `next dev` port 3043: Workshop to Projects median 1940 ms, Library 4496 ms, Templates 2405 ms, Settings/Profile 2716 ms, all 0 failures.
- Standalone `perf:measure-routes` local dev-auth Slow 3G focused run on `next dev` port 3043: Workshop to Projects median 6158 ms, 0 failures.
- Local peak-load render profile: `ProjectEstimatesTable` 50-row initial render 720.61 ms; `EstimateSheetContent` 200-row initial render 1390.33 ms in jsdom; no virtualization or broad memoization added.
- Fresh route-transition perf governance tests after the authenticated measurement-script fixes: 2 files, 5 tests passed.
- Fresh peak-load governance/profile tests: 2 files, 6 tests passed.
- Fresh targeted ESLint, type-check, design-system lint, and whitespace checks passed after the authenticated measurement-script evidence update.
- GitNexus detect-changes after the authenticated measurement-script update: 61 changed files, 122 changed symbols, 58 affected processes, critical risk. This still blocks readiness/archive claims because it reflects broad accumulated route-transition branch breadth plus unrelated dirty worktree changes.

Not fully covered:

- Full clean lint, due unrelated share/publication validation debt.
- Full clean DOM suite, due unrelated landing/publication/security-header/project-creation failures. Latest full DOM result: 6 failed files, 12 failed tests, 109 passed files, 896 passed tests, 2 skipped.
- Manual bfcache DevTools proof. Automated back-forward/no-overlay evidence exists, but headless Chromium reported `pageshow.persisted=false`.
- Production-mode authenticated sidebar/project/estimate-row Network screenshots that prove hover-before-click `_rsc` requests, if achievable outside the local dev-auth environment.
- Forced route-error screenshots.
- Full `@next/bundle-analyzer` report.
- Production deployment/Vercel runtime proof.

## Next Recommended Route-Transition Work

Before archiving the route-transition plan folder, finish the unrelated validation debt or explicitly narrow the completion gate. Then run:

- Production-mode authenticated hover/focus Network proof for sidebar, project-card, and estimate-row surfaces; refreshed automation records the gap but cannot prove hover prefetch in the local dev-auth environment because Next.js disables App Router prefetch URL creation in development.
- Manual or automated forced error-boundary screenshot proof.
- Production Chrome React Profiler trace for the 50-project / 200-row profile before adding virtualization or broad memoization.
- Broaden `perf:measure-routes` with an authenticated Playwright storage state when one is available, then rerun the workshop scenarios in production-like mode instead of local dev-auth mode.
