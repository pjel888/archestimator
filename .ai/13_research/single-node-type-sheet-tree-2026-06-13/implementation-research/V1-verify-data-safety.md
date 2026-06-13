I have all the evidence needed. The branch renders `estimateRowItems` (line 243) regardless of kind in the data model, but `canReceiveRows` (line 260, gated on `kind === "area"`) controls the drop affordance and the row-add UI. The data-model rows persist, but the key data-loss vector is confirmed in the **share path** where `kind !== "area"` hard-drops rows from the reconstructed tree.

Final verdict assembled.

---

## VERDICT: UNSAFE

The claim is **false as stated**. The migration plan is structurally sound at the *database* layer (constraint-relaxing, no data movement, valid-tree set only grows), but the load-bearing sub-claim that "share snapshots still restore correctly" is **wrong**, and the plan's reasoning about it is based on a misidentified code path. The plan checked the *dormant SQL v2 snapshot stack* and declared the share path safe — but the **live share/publication path is a completely separate app-side code path** that the plan never examined, and it silently drops estimate data after unification.

---

### CRITICAL FINDING — Live share view drops rows on non-area nodes (data loss on the read side)

The plan's central safety argument for sharing is (its section 1 + section 4): *"the share/reconstruct path reads `kind` as an opaque passthrough and derive[s] kind from structure on the read side… Removing DB kind constraints cannot invalidate an existing snapshot."* This is **false** for the live path.

- The live share page (`src/app/share/[token]/page.tsx` → `src/components/share/SharePageTabs.tsx:268`) calls `getBestShareTree(rows, treeNodes)`. This is **not** the dormant SQL stack — it is fed by the app-side publication snapshot (`src/lib/publication/snapshot.ts`, live, `schemaVersion 1.2`, tabs-aware).
- `src/lib/publication/snapshot.ts:155`-equivalent stores the **raw DB `kind`** into `PublicationSnapshotTreeNode.kind` (verbatim, line 143 of snapshot.ts).
- `src/lib/share/reconstruct-share-tree.ts:297` then does:
  `const directRows = node.kind === "area" ? (rowsByNodeId.get(node.id) ?? []) : [];`
  Any node whose stored `kind !== "area"` gets `directRows = []`. Its rows are **silently dropped** — they don't even fall into "Unassigned" (that bucket only catches rows whose `nodeId` isn't in the tree; here the node *is* in the tree, so the rows are simply discarded and the rollup totals are understated).
- After unification, the new default `kind` is `'group'` (plan section B), and rows can legally attach to any node. Every row on a `kind='group'` node will **vanish from the share view and from the shared total**. This is exactly the "corrupt or lose existing estimate data" and "snapshots still restore correctly" failure the claim says cannot happen.

Two more live render gates compound this (rows only render for area nodes):
- `src/components/share/ShareEstimateTreePanel.tsx:85, 148`
- `src/components/share/ShareEstimateTreeView.tsx:87`

This is **not dormant** — the share route is a public, ungated page.

### SECONDARY FINDING — Workshop tree hides rows on non-area nodes

- `src/components/workshop/estimate-sheet/rows/branch.tsx:79` `canReceiveRows = node.kind === "area"`. Rows on a `group` node load into the data model (`buildEstimateTree` at `workspace-repository.ts:1611` attaches rows by node id regardless of kind) but the unified default `'group'` changes drop/add affordances and node visuals.
- `src/lib/repositories/workspace-repository.ts:1603-1604` (`getDisplayNodeKind`) **drops** any node whose kind doesn't normalize to group/area, promoting children to roots. Safe today (enum stays group/area), but it means the app still hard-assumes the two-kind model.

These are app-behavior regressions, not strictly DB corruption — but they undermine "no data lost from the user's perspective."

