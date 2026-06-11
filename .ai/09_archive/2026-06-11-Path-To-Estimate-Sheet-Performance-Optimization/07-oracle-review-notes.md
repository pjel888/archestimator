# 07 — Oracle Review Notes

**Date**: 2026-06-11 | **Status**: Historical review record; current plan defers to docs 12-15 | **Oracle**: Review #1 | **Last Update**: 2026-06-11 02:42 UTC
**Oracle Session**: ses_14d7fd71bffeTjzSxp7XMF1sQk
**Review result**: 5 blind spots found, priorities corrected

---

## Current-Plan Caveat

This file preserves the prior Oracle review. It is not the current execution plan. The current source snapshot and future implementation gates live in `12-current-evidence-and-gap-audit.md`, `13-implementation-readiness-plan.md`, `14-adversarial-qa-matrix.md`, and `15-readiness-scorecard.md`.

## Full Oracle Analysis

### Blind Spot 1: `projectTotal` is NOT Memoized

**File**: `src/components/workshop/EstimateSheetContent.tsx:3488`

```typescript
const projectTotal = estimateTree.reduce((total, node) => total + computeNodeTotal(node, editableRows), 0);
```

This is a **bare variable in the render body** — not wrapped in `useMemo`. It recalculates on EVERY render, including renders triggered by:
- Cursor position broadcasts (80ms throttle)
- Modal open/close
- Selection changes
- Sheet search query changes
- Collapse/expand toggles
- Inspector/RowDetails state changes

None of these change `estimateTree` or `editableRows`, yet `projectTotal` traverses the entire tree on every one. For a 500-row sheet, this is **500 unnecessary additions per non-row state change**.

**Fix**: `const projectTotal = useMemo(() => estimateTree.reduce(...), [estimateTree, editableRows]);`

**Impact**: Prevents O(n) tree summation on non-row-edit renders if dependencies are correct. Current implementation must prove this with render-count and behavior parity evidence.

---

### Blind Spot 2: No React 19 Concurrent Features

The reviewed component used React 19 (`"react": "19.2.6"`) but used none of its concurrent features. Current source inspection still found zero occurrences of these hooks in `EstimateSheetContent.tsx`:
- `useDeferredValue` — unused (manual state management instead)
- `useOptimistic` — unused (manual snapshot/rollback pattern instead)
- `startTransition` — unused (all state updates are urgent)
- `use()` — unused (all data comes via props from server components)

**What's being used instead**:
- Manual `previousTree`/`previousRows`/`rollbackRevision` snapshot-and-restore in `updateRowItem` (~line 3802) instead of `useOptimistic`
- Manual `queueMicrotask` in `useEffect` for deferred selection pruning (line 3440) instead of `useDeferredValue` + `startTransition`
- Direct state updates on every keystroke (line 3345 `setEditableRows`) instead of `useDeferredValue`

---

### Blind Spot 3: `computedRows` Object Spreads

**File**: `src/components/workshop/EstimateSheetContent.tsx` — `EstimateRowItemsTable` component

Every keystroke triggers `currentRows` useMemo recalculation (line 3489):
```typescript
const currentRows = useMemo(() => flattenEstimateRows(estimateTree, editableRows), [editableRows, estimateTree]);
```

`flattenEstimateRows` builds new objects for every row. For a 500-row sheet, that's **500 object spreads per keystroke**, purely for computation — independent of DOM count. Even if only 10 rows are visible (post-virtualization), this still does 500 spreads.

**Fix**: Only re-flatten rows whose values actually changed. Use immutable update on the specific row rather than rebuilding the entire array.

---

### Blind Spot 4: No `React.memo` on `EstimateRowItemsTable`

Every keystroke in ANY cell causes ALL `EstimateRowItemsTable` instances to re-render. For a sheet with 10 area nodes x 50 rows each = 10 `EstimateRowItemsTable` instances, typing "1" in cell A causes 9 other tables to re-render despite no data change in them.

**Fix**: `const MemoizedEstimateRowItemsTable = React.memo(EstimateRowItemsTable, (prev, next) => shallowEqual(prev.items, next.items));`

**Impact**: High-ROI candidate if `items` prop identity is stable. Verify with render-count instrumentation before claiming cascade re-render elimination.

