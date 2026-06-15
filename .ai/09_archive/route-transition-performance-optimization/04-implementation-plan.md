# 04 — Implementation Plan: Phased Route Transition Performance Optimization

> ⚠️ **SUPERSEDED — DO NOT IMPLEMENT FROM THIS DOCUMENT.** Task 1.5.1 ("Migrate Proxy.ts to Next.js Middleware — create src/middleware.ts, delete src/proxy.ts") is WRONG for Next.js 16 where proxy.ts IS the active middleware. Task 2.2 uses fake React Query keys that don't exist. Dynamic import examples in Task 1.3 use default-import syntax (will fail with named exports). See `CURRENT_CANONICAL_PLAN.md` for the corrected phased plan, `IMPLEMENTATION_MATRIX.md` for task-by-task status, and `ADR_UPDATES.md` for all corrected ADRs. The general phase structure and non-code-splitting tasks remain directionally useful as historical context.

**Status:** SUPERSEDED  
**Created:** 2026-05-29  
**Superseded by:** `CURRENT_CANONICAL_PLAN.md`, `IMPLEMENTATION_MATRIX.md`, `ADR_UPDATES.md`  
**Implementation Start:** ⏳ Pending owner approval — use canonical docs only

> **⚠️ READ FIRST:** Before implementing ANY loading UI, read `33-loading-sequence-progressive-enhancement.md` — it defines the exact UX timeline for all navigation scenarios. Every loading state (skeletons, overlay, bfcache) must follow this unified sequence.

---

## Table of Contents

