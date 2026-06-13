I now have comprehensive coverage of every anchor in the prompt plus the surrounding consumer logic. I have enough to produce the implementation-grade file-by-file blast radius.

## TS/TSX FILE-BY-FILE BLAST RADIUS — Collapse to One Node Type

### Grep baseline (raw)
- `grep -rl` kind-ish tokens: **91 files** matched, but most are noise (component-library "templates", taxonomy "group", UI `button-group`, `dropdown-menu`, share nav, fixtures, stories).
- Real **estimate-node-kind discriminant** lives in **3 parallel type aliases**, all `"group" | "area"`:
  - `EstimateNodeKind` — `src/lib/domain/estimate-tree.ts:1`
  - `EstimateTreeNodeKind` — `src/lib/estimates/tree-hierarchy.ts:1`
  - `EstimateTreeNode.kind` (UI) — `src/lib/estimates/types.ts:137`
  - plus `TemplateNodeKind` — `src/lib/component-library/template-editor-actions.ts:14` (template editor)
- DB enum still has dead values: `estimate_node_kind = enum('lot','structure','level','area','group','assembly')` (`20260518090000_...:9`); active values pinned to 2 by `estimate_nodes_active_kind_check check (kind in ('group','area'))` (`20260520222038_...:19`).

---

## THE NEW SHAPE

The discriminant does not need to be deleted — it can be **retained as an optional display hint** to keep icons/labels meaningful, OR collapsed to a single literal. Two viable end-states; both satisfy the committed decision. I recommend **Option A (keep `kind` as a free display label, drop all *semantic* branching)** because it is the smallest diff and preserves icon affordance, sample data, and DB rows untouched.

**Option A — `kind` becomes a non-semantic display tag**
```ts
// src/lib/domain/estimate-tree.ts
export type EstimateNodeKind = string;            // was "group" | "area"
// canNodeReceiveRows(kind) DELETED — every node receives rows

// src/lib/estimates/types.ts
export type EstimateTreeNode = {
  id: string;
  name: string;
  kind?: string;                                  // optional display hint only
  total: string;
  children?: EstimateTreeNode[];
  estimateRowItems?: EstimateRowItem[];
};
```
Every `node.kind === "area"` / `=== "group"` guard that *gates behavior* (can-receive-rows, can-receive-children, can-nest, wrap) is removed; the handful that only pick an **icon/label** survive but stop being load-bearing.

**Option B — single literal `kind: "node"`** is cleaner long-term but forces edits to all sample/seed/DB-derive sites (`estimate-tree-data.ts` ~30 literals, `estimate-templates.ts` ~12, seed SQL). Larger diff for no user-visible gain. Recommend deferring.

---

## TALLY (Option A)

| Bucket | Count |
|---|---|
| **DELETE** (whole helper/function/branch removed) | **14 functions/blocks** |
| **SIMPLIFY** (branch collapses, guard removed, both arms merge) | **~27 sites** |
| **CHANGE** (becomes data-driven / type widened / signature change) | **~11 sites** |
| Files touched (app, in-scope) | **~24** |
| Files DEAD/vestigial (kind-classification no longer consulted) | **3** |
| AI files (out of scope, DB-coupled only) | **5** |

---

## CORE DOMAIN / HIERARCHY

