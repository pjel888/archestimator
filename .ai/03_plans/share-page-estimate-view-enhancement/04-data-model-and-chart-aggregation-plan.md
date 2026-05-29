# 04 — Data Model & Chart Aggregation Plan

**Date:** 2026-05-29
**Status:** Complete

---

## 1. Donut Chart Data Aggregation

### 1.1 Source Data

**Input:** `PublicationSnapshotRow[]` (per estimate sheet)

```typescript
type PublicationSnapshotRow = {
  id: string;
  description: string;
  designation: string;
  discipline: string;      // ← Primary grouping field
  material: string;
  quantity: number;
  unit: string;
  unitCost: number;
  miscCost: number;
  contingencyPercentage: number;
  rowTotal: number;        // ← Slice value
  imageUrl?: string | null;
};
```

### 1.2 Aggregation Utility

**File:** `src/lib/share/aggregate-share-chart-buckets.ts`

```typescript
import type { PublicationSnapshotRow } from "@/lib/publication/types";
import type { CostBucket } from "@/lib/charts/types";

const TOP_BUCKET_LIMIT = 8;

// Matches PROJECT_CHART_COLORS from src/lib/project-charts/aggregate-project-charts.ts
const CHART_COLORS = [
  "#2f5d50", "#d98b3a", "#4c6f9f", "#b84a62",
  "#7a5aa6", "#2f8f9d", "#c9a227", "#5f6b3d",
  "#8a8f98", "#8f5c38", "#4d7c63", "#6b7280",
];

export function aggregateRowsByDiscipline(
  rows: PublicationSnapshotRow[]
): CostBucket[] {
  // 1. Group rows by discipline
  const groups = new Map<string, { total: number; rowCount: number }>();

  for (const row of rows) {
    const discipline = row.discipline?.trim() || "Unassigned";
    const existing = groups.get(discipline) ?? { total: 0, rowCount: 0 };
    existing.total += row.rowTotal;
    existing.rowCount += 1;
    groups.set(discipline, existing);
  }

  // 2. Convert to buckets, sort by total descending
  const grandTotal = [...groups.values()].reduce((sum, g) => sum + g.total, 0);

  const buckets: CostBucket[] = [...groups.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .map(([label, data], index) => ({
      id: `discipline:${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      label,
      total: data.total,
      share: grandTotal > 0 ? data.total / grandTotal : 0,
      rowCount: data.rowCount,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));

  // 3. Collapse buckets beyond TOP_BUCKET_LIMIT into "Other"
  if (buckets.length <= TOP_BUCKET_LIMIT) return buckets;

  const visible = buckets.slice(0, TOP_BUCKET_LIMIT);
  const hidden = buckets.slice(TOP_BUCKET_LIMIT);
  const otherTotal = hidden.reduce((sum, b) => sum + b.total, 0);
  const otherRows = hidden.reduce((sum, b) => sum + b.rowCount, 0);

  return [
    ...visible,
    {
      id: "__other__",
      label: "Other",
      total: otherTotal,
      share: grandTotal > 0 ? otherTotal / grandTotal : 0,
      rowCount: otherRows,
      color: CHART_COLORS[CHART_COLORS.length - 1],
      isOther: true,
    },
  ];
}
```

### 1.3 Edge Cases

| Case | Behavior |
|------|----------|
| Empty rows array | Return empty buckets. Donut chart shows "No cost rows" placeholder. |
| Single discipline | One full-circle donut slice. |
| Null/empty discipline | Grouped under "Unassigned". |
| Zero rowTotal for all rows | Grand total = 0. Chart shows "No cost rows" (workshop behavior). |
| Negative rowTotal | Included in aggregation as-is (preserves data fidelity). |

---

## 2. Tree Structure Reconstruction

### 2.1 Source Data

**Input:** `PublicationSnapshotRow[]` (per estimate sheet)

### 2.2 Reconstruction Strategy

The snapshot contains flat rows without tree hierarchy. We reconstruct a virtual tree using available metadata:

#### Primary Strategy: Designation-based Grouping

```typescript
type ShareTreeNode = {
  id: string;
  label: string;
  kind: "group" | "area";
  total: number;
  rowCount: number;
  children: ShareTreeNode[];
  rows: PublicationSnapshotRow[];
};
```

**File:** `src/lib/share/reconstruct-share-tree.ts`

```typescript
import type { PublicationSnapshotRow } from "@/lib/publication/types";

