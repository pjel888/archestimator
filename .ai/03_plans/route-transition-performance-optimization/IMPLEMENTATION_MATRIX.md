# IMPLEMENTATION MATRIX — Route Transition Performance

**Date:** 2026-05-30  
**Matrix key:** P0=Plan repair & baseline, P1=Low-risk fixes, P2=Auth/proxy, P3=Route-shell/Suspense, P4=Bundle/code-splitting, P5=Data/cache/prefetch, P6=Peak-load hardening, P7=Monitoring/CI/rollout

---

## Task Matrix

| # | Task | Current Code Status | Current Plan Status | Corrected Recommendation | Files Affected | Risk | Validation | Phase | Owner Gate | Rollback |
|---|------|-------------------|-------------------|------------------------|---------------|------|-----------|-------|-----------|----------|
| P0.1 | Create baseline metrics | NOT measured | Plan says "Day 0" | Fill BENCHMARK_PROTOCOL.md scenarios | None (measurement only) | NONE | Manual | P0 | Owner | N/A |
| P0.2 | Verify proxy.ts runs in Next 16 | EXISTS and active | ~~Plan claimed "dead code"~~ **CONFIRMED** by Next 16 docs | Already verified: `node_modules/next/dist/build/utils.d.ts` confirms `isMiddlewareFile` accepts `"/src/proxy"`. No action needed. | `src/proxy.ts` (no changes) | NONE | N/A | P0 | N/A | N/A |
| P0.3 | Record build output | NOT measured | Plan says bundle analysis | `bun run build 2>&1 | tee` | None | NONE | `bun run build` | P0 | Owner | N/A |
| P0.4 | Document current code state | PARTIAL (doc 13 has errors) | Doc 13 partially accurate | CODEBASE_AUDIT.md created | `.ai/` only | NONE | Doc review | P0 | Owner | N/A |
| P1.1 | Fix loading.tsx waterfall | **FLAWED** — WorkshopPageShell blocks skeleton | Plan didn't catch this | Replace WorkshopPageShell with static chrome shell | 6 loading.tsx files | **MEDIUM** | Manual: skeleton within 50ms on Slow 3G | P1 | Owner | Revert to WorkshopPageShell |
| P1.2 | Add aria-hidden to skeletons | **MISSING** — not on skeleton containers | Plan mentions in doc 34 §4.4 | Add aria-hidden="true" wrapper | 6 loading.tsx files | LOW | Screen reader test | P1 | None | Revert |
| P1.3 | Wire usePrefetchOnHover (add router.prefetch) | **FLAWED** — only React Query, no router.prefetch(), no queryFn | Plan says use both layers | Add router.prefetch() + real queryFns | `use-prefetch-on-hover.ts`, `MainSidebar.tsx`, `LiveProjectCard.tsx` | MEDIUM | Network tab: RSC payload loaded on hover | P1 | Owner | Revert wiring |
| P1.4 | Add error.tsx (estimate workspace) | **NOT IMPLEMENTED** | Plan says Phase 1.5 | Create now as P1 | `estimates/[nodeId]/error.tsx` | LOW | Throw error, verify retry UI | P1 | None | Remove file |
| P1.5 | Add error.tsx (library) | **NOT IMPLEMENTED** | Plan says Phase 1.5 | Create now as P1 | `library/error.tsx` | LOW | Throw error, verify retry UI | P1 | None | Remove file |
| P1.6 | Add error.tsx (charts) | **NOT IMPLEMENTED** | Plan says Phase 1.5 | Create now as P1 | `charts/error.tsx` | LOW | Throw error, verify retry UI | P1 | None | Remove file |
| P1.7 | Increase staleTime to 5min | 30s currently | Plan says Phase 1 | Change to 5 * 60_000 | `providers.tsx` | LOW | React Query DevTools: verify staleTime | P1 | None | Revert value |
| P2.1 | Add public-route early-return to proxy.ts | **MISSING** — getUser() called on landing pages | Plan missed this (claimed dead code) | Skip Supabase client for public prefixes | `src/proxy.ts` | **MEDIUM** | Check Network: no Supabase auth call on `/` | P2 | **Owner REQUIRED** | Revert early-return |
| P2.2 | Verify auth method safety (getUser, not getSession) | Currently safe (getUser) | **HAD UNSAFE RECOMMENDATION** (getSession) | Keep getUser(). Remove getSession() from all docs | None (doc fix) | **HIGH** | Code review: no getSession() in proxy | P2 | **Owner REQUIRED** | N/A |
| P2.3 | Run auth E2E tests after proxy change | Tests exist | Plan requires it | `bun run test:e2e` after P2.1 | None | MEDIUM | All auth E2E pass | P2 | Owner | Fix proxy if tests fail |
| P3.1 | Add Suspense boundary in WorkshopPageShell for children | **NOT IMPLEMENTED** | Plan Phase 2 | Wrap children in Suspense for content streaming | `WorkshopPageShell.tsx` | **HIGH** | Skeleton appears before auth resolves | P3 | Owner | Revert Suspense |
| P3.2 | React.cache() on getCurrentWorkspaceProject | **NOT IMPLEMENTED** | Plan Phase 1 | Wrap in cache() — deduplicates layout+page double-fetch | `workspace-repository.ts` | LOW | Verify 1 Supabase query per request (not 2) | P3 | None | Remove cache() |
| P3.3 | Parallelize project layout queries | Sequential await | Plan identifies bottleneck | Fire all 4 in parallel (no sequential step 1→2) | `[projectId]/layout.tsx` | MEDIUM | Verify parallel Supabase calls | P3 | None | Revert to sequential |
| P3.4 | Add loading.tsx for [projectId] estimates list | **MISSING** | Plan Phase 1 | Create loading.tsx with estimate-list skeleton | `estimates/loading.tsx` | LOW | Skeleton on slow navigation | P3 | None | Remove file |
| P4.1 | Dynamic import EstimateSheetContent (named export) | NOT code-split | Plan Phase 1 | .then(mod => mod.EstimateSheetContent) + skeleton | `estimates/[nodeId]/page.tsx` | MEDIUM | Build passes, new chunk visible | P4 | Owner | Revert to static import |
| P4.2 | Dynamic import EstimateSheetTree (named export) | NOT code-split | Plan Phase 1 | Same pattern | `estimates/[nodeId]/page.tsx` | MEDIUM | Build passes, new chunk | P4 | Owner | Revert |
| P4.3 | Dynamic import AddComponentModal (named export) | NOT code-split | Plan Phase 1 | Same pattern | `ComponentLibraryManager.tsx` | MEDIUM | Modal opens correctly | P4 | Owner | Revert |
| P4.4 | Dynamic import LibraryFolderTree (named export) | NOT code-split | Plan Phase 1 | Same pattern | `ComponentLibraryManager.tsx` | MEDIUM | Tree renders correctly | P4 | Owner | Revert |
| P4.5 | Dynamic import ComponentLibraryManager (named export) | NOT code-split | Plan Phase 1 | Same pattern | `library/page.tsx` | MEDIUM | Library loads correctly | P4 | Owner | Revert |
| P4.6 | Dynamic import Three.js (NeatWireframeBackground) | NOT split — blocks hero LCP | Plan Phase 1 | .then(mod => mod.NeatWireframeBackground), ssr:false, CSS placeholder | `HeroSection.tsx` or wrapper | **HIGH** | Hero headline renders before Three.js chunk | P4 | Owner | Revert to static |
| P4.7 | Fix Phosphor import paths (3 files) | Wrong path → runtime bundles | Plan missed this | Change to @phosphor-icons/react/dist/ssr | `ContactForm.tsx`, `ProjectChartsClient.tsx`, `projects-page-client.tsx` | LOW | Build size reduced | P4 | None | Revert imports |
| P5.1 | router.prefetch() on sidebar links | NOT prefetching RSC | Plan partially correct | Add router.prefetch() in usePrefetchOnHover, wire to sidebar | `MainSidebar.tsx` | LOW | Network: RSC payload prefetched | P5 | None | Remove prefetch calls |
| P5.2 | router.prefetch() on project cards | NOT prefetching | Plan partially correct | Wire to LiveProjectCard hover | `LiveProjectCard.tsx` | LOW | Network: project detail prefetched | P5 | None | Remove prefetch |
| P5.3 | React Query prefetch on estimate rows (real keys + real queryFn) | NOT prefetching | Plan partially correct | Wire with estimateQueryKeys + queryFn | `ProjectEstimatesTable.tsx` | LOW | React Query DevTools: data pre-cached | P5 | None | Remove prefetch |
| P5.4 | React.cache() on all duplicate-called functions | Only getCurrentUserContext has cache() | Plan Phase 1 | Wrap workspace-repository exports in cache() | `workspace-repository.ts`, others | LOW | Verify deduplication | P5 | None | Remove cache() |
| P6.1 | Seed performance test data | NOT implemented | Plan Phase 0.5 | Create seed script | `scripts/seed-performance-test-data.ts` | NONE | Verify data appears | P6 | None | Delete seed data |
| P6.2 | Profile before adding React.memo | NOT profiled | Plan deferred | Run React Profiler on estimate workspace with 200 rows | None (measurement) | NONE | Profiler shows re-render costs | P6 | None | N/A |
| P6.3 | Virtualization only if profiler shows need | NOT virtualized | Plan deferred | Test @tanstack/react-virtual if 50+ items cause jank | Various list components | MEDIUM | Scroll jank eliminated | P6 | Owner | Revert virtualization |
| P7.1 | Performance budget in CI | NOT implemented | Plan Phase 4 | Add bundle size + Lighthouse thresholds to CI | `.github/workflows/ci.yml` | LOW | CI blocks regressions | P7 | Owner | Adjust thresholds |
| P7.2 | Playwright perf smoke tests | NOT implemented | Plan Phase 4 | Add route transition timing assertions | `e2e/perf/` | LOW | CI runs on PR | P7 | Owner | Skip in CI |
| P7.3 | Feature flags for risky changes | NOT implemented | Plan Phase 4 | Add env-var gates for dynamic imports | `next.config.ts` or app code | LOW | Can revert single feature | P7 | Owner | Remove flags |