### `src/lib/estimates/tree-hierarchy.ts` — heaviest deletion
- **DELETE** `canNestEstimateNodeKind` (`:25`) — the entire "parent must be group / root must be group" rule.
- **DELETE** `getEstimateWrapGroupName` (`:41`) — auto-wrap name generator; no wrap exists.
- **DELETE** `getEstimateNodeNestingError` (`:46`).
- **DELETE** `isEstimateGroupNodeKind` (`:17`) — only used by gates being removed.
- **DELETE** `EstimateTreeGroupNodeKind` (`:2`), `getEstimateNodeDisplayKind` (`:21` — identity fn), `formatEstimateNodeKind` (`:30`).
- **SIMPLIFY** `selectFirstEstimateNodeIds` / `findFirstNodeInTreeOrder` (`:66`,`:82`): the `findFirstArea` recursion (`:102`) that prefers `kind==="area"` becomes "first node in DFS order" — drop the kind preference, keep DFS + `rootIds[0]` fallback. **Preserve** the unknown-kind-drops/children-promote behavior (still needed for legacy rows).
- **KEEP** `normalizeEstimateTreeNodeKind` (`:11`) + `LEGACY_ESTIMATE_GROUP_NODE_KINDS` (`:5`) — still maps legacy DB enum values; do not delete (invariant: existing rows). It just stops feeding nesting logic.
- Net: file shrinks from ~113 lines to ~40.

### `src/lib/domain/estimate-tree.ts`
- **DELETE** `canNodeReceiveRows` (`:51`, `return kind === "area"`) — every node receives rows.
- **CHANGE** `EstimateNodeKind` (`:1`) → `string` (or keep for display). `EstimateNode.kind` (`:8`) stays as label.
- **KEEP** `isDescendantNode` / `getNodeById` (`:55`,`:59`) — cycle prevention invariant, kind-agnostic already.

### `src/lib/estimates/types.ts`
- **CHANGE** `EstimateTreeNode.kind` (`:137`) → `kind?: string`. This is the UI tree type consumed by ~15 files.

---

## SERVER ACTIONS

### `src/lib/estimates/actions.ts` (29 hits)
- **DELETE** `wrapEstimateAreaAndInsertTemplate` (`:2389`–`:2470`) entirely, plus its types `WrapEstimateAreaAndInsertTemplateInput`/`Result` (`:2367`,`:2376`). The `.eq("kind","area")` area-guard (`:2409`), the `if (!areaNode.parent_id)` (`:2414`), the `create group + reorder area into it` choreography all go. Template drops now insert children directly into the target node.
- **SIMPLIFY** `createEstimateNode` (`:1933`): remove `canNestEstimateNodeKind` check (`:1971`–`:1973`) and the `parentKind` fetch (`:1944`,`:1967`). RPC payload `node_kind: kind` (`:1996`) can pass a constant/label. **Preserve** missing-parent check (`:1966`) and cross-tab/RLS scoping — these are invariants.
- **SIMPLIFY** `readEstimateNodeKind` (`:351`) and `CreateEstimateNodeKind` type (`:279`): no longer validates `group|area`; either accept any label or drop the form field. `CreateEstimateNodeResult.kind` (`:268`) becomes optional/string.
- **SIMPLIFY** `insertEstimateRowItemFromLibrary` (`:2472`): remove `.eq("kind","area")` guard (`:2483`) — rows attach to any node. **Preserve** the node-in-estimate/RLS check (`:2484`–`:2488`).
- **SIMPLIFY** the reorder-time nesting guard inside `updateEstimateTree` (`:1386`–`:1395`): drop `canNestEstimateNodeKind`/`getEstimateNodeNestingError`. **Preserve** missing-parent (`:1380`) + cross-tab (`:1382`) checks.
- **CHANGE** `createEstimateWithDefaultTree` (`:1024`–`:1113`): default tree still inserts `kind:'group'`×N and `kind:'area'` (`:1028`,`:1047`,`:1055`,`:1069`,`:1087`,`:1105`). Per "NOT A CONCERN: default tree" — leave literals as-is; they're now just labels. No required change, optionally simplify to one kind.
- Note: any `insertEstimateTemplateNodeIntoEstimate` `target_parent_node_id` flow keeps working (RPC-owned, kind-agnostic).

### `src/lib/estimates/estimate-tree-reorder.ts`
- **SIMPLIFY** `buildEstimateNodeReorderPlan` (`:273`–`:276`): delete the `canNestEstimateNodeKind` guard and its `import` (`:2`). **PRESERVE** the cycle check at `:278` (`getDescendantEstimateNodeIds`) — invariant. Drop the now-unused `targetParentKind`.