1. [Phase Overview](#1-phase-overview)
2. [Phase 0: Instrumentation & Baseline](#2-phase-0-instrumentation--baseline)
3. [Phase 1: Quick Wins (Low Effort, High Impact)](#3-phase-1-quick-wins-low-effort-high-impact)
4. [Phase 2: Strategic Investments (Medium Effort, Highest Impact)](#4-phase-2-strategic-investments-medium-effort-highest-impact)
5. [Phase 3: Peak-Load Hardening (High Effort, Targeted Impact)](#5-phase-3-peak-load-hardening-high-effort-targeted-impact)
6. [Phase 4: Monitoring & Continuous Optimization](#6-phase-4-monitoring--continuous-optimization)
7. [Dependency Graph](#7-dependency-graph)
8. [File Inventory (Complete)](#8-file-inventory-complete)

---

## 1. Phase Overview

```
Phase 0: Instrumentation    (Day 0)      → Measure before you cut
Phase 1: Quick Wins         (Day 0–1)    → Instant 30–50% improvement
Phase 1.5: Critical Infra   (Day 1–2)    → Fix critical bottlenecks (proxy.ts, React.memo, caching, errors)
Phase 2: Strategic          (Day 2–4)    → Near-instant navigation for most routes
Phase 3: Peak-Load          (Day 4–6)    → Graceful degradation under heavy data
Phase 4: Monitoring         (Ongoing)    → Don't regress
```

| Phase | Techniques | Key Metric Target | Effort | Risk |
|-------|-----------|-------------------|--------|------|
| 0 | Performance instrumentation, baseline collection | Establish baseline | 2h | NONE |
| 1 | `staleTime` increase, `loading.tsx`, code splitting, React `cache()`, overlay delay, Three.js dynamic import, font optimization | 50% faster revisits | 6–8h | LOW |
| 1.5 | Proxy.ts → middleware, React.memo, project layout caching, error boundaries | Eliminate 100-200ms auth latency, 10x faster re-renders | 8–12h | MEDIUM |
| 2 | Hover prefetch, Suspense in layouts, bfcache, bundle analysis, N+1 fixes | <100ms cold transitions | 8–12h | LOW-MED |
| 3 | Virtualized lists, streaming, component-level Suspense | <500ms with 200+ rows | 8–12h | MED |
| 4 | Performance regression CI, monitoring | No regressions | Ongoing | NONE |

---

## 2. Phase 0: Instrumentation & Baseline

**Goal:** You can't improve what you don't measure. Establish quantitative baseline before ANY optimization.

### Step 0.1: Install Developer Tooling

```bash
bun add -D @next/bundle-analyzer
bun add -D @tanstack/react-query-devtools
```

### Step 0.2: Add Performance Monitor Component

**File to create:** `src/components/performance-monitor.tsx`

```tsx
"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function PerformanceMonitor() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Use requestAnimationFrame to measure after paint
    requestAnimationFrame(() => {
      const navEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
      if (!navEntry) return;

      const metrics = {
        route: pathname,
        type: navEntry.type, // "navigate" | "reload" | "back_forward" | "prerender"
        duration: Math.round(navEntry.duration),
        domContentLoaded: Math.round(navEntry.domContentLoadedEventEnd),
        domComplete: Math.round(navEntry.domComplete),
        transferSize: navEntry.transferSize,
      };

      console.log("[Perf] Navigation:", metrics);

      // Send to analytics in production (placeholder)
      if (process.env.NODE_ENV === "production") {
        // analytics.track("route_transition", metrics);
      }
    });
  }, [pathname, searchParams]);

  return null;
}
```

**File to modify:** `src/app/providers.tsx`
- Add `<PerformanceMonitor />` inside `AppProviders` (before `NavigationListener`).

### Step 0.3: Configure Bundle Analyzer

**File to modify:** `next.config.ts`

```typescript
import withBundleAnalyzer from "@next/bundle-analyzer";

const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default withAnalyzer({
  // existing config
});
```

### Step 0.4: Record Baseline Metrics

Run the following and record results in `baseline-metrics.md`:

```bash
# 1. Build and check per-route JS sizes
bun run build 2>&1 | tee build-output.txt

# 2. Analyze bundle
ANALYZE=true bun run build

# 3. Start production server
bun run start

# 4. Manual testing with DevTools Performance tab
#    - Open Chrome, go to localhost:3000
#    - Enable CPU 4x slowdown + Fast 3G network
#    - Run all benchmark scenarios from 05-benchmark-scenarios.md
#    - Record results
```

**Deliverable:** `baseline-metrics.md` with before/after comparison table.

**QA Check:** None — this is measurement only.

### Step 0.5: Create Peak-Load Seed Data

**File to create:** `scripts/seed-performance-test-data.ts`

Generates:
- 50 projects with thumbnails
- 30 estimate sheets per project
- 200 row items per estimate sheet
- 500 component library items

**QA Check:** Run seed script. Verify data appears in the app. Delete after testing.

---

## 3. Phase 1: Quick Wins (Low Effort, High Impact)

**Goal:** 30–50% reduction in navigation latency with minimal code changes. All changes are independently revertible.

### Task 1.1: Increase React Query `staleTime`

**File:** `src/app/providers.tsx` (line 14)  
**Change:** `staleTime: 30_000` → `staleTime: 5 * 60_000`  
**Rationale:** Data stays "fresh" for 5 minutes instead of 30 seconds. Revisits within 5 minutes serve from cache.

```diff
- staleTime: 30_000,
+ staleTime: 5 * 60_000, // 5 min — navigation revisits serve from cache
```

**Files also to check:** `src/hooks/use-estimate-query.ts` (line 41) — same `staleTime: 30_000` override. Consider removing the override to inherit the global default, or increase to match.

**QA Check:**
1. Navigate `/workshop` → `/workshop/projects` → back to `/workshop` within 30 seconds.
2. Open React Query DevTools. Verify "Projects" query shows `staleTime: 300000` and status is "fresh" on revisit.
3. Verify data mutations (e.g., create project) still invalidate relevant queries and show fresh data.

### Task 1.2: Add `loading.tsx` Skeleton Files

**Files to create:**

#### `src/app/workshop/projects/loading.tsx`
```tsx
export default function ProjectsLoading() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 p-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-48 rounded bg-muted animate-pulse" />
      ))}
    </div>
  );
}
```

#### `src/app/workshop/projects/[projectId]/loading.tsx`
```tsx
export default function ProjectDetailLoading() {
  return (
    <div className="p-6 space-y-4">
      <div className="h-8 w-64 rounded bg-muted animate-pulse" />
      <div className="h-4 w-48 rounded bg-muted animate-pulse" />
      <div className="grid grid-cols-3 gap-4 mt-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 rounded bg-muted animate-pulse" />
        ))}
      </div>
    </div>
  );
}
```

#### `src/app/workshop/projects/[projectId]/estimates/loading.tsx`
```tsx
export default function EstimatesLoading() {
  return (
    <div className="p-4 space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-10 rounded bg-muted animate-pulse" />
      ))}
    </div>
  );
}
```

#### `src/app/workshop/projects/[projectId]/estimates/[nodeId]/loading.tsx`
```tsx
export default function EstimateWorkspaceLoading() {
  return (
    <div className="flex h-full">
      <div className="w-56 border-r p-2 space-y-1">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-6 rounded bg-muted animate-pulse" />
        ))}
      </div>
      <div className="flex-1 p-4 space-y-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-8 rounded bg-muted animate-pulse" />
        ))}
      </div>
    </div>
  );
}
```

#### `src/app/workshop/library/loading.tsx`
```tsx
export default function LibraryLoading() {
  return (
    <div className="flex h-full">
      <div className="w-56 border-r p-2 space-y-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-6 rounded bg-muted animate-pulse" />
        ))}
      </div>
      <div className="flex-1 p-4 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 rounded bg-muted animate-pulse" />
        ))}
      </div>
    </div>
  );
}
```

**QA Check:**
1. Navigate to each route with network throttling (Fast 3G).
2. Verify skeleton appears immediately on click (within 50ms).
3. Verify skeleton is replaced by real content when data resolves.
4. Verify no layout shift between skeleton and real content (or minimal CLS < 0.1).

### Task 1.3: Code-Split Heavy Components with `next/dynamic`

**Priority targets by size (verified line counts):**

| Component | Lines | Current Import Location |
|-----------|-------|------------------------|
| `EstimateSheetContent` | ~4,048 | `estimates/[nodeId]/page.tsx` |
| `AddComponentModal` | ~2,354 | `ComponentLibraryManager.tsx` |
| `EstimateSheetTree` | 1,365 | `estimates/[nodeId]/page.tsx` |
| `LibraryFolderTree` | ~1,172 | `ComponentLibraryManager.tsx` |
| `ComponentLibraryManager` | 1,009 | `library/page.tsx` |
| `ProjectCostDonutChart` | ~130 | `ProjectChartsClient.tsx` |
| `ProjectCostBubbleChart` | ~130 | `ProjectChartsClient.tsx` |

**Files to modify:**

#### A. `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx` — **HIGHEST PRIORITY**

**⚠️ VERIFIED:** `EstimateSheetContent` and `EstimateSheetTree` use NAMED exports (`export function`), not default exports. See `14-code-splitting-named-exports.md`.

```typescript
// Before: direct import of ~4,048-line component + ~1,365-line tree
// After:
import dynamic from "next/dynamic";

const EstimateSheetContent = dynamic(
  () => import("@/components/workshop/EstimateSheetContent").then(mod => mod.EstimateSheetContent),
  { loading: () => <EstimateWorkspaceSkeleton /> }
);

const EstimateSheetTree = dynamic(
  () => import("@/components/workshop/EstimateSheetTree").then(mod => mod.EstimateSheetTree),
  { loading: () => <TreeSkeleton /> }
);
```

#### B. `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`
```typescript
const AddComponentModal = dynamic(
  () => import("@/components/workshop/component-library-manager/AddComponentModal").then(mod => mod.AddComponentModal),
  { loading: () => <ModalSkeleton /> }
);

const LibraryFolderTree = dynamic(
  () => import("@/components/workshop/component-library-manager/LibraryFolderTree").then(mod => mod.LibraryFolderTree),
  { loading: () => <TreeSkeleton /> }
);
```

#### C. `src/app/workshop/library/page.tsx`
```typescript
const ComponentLibraryManager = dynamic(
  () => import("@/components/workshop/component-library-manager/ComponentLibraryManager").then(mod => mod.ComponentLibraryManager),
  { loading: () => <LibrarySkeleton /> }
);
```

#### D. `src/app/workshop/projects/[projectId]/charts/page.tsx`
```typescript
const ProjectCostDonutChart = dynamic(
  () => import("@/components/workshop/project-charts/ProjectCostDonutChart").then(mod => mod.ProjectCostDonutChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
const ProjectCostBubbleChart = dynamic(
  () => import("@/components/workshop/project-charts/ProjectCostBubbleChart").then(mod => mod.ProjectCostBubbleChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
```

**Note:** D3 is already well-isolated in these two chart components (enforced by test in `project-dashboard-ui.test.ts`). Using `ssr: false` is safe here — charts are purely client-rendered visualizations.

**Estimated bundle impact:** Removing ~8,943 lines of client code from initial route bundles. The estimate workspace alone sheds ~5,413 lines (EstimateSheetContent + EstimateSheetTree).

**QA Check:**
1. `bun run build` — verify no errors.
2. Check build output for new chunks (e.g., `NewProjectModal-[hash].js`).
3. Verify modals still open correctly when triggered.
4. Verify skeleton appears while chunk loads on slow network.

### Task 1.4: Add React `cache()` to Repository Functions

**Verified current state:** Only `src/lib/auth/session.ts` uses `React.cache()` (wraps `getCurrentUserContext`). All other repository functions are plain async functions with no deduplication.

**Critical deduplication opportunity:** `getCurrentWorkspaceProject(projectId)` is called in BOTH `projects/[projectId]/layout.tsx` AND `projects/[projectId]/page.tsx`. Without `cache()`, this results in 2 identical Supabase queries per navigation.

**Files to modify:** `src/lib/repositories/workspace-repository.ts`

Wrap exported async functions in React's `cache()` to deduplicate calls within a single render:

```typescript
import { cache } from "react";

export const getCurrentWorkspaceProject = cache(async (projectId: string) => {
  // existing implementation
});

export const getProjectCollaborationSummary = cache(async (projectId: string) => {
  // existing implementation
});

export const getProjectPublicationSummary = cache(async (projectId: string) => {
  // existing implementation
});

export const listProjectEstimateSheets = cache(async (projectId: string) => {
  // existing implementation
});
```

Repeat for other repositories: `component-library-repository.ts`, `project-charts-repository.ts`.

**Note:** `estimate-repository.ts` and `cost-library-repository.ts` are browser-side dual-mode repositories — `React.cache()` only works in Server Components. Skip these.

**Scope clarification:** `React.cache()` deduplicates within a single React render pass (one request). It does NOT persist data across navigations. For cross-navigation caching, rely on React Query's `staleTime` increase (Task 1.1).

**QA Check:**
1. `bun run build` — verify no errors.
2. In `[projectId]/layout.tsx`, the 4 parallel queries already use `Promise.all`. With `cache()`, if any other component in the same request also calls these functions, the cached result is used instead of a duplicate Supabase call.
3. `bun run validate` — verify tests pass (some tests may mock these functions — ensure `cache()` wrapper doesn't break mocks).

### Task 1.5: Add Show Delay to Loading Overlay

**File to modify:** `src/stores/navigation-ui-store.ts`

**Changes:**
1. Add a `SHOW_DELAY_MS = 150` constant.
2. Add a `showTimer` variable for the show delay.
3. Modify `show()` to use the delay timer.
4. Remove `MIN_DISPLAY_MS` (the minimum display timer).
5. Update `clearTimers()` to clear the show timer.

```typescript
const SHOW_DELAY_MS = 150; // Only show overlay if navigation takes > 150ms
const SAFETY_TIMEOUT_MS = 10_000;

let showTimer: ReturnType<typeof setTimeout> | null = null;
let safetyTimer: ReturnType<typeof setTimeout> | null = null;

function clearTimers() {
  if (showTimer) { clearTimeout(showTimer); showTimer = null; }
  if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null; }
}

show: (targetHref = null) => {
  clearTimers();
  
  showTimer = setTimeout(() => {
    showTimer = null;
    set({ isNavigating: true, startTime: Date.now(), targetHref });
    
    safetyTimer = setTimeout(() => {
      safetyTimer = null;
      set({ isNavigating: false, targetHref: null });
    }, SAFETY_TIMEOUT_MS);
  }, SHOW_DELAY_MS);
},

hide: () => {
  clearTimers();
  set({ isNavigating: false, targetHref: null });
},
```

**QA Check:**
1. Navigate between pages on fast connection (no throttle).
2. Verify overlay does NOT appear for transitions that complete in < 150ms.
3. Throttle to Slow 3G. Navigate. Verify overlay DOES appear after 150ms delay.
4. Verify rapid sequential navigation doesn't leave overlay stuck (hide cancels show timer).
5. Verify safety timeout (10s) still works.

### Task 1.6: Consolidate `useNavigationRouter()` in `ProjectEstimatesTable`

**File to modify:** `src/components/workshop/ProjectEstimatesTable.tsx` (846 lines)

**Current:** 5 separate `useNavigationRouter()` calls at lines 178, 265, 379, 499, 597. Each creates a Zustand subscription to the navigation store. The component has already been migrated from raw `useRouter()` to the custom hook, but 5 instances is wasteful.

**Target:** 1 `useNavigationRouter()` at component top level. Pass router methods to inner functions via closure.

**Refactoring approach:**
1. Keep `useNavigationRouter` import (already correct).
2. Call once at top: `const router = useNavigationRouter();`
3. Inner functions (sub-components like `ProjectEstimateRowActions`, `ProjectEstimateEditableTextCell`) that reference `router.refresh()` now close over the single instance.
4. The 8 inline sub-components (`ProjectEstimatesColGroup`, `SortIcon`, `ProjectEstimateFillerRows`, `ProjectEstimateRowActions`, `ProjectEstimateEditableTextCell`, `ProjectEstimateBudgetCell`, `ProjectEstimateSheetCodeCell`, `ProjectEstimatesColumnResizeHandle`) can access `router` via closure since they're defined inline.

**QA Check:**
1. Verify all 5 navigation scenarios still work:
   - Row click → estimate workspace navigation
   - Row actions → router.refresh() after mutations
   - Duplicate sheet → router.refresh()
   - Create estimate → router.push()
   - Any other programmatic navigation
2. `bun run test` — verify existing tests pass (12 test files mock `useRouter`).
3. No console errors or warnings.

### Phase 1 Verification Gate

```bash
bun run build         # Must pass
bun run validate      # Must pass
bun run test:e2e      # Must pass (or note pre-existing failures)
```

**Expected improvement:** 30–50% faster revisits (cached), skeleton screens replace blank screens, overlay appears less frequently.

### Task 1.7: Three.js Dynamic Import (Landing Page)

**⚠️ CRITICAL LOCATION CORRECTION:** The `NeatWireframeBackground` is NOT below the fold. It renders inside `HeroSection` (`src/components/landing/HeroSection.tsx:44`), which is the **above-fold hero** — the first thing users see. An IntersectionObserver lazy-load strategy will NOT defer loading because the element is already in the initial viewport. See `20-font-and-bundle-optimization.md` §2 for full analysis.

**Problem:** Landing page loads ~150KB of Three.js via `@firecms/neat` statically imported in the hero section. This Three.js bundle blocks initial render of the hero content (headline, CTA). Three.js is ~65% of the landing page JS bundle.

**Goal:** Defer Three.js loading off the critical path so the hero headline and CTA render immediately.

**Strategy:** Use `next/dynamic` with `ssr: false` and a CSS gradient placeholder. The hero section renders a CSS gradient immediately (no Three.js), then the Three.js chunk loads asynchronously and hydrates the WebGL canvas when ready.

**File to modify:** The component that renders `NeatWireframeBackground` (currently `src/components/landing/HeroSection.tsx`), or create a wrapper:

```typescript
// Option A: Wrapper component or in page.tsx
import dynamic from "next/dynamic";

const NeatWireframeBackground = dynamic(
  () => import("@/components/landing/NeatWireframeBackground").then(mod => mod.NeatWireframeBackground),
  {
    ssr: false,
    loading: () => (
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 50%, rgba(255,127,45,0.3), transparent 70%)",
        }}
        aria-hidden="true"
      />
    ),
  }
);
```

**Note:** An alternative approach (Option B from doc 20) is to replace the Three.js gradient entirely with CSS. The hero section already has multiple `radial-gradient` and `linear-gradient` layers (`HeroSection.tsx:33-39`), so adding one more CSS layer would be visually consistent and eliminate the ~150KB entirely.

**QA Check:**
1. Load landing page with network throttling (Fast 3G).
2. Verify hero headline and CTA render immediately (within 1s).
3. Verify Three.js chunk loads asynchronously (check Network tab for the dynamic chunk).
4. Verify no FOIT-like visual glitch (CSS placeholder should mask the transition).
5. If using CSS-only replacement (Option B), verify the hero gradient matches the original visual design.

**Expected impact:** ~150KB deferred off critical path. Hero content renders without waiting for Three.js (~200ms faster LCP for hero headline/CTA).

### Task 1.8: Font Loading Optimization

**Problem:** Root layout loads 4 Google Fonts (Inter, Poppins, Roboto Mono, Source Serif 4) on every page. Landing page only uses Inter. This adds ~300KB of unused fonts.

**File to modify:** `src/app/layout.tsx`

**Change:** Move workshop-specific fonts to workshop layout:

```typescript
// src/app/layout.tsx — keep only Inter
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
```

**⚠️ ARCHITECTURAL CAVEAT:** There is currently **NO `src/app/workshop/layout.tsx`**. Every workshop page independently renders `<WorkshopPageShell>` in its `page.tsx`. Creating a new workshop layout would introduce Next.js nested layout semantics — the workshop layout would wrap ALL workshop pages and could affect the component tree, `WorkshopPageShell` usage, and shared state boundaries.

**Two approaches:**

1. **Create `src/app/workshop/layout.tsx`** (new file) — Adds 3 fonts only to workshop routes. Requires:
   - Verify no workshop page uses `WorkshopPageShell` outside the layout.
   - Test that nested layout doesn't break any page's rendering.
   - Confirm WorkshopPageShell's cookie reads still work inside the layout context.

2. **Keep fonts in root layout but use `font-display: swap`** — Simpler. The fonts still load on all pages but via `swap` they don't block rendering. This avoids the architectural change but doesn't reduce bytes on the landing page.

**Approach 1 implementation:**

```typescript
// src/app/workshop/layout.tsx (new workshop layout)
import { Poppins, Roboto_Mono, Source_Serif_4 } from "next/font/google";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-poppins" });
const robotoMono = Roboto_Mono({ subsets: ["latin"], variable: "--font-mono" });
const sourceSerif = Source_Serif_4({ subsets: ["latin"], variable: "--font-serif" });

export default function WorkshopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${poppins.variable} ${robotoMono.variable} ${sourceSerif.variable}`}>
      {children}
    </div>
  );
}
```

**File to audit:** All pages that use Poppins, Roboto Mono, or Source Serif 4 — verify they're inside `/workshop` routes.

**QA Check:**
1. Load landing page. Check Network tab — verify only Inter font loads.
2. Navigate to `/workshop/projects`. Verify Poppins, Roboto Mono, Source Serif 4 load.
3. Verify no FOIT (Flash of Invisible Text) or FOUT (Flash of Unstyled Text).
4. Verify all typography renders correctly on all pages.

**Expected impact:** ~300KB reduction in landing page bundle, ~200ms faster FCP on landing page.

### Phase 1 Verification Gate (Updated)

```bash
bun run build         # Must pass
bun run validate      # Must pass
bun run test:e2e      # Must pass (or note pre-existing failures)
```

**Expected improvement:** 30–50% faster revisits (cached), skeleton screens replace blank screens, overlay appears less frequently, landing page critical path ~450KB lighter (Three.js deferred + font reduction — see caveat: Three.js is in above-fold hero, so it's deferred from critical path but not eliminated; see Task 1.7 for strategy details).

---

## 4. Phase 1.5: Critical Infrastructure (Medium Effort, Critical Impact)

**Goal:** Fix critical server-side bottlenecks and client-side inefficiencies discovered in deep audit. These are not "quick wins" but are essential for achieving sub-100ms navigation.

### Task 1.5.1: Migrate Proxy.ts to Next.js Middleware

**Problem:** `src/proxy.ts` runs on every request and adds ~100-200ms latency due to `supabase.auth.getUser()` HTTP roundtrip. This is the single largest server-side bottleneck.

**File to create:** `src/middleware.ts`

**Change:** Migrate auth logic to Edge-compatible middleware:

```typescript
// src/middleware.ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // Refresh session if expired (uses getSession() which is local JWT validation, not HTTP)
  await supabase.auth.getSession();

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
```

**File to delete:** `src/proxy.ts`

**Files to modify:** Remove all `import { proxy } from "@/proxy"` statements from pages.

**Critical difference:** `getSession()` validates the JWT locally (no HTTP request), while `getUser()` always makes an HTTP roundtrip to Supabase Auth API. This saves ~80-180ms per navigation.

**QA Check:**
1. Test all auth flows: login, logout, signup, password reset, email verification.
2. Test protected route access: navigate to `/workshop/projects` while logged out — verify redirect to `/login`.
3. Test session refresh: wait for session to expire (or manually expire in DevTools), then navigate — verify no auth error.
4. Benchmark before/after: measure navigation latency on `/workshop/projects` → `/workshop/library`. Expect ~100-200ms improvement.
5. Run full E2E test suite: `bun run test:e2e`.

**Rollback plan:** If migration fails, restore `src/proxy.ts` and revert page imports.

**Expected impact:** ~100-200ms reduction in navigation latency for all authenticated routes.

### Task 1.5.2: Strategic React.memo Memoization

**Problem:** Zero `React.memo` usage despite 245+ `useMemo`/`useCallback`. When parent re-renders, all children re-render even if props unchanged. This causes 10x slower re-renders for list/tree components.

**Priority targets (by re-render frequency and cost):**

1. **Estimate row items** (`EstimateSheetContent.tsx`) — 100+ rows, frequent updates
2. **Tree nodes** (`EstimateSheetTree.tsx`) — 50+ nodes, expand/collapse
3. **Project cards** (`LiveProjectCard.tsx`) — 20+ cards, occasional updates
4. **Component library items** (`ComponentLibraryManager.tsx`) — 50+ items, occasional updates

**File to modify:** `src/components/workshop/EstimateSheetContent.tsx`

**Change:** Wrap row item components in `React.memo`:

```typescript
import { memo } from "react";

interface EstimateRowItemProps {
  row: EstimateRowItem;
  onUpdate: (row: EstimateRowItem) => void;
  onDelete: (id: string) => void;
}

export const EstimateRowItem = memo(function EstimateRowItem({
  row,
  onUpdate,
  onDelete,
}: EstimateRowItemProps) {
  // ... existing component logic
});
```

**Critical:** Ensure props are stable:
- Use `useMemo` for object/array props
- Use `useCallback` for function props

```typescript
// In parent component
const handleUpdate = useCallback((row: EstimateRowItem) => {
  // ... update logic
}, []);

const handleDelete = useCallback((id: string) => {
  // ... delete logic
}, []);

// Pass stable callbacks to memoized children
{rows.map(row => (
  <EstimateRowItem
    key={row.id}
    row={row}
    onUpdate={handleUpdate}
    onDelete={handleDelete}
  />
))}
```

**File to modify:** `src/components/workshop/EstimateSheetTree.tsx`

Wrap tree node components:

```typescript
export const TreeNode = memo(function TreeNode({ node, onSelect }: TreeNodeProps) {
  // ... existing logic
});
```

**File to modify:** `src/components/workshop/LiveProjectCard.tsx`

```typescript
export const LiveProjectCard = memo(function LiveProjectCard({ project }: ProjectCardProps) {
  // ... existing logic
});
```

**QA Check:**
1. Install React DevTools Profiler (browser extension).
2. Navigate to estimate workspace with 100+ rows.
3. Edit one row item.
4. Check Profiler: verify only the edited row re-renders (not all 100+ rows).
5. Verify no functional regressions: all row operations still work (edit, delete, drag-drop).
6. Benchmark before/after: measure time to edit a row. Expect 10x improvement (50-100ms → 5-10ms).

**Expected impact:** 10x faster re-renders for list/tree components, significantly smoother UX.

### Task 1.5.3: Project Layout Caching with unstable_cache

**Problem:** Project layout (`[projectId]/layout.tsx`) runs 4 Supabase queries on every sub-navigation (projects/X/estimates → projects/X/charts), even when data hasn't changed. This wastes ~90ms per navigation.

**File to modify:** `src/app/workshop/projects/[projectId]/layout.tsx`

**Change:** Wrap layout data fetching in `unstable_cache`:

```typescript
import { unstable_cache } from "next/cache";
import { getCurrentWorkspaceProject } from "@/lib/repositories/workspace-repository";
import { getProjectCollaborationSummary } from "@/lib/repositories/collaboration-repository";
import { getProjectPublicationSummary } from "@/lib/repositories/publication-repository";
import { listProjectEstimateSheets } from "@/lib/repositories/estimate-repository";

const getProjectLayoutData = unstable_cache(
  async (projectId: string) => {
    const { project } = await getCurrentWorkspaceProject(projectId);
    const [collaboration, publication, estimates] = await Promise.all([
      getProjectCollaborationSummary(projectId),
      getProjectPublicationSummary(projectId),
      listProjectEstimateSheets(projectId),
    ]);
    return { project, collaboration, publication, estimates };
  },
  ["project-layout"], // cache key prefix
  {
    revalidate: 30, // cache for 30 seconds
    tags: [`project-${projectId}`], // for on-demand revalidation
  }
);

export default async function ProjectLayout({ children, params }) {
  const { projectId } = params;
  const { project, collaboration, publication, estimates } = await getProjectLayoutData(projectId);
  
  // ... rest of layout
}
```

**File to modify:** All mutation actions that update project data

**Change:** Add `revalidateTag` to invalidate cache:

```typescript
import { revalidateTag } from "next/cache";

export async function updateProject(projectId: string, data: UpdateProjectData) {
  // ... existing mutation logic
  
  // Invalidate layout cache
  revalidateTag(`project-${projectId}`);
}
```

**QA Check:**
1. Navigate to `/workshop/projects/123` → `/workshop/projects/123/estimates` → `/workshop/projects/123/charts`.
2. Check Supabase logs: verify project queries only run once (not 3 times).
3. Update project data (e.g., rename project).
4. Navigate back to project layout. Verify cache is invalidated and fresh data loads.
5. Benchmark before/after: measure sub-navigation latency. Expect ~90ms improvement per navigation.

**Expected impact:** ~90ms reduction per sub-navigation within project segment.

### Task 1.5.4: Error Boundaries (Route + Component)

**Problem:** Zero `error.tsx` files and zero custom error boundaries. If a component throws, the entire page crashes. Recovery requires full reload (~1000ms) vs error boundary retry (~50ms).

**Priority targets:**
1. Estimate workspace (`[nodeId]/error.tsx`) — complex, high crash risk
2. Component library (`library/error.tsx`) — complex tree operations
3. Chart components — D3 error-prone with empty data

**File to create:** `src/app/workshop/projects/[projectId]/estimates/[nodeId]/error.tsx`

```typescript
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function EstimateWorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Estimate workspace error:", error);
    // Optional: log to error reporting service
  }, [error]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground">
        We encountered an error loading this estimate sheet.
      </p>
      <div className="flex gap-2">
        <Button onClick={reset} variant="default">
          Try again
        </Button>
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
        >
          Reload page
        </Button>
      </div>
    </div>
  );
}
```

**File to create:** `src/app/workshop/library/error.tsx`

Similar error boundary for library route.

**File to modify:** `src/components/workshop/project-charts/ProjectChartsClient.tsx`

Wrap D3 chart components in custom error boundary:

```typescript
import { ErrorBoundary } from "@/components/ui/error-boundary";

export function ProjectChartsClient({ data }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <ErrorBoundary fallback={<ChartErrorFallback />}>
        <ProjectCostDonutChart data={data.costData} />
      </ErrorBoundary>
      <ErrorBoundary fallback={<ChartErrorFallback />}>
        <ProjectCostBubbleChart data={data.bubbleData} />
      </ErrorBoundary>
    </div>
  );
}

function ChartErrorFallback() {
  return (
    <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
      <p className="text-sm text-muted-foreground">Chart unavailable</p>
    </div>
  );
}
```

**File to create:** `src/components/ui/error-boundary.tsx`

```typescript
"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}
```

**QA Check:**
1. Intentionally throw error in estimate workspace (e.g., `throw new Error("test")` in component).
2. Verify error boundary catches it and shows retry UI.
3. Click "Try again" — verify component re-renders without full page reload.
4. Verify error is logged to console (and error reporting service if configured).
5. Repeat for library and chart components.

**Expected impact:** 20x faster error recovery (1000ms → 50ms), prevents full-page crashes.

### Phase 1.5 Verification Gate

```bash
bun run build         # Must pass
bun run validate      # Must pass
bun run test:e2e      # Must pass
```

**Expected improvement:** 
- ~100-200ms faster navigation (proxy.ts middleware)
- 10x faster re-renders for list/tree components (React.memo)
- ~90ms faster sub-navigation (layout caching)
- Graceful error recovery (error boundaries)

---

## 5. Phase 2: Strategic Investments (Medium Effort, Highest Impact)

**Goal:** Near-instant (< 100ms) navigation for predictable paths. This is where the "seamless" feel comes from.

### Task 2.0: Fix N+1 Query Patterns

**Problem:** Several repository functions execute sequential queries instead of batching them. For example, `getProjectEstimateSheets` might fetch each sheet's row count individually instead of in a single query.

**File to audit:** All repository files in `src/lib/repositories/`

**Common N+1 patterns to fix:**

```typescript
// BAD: Sequential queries (N+1)
async function getProjectEstimateSheets(projectId: string) {
  const sheets = await db.query.estimateSheets.findMany({
    where: eq(estimateSheets.projectId, projectId),
  });
  
  // N+1: One query per sheet
  for (const sheet of sheets) {
    sheet.rowCount = await db.query.estimateRows.count({
      where: eq(estimateRows.sheetId, sheet.id),
    });
  }
  
  return sheets;
}

// GOOD: Batched queries
async function getProjectEstimateSheets(projectId: string) {
  const sheets = await db.query.estimateSheets.findMany({
    where: eq(estimateSheets.projectId, projectId),
  });
  
  const sheetIds = sheets.map(s => s.id);
  
  // Single query for all row counts
  const rowCounts = await db
    .select({
      sheetId: estimateRows.sheetId,
      count: count(),
    })
    .from(estimateRows)
    .where(inArray(estimateRows.sheetId, sheetIds))
    .groupBy(estimateRows.sheetId);
  
  const countMap = new Map(rowCounts.map(r => [r.sheetId, r.count]));
  
  return sheets.map(sheet => ({
    ...sheet,
    rowCount: countMap.get(sheet.id) ?? 0,
  }));
}
```

**Priority targets:**
1. `workspace-repository.ts` — project/workspace queries
2. `estimate-repository.ts` — estimate sheet/row queries
3. `component-library-repository.ts` — component/folder queries

**QA Check:**
1. Install Supabase query logging (or use `console.time` around queries).
2. Navigate to project list with 10+ projects.
3. Verify total query count is O(1) or O(few), not O(N).
4. Benchmark before/after: measure page load time with 50+ projects.
5. Verify no functional regressions.

**Expected impact:** 30-50% reduction in server-side query time for list pages.

### Task 2.1: Hover-Based Prefetch

**File to create:** `src/hooks/use-prefetch-on-hover.ts`

```typescript
"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

interface PrefetchConfig {
  href: string;
  queryKey?: unknown[];
  queryFn?: () => Promise<unknown>;
  delay?: number; // ms before prefetch triggers (default 200)
}

export function usePrefetchOnHover(configs: PrefetchConfig[]) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const handlePointerEnter = useCallback(
    (href: string) => {
      const config = configs.find((c) => c.href === href);
      if (!config) return;

      const delay = config.delay ?? 200;

      // Clear any existing timer for this href
      const existing = timersRef.current.get(href);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(() => {
        // Prefetch RSC payload
        router.prefetch(href);

        // Prefetch React Query data
        if (config.queryKey && config.queryFn) {
          queryClient.prefetchQuery({
            queryKey: config.queryKey,
            queryFn: config.queryFn,
            staleTime: 5 * 60_000,
          });
        }

        timersRef.current.delete(href);
      }, delay);

      timersRef.current.set(href, timer);
    },
    [configs, router, queryClient]
  );

  const handlePointerLeave = useCallback((href: string) => {
    const timer = timersRef.current.get(href);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(href);
    }
  }, []);

  return { handlePointerEnter, handlePointerLeave };
}
```

### Task 2.2: Wire Prefetch into Navigation Components

**File to modify:** `src/components/sidebar/SidebarNavItemRow.tsx`

Add `onPointerEnter` / `onPointerLeave` to sidebar links:

```tsx
// Inside the component that renders sidebar links
const { handlePointerEnter, handlePointerLeave } = usePrefetchOnHover([
  { href: "/workshop/projects", queryKey: ["projects"], queryFn: fetchProjects },
  { href: "/workshop/library", queryKey: ["library"], queryFn: fetchLibrary },
  { href: "/workshop/templates", queryKey: ["templates"], queryFn: fetchTemplates },
  { href: "/workshop/settings", queryKey: ["settings"], queryFn: fetchSettings },
]);

