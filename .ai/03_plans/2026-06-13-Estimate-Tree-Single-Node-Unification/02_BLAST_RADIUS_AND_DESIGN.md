# 02 — Blast Radius & Design

This is the **what changes**. The **when/how-to-sequence** is in [03](03_IMPLEMENTATION_ROUTE.md). All anchors are verified ([blast-radius research](../../13_research/single-node-type-sheet-tree-2026-06-13/implementation-research/04-blast-radius-file-by-file.md), [migration](../../13_research/single-node-type-sheet-tree-2026-06-13/implementation-research/01-migration-and-data-safety.md), [layout](../../13_research/single-node-type-sheet-tree-2026-06-13/implementation-research/03-mixed-content-layout.md), [V1–V4](../../13_research/single-node-type-sheet-tree-2026-06-13/implementation-research/V4-verify-completeness.md)).

---

## A. Blast-radius tally (Option A: keep `kind` as a vestigial display label)

| Bucket | Count |
|---|---|
| DELETE (whole helper/function/block) | ~14 |
| SIMPLIFY (gate removed, branches merge) | ~27 sites |
| CHANGE (data-driven / type widened) | ~11 sites |
| App files touched (in scope) | ~24 |
| Files that go dead/vestigial | 3 |
| AI files (out of scope, DB-coupled only) | 5 |

**The new type shape.** `EstimateNodeKind` / `EstimateTreeNode.kind` widen to an optional `string` (a display label, not a discriminant). `canNestEstimateNodeKind`, `canNodeReceiveRows`, `getEstimateWrapGroupName`, `getEstimateNodeNestingError`, `isEstimateGroupNodeKind` are deleted. `normalizeEstimateTreeNodeKind` + `LEGACY_ESTIMATE_GROUP_NODE_KINDS` are **kept** (they still absorb legacy DB enum values). [`tree-hierarchy.ts`](../../../src/lib/estimates/tree-hierarchy.ts) shrinks ~113 → ~40 lines.

### Heaviest deletions
- [`tree-hierarchy.ts`](../../../src/lib/estimates/tree-hierarchy.ts): all nesting/wrap helpers.
- [`actions.ts`](../../../src/lib/estimates/actions.ts): `wrapEstimateAreaAndInsertTemplate` (`:2389-2470`), the `canNestEstimateNodeKind` guards (`:1971`, `:1395`), the area-row guard in `insertEstimateRowItemFromLibrary` (`:2483`), the group-target guard (`:2232`).
- [`EstimateSheetContent.tsx`](../../../src/components/workshop/EstimateSheetContent.tsx): `wrapAreaNodeWithGroup` (`:299`), `wrapAreaAndInsertTemplates` (`:1337`), insert-target resolution (`:877-893`).
- [`EstimateSheetTree.tsx`](../../../src/components/workshop/EstimateSheetTree.tsx): "select a group first" guard (`:623`), two-button toolbar (`:1318`), the `nodeIsGroup` context-menu gate (`:1089`).

### Read paths that MUST become kind-agnostic (the data-loss sites — found by V1/V2/V4)
These are the load-bearing ones; missing any one drops rows or throws:

| File:line | Today | Fix |
|---|---|---|
| `share/reconstruct-share-tree.ts:297` | `directRows = node.kind==="area" ? rows : []` (**live public share — drops rows + understates client total**) | always `rowsByNodeId.get(id) ?? []` |
| `share/ShareEstimateTreePanel.tsx:85,148` + `ShareEstimateTreeView.tsx:87` | render rows only for area | render for any node |
| `proposal-export/build-proposal-export-model.ts:265` | only area rows exported | rows on any node |
| `project-charts/aggregate-project-charts.ts:175,256,309` + `project-charts-repository.ts:213` | "Area"/"Group" derived discriminant drives leaf detection; `:256` uses **raw** `row.kind==="area"` sum | switch to **leaf-or-has-rows** detection (V2/V4) |
| `estimate-sheet/rows/branch.tsx:79` | `canReceiveRows = kind==="area"` | always true |
| `EstimateSheetContent.tsx:427` | activity scope emits rows only under area | emit for any node with rows |
| `domain/estimate-mutations.ts:12` | `moveEstimateRowItem` **throws** via `canNodeReceiveRows` | drop the guard (**crash-on-drag** otherwise) |
| `estimate-tree-data.ts:409` | `validateEstimateTreeHierarchy` **errors** on rows-on-non-area | delete the check |

> **V4 caught these last two** (`estimate-mutations.ts:12`, `estimate-tree-data.ts:409`) as *unlisted* in the first blast-radius pass, plus the build-breakers below. They are now in scope.

