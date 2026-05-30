# ADR UPDATES — Final Architecture Decisions (Corrected)

**Date:** 2026-05-30  
**Purpose:** Resolve all contradictory ADRs from `06-strategy-adrs.md` against verified codebase facts.

---

## ADR-001 (Revised): Prefetch Strategy — Dual-Layer RSC + React Query

**Original:** Hover prefetch with `router.prefetch()` + `queryClient.prefetchQuery()` for ALL sidebar routes.
**Problem:** Plan used fake React Query keys — `["projects"]`, `["library"]`, `["templates"]` don't exist.
**Revised Decision:** ✅ **ACCEPTED with correction.**

- **Layer A (RSC payload prefetch):** `router.prefetch(href)` for ALL navigation links. This preloads the Server Component rendered output. Works for every route regardless of data-fetching method.
- **Layer B (React Query prefetch):** ONLY for estimate workspace routes using real keys `["estimate", id]` and `["estimate", id, "area-tree"]`. Must provide actual `queryFn`.
- **For all other workshop routes** (projects, library, templates, settings): Layer A alone is sufficient.
- **Implementation:** `usePrefetchOnHover` hook must include BOTH `router.prefetch()` and optional `queryClient.prefetchQuery()`. Currently the hook is missing `router.prefetch()`.

---

## ADR-002 (Revised): Caching Strategy — staleTime Increase

**Original:** Global `staleTime: 5 min` + per-query overrides.
**Problem:** Only 2 React Query hooks exist — impact is limited.
**Revised Decision:** ✅ **ACCEPTED — still valid.**

- Global `staleTime: 5 * 60_000` in `providers.tsx`
- Per-query auth overrides where needed
- For non-React Query data (most workshop pages), server-side caching will be handled via `React.cache()` (per-request dedupe) and future `unstable_cache` (cross-request)

---

## ADR-003 (No Change): Suspense Strategy

**Original:** Hybrid: `loading.tsx` for simple routes, custom Suspense in layouts for `projects/[projectId]`, Suspense in `page.tsx` for all other workshop routes.
**Verified:** 6 loading.tsx exist (workshop only). Zero Suspense boundaries exist. Zero error.tsx exist.
**Revised Decision:** ✅ **ACCEPTED — still valid but not yet implemented.**

- loading.tsx exist but are **flawed**: they wrap async `WorkshopPageShell` which awaits auth before skeleton renders
- **Fix before further implementation:** Replace `WorkshopPageShell` in loading.tsx with static chrome
- Add Suspense boundaries inside WorkshopPageShell children for content streaming
- Add `error.tsx` to estimate workspace, library, and charts routes

---

## ADR-004 (Deferred): Virtualization

**Original:** `@tanstack/react-virtual` for lists, defer tree virtualization.
**Status:** ⚠️ **DEFERRED** — implement after Phase 0 measurement proves need.
- No virtualization implemented yet
- Profile first: measure render cost with seeded 50+ projects, 200+ rows
- React Complex Tree does not support virtualization natively — use pagination or "load more" instead

---

## ADR-005 (No Change): Code Splitting with Named Exports

**Original:** `next/dynamic` with `.then(mod => mod.ComponentName)` pattern.
**Verified:** All 5 targets use `export function` (named exports). Default-import pattern WILL fail.
**Revised Decision:** ✅ **ACCEPTED — CRITICAL, already verified by doc 14.**
- Correct pattern: `dynamic(() => import("...").then(mod => mod.ComponentName), { loading: () => <Skeleton /> })`
- All code examples in all documents must use this pattern

---

## ADR-006 (REVISED): Loading Overlay — Keep Immediate Show + MIN_DISPLAY_MS

**Original (Doc 06):** Add 150ms show delay, remove MIN_DISPLAY_MS.
**Contradiction:** Docs 33 and 34 say immediate show is intentional per ADR-003.
**Actual code:** `show()` fires immediately. `hide()` enforces `MIN_DISPLAY_MS = 250`. No `SHOW_DELAY_MS` exists.

