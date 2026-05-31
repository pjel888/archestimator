# IMPLEMENTATION MATRIX — Route Transition Performance

**Date:** 2026-05-30  
**Matrix key:** P0=Plan repair & baseline, P1=Low-risk fixes, P2=Auth/proxy, P3=Route-shell/Suspense, P4=Bundle/code-splitting, P5=Data/cache/prefetch, P6=Peak-load hardening, P7=Monitoring/CI/rollout

---

## 2026-05-31 Slice 1 Status

**Evidence:** `.ai/09_archive/store/2026-05-31-BETA-P0-PERF-001-route-transition-optimization-slice-1/`

| Task Range | Status | Evidence Notes |
|---|---|---|
| P0.1/P0.3 | IMPLEMENTED / PARTIAL BENCHMARK ONLY | Baseline and final `bun run build` output captured. Production-like perf smoke now includes Slow 3G Link-transition medians, automated bfcache/back-forward no-overlay evidence, and public Lighthouse samples. Full Chrome/manual benchmark protocol remains pending. |
| P1.1-P1.2 | IMPLEMENTED / NEEDS MANUAL TIMING | Loading skeleton routes now use a synchronous static workshop shell with `aria-hidden` skeleton wrappers. Manual slow-transition timing not captured. |
| P1.3 / P5.1-P5.3 supporting prefetch | IMPLEMENTED / NEEDS PRODUCTION-AUTH NETWORK PROOF | `router.prefetch()` is wired for sidebar, project cards, and estimate rows. Estimate rows use only real `estimateQueryKeys` queryFns. Local Next.js source shows `next dev` disables App Router prefetch URL creation, so production-mode authenticated Browser Network proof remains pending. |
| P1.4-P1.6 | IMPLEMENTED / NEEDS THROW-SMOKE | Estimate workspace, library, and charts error boundaries added with retry UI and dev-only sanitized logging. Forced error screenshots not captured. |
| P1.7 | IMPLEMENTED | Default and estimate area-tree React Query stale time raised to `5 * 60_000`; route-targeted tests and build pass. |
| P2.1-P2.3 | IMPLEMENTED / AUTH SMOKE PASS | Public routes return before Supabase client creation; protected `/workshop` still uses `getUser()`. Auth Playwright smoke passed against existing local server on port 3000. |

**Do not advance to DONE:** This slice does not complete full BETA-P0-PERF evidence because full benchmark medians, production-authenticated hover prefetch Network capture, manual Chrome bfcache DevTools proof, and UX screenshots are still missing.

## 2026-05-31 Subsequent Phase Status

**Evidence:** `.ai/09_archive/store/2026-05-31-BETA-P0-PERF-001-route-transition-optimization-subsequent-phases/`

| Task Range | Status | Evidence Notes |
|---|---|---|
| P3.1-P3.4 | IMPLEMENTED / LOCAL AUTH SMOKE PASS | `WorkshopPageShell` has content Suspense and parallel shell awaits; `[projectId]/layout.tsx` has child-route Suspense; `getCurrentWorkspaceProject()` is request-local cached; nested estimates loading fallback exists. Isolated localhost dev-auth smoke reached `/workshop` and transitioned to `/workshop/projects`. |
| P4.1-P4.7 | IMPLEMENTED / NEEDS FULL BUNDLE ANALYZER | Estimate sheet/tree, `AddComponentModal`, `LibraryFolderTreeSurface`, `ComponentLibraryManager`, `NeatWireframeBackground`, and bubble chart are dynamically imported; D3 imports use `d3-shape` / `d3-hierarchy` submodules. Next.js client-reference manifest evidence shows `/workshop/library` initial JS changed from 618,452 bytes at `HEAD` to 231,552 bytes in this branch. |
| P5.1-P5.4 | IMPLEMENTED / PARTIAL EVIDENCE | Sidebar/project/estimate route prefetch is wired; direct hook and estimate table tests prove route and real query prefetch. Refreshed browser evidence records sidebar/project-card/estimate-row hover-before-click requests separately from click-transition requests; local dev-auth runs did not observe hover-before-click `_rsc` requests, and local Next.js docs/source inspection shows App Router prefetch URL creation is disabled in development. Production-mode authenticated Network proof remains pending. Duplicate repository-call audit added no further cache beyond `getCurrentWorkspaceProject()` because profiling proof was absent. |
| P6.1-P6.3 | IMPLEMENTED AS SAFE HARNESS / LOCAL PROFILE ONLY | Added manifest-only seed fixture for 50 projects, 1,500 estimates, 300,000 row items and a local jsdom render profile for 50 project-estimate rows / 200 estimate-sheet rows. No virtualization or broad memoization added because this profile did not prove the need; production Chrome React Profiler proof remains pending. |
| P7.1-P7.3 | LIGHTWEIGHT GATES IMPLEMENTED / FULL CLEAN GATES PENDING | Added Playwright perf budgets, `test:e2e:perf`, CI wiring, production-like smoke evidence, Slow 3G Link-transition medians, public Link-transition medians, automated bfcache/back-forward no-overlay evidence, public Lighthouse samples, focused standalone `perf:measure-routes` JSON medians for public Contact routes plus local dev-auth workshop routes, authenticated transition evidence, hover-prefetch limitation evidence, and rollback-by-revert notes. Fresh route/workshop/library targeted validation passes 12 files / 162 tests; perf-governance validation passes 2 files / 5 tests. No feature flag was added because this slice avoided risky rollout-only optimizations. Authenticated evidence tests remain skipped in normal CI unless `ARCHESTIMATOR_DEV_AUTH_BYPASS=1`. |

