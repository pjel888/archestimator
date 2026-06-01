# CURRENT CANONICAL PLAN — Route Transition Performance Optimization

**Status:** Route-transition implementation slices completed through safe local Phase 7 gates; fresh production-like public/protected/authenticated storage-state, true bundle-analyzer, authenticated Lighthouse, sidebar hover-prefetch, and public bfcache cache-header mitigation evidence captured; authenticated Lighthouse score gap improved above the prior target after the project-list payload trim; full archive remains blocked by manual DevTools bfcache proof and production Chrome React Profiler evidence — 2026-06-01
**Replaces:** All previous docs where they conflict  
**Audit basis:** Full static codebase audit against live repo on 2026-05-30  
**Owner approval:** ⏳ Pending

---

## Executive Summary

This document is the **single source of truth** for the route transition performance plan. It was produced by a comprehensive audit of all 35 existing plan documents against the live codebase. Every stale claim, contradiction, and implementation gap has been identified and corrected.

**The central finding:** The existing plan contains 3 critical errors that would break implementation if followed:

1. **It claims `src/proxy.ts` is dead code and recommends creating `src/middleware.ts`.** WRONG. In Next.js 16, `src/proxy.ts` IS the active middleware. The file is running. The auth check (`getUser()`) fires on every request. Creating a `middleware.ts` re-export is unnecessary and potentially confusing.

2. **It recommends using `auth.getSession()` for server-side protection, claiming it's faster.** DANGEROUS. Current Supabase SSR docs explicitly warn against trusting `getSession()` in server middleware. The actual code correctly uses `auth.getUser()` which validates the JWT with Supabase. The plan must NOT recommend switching to `getSession()`.

3. **The overlay timing strategy is contradictory across documents.** Some docs say add 150ms show delay and remove min-display; others say immediate show with 250ms min-display is intentional. The actual code implements immediate show with MIN_DISPLAY_MS=250. Resolution: keep the current behavior (immediate show + MIN_DISPLAY_MS=250) for now; add a delayed-fallback overlay strategy in a later phase IF measurement shows the overlay flashes too often.

## Slice 1 Execution Update — 2026-05-31

**Evidence:** `.ai/09_archive/store/2026-05-31-BETA-P0-PERF-001-route-transition-optimization-slice-1/`

**Implemented in this slice:**
- Phase 0 repo-truth and baseline capture: branch/dirtystate recorded, baseline build captured, baseline validate failure recorded as pre-existing lint debt in share/publication/deck scopes.
- Phase 1 low-risk infrastructure fixes: static workshop loading shell, six workshop loading routes rewired away from async `WorkshopPageShell`, route prefetch hook repaired and wired to sidebar/project/estimate entry points, three route error boundaries added, React Query stale time raised to five minutes.
- Phase 2 proxy/auth correction: public page early return added before Supabase client creation while preserving `AUTH_REQUEST_PATH_HEADER`, `/workshop` protection, `/api` skip behavior, dev auth bypass, and `supabase.auth.getUser()`.

**Validation summary:** `bun run type-check`, `bun run lint:design-system`, `bun run test`, targeted route/auth/workshop Vitest checks, `bun run build`, and auth Playwright smoke passed. Full `bun run lint` and `bun run test:dom` still fail on documented pre-existing share/publication/security-header/chart governance issues outside this slice.

**Benchmark limitation:** This slice has build output, route inventory, and auth/proxy smoke evidence only. Full manual Chrome throttling traces, hover network screenshots, bfcache verification, and route-transition timing medians remain required before claiming full BETA-P0-PERF readiness.

## Subsequent Phase Execution Update — 2026-05-31

**Evidence:** `.ai/09_archive/store/2026-05-31-BETA-P0-PERF-001-route-transition-optimization-subsequent-phases/`