**Revised Decision:** ✅ **KEEP CURRENT BEHAVIOR.**

- **Show immediately on click** — provides instant visual feedback. The overlay is `pointer-events-none` so it never blocks content or interaction.
- **Keep MIN_DISPLAY_MS = 250ms** — prevents jarring flash on fast navigations.
- **Do NOT add SHOW_DELAY_MS in Phase 1.** Defer until after measurement. If, after all prefetch/cache/Suspense optimizations, the overlay still appears on >20% of navigations, THEN add SHOW_DELAY_MS=150 as further refinement.
- **Rationale:** The 150ms delay recommendation in the old plan was premature optimization. Fix the actual navigation speed first, then tune the overlay threshold.

---

## ADR-007 (No Change): Server Caching — React.cache() Now

**Original:** React `cache()` now, `unstable_cache` later, `"use cache"` in future.
**Verified:** Only 1 `React.cache()` usage exists (`getCurrentUserContext`). `getCurrentWorkspaceProject()` called 2x per request (layout + page).
**Revised Decision:** ✅ **ACCEPTED — expand to duplicate-called functions.**

- Priority: `getCurrentWorkspaceProject()`, `getProjectCollaborationSummary()`, `getProjectPublicationSummary()`, `listProjectEstimateSheets()`
- `unstable_cache`: defer until user/workspace scoping and invalidation strategy is defined. MUST NOT cache user-specific data without user-ID in cache key.
- `"use cache"`: not stable in Next.js 16.2.6. Do not use.

---

## ADR-008 (No Change): bfcache Strategy

**Original:** bfcache-compatible target, add `pageshow` handler.
**Verified:** Zero bfcache blockers. BfcacheHandler already implemented. Sub-100ms overlay flash on restore is acceptable (doc 34 §4.1).
**Revised Decision:** ✅ **ACCEPTED — already partially implemented.**

- BfcacheHandler exists and works correctly
- Remaining: verify in Chrome DevTools → Application → Back/forward cache
- No further code changes needed for bfcache

---

## ADR-009 (REVISED): Auth Architecture — proxy.ts IS the Middleware

**Original (Doc 06):** "Accept as architectural constraint. Do not migrate to middleware in this performance plan."
**Problem:** This ADR was written under the assumption there is NO middleware. But `src/proxy.ts` IS the active Next.js 16 middleware. The constraint was self-imposed based on a false premise.

**Revised Decision:** ✅ **proxy.ts IS the middleware. Optimize it, don't replace it.**

- Do NOT create `src/middleware.ts` — unnecessary in Next 16
- Do NOT delete `src/proxy.ts` — it is the running middleware
- DO add public-route early-return to skip Supabase client creation for `/`, `/about`, `/features`, `/pricing`, `/contact`, `/privacy`, `/terms`
- DO verify `getUser()` is used (safe) — it is. Do NOT switch to `getSession()` (unsafe).
- The auth check itself is correct: `getUser()` validates JWT with Supabase. Keep it.

---

## ADR-010 (Deferred): React.memo Strategy

**Original:** Selective `React.memo` for row items, tree nodes, project cards.
**Status:** ⚠️ **DEFERRED** — profile first.
- No `React.memo` implemented yet
- 245+ `useMemo`/`useCallback` exist — but memo without profiling is wasteful
- Implement React.memo only after React DevTools Profiler shows measurable re-render cost

---

## ADR-011 (Deferred): Font Loading

**Original:** Route-specific font loading (Inter for landing, workshop fonts for `/workshop` layout).
**Status:** ⚠️ **DEFERRED** — architectural change needed.
- Creating `src/app/workshop/layout.tsx` introduces nested layout semantics
- Could affect `WorkshopPageShell` usage and shared state boundaries
- Defer until layout refactor is well-understood
- Short-term: use `font-display: swap` if FOUT is an issue

