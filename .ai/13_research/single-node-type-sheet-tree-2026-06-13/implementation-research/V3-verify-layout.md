This is the decisive finding. `computeNodeTotal` already sums `rowTotal + childTotal` — it is fully kind-agnostic and correctly handles a node with both rows and children. Combined with the proposal-export walking the same tree, the financial total is correct. I now have everything needed for the verdict.

---

VERDICT: **WORKS-WITH-CONDITIONS**

The render substrate and the financial model are genuinely kind-agnostic and handle mixed-content nodes correctly today. But the proposal's own audit understates two real breakages and one confusion, and one of its "no server change needed" claims is only conditionally true. The mixed-content layout is implementable, but NOT for free, and it is only "simpler for users" if four constraints are met.

## What actually works (claim is correct here)

- **Financial rendering is correct.** `computeNodeTotal` (editable-row-model.ts:115-118) is `rowTotal + childTotal` recursively — already sums own rows AND children. A node with both shows the right header total today. No double-counting, no missing rows.
- **DOM structure already renders both blocks.** `branch.tsx:78` `hasContents` is already an OR; `EstimateRowItemsTable` renders unconditionally (`:242`); `row-table.tsx:129` paints nothing when empty. The proposal is right that the substrate is structurally ready.
- **`includeDescendants` server resolution is kind-free** (actions.ts:639-660): `collectDescendantNodeIds` walks `parent_id`, not `kind`. The descendant scope is structurally correct for any node shape.

## BREAKAGES the proposal misses or understates

### B1 — `includeDescendants: false` ("this node only") DROPS this node's own row edits. (CORRECTNESS — proposal misses this entirely)

This is the inverse of the bug the proposal flagged at `:427`, and it is worse because it is silent and server-side. When `includeDescendants` is false, the server filters **`estimate_node_id.eq(targetNodeId)`** ONLY (actions.ts:1248-1250) — it does NOT add a `target_row_id.in(...)` clause. That `target_row_id` union is built exclusively inside the `includeDescendants` branch (`:1243-1247` via `buildNodeScopeEventFilter`).

So whether a node's OWN row edits (`row_updated`, `row_added`, etc.) appear under a "this node only" scope depends entirely on whether the row-event RPCs stamp `estimate_node_id` on the event row. Row RPCs write `target_row_id` (actions.ts:2550, 2570, 2612, 2631) — I could NOT confirm from the app layer that they also set `estimate_node_id`. Under today's model this is invisible: areas are always scoped `includeDescendants: false` and groups always `true`, and an area's row edits clearly DO surface today, which means area row events DO carry `estimate_node_id`. **But the proposal's recommendation (default `includeDescendants` to `has children`) routes a mixed node's own-row scope through the `false` branch ONLY when it has no children — and through the `true` branch when it has children.** A mixed node (rows AND children) gets `includeDescendants: true`, so its own rows surface via the descendant row-union — fine. The danger is the explicit "this node only" entry the proposal offers as an additive second entry: that entry uses `includeDescendants: false`, and for a mixed node it will show node-level events (rename/create) but will **silently omit the node's own row edits** unless every row RPC stamps `estimate_node_id`. **Required: verify in the DB facet that row-event RPCs set `estimate_node_id`; if they do not, the "this node only" scope is a correctness regression and must union `target_row_id` for the node's direct rows even in the non-descendant branch.**

### B2 — `includeDescendants` from `has children` makes scope semantics TIME-VARYING and breaks the cache key. (CORRECTNESS + CACHE)

The proposal sources `includeDescendants` from `(node.children?.length ?? 0) > 0`. But `getActivityScopeKey` (activity-history.tsx:1290-1294) bakes `desc|direct` into the cache/query key: `node:{id}:{desc|direct}`. Today that flag is derived from `kind`, which is **immutable** for a node. Under the proposal it is derived from child count, which **changes when the user adds or removes the first/last child.** Consequences:

- The same node yields a different scope key before vs after gaining a child. Any cached node-activity (keyed by `getActivityScopeKey`) is silently invalidated/duplicated on child add/remove — the user sees the activity panel "reset" or show stale results when they add a child to a node they're inspecting.
- Worse, the semantic flips under the user: inspecting a leaf node shows "this node only"; they add one child; the SAME selection now silently means "this node + all descendants," changing which events appear with no user action. That is exactly the "confusing" failure the claim says is avoided. **Required: `includeDescendants` must be a stable user choice (an explicit toggle defaulting to a fixed value), NOT derived from live child count. The proposal's "zero new UI, derive from has-children" shortcut is unsound.**

### B3 — Sticky header stacking genuinely breaks for deep mixed nodes (proposal flags it but underweights it).

