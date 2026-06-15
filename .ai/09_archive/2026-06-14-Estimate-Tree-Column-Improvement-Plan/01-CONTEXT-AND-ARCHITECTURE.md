# 01 - Context & Architecture of the Estimate Master Column

> Part of the **Estimate Master Column (EMC) Improvement Plan** -- `.ai/03_plans/2026-06-14-Estimate-Tree-Column-Improvement-Plan/`
> Status: DRAFT (audit) - 2026-06-14 - Branch: feat/estimate-sheet-uxui
> Index: [00-README](00-README.md)

---

This document establishes the shared mental model for the whole plan: what the Estimate Master Column (EMC) is, the entity model it renders, which file owns which responsibility, how the recursion and sticky stacking work, where state lives, and which surfaces silently share code with it. Every claim below is anchored to a line I read directly in the source; where I assert behavior I name the file:line that proves it. The deeper functional findings (the caret bug, the spacing rhythm, the "Own items" label, the full CRUD matrix) live in the sibling docs and are referenced, not repeated, here.

---

## 1. What the EMC is + layout

The **Estimate Master Column (EMC)** is the **middle column** of the estimate sheet page. The page is a three-column workspace mounted by `EstimateWorkspaceClient` (`src/components/workshop/EstimateWorkspaceClient.tsx:102-117`): a single flex `<section>` holds the **left tree-nav sidebar** (`EstimateSheetTree`, rendered at `EstimateWorkspaceClient.tsx:104`) and the **middle EMC host** (`EstimateSheetContent`, rendered at `EstimateWorkspaceClient.tsx:113`). The **right component-library / templates sidebar** is rendered inside `EstimateSheetContent` itself (it owns the whole middle-plus-right region), not as a third sibling of the tree in `EstimateWorkspaceClient`.

The EMC is where the actual estimate is *worked on*: it renders the node headers, the per-node row tables, the editable cells, the add-row strips, the bulk-action toolbar, the tab strip, and all the row/component/template mutation affordances. The left tree is a navigator and the origin of *node-level* CRUD; the right sidebar is the source of library components and templates that get dragged/inserted into the EMC.

```
EstimateWorkspaceClient (src/components/workshop/EstimateWorkspaceClient.tsx:102)
  <section flex h-full> "{projectName} estimates"
  ┌───────────────────────────┬───────────────────────────────────────────────────────────┐
  │  LEFT: tree-nav sidebar    │  MIDDLE + RIGHT: EstimateSheetContent (THE EMC HOST)        │
  │  EstimateSheetTree         │  src/components/workshop/EstimateSheetContent.tsx           │
  │  (376px, separate module)  │                                                            │
  │                            │  ┌─────────────────────────────┬──────────────────────┐   │
  │  - select node → drives    │  │ MIDDLE = the EMC            │  RIGHT: library /     │   │
  │    the EMC root            │  │                             │  templates sidebar   │   │
  │  - node CRUD origin:       │  │ EstimateTabStrip (tabs)     │  (components +       │   │
  │    add / rename / delete / │  │ TreePanelHeader (search,    │  templates panels;   │   │
  │    move / bulk / DnD       │  │   filter, group, expand-all)│  drag source for     │   │
  │  - own NodeIcon (Circle),  │  │ ─────────────────────────── │  EMC drops)          │   │
  │    own caret + context menu│  │ EstimateSheetBranch         │                      │   │
  │  - NO EMC code imported    │  │   (recursive node renderer) │                      │   │
  │                            │  │   ├ node header (sticky)    │                      │   │
  │                            │  │   ├ EstimateRowItemsTable   │                      │   │
  │                            │  │   ├ ComponentDropTarget     │                      │   │
  │                            │  │   └ child EstimateSheetBranch│                     │   │
  │                            │  │ bulk-action toolbar         │                      │   │
  │                            │  └─────────────────────────────┴──────────────────────┘   │
  └───────────────────────────┴───────────────────────────────────────────────────────────┘
```

