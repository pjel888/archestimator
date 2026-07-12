# 06 — Target Design: Per-Area / Per-Component Commenting

> This is the design authority for the owner's headline ask: *"there should be a way
> for the proposal to still have the proper breakdown the same with in the estimate
> sheet … row items organized by area branches … commenting based on components,
> based on row items."*

## 1. The diagnosis (what's actually true today)

| Claim | Reality |
|---|---|
| "The breakdown is missing from the share page" | **Partly false.** The area-branch tree IS rendered (default "Summary" view) for modern snapshots. |
| "Row items aren't organized by area branches" | **False for modern snapshots.** `treeNodes` + `row.nodeId` preserve the workshop hierarchy end-to-end. |
| "You can't comment based on components / row items" | **Mostly true.** Row-item commenting works only in the *collated* table, not the tree. Area/component/node commenting is **impossible** — no `node` target kind exists. |
| "Old snapshots may be outdated" | **True for pre-v1.1 snapshots** — they lack `treeNodes` and fall to fragile designation-text parsing. |

So the work splits into **three** real problems:

- **A. Enable node-level commenting** (schema + type + route + UI affordance). — *The core gap.*
- **B. Enable row-level commenting from inside the tree** (parity with collated). — *Quick win.*
- **C. Make the breakdown match the estimate sheet** (nav totals, area donut, show-more, no silent degradation). — *Quality.*

## 2. Why this is cheap (the plumbing already exists)

The opaque `node_*` id namespace is **already minted and reversible** in the snapshot
id map (`snapshot.ts:72-83,160-166,296-311`). Every node in `treeNodes` already
carries a stable opaque id that round-trips back to the internal UUID. So enabling
node-level commenting does **not** require rebuilding the snapshot or the tree — it
requires:

1. Relaxing the `target_kind` CHECK + adding a `node_id` column (D1 migration).
2. Extending the TS type union + validators + label maps.
3. Adding a UI affordance on node headers.

## 3. Target data model

### 3.1 Review target kind
```ts
// src/components/share/share-review-target.ts
export type ShareReviewTargetKind = "proposal" | "estimate" | "node" | "row";

export type ShareReviewTarget = {
  kind: ShareReviewTargetKind;
  label: string;
  secondaryLabel?: string | null;
  estimateId?: string | null;
  nodeId?: string | null;     // NEW
  rowId?: string | null;
};
```
`normalizeShareReviewTarget`: `"node"` requires `nodeId` (else downgrade to proposal).
`serializeShareReviewTarget`: persist `estimateId` + `nodeId` (node) / `rowId` (row).

### 3.2 Backend target kind
```ts
// src/lib/publication/activity-helpers.ts
type SharedLinkTargetKind = "proposal" | "estimate" | "node" | "row";
```
- `activity_target_labels_json` (built at publish, `actions.ts:828`) gains a
  `nodeLabels: Record<opaqueNodeId, label>` map. Nodes are already in the snapshot, so
  the label source is `treeNodes[].name`.
- `validateSharedLinkReviewTarget` accepts a node target whose `nodeId ∈ nodeLabels`.
- `resolveSubmittedReviewTargetIds` resolves the opaque node id → internal.

### 3.3 Schema (D1 migration, additive)
```sql
-- New migration ./migrations/00NN_share_node_target_kind.sql
-- D1 cannot ALTER a CHECK in place → rebuild via __00NN pattern (mirror migration 0066).
CREATE TABLE shared_link_comments__00NN ( ... target_kind TEXT NOT NULL DEFAULT 'proposal'
  CHECK (target_kind IN ('proposal', 'estimate', 'node', 'row')), node_id TEXT, ... );
-- backfill + count-assert + drop + rename. Same for shared_link_responses.
```
The activity/publication indices are unchanged (node comments are still keyed by
`publication_id`).

### 3.4 Public id pattern
```ts
// routes
const PUBLIC_REVIEW_TARGET_ID_PATTERN = /^(?:est|row|node)_[A-Za-z0-9_-]{8,40}$/;
```

## 4. Target UX