**Implemented in this continuation:**
- Phase 3 route-shell support: `WorkshopPageShell` now parallelizes user-context and side-panel cookie reads and wraps children in Suspense; project workspace child routes have a local `ProjectRouteContentFallback`; nested project estimates loading fallback now exists; `getCurrentWorkspaceProject()` remains request-local cached with React `cache()`.
- Phase 4 bundle work: estimate workspace tree/content are loaded through a tiny client dynamic wrapper; `/workshop/library` lazy-loads `ComponentLibraryManager`; `ComponentLibraryManager` lazy-loads `AddComponentModal` and `LibraryFolderTreeSurface`; the landing `NeatWireframeBackground` is dynamically imported with `ssr: false`; D3 imports use submodules; the bubble chart is dynamically imported. A Next.js client-reference manifest comparison shows `/workshop/library` initial JS decreased from 618,452 bytes at `HEAD` to 231,552 bytes in this branch.
- Phase 5 evidence: direct hook and table-level regression coverage prove debounced `router.prefetch()` and real estimate React Query prefetch queryFns. The duplicate repository-call audit did not add more cache wrappers because no profiling proof justified broader caching.
- Phase 6 support: a manifest-only peak-load fixture script generates 50 projects, 1,500 estimates, and 300,000 row items without writing to Supabase. A local jsdom profile harness renders 50 project-estimate rows and 200 estimate-sheet rows and records a defer decision for virtualization/broad memoization until production Chrome React Profiler evidence proves the need.
- Phase 7 support: `test:e2e:perf` now has budget config, public/protected/bfcache/Slow 3G/public Link-transition smoke coverage, production-like `next start` evidence, CI wiring, refreshed standalone `perf:measure-routes` JSON output with scenario filtering / overlay rate / RSC counts, focused public Contact medians, and local dev-auth authenticated workshop medians using the localhost-only dev-auth flags. A later evidence-contract fix separated hover-before-click requests from click-transition requests and showed that local dev-auth browser runs did not observe hover-before-click `_rsc` requests for sidebar, project-card, or estimate-row surfaces. Local Next.js docs/source inspection explains that gap for `next dev`: App Router prefetch URL creation is disabled in development, while the local authenticated bypass is development-only.
- Phase 7 evidence harness refresh: Slow-network link-transition tests now use visible role-based links, `page.waitForURL`, and `finally`-detached CDP throttling. Fresh `PLAYWRIGHT_PORT=3032 bun run test:e2e:perf` passed 6 public/protected checks and skipped the 2 dev-auth-gated checks after two Playwright-owned dev-server retries on ports 3020/3027 failed with SIGTERM/`ERR_CONNECTION_REFUSED`.
- Error-boundary evidence refresh: the actual library, project charts, and estimate workspace route `error.tsx` components now have direct DOM coverage for sanitized retry UI and `reset()` behavior. A component-level forced-render screenshot is captured for the shared error UI, and an env/query-gated live dev-auth smoke captured thrown-route screenshots for library, project charts, and estimate workspace.

**Validation summary:** route-transition-owned checks pass: targeted ESLint, targeted route-transition Vitest, route-error smoke gate Vitest, live dev-auth route-error Playwright smoke, `bun run type-check`, `bun run lint`, `bun run lint:design-system`, `bun run test`, `bun run test:dom`, `bun run build`, full `bun run test:e2e`, dev-server `test:e2e:perf`, production-like `next start` `test:e2e:perf`, focused standalone `perf:measure-routes` no-throttle and Slow 3G Contact-route runs, local dev-auth standalone workshop route runs, isolated authenticated transition smoke, and project-card/estimate-row hover evidence recording. Latest fresh E2E evidence after the live route-error smoke recorded 9 passed and 20 intentionally skipped. Latest local perf evidence recorded Slow 3G `/features` to `/pricing` link median 6470 ms with overlay visibility 0, normal `/features` to `/pricing` median 319 ms with overlay visibility 1, public bfcache/back-forward restore 48 ms with no stuck overlay, and protected redirect `/workshop/projects` to `/login?next=...` 69.9 ms.

**2026-06-01 evidence refresh:** A fresh `bun run build` passed. Production-like `next start` on port 3052 passed `PLAYWRIGHT_PORT=3052 bun run test:e2e:perf -- --project=chromium` with 6 public/protected checks and 2 authenticated skips. Latest metrics from that run: Slow 3G `/features` to `/pricing` median 1127 ms, normal `/features` to `/pricing` median 179 ms, public bfcache/back-forward restore 24 ms with no stuck overlay but `pageshow.persisted=false`, and protected redirect 61.5 ms. A no-dependency `.next` client-reference manifest audit is captured in `fresh-bundle-manifest-audit-20260601.md`: `/workshop/library/page` is 233,955 initial JS bytes; largest remaining initial JS routes are project estimates, charts, estimate workspace, and project detail.

**2026-06-01 post-collaboration evidence refresh:** Local `bun run test:e2e:perf -- --project=chromium` on port 3020 passed 6 public/protected checks with 2 authenticated skips. Latest metrics from that run: Slow 3G `/features` to `/pricing` Link-transition median 6893 ms with overlay visibility 0, normal `/features` to `/pricing` median 209 ms with overlay visibility 1, public bfcache/back-forward restore 22 ms with no stuck overlay but `pageshow.persisted=false`, and protected redirect `/workshop/projects` to `/login?next=...` 127.2 ms.

