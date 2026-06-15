# PLAN REPAIR LOG — Route Transition Performance Optimization

**Audit date:** 2026-05-30  
**Audit method:** Full static codebase audit + plan document cross-reference  
**Auditor:** Sisyphus (OhMyOpenCode)

---

## Summary

35 plan documents were audited against the live codebase. **6 critical errors** were found that would break implementation or introduce security vulnerabilities if followed. **8 contradictions** between documents were identified. All are resolved below.

---

## Critical Errors Fixed

### Error 1: "proxy.ts is dead code" — FALSE (Docs 13, 31, 03, 04)

**What the old plan said:**
- Doc 13 line 130: "proxy.ts does NOT guard routes"
- Doc 31 line 47: "The proxy.ts file...is never invoked at runtime because no middleware.ts file exists to re-export it"
- Doc 31 line 91: "Creating src/middleware.ts that re-exports from proxy.ts is a 3-line change with outsized impact"
- Doc 04 Task 1.5.1: "File to create: src/middleware.ts. File to delete: src/proxy.ts"
- Doc 03 line 30: "no middleware exists — auth at data layer"

**What the code actually does:**
- In Next.js 16, the middleware file WAS RENAMED from `middleware.ts` to `proxy.ts`
- `src/proxy.ts` exports `proxy()` (line 19) and `config.matcher` (line 76-78)
- The proxy creates a Supabase server client, calls `supabase.auth.getUser()`, checks protected prefixes, and handles auth redirects
- It IS running on every non-static request

**Fix applied:**
- ALL "proxy.ts is dead code" claims removed
- "Create middleware.ts" task (Task 1.5.1) deleted
- "File to delete: src/proxy.ts" removed
- Recommendation changed: optimize existing proxy.ts, do not create middleware.ts

### Error 2: "Use getSession() instead of getUser()" — SECURITY RISK (Docs 31, 06)

**What the old plan said:**
- Doc 31 line 645: `await supabase.auth.getSession();` in middleware code example
- Doc 31 line 668: "`getSession()` validates the JWT locally (no HTTP request), while `getUser()` always makes an HTTP roundtrip"
- Doc 06 ADR-013 line 516: "Uses `getSession()` (local JWT validation) instead of `getUser()` (HTTP roundtrip)"
- Doc 06 ADR-013 line 519: "Saves ~100-200ms"

**Why it's dangerous:**
Current Supabase SSR documentation explicitly warns:
- **Do not trust `getSession()` in server-side middleware code**
- `getSession()` returns the session from the cookie WITHOUT verifying the JWT with Supabase
- An attacker with a forged/expired JWT in a cookie can bypass auth
- For server-side protection, use `getClaims()` or verify via `getUser()`

The actual `src/proxy.ts` correctly uses `getUser()` (line 58), NOT `getSession()`.

**Fix applied:**
- ALL `getSession()` recommendations in proxy/auth code removed
- Code examples updated to keep `getUser()` (the safe method)
- Added note: if speed optimization is needed, evaluate `getClaims()` — but verify `@supabase/ssr` version supports it first

### Error 3: Overlay timing contradiction — RESOLVED (Docs 12, 33, 34, 06)

**The contradiction:**
- Doc 12 §6: Add 150ms SHOW_DELAY, remove MIN_DISPLAY_MS (250ms)
- Doc 06 ADR-006: Same — add 150ms delay, remove min display
- Doc 33 §7 Must 1: "Overlay Shows Immediately (No Delay)" — per ADR-003
- Doc 34 §3.1: "ADR-003 explicitly rejected a show delay. The overlay shows immediately on click"
- Actual code: `show()` fires immediately. `hide()` enforces `MIN_DISPLAY_MS = 250`. No `SHOW_DELAY_MS` exists.

**Resolution:**
The actual code behavior (immediate show + MIN_DISPLAY_MS=250) is CORRECT and should NOT be changed in Phase 1. Rationale:
1. Immediate show provides instant visual feedback — the user knows something is happening
2. 250ms minimum prevents a jarring flash on fast navigations
3. The overlay is `pointer-events-none` so it never blocks content or interaction
4. After all other optimizations (prefetch, cache, Suspense), if measurement shows the overlay still appears on >20% of navigations, THEN add a SHOW_DELAY_MS=150 as further refinement