### `src/lib/estimates/estimate-tree-edit.ts`
- **NO kind branches** (grep empty). No change. (Prompt listed it; confirm zero edits.)

---

## SHEET UI (the wrap/guard hotspot)

### `src/components/workshop/EstimateSheetTree.tsx` (26 hits)
- **DELETE** the "select a group first" guard (`:623`–`:626`) — areas (any node) can now be added anywhere, incl. root.
- **SIMPLIFY** `selectedGroupId` memo (`:347`–`:350`): no longer needs `isEstimateGroupNodeKind`; target = selected node id (or null) directly. Used by `handleAddTreeNode` (`:622`).
- **SIMPLIFY** `handleAddTreeNode` (`:619`): collapse the `kind === "group" | "area"` name/status branching (`:628`,`:645`,`:694`). Single "Add Node" path. The `estimateRowItems: []` seeding (`:151`) now applies to all.
- **SIMPLIFY** context menu (`:1087`–`:1119`): the `nodeIsGroup ? [create-nodes] : []` gate (`:1089`–`:1119`) becomes unconditional — every node gets "New Node inside". Collapse the two items (`:1099` New Group, `:1108` New Area) into one.
- **SIMPLIFY** header toolbar (`:1318`–`:1324`): two Add buttons (`group`/`area`) → one "Add Node".
- **SIMPLIFY** template-drop dispatch (`:607`–`:615`): `isGroupTarget` branch picks `targetParentNodeId` vs `wrapAreaNodeId`. With wrap gone, **always** emit `{targetParentNodeId, ...}`. Delete `wrapAreaNodeId` path.
- **CHANGE→KEEP** `NodeIcon` (`:77`,`:84`) + `isFolder` (`:164`,`:198`): icon selection by kind survives as cosmetic. `into.push(node.id)` expansion (`:198`) currently gathers only groups — **SIMPLIFY** to all nodes (or keep; minor).
- **SIMPLIFY** delete-confirm copy (`:1282`–`:1284`): kind-based message can collapse.

### `src/components/workshop/EstimateSheetContent.tsx` (21 hits)
- **DELETE** `wrapAreaNodeWithGroup` (`:299`–`:313`) — optimistic wrap helper.
- **DELETE** `wrapAreaAndInsertTemplates` callback (`:1337`–`:1404`) and its event-handler branch (`:1510`–`:1536`, the `wrapAreaNodeId` listener `:1514`,`:1521`). Remove `onWrapAreaWithTemplate` prop threaded at `:1778`.
- **DELETE** import of `wrapEstimateAreaAndInsertTemplate`/`getEstimateWrapGroupName` (`:19`, and `:892` usage).
- **SIMPLIFY** insertion-target resolution (`:877`–`:893`): `insertTargetNodeId` (`:877`, `kind==="area"`) → `selectedNode?.id`. `templateTargetParentNode` ancestor-group walk (`:882`–`:885`) → just `selectedNode`. `canInsertIntoSelectedNode`/`canInsertTemplateIntoSelectedNode` (`:886`,`:889`) → `Boolean(selectedNode)`. Labels (`:890`–`:893`) collapse.
- **SIMPLIFY** `insertTemplate`/`insertTemplateNode` callbacks (`:1398`,`:1455`): drop the `selectedNode?.kind === "area"` → wrap branch; always insert into the selected node.
- **SIMPLIFY** drop-target guards (`:1252` `targetNode?.kind!=="area"`, `:1295`/`:1413` `targetParentNode?.kind!=="group"`): rows drop on any node; templates insert under any node.
- **CHANGE** the structure-hash builder (`:206`) and tree-clone (`:409`–`:427`, `isGroup`/`kind` mapping) become kind-agnostic; `:427` `if (node.kind !== "area") return;` (skips non-area for some op) → process all nodes.
- `selectedNodeKind={selectedNode?.kind ?? null}` (`:1865`) passed to component-library panel — see below.