// On each sidebar link:
<Link
  href="/workshop/projects"
  prefetch={false} // Disable default viewport prefetch
  onPointerEnter={() => handlePointerEnter("/workshop/projects")}
  onPointerLeave={() => handlePointerLeave("/workshop/projects")}
>
  Projects
</Link>
```

**File to modify:** `src/components/workshop/LiveProjectCard.tsx`

Add hover prefetch for project detail:

```tsx
const { handlePointerEnter, handlePointerLeave } = usePrefetchOnHover([
  {
    href: `/workshop/projects/${project.id}`,
    queryKey: ["project", project.id],
    queryFn: () => fetchProjectDetail(project.id),
  },
]);

<Link
  href={`/workshop/projects/${project.id}`}
  prefetch={false}
  onPointerEnter={() => handlePointerEnter(`/workshop/projects/${project.id}`)}
  onPointerLeave={() => handlePointerLeave(`/workshop/projects/${project.id}`)}
>
  <LiveProjectCardContent />
</Link>
```

**File to modify:** `src/components/workshop/ProjectEstimatesTable.tsx`

Add hover prefetch for estimate rows:

```tsx
// On estimate row hover, prefetch the estimate workspace data
onPointerEnter={() => handlePointerEnter(`/workshop/projects/${projectId}/estimates/${nodeId}`)}
```

**QA Check:**
1. Open React Query DevTools. Hover over a project card for 200ms.
2. Verify "project" query appears in cache with fresh data.
3. Click the card. Verify the page loads instantly (from cache).
4. Verify no excessive prefetching (only hovered links trigger prefetch).

### Task 2.3: Suspense Boundaries in Workshop Layouts

**Verified layout structure:** There are only 2 layouts in the entire app:
1. `src/app/layout.tsx` — root layout (fonts + AppProviders)
2. `src/app/workshop/projects/[projectId]/layout.tsx` — the ONLY nested workshop layout

There is NO `src/app/workshop/layout.tsx`. Every workshop page independently renders `<WorkshopPageShell>` in its own `page.tsx`. This means Suspense boundaries must be added at the page level for most routes, not the layout level.

**File to modify:** `src/app/workshop/projects/[projectId]/layout.tsx`

**Current:** Layout fetches 4 queries (1 sequential + 3 parallel) and blocks until all resolve. Children render only after all data is available.

**Target:** Extract data-fetching into child Suspense boundaries so the layout shell renders immediately.

```tsx
// layout.tsx — shell only, minimal data fetching
export default async function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const { projectId } = await params;

  return (
    <WorkshopPageShell
      title={<ProjectTitle projectId={projectId} />}
      eyebrow={<ProjectClient projectId={projectId} />}
      breadcrumbs={[...]}
      centerHeader={<ProjectTotalHeader projectId={projectId} />}
      alignChromeToProjectSidebar
      contentClassName="pt-0 pb-0 pr-2 pl-0"
    >
      <div className="flex h-full min-h-0 overflow-hidden bg-white">
        <ProjectMiniSidebar projectId={projectId} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-canvas">
          <Suspense fallback={<ProjectHeaderSkeleton />}>
            <ProjectWorkspaceHeaderRowWrapper projectId={projectId} />
          </Suspense>
          <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        </div>
      </div>
    </WorkshopPageShell>
  );
}