**Do not advance to archived/DONE:** full lint, DOM, and E2E remain blocked by unrelated landing/project-publication/project-creation debt, and manual screenshot/Lighthouse/full analyzer proof remains incomplete. Latest full lint still reports 91 errors / 32 warnings in unrelated scopes. Latest full DOM now completes with 6 failed files / 12 failed tests in unrelated landing/project-publication/project-creation scopes; route/workshop/library targeted validation is green at 12 files / 162 tests.

## Task Matrix

| # | Task | Current Code Status | Current Plan Status | Corrected Recommendation | Files Affected | Risk | Validation | Phase | Owner Gate | Rollback |
|---|------|-------------------|-------------------|------------------------|---------------|------|-----------|-------|-----------|----------|
| P0.1 | Create baseline metrics | IMPLEMENTED / PARTIAL BENCHMARK ONLY | Plan says "Day 0" | Keep adding manual browser/authenticated workshop evidence before DONE | None (measurement only) | NONE | Build output, route inventory, Playwright route timings, Slow 3G Link-transition medians, automated bfcache/back-forward no-overlay evidence, public Lighthouse samples | P0 | Owner | N/A |
| P0.2 | Verify proxy.ts runs in Next 16 | EXISTS and active | ~~Plan claimed "dead code"~~ **CONFIRMED** by Next 16 docs | Already verified: `node_modules/next/dist/build/utils.d.ts` confirms `isMiddlewareFile` accepts `"/src/proxy"`. No action needed. | `src/proxy.ts` (no changes) | NONE | N/A | P0 | N/A | N/A |
| P0.3 | Record build output | IMPLEMENTED | Plan says bundle analysis | Keep build outputs in evidence for every performance slice | None (measurement only) | NONE | `bun run build` | P0 | Owner | N/A |
| P0.4 | Document current code state | IMPLEMENTED / CONFLICTS RESOLVED IN CANONICAL PLAN | Doc 13 partially accurate | Use this matrix and CURRENT_CANONICAL_PLAN.md over older numbered docs | `.ai/` only | NONE | Doc review | P0 | Owner | N/A |
| P1.1 | Fix loading.tsx waterfall | IMPLEMENTED | Plan didn't catch this | Loading routes now use synchronous static workshop shell | 6 loading.tsx files, `StaticWorkshopLoadingShell.tsx` | **MEDIUM** | Type-check, design-system, build; manual slow-transition screenshot pending | P1 | Owner | Revert to WorkshopPageShell |
| P1.2 | Add aria-hidden to skeletons | IMPLEMENTED | Plan mentions in doc 34 §4.4 | Static shell skeleton wrappers use `aria-hidden` | 6 loading.tsx files, `StaticWorkshopLoadingShell.tsx` | LOW | Design-system, build | P1 | None | Revert |
| P1.3 | Wire usePrefetchOnHover (add router.prefetch) | IMPLEMENTED / HOVER NETWORK PROOF STILL PENDING | Plan says use both layers | `router.prefetch()` wired; React Query prefetch only when real queryFns are supplied | `use-prefetch-on-hover.ts`, `MainSidebar.tsx`, `LiveProjectCard.tsx`, `ProjectEstimatesTable.tsx` | MEDIUM | Hook/table tests; authenticated transition smoke; refreshed hover-before-click evidence did not observe `_rsc` before click in `next dev`; Next.js source shows development prefetch URL creation is disabled | P1 | Owner | Revert wiring |
| P1.4 | Add error.tsx (estimate workspace) | IMPLEMENTED / NEEDS THROW-SMOKE SCREENSHOT | Plan says Phase 1.5 | Shared retry UI added with sanitized dev-only logging | `estimates/[nodeId]/error.tsx`, `WorkshopRouteErrorState.tsx` | LOW | Type-check, design-system, build | P1 | None | Remove file |
| P1.5 | Add error.tsx (library) | IMPLEMENTED / NEEDS THROW-SMOKE SCREENSHOT | Plan says Phase 1.5 | Shared retry UI added with sanitized dev-only logging | `library/error.tsx`, `WorkshopRouteErrorState.tsx` | LOW | Type-check, design-system, build | P1 | None | Remove file |
| P1.6 | Add error.tsx (charts) | IMPLEMENTED / NEEDS THROW-SMOKE SCREENSHOT | Plan says Phase 1.5 | Shared retry UI added with sanitized dev-only logging | `charts/error.tsx`, `WorkshopRouteErrorState.tsx` | LOW | Type-check, design-system, build | P1 | None | Remove file |
| P1.7 | Increase staleTime to 5min | IMPLEMENTED | Plan says Phase 1 | Default query stale time and estimate area-tree stale time are `5 * 60_000` | `providers.tsx`, `use-estimate-query.ts` | LOW | Type-check, route-targeted tests | P1 | None | Revert value |
| P2.1 | Add public-route early-return to proxy.ts | IMPLEMENTED / AUTH SMOKE PASS | Plan missed this (claimed dead code) | Public prefixes return via `createRequestPathResponse(request)` before Supabase client creation | `src/proxy.ts` | **MEDIUM** | Proxy unit tests, auth Playwright smoke | P2 | **Owner REQUIRED** | Revert early-return |
| P2.2 | Verify auth method safety (getUser, not getSession) | Currently safe (getUser) | **HAD UNSAFE RECOMMENDATION** (getSession) | Keep getUser(). Remove getSession() from all docs | None (doc fix) | **HIGH** | Code review: no getSession() in proxy | P2 | **Owner REQUIRED** | N/A |
| P2.3 | Run auth E2E tests after proxy change | AUTH SMOKE PASS / FULL E2E BLOCKED UNRELATED | Plan requires it | Keep route/auth smoke coverage until unrelated landing/share failures are fixed | None | MEDIUM | Auth redirect/proxy tests pass; full E2E has unrelated landing/share blockers | P2 | Owner | Fix proxy if tests fail |
| P3.1 | Add Suspense boundary in WorkshopPageShell for children | IMPLEMENTED / LOCAL AUTH SMOKE PASS | Plan Phase 2 | Children are wrapped in Suspense with route content fallback | `WorkshopPageShell.tsx`, `ProjectRouteContentFallback.tsx` | **HIGH** | Local dev-auth route smoke, type-check, build | P3 | Owner | Revert Suspense |
| P3.2 | React.cache() on getCurrentWorkspaceProject | IMPLEMENTED | Plan Phase 1 | `getCurrentWorkspaceProject()` uses request-local `cache()` | `workspace-repository.ts` | LOW | Type-check, build, repository call inspection | P3 | None | Remove cache() |
| P3.3 | Parallelize project layout queries | IMPLEMENTED | Plan identifies bottleneck | Project route layout fetches sibling data with `Promise.all` after project auth lookup | `[projectId]/layout.tsx` | MEDIUM | Type-check, build, local dev-auth route smoke | P3 | None | Revert to sequential |
| P3.4 | Add loading.tsx for [projectId] estimates list | IMPLEMENTED / NEEDS MANUAL SLOW-ROUTE SCREENSHOT | Plan Phase 1 | Added nested estimates loading fallback | `estimates/loading.tsx`, `ProjectRouteContentFallback.tsx` | LOW | Type-check, build | P3 | None | Remove file |
| P4.1 | Dynamic import EstimateSheetContent (named export) | IMPLEMENTED | Plan Phase 1 | Dynamic named import lives in `EstimateWorkspaceClient` wrapper | `EstimateWorkspaceClient.tsx`, `estimates/[nodeId]/page.tsx` | MEDIUM | Build passes; route chunks visible | P4 | Owner | Revert to static import |
| P4.2 | Dynamic import EstimateSheetTree (named export) | IMPLEMENTED | Plan Phase 1 | Dynamic named import lives in `EstimateWorkspaceClient` wrapper | `EstimateWorkspaceClient.tsx`, `estimates/[nodeId]/page.tsx` | MEDIUM | Build passes; route chunks visible | P4 | Owner | Revert |
| P4.3 | Dynamic import AddComponentModal (named export) | IMPLEMENTED | Plan Phase 1 | `ComponentLibraryManager` uses named dynamic import for `AddComponentModal` | `ComponentLibraryManager.tsx` | MEDIUM | Related component-library Vitest suite, build | P4 | Owner | Revert |
| P4.4 | Dynamic import LibraryFolderTree (named export) | **IMPLEMENTED** | Plan Phase 1 | `ComponentLibraryManager` uses named dynamic import for `LibraryFolderTreeSurface`; shared constants/types moved to a lightweight helper | `ComponentLibraryManager.tsx`, `LibraryFolderTree.tsx`, `library-folder-tree-shared.ts` | MEDIUM | Source regression, component/library Vitest suite, build, route manifest byte comparison | P4 | Owner | Revert dynamic import/shared helper |
| P4.5 | Dynamic import ComponentLibraryManager (named export) | IMPLEMENTED | Plan Phase 1 | `LibraryPageClient` dynamically imports `ComponentLibraryManager` | `LibraryPageClient.tsx` | MEDIUM | Related component-library Vitest suite, build | P4 | Owner | Revert |
| P4.6 | Dynamic import Three.js (NeatWireframeBackground) | IMPLEMENTED | Plan Phase 1 | Landing hero dynamically imports `NeatWireframeBackground` with `ssr:false` and static fallback | `HeroSection.tsx` | **HIGH** | Build, route perf smoke | P4 | Owner | Revert to static |
| P4.7 | Fix Phosphor import paths (3 files) | IMPLEMENTED | Plan missed this | Runtime imports changed to `@phosphor-icons/react/dist/ssr` in affected files | `ContactForm.tsx`, `ProjectChartsClient.tsx`, `projects-page-client.tsx` | LOW | Build and lint pass for touched files | P4 | None | Revert imports |
| P5.1 | router.prefetch() on sidebar links | IMPLEMENTED / HOVER NETWORK PROOF STILL PENDING | Plan partially correct | Sidebar links prefetch RSC payloads on hover/focus | `MainSidebar.tsx`, `SidebarNavItemRow.tsx`, `use-prefetch-on-hover.ts` | LOW | Hook test, isolated authenticated transition smoke, refreshed hover-before-click evidence recording, Next.js dev-mode prefetch source inspection | P5 | None | Remove prefetch calls |
| P5.2 | router.prefetch() on project cards | IMPLEMENTED / HOVER NETWORK PROOF STILL PENDING | Plan partially correct | `LiveProjectCard` prefetches project detail href on hover/focus | `LiveProjectCard.tsx` | LOW | Type-check, build, code inspection, live project-card hover evidence recording | P5 | None | Remove prefetch |
| P5.3 | React Query prefetch on estimate rows (real keys + real queryFn) | IMPLEMENTED / HOVER NETWORK AND DEVTOOLS SCREENSHOT PENDING | Plan partially correct | Estimate rows prefetch RSC route plus `estimateQueryKeys.detail` and `areaTree` with real queryFns | `ProjectEstimatesTable.tsx` | LOW | Estimate table Vitest suite, type-check, build, live estimate-row hover evidence recording | P5 | None | Remove prefetch |
| P5.4 | React.cache() on all duplicate-called functions | PARTIAL / PROFILE-GATED | Plan Phase 1 | Only `getCurrentWorkspaceProject()` was cached; broader repository caching deferred without duplicate-call proof | `workspace-repository.ts` | LOW | Code inspection, build | P5 | None | Remove cache() |
| P6.1 | Seed performance test data | IMPLEMENTED AS MANIFEST HARNESS | Plan Phase 0.5 | Seed fixture script generates local manifest without touching production data | `scripts/seed-performance-test-data.ts` | NONE | Script output evidence | P6 | None | Delete seed manifest |
| P6.2 | Profile before adding React.memo | IMPLEMENTED / LOCAL JSDOM PROFILE ONLY | Plan deferred | Local harness renders 50 project-estimate rows and 200 estimate-sheet rows; Chrome React Profiler trace still pending | `tests/vitest/route-transition-peak-load-profile.test.tsx`, `package.json` | NONE | `perf:profile-peak-load`, JSON evidence | P6 | None | N/A |
| P6.3 | Virtualization only if profiler shows need | DEFERRED / NO PROOF OF NEED | Plan deferred | Local profile recorded defer decision; do not add virtualization or broad memo until production/browser profiler proves jank or re-render cost | None | MEDIUM | Future Chrome profiler evidence | P6 | Owner | N/A |
| P7.1 | Performance budget in CI | IMPLEMENTED / LIGHTWEIGHT ONLY | Plan Phase 4 | Added route-transition Playwright budget smoke to CI; public Lighthouse samples are captured but not CI-gated; full analyzer gates remain pending | `.github/workflows/ci.yml` | LOW | `test:e2e:perf` local evidence, CI config inspection, Lighthouse public-route samples | P7 | Owner | Adjust thresholds |
| P7.2 | Playwright perf smoke tests and standalone route measurements | IMPLEMENTED | Plan Phase 4 | Added route transition timing assertions, public route medians, Slow 3G Link-transition medians, automated bfcache/back-forward no-overlay diagnostics, and focused `perf:measure-routes` JSON output with overlay/RSC metrics | `e2e/route-transition-performance.spec.ts`, `e2e/route-transition-performance-budgets.json`, `scripts/measure-route-transitions.ts` | LOW | Dev and production-like perf smoke evidence; standalone Contact route medians; local dev-auth workshop route medians | P7 | Owner | Skip in CI or filter scenarios |
| P7.3 | Feature flags for risky changes | EVALUATED / NO FLAG ADDED | Plan Phase 4 | No env gate was added because this slice avoided virtualization, unstable caching, and production-only behavior; rollback is by revert | Docs/evidence only | LOW | Regression notes and evidence review | P7 | Owner | Revert dynamic import/cache commits |