---

## Phase Summary

| Phase | Tasks | Risk Level | Blocked By | Estimated Effort | Status |
|-------|-------|-----------|------------|-----------------|--------|
| P0 — Baseline | P0.1–P0.4 | NONE | Nothing | 2h (measurement only) | ✅ **Ready** |
| P1 — Fix Flaws | P1.1–P1.7 | LOW–MEDIUM | P0 baseline | 4–6h | ✅ **Ready after P0** |
| P2 — Auth/Proxy | P2.1–P2.3 | MEDIUM–**HIGH** | P1 | 2–4h | ✅ **Unlocked — owner approved** |
| P3 — Route Shell | P3.1–P3.4 | MEDIUM–**HIGH** | P2 | 4–6h | ✅ **Unlocked — owner approved** |
| P4 — Bundle/Code Split | P4.1–P4.7 | MEDIUM–**HIGH** | P3 | 4–6h | ✅ **Unlocked — owner approved** |
| P5 — Data/Cache/Prefetch | P5.1–P5.4 | LOW | P4 | 4–6h | ✅ **Unlocked — owner approved** |
| P6 — Peak Load | P6.1–P6.3 | MEDIUM | P5 (profiling data) | 4–6h | ✅ **Unlocked — owner approved** |
| P7 — Monitoring/CI | P7.1–P7.3 | LOW | P1–P6 complete | 2–4h | ✅ **Unlocked — owner approved** |

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