// New async component — fetches data independently
async function ProjectWorkspaceHeaderRowWrapper({ projectId }: { projectId: string }) {
  const { project: liveProject } = await getCurrentWorkspaceProject(projectId);
  const [collaborationSummary, publicationSummary, projectEstimateSheets] = liveProject
    ? await Promise.all([...])
    : [null, null, []];
  // ... rest of existing logic
  return (
    <ProjectWorkspaceHeaderRow
      projectId={projectId}
      collaborationSummary={collaborationSummary}
      publicationSummary={publicationSummary}
      projectEstimateSheets={projectEstimateSheets}
    />
  );
}
```

**For pages without a shared layout** (most workshop routes), add Suspense directly in the page:

```tsx
// src/app/workshop/projects/page.tsx
export default async function ProjectsPage() {
  return (
    <WorkshopPageShell title="Projects" breadcrumbs={["Projects"]}>
      <Suspense fallback={<ProjectsGridSkeleton />}>
        <ProjectsPageContent />
      </Suspense>
    </WorkshopPageShell>
  );
}

async function ProjectsPageContent() {
  const projects = await listCurrentWorkspaceProjects();
  return <ProjectsPageClient initialProjects={projects} />;
}
```

**Key constraint:** `WorkshopPageShell` itself reads `cookies()` for side-panel widths and calls `getCurrentUserContext()` for the sidebar user. The shell will always render dynamically. The Suspense boundary wraps the content INSIDE the shell, not the shell itself.

**QA Check:**
1. Navigate to project detail with network throttling.
2. Verify the shell (sidebar, breadcrumbs, mini-sidebar) renders immediately.
3. Verify the header row shows a skeleton then populates with data.
4. Verify no layout shift when data resolves.

**QA Check:**
1. Navigate to project detail with network throttling.
2. Verify the shell (sidebar, breadcrumbs, mini-sidebar) renders immediately.
3. Verify the header row shows a skeleton then populates with data.
4. Verify no layout shift when data resolves.

### Task 2.4: bfcache Compatibility

**Codebase audit result (verified):** **Zero bfcache blockers found.** There are no `beforeunload` or `unload` event listeners anywhere in the codebase. No `Cache-Control: no-store` headers on workshop pages. The codebase is already bfcache-compatible from a blocker perspective.

**Remaining work:** Add `pageshow` event handling to suppress the overlay on bfcache restore.

**Files to audit (verification complete):**

```bash
# Search for unload/beforeunload handlers → NONE FOUND
grep -rn "unload\|beforeunload" src/