---

## Phase Summary

| Phase | Tasks | Risk Level | Blocked By | Estimated Effort | Status |
|-------|-------|-----------|------------|-----------------|--------|
| P0 — Baseline | P0.1–P0.4 | NONE | Nothing | 2h (measurement only) | IMPLEMENTED / PARTIAL BENCHMARK ONLY; PUBLIC LIGHTHOUSE + SLOW 3G LINK + AUTOMATED BFCACHE EVIDENCE ADDED |
| P1 — Fix Flaws | P1.1–P1.7 | LOW–MEDIUM | P0 baseline | 4–6h | IMPLEMENTED / NEEDS MANUAL UX PROOF |
| P2 — Auth/Proxy | P2.1–P2.3 | MEDIUM–**HIGH** | P1 | 2–4h | IMPLEMENTED / AUTH SMOKE PASS |
| P3 — Route Shell | P3.1–P3.4 | MEDIUM–**HIGH** | P2 | 4–6h | IMPLEMENTED / NEEDS MANUAL SLOW-ROUTE PROOF |
| P4 — Bundle/Code Split | P4.1–P4.7 | MEDIUM–**HIGH** | P3 | 4–6h | IMPLEMENTED / NEEDS FULL ANALYZER PROOF |
| P5 — Data/Cache/Prefetch | P5.1–P5.4 | LOW | P4 | 4–6h | IMPLEMENTED / PARTIAL NETWORK PROOF |
| P6 — Peak Load | P6.1–P6.3 | MEDIUM | P5 (profiling data) | 4–6h | SAFE HARNESS ADDED / PROFILING-GATED OPTIMIZATIONS DEFERRED |
| P7 — Monitoring/CI | P7.1–P7.3 | LOW | P1–P6 complete | 2–4h | LIGHTWEIGHT GATES IMPLEMENTED / FULL CLEAN GATES PENDING |

---

## Tasks That Must NOT Be Implemented Yet

| Task | Reason |
|------|--------|
| Creating `src/middleware.ts` | proxy.ts IS the middleware in Next 16 |
| Switching to `getSession()` in proxy | SECURITY RISK per Supabase docs |
| Adding 150ms show delay to overlay | Premature — measure first |
| Adding React.memo to all components | Profile first — blanket memo is harmful |
| Adding unstable_cache without user scoping | Cross-user cache leak risk |
| Font route-splitting (workshop layout) | Architectural change — defer |
| "use cache" directive | Not stable in Next 16.2.6 |
| Virtualization without profiling | May be unnecessary |
