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
- **Page type:** Server Component (`listProjectEstimates()`) + Client Component (`ProjectEstimatesTable`)
- **Components:** `ProjectEstimatesTable` (846 lines)
- **Data fetching:** Server Component fetches estimate list via `listProjectEstimates()`. Table renders with inline editing, duplicate, and navigation actions using TanStack Table.
- **Bottleneck:**
  - **MANY ESTIMATE SHEETS:** If a project has 20+ estimates, the table renders all rows with inline edit fields, action buttons, and status indicators.
  - `ProjectEstimatesTable` instantiates `useNavigationRouter()` 5 separate times (lines 178, 265, 379, 499, 597) — each creates a Zustand subscription to the navigation store. The hook is already migrated from raw `useRouter()`, but 5 instances is still wasteful.
  - 8 inline sub-components (`ProjectEstimatesColGroup`, `SortIcon`, `ProjectEstimateFillerRows`, `ProjectEstimateRowActions`, `ProjectEstimateEditableTextCell`, `ProjectEstimateBudgetCell`, `ProjectEstimateSheetCodeCell`, `ProjectEstimatesColumnResizeHandle`).
  - Each editable cell independently calls `useNavigationRouter()`.
  - `@tanstack/react-table` is eagerly bundled with this route.
- **Perceived slowness with many estimates:** HIGH. Table rendering + hydration cost.
- **Optimization opportunity:** Virtualize the table. Consolidate 5 useNavigationRouter hook instantiations into 1 at the component top level. Paginate estimates.

#### `/workshop/projects/[projectId]/estimates/[nodeId]` (Estimate Workspace)
- **Page type:** Server Component (page fetches data) + Client Components (heavy)
- **Components:** `EstimateSheetTree` (1,365 lines), `EstimateSheetContent` (~4,048 lines — **the single heaviest component in the entire codebase**), `EstimateCenterColumnBoundary`, component library sidebar
- **Data fetching:** Page is a Server Component that calls `Promise.all([getProjectEstimateTreeByNode(), getCurrentWorkspaceComponentLibrary(), requireCurrentUserContext()])`. Client-side `use-estimate-query.ts` uses default `staleTime` (inherits global 30s). `useEstimateAreaTreeQuery` has optimistic update support with snapshot/restore/revision tracking.
- **Bottleneck:**
  - **`EstimateSheetContent` at ~4,048 lines** is the largest single component. It embeds 12+ sub-components inline: `ActivityFilterDropdown`, `AuditComponentSnapshotCard`, `AuditEventCard`, `AuditEventGroup`, `EventList`, `RowDetailsModal`, `ActivityScopeTree`, `ActivityHistoryModal`, `EstimateSheetHeader`, `RemoteEstimateCursorsOverlay`, `RemoteEstimateCursorMarker`, `CommandPalette`, `ProposalExportPreviewDialog`.
  - **`EstimateSheetTree` at 1,365 lines** renders the full React Complex Tree with drag-and-drop, inline rename, delete confirmations, context menus, and toast notifications. Uses ~15 refs, ~10 useState calls, ~20 useCallback/useMemo hooks.
  - **MANY ESTIMATE ROW ITEMS:** If an estimate sheet has 200+ row items across 20+ nodes, the tree rendering + row table rendering becomes expensive. React Complex Tree renders ALL nodes (no virtualization in the tree itself).
  - The component library sidebar (`EstimateRightSidebar`) loads the full library tree on mount.
  - `EstimateSheetTree` handles drag/drop with optimistic updates via `useMoveEstimateRowItem` (full optimistic → rollback → invalidate pattern).
  - Multiple `useTransition` calls for marking non-urgent updates.
  - Row mutations use per-row serial queueing (`enqueueRowUpdate`) with operation-level concurrency control and optimistic concurrency via `expectedRowRevision`.
- **Perceived slowness with many rows:** VERY HIGH. The combination of tree (~1,365 LOC) + content (~4,048 LOC) + library sidebar is the heaviest surface in the app. Combined ~5,400+ lines of client component code hydrate on every visit.
- **Optimization opportunity:** This is the #1 code splitting target. `EstimateSheetContent` should be `dynamic()` imported. Extract modals (`ActivityHistoryModal`, `RowDetailsModal`, `ProposalExportPreviewDialog`) into separate dynamic chunks. Virtualize row items. Lazy-load component library sidebar. Split estimate tree and content into separate Suspense boundaries. Prefetch estimate data on estimate list row hover.

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

