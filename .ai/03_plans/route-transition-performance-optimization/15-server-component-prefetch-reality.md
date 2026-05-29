# 15 — Server Component Prefetch Reality: Corrected Strategy

**Status:** Complete
**Created:** 2026-05-29
**Purpose:** Correct the prefetch strategy based on verified codebase facts. The original `11-prefetch-wiring-map.md` assumed React Query keys (`["projects"]`, `["homebase"]`, `["library"]`) that do not exist. Most workshop data is fetched in Server Components, not via React Query. This document provides the corrected strategy.

**Critical:** This document takes precedence over `11-prefetch-wiring-map.md`. The `queryClient.prefetchQuery()` calls for non-estimate routes will silently fail (React Query will cache data that no hook ever reads, wasting memory and bandwidth).

---

## Table of Contents

1. [The Fundamental Misunderstanding](#1-the-fundamental-misunderstanding)
2. [What Actually Works (Verified)](#2-what-actually-works-verified)
3. [Corrected Prefetch Strategy by Route](#3-corrected-prefetch-strategy-by-route)
4. [Updated `usePrefetchOnHover` Hook](#4-updated-useprefetchonhover-hook)
5. [Implementation Sequencing](#5-implementation-sequencing)

---

## 1. The Fundamental Misunderstanding

### What the original plan assumed:

```typescript
// 11-prefetch-wiring-map.md §2 — WILL NOT WORK
queryClient.prefetchQuery({
  queryKey: ["projects"],           // ← No hook uses this key
  queryFn: fetchProjects,            // ← No function exists with this signature
  staleTime: 5 * 60_000,
});
```

### What actually exists:

The ONLY React Query keys in the codebase are:
- `["estimate", estimateId]` — `useEstimateQuery` (fetches estimate tree)
- `["estimate", estimateId, "area-tree"]` — `useEstimateAreaTreeQuery` (fetches area tree nodes)
- `["estimate", estimateId, "area-tree", "revision"]` — Internal revision tracking

**Everything else** (projects, library, templates, homebase, settings, charts, project detail) is fetched in **Server Components** via repository functions — not through React Query.

### Why this matters:

1. `queryClient.prefetchQuery({ queryKey: ["projects"], queryFn: ... })` will cache data under `["projects"]`, but **no hook subscribes to that key**. The cached data is never read — wasted memory and bandwidth.
2. To make React Query prefetch work for these routes, you'd need to ADD `useQuery` hooks in the client components that currently receive data as props from Server Components. This is a significant architectural change (server→client data passing → client-side fetching).

---

## 2. What Actually Works (Verified)

### Layer A: RSC Payload Prefetch — WORKS FOR ALL ROUTES

```typescript
// router.prefetch() preloads the Next.js Route Segment Config (Server Component output)
// This works regardless of whether the page uses Server Components or React Query.
router.prefetch("/workshop/projects");       // ✅ Works
router.prefetch("/workshop/library");        // ✅ Works
router.prefetch("/workshop/projects/123");   // ✅ Works
```

**How it works:** Next.js prefetches the rendered HTML/RSC payload for the target route and caches it in the client-side router cache. On navigation, if the payload is cached, Next.js serves it instantly without a server round-trip.

**Limitation:** The RSC payload may include stale data if the prefetch happened minutes before the navigation. Next.js handles this with `stale-while-revalidate` internally for `<Link>` prefetch, but `router.prefetch()` may not auto-revalidate.

### Layer B: React Query Prefetch — ONLY WORKS FOR ESTIMATE ROUTES

```typescript
// ✅ WORKS — useEstimateQuery subscribes to ["estimate", id]
queryClient.prefetchQuery({
  queryKey: estimateQueryKeys.detail(estimateId),
  queryFn: () => estimateRepository.getEstimateTree(estimateId),
});

// ✅ WORKS — useEstimateAreaTreeQuery subscribes to ["estimate", id, "area-tree"]
queryClient.prefetchQuery({
  queryKey: estimateQueryKeys.areaTree(estimateId),
  queryFn: () => fetchEstimateTree({ projectId, estimateId }),
});
```

### Layer C: React `cache()` — WORKS FOR SERVER-SIDE DEDUPLICATION

```typescript
// React.cache() prevents duplicate Supabase calls within a single request
// Example: getCurrentWorkspaceProject() called in layout AND page → 1 call instead of 2
import { cache } from "react";
export const getCurrentWorkspaceProject = cache(async (projectId: string) => { ... });
```

This does NOT persist across navigations — only within the same HTTP request. But it eliminates the most wasteful duplicate query (project detail called 2x per navigation).

---

## 3. Corrected Prefetch Strategy by Route

### 3.1 Sidebar Links: RSC Prefetch Only

| Sidebar Item | Strategy | Rationale |
|-------------|----------|-----------|
| Workshop `/workshop` | `router.prefetch()` only | Homebase data is fetched server-side. No React Query hooks to prefill. |
| Projects `/workshop/projects` | `router.prefetch()` only | Project list is fetched via `listCurrentWorkspaceProjects()` in Server Component. |
| Library `/workshop/library` | `router.prefetch()` only | Library data fetched server-side via `getCurrentWorkspaceComponentRowsLibrary()`. |
| Templates `/workshop/templates` | `router.prefetch()` only | Templates fetched server-side. |
| Settings `/workshop/settings` | `router.prefetch()` only | Lightweight forms, no data prefetch needed. |

**Net effect:** `router.prefetch()` still provides instant navigation (the RSC payload is preloaded). Users benefit from reduced latency even without React Query prefetch. The navigation time drops from ~300ms (cold) to ~50ms (prefetched RSC payload).

### 3.2 Project Cards: RSC + Future React Query (if hooks added)

| Prefetch | Strategy | Rationale |
|----------|----------|-----------|
| RSC payload | `router.prefetch()` for `/workshop/projects/[id]` | Preloads the layout + page Server Component output |
| React Query | **Not possible yet** | No `useQuery(["project", id])` hook exists. If one is added to `ProjectDashboardClient`, prefetch becomes possible. |
| Server cache | `React.cache()` on `getCurrentWorkspaceProject()` | Deduplicates the layout+page double-fetch within the same request |

### 3.3 Estimate Table Rows: THE ONLY ROUTE THAT BENEFITS FROM BOTH

This is the highest-impact prefetch because the estimate workspace IS the heaviest page AND it uses React Query:

```typescript
// RSC payload prefetch
router.prefetch(`/workshop/projects/${projectId}/estimates/${nodeId}`);

// React Query data prefetch — THESE KEYS ACTUALLY EXIST
queryClient.prefetchQuery({
  queryKey: estimateQueryKeys.detail(estimateId),
  queryFn: () => estimateRepository.getEstimateTree(estimateId),
  staleTime: 5 * 60_000,
});

queryClient.prefetchQuery({
  queryKey: estimateQueryKeys.areaTree(estimateId),
  queryFn: () => fetchEstimateTree({ projectId, estimateId }),
  staleTime: 5 * 60_000,
});
```

**Impact:** This is the single most impactful prefetch. The estimate workspace has ~5,400+ lines of client code. Prefetching its data reduces cold navigation from ~800ms to ~100ms.

### 3.4 Mini-Sidebar: RSC Only

| Link | Strategy |
|------|----------|
| Dashboard | `router.prefetch()` — project detail already prefetched from card hover in most cases |
| Estimates | `router.prefetch()` — estimate list fetched server-side |
| Charts | `router.prefetch()` — charts data fetched server-side |

---

## 4. Updated `usePrefetchOnHover` Hook

The simplified hook focuses on what actually works:

```typescript
"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { estimateQueryKeys } from "@/hooks/use-estimate-query";
import { estimateRepository } from "@/lib/repositories/estimate-repository";
import { fetchEstimateTree } from "@/lib/estimates/actions";

interface PrefetchConfig {
  href: string;
  /** Only used for estimate routes — React Query keys that actually exist */
  estimateQuery?: {
    estimateId: string;
    prefetchTree?: boolean;    // uses estimateQueryKeys.detail
    prefetchAreaTree?: boolean; // uses estimateQueryKeys.areaTree
  };
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

      const existing = timersRef.current.get(href);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(() => {
        // Layer A: Always prefetch RSC payload (works for ALL routes)
        router.prefetch(href);

        // Layer B: React Query prefetch (only for routes with hooks that subscribe to these keys)
        if (config.estimateQuery) {
          const { estimateId, prefetchTree, prefetchAreaTree } = config.estimateQuery;

          if (prefetchTree) {
            queryClient.prefetchQuery({
              queryKey: estimateQueryKeys.detail(estimateId),
              queryFn: () => estimateRepository.getEstimateTree(estimateId),
              staleTime: 5 * 60_000,
            });
          }

          if (prefetchAreaTree) {
            queryClient.prefetchQuery({
              queryKey: estimateQueryKeys.areaTree(estimateId),
              queryFn: () => fetchEstimateTree({ projectId: undefined as any, estimateId }),
              staleTime: 5 * 60_000,
            });
          }
        }
        // NOTE: For non-estimate routes (projects, library, templates, settings),
        // only router.prefetch() is called. Data is fetched server-side in Server Components.
        // React.cache() (Task 1.4) deduplicates server-side calls within the same request.
        // For cross-navigation caching, use unstable_cache in a future phase.

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

### Updated Sidebar Wiring (simplified):

```tsx
// In MainSidebar.tsx — no fake query keys, just RSC prefetch
const { handlePointerEnter, handlePointerLeave } = usePrefetchOnHover([
  { href: "/workshop" },
  { href: "/workshop/projects" },
  { href: "/workshop/library" },
  { href: "/workshop/templates" },
  { href: "/workshop/settings" },
]);

// SidebarNavItemRow — only RSC prefetch, no queryClient needed
<Link
  href={item.href}
  prefetch={false}
  onPointerEnter={() => handlePointerEnter(item.href)}
  onPointerLeave={() => handlePointerLeave(item.href)}
>
```

### Updated Estimate Row Wiring (BOTH layers):

```tsx
// In ProjectEstimatesTable.tsx — estimate routes get both prefetch layers
const { handlePointerEnter, handlePointerLeave } = usePrefetchOnHover([{
  href: `/workshop/projects/${projectId}/estimates/${nodeId}`,
  estimateQuery: {
    estimateId: nodeId,
    prefetchTree: true,
    prefetchAreaTree: true,
  },
}]);

// On each estimate row:
onPointerEnter={() => handlePointerEnter(`/workshop/projects/${projectId}/estimates/${nodeId}`)}
onPointerLeave={() => handlePointerLeave(`/workshop/projects/${projectId}/estimates/${nodeId}`)}
```

---

## 5. Implementation Sequencing

### Phase 1 (Quick Wins — already planned):

1. `React.cache()` on repository functions — deduplicates within same request (Task 1.4)
2. `staleTime` increase to 5min — benefits the 2 existing React Query hooks (Task 1.1)

### Phase 2 (Strategic — corrected):

1. **RSC payload prefetch** for all navigation links — `router.prefetch()` only (simplified Task 2.1-2.2)
2. **React Query prefetch** for estimate workspace rows only — the only route with actual React Query hooks
3. **DO NOT** add `queryClient.prefetchQuery()` for projects, library, templates, settings — keys don't exist

### Phase 2.5 (Future — not in current plan):

After Phase 2, evaluate whether to ADD React Query hooks to other workshop pages. Benefits:
- Client-side caching of project lists, library items
- Background revalidation without full page re-fetch
- Enabled by moving data fetching from Server Components to Client Components with `useQuery`

**Trade-off:** Adds complexity. Server Components are simpler for data fetching. Only add if measurement shows the RSC payload prefetch alone isn't sufficient.

---

**Next:** Refer back to `13-verified-codebase-facts.md` for the canonical codebase facts that informed this strategy correction. Use `14-code-splitting-named-exports.md` for the correct `next/dynamic` patterns.
