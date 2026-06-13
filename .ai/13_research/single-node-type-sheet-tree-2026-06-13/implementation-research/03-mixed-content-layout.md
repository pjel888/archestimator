I now have a complete picture of the rendering substrate, the tree, the drop zones, the activity scope model, and the design constraints. I have everything needed to deliver the layout design.

---

# FACET: MIXED-CONTENT NODE LAYOUT — Implementation-Grade Design

## Current state (what the substrate already does)

The render layer is already kind-agnostic; the only thing forcing a group/area split is a handful of `node.kind` branches in `branch.tsx`. Confirmed at source:

- `branch.tsx:78` — `hasContents = childAreas.length > 0 || estimateRowItems.length > 0` (already OR).
- `branch.tsx:242-259` — `EstimateRowItemsTable` renders unconditionally in **every** branch, fed by `node.estimateRowItems`. `row-table.tsx:129` short-circuits (`if (!items.length) return null`) so an empty node paints no table.
- `branch.tsx:211-241` — children render unconditionally, **above** the row table in DOM order.
- `branch.tsx:79-80` — `canReceiveRows = node.kind === "area"`, `isGroup = node.kind === "group"` are the gates that currently hide the add-row affordance on groups and show the "empty group" message instead.
- `branch.tsx:84,148,157-159,186,188,210` — kind only drives styling (`nodeHeaderClasses`, name/total weight, `space-y-1` vs `space-y-4`, breadcrumb suppression, white background).
- `node-visuals.tsx:35-38` — `NodeIcon` returns `FolderSimple` for group, `MapPin` for area.

So the mixed-content node already *works* structurally. The design question is purely **layout and affordance ordering**, not data plumbing.

---

## (1) Where OWN rows show vs CHILDREN — recommended layout

**Recommendation: own rows table FIRST (directly under the node header), child nodes BELOW it.** This inverts today's DOM order at `branch.tsx:211-259` (children-then-rows → rows-then-children).

Concrete order inside the `!collapsed` block:

```
┌─ Node header (caret · icon · code · name · ………… total) ──────────┐  sticky, branch.tsx:157-189
├─ OWN ROWS  (EstimateRowItemsTable)                                │  ← move here, was line 242
│     #  ☐  Materials      Qty  Subtotal  Adj  Misc  Total  ⋮       │
│     01    Concrete slab   12   …                                  │
│     02    Rebar           …                                       │
├─ Add row / drop strip (ComponentDropTarget)                       │  ← right after own rows
├─ Child node A  (recursive EstimateSheetBranch, depth+1)           │  ← children last
│     └─ its own rows, its own children …                           │
└─ Child node B …                                                   │
```

**Rationale (grounded in the cited docs):**

- **Spreadsheet truth (PRODUCT.md:42,44).** A spreadsheet user reads "this thing's own line items" as the primary payload of the row they clicked. Putting the node's own rows immediately under its header keeps the "click a thing → see its numbers" contract that every cell-grid tool honors. Children are a *navigation outcome*, not the node's own cost content.
- **Typology ordering (research doc §"Practical UI rule", core principle 2).** A node's own rows are *financial line items* (one typology); child nodes are *navigational containers* (another typology). They must not interleave. Rows-first / children-last keeps each typology in one uninterrupted block instead of forcing the eye to re-parse "is this a row or a sub-node?" repeatedly.
- **Why not children-first (today's order):** today it's tolerable because a group has *no* own rows and an area has *no* children, so the two blocks never coexist. The instant both can be present, children-first buries the node's own numbers below an arbitrarily deep subtree — the user scrolls past three nested children to find the two rows they added to the parent. That violates core principle 6 (don't bury the operational payload).
- **Why not "children in tree only, sheet shows only own rows":** rejected. It breaks the existing single-scroll sheet model where `EstimateSheetContent` renders the *whole selected subtree* in one scrollable surface (`displayedSheetNode` → recursive `EstimateSheetBranch`). Hiding descendants from the sheet would force tree-clicks to see any child's rows, regressing the current UX and the proposal-export parity that walks the same tree. Keep the full subtree in the sheet; just order each node rows-then-children.

**Edit locus:** swap the two JSX blocks at `branch.tsx:211-241` (children map) and `branch.tsx:242-259` (row table) so the table renders first. Move `ComponentDropTarget` (`:260-268`) to sit between the table and the children. Change the gating: `canReceiveRows` must become **always true** (every node can hold rows) — replace `node.kind === "area"` at `:79`.

**One sub-decision — visual separation of the two blocks.** Give the own-rows table and the children list distinct vertical rhythm so proximity signals the typology break (research §5). Concretely: keep the table's own `border` wrapper (`row-table.tsx:149`), then a slightly larger gap before the first child than between rows. The current `space-y-4` (`branch.tsx:210`) already does this for areas; apply it to all nodes and drop the `space-y-1` group branch.

