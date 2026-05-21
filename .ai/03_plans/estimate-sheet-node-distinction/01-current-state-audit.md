# 01 — Current State Audit

**Date:** 2026-05-21  
**Audited files:** `src/components/workshop/EstimateSheetContent.tsx`, `src/components/workshop/EstimateSheetTree.tsx`, `src/components/workshop/estimate-tree-data.ts`, `src/lib/estimates/tree-hierarchy.ts`

---

## 1. Node kinds and hierarchy rules

```ts
// src/lib/estimates/tree-hierarchy.ts
export function canNestEstimateNodeKind(childKind, parentKind) {
  if (parentKind === null) return childKind === "group";   // root → group only
  return parentKind === "group";                           // only groups are parents
}
```

| Kind | Can have children | Can hold row items | Icon |
|------|-------------------|--------------------|------|
| `group` | ✅ Yes | ❌ No | `FolderSimple` |
| `area` | ❌ No | ✅ Yes | `Cube` |

Legacy kinds (`lot`, `general`, `structure`, `level`, `assembly`) are normalized to `group` at runtime.

---

## 2. How the center sheet renders nodes today

### Entry point

`EstimateSheetContent` → `resolveEstimateWorkspaceSelection` → renders the selected branch starting at `selectedNode` via `EstimateSheetBranch` (recursive).

### `EstimateSheetBranch` (lines 715–797)

```tsx
<section className={cn("space-y-1", groupGap(depth))} aria-label={node.name}>
  {/* HEADER BAR — identical for group AND area */}
  <div className={cn("flex h-8 items-center gap-2 border px-1", groupTint())}
       style={{ paddingLeft: `${leftIndent + 8}px` }}>
    <Button … aria-label={`${collapsed ? "Expand" : "Collapse"} ${node.name}`} …>
      <CaretDown … />
    </Button>
    <span className="flex size-6 shrink-0 items-center justify-center text-tertiary">
      <NodeIcon kind={node.kind} />
    </span>
    <div className="min-w-0 flex-1">
      <p className="truncate text-[10px] font-normal text-ink">{node.name}</p>
    </div>
    <span className="shrink-0 text-right text-[10px] font-normal tabular-nums text-ink">
      {pesoFormatter.format(total)}
    </span>
  </div>

  {!collapsed ? (
    <div className="space-y-4">
      {/* CHILDREN — rendered recursively */}
      {childAreas.map((child) => (
        <EstimateSheetBranch key={child.id} node={child} depth={depth + 1} … />
      ))}
      {/* ROW TABLE — only for areas (items may be empty) */}
      <EstimateRowItemsTable items={estimateRowItems} … />
      {/* EMPTY STATE / DROP ZONE */}
      …
    </div>
  ) : null}
</section>
```

### Current styling functions

```tsx
function groupTint() {
  return "border-hairline bg-surfaceMuted";
}

function groupGap(depth: number) {
  if (depth === 0) return "mt-0";
  if (depth === 1) return "mt-5";
  return "mt-4";
}

function NodeIcon({ kind }) {
  if (getEstimateNodeDisplayKind(kind) === "group")
    return <FolderSimple size={13} weight="bold" />;
  return <Cube size={13} weight="bold" />;
}
```

**Observation:** `groupTint()` applies the EXACT same `border-hairline bg-surfaceMuted` class string to **both** group and area headers. There is zero visual differentiation beyond the 13px icon swap.

---

## 3. The row table visual weight

`EstimateRowItemsTable` renders:

- A sticky header row (`min-h-10`, `bg-white`, `border-b border-hairline`).
- Tall material rows (`min-h-24`, blue left accent `border-l-2 border-l-accent/70`, `bg-[#EFF6FF]`).
- A dashed drop-zone row at the bottom.
- Column grid: `grid-cols-[32px_minmax(134px,1fr)_104px_58px_92px_92px_92px_108px_30px]`.

This table already dominates the visual field. Any group header styling must sit **above** this hierarchy without clashing.

---

## 4. The left tree panel distinction (for reference)

`EstimateSheetTree` uses `react-complex-tree` and distinguishes nodes via:

- `FolderSimple` vs `Cube` icon (12px in tree, 13px in sheet).
- Folder nodes show a `CaretDown` arrow; leaf nodes get a blank `size-5` spacer.
- Selected node: `bg-surface-muted ring-1 ring-[#d7dee8]`.
- Editing node: `border border-accent bg-accentSoft ring-1 ring-accent`.
- Nest-intent target: `bg-[#eef7ff] ring-1 ring-[#8bbce8]`.

The tree uses 20px indent steps (vs 32px in the sheet).

---

## 5. Indentation and nesting in the sheet

- Sheet indent step: **32px** per depth, max **192px**.
- Applied via inline `style={{ paddingLeft: … }}` on the header bar.
- Empty area messages use `marginLeft` with the same math.
- No visual connectors (lines, guides) between parent and child.

At deep nesting (e.g., `Lot → House → Ground Floor → Foyer`), the user sees four identically-styled `h-8` bars stacked with increasing left padding. The only structural cue is the indent itself and the icon swap.

---

## 6. Design-token inventory relevant to this surface