**2026-06-01 production-authenticated storage-state evidence refresh:** Evidence lives at `.ai/09_archive/store/route-transition-production-auth-refresh-20260601T093203Z/`. A fresh `bun run build` passed, `next start` ran on port 3064, and `PLAYWRIGHT_PORT=3064 PLAYWRIGHT_STORAGE_STATE=/tmp/.../storage-state.json bun run test:e2e:perf -- --project=chromium` passed all 8 route-transition perf checks. The run used a temporary real Supabase auth user/workspace/project/estimate, deleted the temporary records afterward, and recorded `{"authResidue":0,"profileResidue":0,"workspaceResidue":0,"projectResidue":0}`. Latest metrics from that run: Slow 3G `/features` to `/pricing` Link-transition median 834 ms with overlay visibility 0.67, normal `/features` to `/pricing` median 394 ms with overlay visibility 1, public bfcache/back-forward restore 352 ms with no stuck overlay but `pageshow.persisted=false`, protected redirect 207.8 ms, and authenticated `/workshop` to `/workshop/projects` transition 392 ms with one click-transition `_rsc` request. Project-card and estimate-row hover-before-click `_rsc` proof is captured under storage-state auth. Sidebar hover-before-click `_rsc` was not observed in this earlier environment; the later sidebar hover-prefetch proof below closes that specific gap. Standalone `perf:measure-routes` authenticated storage-state benchmarks also passed: no-throttle medians were Projects 2325 ms, Library 2675 ms, Templates 1857 ms, Settings 2725 ms; Slow 3G medians were Projects 6941 ms, Library 6748 ms, Templates 5864 ms, Settings 11963 ms.

**2026-06-01 analyzer and authenticated Lighthouse refresh:** Evidence lives at `.ai/09_archive/store/route-transition-analyzer-lighthouse-refresh-20260601T101500Z/`. `@next/bundle-analyzer` is installed and `next.config.ts` wraps the config only when `ANALYZE=true`. A default Turbopack `ANALYZE=true bun run build` passed but emitted Next's warning that `@next/bundle-analyzer` does not generate reports for Turbopack; the required true treemap path is therefore `ANALYZE=true bunx next build --webpack`, which passed and produced archived `client.html`, `nodejs.html`, and `edge.html` analyzer reports. The same pass exposed invalid non-route exports in API route files; those were moved into handler/helper modules, and targeted AI/proposal route tests plus type-check and ESLint passed. A fresh temporary real Supabase auth user/workspace then authenticated `/workshop/projects` under `next start` on port 3065; Lighthouse ran with the generated Supabase SSR cookies passed as an extra `Cookie` header and wrote JSON/HTML reports. Lighthouse final URL was `/workshop/projects`; performance score was `0.73`, FCP `1225.332 ms`, LCP `3960.164 ms`, CLS `0`, TBT `422.501 ms`, Speed Index `5381.952 ms`, and bfcache audit score `0`. Cleanup removed the temporary auth user/profile/workspace and recorded zero residue.

**2026-06-01 authenticated Lighthouse follow-up:** Evidence lives at `.ai/09_archive/store/route-transition-lighthouse-followup-20260601T102000Z/`. `ProjectsPageClient` now lazy-loads the new-project and project-details modals to keep non-critical modal code out of the initial projects surface. Targeted project-page tests, ESLint, type-check, and build passed after the change. A second temporary real Supabase auth user/workspace authenticated `/workshop/projects` under `next start` on port 3066; Lighthouse final URL stayed authenticated at `/workshop/projects`. The follow-up score was `0.71`, FCP `1254.093 ms`, LCP `3585.663 ms`, CLS `0`, TBT `533.430 ms`, Speed Index `5830.606 ms`, server response time `2303.784 ms`, and bfcache audit score `0`. The modal split modestly improved LCP but worsened TBT/TTFB/overall score in this run, so it does not close the readiness gap. Cleanup removed the temporary auth user/profile/workspace and recorded zero residue from the archived seed.

**2026-06-01 project-list payload trim and Lighthouse rerun:** Evidence lives at `.ai/09_archive/store/route-transition-lighthouse-after-project-list-trim-20260601T112341Z/`. `readOptionalProjectPublications()` no longer selects `snapshot_json` or `selected_estimate_ids` for `/workshop/projects` and `/workshop` list summaries; those routes only need status, token, password, open-count, and timestamp metadata for project cards/homebase cards. GitNexus impact for `readOptionalProjectPublications` reported LOW risk with two direct callers (`listCurrentWorkspaceProjects`, `getWorkshopHomebaseData`) and two affected pages. Focused workshop/project publication tests, focused ESLint, `bun run type-check`, and `bun run build` passed. A temporary real Supabase auth user/workspace then authenticated `/workshop/projects` under `next start` on port 3069. The sanitized Lighthouse summary recorded final URL `/workshop/projects`, performance score `0.86`, FCP `1208.692 ms`, LCP `3865.73 ms`, CLS `0`, TBT `124.654 ms`, Speed Index `3514.507 ms`, server response time `630 ms`, script transfer `220719`, and bfcache audit score `0`. Cleanup deleted the temporary auth user, profile, and workspace without errors, and recorded zero workspace/profile residue. This closes the prior authenticated Lighthouse score/server-response gap, but it does not replace manual Chrome bfcache DevTools proof or production Chrome React Profiler proof.

