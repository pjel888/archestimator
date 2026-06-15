# 32 — bfcache Strategy: Instant Back/Forward Navigation

**Status:** New  
**Created:** 2026-05-29  
**Purpose:** Ensure all routes are compatible with the browser's Back-Forward Cache (bfcache) so that back/forward navigation restores the page from memory in < 50ms — no server round-trip, no loading overlay, no data re-fetch.

---

## Table of Contents

1. [What Is bfcache?](#1-what-is-bfcache)
2. [Why bfcache Is Critical for "Seamless UX"](#2-why-bfcache-is-critical-for-seamless-ux)
3. [bfcache Compatibility Audit](#3-bfcache-compatibility-audit)
4. [Codebase bfcache Blocker Check](#4-codebase-bfcache-blocker-check)
5. [Route-by-Route bfcache Assessment](#5-route-by-route-bfcache-assessment)
6. [Implementation Checklist](#6-implementation-checklist)
7. [Testing bfcache](#7-testing-bfcache)
8. [Fallback: Non-bfcache Routes](#8-fallback-non-bfcache-routes)
9. [Monitoring bfcache Rates](#9-monitoring-bfcache-rates)

---

## 1. What Is bfcache?

The **Back-Forward Cache (bfcache)** is a browser feature that stores a complete snapshot of a page (including the JavaScript heap) in memory when the user navigates away. If the user presses the Back button, the page is restored from memory instantly — no network request, no re-render, no data re-fetch.

**Performance characteristics:**
- **Restore time:** < 50ms (vs 300-800ms for a full navigation)
- **Server round-trips:** 0 (vs 1+ for a cold navigation)
- **JavaScript re-execution:** None (the heap is frozen and restored)
- **React state:** Preserved (including hooks, stores, query cache)

### How bfcache Differs from Other Caching

| Cache Type | Storage | Serves | Re-fetches Data | Re-runs JS | Speed |
|-----------|---------|--------|----------------|------------|-------|
| **bfcache** | Browser memory (whole page) | Back/forward | No | No | < 50ms |
| **RSC prefetch** | Next.js client cache (RSC payload) | Same-page navigation | No (until stale) | Yes (hydration) | ~50ms |
| **HTTP cache** | Disk (response) | Any navigation (with correct headers) | No (until stale) | Yes | ~100ms |
| **React Query cache** | Memory (data only) | Client components | No (until stale) | Yes | ~50ms (data cached) |

**Key insight:** bfcache is the **only** cache that preserves the fully rendered page without ANY JS re-execution. For back/forward navigation, it is the ultimate performance optimization.

### bfcache API

The browser fires a `pageshow` event when a page is restored from bfcache:

```typescript
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    // Page was restored from bfcache — don't re-fetch data
    console.log("[bfcache] Page restored from back-forward cache");
  }
});
```

---

## 2. Why bfcache Is Critical for "Seamless UX"

### The User Flow

Users navigate between workshop pages primarily in two patterns:

1. **Forward navigation** (clicking links): Optimized by RSC prefetch + Suspense + skeletons
2. **Back/forward navigation** (browser buttons): Currently triggers a FULL server round-trip + re-render

**Without bfcache:**
- User clicks "Projects" sidebar link → page loads (300ms)
- User clicks into a project → page loads (300ms)  
- User clicks into estimates → page loads (500ms)
- User presses **Back** twice → **TWO separate server round-trips** → ~600-1000ms total
- Loading overlay shows on each back navigation

**With bfcache:**
- User clicks "Projects" → page loads (300ms)
- User clicks into a project → page loads (300ms)
- User clicks into estimates → page loads (500ms)
- User presses **Back** twice → both pages restored from memory → **< 50ms each** → no overlay

### Impact on Overlay Visibility

The current overlay has a 250ms minimum display timer. bfcache restores in < 50ms. Therefore:

- **Without bfcache:** Back/forward navigation takes 300-800ms → overlay shows
- **With bfcache:** Back/forward navigation takes < 50ms → overlay never triggers

**bfcache alone eliminates the overlay for back/forward navigation — the most common multi-step navigation pattern.**

---

## 3. bfcache Compatibility Audit

### What Blocks bfcache

The browser refuses to cache a page in bfcache if any of these conditions are true:

| Blocker | Why | Severity |
|---------|-----|----------|
| `unload` event listener | bfcache cannot safely freeze a page with `unload` handlers | **FATAL** |
| `beforeunload` event listener | Same as above | **FATAL** |
| `Cache-Control: no-store` header | Explicitly tells browser not to cache | **FATAL** |
| `no-cache` or `max-age=0` | May prevent bfcache in some browsers | **HIGH** |
| Open IndexedDB connection | Safari blocks bfcache for pages with open DB connections | MEDIUM |
| Open WebSocket connection | Chrome may block | MEDIUM |
| `window.opener` reference | Opened via `window.open()` with non-null `opener` | LOW |
| JavaScript responses from `fetch()` during page unload | Race condition | LOW |
| ResizeObserver/MutationObserver with active listeners | May cause issues in some versions | LOW |

### Most Common Blocker in Next.js Apps

The #1 bfcache blocker in Next.js apps is the `unload` event listener — often added by analytics scripts (Google Analytics, Microsoft Clarity), session tracking, or custom navigation code.

---

## 4. Codebase bfcache Blocker Check

### 4.1 Cache-Control Headers

**To verify during implementation:** Search for `Cache-Control: no-store` or `Cache-Control: no-cache` in all route handlers and layout files.

```bash
grep -rn "Cache-Control\|no-store\|no-cache" src/app/ --include="*.ts" --include="*.tsx"
```

**Expected:** The Next.js App Router does not set `no-store` by default for page routes. API routes with `force-dynamic` also do not set `no-store` unless explicitly configured. However, verify:
- `src/app/api/share/[token]/*` routes — may have explicit cache headers
- `src/app/share/[token]/page.tsx` — has `force-dynamic` but should still be bfcache-compatible as `force-dynamic` is a rendering directive, not a cache directive

### 4.2 Unload/Beforeunload Event Listeners

**To verify during implementation:** Search for any custom `unload` or `beforeunload` handlers.

```bash
grep -rn "unload\|beforeunload" src/ --include="*.ts" --include="*.tsx"
```

**Expected found:**
- Microsoft Clarity script in `src/components/landing/ClarityScript.tsx` — may register `beforeunload` for session tracking. THIS IS THE HIGHEST-RISK BFACHE BLOCKER.

### 4.3 WebSocket Connections

**To verify during implementation:** Check for any WebSocket or SSE connections that would block bfcache.

```bash
grep -rn "WebSocket\|EventSource\|new WebSocket" src/ --include="*.ts" --include="*.tsx"
```

**Expected:** No WebSocket connections — this app does not use real-time features that require persistent connections.

### 4.4 IndexedDB Usage

**To verify during implementation:** Check if any library or app code opens IndexedDB connections (Safari blocks if opened during page lifecycle).

```bash
grep -rn "indexedDB\|openDB\|idb" src/ --include="*.ts" --include="*.tsx"
```

---

## 5. Route-by-Route bfcache Assessment

### 5.1 Workshop Routes (All Protected)

| Route | Cache-Control | Unload Handler | WebSocket | IndexedDB | bfcache Likely? | Notes |
|-------|--------------|----------------|-----------|-----------|-----------------|-------|
| `/workshop` | Default (revalidate) | None expected | None | None | **Likely** | Standard Server Component |
| `/workshop/projects` | Default | None | None | None | **Likely** | Standard Server Component |
| `/workshop/projects/[id]` | Default | None | None | None | **Likely** | Layout + page pattern |
| `/workshop/projects/[id]/estimates` | Default | None | None | None | **Likely** | Client component tree |
| `/workshop/projects/[id]/estimates/[nodeId]` | Default | None | None | None | **Likely** | Heaviest page |
| `/workshop/projects/[id]/charts` | Default | None | None | None | **Likely** | Chart components |
| `/workshop/library` | Default | None | None | None | **Likely** | Standard Server Component |
| `/workshop/templates` | Default | None | None | None | **Likely** | Standard Server Component |
| `/workshop/settings/*` | Default | None | None | None | **Likely** | Lightweight forms |
| `/workshop/onboarding` | Default | None | None | None | **Likely** | Standard Server Component |

### 5.2 Landing & Auth Routes

| Route | bfcache Likely? | Notes |
|-------|-----------------|-------|
| `/` | **Likely** | cookies() in Server Component doesn't block bfcache |
| `/features`, `/about`, etc. | **Likely** | Static Server Components |
| `/login` | **Likely** | searchParams doesn't block bfcache |
| `/share/[token]` | **Likely** | force-dynamic doesn't block bfcache |

### 5.3 bfcache Behavior With Auth

**Important:** bfcache preserves auth state. When a user navigates back to a workshop page from bfcache:
1. The React state is restored as-is (including auth context)
2. The `pageshow` event fires with `persisted=true`
3. Server Components do NOT re-run (unless explicitly invalidated)
4. Client-side React Query cache is preserved

**Implication:** Auth tokens that expire while the page is in bfcache will cause stale auth state. Mitigation:
```typescript
// In WorkshopPageShell or providers.tsx — handle bfcache restore
useEffect(() => {
  const handlePageShow = (event: PageTransitionEvent) => {
    if (event.persisted) {
      // Page restored from bfcache — refresh auth token
      queryClient.invalidateQueries({ queryKey: ["auth"] }); // If auth is in React Query
    }
  };
  window.addEventListener("pageshow", handlePageShow);
  return () => window.removeEventListener("pageshow", handlePageShow);
}, [queryClient]);
```

---

## 6. Implementation Checklist

### Phase 1: Audit & Fix Blockers

- [ ] **Search for `unload`/`beforeunload` handlers** — especially in ClarityScript.tsx and any analytics scripts
- [ ] **Search for `Cache-Control: no-store`** — in route handlers, layouts, API routes
- [ ] **Search for WebSocket/SSE connections** — block bfcache if found
- [ ] **Search for IndexedDB usage** — Safari-specific blocker
- [ ] If any blockers found, fix or isolate them:
  - Replace `unload` with `visibilitychange` where possible
  - Remove or conditionalize `Cache-Control: no-store` for page routes
  - Close IndexedDB connections on page hide

### Phase 2: Add bfcache Handle (NavigationListener)

```typescript
// In src/components/navigation-listener.tsx or a new bfcache-handler.ts
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

export function BfcacheHandler() {
  const pathname = usePathname();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        console.log("[bfcache] Restored from cache:", pathname);

        // Re-verify auth — token may have expired while in bfcache
        // (If auth is in React Query, invalidate the key)
        // queryClient.invalidateQueries({ queryKey: ["auth"] });

        // Log bfcache hit for monitoring
        if (process.env.NODE_ENV === "development") {
          console.log(`[bfcache] Hit rate monitoring: ${pathname}`);
        }
        
        // Performance mark for monitoring
        performance.mark("bfcache-restore");
        performance.measure("bfcache-restore-duration", {
          start: "bfcache-restore",
          end: performance.now(),
        });
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [pathname, queryClient]);

  return null;
}
```

### Phase 3: Verify bfcache in Chrome DevTools

1. Open Chrome DevTools → Application → Back-forward Cache
2. Navigate to a workshop page (e.g., `/workshop/projects`)
3. Navigate away (click "Library" in sidebar)
4. Press Back button
5. Verify:
   - Page restores in < 50ms (watch Network tab)
   - DevTools shows "Restored from back-forward cache"
   - No loading overlay
   - Page is fully functional (no stale data, no broken state)
   - React state is preserved (scroll position, form inputs, sidebar state)

### Phase 4: Test All Routes For bfcache

Run automated test:

```typescript
// In e2e tests
test("workshop pages are bfcache-compatible", async ({ page }) => {
  await page.goto("/workshop/projects");
  await page.waitForLoadState("networkidle");
  
  // Navigate away
  await page.click('[href="/workshop/library"]');
  await page.waitForLoadState("networkidle");
  
  // Navigate back
  await page.goBack();
  
  // Verify bfcache restore
  const restored = await page.evaluate(() => {
    return new Promise((resolve) => {
      window.addEventListener("pageshow", (event) => {
        resolve(event.persisted);
      });
    });
  });
  expect(restored).toBe(true);
  
  // Verify no network requests for the restored page
  const requests = page.waitForRequest("**"); // Won't fire if from bfcache
  // If the page was truly from bfcache, no navigation requests occur
});
```

---

## 7. Testing bfcache

### Manual Testing Steps

1. Open Chrome DevTools → Application → Back-forward Cache
2. Navigate through the workshop: `/workshop` → Projects → Project Detail → Estimates
3. Press **Back** repeatedly
4. At each step, check DevTools:
   - **Application → Back-forward Cache → "Restored from"** — shows which pages were cached
   - **Console** — `pageshow` event with `persisted=true`
   - **Network tab** — ZERO requests for bfcache-restored pages
5. Test with:
   - No throttling
   - Fast 3G throttling (bfcache saves even more on slow connections)
   - Multiple rapid back/forward clicks

### What to Verify

- [ ] Page restores instantly (< 50ms)
- [ ] Scroll position preserved
- [ ] Form inputs preserved
- [ ] Sidebar state preserved
- [ ] Dropdown menus preserved
- [ ] React Query cache preserved
- [ ] Auth state still valid (or gracefully refreshes)
- [ ] No broken UI after restore
- [ ] `pageshow.persisted` is `true`
- [ ] No network requests on restore

### Cross-Browser Notes

| Browser | bfcache Support | Notes |
|---------|----------------|-------|
| Chrome 96+ | Full | Best support, DevTools integration |
| Firefox | Full | Supported since Firefox 109 |
| Safari 15+ | Full | More sensitive to IndexedDB/open connections |
| Edge 96+ | Full | Chromium-based, same as Chrome |

---

## 8. Fallback: Non-bfcache Routes

If a route cannot be made bfcache-compatible (e.g., analytics scripts block it), the loading overlay still provides fallback:

| If bfcache blocked by... | Fallback | Impact |
|-------------------------|----------|--------|
| Analytics script `unload` handler | Remove handler or make conditional | None — analytics still works without unload |
| `Cache-Control: no-store` | Remove header for page routes | Medium — may affect stale content |
| WebSocket connection | Close on page hide | Medium — reconnection on restore |
| Existing `<RouteLoadingOverlay>` | Overlay shows on back navigation | User sees overlay for 250ms+ |

**Priority:** Fix ALL bfcache blockers. Every blocker is fixable. No route should voluntarily opt out of bfcache.

---

## 9. Monitoring bfcache Rates

### 9.1 Client-Side Monitoring

Add bfcache hit-rate tracking to the production monitoring:

```typescript
// In BfcacheHandler.tsx
useEffect(() => {
  const handlePageShow = (event: PageTransitionEvent) => {
    if (event.persisted) {
      // Track bfcache hit rate
      postNavigationEvent("bfcache", {
        pathname,
        timeSinceNavigationStart: performance.now(),
      });
    }
  };
  window.addEventListener("pageshow", handlePageShow);
  return () => window.removeEventListener("pageshow", handlePageShow);
}, [pathname]);
```

### 9.2 Metrics Dashboard

| Metric | How to Measure | Target |
|--------|---------------|--------|
| bfcache hit rate | `pageshow.persisted === true` / total navigations | > 80% |
| bfcache restore time | `pageshow` timestamp - last navigation start | < 50ms |
| bfcache-blocked routes | Routes where `persisted === false` on back nav | 0 |
| overlay-on-back rate | Overlay shown on back/forward navigation | < 1% |

### 9.3 CI/CD Check

Add a Playwright test that verifies bfcache compatibility for key routes:

```typescript
test("bfcache: workshop routes restore instantly on back", async ({ page }) => {
  // Visit route, navigate away, navigate back, verify persisted
  for (const route of ["/workshop", "/workshop/projects", "/workshop/library"]) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    await page.goto("/workshop/settings");
    await page.waitForLoadState("networkidle");
    await page.goBack();
    const persisted = await page.evaluate(
      () => new Promise((r) => window.addEventListener("pageshow", (e) => r(e.persisted)))
    );
    expect(persisted).toBe(true);
  }
});
```

---

**Next:** Integrate with `12-overlay-fallback-strategy.md` — bfcache eliminates the overlay for back/forward navigation, which is one of the four main defense layers. See `30-dynamic-rendering-analysis.md` for server rendering optimization context.