---

## ADR-012 (No Change, Upgraded Priority): Error Boundaries

**Original:** Hybrid route-level + component-level error boundaries.
**Verified:** Zero error.tsx, zero custom ErrorBoundary components.
**Revised Decision:** ✅ **ACCEPTED — upgraded to Phase 1 priority (was Phase 1.5).**

- MUST add `error.tsx` to estimate workspace, library, and charts routes BEFORE adding Suspense or code-splitting
- Error boundaries prevent full-page crashes from newly code-split components
- Component-level `ErrorBoundary` wrapper for chart components (D3 is error-prone with empty data)

---

## ADR-013 (REVISED): Server-Side Optimization — Fix proxy.ts, NOT migrate

**Original:** "Proxy.ts → Middleware migration" with `getSession()`, "Project layout caching," "N+1 query fixes."
**Problems:**
1. "Proxy.ts → Middleware" is unnecessary — proxy.ts IS the middleware
2. `getSession()` recommendation is a SECURITY RISK
3. `unstable_cache` with project-specific tags needs invalidation strategy

**Revised Decision:**

1. **Optimize proxy.ts** (not migrate): Add public-route early-return. Saves ~80-150ms per public page.
2. **Keep `getUser()`** (safe): Do NOT switch to `getSession()`. If speed optimization needed, evaluate `getClaims()` but verify `@supabase/ssr` version compatibility.
3. **Project layout caching with `React.cache()`**: Deduplicate the double-fetch of `getCurrentWorkspaceProject()`. Per-request only.
4. **`unstable_cache` deferred**: Must define user/workspace-scoped cache keys + invalidation points before implementing.
5. **N+1 query fixes**: Audit repository functions after React.cache() is applied.

---

## ADR-014 (No Change): Three.js — Dynamic Import

**Original:** Dynamic import with `next/dynamic`, `ssr: false`, CSS gradient placeholder.
**Verified:** `NeatWireframeBackground` renders inside `HeroSection` (above-fold, NOT below-fold).
**Revised Decision:** ✅ **ACCEPTED.**

- Use `.then(mod => mod.NeatWireframeBackground)` — named export
- `ssr: false` — WebGL is client-only
- CSS gradient placeholder matches hero colors
- Fallback: replace entirely with CSS gradient if visual issues

---

## Summary of Revised ADRs

| ADR | Original Decision | Revision | Status |
|-----|------------------|----------|--------|
| ADR-001 | Hover prefetch with fake React Query keys | Dual-layer: RSC for all routes, React Query only for estimates | **FIXED** |
| ADR-002 | staleTime 5min | No change — still valid | ✅ |
| ADR-003 | loading.tsx + Suspense | No change — but loading.tsx must be fixed first | ✅ |
| ADR-004 | Virtualization | Deferred — profile first | ⚠️ DEFERRED |
| ADR-005 | dynamic() with named exports | No change — CRITICAL, already verified | ✅ |
| ADR-006 | 150ms show delay | **REVERSED** — keep immediate show + MIN_DISPLAY_MS=250 | **FIXED** |
| ADR-007 | React.cache() now | No change — expand to duplicate-called functions | ✅ |
| ADR-008 | bfcache | No change — already implemented | ✅ |
| ADR-009 | "No middleware, accept it" | **REVISED** — proxy.ts IS the middleware | **FIXED** |
| ADR-010 | React.memo | Deferred — profile first | ⚠️ DEFERRED |
| ADR-011 | Font route-splitting | Deferred — architectural risk | ⚠️ DEFERRED |
| ADR-012 | Error boundaries | Upgraded to Phase 1 priority | ✅ PRIORITY UP |
| ADR-013 | Proxy migration + getSession() | **REVISED** — optimize proxy.ts, keep getUser(), defer cache | **FIXED** |
| ADR-014 | Three.js dynamic import | No change | ✅ |