### 4.1 The tree node header affordance
Each node header in `ShareEstimateTreeView` (and optionally the panel) gains a
**"Comment on this area"** control. Constraints:
- Must NOT conflict with the caret (expand/collapse) or navigate (scroll-to).
- Preferred: a small icon button on hover/focus at the right of the header row
  (consistent with the collated table's row-hover affordance,
  `SharePageTabs.tsx:873`), keyboard-activatable.
- On activation: `createNodeReviewTarget({ node, activeEstimate, activeContentLabel })`
  → `onReviewTargetChange` → the workspace banner + composer reflect
  "Reviewing: {node label}".

### 4.2 Tree-view rows become commentable (UNIT-3)
Inline rows in `ShareEstimateTreeView` (currently non-interactive `<div>`s) become
clickable → `createRowReviewTarget(row)` (same handler as the collated table). This
gives row-level commenting parity between the two views.

### 4.3 Active-target visual sync (reuses BUG-5 fix)
The currently-active review target node/row is highlighted in both the panel and the
view (wire the dead `activeNodeId` path, `SharePageTabs.tsx:923`). This makes it
obvious *what* the next comment will attach to — addressing UX-1 (implicit target).

### 4.4 Filter comments by target (future, UNIT-12)
Once node/row targeting exists, the comment list can filter by current target
("show only comments on this area"). Not in the headline scope but unlocked by it.

## 5. Target render quality (so the tree matches the estimate sheet)

| Gap | Fix | Unit |
|---|---|---|
| Nav panel shows no totals/counts | Pass `showTotals` (or flip `showInlineRows`) at `SharePageTabs.tsx:907,916` | UNIT-10a |
| Donut is discipline-only; tree is area-only — they don't corroborate | Add area-level aggregation (`aggregateRowsByNode`) or a discipline↔area toggle | UNIT-10b |
| Tree truncates >250 rows/node with no expand | Incremental "show more" per node | UNIT-4 |
| >500 rows silently degrades to flat discipline | Gate the cap on fallback rungs only (rung 1 snapshot-nodes has no cost) | UNIT-5 |
| Pre-v1.1 snapshots fall to fragile designation parsing | (a) nudge republish; (b) tighten delimiter regex | UNIT-5 |
| `activeNodeId` highlight dead | Wire it | UNIT-11/4.3 |

## 6. Decisions to close (autonomous, unless owner overrides)

```
DEC-AUTO-node-target-001
Question: Should node-level commenting reuse the existing `node_id` opaque namespace
  or mint a new one?
Evidence: snapshot.ts:72-83,160-166 — node_* ids already minted + reversible.
Options: (a) reuse node_* ids; (b) new namespace.
Decision: (a) reuse. The plumbing already round-trips; a new namespace is pure cost.
Confidence: high. Rollback: revert type union + migration.

DEC-AUTO-node-target-002
Question: Should a node target require an estimateId context too?
Evidence: rows carry both nodeId and estimateId; nodes are unique per estimate.
Decision: Yes — carry `estimateId` alongside `nodeId` for parity with row targets and
  to keep the validator's cross-estimate guard meaningful.
Confidence: high.

DEC-AUTO-node-target-003
Question: For pre-v1.1 snapshots without treeNodes, should node commenting be hidden
  or fall back to something?
Evidence: those snapshots have no node ids.
Decision: Hide the node-comment affordance (validation would reject unknown ids
  anyway). Row/proposal/estimate commenting still works.
Confidence: high. Rollback: additive; no behavior change for old snapshots.
```

## 7. Scope boundary (non-goals for the headline feature)

- **Not** rebuilding the snapshot or the tree reconstruction. The hierarchy is already
  preserved.
- **Not** threading/replies/resolve/edit (those are UNIT-12, separate product scope).
- **Not** realtime (UNIT-12).
- **Not** changing the publish flow. Node labels come from the already-shipped
  `treeNodes[].name`.

## 8. Implementation order (the critical path)

1. **UNIT-1** (schema + type + route enabler) — must land first; everything else
   depends on the `node` target kind existing.
2. **UNIT-2** (node commenting UI) + **UNIT-3** (row commenting from tree) — ship
   together; they're the visible headline deliverable.
3. **UNIT-4/5/10a/10b** (tree quality) — ship in the same sweep so the breakdown
   genuinely matches the estimate sheet.
4. Verify against a real published snapshot (the owner's example token) — requires
   explicit `TEST_TASK`/browser authorization.