**Fix applied:**
- Doc 12 §6 marked SUPERSEDED
- Doc 06 ADR-006 marked SUPERSEDED (overlay delay portion)
- Doc 33 confirmed correct (immediate show)
- Doc 34 confirmed correct (no delay per ADR-003)
- Current canonical plan: keep immediate show + MIN_DISPLAY_MS=250. Defer delay decision to post-measurement.

### Error 4: React Query keys do not exist — PREFETCH WOULD SILENTLY FAIL (Docs 11, 04)

**What the old plan said:**
- Doc 11 §1.3: Prefetch keys `["projects"]`, `["homebase"]`, `["library"]`, `["templates"]`
- Doc 04 Task 2.2: Same fake keys in sidebar wiring example
- Doc 04 Task 2.2: `queryFn: fetchProjects`, `queryFn: fetchLibrary` — functions that don't exist

**What the code actually has:**
Only 3 React Query key patterns exist:
- `["estimate", estimateId]` — `useEstimateQuery`
- `["estimate", estimateId, "area-tree"]` — `useEstimateAreaTreeQuery`
- `["estimate", estimateId, "area-tree", "revision"]` — internal revision tracking

All other workshop data (projects, library, templates, homebase, settings, charts) is fetched in Server Components, not via React Query.

**Fix applied:**
- Doc 11 marked PARTIALLY SUPERSEDED (RSC wiring remains valid, React Query keys removed)
- Doc 04 Task 2.2 corrected: sidebar uses `router.prefetch()` only (no fake keys)
- Estimate rows: use real `estimateQueryKeys.detail(id)` and `estimateQueryKeys.areaTree(id)` with real `queryFn`
- `usePrefetchOnHover` hook plan updated to distinguish RSC prefetch vs React Query prefetch

### Error 5: usePrefetchOnHover missing router.prefetch() — INCOMPLETE (Docs 34)

**What the old plan said:**
- Doc 15 §4: Updated hook includes both `router.prefetch()` and `queryClient.prefetchQuery()`
- Doc 04 Task 2.1: Same dual-layer approach

**What the actual code does:**
`src/hooks/use-prefetch-on-hover.ts` ONLY calls `queryClient.prefetchQuery({ queryKey })` — NO `router.prefetch()`. Also, it passes ONLY `queryKey` without `queryFn`, which means React Query has no way to fetch the data.

**Fix applied:**
- Hook plan updated: MUST include `router.prefetch(href)` for RSC payload
- For estimate routes: MUST include `queryFn` (not just `queryKey`)
- For non-estimate routes: `router.prefetch()` is sufficient — no React Query needed
- Hook to be rewritten before wiring into navigation components

### Error 6: loading.tsx wraps async WorkshopPageShell — WATERFALL (Docs 34)

**What the old plan said:**
- Doc 10: Skeleton design system — patterns for Suspense fallbacks
- Doc 34 §4.3: Identified as "Known Issue — Medium severity"

**What the code actually does:**
All 6 `loading.tsx` files are:
```tsx
export default async function Loading() {
  return (
    <WorkshopPageShell title="..." breadcrumbs={[...]}>
      <Skeleton ... />
    </WorkshopPageShell>
  );
}
```

`WorkshopPageShell` is async and does:
- `await getCurrentUserContext()` — Supabase `getUser()` + profile fetch (~80-150ms)
- `await getSidePanelWidthCssVariables()` — cookie read

The loading skeleton itself waits for auth to resolve. This defeats the purpose of `loading.tsx` — the user sees a blank screen until auth completes, THEN the skeleton appears.

**Fix applied:**
- Recommendation: replace `WorkshopPageShell` in loading.tsx with a STATIC chrome shell
- Static shell: same layout structure (sidebar placeholder, header bar, content area) but NO async calls
- Skeleton renders within 50ms of click, before auth resolves
- Template provided in CURRENT_CANONICAL_PLAN.md

---

## Contradictions Resolved