---

## (2) Tree icon: container-vs-leaf, or identical?

**Recommendation: ONE node visual. Drop the folder/pin distinction. The expand affordance (caret) appears only when the node has children.**

This is the heart of the "simplest model" decision and it's the cleanest part to land:

- **In the sheet header (`branch.tsx:162-181`):** the caret button currently always renders. Make it conditional on `childAreas.length > 0`. A node with no children gets no caret (or a disabled spacer to preserve column alignment) — collapsing a node with only rows is meaningless. The `NodeIcon` at `:179-181` should become a **single uniform node glyph**, not folder-vs-pin.
- **In the left tree (`EstimateSheetTree.tsx:160-177`, `buildUiTreeModel`):** today `isLeaf: !isFolder` and `isFolder = isEstimateGroupNodeKind(node.kind)`. Under the unified model, *every node can have children*, so `isLeaf` must be derived from structure: `isLeaf: !(node.children?.length)`. The `NodeIcon` at `:76-81` collapses to one glyph.
- **Why one glyph, not zero:** a node still needs *an* icon for the tree-row rhythm (`TREE_ROW_ICON_SIZE` alignment) and scannability, but it should be **the same glyph for all nodes** because there is no longer a type to signal. The container-ness is communicated by the **caret/disclosure triangle**, which is the conventional and color-blind-safe signal for "has children" (PRODUCT.md:50 — information never by color alone; a disclosure triangle is shape, not color). Recommended glyph: a neutral node/square dot or the existing `MapPin` repurposed as "estimate node" — pick one and apply everywhere. I'd lean to a plain small square/`Stack`-style mark over `MapPin` (a pin implies "location/area," the very concept we're deleting), but that's a brand call for Philip.

**Net effect on the cited "container-vs-leaf icon" question:** there is no longer a container-vs-leaf *type*. Containment is a runtime property (has children right now), surfaced by the caret. Icon = identity, caret = structure. This directly removes `getEstimateNodeDisplayKind` branching in both `node-visuals.tsx:35-38` and `EstimateSheetTree.tsx:76-81`.

---

## (3) How add-row, drag-a-component, and add-child coexist on one node without clutter

These are three different actions on the same node. Keep them in **three distinct, non-competing locations** so no single node region gets noisy:

| Action | Where it lives | Source today | Change |
|---|---|---|---|
| **Add row** (blank) | Quiet inline button *directly under the own-rows table* | `QuietAddRowButton` via `ComponentDropTarget` `drop-zones.tsx:36-52,82-94` | Now shown on **every** node (drop the `canReceiveRows` gate). At rest it's a single 24px-high quiet "+ Add row" line — minimal footprint. |
| **Drag a component** (from library) | The same strip becomes a dashed drop zone **only while a library drag is in flight** | `ComponentDropTarget` `drop-zones.tsx:96-120` | Unchanged behavior; just universal. Drag suppresses hover, so at rest it's invisible — zero permanent clutter (matches the existing comment at `drop-zones.tsx:17-19`). |
| **Add child node** | The **left tree** context menu / header (`+ Group inside` etc.) — NOT the sheet | `EstimateSheetTree.tsx:619-733`, context menu `:1087-1162` | Keep node-creation in the tree where it already lives. The sheet shows a **template** drop zone for child insertion (`TemplateDropZone`, `branch.tsx:270-280`), which also becomes universal. |

**Key clutter-avoidance principle (research §7, "delete before decorating"):** only **one** affordance is ever permanently visible at rest per node — the single "+ Add row" line. The component drop zone and template drop zone are **drag-conditional** (`componentDragActive` / `templateDragActive`), so they materialize only when the user is actually dragging. This is already the established pattern; extending it to all nodes keeps the at-rest sheet exactly as quiet as today's area sheet.

**Simplification fallout:** the entire **wrap-area-with-template** apparatus exists *only* because "areas can't take children" (`branch.tsx:34-35,86-89,122-126`; `EstimateSheetContent.tsx:299-315` `wrapAreaNodeWithGroup`; `tree-hierarchy.ts:41-44` `getEstimateWrapGroupName`; `EstimateSheetTree.tsx:587-617`). Under the unified model **every node accepts a template directly as a child** — so `onWrapAreaWithTemplate`, `isWrapTarget`, `canReceiveTemplates = isGroup || isWrapTarget` all collapse to `canReceiveTemplates = true`. This removes a whole creation path (one of the rules being intentionally removed). Note for the DB facet: the wrap RPC and its history event are now dead — flag, don't delete here.

---

## (4) The empty node case (no rows, no children) — removes today's ambiguity

**Today there are TWO different empty states depending on kind**, which is exactly the ambiguity being deleted:

- Empty **area** → `ComponentDropTarget` empty branch (`drop-zones.tsx:84-93`): *"No estimate components yet. Add a row, or drag components from the library."* + an add-row button.
- Empty **group** → `EmptyGroupMessage` (`drop-zones.tsx:179-188`, gated at `branch.tsx:269`): *"No nodes in this group yet. Add a group or area from the tree, or drag an estimate template here."*

These contradict each other: the same visual slot tells you either "add a row" or "add a node" depending on a hidden type the user never chose.

**Recommendation: ONE empty state for every node, offering BOTH paths in one quiet line.**

```
┌──────────────────────────────────────────────────────────────────┐
│  Empty node. Add a row or drag a component to estimate here,      │   ← one strip, dashed,
│  or add a child node from the tree.                  [ + Add row ] │     surfaceMuted/20
└──────────────────────────────────────────────────────────────────┘
```

- Render this whenever `!hasContents` (`branch.tsx:264` already computes `empty={!hasContents}`), for all nodes.
- **Delete `EmptyGroupMessage` entirely** and the `isGroup && !hasContents` branch at `branch.tsx:269`. Replace the copy in `ComponentDropTarget`'s empty branch (`drop-zones.tsx:85-93`) with the unified line above, and make it universal.
- **Why this removes the ambiguity:** the user no longer has to know "am I in a row-holder or a node-holder?" Every empty node says the same thing and offers the same two escape hatches (add a row here / add a child via tree). The node is no longer in a forced-choice mode. This is the single biggest UX simplification in the whole change and it falls out almost for free because `hasContents` and `empty` are already kind-agnostic.

---

## (5) Impact on the activity-history scope model

This is where the kind assumption is **most deeply baked in** and needs deliberate handling.

**Current scope model** (`activity-history.tsx:21-24`):
```ts
EstimateActivityScope =
  | { mode: "row"; rowId }
  | { mode: "sheet" }
  | { mode: "node"; nodeId; includeDescendants: boolean }
```
The `includeDescendants` flag is **derived from kind** at `EstimateSheetContent.tsx:413`:
```ts
scope: { mode: "node", nodeId: node.id, includeDescendants: isGroup }
```
i.e. groups scope "node + all descendants," areas scope "node + its own rows only." Several kind-coupled spots flow from this:

- `EstimateSheetContent.tsx:409,416-418` — `kind: isGroup ? "group" : "area"`, eyebrow `"Group Node" / "Area Node"`, description "Includes descendant…" vs `pathLabel`.
- `EstimateSheetContent.tsx:427` — **`if (node.kind !== "area") return;`** — row scope items are emitted **only under area nodes**. Under the unified model a group can now have its own rows, and this early-return would **hide them from the activity scope tree**.
- `activity-history.tsx:417` (the `buildActivityScopeTreeItems` is in EstimateSheetContent; the *display* eyebrow/empty copy lives here) and `:1320,:1293` — `includeDescendants ? "desc" : "direct"` and copy "…in this Area Node".

**Recommendation — keep the wire format, redefine the semantic, fix the row-emission bug:**

1. **Keep `EstimateActivityScope` shape unchanged** (`mode: "node"` + `includeDescendants`). The server scope key (`node:{id}:{desc|direct}`) is consumed by the RPC at `EstimateSheetContent.tsx:1006,1105,1113` and the version-control fetch — keeping the shape means **no server/RPC change** for scoping, preserving the RPC-owned history invariant. The flag survives; only its *source* changes.

2. **`includeDescendants` is now a user choice, not a kind derivation.** Since every node can have *both* own rows and descendants, both questions are meaningful for every node:
   - "this node only" (its own rows + its own node events) → `includeDescendants: false`
   - "this node and everything under it" → `includeDescendants: true`
   
   Replace `includeDescendants: isGroup` at `:413` with: **`includeDescendants: (node.children?.length ?? 0) > 0`** as the *default* for a node that has children, and **always emit a "this node only" entry too** when the node has both rows and children. Simplest first cut that preserves behavior: default `includeDescendants` to "has children" (mirrors old group behavior for container-ish nodes, old area behavior for leaf-ish nodes) — zero new UI, correct semantics. If Philip wants the explicit toggle, that's an additive second entry, not a breaking change.

3. **Remove the `node.kind !== "area"` early return at `EstimateSheetContent.tsx:427`.** Emit `row:` scope items for **any node that has `estimateRowItems`**, regardless of kind. Without this fix, rows added to a former-group node are invisible in the activity scope tree. This is the one **correctness bug** the unification introduces in this file — call it out explicitly.