`EstimateSheetContent.tsx` is **2475 lines** and is the EMC's single host. It owns: the row/component/template mutation handlers (e.g. `insertLibraryItem` at `:1647`, threaded into the branch at `:2346`), the scope-keyed collapse state (`collapsedNodeIdsByScope` at `:992`), the expansion context value (`:1171-1177`), the search/facet/group filtering of the rendered node (`displayedSheetNode` at `:1143-1151`), and the single render of `EstimateSheetBranch` at `:2340`. Node-level CRUD does **not** live here — it originates in `EstimateSheetTree` (left) and the EMC reaches it only by dispatching CustomEvents; see [02-CRUD-CAPABILITY-MATRIX](02-CRUD-CAPABILITY-MATRIX.md).

---

## 2. The entity model: Tab → Node/Area → Row item → Component

The canonical types live in `src/lib/estimates/types.ts`. The estimate hierarchy has **three structural levels, not four** — a Component is a *sub-state of a Row item*, not a sibling entity. The four conceptual layers are:

| Layer | Canonical type | Where defined | What it is |
| --- | --- | --- | --- |
| **Tab** | `EstimateTabSummary` / `EstimateTabTree` | `types.ts:147-159` | A named, ordered sheet within one estimate. Holds a tree of nodes. CRUD owned by `EstimateTabStrip`. |
| **Node / Area** | `EstimateTreeNode` | `types.ts:138-145` | A container that can hold BOTH child sub-areas AND its own rows (the P6 single-node model, see below). |
| **Row item** | `EstimateRowItem` | `types.ts:81-136` | One line of the estimate (qty, adjustment, misc, totals). Lives in a node's `estimateRowItems`. |
| **Component** | (a *state* of `EstimateRowItem`) | `types.ts:112-114` | The library linkage *on* a row: `sourceLibraryItemId`, `linkState`, `componentVersionId`. A row with a linked library item *has* a component; a "blank"/detached row does not. There is no separate component entity in the tree. |

### 2.1 The node type

```ts
// src/lib/estimates/types.ts:138-145
export type EstimateTreeNode = {
  id: string;
  name: string;
  kind: "group" | "area";
  total: string;
  children?: EstimateTreeNode[];
  estimateRowItems?: EstimateRowItem[];
};
```

The key structural fact: **a single `EstimateTreeNode` carries `children` AND `estimateRowItems` at the same level.** It is not "a group node that holds children" *or* "an area node that holds rows" — it is one node type that can hold both. This is the **P6 single-node model**.

### 2.2 The component is a row sub-state

The "Component" layer is not its own entity. It is the library-linkage fields on `EstimateRowItem` (`types.ts:81-136`), specifically:

```ts
// src/lib/estimates/types.ts:112-114
  sourceLibraryItemId?: string | null;
  linkState?: EstimateRowLinkState;
  componentVersionId?: string | null;
```

Operations the UX calls "component" operations (replace, clear, move-between-rows, mark-project-specific, open-component-details) all mutate *these row fields*, not a child record. "Clear component" replaces the row's component with a blank template while keeping the row; "mark project-specific" detaches the row from its library source. This is why the CRUD matrix in [02-CRUD-CAPABILITY-MATRIX](02-CRUD-CAPABILITY-MATRIX.md) treats Component as a row sub-state, and why removing a component never removes the row.

### 2.3 The P6 single-node model

Under P6, *every node is a first-class area that can hold rows AND child sub-areas* — there is no longer a two-kind hierarchy where groups hold children and areas hold rows. The renderer is built on this assumption: `branch.tsx:97-100` declares `canReceiveTemplates = true` for every node with the comment "every node is a first-class area that can hold rows AND child sub-areas, so a template/subtree drops directly into ANY node — there is no area-wrap path anymore." Containment is derived from *contents*, not `kind`: `branch.tsx:86-88` computes `hasChildren`, `hasOwnRows`, and `hasContents = hasChildren || hasOwnRows`.