**2026-06-01 sidebar hover-prefetch proof:** Evidence lives at `.ai/09_archive/store/route-transition-sidebar-hover-prefetch-proof-20260601T113839Z/`. `SidebarNavItemRow` now follows the documented Next.js hover-intent pattern by keeping viewport prefetch disabled until user intent and switching `Link` from `prefetch={false}` to `prefetch={null}` on hover/focus, while retaining the existing debounced `router.prefetch()` hook as backup. GitNexus impact for `SidebarNavItemRow`, `MainSidebar`, and `usePrefetchOnHover` reported CRITICAL blast radius across workshop shell routes, so the change was kept narrow and verified with focused tests, type-check, build, and production-mode Playwright evidence. Under `next start` on port 3070 with a temporary real Supabase auth user/storage state, the rerun passed and recorded six hover-before-click `_rsc` requests, including two `/workshop/projects?_rsc=...` requests, before the click transition; transition time was `456 ms`. Cleanup deleted the temporary auth user/profile/workspace with zero residue. This closes the remaining sidebar hover-prefetch limitation.

**2026-06-01 public bfcache cache-header mitigation:** Evidence lives at `.ai/09_archive/store/route-transition-public-bfcache-cache-control-proof-20260601T115038Z/`. Public marketing pages now set `Cache-Control: private, no-cache, max-age=0, must-revalidate` from `src/proxy.ts` instead of inheriting the earlier `no-store` header that Chrome/Lighthouse identified as a bfcache blocker. Header proof against `next start` on port 3071 confirms `/` and `/features` no longer include `no-store`; `/invite` and `/share` remain outside this marketing-page relaxation. Focused proxy tests, route-transition DOM tests, ESLint, type-check, and build passed. The public bfcache Playwright smoke also passed and recorded `navigationTypes:["back_forward"]`, restore `53 ms`, and no stuck overlay, but still reported `pageshow.persisted=false`; a trivial two-page control under the same Playwright Chromium automation also reported `pageshow.persisted=false`. Treat the local automated result as route-health evidence, not as persisted bfcache proof. Manual Chrome DevTools bfcache verification remains open.

**Do not archive yet:** The route-transition plan folder should not be moved to `.ai/09_archive` until manual Chrome bfcache DevTools proof and production Chrome React Profiler proof are complete or the owner explicitly narrows the completion gate.

---

## Current-State Implementation Matrix

### Already Implemented & Acceptable

| Component | Location | Status | Notes |
|-----------|---------|--------|-------|
| BfcacheHandler | `src/components/bfcache-handler.tsx` | ✅ Good | Detects `pageshow.persisted`, calls `bfcacheRestore()`. Sub-100ms overlay flash on bfcache restore is acceptable. |
| PerformanceMonitor | `src/components/performance-monitor.tsx` | ✅ Good | Dev-only console logging. No production telemetry yet but sufficient for Phase 0 measurement. |
| Skeleton | `src/components/ui/skeleton.tsx` | ✅ Good | Simple `animate-pulse` with `motion-reduce` support. Sufficient for loading.tsx. |
| NavigationListener | `src/components/navigation-listener.tsx` | ✅ Good | Click intercept + popstate handling correct. |
| useNavigationRouter | `src/hooks/use-navigation-router.ts` | ✅ Good | Correctly wraps router with `show()` before navigation. |
| Providers tree | `src/app/providers.tsx` | ✅ Good | Clean tree order: BfcacheHandler → PerformanceMonitor → NavigationListener → children → RouteLoadingOverlay. |
| proxy.ts | `src/proxy.ts` | ✅ ACTIVE | **Running as Next.js 16 middleware.** Uses safe `getUser()`. Protects `/workshop` routes. Handles dev auth bypass. Matcher covers all non-static routes. |

### Implemented But Flawed

| Component | Flaw | Severity | Fix |
|-----------|------|----------|-----|
| loading.tsx (6 files) | Wrap `WorkshopPageShell` which awaits `getCurrentUserContext()` + `cookies()` — the skeleton itself waits on auth resolution | **HIGH** | Replace with static chrome shell that doesn't await auth. Skeleton must render BEFORE auth resolves. |
| usePrefetchOnHover | Only does React Query `prefetchQuery()`, no `router.prefetch()` for RSC payloads. No queryFns provided (passes `{ queryKey }` only). | **HIGH** | Add `router.prefetch(href)` call. Wire into sidebar + project cards. Use real query keys only. |
| RouteLoadingOverlay | `transition-opacity duration-200` may not play before unmount since component is conditionally rendered | **LOW** | Keep-as-is unless visual testing shows jarring disappearance. Exit animation is a nice-to-have. |
| proxy.ts matcher | Runs `getUser()` on ALL routes including public marketing pages (/, /about, /features, /pricing, /contact) | **MEDIUM** | Add early-return for public routes BEFORE Supabase client creation. Saves ~80-150ms per public page request. |

### Implemented But Unwired

| Component | What's Missing | Priority |
|-----------|---------------|----------|
| usePrefetchOnHover | Not imported or called by any navigation component | **HIGH** |

### Not Implemented (Gaps)

