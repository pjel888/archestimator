# 01 — Problem, Goals & Invariants

## Problem

The estimate sheet tree has two node kinds: **`group`** (a container that organizes the tree) and **`area`** (a leaf that holds the cost line items). This split forces users to make a **type decision before they understand the structure they're building**, names the concepts inconsistently across ~19 surfaces ("Add Group" / "Add Node" / "Area Node" / "Group Node"), and needs a dedicated onboarding tour step just to explain "Groups organize sections, Areas hold line items." Needing a tutorial to explain two buttons is the tell that the model is wrong.

The earlier attempt to keep two types and *hide* the distinction (deferred picker, convert actions, auto-wrap replacement) added machinery to mask the problem. The committed decision instead **removes the distinction**: one node type, which the user simply names and fills however they like. This deletes ~14 functions/blocks (the whole auto-wrap path, all nesting rules, two creation paths) — it is simpler to build and to use.

### What "one node type" means concretely
- One concept ("an Area"). Every node can hold cost rows **and** sub-nodes.
- One "Add Area" button. Drop anything anywhere. No "you can't put that there." No auto-wrap. No convert — there's nothing to convert *between*.
- Opening a node shows its own cost rows (a table) with its child sub-areas nested under it.
- The data/render substrate is **already kind-agnostic** — `buildEstimateTree` attaches rows to any node ([`workspace-repository.ts:1611`](../../../src/lib/repositories/workspace-repository.ts)), `computeNodeTotal` sums own-rows + children ([`editable-row-model.ts:115`](../../../src/components/workshop/estimate-sheet/rows/editable-row-model.ts)), and `branch.tsx` renders a row table in every node. Unification mostly **deletes gates**, it does not add architecture.

---

## Goals

- **G1 — One concept.** A user never chooses or learns "group vs area." There is one node type they name and fill.
- **G2 — Simpler codebase.** Delete the nesting rules, the auto-wrap path, the two creation paths, the convert idea. Net code reduction.
- **G3 — Mixed content works cleanly.** A node holding both rows and children renders, totals, exports, shares, and charts **correctly** — no dropped rows, no double-counts.
- **G4 — Zero data loss.** No existing estimate loses a row or a dollar, in the app or in published/shared views, at any point during rollout.
- **G5 — Survivable irreversibility.** The forward-only migration is crossed by a small, value-less, separately-revertible step, with a tested rollback artifact.
- **G6 — Preserve the load-bearing invariants** (cycle/cross-tab/RPC-history/RLS/cost-formula).

## Non-goals
- **NG1** — Keeping two node kinds in any form (the committed decision removes them).
- **NG2** — AI / package-builder changes (dormant in beta; inherit relaxed RPCs automatically).
- **NG3** — Awakening or changing the dormant snapshot/version-control v2 stack.
- **NG4** — Changing the row cost model, RLS, or realtime/collaboration transport.
- **NG5** — Dropping the `kind` enum column now (kept vestigial; optional later cleanup).
- **NG6** — Redesigning the default new-estimate tree (user-made; not a concern).

---

## Requirements (traceability → [03 route](03_IMPLEMENTATION_ROUTE.md) phases)

| R-ID | Requirement | Phase |
|---|---|---|
| **R1** | Every read path (share, export, charts, workshop render, activity scope) attaches/renders/sums rows on **any** node, not only `area`. | P1, P2, P3 |
| **R2** | The two **throw** paths (`estimate-mutations.ts:12` row-move, `estimate-tree-data.ts:409` validation) no longer error on rows-on-non-area. | P3 |
| **R3** | Activity-scope `includeDescendants` is a **stable stored user choice**, never derived from child count; the `node:{id}:{desc|direct}` cache key stays stable. | P3 |
| **R4** | A node with both own rows and children renders **rows-first**, one icon, conditional caret, unified empty state, with sticky-offset cascade and an own-rows-vs-child-rows visual distinction. | P4 |
| **R5** | Vocabulary is unified to **"Area"**; "Group"/"Node" removed from user-facing copy; the onboarding group-vs-area step is deleted. | P4 |
| **R6** | The P5 DB migration relaxes the validators, row-item triggers, and reorder hierarchy guard on **both** `estimate_nodes` and `estimate_template_nodes`, keeping cycle/cross-tab/missing-parent/orphan guards and leaving the RPC kind guards in place; it ships zero row/template/subtree write capability. | P5 |
| **R7** | Template tree (DB triggers + editor UI) unifies **in the same release** as the estimate side, so `save-as-template` never hits a stricter template trigger. | P5 |
| **R8** | The create/write flow (single "Add Area", drop all guards + wrap) ships **after** the migration, as the isolated point of no return. | P6 |
| **R9** | Totals are correct across **all five** surfaces (in-app, share, export, charts, snapshot) with no double-count and no dropped rows; consolidation never silently merges a container row with a leaf row. | P1–P6 (oracle) |
| **R10** | A pre-migration logical dump + Supabase-branch dry-run + blocking prod integrity pre-flight gate the irreversible step. | P0, P5 |
| **R11** | Brittle source-string tests are neutralized once up front; a golden-master numeric oracle is the regression spine. | P0 |
| **R12** | `bun run validate` green at every phase; gated e2e smokes pass. | all |