| # | Documents | Contradiction | Resolution |
|---|-----------|--------------|------------|
| 1 | 13 vs 31 | proxy.ts "does not guard routes" vs "has correct matcher but dead code" | proxy.ts IS active, DOES guard /workshop routes, runs on all requests |
| 2 | 12/06 vs 33/34 | 150ms show delay vs immediate show | Immediate show is correct. Keep MIN_DISPLAY_MS=250. Defer delay decision. |
| 3 | 31 vs actual code | getSession() vs getUser() in middleware | getUser() is safe. getSession() is dangerous. Keep getUser(). |
| 4 | 11 vs 15 | Fake React Query keys vs real keys | Doc 15 is correct. Doc 11 React Query section is superseded. |
| 5 | 15 vs actual hook | Plan says router.prefetch() + React Query; actual hook is React Query only | Plan is correct — actual hook is incomplete. Fix the hook. |
| 6 | 06 ADR-009 vs 31 | "No middleware, accept it" vs "create middleware.ts" | ADR-009 was correct for old architecture. proxy.ts IS the middleware in Next 16. Both are partly right, partly wrong. |
| 7 | 13 vs actual code | "Zero loading.tsx files — confirmed" vs 6 loading.tsx exist | Doc 13 was written before loading.tsx were created. Fixed. |
| 8 | 13 vs actual code | "Zero Suspense imported anywhere" — still correct | Verified: still 0 Suspense boundaries. |

---

## Superseded Documents

| Doc | Status | Notes |
|-----|--------|-------|
| 31-auth-optimization-middleware-migration.md | **SUPERSEDED** | Entire premise (proxy.ts is dead code; create middleware.ts) is wrong for Next 16 |
| 12-overlay-fallback-strategy.md §6 | **SUPERSEDED** | 150ms show delay + remove min-display contradicts current implementation |
| 06-strategy-adrs.md ADR-006 | **SUPERSEDED** | Overlay delay section |
| 06-strategy-adrs.md ADR-013 §"Proxy.ts → middleware" | **SUPERSEDED** | getSession() recommendation + "create middleware.ts" plan |
| 04-implementation-plan.md Task 1.5.1 | **SUPERSEDED** | "Create middleware.ts, delete proxy.ts" |
| 11-prefetch-wiring-map.md §1.3, §2 | **SUPERSEDED** | Fake React Query keys removed. RSC wiring section still valid. |
| 01-performance-audit.md §3.8 | **PARTIALLY CORRECT** | "Auth forces dynamic rendering" — true. "Proxy.ts does NOT guard routes" — false. |

---

## Documents That Remain Valid

These documents were verified against the codebase and remain accurate:

- 02-blast-radius-analysis.md — Risk matrix still valid (exceptions noted in ADR_UPDATES.md)
- 05-benchmark-scenarios.md — Scenarios still applicable
- 08-risks-and-mitigations.md — Risk analysis still valid (getSession() risk added)
- 10-skeleton-design-system.md — Design patterns correct
- 13-verified-codebase-facts.md — MOSTLY correct. **Two errors**: claims 0 loading.tsx (6 now exist), claims proxy.ts does not guard routes (it does)
- 14-code-splitting-named-exports.md — CORRECT and CRITICAL
- 15-server-component-prefetch-reality.md — CORRECT and CRITICAL
- 16-critical-path-waterfall.md — Valid analysis
- 19-react-memo-strategy.md — Valid approach (deferred to profiling phase)
- 20-font-and-bundle-optimization.md — Valid (Three.js location correction noted)
- 21-error-boundary-strategy.md — Valid (now P1 priority)
- 32-bfcache-strategy.md — Valid (BfcacheHandler already implemented)
- 33-loading-sequence-progressive-enhancement.md — Mostly correct (overlay timing corrected)
- 34-implementation-handoff.md — Accurate reflection of implementation state

---

## New Documents Created

| Document | Purpose |
|----------|---------|
| `CURRENT_CANONICAL_PLAN.md` | Single source of truth. Replaces all conflicting claims. |
| `PLAN_REPAIR_LOG.md` | This file. Documents all corrections and resolutions. |
| `CODEBASE_AUDIT.md` | Route-by-route codebase facts verified against live code. |
| `IMPLEMENTATION_MATRIX.md` | Task matrix with status, risk, validation, and rollback. |
| `BENCHMARK_PROTOCOL.md` | Exact benchmark scenarios and measurement protocol. |
| `ADR_UPDATES.md` | Final architecture decisions with corrections applied. |