| Item | Priority | Notes |
|------|----------|-------|
| error.tsx files | **HIGH** | Zero exist. Estimate workspace, library, and charts routes need them. |
| Suspense boundaries | **HIGH** | Zero exist. Only route-level loading via Next.js loading.tsx convention. |
| router.prefetch() in prefetch hook | **HIGH** | Current hook only does React Query prefetch. |
| React.cache() on repository functions | MEDIUM | Only used for `getCurrentUserContext`. Should wrap duplicate-called functions. |
| Code splitting (next/dynamic) | MEDIUM | Zero dynamic imports for heavy components. Named export verification done in doc 14. |
| Virtualization | LOW | Not yet needed. Implement after Phase 0 measurement. |
| React.memo | LOW | Not yet needed. Profile first. |
| unstable_cache / cacheTag | LOW | Not yet needed. Must ensure user/workspace scoping before applying. |

---

## Corrected Assumptions (Top 10)

### 1. proxy.ts IS the active middleware — NOT dead code
**Old plan claim:** "proxy.ts is dead code at runtime (no middleware.ts exists)." (Doc 31, Doc 13 line 130)  
**Reality:** In Next.js 16, the middleware file is `proxy.ts` (renamed from `middleware.ts`). The `src/proxy.ts` file exports `proxy()` and `config.matcher` and IS running on every request.  
**Correction:** Remove ALL "dead code" claims. Remove the "create middleware.ts re-exporting proxy.ts" task (Task 1.5.1 in Doc 04). The proxy IS already the middleware.  
**Action:** Instead of creating `middleware.ts`, optimize the existing `proxy.ts` by adding early-return for public routes.

### 2. Do NOT replace getUser() with getSession() — security risk
**Old plan claim:** "Use `getSession()` which is local JWT validation, not HTTP" saving 80-180ms (Doc 31 line 668-669, Doc 06 ADR-013 line 516).  
**Reality:** Current Supabase SSR docs explicitly warn: "Do not trust `getSession()` in server-side middleware. Use `getClaims()` or verify via `getUser()`." The actual `src/proxy.ts` correctly uses `getUser()` (line 58).  
**Correction:** Remove ALL recommendations to use `getSession()`. Keep `getUser()`. If speed is needed, recommend `getClaims()` as the Supabase-recommended alternative, but verify current SSR version supports it.  
**Security impact:** CRITICAL. Using `getSession()` in middleware allows JWT forgery attacks.

### 3. Overlay strategy: immediate show + 250ms min-display is the CORRECT current behavior
**Contradiction:** Doc 12 and ADR-006 say "add 150ms show delay, remove min-display." Docs 33 and 34 say "immediate show, no delay per ADR-003, 250ms minimum display is intentional."  
**Actual code:** `show()` fires immediately. `hide()` enforces MIN_DISPLAY_MS=250. No SHOW_DELAY_MS exists.  
**Resolution:** Keep current behavior (immediate show + MIN_DISPLAY_MS=250). This provides instant visual feedback without blocking content (overlay is `pointer-events-none`). The 250ms minimum prevents flicker on fast navigations.  
**Future consideration:** After all other optimizations (prefetch, cache, Suspense), if the overlay is flashing too often, add a SHOW_DELAY_MS=150 as a further refinement. But do NOT implement this in Phase 1.

### 4. React Query prefetch: only estimate keys exist
**Old plan claim:** Prefetch keys like `["projects"]`, `["homebase"]`, `["library"]`, `["templates"]` (Doc 11 §1.3, Doc 04 Task 2.2).  
**Reality:** Only `["estimate", id]`, `["estimate", id, "area-tree"]`, and a revision-tracker key exist. Doc 15 already identified this.  
**Correction:** Prefetch strategy must use `router.prefetch()` for ALL routes (RSC payload) and React Query `prefetchQuery()` ONLY for estimate workspace routes with actual queryFns.

### 5. usePrefetchOnHover is incomplete — missing router.prefetch()
**Actual code:** The hook only calls `queryClient.prefetchQuery({ queryKey })` without `router.prefetch()` and without `queryFn`. React Query requires a `queryFn` for `prefetchQuery` to work — passing only `queryKey` is invalid.  
**Correction:** Rewrite the hook to include `router.prefetch(href)` AND provide real `queryFn` for estimate keys. For non-estimate routes, only `router.prefetch()` is needed.

### 6. loading.tsx waterfall: WorkshopPageShell blocks skeleton rendering
**Actual code:** All 6 `loading.tsx` files are `async function Loading()` that render `WorkshopPageShell` which awaits `getCurrentUserContext()` + `cookies()`. The skeleton UI itself waits for auth resolution.  
**Correction:** Replace `WorkshopPageShell` in loading.tsx with a static chrome shell that does NOT await any async calls. The skeleton must appear instantly on click, not after auth resolves.