### `src/components/workshop/estimate-sheet/rows/branch.tsx`
- **SIMPLIFY** the render flags (`:78`–`:89`): `canReceiveRows = node.kind==="area"` (`:79`) → **always true**; `EstimateRowItemsTable` already renders unconditionally (`:242`), so only the `ComponentDropTarget` gate (`:260`) and `EmptyGroupMessage` gate (`:269`) change. `isWrapTarget`/`canReceiveTemplates` (`:88`,`:89`) → every node can receive templates → simplify to always-droppable.
- **CHANGE** `hasContents` (`:78`) already kind-agnostic (children OR rows) — **keep**. `displayKind`/`isGroup` (`:80`,`:84`) reduce to cosmetic styling (header classes `:159`,`:180`,`:186`,`:188`, spacing `:147`,`:210`). `hasMixedChildKinds` (`:81`) styling-only — keep or drop.
- Net: branch becomes uniform; remove the area-vs-group structural divergence.

### `src/components/workshop/estimate-sheet/rows/node-visuals.tsx`
- **CHANGE→KEEP** `NodeIcon` (`:35`), `nodeHeaderClasses`/`nodeNameClasses`/`nodeTotalClasses`/`groupGap` (`:7`,`:19`,`:26`,`:31`): all cosmetic, keyed on `kind`. Survive as display styling. If Option B (single kind), these collapse to one style — **SIMPLIFY**. Under Option A, **no functional change**.

