# 12 — Overlay Fallback Strategy: Making the Loading Overlay a Rare Event

**Status:** New  
**Created:** 2026-05-29  
**Purpose:** Define the strategy for making the route transition loading overlay (`.ai/09_archive/route-transition-loading-overlay/`) appear only in truly rare cases. The overlay should be a safety net, not the primary loading experience.

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

### Success Signal

When the overlay visibility rate drops below 5% of all navigations, the strategy is successful. The overlay is now a rare fallback.

---

**Next:** Implement the phased plan in `04-implementation-plan.md`, starting with Phase 1 (quick wins) to establish the foundation for this strategy.