### 7. Proxy matcher runs auth on public pages
**Actual code:** `config.matcher` matches ALL non-static routes. The function creates a Supabase client and calls `getUser()` even for `/`, `/about`, `/features`, `/pricing`, `/contact`. These are not protected routes — the check is wasted.  
**Correction:** Add `PUBLIC_PREFIXES` early-return BEFORE Supabase client creation in `proxy()`. Saves ~80-150ms per public page request.

### 8. Zero error.tsx and zero Suspense boundaries exist
**Actual code:** 0 `error.tsx` files. 0 `<Suspense>` usages. 0 custom ErrorBoundary components.  
**Correction:** Add `error.tsx` to estimate workspace, library, and charts routes. Add Suspense boundaries inside `WorkshopPageShell` children for content streaming.

### 9. Doc 31's "Phase 2: Deferred Profile Fetch" incorrectly suggests Suspense wrap of async work
**Doc 31 line 144-152:** Proposes wrapping `getCurrentUserContext()` in a Promise + Suspense. This pattern does not work with React Server Components — you cannot pass unresolved Promises to client components via props.  
**Correction:** Remove the Promise-passing pattern. Instead, use a client-component wrapper that calls a server action or route handler for profile data, OR keep profile in the shell but separate it from page content via layout-level Suspense.

### 10. All code-splitting must use named-export dynamic import pattern
**Old plan:** `dynamic(() => import("@/.../EstimateSheetContent"))` — WILL FAIL.  
**Reality:** All 5 targets use `export function`, not `export default`. Must use `.then(mod => mod.ComponentName)`.  
**Correction:** Doc 14 already fixed this. Ensure all code examples in all docs are updated.

---

## Phased Execution Plan (Corrected)

### Phase 0 — Baseline Measurement (NO CODE CHANGES)
**Goal:** Establish quantitative baseline before ANY optimization.

1. Record current build output: `bun run build 2>&1 | tee baseline-build.txt`
2. Measure proxy.ts overhead: Add timing logs, confirm `getUser()` latency per route type
3. Record route transition times manually (Chrome DevTools, Slow 3G throttle)
4. Document bundle sizes per route
5. Document overlay visibility rate (is it 100% of navigations?)
6. Verify bfcache works in Chrome DevTools
7. Create baseline metrics table

**Blocking rule:** Do NOT proceed to Phase 1 without baseline data.

### Phase 1 — Fix Flawed Infrastructure (P1)
**Goal:** Fix what's already partially implemented but broken or unwired.

**Task 1.1 — Fix loading.tsx waterfall**
- Replace `WorkshopPageShell` in all 6 loading.tsx with static chrome
- Static chrome: same layout structure but NO auth/cookie awaits
- Add `aria-hidden="true"` on skeleton containers
- Verification: skeleton appears within 50ms of click (before auth resolves)

**Task 1.2 — Wire usePrefetchOnHover (add router.prefetch)**
- Add `import { useRouter } from "next/navigation"` to the hook
- Add `router.prefetch(href)` call alongside React Query prefetch
- Add actual `queryFn` for estimate keys (not just `queryKey`)
- Wire into `MainSidebar` for sidebar link prefetch
- Wire into `ProjectEstimatesTable` for estimate row prefetch
- Wire into `LiveProjectCard` for project detail prefetch
- Verification: check Network tab — RSC payload preloaded on hover

