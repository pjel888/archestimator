# 01 — Current Implementation Audit

**Date:** 2026-05-29
**Status:** Complete

---

## 1. SharePageTabs — Current Implementation

**File:** `src/components/share/SharePageTabs.tsx` (264 lines)
**Type:** Client component (`"use client"`)

### 1.1 Component Structure

```
SharePageTabs
├── Active estimate summary header (name + total)
├── Recipient session guard banner (conditional)
├── Tab bar (horizontal scroll with fade masks)
│   └── Tab buttons (per estimate sheet, keyboard navigable)
└── Active tab panel (single estimate)
    └── Table (Description | Discipline | Qty | Unit | Total)
        └── Row image thumbnails (conditional, 32px)
```

### 1.2 State Management

| State | Type | Persistence |
|-------|------|-------------|
| `activeId` | `string` | `sessionStorage` (key: `share-tab:{token}`) |
| `canScrollLeft` / `canScrollRight` | `boolean` | Ephemeral (scroll/resize event) |
| Tab refs | `useRef<(HTMLButtonElement | null)[]>` | Ephemeral |
| Scroll ref | `useRef<HTMLDivElement>` | Ephemeral |

### 1.3 Props Interface

```typescript
interface SharePageTabsProps {
  estimates: PublicationSnapshotEstimate[];  // Array of estimate sheets
  currencyCode: string;                      // e.g. "PHP"
  token: string;                             // Publication token
}
```

### 1.4 Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│ Server: /share/[token]/page.tsx                              │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ resolveProjectPublicationSnapshotByToken(token)          │ │
│ │ → ProjectPublicationSnapshot                            │ │
│ │   ├── project: { currencyCode, ... }                    │ │
│ │   └── estimates: PublicationSnapshotEstimate[]          │ │
│ │       └── rows: PublicationSnapshotRow[]                │ │
│ └──────────────────────────────────────────────────────────┘ │
│                          │                                    │
│                          ▼                                    │
│ <SharePageTabs                                                │
│   estimates={snapshot.estimates}                              │
│   currencyCode={snapshot.project.currencyCode}                │
│   token={token}                                               │
│ />                                                            │
└──────────────────────────────────────────────────────────────┘
```

### 1.5 Current Table Rendering

The active estimate panel renders a single flat HTML table:

```tsx
<table>
  <thead>
    <tr>
      <th>Description</th>
      <th>Discipline</th>
      <th>Qty</th>
      <th>Unit</th>
      <th>Total</th>
    </tr>
  </thead>
  <tbody>
    {activeEstimate.rows.map(row => (
      <tr>
        <td>{row.imageUrl && <Image />}{row.description}</td>
        <td>{row.discipline}</td>
        <td>{row.quantity}</td>
        <td>{row.unit}</td>
        <td>{formatMoney(row.rowTotal)}</td>
      </tr>
    ))}
  </tbody>
</table>
```

### 1.6 Keyboard Navigation (Tab Bar)

- ArrowLeft/ArrowRight: Cycle through tabs (wrap-around)
- Home/End: Jump to first/last tab
- Enter/Space: Activate tab
- Roving tabindex (only active tab has `tabIndex={0}`)

---

## 2. PublicationSnapshotEstimate Type

**File:** `src/lib/publication/types.ts`

```typescript
export type PublicationSnapshotRow = {
  id: string;
  description: string;
  designation: string;       // ⬅ Potential tree grouping field
  discipline: string;        // ⬅ Donut chart grouping field
  material: string;
  quantity: number;
  unit: string;
  unitCost: number;
  miscCost: number;
  contingencyPercentage: number;
  rowTotal: number;          // ⬅ Donut chart value
  imageUrl?: string | null;
};

