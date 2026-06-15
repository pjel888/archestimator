# 34 — Implementation Handoff: Loading Overlay & Route Transition Gaps

**Status:** Draft — implemented by Sisyphus (2026-05-29), pending review before merging
**Purpose:** Bridge the gap between the plan documents (docs 01–33) and the actual source-code changes. Any AI picking up this work must read this document first to understand what exists, what doesn't, and why certain decisions were made.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Changes Inventory](#2-changes-inventory)
3. [Design Decisions](#3-design-decisions)
4. [Known Issues & Edge Cases](#4-known-issues--edge-cases)
5. [Implementation Gaps Still Open](#5-implementation-gaps-still-open)
6. [Verification Checklist](#6-verification-checklist)
7. [Branch & Merge Strategy](#7-branch--merge-strategy)

---

## 1. Executive Summary

A comprehensive audit of doc 33 (`33-loading-sequence-progressive-enhancement.md`) against the actual codebase revealed 3 incorrect claims and 4 implementation gaps. The document has been corrected to match reality. Source-code changes were made to fill the gaps.

### What Was Corrected (Doc-Only)

| Doc 33 Claim | Problem | Fix Applied |
|---|---|---|
| **Must 1: 150ms show delay** | ADR-003 explicitly rejects a show delay. The store fires `show()` immediately. | Replaced with "Overlay Shows Immediately (No Delay)" with justification cross-referencing ADR-003. |
| **API naming**: `startNavigation()` / `endNavigation()` | Actual store uses `show()` / `hide()`. | All timeline descriptions and component tables updated. |
| **NavigationListener** "fires route-change-complete event" | NavigationListener calls `show()` / `hide()` on the store — no custom events. | Description corrected. |

### What Was Implemented (Source Code)

| Component | Status | Location |
|---|---|---|
| **BfcacheHandler** | New | `src/components/bfcache-handler.tsx` |
| **PerformanceMonitor** | New | `src/components/performance-monitor.tsx` |
| **usePrefetchOnHover** | New | `src/hooks/use-prefetch-on-hover.ts` |
| **Skeleton** | New | `src/components/ui/skeleton.tsx` |
| **6× loading.tsx** | New | `src/app/workshop/**/loading.tsx` |
| **Store update** | Modified | `src/stores/navigation-ui-store.ts` |
| **Providers** | Modified | `src/app/providers.tsx` |

---

## 2. Changes Inventory

### 2.1 Store — `src/stores/navigation-ui-store.ts`

**Before the audit**, the store had:
- `show()` — fires immediately on click, sets `isNavigating=true`, starts 250ms minimum display timer + 10s safety timer
- `hide()` — clears safety timer, enforces minimum display time before hiding

**After implementation:**
- Added `bfcacheRestore()` action

```typescript
bfcacheRestore: () => {
  clearTimers();
  set({ isNavigating: false, startTime: 0, targetHref: null });
},
```

What it does: Immediately hides the overlay (no minimum display timer) and resets state. Called by BfcacheHandler when a page is restored from bfcache (`pageshow.persisted === true`).

**Important:** There is NO `suppressOverlay` flag. An earlier version had one, but it was removed because it caused a race condition: the flag persisted across navigation boundaries, suppressing the overlay on the *first explicit navigation after a bfcache restore*. See §4.1 for details.

### 2.2 BfcacheHandler — `src/components/bfcache-handler.tsx` (NEW)

Purpose: Suppress the loading overlay flash when the user navigates back/forward and the page is served from the browser's back-forward cache (bfcache).

```tsx
export function BfcacheHandler() {
  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        useNavigationUiStore.getState().bfcacheRestore();
      }
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);
  return null;
}
```

**Wiring:** Added to `src/app/providers.tsx` immediately before `NavigationListener`.

### 2.3 PerformanceMonitor — `src/components/performance-monitor.tsx` (NEW)

Purpose: Log route-transition timing to the browser console during development. Uses Zustand's `.subscribe()` API (not React selector hooks) to avoid causing re-renders.

```tsx
export function PerformanceMonitor() {
  const lastHref = useRef<string | null>(null);
  useEffect(() => {
    const unsub = useNavigationUiStore.subscribe((state, prevState) => {
      if (prevState.isNavigating && !state.isNavigating && lastHref.current) {
        const elapsed = Date.now() - state.startTime;
        if (process.env.NODE_ENV === "development") {
          const route = lastHref.current || "(unknown)";
          const icon = elapsed < 100 ? "⚡" : elapsed < 250 ? "✓" : elapsed < 500 ? "🔶" : "🐌";
          console.log(`[Performance] ${icon} ${route} → ${elapsed}ms`);
        }
        lastHref.current = null;
      }
      if (!prevState.isNavigating && state.isNavigating) {
        lastHref.current = state.targetHref;
      }
    });
    return unsub;
  }, []);
  return null;
}
```

**Wiring:** Added to `src/app/providers.tsx` between `BfcacheHandler` and `NavigationListener`.

### 2.4 usePrefetchOnHover — `src/hooks/use-prefetch-on-hover.ts` (NEW)

Purpose: Prefetch React Query data when the user hovers over a navigation link. Next.js `<Link>` already handles RSC payload prefetch; this hook fills the gap for TanStack Query data.

```typescript
type PrefetchRouteConfig = {
  pathname: string;
  prefixMatch?: boolean;
  queryKeys: ReadonlyArray<readonly unknown[]>;
};

export function usePrefetchOnHover(configs: PrefetchRouteConfig[]) {
  const queryClient = useQueryClient();
  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const prefetch = useCallback((href: string) => {
    const matched = configs.find((cfg) => {
      if (cfg.prefixMatch) return href.startsWith(cfg.pathname);
      return href === cfg.pathname;
    });
    if (!matched) return;

    const key = href;
    const existing = debounceTimers.current.get(key);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      debounceTimers.current.delete(key);
      for (const queryKey of matched.queryKeys) {
        queryClient.prefetchQuery({ queryKey });
      }
    }, 150);
    debounceTimers.current.set(key, timer);
  }, [configs, queryClient]);

  return prefetch;
}
```

**NOT wired into any component.** Consumers must import the hook and provide route-to-query-key mappings. See §5.2.

### 2.5 Skeleton — `src/components/ui/skeleton.tsx` (NEW)

Purpose: Reusable base component for loading placeholders. Used by all loading.tsx files.

```tsx
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-xs bg-muted/40", "motion-reduce:animate-none", className)}
      {...props}
    />
  );
}
```

### 2.6 loading.tsx Files — 6 Files (NEW)

| File | Visual Pattern | Items | Notes |
|---|---|---|---|
| `src/app/workshop/loading.tsx` | Bento grid: 3 destination card skeletons (md:grid-cols-3) + favorites sidebar | 3 + 4 | Matches WorkshopHomebaseClient layout |
| `src/app/workshop/projects/loading.tsx` | Search/toolbar bars + project card grid (sm:cols-2 lg:cols-3 xl:cols-4 2xl:cols-5) | 6 | Matches ProjectsPageClient large view |
| `src/app/workshop/library/loading.tsx` | Search bar + table rows with icon/title/price columns | 6 | Matches LibraryPageClient list |
| `src/app/workshop/templates/loading.tsx` | Search bar + card grid (md:cols-2 lg:cols-3) with title/body lines | 4 | Matches TemplateLibraryManager |
| `src/app/workshop/settings/loading.tsx` | 3 form section panels with field skeletons + save button | 3 sections | Settings pages redirect to profile |
| `src/app/workshop/onboarding/loading.tsx` | Centered single card with title, fields, and CTA | 1 card | Onboarding page redirects |

All loading.tsx files are async server components wrapping `WorkshopPageShell`. See §4.3 for a caveat about this pattern.

### 2.7 Providers — `src/app/providers.tsx` (Modified)

```tsx
<BfcacheHandler />
<PerformanceMonitor />
<NavigationListener />
```

Both `BfcacheHandler` and `PerformanceMonitor` render `null` — they have no visual output.

---

## 3. Design Decisions

### 3.1 No Show Delay (Per ADR-003)

ADR-003 (`09_archive/route-transition-loading-overlay/READ ME.md`) explicitly rejected a show delay. The overlay shows **immediately** on click. A 250ms minimum display timer (`MIN_DISPLAY_MS`) prevents flicker on fast navigations. The overlay uses `pointer-events-none` so it never blocks interaction or content rendering.

This means Scenario A (fast, <150ms navigation) DOES briefly show the overlay. The UX argument: showing a non-blocking overlay for 250ms is better than showing nothing for 150ms (which feels like dead air).

### 3.2 Bfcache: No Suppression Flag

Early design used a `suppressOverlay` boolean flag:
1. `bfcacheRestore()` sets `suppressOverlay = true`
2. `show()` checks the flag — if true, skip showing overlay

**Bug found**: The flag persists across navigation boundaries. Sequence:
1. bfcache restore → `bfcacheRestore()` sets `suppressOverlay = true`
2. User clicks a link → `show()` sees `suppressOverlay = true` → **skips overlay entirely**

**Fix**: Removed the flag entirely. `bfcacheRestore()` now only clears timers and sets `isNavigating = false`. The brief overlay flash (sub-100ms between `popstate → show()` and `pageshow → bfcacheRestore()`) is acceptable because:
- Overlay is `pointer-events-none` (doesn't block content)
- Content restores instantly from bfcache behind the overlay
- Flash is barely perceptible

### 3.3 PerformanceMonitor Uses Store Subscription

Uses Zustand's `.subscribe()` API instead of React selector hooks to avoid re-renders. The component returns `null` and never needs to re-render. Console logging only activates in `NODE_ENV === "development"`.

### 3.4 usePrefetchOnHover Is Generic (Not Wired)

The hook accepts a configuration array (`PrefetchRouteConfig[]`) rather than being hardcoded to specific routes. This is intentional — it allows consumers to define their own route-to-query-key mappings. However, currently **no component imports or uses this hook**. See §5.2.

### 3.5 Loading Skeletons Use WorkshopPageShell

All 6 loading.tsx files wrap their content in `WorkshopPageShell` to match the production page layout. This creates a subtle waterfall: `WorkshopPageShell` is an async server component that awaits `cookies()` and `getCurrentUserContext()`. See §4.3.

---

## 4. Known Issues & Edge Cases

### 4.1 Bfcache Overlay Flash (Acceptable)

**Severity:** Low
**Description:** Between `popstate → show()` and `pageshow → bfcacheRestore()`, the overlay appears for sub-100ms. This is a sub-frame flash on most displays.
**Mitigation:** Overlay is `pointer-events-none` with semi-transparent background. Content is instantly interactive behind it.
**Would Fix If:** A future audit considers this unacceptable, the fix would require intercepting at the Navigation API level (before popstate fires) — but no such API exists in all target browsers.

### 4.2 startTime=0 in bfcacheRestore

**Severity:** None
**Description:** `bfcacheRestore()` sets `startTime = 0`. If `hide()` runs after this, `elapsed = Date.now() - 0 = ~current timestamp`, so `remaining = max(0, 250 - elapsed) = 0`. `hide()` becomes an immediate no-op.
**Why it's safe:** `isNavigating` is already `false` from `bfcacheRestore()`. The `hide()` timer sets `isNavigating = false` again — harmless double-set.

### 4.3 loading.tsx Waterfall with WorkshopPageShell

**Severity:** Medium
**Description:** `WorkshopPageShell` is an async server component that awaits `cookies()` and `getCurrentUserContext()` on every render. Using it in `loading.tsx` means the skeleton placeholder itself waits for these async calls before rendering.
**Current State:** Implemented but suboptimal. The auth cookie resolution is typically fast (< 50ms server-side) but adds latency to the loading skeleton appearance.
**Suggested Fix:** Extract a synchronous version of WorkshopPageShell for loading states only, or inline the shell markup directly in each loading.tsx with static placeholder data.

### 4.4 No aria-hidden on Skeleton Container

**Severity:** Medium
**Description:** The loading.tsx files use `Skeleton` components inside `WorkshopPageShell`'s children. These skeletons do not have `aria-hidden="true"` on their container. Screen readers may announce "Loading" from the overlay's `aria-live` region, but the skeleton shapes themselves could be read as content.
**Fix:** Wrap skeleton content in `<div aria-hidden="true">` in each loading.tsx file.

### 4.5 Prefetch Hook Needs Wiring

**Severity:** Low (incomplete feature)
**Description:** `usePrefetchOnHover` exists but is not used anywhere. See §5.2.

---

## 5. Implementation Gaps Still Open

### 5.1 loading.tsx for Non-Workshop Routes

**Priority:** Low
**Routes missing:** `/`, `/about`, `/features`, `/pricing`, `/contact`, `/privacy`, `/terms`, `/login`, `/auth/callback`, `/invite/[token]`, `/share/[token]`
**Rationale:** These routes are mostly static content or auth redirects. Loading skeleton would rarely show. Not implemented to reduce scope.

### 5.2 usePrefetchOnHover Not Wired

**Priority:** Medium
**Action required:** Wire the hook into navigation components (sidebar, project cards, etc.) with appropriate `PrefetchRouteConfig` mappings.

Suggested implementation in `MainSidebar`:
```tsx
const prefetch = usePrefetchOnHover([
  { pathname: "/workshop/projects", queryKeys: [["projects"]] },
  { pathname: "/workshop/library", queryKeys: [["library"]] },
  { pathname: "/workshop/templates", queryKeys: [["templates"]] },
]);

// In each SidebarNavItemRow:
<Link href={item.href} onMouseEnter={() => prefetch(item.href)}>
```

**Caveat:** Most Archestimator routes don't use React Query for their page-level data — they use Server Components with Supabase calls. React Query is primarily used for estimate-tree data (`useEstimateQuery`, `useEstimateAreaTreeQuery`). The prefetch hook will only be effective for routes that actually use React Query.

### 5.3 BfcacheHandler Not Proved in Tests

**Priority:** Low
**Action required:** Verify bfcache behavior manually in Chrome DevTools:
1. Navigate to page A → page B
2. Press Back
3. Check that `pageshow.persisted === true` in console
4. Verify overlay does not persist beyond sub-100ms flash

### 5.4 PerformanceMonitor — Production Metrics

**Priority:** Low
**Current state:** Dev-mode console logging only. No production monitoring (no data collection, no analytics).
**Future work:** Wire into a real analytics endpoint or browser PerformanceObserver API for production monitoring.

---

## 6. Verification Checklist

Before this work can be considered complete:

- [ ] `bun run type-check` — passes with only pre-existing errors in `next.config.ts`
- [ ] `bun run build` — passes
- [ ] `bun run validate` — passes
- [ ] `bun run test:e2e` — passes (Playwright smoke tests)
- [ ] Manual: Click a sidebar link → overlay appears immediately (no 150ms delay)
- [ ] Manual: Fast navigation (< 250ms) → overlay still shows briefly (250ms min display)
- [ ] Manual: Navigate back (bfcache) → overlay flash is imperceptible
- [ ] Manual: Open browser console → performance logs appear in dev mode
- [ ] Manual: Slow 3G throttle → skeleton appears first, overlay after 250ms
- [ ] Screen reader test: Overlay has `aria-live="polite"`, skeleton has `aria-hidden` (if §4.4 fix is applied)

---

## 7. Branch & Merge Strategy

**Current branch:** The changes were made on whatever branch was active during the audit. Verify with `git status` and `git log`.

**Recommended merge process:**
1. Create a new feature branch from `main`: `git checkout -b feat/loading-overlay-gaps`
2. Cherry-pick or re-apply the changes from the current working state
3. Run the full verification checklist (§6)
4. Create a PR with a summary referencing doc 34
5. Do NOT squash — keep individual commits for each component

**Files not to include in the PR:**
- `.ai/` documentation changes should be in the same branch (they describe the implementation)
- `next.config.ts` changes (pre-existing errors unrelated to this work)