**Task 1.3 — Add error.tsx files**
- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/error.tsx`
- `src/app/workshop/library/error.tsx`
- `src/app/workshop/projects/[projectId]/charts/error.tsx`
- Include retry button, error logging, and accessible error message

**Task 1.4 — Increase React Query staleTime**
- `src/app/providers.tsx`: `staleTime: 30_000` → `staleTime: 5 * 60_000`
- Check `use-estimate-query.ts` for any per-query overrides

### Phase 2 — Auth/Proxy Correction (P2)
**Goal:** Fix proxy without breaking security.

**Task 2.1 — Add public-route early-return to proxy.ts**
```typescript
// BEFORE Supabase client creation (line 39)
const PUBLIC_PREFIXES = ["/", "/about", "/features", "/pricing", "/contact", "/privacy", "/terms", "/invite", "/share"];
const isPublic = PUBLIC_PREFIXES.some(p => pathname === p || pathname.startsWith(p + "/"));
if (isPublic) {
  return createRequestPathResponse(request);
}
```
- Verification: public pages no longer create Supabase client
- Measurement: confirm ~80-150ms reduction for landing page

**Task 2.2 — Verify auth method safety**
- Confirm `getUser()` is used (it is — safe)
- Confirm NO `getSession()` recommendations exist in plan
- Check `@supabase/ssr` version compatibility with `getClaims()`
- Document: proxy uses `getUser()`, WorkshopPageShell uses `getUser()` via `requireCurrentUserContext()`

**Task 2.3 — Run auth E2E tests**
- Login, logout, OAuth callback, invite flow, share route
- Confirm redirect protection still works after matcher change

### Phase 3 — Route-Shell Architecture (P3)
**Goal:** Fix loading UX so skeletons render instantly and content streams.

**Task 3.1 — Add Suspense boundaries in WorkshopPageShell**
- Wrap children prop in `<Suspense fallback={...}>` 
- The shell (sidebar, header, footer) renders immediately
- Page content shows skeleton while data resolves
- This replaces loading.tsx for workshop routes

**Task 3.2 — Fix project layout duplicate fetch**
- `React.cache()` on `getCurrentWorkspaceProject()` — already confirmed double-fetch
- Restructure layout to fire all queries in parallel (no sequential waterfall)

**Task 3.3 — Verify protected content security**
- Suspense must not leak protected data in fallback
- Test unauthenticated redirect flow

### Phase 4 — Bundle & Code Splitting (P4)
**Goal:** Reduce initial JS payload through dynamic imports.

**Task 4.1 — Dynamic import named-export components**
- Use `.then(mod => mod.ComponentName)` pattern (doc 14 verified)
- Targets: EstimateSheetContent, EstimateSheetTree, AddComponentModal, LibraryFolderTree, ComponentLibraryManager
- All wrapped in Suspense with skeleton fallback

**Task 4.2 — Defer Three.js**
- Dynamic import `NeatWireframeBackground` with `ssr: false` + CSS gradient placeholder
- Above-fold component — cannot use IntersectionObserver
- Fallback: replace with CSS-only gradient if visual issues

**Task 4.3 — Audit D3 and Phosphor import patterns**
- D3: verify tree-shaking (currently imports entire `d3` package)
- Phosphor: 3 files use wrong import path; `next.config.ts` has `optimizePackageImports`

### Phase 5 — Data, Cache, Prefetch (P5)
**Goal:** Data arrives before click via prefetch; re-visits are instant.

**Task 5.1 — React.cache() on duplicate-called repository functions**
- `getCurrentWorkspaceProject()` — called in layout AND page
- Other repository functions as identified
- Per-request deduplication only (does not persist across navigations)

**Task 5.2 — router.prefetch() on all navigation links**
- Sidebar: prefetch RSC payload for /workshop/projects, /workshop/library, etc.
- Project cards: prefetch RSC payload for project detail
- Estimate rows: prefetch RSC payload + React Query data

**Task 5.3 — React Query prefetch for estimate workspace only**
- Only `["estimate", id]` and `["estimate", id, "area-tree"]` keys
- Must provide real `queryFn` (not just `queryKey`)
- No fake keys for projects, library, templates

### Phase 6 — Peak-Load Hardening (P6)
**Goal:** Graceful performance under heavy data.

- Seed data script for 50+ projects, 200+ rows
- Virtualization: only after profiling shows need
- React.memo: only after profiling shows benefit
- Image lazy-loading and pagination

### Phase 7 — Monitoring & Rollout (P7)
**Goal:** Prevent regressions after shipping.

- Performance budgets in CI
- Playwright perf smoke tests
- Lighthouse CI checks
- Feature flags for risky changes
- Rollback plan

---

## Validation Gates (Every Phase)

```bash
bun run type-check          # Must pass
bun run lint                # Must pass
bun run lint:design-system  # Must pass
bun run test                # Must pass (or note pre-existing)
bun run test:dom            # Must pass
bun run build               # Must pass
bun run test:e2e            # Must pass (auth-related gates)
```

**Manual verification:**
- Auth redirect (logout → /workshop → /login)
- OAuth callback flow
- Invite entry flow
- Share route access
- bfcache restore (Chrome DevTools test)
- Slow 3G route transition
- Keyboard navigation
- Screen reader loading state

---

## Do NOT Implement Yet

1. **Virtualization** (Phase 6) — Profile first. May not be needed.
2. **React.memo** (Phase 6) — Profile first. Blanket memo is harmful.
3. **unstable_cache** (Phase 6) — Must ensure user/workspace scoping. Risk of cross-user cache leaks.
4. **Font route-splitting** (Phase 4) — Creates `/workshop/layout.tsx` architectural change. Defer until layout refactor is well-understood.
5. **"use cache" directive** — Not stable in Next.js 16.2.6.
6. **getSession() in proxy** — NEVER. Security risk.

---

---

## Non-Negotiable Guardrails

These constraints override ALL other documents. No implementation agent may violate them.

| # | Guardrail | Rationale |
|---|----------|-----------|
| 1 | **Next.js 16 uses `proxy.ts`, not `middleware.ts`.** Do not create `src/middleware.ts` unless a fresh framework audit proves `proxy.ts` is not running. | Next 16 renamed the middleware file. Creating a duplicate middleware.ts is unnecessary and may cause conflicts. |
| 2 | **Do not use Supabase `getSession()` inside server proxy/auth-protection code.** Use `getUser()` (validates JWT with Supabase) or evaluate `getClaims()` if supported by your `@supabase/ssr` version. | `getSession()` trusts the cookie without JWT verification — vulnerable to forged JWTs. Current Supabase docs explicitly warn against this. |
| 3 | **Prefer public-route early return before Supabase client creation in proxy.ts.** Skip `getUser()` for `/`, `/about`, `/features`, `/pricing`, `/contact`, `/privacy`, `/terms`. | Saves ~80-150ms per public page request by avoiding unnecessary Supabase auth round-trips. |
| 4 | **Keep current immediate overlay + MIN_DISPLAY_MS=250 until baseline measurement proves a delay is better.** Do NOT add SHOW_DELAY_MS in Phase 1. | The current behavior provides instant visual feedback. Tuning overlay thresholds is premature without data. |
| 5 | **Prefetch RSC routes via `router.prefetch()`.** This works for ALL routes regardless of data-fetching method. | RSC payload prefetch caches the Server Component rendered output. It is the primary prefetch mechanism for non-React-Query routes. |
| 6 | **React Query prefetch only for real existing estimate query keys with real `queryFn`.** Only `["estimate", id]` and `["estimate", id, "area-tree"]` exist. Do not invent keys like `["projects"]` or `["library"]`. | Prefetching with fake keys silently fails (no hook subscribes to them). |
| 7 | **Add static loading shells before async `WorkshopPageShell` loading waterfalls.** loading.tsx must render within 50ms of click, NOT after auth resolution. | The current loading.tsx files wrap async WorkshopPageShell — the skeleton itself waits on auth. Replace with static chrome. |
| 8 | **Dynamic imports must use named-export `.then(mod => mod.ComponentName)` where applicable.** All 5 code-splitting targets use `export function`, not `export default`. | Default-import pattern (`() => import("...")`) WILL FAIL at build time with named exports. |
| 9 | **Do not add cross-request cache (`unstable_cache`, `cacheTag`) for user/workspace data without scoped keys and invalidation.** Per-request deduplication via `React.cache()` is safe. | Cross-request caching without user-ID in cache key risks leaking data between users/workspaces. |
| 10 | **Measure before optimizing.** Run Phase 0 baseline BEFORE any implementation in Phase 1+. Profile before adding React.memo. Profile before adding virtualization. | Data-driven optimization prevents wasted effort and harmful premature "optimizations." |

---

## Highest-Risk Assumptions Requiring Owner Approval

| # | Assumption | Risk | Required Approval | Evidence |
|---|-----------|------|-------------------|----------|
| 1 | proxy.ts IS the running Next.js 16 middleware | ~~HIGH~~ **CONFIRMED** | ~~Owner must verify~~ Verified via `node_modules/next/dist/build/utils.d.ts`: `isMiddlewareFile` accepts `"/proxy"` and `"/src/proxy"`. Next 16 upgrade guide: `mv middleware.ts proxy.ts`, rename export to `proxy`. | ✅ `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md` lines 625-640 |
| 2 | Public-route early-return should skip ALL Supabase client creation for /, /about, /features, /pricing, /contact | **MEDIUM** | Owner must confirm: landing page does not depend on auth state in proxy for any feature. Current AB testing reads cookies in page.tsx, not proxy. | Pending owner |
| 3 | Removing WorkshopPageShell from loading.tsx will not break auth redirect UX | **MEDIUM** | Owner must confirm: acceptable that loading skeleton shows WITHOUT checking auth first. If unauth'd user sees skeleton then redirect, that's the Next.js loading.tsx contract. | Pending owner |
| 4 | `router.prefetch()` is sufficient for RSC data prefetch without React Query | **LOW** | Next.js documented behavior. RSC payload prefetch caches the rendered output. | Pending owner |

---

## Files Changed in Plan Folder

See `PLAN_REPAIR_LOG.md` for detailed change log. Summary of superseded docs:

| Doc | Status | Reason |
|-----|--------|--------|
| 31-auth-optimization-middleware-migration.md | **SUPERSEDED** | Recommends creating middleware.ts — unnecessary in Next 16. Recommends getSession() — security risk. |
| 12-overlay-fallback-strategy.md | **SUPERSEDED §6** | Recommends 150ms show delay — contradicts current implementation. |
| 04-implementation-plan.md §Task 1.5.1 | **SUPERSEDED** | "Create middleware.ts" task is wrong. |
| 06-strategy-adrs.md ADR-006, ADR-013 | **SUPERSEDED** | Overlay delay and getSession() recommendations. |
| 11-prefetch-wiring-map.md | **PARTIALLY SUPERSEDED** | Fake React Query keys. RSC wiring still valid. |
| 01-performance-audit.md §3.8 | **SUPERSEDED** | Claims "proxy.ts does NOT guard routes" — incorrect. |

**New documents added:**
- `CURRENT_CANONICAL_PLAN.md` (this file)
- `PLAN_REPAIR_LOG.md`
- `CODEBASE_AUDIT.md`
- `IMPLEMENTATION_MATRIX.md`
- `BENCHMARK_PROTOCOL.md`
- `ADR_UPDATES.md`
