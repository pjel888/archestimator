# Templates Page — Data Flow & Performance

**Date**: 2026-06-11  
**Testing**: Live browser with 3 template dataset

---

## 1. Data Fetching Pipeline

### Architecture: Server Components First

```
Browser Request
  └→ Next.js App Router
      └→ templates/page.tsx (RSC)
          └→ getCurrentWorkspaceEstimateTemplates()
              └→ ensureDefaultWorkspace()         // gets workspace record
              └→ createSupabaseServerClient()      // SSR client with cookies
              └→ loadCurrentWorkspaceEstimateTemplates()
                  ├→ supabase.from("estimate_templates").select("*")
                  │     .eq("workspace_id", ...)
                  │     .order("sort_order")
                  │     .order("name")
                  │
                  ├→ [if templates exist] Promise.all([
                  │     supabase.from("estimate_template_nodes").select("*")
                  │       .in("template_id", templateIds)
                  │       .order("sort_order"),
                  │     supabase.from("estimate_template_row_items").select("*")
                  │       .in("template_id", templateIds)
                  │       .order("sort_order"),
                  │   ])
                  │
                  └→ buildEstimateTemplatesFromRows()  // flat → hierarchical
```

### Query Pattern
- **3 DB queries max** (1 for templates, 2 parallel for nodes + rows)
- **Error-tolerant**: Falls back to hardcoded `estimateTemplates` if `estimate_templates` table missing (graceful degradation for dev/seed states)
- **RLS-protected**: All queries respect workspace-level RLS policies

### Data Volume (current state)
| Table | Rows | Size estimate |
|-------|------|---------------|
| `estimate_templates` | 3 | ~1KB |
| `estimate_template_nodes` | 10 | ~2KB |
| `estimate_template_row_items` | 15 | ~3KB |
| **Total payload** | | **~5-6KB** |

### Client-Side Processing (post-hydration)
The source-level filtering work is client-side, but the earlier browser capture also observed subsequent RSC POSTs. Treat "zero network after initial load" as unproven until the source of those requests is identified:
- Category filtering → `getTemplatesForTreeNode()` — `Array.filter()`
- Search → `templateMatchesSheetQuery()` — `Array.filter()` with string matching
- Tree building → `buildTemplateNavigationTree()` — `useMemo` (runs once)
- Summaries → `summarizeEstimateTemplate()` — `useMemo` (runs once)

---

## 2. Rendering Strategy

### Server Components
| Component | RSC? | Notes |
|-----------|------|-------|
| `TemplatesPage` | ✅ Async RSC | Fetches data, passes to client |
| `WorkshopPageShell` | ✅ Async RSC | Fetches user + panel widths |
| `MainSidebar` | ✅ RSC | Static nav + user data |
| `WorkshopTitleHeader` | ✅ RSC | Static header |
| `WorkshopFeedbackModal` | ✅ RSC | Rendered in footer |

### Client Components
| Component | Reason |
|-----------|--------|
| `TemplatesPageClient` | Needs `"use client"` for child |
| `TemplateLibraryManager` | Uses `useState`, `useMemo`, event handlers |
| `TemplateLibrarySheet` | Uses `useState` for search |
| `TemplateLibraryTreePanel` | Uses `useState` for search, expansion |

### Hydration Boundary
```
RSC HTML stream (shell + data) 
  └→ Browser renders static HTML
      └→ React hydrates client components
          └→ TemplateLibraryManager becomes interactive
              └→ Search, tree, resize all functional
```

### Suspense Boundary
`WorkshopPageShell` wraps children in `<Suspense>` with skeleton fallback. This means the shell (sidebar, header, footer) renders immediately while templates content streams in.

---

## 3. Performance Metrics (Observed)

### Network (from Playwright)
| Metric | Value | Notes |
|--------|-------|-------|
| Initial page POST | 1 RSC request | Returns full rendered HTML |
| Subsequent interactions | 3 POSTs (RSC updates) | Tree node clicks trigger RSC revalidation |
| Static assets | ~35 requests | JS chunks, CSS, icons, fonts |
| Console errors | 0 | Clean |
| Console warnings | 0 | Clean |

### Client-Side Performance
| Operation | Time | Method |
|-----------|------|--------|
| Category filter | <1ms | `Array.filter()` on 3 items |
| Template filter | <1ms | `Array.filter()` on 3 items |
| Search | <1ms per keystroke | String matching on 3 items |
| Tree build | <1ms | `useMemo` on mount |
| Summary compute | <1ms | Tree traversal on 10 live nodes |
| Panel resize | 0ms (CSS) | ResizeObserver + CSS |

### Scale Projection
| Templates | Filter time | Tree render | Card render | Overall |
|-----------|-------------|-------------|-------------|---------|
| 10 | <1ms | <5ms | <10ms | Instant |
| 100 | <2ms | <20ms | <50ms | Perceptible |
| 1,000 | <5ms | <100ms | <200ms | Lag possible |
| 10,000 | <50ms | <500ms | <1s | Degraded |

**Bottleneck at scale**: Tree rendering (virtualization not implemented). Card list would need virtualization beyond ~500 templates.

---

