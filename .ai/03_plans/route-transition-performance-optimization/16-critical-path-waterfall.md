# 16 — Critical Path Waterfall Analysis

**Status:** Complete  
**Created:** 2026-05-29  
**Purpose:** Detailed server + client waterfall diagrams for the heaviest routes. Identifies exact timing of each step from click to interactive.

---

## Table of Contents

1. [Heaviest Route: Estimate Sheet Workspace](#1-heaviest-route-estimate-sheet-workspace)
2. [Second Heaviest: Component Library](#2-second-heaviest-component-library)
3. [Third Heaviest: Projects List](#3-third-heaviest-projects-list)
4. [Auth Flow: Login to Workshop](#4-auth-flow-login-to-workshop)
5. [Cross-Route Navigation: Projects → Estimate → Charts](#5-cross-route-navigation-projects--estimate--charts)
6. [Waterfall Optimization Opportunities](#6-waterfall-optimization-opportunities)

---

## 1. Heaviest Route: Estimate Sheet Workspace

**Route:** `/workshop/projects/[projectId]/estimates/[nodeId]`  
**Estimated total time (cold):** 800-1500ms  
**Components:** ~5,400 lines of client code

### Waterfall Diagram (Cold Navigation)

```
T+0ms    User clicks estimate row in ProjectEstimatesTable
         ├─ NavigationListener.show(href) fires immediately
         ├─ Overlay appears (dark scrim + spinner)
         └─ Next.js initiates navigation

T+0-50ms [Client] Route Transition
         ├─ router.push() called
         ├─ Next.js checks client-side cache (miss - cold)
         └─ HTTP request initiated to server

T+50-100ms [Network] Request to Server
         └─ Supabase Edge Function receives request

T+100-200ms [Server] Auth Check (proxy.ts)
         ├─ createSupabaseServerClient()
         ├─ supabase.auth.getUser() ← HTTP roundtrip to Supabase Auth
         ├─ Cookie validation + refresh
         └─ ~100ms latency

T+200-250ms [Server] Project Layout Rendering
         ├─ getCurrentWorkspaceProject(projectId)
         │   ├─ workspaceRepository.getCurrentWorkspace() [~20ms]
         │   ├─ projectsRepository.getById(projectId) [~15ms]
         │   └─ accessControl.checkAccess() [~15ms]
         ├─ Promise.all([
         │     getProjectCollaborationSummary() [~40ms],
         │     getProjectPublicationSummary() [~40ms],
         │     listProjectEstimateSheets() [~40ms]
         │   ]) ← PARALLEL ✓
         └─ Total: ~90ms (not 120ms sequential)

T+290-390ms [Server] Estimate Page Rendering
         ├─ Promise.all([
         │     getProjectEstimateTreeByNode(nodeId) [~100ms] ← HEAVIEST
         │     │   ├─ estimate_nodes SELECT + JOIN [~40ms]
         │     │   ├─ estimate_row_items SELECT [~30ms]
         │     │   ├─ Component calculations [~20ms]
         │     │   └─ Tree structure assembly [~10ms]
         │     │
         │     getCurrentWorkspaceComponentLibrary() [~80ms]
         │     │   ├─ component_categories SELECT [~15ms]
         │     │   ├─ suppliers SELECT [~10ms]
         │     │   ├─ brands SELECT [~10ms]
         │     │   ├─ component_folders SELECT [~10ms]
         │     │   └─ component_rows SELECT + JOIN [~35ms] ← heaviest subquery
         │     │
         │     requireCurrentUserContext() [~30ms]
         │     │   └─ (cached via React.cache() in session.ts)
         │   ]) ← PARALLEL ✓
         └─ Total: ~100ms (longest of the 3)

T+390-410ms [Server] HTML Generation
         ├─ React Server Components render to RSC payload
         ├─ RSC payload serialized
         └─ Response headers set (Cache-Control, etc.)

T+410-450ms [Network] Response Transfer
         └─ RSC payload transferred to client (~50-100KB)

T+450-550ms [Client] Hydration Phase 1 (Shell)
         ├─ React reconciles RSC payload
         ├─ ProjectLayout hydrates (WorkshopPageShell, ProjectMiniSidebar)
         ├─ EstimateSheetTree skeleton renders
         └─ Overlay still visible

T+550-650ms [Client] Hydration Phase 2 (Tree)
         ├─ EstimateSheetTree component loads (~1,300 lines)
         ├─ react-complex-tree initializes
         ├─ Tree model built from props
         └─ Tree renders (potentially 50+ nodes)

T+650-850ms [Client] Hydration Phase 3 (Content)
         ├─ EstimateSheetContent loads (~3,800 lines) ← MEGA COMPONENT
         ├─ CenterColumn renders
         ├─ EstimateRowTable renders (potentially 100+ rows)
         ├─ ResizableSidePanel renders
         └─ 46 useMemo + 35 useCallback hooks execute

T+850-950ms [Client] React Query Initialization
         ├─ useEstimateQuery() fires (if not prefetched)
         │   └─ HTTP request to estimateRepository.getEstimateTree()
         ├─ useEstimateAreaTreeQuery() fires
         │   └─ HTTP request to fetchEstimateTree()
         └─ Overlay still visible (waiting for queries)

T+950-1050ms [Client] Data Fetching
         ├─ Estimate tree query resolves [~80ms]
         ├─ Area tree query resolves [~80ms]
         └─ Component re-renders with fresh data

T+1050-1100ms [Client] Interactive
         ├─ All event handlers attached
         ├─ Overlay.hide() fires
         ├─ Overlay disappears (after 250ms min display)
         └─ User can interact

Total: ~1100ms (cold, no prefetch)
```

### Optimization Opportunities

1. **Auth check (T+100-200ms):** Move auth to middleware to avoid per-page HTTP roundtrip. **Saves ~100ms.**
2. **Project layout re-fetch:** Layout runs on every sub-navigation even when data hasn't changed. Add server-side caching. **Saves ~90ms.**
3. **Estimate tree query (T+290-390ms):** N+1 pattern in `getProjectEstimateTreeByNode`. Batch queries. **Saves ~40ms.**
4. **Code splitting (T+550-850ms):** Split EstimateSheetContent and EstimateSheetTree into separate chunks. **Saves ~200ms hydration time.**
5. **React Query prefetch (T+850-1050ms):** Prefetch on hover. **Saves ~200ms.**
6. **React.memo (T+650-850ms):** Memoize row components. **Saves ~50ms re-render time.**

**Total potential savings:** ~680ms (62% reduction)

---

## 2. Second Heaviest: Component Library

**Route:** `/workshop/library`  
**Estimated total time (cold):** 600-1000ms  
**Components:** ~2,100 lines of client code

### Waterfall Diagram (Cold Navigation)

```
T+0ms    User clicks "Components" in sidebar
         └─ NavigationListener.show(href)

T+0-50ms [Client] Route Transition
         └─ Next.js initiates navigation

T+50-100ms [Network] Request to Server

T+100-200ms [Server] Auth Check (proxy.ts)
         └─ supabase.auth.getUser() [~100ms]

T+200-280ms [Server] Library Page Rendering
         ├─ getCurrentWorkspaceComponentRowsLibrary()
         │   ├─ component_categories SELECT [~15ms]
         │   ├─ suppliers SELECT [~10ms]
         │   ├─ brands SELECT [~10ms]
         │   ├─ component_folders SELECT [~10ms]
         │   ├─ component_rows SELECT [~25ms] ← 500+ rows possible
         │   └─ Assembly + sorting [~10ms]
         └─ Total: ~80ms

T+280-300ms [Server] HTML Generation

T+300-340ms [Network] Response Transfer

T+340-440ms [Client] Hydration Phase 1 (Shell)
         └─ WorkshopPageShell hydrates

T+440-540ms [Client] Hydration Phase 2 (Manager)
         ├─ ComponentLibraryManager loads (~1,000 lines)
         ├─ 15 useMemo hooks execute
         └─ Filtering + tree building

T+540-640ms [Client] Hydration Phase 3 (Tree)
         ├─ LibraryFolderTree loads (~1,100 lines)
         ├─ react-complex-tree initializes
         └─ Tree renders (potentially 50+ folders)

T+640-700ms [Client] Interactive
         ├─ Overlay.hide() fires
         └─ User can interact

Total: ~700ms (cold, no prefetch)
```

### Optimization Opportunities

1. **Auth check:** Move to middleware. **Saves ~100ms.**
2. **Component rows query:** Batch with categories/suppliers/brands. **Saves ~20ms.**
3. **Code splitting:** Split ComponentLibraryManager and LibraryFolderTree. **Saves ~100ms.**
4. **Hover prefetch:** Prefetch RSC payload on sidebar hover. **Saves ~50ms.**

**Total potential savings:** ~270ms (39% reduction)

---

## 3. Third Heaviest: Projects List

**Route:** `/workshop/projects`  
**Estimated total time (cold):** 500-900ms  
**Components:** ~350 lines of client code (lightweight)

### Waterfall Diagram (Cold Navigation)

```
T+0ms    User clicks "Projects" in sidebar

T+0-50ms [Client] Route Transition

T+50-100ms [Network] Request to Server

T+100-200ms [Server] Auth Check (proxy.ts)
         └─ supabase.auth.getUser() [~100ms]

T+200-280ms [Server] Projects Page Rendering
         ├─ listCurrentWorkspaceProjects()
         │   ├─ workspaceRepository.getCurrentWorkspace() [~20ms]
         │   ├─ projectsRepository.listByWorkspace() [~25ms]
         │   ├─ For each project (N+1 pattern):
         │   │   ├─ Fetch estimate count [~5ms × N]
         │   │   ├─ Fetch last modified [~5ms × N]
         │   │   └─ Fetch thumbnail [~5ms × N]
         │   └─ Assembly [~10ms]
         └─ Total: ~80ms (10 projects) or ~130ms (20 projects)

T+280-300ms [Server] HTML Generation

T+300-340ms [Network] Response Transfer

T+340-400ms [Client] Hydration (Shell)
         └─ WorkshopPageShell hydrates

T+400-450ms [Client] Hydration (Client Component)
         ├─ ProjectsPageClient loads (~350 lines)
         └─ Project cards render (10-20 cards)

T+450-500ms [Client] Interactive
         └─ Overlay.hide() fires

Total: ~500ms (cold, 10 projects)
```

### Optimization Opportunities

1. **Auth check:** Move to middleware. **Saves ~100ms.**
2. **N+1 queries:** Batch project metadata fetches. **Saves ~30ms (10 projects).**
3. **Hover prefetch:** Prefetch RSC payload. **Saves ~50ms.**

**Total potential savings:** ~180ms (36% reduction)

---

## 4. Auth Flow: Login to Workshop

**Route:** `/login` → OAuth → `/workshop`  
**Estimated total time:** 2000-4000ms (includes external OAuth)

### Waterfall Diagram

```
T+0ms    User clicks "Sign in with Google"
         └─ Redirect to Google OAuth

T+0-1500ms [External] Google OAuth Flow
         ├─ Google auth page loads
         ├─ User authenticates
         └─ Redirect back to /auth/callback

T+1500-1600ms [Server] OAuth Callback (auth/callback/route.ts)
         ├─ Extract code from URL
         ├─ exchangeCodeForSession()
         │   └─ supabase.auth.exchangeCodeForSession(code) [~80ms]
         ├─ Set session cookies
         └─ Redirect to /workshop

T+1600-1700ms [Network] Redirect to Workshop

T+1700-1800ms [Server] Workshop Page (First Load)
         ├─ Auth check (proxy.ts)
         │   └─ supabase.auth.getUser() [~100ms] ← REDUNDANT (just set session)
         ├─ getWorkshopHomebaseData() [~80ms]
         └─ Total: ~180ms

T+1800-1900ms [Network] Response Transfer

T+1900-2100ms [Client] Hydration
         ├─ WorkshopPageShell hydrates
         ├─ WorkshopHomebaseClient hydrates
         └─ Project cards render

T+2100-2200ms [Client] Interactive
         └─ Overlay.hide() fires

Total: ~2200ms (includes 1500ms external OAuth)
```

### Optimization Opportunities

1. **Skip redundant auth check (T+1700-1800ms):** OAuth callback just set the session. Skip `getUser()` on first workshop load after auth. **Saves ~100ms.**
2. **Prefetch workshop data during OAuth:** While user is on Google, prefetch workshop data in background (service worker). **Saves ~80ms.**

**Total potential savings:** ~180ms (8% reduction, but OAuth dominates)

---

## 5. Cross-Route Navigation: Projects → Estimate → Charts

**Scenario:** User navigates through project segment  
**Total estimated time:** 1500-2500ms (3 navigations)

### Waterfall Diagram

```
=== NAVIGATION 1: Projects List → Project Detail ===

T+0ms    User clicks project card
         └─ NavigationListener.show(href)

T+0-50ms [Client] Route Transition

T+50-100ms [Network] Request

T+100-200ms [Server] Auth Check [~100ms]

T+200-290ms [Server] Project Layout
         ├─ getCurrentWorkspaceProject() [~50ms]
         ├─ Promise.all([collab, pub, estimates]) [~40ms]
         └─ Total: ~90ms

T+290-350ms [Server] Project Detail Page
         ├─ getCurrentWorkspaceProject() [~50ms] ← DUPLICATE (layout already called)
         └─ Total: ~50ms

T+350-370ms [Server] HTML Generation

T+370-410ms [Network] Response

T+410-510ms [Client] Hydration
         └─ ProjectDashboardClient renders

T+510-550ms [Client] Interactive
         └─ Overlay.hide()

Total: ~550ms

=== NAVIGATION 2: Project Detail → Estimates ===

T+550ms  User clicks "Estimates" in mini-sidebar

T+550-600ms [Client] Route Transition

T+600-650ms [Network] Request

T+650-750ms [Server] Auth Check [~100ms]

T+750-840ms [Server] Project Layout
         ├─ getCurrentWorkspaceProject() [~50ms] ← RE-FETCH (3rd time)
         ├─ Promise.all([collab, pub, estimates]) [~40ms] ← RE-FETCH (2nd time)
         └─ Total: ~90ms

T+840-900ms [Server] Estimates Page
         ├─ listProjectEstimates() [~60ms]
         └─ Total: ~60ms

T+900-920ms [Server] HTML Generation

T+920-960ms [Network] Response

T+960-1060ms [Client] Hydration
         └─ ProjectEstimatesTable renders

T+1060-1100ms [Client] Interactive

Total: ~550ms (second navigation)

=== NAVIGATION 3: Estimates → Charts ===

T+1100ms User clicks "Charts" in mini-sidebar

T+1100-1150ms [Client] Route Transition

T+1150-1200ms [Network] Request

T+1200-1300ms [Server] Auth Check [~100ms]

T+1300-1390ms [Server] Project Layout
         ├─ getCurrentWorkspaceProject() [~50ms] ← RE-FETCH (4th time!)
         ├─ Promise.all([collab, pub, estimates]) [~40ms] ← RE-FETCH (3rd time!)
         └─ Total: ~90ms

T+1390-1450ms [Server] Charts Page
         ├─ getProjectChartsData() [~60ms]
         └─ Total: ~60ms

T+1450-1470ms [Server] HTML Generation

T+1470-1510ms [Network] Response

T+1510-1610ms [Client] Hydration
         ├─ ProjectChartsClient renders
         └─ D3 chart components load (heavy)

T+1610-1700ms [Client] Charts Render
         ├─ ProjectCostDonutChart renders
         └─ ProjectCostBubbleChart renders

T+1700-1750ms [Client] Interactive

Total: ~650ms (third navigation, D3 adds ~50ms)
```

### Critical Issue: Project Layout Re-Fetches

**Problem:** The project layout runs on EVERY sub-navigation within the project segment:
- Navigation 1: Layout fetches project + collaboration + publication + estimates
- Navigation 2: Layout re-fetches the SAME data (project is already in browser)
- Navigation 3: Layout re-fetches AGAIN (3rd time in 2 seconds)

**Impact:** ~90ms wasted per navigation × 2 extra navigations = **180ms wasted**

**Solution:** Add server-side caching with `React.cache()` or `unstable_cache` keyed by `projectId` + user. Cache for 30 seconds (short enough to catch updates, long enough to avoid re-fetches during navigation).

### Optimization Opportunities

1. **Auth check:** Move to middleware. **Saves ~300ms (100ms × 3 navigations).**
2. **Project layout caching:** Cache layout data for 30s. **Saves ~180ms (90ms × 2 re-fetches).**
3. **Duplicate `getCurrentWorkspaceProject()`:** Already covered by `React.cache()` task in plan.
4. **Hover prefetch:** Prefetch next likely route. **Saves ~50ms per navigation.**

**Total potential savings:** ~530ms (35% reduction across 3 navigations)

---

## 6. Waterfall Optimization Opportunities (Summary)

| Optimization | Routes Affected | Time Saved | Effort | Priority |
|--------------|----------------|------------|--------|----------|
| **Move auth to middleware** | All workshop routes | ~100ms per nav | High | P1 |
| **Project layout caching** | All `/workshop/projects/[id]/*` | ~90ms per sub-nav | Medium | P1 |
| **Code splitting (EstimateSheetContent)** | Estimate workspace | ~200ms hydration | Low | P1 |
| **Code splitting (EstimateSheetTree)** | Estimate workspace | ~100ms hydration | Low | P1 |
| **Hover prefetch (RSC payload)** | All routes | ~50ms per nav | Low | P2 |
| **Hover prefetch (React Query)** | Estimate workspace only | ~200ms | Medium | P2 |
| **Batch N+1 queries** | Projects list, estimate tree | ~30-40ms | Medium | P2 |
| **React.memo on row components** | Estimate workspace | ~50ms re-render | Medium | P3 |
| **Skip redundant auth after OAuth** | Login → Workshop | ~100ms | Low | P3 |

**Total potential savings across all optimizations:** ~820ms per cold navigation (75% reduction)

---

**Next:** See `17-server-side-optimization-strategy.md` for implementation details on server-side optimizations.
