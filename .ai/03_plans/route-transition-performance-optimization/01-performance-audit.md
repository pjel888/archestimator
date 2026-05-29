# 01 — Performance Audit: Route Transition Bottlenecks

**Status:** Complete  
**Audit Date:** 2026-05-29  
**Scope:** Every route in `src/app/`, every navigation path, every data-fetching pattern  

---

## Table of Contents

1. [Methodology](#1-methodology)
2. [Route-by-Route Analysis](#2-route-by-route-analysis)
3. [Cross-Cutting Bottlenecks](#3-cross-cutting-bottlenecks)
4. [Data-Fetching Patterns](#4-data-fetching-patterns)
5. [Bundle Analysis](#5-bundle-analysis)
6. [Peak-Load Scenarios](#6-peak-load-scenarios)
7. [Summary of Findings](#7-summary-of-findings)

---

## 1. Methodology

This audit examines every route transition path in the archestimator app. For each route, we analyze:
- **Server render cost**: What data is fetched server-side before the page can render
- **Client hydration cost**: What JavaScript must be downloaded, parsed, and executed
- **Cache behavior**: What happens on revisit (cold vs. warm)
- **Navigation entry points**: How users reach this route and what triggers navigation

Data sources:
- Static code analysis of `src/app/` (all 23 pages)
- Repository analysis of `src/lib/repositories/` (6 repository files)
- Component analysis of heavy client components (100+ workshop components)
- Provider tree analysis (`src/app/providers.tsx`, `src/app/layout.tsx`)
- Architecture graph analysis (120 communities, 42965 edges)

---

## 2. Route-by-Route Analysis

### 2.1 Landing Pages (Public, No Auth)

#### `/` (Landing Home)
- **Page type:** Static-ish Client Component
- **Components:** `LandingHeader`, `HeroSection`, `AnnouncementBanner`, `CompanyProofCarouselSection`, `ProductShowcaseSection`, `FeaturesSection`, `SolutionSection`, `EstimatorEngineSection`, `SecondaryClaimSection`, `PricingSection`, `PartnerSection`, `TestimonialSection`, `FAQSection`, `FinalCTASection`, `LandingFooter`
- **Data fetching:** Mostly static. `company-proof-data.ts` provides static JSON. `ABExperimentProvider` runs client-side only.
- **Bottleneck:** Large number of sections, each importing Phosphor icons. `Lenis` smooth scroll library loaded on landing. Multiple font files (Inter, Poppins, Roboto Mono, Source Serif 4) loaded in root layout.
- **Perceived slowness:** Medium. First load is heavy due to all sections rendering at once.
- **Optimization opportunity:** Static generation (`generateStaticParams` not needed — it's a single page, but could be fully static). Lazy-load below-fold sections. Reduce Phosphor icon tree-shaking.

#### `/features`, `/about`, `/pricing`, `/contact`, `/privacy`, `/terms`
- **Page type:** Static Client Components (mostly marketing)
- **Bottleneck:** Same landing component overhead. No data fetching but still JS-heavy.
- **Perceived slowness:** Low-Medium. First load slower due to shared landing components.
- **Optimization opportunity:** Static generation for all. Shared landing layout with cached shell.

### 2.2 Auth Pages (Public, No Workshop Shell)

#### `/login`
- **Page type:** Client Component with Supabase Auth UI
- **Bottleneck:** Supabase Auth SDK initialization. Google OAuth redirect flow is external.
- **Perceived slowness:** Low. Auth page is intentionally lightweight.
- **Optimization opportunity:** Already well-isolated. No workshop shell overhead.

#### `/auth/callback`
- **Page type:** Server Component (route handler-like)
- **Bottleneck:** Supabase auth code exchange. This is a transient route.
- **Perceived slowness:** Variable (depends on Supabase auth service latency).
- **Optimization opportunity:** Already minimal. Focus on redirect speed.

#### `/invite/[token]`
- **Page type:** Server Component with Supabase query
- **Bottleneck:** Single Supabase query to resolve invitation token. Minimal data.
- **Perceived slowness:** Low. Lightweight route.
- **Optimization opportunity:** Prefetch token resolution.

#### `/share/[token]`
- **Page type:** Hybrid (Server Component shell + Client Component content)
- **Bottleneck:** Supabase query for project publication snapshot. Can be large JSON.
- **Perceived slowness:** Medium. Publication snapshot can be large.
- **Optimization opportunity:** Stream the snapshot. Cache publication data aggressively.

### 2.3 Workshop Pages (Protected, Full Workshop Shell)

#### `/workshop` (Homebase)
- **Page type:** Hybrid (Server Component redirect check + Client Component bento grid)
- **Components:** `WorkshopHomebaseClient`, `WorkshopPageShell`, `MainSidebar`
- **Data fetching:** `WorkshopHomebaseClient` fetches favorites (project + estimate) and recent data via React Query hooks after mount.
- **Bottleneck:** Workshop shell mount + React Query hydration. The bento grid has multiple data dependencies that resolve sequentially.
- **Perceived slowness:** Medium. The workshop shell (sidebar, header, footer) mounts immediately, but the bento grid content populates after query resolution.
- **Optimization opportunity:** Prefetch favorites server-side. Hydrate React Query cache from server.

#### `/workshop/projects` (Project List)
- **Page type:** Hybrid (Server Component for auth check + Client Component for project list)
- **Components:** `projects-page-client`, `LiveProjectCard`, `NewProjectForm`, `NewProjectModal`
- **Data fetching:** `projects-page-client` fetches workspace projects list. `LiveProjectCard` renders project thumbnails.
- **Bottleneck:**
  - **MANY PROJECT THUMBNAILS:** Each `LiveProjectCard` loads a project image. If a workspace has 50+ projects, this means 50+ image requests + 50+ card renders with thumbnails, client names, and metadata.
  - Project list query fetches ALL projects unfiltered. No pagination.
  - `NewProjectModal` preloads form fields.
- **Perceived slowness with many projects:** HIGH. Image loading dominates. Card rendering churn.
- **Optimization opportunity:** Paginate or virtualize the project list. Lazy-load thumbnails. Prefetch project list on `/workshop` hover of "Projects" link.

#### `/workshop/projects/[projectId]` (Project Dashboard)
- **Page type:** Server Component (layout) + Client Component (dashboard)
- **Layout:** `src/app/workshop/projects/[projectId]/layout.tsx` — fetches `getCurrentWorkspaceProject`, `getProjectCollaborationSummary`, `getProjectPublicationSummary`, `listProjectEstimateSheets` in parallel via `Promise.all`.
- **Components:** `ProjectMiniSidebar`, `ProjectTotalHeader`, `ProjectWorkspaceHeaderRow`, `ProjectDashboardClient`
- **Data fetching:** Layout fetches 4 Supabase queries on every render. `ProjectDashboardClient` fetches additional dashboard data.
- **Bottleneck:**
  - 4 parallel Supabase queries in the layout block rendering until ALL resolve
  - `ProjectTotalHeader` recalculates totals
  - `ProjectWorkspaceHeaderRow` renders collaboration, publication, and estimate sheet data
  - `ProjectMiniSidebar` renders project sub-navigation
- **Perceived slowness:** Medium-High. The layout blocks until all 4 queries resolve. No streaming.
- **Optimization opportunity:** Stream layout data. Cache project detail. Prefetch on project card hover.

#### `/workshop/projects/[projectId]/estimates` (Estimate List)
- **Page type:** Client Component with TanStack Table
- **Components:** `ProjectEstimatesTable`
- **Data fetching:** TanStack Query fetches estimate list. Table renders with inline editing, duplicate, and navigation actions.
- **Bottleneck:**
  - **MANY ESTIMATE SHEETS:** If a project has 20+ estimates, the table renders all rows with inline edit fields, action buttons, and status indicators.
  - `ProjectEstimatesTable` instantiates `useRouter()` 5 separate times (lines 178, 265, 379, 499, 597) — each creates a router subscription.
- **Perceived slowness with many estimates:** HIGH. Table rendering + hydration cost.
- **Optimization opportunity:** Virtualize the table. Consolidate 5 useRouter calls. Paginate estimates.

#### `/workshop/projects/[projectId]/estimates/[nodeId]` (Estimate Workspace)
- **Page type:** Client Component (heavy)
- **Components:** `EstimateSheetTree`, `EstimateSheetContent`, `EstimateCenterColumnBoundary`, component library sidebar
- **Data fetching:** `use-estimate-query.ts` sets `staleTime: 30_000`. Fetches estimate tree, row items, component library. React Complex Tree renders the node hierarchy.
- **Bottleneck:**
  - **MANY ESTIMATE ROW ITEMS:** If an estimate sheet has 200+ row items across 20+ nodes, the tree rendering + row table rendering becomes expensive. React Complex Tree renders ALL nodes (no virtualization in the tree itself).
  - The component library sidebar loads the full library tree on mount.
  - `EstimateSheetTree` handles drag/drop, selection, rename, delete — all client-side state.
  - Multiple `useTransition` calls for marking non-urgent updates.
- **Perceived slowness with many rows:** VERY HIGH. The combination of tree + table + library sidebar is the heaviest surface in the app.
- **Optimization opportunity:** Virtualize row items. Lazy-load component library sidebar. Split estimate tree and content into separate Suspense boundaries. Prefetch estimate data on estimate list row hover.

#### `/workshop/projects/[projectId]/charts` (Project Charts)
- **Page type:** Client Component with D3
- **Components:** `ProjectChartsClient`, `ProjectCostDonutChart`, `ProjectCostBubbleChart`, `ProjectChartBucketTable`
- **Data fetching:** `getProjectChartsData()` fetches chart-specific estimate/node/row/category/supplier facts.
- **Bottleneck:**
  - D3 computation for donut/bubble charts on every render
  - Can render up to 3 estimate chart columns simultaneously
  - Chart data fetch is comprehensive (all estimates, all nodes, all rows)
- **Perceived slowness:** High. D3 rendering + data fetching.
- **Optimization opportunity:** Lazy-load D3. Cache chart data. Defer chart rendering until data is ready with skeleton.

#### `/workshop/library` (Component Library)
- **Page type:** Client Component (mirrors estimate workspace)
- **Components:** `LibraryPageClient`, `LibraryTree`, `LibraryItemRow`, component sheet
- **Data fetching:** React Query fetches full component library with taxonomy, folders, suppliers, brands.
- **Bottleneck:**
  - **MANY LIBRARY COMPONENTS:** If workspace has 500+ components, the library tree + center sheet become very heavy.
  - `LibraryTree` renders React Complex Tree with all folders and components.
  - `AddComponentModal` preloads form fields, suppliers, brands, categories.
- **Perceived slowness with many components:** High. Tree + sheet rendering.
- **Optimization opportunity:** Virtualize library items. Lazy-load `AddComponentModal`. Paginate center sheet.

#### `/workshop/templates` (Template Library)
- **Page type:** Client Component (mirrors library)
- **Components:** `TemplatesPageClient`
- **Bottleneck:** Similar to library — loads full template set on mount.
- **Perceived slowness:** Medium-High (depends on template count).
- **Optimization opportunity:** Same as library optimizations.

#### `/workshop/settings`, `/workshop/settings/profile`, `/workshop/settings/workspace`
- **Page type:** Hybrid (Server Component redirect + Client Component forms)
- **Bottleneck:** Lightweight forms. Minimal data fetching.
- **Perceived slowness:** Low. These are simple settings forms.
- **Optimization opportunity:** Prefetch settings data on `/workshop` sidebar hover. Static-ish generation.

#### `/workshop/onboarding` (Redirect)
- **Page type:** Server Component (redirect only)
- **Bottleneck:** None. It's a redirect.
- **Perceived slowness:** Low.

### 2.4 Transition Path Matrix

| From → To | Path | Current Perceived Latency | Bottleneck |
|------------|------|--------------------------|------------|
| Landing → Login | `<Link>` click | Low | Page is static, no data fetch |
| Login → /workshop | Auth redirect | Medium-High | Auth callback + workshop bootstrap |
| /workshop → /workshop/projects | Sidebar `<Link>` | Medium | Project list query + card rendering |
| /workshop/projects → /workshop/projects/[id] | Card `<Link>` | Medium-High | Layout blocks on 4 parallel queries |
| /workshop/projects/[id] → estimates | Mini-sidebar `<Link>` | Medium | Table fetch + render |
| estimates → estimates/[nodeId] | Table row click (`router.push`) | High | Tree + row items + library sidebar |
| estimates/[nodeId] → charts | Mini-sidebar `<Link>` | High | Chart data + D3 rendering |
| Any → /workshop/library | Sidebar `<Link>` | Medium-High | Library tree + component sheet |
| Back/Forward (any route) | Browser button | High | Complete re-fetch + re-render (no bfcache) |

---

## 3. Cross-Cutting Bottlenecks

### 3.1 Server Component Data Fetching (ALL Workshop Routes)

**Problem:** Every workshop page and layout that is a Server Component executes Supabase queries on EVERY render. There is no server-side caching between navigations. When a user navigates `projects → project detail → estimates → back to projects`, the projects list is re-fetched from Supabase even though nothing changed.

**Files affected:**
- `src/app/workshop/projects/[projectId]/layout.tsx` — 4 queries on every render
- All repository files in `src/lib/repositories/` — called from Server Components without cache directives

**Root cause:** Next.js App Router defaults to `cache: 'no-store'` for fetch in development and dynamic rendering for pages that use `cookies()` or `headers()`. The auth-protected workshop routes use `cookies()` for session validation, which forces dynamic rendering on every request.

### 3.2 Zero Prefetching

**Problem:** The app never prefetches data for the next likely route. Users must always wait for the full round-trip after clicking.

**Specific gaps:**
- Hovering "Projects" in sidebar does not prefetch the project list
- Hovering a project card does not prefetch the project detail
- Hovering an estimate row does not prefetch the estimate workspace
- No `<Link prefetch>` usage anywhere (Next.js defaults to prefetching only in production with `<Link>`, but this is client-side prefetch of the RSC payload, not data prefetch)

### 3.3 No Suspense Boundaries

**Problem:** The app has ZERO `loading.tsx` files and ZERO `<Suspense>` boundaries. Every route blocks until ALL data is resolved. Users see nothing until the entire page is ready.

**Impact:** Even with the loading overlay, the user experience is: click → 300ms dark scrim → suddenly the full page appears. There's no progressive rendering, no skeleton screens, no partial content.

### 3.4 No Code Splitting

**Problem:** No usage of `next/dynamic` or `React.lazy` anywhere in the codebase. Every component is eagerly bundled into the route's JavaScript payload. Heavy components like `ProjectEstimatesTable`, `EstimateSheetTree`, `ComponentLibraryManager`, and chart components are bundled into their parent routes.

**Impact:** The initial JavaScript bundle for workshop routes is unnecessarily large. Components that aren't visible on first render (modals, chart views, library manager) are still downloaded and parsed.

### 3.5 Repeated `useRouter` Instantiation

**Problem:** `ProjectEstimatesTable.tsx` creates 5 separate `useRouter()` instances. Each one subscribes to router events independently.

**Impact:** Memory waste, potential for subtle bugs with router state, and unnecessary re-renders.

### 3.6 Phosphor Icon Bundle Size

**Problem:** Multiple components import individual Phosphor icons. While tree-shaking helps, the sheer number of unique icons across 100+ components adds up.

**Impact:** Each icon import adds ~1-3KB to the bundle. With 50+ unique icons, this can add 100KB+ to the total bundle.

### 3.7 No bfcache Compatibility

**Problem:** The app does not leverage the browser's Back-Forward Cache (bfcache). On back/forward navigation, pages are completely re-fetched and re-rendered instead of being restored from the browser's in-memory cache.

**Root cause:** The loading overlay's `NavigationListener` uses `popstate` event listener, and the overlay portal may interact with the DOM in ways that prevent bfcache. Additionally, the app likely has `unload` handlers or other bfcache blockers.

---

## 4. Data-Fetching Patterns

### 4.1 React Query Configuration

```typescript
// src/app/providers.tsx
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,        // 30 seconds — too short for navigation patterns
      gcTime: 5 * 60_000,       // 5 minutes — reasonable
      refetchOnWindowFocus: false, // Good
      retry: 1,                  // Reasonable
    },
  },
});
```

**Issue:** `staleTime: 30_000` means data is considered "stale" after 30 seconds. When a user navigates away and comes back within 30 seconds, the data is still fresh and served from cache. But after 30 seconds (common — user might spend 30+ seconds on another page), the data is re-fetched.

**Recommendation:** Increase `staleTime` to `5 * 60_000` (5 minutes) for lists and `2 * 60_000` (2 minutes) for detail views.

### 4.2 Server Component Data Fetching

Workshop pages like `[projectId]/layout.tsx` use direct Supabase queries:

```typescript
const { project: liveProject } = await getCurrentWorkspaceProject(projectId);
const [collaborationSummary, publicationSummary, projectEstimateSheets] = liveProject
  ? await Promise.all([...])
  : [null, null, []];
```

These queries run on EVERY request. There's no:
- `unstable_cache` (Next.js 14) or `cacheTag` (Next.js 15+)
- `stale-while-revalidate` pattern
- Incremental Static Regeneration (ISR)
- HTTP cache headers

### 4.3 Repository Query Patterns

All repositories in `src/lib/repositories/` are plain async functions that call Supabase. They don't:
- Cache results
- Batch related queries
- Use `select` column filtering consistently
- Return minimal DTOs (many return full row objects)

---

## 5. Bundle Analysis

### 5.1 Root Layout Dependencies

`src/app/layout.tsx` loads:
- 4 Google Font files (Inter, Poppins, Roboto Mono, Source Serif 4)
- `react-complex-tree/lib/style-modern.css`
- `lenis/dist/lenis.css`
- `globals.css`

These are loaded on EVERY page, including landing pages where the fonts and tree CSS are unnecessary.

### 5.2 Provider Tree

`src/app/providers.tsx` wraps the entire app:
- `QueryClientProvider` (TanStack Query)
- `ToastProvider` (custom, includes Portal rendering)
- `NavigationListener` (global click listener)
- `RouteLoadingOverlay` (portal overlay)
- All `children` (the actual page)

All client components in the provider tree are downloaded on every page.

### 5.3 Heavy Client Components

| Component | File | Estimated Impact |
|-----------|------|-----------------|
| `ProjectEstimatesTable` | ~600+ lines | TanStack Table + 5 useRouter + inline editing |
| `EstimateSheetTree` | ~900+ lines | React Complex Tree + drag/drop + context menu |
| `EstimateSheetContent` | Large | Row items table + component library sidebar |
| `ComponentLibraryManager` | ~1500+ lines | Full component management + modals |
| `AddComponentModal` | ~1500+ lines | Complex form with multiple sections |
| `WorkshopHomebaseClient` | Large | Bento grid with favorites |
| `ProjectDashboardClient` | Large | Dashboard with metrics |

None of these are code-split. All are eagerly loaded in their parent routes.

---

## 6. Peak-Load Scenarios

### 6.1 Many Project Thumbnails

**Scenario:** Workspace has 50+ projects, each with a thumbnail image.

**What happens on `/workshop/projects`:**
1. Server Component checks auth
2. Client Component mounts → React Query fetches project list (50+ rows)
3. Every `LiveProjectCard` renders with:
   - Project thumbnail image (50+ image requests)
   - Project name, client name, project code
   - Status/role badges
   - Hover effects, click handlers
4. Images load progressively, causing layout shifts

**Estimated latency:** 500ms–2s (dominated by image loading)

**What should happen:**
- Virtualized list: only render visible cards (10–15 at a time)
- Lazy-load images with `loading="lazy"` and blur placeholders
- Prefetch project list on `/workshop` "Projects" hover
- Cache project list aggressively (5+ minute staleTime)

### 6.2 Many Estimate Sheets

**Scenario:** Project has 20+ estimate sheets.

**What happens on `/workshop/projects/[id]/estimates`:**
1. React Query fetches estimate list (20+ rows)
2. `ProjectEstimatesTable` renders all rows with inline edit fields
3. Each row has: sheet code, sheet name, total, actions (duplicate, open)
4. Table supports inline editing — each cell is an input

**Estimated latency:** 300ms–800ms (dominated by table rendering)

**What should happen:**
- Virtualized table rows
- Lazy-load inline edit capabilities
- Prefetch estimate list on project detail hover

### 6.3 Many Estimate Row Items

**Scenario:** Estimate sheet has 200+ row items across 15+ nodes.

**What happens on `/workshop/projects/[id]/estimates/[nodeId]`:**
1. Server layout fetches project data (4 queries)
2. Client Component mounts → React Query fetches:
   - Estimate tree (15+ nodes) → React Complex Tree renders all
   - Row items for selected node (potentially 50+ rows)
   - Component library tree (100+ components)
3. All three data sources resolve → full render

**Estimated latency:** 500ms–2000ms (dominated by tree + table + library)

**What should happen:**
- Stream tree data → render tree skeleton immediately
- Suspense boundary for row items → show row skeleton while loading
- Lazy-load component library sidebar → defer until tree is interactive
- Virtualize row items in the estimate sheet
- Prefetch estimate data on estimate list row hover

### 6.4 Slow Network (3G)

**Scenario:** User on mobile 3G connection.

**What happens:**
- Supabase queries take 500ms–2000ms per request
- Multiple parallel queries compound the delay
- No streaming — user sees overlay for the entire duration
- Large JS bundles take longer to download

**Estimated latency:** 2000ms–5000ms for heavy routes

**What should happen:**
- Streaming HTML from Server Components (partial content appears immediately)
- Aggressive caching (serve stale while revalidating)
- Reduced JS bundle size (code splitting)
- Prefetch on hover (data is already loading when user clicks)

### 6.5 Rapid Sequential Navigation

**Scenario:** User clicks through sidebar quickly: Projects → Library → Templates → Settings → back to Projects.

**What happens:**
- Each click triggers full data fetch
- Race conditions possible (earlier responses arrive after later ones)
- Loading overlay appears/disappears rapidly (250ms minimum timer may cause flicker)

**Estimated latency:** Cumulative 1500ms–4000ms

**What should happen:**
- Cancel in-flight queries on new navigation (React Query handles this with `queryClient.cancelQueries`)
- Cache recently-visited pages (serve from cache on revisit)
- Prefetch sidebar destinations on `/workshop` load

---

## 7. Summary of Findings

### Top 5 Bottlenecks (by impact)

| Rank | Bottleneck | Affected Routes | Estimated Latency |
|------|-----------|-----------------|-------------------|
| 1 | No prefetching — every navigation is a cold start | All workshop routes | 300–800ms per transition |
| 2 | No Suspense boundaries — entire route blocks | All workshop routes | Blocks until all data resolves |
| 3 | No code splitting — heavy components eagerly loaded | estimates, library, charts | 500ms–2s hydration |
| 4 | Server Components re-fetch on every render | All workshop routes | 200–500ms per fetch cycle |
| 5 | No bfcache — back/forward re-renders everything | All routes | 300–800ms back/forward |

### Quick Wins (Low Effort, High Impact)

| # | Change | Effort | Impact |
|---|--------|--------|--------|
| 1 | Increase `staleTime` to 5 minutes | 1 line | Instant revisits become free |
| 2 | Add `<Link prefetch>` to sidebar items | 5 lines | Next route RSC payload is preloaded |
| 3 | Add `loading.tsx` to heavy segments | 3 new files | Non-blocking navigation with skeletons |
| 4 | Code-split `AddComponentModal` | 3 lines | Removes 1500-line component from initial bundle |
| 5 | Consolidate 5 `useRouter()` in `ProjectEstimatesTable` | Refactor | Reduces router subscriptions, potential re-render source |

### Strategic Investments (High Effort, Highest Impact)

| # | Change | Effort | Impact |
|---|--------|--------|--------|
| 1 | Prefetch on hover (data prefetching) | Medium | Near-instant navigation for predictable paths |
| 2 | Streaming Server Components | Medium | Partial content appears immediately |
| 3 | Virtualized lists for projects/estimates/rows | High | Smooth scrolling with 1000s of items |
| 4 | bfcache optimization | Medium | Instant back/forward |
| 5 | Route-level bundle analysis and splitting | Medium | 30–50% JS reduction per route |

---

**Next:** See `02-blast-radius-analysis.md` for impact analysis of each proposed change.
