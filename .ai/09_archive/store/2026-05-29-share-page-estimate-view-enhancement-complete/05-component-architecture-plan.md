# 05 — Component Architecture Plan

**Date:** 2026-05-29
**Status:** Complete

---

## 1. Component Tree (Target State)

```
SharePageTabs (enhanced, ~350 lines)
│
├── Active Sheet Summary
│   └── [name, sheetCode, totalCost] — existing, unchanged
│
├── Recipient Session Guard — existing, unchanged
│
├── CostDonutChart (NEW — above tabs)
│   └── D3 SVG donut chart per active sheet
│   └── Props: buckets, total, currencyCode, label
│
├── Estimate Sheet Tab Bar — existing, unchanged
│   └── Horizontal scroll tabs per estimate sheet
│
├── Sub-Tab Bar (NEW)
│   └── "Tree View" | "Grid Preview" toggle
│   └── State: sheetViews[sheetId]
│
├── ShareFloatingTreeNav (NEW, conditional)
│   └── Visible only when Tree View active + lg screen
│   └── Compact list of tree node labels
│   └── Scroll-to-section on click
│   └── IntersectionObserver for active section
│
├── ShareEstimateTreeView (NEW, conditional)
│   └── Rendered when activeView === 'tree'
│   └── Recursive tree with Group/Area Nodes
│   └── Row items under Area Nodes
│   └── Uses share/reconstruct-share-tree utility
│
└── Grid Preview Panel (existing, preserved)
    └── Rendered when activeView === 'grid'
    └── Flat table with headers
    └── Row image thumbnails
    └── Existing code preserved
```

---

## 2. New Components

### 2.1 CostDonutChart (Extracted → Shared)

| Property | Value |
|----------|-------|
| **File** | `src/components/charts/CostDonutChart.tsx` |
| **Type** | Client component |
| **Source** | Extracted from `src/components/workshop/project-charts/ProjectCostDonutChart.tsx` |
| **Dependencies** | `d3` (arc, pie), shared `CostBucket` type |
| **Behavioral changes** | None. Identical D3 code. |
| **Tests** | Existing workshop chart tests should pass with re-export. |

### 2.2 ShareEstimateTreeView

| Property | Value |
|----------|-------|
| **File** | `src/components/share/ShareEstimateTreeView.tsx` |
| **Type** | Client component |
| **Purpose** | Read-only recursive tree view for receiver page |
| **Props** | `nodes: ShareTreeNode[]`, `currencyCode: string`, `depth?: number` |
| **Dependencies** | `@phosphor-icons/react` (FolderSimple, Cube, CaretDown), `cn` utility |
| **State** | `collapsedNodes: Set<string>` (local useState) |

**Reuse Decision Required (Pre-P3, per 09-primitive-reuse):** Before implementing this component, decide whether to:
1. **Preferred:** Extract `WorkshopTree<TNode>` + `WorkshopTreeRow` from `src/components/workshop/workshop-tree.tsx` to shared primitives, then use `WorkshopTree<ShareTreeNode>` with a read-only `renderNode` here.
2. **Fallback:** Implement as a new standalone recursive component (below), with documented plan to converge with WorkshopTree later.

The code sketch below assumes option 2 (standalone) for clarity. If option 1 is chosen, the implementation becomes significantly simpler — just a `renderNode` function + state management.

```typescript
type ShareEstimateTreeViewProps = {
  nodes: ShareTreeNode[];
  currencyCode: string;
  depth?: number;
};
```

#### Component Structure

```tsx
export function ShareEstimateTreeView({ nodes, currencyCode, depth = 0 }: ShareEstimateTreeViewProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  return (
    <div role="tree" aria-label="Estimate hierarchy">
      {nodes.map((node) => (
        <ShareTreeNodeRow
          key={node.id}
          node={node}
          currencyCode={currencyCode}
          depth={depth}
          collapsed={collapsed.has(node.id)}
          onToggle={() => {
            setCollapsed((prev) => {
              const next = new Set(prev);
              next.has(node.id) ? next.delete(node.id) : next.add(node.id);
              return next;
            });
          }}
        />
      ))}
    </div>
  );
}
```

#### Node Row Sub-Component