**But the model is only partly realized.** Three load-bearing residues still key off the old two-kind split:

1. **The `kind` field still exists** on `EstimateTreeNode` (`types.ts:141`) and is still `"group" | "area"`, even though the renderer is kind-agnostic. It is preserved through the repository read path.
2. **Host insert handlers still gate on `kind`.** `insertLibraryItem` returns early when the target is not an area — `EstimateSheetContent.tsx:1649`:
   ```ts
   // src/components/workshop/EstimateSheetContent.tsx:1647-1649
   const insertLibraryItem = useStableCallback((targetNodeId: string, libraryItem: EstimateRowItem) => {
     const targetNode = findEstimateNode(estimateTree, targetNodeId);
     if (targetNode?.kind !== "area") return;
   ```
   So a blank-row add, a library insert, a component drop, the command palette, and the sidebar add-event all silently no-op on a `group`-kind node even though the add-row strip and template drop targets render on *every* node. The batch template path has the mirror gate (`kind !== "group"`). The single-template, template-node, and drag paths are ungated and work. This is the central correctness wedge of the plan; full treatment in [04-FEATURE-READINESS-AND-BUG-AUDIT](04-FEATURE-READINESS-AND-BUG-AUDIT.md) and the [02-CRUD-CAPABILITY-MATRIX](02-CRUD-CAPABILITY-MATRIX.md).
3. **The disclosure caret keys off `hasChildren`, not `hasContents`** (`branch.tsx:182`) — a node with own rows but no sub-areas renders an inert empty caret slot (`branch.tsx:200-204`) and cannot be collapsed. This is user Requirement 3 and is detailed in [04-FEATURE-READINESS-AND-BUG-AUDIT](04-FEATURE-READINESS-AND-BUG-AUDIT.md).

The DB side of P6 *was* relaxed (migration `20260614003639_unify_estimate_node_kinds.sql` allows mixed nodes), but the committed insert RPC still hard-codes `node.kind = 'area'`; that migration-vs-prod drift is owned by [06-DATABASE-AND-NETWORK-AUDIT](06-DATABASE-AND-NETWORK-AUDIT.md). The net architectural takeaway: **the renderer and schema believe in single-node; the host insert handlers and the `kind` column still encode two kinds.** Reconciling that split is the architectural spine of this plan.

---

## 3. EMC file-by-file responsibility map

All paths under `src/components/workshop/` unless noted. LOC figures are the file's approximate length at audit time.