### Build-breakers (consumers of a to-be-deleted helper)
`getEstimateNodeDisplayKind` is deleted, but [`activity-history.tsx:14,138`](../../../src/components/workshop/estimate-sheet/activity-history.tsx) and [`node-visuals.tsx:3,36`](../../../src/components/workshop/estimate-sheet/rows/node-visuals.tsx) import it → must be updated in the same change or the build breaks.

### Cross-subsystem coupling (V4)
[`component-library/actions.ts` save-as-template (`:768`)](../../../src/lib/component-library/actions.ts) copies an estimate subtree into `estimate_template_nodes` with its rows. Once estimates allow rows-on-(former-group) nodes, saving such a subtree hits the **still-enforced** template triggers and **rejects** — unless the template DB relaxes in the same release (→ R7, Phase 5 lockstep).

### Out of scope but DB-coupled (flag only)
AI package-builder (`src/lib/ai/package-builder/*`, `src/app/api/ai/**`) encodes the same removed rules in TS + the `ai_package_builder_apply_rpc` (`node_kind <> 'area'`). It is dormant and already broken post-tabs (inserts nodes with no `estimate_tab_id`). It inherits the relaxed RPC contracts automatically; no AI app change is planned.

---

## B. The migration (relax-only, both trees, one file) — full DDL in [research 01](../../13_research/single-node-type-sheet-tree-2026-06-13/implementation-research/01-migration-and-data-safety.md)

**Authoritative function definitions live in the estimate-tabs migration** ([`20260612094734`](../../../supabase/migrations/20260612094734_estimate_tabs_foundation.sql)), *not* the older `20260520222038` — confirmed. One new migration, single transaction:

1. Drop `enforce_estimate_row_item_area_node` trigger + function.
2. Drop `estimate_nodes_active_kind_check`; `set default 'group'` (the column is `NOT NULL` with no default — this default is *required* so future callers omitting `kind` still write).
3. `create or replace validate_estimate_node_tree` keeping **only** missing-parent + cross-tab + cycle (remove hierarchy + rows-must-be-area blocks).
4. `create or replace reorder_estimate_nodes` minus the inline hierarchy block (`:427-451`).
5. Relax `insert_estimate_row_item_with_history` (drop the `kind='area'` existence guard → plain in-estimate existence check).
6. Relax `insert_estimate_template_into_estimate` (drop the `kind='group'` target requirement).
7. **Template tree, same migration:** drop `estimate_template_nodes_active_kind_check`; rewrite `validate_estimate_template_tree` identically; drop `enforce_estimate_template_row_item_area_node`; relax **both** template-insert group-target guards (`20260524050746:902-910` and `20260612094734:819-828`).
8. Replay each function's exact revoke/grant lines (`SECURITY DEFINER` invariant I5).
9. End with a transactional **integrity assertion block** (cross-tab/orphan-row/missing-parent counts must be 0) — converts "should be fine" into a hard gate.

**Decisions, settled by research:**
- **`kind` column → keep vestigial, unconstrained, default `'group'`.** Dropping it forces a type regen + RPC-signature changes + coordinated deploy for zero functional gain. Keep it as an informational label; optional later cleanup can drop it.
- **Enum → frozen, untouched.** Postgres can't drop enum values in place; the extra legacy values (`lot/structure/level/assembly/general`) are harmless once unconstrained.
- **Existing data → zero movement.** The new rule set ⊂ the old, so the valid-tree set only grows; every existing row stays valid. Snapshots read `kind` as opaque passthrough.
- **Dormant stacks → do not touch.** The snapshot/version-control v2 stack and the AI RPC pre-date tabs and are frozen; re-defining them risks awakening them.

---

## C. Mixed-content layout — the one genuinely new UX surface (with adversarial conditions)

The substrate already renders both (`branch.tsx:78` `hasContents = children OR rows`; `:242` row table renders in every branch). The design is **ordering + affordance**, not plumbing.

### C1. Own rows FIRST, children BELOW
Invert the DOM order at [`branch.tsx:211-259`](../../../src/components/workshop/estimate-sheet/rows/branch.tsx): render the node's own `EstimateRowItemsTable` directly under its header, the add-row strip next, then the child sub-areas. Rationale: spreadsheet truth — "click a thing → see its numbers"; children-first would bury the node's own rows under an arbitrarily deep subtree.

```
┌ Node header (caret · icon · code · name · …… total) ── sticky
├ OWN ROWS  (table)                          ← rows-first
├ + Add row / drop strip
├ Child sub-area A  (recursive, depth+1)
└ Child sub-area B …
```

### C2. One icon; caret only when it has children
Drop the folder/pin distinction (there's no type to signal). Containment is shown by the **disclosure caret**, rendered only when `children.length > 0` (color-blind-safe — shape, not color). In the left tree, `isLeaf` derives from `node.children?.length`, not kind. Recommended glyph: a neutral node mark (not `MapPin` — a pin implies "location/area," the concept we're generalizing); brand call.