Branch headers are `sticky top-0 z-[20]` (`branch.tsx:157`); the row-table `thead` is `sticky top-0 z-10` (`row-table.tsx:151`). With rows-first ordering, a parent's own-rows `thead` (z-10) sits ABOVE its children in DOM. When you scroll into a child, the child's header (z-20) correctly overlays. But the PARENT's row-table `thead` (z-10) and the parent header (z-20) both pin to `top-0` simultaneously, and a child header (z-20) scrolling up will overlap the parent's pinned `thead` (z-10) — multiple sticky elements all targeting `top-0` with no offset cascade produces overlapping pinned bars. Today this never occurs because a node never has both a sticky `thead` AND sticky child headers. **Required: a sticky-offset cascade (each depth's header offset by accumulated heights) or demote the row `thead` to non-sticky inside non-leaf nodes. This is not a "verify it stacks" footnote — it is a guaranteed visual collision that needs a layout fix.**

## CONFUSIONS the claim dismisses too easily

### C1 — Rows-first / children-last creates a "stranded parent rows" ambiguity at depth.

A node with 2 own rows followed by 5 nested children renders: header, the parent's row table, then 5 child subtrees. When the user scrolls deep into child 5, the parent's own rows are far above, visually indistinguishable from "child 0's rows" unless the typology break (the proposal's larger gap / border) is strong. The proposal's mitigation (the `space-y-4` rhythm + table border) is the SAME visual weight that today separates sibling areas — so a reader cannot distinguish "parent's own rows" from "first child's rows" by spacing alone. The breadcrumb suppression logic (`branch.tsx:85` `showBreadcrumbs = !isGroup`) compounds this: under unification every node is breadcrumb-eligible or none is, and the proposal doesn't resolve which. **Required: own-rows blocks need a distinct affordance (e.g. an "Own items" micro-label or indentation matching the node, not the children) so a mixed node's own rows are never mistaken for a child's rows.**

### C2 — One glyph + caret-only-when-children means the icon stops predicting droppability.

Today folder=group=takes-templates, pin=area=takes-rows. The proposal unifies the glyph and makes everything take both. That IS simpler conceptually, but it removes the only at-rest signal of what a node accepts. The proposal leans entirely on drag-conditional drop zones — which means the user learns droppability ONLY by initiating a drag. For "add child node," the proposal pushes that action entirely into the left tree (not the sheet), so a user looking at the sheet has no in-context way to discover that a node can hold children. This is defensible but it is a real discoverability regression, not a pure simplification. **Required: keep at least one persistent in-sheet affordance hinting that a node accepts children (or accept that child-creation is tree-only and document it as an intentional constraint).**

## CONSTRAINTS THAT MUST HOLD (for WORKS)

1. **Scope flag must be a stable user choice, not `has-children`-derived** — otherwise B2 (time-varying semantics + cache invalidation) breaks the activity panel. This is the single hardest blocker; the proposal's "derive from has children, zero UI" path is unsound.
2. **The non-descendant ("this node only") scope must include the node's own direct row events** — verify/repair the `estimate_node_id` stamping or add a `target_row_id` union in the `false` branch (B1). Pair this with deleting the `:427` early-return the proposal already found.
3. **Sticky-offset cascade required** before shipping rows-first ordering (B3) — co-located sticky `thead` + sticky child headers collide.
4. **Strong own-rows-vs-child-rows visual distinction** (C1) — spacing alone is insufficient because it equals today's sibling rhythm.

## Net assessment of the claim

- "Works in the current spreadsheet UI without breaking rendering" — **mostly true** (totals/DOM are kind-agnostic) **but the sticky-stacking breakage is real** (B3), not a footnote.
- "...without breaking the activity-history scope model" — **FALSE as proposed.** The proposal's own `includeDescendants: has-children` recommendation breaks the cache key and makes scope semantics time-varying (B2), and the "this node only" path risks silently dropping own-row edits (B1). The wire format survives, but the *sourcing* the proposal recommends does not.
- "...without making the UI confusing" — **conditionally true.** Rows-first ordering and one-glyph each introduce a real new ambiguity (C1, C2) that the existing two-type model didn't have, because today rows and children never coexist.
- "...genuinely SIMPLER than the two-type model" — **true for the data/creation model** (kills wrap-template, unifies empty state, removes nesting rules), **but it trades structural simplicity for new runtime ambiguity** (a node's behavior now depends on its current contents rather than a fixed type). Simpler to reason about for the system; slightly more ambiguous to perceive for the user.

Default-to-BREAKS is overridden to WORKS-WITH-CONDITIONS because the financial and render substrate genuinely supports mixed content (verified: `computeNodeTotal`, `hasContents`, unconditional table render) — but shipping the proposal as written would introduce the activity-scope correctness/cache regressions in B1 and B2.

Key files: `/Users/philiplewis/Documents/archestimator/src/lib/estimates/actions.ts` (scoping: lines 605-660, 1222-1258 — the load-bearing `includeDescendants` branch), `/Users/philiplewis/Documents/archestimator/src/components/workshop/estimate-sheet/activity-history.tsx:1290-1294` (cache key), `/Users/philiplewis/Documents/archestimator/src/components/workshop/EstimateSheetContent.tsx:408-443` (scope tree builder), `/Users/philiplewis/Documents/archestimator/src/components/workshop/estimate-sheet/rows/editable-row-model.ts:115-118` (kind-agnostic total — the thing that makes mixed content financially safe), `branch.tsx:157` + `row-table.tsx:151` (sticky collision).