| File | Responsibility | Key exports / sites | LOC |
| --- | --- | --- | --- |
| `EstimateSheetContent.tsx` | **THE EMC HOST.** Owns all row/component/template mutation handlers; scope-keyed collapse state; expansion context; search/facet/group filtering; renders the branch. | `insertLibraryItem` (`:1647`), `collapsedNodeIdsByScope` (`:992`), `setCollapsedNodeIds` (`:1160`), `sheetExpansionContextValue` (`:1171`), `displayedSheetNode` (`:1143`), `<EstimateSheetBranch>` (`:2340`) | 2475 |
| `estimate-sheet/rows/branch.tsx` | **The recursive per-node renderer (`EstimateSheetBranch`).** Header, caret, breadcrumbs, "Own items" eyebrow, own-rows table, add-row strip, child recursion, template drag/drop. | `EstimateSheetBranch` (`:78`), `SheetMutationHandlers` type (`:62-76`), caret gate (`:182`), empty slot (`:204`), "Own items" eyebrow (`:241-248`), recursion (`:285`) | 327 |
| `estimate-sheet/rows/node-visuals.tsx` | Spacing rhythm + node chrome tokens + sticky constants + node code. | `groupGap` (`:12-19`), `STICKY_HEADER_H`/`STICKY_THEAD_H` (`:9-10`), `NodeIcon` (`:43`), `nodeNameClasses`/`nodeTotalClasses` (`:31-37`), `getNodeCode` (`:21`) | 46 |
| `estimate-sheet/rows/row-table.tsx` | `EstimateRowItemsTable`: per-row rendering, thead, row-level affordances, selection, and the **memo comparator** that is the perf wall. | `areEstimateRowItemsTablePropsEqual` (`:57-82`), `EstimateRowItemsTable = memo(...)` (`:84`) | ~600 |
| `estimate-sheet/rows/cells.tsx` | Editable row cell components (material cell, money inputs, component grip/drag). | `EstimateMaterialCell`, `MoneyInput` | ~290 |
| `estimate-sheet/rows/drop-zones.tsx` | `ComponentDropTarget` (add-row strip + empty state) and template drop surfaces. | `ComponentDropTarget`, `QuietAddRowButton` | ~125 |
| `estimate-sheet/rows/editable-row-model.ts` | The edit/dirty model + the only total math. | `EditableRowValue`, `computeNodeTotal`, `collectEditableRows` | ~130 |
| `estimate-sheet/rows/expansion.ts` | Expansion context + `collectAllNodeIds`. | `EstimateSheetExpansionContext` (`:10`), `useEstimateSheetExpansion` (`:12`), `collectAllNodeIds` (`:18-26`) | 28 |
| `estimate-sheet/rows/constants.ts` | Drag MIME types + `EMPTY_ESTIMATE_ROW_ITEMS` shared identity. | drag MIME constants, `EMPTY_ESTIMATE_ROW_ITEMS` | small |
| `estimate-sheet/EstimateTabStrip.tsx` | Estimate **TAB** CRUD at the top of the EMC. | tab create/rename/delete/reorder/duplicate | ~660 |
| `estimate-sheet/activity-history.tsx` | `pesoFormatter`, row-detail / activity panel. | `pesoFormatter`, `RowDetailTab` | — |
| `estimate-workshop-drag.ts` | Global drag store. | `useEstimateWorkshopDrag` | — |

Adjacent/coupled (NOT EMC, but in the blast radius story):

| File | Why it matters | Anchor |
| --- | --- | --- |
| `EstimateSheetTree.tsx` | The LEFT tree; origin of node-level CRUD. Imports **none** of the EMC row modules; has its own `NodeIcon`. | `EstimateSheetTree.tsx:104` (mount) |
| `EstimateWorkspaceClient.tsx` | Parent that mounts tree + EMC. | `:102-117` |
| `lib/estimates/types.ts` | Canonical entity types. | `:81-159` |
| `lib/project-charts/aggregate-project-charts.ts` | Emits a separate charts "Own items" leaf — string-collision risk, NOT the EMC label. | `:296-309` |
| `library/template-editor/TemplateEditorSheet.tsx` | A parallel node renderer sharing only the `node-visuals` leaf helpers. | `:252` |

---

## 4. Render tree + recursion

The EMC renders exactly **one** `EstimateSheetBranch` at the top (`EstimateSheetContent.tsx:2340`), passed `displayedSheetNode` — the *selected node's subtree*, not the whole estimate. `displayedSheetNode` is the search/facet/group-filtered copy of `selectedNode` (`EstimateSheetContent.tsx:1143-1151`); when no filter is active it is referentially identical to `selectedNode`, which is a deliberate perf guarantee for the memoized table (comment at `:1140-1142`). Selecting a different node in the left tree swaps this root, so the EMC always shows the selected node's whole subtree.

`EstimateSheetBranch` (`branch.tsx:78`) is a **plain, un-memoized recursive function component**. For each node it renders, in DOM order:

