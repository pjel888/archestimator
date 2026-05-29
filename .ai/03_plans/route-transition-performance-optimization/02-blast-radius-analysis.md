# 02 — Blast Radius Analysis: Impact of Performance Changes

**Status:** Complete  
**Created:** 2026-05-29  
**Purpose:** Map the downstream impact of each proposed performance optimization. Identify what breaks if changes go wrong.

---

## Table of Contents

1. [Risk Summary Matrix](#1-risk-summary-matrix)
2. [Technique-by-Technique Impact Analysis](#2-technique-by-technique-impact-analysis)
3. [Upstream Dependencies](#3-upstream-dependencies)
4. [Execution Flows at Risk](#4-execution-flows-at-risk)
5. [Rollback Strategy Per Technique](#5-rollback-strategy-per-technique)

---

## 1. Risk Summary Matrix

| Technique | Files Touched | Risk Level | Blast Radius | Reversible? |
|-----------|--------------|------------|-------------|-------------|
| Increase `staleTime` | 1 file | **LOW** | Data freshness UX | Yes (1 line revert) |
| `loading.tsx` files | 3–5 new files | **LOW** | Route rendering | Yes (delete files) |
| `<Link prefetch>` | ~5 files | **LOW** | Data usage patterns | Yes (remove attribute) |
| Code splitting (`next/dynamic`) | 5–10 files | **LOW-MED** | Import paths, SSR | Yes (revert imports) |
| Consolidate `useRouter()` | 1 file | **MEDIUM** | Programmatic navigation | Yes (git revert) |
| Prefetch on hover | 3–5 new files | **LOW-MED** | Query cache, data freshness | Yes (remove hooks) |
| Streaming Server Components | 3–5 files modified | **MEDIUM** | Route rendering, layout behavior | Yes (remove Suspense) |
| Virtualized lists | 3–5 files modified | **MEDIUM** | Scroll behavior, selection, DnD | Yes (revert components) |
| bfcache optimization | 1–3 files | **MEDIUM** | Navigation state, overlay behavior | Yes (revert listeners) |
| Route-level bundle optimization | 5–10 files | **LOW** | Build output | Yes (revert imports) |
| Server Component caching | 3–6 files | **MEDIUM** | Data freshness, auth behavior | Yes (remove cache directives) |

---

## 2. Technique-by-Technique Impact Analysis

### 2.1 Increase `staleTime` (30s → 5min)

**Change:** Modify `src/app/providers.tsx` line 14.

**Files modified:** `src/app/providers.tsx`

**What depends on this:**
- Every TanStack Query consumer. Increasing `staleTime` means data is considered "fresh" for 5 minutes instead of 30 seconds.
- Users navigating away and back within 5 minutes will see cached data instead of fresh data.

**What breaks if wrong:**
- **Stale data:** Users might see outdated data after mutations on another page. Mitigated by: mutations invalidate relevant queries. This is the standard React Query pattern.
- **Auth-related data:** Session state should NOT be cached with long `staleTime`. Mitigated by: auth queries use their own `staleTime: 0` or `staleTime: Infinity` depending on the query.

**Risk:** LOW. React Query's mutation-based invalidation handles this correctly.

**Rollback:** Set `staleTime` back to `30_000`.

### 2.2 `loading.tsx` + Suspense Boundaries

**Change:** Add `loading.tsx` files to route segments with heavy data fetching. The `loading.tsx` renders automatically while the Server Component in `page.tsx` is resolving.

**Files created:**
- `src/app/workshop/projects/[projectId]/loading.tsx`
- `src/app/workshop/projects/[projectId]/estimates/loading.tsx`
- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/loading.tsx`
- `src/app/workshop/library/loading.tsx`

**Files modified:** None (purely additive)

**What depends on this:**
- Next.js layout.tsx wraps `children` in a Suspense boundary automatically when `loading.tsx` exists.
- The loading UI replaces `children` while the page resolves.

**What breaks if wrong:**
- **Layout shift:** If the loading skeleton doesn't match the final layout dimensions, CLS increases.
- **Auth flash:** If the auth check in the layout resolves before the page, users might briefly see the skeleton then get redirected. Mitigated by: auth checks at middleware level, not in layouts.
- **SEO:** `loading.tsx` does not affect SEO (it's client-side only for navigations; initial SSR renders the full page).

**Risk:** LOW. Purely additive. No existing behavior is modified.

**Rollback:** Delete the `loading.tsx` files.

### 2.3 `<Link prefetch>` on Sidebar/Card Links

**Change:** Add `prefetch={true}` (or rely on default in production) to `<Link>` components in navigation-heavy areas.

**Files modified:**
- `src/components/sidebar/SidebarNavItemRow.tsx` — sidebar links
- `src/components/workshop/ProjectMiniSidebar.tsx` — project sub-navigation
- `src/components/workshop/ProjectCard.tsx` — project cards
- `src/components/workshop/LiveProjectCard.tsx` — live project cards

**What depends on this:**
- Next.js prefetches the Route Segment Config (RSC payload) for linked routes.
- In production, `<Link>` prefetches by default when the link enters the viewport.

**What breaks if wrong:**
- **Excessive data usage:** Prefetching all visible links could cause unnecessary Supabase queries. Mitigated by: only prefetch on hover/focus, not on viewport enter. Use `prefetch={false}` and add hover-based prefetch instead.
- **Stale prefetched data:** The prefetched RSC payload might be stale by the time the user clicks. Mitigated by: Next.js handles this with `stale-while-revalidate` internally.

**Risk:** LOW. Next.js has robust prefetch handling.

**Rollback:** Remove `prefetch` attributes or set to `false`.

### 2.4 Code Splitting (`next/dynamic`)

**Change:** Wrap heavy components in `dynamic(() => import(...), { loading: () => <Skeleton /> })`.

**Files modified:**
- `src/components/workshop/ProjectEstimatesTable.tsx` — import `AddComponentModal` dynamically
- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx` — already heavy, but is the page itself
- `src/components/workshop/project-charts/ProjectChartsClient.tsx` — import D3 chart components dynamically
- `src/components/workshop/NewProjectModal.tsx` — import dynamically from project list page
- `src/components/workshop/ProjectDetailsModal.tsx` — import dynamically from project detail page
- `src/components/landing/` — split heavy landing sections

**Files affected by import changes (downstream):**
- `src/app/workshop/projects/page.tsx` → imports `NewProjectModal` (8 callers of `NewProjectFormSections`)
- `src/app/workshop/projects/[projectId]/page.tsx` → imports `ProjectDetailsModal`
- `src/app/workshop/projects/[projectId]/charts/page.tsx` → imports `ProjectChartsClient`
- `src/app/page.tsx` → imports all landing sections

**What depends on this:**
- Any component that imports the dynamically-loaded component directly (not through `dynamic()`).
- SSR: `dynamic()` with `ssr: false` means the component won't render on the server. This can cause hydration mismatches if not careful.

**What breaks if wrong:**
- **Missing exports:** If the dynamically imported component doesn't have a default export.
- **SSR mismatch:** If `ssr: false` is used but the component was previously server-rendered.
- **Import path errors:** If the component is renamed or moved.
- **Type errors:** `dynamic()` wraps the component type, which may affect prop type inference.

**Risk:** LOW-MEDIUM. `next/dynamic` is well-tested. The main risk is CI build failures from incorrect imports.

**Rollback:** Revert `dynamic()` calls to static imports.

### 2.5 Consolidate `useRouter()` in `ProjectEstimatesTable`

**Change:** Replace 5 separate `useRouter()` calls with 1 `useNavigationRouter()` at component top level.

**Files modified:** `src/components/workshop/ProjectEstimatesTable.tsx`

**Downstream impact:**
- Lines 178, 265, 379, 499, 597 — each currently instantiates `useRouter()` independently.
- After consolidation: one router instance, passed to inner functions via closure or ref.

**What breaks if wrong:**
- **Missing router methods:** If the consolidated hook doesn't expose all methods used (push, replace, refresh, etc.).
- **Closure staleness:** If router methods are captured in closures that don't update.
- **Race conditions:** If multiple navigation calls happen rapidly with the consolidated router.

**Risk:** MEDIUM. Touches 5 call sites in a 600+ line component. Requires careful refactoring.

**Rollback:** Git revert the file.

### 2.6 Prefetch on Hover

**Change:** Add hover handlers to navigation links that trigger data prefetch (React Query `queryClient.prefetchQuery`).

**Files created:**
- `src/hooks/use-prefetch-on-hover.ts` — generic hook for prefetch-on-hover

**Files modified:**
- `src/components/sidebar/SidebarNavItemRow.tsx` — add `onMouseEnter` prefetch
- `src/components/workshop/ProjectMiniSidebar.tsx` — add `onMouseEnter` prefetch
- `src/components/workshop/LiveProjectCard.tsx` — add hover prefetch for project detail

**What depends on this:**
- React Query cache: prefetched data populates the cache, so when the user navigates, the query is already resolved.
- `queryClient` must be available in the component.

**What breaks if wrong:**
- **Stale prefetched data:** If the prefetched data is mutated before navigation, stale data is shown briefly. Mitigated by: `staleTime` controls this. React Query will background-refetch if `staleTime` has passed.
- **Excessive prefetching:** Rapid hovering could trigger many prefetch requests. Mitigated by: debounce hover (200ms delay before prefetch) and request deduplication (React Query handles this).
- **Auth errors:** Prefetching protected data might trigger auth errors. Mitigated by: only prefetch when user is authenticated.

**Risk:** LOW-MEDIUM. Additive. Can be gradually rolled out per link.

**Rollback:** Remove hover handlers.

### 2.7 Streaming Server Components

**Change:** Wrap slow Server Component sections in `<Suspense>` with fallback skeletons. This allows the page shell to render immediately while data resolves.

**Files modified:**
- `src/app/workshop/projects/[projectId]/layout.tsx` — wrap data-dependent sections in Suspense
- Heavy Server Components — extract data fetching into separate async components

**What depends on this:**
- Next.js streaming SSR: the server sends HTML progressively as each Suspense boundary resolves.
- Layouts must accept `children` that might be a Suspense fallback initially.

**What breaks if wrong:**
- **Layout dependencies:** If the layout assumes children data is always available (e.g., passing it as props), streaming will break.
- **CSS ordering:** Streaming can cause CSS to be injected out of order if not using CSS modules or Tailwind (Tailwind handles this correctly).
- **HTTP headers:** Streaming responses can't set headers after the initial flush. If auth redirects or cookie sets happen late, they may be ignored.

**Risk:** MEDIUM. Requires architectural changes to how layouts pass data.

**Rollback:** Remove `<Suspense>` wrappers.

### 2.8 Virtualized Lists

**Change:** Replace large lists (project cards, estimate table rows, library items) with virtualized rendering (only render visible items).

**Files modified:**
- `src/components/workshop/projects-page-client.tsx` — project list virtualization
- `src/components/workshop/ProjectEstimatesTable.tsx` — estimate table virtualization
- Estimate row items table — row virtualization

**Libraries considered:** `@tanstack/react-virtual` (compatible with TanStack Table)

**What depends on this:**
- Scroll position tracking
- Row selection/highlighting
- Drag-and-drop (if applicable)
- Inline editing
- Keyboard navigation

**What breaks if wrong:**
- **Scroll restoration:** Back/forward scroll position may not restore correctly.
- **DOM measurement:** Virtualized rows need consistent row heights for accurate scroll calculations. Variable-height rows (e.g., expanded rows) are harder.
- **Selection state:** Selected rows that are scrolled out of view must be tracked separately.
- **Drag-and-drop:** React Complex Tree already has its own virtualization (or lack thereof). Adding another virtualization layer could conflict.
- **Accessibility:** Screen readers may not navigate virtualized lists correctly without ARIA attributes.

**Risk:** MEDIUM. High reward but significant implementation complexity.

**Rollback:** Revert virtualization component to flat rendering.

### 2.9 bfcache Optimization

**Change:** Ensure pages are bfcache-compatible by avoiding `unload` event handlers and minimizing DOM mutations that block bfcache.

**Codebase audit result:** **Zero bfcache blockers found.** There are no `beforeunload` or `unload` event listeners anywhere in the codebase. No `Cache-Control: no-store` headers are set on workshop pages. The codebase is already bfcache-compatible from a blocker perspective.

**Files to modify:**
- `src/components/navigation-listener.tsx` — add `pageshow` event handling to suppress overlay on bfcache restore
- `src/components/ui/route-loading-overlay.tsx` — ensure portal cleanup is bfcache-safe

**What depends on this:**
- The `popstate` event listener in `NavigationListener`.
- The `createPortal` call in `RouteLoadingOverlay`.
- No `beforeunload` or `unload` event listeners exist (verified clean).

**What breaks if wrong:**
- **Stale overlay:** If the overlay portal isn't cleaned up on bfcache restore, a stale overlay might appear.
- **Stale listeners:** If event listeners aren't properly cleaned up, duplicate listeners accumulate on bfcache restore.
- **Stale React Query data:** If React Query cached data is stale after bfcache restore. Mitigated by: React Query's `refetchOnWindowFocus` is already `false`, but bfcache restore might not trigger window focus.

**Risk:** LOW. The codebase is already clean — the only work is adding `pageshow` handling to suppress the overlay on bfcache restore. Chrome/Edge/Safari all have good bfcache support for apps without blockers.

**Rollback:** Remove bfcache-specific optimizations.

### 2.10 Server Component Caching

**Change:** Add Next.js cache directives to Server Component data fetching to avoid re-fetching on every render.

**Files modified:**
- `src/app/workshop/projects/[projectId]/layout.tsx` — cache project detail queries
- `src/lib/repositories/` — add optional cache parameters

**Techniques:**
- Next.js 15+: `import { unstable_cache } from "next/cache"` or `"use cache"` directive
- Next.js 14: `export const fetchCache = 'default-cache'` or `export const dynamic = 'force-static'`
- React `cache()` for per-request memoization

**What depends on this:**
- Auth cookies: cached responses must be scoped to the authenticated user.
- Data mutations: when data changes, the cache must be invalidated.

**What breaks if wrong:**
- **Cross-user data leak:** If cached Server Component output is served to a different user. Mitigated by: Next.js full route cache is segmented by URL + cookies + headers.
- **Stale auth decisions:** If auth state changes but the cached page doesn't reflect it. Mitigated by: auth middleware runs before cache lookup.
- **Stale data after mutations:** If the cache isn't invalidated after a mutation. Mitigated by: `revalidatePath()` or `revalidateTag()` after mutations.

**Risk:** MEDIUM. Server-side caching is powerful but requires careful cache key scoping.

**Rollback:** Remove cache directives or set `dynamic = 'force-dynamic'`.

---

## 3. Upstream Dependencies

### What breaks if performance changes destabilize:

| Layer | Component | Impact |
|-------|-----------|--------|
| Auth | `proxy.ts` (auth guard) + Supabase session | If `loading.tsx` reveals protected content before auth check, data leak possible. **Note:** There is NO `middleware.ts`. Auth is enforced at the data-fetching layer via `requireCurrentUserContext()` → `redirect("/login")`. |
| Auth | `src/lib/auth/actions.ts` | Server-side redirects bypass client optimizations (unchanged) |
| Layout | `src/app/layout.tsx` | Root layout load affects ALL pages. Font loading optimization helps all routes. |
| Layout | `[projectId]/layout.tsx` | Project layout is the only nested workshop layout. Fetches 4 Supabase queries (1 sequential + 3 parallel). Optimizing here has the widest impact. |
| Shell | `WorkshopPageShell` (111 lines) | Rendered by EVERY workshop page. Reads `cookies()` for side-panel widths — forces dynamic rendering. |
| Providers | `src/app/providers.tsx` | Changes to `staleTime` affect ALL queries. Must not break auth query freshness. |
| Navigation | `NavigationListener` | bfcache changes affect ALL routes. Overlay behavior affects ALL transitions. |
| Navigation | `useNavigationRouter` | Changes to router wrapper affect ALL programmatic navigation (7 files, 16+ call sites). |

### Components that depend on navigation state:

| Component | File | Navigation API Used |
|-----------|------|---------------------|
| `MainSidebar` | `src/components/sidebar/MainSidebar.tsx` | `usePathname` — active route highlighting |
| `ProjectMiniSidebar` | `src/components/workshop/ProjectMiniSidebar.tsx` | `usePathname` — active sub-route highlighting |
| `WorkshopPageShell` | `src/components/workshop/WorkshopPageShell.tsx` | Breadcrumbs depend on current route |
| `ProjectEstimatesTable` | `src/components/workshop/ProjectEstimatesTable.tsx` | 5× `useNavigationRouter()` — `refresh()` for mutations |
| `EstimateSheetTree` | `src/components/workshop/EstimateSheetTree.tsx` | `useNavigationRouter()` — `replace()` for tree navigation, `push()` for node selection; `usePathname` for current route |
| `EstimateSheetContent` | `src/components/workshop/EstimateSheetContent.tsx` | `useNavigationRouter()` via sub-components |
| `ProjectWorkspaceHeaderRow` | `src/components/workshop/ProjectWorkspaceHeaderRow.tsx` | `usePathname` — context-aware header |
| `ProjectTotalHeader` | `src/components/workshop/ProjectTotalHeader.tsx` | `usePathname` — header context |

None of these should be affected by adding prefetch, caching, or code splitting. They read from the currently-committed route, which is unchanged.

### Verified `useNavigationRouter` Call Sites (7 files, 16+ method calls):

| File | Lines | Methods Called |
|------|-------|---------------|
| `ProjectEstimatesTable.tsx` | 178, 265, 379, 499, 597 | `router.refresh()` × 5 |
| `EstimateSheetTree.tsx` | 205, 723, 900 | `router.replace(href)`, `router.push(href)` |
| `NewProjectForm.tsx` | 29, 105–106 | `router.push(href)`, `router.refresh()` |
| `WorkshopHomebaseClient.tsx` | 76, 100, 112 | `router.refresh()` × 2 |
| `projects-page-client.tsx` | 121, 218 | `router.refresh()` |
| `ProjectEstimatesClient.tsx` | 28, 44 | `router.refresh()` |
| `ComponentLibraryManager.tsx` | 799, 887 | `router.refresh()` |

---

## 4. Execution Flows at Risk

| Execution Flow | Performance Technique | Risk | Mitigation |
|---------------|----------------------|------|------------|
| `createProject` (New Project Form → redirect) | Code splitting `NewProjectModal` | LOW | Modal is client-only, dynamic import is safe |
| `signInWithEmail` / `signInWithGoogle` | bfcache + auth redirects | LOW | Auth flows bypass client cache; server-side redirects |
| `estimateTreeNavigate` (tree node click → router.replace) | Prefetch on hover | LOW | Prefetch is additive; doesn't change navigation logic |
| `openEstimateSheet` (table row click → router.push) | Prefetch on hover | LOW | Same as above |
| `backForwardNavigate` (browser back/forward) | bfcache optimization | MEDIUM | Requires bfcache compatibility testing |
| `switchProjectTab` (mini-sidebar click) | `<Link prefetch>` | LOW | Prefetch is additive |
| `openLibraryComponent` (sidebar → library) | Code splitting | LOW-MEDIUM | If component dynamically loaded, ensure it's available when clicked |

---

## 5. Rollback Strategy Per Technique

| Technique | Rollback Action | Verification |
|-----------|----------------|-------------|
| `staleTime` increase | Revert 1 line in `providers.tsx` | `bun run build` passes |
| `loading.tsx` files | Delete files (purely additive) | Routes render without skeleton |
| `<Link prefetch>` | Remove `prefetch` attribute | Navigation behavior unchanged |
| Code splitting | Revert to static imports | `bun run build` passes, no chunk warnings |
| Consolidate `useRouter` | Git revert file | Navigation works in all 5 call sites |
| Prefetch on hover | Remove hover handlers | No background queries |
| Streaming Suspense | Remove `<Suspense>` wrappers | Routes render as before |
| Virtualized lists | Revert to flat rendering | Lists render all items |
| bfcache | Revert `NavigationListener` changes | Back/forward behavior unchanged |
| Server caching | Set `dynamic = 'force-dynamic'` | Pages re-fetch on every render |

**Universal rollback command:** `git revert` the implementation commit. All techniques are additive or scoped changes that can be cleanly reverted.

---

**Next:** See `03-readiness-assessment.md` for pre-implementation prerequisites.
