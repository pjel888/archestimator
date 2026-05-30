# 06 — Strategy ADRs: Architecture Decision Records

> ⚠️ **SUPERSEDED — DO NOT IMPLEMENT.** ADR-006 (150ms overlay show delay + remove min-display) is WRONG — the current code correctly uses immediate show + MIN_DISPLAY_MS=250. ADR-013 (proxy.ts → middleware migration, use getSession()) contains two errors: proxy.ts IS the middleware in Next 16, and getSession() is a security risk. See `ADR_UPDATES.md` for all 14 corrected ADRs. The remaining ADRs (001-005, 007-008, 010-012, 014) are directionally valid but have been refined in the updates.

**Status:** SUPERSEDED  
**Created:** 2026-05-29  
**Superseded by:** `ADR_UPDATES.md`  
**Historical purpose:** (Retained for reference) Document and justify key architecture decisions.

---

## Table of Contents

1. [ADR-001: Prefetch Strategy — Hover vs. Viewport vs. Eager](#adr-001)
2. [ADR-002: Caching Strategy — `staleTime` Increase vs. Per-Query Tuning](#adr-002)
3. [ADR-003: Suspense Strategy — `loading.tsx` vs. Custom Skeletons in Layouts](#adr-003)
4. [ADR-004: Virtualization — `@tanstack/react-virtual` vs. Custom vs. CSS `content-visibility`](#adr-004)
5. [ADR-005: Bundle Strategy — `next/dynamic` vs. Route-Level Splitting vs. Manual Chunks](#adr-005)
6. [ADR-006: Loading Overlay — Keep vs. Remove vs. Degrade](#adr-006)
7. [ADR-007: Server Component Caching — `unstable_cache` vs. `"use cache"` vs. `dynamic = 'force-static'`](#adr-007)
8. [ADR-008: bfcache — Compatibility vs. Custom Scroll Restoration](#adr-008)
9. [ADR-009: Auth Architecture — No Middleware, Data-Layer Enforcement](#adr-009)
10. [ADR-010: React.memo Strategy — Selective vs. Aggressive Memoization](#adr-010)
11. [ADR-011: Font Loading Strategy — Global vs. Route-Specific](#adr-011)
12. [ADR-012: Error Boundary Strategy — Route-Level vs. Component-Level](#adr-012)
13. [ADR-013: Server-Side Optimization — Proxy Migration, N+1 Fixes, Layout Caching](#adr-013)
14. [ADR-014: Three.js and Bundle Optimization — Lazy Loading vs. Removal](#adr-014)

---

## ADR-001: Prefetch Strategy — Hover vs. Viewport vs. Eager {#adr-001}

**Context:** Users navigate primarily through sidebar links and project cards. We need to prefetch route data so navigation feels instant.

### Options Considered

1. **Viewport prefetch (default `<Link>` behavior in production)**
   - *Pros:* Zero code changes. Next.js handles it automatically.
   - *Cons:* Prefetches ALL visible links, including those the user may never click. Wastes bandwidth and Supabase resources. Does NOT prefetch React Query data — only the RSC payload.
   - *Verdict:* Rejected. Too wasteful for a data-heavy app where each prefetch triggers Supabase queries.

2. **Eager prefetch (prefetch everything on page load)**
   - *Pros:* Every link is instant.
   - *Cons:* Explodes data usage. On `/workshop`, would prefetch Projects, Library, Templates, Settings, AND all project cards. Unacceptable.
   - *Verdict:* Rejected.

3. **Hover prefetch (prefetch on `mouseenter` + 200ms debounce)**
   - *Pros:* Prefetches only what the user is likely to click. 200ms debounce prevents accidental prefetches. Combines RSC payload prefetch + React Query data prefetch. Most bang for the buck.
   - *Cons:* Requires custom hook and wiring into navigation components (sidebar, cards).
   - *Verdict:* ✅ **ACCEPTED.**

4. **Touch prefetch (prefetch on `touchstart` for mobile)**
   - *Pros:* Works on mobile where hover doesn't exist.
   - *Cons:* `touchstart` fires immediately on touch, even for scrolling. Requires additional gesture detection.
   - *Verdict:* ✅ **ACCEPTED as complement to hover.** Use `pointerenter` for unified hover/touch.

### Decision

**Use hover-based prefetch** with a 200ms debounce. RSC payload prefetch via `<Link prefetch={false}>` + programmatic `router.prefetch()` on hover. React Query data prefetch via `queryClient.prefetchQuery()` in the same hover handler.

**Implementation pattern:**
```typescript
// use-prefetch-on-hover.ts
function usePrefetchOnHover(href: string, prefetchQuery?: () => Promise<void>) {
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const handlePointerEnter = useDebouncedCallback(() => {
    router.prefetch(href);
    prefetchQuery?.();
  }, 200);
  
  return { onPointerEnter: handlePointerEnter };
}
```

---

## ADR-002: Caching Strategy — `staleTime` Increase vs. Per-Query Tuning {#adr-002}

**Context:** Current `staleTime: 30_000` means data is re-fetched after 30 seconds. For navigation patterns, this is too aggressive — users commonly spend 30+ seconds on another page.

### Options Considered

1. **Global `staleTime: 5 * 60_000` (5 minutes)**
   - *Pros:* One-line change. All queries benefit. Revisits within 5 minutes are instant.
   - *Cons:* Auth/session queries should NOT have long `staleTime`. Must override per-query.
   - *Verdict:* ✅ **ACCEPTED as default**, with per-query overrides for auth.

2. **Per-query `staleTime` tuning**
   - *Pros:* Fine-grained control. Lists can be stale longer than detail views.
   - *Cons:* Requires auditing every query. Easy to miss one.
   - *Verdict:* ✅ **ACCEPTED as complement.** Use global default + per-query overrides where needed.

3. **`staleTime: Infinity` + manual invalidation**
   - *Pros:* Never re-fetches unless explicitly invalidated. Maximum cache hits.
   - *Cons:* Risk of showing very stale data. Requires disciplined invalidation after every mutation.
   - *Verdict:* Rejected. Too risky for a rapidly-evolving product.

### Decision

1. Set global `staleTime` to `5 * 60_000` (5 minutes) in `providers.tsx`.
2. Override auth/session queries with `staleTime: Infinity` (session doesn't change without explicit action).
3. Override realtime-dependent queries with `staleTime: 30_000` (collaboration data).
4. Document the `staleTime` decision in code comments so future queries follow the pattern.

---

## ADR-003: Suspense Strategy — `loading.tsx` vs. Custom Skeletons in Layouts {#adr-003}

**Context:** The app currently blocks entire routes until all data resolves. We need non-blocking navigation with progressive rendering.

**Verified layout structure:** There are only 2 layouts in the entire app: root layout and `projects/[projectId]/layout.tsx`. There is NO `/workshop/layout.tsx`. Every workshop page independently renders `<WorkshopPageShell>` (111 lines, async server component). `WorkshopPageShell` reads `cookies()` for side-panel widths and calls `getCurrentUserContext()` — it will always render dynamically. Suspense boundaries must wrap content INSIDE the shell, not the shell itself.

### Options Considered

1. **`loading.tsx` in every route segment**
   - *Pros:* Native Next.js pattern. Zero wiring. Automatically wraps `page.tsx` in Suspense.
   - *Cons:* `loading.tsx` replaces the ENTIRE `children` slot, including the layout shell (header, sidebar, footer). This means the shell disappears and reappears on navigation.
   - *Verdict:* ❌ Rejected for workshop routes with persistent shell (sidebar/header). ✅ Accepted for content-only routes.

2. **Custom `<Suspense>` boundaries inside layouts**
   - *Pros:* Layout shell (sidebar, header) stays visible. Only the content area shows a skeleton. More granular control.
   - *Cons:* Requires restructuring layouts to separate shell from content. More code.
   - *Verdict:* ✅ **ACCEPTED** for the one workshop route that has a shared layout (`projects/[projectId]/*`).

3. **Custom `<Suspense>` boundaries inside `page.tsx` (for routes without shared layout)**
   - *Pros:* Works for the majority of workshop routes that don't have a nested layout. Each page wraps its data-fetching content in Suspense while `WorkshopPageShell` renders immediately.
   - *Cons:* Must add Suspense to each page individually. More files to touch.
   - *Verdict:* ✅ **ACCEPTED** as the primary pattern for workshop routes without layouts.

4. **Hybrid: `loading.tsx` for simple routes + custom Suspense for workshop**
   - *Pros:* Best of both worlds. Simple routes get the easy path. Complex routes get fine-grained control.
   - *Cons:* Two patterns to maintain.
   - *Verdict:* ✅ **ACCEPTED.**

### Decision

**For workshop routes with a shared layout** (only `projects/[projectId]/*`): Use custom `<Suspense>` boundaries in the layout. The layout shell renders immediately. The content area shows a skeleton while data resolves.

**For workshop routes without a shared layout** (all other `/workshop/*` routes): Add Suspense boundaries directly in `page.tsx`. Wrap the data-fetching content in `<Suspense fallback={<Skeleton />}>` while the `WorkshopPageShell` renders immediately.

**For simple routes** (landing, auth, settings): Use `loading.tsx` files for automatic Suspense wrapping.

**Skeleton design principle:** Skeletons should match the final layout dimensions to minimize CLS. Use `animate-pulse` with neutral background colors (`bg-muted`). Never use spinner-only skeletons (they don't prevent layout shift).

---

## ADR-004: Virtualization — `@tanstack/react-virtual` vs. Custom vs. CSS `content-visibility` {#adr-004}

**Context:** Large lists (50+ projects, 200+ row items) render all DOM nodes, causing slow initial render and scroll jank.

### Options Considered

1. **`@tanstack/react-virtual`**
   - *Pros:* Same ecosystem as TanStack Table. Well-maintained. Supports dynamic row heights. Handles scroll restoration. Works with React 19.
   - *Cons:* Additional dependency (~15KB). Learning curve for integration with existing TanStack Table setup.
   - *Verdict:* ✅ **ACCEPTED** for estimate table and project list.

2. **CSS `content-visibility: auto`**
   - *Pros:* Zero JavaScript. Browser-native. Automatically skips rendering off-screen content.
   - *Cons:* No scroll position tracking. Row heights must be fixed. Doesn't reduce DOM node count (just rendering cost). Not sufficient for 1000+ items.
   - *Verdict:* ✅ **ACCEPTED as quick win** for simple lists. Not sufficient for the estimate table.

3. **Custom virtualization**
   - *Pros:* Full control.
   - *Cons:* Reinventing the wheel. Bug-prone (scroll restoration, dynamic heights, accessibility).
   - *Verdict:* Rejected. `@tanstack/react-virtual` is mature and maintained.

4. **React Complex Tree's built-in virtualization**
   - *Pros:* No additional library for tree nodes.
   - *Cons:* React Complex Tree renders ALL nodes by default. It does not have built-in virtualization.
   - *Verdict:* Not an option — RCT doesn't support virtualization.

### Decision

1. **Estimate table (row items):** Use `@tanstack/react-virtual` integrated with TanStack Table.
2. **Project list (cards):** Use `@tanstack/react-virtual` with a grid layout.
3. **Library component list:** Use `@tanstack/react-virtual`.
4. **Estimate tree (React Complex Tree):** Defer virtualization. RCT doesn't support it natively. Consider pagination or "load more" for trees with 50+ nodes.

---

## ADR-005: Bundle Strategy — `next/dynamic` vs. Route-Level Splitting vs. Manual Chunks {#adr-005}

**Context:** Heavy components (modals, chart libraries, complex forms) are eagerly loaded in every route that imports them, bloating initial JS bundles.

### Options Considered

1. **`next/dynamic(() => import(...))` per component**
   - *Pros:* Fine-grained control. Each heavy component gets its own chunk. Loading fallback via `loading:` prop. Works with Server Components.
   - *Cons:* Adds latency when the component is first needed (user sees skeleton while chunk loads).
   - *Verdict:* ✅ **ACCEPTED** for modals, chart components, and forms.

2. **Route-level code splitting (automatic by Next.js)**
   - *Pros:* Already happens by default. Each `page.tsx` creates its own chunk.
   - *Cons:* Doesn't help when a page imports heavy components — they're bundled with the page.
   - *Verdict:* Already in use. Not sufficient alone.

3. **Manual `webpack`/`turbopack` chunk splitting**
   - *Pros:* Maximum control.
   - *Cons:* Brittle. Breaks on Next.js upgrades. Over-engineering.
   - *Verdict:* Rejected. Next.js's automatic splitting + `dynamic()` is sufficient.

### Decision

Apply `next/dynamic` to:
1. **Modals:** `NewProjectModal`, `ProjectDetailsModal`, `AddComponentModal` — these are hidden until user interaction.
2. **Chart components:** `ProjectCostDonutChart`, `ProjectCostBubbleChart` — D3 is heavy and only needed on the charts route.
3. **Heavy landing sections:** Below-fold sections on `/` — lazy-load when they enter the viewport.

**⚠️ VERIFIED (2026-05-29):** All 5 code-splitting targets (`EstimateSheetContent`, `EstimateSheetTree`, `AddComponentModal`, `LibraryFolderTree`, `ComponentLibraryManager`) use NAMED exports (`export function`). The correct `next/dynamic` pattern is:

```typescript
// CORRECT — named exports require .then():
const AddComponentModal = dynamic(
  () => import("@/components/workshop/component-library-manager/AddComponentModal").then(mod => mod.AddComponentModal),
  { loading: () => <ModalSkeleton /> }
);
```

Using the default-import pattern (`() => import("...")`) will fail at build time. See `14-code-splitting-named-exports.md` for full details.

---

## ADR-006: Loading Overlay — Keep vs. Remove vs. Degrade {#adr-006}

**Context:** The route transition loading overlay is already implemented and active. This plan aims to make it rarely visible. What should happen to it?

### Options Considered

1. **Remove the overlay entirely**
   - *Pros:* Forces us to make navigation truly instant.
   - *Cons:* If any route is slow (network issues, cold start), users get NO feedback. Reckless.
   - *Verdict:* Rejected.

2. **Keep the overlay as-is**
   - *Pros:* No changes needed. Safety net preserved.
   - *Cons:* If we succeed in making navigation instant, the overlay's 250ms minimum display timer may cause a brief flash on some transitions.
   - *Verdict:* ✅ **ACCEPTED with delay modification.**

3. **Degrade the overlay to a subtle top-bar progress indicator**
   - *Pros:* Less intrusive than full-screen scrim.
   - *Cons:* Users might not notice it. Defeats the purpose of providing clear loading feedback.
   - *Verdict:* Rejected for v1. Can be revisited.

### Decision

**Keep the overlay, but add a show delay of 150ms.** This means:
- Navigations that commit in < 150ms: no overlay shown (instant feel).
- Navigations that take 150–400ms: overlay appears briefly (safety net).
- Navigations that take > 400ms: overlay + potential skeleton screen.

**Implementation:** In `navigation-ui-store.ts`, change `show()` to set a timer:
```typescript
const SHOW_DELAY_MS = 150;

show: (targetHref = null) => {
  clearTimers();
  showTimer = setTimeout(() => {
    set({ isNavigating: true, startTime: Date.now(), targetHref });
    safetyTimer = setTimeout(/* 10s safety */);
  }, SHOW_DELAY_MS);
}
```

The minimum display timer (250ms) is removed — if navigation completes, hide immediately. This prevents the "flash" on fast transitions.

---

## ADR-007: Server Component Caching — `unstable_cache` vs. `"use cache"` vs. `dynamic = 'force-static'` {#adr-007}

**Context:** Server Components re-fetch Supabase data on every render. Caching could dramatically improve revisit speed.

### Options Considered

1. **`"use cache"` directive (Next.js 16 / React 19)**
   - *Pros:* Built into React. Automatic cache keying. Can cache entire components or functions. `cacheTag`/`cacheLife` for invalidation.
   - *Cons:* Next.js 16.2.6 may not fully support it yet. Documentation is sparse. Risk of instability.
   - *Verdict:* ❌ Deferred. Too new. Revisit after Next.js 16 stabilizes.

2. **`unstable_cache` from `next/cache`**
   - *Pros:* Proven in Next.js 14–15. Works with async functions. Known behavior.
   - *Cons:* `unstable_` prefix suggests API may change. Requires manual cache key construction.
   - *Verdict:* ⚠️ Conditional. Use only for data that is truly cacheable and user-scoped.

3. **`dynamic = 'force-static'` + ISR**
   - *Pros:* Full page caching. Rebuild on interval.
   - *Cons:* Forces static generation, which conflicts with auth-protected dynamic routes. Not suitable for per-user workshop data.
   - *Verdict:* ❌ Rejected for workshop routes. ✅ Accepted for landing pages.

4. **React `cache()` for per-request deduplication**
   - *Pros:* Prevents duplicate Supabase calls within the same request. Zero configuration.
   - *Cons:* Only deduplicates within a single render. Doesn't persist across navigations.
   - *Verdict:* ✅ **ACCEPTED as immediate win.** Wrap repository functions in `cache()`.

### Decision

**Phase 1:** Use React `cache()` to deduplicate repository calls within a single request. This is zero-risk and immediately reduces redundant Supabase queries when multiple components in the same route fetch the same data.

**Phase 2:** Evaluate `unstable_cache` for user-scoped caching of project list, estimate list, and library data. Cache keys must include the authenticated user ID.

**Phase 3 (future):** Adopt `"use cache"` when Next.js 16 stabilizes the API.

---

## ADR-008: bfcache — Compatibility vs. Custom Scroll Restoration {#adr-008}

**Context:** Back/forward navigation currently re-fetches and re-renders every page. The browser's bfcache (Back-Forward Cache) stores the full page state in memory and restores it instantly.

**Codebase audit result (verified):** **Zero bfcache blockers found.** No `beforeunload` or `unload` event listeners anywhere in the codebase. No `Cache-Control: no-store` headers on workshop pages. The codebase is already bfcache-compatible from a blocker perspective.

### Options Considered

1. **Make all pages bfcache-compatible**
   - *Pros:* Instant back/forward. Browser-native. Zero JS needed for restoration. Preserves scroll position, form state, focus.
   - *Cons:* Requires auditing and removing all bfcache blockers (`unload` handlers, `Cache-Control: no-store`). May conflict with the loading overlay.
   - *Verdict:* ✅ **ACCEPTED as target state.** Audit shows zero blockers — this is lower effort than originally estimated.

2. **Custom scroll restoration**
   - *Pros:* Full control.
   - *Cons:* Complex. Doesn't restore form state, focus, or JS state. More code to maintain.
   - *Verdict:* Rejected. bfcache is superior and built-in.

3. **Hybrid: bfcache where possible, custom where not**
   - *Pros:* Pragmatic.
   - *Cons:* Inconsistent UX.
   - *Verdict:* ✅ **ACCEPTED as fallback.**

### Decision

1. **bfcache audit complete:** Zero blockers found. No `beforeunload`/`unload` listeners. No `Cache-Control: no-store` on workshop pages.
2. **Add `pageshow` handler** in `NavigationListener` to suppress the overlay on bfcache restore (`event.persisted === true`).
3. **Add `pagehide` handler** in `RouteLoadingOverlay` for portal cleanup before bfcache snapshot.
4. **Verify bfcache** using Chrome DevTools → Application → Back/forward cache → "Test back/forward cache".
5. **If bfcache can't be achieved** (e.g., due to Next.js or Supabase constraints), implement manual scroll position save/restore as fallback.

**NavigationListener modification:**
- Add `pageshow` event listener (fires on bfcache restore).
- On `pageshow` with `event.persisted === true`: the page was restored from bfcache. Do NOT show the loading overlay. The page is already fully rendered. Call `hide()` to ensure overlay is dismissed.

---

---

## ADR-009: Auth Architecture — No Middleware, Data-Layer Enforcement {#adr-009}

**Context:** The codebase enforces authentication at the data-fetching layer, not via Next.js middleware. Every workshop page calls repository functions that check auth via `requireCurrentUserContext()`.

**Status:** Architectural constraint (not a decision to change).

### Current State

- No `src/middleware.ts` file exists
- Auth is enforced in repository functions via `requireCurrentUserContext()`
- `WorkshopPageShell` reads `cookies()` for side-panel width, forcing dynamic rendering
- All workshop pages are dynamically rendered (no static generation possible)

### Implications

1. **Performance:** Every workshop page fetch triggers a Supabase auth check (~100-200ms latency)
2. **Caching:** Cannot use `generateStaticParams` or static generation for workshop routes
3. **Streaming:** Suspense boundaries still work, but the page shell itself is always server-rendered

### Decision

**Accept as architectural constraint.** Do not migrate to middleware in this performance plan. The auth architecture is intentional and provides fine-grained control. Future optimization may consider middleware migration separately, but it's out of scope for route transition performance.

**Mitigation:** Use `unstable_cache` for project layout queries to reduce redundant auth checks on sub-navigation (see ADR-013).

---

## ADR-010: React.memo Strategy — Selective vs. Aggressive Memoization {#adr-010}

**Context:** Deep audit revealed 245+ `useMemo`/`useCallback` usages but zero `React.memo` wrappers. This causes unnecessary re-renders in list/tree components, especially when parent state changes.

### Options Considered

1. **Aggressive memoization (wrap all components)**
   - *Pros:* Maximum re-render reduction. No need to analyze which components benefit.
   - *Cons:* Adds complexity. May memoize components that don't need it. Harder to debug. Memory overhead.
   - *Verdict:* ❌ Rejected. Over-engineering.

2. **Selective memoization (high-impact targets only)**
   - *Pros:* Focused effort. Targets components with 10+ instances that re-render unnecessarily. Easier to measure impact.
   - *Cons:* Requires profiling to identify targets. May miss some optimization opportunities.
   - *Verdict:* ✅ **ACCEPTED.**

3. **No memoization (rely on React's default behavior)**
   - *Pros:* Simpler code. No maintenance burden.
   - *Cons:* 10x slower re-renders for list/tree components. Poor UX when editing a single row causes 100+ rows to re-render.
   - *Verdict:* ❌ Rejected. Performance impact too significant.

### Decision

**Selective memoization** targeting:

1. **Estimate row items** (`EstimateSheetContent.tsx`) — 100+ rows, frequent updates (edit, drag-drop)
2. **Tree nodes** (`EstimateSheetTree.tsx`) — 50+ nodes, expand/collapse operations
3. **Project cards** (`LiveProjectCard.tsx`) — 20+ cards, occasional updates
4. **Component library items** (`ComponentLibraryManager.tsx`) — 50+ items, occasional updates

**Critical requirement:** Props must be stable (use `useMemo` for objects, `useCallback` for functions) for `React.memo` to be effective.

**Expected impact:** 10x faster re-renders for list/tree components. Editing a single row takes 5-10ms instead of 50-100ms.

**Implementation:** See `19-react-memo-strategy.md` for detailed plan.

---

## ADR-011: Font Loading Strategy — Global vs. Route-Specific {#adr-011}

**Context:** Root layout loads 4 Google Fonts (Inter, Poppins, Roboto Mono, Source Serif 4) on every page. Landing page only uses Inter. This adds ~300KB of unused fonts to the landing page.

### Options Considered

1. **Keep global font loading (status quo)**
   - *Pros:* Simple. No changes needed. All fonts available everywhere.
   - *Cons:* Landing page loads 300KB of unused fonts. Slower FCP on landing page.
   - *Verdict:* ❌ Rejected. Performance impact too significant for landing page.

2. **Route-specific font loading**
   - *Pros:* Landing page only loads Inter (used font). Saves ~300KB. Faster FCP.
   - *Cons:* More complex. Need to audit font usage per route. Workshop layout needs Poppins/Roboto Mono/Source Serif.
   - *Verdict:* ✅ **ACCEPTED.**

3. **Font subsetting (load only used characters)**
   - *Pros:* Smaller font files. Faster downloads.
   - *Cons:* Complex to implement. May break if new characters are used. Maintenance burden.
   - *Verdict:* ⚠️ Deferred. Can be considered later if font size is still an issue.

### Decision

**Route-specific font loading:**

- **Root layout (`src/app/layout.tsx`):** Load only Inter (used by landing page)
- **Workshop layout (`src/app/workshop/layout.tsx`):** Load Poppins, Roboto Mono, Source Serif 4 (workshop-specific fonts)
- **Landing page routes:** Inherit Inter from root layout

**Implementation:**

```typescript
// src/app/layout.tsx — root layout
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

// src/app/workshop/layout.tsx — workshop layout
import { Poppins, Roboto_Mono, Source_Serif_4 } from "next/font/google";
const poppins = Poppins({ weight: ["400", "600"], subsets: ["latin"], variable: "--font-poppins" });
// ... etc
```

**Expected impact:** ~300KB reduction in landing page bundle, ~200ms faster FCP on landing page.

**Risk:** Low. Fonts are isolated to layouts, easy to verify correctness.

**Implementation:** See `20-font-and-bundle-optimization.md` for detailed plan.

---

## ADR-012: Error Boundary Strategy — Route-Level vs. Component-Level {#adr-012}

**Context:** Zero `error.tsx` files and zero custom error boundaries. If a component throws, the entire page crashes. Recovery requires full reload (~1000ms) vs error boundary retry (~50ms).

### Options Considered

1. **Route-level error boundaries only (`error.tsx` files)**
   - *Pros:* Simple. Next.js convention. Catches errors at route level.
   - *Cons:* Entire route crashes on component error. User loses all page state.
   - *Verdict:* ✅ **ACCEPTED as baseline.**

2. **Component-level error boundaries only (custom `ErrorBoundary`)**
   - *Pros:* Granular error handling. One component can fail without crashing the page.
   - *Cons:* More complex. Need to wrap each high-risk component. Doesn't catch route-level errors.
   - *Verdict:* ✅ **ACCEPTED as complement.**

3. **No error boundaries (status quo)**
   - *Pros:* Simpler code.
   - *Cons:* Full-page crashes on any error. Poor UX. Slow recovery (1000ms vs 50ms).
   - *Verdict:* ❌ Rejected. Resilience impact too significant.

### Decision

**Hybrid approach:**

1. **Route-level:** Add `error.tsx` files to high-risk routes:
   - `/workshop/projects/[projectId]/estimates/[nodeId]/error.tsx` (estimate workspace)
   - `/workshop/library/error.tsx` (component library)
   - `/workshop/projects/[projectId]/charts/error.tsx` (charts)

2. **Component-level:** Wrap high-risk components in custom `ErrorBoundary`:
   - `EstimateSheetContent` (complex, high crash risk)
   - `EstimateSheetTree` (tree operations, DnD)
   - Chart components (D3 error-prone with empty data)

3. **Reusable `ErrorBoundary` component:** Create `src/components/ui/error-boundary.tsx` for component-level boundaries.

**Expected impact:** 20x faster error recovery (1000ms → 50ms). Prevents full-page crashes. Graceful degradation.

**Risk:** Low. Error boundaries are additive. Fallback UI must be well-designed to avoid confusing users.

**Implementation:** See `21-error-boundary-strategy.md` for detailed plan.

---

## ADR-013: Server-Side Optimization — Proxy Migration, N+1 Fixes, Layout Caching {#adr-013}

**Context:** Deep audit revealed critical server-side bottlenecks:
- Proxy.ts adds ~100-200ms per request (HTTP roundtrip to Supabase Auth)
- Project layout re-fetches on every sub-navigation (~90ms wasted per nav)
- N+1 query patterns in repository functions

### Options Considered

#### Proxy.ts Optimization

1. **Migrate to Next.js middleware**
   - *Pros:* Edge runtime, faster. Uses `getSession()` (local JWT validation) instead of `getUser()` (HTTP roundtrip). Saves ~100-200ms.
   - *Cons:* Complex migration. Edge runtime limitations. Risk of auth flow breakage.
   - *Verdict:* ✅ **ACCEPTED.** High impact, manageable risk.

2. **Keep proxy.ts, optimize to use `getSession()`**
   - *Pros:* Simpler. No Edge runtime constraints. Saves ~60-150ms.
   - *Cons:* Still Node.js runtime (slower than Edge). Less future-proof.
   - *Verdict:* ⚠️ Fallback if middleware migration fails.

3. **Keep proxy.ts as-is (status quo)**
   - *Pros:* No changes. No risk.
   - *Cons:* ~100-200ms latency per request. Single largest server-side bottleneck.
   - *Verdict:* ❌ Rejected. Performance impact too significant.

#### Project Layout Caching

1. **Cache layout queries with `unstable_cache`**
   - *Pros:* Eliminates re-fetch on sub-navigation. Saves ~90ms per nav. 30s TTL balances freshness vs performance.
   - *Cons:* Cache invalidation complexity. Risk of stale data if not invalidated on mutations.
   - *Verdict:* ✅ **ACCEPTED.**

2. **No caching (status quo)**
   - *Pros:* Simple. Always fresh data.
   - *Cons:* ~90ms wasted per sub-navigation. Poor UX.
   - *Verdict:* ❌ Rejected. Performance impact too significant.

#### N+1 Query Fixes

1. **Batch sequential queries**
   - *Pros:* Reduces query count from O(N) to O(1). 30-50% reduction in server-side query time.
   - *Cons:* More complex query logic. Need to audit all repository functions.
   - *Verdict:* ✅ **ACCEPTED.**

2. **Keep sequential queries (status quo)**
   - *Pros:* Simpler code.
   - *Cons:* Slow list pages with many items. Poor scalability.
   - *Verdict:* ❌ Rejected. Performance impact too significant for list pages.

### Decision

**Phase 1.5 (Critical Infrastructure):**

1. **Proxy.ts → Middleware migration** (Task 1.5.1)
   - Migrate auth logic to Edge-compatible middleware
   - Use `getSession()` instead of `getUser()`
   - Delete `src/proxy.ts` after migration
   - Expected impact: ~100-200ms reduction in navigation latency

2. **Project layout caching** (Task 1.5.3)
   - Wrap layout data fetching in `unstable_cache` with 30s TTL
   - Add `revalidateTag` to mutation actions
   - Expected impact: ~90ms reduction per sub-navigation

3. **N+1 query fixes** (Task 2.0 in Phase 2)
   - Audit repository functions for sequential queries
   - Batch queries using `inArray` and `Promise.all`
   - Expected impact: 30-50% reduction in server-side query time

**Risk:** Medium. Proxy.ts migration affects auth flows. Layout caching requires careful invalidation. N+1 fixes change query logic.

**Mitigation:** Comprehensive E2E testing. Rollback plans for each task. Incremental rollout.

**Implementation:** See `17-server-side-optimization-strategy.md` for detailed plan.

---

## ADR-014: Three.js and Bundle Optimization — Dynamic Import vs. Removal {#adr-014}

**Context:** Landing page loads ~150KB of Three.js via `@firecms/neat` for `NeatWireframeBackground` (WebGL gradient). ⚠️ **LOCATION CORRECTION from earlier drafts:** The component renders inside `HeroSection` (`src/components/landing/HeroSection.tsx:44`), which is the **above-fold hero** — NOT below the fold. An IntersectionObserver lazy-load strategy will NOT defer loading because the element is already in the initial viewport. See `20-font-and-bundle-optimization.md` §2 for the complete corrected analysis.

**Impact:** Three.js is 65% of the landing page JS bundle (~315KB total) and blocks initial render of hero headline and CTA.

### Options Considered

1. **Remove Three.js entirely, replace with CSS gradient**
   - *Pros:* Eliminates 150KB entirely. Simpler code. Hero already uses multiple CSS gradient layers — visually consistent.
   - *Cons:* Loses animated WebGL effect. Design team may object.
   - *Verdict:* ⚠️ **Recommended fallback** if dynamic import causes visual issues.

2. **Dynamic import with `next/dynamic` + CSS placeholder (Recommended)**
   - *Pros:* Three.js chunk loads after critical path. CSS placeholder renders immediately. Hero content (headline, CTA) not blocked. Preserves visual effect after hydration.
   - *Cons:* Three.js still loads on every landing page visit (since hero is always visible). Extra complexity from `loading` state.
   - *Verdict:* ✅ **ACCEPTED** as primary strategy.

3. **Keep as-is (status quo)**
   - *Pros:* Simple. No changes.
   - *Cons:* 150KB blocks first paint. Slower FCP. Poor performance for first impression.
   - *Verdict:* ❌ Rejected. Performance impact too significant.

4. **Replace with static gradient image**
   - *Pros:* Tiny file size. Instant load.
   - *Cons:* Loses animation/interactivity. Static feel. Design team may object.
   - *Verdict:* ❌ Rejected. Animated gradient is part of brand identity.

### Decision

**Dynamic import Three.js with `next/dynamic`, `ssr: false`, and CSS placeholder:**

1. **Dynamic import in the page or wrapper:**
   ```typescript
   const NeatWireframeBackground = dynamic(
     () => import("@/components/landing/NeatWireframeBackground").then(mod => mod.NeatWireframeBackground),
     {
       ssr: false,
       loading: () => (
         <div
           className="absolute inset-0"
           style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(255,127,45,0.3), transparent 70%)" }}
           aria-hidden="true"
         />
       ),
     }
   );
   ```

2. **CSS placeholder** renders immediately (matches hero gradient colors).
3. **No IntersectionObserver needed** — the component is always visible. The deferral comes from `next/dynamic` only, which delays JS hydration.

**Expected impact:** ~150KB deferred from critical path. Hero headline/CTA render without waiting for Three.js (~200ms faster LCP for hero content). Three.js still loads on every visit, but not as a render blocker.

**Fallback:** If the CSS→Three.js transition causes visual issues, replace entirely with CSS gradient layers (the hero already uses 4+ gradient layers in `HeroSection.tsx:33-39`).

**Risk:** Low. Additive optimization. Easy to verify (check Network tab) and rollback (revert dynamic import).

**Implementation:** See `20-font-and-bundle-optimization.md` §2 for detailed plan.

---

## Summary of Decisions

| ADR | Decision | Phase |
|-----|----------|-------|
| ADR-001 | Hover-based prefetch (RSC + React Query data) | Phase 2 |
| ADR-002 | Global `staleTime: 5min` + per-query overrides | Phase 1 |
| ADR-003 | `loading.tsx` for simple routes, custom Suspense in layouts for `projects/[projectId]`, Suspense in `page.tsx` for all other workshop routes | Phase 1 |
| ADR-004 | `@tanstack/react-virtual` for lists, defer tree virtualization | Phase 2–3 |
| ADR-005 | `next/dynamic` for EstimateSheetContent (4,048 LOC), AddComponentModal (2,354 LOC), EstimateSheetTree (1,365 LOC), charts (D3), and other heavy components | Phase 1 |
| ADR-006 | Keep overlay, add 150ms show delay, remove min display timer | Phase 1 |
| ADR-007 | React `cache()` now, `unstable_cache` later, `"use cache"` in future | Phase 1 |
| ADR-008 | bfcache-compatible (zero blockers found), add `pageshow` handler | Phase 1–2 |
| ADR-009 | Auth at data-fetching layer (no middleware), all workshop pages forced dynamic | N/A (architectural constraint) |
| ADR-010 | Selective React.memo for high-impact targets (rows, tree nodes, cards) | Phase 1.5 |
| ADR-011 | Route-specific font loading (Inter for landing, workshop fonts for workshop) | Phase 1 |
| ADR-012 | Hybrid error boundaries (route-level + component-level) | Phase 1.5 |
| ADR-013 | Proxy.ts → middleware, layout caching, N+1 query fixes | Phase 1.5–2 |
| ADR-014 | Dynamic import Three.js with `next/dynamic` + CSS placeholder (above-fold, IntersectionObserver won't defer) | Phase 1 |

---

**Next:** See `04-implementation-plan.md` for the phased execution order incorporating these decisions.