### What the plan got RIGHT (verified)
- DB definitions exist as described (validate/reorder hierarchy + rows-must-be-area blocks; row-item area trigger at `20260519192045:145-170`; template family at `20260522091621:77-205`; active-kind check at `20260520222038:14-26`). Removing them only relaxes constraints; no existing tree that validated before can newly fail.
- The **SQL v2 stack is genuinely dormant**: the app calls `estimate_sheet_events` (history) but never invokes `create_estimate_sheet_version`, `restore_estimate_sheet_version_as_copy`, or `estimate_sheet_snapshot` RPCs (only generated types reference them). Leaving them untouched is correct.
- The **AI RPC is already broken**: `create_project_estimate_package_with_history` (`20260528003000:317-325`) inserts `estimate_nodes` with NO `estimate_tab_id` against a NOT NULL column. Out of scope is justified.
- Enum is `('lot','structure','level','area','group','assembly')` + `'general'` = 7 values; leaving it frozen is correct (Postgres cannot drop enum values in place).
- One correction to the plan's mechanics: `estimate_nodes.kind` is `NOT NULL` with **no default** (`20260518090000:86`). The plan's `set default 'group'` is therefore *required* (not merely cosmetic) for any future caller that omits `kind`; the live `create_estimate_node_with_history` RPC still passes it explicitly, so existing writes are unaffected.

---

### MANDATORY SAFEGUARDS (conditions to flip UNSAFE → SAFE)

This migration **cannot ship alone**. It must be co-released with app-side changes:

1. **Fix `src/lib/share/reconstruct-share-tree.ts:297`** — stop gating `directRows` on `kind === "area"`. Attach rows to whatever node owns them (`rowsByNodeId.get(node.id)`), independent of kind. Otherwise shared estimates lose rows and report wrong totals. This is the blocking item.
2. **Fix the share render gates** in `ShareEstimateTreePanel.tsx:85,148` and `ShareEstimateTreeView.tsx:87` to render owned rows on any node, not only `area`.
3. **Fix the workshop render gate** `branch.tsx:79` so unified nodes display their rows; audit the other ~18 files surfaced by the kind-grep (`EstimateSheetTree`, `node-visuals`, `tree-hierarchy`, template editor, etc.) for two-kind assumptions before flipping the DB default.
4. **Decide unification node default deliberately.** If the migration defaults new/legacy nodes to `'group'`, every existing `area` node keeps showing rows but every *new* unified node defaults to a kind the current share/workshop code treats as row-less. Either (a) keep new nodes as `'area'` until the app is kind-agnostic, or (b) ship the app fixes first. Defaulting to `'group'` while the read paths still gate on `'area'` is the direct trigger for the data-loss bug.
5. **Keep the plan's section-4 transactional guard block** (cross-tab / orphan-row / missing-parent asserts) — necessary but not sufficient; it proves DB integrity, not that the UI renders the data.
6. **Pre-deploy logical backup** of `estimate_nodes`, `estimate_row_items`, `estimate_template_nodes`, `estimate_template_row_items` (the plan's section-6 point of no return is correct — once unified-shape data exists, the two-kind shape cannot be mechanically reconstituted).

Bottom line: the DDL is data-safe; the **claim is not**, because "share snapshots still restore correctly" fails — the live share path reads stored `kind` and discards rows on any node that isn't `'area'`, which the unification migration makes common. Default to UNSAFE until items 1-4 ship in the same release.

Key files: `/Users/philiplewis/Documents/archestimator/src/lib/share/reconstruct-share-tree.ts` (line 297), `/Users/philiplewis/Documents/archestimator/src/lib/publication/snapshot.ts` (lines 143, 246), `/Users/philiplewis/Documents/archestimator/src/components/share/SharePageTabs.tsx` (line 268), `/Users/philiplewis/Documents/archestimator/src/components/share/ShareEstimateTreePanel.tsx` (lines 85, 148), `/Users/philiplewis/Documents/archestimator/src/components/share/ShareEstimateTreeView.tsx` (line 87), `/Users/philiplewis/Documents/archestimator/src/components/workshop/estimate-sheet/rows/branch.tsx` (line 79), `/Users/philiplewis/Documents/archestimator/src/lib/repositories/workspace-repository.ts` (lines 1603, 1611), `/Users/philiplewis/Documents/archestimator/supabase/migrations/20260612094734_estimate_tabs_foundation.sql` (validate 208-295, reorder hierarchy 427-451), `/Users/philiplewis/Documents/archestimator/supabase/migrations/20260524050746_add_estimate_row_contingency_percentage.sql` (snapshot 131-180 — dormant), `/Users/philiplewis/Documents/archestimator/supabase/migrations/20260528003000_ai_package_builder_apply_rpc.sql` (lines 317-325 — already broken, no estimate_tab_id).