1. A **sticky header** (`branch.tsx:172`, `<div className="sticky z-[20]" style={{ top: stickyTop }}>`) containing the caret (or empty slot), `NodeIcon`, node code, node name, and node total. The header row is `h-10` (40px) at `branch.tsx:174`.
2. An optional **breadcrumb band** *inside the same sticky container* (`branch.tsx:218-233`), shown when `showBreadcrumbs` (`!collapsed && ancestorPath.length > 0`, `branch.tsx:91`).
3. When not collapsed (`branch.tsx:236`), a `space-y-4` body containing:
   - the optional **"Own items" eyebrow** (only when `hasOwnRows && hasChildren`, `branch.tsx:241-248`),
   - the node's own **`EstimateRowItemsTable`** (`branch.tsx:249-267`),
   - the **`ComponentDropTarget`** add-row strip / empty state (`branch.tsx:272-278`),
   - then **child sub-areas LAST** via recursive `<EstimateSheetBranch>` (`branch.tsx:281-309`), each at `depth + 1`.

**Depth & indent.** Depth threads down through the recursion (`depth + 1` per level). Indent is `leftIndent = Math.min(depth * 32, 192)` (`branch.tsx:89`) — a 32px step capped at 192px (~6 levels). The whole spacing system (the `groupGap`/`space-y-4`/indent mismatch) is the subject of [03-UXUI-AUDIT](03-UXUI-AUDIT.md).

**Sticky stacking.** Headers and own-rows theads are all `position: sticky`, so nested headers must pin *below* their ancestors instead of colliding at `top: 0`. The offset is accumulated down the recursion (`branch.tsx:92-96`):

```ts
// src/components/workshop/estimate-sheet/rows/branch.tsx:95-96
const ownRowsStickyTop = stickyTop + STICKY_HEADER_H;            // own-rows thead pins below this header
const childStickyTop = ownRowsStickyTop + (hasOwnRows ? STICKY_THEAD_H : 0); // children pin below header (+ own thead)
```

with `STICKY_HEADER_H = STICKY_THEAD_H = 40` (`node-visuals.tsx:9-10`). The constants MUST equal the rendered `h-10` header height or sticky layers overlap/gap; the breadcrumb band height is *not* added to this math (a known seam owned by the UX/spacing doc).

```
displayedSheetNode (selected subtree)  ← EstimateSheetContent.tsx:2340, stickyTop=0
└─ EstimateSheetBranch depth=0
   ├─ sticky header (top:0, h-10=40)                STICKY_HEADER_H=40
   ├─ [Own items eyebrow]  (only if rows AND children)
   ├─ EstimateRowItemsTable (own rows; thead top=40) STICKY_THEAD_H=40
   ├─ ComponentDropTarget (add-row / empty state)
   └─ child EstimateSheetBranch depth=1, stickyTop=childStickyTop (=80 if parent has own rows)
      ├─ sticky header (top:80, h-10)
      ├─ ...rows...
      └─ child EstimateSheetBranch depth=2, stickyTop accumulates further
```

---

## 5. State ownership & data flow

All EMC state is owned by the host `EstimateSheetContent` and flows *down* into the stateless recursive branch via props and one context. There is no Zustand store inside the EMC render tree except the global drag store.

### 5.1 Collapse / expansion state (client-only, scope-keyed)

- **Source:** `collapsedNodeIdsByScope: Record<string, string[]>` — plain `useState` at `EstimateSheetContent.tsx:992`. **No localStorage / sessionStorage / DB backing** — it is in-memory only and lost on reload.
- **Scoping:** keyed by `collapsedScopeKey = dataTabId ?? "legacy"` (`:1155`), so collapse state survives tab switches within a session but resets on remount.
- **Derived set:** `collapsedNodeIds` is memoized as `new Set(collapsedNodeIdsByScope[scope] ?? [])` (`:1156-1159`); `setCollapsedNodeIds` writes back into that scope bucket (`:1160-1169`).
- **Search override:** while `sheetSearchActive`, the context value substitutes `EMPTY_COLLAPSED_NODE_IDS` so every match is revealed *without mutating* the real set (`:1171-1177`); when search clears, the real set returns verbatim.
- **Distribution:** the set + setter are passed through `EstimateSheetExpansionContext.Provider` (`:2339`) and read in the branch via `useEstimateSheetExpansion()` (`branch.tsx:79`). The branch toggles membership directly in the caret `onClick` (`branch.tsx:189-196`). `collectAllNodeIds` (`expansion.ts:18-26`) drives expand-all/collapse-all and walks `node.children` only.

