# 06 — Ground-Truth & Corrected Anchors (P0.1)

**Verified 2026-06-13 against live source** by direct read + grep (not trusting the planning snapshot). This doc is the authoritative anchor table; where it disagrees with 02/03/04 or the research, **this wins** and the older docs carry an inline correction note.

Legend: ✅ exact · ⚠️ drifted (content matches, line moved) · 🆕 missing-from-plan · 🔧 plan-claim-corrected.

---

## A. Load-bearing code anchors (the data-loss / throw sites)

| Plan cite | Current truth | Status | Current line |
|---|---|---|---|
| `share/reconstruct-share-tree.ts:297` area-row gate | `src/lib/share/reconstruct-share-tree.ts:297` | ✅ | `const directRows = node.kind === "area" ? (rowsByNodeId.get(node.id) ?? []) : [];` |
| `estimate-mutations.ts:12` move-throw | `src/lib/domain/estimate-mutations.ts:12` | ✅ | `if (!canNodeReceiveRows(targetNode.kind)) throw new Error("Only Area Nodes may receive estimate row items.");` |
| `estimate-tree-data.ts:409` validate-throw | `src/components/workshop/estimate-tree-data.ts:409` | ✅ | `if (node.kind !== "area" && node.estimateRowItems?.length)` |
| `EstimateSheetContent.tsx:427` row-emission gate | `EstimateSheetContent.tsx:435` | ⚠️ **+8** | `if (node.kind !== "area") return;` |
| `EstimateSheetContent.tsx:413` includeDescendants | `EstimateSheetContent.tsx:421` | ⚠️ **+8** | `scope: { mode: "node", nodeId: node.id, includeDescendants: isGroup }` (`isGroup` = `node.kind === "group"`, derived at `:416`) |
| `EstimateSheetContent.tsx:~1006` cache key | `EstimateSheetContent.tsx:1025` (inline) **+** canonical builder `activity-history.tsx:1290-1295` (`getActivityScopeKey`) | ⚠️ **+19** | `` `node:${nodeId}:${includeDescendants ? "desc" : "direct"}` `` |
| `aggregate-project-charts.ts:256` raw `row.kind` sum | `src/lib/project-charts/aggregate-project-charts.ts:256` | ✅ | `... reduce((sum, row) => sum + (row.kind === "area" ? row.total : 0), 0)` |
| chart leaf-detect `:175,:309` | `aggregate-project-charts.ts:175` (`current.kind === "Area"`), `:309` (same) | ✅ | "highest Area ancestor" walk — **capitalized** `"Area"` (`ProjectChartNodeFact.kind`), mapped from DB at `project-charts-repository.ts:213` |
| chart group accumulate `:232,:248` | `aggregate-project-charts.ts:232,248` | ✅ | `current.kind === "Group"` |
| `branch.tsx:79` canReceiveRows | `src/components/workshop/estimate-sheet/rows/branch.tsx:79` | ✅ | `const canReceiveRows = node.kind === "area";` |
| `proposal-export…:265` area gate | `build-proposal-export-model.ts:265` | ✅ | `if (node.kind === "area") {` (recurses children unconditionally at `:281`) |
| `proposal-export…collectNonAreaRows` | `build-proposal-export-model.ts:238` | ✅ | `function collectNonAreaRows(...)` → emits `non_area_rows_skipped` warning |

## B. Helper anchors (delete / simplify targets)

| Plan cite | Current truth | Status |
|---|---|---|
| `tree-hierarchy.ts:25` canNestEstimateNodeKind | `src/lib/estimates/tree-hierarchy.ts:25` | ✅ |
| `tree-hierarchy.ts` getEstimateWrapGroupName / NestingError / isGroupNodeKind | `:41` / `:46` / `:17` | ✅ |
| `domain/estimate-tree.ts:51` canNodeReceiveRows | `src/lib/domain/estimate-tree.ts:51` | ✅ `return kind === "area";` |
| `EstimateNodeKind` type | `src/lib/domain/estimate-tree.ts:1` = `"group" \| "area"`; UI tree node `src/lib/estimates/types.ts:137` | ✅ |
| `node-visuals.tsx` NodeIcon | `estimate-sheet/rows/node-visuals.tsx:35-38` (FolderSimple/MapPin via `getEstimateNodeDisplayKind`) | ✅ |
| `actions.ts:2389` wrapEstimateAreaAndInsertTemplate, `:2483` library area guard, `:2232` group-target | `src/lib/estimates/actions.ts` | ✅ (spot-confirmed via test source-string asserts; re-confirm exact lines at P6/P7 edit time) |
| build-breaker importers of `getEstimateNodeDisplayKind` | `activity-history.tsx` + `node-visuals.tsx:3,36` | ✅ |
| save-as-template subtree copy | `src/lib/component-library/actions.ts:768` region | ✅ (kind cast at `:785` `as "group" \| "area"`) |

