# 09 — P1 Design Decisions (resolved, with rationale)

Concrete answers to the open design questions, ground-truthed against current code. These supersede the hand-waved versions in the research and are folded back into [04](04_DIMENSIONS_RISKS_ROLLOUT.md).

---

## A. Activity-scope `includeDescendants` — stable stored choice (P1.4) → **RESOLVED**

**Ground truth.** Today `includeDescendants` is derived from kind: `EstimateSheetContent.tsx:421` sets `includeDescendants: isGroup` where `isGroup = node.kind === "group"` (`:416`). The cache key is `node:{id}:{desc|direct}` built by `getActivityScopeKey` (`activity-history.tsx:1290-1295`) and reconstructed inline at `EstimateSheetContent.tsx:1025`. Activity uses **manual useState/useEffect** fetching (not react-query); the key round-trips through `inspectorScopeRef` as the stale-request guard, and is parsed back apart at `:1124` to recover the fetch params. **There is no user toggle today** and **no Zustand store for inspector/scope** (it's local `useState` at `:709`). Row events DO stamp `estimate_node_id` (version-control migration), so "this node only" on a node with its own rows is meaningful.

**Decision.**
1. **Default = `includeDescendants: true` (descendants-inclusive) for EVERY node — a stable constant, never derived from has-children.** This is the key V3 B2 fix: a constant default cannot become time-varying when a node gains/loses a child.
   - Why `true`, not `false`: it **preserves today's behavior exactly** for both kinds. A leaf node's descendant set is just itself, so `desc` returns the *same events* as `direct` (the descendant filter `buildNodeScopeEventFilter` resolves to the single node) — identical data, only the cache-key suffix differs. A former-group node keeps its current "includes descendant activity" default. A new mixed node sensibly shows everything by default, then the user narrows.
2. **The user choice ("This node only" vs "Include sub-areas") is a stored per-node override.** Add to `src/stores/estimate-ui-store.ts` (`useEstimateUiStore`):
   ```ts
   activityScopeDirectOnly: Record<string, boolean>;   // nodeId -> true means "this node only"
   setActivityScopeDirectOnly(nodeId: string, directOnly: boolean): void;
   ```
   `buildActivityScopeTreeItems` (`:416-426`) reads `includeDescendants = !(store.activityScopeDirectOnly[node.id] ?? false)` instead of `isGroup`. (Default false ⇒ includeDescendants true ⇒ matches decision 1.)
3. **Cache-key format is UNCHANGED** (`node:{id}:{desc|direct}`) — the stored boolean simply feeds the existing suffix. **Back-compatible**: existing cached entries keyed `node:{groupId}:desc` / `node:{areaId}:direct` are never *corrupted*; at most a node now resolves to a different (still-valid) key, and the old entry goes unused. No retroactive poisoning because the default is a constant, applied uniformly from P3 onward while all trees are still all-area.
4. **Persistence: session-scoped Zustand now** (matches the existing non-persisted `estimate-ui-store` pattern — acceptable for closed beta). Add `persist` (localStorage, keyed by estimate id) as a trivial follow-up if cross-reload stability is wanted. **Add the toggle UI** in `ActivityScopeTree` (`activity-history.tsx:1380-1523`) next to the node row (there is none today).
5. **Timing: P3, while trees are all-area** (plan-correct). Decoupling the row-emission gate `EstimateSheetContent.tsx:435` (`if node.kind !== "area" return`) ships in the same phase so a former-group node's own rows appear as `row:` scope items.

**Why not "store the per-node default at migration time"**: requires a backfill + server-side persistence for zero benefit — the constant-`true` default already reproduces today's data for every existing node.

---

## B. Five-totals-surface reconciliation / snapshot contingency (P1.5) → **FORMALLY DEFERRED**

**Ground truth.** V2 is correct: the snapshot/version-control total path drops contingency, so `estimate_sheet_total` already disagrees with in-app/export/charts for any contingency-bearing row — **today, independent of this change**. The canonical per-row formula `subTotal + miscCost + subTotal×cont%/100` is **duplicated, not shared**, across three sites (`estimate-row-tree-patch.ts:30-31,40` authoritative; `aggregate-project-charts.ts:98-101`; `build-proposal-export-model.ts:88-94`). There is no single `estimate-totals.ts`.

**Decision: OUT OF SCOPE for unification; tracked separately.** Rationale: it is a **pre-existing** divergence with no causal link to collapsing node kinds — unification neither creates nor worsens it (a mixed node's contingency rows behave exactly as a leaf area's do today). Folding a totals-formula consolidation into this already-large, irreversible change-set would expand blast radius and couple two unrelated risks.
- **Action:** file a tracked issue "snapshot RPC drops contingency — consolidate the 4 total paths behind one shared `calculateRowTotal`." The oracle **encodes the divergence honestly** as `O-DIV-1` (asserts the current wrong value with a `// KNOWN BUG, tracked` note) so it never pretends the five surfaces agree.
- **Guardrail:** invariant I6 in [01](01_PROBLEM_GOALS_AND_INVARIANTS.md) is updated to state explicitly "no *sixth* path is introduced and the existing five are not allowed to diverge *further*" — the unification work must reuse the canonical formula at every site it touches (it does; the oracle O3b/O4a proves it).

---

## C. "By space" chart semantics for a mixed node (P1.6) → **RESOLVED**

**Ground truth.** `aggregate-project-charts.ts` has **no leaf-vs-container detection**; it assumes Group→Area→rows. Rows bucket by the **highest Area ancestor** (`resolveSpaceBucket:169-192`, `resolveSpaceAreaNode:301-321` — both keep the *outermost* Area, no `break`). The flat series sums **per-row** (never node totals → no additive double-count today). The hierarchical table accumulates each leaf row's total into **every Group ancestor** (`:230-240`). A row on a container with no Area ancestor falls into `"Unassigned space"` (flat) or is **dropped** (`:222 if (!areaNode) continue`) (table) — the two can disagree.

**Decision — "own rows form an implicit own bucket, attributed to the OWNING node":**
1. **Bucketing rule (flat series):** every row buckets to **its own owning node** (the node carrying it), not the highest-Area ancestor. Replace the "highest Area" walk with "the row's `nodeId`'s node". This guarantees **each row is counted exactly once** → `Σ buckets = grand total`, no double-count, nothing orphaned to "Unassigned" (a real node always exists post-relax; the orphan guard still catches a genuinely missing node).
2. **Hierarchical space table:** a node's displayed total = `ownRowsTotal + Σ(child node totals)` (rollup, **display-only**). A node that has own rows renders an explicit **"Own items"** child line carrying `ownRowsTotal`, plus one line per child node (recursive). The `:256` fallback `row.kind === "area"` sum changes to **sum the child *table rows* once** (it already guards against re-summing nested group rows; extend it to treat the "own items" line as a leaf).
3. **Leaf detection → leaf-or-has-rows** (V2/V4): a node renders as a leaf bucket iff it has rows and no children; a node with both renders as a container *with* an own-items leaf line.

**Worked example (MIXED_FIXTURE):**
```
Flat series buckets:  BuildingA·own 100 | Level2·own 50 | Room201 30 | Level3 20   → Σ = 200 ✓
Hierarchical table:
  Building A .................. 200   (rollup)
    └ Own items .............. 100   (BuildingA's own rows — leaf line)
    └ Level 2 ................  80   (rollup)
        └ Own items ..........  50
        └ Room 201 ...........  30
    └ Level 3 ................  20
```
**No double-count proof:** the flat series sums each of the 4 rows once (=200); the table's rollups are display values never summed by a consumer; the "Own items" line and the parent rollup are never both summed in the same column (the parent total *contains* the own-items line, the column sums leaves only). The oracle **O4b mixed** asserts `Σ buckets = 200` and "BuildingA own-row not orphaned."

---

## D. Proposal export document structure for a mixed node (P1.7) → **RESOLVED**

**Ground truth.** `flattenEstimateTree` (`build-proposal-export-model.ts:257-286`) emits rows **only for `kind==="area"`** (`:265`) but **always recurses children** (`:281`); container-node rows are dropped to a `non_area_rows_skipped` *warning* (`collectNonAreaRows:238-255`). The exported document is **flat-with-sections** keyed by **row fields** (`sectionKey = category||discipline||"Uncategorized"`, `:95-106`), **not** node hierarchy — node path is carried only as provenance metadata (`areaPath`, `sourceAreaPaths`). Consolidation (`consolidationKey:125-138`) merges by content (section/tag/particulars/unit/costs/remarks) and **deliberately ignores node identity** — two rows in different areas with identical content already merge into one proposal line today; provenance survives in the source-breakdown sheet.

**Decision:**
1. **Emit rows on ANY node** (drop the `:265` `kind==="area"` gate; recurse unchanged). Delete `collectNonAreaRows` + the `non_area_rows_skipped` warning path (now meaningless).
2. **Document structure is unchanged** — the proposal stays category/discipline-sectioned; node hierarchy remains *provenance metadata* (`areaPath`). A mixed node's own rows flatten into the section model exactly like a leaf area's rows. This is the minimal, correct change.
3. **Consolidation stays node-agnostic** (recommended). A parent's own "Concrete 20MPa" merging with a child's identical "Concrete 20MPa" is the **same behavior** as two sibling areas merging today — that *is* the proposal's purpose, and **totals stay correct** (merge sums quantities). The oracle O3 mixed asserts `grandTotal = 200` and "every row once." **V2 CE2's guard is only required if the export grew a per-node rollup column — it has none**, so there is no double-count surface. *Do not* add `sourceNodeId` to the consolidation key (it would fragment the proposal and defeat consolidation).
4. **Container-vs-leaf provenance** is already preserved in the **source-breakdown sheet** (`buildSourceBreakdownRows:164-185`, keyed per original source with `areaPathLabel`). **Optional (low priority):** add a `provenanceLevel: "container" | "leaf"` tag to source-breakdown rows if the owner wants the distinction *visible*; not needed for correctness. Flagged, not scheduled.
5. **Canonical formula** unchanged — `normalizeSourceRow` (`:88-94`) already applies `material + contingency + misc` with `labor=0`; the oracle O3b asserts parity with the canonical helper.

---

## D5. P5-vs-P6 RPC-guard split (sequencing refinement) → **FLAGGED FOR OWNER; recommend the split**

Full rationale in [06 §F](06_GROUND_TRUTH_AND_CORRECTED_ANCHORS.md#f-p5-vs-p6-split-correction-the-key-sequencing-refinement-). Summary:

- **Finding:** `create_estimate_node_with_history` has no kind guard, so relaxing the validators (P5) already permits area-with-children at the RPC layer. The three RPC kind-guards (`insert_estimate_row_item_with_history:349`, `insert_estimate_template_into_estimate:824`, 🆕 `insert_estimate_subtree_into_estimate:87`) are what actually keep **row/template** writes withheld. Putting their relaxation in P5 (as 02 §B currently states) makes "P5 ships zero write capability" only UI-deep — partially violating non-negotiable #2.
- **Recommendation (harness-proven):** P5 migration = validators + row-triggers + reorder only ([`08…P5.sql`](08_unify_estimate_node_kinds.P5.sql)); the three RPC `kind` clauses relax in **P6 with the create-flow UI**. This makes "relax-only" and "enable-writes" genuinely separate *at the enforcement layer*, co-locates the RPC relaxation with the write enablement it serves, keeps the P5 migration small and reviewable, and aligns the point-of-no-return (first mixed write) with the P6 RPC relaxation. Neither DDL step is itself irreversible (all `create or replace`).
- **Either way, add the missing 🆕 `insert_estimate_subtree_into_estimate` (20260613134852:87) to the relaxation list** — it postdates the research and is absent from the plan; without it, project-subtree insert breaks the instant a relaxed estimate is the source/target. This is non-optional regardless of the P5/P6 choice.
- **Owner decision:** accept the split (recommended) **or** keep one P5 migration (append the `08…P5.sql` §F block to the P5 file). The prove harness validates both states.

---

## E. Generated-types reconciliation (P1.8) → **RESOLVED in [06 §D](06_GROUND_TRUTH_AND_CORRECTED_ANCHORS.md#d-generated-types-reconciliation-p18--folded-here)**

Headline: **no discriminated-union risk**; widen the domain `kind` to **required `string`** (not optional) + widen the 5 helper signatures in lockstep; the migration leaves `types.ts` untouched (no-op regen). ~10 bounded assignability sites enumerated there.