4. **Decouple the `kind` label from the scope tree** (`:409,416-418`; display copy `activity-history.tsx:1320`). Drop `"Group Node" / "Area Node"` eyebrows → a single **"Node"** eyebrow (or `nodeCode + "Node"`). Drop the "in this Area Node" copy at `:1320` → "in this node." The `kind: isGroup ? "group" : "area"` field on `ActivityScopeTreeItem` (type at `activity-history.tsx:86`) should collapse to a single `"node"` member, with `"sheet"` and `"row"` retained. This is the same one-glyph principle as (2), applied to the activity panel's own tree (which reuses `WorkshopTreeRow` and would otherwise show folder/pin icons).

**Net:** the activity model needs **no server/RPC/DDL change** and **no wire-format change** — only (a) one early-return deletion to stop hiding now-legal rows, (b) `includeDescendants` sourced from `has children` instead of `is group`, and (c) cosmetic de-kinding of labels/icons. The history-event taxonomy (`activity-history.tsx:47-67`) is untouched — `node_created`, `node_renamed`, `node_deleted_with_children` etc. are already kind-neutral.

---

## Summary of edits this facet requires (file:line anchors)

| Concern | File:line | Change |
|---|---|---|
| Rows-first ordering | `branch.tsx:211-259` | Render `EstimateRowItemsTable` before children; move `ComponentDropTarget` between them |
| Universal add-row / drop | `branch.tsx:79` | `canReceiveRows` → always true (delete the `=== "area"` gate) |
| Universal templates / kill wrap | `branch.tsx:88-89,122-126,270-280` | `canReceiveTemplates = true`; remove `isWrapTarget`/`onWrapAreaWithTemplate` |
| Conditional caret | `branch.tsx:162-178` | Render caret only when `childAreas.length > 0` |
| One node glyph (sheet) | `node-visuals.tsx:35-38` | Single glyph; drop folder/pin branch |
| One node glyph + structural leaf (tree) | `EstimateSheetTree.tsx:76-81,164-173` | One glyph; `isLeaf` from `node.children?.length` not kind |
| Unified empty state | `branch.tsx:264,269`; `drop-zones.tsx:84-93,179-188` | One empty line for all nodes; delete `EmptyGroupMessage` |
| Activity: stop hiding rows | `EstimateSheetContent.tsx:427` | Delete `if (node.kind !== "area") return;` |
| Activity: includeDescendants source | `EstimateSheetContent.tsx:413` | `isGroup` → `has children` |
| Activity: de-kind labels | `EstimateSheetContent.tsx:409,416-418`; `activity-history.tsx:86,1320` | Single "Node" eyebrow/kind |

**Risks / call-outs:**

1. **Activity row-emission bug (`EstimateSheetContent.tsx:427`)** is the only *correctness* regression the unification silently introduces — rows on former-group nodes vanish from the activity tree unless this line is removed. Highest-priority fix in this facet.
2. **DOM-order swap touches sticky positioning.** The own-rows table's `thead` is `sticky top-0 z-10` (`row-table.tsx:151`) and the branch header is `sticky top-0 z-[20]` (`branch.tsx:157`). With rows now directly under the header, verify the two sticky layers stack correctly when a node with many own rows is scrolled (the header must stay above its own table; z-20 > z-10 already handles this, but the deeper child branch headers also sticky at z-20 will now sit *below* the parent's row table in scroll — test a node with 20+ own rows followed by children).
3. **`usesSiblingGroupRhythm` / `groupGap` (`node-visuals.tsx:6-11`)** is kind-driven spacing. With mixed kinds gone, `hasMixedChildKinds` (`branch.tsx:81`) is always false-ish; the spacing system should be re-derived from depth alone, not kind, or sibling rhythm will look inconsistent now that any node can sit next to any node.
4. **Wrap-template DB coupling (out of app scope but flag):** `wrapEstimateAreaAndInsertTemplate` action + its RPC + the `template_inserted`/wrap history event become unreachable from the UI once `isWrapTarget` is removed. The RPC and event remain in the DB; note for the DB-facet planner — do not orphan the grant without auditing callers.

Relevant files (absolute paths):
- `/Users/philiplewis/Documents/archestimator/src/components/workshop/estimate-sheet/rows/branch.tsx`
- `/Users/philiplewis/Documents/archestimator/src/components/workshop/estimate-sheet/rows/drop-zones.tsx`
- `/Users/philiplewis/Documents/archestimator/src/components/workshop/estimate-sheet/rows/node-visuals.tsx`
- `/Users/philiplewis/Documents/archestimator/src/components/workshop/estimate-sheet/rows/row-table.tsx`
- `/Users/philiplewis/Documents/archestimator/src/components/workshop/EstimateSheetTree.tsx`
- `/Users/philiplewis/Documents/archestimator/src/components/workshop/EstimateSheetContent.tsx`
- `/Users/philiplewis/Documents/archestimator/src/components/workshop/estimate-sheet/activity-history.tsx`
- `/Users/philiplewis/Documents/archestimator/src/lib/estimates/tree-hierarchy.ts`