### 5.2 Editable rows (the live edit model)

- **Source:** `editableRows: Record<string, EditableRowValue>` — `useState` at `EstimateSheetContent.tsx:989`, initialized from `collectEditableRows(nodes)`.
- **Flow:** passed into the branch (`:2344-2345`) and on into each `EstimateRowItemsTable`. Cell edits call `setEditableRows`; totals derive from it via `computeNodeTotal(node, editableRows)` (`branch.tsx:90`).
- **Persistence:** every edit fires an immediate per-row optimistic mutation (no debounce, no explicit save); details in [06-DATABASE-AND-NETWORK-AUDIT](06-DATABASE-AND-NETWORK-AUDIT.md).

### 5.3 The memo wall (perf contract)

`editableRows` is one flat hoisted Record, so a keystroke anywhere re-renders the host. Cross-table isolation is enforced entirely by `areEstimateRowItemsTablePropsEqual` (`row-table.tsx:57-82`): it re-renders a table only when *its* items/callbacks change or a row it owns changes (`row-table.tsx:77-80` compares `editableRows[item.id]` and `selectedRowIds` membership per item). The branch itself is **not** memoized (`branch.tsx:78`), so any host state change re-runs the whole branch recursion, but the row cells are spared by this comparator. Any new EMC state piped into the table must be sliced at per-row granularity or it breaks the isolation guarantee. This contract is owned by [05-PERFORMANCE-AUDIT](05-PERFORMANCE-AUDIT.md); it is named here because it constrains every change in the plan.

### 5.4 Drag store and query layer

- **Drag:** the global Zustand drag store `useEstimateWorkshopDrag` (`estimate-workshop-drag.ts`) is read in the branch (`branch.tsx:108`) to know whether a template drag is active and to drive the drop-target highlight.
- **Query layer:** the active tab's tree is fetched via TanStack Query keyed by `estimateQueryKeys.tabTree(estimateId, tabId)`; only the active tab is enabled. Reads, waterfalls, and prefetch gaps are owned by [06-DATABASE-AND-NETWORK-AUDIT](06-DATABASE-AND-NETWORK-AUDIT.md).

---

## 6. Shared seams & reuse (why change safety is non-trivial)

The EMC's raw import fan-out is small — `branch.tsx` is imported by exactly one runtime caller (`EstimateSheetContent.tsx`) plus its own recursion — but three *parallel surfaces* and one *test file* share code or strings with it. These are the real change-safety risks; [07-BLAST-RADIUS-AND-RISK](07-BLAST-RADIUS-AND-RISK.md) owns the full analysis.

### 6.1 `SheetMutationHandlers` — the host-agnostic mutation seam

The branch never knows whether it is in an estimate or a template editor. It declares a `Pick`-based contract (`branch.tsx:62-76`):

```ts
// src/components/workshop/estimate-sheet/rows/branch.tsx:62-76
export type SheetMutationHandlers = Pick<
  EstimateSheetBranchProps,
  | "onInsertLibraryItem" | "onInsertTemplates" | "onInsertTemplateNode"
  | "onAddBlankRow" | "onReplaceRowItem" | "onDeleteRowItem"
  | "onUpdateRowItem" | "onMarkRowDirty" | "onOpenRowDetails"
  | "onClearRowComponent" | "onRequestProjectSpecific" | "onMoveRowComponent"
>;
```

The estimate page wires these to estimate actions (`EstimateSheetContent.tsx:2346-2357`). Any new row/component operation must extend this type, be threaded through the props destructure AND the recursive `<EstimateSheetBranch>` call (`branch.tsx:285-309` passes every handler to children), and be wired in the host. This is why CRUD gap-fills are wider-radius than presentational changes.

### 6.2 `TemplateEditorSheet` — a divergent parallel renderer