# Search for Cache-Control no-store → Only on /api/share/* routes (not workshop pages)
grep -rn "no-store" src/
```

**File to modify:** `src/components/navigation-listener.tsx`

**Changes:** Add `pageshow` listener to detect bfcache restore and suppress overlay:

```typescript
// Add to NavigationListener component
useEffect(() => {
  function handlePageShow(event: PageTransitionEvent) {
    if (event.persisted) {
      // Page was restored from bfcache — do NOT show overlay
      // The page is already fully rendered
      hide(); // Ensure overlay is hidden
    }
  }
  window.addEventListener("pageshow", handlePageShow);
  return () => window.removeEventListener("pageshow", handlePageShow);
}, [hide]);
```

**File to modify:** `src/components/ui/route-loading-overlay.tsx`

Ensure the portal is cleaned up properly on `pagehide` (bfcache-safe alternative to `beforeunload`):

```typescript
useEffect(() => {
  function handlePageHide() {
    // Clean up portal before page enters bfcache
    // The overlay should not persist in bfcache snapshot
  }
  window.addEventListener("pagehide", handlePageHide);
  return () => window.removeEventListener("pagehide", handlePageHide);
}, []);
```

**Risk:** LOW. The codebase is already clean — only the `pageshow` handler needs to be added.

### Task 2.5: Route-Level Bundle Analysis & Optimization

**Run:**
```bash
ANALYZE=true bun run build
```

**Action items from bundle analysis:**
1. Identify routes where "First Load JS" > 200KB (compressed).
2. Check for duplicate dependencies across chunks.
3. Check for large icon libraries (Phosphor) — verify tree-shaking is working.
4. Check for unused imports in heavily-imported files.

**Expected optimizations:**
- Move shared dependencies to common chunks (Next.js does this automatically, but verify).
- Replace heavy icon imports with SVG sprites where possible (pattern already exists: `CircleNotch` is imported individually, which is tree-shakeable).
- Verify `@phosphor-icons/react` is properly tree-shaken (only used icons are bundled).

**QA Check:**
1. `ANALYZE=true bun run build` — verify no chunk > 200KB (compressed) for any route.
2. Verify build succeeds.

### Phase 2 Verification Gate

```bash
bun run build         # Must pass, verify bundle sizes
bun run validate      # Must pass
bun run test:e2e      # Must pass
```

**Manual verification:**
1. Run all Phase 2 benchmark scenarios from `05-benchmark-scenarios.md`.
2. Compare against Phase 1 baseline.
3. Cold transitions should be < 150ms for prefetched routes.
4. Warm transitions (revisit) should be < 50ms.
5. Back/forward should be < 50ms (bfcache hit).

---

## 5. Phase 3: Peak-Load Hardening (High Effort, Targeted Impact)

**Goal:** Graceful performance under heavy data (50+ projects, 200+ row items, 500+ library components). This phase is about scaling, not baseline speed.

### Task 3.1: Virtualize Project List (Many Thumbnails)

**File to modify:** `src/components/workshop/projects-page-client.tsx`

**Install:** `bun add @tanstack/react-virtual`

```typescript
import { useVirtualizer } from "@tanstack/react-virtual";

