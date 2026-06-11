# 11 — Estimate List Page Audit

**Date**: 2026-06-11 | **Status**: Current source corrected | **Prior Oracle**: Gaps filled in Review #2 | **Last Update**: 2026-06-11 02:42 UTC
**Scope**: `/workshop/projects/[projectId]/estimates` — intermediate page in the north-star path
**Oracle Gap**: The audit previously skipped the estimate list page between the project layout and the estimate sheet.

---

## 1. Rendering Path

### Server Component: `src/app/workshop/projects/[projectId]/estimates/page.tsx` (30 lines)

```
ProjectEstimatesPage (Server)
├── listProjectEstimates(projectId) — fetches project + estimates + aggregates
└── Return:
    └── ProjectEstimatesClient (Client)
        ├── ProjectEstimatesTable
        ├── SearchInput — client-side filtering
        ├── Button ("Create estimate sheet")
        └── EmptyState — when no estimates exist
```

**Wrapped by**: `ProjectLayout` (layout.tsx) → `WorkshopPageShell` → `WorkshopLayout` → `RootLayout`

---

## 2. Data Fetching

### `listProjectEstimates(projectId)` — `src/lib/repositories/workspace-repository.ts`

This function fetches and computes:

| Operation | Query | Table | Cost |
|-----------|-------|-------|------|
| 1 | `getCurrentWorkspaceProject(projectId)` → `ensureDefaultWorkspace()` | (cached per request) | Medium |
| 2 | `projects.select("*").eq("id", projectId)` | `projects` | Low |
| 3 | `workspaces.select("*")` | `workspaces` | Low |
| 4 | `estimates.select("*").eq("project_id").order("updated_at")` | `estimates` | Medium because it may overfetch metadata |
| 5 | `estimate_nodes.select("id, estimate_id, kind, sort_order").in("estimate_id", estimateIds)` | `estimate_nodes` | Medium for many estimates |
| 6 | `estimate_row_items.select("estimate_id, quantity, unit_cost, contingency_percentage, misc_cost").in("estimate_id", estimateIds)` | `estimate_row_items` | Medium for many estimates; current source no longer fetches `source_snapshot` here |

**Post-fetch computation** (JavaScript, server-side):
- `nodeCountByEstimateId`: Group nodes by estimate
- `rowCountByEstimateId`: Group row items by estimate
- `totalCostByEstimateId`: For EACH row item, compute `quantity × unitCost + miscCost + (subTotal × contingency%) / 100`

**Key concern**: For a project with 50 estimates x 100 rows each = **5,000 row calculations** on the server. Current source has already narrowed row-item columns, so the remaining issue is row transfer plus JavaScript aggregation, not `source_snapshot` overfetch on this page.

### Performance Bottlenecks

| Issue | Severity | Detail |
|-------|----------|--------|
| Row transfer for all estimate row items | **MEDIUM** | Fetches aggregate columns for every row item across all estimates |
| `select("*")` on `estimates` | **MEDIUM** | May fetch metadata not needed by the list |
| O(n) cost calculation | **MEDIUM** | 5,000 row calculations for a 50-estimate project |
| Waterfall dependency | **LOW** | `getCurrentWorkspaceProject` must resolve first (inherited from layout) |

**Note**: `listProjectEstimateSheets()` (line 1406) is a SEPARATE lightweight function used by the publication header — it only fetches `id, name, sheet_code`. The estimate list page uses `listProjectEstimates()` which does the heavy aggregate computation.

---

## 3. Client Component Analysis

### `ProjectEstimatesClient.tsx` (124 lines)

| Aspect | Detail |
|--------|--------|
| State | `searchQuery`, `isCreating`, `createError` |
| Refs | `createInFlightRef` (prevents double-submit) |
| Memoization | `filteredEstimates` via `useMemo` — filters by sheet_code + name |
| Search | Client-side `String.includes()` — O(n) per keystroke, no debounce |
| Navigation | `useNavigationRouter` — triggers route-loading overlay |
| Create action | `createEstimateSheetDraft(projectId)` server action → `router.refresh()` |

### Performance Assessment
- ✅ Lightweight (124 lines) — no heavy computation
- ⚠️ **No debounce on search**: Filtering runs on every keystroke. For 50+ estimates, this is negligible (~50 string comparisons). Not a real bottleneck.
- ✅ **In-flight guard**: `createInFlightRef` prevents double form submission
- ✅ **Empty/error states**: Handled properly

---

