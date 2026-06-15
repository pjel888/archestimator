# 19 — React.memo Strategy: Component Memoization Plan

**Status:** Complete  
**Created:** 2026-05-29  
**Purpose:** Implement strategic `React.memo` usage to prevent unnecessary re-renders in large component trees. Currently zero memoization exists despite 245+ `useMemo`/`useCallback` usages.

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Why React.memo Matters](#2-why-reactmemo-matters)
3. [Memoization Targets](#3-memoization-targets)
4. [Implementation Strategy](#4-implementation-strategy)
5. [Testing & Validation](#5-testing--validation)
6. [Common Pitfalls](#6-common-pitfalls)

---

## 1. Current State Analysis

### Codebase Audit Results

**`useMemo`/`useCallback` usage:** 245 instances across 33 files  
**`React.memo` usage:** 0 instances across entire codebase  
**`memo()` usage:** 0 instances across entire codebase

### What This Means

The codebase uses `useMemo` to memoize computed values and `useCallback` to memoize functions, but **does not memoize component renders**. This means:

1. When `EstimateSheetContent` re-renders, ALL child components re-render (even if props unchanged)
2. When a parent tree node expands, ALL sibling tree nodes re-render
3. When one row in the estimate table updates, ALL rows re-render

### Re-Render Impact Analysis

**Estimate Workspace (heaviest page):**

```
EstimateSheetContent (~3,800 lines, 46 useMemo, 35 useCallback)
  ├─ CenterColumn (re-renders on every parent state change)
  │   ├─ EstimateRowTable (re-renders even if data unchanged)
  │   │   ├─ RowItem[0] (re-renders even if only RowItem[99] changed)
  │   │   ├─ RowItem[1] (re-renders even if only RowItem[99] changed)
  │   │   ├─ ...
  │   │   └─ RowItem[99] (user edited this row)
  │   └─ ResizableSidePanel (re-renders even if side panel closed)
  └─ TreeSidebar (re-renders even if tree unchanged)
      ├─ TreeNode[0] (re-renders even if only TreeNode[49] expanded)
      ├─ TreeNode[1] (re-renders even if only TreeNode[49] expanded)
      ├─ ...
      └─ TreeNode[49] (user expanded this node)
```

**Estimated wasted re-renders:** 80-95% of row items and tree nodes re-render unnecessarily on every interaction.

---

## 2. Why React.memo Matters

### Performance Impact

**Scenario:** User edits quantity in row 50 of 100 rows

**Without React.memo:**
1. `EstimateSheetContent` re-renders (state change)
2. `CenterColumn` re-renders (child of EstimateSheetContent)
3. `EstimateRowTable` re-renders (child of CenterColumn)
4. ALL 100 `RowItem` components re-render (children of EstimateRowTable)
5. Each `RowItem` executes its render function, JSX, and reconciliation
6. **Total render time:** ~50-100ms (depending on row complexity)

**With React.memo:**
1. `EstimateSheetContent` re-renders (state change)
2. `CenterColumn` re-renders (child of EstimateSheetContent)
3. `EstimateRowTable` re-renders (child of CenterColumn)
4. React.memo on `RowItem` checks props equality
5. Only `RowItem[50]` re-renders (props changed)
6. Other 99 `RowItem` components skip render (props unchanged)
7. **Total render time:** ~5-10ms (only 1 row re-renders)

**Performance gain:** 10x faster re-renders (50-100ms → 5-10ms)

### When React.memo Helps

✅ **High-value targets:**
- List items in large collections (100+ items)
- Tree nodes in deep hierarchies (50+ nodes)
- Expensive components with stable props
- Components that receive primitive props (strings, numbers, booleans)

❌ **Low-value targets:**
- Small component trees (< 10 components)
- Components with frequently-changing object/array props
- Components that always re-render due to context
- Components with cheap render functions

---

## 3. Memoization Targets

### Priority 1: Estimate Row Items (Highest Impact)

**File:** `src/components/workshop/EstimateSheetContent.tsx`  
**Component:** `RowItem` (or equivalent row renderer)  
**Impact:** 100+ rows per estimate, frequent updates

```typescript
// Current (no memoization)
function RowItem({ row, onUpdate, onDelete }: RowItemProps) {
  // ... render logic
}

// Optimized (with React.memo)
import { memo } from 'react';

const RowItem = memo(function RowItem({ row, onUpdate, onDelete }: RowItemProps) {
  // ... render logic
});

export { RowItem };
```

**Expected improvement:** 90% reduction in row re-renders (only edited row re-renders)

### Priority 2: Tree Nodes (High Impact)

**File:** `src/components/workshop/EstimateSheetTree.tsx`  
**Component:** Custom tree item renderer (if using `react-complex-tree`)  
**Impact:** 50+ nodes per estimate, frequent expand/collapse

```typescript
// Current (no memoization)
function TreeItemRenderer({ item, depth, onSelect }: TreeItemProps) {
  // ... render logic
}

// Optimized (with React.memo)
const TreeItemRenderer = memo(function TreeItemRenderer({ item, depth, onSelect }: TreeItemProps) {
  // ... render logic
});
```

**Expected improvement:** 80% reduction in tree node re-renders (only expanded/collapsed nodes re-render)

### Priority 3: Library Tree Nodes (Medium Impact)

**File:** `src/components/workshop/component-library-manager/LibraryFolderTree.tsx`  
**Component:** Folder tree item renderer  
**Impact:** 50+ folders, occasional updates

```typescript
const FolderTreeItem = memo(function FolderTreeItem({ folder, onSelect }: FolderTreeItemProps) {
  // ... render logic
});
```

**Expected improvement:** 80% reduction in folder re-renders

### Priority 4: Project Cards (Medium Impact)

**File:** `src/components/workshop/LiveProjectCard.tsx`  
**Component:** `LiveProjectCard`  
**Impact:** 10-50 cards per page, occasional updates

```typescript
const LiveProjectCard = memo(function LiveProjectCard({ project, onClick }: ProjectCardProps) {
  // ... render logic
});
```

**Expected improvement:** 90% reduction in card re-renders (only updated card re-renders)

### Priority 5: Chart Components (Low Impact)

**File:** `src/components/workshop/project-charts/*.tsx`  
**Components:** `ProjectCostDonutChart`, `ProjectCostBubbleChart`  
**Impact:** 2-3 charts per page, infrequent updates

```typescript
const ProjectCostDonutChart = memo(function ProjectCostDonutChart({ data }: ChartProps) {
  // ... render logic
});
```

**Expected improvement:** Minimal (charts already expensive to render, memoization helps on parent re-renders)

---

## 4. Implementation Strategy

### Phase 1: Identify Memoization Candidates

**Step 1: Profile with React DevTools**

1. Open React DevTools Profiler
2. Navigate to estimate workspace
3. Record interaction (edit row quantity)
4. Analyze flamegraph for unnecessary re-renders
5. Identify components that re-render with unchanged props

**Step 2: Add `whyDidYouRender` (Development Only)**

```bash
bun add -D @welldone-software/why-did-you-render
```

```typescript
// src/lib/why-did-you-render.ts
import whyDidYouRender from '@welldone-software/why-did-you-render';
import React from 'react';

if (process.env.NODE_ENV === 'development') {
  whyDidYouRender(React, {
    trackAllPureComponents: true,
  });
}
```

This will log to console whenever a component re-renders unnecessarily.

### Phase 2: Apply React.memo to High-Impact Targets

**Order of implementation:**

1. `RowItem` in `EstimateSheetContent.tsx` (Priority 1)
2. `TreeItemRenderer` in `EstimateSheetTree.tsx` (Priority 2)
3. `FolderTreeItem` in `LibraryFolderTree.tsx` (Priority 3)
4. `LiveProjectCard` in `LiveProjectCard.tsx` (Priority 4)

**Implementation checklist for each component:**

- [ ] Wrap component in `memo()`
- [ ] Ensure all props are stable (use `useMemo` for objects, `useCallback` for functions)
- [ ] Test that component still re-renders when props change
- [ ] Profile with React DevTools to confirm re-render reduction
- [ ] Run `bun run test:e2e` to ensure no regressions

### Phase 3: Stabilize Props

**Problem:** `React.memo` only helps if props are stable. If parent passes new object/array references on every render, memoization is useless.

**Solution:** Use `useMemo` and `useCallback` in parent components.

**Example: Stabilizing row data**

```typescript
// Bad: Creates new array on every render
function EstimateRowTable({ rows }: Props) {
  const processedRows = rows.map(r => ({ ...r, formatted: formatValue(r.value) }));
  
  return (
    <div>
      {processedRows.map(row => (
        <RowItem key={row.id} row={row} />
      ))}
    </div>
  );
}

// Good: Memoize processed rows
function EstimateRowTable({ rows }: Props) {
  const processedRows = useMemo(
    () => rows.map(r => ({ ...r, formatted: formatValue(r.value) })),
    [rows]
  );
  
  return (
    <div>
      {processedRows.map(row => (
        <RowItem key={row.id} row={row} />
      ))}
    </div>
  );
}
```

**Example: Stabilizing callbacks**

```typescript
// Bad: Creates new function on every render
function EstimateRowTable({ onRowUpdate }: Props) {
  return (
    <div>
      {rows.map(row => (
        <RowItem
          key={row.id}
          row={row}
          onUpdate={(data) => onRowUpdate(row.id, data)} // ← New function every render
        />
      ))}
    </div>
  );
}

// Good: Memoize callback
function EstimateRowTable({ onRowUpdate }: Props) {
  const handleRowUpdate = useCallback(
    (rowId: string, data: RowData) => onRowUpdate(rowId, data),
    [onRowUpdate]
  );
  
  return (
    <div>
      {rows.map(row => (
        <RowItem
          key={row.id}
          row={row}
          onUpdate={handleRowUpdate} // ← Stable reference
        />
      ))}
    </div>
  );
}
```

### Phase 4: Custom Comparison Functions (Advanced)

For components with complex props, use custom comparison:

```typescript
const RowItem = memo(
  function RowItem({ row, isSelected, onUpdate }: RowItemProps) {
    // ... render logic
  },
  (prevProps, nextProps) => {
    // Only re-render if these specific props change
    return (
      prevProps.row.id === nextProps.row.id &&
      prevProps.row.value === nextProps.row.value &&
      prevProps.row.quantity === nextProps.row.quantity &&
      prevProps.isSelected === nextProps.isSelected
      // Ignore onUpdate (function reference may change)
    );
  }
);
```

**Use case:** When prop objects are deeply nested and only specific fields matter.

---

## 5. Testing & Validation

### 5.1 Unit Tests

```typescript
// src/components/workshop/__tests__/RowItem.test.tsx
import { render } from '@testing-library/react';
import { RowItem } from '../EstimateSheetContent';

describe('RowItem memoization', () => {
  it('does not re-render when props are unchanged', () => {
    const row = { id: '1', value: 100 };
    const onUpdate = jest.fn();
    
    const { rerender } = render(<RowItem row={row} onUpdate={onUpdate} />);
    
    // Re-render with same props
    rerender(<RowItem row={row} onUpdate={onUpdate} />);
    
    // Component should not re-render (React.memo skips)
    // This is hard to test directly, but we can verify via profiling
  });
  
  it('re-renders when props change', () => {
    const row1 = { id: '1', value: 100 };
    const row2 = { id: '1', value: 200 };
    const onUpdate = jest.fn();
    
    const { rerender, getByText } = render(<RowItem row={row1} onUpdate={onUpdate} />);
    
    expect(getByText('100')).toBeInTheDocument();
    
    // Re-render with different props
    rerender(<RowItem row={row2} onUpdate={onUpdate} />);
    
    expect(getByText('200')).toBeInTheDocument();
  });
});
```

### 5.2 Performance Benchmarks

**File:** `scripts/benchmark-react-memo.ts`

```typescript
import puppeteer from 'puppeteer';

async function benchmarkReactMemo() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Navigate to estimate workspace
  await page.goto('http://localhost:3000/workshop/projects/123/estimates/456');
  await page.waitForSelector('[data-testid="row-item"]');
  
  // Measure: Edit row 50 of 100
  const startTime = Date.now();
  await page.click('[data-testid="row-item-50"] input[data-field="quantity"]');
  await page.keyboard.type('999');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => {
    // Wait for React to finish rendering
    return document.querySelector('[data-testid="row-item-50"]')?.textContent?.includes('999');
  });
  const duration = Date.now() - startTime;
  
  console.log(`Row edit render time: ${duration}ms`);
  
  // Expected: < 50ms with React.memo, > 200ms without
  
  await browser.close();
}

benchmarkReactMemo().catch(console.error);
```

### 5.3 React DevTools Profiling

**Manual profiling steps:**

1. Open React DevTools → Profiler tab
2. Click "Record" button
3. Edit a row quantity in the estimate workspace
4. Click "Stop" button
5. Analyze flamegraph:
   - Look for gray bars (skipped renders) — these are React.memo wins
   - Look for colored bars (actual renders) — check if props changed
   - Count total renders vs skipped renders
6. Target: > 80% of row items should be gray (skipped)

**Expected results:**

| Metric | Before React.memo | After React.memo |
|--------|-------------------|------------------|
| Total renders on row edit | 100+ | 10-20 |
| Skipped renders | 0 | 80-90 |
| Render time | 50-100ms | 5-10ms |
| FPS during scroll | 30-45 | 55-60 |

---

## 6. Common Pitfalls

### Pitfall 1: Unstable Object Props

```typescript
// Bad: New object on every render defeats memoization
<RowItem row={{ ...row, formatted: formatValue(row.value) }} />

// Good: Memoize object in parent
const formattedRow = useMemo(
  () => ({ ...row, formatted: formatValue(row.value) }),
  [row]
);
<RowItem row={formattedRow} />
```

### Pitfall 2: Unstable Callback Props

```typescript
// Bad: New function on every render defeats memoization
<RowItem onUpdate={(data) => handleUpdate(row.id, data)} />

// Good: Memoize callback
const handleUpdate = useCallback(
  (data) => onUpdate(row.id, data),
  [row.id, onUpdate]
);
<RowItem onUpdate={handleUpdate} />
```

### Pitfall 3: Context Consumers

```typescript
// Bad: Context consumer re-renders on every context change
const RowItem = memo(function RowItem() {
  const { selectedRowId } = useContext(EstimateContext); // ← Re-renders on context change
  // ...
});

// Good: Split context, use selector pattern
const RowItem = memo(function RowItem({ rowId }: Props) {
  const isSelected = useEstimateContext(s => s.selectedRowId === rowId); // ← Zustand selector
  // ...
});
```

### Pitfall 4: Over-Memoization

```typescript
// Bad: Memoizing cheap components adds overhead
const SmallButton = memo(function SmallButton({ label }: { label: string }) {
  return <button>{label}</button>;
});

// Good: Only memoize expensive components with stable props
// SmallButton is cheap to render, memoization overhead > render cost
```

**Rule of thumb:** Only memoize components that:
1. Render frequently (in lists of 10+ items)
2. Have expensive render logic (complex JSX, calculations)
3. Receive stable props (primitives or memoized objects)

### Pitfall 5: Forgetting to Export Memoized Version

```typescript
// Bad: Memoized internally but exported as unmemoized
function RowItem(props: Props) {
  // ...
}

const MemoizedRowItem = memo(RowItem);

export { RowItem }; // ← Exports unmemoized version!

// Good: Export memoized version
export const RowItem = memo(function RowItem(props: Props) {
  // ...
});
```

---

## Implementation Checklist

### Phase 1: Profiling (Day 1)

- [ ] Install `@welldone-software/why-did-you-render` (dev only)
- [ ] Profile estimate workspace with React DevTools
- [ ] Identify top 5 components with unnecessary re-renders
- [ ] Document findings in `.ai/10_state/performance/react-memo-audit.md`

### Phase 2: High-Impact Memoization (Day 2-3)

- [ ] Wrap `RowItem` in `memo()` (Priority 1)
- [ ] Stabilize `RowItem` props (useMemo objects, useCallback functions)
- [ ] Test row editing performance (target: < 50ms render time)
- [ ] Wrap `TreeItemRenderer` in `memo()` (Priority 2)
- [ ] Stabilize tree node props
- [ ] Test tree expand/collapse performance (target: < 30ms render time)

### Phase 3: Medium-Impact Memoization (Day 4)

- [ ] Wrap `FolderTreeItem` in `memo()` (Priority 3)
- [ ] Wrap `LiveProjectCard` in `memo()` (Priority 4)
- [ ] Test project list scroll performance (target: 60fps)

### Phase 4: Validation (Day 5)

- [ ] Run React DevTools Profiler on all memoized components
- [ ] Confirm > 80% render reduction
- [ ] Run `bun run test:e2e` to ensure no regressions
- [ ] Run `scripts/benchmark-react-memo.ts` to measure improvement
- [ ] Document results in `.ai/10_state/performance/react-memo-results.md`

---

## Expected Performance Gains

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Row edit render time | 50-100ms | 5-10ms | 10x faster |
| Tree expand/collapse time | 30-60ms | 10-20ms | 3x faster |
| Project list scroll FPS | 30-45 | 55-60 | +50% FPS |
| Estimate workspace INP | 200-400ms | 50-100ms | 4x faster |

**Total impact:** Significant improvement in perceived responsiveness, especially for data-heavy pages.

---

**Next:** See `20-font-and-bundle-optimization.md` for bundle size reduction strategies.