**Root cause:** The loading overlay's `NavigationListener` uses `popstate` event listener, and the overlay portal may interact with the DOM in ways that prevent bfcache.

**Codebase audit result (verified):** There are **zero** `beforeunload` or `unload` event listeners anywhere in the codebase. No `Cache-Control: no-store` headers are set on workshop pages (only on `/api/share/*` routes and the proposal export endpoint). This means the codebase is **already bfcache-compatible** from a blocker perspective. The remaining work is: (a) verify the `popstate` listener + portal don't interfere with bfcache restore, and (b) add `pageshow` event handling to suppress the overlay on bfcache restores.

### 3.8 Auth Forces Dynamic Rendering (No Middleware)

**Problem:** There is **no `middleware.ts`** file in the project. Auth is enforced at the data-fetching layer: every workshop page calls repository functions that chain through `ensureDefaultWorkspace()` → `requireCurrentUserContext()` → `redirect("/login")`. This function calls `createSupabaseServerClient()` which reads `cookies()` + `headers()`, forcing all workshop pages to be dynamically rendered.

**Additional dynamic rendering force:** `WorkshopPageShell` (the shell component rendered by every workshop page) reads `cookies()` for side-panel width CSS variables via `getSidePanelWidthCssVariables()`. Even if auth were moved to middleware, this cookie read would still force dynamic rendering.

**Impact:** Zero workshop pages can be statically generated. Every page navigation triggers a full Supabase auth check + data fetch round-trip. This is the fundamental reason why Suspense/streaming is critical — we can't avoid the server round-trip, but we can stream partial content while data resolves.

### 3.9 Phosphor Icon Import Inconsistency

**Problem:** 3 files import Phosphor icons from the full client bundle path (`@phosphor-icons/react`) instead of the tree-shakeable SSR path (`@phosphor-icons/react/dist/ssr`):

1. `src/components/landing/ContactForm.tsx` — `EnvelopeOpen, Spinner`
2. `src/components/workshop/project-charts/ProjectChartsClient.tsx` — `Plus, X`
3. `src/components/workshop/projects-page-client.tsx` — `Cards, GridFour, Plus, Rows, SquaresFour`

The other 44+ files correctly use the SSR import path. The `next.config.ts` has `experimental.optimizePackageImports: ["@phosphor-icons/react"]` which helps, but the inconsistency could still pull in unnecessary client bundle size.

### 3.10 Landing Page Barrel Export

