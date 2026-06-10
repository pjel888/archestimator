# 03 — Client-Side Bundle & UX Audit

**Date**: 2026-06-11 | **Status**: Source-audited; runtime measurement pending | **Prior Oracle**: 6 passes | **Last Update**: 2026-06-11 02:42 UTC
**Focus**: Estimate sheet page client-side performance

---

## Key Takeaways

1. **No virtualization** — the #1 rendering bottleneck. All rows render in DOM. Fix in Sprint 3 after computation fixes.
2. **4,336-line sheet component with high hook density** — current snapshot has 14 `useEffect`, 23 `useMemo`, 33 `useState`, 32 `useCallback`, and 7 `useRef` occurrences.
3. **`projectTotal` is a bare variable (current line ~3559)** — recalculates on every render, even non-row-edit renders. Fix in Sprint 0 after characterization.
4. **No `React.memo` on row table** — every keystroke in any cell appears able to re-render sibling row tables. Treat the memo wrapper as a Sprint 0 candidate, then prove prop identity and render-count impact.
5. **Formula calculations are client-side O(n)** — recursive tree traversals remain a likely keystroke bottleneck. `useDeferredValue` belongs after focus, tab-order, rollback, proposal-preview, and activity-scope tests exist.

---

## 1. Component Size Analysis

| Component | File | Lines (measured) | Severity |
|-----------|------|-----------------|----------|
| `EstimateSheetContent` | `src/components/workshop/EstimateSheetContent.tsx` | **4,336** | CRITICAL — monolithic, needs splitting |
| `EstimateSheetTree` | `src/components/workshop/EstimateSheetTree.tsx` | **1,354** | MEDIUM |
| `EstimateRightSidebar` | `src/components/workshop/component-library/index.tsx` | ~600 | MEDIUM |
| `ProjectTotalHeader` | `src/components/workshop/ProjectTotalHeader.tsx` | ~500 | MEDIUM |
| `MainSidebar` | `src/components/sidebar/MainSidebar.tsx` | ~400 | LOW |
| `WorkshopPageShell` | `src/components/workshop/WorkshopPageShell.tsx` | ~350 | LOW |
| **Workshop components total** | `src/components/workshop/*.tsx` | **15,064** | — |
| `AnimatedProposalRecordSection` | `src/components/landing/AnimatedProposalRecordSection.tsx` | **834** | MEDIUM — second largest in path |
| **Landing components total** | `src/components/landing/*.tsx` | **3,597** | — |

### Hook Density in `EstimateSheetContent.tsx` (measured)

| Hook | Count | Concern |
|------|-------|---------|
| `useCallback` | **32** | High — many stable references, but indicates complex callback chains |
| `useMemo` | **23** | High — several recalculate on every keystroke (currentRows, projectTotal, displayedSheetNode, visibleSheetRowIds, activityScopeItems) |
| `useState` | **33** | High — many separate state variables, complex state management |
| `useEffect` | **14** | High — potential for cascading effect chains |
| `useRef` | **7** | Medium — stable mutable state across UI flows |
| `addEventListener` | **4** | Medium — DOM event bindings (scroll, resize, etc.) |
| `useDeferredValue` / `useOptimistic` / `useTransition` | **0** | React 19 concurrency not used in the current sheet component |

---

## 2. Virtualization Gap — CRITICAL

### Current State
`EstimateSheetContent.tsx` renders the **entire list of rows directly in the DOM**. There is NO virtualization.

```typescript
// Current pattern (conceptual):
{editableRows.map(row => (
  <EstimateSheetBranch key={row.id}>
    <EstimateRowItemsTable>
      {/* All inputs, calculations, drag zones rendered in DOM */}
    </EstimateRowItemsTable>
  </EstimateSheetBranch>
))}
```

### Impact
| Sheet Size | Rows in DOM | Keystroke Re-render Cost |
|-----------|-------------|--------------------------|
| 50 rows | 50 | Moderate (still usable) |
| 200 rows | 200 | Noticeable input lag |
| 500 rows | 500 | Severe lag, blocking paint |
| 1000+ rows | 1000+ | Unusable |

### Recommended Solution
Implement `@tanstack/react-virtual` (requires `bun add @tanstack/react-virtual` — separate package, not included with `@tanstack/react-query`):

```typescript
const virtualizer = useVirtualizer({
  count: sortedRowIds.length,
  getScrollElement: () => scrollRef.current,
  estimateSize: () => 48, // default row height
  overscan: 10,
});
```

---

## 3. Keystroke-Driven Re-render Storm — CRITICAL

### The Chain Reaction
```
User types "1" in quantity input
  → onChange → setEditableRows (state update)
    → EstimateSheetContent re-renders (4,336-line component)
      → currentRows useMemo recalculates (flattens tree)
      → projectTotal useMemo recalculates (recursive sum)
      → displayedSheetNode useMemo recalculates
      → visibleSheetRowIds useMemo recalculates
        → ALL EstimateSheetBranch children re-render
          → ALL EstimateRowItemsTable children re-render
```

**5 `useMemo` hooks recalculate on every single keystroke**, each doing a tree traversal.

### Solution Direction
1. **Sprint 0**: keep input semantics unchanged and only add characterization, `React.memo` row-table guard, and `projectTotal` memoization.
2. **Sprint 2**: evaluate `useDeferredValue` after tests prove focus retention, tab navigation, rollback, proposal preview, and activity scope parity.

---

## 4. Client-Side Formula Calculations

All formula calculations happen **on the client, in real-time, on every keystroke**:

| Calculation | Function | Trigger | Complexity |
|-------------|----------|---------|------------|
| Row subtotal | `quantity * unit_cost` | Any input change | O(1) |
| Row line total | `subtotal + misc_cost + contingency_value` | Any input change | O(1) |
| Node total | `computeNodeTotal()` — recursive sum of children | Any child change | **O(n)** per keystroke |
| Project total | `computeRowTotal(estimateTree)` — sums entire tree | Any row change | **O(n)** per keystroke |

For a sheet with 500 rows: `projectTotal` does ~500 operations on every keystroke. At 60fps typing, that's **30,000 operations/second** just for totals.

### Recommendation
- Memoize `projectTotal` after behavior characterization.
- Evaluate `useDeferredValue` or branch-level memoization after input-focus tests exist.
- Cache intermediate node totals — only recalculate changed branches.
- Consider moving totals to a Web Worker for large sheets

---

## 5. Re-render Analysis by Trigger

| Trigger | Frequency | Components Affected | Severity |
|---------|-----------|-------------------|----------|
| Cell input keystroke | Per character | `EstimateSheetContent` + entire tree | **CRITICAL** |
| Cursor broadcast receive | ~12.5/sec (80ms throttle) | `EstimateSheetContent` + `RemoteEstimateCursorsOverlay` | HIGH |
| Zustand selection change | On click | Tree + sidebar components | MEDIUM |
| Route pathname change | On navigation | `usePathname` consumers (6 components) | LOW |
| `useSyncExternalStore` (metadata) | On custom event | `ProjectEstimateMetadataStrip` | LOW |
| Presence join/leave | Infrequent | `ProjectTeamspaceHeader` | LOW |

---

## 6. Dependency Audit

### Heavy Libraries Loaded on This Page
| Library | Size (approx) | Loaded? | Notes |
|---------|--------------|---------|-------|
| `@tanstack/react-query` | ~14KB gzip | ✅ Yes | Data fetching — essential |
| `zustand` | ~2KB gzip | ✅ Yes | State management — essential |
| `@phosphor-icons/react` | ~4KB per icon | ✅ Yes | Optimized via `optimizePackageImports` |
| `exceljs` | ~200KB gzip | ❌ No | Server-side only (API route) |
| `d3` (v7) | ~80KB gzip | ❌ No | Charts page only |
| `three` / `@firecms/neat` | ~130KB gzip | ❌ No (estimate sheet) | Not loaded on the estimate sheet page, BUT loaded on the landing page via `NeatWireframeBackground.tsx` (dynamic import + idle activation). See [10-landing-page-audit.md](./10-landing-page-audit.md) §3.1. |

### Potential Bundle Optimizations
- Phosphor Icons: Already tree-shaken + `optimizePackageImports` in next.config ✅
- TanStack Query: Essential, cannot remove
- Zustand: Minimal (2KB), no issue

---

## 7. Image Optimization

| Location | Method | Optimized? | Issue |
|----------|--------|-----------|-------|
| User avatars (`MainSidebar`) | `next/image` with `fill` + `sizes` | ✅ Yes | — |
| Component thumbnails (`EstimateSheetContent`) | Inline `backgroundImage` | ❌ No | Bypasses Next.js optimization (resize, WebP, lazy load) |
| Project cover images | `next/image` via API route | ✅ Yes | — |

### Recommendation
Replace component thumbnail `backgroundImage` with `next/image` only when the image URL is public and matches `next.config.ts` remote patterns. Use a stable-size relative container, `fill`, and explicit `sizes`, then prove transferred bytes/layout/accessibility improve. See [16-dependency-cache-image-decision-matrix.md](./16-dependency-cache-image-decision-matrix.md).

---

## 8. CSS & Styling Performance

| Aspect | Status | Notes |
|--------|--------|-------|
| CSS-in-JS runtime | ✅ None | Tailwind CSS v4 (CSS-first, no runtime JS) |
| Inline styles | ✅ Acceptable | Used for dynamic indents, widths — small overhead |
| `dangerouslySetInnerHTML` | ✅ None | Not used on this path |
| Font loading | ✅ Optimized | `next/font/google` with `variable` option |

---

## 9. Background Processes

| Process | File | Cleanup? |
|---------|------|----------|
| Cursor cleanup interval (1s) | `use-estimate-cursor-broadcast.ts` | ✅ Cleaned up in `useEffect` return |
| Realtime channel | `use-estimate-cursor-broadcast.ts` | ✅ Unsubscribed on unmount |
| Presence channel | `use-project-presence.ts` | ✅ Unsubscribed on unmount |
| Activity feed subscription | `SharedLinkActivityFeed.tsx` | ✅ Unsubscribed on unmount |

---

## 10. UX Loading States

| State | Component | Quality |
|-------|-----------|---------|
| Initial page load | `workshop/loading.tsx` → `StaticWorkshopLoadingShell` | ✅ Good — full skeleton shell |
| Estimate segment load | `estimates/loading.tsx` → `ProjectRouteContentFallback` | ✅ Good — content area skeleton |
| Tree dynamic import | `EstimateTreeFallback` | ✅ Good — tree skeleton |
| Sheet dynamic import | `EstimateContentFallback` | ✅ Good — sheet skeleton |
| Library sidebar open | `AddComponentModal` dynamic import | ✅ Good — modal skeleton |
| **Cell editing feedback** | None | ⚠️ Missing — no optimistic UI indicator during server action |
| **Row add/delete** | None | ⚠️ Missing — no transition state during mutations |

---

## 11. Total Client-Side Cost Estimate

| Metric | Value |
|--------|-------|
| Client components loaded | ~35 |
| Total JS downloaded (estimated) | ~150-250KB gzip |
| Hydration time (estimated) | ~200-500ms |
| Largest component (lines) | 4,336 (`EstimateSheetContent`) |
| Active realtime channels | 3 |
| useEffect hooks | ~15+ |
| useMemo hooks (recalculated per keystroke) | 5 critical |
