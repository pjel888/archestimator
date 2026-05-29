# 33 — Loading Sequence & Progressive Enhancement

**Status:** New  
**Created:** 2026-05-29  
**Purpose:** Define the exact UX timeline from click to interactive for every navigation scenario. This document unifies the skeleton design (doc 10), overlay fallback (doc 12), prefetch (docs 11/15), Suspense boundaries (doc 04), and bfcache (doc 32) into a single coherent user experience.

---

## Table of Contents

1. [Why This Document Exists](#1-why-this-document-exists)
2. [The Three Navigation Scenarios](#2-the-three-navigation-scenarios)
3. [Scenario A: Ideal Path (Optimized, Prefetched)](#3-scenario-a-ideal-path-optimized-prefetched)
4. [Scenario B: Cold Path (First Visit, No Cache)](#4-scenario-b-cold-path-first-visit-no-cache)
5. [Scenario C: Fallback Path (Slow Network, Error)](#5-scenario-c-fallback-path-slow-network-error)
6. [Component Responsibilities](#6-component-responsibilities)
7. [Implementation Musts](#7-implementation-musts)
8. [Testing the Sequence](#8-testing-the-sequence)

---

## 1. Why This Document Exists

The route-transition-performance-optimization plan has many individual documents covering specific optimizations:

- **Doc 10** — Skeleton designs (what loading UIs look like)
- **Doc 12** — Overlay fallback (when to show the dark scrim)
- **Docs 11/15** — Prefetch (how to preload data)
- **Doc 32** — bfcache (how back/forward should work)
- **Doc 04** — Implementation plan (what to build, in what order)

**Missing:** A unified definition of what the user SEES at each millisecond of a navigation. Without this, different implementers may build inconsistent loading experiences — one might show a blank screen for 200ms, another might flash the overlay unnecessarily, a third might skip the skeleton entirely.

**This document fills that gap.** It defines the exact loading sequence for each navigation scenario, so every implementer builds the same user experience.

---

## 2. The Three Navigation Scenarios

| Scenario | Frequency Target | Expected Latency | Primary UX |
|----------|-----------------|------------------|------------|
| **A: Ideal Path** | ~80% of navigations | < 100ms | Instant — page content appears without any loading indicator |
| **B: Cold Path** | ~15% of navigations | 100-500ms | Skeleton UI shows immediately, content streams in |
| **C: Fallback Path** | ~5% of navigations | > 500ms | Loading overlay appears at 150ms, skeleton at 50ms |

**Target distribution after all optimizations:**

| Scenario | Before | After |
|----------|--------|-------|
| Ideal (A) | ~0% | ~80% |
| Cold (B) | ~40% | ~15% |
| Fallback (C) | ~60% | ~5% |

---

## 3. Scenario A: Ideal Path (Optimized, Prefetched)

### When This Happens

- User has visited this page before (React Query cache hit)
- User hovered the link for >200ms (RSC + React Query prefetch completed)
- User navigated via browser back/forward (bfcache restore)
- User is revisiting within the same session (RSC cache still fresh)

### UX Timeline

```
T+0ms     User clicks link
          └── No loading indicator shown (optimistic — we expect fast navigation)
          
T+0-5ms   Route change triggers
           └── Zustand navigation-ui-store.show() fires immediately
           └── Overlay becomes visible (250ms minimum display timer starts)
          
T+5-20ms  Next.js route commit
          └── RSC payload from cache or prefetch → instant render
          └── Server Component output is already in client cache
          
T+20-50ms Content renders
          └── No skeleton needed — content arrives before 50ms threshold
          └── Client components hydrate from React Query cache
          
T+50-100ms Full interactivity
          └── Overlay timer is cancelled (< 150ms threshold → overlay never appears)
          └── NavigationListener fires route-change-complete
```

### What the User Sees

```
[Click] → [No blank screen] → [Content appears instantly] → [Fully interactive]
```

**No loading indicator of any kind.** The page transition is imperceptible.

### Visual State Machine

```
      ┌──────────────┐
      │  Current Page │
      └──────┬───────┘
             │ click link (prefetched)
             ▼
      ┌──────────────┐     < 50ms     ┌──────────────────┐
      │ Route Commit │ ──────────────→│ Content Rendered  │
      └──────────────┘                └──────────────────┘
                                             │ < 100ms
                                             ▼
                                      ┌──────────────────┐
                                      │  Fully Interactive│
                                      └──────────────────┘
```

---

## 4. Scenario B: Cold Path (First Visit, No Cache)

### When This Happens

- First visit to this page in the session
- Link was not prefetched (no hover, or hover < 200ms)
- React Query cache is empty (staleTime expired)
- bfcache miss (different page in history)

### UX Timeline

```
T+0ms     User clicks link
          └── No loading indicator yet (optimistic)
          
T+0-5ms   Route change triggers
           └── navigation-ui-store.show() fires immediately
           └── Overlay becomes visible (250ms minimum display timer starts)
          
T+20ms    navigation-ui-store shows "navigation in progress" state
          └── loading.tsx skeleton appears (if this route has one)
          
T+50ms    Skeleton renders
          └── Shaped blocks matching page layout
          └── aria-hidden="true" (screen readers should not announce skeletons)
          └── No spinner — shaped blocks only
          
T+150ms   🚨 Overlay timer check
          └── If still loading → RouteLoadingOverlay activates (dark scrim + spinner)
          └── This is the "fallback" line — crossing it triggers the overlay
          
T+200-500ms  Content streams in via Suspense
          └── Each Suspense boundary resolves independently
          └── Skeleton blocks replaced by real content one by one
          └── CLS stays < 0.1 because skeletons match content dimensions
          
T+500ms   Final content rendered
          └── Overlay dismissed (if it was shown)
          └── Full interactivity achieved
```

### What the User Sees

```
[Click] → [Blank screen for ~20ms] → [Skeleton for ~130ms] →
[Optional overlay if slow] → [Content streams in] → [Full page]
```

### Visual State Machine

```
      ┌──────────────┐
      │  Current Page │
      └──────┬───────┘
             │ click link (cold)
             ▼
      ┌──────────────────┐
      │ Route Transition  │ ← background: no visual change yet
      │ (loading.tsx)     │
      └──────┬───────────┘
             │ < 50ms
             ▼
      ┌──────────────────┐
      │ Skeleton Rendered │ ← shaped blocks, no spinner
      └──────┬───────────┘
             │
      ┌──────┴──────────┐
      │ < 150ms?         │
      └──────┬──────────┘
     YES     │     NO (slow)
             ▼              ▼
      ┌──────────┐  ┌──────────────┐
      │ Continue  │  │ Overlay Shows│ ← dark scrim + spinner
      │ streaming │  └──────┬───────┘
      └──────┬───┘         │
             │              │
             ▼              ▼
      ┌──────────────────────────┐
      │   Content Complete       │
      │   (Overlay dismissed)    │
      └──────────────────────────┘
```

---

## 5. Scenario C: Fallback Path (Slow Network, Error)

### When This Happens

- 3G or slower network (RTT > 300ms)
- Server under heavy load (TTFB > 500ms)
- Supabase query timeout
- Unexpected error during navigation

### UX Timeline

```
T+0ms     User clicks link
          
T+20ms    Skeleton appears (loading.tsx)
          
T+150ms   🚨 Navigation still in progress (overlay already shown at T+0)
           └── Overlay continues showing (safety net, already visible)
           └── aria-live="polite" announces "Loading" to screen readers
          └── Dark scrim covers the skeleton
          └── Spinner centered on screen
          └── aria-live="polite" announces "Loading" to screen readers
          
T+500ms-3s  Content loads or error occurs
          
          ┌── IF success → Overlay fades out (200ms transition)
          │   └── Content is already rendered behind overlay
          │   └── No CLS because content rendered while scrim was active
          │
          └── IF error → error.tsx boundary activates
              └── Overlay dismissed
              └── Error UI shown with retry button
              └── aria-live="assertive" announces error
              
T+3500ms  🚨 Safety timeout (SAFETY_TIMEOUT_MS = 10_000)
          └── If still loading after 10s → force complete
          └── Show whatever content is available
          └── Log to monitoring: "navigation safety timeout triggered"
```

### What the User Sees

```
[Click] → [Skeleton ~20ms] → [Dark scrim at 150ms] →
[Spinner while loading] → [Content appears] or [Error UI]
```

---

## 6. Component Responsibilities

| Component | File | Role in Sequence |
|-----------|------|------------------|
| **Zustand store** | `src/stores/navigation-ui-store.ts` | Tracks navigation start/end, manages overlay timing (150ms delay, 10s safety timeout) |
| **RouteLoadingOverlay** | `src/components/ui/route-loading-overlay.tsx` | Dark scrim + spinner, portal at z-150, 200ms transition, respects overlay timing |
| **loading.tsx** (5+ files) | `src/app/workshop/**/loading.tsx` | Route-specific skeletons matching page layout. Always shown before overlay. |
| **Suspense boundaries** | Various page.tsx and component files | Non-blocking data loading, stream content as available |
| **BfcacheHandler** | NEW: `src/components/bfcache-handler.tsx` | Detects bfcache restore, skips all loading indicators on back/forward |
| **PerformanceMonitor** | NEW: `src/components/performance-monitor.tsx` | Measures actual timing, logs to console/devtools |
| **NavigationListener** | `src/components/navigation-listener.tsx` | Intercepts link clicks + popstate, calls `show()`/`hide()` on the navigation store |
| **error.tsx** (5+ files) | `src/app/workshop/**/error.tsx` | Error recovery UI with retry button |
| **Prefetch handler** | `src/hooks/use-prefetch-on-hover.ts` | Prefetches RSC payload + React Query data on hover (Scenario A enabler) |

### Timing Responsibilities

```
T+0ms      User click → navigation-ui-store.show() → overlay visible immediately
                ↓
T+20ms     loading.tsx skeleton appears (if exists — ⚠️ not yet implemented)
                ↓
T+150ms    🚨 CHECK: Still loading? → overlay continues showing (already visible since T+0)
                ↓
T+500ms+   Content ready → navigation-ui-store.hide() → overlay hides after MIN_DISPLAY_MS
                ↓
T+10000ms  🚨 SAFETY: Force complete (SAFETY_TIMEOUT_MS), log warning
```

---

## 7. Implementation Musts

### Must 1: Overlay Shows Immediately (No Delay)

Per ADR-003, the overlay shows *immediately* on click — the user gets instant visual feedback. A 250ms minimum display timer (`MIN_DISPLAY_MS`) prevents flicker on fast navigations. The overlay will not appear for Scenario A because the minimum display timer applies *after* the overlay is shown, not as a show delay.

**Why no delay:**
- A show delay adds unnecessary latency — the user sees nothing for 150ms
- The 250ms minimum timer already handles fast navigations gracefully (overlay shows briefly then fades)
- The overlay uses `pointer-events-none` so it never blocks interaction or content rendering
- Non-blocking overlay means there's no harm in showing it for fast navigations

### Must 2: Every Route Needs loading.tsx or a Suspense Fallback

Without a loading.tsx, Scenario B shows a blank screen for 100-500ms. Every route must have a skeleton matching its layout.

### Must 3: Skeletons Must Match Content Dimensions

Skeletons that don't match content cause CLS when replaced. Use the same classes as the real content.

### Must 4: bfcache Handler Must Suppress All Loading Indicators

When a page restores from bfcache, no loading state should appear. The BfcacheHandler must detect `pageshow.persisted` and skip skeleton/overlay entirely.

### Must 5: Overlay Must Not Block Content Rendering

The overlay is a CSS overlay (position: fixed, z-index: 150). Content behind it must continue rendering. When the overlay hides, content should already be fully rendered.

### Must 6: Screen Readers Must Get Appropriate Announcements

- **loading.tsx skeleton:** `aria-hidden="true"` (don't announce loading blocks)
- **Overlay active (T+150ms):** `aria-live="polite"` "Loading"
- **Error:** `aria-live="assertive"` "Error loading page"
- **Content rendered:** `aria-live="polite"` "[Page name] loaded"

### Must 7: Safety Timeout Guards Against Infinite Loading

The 10-second safety timeout must force-complete any stuck navigation. The user should never see an infinite spinner.

---

## 8. Implementation Gap Audit

The following components and files are referenced in this document but **do not currently exist** in the codebase:

| Missing Component | Referenced In | Priority | Notes |
|------------------|--------------|----------|-------|
| `loading.tsx` files (5+ routes) | §Must 2, §4, §5 | **High** | Currently 0 loading.tsx files exist. Every route needs one for Scenario B/C. |
| `BfcacheHandler` component | §6 Component Table | **High** | Listed as existing; does not exist. bfcache restore detection is critical for Scenario A. |
| `use-prefetch-on-hover` hook | §6 Component Table | **High** | Does not exist. Required for Scenario A (prefetched navigation). |
| `PerformanceMonitor` component | §6 Component Table | **Medium** | Does not exist. Useful for metrics collection during implementation. |

### Store API Reality vs Doc Language

The store uses `show()` / `hide()` naming, not `startNavigation()` / `endNavigation()`. All timeline descriptions in this document have been updated to use the correct API.

### Overlay Timing Reality

Per ADR-003 (archived), the overlay shows **immediately** on click with no delay. The 250ms `MIN_DISPLAY_MS` timer ensures the overlay is visible for at least 250ms before hiding, preventing flicker on fast navigations. The overlay uses `pointer-events-none` so it never blocks interaction or content rendering.

---

## 9. Testing the Sequence

### Test: Scenario A (Ideal)

```
1. Visit /workshop/projects
2. Hover "Library" sidebar link for >200ms
3. Click "Library"
4. Verify: No skeleton, no overlay, content appears instantly (< 100ms)
5. Verify: PerformanceMonitor logs < 100ms
```

### Test: Scenario B (Cold)

```
1. Open incognito window (no cache)
2. Click "Projects" sidebar link (no prefetch — direct navigation)
3. Verify: Skeleton appears within 50ms
4. Verify: No overlay (navigation completes < 150ms)
5. Verify: Skeleton matches real content layout (no CLS)
```

### Test: Scenario C (Fallback)

```
1. Open Chrome DevTools → Network → "Slow 3G" throttling
2. Click into a heavy estimate workspace
3. Verify: Skeleton at ~50ms
4. Verify: Overlay activates at ~150ms
5. Verify: Content appears behind overlay
6. Verify: Overlay dismisses with 200ms fade
```

### Test: bfcache Back/Forward

```
1. Visit /workshop/projects → wait for full load
2. Click into a project → wait for full load
3. Press Back
4. Verify: Page restores instantly (< 50ms)
5. Verify: No skeleton, no overlay
6. Verify: pageshow.persisted === true
```

### Test: Error Recovery

```
1. Navigate to a route that triggers an error (or mock an API failure)
2. Verify: Overlay appears at 150ms
3. Verify: error.tsx activates, overlay dismisses
4. Verify: "Retry" button works
```

---

**Next:** This document defines the user experience. Implement it through `04-implementation-plan.md` tasks. Use `10-skeleton-design-system.md` for skeleton designs, `12-overlay-fallback-strategy.md` for overlay details, `32-bfcache-strategy.md` for bfcache handling, and `21-error-boundary-strategy.md` for error recovery.
