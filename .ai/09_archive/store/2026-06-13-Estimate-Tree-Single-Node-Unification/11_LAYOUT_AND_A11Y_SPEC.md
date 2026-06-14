# 11 — Mixed-Content Layout & a11y Spec (P2.10 / P2.11)

Concrete component spec for the one genuinely new surface — a node that holds **both** own rows **and** children. Ground-truthed against `branch.tsx` / `row-table.tsx` / `node-visuals.tsx` / `drop-zones.tsx` (current line numbers below). Ships in **P4** (layout + vocab), on all-area trees, fully reversible.

> **Current render order is CHILDREN-FIRST.** `branch.tsx` body (`:209-282`) renders child branches (`:211-241`) *then* the own-rows table (`:242-259`) *then* the add-row strip (`:260-268`). The plan's "rows-first" (C1) is therefore a genuine DOM inversion, not a tweak.

---

## L1 · Rows-first DOM order (`branch.tsx`)

Reorder the body block (`:209-282`) so each node renders, top to bottom:

```
<section aria-label / role>            (:151)
  ── sticky header block ──            (:157)  caret · icon · code · name · …… total
  ── breadcrumbs (if shown) ──         (:191-206)
  ── OWN ROWS table ──                 (move :242-259 here, ABOVE children)
  ── + Add row / drop strip ──         (move :260-268 here)
  ── child branches (depth+1) ──       (:211-241 now LAST)
  ── unified empty state ──            (replaces :269 EmptyGroupMessage; see L5)
  ── template drop zone (drag only) ── (:270-280 stays last)
```

Rationale (plan C1): spreadsheet truth — "click a thing → see its numbers"; children-first buries a node's own rows under an arbitrarily deep subtree. The row table already renders unconditionally for any node with rows (`row-table.tsx:129` returns null when empty), so this is pure ordering. Change the body wrapper spacing (`:210` `isGroup ? "space-y-1" : "space-y-4"`) to a single depth-based rhythm (kind gone).

---

## L2 · Sticky-offset cascade (V3 B3 — required, not optional)

**Problem (verified):** two sticky layers both pin at `top-0`:
- branch header — `sticky top-0 z-[20]` (`branch.tsx:157`), height `h-10` (40px).
- row-table `<thead>` — `sticky top-0 z-10 bg-white` (`row-table.tsx:151`), `min-h-10`.

With rows-first + nesting, a child branch header (z-20) and an ancestor's row `thead` (z-10) coexist and **collide at top-0**.

**Primary fix — depth-accumulated offset via CSS var:**
1. `EstimateSheetBranch` accepts `stickyTop: number` (px), default 0. Header style: `style={{ top: stickyTop }}` instead of `top-0` (keep `sticky`).
2. The own-rows `thead` sticks **below its own header**: `top: stickyTop + 40` (header height). Pass `stickyTop + 40` to `EstimateRowItemsTable` as a `stickyTop` prop replacing `row-table.tsx:151`'s `top-0`.
3. Children recurse with `childStickyTop = stickyTop + 40 + (hasOwnRows ? THEAD_H : 0)` so a child header pins below the parent header **and** the parent's own-rows `thead`.
4. Keep z-index: header `z-[20]`, `thead` `z-10`, deeper headers may use `z-[19]`… (decreasing) so an outer header always wins overlap. Export a `STICKY_HEADER_H = 40`, `STICKY_THEAD_H = 40` const pair from `node-visuals.tsx`.

**Fallback (simpler, plan-sanctioned):** demote the row `thead` to **non-sticky inside non-leaf nodes** (`sticky` only when `children.length === 0`). Loses the column-header-follows-scroll nicety for mixed nodes but eliminates collision with one conditional. Choose primary unless it proves fiddly in the dev-server check.

**Test:** `estimate-mixed-content.test.tsx` asserts a 20+-row node followed by children — the child header's computed `top` ≥ parent header `top` + 40, and headers don't overlap on deep scroll (the e2e smoke screenshots this per plan P4 gate).

## L2b · Row-editing preservation

Rows-first must not change spreadsheet editing behavior. For a mixed node, all current row-table interactions must remain identical to a leaf-area row table:

- quantity, adjustment percentage, misc cost, and adjustment-mode dropdown editing;
- blur-to-save and Enter commit behavior;
- arrow-key navigation inside the cell grid;
- row selection and select-all;
- row details and activity actions;
- row delete;
- component replace;
- component move between rows.

The row table owns these interactions today, so the implementation should pass the owning node's context into labels/status messages without forking cell behavior. Any change to `row-table.tsx` or `cells.tsx` for mixed nodes must include a regression test that edits a row inside a node with children.

---

## L3 · One icon, conditional caret (C2)