## C. SQL anchors (the migration targets) — **authoritative locations**

| Object | Authoritative file:line | Two-kind blocks to relax |
|---|---|---|
| `validate_estimate_node_tree` | `20260612094734_estimate_tabs_foundation.sql:208-295` | hierarchy **241-255** (REMOVE) · rows-must-be-area **257-267**, key line **264** (RELAX → orphan-only) |
| `reorder_estimate_nodes` | `20260612094734:322-532` | inline hierarchy **427-451** (REMOVE) — ✅ plan's `:427-451` is **correct** (a sub-agent's "427-440" was wrong; direct read confirms 427-451) |
| `enforce_estimate_row_item_area_node` (trigger fn) | `20260520222038_enforce_two_kind_estimate_nodes.sql:131-150`; wiring 152-156 | key line **143** `and node.kind = 'area'` (RELAX → existence-only) |
| `validate_estimate_template_tree` | 🔧 `20260522091621_component_library_templates.sql:77-153` — **NOT the tabs migration** (02 §B implies all defs live in tabs; corrected: only the *estimate*-side validator does) | hierarchy **100-113** (REMOVE) · rows **115-125**, key **122** (RELAX). No cross-tab block (templates predate tabs). |
| `enforce_estimate_template_row_item_area_node` | `20260522091621:180-199`; wiring 201-205 | key **192** (RELAX → existence-only) |
| `insert_estimate_row_item_with_history` (RPC) | `20260524050746_add_estimate_row_contingency_percentage.sql:314-…`, guard at **344-352**, key **349** | drop `and node.kind = 'area'` → **Phase 6** (see §F) |
| `insert_estimate_template_into_estimate` (RPC) | `20260612094734:771-…`, guard **819-828**, key **824** | drop `and node.kind = 'group'` → **Phase 6** |
| 🆕 `insert_estimate_subtree_into_estimate` (RPC) | `20260613134852_insert_estimate_subtree_rpc.sql:20-…`, guard **82-91**, key **87** | **MISSING FROM PLAN.** Drop `and node.kind = 'group'` → **Phase 6**. Postdates the research. |
| `estimate_nodes_active_kind_check` CHECK | `20260520222038:17-20`, validated 25-26 | **KEEP** (see §E) |
| `estimate_template_nodes_active_kind_check` | inline `20260522091621:27` | **KEEP** |
| enum `public.estimate_node_kind` | `20260518090000_archestimator_core_schema.sql:9` (+ `general` at `20260518105000:3`) | **FREEZE** (untouched) |

Grant/revoke posture (latest authoritative, for I5 replay) is captured verbatim in [`08_unify_estimate_node_kinds.P5.sql`](08_unify_estimate_node_kinds.P5.sql) §6.

---

## D. Generated-types reconciliation (P1.8 — folded here)

- **Generated type** (`src/lib/supabase/types.ts`): `estimate_nodes.kind` and `estimate_template_nodes.kind` are `Database["public"]["Enums"]["estimate_node_kind"]` (Row `:1467`/`:1809`; Insert required; Update optional). Enum def `:3534-3541` = the **7-member** `"lot"|"general"|"structure"|"level"|"area"|"group"|"assembly"`. The DB→domain boundary already **narrows** 7 enum members → 2 (`normalizeEstimateTreeNodeKind`, `tree-hierarchy.ts:5,11-15`).
- **Discriminated-union risk: NONE.** No estimate-node type is a `kind`-keyed union; the only `switch (x.kind)` in `src/` (`component-library/index.tsx:439`) discriminates the *reusable-source* union, unrelated.
- **The migration does NOT change types.ts at all** — it changes only function *bodies*, no table/column/enum/signature. `supabase gen types` produces a **no-op diff** (verifiable at P5; below we instead keep the file untouched).
- **Recommendation: widen to required `kind: string`, NOT optional `kind?: string`.** Optionality introduces `undefined` that silently fails every `=== "area"` check and would launder through the `as "group" | "area"` cast at `component-library/actions.ts:785` into a DB insert. Widen the **helper signatures in lockstep** (`canNodeReceiveRows` estimate-tree.ts:51; `canNestEstimateNodeKind`/`getEstimateNodeDisplayKind`/`formatEstimateNodeKind`/`getEstimateNodeNestingError` tree-hierarchy.ts) — those already do runtime narrowing, so widening their params neutralizes the cascade.
- **Bounded break set (assignability, not discriminant):** required-union params + their call sites (`estimate-mutations.ts:12`, `node-visuals.tsx:36`, `EstimateSheetTree.tsx:81/88/1310`, `estimate-tree-reorder.ts:274`) and `node.kind`→2-union assignments (`read-tools.ts:385`, `read-context.ts:1213`, `publication/snapshot.ts:143`, `source-collectors.ts:81/127`). ~10 sites, all in P4/P6/P7. Full table in the kind-consumer audit (recorded in session memory; re-grep `\.kind`, `'area'`, `'group'` before the P4 edit).

