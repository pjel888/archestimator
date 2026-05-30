# CURRENT CANONICAL PLAN — Route Transition Performance Optimization

**Status:** Upgraded — 2026-05-30  
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
