# 12 — Overlay Fallback Strategy: Making the Loading Overlay a Rare Event

> ⚠️ **SUPERSEDED §6 (Overlay Timing Changes).** The 150ms show delay and "remove MIN_DISPLAY_MS" recommendations in §6 contradict the current implementation (immediate show + MIN_DISPLAY_MS=250) and the decision documented in `ADR_UPDATES.md` ADR-006. The overlay timing strategy is deferred until AFTER baseline measurement. See `CURRENT_CANONICAL_PLAN.md` §"Corrected Assumptions" #3. The layered defense strategy (§4, §5) and success criteria (§7) remain directionally valid.

**Status:** PARTIALLY SUPERSEDED  
**Created:** 2026-05-29  
**Superseded by:** `CURRENT_CANONICAL_PLAN.md`, `ADR_UPDATES.md` ADR-006  
**Historical purpose:** (Retained for reference) Define the strategy for making the overlay a rare event.

---

## Table of Contents

1. [The Vision](#1-the-vision)
2. [Current State: Overlay as Primary UX](#2-current-state-overlay-as-primary-ux)
3. [Target State: Overlay as Rare Fallback](#3-target-state-overlay-as-rare-fallback)
4. [Layered Defense Strategy](#4-layered-defense-strategy)
5. [Decision Tree: What Shows When](#5-decision-tree-what-shows-when)
6. [Overlay Timing Changes](#6-overlay-timing-changes)
7. [Success Criteria](#7-success-criteria)
8. [Measurement](#8-measurement)

---

## 1. The Vision

**Every navigation should feel instant.** The user clicks a link and the new page content appears within 100ms. No dark scrim, no spinner, no blank screen. The loading overlay only appears in the rare case where everything else fails:

- Network is extremely slow (3G or worse)
- Server is under heavy load
- First visit to a data-heavy page with no cached data
- Unexpected error during navigation

**The overlay is the last line of defense, not the first.**

---

## 2. Current State: Overlay as Primary UX

Today, the overlay is the **primary** loading experience:

```
User clicks link
  → NavigationListener fires show(href)
  → Overlay appears immediately (0ms delay)
  → 250ms minimum display timer enforced
  → Next.js fetches RSC payload (cold, no prefetch)
  → Server Component fetches data from Supabase (cold, no cache)
  → Page renders
  → usePathname changes → hide() fires
  → Overlay disappears (minimum 250ms after show)
```

**Result:** Every navigation shows the overlay for 250-800ms. Users see a dark scrim on every click.

---

## 3. Target State: Overlay as Rare Fallback

After all optimizations, the navigation flow becomes:

```
User hovers link (200ms ago)
  → Prefetch fires: RSC payload cached + React Query data cached
  
User clicks link
  → NavigationListener fires show(href) → 150ms show delay timer starts
  → Next.js serves cached RSC payload (instant)
  → Server Component serves cached data (instant) or Suspense fallback renders
  → Page commits within 50-100ms
  → usePathname changes → hide() fires → clears show delay timer
  → Overlay NEVER APPEARS (navigation completed before 150ms delay)
```

**Result:** The overlay's 150ms show delay means it only appears for navigations that take longer than 150ms. With prefetching + caching + Suspense, most navigations complete in < 100ms. The overlay is invisible.

---

## 4. Layered Defense Strategy

The overlay becomes rare through 5 layers of defense. Each layer catches progressively more navigations:

### Layer 1: Prefetch on Hover (catches ~60% of navigations)

**What it does:** When the user hovers a link for 200ms, the RSC payload and React Query data are prefetched. By the time they click, everything is cached.

**Catches:** Sidebar links, project cards, estimate table rows — any link the user hovers before clicking.

**Result:** Navigation completes in < 50ms. Overlay never appears.

### Layer 2: Aggressive Caching (catches ~25% of navigations)

**What it does:** React Query `staleTime` increased to 5 minutes. Data fetched on first visit is cached for 5 minutes. Revisits serve from cache instantly.

**Catches:** Back/forward to recently visited pages, revisiting pages within 5 minutes.

**Result:** Navigation completes in < 50ms from cache. Overlay never appears.

### Layer 3: Suspense Boundaries (catches ~10% of navigations)

**What it does:** Workshop page shells render immediately via Suspense. Heavy data (project lists, estimate trees, library) resolves in the background with skeleton fallbacks.

**Catches:** First visits to pages with slow data fetching, cold navigations without prefetch.

**Result:** Shell appears within 50ms (before overlay's 150ms delay). Skeleton shows while data loads. Overlay never appears because the shell committed before the delay.

### Layer 4: Code Splitting (catches ~3% of navigations)

**What it does:** Heavy components (`EstimateSheetContent`, `EstimateSheetTree`, `AddComponentModal`) are dynamically imported. Their JavaScript chunks load on demand.

**Catches:** First visits to heavy pages where the JS bundle hasn't been downloaded yet.

**Result:** Skeleton shows while chunk loads. If chunk loads within 150ms, overlay never appears. If chunk is slow (3G), overlay appears as a second layer of feedback.

### Layer 5: The Overlay (catches ~2% of navigations)

**What it does:** The overlay appears only when navigation takes > 150ms AND no other feedback is visible.

**Catches:** Extremely slow networks, server errors, unexpected delays.

**Result:** The overlay is the safety net for truly exceptional cases.

---

## 5. Decision Tree: What Shows When

```
User clicks link
  │
  ├─ Data prefetched + cached? (hover prefetch or staleTime)
  │   ├─ YES → Navigation completes in < 50ms → No feedback needed
  │   └─ NO → Continue to next check
  │
  ├─ Suspense boundary exists for this route?
  │   ├─ YES → Shell renders immediately (< 50ms) → Skeleton shows for content
  │   │        → Overlay's 150ms delay timer never fires
  │   └─ NO → Continue to next check
  │
  ├─ Navigation completes within 150ms?
  │   ├─ YES → Overlay's show delay timer cancelled → No overlay
  │   └─ NO → Overlay appears (150ms delay elapsed)
  │
  └─ Overlay shown
      ├─ Navigation completes → Overlay hides immediately (no min display timer)
      └─ 10s safety timeout → Overlay force-hides
```

---

## 6. Overlay Timing Changes

### Current Timing (from `navigation-ui-store.ts`)

```typescript
const MIN_DISPLAY_MS = 250;  // Overlay stays visible for at least 250ms
const SAFETY_TIMEOUT_MS = 10_000;
```

### Target Timing

```typescript
const SHOW_DELAY_MS = 150;   // Only show overlay if navigation takes > 150ms
const SAFETY_TIMEOUT_MS = 10_000;
// MIN_DISPLAY_MS REMOVED — hide immediately when navigation completes
```

### Key Changes

1. **Add 150ms show delay.** The overlay doesn't appear immediately on click. It waits 150ms. If navigation completes before then, the overlay never appears.

2. **Remove minimum display timer.** The current 250ms minimum means even fast navigations show the overlay for 250ms. Removing it means the overlay disappears the instant navigation completes, even if it just appeared.

3. **Keep safety timeout.** The 10-second safety timeout prevents infinite spinners if something goes wrong.

### Why 150ms?

- **< 100ms:** Feels instant. Users don't perceive any delay. (Our target for most navigations.)
- **100-200ms:** Feels fast but noticeable. Users perceive a slight delay but don't feel blocked.
- **200-300ms:** Feels slow. Users start to feel like something is loading.
- **> 300ms:** Feels blocked. Users feel like the app is unresponsive.

**150ms** is the sweet spot: it's long enough to prevent the overlay from appearing on fast navigations (prefetched + cached), but short enough to show feedback before users feel blocked on slow navigations.

---

## 7. Success Criteria

### Quantitative

| Metric | Current | Target |
|--------|---------|--------|
| % of navigations showing overlay | ~100% | < 5% |
| Average overlay display duration | 250-800ms | N/A (rarely shown) |
| Cold navigation (no prefetch, no cache) | 300-800ms | < 300ms with skeleton |
| Warm navigation (prefetched or cached) | 200-500ms | < 50ms |
| Revisit navigation (within 5 min) | 200-500ms | < 50ms |
| Back/forward navigation | 300-800ms | < 50ms (bfcache) |

### Qualitative

- [ ] Users describe navigation as "instant" or "snappy"
- [ ] Users never mention the loading overlay in feedback
- [ ] The overlay is so rare that developers forget it exists
- [ ] The overlay only appears on slow 3G or server issues

---

## 8. Measurement

### Track Overlay Visibility

Add telemetry to the overlay component:

```tsx
// In RouteLoadingOverlay
useEffect(() => {
  if (isNavigating) {
    const startTime = Date.now();
    return () => {
      const duration = Date.now() - startTime;
      // Track: overlay was visible for `duration` ms
      if (process.env.NODE_ENV === "production") {
        // analytics.track("overlay_shown", { duration });
      }
    };
  }
}, [isNavigating]);
```

### Track Navigation Completion Time

In the `PerformanceMonitor` component (Phase 0):

```tsx
useEffect(() => {
  const startTime = performance.now();
  return () => {
    const duration = performance.now() - startTime;
    // Track: navigation took `duration` ms
  };
}, [pathname]);
```

### Enhanced Metrics

Track which optimization layer prevented the overlay:

```typescript
// Track cache hit rates
analytics.track("cache_hit", {
  route: pathname,
  cacheType: "react_query" | "unstable_cache" | "bfcache",
  age: cacheAge,
});

// Track prefetch success
analytics.track("prefetch_result", {
  route: targetRoute,
  success: boolean,
  latency: prefetchDuration,
});

// Track error boundary triggers
analytics.track("error_boundary", {
  route: pathname,
  component: componentName,
  error: errorMessage,
});
```

### Success Signal

When the overlay visibility rate drops below 5% of all navigations, the strategy is successful. The overlay is now a rare fallback.

---

## 9. Additional Fallback Layers (Deep Audit Findings)

The deep codebase analysis revealed additional optimization opportunities that further reduce overlay visibility:

### Layer 6: Proxy.ts Middleware Migration (catches ~8% of slow navigations)

**What it does:** Migrates auth from data-fetching layer to Next.js middleware, reducing auth latency from 100-200ms to <10ms.

**Catches:** All authenticated route navigations (16+ protected routes).

**Result:** Removes the single largest server-side bottleneck. Cold navigations drop from 800-1500ms to 600-1200ms.

**Implementation:** See `17-server-side-optimization-strategy.md` §1 and `04-implementation-plan.md` Task 1.5.1.

### Layer 7: React.memo Strategic Memoization (catches ~5% of perceived slowness)

**What it does:** Wraps high-impact components (row items, tree nodes, cards) in `React.memo` to prevent unnecessary re-renders.

**Catches:** List/tree components with 10+ instances that re-render when parent state changes.

**Result:** 10x faster re-renders (50-100ms → 5-10ms). Editing a single row feels instant instead of laggy.

**Implementation:** See `19-react-memo-strategy.md` and `04-implementation-plan.md` Task 1.5.2.

### Layer 8: Error Boundaries (prevents full-page crashes)

**What it does:** Catches component errors and shows retry UI instead of crashing the entire page.

**Catches:** Component errors in estimate workspace, library, and charts (high-risk areas).

**Result:** 20x faster error recovery (1000ms full reload → 50ms retry). Prevents overlay from appearing due to crashes.

**Implementation:** See `21-error-boundary-strategy.md` and `04-implementation-plan.md` Task 1.5.4.

### Layer 9: N+1 Query Fixes (catches ~10% of server slowness)

**What it does:** Batches sequential queries in repository functions to reduce server query time.

**Catches:** List pages with many items (projects, estimates, library components).

**Result:** 30-50% reduction in server-side query time. List pages load faster, reducing overlay visibility.

**Implementation:** See `17-server-side-optimization-strategy.md` §4 and `04-implementation-plan.md` Task 2.0.

### Layer 10: Project Layout Caching (catches ~7% of sub-navigation slowness)

**What it does:** Caches project layout queries with `unstable_cache` to eliminate re-fetch on sub-navigation.

**Catches:** Sub-navigation within project segment (projects/X/estimates → projects/X/charts).

**Result:** ~90ms reduction per sub-navigation. Navigating between project sub-pages feels instant.

**Implementation:** See `17-server-side-optimization-strategy.md` §2 and `04-implementation-plan.md` Task 1.5.3.

---

## 10. Realistic Projections by Route

Based on waterfall analysis (`16-critical-path-waterfall.md`), here are realistic projections for overlay visibility after each phase:

### Estimate Workspace (Heaviest Route)

| Phase | Expected Latency | Overlay Visibility | Primary Bottleneck |
|-------|------------------|-------------------|-------------------|
| Current | 800-1500ms | 100% | Server auth + hydration |
| After Phase 1 | 600-1000ms | 95% | Server auth + hydration |
| After Phase 1.5 | 400-700ms | 70% | Hydration + data fetching |
| After Phase 2 | 200-400ms | 30% | Hydration |
| After Phase 3 | <200ms | <5% | None (target achieved) |

**Key optimizations:** Proxy.ts migration (Phase 1.5), React.memo (Phase 1.5), code splitting (Phase 1), prefetch (Phase 2), virtualization (Phase 3).

### Component Library (Second Heaviest)

| Phase | Expected Latency | Overlay Visibility | Primary Bottleneck |
|-------|------------------|-------------------|-------------------|
| Current | 600-1000ms | 100% | Server auth + tree rendering |
| After Phase 1 | 500-800ms | 90% | Server auth + tree rendering |
| After Phase 1.5 | 300-500ms | 60% | Tree rendering |
| After Phase 2 | 150-300ms | 20% | Tree rendering |
| After Phase 3 | <150ms | <5% | None (target achieved) |

**Key optimizations:** Proxy.ts migration (Phase 1.5), code splitting (Phase 1), prefetch (Phase 2), "load more" pagination (Phase 3).

### Projects List (Third Heaviest)

| Phase | Expected Latency | Overlay Visibility | Primary Bottleneck |
|-------|------------------|-------------------|-------------------|
| Current | 500-900ms | 100% | Server auth + N+1 queries |
| After Phase 1 | 400-700ms | 85% | Server auth + N+1 queries |
| After Phase 1.5 | 300-500ms | 50% | N+1 queries |
| After Phase 2 | 150-300ms | 15% | Image loading |
| After Phase 3 | <150ms | <5% | None (target achieved) |

**Key optimizations:** Proxy.ts migration (Phase 1.5), N+1 fixes (Phase 2), virtualization (Phase 3), lazy image loading (Phase 1).

### Landing Page (Public, No Auth)

| Phase | Expected Latency | Overlay Visibility | Primary Bottleneck |
|-------|------------------|-------------------|-------------------|
| Current | 400-800ms | 100% | Three.js (deferred from critical path) + fonts |
| After Phase 1 | 150-300ms | 20% | Below-fold content |
| After Phase 2 | <150ms | <5% | None (target achieved) |

**Key optimizations:** Three.js dynamic import (Phase 1, Task 1.7), font optimization (Phase 1, Task 1.8), code splitting (Phase 1).

---

## 11. Edge Cases and Failure Modes

### Edge Case 1: Prefetch Fails

**Scenario:** User hovers link, but prefetch fails (network error, server error, timeout).

**Current behavior:** Prefetch silently fails. User clicks link, navigation is cold (no cache).

**Improved behavior:**
1. Log prefetch failure to analytics
2. Fall back to immediate navigation (no prefetch benefit)
3. Overlay appears after 150ms delay if navigation is slow
4. Retry prefetch on next hover (with exponential backoff)

**Implementation:** Add error handling to `usePrefetchOnHover` hook.

### Edge Case 2: Cache Stale but Not Expired

**Scenario:** Data in React Query cache is 4 minutes old (within 5-minute `staleTime`), but user expects fresh data.

**Current behavior:** Serve stale data. User sees outdated information.

**Improved behavior:**
1. Serve stale data immediately (fast navigation)
2. Trigger background refetch
3. Show subtle "updating" indicator (not overlay)
4. Update UI when fresh data arrives

**Implementation:** Use React Query's `refetchOnMount: 'always'` for critical data, or manual `queryClient.invalidateQueries` on navigation.

### Edge Case 3: Slow 3G Network

**Scenario:** User on very slow network (3G or worse). All navigations take 2-5 seconds.

**Current behavior:** Overlay appears after 150ms, stays visible for 2-5 seconds.

**Improved behavior:**
1. Overlay appears after 150ms (as designed)
2. Show progress indicator (e.g., "Loading... 45%")
3. Offer "cancel navigation" option after 3 seconds
4. Cache aggressively to avoid repeat slow navigations

**Implementation:** Add progress tracking to `NavigationListener`, show progress in overlay UI.

### Edge Case 4: Error Boundary Catches Error

**Scenario:** Component throws error during navigation. Error boundary catches it.

**Current behavior:** Full-page crash. User must reload (1000ms recovery).

**Improved behavior:**
1. Error boundary catches error
2. Show retry UI (50ms recovery)
3. Log error to analytics
4. Overlay does NOT appear (error boundary handles it)

**Implementation:** Error boundaries prevent overlay from appearing. See `21-error-boundary-strategy.md`.

### Edge Case 5: bfcache Restore

**Scenario:** User clicks back button, page restored from bfcache.

**Current behavior:** `pageshow` event fires with `event.persisted === true`. Overlay hidden.

**Improved behavior:**
1. Detect bfcache restore via `pageshow` event
2. Skip overlay entirely (page already rendered)
3. Verify data freshness (optional background refetch)
4. Log bfcache hit to analytics

**Implementation:** Already planned in `04-implementation-plan.md` Task 2.4.

---

## 12. Integration with New Optimizations

The new optimizations discovered in deep analysis (documents 16-21) significantly improve overlay fallback strategy:

### Proxy.ts Middleware Migration (Task 1.5.1)

**Impact on overlay:** Reduces cold navigation latency by 100-200ms. This is the single largest improvement.

**Overlay visibility reduction:** ~8% of navigations that would have shown overlay now complete before 150ms delay.

**Risk:** Migration may break auth flows. Comprehensive E2E testing required. See `08-risks-and-mitigations.md` R21.

### React.memo Strategic Memoization (Task 1.5.2)

**Impact on overlay:** Reduces re-render time for list/tree components by 10x. Editing a row feels instant.

**Overlay visibility reduction:** Overlay does not appear for re-renders (only for navigations). However, perceived performance improves significantly.

**Risk:** Ineffective if props are not stable. Must audit memoized components. See `08-risks-and-mitigations.md` R22.

### Error Boundaries (Task 1.5.4)

**Impact on overlay:** Prevents overlay from appearing due to component crashes. Error boundary handles error instead.

**Overlay visibility reduction:** Overlay does not appear for error scenarios. Error boundary shows retry UI instead.

**Risk:** Infinite error loops if not implemented correctly. Limit retries to 3. See `08-risks-and-mitigations.md` R25.

### N+1 Query Fixes (Task 2.0)

**Impact on overlay:** Reduces server query time by 30-50% for list pages.

**Overlay visibility reduction:** ~10% of navigations to list pages complete faster, reducing overlay visibility.

**Risk:** Changes query logic, may return incorrect data if not tested. See `08-risks-and-mitigations.md` R27.

### Project Layout Caching (Task 1.5.3)

**Impact on overlay:** Eliminates re-fetch on sub-navigation within project segment.

**Overlay visibility reduction:** ~7% of sub-navigations complete 90ms faster, reducing overlay visibility.

**Risk:** Cache staleness if not invalidated on mutations. See `08-risks-and-mitigations.md` R26.

---

**Next:** Implement the phased plan in `04-implementation-plan.md`, starting with Phase 1 (quick wins) to establish the foundation for this strategy.

> **Related:** See `32-bfcache-strategy.md` for back/forward navigation optimization — bfcache alone eliminates the overlay for the most common multi-step navigation flow. See `30-dynamic-rendering-analysis.md` for the server-side caching foundation. See `33-loading-sequence-progressive-enhancement.md` for the exact UX timeline defining when the overlay activates (150ms) and when it must be suppressed (bfcache).