```tsx
function ShareTreeNodeRow({ node, currencyCode, depth, collapsed, onToggle }) {
  const isGroup = node.kind === "group";
  const hasChildren = node.children.length > 0 || node.rows.length > 0;
  const indent = Math.min(depth * 20, 140); // matches WORKSHOP_TREE_INDENT_STEP/MAX

  return (
    <div role="treeitem" aria-expanded={!collapsed}>
      {/* Node header row */}
      <div
        className={cn(
          "flex items-center gap-1 px-2 py-1 cursor-pointer",
          isGroup
            ? "border border-hairline border-l-2 border-l-divider bg-surfaceMuted"
            : "hover:bg-surfaceMuted/40"
        )}
        style={{ paddingLeft: `${indent + 8}px` }}
        onClick={hasChildren ? onToggle : undefined}
      >
        {hasChildren ? (
          <CaretDown size={11} weight="regular" className={cn("transition", collapsed && "-rotate-90")} />
        ) : (
          <span className="w-[11px]" />
        )}
        {isGroup ? <FolderSimple size={12} weight="regular" /> : <Cube size={12} weight="regular" />}
        <span className={cn("truncate text-[10px] font-medium", isGroup ? "text-ink" : "text-secondary")}>
          {node.label}
        </span>
        <span className="ml-auto shrink-0 text-[10px] tabular-nums text-ink">
          {formatMoney(node.total, currencyCode)}
        </span>
      </div>

      {/* Child nodes (recursive) */}
      {!collapsed && node.children.length > 0 && (
        <ShareEstimateTreeView
          nodes={node.children}
          currencyCode={currencyCode}
          depth={depth + 1}
        />
      )}

      {/* Row items under Area Nodes */}
      {!collapsed && node.kind === "area" && node.rows.length > 0 && (
        <div>
          {node.rows.map((row) => (
            <div
              key={row.id}
              className="flex items-center gap-2 border-b border-hairline/50 px-2 py-1.5 hover:bg-surfaceMuted/30"
              style={{ paddingLeft: `${indent + 40}px` }}
            >
              {row.imageUrl && (
                <Image src={row.imageUrl} alt="" width={24} height={24} className="rounded-xs" />
              )}
              <span className="min-w-0 flex-1 truncate text-[10px] text-secondary">
                {row.description}
              </span>
              <span className="w-12 text-center text-[10px] text-tertiary">
                {row.quantity}
              </span>
              <span className="w-10 text-center text-[10px] text-tertiary">
                {row.unit}
              </span>
              <span className="w-[100px] text-right text-[10px] font-medium tabular-nums text-ink">
                {formatMoney(row.rowTotal, currencyCode)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 2.3 ShareFloatingTreeNav

| Property | Value |
|----------|-------|
| **File** | `src/components/share/ShareFloatingTreeNav.tsx` |
| **Type** | Client component |
| **Purpose** | Compact floating navigation for Tree View |
| **Props** | `nodes: ShareTreeNode[]`, `activeNodeId?: string` |

```typescript
type ShareFloatingTreeNavProps = {
  nodes: ShareTreeNode[];
  activeNodeId?: string;
};
```

#### Behavior

- Renders as a compact, sticky sidebar (left of Tree View panel)
- Lists all node labels (flattened, with indentation)
- Click scrolls to the corresponding tree node (via `scrollIntoView`)
- Active section highlighted via IntersectionObserver
- Hidden on screens < 1024px (`hidden lg:block`)

---

## 3. New Utility Modules

### 3.1 Shared Chart Types

| File | Purpose |
|------|---------|
| `src/lib/charts/types.ts` | `CostBucket` type (extracted from `project-charts/types.ts`) |

### 3.2 Share-specific Utilities

| File | Purpose |
|------|---------|
| `src/lib/share/aggregate-share-chart-buckets.ts` | `aggregateRowsByDiscipline(rows)` → `CostBucket[]` |
| `src/lib/share/reconstruct-share-tree.ts` | `reconstructTreeFromRows(rows)` → `ShareTreeNode[]`, `reconstructTreeByDiscipline(rows)` → `ShareTreeNode[]` |

---

## 4. Extraction Plan: ProjectCostDonutChart → CostDonutChart

### 4.1 Steps

1. **Create** `src/lib/charts/types.ts` with `CostBucket` type
2. **Create** `src/components/charts/CostDonutChart.tsx`:
   - Copy ALL code from `ProjectCostDonutChart.tsx`
   - Change import: `ProjectChartBucket` → `CostBucket`
   - Change component name: `ProjectCostDonutChart` → `CostDonutChart`
   - Keep all other code identical
3. **Update** `src/components/workshop/project-charts/ProjectCostDonutChart.tsx`:
   - Replace entire file with re-export:
   ```tsx
   export { CostDonutChart as ProjectCostDonutChart } from "@/components/charts/CostDonutChart";
   ```
4. **Update** `ProjectChartsClient.tsx` import path if necessary (or keep using re-export)
5. **Run** workshop chart tests to verify no regression
6. **Run** `bun run type-check` to verify no type errors

### 4.2 Backward Compatibility Guarantee

- `ProjectCostDonutChart` remains importable from the same path
- `ProjectChartBucket` type is compatible with `CostBucket`
- All existing consumers (workshop charts page) continue to work unchanged
- No behavioral changes to workshop charts

---

## 5. State Management

### 5.1 SharePageTabs State

```typescript
// Existing state (preserved)
const [activeId, setActiveId] = useState<string>(estimates[0]?.id ?? "");
const [canScrollLeft, setCanScrollLeft] = useState(false);
const [canScrollRight, setCanScrollRight] = useState(false);