---

### Blind Spot 5: Pointer-Move DOM Traversal at 60fps

**File**: `src/hooks/use-estimate-cursor-broadcast.ts`

In addition to the 80ms-throttled broadcast, the `onPointerMove` handler traverses the DOM tree for hit-testing on every pointer-move event (60fps on a 60Hz display). This is independent of the broadcast throttle — the DOM traversal happens continuously while the mouse moves over the sheet.

**Impact**: During active mouse movement, the main thread spends cycles on DOM hit-testing that could be used for rendering. Compounded with the keystroke re-render storm during collaboration (user A typing while user B moves mouse).

**Fix**: Debounce the DOM traversal to match the broadcast throttle (80ms), or use a spatial index instead of DOM walk.

---

## Corrected Priority Rationale

### Why R1 (Virtualization) is NOT First

Virtualization fixes DOM count — you render 10 visible rows instead of 500. But:

1. **Computation storm remains**: `projectTotal` (line 3488) still traverses 500 nodes per keystroke
2. **Object spreads remain**: `currentRows` (line 3489) still builds 500 objects per keystroke
3. **Non-row renders still expensive**: Cursor movement, selection, modals still trigger `projectTotal` recalculation
4. **Virtualization adds complexity**: Input focus management, drag-drop zones, dynamic row heights

Virtualization should be the LAST structural change — after computation and data are fixed.

### Why Sprint 0 Was Flagged as Highest ROI

The prior review treated `React.memo` + `projectTotal` memoization + `useDeferredValue` as a fast relief path:

- `React.memo` stops cascade re-renders (non-edited rows don't re-render)
- `projectTotal` memoization stops O(n) on non-row state changes
- `useDeferredValue` can let inputs respond immediately while computations lag by one frame

Current plan correction: keep `React.memo` and `projectTotal` memoization in Sprint 0, but move `useDeferredValue` behind input-focus, rollback, proposal-preview, and activity-scope proof.

### Why Data Layer Before Computation

R2 (column selection) benefits every user on every page load. R3 (parallel fetching) reduces TTFB by 30-50%. These compound: smaller payloads → faster parsing → less JS execution. Computation fixes benefit only users who type — important, but narrower than "every page load."

---

## Edge Cases Oracle Cautioned About

1. **`useDeferredValue` + input cursor jump**: If cells use controlled inputs (value from global `editableRows`), the deferred value will lag behind the input, causing the cursor to jump to the end. **Fix**: Cells must use uncontrolled local state (`useState` per input) until blur.

2. **`useOptimistic` + mutation lifecycle refactor**: The current `updateRowItem` pattern passes `rollback` callbacks. `useOptimistic` handles rollback via its reducer pattern. `useEstimateRowMutations` needs refactoring — not zero-effort.

3. **R7 indexes need `EXPLAIN ANALYZE` verification**: Composite indexes on `(workspace_id, item_id)` help `.in()` queries, but the planner may still seq-scan for large item ID lists. Profile before claiming victory.

4. **R4 needs pagination for 10,000+ item libraries**: The 6 parallel `.in()` queries with unbounded item IDs will hit Supabase URL length limits at scale.

---

## Alternative: Emergency Relief Path

If immediate relief is needed (hours, not days):

1. `React.memo(EstimateRowItemsTable)` — 5 min
2. `useMemo(() => estimateTree.reduce(...), [estimateTree, editableRows])` for `projectTotal` — 2 min
3. `const deferredRows = useDeferredValue(editableRows)` — 30 min (wire to useMemo deps)
4. `useOptimistic` for `updateRowItem` — 1 hour (remove manual snapshot/rollback)

Treat this as an emergency relief hypothesis, not a completion claim. It can proceed only after the baseline and behavior-characterization gates are satisfied.

---

## Escalation Trigger

If after Sprint 1 (R2 + R3 + R7 + R8) the initial page load TTFB is still above **500ms** for a 100-row sheet:

→ Profile RLS policies with `EXPLAIN ANALYZE`. The nested `EXISTS` pattern in `can_access_project` and `can_access_estimate` may contribute **100-200ms cumulative** across 15+ tables per request. Consider materializing access checks into JWT claims or session variables.