- **Icon:** replace `NodeIcon` (`node-visuals.tsx:35-38`, FolderSimple-vs-MapPin via `getEstimateNodeDisplayKind`) with a **single neutral node glyph**. Recommended: a small filled dot / `Circle`-style mark — **not** `MapPin` (a pin implies "location/area," the concept being generalized) and **not** `FolderSimple` (implies container-only). Brand picks the exact Phosphor glyph (no orange, ≤13px, `weight="regular"`, `aria-hidden`).
- **Caret:** today the `CaretDown` is **always** rendered (`branch.tsx:162-178`), even on leaves. Change to render the caret **only when `children.length > 0`**; reserve its `size-6` slot with an empty spacer when absent so names stay aligned. Containment is signalled by the **caret's presence** (shape, color-blind-safe), per C2. `isLeaf` derives from `node.children?.length`, never kind (mirror in the sidebar `EstimateSheetTree.tsx:80-90`).
- Collapse `nodeHeaderClasses/nodeNameClasses/nodeTotalClasses` (`node-visuals.tsx:18-33`) lose their group/area branches → one depth-driven node chrome.

---

## L4 · Own-rows vs child-rows distinction (V3 C1 — required)

Spacing alone (`space-y-4`) equals the sibling rhythm, so a reader can't tell "this node's own rows" from "the first child's rows." Add a distinct affordance on the own-rows block:
- a quiet **"Own items"** micro-label (eyebrow, `text-[9px] text-tertiary`, matching the existing eyebrow style) directly above the own-rows table, shown **only when the node also has children** (a leaf needs no disambiguation); **and/or**
- a node-matched left rule on the own-rows table aligned to the header's indent (`leftIndent`), visually tying the rows to their owning node.

Recommended: the "Own items" eyebrow (cheapest, screen-reader-friendly — doubles as the a11y label in L7). Show it iff `hasOwnRows && children.length > 0`.

---

## L5 · Unified empty state (C4)

- Delete `EmptyGroupMessage` (`drop-zones.tsx:182-186`, "No nodes in this group yet…") and the kind-split empty branches. One empty-node component renders a single quiet line.
- **Promise-gap mitigation (plan P4):** until P6 enables creating mixed content, do **not** show an affordance that doesn't work yet.
  - **P4 copy** (pre-migration, all-area; a node is still effectively single-purpose): show the one action that is actually creatable for that node under the current model — an empty leaf shows "Add a row" (`QuietAddRowButton`), an empty container shows "Add a sub-area." Visually unified (one component, one dashed style), copy still truthful.
  - **P6 copy** (writes enabled): flip to the unified "Add a row or a sub-area." (One string change, gated to P6.)
- Reuse the dashed design-system look already shared across `drop-zones.tsx` (`border-dashed border-hairline bg-surfaceMuted/20`, `text-[9px] text-tertiary`). Update the whole-estimate empty copy at `EstimateSheetTree.tsx:1365-1366` ("Add a Group Node or Area Node…") → "Add an area to begin."

---

## L6 · Affordance placement (C3 — one permanent affordance per node)

- **Add-row** = quiet inline button under the own-rows table (`QuietAddRowButton`), every node.
- **Drag-a-component** = same strip, dashed, **only while dragging** (zero at-rest clutter) — `ComponentDropTarget` ungated from `canReceiveRows` (`branch.tsx:79` → always true).
- **Add-child** = the left tree + the universal template drop zone + the per-node context-menu **"Add area inside"** (unconditional on every node).
- Net: exactly one affordance is permanently visible per node (the add-row button); the rest appear on drag.

**Discoverability (V3 C2) — accepted, mitigated.** One unified glyph removes the at-rest "what does this node accept" signal that folder-vs-pin gave. This is an intentional trade (every node accepts both, so there is nothing to signal). Two in-sheet discovery paths remain so child-creation is **not** tree-only-and-hidden: the disclosure **caret** (present iff the node has children) and the right-click **"Add area inside"** on every node. Document this as the deliberate model — droppability is uniform, so it no longer needs a per-node icon.

## L6b · Visual-state matrix

Implement and test these states across node headers, caret buttons, `QuietAddRowButton`, empty/drop zones, row-table cells, row action buttons, and sidebar tree rows:

| State | Requirement |
|---|---|
| default | compact neutral UI, 3px radius, <=12px app type |
| hover | neutral surface/hairline change only, no decorative color |
| focus-visible | clear focus ring using the design-system focus token |
| active/pressed | visible pressed state without layout shift |
| selected/current | matches sidebar/tree selection conventions and does not use blue/orange custom tints |
| collapsed | caret absent on leaves, caret state accurate on parents |
| disabled/pending | non-interactive controls cannot receive invalid drops or duplicate submits |
| saving/saved/error | status visible and announced; errors use semantic danger only |
| drag-over-valid | target label and dropEffect match the operation |
| drag-over-invalid | explicit invalid state; no silent no-op |
| loading/skeleton | stable dimensions while async tree mutation is pending |

The existing product design baseline in `DESIGN.md` governs this matrix: neutral selected/focus treatment, semantic colors only, 3px radius, <=12px app type, compact spreadsheet cells, and shared primitives.

## L6c · Drag/drop interaction contract

Cover each drag type separately:

| Drag type | Required contract |
|---|---|
| tree-node reorder | accepted MIME, move semantics, valid/invalid visual state, focus restored to moved node, status message |
| external template insert | copy semantics, target label names destination node, cancellation cleans drag state |
| library item insert into a node | copy semantics, add-row/drop strip accepts every node after P6 |
| library item replace in a row | replace semantics stay row-scoped; target row remains focused |
| component move between rows | move semantics, source row cleanup, destination status |

Also add a keyboard-accessible alternative for pointer-only drag/drop, such as context-menu move actions or an explicit "Move into..." command. `aria-grabbed` metadata alone is not a keyboard interaction.

---

## L7 · a11y spec for the mixed node (P2.11)

**Today (verified):** the sheet branch is a plain `<section aria-label={name}>` (`branch.tsx:151`) with **no tree role, no `aria-current`, no `aria-selected`**; the collapse button carries `aria-expanded` + `aria-label` (`:165-166`). Full `role="treeitem"`/`aria-current`/`aria-selected` live only in the **sidebar** `Tree` (`ui/tree.tsx`). WCAG 2.1 AA target (PRODUCT.md).

**Decision: keep the sheet a document-structured region (NOT an ARIA tree).** Adding full tree semantics to the recursive sheet is a large, risky refactor for little gain (the sidebar already provides the navigable tree). Instead, enrich what exists:

1. **Mixed-node announcement.** The node header's accessible name announces the dual content:
   `aria-label = "{name}, area{, N rows}{, M sub-areas}"`
   e.g. `"Building A, area, 1 row, 2 sub-areas"`. Compute `N = estimateRowItems?.length`, `M = children?.length`; omit a clause when zero. Put this on the header region (`:158` container as `role="group"` with `aria-label`, or on a visually-hidden heading) — not on the total cell.
2. **Caret / disclosure.** `aria-expanded` is set **only when the node has children** (a leaf must not advertise expandability). `aria-label = "{Collapse|Expand} {name}"` (drop the kind word `displayKind` at `:165`).
3. **Focus order (rows-first).** Tab order follows the new DOM: header/caret → own-rows table (its existing per-cell controls) → "Add row" button → child sub-areas (recursive). This matches visual order; no `tabindex` juggling needed beyond natural DOM order.
4. **"Own items" label** (L4) is a real text node (`<span>`), so screen readers announce the boundary between a node's own rows and its child sub-areas without relying on spacing.
5. **Single Add aria-label.** The one "Add Area" control: toolbar button `aria-label="Add area"`; per-node context action `aria-label="Add area inside {name}"`. Removes the state-dependent disabled/"select a group first" live-region message entirely (a11y net simplification, plan dim 8).
6. **Color-blind safety.** Containment = caret presence (shape), not color (C2). Reduced-motion unaffected (the wrap animation is deleted).
7. **Preserve** the sidebar's `aria-current="page"` on the active node (`ui/tree.tsx:1045`) and `aria-selected` — unchanged.

**Test (`estimate-mixed-content.test.tsx`):** assert the header `aria-label` contains both "rows" and "sub-areas" counts for a mixed node; `aria-expanded` absent on a leaf; the single Add control's `aria-label`; no rendered "Group"/"Node" copy; no stale "select a group first" message.

### Keyboard contract

- Sidebar tree remains the ARIA tree with roving focus: Arrow/Home/End/Enter/Space behavior stays owned by `ui/tree.tsx`.
- Sheet body remains document/table structured. It must not become a second ARIA tree.
- Leaf nodes do not render a focusable disclosure button. The reserved caret spacer is non-focusable and `aria-hidden`.
- Row cell arrow navigation stays inside the table and must not hijack sidebar tree navigation.
- Escape closes inline edits/dropdowns/context menus where applicable without collapsing unrelated tree branches.
- Tab order follows visual order: node header, own rows, add-row/drop strip, child areas.

### Screen-reader and live-region additions

- Each own-row table gets a unique label tied to the visible "Own items" label and node name.
- Generic select-all labels become contextual, e.g. "Select all rows in Building A."
- Add polite status announcements for add row, add area, move/reorder, template insert, row moved/replaced, save success, and non-destructive no-op.
- Use `role="alert"` only for failed mutations.
- Do not announce every focus movement or numeric keystroke.

## L8 · Density and responsive constraints

- Define a stable minimum table width; the mixed node must not squeeze row columns until labels or amounts clip.
- Horizontal overflow belongs to the estimate work surface, not nested row-table traps.
- Sticky headers must remain coherent at constrained laptop widths.
- Cap effective indentation so deep mixed nodes do not consume the row grid.
- Preserve current row/header heights unless a test proves a change is required.
- On tablet/mobile widths, dense editing should degrade to review/simplified flow or horizontal work-surface scroll, not a compressed table.
- Browser proof must include desktop and a 375px-width smoke for a deep mixed node.

## L9 · Form alignment

Any new inline rename/create/add controls, row-edit controls, activity-scope toggles, or template-editor parity forms must use shared control primitives and reserve helper/error space where fields share a row. Paired controls must align label baselines, input tops/heights, helper/error rows, dropdown affordance padding, and clear/action buttons. Fix row-level structure as a unit; do not patch individual controls with local nudges.
