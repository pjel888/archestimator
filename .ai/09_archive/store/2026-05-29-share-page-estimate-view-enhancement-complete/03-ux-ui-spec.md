# 03 — UX / UI Specification

**Date:** 2026-05-29
**Status:** Complete

---

## 1. Layout Overview

### 1.1 Enhanced Receiver Page Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│ HEADER: ArchestimatorLogo + "View-only" badge                       │
├─────────────────────────────────────────────────────────────────────┤
│ Project metadata (name, code, client, location)                     │
│ SharePageHero (cover image, if available)                           │
├─────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────┐ ┌─────────────────────────────┐ │
│ │  ESTIMATE SHEETS (main area)    │ │ SIDEBAR (right, sticky)     │ │
│ │                                 │ │                             │ │
│ │  Active Sheet: [name]  [total]  │ │ SharePageDecision           │ │
│ │  [sheetCode]                    │ │ SharePageComments           │ │
│ │                                 │ │                             │ │
│ │  ╔═════════════════════════════╗ │ │                             │ │
│ │  ║     DONUT CHART             ║ │ │                             │ │
│ │  ║  (Cost by Discipline)       ║ │ │                             │ │
│ │  ║                             ║ │ │                             │ │
│ │  ╚═════════════════════════════╝ │ │                             │ │
│ │                                 │ │                             │ │
│ │  ┌────────────────────────────┐ │ │                             │ │
│ │  │ Tab Bar: [ES-001] [ES-002] │ │ │                             │ │
│ │  └────────────────────────────┘ │ │                             │ │
│ │                                 │ │                             │ │
│ │  ┌────────────────────────────┐ │ │                             │ │
│ │  │ Sub-Tabs: [Tree View] [Grid│ │ │                             │ │
│ │  └────────────────────────────┘ │ │                             │ │
│ │                                 │ │                             │ │
│ │  ┌──────┬──────────────────────┐│ │                             │ │
│ │  │Float │  TREE VIEW /         ││ │                             │ │
│ │  │Nav   │  GRID PREVIEW        ││ │                             │ │
│ │  │Tree  │  (active view)       ││ │                             │ │
│ │  │      │                      ││ │                             │ │
│ │  │(opt) │                      ││ │                             │ │
│ │  └──────┴──────────────────────┘│ │                             │ │
│ └─────────────────────────────────┘ └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Component Hierarchy

```
SharePageTabs (enhanced)
├── Active Sheet Summary (name, sheetCode, totalCost)
├── Donut Chart Section (per active sheet)
│   └── CostDonutChart (extracted from ProjectCostDonutChart)
│       ├── D3 SVG donut (discipline slices)
│       ├── Callout labels (left/right gutters)
│       └── Center: blank → hover detail
├── Estimate Sheet Tab Bar (horizontal, existing)
│   └── Tab buttons (per sheet, keyboard navigable)
├── Sub-Tab Bar (Tree View | Grid Preview)
│   └── Toggle buttons (per active sheet)
├── Floating Navigation Tree (conditional, left)
│   └── ShareFloatingTreeNav
│       └── Compact list of node labels, scroll-to behavior
├── Tree View Panel (activeView === 'tree')
│   └── ShareEstimateTreeView
│       ├── Group Node rows (with totals, collapsible)
│       │   └── Area Node rows (with totals, collapsible)
│       │       └── Row items (description, qty, unit, total)
│       └── Flat fallback (when no designation grouping)
└── Grid Preview Panel (activeView === 'grid')
    └── Existing flat table (unchanged)
        ├── Column headers
        └── Row items with image thumbnails
```

---

## 2. Donut Chart Design

### 2.1 Positioning

- Positioned **above** the estimate sheet tab bar
- Full-width within the main content area
- Changes when user switches estimate sheet tabs
- Same D3 rendering as workshop donut chart:
  - 720×560 SVG viewBox, responsive width
  - Outer radius: 156px, Inner radius: 98px
  - 12-color palette from `PROJECT_CHART_COLORS`
  - Left/right callout labels with connector lines

### 2.2 Grouping Mode

- **Default: By Discipline** — aggregate `PublicationSnapshotRow.discipline` values
- Other grouping modes (space, category) require snapshot enhancement (deferred)

### 2.3 Chart Label

```typescript
// Dynamic aria-label
label={`${estimate.name} cost distribution by discipline`}
```

### 2.4 Interaction States

| State | Behavior |
|-------|----------|
| **Default** | All slices visible at full opacity. Center is blank. |
| **Hover/Focus on slice** | Active slice expands (+4px radius). Other slices dim to 42% opacity. Center shows: label, total (compact), share %. |
| **Empty** | No rows → "No cost rows" placeholder (same as workshop). |
| **Single discipline** | One full-circle donut. Center blank until hover. |

### 2.5 Mobile Adaptation

- SVG scales to container width via `preserveAspectRatio="xMidYMid meet"`
- Callout labels may overlap on very narrow viewports (< 360px). Acceptable trade-off for V1.
- Chart height: automatic from aspect ratio.

---

## 3. Sub-Tab System

### 3.1 Visual Design

Sub-tabs follow the same pattern as the main estimate sheet tab bar but with distinct visual treatment:

```
┌──────────────────────────────────────────────┐
│ [Tree View]  [Grid Preview]                  │  ← Sub-tab bar
└──────────────────────────────────────────────┘
```

| Element | Value |
|---------|-------|
| Height | 28px (slightly shorter than main tab bar at 32px) |
| Active tab | `bg-white text-ink border-hairline` |
| Inactive tab | `bg-surfaceMuted text-tertiary border-transparent hover:text-ink hover:border-hairline` |
| Font | SF Pro, 9px, medium, uppercase |
| Border radius | `rounded-xs` |
| Gap | `gap-0` (flush tabs) |
| Container | `border-b border-hairline` |

### 3.2 State Management

```typescript
// Per-estimate-sheet view mode state
const [sheetViews, setSheetViews] = useState<Record<string, 'tree' | 'grid'>>({});
// Default: 'tree' for every sheet
```

### 3.3 Behavior

- **Default view**: "Tree View" for all estimate sheets
- **Per-sheet persistence**: View mode remembers per sheet within the session (not persisted to sessionStorage — resets on page load)
- **Switching sheets**: Donut chart updates immediately. Sub-tab view respects the saved view mode for that sheet (or defaults to 'tree')
- **Keyboard**: ArrowLeft/ArrowRight to switch between Tree View and Grid Preview

### 3.4 Accessibility

```html
<div role="tablist" aria-label="View mode">
  <button role="tab" aria-selected="true" aria-controls="share-tree-panel-{id}">Tree View</button>
  <button role="tab" aria-selected="false" aria-controls="share-grid-panel-{id}">Grid Preview</button>
</div>
```

---

## 4. Tree View Design

### 4.1 Visual Structure

```
┌─────────────────────────────────────────────────────────────┐
│ ▸ General Requirements                        PHP 150,000.00│  ← Group Node (collapsible)
│   ▸ Site Preparation                           PHP 50,000.00│  ← Group Node
│     ▾ Site Clearing                            PHP 50,000.00│  ← Area Node (expanded)
│       │ Excavation and grading         lot    1  PHP 30,000│  ← Row item
│       │ Debris removal                 lot    1  PHP 20,000│
│   ▸ Temporary Facilities                       PHP 100,000.00│
│ ▸ House                                        PHP 850,000.00│
│   ▾ Living Room                                PHP 120,000.00│
│     │ Sofa set                      furniture  1  PHP 45,000│
│     │ Media console                 furniture  1  PHP 25,000│
│     │ Floor tiles                   finishes  30  PHP 50,000│
│   ▸ Bedroom 1                                   PHP 80,000.00│
│   ▸ Kitchen                                     PHP 200,000.00│
│ ▸ Site Works                                   PHP 500,000.00│
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Node Row Styles

| Node Type | Background | Border | Font | Icon |
|-----------|------------|--------|------|------|
| **Group Node** | `bg-surfaceMuted` | `border border-hairline border-l-2 border-l-divider` | `text-[10px] font-medium text-ink` | `FolderSimple` (12px, regular) |
| **Area Node** | `bg-white` (or `hover:bg-surfaceMuted/40`) | None | `text-[10px] font-medium text-secondary` | `Cube` (12px, regular) |
| **Row Item** | `bg-white` | None | `text-[10px] text-secondary` | No icon |

### 4.3 Row Item Columns (Tree View)

| Column | Width | Alignment |
|--------|-------|-----------|
| Description (with optional 24px thumbnail) | Flex-1 | Left |
| Designation/Discipline | 80px | Left |
| Quantity | 48px | Center |
| Unit | 40px | Center |
| Total | 100px | Right |

### 4.4 Indentation

- Each tree depth level: 20px indent (matches `WORKSHOP_TREE_INDENT_STEP` from `tree-visual-style.ts`)
- Maximum indent: 140px (matches `WORKSHOP_TREE_MAX_INDENT`)
- Row items indent: +20px from parent Area Node
- Consistent with workshop tree indentation (`workshopTreeIndentStyle(depth)`)

### 4.5 Expand/Collapse

- Group and Area nodes are collapsible
- `CaretDown` icon (11px, regular) — rotates -90° when collapsed
- Click on node row header toggles expansion
- Default: All nodes expanded on initial load
- No animation (consistent with workshop patterns)

### 4.6 Reconstruction Logic

Since snapshot rows are flat, tree structure is reconstructed:

1. **Group rows by `designation` field**: Each unique `designation` value becomes an Area-like node
2. **Sort groups alphabetically** by designation
3. **Rows without designation**: Placed under an "Unassigned" group
4. **Group-level nodes**: If `designation` values follow a pattern like `"House > Living Room"`, split on delimiter to create nested Group → Area hierarchy

**Fallback**: If `designation` is empty for all rows, render a flat list grouped by `discipline` with discipline headers.

### 4.7 Empty State

When an estimate sheet has no rows:
```
┌──────────────────────────────────────────────┐
│  No estimate rows                            │
│  This sheet is empty.                        │
└──────────────────────────────────────────────┘
```

---

## 5. Floating Navigation Tree

### 5.1 Visual Design

```
┌──────────────┐
│ Tree Nav     │  ← Compact header (8px, uppercase, tertiary)
│              │
│ ● General Req│  ← Current view section (active)
│   Site Prep  │  ← Indented child
│   Temp Facil │
│ ● House      │
│   Living Rm  │
│   Bedroom 1  │
│   Kitchen    │
│ ● Site Works │
└──────────────┘
```

| Element | Value |
|---------|-------|
| Width | 140px |
| Position | Sticky, left of Tree View panel, outside the content container |
| Background | Transparent (floats outside main panel border) |
| Font | SF Pro, 8px, medium, `text-tertiary` |
| Active item | `text-ink font-medium`, with subtle left border accent |
| Spacing | Compact, `gap-0.5` between items |
| Scroll | Scrolls with page content (sticky positioning) |

### 5.2 Behavior

- Renders a compact list of all node labels in the active sheet's tree
- Clicking a node label scrolls the Tree View to that section
- Active section highlights as user scrolls (IntersectionObserver)
- Hidden on mobile (screen width < 768px)

### 5.3 Visibility

- Only visible when **Tree View** is active
- Hidden when **Grid Preview** is active
- Accessible: `aria-label="Estimate tree navigation"`

---

## 6. Grid Preview (Existing — Preserved)

The Grid Preview is the **current** flat table implementation. No visual changes.

```
┌─────────────────────────────────────────────────────────┐
│ Description          │ Discipline   │ Qty │ Unit │ Total│
├─────────────────────────────────────────────────────────┤
│ [img] Excavation...  │ Site Works   │ 1   │ lot  │ 30K  │
│ [img] Debris removal │ Site Works   │ 1   │ lot  │ 20K  │
│ [img] Sofa set       │ Furniture    │ 1   │ pc   │ 45K  │
└─────────────────────────────────────────────────────────┘
```

---

## 7. Mobile Behavior

### 7.1 Breakpoints

| Breakpoint | Layout |
|------------|--------|
| ≥ 1024px (lg) | Full layout: donut chart + tabs + sub-tabs + floating tree (Tree View) + right sidebar |
| 768–1023px (md) | Donut chart + tabs + sub-tabs + Tree/Grid View. Floating nav hidden. Sidebar below or hidden. |
| < 768px (sm) | Stacked: donut chart → tabs → sub-tabs → view. Floating nav hidden. Sidebar below. |

### 7.2 Mobile Tree View

- Nodes start collapsed (save vertical space)
- Indentation reduced to 12px
- Row items simplified: Description + Total only (hide discipline/qty/unit columns)

### 7.3 Mobile Donut Chart

- SVG scales to viewport width
- Callout labels may truncate
- Center detail remains readable

---

## 8. Copy Matrix

| Element | Copy |
|---------|------|
| Sub-tab: Tree View | "Tree View" |
| Sub-tab: Grid Preview | "Grid Preview" |
| Donut chart aria-label | "{sheetName} cost distribution by discipline" |
| Tree nav aria-label | "Estimate tree navigation" |
| Empty sheet | "No estimate rows" / "This sheet is empty." |
| Unassigned group (Tree View) | "Unassigned" |
| No designation group | "Other Items" |

---

## 9. Accessibility Requirements

| Requirement | Implementation |
|-------------|----------------|
| **Tab bars** | `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls` |
| **Keyboard navigation** | Arrow keys for both main tabs and sub-tabs. Roving tabindex. |
| **Donut chart** | SVG `role="img"`, `aria-label`. Each slice has `aria-label` with label + value + percentage. Slices are focusable (`tabIndex={0}`). |
| **Tree View** | `role="tree"`, `role="treeitem"`, `aria-expanded`. Keyboard: Arrow keys for navigation, Enter/Space to toggle expand. |
| **Floating nav** | `role="navigation"`, `aria-label`. |
| **Color contrast** | Chart colors meet WCAG AA against white background. Text meets SF Pro 10px minimum. |
| **Screen reader** | All dynamic content (tab switches, chart updates) announced via ARIA live regions. |

---

## Post-Audit Updates (2026-05-29)

**Supplementary audit completed** — see `00-POST-AUDIT-STRATEGY-ASSESSMENT-AND-IMPROVEMENT-PLAN.md` for full evidence.

### Corrections Applied
- Icon sizes: 13px → **12px** for FolderSimple and Cube (matches `EstimateSheetTree.tsx` sidebar tree, lines 83–84)
- Indentation: 16px → **20px** per depth level (matches `WORKSHOP_TREE_INDENT_STEP` from `tree-visual-style.ts`)
- Maximum indent: Added **140px** cap (matches `WORKSHOP_TREE_MAX_INDENT`)

### Additional UX Clarifications

**Donut + Sub-Tab Interaction:**
- The donut chart is positioned above the main estimate sheet tab bar (not above the sub-tabs).
- When the user switches estimate sheet tabs, the donut chart updates to show the new sheet's data.
- The donut chart remains visible regardless of which sub-tab (Tree View or Grid Preview) is active.
- When switching sub-tabs, the donut chart does NOT change — it always shows the discipline breakdown for the active sheet.

**Default View Mode Consideration:**
- The plan defaults to "Tree View" for all sheets. This is appropriate for the enhancement's goal of providing rich analytical views.
- However, if the fidelity audit (10-) determines that designation-based reconstruction produces misleading hierarchy, the default should be changed to "Grid Preview" with Tree View as an opt-in.
- The owner should make this decision after reviewing the fidelity audit results.

**Mobile Tree View:**
- Default collapsed state on mobile is confirmed as the correct UX decision.
- The simplified row format (Description + Total only) on mobile reduces cognitive load.
- The 12px indent on mobile (vs 20px on desktop) provides better use of limited horizontal space.

### XSS Safety Note
All snapshot field values (description, designation, discipline, material) in the Tree View code sketches use React JSX text children (`{node.label}`, `{row.description}`) which are inherently XSS-safe. No `dangerouslySetInnerHTML` or raw HTML construction is used or permitted.

### Cross-References
- `09-ui-primitive-reuse-audit-and-extension-plan.md` — Required primitive decisions before implementing sub-tabs and tree rows
- `IMPLEMENTATION-MASTER-PROMPT.md` — Verified technical parameters (icon sizes, indent, etc.)