`library/template-editor/TemplateEditorSheet.tsx` is a *second* node renderer (`TemplateSheetBranch` at `:252`). It shares only the leaf helpers from `node-visuals.tsx` — it imports neither `branch.tsx` nor `expansion.ts`. Critically it is still on the **old two-kind model**: `isGroup = node.kind === "group"` (`:264`), a smaller indent step `Math.min(depth * 24, 144)` (`:266`), and an always-on caret (no `hasChildren` gate). Consequences for this plan: EMC caret/spacing/label changes do **not** propagate here and will visibly diverge; and if `node-visuals` leaf helpers are edited (e.g. font sizes), *both* surfaces change silently. Whether to unify the two renderers is an open decision surfaced in the README.

### 6.3 Charts "Own items" leaf — a string collision, NOT the EMC label

`aggregate-project-charts.ts:296-309` emits a chart row literally labeled `"Own items"` (id `area:${child.id}:own`) for any container that *also* directly owns rows, so a mixed node's own money is counted exactly once:

```ts
// src/lib/project-charts/aggregate-project-charts.ts:298-309
if (own) {
  rows.push({
    id: `area:${child.id}:own`,
    label: "Own items",
    total: own.total,
    ...
  });
}
```

This is money-attribution correctness on a *different surface* (the project charts), asserted by `project-charts-aggregation.test.ts`. The EMC eyebrow (`branch.tsx:245`, `data-estimate-own-items-label`) shares only the literal string. Requirement 1 removes the EMC eyebrow and must NOT touch this charts leaf. See [03-UXUI-AUDIT](03-UXUI-AUDIT.md) and [07-BLAST-RADIUS-AND-RISK](07-BLAST-RADIUS-AND-RISK.md).

### 6.4 Test coupling

`tests/vitest/estimate-mixed-content.test.tsx` pins the *current* (partly buggy) EMC behavior: the "Own items" label, the caret-only-on-children behavior, and the `STICKY_HEADER_H` thead offset. Every one of Requirements 1-3 breaks at least one assertion there, so the tests must be rewritten as part of each change, not after. Independent surfaces (`EstimateSheetTree`, the share-side panels, the node-icon test) import none of the EMC row modules and are out of the blast radius.

---

## Summary for the rest of the plan

- The EMC = the middle column, hosted by `EstimateSheetContent.tsx` (`EstimateWorkspaceClient.tsx:113`); the right library sidebar lives inside that host, the left tree is a separate module.
- Entity model = **three structural levels** (Tab → Node/Area → Row) with **Component as a row sub-state** (`types.ts:81-145`); a node holds children AND own rows under **P6 single-node**.
- P6 is real in the renderer and DB but **incomplete**: the `kind` column persists (`types.ts:141`), host insert handlers still gate on it (`EstimateSheetContent.tsx:1649`), and the caret still keys off `hasChildren` (`branch.tsx:182`). Closing that split is the plan's spine.
- One un-memoized recursion (`EstimateSheetBranch`) over the selected subtree, with depth-accumulated sticky stacking and a single memoized table boundary as the perf wall.
- Collapse state is client-only + scope-keyed (`EstimateSheetContent.tsx:992,1155`); `editableRows` is the live edit model; the expansion context distributes collapse to the branch.
- Change safety is dominated by three parallel surfaces (`TemplateEditorSheet`, the charts leaf, the `SheetMutationHandlers` seam) and the `estimate-mixed-content` test — not by import fan-out.

Continue to [02-CRUD-CAPABILITY-MATRIX](02-CRUD-CAPABILITY-MATRIX.md) for the exhaustive operation census, [04-FEATURE-READINESS-AND-BUG-AUDIT](04-FEATURE-READINESS-AND-BUG-AUDIT.md) for the caret/containment correctness, and [03-UXUI-AUDIT](03-UXUI-AUDIT.md) for the spacing rhythm and "Own items" analysis. Sequencing and the test rewrite plan live in [08-IMPLEMENTATION-PLAN](08-IMPLEMENTATION-PLAN.md).