### `src/components/workshop/estimate-sheet/rows/drop-zones.tsx`
- 1 hit (`:75` `activeDrag?.kind === "library-item"` — that's *drag* kind, not node kind). The comment at `:127` references "wrap-in-group target" — **stale comment, update**. Otherwise **no functional change**.

---

## REPOSITORIES / DERIVE

### `src/lib/repositories/workspace-repository.ts` (`buildEstimateTree` ~1601)
- **CHANGE** `getDisplayNodeKind` (`:1497`) — keep (maps legacy enum → label). `buildEstimateTree` (`:1601`–`:1611`) **already attaches rows to ANY node id** (confirmed: `estimateRowItems: rowItemsByNode.get(node.id)` at `:1611`, unconditional). `computeTotals` (`:1624`) already sums rows+children on every node. **No functional change** — substrate is already kind-agnostic. Only widen the `kind` type if Option A flows through.

### `src/lib/repositories/estimate-repository.ts`
- **SIMPLIFY** `isActiveEstimateNodeKind` (`:53`) + `toEstimateNode` (`:57`): the `kind in ('group','area')` filter (`:54`,`:58`) that drops other kinds. Keep (legacy guard) but it stops driving behavior. `kind: row.kind` (`:65`) passes through. Minimal change.

### `src/lib/repositories/project-charts-repository.ts`
- **CHANGE** `:213` `kind: node.kind === "area" ? "Area" : "Group"` — produces the **capitalized** display classification consumed downstream. Under one-node-type this binary derivation is vestigial. Either keep emitting "Area" for all (so charts still bucket), or rework charts to bucket by depth/leaf. **Decision needed** (see Risks). Leaf-ness (`children.length === 0`) is the natural replacement signal.

### `src/lib/project-charts/aggregate-project-charts.ts` (8 hits)
- **CHANGE/DEAD** `:175`,`:232`,`:248`,`:256`,`:261`,`:279`,`:297`,`:309`: this aggregator branches on the **derived** `"Area"`/`"Group"` (capitalized) from the repository, *not* the raw discriminant. Its leaf-detection (`current.kind === "Area"` at `:175`,`:309`) is really "is this a cost-bearing leaf?". With any node holding rows, **this must switch to leaf-detection (`no children` / `has rows`)** or charts will under/over-count. **This is the highest-risk consumer.** Tie to the canonical formula invariant.

---

## EXPORT / SHARE / SOURCES

### `src/lib/proposal-export/build-proposal-export-model.ts`
- **DELETE** `collectNonAreaRows` (`:238`–`:255`) — the `non_area_rows_skipped` warning is obsolete (no node is "non-area"); rows on any node are now first-class.
- **CHANGE** `flattenEstimateTree` (`:257`–`:286`): the `if (node.kind === "area")` gate (`:265`) that decides which nodes contribute rows → **process `node.estimateRowItems` on every node** (recurse children regardless). Critical: otherwise group-held rows silently vanish from proposals. **Preserve** the canonical cost path downstream.

### `src/lib/share/reconstruct-share-tree.ts` (14 hits) — kind classification becomes DEAD
- **DEAD/DELETE** `correctKinds` (`:161`–`:170`): "any node with children must be group" — pure post-hoc relabel, no consumer behavior depends on it once kind is non-semantic. The `kind: "area"` provisional seeds (`:103`,`:134`,`:217`,`:248`,`:322`), `ShareTreeNode.kind` (`:21`), and the `node.kind === "area"` row-collection gate at `:297` (`directRows = node.kind==="area" ? ... : []`) — **SIMPLIFY** `:297` to always collect direct rows (group-held rows must render in share view). The discipline-fallback paths (`:199`,`:217`,`:248`,`:322`,`:392`) keep their labels as cosmetic. Prompt fact confirmed: this file **derives kind from structure** — so it already tolerates one-node-type; mainly the `:297` row gate needs the fix.
- Consumers: `src/components/share/ShareEstimateTreeView.tsx` (5 hits), `ShareEstimateTreePanel.tsx` (4), `ShareFloatingTreeNav.tsx` (3), `SharePageDecision.tsx` (1) — all read `kind` for **icon/label only**; **KEEP** (cosmetic).

### `src/lib/reusable-sources/source-collectors.ts`
- **SIMPLIFY** `:73`,`:119`: `if (node.kind === "group" || node.kind === "area")` — currently accepts both kinds (i.e., already accepts everything). Collapse to "for every node". `nodeKind: node.kind` (`:81`,`:127`) passes through as label. Net trivial.
- `src/lib/reusable-sources/types.ts` (`:1`) / `actions.ts` (3 hits): `nodeKind` field carried as string — **CHANGE** type to `string`, no logic change.

---

## TEMPLATE EDITOR (parallel `TemplateNodeKind`)

This subsystem mirrors the estimate tree and must collapse identically (templates are inserted into estimates, so an asymmetric model would re-introduce the very rules being removed).

### `src/lib/component-library/template-editor-actions.ts`
- **SIMPLIFY/DELETE** the nest guards: `addNode` `parentId===null && kind!=="group"` (`:88`) and `parent.kind!=="group"` (`:93`); `moveNode` equivalents (`:193`,`:199`); `:478` "Templates can only be inserted under a group." Remove all four "must be group" throws.
- **SIMPLIFY** `:274` (`node.kind!=="area"` → "Components can only be added to an area") and `:314` (rows only to area): rows/components attach to any template node.
- **CHANGE** `TemplateNodeKind` (`:14`) → `string` / optional. `:102`,`:527` pass-through.

### `src/lib/component-library/estimate-templates.ts`
- **CHANGE (data only)** seed/sample literals `kind:'group'|'area'` (`:60`,`:66`,`:116`,…). Leave as labels. `summary.groupCount/areaCount` (`:376`,`:377`) → either keep counting by label or replace with total/leaf counts. Minor.

### `src/components/workshop/library/template-editor/template-editor-model.ts`
- **SIMPLIFY** `findFirstTemplateArea` (`:99`–`:102`): `node.kind === "area"` → "first leaf" or "first node". Used to pick a row/component target; with any node receiving rows it can just be the selected node. Possibly **DELETE** if callers switch to selected-node.

### `src/components/workshop/library/template-editor/TemplateStructureTree.tsx`
- **SIMPLIFY** `canDropNode` (`:136`–`:142`): drop `parentId===null → dragged.kind==="group"` (`:140`) and `parentNode?.kind==="group"` (`:142`). **PRESERVE** any cycle/self-drop checks. 
- **SIMPLIFY** the add-node menu (`:176`,`:188`–`:202`): `node.kind==="group" ? [group,area adds] : []` → unconditional single "Add node". `onAddNode` signature (`:21`) drops the `kind` param (or makes it optional).
- **CHANGE→KEEP** `NodeKindIcon` (`:28`,`:41`) cosmetic.

### `src/components/workshop/library/template-editor/TemplateEditorSheet.tsx` (21 hits)
- **SIMPLIFY** `acceptsTemplateDrop` (`:280` `&& isGroup`), the area-only component/row affordances (`:421` `node.kind==="area"`, `:437`), the add-node split buttons (`:368`–`:388` group vs area), the root-add (`:581` group-only) and `:591` area-into-group. `componentRouteArea` (`:278` `node.kind==="area" ? node : findFirstTemplateArea(...)`) → just `node`. 
- **CHANGE→KEEP** styling/icons (`:264`,`:333`,`:344`,`:358`,`:361`,`:406`). `onAddNode` prop (`:32`) signature change.

### `src/components/workshop/library/template-editor/TemplateEditorClient.tsx` (10 hits)
- **SIMPLIFY** `addNode` (`:88`–`:92`, two prompts group/area → one), `componentTargetArea` (`:136`–`:137` area-or-first-area → selected node), `templateTargetGroup` (`:140` group-only → selected node), root add (`:218` group-only). `selectedNodeKind={componentTargetArea?.kind}` (`:244`) → drop or pass selected node.

### `src/components/workshop/library/template-editor/use-template-editor.ts`
- **CHANGE** `addNode(parentId, kind: TemplateNodeKind, name)` (`:91`) signature — `kind` optional/removed. 2 hits, mechanical.

---

## COMPONENT-LIBRARY GATE MESSAGES

### `src/components/workshop/component-library/index.tsx` (48 hits — mostly noise)
- **SIMPLIFY** the insert gate (`:770`–`:780`): `canInsert = effectiveSelectedKind === "area"` (`:773`) → `Boolean(selectedNode)` (any node accepts components now). `targetLabel` "Select an area" / "Add to selected area" (`:776`–`:780`) → "Add to {name}". `canInsertTemplate = ...==="group"` (`:774`) → any node. `effectiveTemplateTargetName` group-only (`:775`) → selected node name.
- The other ~44 hits are drag-`kind`, taxonomy folders, template literals (`:1835`,`:1972`,`:2091`) — **cosmetic/string copy** updates only ("selected group" wording).
- `helpers.ts` (2), `templates.ts` (5), `NewTemplateModal.tsx` (3), tree builders — pass-through labels, **no logic**.

---

## VESTIGIAL / DEAD (kind classification no longer consulted)

1. `src/lib/share/reconstruct-share-tree.ts` → `correctKinds` (`:161`).
2. `src/lib/estimates/tree-hierarchy.ts` → `canNestEstimateNodeKind`, `getEstimateWrapGroupName`, `getEstimateNodeNestingError`, `isEstimateGroupNodeKind`.
3. `src/lib/proposal-export/build-proposal-export-model.ts` → `collectNonAreaRows`.

---

## NO-CHANGE (kind present but not node-semantic — verified)
- `estimate-tree-edit.ts` (0 hits), `drop-zones.tsx` (drag-kind only; one stale comment), all `Share*` view components (icons only), `estimate-tree-data.ts` sample fixtures (labels), `activity-history.tsx`/`activity-*` (display), `supabase/types.ts` (generated — regenerate after DB enum change), `header-icon-toolbar.tsx`, `button-group.tsx`, `dropdown-menu.tsx`, stories/fixtures.

---

## AI PACKAGE-BUILDER — OUT OF SCOPE, DB COUPLING FLAGGED ONLY
Do **not** change app logic here, but these are tightly bound to the two-kind model and WILL break or mis-validate once the rules relax:
- `src/lib/ai/package-builder/apply.ts`: `node_kind:"group"|"area"` (`:199`,`:1012`); **"Root package tree nodes must be Group Nodes"** (`:274`); area-cannot-have-children check (`:281`); area-id set (`:288`); fill-current-estimate area-only (`:1000`). Writes via `ai_package_builder_apply_rpc` (`20260528003000_...:372`: `node_kind <> 'area'` guard).
- `src/lib/ai/package-builder/schemas.ts`: enum validators (`:472`), root-must-be-group (`:969`), template-insert-must-target-group (`:1067`), fill-area-only (`:1226`).
- `src/lib/ai/package-builder/read-tools.ts`, `draft.ts`, `src/lib/ai/read-context.ts`: read `kind==="area"` to pick row/area targets (many sites) — will silently ignore group-held rows once those exist.
- **DB coupling to flag:** these RPCs/validators encode the SAME removed invariants in SQL. When the estimate-side DB constraints relax, the AI apply RPC (`node_kind <> 'area'` at `20260528003000_...:372`) and these TS validators become inconsistent with the new model. Beta pre-release — note, defer.

---

## RISKS / INVARIANTS

1. **Charts under-counting (highest risk).** `aggregate-project-charts.ts` + `project-charts-repository.ts:213` treat `"Area"` as the cost-bearing leaf. With rows on any node, switch to **leaf-or-has-rows** detection or totals double-count (parent rows + same rows rolled up from "area"). Must stay consistent with the canonical formula `subTotal + miscCost + subTotal*contingency%/100` shared by export/charts/snapshots/totals.
2. **Proposal export silent drop.** `flattenEstimateTree:265` only emits area rows today. If not changed, any rows users add to former "group" nodes vanish from proposals — data-loss-class bug.
3. **Share view row gate.** `reconstruct-share-tree.ts:297` same hazard for the public share surface.
4. **DB enum vs constraint.** `estimate_node_kind` enum still lists `lot/structure/level/assembly`; `normalizeEstimateTreeNodeKind` + `isActiveEstimateNodeKind` must remain to absorb any legacy rows (don't delete the legacy maps even though nesting logic dies).
5. **RPC-owned mutations preserved.** All create/rename/reorder stay through `*_with_history` RPCs (decisions.md 2026-05-24) — none of the deletions touch the RPC boundary; only client-side pre-validation (`canNestEstimateNodeKind`) is removed. The SQL nesting checks in `reorder_estimate_nodes_rpc`/`estimate_tabs_foundation`/`atomic_estimate_node_moves` (`child.kind in (...)`) are a separate DB facet — flag for the DB plan, since leaving them will reject the now-legal moves the UI allows.
6. **Cycle prevention intact.** `isDescendantNode`, `getDescendantEstimateNodeIds` cycle check (`estimate-tree-reorder.ts:278`), self-drop (`:268`) — all untouched.

**Key file:lines for implementer:** tree-hierarchy.ts:25/41/46/17 · domain/estimate-tree.ts:51 · types.ts:137 · actions.ts:351/1971/2389/2483 · estimate-tree-reorder.ts:273 · EstimateSheetTree.tsx:623/1089/1318 · EstimateSheetContent.tsx:299/877/1337 · branch.tsx:79/88/260/269 · build-proposal-export-model.ts:238/265 · reconstruct-share-tree.ts:161/297 · aggregate-project-charts.ts:175 · project-charts-repository.ts:213 · template-editor-actions.ts:88/274/478.