export type ShareTreeNode = {
  id: string;
  label: string;
  kind: "group" | "area";
  total: number;
  rowCount: number;
  children: ShareTreeNode[];
  rows: PublicationSnapshotRow[];
};

/**
 * Reconstruct a virtual tree from flat snapshot rows.
 *
 * Strategy:
 * 1. Group rows by their `designation` field.
 * 2. Each unique designation becomes a virtual Area Node.
 * 3. If designation contains " > " delimiters, split into
 *    Group → Area hierarchy.
 * 4. Rows without designation go under "Unassigned".
 * 5. Sort by designation alphabetically.
 */
export function reconstructTreeFromRows(
  rows: PublicationSnapshotRow[]
): ShareTreeNode[] {
  // 1. Group rows by designation
  const groups = new Map<string, PublicationSnapshotRow[]>();

  for (const row of rows) {
    const designation = row.designation?.trim() || "Unassigned";
    const existing = groups.get(designation) ?? [];
    existing.push(row);
    groups.set(designation, existing);
  }

  // 2. Build virtual nodes from groups
  const nodes: ShareTreeNode[] = [];

  for (const [designation, groupRows] of groups.entries()) {
    const total = groupRows.reduce((sum, r) => sum + r.rowTotal, 0);
    const id = `virtual:${designation.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

    // Check for hierarchy delimiters (e.g., "House > Living Room")
    const parts = designation.split(">").map((s) => s.trim()).filter(Boolean);

    if (parts.length > 1) {
      // Hierarchical designation: create Group → Area nesting
      const groupLabel = parts[0];
      const areaLabel = parts.slice(1).join(" > ");

      // Find or create parent group
      let groupNode = nodes.find(
        (n) => n.kind === "group" && n.label === groupLabel
      );
      if (!groupNode) {
        groupNode = {
          id: `virtual:group:${groupLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          label: groupLabel,
          kind: "group",
          total: 0,
          rowCount: 0,
          children: [],
          rows: [],
        };
        nodes.push(groupNode);
      }

      const areaNode: ShareTreeNode = {
        id,
        label: areaLabel,
        kind: "area",
        total,
        rowCount: groupRows.length,
        children: [],
        rows: groupRows,
      };

      groupNode.children.push(areaNode);
      groupNode.total += total;
      groupNode.rowCount += groupRows.length;
    } else {
      // Flat designation: create a standalone Area Node
      nodes.push({
        id,
        label: designation,
        kind: "area",
        total,
        rowCount: groupRows.length,
        children: [],
        rows: groupRows,
      });
    }
  }

  // 3. Sort: groups first, then areas
  return nodes.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "group" ? -1 : 1;
    return a.label.localeCompare(b.label);
  });
}
```

### 2.3 Fallback: Discipline-based Grouping

If `designation` is null/empty for ALL rows, fall back to grouping by `discipline`:

```typescript
export function reconstructTreeByDiscipline(
  rows: PublicationSnapshotRow[]
): ShareTreeNode[] {
  // Group rows by discipline, create flat list of discipline "Area Nodes"
  const groups = new Map<string, PublicationSnapshotRow[]>();
  
  for (const row of rows) {
    const discipline = row.discipline?.trim() || "Unassigned";
    const existing = groups.get(discipline) ?? [];
    existing.push(row);
    groups.set(discipline, existing);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([discipline, groupRows]) => ({
      id: `discipline:${discipline.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      label: discipline,
      kind: "area" as const,
      total: groupRows.reduce((sum, r) => sum + r.rowTotal, 0),
      rowCount: groupRows.length,
      children: [],
      rows: groupRows,
    }));
}
```

### 2.4 Detection Logic

In `SharePageTabs`, determine which reconstruction strategy to use:

```typescript
const hasDesignations = activeEstimate.rows.some(
  (row) => row.designation?.trim()
);

const treeNodes = hasDesignations
  ? reconstructTreeFromRows(activeEstimate.rows)
  : reconstructTreeByDiscipline(activeEstimate.rows);
```

---

## 3. Chart Component Adaptation

### 3.1 Extracting CostDonutChart

The `ProjectCostDonutChart` component needs minimal adaptation:

1. **Move** to `src/components/charts/CostDonutChart.tsx`
2. **Rename** type import from `ProjectChartBucket` to shared `CostBucket`
3. **Keep** all D3 rendering code identical
4. **Re-export** from original location for workshop backward compatibility

### 3.2 Props Interface (Shared)

```typescript
// src/lib/charts/types.ts
export type CostBucket = {
  id: string;
  label: string;
  total: number;
  share: number;
  rowCount: number;
  color: string;
  isOther?: boolean;
};

// src/components/charts/CostDonutChart.tsx
type CostDonutChartProps = {
  buckets: CostBucket[];
  total: number;
  currencyCode: string;
  label: string;
};
```

### 3.3 Backward Compatibility

```typescript
// src/components/workshop/project-charts/ProjectCostDonutChart.tsx
// Re-export for backward compatibility
export { CostDonutChart as ProjectCostDonutChart } from "@/components/charts/CostDonutChart";
export type { CostBucket as ProjectChartBucket } from "@/lib/charts/types";
```

---

## 4. Performance Considerations

### 4.1 Data Size

Typical snapshot row count per estimate sheet: **20–100 rows**.
Maximum expected: **~200 rows** for large projects.

### 4.2 Aggregation Complexity

- `aggregateRowsByDiscipline`: O(n) — single pass through rows
- `reconstructTreeFromRows`: O(n) — single pass + sort by designation count
- Both functions are called once per sheet switch, not per render
- `useMemo` wrapping prevents unnecessary recomputation

### 4.3 Chart Rendering

- D3 donut chart: renders once, re-renders on sheet switch
- SVG is responsive via `viewBox` + `preserveAspectRatio`
- No animation or transition (consistent with workshop charts)

### 4.4 Tree Rendering

- Recursive React component rendering
- Virtual nodes only (no React Complex Tree overhead)
- Expand/collapse via React state
- No virtualization needed at this data scale

---

## Post-Audit Updates (2026-05-29)

**Supplementary audit completed** — see `00-POST-AUDIT-STRATEGY-ASSESSMENT-AND-IMPROVEMENT-PLAN.md` for full evidence.

### Corrections Applied
- `ShareChartBucket` type removed from aggregation utility — now uses shared `CostBucket` type from `src/lib/charts/types.ts` (consolidated)
- `ShareTreeNode` type corrected: removed `collapsed: boolean` (UI state, not data) and `"flat-group"` kind
- Chart color palette expanded: 9 colors → **12 colors** (matches `PROJECT_CHART_COLORS` from `aggregate-project-charts.ts`)
- Delimiter handling: Added `.filter(Boolean)` to split result to handle empty strings from leading/trailing delimiters

### Critical Fidelity Concern
The tree reconstruction strategy (designation-based grouping with " > " delimiter) is the **highest-risk assumption** in the entire plan pack. See `10-fidelity-audit-and-tree-reconstruction-spec.md` for the required pre-P3 fidelity audit.

**Key risk:** The `designation` field on `PublicationSnapshotRow` is a direct pass-through from `estimate_row_items.designation` in the database. It is NOT guaranteed to contain hierarchical data (e.g., "House > Living Room"). Many real-world rows may have:
- Simple room names without delimiters ("Living Room")
- Empty/null designations
- Inconsistent delimiter usage ("House > Living Room" vs "House - Living Room")

**Required before P3:** Execute the fidelity audit on real Lewis Residence data to determine if designation-based reconstruction produces useful client hierarchy or if the discipline-based fallback should be the primary (or only) strategy.

### Data Provenance (Verified)
- `designation` and `discipline` are both native columns on `estimate_row_items` (non-nullable strings in DB)
- Both are explicitly selected in `buildSnapshotForProject()` (`src/lib/publication/actions.ts`)
- Both pass through `buildSnapshotRow()` unchanged (`src/lib/publication/snapshot.ts`)
- Stored as `snapshot_json` (JSONB) on `project_publications`
- Test confirmed: `{ designation: "CW-01", discipline: "Structural" }` passes through to snapshot unchanged

### Cross-References
- `10-fidelity-audit-and-tree-reconstruction-spec.md` — Blocking gate for P3
- `11-test-data-fixture-spec.md` — Required test fixtures (7 categories)
- `12-assumptions-decisions-log.md` — A3 (designation-based reconstruction), A8 (designation provenance)