export type PublicationSnapshotEstimate = {
  id: string;
  name: string;
  sheetCode: string;
  updatedAt: string | null;
  rowCount: number;
  totalCost: number;         // ⬅ Donut chart total
  rows: PublicationSnapshotRow[];
};
```

### Key Fields for Enhancement

| Field | Used For | Notes |
|-------|----------|-------|
| `discipline` | Donut chart grouping | Available on every row. Values like "Architectural", "Electrical", "Plumbing", etc. |
| `rowTotal` | Donut chart slice value | Pre-computed total per row. |
| `totalCost` | Donut chart center value | Pre-computed total per sheet. |
| `designation` | Tree View grouping | May contain Area Node names. Nullable. |
| `description` | Tree View row label | Row description text. |
| `imageUrl` | Row thumbnail | Already rendered in Grid Preview. Also shown in Tree View rows. |

---

## 3. ProjectCostDonutChart — Current Implementation

**File:** `src/components/workshop/project-charts/ProjectCostDonutChart.tsx` (237 lines)
**Type:** Client component

### 3.1 Component Interface

```typescript
type ProjectCostDonutChartProps = {
  buckets: ProjectChartBucket[];   // Pre-computed chart buckets
  total: number;                   // Grand total for center display
  currencyCode: string;            // Currency formatting
  label: string;                   // aria-label
};
```

### 3.2 Chart Configuration

| Parameter | Value |
|-----------|-------|
| SVG dimensions | 720 × 560 viewBox |
| Outer radius | 156px |
| Inner radius | 98px |
| Corner radius | 3px |
| Pad angle | 0.012 rad |
| Color palette | 12-color `PROJECT_CHART_COLORS` array |
| Callout system | Left/right gutters with connector lines |
| Interaction | Hover/focus enlarges slice, shows center detail |
| Empty center | Blank until hover/focus |

### 3.3 Workshop-Specific Coupling

- Imports from `@/lib/project-charts/types` (workshop-specific)
- Uses workshop chart color constants
- Named "Project Cost" — share page needs "Estimate Cost" or generic naming
- Located under `src/components/workshop/project-charts/` — should be extracted to shared location

### 3.4 Extraction Strategy

1. Move `ProjectCostDonutChart.tsx` to `src/components/charts/CostDonutChart.tsx`
2. Keep identical D3 rendering code
3. Change props to generic names:
   - `buckets: CostBucket[]` (shared type)
   - Remove workshop-specific imports
4. Re-export from old location for backward compatibility
5. Use in `SharePageTabs` with discipline-aggregated buckets

### 3.5 Shared Chart Types

New shared type in `src/lib/charts/types.ts`:

```typescript
export type CostBucket = {
  id: string;
  label: string;
  total: number;
  share: number;
  rowCount: number;
  color: string;
  isOther?: boolean;
};
```

---

## 4. Workshop Estimate Tree View — Reference Implementation

**File:** `src/components/workshop/EstimateSheetContent.tsx` (lines 1–2000+)
**Tree component:** `src/components/workshop/EstimateSheetTree.tsx` (uses React Complex Tree)
**Shared primitives:** `src/components/workshop/workshop-tree.tsx` (WorkshopTreeRow, WorkshopTreeTabs)

### 4.1 Workshop Tree Architecture

```
EstimateSheetContent
├── Left: EstimateSheetTree
│   ├── SearchInput
│   ├── HeaderIconToolbar (expand/collapse/add actions)
│   ├── WorkshopTreeTabs (Sheets tab)
│   └── ControlledTreeEnvironment (React Complex Tree)
│       └── Tree with drag/drop, rename, delete
│           └── WorkshopTreeRow (per node)
│               ├── NodeIcon (FolderSimple | Cube)
│               ├── Node name
│               └── Context menu (Rename, Delete)
│
├── Center: Estimate sheet content
│   ├── Node headers (Group/Area with totals)
│   └── EstimateRowItemsTable (per Area Node)
│       └── Material cards with images, Qty, Subtotal, etc.
│
└── Right: Component Library sidebar
```

### 4.2 Key Visual Patterns for Receiver Tree View

| Pattern | Workshop | Receiver Adaptation |
|---------|----------|---------------------|
| **Group Node row** | `border-l-2 border-l-divider`, `bg-surfaceMuted`, `hover:bg-[#EAEEF3]` | Same visual treatment |
| **Area Node row** | `hover:bg-surfaceMuted/40` | Same |
| **Group icon** | `FolderSimple` (12px, regular) | Same |
| **Area icon** | `Cube` (12px, regular) | Same |
| **Group name** | `truncate text-[10px] font-medium text-ink` | Same |
| **Area name** | `truncate text-[10px] font-medium text-secondary` | Same |
| **Node total** | Right-aligned, tabular-nums, PHP formatted | Same |
| **Row items** | Material cards with image, name, supplier, cost | Simplified: image + description + total |
| **Indentation** | 20px per depth level (via `workshopTreeIndentStyle`, max 140px) | Same |
| **Expand/collapse** | `CaretDown` icon, rotated -90° when collapsed | Same |

### 4.3 WorkshopTree<TNode> Generic Component (Reuse Opportunity)

**File:** `src/components/workshop/workshop-tree.tsx` (lines 116–195)

The workshop contains a **generic, reusable tree component** `WorkshopTree<TNode>` that was NOT referenced in the original plan pack but represents a significant reuse opportunity:

```typescript
export type WorkshopTreeProps<TNode> = {
  nodes: TNode[];
  selectedNodeId: string | null;
  expandedNodeIds: string[];
  getNodeId: (node: TNode) => string;
  getChildren: (node: TNode) => TNode[] | undefined;
  renderNode: (args: WorkshopTreeRenderNodeArgs<TNode>) => ReactNode;
};
```

| Feature | Implementation |
|---------|---------------|
| **Rendering** | Fully generic — caller provides `renderNode` function |
| **Expand/Collapse** | Driven by `expandedNodeIds` array (external state) |
| **Selection** | Driven by `selectedNodeId` (external state) |
| **Recursion** | Internal `WorkshopTreeNode` handles recursive rendering |
| **Accessibility** | `role="tree"` on `<ul>`, `role="treeitem"` implied, `role="group"` on child `<ul>` |
| **Visual styling** | Delegates to caller's `renderNode` (typically uses `WorkshopTreeRow`) |

**Reuse Potential for Receiver Tree View:**

Instead of creating a completely new `ShareEstimateTreeView` recursive component, the receiver could:
1. Reuse `WorkshopTree<ShareTreeNode>` directly
2. Provide a read-only `renderNode` function that renders simplified node rows
3. Use the same `expandedNodeIds` / `setExpandedNodeIds` state pattern

**Trade-offs:**
- **Pro:** Eliminates recursive rendering duplication; inherits accessibility; single source of truth for tree behavior
- **Pro:** WorkshopTreeRow visual contract is already applied via the caller's renderNode
- **Con:** Imports from `src/components/workshop/` — creates a cross-module dependency
- **Con:** WorkshopTree is currently only used within workshop context (not yet extracted to shared)

**Recommendation:** Either (a) extract `WorkshopTree` + `WorkshopTreeRow` to `src/components/ui/` as shared primitives (preferred per 09 primitive contract), or (b) document the intentional duplication and plan convergence. This should be decided in P0 before P3 Tree View work begins.

### 4.4 What NOT to Bring from Workshop

| Feature | Reason to Exclude |
|---------|-------------------|
| React Complex Tree | Receiver is read-only. Simple recursive React components suffice. |
| Drag and drop | Read-only receiver. |
| Inline rename/edit | Read-only receiver. |
| Context menus (Rename/Delete) | Read-only receiver. |
| Search input | Not needed for receiver (smaller data set). |
| Add Group/Area actions | Read-only receiver. |
| Editable row inputs (Qty, Misc Cost, Contingency) | Read-only receiver. Rows display computed values only. |
| Component Library sidebar | Not applicable to receiver. |
| Zustand state management | Simple React state is sufficient for receiver. |

---

## 5. Gap Summary

### What Exists
- Working share page with tabbed estimate sheets
- Working D3 donut chart component (workshop)
- Working tree view patterns (workshop, via React Complex Tree)
- Snapshot data model with `discipline`, `designation`, `rowTotal`
- Design system tokens and typography

### What's Missing
- Donut chart integration in `SharePageTabs`
- Sub-tab system (Tree View / Grid Preview toggle)
- Client-side chart data aggregation from snapshot rows
- Client-side tree structure reconstruction from flat rows
- Read-only recursive tree component for receiver
- Floating navigation tree component
- Extracted shared `CostDonutChart` component

### What Needs to Change
- `SharePageTabs.tsx` — add donut chart, sub-tabs, Tree View panel
- `ProjectCostDonutChart.tsx` — extract to shared location
- New files for: shared chart types, aggregation utility, Tree View component, floating nav tree

---

## Post-Audit Updates (2026-05-29)

**Supplementary audit completed** — see `00-POST-AUDIT-STRATEGY-ASSESSMENT-AND-IMPROVEMENT-PLAN.md` for full evidence.

### Corrections Applied
- `SharePageTabs.tsx` line count: 273 → **264**
- `ProjectCostDonutChart.tsx` line count: 236 → **237**
- Tree indentation: 16px → **20px** (`WORKSHOP_TREE_INDENT_STEP` in `tree-visual-style.ts`)
- Icon sizes: 13px → **12px** (for sidebar tree context; `EstimateSheetTree.tsx` lines 83–84)
- `weight="regular"` added to Phosphor icon props in all code sketches

### Critical Finding Added
- **§4.3 WorkshopTree<TNode> Generic Component**: A fully reusable recursive tree component exists in `workshop-tree.tsx` that was NOT referenced in the original audit. This component handles tree rendering, expand/collapse, accessibility, and `renderNode` delegation. It represents a high-value reuse opportunity for the receiver Tree View. See 09-primitive-reuse-audit for the full analysis and decision framework.

### Cross-References to New Documents
- `08-security-threat-model-for-receiver-ui.md` — XSS/injection mitigations for new rendering surfaces
- `09-ui-primitive-reuse-audit-and-extension-plan.md` — Primitive contract for new components
- `10-fidelity-audit-and-tree-reconstruction-spec.md` — Blocking gate for P3 Tree View
- `11-test-data-fixture-spec.md` — Required test fixtures for reconstruction logic
- `12-assumptions-decisions-log.md` — All assumptions with reversal triggers
- `13-implementation-readiness-and-owner-review-gate.md` — Pre-implementation gates
- `IMPLEMENTATION-MASTER-PROMPT.md` — Authoritative implementation instructions
