# 11 — Prefetch Wiring Map: Exact Hookup Plan

**Status:** ⚠️ PARTIALLY SUPERSEDED — See `15-server-component-prefetch-reality.md` for corrected strategy  
**Created:** 2026-05-29  
**Updated:** 2026-05-29 — Correction note added after codebase verification  
**Purpose:** Map every navigation link in the app to its prefetch strategy.

> **⚠️ CORRECTION (2026-05-29):** The React Query keys listed in this document (`["projects"]`, `["homebase"]`, `["library"]`, `["templates"]`, `["project", projectId]`) **do not exist in the codebase.** Most workshop data is fetched in Server Components, not via React Query. The `router.prefetch()` calls still work for RSC payload prefetch. For the corrected strategy, see **`15-server-component-prefetch-reality.md`**. The estimate workspace route IS correctly covered (its React Query keys exist). This document is retained for the RSC prefetch wiring (sidebar, cards, mini-sidebar) which remains valid.

---

## Table of Contents

1. [Prefetch Architecture](#1-prefetch-architecture)
2. [Sidebar Navigation Prefetch Map](#2-sidebar-navigation-prefetch-map)
3. [Project Card Prefetch Map](#3-project-card-prefetch-map)
4. [Estimate Table Prefetch Map](#4-estimate-table-prefetch-map)
5. [Project Mini-Sidebar Prefetch Map](#5-project-mini-sidebar-prefetch-map)
6. [Prefetch Configuration Matrix](#6-prefetch-configuration-matrix)
7. [Implementation Checklist](#7-implementation-checklist)

---

## 1. Prefetch Architecture

### Dual Prefetch Strategy

Every hover prefetch does TWO things simultaneously:

1. **RSC Payload Prefetch:** `router.prefetch(href)` — preloads the Next.js Route Segment Config (server component output).
2. **React Query Data Prefetch:** `queryClient.prefetchQuery(...)` — preloads the data that the target page's client components will request.

This means when the user clicks, both the server component and its data are already cached. The transition is near-instant.

### Timing

- **Debounce:** 200ms on `pointerenter` before prefetch fires. Prevents accidental hovers from triggering Supabase queries.
- **Cancel on leave:** `pointerleave` cancels the pending debounce timer.
- **No re-prefetch:** If data is already in React Query cache and not stale, `prefetchQuery` is a no-op (React Query deduplicates).

### Query Key Conventions

All prefetch query keys must match the keys used by the target page's hooks. Verified keys from codebase:

| Key | Used By | staleTime |
|-----|---------|-----------|
| `["estimate", estimateId]` | `useEstimateQuery` | Global (30s → 5min) |
| `["estimate", estimateId, "area-tree"]` | `useEstimateAreaTreeQuery` | 30s (explicit) |
| `["projects"]` | Projects page (implicit) | Global |
| `["project", projectId]` | Project detail (implicit) | Global |
| `["library"]` | Library page (implicit) | Global |

---

## 2. Sidebar Navigation Prefetch Map

**File to modify:** `src/components/sidebar/SidebarNavItemRow.tsx` (46 lines)

The sidebar renders 5 items via `sidebarNavItems` in `MainSidebar.tsx`:

| Item | href | RSC Prefetch | Data to Prefetch | Query Key |
|------|------|-------------|------------------|-----------|
| Workshop | `/workshop` | `router.prefetch("/workshop")` | `getWorkshopHomebaseData()` | `["homebase"]` |
| Projects | `/workshop/projects` | `router.prefetch("/workshop/projects")` | `listCurrentWorkspaceProjects()` | `["projects"]` |
| Components | `/workshop/library` | `router.prefetch("/workshop/library")` | `getCurrentWorkspaceComponentRowsLibrary()` | `["library"]` |
| Templates | `/workshop/templates` | `router.prefetch("/workshop/templates")` | `getCurrentWorkspaceEstimateTemplates()` | `["templates"]` |
| Settings | `/workshop/settings` | `router.prefetch("/workshop/settings")` | None (lightweight forms) | N/A |

**Implementation approach:**

```tsx
// In MainSidebar.tsx — pass prefetch config to SidebarNavItemRow
const prefetchConfigs: Record<string, PrefetchConfig> = {
  "/workshop": { queryKey: ["homebase"], queryFn: () => prefetchHomebaseData() },
  "/workshop/projects": { queryKey: ["projects"], queryFn: () => prefetchProjects() },
  "/workshop/library": { queryKey: ["library"], queryFn: () => prefetchLibrary() },
  "/workshop/templates": { queryKey: ["templates"], queryFn: () => prefetchTemplates() },
  "/workshop/settings": {},
};

// In SidebarNavItemRow.tsx — add pointer handlers
<Link
  href={item.href}
  prefetch={false}
  onPointerEnter={() => handlePointerEnter(item.href)}
  onPointerLeave={() => handlePointerLeave(item.href)}
>
```

**Note:** `prefetch={false}` disables Next.js default viewport-based prefetch. We replace it with our more targeted hover-based prefetch.

---

## 3. Project Card Prefetch Map

**File to modify:** `src/components/workshop/LiveProjectCard.tsx` (263 lines)

Each project card links to `/workshop/projects/[projectId]`. On hover:

| Data to Prefetch | Query Key | Source |
|------------------|-----------|--------|
| Project detail | `["project", projectId]` | `getCurrentWorkspaceProject(projectId)` |
| Project estimates list | `["project", projectId, "estimates"]` | `listProjectEstimates(projectId)` |

**Implementation approach:**

```tsx
// In LiveProjectCard.tsx
const { handlePointerEnter, handlePointerLeave } = usePrefetchOnHover([{
  href: `/workshop/projects/${project.id}`,
  queryKey: ["project", project.id],
  queryFn: () => prefetchProjectDetail(project.id),
}, {
  href: `/workshop/projects/${project.id}/estimates`,
  queryKey: ["project", project.id, "estimates"],
  queryFn: () => prefetchProjectEstimates(project.id),
}]);

<Link
  href={`/workshop/projects/${project.id}`}
  prefetch={false}
  onPointerEnter={() => handlePointerEnter(`/workshop/projects/${project.id}`)}
  onPointerLeave={() => handlePointerLeave(`/workshop/projects/${project.id}`)}
>
```

---

## 4. Estimate Table Prefetch Map

**File to modify:** `src/components/workshop/ProjectEstimatesTable.tsx` (846 lines)

Each estimate row links to `/workshop/projects/[projectId]/estimates/[nodeId]`. On hover:

| Data to Prefetch | Query Key | Source |
|------------------|-----------|--------|
| Estimate tree | `["estimate", estimateId]` | `estimateRepository.getEstimateTree(estimateId)` |
| Estimate area tree | `["estimate", estimateId, "area-tree"]` | `fetchEstimateTree({ projectId, estimateId })` |
| Component library | `["library"]` | `getCurrentWorkspaceComponentLibrary()` |

**Note:** The estimate workspace is the heaviest page (~4,048 + ~1,365 lines). Prefetching its data is the highest-impact prefetch in the entire app.

**Implementation approach:**

```tsx
// On each estimate row
onPointerEnter={() => handlePointerEnter(`/workshop/projects/${projectId}/estimates/${nodeId}`, {
  queryKey: ["estimate", estimateId],
  queryFn: () => estimateRepository.getEstimateTree(estimateId),
})}
```

---

## 5. Project Mini-Sidebar Prefetch Map

**File to modify:** `src/components/workshop/ProjectMiniSidebar.tsx` (75 lines)

The mini-sidebar has 3 links:

| Link | href | Data to Prefetch | Query Key |
|------|------|------------------|-----------|
| Dashboard | `/workshop/projects/[projectId]` | Project detail (already cached from card hover) | `["project", projectId]` |
| Estimates | `/workshop/projects/[projectId]/estimates` | `listProjectEstimates(projectId)` | `["project", projectId, "estimates"]` |
| Charts | `/workshop/projects/[projectId]/charts` | `getProjectChartsData(projectId)` | `["project", projectId, "charts"]` |

---

## 6. Prefetch Configuration Matrix

| Source Component | Target Route | RSC Prefetch | Data Prefetch | Priority |
|-----------------|-------------|-------------|---------------|----------|
| `SidebarNavItemRow` | `/workshop` | Yes | Homebase data | Medium |
| `SidebarNavItemRow` | `/workshop/projects` | Yes | Projects list | High |
| `SidebarNavItemRow` | `/workshop/library` | Yes | Library data | Medium |
| `SidebarNavItemRow` | `/workshop/templates` | Yes | Templates data | Low |
| `SidebarNavItemRow` | `/workshop/settings` | Yes | None | Low |
| `LiveProjectCard` | `/workshop/projects/[id]` | Yes | Project detail + estimates | High |
| `ProjectEstimatesTable` row | `/workshop/projects/[id]/estimates/[nodeId]` | Yes | Estimate tree + area tree + library | **Critical** |
| `ProjectMiniSidebar` | `/workshop/projects/[id]/estimates` | Yes | Estimates list | Medium |
| `ProjectMiniSidebar` | `/workshop/projects/[id]/charts` | Yes | Chart data | Medium |

---

## 7. Implementation Checklist

### Phase 2, Task 2.1: Create `usePrefetchOnHover` Hook

- [ ] Create `src/hooks/use-prefetch-on-hover.ts`
- [ ] Implement 200ms debounce on `pointerenter`
- [ ] Cancel debounce on `pointerleave`
- [ ] Call both `router.prefetch(href)` and `queryClient.prefetchQuery(...)` on trigger
- [ ] Cap concurrent prefetches at 3 (cancel oldest if exceeded)
- [ ] Skip prefetch if `prefetchQuery` data is already fresh (staleTime check)

### Phase 2, Task 2.2: Wire Prefetch into Components

- [ ] `SidebarNavItemRow.tsx` — add `onPointerEnter`/`onPointerLeave` to all 5 sidebar links
- [ ] `MainSidebar.tsx` — pass prefetch config to `SidebarNavItemRow`
- [ ] `LiveProjectCard.tsx` — add hover prefetch for project detail
- [ ] `ProjectEstimatesTable.tsx` — add hover prefetch for estimate workspace (highest impact)
- [ ] `ProjectMiniSidebar.tsx` — add hover prefetch for estimates and charts

### Verification

- [ ] Open React Query DevTools. Hover over "Projects" in sidebar for 200ms.
- [ ] Verify "projects" query appears in cache with fresh data.
- [ ] Click "Projects". Verify the page loads instantly (from cache).
- [ ] Hover over a project card for 200ms. Verify project detail query appears in cache.
- [ ] Click the card. Verify instant navigation.
- [ ] Hover over an estimate row for 200ms. Verify estimate tree query appears in cache.
- [ ] Click the row. Verify estimate workspace loads with minimal skeleton display time.

---

**Next:** See `12-overlay-fallback-strategy.md` for making the loading overlay a rare fallback.
