# 17 — Server-Side Optimization Strategy

**Status:** Complete  
**Created:** 2026-05-29  
**Purpose:** Address server-side bottlenecks that add 100-300ms latency to every route transition. These optimizations are critical for achieving sub-150ms cold navigations.

---

## Table of Contents

1. [Proxy.ts Auth Check Optimization](#1-proxyts-auth-check-optimization)
2. [Project Layout Re-Fetch Elimination](#2-project-layout-re-fetch-elimination)
3. [React.cache Expansion](#3-reactcache-expansion)
4. [N+1 Query Fixes](#4-n1-query-fixes)
5. [Query Batching Strategies](#5-query-batching-strategies)
6. [Server-Side Caching with unstable_cache](#6-server-side-caching-with-unstable_cache)
7. [Implementation Priority](#7-implementation-priority)

---

## 1. Proxy.ts Auth Check Optimization

### Current State

**File:** `src/proxy.ts`  
**Impact:** Every protected page navigation  
**Latency:** ~100-200ms per navigation

### Verified Codebase Finding (2026-05-29)

**proxy.ts is DEAD CODE at runtime.** Despite exporting a `config.matcher` pattern (which only matters when exported from `middleware.ts`), there is **NO `src/middleware.ts` file**. The `proxy()` function is only invoked in tests (`auth-proxy.test.ts`).

**Auth actually runs in WorkshopPageShell** via `getCurrentUserContext()` → `createSupabaseServerClient()` → `supabase.auth.getUser()`. This means:
1. Auth check happens AFTER Server Component rendering starts
2. Every workshop page is forced to be dynamically rendered (ondemand) because `cookies()` and `headers()` are called
3. Unauthenticated requests still consume server compute before being redirected

**Fix (3 lines):** Create `src/middleware.ts` that re-exports from proxy.ts:
```typescript
// src/middleware.ts
export { proxy as middleware } from "@/proxy";
export { config } from "@/proxy";
```

See **`31-auth-optimization-middleware-migration.md`** for the full migration plan and **`30-dynamic-rendering-analysis.md`** for the complete dynamic rendering analysis.

```typescript
// Current implementation (simplified)
export async function proxy(request: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser(); // ← HTTP roundtrip
  
  if (!user && request.nextUrl.pathname.startsWith('/workshop')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/workshop', request.url));
  }
  
  // Cookie refresh
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    supabase.auth.setAll(session); // ← Another operation
  }
}
```

**Problem:** `supabase.auth.getUser()` makes an HTTP request to Supabase Auth API on **every page load**, even when the session cookie is valid and hasn't expired.

### Optimization Strategy

#### Option A: Move to Next.js Middleware (Recommended)

**Benefits:**
- Runs at the Edge, closer to user (~20ms vs ~100ms)
- Can cache auth state in memory for the duration of the request
- Prevents unnecessary server component rendering for unauthenticated users

**Implementation:**

```typescript
// src/middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Refresh session if expired (uses local JWT validation, not HTTP)
  const { data: { session } } = await supabase.auth.getSession();
  
  // Only redirect if session is invalid
  if (!session && request.nextUrl.pathname.startsWith('/workshop')) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (session && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/workshop', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/workshop/:path*', '/login'],
};
```

**Key difference:** `getSession()` validates the JWT locally (no HTTP request) vs `getUser()` which always makes an HTTP roundtrip.

**Latency improvement:** ~80-180ms saved per navigation.

#### Option B: Keep Proxy but Optimize (Fallback)

If middleware migration is blocked (e.g., by Supabase SSR integration issues), optimize the proxy:

```typescript
// src/proxy.ts (optimized)
export async function proxy(request: NextRequest) {
  const supabase = createSupabaseServerClient();
  
  // Use getSession() instead of getUser() for local JWT validation
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session && request.nextUrl.pathname.startsWith('/workshop')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Only call getUser() if we need fresh user data
  // (e.g., for RBAC checks that require latest user metadata)
  // const { data: { user } } = await supabase.auth.getUser();
  
  return NextResponse.next();
}
```

**Latency improvement:** ~60-150ms saved (still slower than middleware due to server-side execution).

### Migration Checklist

- [ ] Create `src/middleware.ts` with auth logic
- [ ] Remove `src/proxy.ts` imports from pages
- [ ] Test OAuth callback flow (ensure cookies are set correctly)
- [ ] Test invite acceptance flow (ensure auth state propagates)
- [ ] Test share page access (public routes should bypass middleware)
- [ ] Verify `x-request-path` header is still set (used by some components)
- [ ] Run `bun run test:e2e` to catch auth regressions

---

## 2. Project Layout Re-Fetch Elimination

### Current State

**File:** `src/app/workshop/projects/[projectId]/layout.tsx`  
**Impact:** Every navigation within `/workshop/projects/[projectId]/*`  
**Latency:** ~90ms wasted per sub-navigation

```typescript
// Current implementation
export default async function ProjectLayout({ children, params }) {
  const { projectId } = await params;
  
  // These run on EVERY sub-navigation (projects/X/estimates → projects/X/charts)
  const { project: liveProject } = await getCurrentWorkspaceProject(projectId);
  
  const [collaboration, publication, estimates] = await Promise.all([
    getProjectCollaborationSummary(projectId),
    getProjectPublicationSummary(projectId),
    listProjectEstimateSheets(projectId),
  ]);
  
  // ... render layout with MiniSidebar, HeaderRow
  return (
    <WorkshopPageShell>
      <ProjectMiniSidebar estimates={estimates} />
      <ProjectWorkspaceHeaderRow project={liveProject} collaboration={collaboration} />
      {children}
    </WorkshopPageShell>
  );
}
```

**Problem:** When user navigates from `/workshop/projects/123/estimates` to `/workshop/projects/123/charts`, the layout re-runs all 4 queries even though the project data hasn't changed.

### Optimization Strategy

#### Add Server-Side Caching with unstable_cache

```typescript
// src/lib/projects/project-layout-cache.ts
import { unstable_cache } from 'next/cache';
import { getCurrentWorkspaceProject } from '@/lib/projects/actions';
import { getProjectCollaborationSummary } from '@/lib/collaboration/actions';
import { getProjectPublicationSummary } from '@/lib/publication/actions';
import { listProjectEstimateSheets } from '@/lib/estimates/actions';
import { requireCurrentUserContext } from '@/lib/auth/session';

// Cache for 30 seconds (short enough to catch updates, long enough to avoid re-fetches)
const CACHE_DURATION_SECONDS = 30;

export const getCachedProjectLayoutData = unstable_cache(
  async (projectId: string) => {
    const { project: liveProject } = await getCurrentWorkspaceProject(projectId);
    
    const [collaboration, publication, estimates] = await Promise.all([
      getProjectCollaborationSummary(projectId),
      getProjectPublicationSummary(projectId),
      listProjectEstimateSheets(projectId),
    ]);
    
    return { liveProject, collaboration, publication, estimates };
  },
  ['project-layout'], // Cache key prefix
  {
    revalidate: CACHE_DURATION_SECONDS,
    tags: [`project-${projectId}`], // For on-demand revalidation
  }
);
```

**Usage in layout:**

```typescript
// src/app/workshop/projects/[projectId]/layout.tsx
import { getCachedProjectLayoutData } from '@/lib/projects/project-layout-cache';

export default async function ProjectLayout({ children, params }) {
  const { projectId } = await params;
  
  // Cached for 30s per projectId
  const { liveProject, collaboration, publication, estimates } = 
    await getCachedProjectLayoutData(projectId);
  
  return (
    <WorkshopPageShell>
      <ProjectMiniSidebar estimates={estimates} />
      <ProjectWorkspaceHeaderRow 
        project={liveProject} 
        collaboration={collaboration} 
        publication={publication}
      />
      {children}
    </WorkshopPageShell>
  );
}
```

**Cache invalidation:** When project data changes (e.g., project renamed, estimate added), revalidate the cache:

```typescript
// src/lib/projects/actions.ts
import { revalidateTag } from 'next/cache';

export async function updateProject(projectId: string, data: UpdateProjectData) {
  // ... update logic
  
  // Invalidate layout cache
  revalidateTag(`project-${projectId}`);
}

export async function createEstimateSheet(projectId: string, data: CreateEstimateData) {
  // ... create logic
  
  // Invalidate layout cache (estimate count changed)
  revalidateTag(`project-${projectId}`);
}
```

**Latency improvement:** ~90ms saved per sub-navigation (after first load).

### Alternative: Client-Side Layout State (Future)

If server-side caching isn't sufficient, move layout data to client-side state:

```typescript
// Store project layout in Zustand or React Query
// Fetch once, update on mutations
// Layout becomes a client component that reads from store
```

**Trade-off:** More complex, requires refactoring layout to client component. Only pursue if server caching doesn't meet performance targets.

---

## 3. React.cache Expansion

### Current State

**File:** `src/lib/auth/session.ts`  
**Current usage:** Only `getCurrentUserContext` is wrapped in `React.cache()`

```typescript
// Current implementation
import { cache } from 'react';

export const getCurrentUserContext = cache(async () => {
  // ... fetch user context
});
```

**Problem:** Other repository functions are called multiple times per request (e.g., `getCurrentWorkspaceProject()` called in layout AND page), causing duplicate queries.

### Optimization Strategy

Wrap all repository functions that are called multiple times per request:

```typescript
// src/lib/projects/actions.ts
import { cache } from 'react';

export const getCurrentWorkspaceProject = cache(async (projectId: string) => {
  // ... existing implementation
});

export const getProjectCollaborationSummary = cache(async (projectId: string) => {
  // ... existing implementation
});

export const getProjectPublicationSummary = cache(async (projectId: string) => {
  // ... existing implementation
});

// src/lib/estimates/actions.ts
export const listProjectEstimateSheets = cache(async (projectId: string) => {
  // ... existing implementation
});

export const getProjectEstimateTreeByNode = cache(async (nodeId: string) => {
  // ... existing implementation
});

// src/lib/component-library/actions.ts
export const getCurrentWorkspaceComponentLibrary = cache(async () => {
  // ... existing implementation
});

// src/lib/workshop/actions.ts
export const getWorkshopHomebaseData = cache(async () => {
  // ... existing implementation
});

export const listCurrentWorkspaceProjects = cache(async () => {
  // ... existing implementation
});
```

**How it works:** `React.cache()` deduplicates calls within the same React render tree. If `getCurrentWorkspaceProject()` is called in layout and page, only one Supabase query executes.

**Latency improvement:** ~50ms saved on estimate workspace page (eliminates duplicate `getCurrentWorkspaceProject()` call).

### Important: React.cache vs unstable_cache

| Feature | React.cache | unstable_cache |
|---------|-------------|----------------|
| **Scope** | Single request | Across requests |
| **Duration** | Until request completes | Configurable (seconds/minutes) |
| **Use case** | Deduplication within render | Caching across navigations |
| **Invalidation** | Automatic (request ends) | Manual (`revalidateTag`) |

**Strategy:** Use `React.cache()` for deduplication within a request. Use `unstable_cache()` for caching across navigations (see Section 6).

---

## 4. N+1 Query Fixes

### Problem: Sequential Queries in Loops

**Example 1: Projects List**

```typescript
// src/lib/projects/workspace-repository.ts
export async function listCurrentWorkspaceProjects() {
  const projects = await db.select().from(projectsTable);
  
  // N+1: For each project, fetch metadata in separate queries
  const projectsWithMetadata = await Promise.all(
    projects.map(async (project) => ({
      ...project,
      estimateCount: await getEstimateCount(project.id), // ← Query per project
      lastModified: await getLastModified(project.id),   // ← Query per project
      thumbnail: await getProjectThumbnail(project.id),  // ← Query per project
    }))
  );
  
  return projectsWithMetadata;
}
```

**Impact:** 10 projects = 30 extra queries. 50 projects = 150 extra queries.

### Optimization: Batch Queries

```typescript
// Optimized version
export async function listCurrentWorkspaceProjects() {
  const projects = await db.select().from(projectsTable);
  
  if (projects.length === 0) return [];
  
  const projectIds = projects.map(p => p.id);
  
  // Batch: Fetch all metadata in 3 queries (not N*3)
  const [estimateCounts, lastModifiedDates, thumbnails] = await Promise.all([
    // Single query: SELECT project_id, COUNT(*) FROM estimates WHERE project_id IN (...)
    db.select({
      projectId: estimatesTable.projectId,
      count: sql<number>`count(*)`.mapWith(Number),
    })
      .from(estimatesTable)
      .where(inArray(estimatesTable.projectId, projectIds))
      .groupBy(estimatesTable.projectId),
    
    // Single query: SELECT project_id, MAX(updated_at) FROM estimate_row_items WHERE project_id IN (...)
    db.select({
      projectId: estimateRowItemsTable.projectId,
      lastModified: sql<Date>`max(${estimateRowItemsTable.updatedAt})`,
    })
      .from(estimateRowItemsTable)
      .where(inArray(estimateRowItemsTable.projectId, projectIds))
      .groupBy(estimateRowItemsTable.projectId),
    
    // Single query: SELECT project_id, image_url FROM project_images WHERE project_id IN (...)
    db.select({
      projectId: projectImagesTable.projectId,
      imageUrl: projectImagesTable.imageUrl,
    })
      .from(projectImagesTable)
      .where(inArray(projectImagesTable.projectId, projectIds)),
  ]);
  
  // Merge results
  const estimateCountMap = new Map(estimateCounts.map(e => [e.projectId, e.count]));
  const lastModifiedMap = new Map(lastModifiedDates.map(l => [l.projectId, l.lastModified]));
  const thumbnailMap = new Map(thumbnails.map(t => [t.projectId, t.imageUrl]));
  
  return projects.map(project => ({
    ...project,
    estimateCount: estimateCountMap.get(project.id) ?? 0,
    lastModified: lastModifiedMap.get(project.id) ?? project.createdAt,
    thumbnail: thumbnailMap.get(project.id) ?? null,
  }));
}
```

**Latency improvement:** ~30ms saved for 10 projects, ~150ms saved for 50 projects.

### Example 2: Estimate Tree

```typescript
// src/lib/estimates/actions.ts
export async function getProjectEstimateTreeByNode(nodeId: string) {
  // Current: Sequential queries
  const node = await db.select().from(estimateNodesTable).where(eq(estimateNodesTable.id, nodeId));
  const estimate = await db.select().from(estimatesTable).where(eq(estimatesTable.id, node.estimateId));
  const allNodes = await db.select().from(estimateNodesTable).where(eq(estimateNodesTable.estimateId, estimate.id));
  const rowItems = await db.select().from(estimateRowItemsTable).where(eq(estimateRowItemsTable.estimateId, estimate.id));
  
  // ... assembly
}
```

**Optimization:** Use JOINs or batch queries:

```typescript
export async function getProjectEstimateTreeByNode(nodeId: string) {
  // Optimized: Single query with JOINs
  const result = await db
    .select({
      node: estimateNodesTable,
      estimate: estimatesTable,
      rowItems: estimateRowItemsTable,
    })
    .from(estimateNodesTable)
    .innerJoin(estimatesTable, eq(estimateNodesTable.estimateId, estimatesTable.id))
    .leftJoin(estimateRowItemsTable, eq(estimateNodesTable.id, estimateRowItemsTable.nodeId))
    .where(eq(estimateNodesTable.id, nodeId));
  
  // ... assembly from joined result
}
```

**Latency improvement:** ~40ms saved (4 sequential queries → 1 JOIN query).

### N+1 Audit Checklist

- [ ] `listCurrentWorkspaceProjects()` — batch metadata queries
- [ ] `getProjectEstimateTreeByNode()` — use JOINs
- [ ] `getCurrentWorkspaceComponentLibrary()` — batch category/supplier/brand queries
- [ ] `getWorkshopHomebaseData()` — batch recent projects/estimates queries
- [ ] `getProjectCollaborationSummary()` — batch member/invitation queries

---

## 5. Query Batching Strategies

### Strategy A: DataLoader Pattern (GraphQL-style)

For complex N+1 scenarios, implement a DataLoader:

```typescript
// src/lib/dataloader.ts
export class DataLoader<K, V> {
  private batch: Map<K, Promise<V>> = new Map();
  private batchFn: (keys: K[]) => Promise<Map<K, V>>;
  
  constructor(batchFn: (keys: K[]) => Promise<Map<K, V>>) {
    this.batchFn = batchFn;
  }
  
  async load(key: K): Promise<V> {
    if (this.batch.has(key)) {
      return this.batch.get(key)!;
    }
    
    const promise = new Promise<V>((resolve, reject) => {
      // Schedule batch execution on next tick
      queueMicrotask(async () => {
        const keys = Array.from(this.batch.keys());
        try {
          const results = await this.batchFn(keys);
          keys.forEach(k => {
            const result = results.get(k);
            if (result) {
              this.batch.get(k)?.then(() => resolve(result));
            }
          });
        } catch (error) {
          this.batch.forEach(p => p.catch(() => reject(error)));
        }
        this.batch.clear();
      });
      
      this.batch.set(key, promise);
    });
    
    return promise;
  }
}

// Usage
const estimateCountLoader = new DataLoader<string, number>(async (projectIds) => {
  const counts = await db.select({
    projectId: estimatesTable.projectId,
    count: sql<number>`count(*)`.mapWith(Number),
  })
    .from(estimatesTable)
    .where(inArray(estimatesTable.projectId, projectIds))
    .groupBy(estimatesTable.projectId);
  
  return new Map(counts.map(c => [c.projectId, c.count]));
});

// In repository
export async function getProject(projectId: string) {
  const project = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  const estimateCount = await estimateCountLoader.load(projectId);
  return { ...project, estimateCount };
}
```

**When to use:** Complex dependency graphs where multiple functions need the same data.

### Strategy B: Supabase RPC (Stored Procedures)

For frequently-accessed aggregated data, create Supabase RPC functions:

```sql
-- supabase/migrations/20260529_create_project_summary_rpc.sql
CREATE OR REPLACE FUNCTION get_project_summary(p_project_id UUID)
RETURNS TABLE (
  project JSONB,
  estimate_count INTEGER,
  last_modified TIMESTAMPTZ,
  collaboration_summary JSONB,
  publication_summary JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    row_to_json(p.*) AS project,
    (SELECT COUNT(*) FROM estimates e WHERE e.project_id = p_project_id) AS estimate_count,
    (SELECT MAX(updated_at) FROM estimate_row_items eri WHERE eri.project_id = p_project_id) AS last_modified,
    (SELECT json_build_object('members', COUNT(*), 'invitations', COUNT(*))
     FROM project_members pm
     LEFT JOIN project_invitations pi ON pi.project_id = p_project_id
     WHERE pm.project_id = p_project_id) AS collaboration_summary,
    (SELECT json_build_object('published', published, 'views', view_count)
     FROM project_publications pp
     WHERE pp.project_id = p_project_id
     LIMIT 1) AS publication_summary
  FROM projects p
  WHERE p.id = p_project_id;
END;
$$;
```

**Usage:**

```typescript
// src/lib/projects/actions.ts
export async function getProjectSummary(projectId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_project_summary', { p_project_id: projectId });
  
  if (error) throw error;
  return data[0]; // Single row with all aggregated data
}
```

**Latency improvement:** 1 RPC call vs 5-6 separate queries. ~60-80ms saved.

**When to use:** Data that's always accessed together (e.g., project + metadata + counts).

---

## 6. Server-Side Caching with unstable_cache

### When to Use unstable_cache

| Data Type | Cache Duration | Invalidation Strategy |
|-----------|----------------|----------------------|
| Project layout (collaboration, estimates) | 30 seconds | `revalidateTag` on project/estimate mutations |
| Component library (categories, suppliers) | 5 minutes | `revalidateTag` on library mutations |
| Workshop homebase (recent projects) | 1 minute | `revalidateTag` on project/estimate mutations |
| Estimate templates | 10 minutes | `revalidateTag` on template mutations |
| User context (RBAC, workspace) | 1 hour | `revalidateTag` on auth changes |

### Implementation Example

```typescript
// src/lib/component-library/cache.ts
import { unstable_cache } from 'next/cache';
import { getCurrentWorkspaceComponentRowsLibrary } from './actions';

export const getCachedComponentLibrary = unstable_cache(
  async () => {
    return await getCurrentWorkspaceComponentRowsLibrary();
  },
  ['component-library'],
  {
    revalidate: 5 * 60, // 5 minutes
    tags: ['component-library'],
  }
);

// In page.tsx
import { getCachedComponentLibrary } from '@/lib/component-library/cache';

export default async function LibraryPage() {
  const library = await getCachedComponentLibrary();
  return <ComponentLibraryManager library={library} />;
}

// In mutations
import { revalidateTag } from 'next/cache';

export async function createComponent(data: CreateComponentData) {
  // ... create logic
  revalidateTag('component-library');
}
```

### Cache Key Strategy

**User-scoped data:** Include user ID in cache key:

```typescript
export const getCachedProjects = unstable_cache(
  async (userId: string) => {
    return await listCurrentWorkspaceProjects(userId);
  },
  ['user-projects'],
  {
    revalidate: 60,
    tags: ['user-projects'],
  }
);

// Usage
const { user } = await requireCurrentUserContext();
const projects = await getCachedProjects(user.id);
```

**Workspace-scoped data:** Include workspace ID:

```typescript
export const getCachedComponentLibrary = unstable_cache(
  async (workspaceId: string) => {
    return await getCurrentWorkspaceComponentRowsLibrary(workspaceId);
  },
  ['workspace-library'],
  {
    revalidate: 5 * 60,
    tags: ['workspace-library'],
  }
);
```

---

## 7. Implementation Priority

### Phase 1: Quick Wins (P1)

| Task | Latency Saved | Effort | Risk |
|------|---------------|--------|------|
| **1.1 Move auth to middleware** | ~100ms/nav | Medium | Medium (auth regression) |
| **1.2 React.cache on repository functions** | ~50ms/nav | Low | Low |
| **1.3 Project layout caching (unstable_cache)** | ~90ms/sub-nav | Medium | Low |

**Total savings:** ~240ms per navigation (3 navigations = ~720ms saved)

### Phase 2: N+1 Fixes (P2)

| Task | Latency Saved | Effort | Risk |
|------|---------------|--------|------|
| **2.1 Batch project metadata queries** | ~30ms (10 projects) | Medium | Low |
| **2.2 Optimize estimate tree JOINs** | ~40ms | Medium | Low |
| **2.3 Batch component library queries** | ~20ms | Medium | Low |

**Total savings:** ~90ms per cold navigation

### Phase 3: Advanced Caching (P3)

| Task | Latency Saved | Effort | Risk |
|------|---------------|--------|------|
| **3.1 Cache component library (5min)** | ~80ms/revisit | Low | Low |
| **3.2 Cache workshop homebase (1min)** | ~80ms/revisit | Low | Low |
| **3.3 Supabase RPC for project summary** | ~60ms | High | Medium |

**Total savings:** ~220ms per warm navigation

### Rollback Strategy

Every optimization is independently revertible:
- **Middleware migration:** Revert `src/middleware.ts`, restore `src/proxy.ts` imports
- **React.cache:** Remove `cache()` wrapper, function still works (just slower)
- **unstable_cache:** Remove cache wrapper, function still works (just slower)
- **N+1 fixes:** Revert query changes, functionality unchanged (just slower)

**Validation after each task:**
1. `bun run validate` — type check + lint
2. `bun run test:e2e` — auth + CRUD flows
3. Manual test: Navigate through project segment, verify no stale data
4. Performance test: Run benchmark scenarios, confirm latency improvement

---

**Next:** See `18-performance-monitoring-production.md` for runtime monitoring to catch regressions.