---

## E. Corrected migration decisions (vs 02 §B)

1. **CHECK constraints `kind in ('group','area')` → KEEP (do not drop).** 🔧 02 §B step 2 says "drop `estimate_nodes_active_kind_check`; set default 'group'". Ground-truth: the CHECK does **not** enforce the content split (who holds rows/children) — it only restricts *which enum values* an active row may carry. After unification, nodes still carry `kind ∈ {group,area}`, so the CHECK never blocks a relaxed write. **Dropping it is unnecessary DDL and avoidable risk.** Keep it; relaxing the content split happens entirely in the validators/triggers. (Setting a column default is also unneeded — `create_estimate_node_with_history` requires `node_kind`; no caller omits it. If desired as cosmetic insurance, `alter column kind set default 'area'` is harmless.) **Net: fewer DDL statements, smaller blast radius.**

2. **Relax the per-row triggers, do NOT drop them.** 🔧 02 §B step 1/7 say "drop `enforce_estimate_row_item_area_node` trigger + function" (and the template twin). Ground-truth: the node-tree validator fires **only on `estimate_nodes` changes**, never on a row-item write — so this trigger is the **only** DB guard that runs when a row item is inserted/moved. Dropping it removes the same-estimate referential guard for direct row writes. **Keep both triggers, relax to an existence check** (drop only `kind='area'`). The relaxed validator BLOCK B likewise keeps the orphan half (`node.id is null`). Proven preserved by the harness ("orphan row still REJECTED").

3. **RPC guards relax in Phase 6, not Phase 5.** See §F.

---

## F. P5-vs-P6 split correction (the key sequencing refinement) 🔧

**Finding.** `create_estimate_node_with_history` (`20260612094734:603`) has **no kind guard** — it inserts whatever `node_kind` it's given and relies on the validator. So the moment P5 relaxes the validators, *node-nesting under any node* is already permitted at the RPC layer. What still blocks **row/template writes onto former-group / former-area nodes** is the three RPC kind-guards (`insert_estimate_row_item_with_history:349`, `insert_estimate_template_into_estimate:824`, `insert_estimate_subtree_into_estimate:87`).

**Consequence.** If P5 relaxes those RPCs (as the older single-P5 wording did), then after P5 a direct/forged RPC call *could create a mixed node* — so "P5 ships zero write capability" is only true at the UI layer, partially **merging enable-writes into the relax-only step** (against non-negotiable #2).

**Refinement (recommended, harness-proven).** Split the DB relaxation:
- **P5 migration** = validators + row-triggers + reorder only (this file, [`08…P5.sql`](08_unify_estimate_node_kinds.P5.sql)). Schema *permits* mixed content; the three RPC guards stay → **row/template writes are withheld at the enforcement layer**, not just the UI. The harness proves this: `insert_estimate_row_item_with_history` onto a group node is **still rejected** post-P5.
- **P6 migration** = drop the three RPC `kind` clauses, shipped *with* the create-flow UI (the enable-writes PR). The first mixed write — the point of no return — now coincides exactly with the P6 RPC relaxation.

**This is not "merging P5/P6" — it is the opposite:** it sharpens the boundary so "relax-only" and "enable-writes" are separated *at the enforcement layer*. It also keeps the irreversible-data trapdoor (first mixed write) gated by P6. Neither step's DDL is itself irreversible (all `create or replace`). **Both DDL changes are reversible until the first mixed row exists.** This is now the canonical plan contract; the older single-P5 alternative is retained only as historical context and must not be implemented without a new explicit decision.

---

## G. Out-of-scope confirmations (flag-only)

- AI package builder `create_project_estimate_package_with_history` (`20260528003000:372-373`) hard-gates `<> 'area'`. **Dormant; do not touch.** Inherits relaxed RPCs if reawakened.
- Snapshot/version-control v2 stack: untouched (NG3).