| Token | Value | Tailwind | Current usage in sheet |
|-------|-------|----------|------------------------|
| `--ink` | `#111111` | `text-ink` | Header text |
| `--secondary` | `#313130` | `text-secondary` | — |
| `--tertiary` | `#626260` | `text-tertiary` | Icons, metadata |
| `--hairline` | `#e5e7eb` | `border-hairline` | Header border, table borders |
| `--divider` | `#cecfcb` | `border-divider` | Dashed drop zones |
| `--accent` | `#ff7a1a` | `text-accent` / `bg-accent` | Active cells, badges |
| `--accent-soft` | `#FFF0E5` | `bg-accentSoft` | Editing states |
| `--surface-muted` | `#F4F7FA` | `bg-surfaceMuted` | Header backgrounds |
| `--canvas` | `#F4F7FA` | `bg-canvas` | App background |
| `--success` | `#15803D` | `text-success` | Saved states |
| `--danger` | `#B91C1C` | `text-danger` | Delete, errors |

**No token exists for:**
- A slightly darker or warmer muted background.
- A left-border accent specifically for organizational headers.
- A subdued dashed or dotted border variant.

These may need to be added as inline Tailwind classes (still within the existing palette) or as new semantic tokens.

---

## 7. Missing features (new scope)

### M1 — Node codes
The `estimate_nodes` table has no `code` column. There is no user-defined or auto-generated identifier per node. Estimators conventionally use codes (e.g., `01-100`, `A.01`, `1.2.3`) for WBS/CSI-style referencing. The current UI displays only `name` and `total` in the header bar.

**Data model gap:**
- DB: `estimate_nodes` lacks `code text`.
- Types: `EstimateTreeNode` lacks `code`.
- UI: No display slot for a code in the `h-8` header bar.

**Auto-generation strategy (frontend-only, Phase 1):**
- Root-level nodes: `01`, `02`, `03`... (based on sibling index + 1)
- Children: `01.01`, `01.02`...
- Deeper: `01.01.01`, `01.01.02`...
- Areas follow the same hierarchical numbering.

**User-defined strategy (DB-backed, Phase 2):**
- Add `code text` to `estimate_nodes`.
- If `code` is NULL/empty, fall back to auto-generated position code.
- If `code` is set, display the stored value.
- Editable via inline edit or context menu (future feature).

### M2 — Breadcrumbs for area nodes
Area nodes are leaf workspaces. When an estimator is looking at `Foyer` rows, they may lose context of which building/floor the foyer belongs to. There is no breadcrumb trail showing ancestor path (`Lot A › Main House › Ground Floor › Foyer`).

**Technical note:** Breadcrumbs can be computed from the nested tree structure without DB changes, but only if the component receives or can derive the ancestor path. Currently `EstimateSheetBranch` receives only its own `node` and `depth`; it does not receive a `path` prop.

---

## 8. Problems identified

### P1 — Zero background differentiation
Both group and area headers use `bg-surfaceMuted`. When an area contains rows, its header and the table below read as one flat surface because the table itself is `bg-white` with only the material cells having blue tint. The header does not "own" the table visually.

### P2 — Icon swap is too subtle at 13px
At 10px font size and dense layout, a 13px `FolderSimple` vs `Cube` difference is easy to miss, especially when the user is scrolling quickly or working on a small laptop screen.

### P3 — Collapse affordance is identical
Both kinds show a `CaretDown` button. Groups almost always have children (by definition they are expandable). Areas never have children, yet the caret is still present because `hasContents` includes `estimateRowItems.length > 0`. This means area headers with rows also show a collapse button that hides the table — which is correct behavior, but the identical header styling makes it look like the area itself is a folder.

### P4 — No hierarchy connectors
With 32px indent steps, deep nesting can make it hard to trace which group owns which area. The eye has to follow the indent alone; there are no vertical guides or connector lines.

### P5 — Kind label is missing in the sheet
The header shows the node name and total, but does not display the kind label (`group` or `area`). The tree does not show a text label either, but the tree has folder vs leaf semantics from `react-complex-tree`. The sheet has no such structural affordance.

---

## 9. Constraints that bound the solution

| Constraint | Implication |
|------------|-------------|
| C1 — 12px max font size | Kind labels must be 8–9px uppercase badges or similar. |
| C2 — No dark mode | Light-only palette; backgrounds must work on `#fff` and `#f4f7fa`. |
| C3 — Border-heavy, shadow-light | Prefer 1px borders and subtle background shifts over shadows or glows. |
| C4 — Compact density | Header is `h-8` (32px). No room for multi-line headers or large badges. |
| C5 — Row table visual weight | Area nodes already have a heavy table below them. Do not add MORE visual weight to area headers. |
| C6 — Tree indent = 20px, sheet indent = 32px | The sheet is already more spacious; use that space for distinction. |
| C7 — No new animation budget | Static styling only; micro-interactions (hover, active) reuse existing patterns. |
| C8 — Phosphor Icons only | `FolderSimple`, `Cube`, and system icons only. No custom SVGs. |
| C9 — Node codes must fit in `h-8` header | Code display cannot increase header height or push total off-screen. |
| C10 — Breadcrumbs are area-only, subtle | Gray, small, non-competing with row table. |