function ProjectList({ projects }: { projects: Project[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: projects.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // estimated card height
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <LiveProjectCard project={projects[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

**QA Check:**
1. Seed 50+ projects. Navigate to `/workshop/projects`.
2. Verify only ~10 cards are rendered in the DOM (overscan + visible).
3. Scroll through the list. Verify smooth scrolling (60fps).
4. Verify card click still navigates correctly.

### Task 3.2: Virtualize Estimate Table (Many Sheets)

**File to modify:** `src/components/workshop/ProjectEstimatesTable.tsx`

Integrate `@tanstack/react-virtual` with TanStack Table:

```typescript
// TanStack Table v8 supports virtualization via @tanstack/react-virtual
const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
});

const { rows } = table.getRowModel();

const rowVirtualizer = useVirtualizer({
  count: rows.length,
  getScrollElement: () => tableContainerRef.current,
  estimateSize: () => 40, // row height
  overscan: 10,
});
```

**QA Check:**
1. Seed 50 estimate sheets. Navigate to estimates list.
2. Verify only visible rows are rendered.
3. Scroll through the table — verify smooth at 60fps.
4. Verify inline editing still works on virtualized rows.
5. Verify row click navigation still works.

### Task 3.3: Virtualize Estimate Row Items (Many Rows)

**File to modify:** Estimate row items table (in `EstimateSheetContent` or equivalent)

Same `@tanstack/react-virtual` integration.

**QA Check:**
1. Seed 200 row items for one estimate sheet. Navigate to estimate workspace.
2. Verify only visible row items are rendered.
3. Verify smooth scrolling.
4. Verify inline editing (quantity, contingency, misc cost) still works.
5. Verify row selection still works.

### Task 3.4: Component Library Tree — Load More Pagination

**File to modify:** Library tree component (React Complex Tree)

Since RCT doesn't support virtualization, implement "load more" pagination:
- Initial render: show first 50 components/folders.
- "Show more" button at bottom to load next 50.
- Or: lazy-load children of each folder on expand.

**QA Check:**
1. Seed 500 library components.
2. Navigate to `/workshop/library`.
3. Verify tree renders quickly (only first 50 items or root folders).
4. Expand a folder — verify children load on demand.
5. Verify search/filter still works across all items.

### Task 3.5: Streaming for Chart Data

**File to modify:** `src/app/workshop/projects/[projectId]/charts/page.tsx`

Wrap chart components in `<Suspense>` with a skeleton fallback:

```tsx
export default function ChartsPage() {
  return (
    <div className="p-4">
      <Suspense fallback={<ChartBoardSkeleton />}>
        <ChartBoard />
      </Suspense>
    </div>
  );
}

async function ChartBoard() {
  const data = await getProjectChartsData(projectId);
  return <ProjectChartsClient data={data} />;
}
```

**QA Check:**
1. Navigate to charts with Slow 3G.
2. Verify skeleton appears immediately.
3. Verify charts populate when data resolves.
4. Verify add/remove estimate columns still works.

### Phase 3 Verification Gate

```bash
bun run build         # Must pass
bun run validate      # Must pass
bun run test:e2e      # Must pass
```

**Manual verification:**
1. Run all peak-load scenarios from `05-benchmark-scenarios.md`.
2. All scenarios must meet their degradation thresholds.
3. No crashes with 1000 row items, 100 nodes.

---

## 6. Phase 4: Monitoring & Continuous Optimization

**Goal:** Prevent performance regressions. This is an ongoing phase, not a one-time task.

### Task 4.1: Performance Regression CI (Optional)

Add a CI step that checks bundle sizes:

```yaml
# .github/workflows/performance.yml
- name: Check bundle sizes
  run: |
    bun run build
    # Compare against baseline
    # Fail if any route exceeds threshold
```

### Task 4.2: Lighthouse Budget

**File to create:** `lighthouserc.json`

```json
{
  "ci": {
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.85 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 1500 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 3000 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "interactive": ["error", { "maxNumericValue": 4000 }]
      }
    }
  }
}
```

### Task 4.3: Monitor in Production

If analytics is configured:
- Track `route_transition_duration` custom event.
- Alert if P95 latency exceeds 500ms for any route.

### Task 4.4: Periodic Re-Baseline

- Every major feature release: re-run baseline benchmarks.
- If latency regresses > 20%: investigate before shipping.

---

## 7. Dependency Graph

```
Phase 0 (Instrumentation)
  │
  ├─► Task 0.2 (PerfMonitor) ──► All subsequent phases use it
  ├─► Task 0.4 (Baseline) ──► Phase 1–3 comparison target
  └─► Task 0.5 (Seed data) ──► Phase 3 testing

Phase 1 (Quick Wins) — all tasks are INDEPENDENT, can be done in any order
  │
  ├─► Task 1.1 (staleTime) ──► No dependencies
  ├─► Task 1.2 (loading.tsx) ──► No dependencies
  ├─► Task 1.3 (code splitting) ──► No dependencies
  ├─► Task 1.4 (React cache) ──► No dependencies
  ├─► Task 1.5 (overlay delay) ──► No dependencies
  ├─► Task 1.6 (consolidate useRouter) ──► No dependencies
  ├─► Task 1.7 (Three.js dynamic import) ──► No dependencies
  └─► Task 1.8 (font optimization) ──► No dependencies

Phase 1.5 (Critical Infrastructure) — Phase 1 must be complete
  │
  ├─► Task 1.5.1 (proxy.ts → middleware) ──► No dependencies (auth infrastructure)
  ├─► Task 1.5.2 (React.memo) ──► No dependencies (render optimization)
  ├─► Task 1.5.3 (layout caching) ──► Depends on 1.4 (React cache pattern)
  └─► Task 1.5.4 (error boundaries) ──► No dependencies (error handling)

Phase 2 (Strategic) — Phase 1.5 must be complete
  │
  ├─► Task 2.0 (N+1 queries) ──► Depends on 1.5.1 (middleware auth)
  ├─► Task 2.1 (prefetch hook) ──► Task 2.2 depends on it
  ├─► Task 2.2 (wire prefetch) ──► Depends on 2.1
  ├─► Task 2.3 (Suspense in layouts) ──► Depends on 1.2 pattern established
  ├─► Task 2.4 (bfcache) ──► Depends on 1.5 (overlay changes)
  └─► Task 2.5 (bundle analysis) ──► Depends on 1.3 (code splitting visible in bundles)

Phase 3 (Peak-Load) — Phase 2 must be complete
  │
  ├─► Task 3.1 (virtualize projects) ──► @tanstack/react-virtual must be installed
  ├─► Task 3.2 (virtualize estimates) ──► Same
  ├─► Task 3.3 (virtualize rows) ──► Same
  ├─► Task 3.4 (library pagination) ──► No extra dep
  └─► Task 3.5 (chart streaming) ──► Depends on 2.3 Suspense pattern

Phase 4 (Monitoring) — Ongoing, starts after Phase 1
```

---

## 8. File Inventory (Complete)

### Files to Create

```
src/components/performance-monitor.tsx                          # Phase 0
src/app/workshop/projects/loading.tsx                           # Phase 1
src/app/workshop/projects/[projectId]/loading.tsx               # Phase 1
src/app/workshop/projects/[projectId]/estimates/loading.tsx     # Phase 1
src/app/workshop/projects/[projectId]/estimates/[nodeId]/loading.tsx  # Phase 1
src/app/workshop/library/loading.tsx                            # Phase 1
src/middleware.ts                                                # Phase 1.5 (auth middleware)
src/app/workshop/projects/[projectId]/estimates/[nodeId]/error.tsx  # Phase 1.5 (error boundary)
src/app/workshop/library/error.tsx                               # Phase 1.5 (error boundary)
src/components/ui/error-boundary.tsx                             # Phase 1.5 (reusable error boundary)
src/hooks/use-prefetch-on-hover.ts                              # Phase 2
scripts/seed-performance-test-data.ts                           # Phase 0
lighthouserc.json                                                # Phase 4
```

### Files to Modify

```
src/app/providers.tsx                                           # Phase 0, 1
src/app/layout.tsx                                               # Phase 1 (font loading optimization)
src/app/page.tsx                                                 # Phase 1 (Three.js dynamic import — not lazy load, it's above-fold)
src/stores/navigation-ui-store.ts                               # Phase 1
src/app/workshop/projects/page.tsx                              # Phase 1 (Suspense)
src/app/workshop/projects/[projectId]/page.tsx                  # Phase 1 (Suspense)
src/app/workshop/projects/[projectId]/layout.tsx                # Phase 1, 1.5 (cache, Suspense, unstable_cache), 2 (Suspense)
src/app/workshop/projects/[projectId]/charts/page.tsx           # Phase 1 (code split D3 charts), 3 (streaming)
src/app/workshop/projects/[projectId]/estimates/page.tsx        # Phase 1 (Suspense)
src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx  # Phase 1 (code split EstimateSheetContent + EstimateSheetTree), 3 (streaming)
src/app/workshop/library/page.tsx                               # Phase 1 (code split ComponentLibraryManager), 3 (Suspense)
src/app/workshop/templates/page.tsx                             # Phase 1 (Suspense)
src/proxy.ts                                                     # Phase 1.5 (migrate to middleware, likely delete)
src/components/landing/NeatWireframeBackground.tsx              # Phase 1 (dynamic import wrapper — no IntersectionObserver, component is above-fold)
src/components/sidebar/SidebarNavItemRow.tsx                    # Phase 2 (prefetch)
src/components/workshop/ProjectMiniSidebar.tsx                  # Phase 2 (prefetch)
src/components/workshop/LiveProjectCard.tsx                     # Phase 1.5 (React.memo), 2 (prefetch)
src/components/workshop/ProjectEstimatesTable.tsx               # Phase 1 (consolidate useNavigationRouter), 3 (virtualize)
src/components/workshop/projects-page-client.tsx                # Phase 3 (virtualize)
src/components/workshop/EstimateSheetContent.tsx                # Phase 1 (code split target — 4,048 lines), 1.5 (React.memo)
src/components/workshop/EstimateSheetTree.tsx                   # Phase 1 (code split target — 1,365 lines), 1.5 (React.memo)
src/components/workshop/component-library-manager/ComponentLibraryManager.tsx  # Phase 1 (code split AddComponentModal + LibraryFolderTree), 1.5 (React.memo)
src/components/workshop/project-charts/ProjectChartsClient.tsx  # Phase 0 (fix Phosphor icon import path), 1.5 (error boundaries)
src/components/navigation-listener.tsx                          # Phase 2 (bfcache pageshow handler)
src/components/ui/route-loading-overlay.tsx                     # Phase 2 (bfcache pagehide handler)
src/lib/repositories/workspace-repository.ts                    # Phase 1 (React cache), 1.5 (unstable_cache), 2 (N+1 fixes)
src/lib/repositories/component-library-repository.ts            # Phase 1 (React cache), 1.5 (unstable_cache), 2 (N+1 fixes)
src/lib/repositories/project-charts-repository.ts               # Phase 1 (React cache), 1.5 (unstable_cache), 2 (N+1 fixes)
next.config.ts                                                  # Phase 0 (bundle analyzer)
src/hooks/use-estimate-query.ts                                 # Phase 1 (staleTime review)
src/components/landing/ContactForm.tsx                          # Phase 0 (fix Phosphor icon import path)
```

### Files to Audit (No Changes Expected)

```
src/app/layout.tsx                                              # Verify font loading strategy
src/app/workshop/page.tsx                                       # Verify no accidental data fetching
src/components/workshop/WorkshopPageShell.tsx                   # Verify no bfcache blockers
src/middleware.ts (if exists)                                   # Verify no bfcache blockers
```

---

## 9. Related Documents

For detailed analysis and implementation guidance, refer to these supporting documents:

**Audit & Analysis:**
- `16-critical-path-waterfall.md` — Server+client waterfall diagrams for heaviest routes (project detail, estimate workspace)
- `17-server-side-optimization-strategy.md` — Proxy.ts migration, React.cache, N+1 query fixes
- `18-performance-monitoring-production.md` — Runtime monitoring, alerting, regression detection

**Implementation Strategies:**
- `19-react-memo-strategy.md` — Strategic component memoization (targets, measurement, anti-patterns)
- `20-font-and-bundle-optimization.md` — Font loading, Three.js lazy loading, bundle analysis
- `21-error-boundary-strategy.md` — Route-level and component-level error boundaries

**Existing Documents:**
- `01-performance-audit.md` — Comprehensive audit findings
- `02-blast-radius-analysis.md` — Impact analysis for each optimization
- `06-strategy-adrs.md` — Architecture decision records (ADRs)
- `08-risks-and-mitigations.md` — Risk register and mitigation strategies

---

## Sign-off

| Phase | Status | Owner | Date |
|-------|--------|-------|------|
| Phase 0: Instrumentation | ⏳ Not started | — | — |
| Phase 1: Quick Wins | ⏳ Not started | — | — |
| Phase 2: Strategic | ⏳ Not started | — | — |
| Phase 3: Peak-Load | ⏳ Not started | — | — |
| Phase 4: Monitoring | ⏳ Not started | — | — |

---

**Back to:** `README.md` — Master plan index