---

## Invariants PRESERVED (must not break)

| # | Invariant | Source | Why it survives unification |
|---|---|---|---|
| **I1** | **Cycle prevention** in the tree. | `validate_estimate_node_tree` cycle block ([`20260612094734:269-292`](../../../supabase/migrations/20260612094734_estimate_tabs_foundation.sql)); `estimate-tree-reorder.ts:278` | Kept verbatim in the rewritten validator. Shares a function body with the removed checks — **regression-test it** so a careless edit can't drop it. |
| **I2** | **Cross-tab isolation** (a node's parent is in the same tab). | `validate_estimate_node_tree` cross-tab block (`20260612094734:236-238`) | Kept verbatim. |
| **I3** | **Missing-parent** rejection. | `validate_estimate_node_tree` (`20260612094734:228`) | Kept verbatim. |
| **I4** | Node create/rename/structural changes go through **`_with_history` RPCs**; no direct table writes. | [decisions.md 2026-05-24](../../10_state/decisions.md) | None of the deletions touch the RPC boundary — only client-side pre-validation and DB *constraints* are relaxed. |
| **I5** | **RLS / workspace membership** governs all access; `SECURITY DEFINER` RPCs re-grant exactly. | core schema; `initial-data-model.md` | Kind is invisible to RLS. Each `create or replace`d function replays its existing revoke/grant. |
| **I6** | **Canonical cost formula** `subTotal + miscCost + subTotal×contingency%/100`, shared by in-app/export/charts/snapshot/share. | [decisions.md 2026-05-24](../../10_state/decisions.md); `estimate-totals.ts` | Unchanged. The unification must not introduce a *sixth* total path or let the existing five diverge (V2 flags the snapshot RPC already drops contingency — tracked, not folded in). |
| **I7** | Selection is **Zustand-owned, immediate, route-independent**. | [decisions.md 2026-05-20](../../10_state/decisions.md) | The single Add flow keeps the optimistic-select-then-persist pattern. |

## Rules INTENTIONALLY REMOVED (the point of the change)

| Rule | Where enforced (representative) | Becomes |
|---|---|---|
| Roots must be `group`; only `group` parents children. | `validate_estimate_node_tree` hierarchy block; `canNestEstimateNodeKind` ([`tree-hierarchy.ts:25`](../../../src/lib/estimates/tree-hierarchy.ts)) | Any node can be a root or a parent (cycle/cross-tab still apply). |
| Only `area` holds row items. | `enforce_estimate_row_item_area_node` trigger; `insert_estimate_row_item_with_history` area guard; `canNodeReceiveRows` ([`domain/estimate-tree.ts:51`](../../../src/lib/domain/estimate-tree.ts)) | Any node holds rows. |
| `area` cannot have children (→ auto-wrap on template drop). | `wrapEstimateAreaAndInsertTemplate` ([`actions.ts:2389`](../../../src/lib/estimates/actions.ts)); `getEstimateWrapGroupName` | Deleted entirely — templates insert as children directly. |
| Two creation paths + "select a group first". | `EstimateSheetTree.tsx:623`, two toolbar buttons | Single "Add Area"; no blocking error. |
| Template tree mirrors all of the above. | `validate_estimate_template_tree`, `enforce_estimate_template_row_item_area_node`, template-editor write paths, insert group-target guards | Validators/triggers relax in P5; RPC/application write guards relax in P6 with the write-enable flow. |