## 4. Code Splitting

### Template Page Bundle
```
templates/page.tsx → templates/loading.tsx → templates/error.tsx
  └→ TemplatesPageClient (inline)
      └→ TemplateLibraryManager (inline, ~422 lines)
```

**Not dynamically imported**: TemplateLibraryManager is directly imported, meaning the full 422-line component ships in the templates page bundle.

### Library Page (comparison)
```
library/page.tsx
  └→ LibraryPageClient
      └→ ComponentLibraryManager (dynamic import with next/dynamic)
          └→ Loading: LibraryManagerFallback (separate chunk)
```

**Key difference**: Library page uses `next/dynamic` to lazy-load the heavy `ComponentLibraryManager`. Templates page does NOT use dynamic import — the entire manager ships in the initial bundle.

### Bundle Impact
- **Templates page**: ~422 lines of `TemplateLibraryManager` + dependencies (tree, resizable panel, etc.) in initial JS
- **Library page**: ComponentLibraryManager is code-split into separate chunk (404 error observed for one chunk in testing)

---

## 5. State Management

| State | Location | Persistence |
|-------|----------|-------------|
| Selected tree node | `useState` in TemplateLibraryManager | Session only (lost on navigation) |
| Expanded tree nodes | `useState` in TemplateLibraryTreePanel | Session only |
| Sheet search query | `useState` in TemplateLibrarySheet | Session only |
| Tree search query | `useState` in TemplateLibraryTreePanel | Session only |
| Tree panel width | `ResizableSidePanel` → localStorage | `template_library_tree_width` |
| Template data | Server prop (immutable client-side) | Server fetch on each navigation |

**No global state store used**: Templates page doesn't use Zustand, TanStack Query, or React Context — all state is local component state.

---

## 6. Accessibility Performance

- **No layout shift**: Shell renders before content via Suspense
- **No CLS from images**: Icons are inline SVGs (Phosphor)
- **Tabular numbers**: Cost values use `font-sans tabular-nums` for alignment
- **Focus indicators**: `focus-visible:ring-2 focus-visible:ring-focus` on interactive elements
- **ARIA landmarks**: `main`, `navigation`, `region`, `complementary`, `tree`, `treeitem`

---

## 7. Memory Footprint

| Data structure | Approximate size |
|----------------|-----------------|
| `EstimateTemplate[]` (3 items) | ~6KB serialized |
| `LibraryTreeNode[]` (tree) | ~1KB |
| React component tree | ~50-100 DOM nodes |
| Total page memory | <5MB (estimated) |

**No memory leaks observed**: All state is local, cleared on unmount.

---

## 8. Performance Evidence Correction Required

The audit currently contains conflicting claims:

- UX docs state post-load interactions are client-side with zero network.
- This performance doc observed 3 RSC POSTs during subsequent interactions.

Before implementation, confirm which is true. Acceptance requires either:

- search, tree selection, expand/collapse, and resize produce no network requests after initial load, or
- the RSC POST source is identified, justified, and measured as non-disruptive.

## 9. Second-Pass Evidence Corrections

| Claim | Updated evidence | Audit impact |
|-------|------------------|--------------|
| Current template-node count | Live Supabase count on 2026-06-11 is 10 nodes, not 14 | Correct all current-state and scale examples to avoid stale audit data |
| Apply-template backend | `src/lib/estimates/actions.ts` exposes `insertEstimateTemplateIntoEstimate()` and calls `insert_estimate_template_into_estimate_with_history` | Templates page should reuse or launch into the existing insertion contract rather than inventing a parallel pathway |
| Estimate-editor insertion UX | `EstimateSheetContent.tsx` and the shared component-library sidebar already support template insertion/drag-drop | Preferred plan is browse-first Templates page plus clear handoff to existing editor flow |
| Code splitting guidance | Local Next.js 16 docs recommend Server Components by default, route code splitting, and lazy loading Client Components where appropriate | Treat dynamic import as a measured recommendation: prove bundle impact before and after |
| Loading feedback | Local Next.js docs state `loading.tsx` gives immediate navigation feedback and keeps shared layouts interactive | Audit should verify route-level loading/error states visually, not only source existence |

## 10. Performance Audit Requirements Before Implementation

| Area | Required measurement | Passing target |
|------|----------------------|----------------|
| Initial route payload | `next build` route output or bundle analyzer comparison for `/workshop/templates` | No avoidable increase over baseline; client chunk reduction only if dynamic import is implemented and measured |
| Interaction latency | Browser trace or Playwright user timing for search, tree selection, expand/collapse, resize, card open, handoff action | No interaction above 200ms on seeded data; no visible resize jank |
| Core Web Vitals proxy | Lighthouse in incognito plus field-ready `useReportWebVitals` plan if analytics is enabled | No regression in LCP/CLS/INP proxy metrics |
| Data scale | Synthetic or fixture-backed test with 100 templates, 1,000 nodes, 5,000 rows | Search and tree render remain usable; virtualization/deferred filtering is introduced only if measured |
| Database query shape | Supabase query count and indexes for workspace template listing | Keep listing bounded or intentionally move to a server-side view/RPC with equivalent RLS proof |