### C3. Three actions, three non-competing locations
Add-row = quiet inline button under the own-rows table (every node). Drag-a-component = the same strip, dashed, **only while dragging** (zero at-rest clutter). Add-child = the left tree (where node creation lives) + a universal template drop zone in the sheet. Only **one** affordance is ever permanently visible per node.

### C4. One unified empty state
Delete `EmptyGroupMessage` and the kind-split empty states. Every empty node shows one quiet line offering both paths. This removes today's contradiction (the same slot says "add a row" or "add a node" depending on a hidden type).

### C5. Adversarial conditions that MUST hold (V3) — these are not optional
- **Activity scope `includeDescendants` must be a stable stored user choice, NOT derived from `has-children`.** Deriving it from child count makes scope semantics *time-varying* and silently invalidates the activity cache key `node:{id}:{desc|direct}` ([`EstimateSheetContent.tsx:413`, `~1006`](../../../src/components/workshop/EstimateSheetContent.tsx)). **Fix while trees are still all-area (Phase 3)** so no activity history is poisoned retroactively — it cannot be retrofitted cleanly.
- **Remove the `node.kind !== "area"` row-emission gate** at `EstimateSheetContent.tsx:427` or rows on (former-group) nodes vanish from the activity scope tree (the one *correctness* regression unification introduces here).
- **Sticky-offset cascade required.** A node's own-rows `thead` (`sticky top-0 z-10`, `row-table.tsx:151`) and child branch headers (`sticky top-0 z-[20]`, `branch.tsx:157`) now coexist and will collide. Add a depth-accumulated sticky offset, or demote the row `thead` to non-sticky inside non-leaf nodes.
- **Own-rows-vs-child-rows visual distinction.** Spacing alone (today's `space-y-4`) equals the sibling-area rhythm, so a reader can't tell "parent's own rows" from "first child's rows." Add a distinct affordance (e.g. an "Own items" micro-label or node-matched indentation).
- **Verify row-event `estimate_node_id` stamping** for the "this node only" scope, or own-row edits silently drop from that view.

---

## D. Naming → "Area" + the create flow (full table in [research 05](../../13_research/single-node-type-sheet-tree-2026-06-13/implementation-research/05-naming-and-create-flow.md))

**Name: "Area."** Strongest BOQ/market pull, already the internal `kind` value, "Area inside Area" reads cleanly, minimal user relearning. The one caveat: if trees are heavily *trade/phase*-organized rather than spatial, "Section" reads better for pure organizers — owner's call (open decision in [00](00_INDEX.md)).

**Create flow:** one **"Add Area"** toolbar button → creates a child of the selected node, or a root if nothing selected; no "select a group first" error; optimistic insert + inline rename (existing pattern). Context menu: one unconditional "Add Area inside" on every node. Drop anywhere. Template external drop always inserts as a child (no `wrapAreaNodeId` path).

**Vocabulary:** ~40 user-facing strings change (toolbar, context menu, placeholders, empty states, insert-gate messages, activity eyebrows, delete-confirm copy). The onboarding "what's the difference between a group and an area" tour step is **deleted**; `ae-tour-estimate-add-group` becomes `ae-tour-estimate-add-area`. Internal identifiers (`kind`, `"area"`, etc.) stay.

---

## E. Output structure (new/changed)

```
supabase/migrations/
  <ts>_unify_estimate_node_kinds.sql        (NEW — relax-only, both trees, integrity gate)
src/lib/estimates/
  tree-hierarchy.ts        (heavy delete: nesting/wrap helpers)
  actions.ts               (delete wrap; single Add; drop area/group guards)
  estimate-tree-reorder.ts (drop nesting guard; keep cycle)
src/lib/domain/
  estimate-tree.ts         (delete canNodeReceiveRows)
  estimate-mutations.ts    (delete row-move throw — V4)
src/lib/{proposal-export,project-charts,share}/  (read paths kind-agnostic)
src/lib/repositories/{project-charts-repository,estimate-repository,workspace-repository}.ts
src/components/workshop/
  EstimateSheetTree.tsx, EstimateSheetContent.tsx
  estimate-sheet/rows/{branch,node-visuals,drop-zones,row-table}.tsx  (layout + sticky cascade)
  estimate-sheet/activity-history.tsx        (scope de-kind; build-breaker fix)
  estimate-tree-data.ts                      (delete validation throw — V4)
  library/template-editor/*                  (parity — Phase 5)
  share/*, component-library/*               (read + gate copy)
tests/vitest/ + e2e/                         (oracle + rewrites — see 03/04)
```
Per-phase authoritative file lists are in [03](03_IMPLEMENTATION_ROUTE.md).