// NEW state
const [sheetViews, setSheetViews] = useState<Record<string, "tree" | "grid">>({});
// Default: "tree" for every sheet (implicit via fallback)
```

### 5.2 Derived Values (useMemo)

```typescript
// Active estimate
const activeEstimate = useMemo(
  () => estimates.find((e) => e.id === activeId) ?? estimates[0],
  [activeId, estimates]
);

// Active view mode (defaults to "tree")
const activeView = useMemo(
  () => sheetViews[activeId] ?? "tree",
  [activeId, sheetViews]
);

// Donut chart buckets (recomputed when sheet changes)
const chartBuckets = useMemo(
  () => aggregateRowsByDiscipline(activeEstimate.rows),
  [activeEstimate.rows]
);

// Tree nodes (recomputed when sheet changes)
const treeNodes = useMemo(() => {
  const hasDesignations = activeEstimate.rows.some((r) => r.designation?.trim());
  return hasDesignations
    ? reconstructTreeFromRows(activeEstimate.rows)
    : reconstructTreeByDiscipline(activeEstimate.rows);
}, [activeEstimate.rows]);
```

### 5.3 No Global Store

- All state is local to `SharePageTabs` (or its child components)
- No Zustand store, no Context needed
- `sessionStorage` for active sheet tab only (existing behavior)
- View mode resets to "tree" on page reload (acceptable for receiver page)

---

## 6. File Placement Summary

```
src/
├── lib/
│   ├── charts/
│   │   └── types.ts                          ← NEW: shared CostBucket type
│   └── share/
│       ├── aggregate-share-chart-buckets.ts   ← NEW: chart aggregation
│       └── reconstruct-share-tree.ts          ← NEW: tree reconstruction
├── components/
│   ├── charts/
│   │   └── CostDonutChart.tsx                 ← NEW: extracted donut chart
│   ├── share/
│   │   ├── SharePageTabs.tsx                  ← MODIFIED: orchestrator
│   │   ├── ShareEstimateTreeView.tsx          ← NEW: tree view component
│   │   └── ShareFloatingTreeNav.tsx           ← NEW: floating nav tree
│   └── workshop/
│       └── project-charts/
│           └── ProjectCostDonutChart.tsx      ← MODIFIED: re-export wrapper
```

### No files deleted. No files renamed. Pure additive + extraction.

---

## Post-Audit Updates (2026-05-29)

**Supplementary audit completed** — see `00-POST-AUDIT-STRATEGY-ASSESSMENT-AND-IMPROVEMENT-PLAN.md` for full evidence.

### Corrections Applied
- Icon sizes in code sketches: 13px → **12px** for FolderSimple and Cube (with `weight="regular"`)
- CaretDown: Added `weight="regular"` to code sketch
- Tree indentation: `depth * 16` → `Math.min(depth * 20, 140)` (matches `workshopTreeIndentStyle`)
- `useMemo` dependency arrays: `[activeEstimate]` → `[activeEstimate.rows]` (prevents unnecessary recomputation)
- `ShareChartBucket` → `CostBucket` (consolidated type in shared `src/lib/charts/types.ts`)

### Critical Finding: WorkshopTree<TNode> Reuse Opportunity
The workshop contains `WorkshopTree<TNode>` (lines 116–195 of `workshop-tree.tsx`) — a generic, fully functional recursive tree renderer that was NOT referenced in the original component architecture plan.

**Reuse Potential:**
- Takes `nodes`, `expandedNodeIds`, `getNodeId`, `getChildren`, `renderNode` as props
- Already handles `role="tree"`, `role="group"`, `role="treeitem"` accessibility
- Delegates rendering to caller's `renderNode` function
- `WorkshopTreeRow` provides the visual contract (icons, indent, bg, hover states)

**Decision Required (A9b in 12-assumptions-log):**
- **Preferred:** Extract `WorkshopTree<TNode>` + `WorkshopTreeRow` to `src/components/ui/` as shared primitives, then `ShareEstimateTreeView` becomes a thin wrapper with a read-only `renderNode`.
- **Fallback:** Implement standalone `ShareEstimateTreeView` with documented plan to converge.

See `09-ui-primitive-reuse-audit-and-extension-plan.md` §3 for the full analysis.

### Additional Implementation Notes
- `formatMoney` is a local function defined in each file that needs it (not a shared utility). New files must define their own local `formatMoney` function with signature `(value: number, currencyCode: string) => string`.
- The `collapsed` state management in the code sketch uses `Set<string>` (not `boolean` on the node type). The `ShareTreeNode` data type does NOT include `collapsed` — that's UI state.
- For `scrollIntoView` support, tree node elements need unique `id` attributes (e.g., `id={`share-tree-node-${node.id}`}`).

### Cross-References
- `09-ui-primitive-reuse-audit-and-extension-plan.md` — Primitive contract for all new components
- `IMPLEMENTATION-MASTER-PROMPT.md` — Verified technical parameters