## 4. `ProjectEstimatesTable` Component

**File**: `src/components/workshop/ProjectEstimatesTable.tsx` — **1,002 lines** (measured)

Renders a table of estimate sheets using `@tanstack/react-table` with:
- Inline name editing
- Column resizing (persisted to localStorage)
- Prefetch-on-hover via `usePrefetchOnHover`
- Bulk delete with selection
- `useTransition` for non-blocking state updates

**Performance assessment**: Moderately complex (1,002 lines). The `@tanstack/react-table` dependency with `flexRender` and `useReactTable` adds ~14KB gzip but is tree-shaken. Column width persistence via localStorage is a synchronous operation on mount. Inline editing uses `useTransition` which is good for keeping the UI responsive during server actions.

---

## 5. Data Flow for Navigation

When a user clicks an estimate from the list:

```
Click estimate row
  → navigate to /workshop/projects/[projectId]/estimates/[firstNodeId]
    → [ProjectLayout re-renders — new child, same layout]
      → ProjectEstimateNodePage loads
        → getProjectEstimateTreeByNode(projectId, nodeId)
        → getCurrentWorkspaceComponentLibrary()
```

The estimate list page itself is **purely a navigation intermediary** — it doesn't need to preload the estimate sheet. It just needs to display the list and provide click targets.

---

## 6. Performance Recommendations

### R-E1: Replace Row Transfer and JavaScript Reduction With Aggregate Query

**Current**: Fetches selected row aggregate columns for every estimate row item in the project, then reduces in JavaScript.

**Better**: Use a Supabase aggregate or Postgres function:
```sql
SELECT estimate_id, COUNT(*) as row_count, SUM(quantity * unit_cost + misc_cost + (quantity * unit_cost * contingency_percentage / 100)) as total_cost
FROM estimate_row_items
WHERE estimate_id IN (<estimate_ids>)
GROUP BY estimate_id;
```

This reduces payload from N row aggregate records to N estimate aggregate records. It also moves arithmetic to Postgres, where the query plan can be measured with `EXPLAIN ANALYZE`.

**Impact**: **HIGH for large projects** — eliminates the largest remaining scaling cost on the estimate list page.

### R-E2: Replace Node Transfer With Count Query

**Current**: Fetches `id, estimate_id, kind, sort_order` for all nodes to derive first area node and node count.

**Better**:
```sql
SELECT estimate_id, COUNT(*) as node_count
FROM estimate_nodes
WHERE estimate_id IN (<estimate_ids>)
GROUP BY estimate_id;
```

**Impact**: **MEDIUM** — reduces node payload, but keep the first-node navigation requirement explicit.

### R-E4: Narrow `estimates.select("*")`

Replace list-page `estimates.select("*")` with the columns actually consumed by `ProjectEstimatesClient` and `ProjectEstimatesTable`.

**Impact**: **MEDIUM** — removes avoidable estimate metadata payload before larger aggregate work.

### R-E3: Add Debounce to Search (Optional)

Add 150ms debounce to `searchQuery` state. Currently negligible for 50 estimates, but would matter at 500+.

---

## 7. Estimate List — Position in Critical Path

```
/ (landing)
  → /workshop (homebase dashboard)
    → /workshop/projects (project list)
      → /workshop/projects/[projectId] (project dashboard)
        → /workshop/projects/[projectId]/estimates (ESTIMATE LIST) ← THIS PAGE
          → /workshop/projects/[projectId]/estimates/[nodeId] (ESTIMATE SHEET)
```

This page is the **last step before the estimate sheet**. It's the gateway — every user who edits an estimate passes through this page.

**Current performance**: The page's main bottleneck is the `listProjectEstimates()` cost computation. For small projects (1-5 estimates), this is negligible. For large projects (50+ estimates), the row aggregation becomes noticeable.

---

## 8. Integration with Main Audit

This page's performance is affected by:
- **Project Layout waterfall** (R3): `getCurrentWorkspaceProject` blocks layout rendering, which blocks this page
- **Component library lazy-load** (R4): The estimate list page doesn't load the library — this is only an issue on the estimate sheet page
- **Column selection** (R2): `listProjectEstimates()` still uses `estimates.select("*")`; estimate-sheet tree loads still use `estimate_row_items.select("*")`

**The most impactful fix for this page is R-E1**: replacing row transfer plus JavaScript reduction with a server-side aggregate query/RPC. This directly benefits large projects and should include arithmetic parity tests before replacing the current path.