**Problem:** `src/components/landing/index.ts` re-exports **32 components** as a barrel export. The landing page (`src/app/page.tsx`) is a server component that imports from this barrel. While tree-shaking should handle unused exports, the barrel forces the bundler to analyze all 32 modules. Several of these components are below-the-fold (FAQ, Pricing, Partner, Testimonial, FinalCTA) and could be dynamically imported.

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
    mutations: {
      retry: 0,                  // Good — mutations shouldn't auto-retry
    },
  },
});
```

**Issue:** `staleTime: 30_000` means data is considered "stale" after 30 seconds. When a user navigates away and comes back within 30 seconds, the data is still fresh and served from cache. But after 30 seconds (common — user might spend 30+ seconds on another page), the data is re-fetched.

**Verified hooks using React Query:**

| Hook | queryKey | staleTime | File |
|------|----------|-----------|------|
| `useEstimateQuery` | `["estimate", estimateId]` | 30s (global default) | `use-estimate-query.ts` |
| `useEstimateAreaTreeQuery` | `["estimate", estimateId, "area-tree"]` | 30s (explicit) | `use-estimate-query.ts` |
| `useMoveEstimateRowItem` | (mutation) | N/A | `use-estimate-query.ts` |

**Note:** There are **zero** `useSuspenseQuery` calls in the codebase. All data fetching uses standard `useQuery`, which means no component-level Suspense integration with React Query.

**Recommendation:** Increase `staleTime` to `5 * 60_000` (5 minutes) for lists and `2 * 60_000` (2 minutes) for detail views.

### 4.2 Server Component Data Fetching

**Verified inventory of all Server Components that fetch data:**

| Route | Functions Called | Pattern |
|-------|-----------------|---------|
| `/workshop` | `getWorkshopHomebaseData()` | Single call → `ensureDefaultWorkspace()` → auth chain |
| `/workshop/projects` | `listCurrentWorkspaceProjects()` | Single call → auth chain |
| `/workshop/projects/[projectId]` (layout) | `getCurrentWorkspaceProject()` → then `Promise.all([getProjectCollaborationSummary(), getProjectPublicationSummary(), listProjectEstimateSheets()])` | **Waterfall:** sequential project fetch → parallel 3-query batch |
| `/workshop/projects/[projectId]` (page) | `getCurrentWorkspaceProject()` | Re-fetched (not deduplicated with layout) |
| `/workshop/projects/[projectId]/estimates` | `listProjectEstimates()` | Single call |
| `/workshop/projects/[projectId]/estimates/[nodeId]` | `Promise.all([getProjectEstimateTreeByNode(), getCurrentWorkspaceComponentLibrary(), requireCurrentUserContext()])` | Parallel 3-query batch |
| `/workshop/projects/[projectId]/charts` | `getProjectChartsData()` | Single call (4 sub-queries via Promise.all) |
| `/workshop/library` | `getCurrentWorkspaceComponentRowsLibrary()` | Single call (3-phase parallel fetch internally) |
| `/workshop/templates` | `getCurrentWorkspaceEstimateTemplates()` | Single call |

**Key patterns:**
- All repository functions use `createSupabaseServerClient()` which reads `cookies()` + `headers()`, forcing dynamic rendering
- `getCurrentWorkspaceProject()` is called in BOTH the layout AND the page — no deduplication across the layout/page boundary (React `cache()` would fix this)
- `ensureDefaultWorkspace()` is called at the start of most functions — it creates the workspace if none exists
- `getCurrentUserContext()` is the only function wrapped in React `cache()` (in `src/lib/auth/session.ts`)

### 4.3 Mutation Patterns (Verified)

The codebase has **sophisticated optimistic update patterns** already in place:

**Pattern A: Full optimistic mutation** (`useMoveEstimateRowItem`):
- `onMutate`: cancel queries → snapshot → apply optimistic update
- `onError`: rollback to snapshot
- `onSettled`: invalidate queries

**Pattern B: Per-row optimistic patching** (`useEstimateRowMutations`):
- Uses `rowOperationIdsRef` for operation-level concurrency control
- Uses `rowUpdateQueuesRef` for per-row serial queueing (`enqueueRowUpdate`)
- Each mutation gets a `mutationId` (UUID) and `expectedRowRevision` for optimistic concurrency
- `snapshot()` / `restore()` / `prepareOptimisticUpdate()` enable external rollback
- All `invalidateQueries` calls use `refetchType: "none"` — marks stale but does NOT trigger immediate refetch

**Pattern C: Server-side revalidation** (`src/lib/estimates/actions.ts`):
- `revalidatePath()` called after create/delete estimate mutations
- Targets: `/workshop/projects/${projectId}`, `/workshop/projects/${projectId}/estimates`, `/workshop/projects/${projectId}/charts`

### 4.4 Repository Architecture

**Verified repository inventory:**

| Repository | Lines | Type | Key Functions |
|-----------|-------|------|---------------|
| `workspace-repository.ts` | 1,160 | Server-only | `ensureDefaultWorkspace`, `listCurrentWorkspaceProjects`, `getWorkshopHomebaseData`, `getCurrentWorkspaceProject`, `getProjectCollaborationSummary`, `getProjectPublicationSummary`, `listProjectEstimates`, `listProjectEstimateSheets`, `getProjectEstimateTreeByNode` |
| `component-library-repository.ts` | 787 | Server-only | `getCurrentWorkspaceComponentRowsLibrary`, `getCurrentWorkspaceEstimateTemplates`, `getCurrentWorkspaceComponentLibrary` |
| `project-charts-repository.ts` | 245 | Server-only | `getProjectChartsData` |
| `estimate-repository.ts` | 215 | Dual (browser) | `getEstimateTree`, `moveEstimateRowItem`, `insertEstimateRowItem`, `updateEstimateRowItem`, `deleteEstimateRowItem` |
| `cost-library-repository.ts` | 86 | Dual (browser) | `listCostLibraryItems`, `createCostLibraryItem`, `updateCostLibraryItem` |
| `estimate-schema-compat.ts` | 37 | Utility | `isMissingColumnError`, `isMissingRelationError`, `normalizeEstimateRecord` |

**Key insight:** The server-side repositories are plain async functions with no caching. The browser-side repositories (`estimate-repository.ts`, `cost-library-repository.ts`) use a dual-mode pattern — auto-selecting between Supabase browser client and in-memory Map based on `hasSupabaseBrowserEnv()`.

### 4.5 What's Missing

- **Zero** `unstable_cache` usage anywhere
- **Zero** `"use cache"` directives anywhere
- **Zero** `cacheLife` / `cacheTag` usage anywhere
- **Zero** `useSuspenseQuery` calls
- **Zero** Suspense boundaries
- **Zero** `loading.tsx` or `error.tsx` files
- **Zero** streaming Server Components
- Only **1** `React.cache()` usage (auth/session.ts)
- No per-request deduplication of repository calls across layout/page boundaries

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

| Component | File | Lines | Estimated Impact |
|-----------|------|-------|-----------------|
| `EstimateSheetContent` | `EstimateSheetContent.tsx` | **~4,048** | Largest component in codebase. 12+ embedded sub-components, modals, activity history, proposal export. |
| `AddComponentModal` | `AddComponentModal.tsx` | **~2,354** | Complex form: image upload, multi-variant management, cost entry manager, attachment upload, folder tree picker. |
| `EstimateSheetTree` | `EstimateSheetTree.tsx` | **1,365** | React Complex Tree + drag/drop + inline rename + context menu + optimistic updates. ~15 refs, ~10 useState. |
| `LibraryFolderTree` | `LibraryFolderTree.tsx` | **~1,172** | Heavy tree component using react-complex-tree. |
| `ComponentLibraryManager` | `ComponentLibraryManager.tsx` | **1,009** | Full component management + modals. |
| `ProjectEstimatesTable` | `ProjectEstimatesTable.tsx` | **846** | TanStack Table + 5 useNavigationRouter + 8 inline sub-components + inline editing. |
| `WorkshopHomebaseClient` | `WorkshopHomebaseClient.tsx` | **482** | Bento grid with favorites, invite banner, star toggling. |
| `ProjectDetailsModal` | `ProjectDetailsModal.tsx` | **375** | Image upload, currency combobox, form with server action. |
| `ProjectChartsClient` | `ProjectChartsClient.tsx` | **283** | Chart orchestrator (D3 isolated in child components). |

None of these are code-split. All are eagerly loaded in their parent routes. The top 4 components alone total **~8,943 lines** of client JavaScript that hydrates on navigation.

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
| 2 | Add `loading.tsx` to heavy segments | 5 new files | Non-blocking navigation with skeletons |
| 3 | Code-split `EstimateSheetContent` (~4,048 lines) with `next/dynamic` | 3 lines | Removes the single largest component from initial bundle |
| 4 | Code-split `AddComponentModal` (~2,354 lines) with `next/dynamic` | 3 lines | Removes massive modal from initial bundle |
| 5 | Consolidate 5 `useNavigationRouter()` in `ProjectEstimatesTable` | Refactor | Reduces Zustand subscriptions, potential re-render source |
| 6 | Fix 3 files importing Phosphor icons from wrong path | 3 lines | Consistent tree-shaking |
| 7 | Add React `cache()` to repository functions | 5 files | Deduplicates Supabase calls within same render pass |

### Strategic Investments (High Effort, Highest Impact)

| # | Change | Effort | Impact |
|---|--------|--------|--------|
| 1 | Prefetch on hover (data prefetching) | Medium | Near-instant navigation for predictable paths |
| 2 | Streaming Server Components with Suspense boundaries | Medium | Partial content appears immediately while data resolves |
| 3 | Virtualized lists for projects/estimates/rows | High | Smooth scrolling with 1000s of items |
| 4 | bfcache optimization (codebase already has zero blockers) | Low-Medium | Instant back/forward — only need `pageshow` handling in overlay |
| 5 | Route-level bundle analysis and code splitting | Medium | 30–50% JS reduction per route (top 4 components = ~8,943 lines) |
| 6 | Extract WorkshopPageShell `cookies()` read to middleware | Medium | Would unlock static generation for non-auth workshop data (future) |

---

**Next:** See `02-blast-radius-analysis.md` for impact analysis of each proposed change.
